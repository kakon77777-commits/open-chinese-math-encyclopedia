import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from './store.js'

export const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence')

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function evidencePayload(evidence) {
  const { id: _id, digest: _digest, ...payload } = evidence
  return payload
}

export function calculateEvidenceDigest(evidence) {
  return createHash('sha256').update(canonicalJson(evidencePayload(evidence)), 'utf8').digest('hex')
}

export function verifyEvidenceAddress(evidence) {
  const calculated = calculateEvidenceDigest(evidence)
  const expectedId = `evidence-sha256-${calculated}`
  return {
    ok: evidence.id === expectedId && evidence.digest?.algorithm === 'sha256' && evidence.digest?.canonical_payload_sha256 === calculated,
    calculated,
    expected_id: expectedId,
  }
}

export async function loadEvidenceIndex() {
  return JSON.parse(await fs.readFile(path.join(EVIDENCE_DIR, 'index.json'), 'utf8'))
}

export async function listEvidence() {
  return (await loadEvidenceIndex()).objects
}

export async function loadEvidence(id) {
  const index = await loadEvidenceIndex()
  const entry = index.objects.find(object => object.id === id)
  if (!entry) throw new Error(`unknown evidence object: ${id}`)
  const relative = entry.path.replace(/^\/data\/evidence\//, '')
  return JSON.parse(await fs.readFile(path.join(EVIDENCE_DIR, relative), 'utf8'))
}

export async function evidenceForSubject(subjectId) {
  const entries = (await listEvidence()).filter(entry => entry.subject_id === subjectId)
  return Promise.all(entries.map(entry => loadEvidence(entry.id)))
}
