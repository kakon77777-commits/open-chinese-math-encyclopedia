import { listObjects } from '../lib/store.js'
import {
  loadSedbMathObjectStates,
  loadSedbMathClaimStates,
  loadSedbMathEvents,
  loadAndValidateSedbMathState,
} from '../lib/sedb-math-store.js'

const knownObjectIds = (await listObjects()).map(object => object.id)
const [objectStates, claimStates, events] = await Promise.all([
  loadSedbMathObjectStates(),
  loadSedbMathClaimStates(),
  loadSedbMathEvents(),
])
const result = await loadAndValidateSedbMathState({ knownObjectIds })

if (!result.ok) {
  console.error(result.errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `SEDB-Math validation passed: ${objectStates.length} object states, ${claimStates.length} claim states, ${events.length} events.`,
  )
}
