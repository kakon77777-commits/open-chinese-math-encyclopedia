import assert from 'node:assert/strict'
import { loadCoreAtlas } from '../lib/atlas-store.js'
import {
  buildMaterializationTasks,
  loadMaterializationTasks,
  serializeMaterializationTasks,
} from '../lib/materialization-task-store.js'

const atlas = await loadCoreAtlas()
const tasks = buildMaterializationTasks(atlas)

assert.equal(tasks.length, 71)
assert.equal(tasks.every(task => task.schema_version === 'ocme-materialization-task-v0.1'), true)
assert.equal(tasks.every(task => task.state === 'queued'), true)
assert.equal(tasks.every(task => task.task_id === `task-${task.atlas_id}`), true)
assert.equal(new Set(tasks.map(task => task.task_id)).size, 71)
assert.equal(new Set(tasks.map(task => task.atlas_id)).size, 71)
assert.equal(new Set(tasks.map(task => task.target_mko_id)).size, 71)

const seedIds = atlas.entries
  .filter(entry => entry.maturity === 'atlas_seed')
  .map(entry => entry.id)
  .sort()
assert.deepEqual(tasks.map(task => task.atlas_id).sort(), seedIds)

const integer = atlas.entries.find(entry => entry.id === 'atlas-integer')
const integerTask = tasks.find(task => task.atlas_id === integer.id)
assert.ok(integerTask)
assert.equal(integerTask.target_mko_id, integer.target_mko_id)
assert.equal(integerTask.priority, integer.materialization_priority)
assert.deepEqual(integerTask.prerequisite_atlas_ids, integer.prerequisites)

const loaded = await loadMaterializationTasks()
assert.deepEqual(loaded, tasks)

const serialized1 = serializeMaterializationTasks(tasks)
const serialized2 = serializeMaterializationTasks(buildMaterializationTasks(atlas))
assert.equal(serialized1, serialized2)
assert.equal(serialized1.endsWith('\n'), true)
assert.equal(serialized1.trimEnd().split('\n').length, 71)

console.log('Materialization task derivation tests passed: 71 deterministic Atlas-seed tasks.')
