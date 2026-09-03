import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

const ALLOWED_ROOTS = new Set(['candidate_artifact', 'uncertainties', 'evidence_refs', 'proposed_relations'])
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])

export async function loadRepairPatchSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'repair-patch.schema.json'), 'utf8'))
}

export function createRepairPatchValidator(schema) {
  return createMkoValidator(schema)
}

export function decodePointer(pathValue) {
  if (typeof pathValue !== 'string' || !pathValue.startsWith('/')) return null
  const segments = pathValue.slice(1).split('/').map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
  if (segments.some(segment => FORBIDDEN_SEGMENTS.has(segment))) return null
  return segments
}

export async function validateRepairPatch(patch, { task, candidate, ledger, schema = null } = {}) {
  const errors = []
  if (!task || typeof task !== 'object') return { ok: false, errors: ['repair validation requires a materialization task'] }
  if (!candidate || typeof candidate !== 'object') return { ok: false, errors: ['repair validation requires a candidate envelope'] }
  if (!Array.isArray(ledger)) return { ok: false, errors: ['repair validation requires an objection ledger'] }

  const patchSchema = schema ?? await loadRepairPatchSchema()
  const validate = createRepairPatchValidator(patchSchema)
  if (!validate(patch)) {
    errors.push(...formatSchemaErrors(patch?.patch_id ?? 'repair-patch', validate.errors))
    return { ok: false, errors }
  }

  if (patch.task_id !== task.task_id) errors.push(`${patch.patch_id}: task_id must equal ${task.task_id}`)
  if (patch.source_candidate_revision_id !== candidate.candidate_revision_id) {
    errors.push(`${patch.patch_id}: source_candidate_revision_id must equal ${candidate.candidate_revision_id}`)
  }
  if (patch.next_candidate_revision_id === candidate.candidate_revision_id) {
    errors.push(`${patch.patch_id}: next_candidate_revision_id must differ from source revision`)
  }
  if (!patch.next_candidate_revision_id.startsWith(`candidate-${task.task_id}-r`)) {
    errors.push(`${patch.patch_id}: next_candidate_revision_id must be namespaced to ${task.task_id}`)
  }
  if (patch.candidate_id !== candidate.candidate_id || patch.candidate_id !== task.target_mko_id) {
    errors.push(`${patch.patch_id}: candidate_id must remain bound to ${task.target_mko_id}`)
  }

  const ledgerById = new Map(ledger.map(item => [item.objection_id, item]))
  for (const objectionId of patch.resolves_objections) {
    const objection = ledgerById.get(objectionId)
    if (!objection) errors.push(`${patch.patch_id}: unknown objection ${objectionId}`)
    else if (objection.status !== 'open') errors.push(`${patch.patch_id}: objection ${objectionId} is not open`)
  }

  const evidenceIds = patch.resolution_evidence.map(item => item.objection_id)
  if (new Set(evidenceIds).size !== evidenceIds.length) errors.push(`${patch.patch_id}: duplicate resolution_evidence objection_id`)
  for (const objectionId of patch.resolves_objections) {
    if (!evidenceIds.includes(objectionId)) errors.push(`${patch.patch_id}: missing resolution_evidence for ${objectionId}`)
  }
  for (const objectionId of evidenceIds) {
    if (!patch.resolves_objections.includes(objectionId)) errors.push(`${patch.patch_id}: resolution_evidence references unclaimed objection ${objectionId}`)
  }

  for (const operation of patch.operations) {
    const segments = decodePointer(operation.path)
    if (!segments || !ALLOWED_ROOTS.has(segments[0])) {
      errors.push(`${patch.patch_id}: operation path is outside allowed candidate roots: ${operation.path}`)
      continue
    }
    if ((operation.op === 'add' || operation.op === 'replace') && !Object.hasOwn(operation, 'value')) {
      errors.push(`${patch.patch_id}: ${operation.op} operation requires value at ${operation.path}`)
    }
  }

  return { ok: errors.length === 0, errors }
}
