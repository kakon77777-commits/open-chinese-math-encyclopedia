import assert from 'node:assert/strict'
import { assertProviderAdapter, validateProviderRequest } from '../runtime/providers/provider-interface.js'
import { FakeProvider } from '../runtime/providers/fake-provider.js'

assert.throws(() => assertProviderAdapter(null), /provider/)
assert.throws(() => assertProviderAdapter({}), /run/)

const request = {
  role: 'designer',
  prompt_class: 'design_contract',
  context: { task_id: 'task-atlas-example' },
  output_schema_id: 'ocme-design-contract-v0.1',
  run_metadata: { fixture_key: 'example' },
}
assert.deepEqual(validateProviderRequest(request), request)
assert.throws(() => validateProviderRequest({ ...request, role: 'canonicalizer' }), /role/)
assert.throws(() => validateProviderRequest({ ...request, prompt_class: '' }), /prompt_class/)
assert.throws(() => validateProviderRequest({ ...request, context: null }), /context/)
assert.throws(() => validateProviderRequest({ ...request, output_schema_id: '' }), /output_schema_id/)
assert.throws(() => validateProviderRequest({ ...request, reasoning_trace: 'forbidden' }), /unsupported provider request field/)

const fixtureOutput = { schema_version: 'fixture-v0.1', value: 'deterministic' }
const provider = new FakeProvider({
  fixtures: {
    'designer:design_contract:example': fixtureOutput,
  },
})
assertProviderAdapter(provider)
const first = await provider.run(request)
const second = await provider.run(request)
assert.deepEqual(first.structured_output, fixtureOutput)
assert.deepEqual(second.structured_output, fixtureOutput)
assert.deepEqual(first.structured_output, second.structured_output)
assert.equal(first.provider_metadata.provider, 'fake')
assert.equal(first.provider_metadata.fixture_key, 'designer:design_contract:example')
assert.equal(first.usage.input_units, 0)
assert.equal(first.usage.output_units, 0)

first.structured_output.value = 'mutated by caller'
const third = await provider.run(request)
assert.equal(third.structured_output.value, 'deterministic')

await assert.rejects(
  () => provider.run({ ...request, run_metadata: { fixture_key: 'missing' } }),
  /missing fake provider fixture/,
)

console.log('Provider interface and deterministic Fake Provider tests passed.')
