import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT, loadObject } from '../lib/store.js'
import { createMkoValidator } from '../lib/schema-validation.js'

const legacySchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko.schema.json'), 'utf8'))
const schemaV03 = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko-v0.3.schema.json'), 'utf8'))
const schemaV04 = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko-v0.4.schema.json'), 'utf8'))
const validateV03 = createMkoValidator(schemaV03, [legacySchema])
const validateV04 = createMkoValidator(schemaV04, [legacySchema])
const theorem = await loadObject('mko-euclid-pythagorean-theorem')
const membership = await loadObject('mko-set-membership')
const mapping = await loadObject('mko-function-mapping')
const tendsTo = await loadObject('mko-tends-to-relation')

assert.equal(validateV03(structuredClone(theorem)), true)
assert.equal(validateV04(structuredClone(membership)), true)
assert.equal(validateV04(structuredClone(mapping)), true)
assert.equal(validateV04(structuredClone(tendsTo)), true)

const missingCompiler = structuredClone(theorem)
delete missingCompiler.formula.compiler
assert.equal(validateV03(missingCompiler), false)

const unknownAst = structuredClone(theorem)
unknownAst.formula.semantic_ast = { type: 'magical_equation', value: 42 }
assert.equal(validateV03(unknownAst), false)

const malformedMembership = structuredClone(membership)
delete malformedMembership.formula.semantic_ast.set
assert.equal(validateV04(malformedMembership), false)

const malformedMapping = structuredClone(mapping)
malformedMapping.formula.semantic_ast.codomain = { type: 'unknown' }
assert.equal(validateV04(malformedMapping), false)

const oldCompilerForV04 = structuredClone(tendsTo)
oldCompilerForV04.formula.compiler.version = '0.3.0'
assert.equal(validateV04(oldCompilerForV04), false)

const extraTopLevel = structuredClone(theorem)
extraTopLevel.untracked_ai_note = 'should be rejected'
assert.equal(validateV03(extraTopLevel), false)

const malformedHash = structuredClone(theorem)
malformedHash.formula.compiler.source_sha256 = 'not-a-sha256'
assert.equal(validateV03(malformedHash), false)

const embeddedEvidence = structuredClone(theorem)
embeddedEvidence.verification.evidence = { generated_at: '2026-07-25', tests: [] }
assert.equal(validateV03(embeddedEvidence), false)

const legacyFelraPath = structuredClone(theorem)
legacyFelraPath.verification.felra_project = 'felra/pythagorean/project.yaml'
assert.equal(validateV03(legacyFelraPath), false)

const malformedEvidenceRef = structuredClone(theorem)
malformedEvidenceRef.verification.evidence_refs[0].id = 'evidence-not-a-hash'
assert.equal(validateV03(malformedEvidenceRef), false)

console.log('Schema negative tests passed for MKO v0.3 and v0.4.')
