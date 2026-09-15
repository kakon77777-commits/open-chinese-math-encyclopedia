import assert from 'node:assert/strict'
import { compileFormula, FormulaSyntaxError } from '../lib/formula-compiler.js'

const pythagorean = compileFormula('a^2+b^2=c^2')
assert.equal(pythagorean.semantic_ast.type, 'equation')
assert.equal(pythagorean.semantic_ast.lhs.type, 'addition')
assert.equal(pythagorean.semantic_ast.rhs.type, 'power')
assert.match(pythagorean.mathml, /<msup>/)
assert.equal(pythagorean.compiler.source_sha256.length, 64)
assert.equal(pythagorean.compiler.version, '0.4.0')

const rightTriangle = compileFormula('\\gamma=\\frac{\\pi}{2}')
assert.equal(rightTriangle.semantic_ast.rhs.type, 'fraction')
assert.match(rightTriangle.mathml, /<mfrac>/)
assert.match(rightTriangle.mathml, /γ/)

const distance = compileFormula('d(P,Q)=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}')
assert.equal(distance.semantic_ast.lhs.type, 'function_call')
assert.equal(distance.semantic_ast.rhs.type, 'square_root')
assert.match(distance.mathml, /<msqrt>/)
assert.match(distance.mathml, /<msub>/)

const membership = compileFormula('x\\in A')
assert.equal(membership.semantic_ast.type, 'membership')
assert.equal(membership.semantic_ast.element.name, 'x')
assert.equal(membership.semantic_ast.set.name, 'A')
assert.match(membership.mathml, /∈/)

const subset = compileFormula('A\\subseteq B')
assert.equal(subset.semantic_ast.type, 'set_subset')
assert.equal(subset.semantic_ast.subset.name, 'A')
assert.equal(subset.semantic_ast.superset.name, 'B')
assert.match(subset.mathml, /⊆/)

const setUnion = compileFormula('A\\cup B')
assert.equal(setUnion.semantic_ast.type, 'set_union')
assert.match(setUnion.mathml, /∪/)

const setIntersection = compileFormula('A\\cap B')
assert.equal(setIntersection.semantic_ast.type, 'set_intersection')
assert.match(setIntersection.mathml, /∩/)

const setDifference = compileFormula('A\\setminus B')
assert.equal(setDifference.semantic_ast.type, 'set_difference')
assert.match(setDifference.mathml, /∖/)

const setPrecedence = compileFormula('A\\cup B\\cap C')
assert.equal(setPrecedence.semantic_ast.type, 'set_union')
assert.equal(setPrecedence.semantic_ast.right.type, 'set_intersection')

const mapping = compileFormula('f:X\\to Y')
assert.equal(mapping.semantic_ast.type, 'mapping')
assert.equal(mapping.semantic_ast.function.name, 'f')
assert.equal(mapping.semantic_ast.domain.name, 'X')
assert.equal(mapping.semantic_ast.codomain.name, 'Y')
assert.match(mapping.mathml, /→/)

const tendsTo = compileFormula('x\\to a')
assert.equal(tendsTo.semantic_ast.type, 'tends_to')
assert.equal(tendsTo.semantic_ast.expression.name, 'x')
assert.equal(tendsTo.semantic_ast.target.name, 'a')

const legacyVersion = compileFormula('a^2+b^2=c^2', { compilerVersion: '0.3.0' })
assert.equal(legacyVersion.compiler.version, '0.3.0')

assert.throws(() => compileFormula('\\unknown{x}'), FormulaSyntaxError)
assert.throws(() => compileFormula('\\in A'), FormulaSyntaxError)
assert.throws(() => compileFormula('\\subseteq B'), FormulaSyntaxError)
assert.throws(() => compileFormula('\\cup A'), FormulaSyntaxError)
assert.throws(() => compileFormula('f:X Y'), FormulaSyntaxError)
assert.throws(() => compileFormula('a^'), FormulaSyntaxError)
assert.throws(() => compileFormula(''), TypeError)

console.log('Formula compiler tests passed.')
