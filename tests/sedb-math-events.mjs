import assert from 'node:assert/strict'
import {
  SEDB_MATH_DATA_DIR,
  loadSedbMathObjectStates,
  loadSedbMathClaimStates,
  loadSedbMathEvents,
  indexSedbMathEvents,
  loadAndValidateSedbMathState,
} from '../lib/sedb-math-store.js'

assert.match(SEDB_MATH_DATA_DIR.replaceAll('\\', '/'), /public\/data\/sedb-math$/)
assert.deepEqual(await loadSedbMathObjectStates(), [])
assert.deepEqual(await loadSedbMathClaimStates(), [])
assert.deepEqual(await loadSedbMathEvents(), [])

const fixtureEvents = [
  {
    event_id: 'evt:object',
    object_id: 'mko-demo',
  },
  {
    event_id: 'evt:claim',
    object_id: 'mko-demo',
    claim_id: 'claim:demo',
  },
]

const index = indexSedbMathEvents(fixtureEvents)
assert.equal(index.byId.get('evt:object'), fixtureEvents[0])
assert.equal(index.byId.get('evt:claim'), fixtureEvents[1])
assert.deepEqual(index.byObjectId.get('mko-demo'), fixtureEvents)
assert.deepEqual(index.byClaimId.get('claim:demo'), [fixtureEvents[1]])
assert.throws(
  () => indexSedbMathEvents([fixtureEvents[0], structuredClone(fixtureEvents[0])]),
  /duplicate event_id evt:object/,
)

const validation = await loadAndValidateSedbMathState()
assert.equal(validation.ok, true, validation.errors.join('\n'))

console.log('SEDB-Math store and event tests passed.')
