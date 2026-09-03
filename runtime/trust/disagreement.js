const VALID_POSITIONS = new Set(['support', 'oppose', 'uncertain'])

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} must be a non-empty string`)
}

function issueSlug(issueKey) {
  const slug = issueKey.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')
  return slug || 'issue'
}

export function buildDisagreements({ candidateRevisionId, reviews }) {
  requireNonEmptyString(candidateRevisionId, 'candidateRevisionId')
  if (!Array.isArray(reviews)) throw new TypeError('reviews must be an array')

  const grouped = new Map()
  const reviewIds = new Set()
  for (const review of reviews) {
    if (!review || typeof review !== 'object' || Array.isArray(review)) throw new TypeError('review must be an object')
    requireNonEmptyString(review.review_id, 'review.review_id')
    requireNonEmptyString(review.candidate_revision_id, 'review.candidate_revision_id')
    requireNonEmptyString(review.issue_key, 'review.issue_key')
    if (!VALID_POSITIONS.has(review.position)) throw new Error(`invalid review position: ${review.position}`)
    if (review.candidate_revision_id !== candidateRevisionId) {
      throw new Error(`review ${review.review_id} targets a different candidate revision`)
    }
    if (reviewIds.has(review.review_id)) throw new Error(`duplicate review_id: ${review.review_id}`)
    reviewIds.add(review.review_id)
    if (!grouped.has(review.issue_key)) grouped.set(review.issue_key, [])
    grouped.get(review.issue_key).push(structuredClone(review))
  }

  const disagreements = []
  for (const issueKey of [...grouped.keys()].sort()) {
    const issueReviews = grouped.get(issueKey).sort((left, right) => left.review_id.localeCompare(right.review_id))
    const positions = [...new Set(issueReviews.map(review => review.position))].sort()
    if (positions.length <= 1) continue
    disagreements.push({
      schema_version: 'ocme-disagreement-v0.1',
      disagreement_id: `disagreement-${candidateRevisionId}-${issueSlug(issueKey)}`,
      candidate_revision_id: candidateRevisionId,
      issue_key: issueKey,
      status: 'open',
      positions,
      reviews: issueReviews,
    })
  }
  return disagreements
}
