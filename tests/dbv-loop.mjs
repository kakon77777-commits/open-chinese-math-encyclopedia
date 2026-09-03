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
    required_claims: ['State the target concept with explicit assumptions.'],
    required_prerequisites: [...task.prerequisite_atlas_ids],
    evidence_requirements: [],
    counterexample_classes: ['Boundary cases.'],
    formalization_requirements: [],
    failure_tests: ['Reject missing assumptions.'],
    completion_criteria: ['All blocking objections are resolved or escalated.'],
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
    candidate_artifact: {
      title: 'Candidate',
      claims: ['Initial claim without the explicit assumption.'],
    },
    uncertainties: ['Assumption completeness is unresolved.'],
    evidence_refs: [],
    proposed_relations: [],
  }
}

function criticalReport(task, candidate) {
  return {
    schema_version: 'ocme-verification-report-v0.1',
    report_id: `verification-${candidate.candidate_revision_id}`,
    task_id: task.task_id,
    target_candidate_revision_id: candidate.candidate_revision_id,
    objections: [
      {
        objection_id: `objection-${candidate.candidate_revision_id}-001`,
        target_candidate_revision_id: candidate.candidate_revision_id,
        target_candidate_id: candidate.candidate_id,
        type: 'missing_assumption',
        severity: 'critical',
        reason: 'The domain assumption is missing.',
        evidence_refs: [],
        status: 'open',
      },
    ],
    verification_passes: ['identity_binding'],
    counterexample_attempts: [],
    recomputed_results: [],
    unresolved_risks: ['Assumption completeness.'],
  }
}

function repairFor(task, candidate, objectionId) {
  return {
    schema_version: 'ocme-repair-patch-v0.1',
    patch_id: `repair-${candidate.candidate_revision_id}-to-r1`,
    task_id: task.task_id,
    source_candidate_revision_id: candidate.candidate_revision_id,
    next_candidate_revision_id: `candidate-${task.task_id}-r1`,
    candidate_id: candidate.candidate_id,
    resolves_objections: [objectionId],
    resolution_evidence: [{ objection_id: objectionId, note: 'The explicit domain assumption was added.' }],
    operations: [
      {
        op: 'replace',
        path: '/candidate_artifact/claims/0',
        value: 'Under the explicit domain assumption, the repaired claim is stated.',
      },
      {
        op: 'remove',
        path: '/uncertainties/0'
      }
    ],
    evidence_updates: [],
    dependency_impact: [],
  }
}

function cleanReport(task, candidateRevisionId) {
  return {
    schema_version: 'ocme-verification-report-v0.1',
    report_id: `verification-${candidateRevisionId}`,
    task_id: task.task_id,
    target_candidate_revision_id: candidateRevisionId,
    objections: [],
    verification_passes: ['identity_binding', 'assumption_explicit'],
    counterexample_attempts: [],
    recomputed_results: [],
    unresolved_risks: [],
  }
}

const successCandidate = candidateFor(successTask)
const successCritical = criticalReport(successTask, successCandidate)
const successObjectionId = successCritical.objections[0].objection_id
const successFixtures = {
  [`designer:design_contract:${successTask.task_id}`]: contractFor(successTask),
  [`builder:candidate_build:${successTask.task_id}`]: successCandidate,
  [`verifier:candidate_verify:${successCandidate.candidate_revision_id}`]: successCritical,
  [`builder:builder_repair:${successCandidate.candidate_revision_id}`]: repairFor(successTask, successCandidate, successObjectionId),
  [`verifier:candidate_verify:candidate-${successTask.task_id}-r1`]: cleanReport(successTask, `candidate-${successTask.task_id}-r1`),
}

const successTaskSnapshot = structuredClone(successTask)
const success = await runDbvLoop({
  provider: new FakeProvider({ fixtures: successFixtures }),
  task: successTask,
  contexts: { designer: {}, builder: {}, verifier: {}, repair: {} },
  maxAttempts: 3,
  majorThreshold: 0,
  mechanicalState: 'not_run',
})
assert.deepEqual(successTask, successTaskSnapshot)
assert.equal(success.status, 'converged')
assert.equal(success.attempts, 2)
assert.equal(success.candidate.candidate_revision_id, `candidate-${successTask.task_id}-r1`)
assert.equal(success.ledger.length, 1)
assert.equal(success.ledger[0].objection_id, successObjectionId)
assert.equal(success.ledger[0].status, 'resolved')
assert.equal(success.verification_reports.length, 2)
assert.equal(success.repair_patches.length, 1)

function assertNoForbiddenKeys(value) {
  if (Array.isArray(value)) return value.forEach(assertNoForbiddenKeys)
  if (!value || typeof value !== 'object') return
  for (const [key, nested] of Object.entries(value)) {
    assert.notEqual(key, 'canonical_state')
    assert.notEqual(key, 'canonical_verdict')
    assert.notEqual(key, 'reasoning_trace')
    assert.notEqual(key, 'chain_of_thought')
    assertNoForbiddenKeys(nested)
  }
}
assertNoForbiddenKeys(success)

const escalationCandidate = candidateFor(escalationTask)
const escalationFixtures = {
  [`designer:design_contract:${escalationTask.task_id}`]: contractFor(escalationTask),
  [`builder:candidate_build:${escalationTask.task_id}`]: escalationCandidate,
  [`verifier:candidate_verify:${escalationCandidate.candidate_revision_id}`]: criticalReport(escalationTask, escalationCandidate),
}
const escalationTaskSnapshot = structuredClone(escalationTask)
const escalation = await runDbvLoop({
  provider: new FakeProvider({ fixtures: escalationFixtures }),
  task: escalationTask,
  contexts: { designer: {}, builder: {}, verifier: {}, repair: {} },
  maxAttempts: 1,
  majorThreshold: 0,
  mechanicalState: 'passed',
})
assert.deepEqual(escalationTask, escalationTaskSnapshot)
assert.equal(escalation.status, 'escalation_required')
assert.equal(escalation.attempts, 1)
assert.equal(escalation.repair_patches.length, 0)
assert.equal(escalation.ledger[0].status, 'open')
assertNoForbiddenKeys(escalation)

console.log('Offline Designer/Builder/Verifier loop tests passed.')
