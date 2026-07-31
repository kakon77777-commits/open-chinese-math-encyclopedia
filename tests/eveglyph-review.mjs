import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import {
  applyEveGlyphReviewPatch,
  createEveGlyphReviewPacket,
} from '../lib/eveglyph-review.js'
import { ROOT, loadObject } from '../lib/store.js'
import { createMkoValidator } from '../lib/schema-validation.js'

const object = await loadObject('mko-euclid-pythagorean-theorem')
const packet = createEveGlyphReviewPacket(object)
assert.equal(packet.object_id, object.id)
assert.equal(packet.object_version, '0.8.0')
assert.equal(packet.base_object_sha256.length, 64)
assert.equal(packet.read_only.verification.evidence_refs.length, 4)
assert.equal(packet.read_only.verification.evidence_refs.filter(ref => ref.role === 'formal_proof').length, 2)

const validPatch = {
  schema_version: 'ocme-eveglyph-review-patch-v0.1',
  object_id: object.id,
  base_object_sha256: packet.base_object_sha256,
  new_object_version: '0.8.1',
  rationale_zh: '改善繁體中文敘述，但不修改數學結構。',
  changes: {
    summary_zh: '直角三角形的兩股平方和等於斜邊平方。',
    proof_summaries_zh: {
      'proof-area-rearrangement-001': '比較同一大正方形的兩種面積分割，可得到 a²+b²=c²。',
    },
  },
}
const updated = applyEveGlyphReviewPatch(object, validPatch)
assert.equal(updated.version, '0.8.1')
assert.equal(updated.summary['zh-Hant'], validPatch.changes.summary_zh)
assert.equal(isDeepStrictEqual(updated.formula, object.formula), true)
assert.equal(isDeepStrictEqual(updated.verification, object.verification), true)
assert.equal(isDeepStrictEqual(updated.formalization, object.formalization), true)
assert.equal(isDeepStrictEqual(updated.provenance, object.provenance), true)

const stalePatch = structuredClone(validPatch)
stalePatch.base_object_sha256 = '0'.repeat(64)
assert.throws(() => applyEveGlyphReviewPatch(object, stalePatch), /stale review patch/)

const sameVersion = structuredClone(validPatch)
sameVersion.new_object_version = object.version
assert.throws(() => applyEveGlyphReviewPatch(object, sameVersion), /must be greater/)

const unknownProof = structuredClone(validPatch)
unknownProof.changes.proof_summaries_zh = { 'proof-does-not-exist': '錯誤目標' }
assert.throws(() => applyEveGlyphReviewPatch(object, unknownProof), /unknown proof ID/)

const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'eveglyph-review-patch.schema.json'), 'utf8'))
const validate = createMkoValidator(schema)
assert.equal(validate(validPatch), true)

const formulaInjection = structuredClone(validPatch)
formulaInjection.changes.formula = { tex: '1=0' }
assert.equal(validate(formulaInjection), false)

const evidenceInjection = structuredClone(validPatch)
evidenceInjection.changes.verification = { computational_status: 'proved' }
assert.equal(validate(evidenceInjection), false)

const formalizationInjection = structuredClone(validPatch)
formalizationInjection.changes.formalization = { status: 'fully_formalized' }
assert.equal(validate(formalizationInjection), false)

console.log('EveGlyph review bridge tests passed with four preserved evidence references.')
