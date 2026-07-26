import assert from 'node:assert/strict'
import { compileFormula, FormulaSyntaxError } from '../lib/formula-compiler.js'

const pythagorean = compileFormula('a^2+b^2=c^2')
assert.equal(pythagorean.semantic_ast.type, 'equation')
assert.equal(pythagorean.semantic_ast.lhs.type, 'addition')
assert.equal(pythagorean.semantic_ast.rhs.type, 'power')
assert.match(pythagorean.mathml, /<msup>/)
assert.equal(pythagorean.compiler.source_sha256.length, 64)

const rightTriangle = compileFormula('\\gamma=\\frac{\\pi}{2}')
assert.equal(rightTriangle.semantic_ast.rhs.type, 'fraction')
assert.match(rightTriangle.mathml, /<mfrac>/)
assert.match(rightTriangle.mathml, /γ/)

const distance = compileFormula('d(P,Q)=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}')
assert.equal(distance.semantic_ast.lhs.type, 'function_call')
assert.equal(distance.semantic_ast.rhs.type, 'square_root')
assert.match(distance.mathml, /<msqrt>/)
assert.match(distance.mathml, /<msub>/)

assert.throws(() => compileFormula('\\unknown{x}'), FormulaSyntaxError)
assert.throws(() => compileFormula('a^'), FormulaSyntaxError)
assert.throws(() => compileFormula(''), TypeError)

console.log('Formula compiler tests passed.')
