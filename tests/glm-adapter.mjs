import assert from 'node:assert/strict'
import { GlmAdapter } from '../runtime/providers/glm-adapter.js'

const SECRET = 'super-secret-api-key'
const request = {
  role: 'designer',
  prompt_class: 'design_contract',
  context: { task: { task_id: 'task-atlas-natural-number' } },
  output_schema_id: 'ocme-design-contract-v0.1',
  run_metadata: {
    provider_policy: {
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
      request_options: {
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
        max_tokens: 8192,
        temperature: 0.2,
        top_p: 0.9,
        do_sample: false,
      },
    },
    request_id: 'ocme-test-request-1',
  },
}

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, async json() { return structuredClone(payload) } }
}

const providerPayload = {
  id: 'provider-task-id',
  request_id: 'provider-request-id',
  model: 'glm-5.3-flash',
  choices: [{
    message: {
      role: 'assistant',
      content: '{"schema_version":"fixture-v0.1","value":"ok"}',
      reasoning_content: 'SECRET_CHAIN',
    },
    finish_reason: 'stop',
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 4,
    total_tokens: 14,
    prompt_tokens_details: { cached_tokens: 2 },
  },
}

let captured = null
const adapter = new GlmAdapter({
  apiKey: SECRET,
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
  fetchImpl: async (url, options) => {
    captured = { url, options: structuredClone({ ...options, signal: undefined }) }
    return jsonResponse(providerPayload)
  },
})
assert.equal(Object.hasOwn(adapter, 'apiKey'), false, 'API key must not be a public adapter property')
assert.equal(JSON.stringify(adapter).includes(SECRET), false, 'serializing adapter must not reveal API key')

const response = await adapter.run(request)
assert.equal(captured.url, 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
assert.equal(captured.options.method, 'POST')
assert.equal(captured.options.headers.Authorization, `Bearer ${SECRET}`)
assert.equal(captured.options.headers['Content-Type'], 'application/json')

const body = JSON.parse(captured.options.body)
assert.equal(body.model, 'glm-5.3-flash')
assert.equal(body.stream, false)
assert.deepEqual(body.response_format, { type: 'json_object' })
assert.equal(body.request_id, 'ocme-test-request-1')
assert.deepEqual(body.thinking, { type: 'enabled' })
assert.equal(body.reasoning_effort, 'high')
assert.equal(body.max_tokens, 8192)
assert.equal(body.temperature, 0.2)
assert.equal(body.top_p, 0.9)
assert.equal(body.do_sample, false)
assert.equal(Array.isArray(body.messages), true)
assert.equal(Object.hasOwn(body, 'tools'), false)
assert.equal(Object.hasOwn(body, 'web_search'), false)
assert.equal(Object.hasOwn(body, 'mcp'), false)

assert.deepEqual(response.structured_output, { schema_version: 'fixture-v0.1', value: 'ok' })
assert.deepEqual(response.usage, { input_units: 10, output_units: 4, total_units: 14, cached_input_units: 2 })
assert.equal(response.provider_metadata.provider, 'glm')
assert.equal(response.provider_metadata.model, 'glm-5.3-flash')
assert.equal(response.provider_metadata.provider_task_id, 'provider-task-id')
assert.equal(response.provider_metadata.request_id, 'provider-request-id')
assert.equal(response.provider_metadata.finish_reason, 'stop')
assert.equal(response.provider_metadata.network_used, true)
assert.equal(response.provider_metadata.reasoning_content_discarded, true)
assert.equal(JSON.stringify(response).includes('SECRET_CHAIN'), false)
assert.equal(JSON.stringify(response).includes(SECRET), false)

assert.throws(() => new GlmAdapter({ apiKey: '', fetchImpl: async () => jsonResponse(providerPayload) }), /API key/)
assert.throws(() => new GlmAdapter({ apiKey: SECRET, baseUrl: 'http://example.com/api/paas/v4', fetchImpl: async () => jsonResponse(providerPayload) }), /HTTPS/)

for (const [name, fetchImpl, pattern] of [
  ['http failure', async () => jsonResponse({}, { ok: false, status: 429 }), /HTTP 429/],
  ['invalid response json', async () => ({ ok: true, status: 200, async json() { throw new Error(`bad ${SECRET}`) } }), /invalid JSON response/],
  ['missing choices', async () => jsonResponse({ model: 'glm-5.3-flash', choices: [], usage: {} }), /assistant choice/],
  ['missing content', async () => jsonResponse({ model: 'glm-5.3-flash', choices: [{ message: {}, finish_reason: 'stop' }], usage: {} }), /assistant content/],
  ['invalid content json', async () => jsonResponse({ model: 'glm-5.3-flash', choices: [{ message: { content: '```json\n{}\n```' }, finish_reason: 'stop' }], usage: {} }), /valid JSON artifact/],
  ['tool calls', async () => jsonResponse({ model: 'glm-5.3-flash', choices: [{ message: { content: '{}' }, finish_reason: 'tool_calls' }], usage: {} }), /tool calls/],
]) {
  const candidate = new GlmAdapter({ apiKey: SECRET, fetchImpl })
  await assert.rejects(() => candidate.run(request), pattern, name)
  try {
    await candidate.run(request)
  } catch (error) {
    assert.equal(String(error).includes(SECRET), false, `${name} must not leak API key`)
  }
}

const timeoutAdapter = new GlmAdapter({
  apiKey: SECRET,
  timeoutMs: 5,
  fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error(`aborted ${SECRET}`)), { once: true })
  }),
})
await assert.rejects(() => timeoutAdapter.run(request), /timed out/)
try {
  await timeoutAdapter.run(request)
} catch (error) {
  assert.equal(String(error).includes(SECRET), false)
}

console.log('R6 GLM HTTP adapter RED/GREEN tests passed.')
