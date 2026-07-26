import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { adaptFelraManifest } from '../lib/evidence-adapters/felra.js'
import { canonicalJson, EVIDENCE_DIR } from '../lib/evidence-store.js'
import { ROOT, loadAllObjects } from '../lib/store.js'
import { createMkoValidator, formatSchemaErrors } from '../lib/schema-validation.js'

const mode = process.argv.includes('--write') ? 'write' : 'check'
const artifactPath = path.join(ROOT, 'artifacts', 'python-evidence-v0.2.json')
const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'))
const objects = await loadAllObjects()
const byId = new Map(objects.map(object => [object.id, object]))
const orchestratorPath = 'reference/python/verify_all.py'
const orchestratorBytes = await fs.readFile(path.join(ROOT, orchestratorPath))
const orchestratorSha = createHash('sha256').update(orchestratorBytes).digest('hex')

const pythonConfigs = {
  'mko-right-triangle': {
    companion_path: 'reference/python/right_triangle.py',
    statement_zh: '在指定的四組角度案例中，參考程式正確接受直角三角形案例並拒絕非直角或退化案例。',
    limitations: [
      '只涵蓋四組宣告案例。',
      '角度比較使用有限精度浮點容差。',
      '不證明直角三角形定義的幾何存在性或普遍性。',
    ],
  },
  'mko-euclidean-length': {
    companion_path: 'reference/python/euclidean_length.py',
    statement_zh: '在指定座標案例中，參考程式正確計算 3-4-5 距離、同一點距離、對稱性與非負性。',
    limitations: [
      '只涵蓋有限座標案例。',
      '實數運算由有限精度浮點數近似。',
      '不證明所有點上的度量公理。',
    ],
  },
  'mko-euclid-pythagorean-theorem': {
    companion_path: 'reference/python/pythagorean.py',
    statement_zh: '在整數範圍 1 至 200 與指定案例中，參考程式正確辨識平方關係並列舉 127 組整數畢氏三元組。',
    limitations: [
      '搜尋範圍限制於整數 1 至 200。',
      '浮點案例使用有限精度容差。',
      '未發現反例不構成畢達哥拉斯定理的普遍證明。',
    ],
  },
}

async function buildPythonEvidence(subjectId, config) {
  const subject = byId.get(subjectId)
  if (!subject) throw new Error(`unknown evidence subject: ${subjectId}`)
  const suite = artifact.suites?.[subjectId]
  if (!suite) throw new Error(`missing Python evidence suite: ${subjectId}`)
  const companionBytes = await fs.readFile(path.join(ROOT, config.companion_path))
  const payload = {
    schema_version: 'evidence-v0.1',
    subject_id: subjectId,
    evidence_type: 'finite_computational_check',
    status: Object.values(suite).every(Boolean) ? 'passed' : 'failed',
    claim_scope: {
      quantification: 'finite_declared_cases',
      universal_proof: false,
      statement_zh: config.statement_zh,
    },
    producer: {
      id: 'ocme-python-suite',
      version: '0.4.0',
      runtime: 'python',
      command: 'python reference/python/verify_all.py',
    },
    sources: [
      {
        role: 'computational_companion',
        path: config.companion_path,
        sha256: createHash('sha256').update(companionBytes).digest('hex'),
      },
      {
        role: 'suite_orchestrator',
        path: orchestratorPath,
        sha256: orchestratorSha,
      },
    ],
    formula_source_sha256: subject.formula.compiler.source_sha256,
    checks: Object.entries(suite).sort(([a], [b]) => a.localeCompare(b)).map(([id, passed]) => ({
      id,
      status: passed ? 'passed' : 'failed',
    })),
    limitations: config.limitations,
    replay: {
      command: 'npm run verify:python',
      expected_exit_code: 0,
      source_artifact: 'artifacts/python-evidence-v0.2.json',
    },
  }
  const digest = createHash('sha256').update(canonicalJson(payload), 'utf8').digest('hex')
  return {
    id: `evidence-sha256-${digest}`,
    ...payload,
    digest: { algorithm: 'sha256', canonical_payload_sha256: digest },
  }
}

async function buildFelraEvidence(errors) {
  const sourceDir = path.join(ROOT, 'evidence-sources', 'felra')
  const names = (await fs.readdir(sourceDir).catch(() => [])).filter(name => name.endsWith('.json')).sort()
  if (!names.length) return []

  const manifestSchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'felra-run-manifest.schema.json'), 'utf8'))
  const validateManifest = createMkoValidator(manifestSchema)
  const evidence = []
  for (const name of names) {
    const manifest = JSON.parse(await fs.readFile(path.join(sourceDir, name), 'utf8'))
    if (!validateManifest(manifest)) {
      errors.push(...formatSchemaErrors(`FELRA manifest ${name}`, validateManifest.errors))
      continue
    }
    try {
      evidence.push(await adaptFelraManifest(manifest, {
        subject: byId.get(manifest.subject_id),
        root: ROOT,
      }))
    } catch (error) {
      errors.push(`FELRA manifest ${name}: ${error.message}`)
    }
  }
  return evidence
}

const errors = []
const pythonEvidence = await Promise.all(Object.entries(pythonConfigs).map(([subjectId, config]) => buildPythonEvidence(subjectId, config)))
const felraEvidence = await buildFelraEvidence(errors)
const expected = [...pythonEvidence, ...felraEvidence].sort((a, b) => a.id.localeCompare(b.id))
const expectedIndex = {
  schema_version: 'ocme-evidence-index-v0.2',
  objects: expected.map(evidence => ({
    id: evidence.id,
    subject_id: evidence.subject_id,
    evidence_type: evidence.evidence_type,
    status: evidence.status,
    producer_id: evidence.producer.id,
    path: `/data/evidence/${evidence.id.replace('evidence-sha256-', '')}.json`,
  })),
}

const evidenceSchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'evidence.schema.json'), 'utf8'))
const validateEvidence = createMkoValidator(evidenceSchema)
for (const evidence of expected) {
  if (!validateEvidence(evidence)) errors.push(...formatSchemaErrors(evidence.id, validateEvidence.errors))
}

await fs.mkdir(EVIDENCE_DIR, { recursive: true })
if (mode === 'write') {
  const existing = await fs.readdir(EVIDENCE_DIR).catch(() => [])
  for (const name of existing) if (name.endsWith('.json')) await fs.rm(path.join(EVIDENCE_DIR, name))
  for (const evidence of expected) {
    const digest = evidence.digest.canonical_payload_sha256
    await fs.writeFile(path.join(EVIDENCE_DIR, `${digest}.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  }
  await fs.writeFile(path.join(EVIDENCE_DIR, 'index.json'), `${JSON.stringify(expectedIndex, null, 2)}\n`, 'utf8')
} else {
  const actualIndex = JSON.parse(await fs.readFile(path.join(EVIDENCE_DIR, 'index.json'), 'utf8'))
  if (!isDeepStrictEqual(actualIndex, expectedIndex)) errors.push('evidence index drifted; run npm run build:evidence')
  for (const evidence of expected) {
    const digest = evidence.digest.canonical_payload_sha256
    const actual = JSON.parse(await fs.readFile(path.join(EVIDENCE_DIR, `${digest}.json`), 'utf8'))
    if (!isDeepStrictEqual(actual, evidence)) errors.push(`${evidence.subject_id}/${evidence.producer.id}: Evidence Object drifted; run npm run build:evidence`)
  }
}

const result = {
  ok: errors.length === 0,
  schema_version: 'ocme-evidence-build-v0.2',
  mode,
  object_count: expected.length,
  producer_counts: expected.reduce((counts, evidence) => {
    counts[evidence.producer.id] = (counts[evidence.producer.id] || 0) + 1
    return counts
  }, {}),
  evidence_ids: expected.map(evidence => evidence.id),
  errors,
}
await fs.mkdir(path.join(ROOT, 'artifacts'), { recursive: true })
await fs.writeFile(path.join(ROOT, 'artifacts', 'evidence-verification-v0.5.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Evidence ${mode} passed: ${expected.length} content-addressed object(s), ${felraEvidence.length} FELRA object(s).`)
