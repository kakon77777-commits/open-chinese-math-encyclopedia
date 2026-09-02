import assert from 'node:assert/strict'
import { validateSedbMathBundle } from '../lib/sedb-math-validation.js'

function makeValidBundle() {
  return {
    objectStates: [
      {
        schema_version: 'ocme-sedb-math-object-state-v0.1',
        id: 'state:mko-demo',
        object_id: 'mko-demo',
        state: 'canonical',
        content_version: '0.1.0',
        policy_version: 'ocme-sedb-math-policy-v0.1',
        latest_event_id: 'evt:object-canonical',
      },
    ],
    claimStates: [
      {
        schema_version: 'ocme-sedb-math-claim-state-v0.1',
        id: 'claim-state:demo',
        claim_id: 'claim:demo',
        object_id: 'mko-demo',
        statement: 'Demo claim.',
        assumptions: [],
        scope: {},
        state: 'verified',
        evidence_refs: [],
        verification_refs: [],
        latest_event_id: 'evt:claim-verified',
      },
    ],
    events: [
      {
        schema_version: 'ocme-sedb-math-event-v0.1',
        event_id: 'evt:object-verified',
        object_id: 'mko-demo',
        event_type: 'state_transition',
        from_state: 'under_review',
        to_state: 'verified',
        reason: 'Independent verification completed.',
        actor: 'test:verifier',
        policy_version: 'ocme-sedb-math-policy-v0.1',
        evidence_refs: [],
        created_at: '2026-09-02T16:00:00Z',
      },
      {
        schema_version: 'ocme-sedb-math-event-v0.1',
        event_id: 'evt:object-canonical',
        object_id: 'mko-demo',
        event_type: 'state_transition',
        from_state: 'verified',
        to_state: 'canonical',
        reason: 'Canonical gate accepted verified state.',
        actor: 'test:policy',
        policy_version: 'ocme-sedb-math-policy-v0.1',
        evidence_refs: [],
        created_at: '2026-09-02T16:01:00Z',
      },
      {
        schema_version: 'ocme-sedb-math-event-v0.1',
        event_id: 'evt:claim-verified',
        object_id: 'mko-demo',
        claim_id: 'claim:demo',
        event_type: 'state_transition',
        from_state: 'under_review',
        to_state: 'verified',
        reason: 'Claim verification completed.',
        actor: 'test:verifier',
        policy_version: 'ocme-sedb-math-policy-v0.1',
        evidence_refs: [],
        created_at: '2026-09-02T16:02:00Z',
      },
    ],
  }
}

async function validate(bundle) {
  return validateSedbMathBundle(bundle, { knownObjectIds: ['mko-demo'] })
}

const valid = await validate(makeValidBundle())
assert.equal(valid.ok, true, valid.errors.join('\n'))

const unknownState = makeValidBundle()
unknownState.objectStates[0].state = 'magically_canonical'
assert.equal((await validate(unknownState)).ok, false)

const missingReason = makeValidBundle()
delete missingReason.events[0].reason
assert.equal((await validate(missingReason)).ok, false)

const missingActor = makeValidBundle()
delete missingActor.events[0].actor
assert.equal((await validate(missingActor)).ok, false)

const missingPolicy = makeValidBundle()
delete missingPolicy.events[0].policy_version
assert.equal((await validate(missingPolicy)).ok, false)

const illegalTransition = makeValidBundle()
illegalTransition.events[0].from_state = 'canonical'
illegalTransition.events[0].to_state = 'draft'
assert.equal((await validate(illegalTransition)).ok, false)

const duplicateEvent = makeValidBundle()
duplicateEvent.events.push(structuredClone(duplicateEvent.events[0]))
assert.equal((await validate(duplicateEvent)).ok, false)

const unknownClaimObject = makeValidBundle()
unknownClaimObject.claimStates[0].object_id = 'mko-missing'
assert.equal((await validate(unknownClaimObject)).ok, false)

const wrongLatestEvent = makeValidBundle()
wrongLatestEvent.claimStates[0].latest_event_id = 'evt:object-verified'
assert.equal((await validate(wrongLatestEvent)).ok, false)

const fakeCanonical = makeValidBundle()
fakeCanonical.objectStates[0].latest_event_id = 'evt:object-verified'
fakeCanonical.events = fakeCanonical.events.filter(event => event.event_id !== 'evt:object-canonical')
assert.equal((await validate(fakeCanonical)).ok, false)

console.log('SEDB-Math negative validation tests passed.')
