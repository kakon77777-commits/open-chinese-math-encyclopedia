import assert from 'node:assert/strict'
import { sha256CanonicalJson } from '../lib/canonical-json.js'
import { validateAiRunRecord } from '../lib/ai-run-record-validation.js'
import { FakeProvider } from '../runtime/providers/fake-provider.js'
import { ProviderRegistry } from '../runtime/providers/provider-registry.js'
import { createModelPolicy } from '../runtime/providers/model-policy.js'
import { ProviderRuntime } from '../runtime/providers/provider-runtime.js'

const request = {
  role: 'designer',
  prompt_class: 'design_contract',
  context: { task: { task_id: 'task-atlas-natural-number' } },
  output_schema_id: 'ocme-design-contract-v0.1',
  run_metadata: { fixture_key: 'example' },
}
const fixture = { schema_version: 'fixture-v0.1', value: 'runtime-ok' }
const fake = new FakeProvider({ fixtures: { 'designer:design_contract:example': fixture } })
const registry = new ProviderRegistry().register('fake', fake)
const modelPolicy = createModelPolicy({ provider: 'fake', model: 'fake-model-v1' })
let now = 1000
const runtime = new ProviderRuntime({
  registry,
  modelPolicy,
  clock: () => { const value = now; now += 7; return value },
  idFactory: ({ index, request: input }) => `ai-run-${input.role}-${String(index).padStart(6, '0')}`,
})

const response = await runtime.run(request)
assert.deepEqual(response.structured_output, fixture)
assert.equal(response.provider_metadata.run_id, 'ai-run-designer-000001')
assert.equal(response.provider_metadata.provider, 'fake')

const records = runtime.getRunRecords()
assert.equal(records.length, 1)
const record = records[0]
const policy = modelPolicy.resolve(request)
assert.equal(record.input_sha256, sha256CanonicalJson({ request, policy }))
assert.equal(record.output_sha256, sha256CanonicalJson(fixture))
assert.equal(record.provider, 'fake')
assert.equal(record.model, 'fake-model-v1')
assert.equal(record.network_used, false)
assert.equal(record.duration_ms, 7)
assert.equal(record.started_at, '1970-01-01T00:00:01.000Z')

const validation = await validateAiRunRecord(record, {
  request,
  policy,
  response,
})
assert.equal(validation.ok, true, validation.errors.join('\n'))

records[0].provider = 'mutated'
assert.equal(runtime.getRunRecords()[0].provider, 'fake')

await assert.rejects(
  () => runtime.run({ ...request, run_metadata: { ...request.run_metadata, provider_policy: { provider: 'fake' } } }),
  /provider_policy is runtime-owned/,
)
assert.equal(runtime.getRunRecords().length, 1)

const failingRegistry = new ProviderRegistry()
failingRegistry.register('broken', { async run() { throw new Error('provider exploded') } })
failingRegistry.register('fake', fake)
const failingRuntime = new ProviderRuntime({
  registry: failingRegistry,
  modelPolicy: createModelPolicy({ provider: 'broken', model: 'broken-model' }),
  clock: () => 1000,
  idFactory: () => 'ai-run-broken-000001',
})
await assert.rejects(() => failingRuntime.run(request), /provider exploded/)
assert.equal(failingRuntime.getRunRecords().length, 0)

const resolvedRegistry = new ProviderRegistry().register('versioned', {
  async run() {
    return {
      structured_output: structuredClone(fixture),
      usage: { input_units: 3, output_units: 2, total_units: 5, cached_input_units: 0 },
      provider_metadata: {
        provider: 'versioned',
        model: 'glm-alias',
        model_version: 'glm-resolved-2026-09-03',
        network_used: true,
      },
    }
  },
})
const resolvedPolicy = createModelPolicy({ provider: 'versioned', model: 'glm-alias' })
const resolvedRuntime = new ProviderRuntime({
  registry: resolvedRegistry,
  modelPolicy: resolvedPolicy,
  clock: () => 2000,
  idFactory: () => 'ai-run-versioned-000001',
})
const resolvedResponse = await resolvedRuntime.run(request)
const resolvedRecord = resolvedRuntime.getRunRecords()[0]
assert.equal(resolvedRecord.model, 'glm-alias', 'model records the requested policy model')
assert.equal(resolvedRecord.model_version, 'glm-resolved-2026-09-03', 'model_version records provider-resolved provenance')
const resolvedValidation = await validateAiRunRecord(resolvedRecord, {
  request,
  policy: resolvedPolicy.resolve(request),
  response: resolvedResponse,
})
assert.equal(resolvedValidation.ok, true, resolvedValidation.errors.join('\n'))

console.log('R6 ProviderRuntime RED/GREEN tests passed.')
