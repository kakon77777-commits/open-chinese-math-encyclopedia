import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

const AXES = Object.freeze([
  'model_family',
  'prompt_class',
  'context_class',
  'source_set_id',
  'tool_set_id',
  'verification_goal',
])

function uniqueCount(reviews, field) {
  return new Set(reviews.map(review => review[field])).size
}

function expectedLevel(uniqueCounts, diversifiedAxes) {
  if (diversifiedAxes >= 4 && uniqueCounts.model_family >= 2 && uniqueCounts.source_set_id >= 2) return 'high'
  if (
    diversifiedAxes >= 2 &&
    (uniqueCounts.model_family >= 2 || uniqueCounts.source_set_id >= 2 || uniqueCounts.tool_set_id >= 2)
  ) return 'medium'
  return 'low'
}

export async function loadDiversityProfileSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'diversity-profile.schema.json'), 'utf8'))
}

export function createDiversityProfileValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateDiversityProfile(profile, { candidateRevisionId, schema = null } = {}) {
  const errors = []
  if (typeof candidateRevisionId !== 'string' || candidateRevisionId.length === 0) {
    return { ok: false, errors: ['diversity profile validation requires candidateRevisionId'] }
  }

  const profileSchema = schema ?? await loadDiversityProfileSchema()
  const validate = createDiversityProfileValidator(profileSchema)
  if (!validate(profile)) {
    errors.push(...formatSchemaErrors(profile?.profile_id ?? 'diversity-profile', validate.errors))
    return { ok: false, errors }
  }

  if (profile.candidate_revision_id !== candidateRevisionId) {
    errors.push(`${profile.profile_id}: candidate_revision_id must equal ${candidateRevisionId}`)
  }
  if (profile.profile_id !== `diversity-${profile.candidate_revision_id}`) {
    errors.push(`${profile.profile_id}: profile_id must be derived from candidate_revision_id`)
  }

  const reviewIds = profile.reviews.map(review => review.review_id)
  if (new Set(reviewIds).size !== reviewIds.length) errors.push(`${profile.profile_id}: duplicate review_id`)
  for (const review of profile.reviews) {
    if (review.candidate_revision_id !== profile.candidate_revision_id) {
      errors.push(`${profile.profile_id}: review ${review.review_id} targets a different candidate revision`)
    }
  }
  if (profile.review_count !== profile.reviews.length) {
    errors.push(`${profile.profile_id}: review_count must equal ${profile.reviews.length}`)
  }

  const uniqueCounts = Object.fromEntries(AXES.map(axis => [axis, uniqueCount(profile.reviews, axis)]))
  for (const axis of AXES) {
    if (profile.unique_counts[axis] !== uniqueCounts[axis]) {
      errors.push(`${profile.profile_id}: unique_counts.${axis} must equal ${uniqueCounts[axis]}`)
    }
  }
  const diversifiedAxes = AXES.filter(axis => uniqueCounts[axis] > 1).length
  if (profile.diversified_axes !== diversifiedAxes) {
    errors.push(`${profile.profile_id}: diversified_axes must equal ${diversifiedAxes}`)
  }
  const effectiveGroups = new Set(profile.reviews.map(review => JSON.stringify(AXES.map(axis => review[axis])))).size
  if (profile.effective_review_groups !== effectiveGroups) {
    errors.push(`${profile.profile_id}: effective_review_groups must equal ${effectiveGroups}`)
  }

  const level = expectedLevel(uniqueCounts, diversifiedAxes)
  if (profile.diversity_level !== level) errors.push(`${profile.profile_id}: diversity_level must equal ${level}`)

  const pseudoConsensus =
    profile.reviews.length >= 3 &&
    uniqueCounts.model_family === 1 &&
    uniqueCounts.context_class === 1 &&
    uniqueCounts.source_set_id === 1 &&
    uniqueCounts.tool_set_id === 1
  const hasWarning = profile.warnings.includes('pseudo_independent_consensus')
  if (pseudoConsensus !== hasWarning) {
    errors.push(`${profile.profile_id}: pseudo_independent_consensus warning must match review topology`)
  }

  return { ok: errors.length === 0, errors }
}
