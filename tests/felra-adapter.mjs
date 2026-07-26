import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { adaptFelraManifest } from '../lib/evidence-adapters/felra.js'
import { verifyEvidenceAddress } from '../lib/evidence-store.js'
import { ROOT, loadObject } from '../lib/store.js'
import { createMkoValidator } from '../lib/schema-validation.js'

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'tests', 'fixtures', 'felra-run-manifest.json'), 'utf8'))
const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'felra-run-manifest.schema.json'), 'utf8'))
const validate = createMkoValidator(schema)
assert.equal(validate(manifest), true)

const subject = await loadObject(manifest.subject_id)
const evidence = await adaptFelraManifest(manifest, { subject, root: ROOT })
assert.equal(evidence.subject_id, subject.id)
assert.equal(evidence.producer.id, 'felra')
assert.equal(evidence.claim_scope.universal_proof, false)
assert.equal(evidence.sources[0].role, 'felra_project')
assert.equal(verifyEvidenceAddress(evidence).ok, true)

const promoted = structuredClone(manifest)
promoted.claim_scope.universal_proof = true
await assert.rejects(() => adaptFelraManifest(promoted, { subject, root: ROOT }), /cannot be promoted/)

const escaped = structuredClone(manifest)
escaped.result_sources = [{ role: 'result', path: '../../etc/passwd' }]
await assert.rejects(() => adaptFelraManifest(escaped, { subject, root: ROOT }), /escapes repository/)

console.log('FELRA adapter tests passed.')
