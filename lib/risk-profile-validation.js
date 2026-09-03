import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

const CLASS_RANK = Object.freeze({ L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 })

function scoreToClass(score) {
  if (score >= 75) return 'L4'
  if (score >= 50) return 'L3'
  if (score >= 30) return 'L2'
  if (score >= 15) return 'L1'
  return 'L0'
}

export async function loadRiskProfileSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'risk-profile.schema.json'), 'utf8'))
}

export function createRiskProfileValidator(schema) {
  return createMkoValidator(schema)
}

export async function validateRiskProfile(profile, {
  task,
  atlasEntry,
  mechanicalReport,
  schema = null,
} = {}) {
  const errors = []
  if (!task || typeof task !== 'object' || Array.isArray(task)) return { ok: false, errors: ['risk profile validation requires task'] }
  if (!atlasEntry || typeof atlasEntry !== 'object' || Array.isArray(atlasEntry)) return { ok: false, errors: ['risk profile validation requires atlasEntry'] }
  if (!mechanicalReport || typeof mechanicalReport !== 'object' || Array.isArray(mechanicalReport)) return { ok: false, errors: ['risk profile validation requires mechanicalReport'] }

  const profileSchema = schema ?? await loadRiskProfileSchema()
  const validate = createRiskProfileValidator(profileSchema)
  if (!validate(profile)) {
    errors.push(...formatSchemaErrors(profile?.profile_id ?? 'risk-profile', validate.errors))
    return { ok: false, errors }
  }

  if (profile.task_id !== task.task_id) errors.push(`${profile.profile_id}: task_id must equal ${task.task_id}`)
  if (profile.atlas_id !== task.atlas_id) errors.push(`${profile.profile_id}: atlas_id must equal task atlas_id ${task.atlas_id}`)
  if (profile.atlas_id !== atlasEntry.id) errors.push(`${profile.profile_id}: atlas_id must equal atlas entry id ${atlasEntry.id}`)
  if (profile.candidate_revision_id !== mechanicalReport.candidate_revision_id) {
    errors.push(`${profile.profile_id}: candidate_revision_id must equal ${mechanicalReport.candidate_revision_id}`)
  }
  if (profile.mechanical_report_id !== mechanicalReport.report_id) {
    errors.push(`${profile.profile_id}: mechanical_report_id must equal ${mechanicalReport.report_id}`)
  }
  if (profile.materialization_priority !== task.priority) {
    errors.push(`${profile.profile_id}: materialization_priority must equal ${task.priority}`)
  }
  if (profile.profile_id !== `risk-${profile.candidate_revision_id}`) {
    errors.push(`${profile.profile_id}: profile_id must be derived from candidate_revision_id`)
  }

  let expectedClass = scoreToClass(profile.risk_score)
  if (profile.hard_floor !== null && CLASS_RANK[profile.hard_floor] > CLASS_RANK[expectedClass]) expectedClass = profile.hard_floor
  if (profile.risk_class !== expectedClass) {
    errors.push(`${profile.profile_id}: risk_class must equal ${expectedClass} for score ${profile.risk_score} and hard_floor ${profile.hard_floor}`)
  }
  if (mechanicalReport.mechanical_status === 'fail' && profile.risk_class !== 'L4') {
    errors.push(`${profile.profile_id}: failed mechanical report requires L4 routing risk`)
  }

  return { ok: errors.length === 0, errors }
}
