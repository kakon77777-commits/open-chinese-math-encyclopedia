import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

export async function loadCandidateEnvelopeSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'candidate-envelope.schema.json'), 'utf8'))
}

export function createCandidateEnvelopeValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateCandidateEnvelope(candidate, task, contract, { schema = null } = {}) {
  const errors = []
  if (!task || typeof task !== 'object') return { ok: false, errors: ['candidate validation requires a materialization task'] }
  if (!contract || typeof contract !== 'object') return { ok: false, errors: ['candidate validation requires a design contract'] }

  const candidateSchema = schema ?? await loadCandidateEnvelopeSchema()
  const validate = createCandidateEnvelopeValidator(candidateSchema)
  if (!validate(candidate)) {
    errors.push(...formatSchemaErrors(candidate?.candidate_revision_id ?? 'candidate-envelope', validate.errors))
    return { ok: false, errors }
  }

  if (contract.task_id !== task.task_id) {
    errors.push(`design contract task_id must equal ${task.task_id}`)
  }
  if (contract.target_mko_id !== task.target_mko_id) {
    errors.push(`design contract target_mko_id must equal ${task.target_mko_id}`)
  }
  if (candidate.task_id !== task.task_id) {
    errors.push(`${candidate.candidate_revision_id}: task_id must equal ${task.task_id}`)
  }
  if (candidate.target_mko_id !== task.target_mko_id) {
    errors.push(`${candidate.candidate_revision_id}: target_mko_id must equal ${task.target_mko_id}`)
  }
  if (candidate.candidate_id !== task.target_mko_id) {
    errors.push(`${candidate.candidate_revision_id}: candidate_id must equal task target ${task.target_mko_id}`)
  }
  if (!candidate.candidate_revision_id.startsWith(`candidate-${task.task_id}-r`)) {
    errors.push(`${candidate.candidate_revision_id}: candidate_revision_id must be namespaced to ${task.task_id}`)
  }

  return { ok: errors.length === 0, errors }
}
