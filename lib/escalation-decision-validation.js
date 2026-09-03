import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

export async function loadEscalationDecisionSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'escalation-decision.schema.json'), 'utf8'))
}

export function createEscalationDecisionValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateEscalationDecision(decision, {
  mechanicalReport,
  riskProfile,
  diversityProfile,
  disagreements = [],
  schema = null,
} = {}) {
  const errors = []
  if (!mechanicalReport || typeof mechanicalReport !== 'object' || Array.isArray(mechanicalReport)) return { ok: false, errors: ['escalation validation requires mechanicalReport'] }
  if (!riskProfile || typeof riskProfile !== 'object' || Array.isArray(riskProfile)) return { ok: false, errors: ['escalation validation requires riskProfile'] }
  if (!diversityProfile || typeof diversityProfile !== 'object' || Array.isArray(diversityProfile)) return { ok: false, errors: ['escalation validation requires diversityProfile'] }
  if (!Array.isArray(disagreements)) return { ok: false, errors: ['escalation validation requires disagreements array'] }

  const decisionSchema = schema ?? await loadEscalationDecisionSchema()
  const validate = createEscalationDecisionValidator(decisionSchema)
  if (!validate(decision)) {
    errors.push(...formatSchemaErrors(decision?.decision_id ?? 'escalation-decision', validate.errors))
    return { ok: false, errors }
  }

  const revision = mechanicalReport.candidate_revision_id
  if (decision.candidate_revision_id !== revision) errors.push(`${decision.decision_id}: candidate_revision_id must equal ${revision}`)
  if (riskProfile.candidate_revision_id !== revision) errors.push(`${decision.decision_id}: risk profile candidate revision mismatch`)
  if (diversityProfile.candidate_revision_id !== revision) errors.push(`${decision.decision_id}: diversity profile candidate revision mismatch`)
  if (decision.risk_profile_id !== riskProfile.profile_id) errors.push(`${decision.decision_id}: risk_profile_id mismatch`)
  if (decision.diversity_profile_id !== diversityProfile.profile_id) errors.push(`${decision.decision_id}: diversity_profile_id mismatch`)
  if (decision.mechanical_report_id !== mechanicalReport.report_id) errors.push(`${decision.decision_id}: mechanical_report_id mismatch`)
  if (decision.decision_id !== `escalation-${revision}`) errors.push(`${decision.decision_id}: decision_id must be derived from candidate_revision_id`)
  if (decision.blocking !== (decision.route !== 'continue_local')) errors.push(`${decision.decision_id}: blocking must match route semantics`)

  const expectedOpenIds = disagreements
    .filter(disagreement => disagreement.status === 'open')
    .map(disagreement => disagreement.disagreement_id)
    .sort()
  for (const disagreement of disagreements) {
    if (disagreement.candidate_revision_id !== revision) errors.push(`${decision.decision_id}: disagreement ${disagreement.disagreement_id} candidate revision mismatch`)
  }
  if (JSON.stringify(decision.open_disagreement_ids) !== JSON.stringify(expectedOpenIds)) {
    errors.push(`${decision.decision_id}: open_disagreement_ids must exactly match open disagreements`)
  }

  return { ok: errors.length === 0, errors }
}
