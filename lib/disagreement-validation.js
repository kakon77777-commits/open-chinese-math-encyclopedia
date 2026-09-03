import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

export async function loadDisagreementSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'disagreement.schema.json'), 'utf8'))
}

export function createDisagreementValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateDisagreement(disagreement, { candidateRevisionId, schema = null } = {}) {
  const errors = []
  if (typeof candidateRevisionId !== 'string' || candidateRevisionId.length === 0) {
    return { ok: false, errors: ['disagreement validation requires candidateRevisionId'] }
  }

  const disagreementSchema = schema ?? await loadDisagreementSchema()
  const validate = createDisagreementValidator(disagreementSchema)
  if (!validate(disagreement)) {
    errors.push(...formatSchemaErrors(disagreement?.disagreement_id ?? 'disagreement', validate.errors))
    return { ok: false, errors }
  }

  if (disagreement.candidate_revision_id !== candidateRevisionId) {
    errors.push(`${disagreement.disagreement_id}: candidate_revision_id must equal ${candidateRevisionId}`)
  }
  for (const review of disagreement.reviews) {
    if (review.candidate_revision_id !== disagreement.candidate_revision_id) {
      errors.push(`${disagreement.disagreement_id}: review ${review.review_id} targets a different candidate revision`)
    }
    if (review.issue_key !== disagreement.issue_key) {
      errors.push(`${disagreement.disagreement_id}: review ${review.review_id} must target issue ${disagreement.issue_key}`)
    }
  }

  const reviewIds = disagreement.reviews.map(review => review.review_id)
  if (new Set(reviewIds).size !== reviewIds.length) errors.push(`${disagreement.disagreement_id}: duplicate review_id`)
  const expectedPositions = [...new Set(disagreement.reviews.map(review => review.position))].sort()
  if (JSON.stringify(disagreement.positions) !== JSON.stringify(expectedPositions)) {
    errors.push(`${disagreement.disagreement_id}: positions must exactly match distinct review positions`)
  }
  if (expectedPositions.length <= 1) errors.push(`${disagreement.disagreement_id}: disagreement requires multiple positions`)

  return { ok: errors.length === 0, errors }
}
