const VALID_RISK_CLASSES = new Set(['L0', 'L1', 'L2', 'L3', 'L4'])
const VALID_DIVERSITY_LEVELS = new Set(['low', 'medium', 'high'])
const VALID_MECHANICAL_STATUSES = new Set(['pass', 'fail'])

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
}

function ensureIdentity(mechanicalReport, riskProfile, diversityProfile, disagreements) {
  const revision = mechanicalReport.candidate_revision_id
  if (riskProfile.candidate_revision_id !== revision) throw new Error('candidate revision mismatch between mechanical report and risk profile')
  if (diversityProfile.candidate_revision_id !== revision) throw new Error('candidate revision mismatch between mechanical report and diversity profile')
  if (riskProfile.mechanical_report_id !== mechanicalReport.report_id) throw new Error('mechanical report identity mismatch in risk profile')
  for (const disagreement of disagreements) {
    requireObject(disagreement, 'disagreement')
    if (disagreement.candidate_revision_id !== revision) throw new Error('candidate revision mismatch in disagreement')
  }
  return revision
}

export function routeEscalation({ mechanicalReport, riskProfile, diversityProfile, disagreements = [] }) {
  requireObject(mechanicalReport, 'mechanicalReport')
  requireObject(riskProfile, 'riskProfile')
  requireObject(diversityProfile, 'diversityProfile')
  if (!Array.isArray(disagreements)) throw new TypeError('disagreements must be an array')
  if (!VALID_MECHANICAL_STATUSES.has(mechanicalReport.mechanical_status)) throw new Error(`invalid mechanical status: ${mechanicalReport.mechanical_status}`)
  if (!VALID_RISK_CLASSES.has(riskProfile.risk_class)) throw new Error(`invalid risk class: ${riskProfile.risk_class}`)
  if (!VALID_DIVERSITY_LEVELS.has(diversityProfile.diversity_level)) throw new Error(`invalid diversity level: ${diversityProfile.diversity_level}`)

  const candidateRevisionId = ensureIdentity(mechanicalReport, riskProfile, diversityProfile, disagreements)
  const openDisagreementIds = disagreements
    .filter(disagreement => disagreement.status === 'open')
    .map(disagreement => disagreement.disagreement_id)
    .sort()

  let route = 'continue_local'
  let reasons = ['R5 deterministic policy found no escalation condition.']

  if (mechanicalReport.mechanical_status === 'fail') {
    route = 'repair_required'
    reasons = ['Mechanical Trust failed; deterministic repair is required before further assurance routing.']
  } else if (riskProfile.risk_class === 'L4') {
    route = 'high_assurance_review_required'
    reasons = ['Routing risk is L4; a higher-assurance review layer is required.']
  } else if (openDisagreementIds.length > 0) {
    route = 'independent_verification_required'
    reasons = ['Open review disagreement must be preserved and independently verified.']
  } else if (riskProfile.risk_class === 'L3' && diversityProfile.diversity_level === 'low') {
    route = 'independent_verification_required'
    reasons = ['L3 routing risk combined with low epistemic diversity requires independent verification.']
  } else if (riskProfile.risk_class === 'L3') {
    route = 'high_assurance_review_required'
    reasons = ['L3 routing risk requires a higher-assurance review layer.']
  } else if (riskProfile.risk_class === 'L2' && diversityProfile.diversity_level === 'low') {
    route = 'independent_verification_required'
    reasons = ['L2 routing risk combined with low epistemic diversity requires independent verification.']
  }

  return {
    schema_version: 'ocme-escalation-decision-v0.1',
    decision_id: `escalation-${candidateRevisionId}`,
    policy_version: 'ocme-escalation-policy-v0.1',
    candidate_revision_id: candidateRevisionId,
    risk_profile_id: riskProfile.profile_id,
    diversity_profile_id: diversityProfile.profile_id,
    mechanical_report_id: mechanicalReport.report_id,
    route,
    blocking: route !== 'continue_local',
    reasons,
    open_disagreement_ids: openDisagreementIds,
  }
}
