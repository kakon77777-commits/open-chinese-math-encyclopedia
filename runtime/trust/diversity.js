export const DIVERSITY_AXES = Object.freeze([
  'model_family',
  'prompt_class',
  'context_class',
  'source_set_id',
  'tool_set_id',
  'verification_goal',
])

const VALID_POSITIONS = new Set(['support', 'oppose', 'uncertain'])
const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'review_id',
  'candidate_revision_id',
  'issue_key',
  'position',
  'model_family',
  'model_version',
  'role',
  'prompt_class',
  'context_class',
  'source_set_id',
  'tool_set_id',
  'verification_goal',
])

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} must be a non-empty string`)
}

function validateReviews(candidateRevisionId, reviews) {
  requireNonEmptyString(candidateRevisionId, 'candidateRevisionId')
  if (!Array.isArray(reviews) || reviews.length === 0) throw new TypeError('reviews must be a non-empty array')
  const ids = new Set()
  for (const review of reviews) {
    if (!review || typeof review !== 'object' || Array.isArray(review)) throw new TypeError('review must be an object')
    for (const field of REQUIRED_REVIEW_FIELDS) requireNonEmptyString(review[field], `review.${field}`)
    if (!VALID_POSITIONS.has(review.position)) throw new Error(`invalid review position: ${review.position}`)
    if (review.candidate_revision_id !== candidateRevisionId) {
      throw new Error(`review ${review.review_id} targets a different candidate revision`)
    }
    if (ids.has(review.review_id)) throw new Error(`duplicate review_id: ${review.review_id}`)
    ids.add(review.review_id)
  }
}

function uniqueCount(reviews, field) {
  return new Set(reviews.map(review => review[field])).size
}

function groupKey(review) {
  return JSON.stringify(DIVERSITY_AXES.map(axis => review[axis]))
}

export function buildDiversityProfile({ candidateRevisionId, reviews }) {
  validateReviews(candidateRevisionId, reviews)
  const ordered = structuredClone(reviews).sort((left, right) => left.review_id.localeCompare(right.review_id))
  const uniqueCounts = Object.fromEntries(DIVERSITY_AXES.map(axis => [axis, uniqueCount(ordered, axis)]))
  const diversifiedAxes = DIVERSITY_AXES.filter(axis => uniqueCounts[axis] > 1).length
  const effectiveReviewGroups = new Set(ordered.map(groupKey)).size

  let diversityLevel = 'low'
  if (diversifiedAxes >= 4 && uniqueCounts.model_family >= 2 && uniqueCounts.source_set_id >= 2) {
    diversityLevel = 'high'
  } else if (
    diversifiedAxes >= 2 &&
    (uniqueCounts.model_family >= 2 || uniqueCounts.source_set_id >= 2 || uniqueCounts.tool_set_id >= 2)
  ) {
    diversityLevel = 'medium'
  }

  const warnings = []
  if (
    ordered.length >= 3 &&
    uniqueCounts.model_family === 1 &&
    uniqueCounts.context_class === 1 &&
    uniqueCounts.source_set_id === 1 &&
    uniqueCounts.tool_set_id === 1
  ) {
    warnings.push('pseudo_independent_consensus')
  }

  return {
    schema_version: 'ocme-diversity-profile-v0.1',
    profile_id: `diversity-${candidateRevisionId}`,
    policy_version: 'ocme-diversity-policy-v0.1',
    epistemic_scope: 'review_topology_only',
    candidate_revision_id: candidateRevisionId,
    review_count: ordered.length,
    effective_review_groups: effectiveReviewGroups,
    diversified_axes: diversifiedAxes,
    unique_counts: uniqueCounts,
    diversity_level: diversityLevel,
    warnings,
    reviews: ordered,
  }
}
