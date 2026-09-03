import assert from 'node:assert/strict'
import { loadCoreAtlas } from '../lib/atlas-store.js'
import { listObjects } from '../lib/store.js'
import { buildMaterializationTasks } from '../lib/materialization-task-store.js'
import { validateMaterializationTasks } from '../lib/materialization-task-validation.js'

const atlas = await loadCoreAtlas()
const knownMkoIds = (await listObjects()).map(object => object.id)

function validTasks() {
  return buildMaterializationTasks(atlas)
}

async function validate(tasks) {
  return validateMaterializationTasks(tasks, { atlas, knownMkoIds })
}

const valid = await validate(validTasks())
assert.equal(valid.ok, true, valid.errors.join('\n'))

const duplicateTask = validTasks()
duplicateTask.push(structuredClone(duplicateTask[0]))
assert.equal((await validate(duplicateTask)).ok, false)

const duplicateAtlas = validTasks()
duplicateAtlas[1].atlas_id = duplicateAtlas[0].atlas_id
assert.equal((await validate(duplicateAtlas)).ok, false)

const duplicateTarget = validTasks()
duplicateTarget[1].target_mko_id = duplicateTarget[0].target_mko_id
assert.equal((await validate(duplicateTarget)).ok, false)

const unknownAtlas = validTasks()
unknownAtlas[0].atlas_id = 'atlas-does-not-exist'
unknownAtlas[0].task_id = 'task-atlas-does-not-exist'
assert.equal((await validate(unknownAtlas)).ok, false)

const canonicalEntry = atlas.entries.find(entry => entry.maturity === 'canonical_mko')
const canonicalScheduled = validTasks()
canonicalScheduled[0] = {
  schema_version: 'ocme-materialization-task-v0.1',
  task_id: `task-${canonicalEntry.id}`,
  atlas_id: canonicalEntry.id,
  target_mko_id: canonicalEntry.target_mko_id,
  priority: 'P1',
  state: 'queued',
  prerequisite_atlas_ids: [...canonicalEntry.prerequisites],
}
assert.equal((await validate(canonicalScheduled)).ok, false)

const targetMismatch = validTasks()
targetMismatch[0].target_mko_id = 'mko-wrong-target'
assert.equal((await validate(targetMismatch)).ok, false)

const priorityMismatch = validTasks()
priorityMismatch[0].priority = priorityMismatch[0].priority === 'P1' ? 'P2' : 'P1'
assert.equal((await validate(priorityMismatch)).ok, false)

const prerequisiteMismatch = validTasks()
prerequisiteMismatch[0].prerequisite_atlas_ids = ['atlas-set-membership']
assert.equal((await validate(prerequisiteMismatch)).ok, false)

const missingSeed = validTasks().slice(1)
assert.equal((await validate(missingSeed)).ok, false)

const existingTarget = validTasks()
existingTarget[0].target_mko_id = knownMkoIds[0]
assert.equal((await validate(existingTarget)).ok, false)

const unknownPrerequisite = validTasks()
unknownPrerequisite[0].prerequisite_atlas_ids = ['atlas-does-not-exist']
assert.equal((await validate(unknownPrerequisite)).ok, false)

const illegalState = validTasks()
illegalState[0].state = 'canonical'
assert.equal((await validate(illegalState)).ok, false)

console.log('Materialization negative validation tests passed.')
