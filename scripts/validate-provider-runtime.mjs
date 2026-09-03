import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { FakeProvider } from '../runtime/providers/fake-provider.js'
import { GlmAdapter } from '../runtime/providers/glm-adapter.js'
import { createModelPolicy } from '../runtime/providers/model-policy.js'
import { ProviderRegistry } from '../runtime/providers/provider-registry.js'
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
  candidate_artifact: { title: 'Offline candidate', claims: ['Initial claim.'] },
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

const offlineRegistry = new ProviderRegistry().register('fake', new FakeProvider({ fixtures }))
const offlinePolicy = createModelPolicy({ provider: 'fake', model: 'fake-shared-model' })
let now = 1000
const offlineRuntime = new ProviderRuntime({
  registry: offlineRegistry,
  modelPolicy: offlinePolicy,
  clock: () => { const value = now; now += 1; return value },
  idFactory: ({ index, request }) => `ai-run-${request.role}-${String(index).padStart(6, '0')}`,
})
const dbv = await runDbvLoop({
  provider: offlineRuntime,
  task,
  contexts: { designer: {}, builder: {}, verifier: {}, repair: {} },
  maxAttempts: 3,
  majorThreshold: 0,
  mechanicalState: 'not_run',
})
assert.equal(dbv.status, 'converged')
assert.equal(dbv.attempts, 2)
const records = offlineRuntime.getRunRecords()
assert.equal(records.length, 5)
assert.equal(records.every(record => record.network_used === false), true)
assert.equal(new Set(records.map(record => record.prompt_id)).size, 4)

let networkCalls = 0
let capturedBody = null
const glmAdapter = new GlmAdapter({
  apiKey: 'x',
  fetchImpl: async (_url, options) => {
    networkCalls += 1
    capturedBody = JSON.parse(options.body)
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          id: 'offline-provider-task',
          request_id: 'offline-provider-request',
          model: 'glm-5.3-flash',
          choices: [{
            message: {
              role: 'assistant',
              content: '{"schema_version":"offline-fixture-v0.1","value":"ok"}',
              reasoning_content: 'must-not-cross-boundary',
            },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17, prompt_tokens_details: { cached_tokens: 3 } },
        }
      },
    }
  },
})
const glmPolicyRuntime = createModelPolicy({ provider: 'glm', model: 'glm-5.3-flash' })
const glmRequest = {
  role: 'designer',
  prompt_class: 'design_contract',
  context: { task: { task_id: task.task_id, target_mko_id: task.target_mko_id } },
  output_schema_id: 'ocme-design-contract-v0.1',
  run_metadata: {},
}
const glmPolicy = glmPolicyRuntime.resolve(glmRequest)
const glmResponse = await glmAdapter.run({
  ...glmRequest,
  run_metadata: { provider_policy: glmPolicy, request_id: 'offline-glm-smoke' },
})
assert.equal(networkCalls, 1)
assert.equal(capturedBody.stream, false)
assert.deepEqual(capturedBody.response_format, { type: 'json_object' })
assert.equal(Object.hasOwn(capturedBody, 'tools'), false)
assert.equal(glmResponse.provider_metadata.reasoning_content_discarded, true)
assert.equal(JSON.stringify(glmResponse).includes('must-not-cross-boundary'), false)
assert.deepEqual(glmResponse.usage, { input_units: 12, output_units: 5, total_units: 17, cached_input_units: 3 })

console.log(`R6 provider runtime validation passed: dbv=${dbv.status}/${dbv.attempts} attempts; run_records=${records.length}; glm_transport=injected_fetch_json_mode; live_network=false.`)
console.log('Authority boundary: real-provider transport does not grant mathematical truth, canonicalization, or trust bypass.')
