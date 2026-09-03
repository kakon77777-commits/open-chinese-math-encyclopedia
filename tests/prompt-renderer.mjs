import assert from 'node:assert/strict'
import { createModelPolicy } from '../runtime/providers/model-policy.js'
import { resolveOutputSchema } from '../runtime/providers/output-schema-registry.js'
import { buildProviderMessages } from '../runtime/providers/prompt-renderer.js'

const policyRuntime = createModelPolicy({ provider: 'glm', model: 'glm-5.3-flash' })
const request = {
  role: 'designer',
  prompt_class: 'design_contract',
  context: {
    task: { task_id: 'task-atlas-natural-number', target_mko_id: 'mko-natural-number' },
    input_context: { source_note: 'canonical prerequisite context only' },
  },
  output_schema_id: 'ocme-design-contract-v0.1',
  run_metadata: {},
}
const policy = policyRuntime.resolve(request)
const schema = await resolveOutputSchema(request.output_schema_id)
assert.equal(schema.$id.includes('design-contract'), true)

const messages = buildProviderMessages({ request, policy, outputSchema: schema })
assert.equal(messages.length, 2)
assert.equal(messages[0].role, 'system')
assert.equal(messages[1].role, 'user')
assert.match(messages[0].content, /Designer/i)
assert.match(messages[0].content, /JSON/i)
assert.match(messages[0].content, /canonical/i)
assert.match(messages[0].content, /truth/i)
assert.match(messages[0].content, /hidden reasoning/i)
assert.match(messages[1].content, /ocme-design-contract-v0\.1/)
assert.match(messages[1].content, /task-atlas-natural-number/)
assert.match(messages[1].content, /required_claims/)
assert.equal(messages.some(message => message.content.includes('super-secret-api-key')), false)

const parsedUser = JSON.parse(messages[1].content)
assert.equal(parsedUser.output_schema_id, 'ocme-design-contract-v0.1')
assert.deepEqual(parsedUser.context, request.context)
assert.deepEqual(parsedUser.output_schema, schema)

for (const schemaId of [
  'ocme-design-contract-v0.1',
  'ocme-candidate-envelope-v0.1',
  'ocme-verification-report-v0.1',
  'ocme-repair-patch-v0.1',
]) {
  const resolved = await resolveOutputSchema(schemaId)
  assert.equal(typeof resolved.$id, 'string')
}

await assert.rejects(() => resolveOutputSchema('ocme-unknown-v0.1'), /unsupported output schema/)

console.log('R6 prompt and output-schema registry RED/GREEN tests passed.')
