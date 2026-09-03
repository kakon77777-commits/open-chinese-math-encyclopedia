import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

export async function loadMaterializationTaskSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'materialization-task.schema.json'), 'utf8'))
}

export function createMaterializationTaskValidator(schema) {
  return createMkoValidator(schema)
}

function recordDuplicates(records, key, label, errors) {
  const seen = new Set()
  for (const record of records) {
    const value = record?.[key]
    if (typeof value !== 'string') continue
    if (seen.has(value)) errors.push(`${label}: duplicate ${key} ${value}`)
    seen.add(value)
  }
}

function sameStringArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index])
}

export async function validateMaterializationTasks(tasks, { atlas, knownMkoIds = [], schema = null } = {}) {
  const errors = []
  if (!Array.isArray(tasks)) return { ok: false, errors: ['materialization tasks must be an array'] }
  if (!Array.isArray(atlas?.entries)) return { ok: false, errors: ['materialization validation requires atlas.entries'] }

  const taskSchema = schema ?? await loadMaterializationTaskSchema()
  const validateTask = createMaterializationTaskValidator(taskSchema)

  for (const task of tasks) {
    if (!validateTask(task)) {
      errors.push(...formatSchemaErrors(task?.task_id ?? 'materialization-task', validateTask.errors))
    }
  }

  recordDuplicates(tasks, 'task_id', 'materialization-task', errors)
  recordDuplicates(tasks, 'atlas_id', 'materialization-task', errors)
  recordDuplicates(tasks, 'target_mko_id', 'materialization-task', errors)

  const entries = atlas.entries
  const entryById = new Map(entries.map(entry => [entry.id, entry]))
  const seedEntries = entries.filter(entry => entry.maturity === 'atlas_seed')
  const seedIds = new Set(seedEntries.map(entry => entry.id))
  const knownObjects = new Set(knownMkoIds)

  for (const task of tasks) {
    const entry = entryById.get(task?.atlas_id)
    if (!entry) {
      errors.push(`${task?.task_id ?? 'materialization-task'}: unknown atlas_id ${task?.atlas_id}`)
      continue
    }
    if (entry.maturity !== 'atlas_seed') {
      errors.push(`${task.task_id}: atlas entry ${entry.id} is ${entry.maturity}, not atlas_seed`)
    }
    if (task.task_id !== `task-${entry.id}`) {
      errors.push(`${task.task_id}: task_id must equal task-${entry.id}`)
    }
    if (task.target_mko_id !== entry.target_mko_id) {
      errors.push(`${task.task_id}: target_mko_id must equal Atlas target ${entry.target_mko_id}`)
    }
    if (task.priority !== entry.materialization_priority) {
      errors.push(`${task.task_id}: priority must equal Atlas priority ${entry.materialization_priority}`)
    }
    if (!sameStringArray(task.prerequisite_atlas_ids, entry.prerequisites)) {
      errors.push(`${task.task_id}: prerequisite_atlas_ids must exactly match Atlas prerequisites`)
    }
    if (knownObjects.has(task.target_mko_id)) {
      errors.push(`${task.task_id}: target MKO already exists: ${task.target_mko_id}`)
    }
    for (const prerequisiteId of task.prerequisite_atlas_ids || []) {
      if (!entryById.has(prerequisiteId)) {
        errors.push(`${task.task_id}: unknown prerequisite Atlas ID ${prerequisiteId}`)
      }
    }
  }

  for (const seed of seedEntries) {
    const count = tasks.filter(task => task?.atlas_id === seed.id).length
    if (count !== 1) errors.push(`${seed.id}: expected exactly one materialization task, found ${count}`)
  }

  for (const task of tasks) {
    if (typeof task?.atlas_id === 'string' && !seedIds.has(task.atlas_id) && entryById.has(task.atlas_id)) {
      errors.push(`${task.task_id}: non-seed Atlas entry must not have a materialization task`)
    }
  }

  return { ok: errors.length === 0, errors }
}
