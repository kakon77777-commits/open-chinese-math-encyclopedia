import assert from 'node:assert/strict'
import { buildDiversityProfile } from '../runtime/trust/diversity.js'
import { validateDiversityProfile } from '../lib/diversity-profile-validation.js'

const candidateRevisionId = 'candidate-task-atlas-natural-number-r0'

function review(overrides = {}) {
  return {
    review_id: 'review-negative-001',
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

assert.throws(
  () => buildDiversityProfile({
    candidateRevisionId,
    reviews: [review(), review()],
  }),
  /duplicate review_id/,
)

assert.throws(
  () => buildDiversityProfile({
    candidateRevisionId,
    reviews: [review({ candidate_revision_id: 'candidate-task-atlas-other-r0' })],
  }),
  /different candidate revision/,
)

assert.throws(
  () => buildDiversityProfile({
    candidateRevisionId,
    reviews: [review({ position: 'abstain' })],
  }),
  /invalid review position/,
)

const valid = buildDiversityProfile({ candidateRevisionId, reviews: [review()] })
for (const forbiddenField of ['confidence', 'mathematically_true', 'canonical_state', 'canonical_verdict']) {
  const tampered = structuredClone(valid)
  tampered[forbiddenField] = forbiddenField === 'confidence' ? 0.99 : true
  const result = await validateDiversityProfile(tampered, { candidateRevisionId })
  assert.equal(result.ok, false, `${forbiddenField} must be rejected`)
}

const stale = structuredClone(valid)
stale.candidate_revision_id = 'candidate-task-atlas-stale-r0'
const staleResult = await validateDiversityProfile(stale, { candidateRevisionId })
assert.equal(staleResult.ok, false)
assert.ok(staleResult.errors.some(error => error.includes('candidate_revision_id')))

console.log('R5 epistemic diversity negative tests passed.')
