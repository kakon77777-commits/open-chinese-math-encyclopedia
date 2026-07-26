import assert from 'node:assert/strict'
import {
  buildDependencyGraph,
  compactObject,
  listObjects,
  loadObject,
  resolveDependencies,
} from '../lib/store.js'

const index = await listObjects()
assert.equal(index.length, 3)
assert.deepEqual(index.map(entry => entry.id), [
  'mko-right-triangle',
  'mko-euclidean-length',
  'mko-euclid-pythagorean-theorem',
])

const theorem = await loadObject('mko-euclid-pythagorean-theorem')
assert.equal(theorem.schema_version, 'mko-v0.2')
assert.equal(theorem.formula.tex, 'a^2+b^2=c^2')
assert.equal(theorem.formula.semantic_ast.type, 'equation')
assert.equal(theorem.formula.compiler.id, 'ocme-formula-core')
assert.equal(theorem.formula.compiler.version, '0.3.0')
assert.equal(theorem.computational_companions[0].non_identity.omitted.includes('全稱量詞的普遍證明'), true)
assert.equal(compactObject(theorem).formal_status, 'not_formalized')

const dependencies = await resolveDependencies(theorem.id)
assert.equal(dependencies.length, 2)
assert.deepEqual(new Set(dependencies.map(dep => dep.id)), new Set(['mko-right-triangle', 'mko-euclidean-length']))

const rightTriangle = await loadObject('mko-right-triangle')
assert.equal(rightTriangle.type, 'definition')
assert.equal(rightTriangle.formula.semantic_ast.rhs.type, 'fraction')

const length = await loadObject('mko-euclidean-length')
assert.equal(length.formula.semantic_ast.type, 'equation')
assert.equal(length.formula.semantic_ast.lhs.type, 'function_call')
assert.equal(length.formula.semantic_ast.rhs.type, 'square_root')

const graph = await buildDependencyGraph()
assert.equal(graph.nodes.length, 3)
assert.equal(graph.edges.length, 2)
assert.equal(graph.edges.every(edge => edge.to === theorem.id), true)
console.log('Smoke tests passed: 3 compiled objects, 2 resolved dependency edges.')
