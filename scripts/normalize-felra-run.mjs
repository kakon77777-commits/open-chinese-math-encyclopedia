import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { ROOT } from '../lib/store.js'

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

function resolveInsideRoot(relativePath) {
  const target = path.resolve(ROOT, relativePath)
  if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`path escapes repository: ${relativePath}`)
  }
  return target
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function normalizedCheck(result) {
  return {
    id: result.check_name,
    status: result.passed ? 'passed' : 'failed',
    summary: result.summary,
    metrics: result.metrics,
    counterexamples: result.counterexamples || [],
  }
}

async function compareOrWrite(relativePath, value, mode, errors) {
  const target = resolveInsideRoot(relativePath)
  if (mode === 'write') {
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    return
  }
  const actual = await readJson(target).catch(() => null)
  if (!actual || !isDeepStrictEqual(actual, value)) {
    errors.push(`${relativePath} drifted; run npm run normalize:felra -- --run-dir <run> --write`)
  }
}

const runDirArg = argument('--run-dir')
if (!runDirArg) throw new Error('--run-dir is required')
const configPath = argument('--config', 'felra/pythagorean/ocme-adapter.json')
const mode = process.argv.includes('--write') ? 'write' : process.argv.includes('--check') ? 'check' : 'preview'

const runDir = resolveInsideRoot(runDirArg)
const config = await readJson(resolveInsideRoot(configPath))
const lock = await readJson(resolveInsideRoot('felra/FELRA_LOCK.json'))
const rawManifest = await readJson(path.join(runDir, 'manifest.json'))
const rawClaim = await readJson(path.join(runDir, 'claims', config.claim_id, 'metrics.json'))

const errors = []
if (rawManifest.project?.id !== config.project_id) errors.push('FELRA project ID does not match adapter config')
if (rawClaim.claim?.id !== config.claim_id) errors.push('FELRA claim ID does not match adapter config')
if (rawManifest.environment?.felra !== lock.version) errors.push(`FELRA version ${rawManifest.environment?.felra} does not match lock ${lock.version}`)
if (rawManifest.config_sha256 !== rawClaim.metadata?.config_sha256) errors.push('FELRA manifest and claim config SHA-256 differ')

const checks = (rawClaim.results || []).map(normalizedCheck).sort((a, b) => a.id.localeCompare(b.id))
if (!checks.length) errors.push('FELRA claim produced no validation checks')

const resultSnapshot = {
  schema_version: 'ocme-felra-result-snapshot-v0.1',
  subject_id: config.subject_id,
  felra: {
    repository: lock.repository,
    commit: lock.commit,
    version: lock.version,
  },
  project: {
    id: rawManifest.project?.id,
    title: rawManifest.project?.title,
    config_sha256: rawManifest.config_sha256,
    result_sha256: rawManifest.result_sha256,
    passed: rawManifest.passed,
    claims_passed: rawManifest.claims_passed,
    analyses_succeeded: rawManifest.analyses_succeeded,
  },
  claim: {
    id: rawClaim.claim?.id,
    statement: rawClaim.claim?.statement,
    status: rawClaim.claim?.status,
    domain_description: rawClaim.claim?.domain_description,
    passed: rawClaim.passed,
    metadata: rawClaim.metadata,
    checks,
  },
}

const normalizedManifest = {
  schema_version: 'felra-run-manifest-v0.1',
  subject_id: config.subject_id,
  project_id: config.project_id,
  producer_version: lock.version,
  runtime: 'python/felra',
  command: `felra run ${config.project_path} --output ${runDirArg}`,
  evidence_type: config.evidence_type,
  status: rawClaim.passed ? 'passed' : 'failed',
  claim_scope: {
    quantification: config.quantification,
    universal_proof: false,
    statement_zh: config.statement_zh,
  },
  checks: checks.map(check => ({ id: check.id, status: check.status })),
  limitations: config.limitations,
  project_path: config.project_path,
  result_sources: [
    { role: 'felra_result_snapshot', path: config.result_snapshot_path },
    { role: 'felra_runtime_lock', path: 'felra/FELRA_LOCK.json' },
  ],
  replay: {
    command: `felra replay ${runDirArg} --output artifacts/felra/pythagorean-replay`,
    expected_exit_code: 0,
    source_artifact: config.result_snapshot_path,
  },
}

if (mode === 'preview') {
  console.log(JSON.stringify({ normalized_manifest: normalizedManifest, result_snapshot: resultSnapshot }, null, 2))
  process.exit(errors.length ? 1 : 0)
}

await compareOrWrite(config.result_snapshot_path, resultSnapshot, mode, errors)
await compareOrWrite(config.manifest_path, normalizedManifest, mode, errors)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`FELRA normalization ${mode} passed for ${config.subject_id}.`)
