import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { FakeProvider } from '../runtime/providers/fake-provider.js'
import { ProviderRegistry } from '../runtime/providers/provider-registry.js'
import { createModelPolicy } from '../runtime/providers/model-policy.js'
import { ProviderRuntime } from '../runtime/providers/provider-runtime.js'
import { runDbvLoop } from '../runtime/production/dbv-loop.js'

const [task] = await loadMaterializationTasks()

const contract = {
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

const candidate = {
  schema_version: 'ocme-candidate-envelope-v0.1',
  candidate_revision_id: `candidate-${task.task_id}-r0`,
  task_id: task.task_id,
  target_mko_id: task.target_mko_id,
  candidate_id: task.target_mko_id,
  candidate_artifact: { title: 'Candidate', claims: ['Initial claim.'] },
  uncertainties: ['Assumption completeness is unresolved.'],
  evidence_refs: [],
  proposed_relations: [],
}

const objectionId = `objection-${candidate.candidate_revision_id}-001`
const critical = {
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
    reason: 'The domain assumption is missing.',
    evidence_refs: [],
    status: 'open',
  }],
  verification_passes: ['identity_binding'],
  counterexample_attempts: [],
  recomputed_results: [],
  unresolved_risks: ['Assumption completeness.'],
}

const repair = {
  schema_version: 'ocme-repair-patch-v0.1',
  patch_id: `repair-${candidate.candidate_revision_id}-to-r1`,
  task_id: task.task_id,
  source_candidate_revision_id: candidate.candidate_revision_id,
  next_candidate_revision_id: `candidate-${task.task_id}-r1`,
  candidate_id: candidate.candidate_id,
  resolves_objections: [objectionId],
  resolution_evidence: [{ objection_id: objectionId, note: 'Explicit assumption added.' }],
  operations: [
    { op: 'replace', path: '/candidate_artifact/claims/0', value: 'Repaired claim with explicit assumption.' },
    { op: 'remove', path: '/uncertainties/0' },
  ],
  evidence_updates: [],
  dependency_impact: [],
}

const clean = {
  schema_version: 'ocme-verification-report-v0.1',
  report_id: `verification-candidate-${task.task_id}-r1`,
  task_id: task.task_id,
  target_candidate_revision_id: `candidate-${task.task_id}-r1`,
  objections: [],
  verification_passes: ['identity_binding', 'assumption_explicit'],
  counterexample_attempts: [],
  recomputed_results: [],
  unresolved_risks: [],
}

const fixtures = {
  [`designer:design_contract:${task.task_id}`]: contract,
  [`builder:candidate_build:${task.task_id}`]: candidate,
  [`verifier:candidate_verify:${candidate.candidate_revision_id}`]: critical,
  [`builder:builder_repair:${candidate.candidate_revision_id}`]: repair,
  [`verifier:candidate_verify:candidate-${task.task_id}-r1`]: clean,
}

const registry = new ProviderRegistry().register('fake', new FakeProvider({ fixtures }))
const modelPolicy = createModelPolicy({ provider: 'fake', model: 'fake-shared-model' })
let now = 1000
const runtime = new ProviderRuntime({
  registry,
  modelPolicy,
  clock: () => { const value = now; now += 1; return value },
  idFactory: ({ index, request }) => `ai-run-${request.role}-${String(index).padStart(6, '0')}`,
})

const result = await runDbvLoop({
  provider: runtime,
  task,
  contexts: { designer: {}, builder: {}, verifier: {}, repair: {} },
  maxAttempts: 3,
  majorThreshold: 0,
  mechanicalState: 'not_run',
})
assert.equal(result.status, 'converged')
assert.equal(result.attempts, 2)

const records = runtime.getRunRecords()
assert.equal(records.length, 5)
assert.deepEqual(records.map(record => record.prompt_class), [
  'design_contract',
  'candidate_build',
  'candidate_verify',
  'builder_repair',
  'candidate_verify',
])
assert.equal(new Set(records.map(record => record.model)).size, 1)
assert.equal(new Set(records.map(record => record.prompt_id)).size, 4)
assert.equal(new Set(records.map(record => record.context_class)).size, 4)
assert.equal(new Set(records.map(record => record.source_set_id)).size, 4)
assert.equal(new Set(records.map(record => record.verification_goal)).size, 4)
assert.equal(records.every(record => record.network_used === false), true)
assert.equal(records.every(record => !Object.hasOwn(record, 'reasoning_content')), true)
assert.equal(records.every(record => !Object.hasOwn(record, 'canonical_verdict')), true)

console.log('R6 existing DBV loop through ProviderRuntime RED/GREEN tests passed.')
