import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { canonicalJson } from '../evidence-store.js'

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function resolveRepositoryPath(root, relativePath) {
  const target = path.resolve(root, relativePath)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`FELRA source path escapes repository: ${relativePath}`)
  }
  return target
}

export async function adaptFelraManifest(manifest, { subject, root }) {
  if (!subject) throw new Error(`unknown FELRA evidence subject: ${manifest.subject_id}`)
  if (manifest.subject_id !== subject.id) throw new Error('FELRA manifest subject does not match MKO')
  if (manifest.claim_scope?.universal_proof !== false) {
    throw new Error('FELRA evidence cannot be promoted to universal proof')
  }

  const sourceSpecs = [
    { role: 'felra_project', path: manifest.project_path },
    ...(manifest.result_sources || []),
  ]
  const sources = []
  for (const source of sourceSpecs) {
    const absolutePath = resolveRepositoryPath(root, source.path)
    const bytes = await fs.readFile(absolutePath)
    sources.push({ role: source.role, path: source.path, sha256: sha256(bytes) })
  }

  const payload = {
    schema_version: 'evidence-v0.1',
    subject_id: subject.id,
    evidence_type: manifest.evidence_type,
    status: manifest.status,
    claim_scope: manifest.claim_scope,
    producer: {
      id: 'felra',
      version: manifest.producer_version,
      runtime: manifest.runtime,
      command: manifest.command,
    },
    sources,
    formula_source_sha256: subject.formula.compiler.source_sha256,
    checks: [...manifest.checks].sort((a, b) => a.id.localeCompare(b.id)),
    limitations: manifest.limitations,
    replay: manifest.replay,
  }
  const digest = sha256(Buffer.from(canonicalJson(payload), 'utf8'))
  return {
    id: `evidence-sha256-${digest}`,
    ...payload,
    digest: {
      algorithm: 'sha256',
      canonical_payload_sha256: digest,
    },
  }
}
