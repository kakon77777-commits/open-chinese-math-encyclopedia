import { loadCoreAtlas } from '../lib/atlas-store.js'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { classifyRoutingRisk } from '../runtime/trust/risk-classifier.js'
import { validateRiskProfile } from '../lib/risk-profile-validation.js'
import { buildDiversityProfile } from '../runtime/trust/diversity.js'
import { validateDiversityProfile } from '../lib/diversity-profile-validation.js'
import { buildDisagreements } from '../runtime/trust/disagreement.js'
import { validateDisagreement } from '../lib/disagreement-validation.js'
import { routeEscalation } from '../runtime/trust/escalation.js'
import { validateEscalationDecision } from '../lib/escalation-decision-validation.js'

const atlas = await loadCoreAtlas()
const tasks = await loadMaterializationTasks()
const task = tasks[0]
const atlasEntry = atlas.entries.find(entry => entry.id === task.atlas_id)
if (!atlasEntry) throw new Error(`Missing Atlas entry for ${task.atlas_id}`)

const candidateRevisionId = `candidate-${task.task_id}-r0`
const mechanicalReport = {
  report_id: `mechanical-${candidateRevisionId}`,
  candidate_revision_id: candidateRevisionId,
  target_mko_id: task.target_mko_id,
  mechanical_status: 'pass',
}

function review(reviewId, overrides = {}) {
  return {
    review_id: reviewId,
    candidate_revision_id: candidateRevisionId,
    issue_key: 'definition_scope',
    position: 'support',
    model_family: 'glm',
    model_version: '5.3-flash',
    role: 'verifier',
    prompt_class: 'verifier-v1',
    context_class: 'canonical-neighbors',
    source_set_id: 'sources-a',
    tool_set_id: 'tools-a',
    verification_goal: 'semantic-falsification',
    ...overrides,
  }
}

const baselineRisk = classifyRoutingRisk({
  task,
  atlasEntry,
  atlas,
  mechanicalReport,
  objections: [],
  unresolvedRisks: [],
})
const baselineRiskValidation = await validateRiskProfile(baselineRisk, { task, atlasEntry, mechanicalReport })
if (!baselineRiskValidation.ok) throw new Error(baselineRiskValidation.errors.join('\n'))

const pseudoReviews = [review('review-p1'), review('review-p2'), review('review-p3')]
const lowDiversity = buildDiversityProfile({ candidateRevisionId, reviews: pseudoReviews })
const lowDiversityValidation = await validateDiversityProfile(lowDiversity, { candidateRevisionId })
if (!lowDiversityValidation.ok) throw new Error(lowDiversityValidation.errors.join('\n'))
if (lowDiversity.diversity_level !== 'low' || !lowDiversity.warnings.includes('pseudo_independent_consensus')) {
  throw new Error('Pseudo-independent consensus fixture did not produce low diversity warning')
}

const highReviews = [
  review('review-h1'),
  review('review-h2', {
    model_family: 'independent-family',
    model_version: 'independent-v1',
    prompt_class: 'counterexample-v1',
    context_class: 'blind-independent',
    source_set_id: 'sources-b',
    tool_set_id: 'tools-b',
    verification_goal: 'counterexample-search',
  }),
]
const highDiversity = buildDiversityProfile({ candidateRevisionId, reviews: highReviews })
const highDiversityValidation = await validateDiversityProfile(highDiversity, { candidateRevisionId })
if (!highDiversityValidation.ok) throw new Error(highDiversityValidation.errors.join('\n'))
if (highDiversity.diversity_level !== 'high') throw new Error('High-diversity fixture did not classify high')

const baselineDecision = routeEscalation({
  mechanicalReport,
  riskProfile: baselineRisk,
  diversityProfile: lowDiversity,
  disagreements: [],
})
const baselineDecisionValidation = await validateEscalationDecision(baselineDecision, {
  mechanicalReport,
  riskProfile: baselineRisk,
  diversityProfile: lowDiversity,
  disagreements: [],
})
if (!baselineDecisionValidation.ok) throw new Error(baselineDecisionValidation.errors.join('\n'))

const criticalObjection = {
  objection_id: `objection-${candidateRevisionId}-critical`,
  target_candidate_revision_id: candidateRevisionId,
  target_candidate_id: task.target_mko_id,
  type: 'other',
  severity: 'critical',
  reason: 'Critical routing fixture.',
  evidence_refs: [],
  status: 'open',
}
const criticalRisk = classifyRoutingRisk({
  task,
  atlasEntry,
  atlas,
  mechanicalReport,
  objections: [criticalObjection],
  unresolvedRisks: [],
})
const criticalRiskValidation = await validateRiskProfile(criticalRisk, { task, atlasEntry, mechanicalReport })
if (!criticalRiskValidation.ok) throw new Error(criticalRiskValidation.errors.join('\n'))
const criticalDecision = routeEscalation({
  mechanicalReport,
  riskProfile: criticalRisk,
  diversityProfile: highDiversity,
  disagreements: [],
})
if (criticalRisk.risk_class !== 'L4' || criticalDecision.route !== 'high_assurance_review_required') {
  throw new Error('Critical objection did not route to L4 high-assurance review')
}

const conflictReviews = [
  review('review-d1', { position: 'support' }),
  review('review-d2', {
    position: 'oppose',
    model_family: 'independent-family',
    model_version: 'independent-v1',
    prompt_class: 'counterexample-v1',
    context_class: 'blind-independent',
    source_set_id: 'sources-b',
    tool_set_id: 'tools-b',
    verification_goal: 'counterexample-search',
  }),
]
const disagreements = buildDisagreements({ candidateRevisionId, reviews: conflictReviews })
if (disagreements.length !== 1) throw new Error('Conflict fixture must produce exactly one disagreement')
for (const disagreement of disagreements) {
  const result = await validateDisagreement(disagreement, { candidateRevisionId })
  if (!result.ok) throw new Error(result.errors.join('\n'))
}
const disagreementDecision = routeEscalation({
  mechanicalReport,
  riskProfile: baselineRisk,
  diversityProfile: highDiversity,
  disagreements,
})
const disagreementDecisionValidation = await validateEscalationDecision(disagreementDecision, {
  mechanicalReport,
  riskProfile: baselineRisk,
  diversityProfile: highDiversity,
  disagreements,
})
if (!disagreementDecisionValidation.ok) throw new Error(disagreementDecisionValidation.errors.join('\n'))
if (disagreementDecision.route !== 'independent_verification_required') {
  throw new Error('Open disagreement did not route to independent verification')
}

console.log(
  `R5 routing validation passed: baseline=${baselineRisk.risk_class}/${baselineDecision.route}; ` +
  `critical=${criticalRisk.risk_class}/${criticalDecision.route}; ` +
  `pseudo-consensus=${lowDiversity.diversity_level}; ` +
  `disagreement=${disagreementDecision.route}.`
)
console.log('Epistemic scope: routing risk and review topology only; no truth probability, provider execution, or canonical verdict.')
