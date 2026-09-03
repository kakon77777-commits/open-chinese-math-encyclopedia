import { canonicalJsonString } from '../../lib/canonical-json.js'
import { assertNoProviderCredentialFields } from '../../lib/provider-credential-boundary.js'
import { resolveRolePrompt } from '../production/prompts/role-prompts.js'

export function buildProviderMessages({ request, policy, outputSchema }) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('request must be an object')
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('policy must be an object')
  if (!outputSchema || typeof outputSchema !== 'object' || Array.isArray(outputSchema)) throw new TypeError('outputSchema must be an object')
  assertNoProviderCredentialFields(request)

  const prompt = resolveRolePrompt(policy.prompt_id)
  if (prompt.prompt_version !== policy.prompt_version) throw new Error(`prompt version mismatch for ${policy.prompt_id}`)

  const userPayload = {
    output_schema_id: request.output_schema_id,
    context: structuredClone(request.context),
    output_schema: structuredClone(outputSchema),
  }

  return [
    { role: 'system', content: prompt.text },
    { role: 'user', content: canonicalJsonString(userPayload) },
  ]
}
