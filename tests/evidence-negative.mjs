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

const ids = {
  python: 'evidence-sha256-49083d0529f2b530b946fd6f30a313b0341a8989bf0f6de9adcdeb398a2b4466',
  felra: 'evidence-sha256-97ad4a4b529de8c77662f823ad0966c24cfe1c121af8cbb4320135b9ea849448',
  vector: 'evidence-sha256-4d31c152012f8b561749e354f3789344c91e1fea26cead1468e95417b2e84752',
  side: 'evidence-sha256-701b8066d363dadf2cc1ec21bc0d21f7c680a6eb187a37fd309c0f2e4c86d08e',
  membership: 'evidence-sha256-702de77019f352eb431eb67bd7b266491b7c36c922d952e44be2b11ba95bcb5d',
  mapping: 'evidence-sha256-d999133c1ae711b73752af8ee4b1b3ce74ca135ff7c06aabbe9fc8a3186f434b',
  tendsTo: 'evidence-sha256-38b848281997cbb1a2c1ea5559c6937dbb67ee03ac0be338756320a99e0f8b1d',
}

const pythonEvidence = await loadEvidence(ids.python)
const felraEvidence = await loadEvidence(ids.felra)
const formalEvidence = await Promise.all([
  ids.vector,
  ids.side,
  ids.membership,
  ids.mapping,
  ids.tendsTo,
].map(id => loadEvidence(id)))

for (const evidence of [pythonEvidence, felraEvidence, ...formalEvidence]) {
  assert.equal(verifyEvidenceAddress(evidence).ok, true)
}
for (const evidence of [pythonEvidence, felraEvidence]) {
  assert.equal(evidence.claim_scope.universal_proof, false)
}
assert.equal(felraEvidence.producer.id, 'felra')
assert.equal(felraEvidence.claim_scope.quantification, 'finite_declared_domain')

for (const evidence of formalEvidence) {
  assert.equal(evidence.producer.id, 'lean-mathlib')
  assert.equal(evidence.evidence_type, 'formal_proof')
  assert.equal(evidence.claim_scope.quantification, 'formal_universal')
  assert.equal(evidence.claim_scope.universal_proof, true)
  assert.equal(evidence.status, 'passed')
}

const forTheorem = await evidenceForSubject('mko-euclid-pythagorean-theorem')
assert.equal(forTheorem.length, 4)
assert.deepEqual(
  new Set(forTheorem.map(item => item.id)),
  new Set([ids.python, ids.felra, ids.vector, ids.side])
)
assert.equal((await evidenceForSubject('mko-set-membership')).length, 1)
assert.equal((await evidenceForSubject('mko-function-mapping')).length, 1)
assert.equal((await evidenceForSubject('mko-tends-to-relation')).length, 1)

const tamperedFinite = structuredClone(felraEvidence)
tamperedFinite.checks[0].status = 'failed'
assert.equal(verifyEvidenceAddress(tamperedFinite).ok, false)

const tamperedFormal = structuredClone(formalEvidence[0])
tamperedFormal.sources[0].sha256 = '0'.repeat(64)
assert.equal(verifyEvidenceAddress(tamperedFormal).ok, false)

const tamperedClaim = structuredClone(formalEvidence[1])
tamperedClaim.claim_scope.statement_zh = '錯誤地擴張形式聲明。'
assert.equal(verifyEvidenceAddress(tamperedClaim).ok, false)

const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'evidence.schema.json'), 'utf8'))
const validate = createMkoValidator(schema)
assert.equal(validate(structuredClone(felraEvidence)), true)
for (const evidence of formalEvidence) assert.equal(validate(structuredClone(evidence)), true)

const missingLimitations = structuredClone(felraEvidence)
delete missingLimitations.limitations
assert.equal(validate(missingLimitations), false)

const falseUniversalFinite = structuredClone(felraEvidence)
falseUniversalFinite.claim_scope.universal_proof = true
assert.equal(validate(falseUniversalFinite), true)
assert.equal(verifyEvidenceAddress(falseUniversalFinite).ok, false)

const downgradedFormal = structuredClone(formalEvidence[2])
downgradedFormal.claim_scope.universal_proof = false
assert.equal(validate(downgradedFormal), true)
assert.equal(verifyEvidenceAddress(downgradedFormal).ok, false)

console.log('Evidence Object tests passed for Python, FELRA and five content-addressed Lean proofs.')
