import assert from 'node:assert/strict'
import { buildDisagreements } from '../runtime/trust/disagreement.js'
import { validateDisagreement } from '../lib/disagreement-validation.js'

const candidateRevisionId = 'candidate-task-atlas-natural-number-r0'

function review(reviewId, position, issueKey = 'definition_scope') {
  return {
    review_id: reviewId,
    candidate_revision_id: candidateRevisionId,
    issue_key: issueKey,
    position,
    model_family: 'fixture-family',
    model_version: 'fixture-v1',
    role: 'verifier',
    prompt_class: 'fixture-prompt',
    context_class: 'fixture-context',
    source_set_id: 'fixture-sources',
    tool_set_id: 'fixture-tools',
    verification_goal: 'fixture-goal',
  }
}

const majorityLike = buildDisagreements({
  candidateRevisionId,
  reviews: [
    review('review-support-2', 'support'),
    review('review-oppose-1', 'oppose'),
    review('review-support-1', 'support'),
  ],
})
assert.equal(majorityLike.length, 1)
assert.equal(majorityLike[0].status, 'open')
assert.deepEqual(majorityLike[0].positions, ['oppose', 'support'])
assert.deepEqual(majorityLike[0].reviews.map(item => item.review_id), [
  'review-oppose-1',
  'review-support-1',
  'review-support-2',
])
assert.equal(Object.hasOwn(majorityLike[0], 'winner'), false)
assert.equal(Object.hasOwn(majorityLike[0], 'majority_verdict'), false)
assert.equal(Object.hasOwn(majorityLike[0], 'truth'), false)
assert.equal(Object.hasOwn(majorityLike[0], 'canonical_verdict'), false)
const validation = await validateDisagreement(majorityLike[0], { candidateRevisionId })
assert.equal(validation.ok, true, validation.errors.join('\n'))

const unanimous = buildDisagreements({
  candidateRevisionId,
  reviews: [review('review-u1', 'support'), review('review-u2', 'support')],
})
assert.deepEqual(unanimous, [])

const uncertain = buildDisagreements({
  candidateRevisionId,
  reviews: [review('review-s1', 'support'), review('review-q1', 'uncertain')],
})
assert.equal(uncertain.length, 1)
assert.equal(uncertain[0].status, 'open')
assert.deepEqual(uncertain[0].positions, ['support', 'uncertain'])

const multipleIssues = buildDisagreements({
  candidateRevisionId,
  reviews: [
    review('review-a1', 'support', 'issue-a'),
    review('review-a2', 'oppose', 'issue-a'),
    review('review-b1', 'support', 'issue-b'),
    review('review-b2', 'support', 'issue-b'),
  ],
})
assert.equal(multipleIssues.length, 1)
assert.equal(multipleIssues[0].issue_key, 'issue-a')

console.log('R5 disagreement preservation RED/GREEN tests passed.')
