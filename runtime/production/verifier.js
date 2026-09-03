import { assertProviderAdapter, validateProviderResponse } from '../providers/provider-interface.js'
import { validateVerificationReport } from '../../lib/verification-report-validation.js'

export async function runVerifier({ provider, task, contract, candidate, context = {} }) {
  assertProviderAdapter(provider)
  const response = validateProviderResponse(await provider.run({
    role: 'verifier',
    prompt_class: 'candidate_verify',
    context: {
      task: structuredClone(task),
      contract: structuredClone(contract),
      candidate: structuredClone(candidate),
      input_context: structuredClone(context),
    },
    output_schema_id: 'ocme-verification-report-v0.1',
    run_metadata: { fixture_key: candidate.candidate_revision_id },
  }))
  const report = response.structured_output
  const validation = await validateVerificationReport(report, task, candidate)
  if (!validation.ok) throw new Error(`Verifier output invalid:\n${validation.errors.join('\n')}`)
  return structuredClone(report)
}
