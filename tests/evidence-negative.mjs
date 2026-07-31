import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  evidenceForSubject,
  loadEvidence,
  verifyEvidenceAddress,
} from '../lib/evidence-store.js'
import { ROOT } from '../lib/store.js'
import { createMkoValidator } from '../lib/schema-validation.js'

const pythonEvidence = await loadEvidence('evidence-sha256-49083d0529f2b530b946fd6f30a313b0341a8989bf0f6de9adcdeb398a2b4466')
const felraEvidence = await loadEvidence('evidence-sha256-97ad4a4b529de8c77662f823ad0966c24cfe1c121af8cbb4320135b9ea849448')
const leanEvidence = await loadEvidence('evidence-sha256-dd7d2bb464dd8f503fa5be9f4c68e01ce0947e506e137a064bdaa1b950c8628f')

for (const evidence of [pythonEvidence, felraEvidence, leanEvidence]) {
  assert.equal(verifyEvidenceAddress(evidence).ok, true)
}
for (const evidence of [pythonEvidence, felraEvidence]) {
  assert.equal(evidence.claim_scope.universal_proof, false)
}
assert.equal(felraEvidence.producer.id, 'felra')
assert.equal(felraEvidence.claim_scope.quantification, 'finite_declared_domain')
assert.equal(leanEvidence.producer.id, 'lean-mathlib')
assert.equal(leanEvidence.evidence_type, 'formal_proof')
assert.equal(leanEvidence.claim_scope.quantification, 'formal_universal')
assert.equal(leanEvidence.claim_scope.universal_proof, true)
assert.equal(leanEvidence.status, 'passed')

const forTheorem = await evidenceForSubject('mko-euclid-pythagorean-theorem')
assert.equal(forTheorem.length, 3)
assert.deepEqual(
  new Set(forTheorem.map(item => item.id)),
  new Set([pythonEvidence.id, felraEvidence.id, leanEvidence.id])
)

const tamperedFinite = structuredClone(felraEvidence)
tamperedFinite.checks[0].status = 'failed'
assert.equal(verifyEvidenceAddress(tamperedFinite).ok, false)

const tamperedFormal = structuredClone(leanEvidence)
tamperedFormal.sources[0].sha256 = '0'.repeat(64)
assert.equal(verifyEvidenceAddress(tamperedFormal).ok, false)

const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'evidence.schema.json'), 'utf8'))
const validate = createMkoValidator(schema)
assert.equal(validate(structuredClone(felraEvidence)), true)
assert.equal(validate(structuredClone(leanEvidence)), true)

const missingLimitations = structuredClone(felraEvidence)
delete missingLimitations.limitations
assert.equal(validate(missingLimitations), false)

const falseUniversalFinite = structuredClone(felraEvidence)
falseUniversalFinite.claim_scope.universal_proof = true
assert.equal(validate(falseUniversalFinite), true)
assert.equal(verifyEvidenceAddress(falseUniversalFinite).ok, false)

const downgradedFormal = structuredClone(leanEvidence)
downgradedFormal.claim_scope.universal_proof = false
assert.equal(validate(downgradedFormal), true)
assert.equal(verifyEvidenceAddress(downgradedFormal).ok, false)

console.log('Evidence Object negative tests passed for Python, FELRA and Lean producers.')
