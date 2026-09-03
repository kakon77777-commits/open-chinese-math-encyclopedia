import assert from 'node:assert/strict'
import { loadCoreAtlas } from '../lib/atlas-store.js'
import { buildMaterializationTasks } from '../lib/materialization-task-store.js'
import {
  classifyMaterializationTasks,
  buildMaterializationBatches,
} from '../runtime/production/task-scheduler.js'

const syntheticAtlas = {
  entries: [
    {
      id: 'atlas-canonical-base',
      maturity: 'canonical_mko',
      prerequisites: [],
      materialization_priority: 'canonical',
      target_mko_id: 'mko-canonical-base',
    },
    {
      id: 'atlas-seed-a',
      maturity: 'atlas_seed',
      prerequisites: ['atlas-canonical-base'],
      materialization_priority: 'P2',
      target_mko_id: 'mko-seed-a',
    },
    {
      id: 'atlas-seed-b',
      maturity: 'atlas_seed',
      prerequisites: ['atlas-seed-a'],
      materialization_priority: 'P1',
      target_mko_id: 'mko-seed-b',
    },
    {
      id: 'atlas-seed-c',
      maturity: 'atlas_seed',
      prerequisites: [],
      materialization_priority: 'P1',
      target_mko_id: 'mko-seed-c',
    },
  ],
}

const syntheticTasks = buildMaterializationTasks(syntheticAtlas)
const originalTasks = structuredClone(syntheticTasks)

const initial = classifyMaterializationTasks(syntheticTasks, syntheticAtlas)
assert.deepEqual(initial.ready.map(task => task.atlas_id), ['atlas-seed-c', 'atlas-seed-a'])
assert.equal(initial.blocked.length, 1)
assert.equal(initial.blocked[0].task.atlas_id, 'atlas-seed-b')
assert.deepEqual(initial.blocked[0].blocked_by, ['task-atlas-seed-a'])
assert.deepEqual(syntheticTasks, originalTasks, 'scheduler must not mutate input tasks')

const afterA = classifyMaterializationTasks(syntheticTasks, syntheticAtlas, {
  completedTaskIds: ['task-atlas-seed-a'],
})
assert.deepEqual(afterA.ready.map(task => task.atlas_id), ['atlas-seed-c', 'atlas-seed-b'])
assert.equal(afterA.ready.some(task => task.atlas_id === 'atlas-seed-a'), false)

assert.throws(
  () => classifyMaterializationTasks(syntheticTasks, syntheticAtlas, {
    completedTaskIds: ['task-atlas-does-not-exist'],
  }),
  /unknown completed materialization task/,
)

const batches = buildMaterializationBatches(syntheticTasks, syntheticAtlas)
assert.deepEqual(
  batches.map(batch => batch.map(task => task.atlas_id)),
  [
    ['atlas-seed-c', 'atlas-seed-a'],
    ['atlas-seed-b'],
  ],
)
assert.deepEqual(syntheticTasks, originalTasks, 'batch scheduler must not mutate input tasks')

const atlas = await loadCoreAtlas()
const tasks = buildMaterializationTasks(atlas)
const realBatches = buildMaterializationBatches(tasks, atlas)
const flattened = realBatches.flat()
assert.equal(flattened.length, 74)
assert.equal(new Set(flattened.map(task => task.task_id)).size, 74)

const batchIndex = new Map()
realBatches.forEach((batch, index) => {
  for (const task of batch) batchIndex.set(task.atlas_id, index)
})
const entryById = new Map(atlas.entries.map(entry => [entry.id, entry]))
for (const task of tasks) {
  const entry = entryById.get(task.atlas_id)
  for (const prerequisiteId of entry.prerequisites) {
    const prerequisite = entryById.get(prerequisiteId)
    if (prerequisite.maturity === 'atlas_seed') {
      assert.ok(
        batchIndex.get(prerequisiteId) < batchIndex.get(task.atlas_id),
        `${task.atlas_id} must be scheduled after ${prerequisiteId}`,
      )
    }
  }
}

for (const batch of realBatches) {
  const sorted = [...batch].sort((a, b) => {
    const rank = { P1: 1, P2: 2, P3: 3 }
    return (rank[a.priority] - rank[b.priority]) || a.atlas_id.localeCompare(b.atlas_id, 'en')
  })
  assert.deepEqual(batch, sorted)
}

console.log(`Materialization scheduler tests passed: ${realBatches.length} dependency-safe batches cover 74 tasks.`)
