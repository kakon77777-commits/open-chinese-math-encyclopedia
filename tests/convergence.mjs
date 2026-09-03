import assert from 'node:assert/strict'
import { evaluateConvergence } from '../runtime/production/convergence.js'

function objection(id, severity, status = 'open') {
  return {
    objection_id: id,
    target_candidate_revision_id: 'candidate-task-atlas-example-r0',
    target_candidate_id: 'mko-example',
    type: 'other',
    severity,
    reason: `${severity} test objection`,
    evidence_refs: [],
    status,
  }
}

assert.deepEqual(
  evaluateConvergence({ ledger: [], attempt: 1, maxAttempts: 3, majorThreshold: 0, mechanicalState: 'failed' }),
  { status: 'blocked', open_critical: 0, open_major: 0, attempt: 1, max_attempts: 3 },
)

assert.equal(
  evaluateConvergence({
    ledger: [objection('objection-critical', 'critical')],
    attempt: 1,
    maxAttempts: 3,
    majorThreshold: 0,
    mechanicalState: 'not_run',
  }).status,
  'continue',
)

assert.equal(
  evaluateConvergence({
    ledger: [objection('objection-critical', 'critical')],
    attempt: 3,
    maxAttempts: 3,
    majorThreshold: 0,
    mechanicalState: 'passed',
  }).status,
  'escalation_required',
)

assert.equal(
  evaluateConvergence({
    ledger: [objection('objection-major-1', 'major'), objection('objection-major-2', 'major')],
    attempt: 1,
    maxAttempts: 2,
    majorThreshold: 1,
    mechanicalState: 'not_run',
  }).status,
  'continue',
)

assert.equal(
  evaluateConvergence({
    ledger: [objection('objection-major-1', 'major'), objection('objection-major-2', 'major')],
    attempt: 2,
    maxAttempts: 2,
    majorThreshold: 1,
    mechanicalState: 'passed',
  }).status,
  'escalation_required',
)

const converged = evaluateConvergence({
  ledger: [
    objection('objection-resolved-critical', 'critical', 'resolved'),
    objection('objection-minor', 'minor'),
  ],
  attempt: 2,
  maxAttempts: 3,
  majorThreshold: 0,
  mechanicalState: 'passed',
})
assert.equal(converged.status, 'converged')
assert.equal(converged.open_critical, 0)
assert.equal(converged.open_major, 0)
assert.notEqual(converged.status, 'canonical')

assert.throws(
  () => evaluateConvergence({ ledger: [], attempt: 0, maxAttempts: 3, majorThreshold: 0, mechanicalState: 'passed' }),
  /attempt/,
)
assert.throws(
  () => evaluateConvergence({ ledger: [], attempt: 1, maxAttempts: 0, majorThreshold: 0, mechanicalState: 'passed' }),
  /maxAttempts/,
)
assert.throws(
  () => evaluateConvergence({ ledger: [], attempt: 1, maxAttempts: 3, majorThreshold: -1, mechanicalState: 'passed' }),
  /majorThreshold/,
)
assert.throws(
  () => evaluateConvergence({ ledger: [], attempt: 1, maxAttempts: 3, majorThreshold: 0, mechanicalState: 'canonical' }),
  /mechanicalState/,
)

console.log('Deterministic convergence and escalation tests passed.')
