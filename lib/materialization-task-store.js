import { loadCoreAtlas } from './atlas-store.js'

const PRIORITY_RANK = Object.freeze({ P1: 1, P2: 2, P3: 3 })

function compareTasks(a, b) {
  return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) ||
    a.atlas_id.localeCompare(b.atlas_id, 'en')
}

export function buildMaterializationTasks(atlas) {
  const entries = Array.isArray(atlas?.entries) ? atlas.entries : []
  return entries
    .filter(entry => entry.maturity === 'atlas_seed')
    .map(entry => ({
      schema_version: 'ocme-materialization-task-v0.1',
      task_id: `task-${entry.id}`,
      atlas_id: entry.id,
      target_mko_id: entry.target_mko_id,
      priority: entry.materialization_priority,
      state: 'queued',
      prerequisite_atlas_ids: [...entry.prerequisites],
    }))
    .sort(compareTasks)
}

export async function loadMaterializationTasks() {
  return buildMaterializationTasks(await loadCoreAtlas())
}

export function serializeMaterializationTasks(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError('materialization tasks must be an array')
  return tasks.map(task => JSON.stringify(task)).join('\n') + '\n'
}
