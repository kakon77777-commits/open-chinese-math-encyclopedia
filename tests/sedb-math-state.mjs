import assert from 'node:assert/strict'
import {
  SEDB_MATH_STATES,
  canTransition,
  assertLegalTransition,
} from '../lib/sedb-math-transitions.js'

assert.deepEqual(SEDB_MATH_STATES, [
  'planned',
  'proposed',
  'draft',
  'under_review',
  'verified',
  'canonical',
  'contested',
  'revision_required',
  'deprecated',
  'superseded',
])

assert.equal(canTransition('planned', 'proposed'), true)
assert.equal(canTransition('proposed', 'draft'), true)
assert.equal(canTransition('draft', 'under_review'), true)
assert.equal(canTransition('under_review', 'verified'), true)
assert.equal(canTransition('verified', 'canonical'), true)
assert.equal(canTransition('canonical', 'contested'), true)
assert.equal(canTransition('contested', 'revision_required'), true)
assert.equal(canTransition('revision_required', 'under_review'), true)
assert.equal(canTransition('canonical', 'deprecated'), true)
assert.equal(canTransition('canonical', 'superseded'), true)

assert.equal(canTransition('canonical', 'draft'), false)
assert.equal(canTransition('canonical', 'canonical'), false)
assert.equal(canTransition('unknown', 'draft'), false)
assert.throws(
  () => assertLegalTransition('canonical', 'draft'),
  /illegal SEDB-Math transition: canonical -> draft/,
)
assert.equal(assertLegalTransition('draft', 'under_review'), true)

console.log('SEDB-Math transition tests passed.')
