import assert from 'node:assert/strict'
import { buildDiversityProfile } from '../runtime/trust/diversity.js'
import { validateDiversityProfile } from '../lib/diversity-profile-validation.js'

const candidateRevisionId = 'candidate-task-atlas-natural-number-r0'

function review(overrides = {}) {
  return {
    review_id: 'review-001',
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

const sameTopology = [
  review({ review_id: 'review-001' }),
  review({ review_id: 'review-002' }),
  review({ review_id: 'review-003' }),
]
const low = buildDiversityProfile({ candidateRevisionId, reviews: sameTopology })
assert.equal(low.epistemic_scope, 'review_topology_only')
assert.equal(low.review_count, 3)
assert.equal(low.effective_review_groups, 1)
assert.equal(low.diversified_axes, 0)
assert.equal(low.diversity_level, 'low')
assert.ok(low.warnings.includes('pseudo_independent_consensus'))
assert.deepEqual(low.reviews.map(item => item.review_id), ['review-001', 'review-002', 'review-003'])
assert.equal(Object.hasOwn(low, 'confidence'), false)
assert.equal(Object.hasOwn(low, 'mathematically_true'), false)
assert.equal(Object.hasOwn(low, 'canonical_verdict'), false)

const versionOnly = buildDiversityProfile({
  candidateRevisionId,
  reviews: [
    review({ review_id: 'review-v1', model_version: '5.3-flash-a' }),
    review({ review_id: 'review-v2', model_version: '5.3-flash-b' }),
    review({ review_id: 'review-v3', model_version: '5.3-flash-c' }),
  ],
})
assert.notEqual(versionOnly.diversity_level, 'high')
assert.equal(versionOnly.effective_review_groups, 1)

const high = buildDiversityProfile({
  candidateRevisionId,
  reviews: [
    review({ review_id: 'review-a' }),
    review({
      review_id: 'review-b',
      model_family: 'frontier-b',
      model_version: 'b1',
      prompt_class: 'adversarial-v2',
      context_class: 'blind-independent',
      source_set_id: 'sources-b',
      tool_set_id: 'tools-b',
      verification_goal: 'counterexample-search',
    }),
    review({
      review_id: 'review-c',
      model_family: 'frontier-c',
      model_version: 'c1',
      prompt_class: 'formal-audit-v1',
      context_class: 'formal-only',
      source_set_id: 'sources-c',
      tool_set_id: 'tools-c',
      verification_goal: 'formal-semantic-audit',
    }),
  ],
})
assert.equal(high.diversity_level, 'high')
assert.ok(high.diversified_axes >= 4)
assert.equal(high.unique_counts.model_family, 3)
assert.equal(high.unique_counts.source_set_id, 3)
assert.equal(high.effective_review_groups, 3)
assert.equal(high.warnings.includes('pseudo_independent_consensus'), false)

const validation = await validateDiversityProfile(high, { candidateRevisionId })
assert.equal(validation.ok, true, validation.errors.join('\n'))

console.log('R5 epistemic diversity profile RED/GREEN tests passed.')
