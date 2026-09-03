import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'
import { sha256CanonicalJson } from './canonical-json.js'

export async function loadMechanicalTrustReportSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mechanical-trust-report.schema.json'), 'utf8'))
}

export function createMechanicalTrustReportValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateMechanicalTrustReport(report, candidate, { schema = null, expectedSourceRevision = null } = {}) {
  const errors = []
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: ['mechanical trust validation requires a candidate envelope'] }
  }

  const reportSchema = schema ?? await loadMechanicalTrustReportSchema()
  const validate = createMechanicalTrustReportValidator(reportSchema)
  if (!validate(report)) {
    errors.push(...formatSchemaErrors(report?.report_id ?? 'mechanical-trust-report', validate.errors))
    return { ok: false, errors }
  }

  if (report.candidate_revision_id !== candidate.candidate_revision_id) {
    errors.push(`${report.report_id}: candidate_revision_id must equal ${candidate.candidate_revision_id}`)
  }
  if (report.candidate_id !== candidate.candidate_id) {
    errors.push(`${report.report_id}: candidate_id must equal ${candidate.candidate_id}`)
  }
  if (report.target_mko_id !== candidate.target_mko_id) {
    errors.push(`${report.report_id}: target_mko_id must equal ${candidate.target_mko_id}`)
  }

  const candidateHash = sha256CanonicalJson(candidate)
  if (report.candidate_sha256 !== candidateHash) {
    errors.push(`${report.report_id}: candidate_sha256 does not match candidate envelope`)
  }
  const artifactHash = sha256CanonicalJson(candidate.candidate_artifact)
  if (report.candidate_artifact_sha256 !== artifactHash) {
    errors.push(`${report.report_id}: candidate_artifact_sha256 does not match candidate artifact`)
  }
  if (expectedSourceRevision !== null && report.source_revision !== expectedSourceRevision) {
    errors.push(`${report.report_id}: source_revision must equal ${expectedSourceRevision}`)
  }

  const gateIds = report.gates.map(gate => gate.gate_id)
  if (new Set(gateIds).size !== gateIds.length) {
    errors.push(`${report.report_id}: duplicate gate_id`)
  }

  for (const gate of report.gates) {
    if (gate.status === 'pass' && gate.exit_code !== 0) {
      errors.push(`${report.report_id}: passing gate ${gate.gate_id} must have exit_code 0`)
    }
    if (gate.status === 'fail' && gate.exit_code === 0) {
      errors.push(`${report.report_id}: failing gate ${gate.gate_id} must have non-zero exit_code`)
    }
  }

  const derivedStatus = report.gates.every(gate => gate.status === 'pass') ? 'pass' : 'fail'
  if (report.mechanical_status !== derivedStatus) {
    errors.push(`${report.report_id}: mechanical_status must equal ${derivedStatus}`)
  }

  return { ok: errors.length === 0, errors }
}
