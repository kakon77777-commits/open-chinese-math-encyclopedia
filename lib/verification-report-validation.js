import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

export async function loadVerificationObjectionSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'verification-objection.schema.json'), 'utf8'))
}

export async function loadVerificationReportSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'verification-report.schema.json'), 'utf8'))
}

export function createVerificationReportValidator(reportSchema, objectionSchema) {
  return createMkoValidator(reportSchema, [objectionSchema])
}

export async function validateVerificationReport(report, task, candidate, { reportSchema = null, objectionSchema = null } = {}) {
  const errors = []
  if (!task || typeof task !== 'object') return { ok: false, errors: ['verification report validation requires a materialization task'] }
  if (!candidate || typeof candidate !== 'object') return { ok: false, errors: ['verification report validation requires a candidate envelope'] }

  const loadedObjectionSchema = objectionSchema ?? await loadVerificationObjectionSchema()
  const loadedReportSchema = reportSchema ?? await loadVerificationReportSchema()
  const validate = createVerificationReportValidator(loadedReportSchema, loadedObjectionSchema)
  if (!validate(report)) {
    errors.push(...formatSchemaErrors(report?.report_id ?? 'verification-report', validate.errors))
    return { ok: false, errors }
  }

  if (candidate.task_id !== task.task_id) {
    errors.push(`candidate task_id must equal ${task.task_id}`)
  }
  if (candidate.candidate_id !== task.target_mko_id) {
    errors.push(`candidate_id must equal task target ${task.target_mko_id}`)
  }
  if (report.report_id !== `verification-${candidate.candidate_revision_id}`) {
    errors.push(`${report.report_id}: report_id must equal verification-${candidate.candidate_revision_id}`)
  }
  if (report.task_id !== task.task_id) {
    errors.push(`${report.report_id}: task_id must equal ${task.task_id}`)
  }
  if (report.target_candidate_revision_id !== candidate.candidate_revision_id) {
    errors.push(`${report.report_id}: target_candidate_revision_id must equal ${candidate.candidate_revision_id}`)
  }

  const seenObjectionIds = new Set()
  for (const objection of report.objections) {
    if (seenObjectionIds.has(objection.objection_id)) {
      errors.push(`${report.report_id}: duplicate objection_id ${objection.objection_id}`)
    }
    seenObjectionIds.add(objection.objection_id)

    if (objection.target_candidate_revision_id !== candidate.candidate_revision_id) {
      errors.push(`${objection.objection_id}: target_candidate_revision_id must equal ${candidate.candidate_revision_id}`)
    }
    if (objection.target_candidate_id !== candidate.candidate_id) {
      errors.push(`${objection.objection_id}: target_candidate_id must equal ${candidate.candidate_id}`)
    }
    if (objection.status !== 'open') {
      errors.push(`${objection.objection_id}: verifier may emit only open objections`)
    }
    if (!objection.objection_id.startsWith(`objection-${candidate.candidate_revision_id}-`)) {
      errors.push(`${objection.objection_id}: objection_id must be namespaced to ${candidate.candidate_revision_id}`)
    }
  }

  return { ok: errors.length === 0, errors }
}
