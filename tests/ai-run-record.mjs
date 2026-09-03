import assert from 'node:assert/strict'
import { sha256CanonicalJson } from '../lib/canonical-json.js'
import { validateAiRunRecord } from '../lib/ai-run-record-validation.js'

const request = {
  role: 'designer',
  prompt_class: 'design_contract',
  context: { task: { task_id: 'task-atlas-natural-number' } },
  output_schema_id: 'ocme-design-contract-v0.1',
  run_metadata: { fixture_key: 'task-atlas-natural-number' },
}

const policy = {
  policy_version: 'ocme-model-policy-v0.1',
  provider: 'glm',
  model: 'glm-5.3-flash',
  model_version: 'glm-5.3-flash',
  prompt_id: 'ocme-designer-v0.1',
  prompt_version: '0.1',
  context_class: 'atlas_design_context',
  source_set_id: 'canonical_prerequisite_context',
  tool_set_id: 'none',
  verification_goal: 'contract_construction',
  request_options: { thinking: { type: 'enabled' }, max_tokens: 8192, do_sample: false },
}

const response = {
  structured_output: { schema_version: 'fixture-v0.1', value: 'ok' },
  usage: { input_units: 10, output_units: 4, total_units: 14, cached_input_units: 2 },
  provider_metadata: { provider: 'glm', model: 'glm-5.3-flash', network_used: true },
}

const validRecord = {
  schema_version: 'ocme-ai-run-record-v0.1',
  run_id: 'ai-run-designer-000001',
  provider: 'glm',
  model: 'glm-5.3-flash',
  model_version: 'glm-5.3-flash',
  role: 'designer',
  prompt_id: 'ocme-designer-v0.1',
  prompt_version: '0.1',
  prompt_class: 'design_contract',
  context_class: 'atlas_design_context',
  source_set_id: 'canonical_prerequisite_context',
  tool_set_id: 'none',
  verification_goal: 'contract_construction',
  input_sha256: sha256CanonicalJson({ request, policy }),
  output_sha256: sha256CanonicalJson(response.structured_output),
  started_at: '2026-09-03T11:30:00.000Z',
  duration_ms: 120,
  usage: { input_units: 10, output_units: 4, total_units: 14, cached_input_units: 2 },
  billing: { status: 'not_computed', amount: null, currency: null },
  network_used: true,
}

const valid = await validateAiRunRecord(validRecord, { request, policy, response })
assert.equal(valid.ok, true, valid.errors.join('\n'))

for (const [name, mutate, pattern] of [
  ['input hash', record => { record.input_sha256 = '0'.repeat(64) }, /input_sha256/],
  ['output hash', record => { record.output_sha256 = '0'.repeat(64) }, /output_sha256/],
  ['role', record => { record.role = 'verifier' }, /role/],
  ['prompt', record => { record.prompt_id = 'ocme-other-v0.1' }, /prompt_id/],
  ['provider', record => { record.provider = 'fake' }, /provider/],
  ['model', record => { record.model = 'other-model' }, /model/],
]) {
  const record = structuredClone(validRecord)
  mutate(record)
  const result = await validateAiRunRecord(record, { request, policy, response })
  assert.equal(result.ok, false, `${name} mutation must fail`)
  assert.match(result.errors.join('\n'), pattern)
}

for (const forbiddenKey of ['api_key', 'authorization', 'reasoning_content', 'canonical_verdict', 'mathematically_true']) {
  const record = structuredClone(validRecord)
  record[forbiddenKey] = 'forbidden'
  const result = await validateAiRunRecord(record, { request, policy, response })
  assert.equal(result.ok, false, `${forbiddenKey} must be forbidden`)
}

const badBilling = structuredClone(validRecord)
badBilling.billing = { status: 'not_computed', amount: 1, currency: 'USD' }
const billingResult = await validateAiRunRecord(badBilling, { request, policy, response })
assert.equal(billingResult.ok, false)
assert.match(billingResult.errors.join('\n'), /billing/)

console.log('R6 AI Run Record RED/GREEN tests passed.')
