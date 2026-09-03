import { assertProviderAdapter, validateProviderResponse } from '../providers/provider-interface.js'
import { validateCandidateEnvelope } from '../../lib/candidate-envelope-validation.js'
import { validateRepairPatch } from '../../lib/repair-patch-validation.js'

export async function runBuilder({ provider, task, contract, context = {} }) {
  assertProviderAdapter(provider)
  const response = validateProviderResponse(await provider.run({
    role: 'builder',
    prompt_class: 'candidate_build',
    context: {
      task: structuredClone(task),
      contract: structuredClone(contract),
      input_context: structuredClone(context),
    },
    output_schema_id: 'ocme-candidate-envelope-v0.1',
    run_metadata: { fixture_key: task.task_id },
  }))
  const candidate = response.structured_output
  const validation = await validateCandidateEnvelope(candidate, task, contract)
  if (!validation.ok) throw new Error(`Builder output invalid:\n${validation.errors.join('\n')}`)
  return structuredClone(candidate)
}

export async function runBuilderRepair({ provider, task, contract, candidate, ledger, context = {} }) {
  assertProviderAdapter(provider)
  const response = validateProviderResponse(await provider.run({
    role: 'builder',
    prompt_class: 'builder_repair',
    context: {
      task: structuredClone(task),
      contract: structuredClone(contract),
      candidate: structuredClone(candidate),
      objection_ledger: structuredClone(ledger),
      input_context: structuredClone(context),
    },
    output_schema_id: 'ocme-repair-patch-v0.1',
    run_metadata: { fixture_key: candidate.candidate_revision_id },
  }))
  const patch = response.structured_output
  const validation = await validateRepairPatch(patch, { task, candidate, ledger })
  if (!validation.ok) throw new Error(`Builder repair output invalid:\n${validation.errors.join('\n')}`)
  return structuredClone(patch)
}
