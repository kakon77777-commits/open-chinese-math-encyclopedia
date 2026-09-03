import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'
import { sha256CanonicalJson } from './canonical-json.js'

export async function loadAiRunRecordSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'ai-run-record.schema.json'), 'utf8'))
}

export function createAiRunRecordValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateAiRunRecord(record, { request, policy, response, schema = null } = {}) {
  const errors = []
  if (!request || typeof request !== 'object' || Array.isArray(request)) return { ok: false, errors: ['AI run record validation requires request'] }
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return { ok: false, errors: ['AI run record validation requires policy'] }
  if (!response || typeof response !== 'object' || Array.isArray(response)) return { ok: false, errors: ['AI run record validation requires response'] }

  const runSchema = schema ?? await loadAiRunRecordSchema()
  const validate = createAiRunRecordValidator(runSchema)
  if (!validate(record)) {
    errors.push(...formatSchemaErrors(record?.run_id ?? 'ai-run-record', validate.errors))
    return { ok: false, errors }
  }

  if (record.input_sha256 !== sha256CanonicalJson({ request, policy })) errors.push(`${record.run_id}: input_sha256 does not match request + policy`)
  if (record.output_sha256 !== sha256CanonicalJson(response.structured_output)) errors.push(`${record.run_id}: output_sha256 does not match structured_output`)

  for (const [field, expected] of [
    ['role', request.role],
    ['prompt_class', request.prompt_class],
    ['provider', policy.provider],
    ['model', policy.model],
    ['model_version', policy.model_version],
    ['prompt_id', policy.prompt_id],
    ['prompt_version', policy.prompt_version],
    ['context_class', policy.context_class],
    ['source_set_id', policy.source_set_id],
    ['tool_set_id', policy.tool_set_id],
    ['verification_goal', policy.verification_goal],
  ]) {
    if (record[field] !== expected) errors.push(`${record.run_id}: ${field} must equal ${expected}`)
  }

  const expectedUsage = {
    input_units: response.usage?.input_units ?? 0,
    output_units: response.usage?.output_units ?? 0,
    total_units: response.usage?.total_units ?? ((response.usage?.input_units ?? 0) + (response.usage?.output_units ?? 0)),
    cached_input_units: response.usage?.cached_input_units ?? 0,
  }
  if (JSON.stringify(record.usage) !== JSON.stringify(expectedUsage)) errors.push(`${record.run_id}: usage must match normalized provider response usage`)

  const expectedNetworkUsed = response.provider_metadata?.network_used === true
  if (record.network_used !== expectedNetworkUsed) errors.push(`${record.run_id}: network_used must match provider response metadata`)

  if (record.billing.status === 'not_computed' && (record.billing.amount !== null || record.billing.currency !== null)) {
    errors.push(`${record.run_id}: billing not_computed requires null amount and currency`)
  }
  if (record.billing.status !== 'not_computed' && (record.billing.amount === null || record.billing.currency === null)) {
    errors.push(`${record.run_id}: computed billing requires amount and currency`)
  }

  return { ok: errors.length === 0, errors }
}
