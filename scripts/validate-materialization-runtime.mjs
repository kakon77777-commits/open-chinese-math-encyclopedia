import { loadCoreAtlas } from '../lib/atlas-store.js'
import { listObjects } from '../lib/store.js'
import { buildMaterializationTasks } from '../lib/materialization-task-store.js'
import { validateMaterializationTasks } from '../lib/materialization-task-validation.js'
import { buildMaterializationBatches } from '../runtime/production/task-scheduler.js'

const atlas = await loadCoreAtlas()
const knownMkoIds = (await listObjects()).map(object => object.id)
const tasks = buildMaterializationTasks(atlas)
const validation = await validateMaterializationTasks(tasks, { atlas, knownMkoIds })

if (!validation.ok) {
  for (const error of validation.errors) console.error(error)
  process.exit(1)
}

const batches = buildMaterializationBatches(tasks, atlas)
console.log(`Materialization runtime validation passed: ${tasks.length} tasks in ${batches.length} dependency-safe batches.`)
