import assert from 'node:assert/strict'
import { compactObject, listObjects, loadObject } from '../lib/store.js'

const index = await listObjects()
assert.equal(index.length, 1)
const object = await loadObject(index[0].id)
assert.equal(object.formula.tex, 'a^2+b^2=c^2')
assert.equal(object.formula.semantic_ast.type, 'equation')
assert.equal(object.computational_companions[0].non_identity.omitted.includes('全稱量詞的普遍證明'), true)
const compact = compactObject(object)
assert.equal(compact.formal_status, 'not_formalized')
console.log('Smoke tests passed.')
