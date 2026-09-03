const PRIORITY_RANK = Object.freeze({ P1: 1, P2: 2, P3: 3 })

function compareTasks(a, b) {
  return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) ||
    a.atlas_id.localeCompare(b.atlas_id, 'en')
}

function prepareScheduler(tasks, atlas, completedTaskIds) {
  if (!Array.isArray(tasks)) throw new TypeError('materialization tasks must be an array')
  if (!Array.isArray(atlas?.entries)) throw new TypeError('materialization scheduler requires atlas.entries')
  if (!Array.isArray(completedTaskIds)) throw new TypeError('completedTaskIds must be an array')

  const taskById = new Map()
  for (const task of tasks) {
    if (taskById.has(task.task_id)) {
      throw new Error(`duplicate materialization task ID: ${task.task_id}`)
    }
    taskById.set(task.task_id, task)
  }

  const completed = new Set()
  for (const taskId of completedTaskIds) {
    if (!taskById.has(taskId)) {
      throw new Error(`unknown completed materialization task: ${taskId}`)
    }
    completed.add(taskId)
  }

  const entryById = new Map(atlas.entries.map(entry => [entry.id, entry]))
  return { taskById, completed, entryById }
}

export function classifyMaterializationTasks(tasks, atlas, { completedTaskIds = [] } = {}) {
  const { taskById, completed, entryById } = prepareScheduler(tasks, atlas, completedTaskIds)
  const ready = []
  const blocked = []

  for (const task of tasks) {
    if (completed.has(task.task_id)) continue

    const entry = entryById.get(task.atlas_id)
    if (!entry) throw new Error(`unknown Atlas entry for materialization task: ${task.atlas_id}`)
    if (entry.maturity !== 'atlas_seed') {
      throw new Error(`materialization task must target atlas_seed entry: ${task.atlas_id}`)
    }

    const blockedBy = []
    for (const prerequisiteId of entry.prerequisites) {
      const prerequisite = entryById.get(prerequisiteId)
      if (!prerequisite) throw new Error(`unknown Atlas prerequisite: ${prerequisiteId}`)

      if (prerequisite.maturity === 'canonical_mko') continue
      if (prerequisite.maturity !== 'atlas_seed') {
        throw new Error(`unsupported Atlas prerequisite maturity: ${prerequisiteId} -> ${prerequisite.maturity}`)
      }

      const prerequisiteTaskId = `task-${prerequisiteId}`
      if (!taskById.has(prerequisiteTaskId)) {
        throw new Error(`missing materialization task for prerequisite: ${prerequisiteId}`)
      }
      if (!completed.has(prerequisiteTaskId)) blockedBy.push(prerequisiteTaskId)
    }

    if (blockedBy.length === 0) ready.push(task)
    else blocked.push({ task, blocked_by: blockedBy.sort((a, b) => a.localeCompare(b, 'en')) })
  }

  ready.sort(compareTasks)
  blocked.sort((a, b) => compareTasks(a.task, b.task))
  return { ready, blocked }
}

export function buildMaterializationBatches(tasks, atlas, { completedTaskIds = [] } = {}) {
  const { taskById } = prepareScheduler(tasks, atlas, completedTaskIds)
  const completed = new Set(completedTaskIds)
  const batches = []

  while (completed.size < taskById.size) {
    const { ready } = classifyMaterializationTasks(tasks, atlas, {
      completedTaskIds: [...completed],
    })

    if (ready.length === 0) {
      const remaining = tasks
        .filter(task => !completed.has(task.task_id))
        .map(task => task.task_id)
        .sort((a, b) => a.localeCompare(b, 'en'))
      throw new Error(`materialization dependency deadlock: ${remaining.join(', ')}`)
    }

    batches.push([...ready])
    for (const task of ready) completed.add(task.task_id)
  }

  return batches
}
