import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { adaptLeanManifest } from '../lib/evidence-adapters/lean.js'
import { ROOT, loadObject } from '../lib/store.js'
import { verifyEvidenceAddress } from '../lib/evidence-store.js'

const manifestDir = path.join(ROOT, 'evidence-sources', 'lean')
const names = (await fs.readdir(manifestDir))
  .filter(name => name.endsWith('.json'))
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
assert.equal(names.length, 5)

const theoremNames = new Set()
for (const name of names) {
  const manifest = JSON.parse(await fs.readFile(path.join(manifestDir, name), 'utf8'))
  const subject = await loadObject(manifest.subject_id)
  const evidence = await adaptLeanManifest(manifest, { subject, root: ROOT })
  theoremNames.add(manifest.theorem_name)
  assert.equal(evidence.evidence_type, 'formal_proof')
  assert.equal(evidence.claim_scope.universal_proof, true)
  assert.equal(evidence.claim_scope.quantification, 'formal_universal')
  assert.equal(evidence.producer.id, 'lean-mathlib')
  assert.equal(evidence.sources.length, 3)
  assert.equal(verifyEvidenceAddress(evidence).ok, true)
}
assert.deepEqual(theoremNames, new Set([
  'OCMEFormal.function_total_unique',
  'OCMEFormal.pythagorean_side_lengths',
  'OCMEFormal.pythagorean_vector',
  'OCMEFormal.set_membership_semantics',
  'OCMEFormal.tendsTo_filter_semantics',
]))

const baseManifest = JSON.parse(await fs.readFile(path.join(manifestDir, 'set-membership.json'), 'utf8'))
const baseSubject = await loadObject(baseManifest.subject_id)

const wrongSubject = structuredClone(baseManifest)
wrongSubject.subject_id = 'mko-right-triangle'
await assert.rejects(() => adaptLeanManifest(wrongSubject, { subject: baseSubject, root: ROOT }), /subject does not match/)

const nonUniversal = structuredClone(baseManifest)
nonUniversal.claim_scope.universal_proof = false
await assert.rejects(() => adaptLeanManifest(nonUniversal, { subject: baseSubject, root: ROOT }), /universally quantified/)

const escapedPath = structuredClone(baseManifest)
escapedPath.source_paths = ['../outside.lean', ...baseManifest.source_paths.slice(1)]
await assert.rejects(() => adaptLeanManifest(escapedPath, { subject: baseSubject, root: ROOT }), /escapes repository/)

console.log('Lean evidence adapter tests passed for all five v0.8 manifests.')
