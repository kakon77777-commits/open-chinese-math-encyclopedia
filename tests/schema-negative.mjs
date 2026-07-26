import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT, loadObject } from '../lib/store.js'
import { createMkoValidator } from '../lib/schema-validation.js'

const legacySchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko.schema.json'), 'utf8'))
const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko-v0.3.schema.json'), 'utf8'))
const validate = createMkoValidator(schema, [legacySchema])
const source = await loadObject('mko-euclid-pythagorean-theorem')

assert.equal(validate(structuredClone(source)), true)

const missingCompiler = structuredClone(source)
delete missingCompiler.formula.compiler
assert.equal(validate(missingCompiler), false)

const unknownAst = structuredClone(source)
unknownAst.formula.semantic_ast = { type: 'magical_equation', value: 42 }
assert.equal(validate(unknownAst), false)

const extraTopLevel = structuredClone(source)
extraTopLevel.untracked_ai_note = 'should be rejected'
assert.equal(validate(extraTopLevel), false)

const malformedHash = structuredClone(source)
malformedHash.formula.compiler.source_sha256 = 'not-a-sha256'
assert.equal(validate(malformedHash), false)

const embeddedEvidence = structuredClone(source)
embeddedEvidence.verification.evidence = { generated_at: '2026-07-25', tests: [] }
assert.equal(validate(embeddedEvidence), false)

const legacyFelraPath = structuredClone(source)
legacyFelraPath.verification.felra_project = 'felra/pythagorean/project.yaml'
assert.equal(validate(legacyFelraPath), false)

const malformedEvidenceRef = structuredClone(source)
malformedEvidenceRef.verification.evidence_refs[0].id = 'evidence-not-a-hash'
assert.equal(validate(malformedEvidenceRef), false)

console.log('Schema negative tests passed.')
