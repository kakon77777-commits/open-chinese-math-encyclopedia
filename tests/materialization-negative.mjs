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

async function expectInvalid(tasks, expectedError) {
  const result = await validate(tasks)
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), expectedError)
}

const valid = await validate(validTasks())
assert.equal(valid.ok, true, valid.errors.join('\n'))

const duplicateTask = validTasks()
duplicateTask.push(structuredClone(duplicateTask[0]))
await expectInvalid(duplicateTask, /duplicate task_id/)

const duplicateAtlas = validTasks()
duplicateAtlas[1].atlas_id = duplicateAtlas[0].atlas_id
await expectInvalid(duplicateAtlas, /duplicate atlas_id/)

const duplicateTarget = validTasks()
duplicateTarget[1].target_mko_id = duplicateTarget[0].target_mko_id
await expectInvalid(duplicateTarget, /duplicate target_mko_id/)

const unknownAtlas = validTasks()
unknownAtlas[0].atlas_id = 'atlas-does-not-exist'
unknownAtlas[0].task_id = 'task-atlas-does-not-exist'
await expectInvalid(unknownAtlas, /unknown atlas_id atlas-does-not-exist/)

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
await expectInvalid(canonicalScheduled, /is canonical_mko, not atlas_seed/)

const targetMismatch = validTasks()
targetMismatch[0].target_mko_id = 'mko-wrong-target'
await expectInvalid(targetMismatch, /target_mko_id must equal Atlas target/)

const priorityMismatch = validTasks()
priorityMismatch[0].priority = priorityMismatch[0].priority === 'P1' ? 'P2' : 'P1'
await expectInvalid(priorityMismatch, /priority must equal Atlas priority/)

const prerequisiteMismatch = validTasks()
prerequisiteMismatch[0].prerequisite_atlas_ids = ['atlas-set-membership']
await expectInvalid(prerequisiteMismatch, /prerequisite_atlas_ids must exactly match Atlas prerequisites/)

const missingSeed = validTasks().slice(1)
await expectInvalid(missingSeed, /expected exactly one materialization task, found 0/)

const existingTarget = validTasks()
existingTarget[0].target_mko_id = knownMkoIds[0]
await expectInvalid(existingTarget, /target MKO already exists/)

const unknownPrerequisite = validTasks()
unknownPrerequisite[0].prerequisite_atlas_ids = ['atlas-does-not-exist']
await expectInvalid(unknownPrerequisite, /unknown prerequisite Atlas ID atlas-does-not-exist/)

const illegalState = validTasks()
illegalState[0].state = 'canonical'
await expectInvalid(illegalState, /state/)

console.log('Materialization negative validation tests passed with intended-gate assertions.')
