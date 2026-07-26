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

const evidence = await loadEvidence('evidence-sha256-49083d0529f2b530b946fd6f30a313b0341a8989bf0f6de9adcdeb398a2b4466')
assert.equal(verifyEvidenceAddress(evidence).ok, true)
assert.equal(evidence.claim_scope.universal_proof, false)

const forTheorem = await evidenceForSubject('mko-euclid-pythagorean-theorem')
assert.equal(forTheorem.length, 1)
assert.equal(forTheorem[0].id, evidence.id)

const tampered = structuredClone(evidence)
tampered.checks[0].status = 'failed'
assert.equal(verifyEvidenceAddress(tampered).ok, false)

const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'evidence.schema.json'), 'utf8'))
const validate = createMkoValidator(schema)
assert.equal(validate(structuredClone(evidence)), true)

const missingLimitations = structuredClone(evidence)
delete missingLimitations.limitations
assert.equal(validate(missingLimitations), false)

const falseUniversalClaim = structuredClone(evidence)
falseUniversalClaim.claim_scope.universal_proof = true
assert.equal(validate(falseUniversalClaim), true)
assert.equal(verifyEvidenceAddress(falseUniversalClaim).ok, false)

console.log('Evidence Object negative tests passed.')
