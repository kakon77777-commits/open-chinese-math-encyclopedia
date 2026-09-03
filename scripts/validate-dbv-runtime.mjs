import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { FakeProvider } from '../runtime/providers/fake-provider.js'
import { runDbvLoop } from '../runtime/production/dbv-loop.js'

const [successTask, escalationTask] = await loadMaterializationTasks()

function contractFor(task) {
  return {
    schema_version: 'ocme-design-contract-v0.1',
    contract_id: `contract-${task.task_id}`,
    task_id: task.task_id,
    target_mko_id: task.target_mko_id,
    required_claims: ['State the target with explicit assumptions.'],
    required_prerequisites: [...task.prerequisite_atlas_ids],
    evidence_requirements: [],
    counterexample_classes: [],
    formalization_requirements: [],
    failure_tests: ['Reject missing assumptions.'],
    completion_criteria: ['Blocking objections are resolved or escalated.'],
    risk_notes: [],
  }
}

function candidateFor(task) {
  return {
    schema_version: 'ocme-candidate-envelope-v0.1',
    candidate_revision_id: `candidate-${task.task_id}-r0`,
    task_id: task.task_id,
    target_mko_id: task.target_mko_id,
    candidate_id: task.target_mko_id,
    candidate_artifact: { claims: ['Initial claim.'] },
    uncertainties: ['Assumption completeness is unresolved.'],
    evidence_refs: [],
    proposed_relations: [],
  }
}

function criticalReport(task, candidate) {
  const objectionId = `objection-${candidate.candidate_revision_id}-001`
  return {
    schema_version: 'ocme-verification-report-v0.1',
    report_id: `verification-${candidate.candidate_revision_id}`,
    task_id: task.task_id,
    target_candidate_revision_id: candidate.candidate_revision_id,
    objections: [{
      objection_id: objectionId,
      target_candidate_revision_id: candidate.candidate_revision_id,
      target_candidate_id: candidate.candidate_id,
      type: 'missing_assumption',
      severity: 'critical',
      reason: 'The assumption is missing.',
      evidence_refs: [],
      status: 'open',
    }],
    verification_passes: [],
    counterexample_attempts: [],
    recomputed_results: [],
    unresolved_risks: ['Assumption completeness.'],
  }
}

function cleanReport(task, revisionId) {
  return {
    schema_version: 'ocme-verification-report-v0.1',
    report_id: `verification-${revisionId}`,
    task_id: task.task_id,
    target_candidate_revision_id: revisionId,
    objections: [],
    verification_passes: ['assumption_explicit'],
    counterexample_attempts: [],
    recomputed_results: [],
    unresolved_risks: [],
  }
}

function fixturesForSuccess(task) {
  const candidate = candidateFor(task)
  const report = criticalReport(task, candidate)
  const objectionId = report.objections[0].objection_id
  const repairedRevision = `candidate-${task.task_id}-r1`
  return {
    [`designer:design_contract:${task.task_id}`]: contractFor(task),
    [`builder:candidate_build:${task.task_id}`]: candidate,
    [`verifier:candidate_verify:${candidate.candidate_revision_id}`]: report,
    [`builder:builder_repair:${candidate.candidate_revision_id}`]: {
      schema_version: 'ocme-repair-patch-v0.1',
      patch_id: `repair-${candidate.candidate_revision_id}-to-r1`,
      task_id: task.task_id,
      source_candidate_revision_id: candidate.candidate_revision_id,
      next_candidate_revision_id: repairedRevision,
      candidate_id: candidate.candidate_id,
      resolves_objections: [objectionId],
      resolution_evidence: [{ objection_id: objectionId, note: 'Explicit assumption added.' }],
      operations: [
        { op: 'replace', path: '/candidate_artifact/claims/0', value: 'Claim with explicit assumption.' },
        { op: 'remove', path: '/uncertainties/0' }
      ],
      evidence_updates: [],
      dependency_impact: [],
    },
    [`verifier:candidate_verify:${repairedRevision}`]: cleanReport(task, repairedRevision),
  }
}

function fixturesForEscalation(task) {
  const candidate = candidateFor(task)
  return {
    [`designer:design_contract:${task.task_id}`]: contractFor(task),
    [`builder:candidate_build:${task.task_id}`]: candidate,
    [`verifier:candidate_verify:${candidate.candidate_revision_id}`]: criticalReport(task, candidate),
  }
}

const successSnapshot = structuredClone(successTask)
const success = await runDbvLoop({
  provider: new FakeProvider({ fixtures: fixturesForSuccess(successTask) }),
  task: successTask,
  contexts: {},
  maxAttempts: 3,
  majorThreshold: 0,
  mechanicalState: 'not_run',
})
assert.deepEqual(successTask, successSnapshot)
assert.equal(success.status, 'converged')
assert.equal(success.attempts, 2)
assert.equal(success.ledger.length, 1)
assert.equal(success.ledger[0].status, 'resolved')

const escalationSnapshot = structuredClone(escalationTask)
const escalation = await runDbvLoop({
  provider: new FakeProvider({ fixtures: fixturesForEscalation(escalationTask) }),
  task: escalationTask,
  contexts: {},
  maxAttempts: 1,
  majorThreshold: 0,
  mechanicalState: 'passed',
})
assert.deepEqual(escalationTask, escalationSnapshot)
assert.equal(escalation.status, 'escalation_required')
assert.equal(escalation.attempts, 1)

console.log('DBV runtime validation passed: converged fixture in 2 attempts; escalation fixture in 1 attempt; deterministic Fake Provider only.')
