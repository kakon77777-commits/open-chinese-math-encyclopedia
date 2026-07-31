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
    throw new Error(`Lean source path escapes repository: ${relativePath}`)
  }
  return target
}

export async function adaptLeanManifest(manifest, { subject, root }) {
  if (!subject) throw new Error(`unknown Lean evidence subject: ${manifest.subject_id}`)
  if (manifest.subject_id !== subject.id) throw new Error('Lean manifest subject does not match MKO')
  if (manifest.status !== 'passed') throw new Error('Lean formal evidence requires a passed build')
  if (manifest.claim_scope?.quantification !== 'formal_universal' || manifest.claim_scope?.universal_proof !== true) {
    throw new Error('Lean formal evidence must describe the exact universally quantified formal statement')
  }

  const sources = []
  for (const sourcePath of manifest.source_paths) {
    const absolutePath = resolveRepositoryPath(root, sourcePath)
    const bytes = await fs.readFile(absolutePath)
    sources.push({ role: 'lean_source', path: sourcePath, sha256: sha256(bytes) })
  }
  sources.sort((a, b) => a.path.localeCompare(b.path))

  const payload = {
    schema_version: 'evidence-v0.1',
    subject_id: subject.id,
    evidence_type: 'formal_proof',
    status: 'passed',
    claim_scope: manifest.claim_scope,
    producer: {
      id: 'lean-mathlib',
      version: manifest.producer_version,
      runtime: `${manifest.toolchain} + Mathlib ${manifest.mathlib_version}`,
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
    digest: { algorithm: 'sha256', canonical_payload_sha256: digest },
  }
}
