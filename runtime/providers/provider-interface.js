const ROLES = new Set(['designer', 'builder', 'verifier'])
const REQUEST_FIELDS = new Set(['role', 'prompt_class', 'context', 'output_schema_id', 'run_metadata'])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function assertProviderAdapter(provider) {
  if (!provider || typeof provider !== 'object') throw new TypeError('provider must be an object')
  if (typeof provider.run !== 'function') throw new TypeError('provider.run must be a function')
  return provider
}

export function validateProviderRequest(request) {
  if (!isRecord(request)) throw new TypeError('provider request must be an object')
  for (const field of Object.keys(request)) {
    if (!REQUEST_FIELDS.has(field)) throw new Error(`unsupported provider request field ${field}`)
  }
  if (!ROLES.has(request.role)) throw new RangeError('role must be designer, builder, or verifier')
  if (typeof request.prompt_class !== 'string' || request.prompt_class.length === 0) throw new TypeError('prompt_class must be a non-empty string')
  if (!isRecord(request.context)) throw new TypeError('context must be an object')
  if (typeof request.output_schema_id !== 'string' || request.output_schema_id.length === 0) throw new TypeError('output_schema_id must be a non-empty string')
  if (!isRecord(request.run_metadata)) throw new TypeError('run_metadata must be an object')
  return request
}

export function validateProviderResponse(response) {
  if (!isRecord(response)) throw new TypeError('provider response must be an object')
  if (!isRecord(response.structured_output)) throw new TypeError('provider response structured_output must be an object')
  if (!isRecord(response.usage)) throw new TypeError('provider response usage must be an object')
  if (!isRecord(response.provider_metadata)) throw new TypeError('provider response provider_metadata must be an object')
  return response
}
