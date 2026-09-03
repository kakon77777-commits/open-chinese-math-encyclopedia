import { assertProviderAdapter, validateProviderResponse } from '../providers/provider-interface.js'
import { validateDesignContract } from '../../lib/design-contract-validation.js'

export async function runDesigner({ provider, task, context = {} }) {
  assertProviderAdapter(provider)
  const response = validateProviderResponse(await provider.run({
    role: 'designer',
    prompt_class: 'design_contract',
    context: { task: structuredClone(task), input_context: structuredClone(context) },
    output_schema_id: 'ocme-design-contract-v0.1',
    run_metadata: { fixture_key: task.task_id },
  }))
  const contract = response.structured_output
  const validation = await validateDesignContract(contract, task)
  if (!validation.ok) throw new Error(`Designer output invalid:\n${validation.errors.join('\n')}`)
  return structuredClone(contract)
}
