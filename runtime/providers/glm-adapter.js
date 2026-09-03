import { validateProviderRequest, validateProviderResponse } from './provider-interface.js'
import { resolveOutputSchema } from './output-schema-registry.js'
import { buildProviderMessages } from './prompt-renderer.js'

const ALLOWED_REQUEST_OPTIONS = new Set([
  'thinking',
  'reasoning_effort',
  'max_tokens',
  'temperature',
  'top_p',
  'do_sample',
])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBaseUrl(raw) {
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new TypeError('GLM base URL must be a valid HTTPS URL')
  }
  if (parsed.protocol !== 'https:') throw new TypeError('GLM base URL must use HTTPS')
  if (parsed.username || parsed.password) throw new TypeError('GLM base URL must not contain credentials')
  return parsed.href.replace(/\/+$/, '')
}

function normalizeUsage(usage = {}) {
  const number = value => Number.isInteger(value) && value >= 0 ? value : 0
  const input = number(usage.prompt_tokens)
  const output = number(usage.completion_tokens)
  return {
    input_units: input,
    output_units: output,
    total_units: number(usage.total_tokens) || (input + output),
    cached_input_units: number(usage.prompt_tokens_details?.cached_tokens),
  }
}

function requireProviderPolicy(request) {
  const policy = request.run_metadata?.provider_policy
  if (!isRecord(policy)) throw new Error('GLM request requires run_metadata.provider_policy')
  if (policy.provider !== 'glm') throw new Error('GLM adapter requires provider policy provider=glm')
  if (typeof policy.model !== 'string' || policy.model.length === 0) throw new Error('GLM provider policy requires model')
  if (!isRecord(policy.request_options)) throw new Error('GLM provider policy requires request_options')
  for (const key of Object.keys(policy.request_options)) {
    if (!ALLOWED_REQUEST_OPTIONS.has(key)) throw new Error(`unsupported GLM request option ${key}`)
  }
  return policy
}

function parseStructuredOutput(content) {
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('GLM assistant content must be a valid JSON artifact')
  }
  if (!isRecord(parsed)) throw new Error('GLM assistant content must be a valid JSON artifact object')
  return parsed
}

export class GlmAdapter {
  constructor({
    apiKey,
    baseUrl = 'https://open.bigmodel.cn/api/paas/v4',
    fetchImpl = globalThis.fetch,
    timeoutMs = 120000,
    schemaResolver = resolveOutputSchema,
    messageBuilder = buildProviderMessages,
  } = {}) {
    if (typeof apiKey !== 'string' || apiKey.length === 0) throw new TypeError('GLM API key is required')
    if (typeof fetchImpl !== 'function') throw new TypeError('GLM fetch implementation must be a function')
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('GLM timeoutMs must be a positive integer')
    if (typeof schemaResolver !== 'function') throw new TypeError('GLM schemaResolver must be a function')
    if (typeof messageBuilder !== 'function') throw new TypeError('GLM messageBuilder must be a function')

    this.apiKey = apiKey
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.fetchImpl = fetchImpl
    this.timeoutMs = timeoutMs
    this.schemaResolver = schemaResolver
    this.messageBuilder = messageBuilder
  }

  async run(rawRequest) {
    const request = validateProviderRequest(rawRequest)
    const policy = requireProviderPolicy(request)
    const outputSchema = await this.schemaResolver(request.output_schema_id)
    const messages = this.messageBuilder({ request, policy, outputSchema })

    const body = {
      model: policy.model,
      messages,
      stream: false,
      response_format: { type: 'json_object' },
      ...structuredClone(policy.request_options),
    }
    if (typeof request.run_metadata.request_id === 'string' && request.run_metadata.request_id.length > 0) {
      body.request_id = request.run_metadata.request_id
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let httpResponse
    try {
      httpResponse = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch {
      if (controller.signal.aborted) throw new Error('GLM request timed out')
      throw new Error('GLM network request failed')
    } finally {
      clearTimeout(timer)
    }

    if (!httpResponse || typeof httpResponse.ok !== 'boolean') throw new Error('GLM HTTP response is invalid')
    if (!httpResponse.ok) throw new Error(`GLM HTTP ${Number.isInteger(httpResponse.status) ? httpResponse.status : 'error'}`)

    let payload
    try {
      payload = await httpResponse.json()
    } catch {
      throw new Error('GLM invalid JSON response')
    }
    if (!isRecord(payload)) throw new Error('GLM response payload must be an object')

    const choice = Array.isArray(payload.choices) ? payload.choices[0] : null
    if (!isRecord(choice)) throw new Error('GLM response missing assistant choice')
    if (choice.finish_reason === 'tool_calls') throw new Error('GLM tool calls are not allowed in R6')
    const message = choice.message
    if (!isRecord(message)) throw new Error('GLM response missing assistant message')
    if (typeof message.content !== 'string' || message.content.length === 0) throw new Error('GLM response missing assistant content')

    const response = {
      structured_output: parseStructuredOutput(message.content),
      usage: normalizeUsage(payload.usage),
      provider_metadata: {
        provider: 'glm',
        model: typeof payload.model === 'string' && payload.model.length > 0 ? payload.model : policy.model,
        model_version: typeof payload.model === 'string' && payload.model.length > 0 ? payload.model : policy.model_version,
        provider_task_id: typeof payload.id === 'string' ? payload.id : null,
        request_id: typeof payload.request_id === 'string' ? payload.request_id : (request.run_metadata.request_id ?? null),
        finish_reason: typeof choice.finish_reason === 'string' ? choice.finish_reason : null,
        network_used: true,
        reasoning_content_discarded: message.reasoning_content !== undefined && message.reasoning_content !== null,
      },
    }
    return validateProviderResponse(response)
  }
}
