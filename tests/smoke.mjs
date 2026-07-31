import assert from 'node:assert/strict'
import {
  buildDependencyGraph,
  compactObject,
  listObjects,
  loadObject,
  resolveDependencies,
} from '../lib/store.js'

const index = await listObjects()
assert.equal(index.length, 6)
assert.deepEqual(index.map(entry => entry.id), [
  'mko-right-triangle',
  'mko-euclidean-length',
  'mko-euclid-pythagorean-theorem',
  'mko-set-membership',
  'mko-function-mapping',
  'mko-tends-to-relation',
])

const theorem = await loadObject('mko-euclid-pythagorean-theorem')
assert.equal(theorem.schema_version, 'mko-v0.3')
assert.equal(theorem.version, '0.7.0')
assert.equal(theorem.formula.tex, 'a^2+b^2=c^2')
assert.equal(theorem.formula.semantic_ast.type, 'equation')
assert.equal(theorem.formula.compiler.id, 'ocme-formula-core')
assert.equal(theorem.formula.compiler.version, '0.3.0')
assert.equal(theorem.computational_companions[0].non_identity.omitted.includes('全稱量詞的普遍證明'), true)
assert.equal(theorem.verification.evidence_refs.length, 3)
assert.deepEqual(
  new Set(theorem.verification.evidence_refs.map(ref => ref.producer_id)),
  new Set(['ocme-python-suite', 'felra', 'lean-mathlib'])
)
assert.equal(theorem.verification.producers.some(producer => producer.id === 'felra' && producer.status === 'active'), true)
assert.equal(theorem.verification.producers.some(producer => producer.id === 'lean-mathlib' && producer.status === 'active'), true)
assert.equal('evidence' in theorem.verification, false)
assert.equal('felra_project' in theorem.verification, false)
const compact = compactObject(theorem)
assert.equal(compact.formal_status, 'formalized_equivalent_vector_form')
assert.equal(compact.evidence_refs.length, 3)
assert.equal(compact.evidence_producers.length, 3)

const dependencies = await resolveDependencies(theorem.id)
assert.equal(dependencies.length, 2)
assert.deepEqual(new Set(dependencies.map(dep => dep.id)), new Set(['mko-right-triangle', 'mko-euclidean-length']))

const rightTriangle = await loadObject('mko-right-triangle')
assert.equal(rightTriangle.type, 'definition')
assert.equal(rightTriangle.formula.semantic_ast.rhs.type, 'fraction')
assert.equal(rightTriangle.verification.evidence_refs.length, 1)

const length = await loadObject('mko-euclidean-length')
assert.equal(length.formula.semantic_ast.type, 'equation')
assert.equal(length.formula.semantic_ast.lhs.type, 'function_call')
assert.equal(length.formula.semantic_ast.rhs.type, 'square_root')

const membership = await loadObject('mko-set-membership')
assert.equal(membership.schema_version, 'mko-v0.4')
assert.equal(membership.formula.semantic_ast.type, 'membership')
assert.equal(membership.verification.producers[0].status, 'configured')

const mapping = await loadObject('mko-function-mapping')
assert.equal(mapping.formula.semantic_ast.type, 'mapping')
assert.deepEqual(mapping.dependencies.map(dep => dep.id), ['mko-set-membership'])

const tendsTo = await loadObject('mko-tends-to-relation')
assert.equal(tendsTo.formula.semantic_ast.type, 'tends_to')
assert.deepEqual(tendsTo.dependencies.map(dep => dep.id), ['mko-function-mapping'])

const graph = await buildDependencyGraph()
assert.equal(graph.schema_version, 'ocme-dependency-graph-v0.3')
assert.equal(graph.nodes.length, 6)
assert.equal(graph.edges.length, 4)
assert.equal(graph.edges.some(edge => edge.from === 'mko-set-membership' && edge.to === 'mko-function-mapping'), true)
assert.equal(graph.edges.some(edge => edge.from === 'mko-function-mapping' && edge.to === 'mko-tends-to-relation'), true)
assert.equal(graph.nodes.every(node => Array.isArray(node.evidence_refs)), true)
console.log('Smoke tests passed: 6 MKO objects, 5 evidence refs, active FELRA/Lean and 4 dependency edges.')
