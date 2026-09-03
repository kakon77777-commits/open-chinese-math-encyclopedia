import { sha256CanonicalJson } from '../../lib/canonical-json.js'
import { validateAiRunRecord } from '../../lib/ai-run-record-validation.js'
import { validateProviderRequest, validateProviderResponse } from './provider-interface.js'

function assertRuntimeDependency(value, method, name) {
  if (!value || typeof value !== 'object' || typeof value[method] !== 'function') {
    throw new TypeError(`${name}.${method} must be a function`)
  }
  return value
}

function normalizedUsage(usage = {}) {
  const input = Number.isInteger(usage.input_units) && usage.input_units >= 0 ? usage.input_units : 0
  const output = Number.isInteger(usage.output_units) && usage.output_units >= 0 ? usage.output_units : 0
  return {
    input_units: input,
    output_units: output,
    total_units: Number.isInteger(usage.total_units) && usage.total_units >= 0 ? usage.total_units : input + output,
    cached_input_units: Number.isInteger(usage.cached_input_units) && usage.cached_input_units >= 0 ? usage.cached_input_units : 0,
  }
}

export class ProviderRuntime {
  #records = []
  #nextIndex = 1

  constructor({
    registry,
    modelPolicy,
    clock = () => Date.now(),
    idFactory = ({ index, request }) => `ai-run-${request.role}-${String(index).padStart(6, '0')}`,
  } = {}) {
    this.registry = assertRuntimeDependency(registry, 'resolve', 'registry')
    this.modelPolicy = assertRuntimeDependency(modelPolicy, 'resolve', 'modelPolicy')
    if (typeof clock !== 'function') throw new TypeError('clock must be a function')
    if (typeof idFactory !== 'function') throw new TypeError('idFactory must be a function')
    this.clock = clock
    this.idFactory = idFactory
  }

  async run(rawRequest) {
    const request = validateProviderRequest(rawRequest)
    if (Object.hasOwn(request.run_metadata, 'provider_policy')) {
      throw new Error('run_metadata.provider_policy is runtime-owned')
    }

    const policy = this.modelPolicy.resolve(request)
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('model policy must resolve to an object')
    const adapter = this.registry.resolve(policy.provider)

    const index = this.#nextIndex++
    const runId = this.idFactory({ index, request: structuredClone(request), policy: structuredClone(policy) })
    if (typeof runId !== 'string' || runId.length === 0) throw new TypeError('idFactory must return a non-empty string')

    const enrichedRequest = structuredClone(request)
    enrichedRequest.run_metadata = {
      ...enrichedRequest.run_metadata,
      provider_policy: structuredClone(policy),
    }

    const started = this.clock()
    if (!Number.isFinite(started)) throw new TypeError('clock must return a finite millisecond timestamp')
    const rawResponse = validateProviderResponse(await adapter.run(enrichedRequest))
    const ended = this.clock()
    if (!Number.isFinite(ended)) throw new TypeError('clock must return a finite millisecond timestamp')

    const response = {
      structured_output: structuredClone(rawResponse.structured_output),
      usage: structuredClone(rawResponse.usage),
      provider_metadata: {
        ...structuredClone(rawResponse.provider_metadata),
        run_id: runId,
      },
    }
    const resolvedModelVersion = typeof response.provider_metadata.model_version === 'string' && response.provider_metadata.model_version.length > 0
      ? response.provider_metadata.model_version
      : policy.model_version

    const record = {
      schema_version: 'ocme-ai-run-record-v0.1',
      run_id: runId,
      provider: policy.provider,
      model: policy.model,
      model_version: resolvedModelVersion,
      role: request.role,
      prompt_id: policy.prompt_id,
      prompt_version: policy.prompt_version,
      prompt_class: request.prompt_class,
      context_class: policy.context_class,
      source_set_id: policy.source_set_id,
      tool_set_id: policy.tool_set_id,
      verification_goal: policy.verification_goal,
      input_sha256: sha256CanonicalJson({ request, policy }),
      output_sha256: sha256CanonicalJson(response.structured_output),
      started_at: new Date(started).toISOString(),
      duration_ms: Math.max(0, Math.round(ended - started)),
      usage: normalizedUsage(response.usage),
      billing: { status: 'not_computed', amount: null, currency: null },
      network_used: response.provider_metadata.network_used === true,
    }

    const validation = await validateAiRunRecord(record, { request, policy, response })
    if (!validation.ok) throw new Error(`AI Run Record validation failed: ${validation.errors.join('; ')}`)

    this.#records.push(structuredClone(record))
    return response
  }

  getRunRecords() {
    return structuredClone(this.#records)
  }
}
