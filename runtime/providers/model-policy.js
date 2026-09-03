const ALLOWED_REQUEST_OPTIONS = new Set([
  'thinking',
  'reasoning_effort',
  'max_tokens',
  'temperature',
  'top_p',
  'do_sample',
])

const POLICY_BY_REQUEST = Object.freeze({
  'designer:design_contract': Object.freeze({
    role_key: 'designer',
    prompt_id: 'ocme-designer-v0.1',
    prompt_version: '0.1',
    context_class: 'atlas_design_context',
    source_set_id: 'canonical_prerequisite_context',
    tool_set_id: 'none',
    verification_goal: 'contract_construction',
  }),
  'builder:candidate_build': Object.freeze({
    role_key: 'builder',
    prompt_id: 'ocme-builder-v0.1',
    prompt_version: '0.1',
    context_class: 'candidate_build_context',
    source_set_id: 'design_plus_selected_sources',
    tool_set_id: 'none',
    verification_goal: 'candidate_materialization',
  }),
  'builder:builder_repair': Object.freeze({
    role_key: 'builder',
    prompt_id: 'ocme-builder-repair-v0.1',
    prompt_version: '0.1',
    context_class: 'repair_context',
    source_set_id: 'candidate_objection_evidence',
    tool_set_id: 'none',
    verification_goal: 'objection_targeted_repair',
  }),
  'verifier:candidate_verify': Object.freeze({
    role_key: 'verifier',
    prompt_id: 'ocme-verifier-v0.1',
    prompt_version: '0.1',
    context_class: 'independent_verification_context',
    source_set_id: 'independent_verifier_sources',
    tool_set_id: 'none',
    verification_goal: 'counterexample_and_gap_search',
  }),
})

const DEFAULT_OPTIONS = Object.freeze({
  designer: Object.freeze({ thinking: { type: 'enabled' }, max_tokens: 8192, do_sample: false }),
  builder: Object.freeze({ thinking: { type: 'enabled' }, max_tokens: 16384, do_sample: false }),
  repair: Object.freeze({ thinking: { type: 'enabled' }, max_tokens: 8192, do_sample: false }),
  verifier: Object.freeze({ thinking: { type: 'enabled' }, max_tokens: 12288, do_sample: false }),
})

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateOptions(options, location) {
  if (!isRecord(options)) throw new TypeError(`${location} must be an object`)
  for (const key of Object.keys(options)) {
    if (!ALLOWED_REQUEST_OPTIONS.has(key)) throw new Error(`unsupported model request option ${key}`)
  }
  return structuredClone(options)
}

function normalizeRequestOptions(raw = {}) {
  if (!isRecord(raw)) throw new TypeError('requestOptions must be an object')
  const allowedClasses = new Set(['designer', 'builder', 'repair', 'verifier'])
  const out = {}
  for (const [roleClass, options] of Object.entries(raw)) {
    if (!allowedClasses.has(roleClass)) throw new Error(`unsupported model request option class ${roleClass}`)
    out[roleClass] = validateOptions(options, `requestOptions.${roleClass}`)
  }
  return out
}

export function createModelPolicy({
  provider = 'glm',
  model = 'glm-5.3-flash',
  models = {},
  requestOptions = {},
} = {}) {
  if (typeof provider !== 'string' || provider.length === 0) throw new TypeError('provider must be a non-empty string')
  if (typeof model !== 'string' || model.length === 0) throw new TypeError('model must be a non-empty string')
  if (!isRecord(models)) throw new TypeError('models must be an object')
  for (const [role, value] of Object.entries(models)) {
    if (!['designer', 'builder', 'verifier'].includes(role)) throw new Error(`unsupported model override ${role}`)
    if (typeof value !== 'string' || value.length === 0) throw new TypeError(`models.${role} must be a non-empty string`)
  }
  const optionOverrides = normalizeRequestOptions(requestOptions)

  return Object.freeze({
    resolve(request) {
      if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('model policy request must be an object')
      const key = `${request.role}:${request.prompt_class}`
      const definition = POLICY_BY_REQUEST[key]
      if (!definition) throw new Error(`unsupported role/prompt combination ${key}`)

      const selectedModel = models[definition.role_key] ?? model
      const optionKey = request.prompt_class === 'builder_repair' ? 'repair' : definition.role_key
      const requestOptionsForRole = optionOverrides[optionKey] ?? DEFAULT_OPTIONS[optionKey]

      return {
        policy_version: 'ocme-model-policy-v0.1',
        provider,
        model: selectedModel,
        model_version: selectedModel,
        prompt_id: definition.prompt_id,
        prompt_version: definition.prompt_version,
        context_class: definition.context_class,
        source_set_id: definition.source_set_id,
        tool_set_id: definition.tool_set_id,
        verification_goal: definition.verification_goal,
        request_options: structuredClone(requestOptionsForRole),
      }
    },
  })
}
