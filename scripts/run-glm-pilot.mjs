import { loadCoreAtlas } from '../lib/atlas-store.js'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { GlmAdapter } from '../runtime/providers/glm-adapter.js'
import { createModelPolicy } from '../runtime/providers/model-policy.js'
import { ProviderRegistry } from '../runtime/providers/provider-registry.js'
import { ProviderRuntime } from '../runtime/providers/provider-runtime.js'
import { runDbvLoop } from '../runtime/production/dbv-loop.js'

const apiKey = process.env.GLM_API_KEY
if (!apiKey) {
  console.error('GLM live pilot not run: GLM_API_KEY is not set.')
  process.exit(2)
}

const baseUrl = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
const model = process.env.GLM_MODEL || 'glm-5.3-flash'
const atlas = await loadCoreAtlas()
const tasks = await loadMaterializationTasks()
const canonicalAtlasIds = new Set(atlas.entries.filter(entry => entry.maturity === 'canonical_mko').map(entry => entry.id))
const p1 = tasks.filter(task => task.priority === 'P1')
const directlyReady = p1.filter(task => task.prerequisite_atlas_ids.every(id => canonicalAtlasIds.has(id)))
const selected = [...directlyReady]
for (const task of p1) {
  if (selected.length >= 3) break
  if (!selected.some(item => item.task_id === task.task_id)) selected.push(task)
}
if (selected.length < 3) throw new Error('GLM live pilot requires at least three P1 materialization tasks')

const registry = new ProviderRegistry().register('glm', new GlmAdapter({ apiKey, baseUrl }))
const modelPolicy = createModelPolicy({ provider: 'glm', model })
const runtime = new ProviderRuntime({ registry, modelPolicy })
let failures = 0

for (const task of selected.slice(0, 3)) {
  const before = runtime.getRunRecords().length
  try {
    const result = await runDbvLoop({
      provider: runtime,
      task,
      contexts: {
        designer: { pilot: true, mode: 'low_medium_risk_materialization' },
        builder: { pilot: true, mode: 'low_medium_risk_materialization' },
        verifier: { pilot: true, independent_verification_required: true },
        repair: { pilot: true, targeted_repair_only: true },
      },
      maxAttempts: 2,
      majorThreshold: 0,
      mechanicalState: 'not_run',
    })
    const taskRecords = runtime.getRunRecords().slice(before)
    const usage = taskRecords.reduce((total, record) => ({
      input_units: total.input_units + record.usage.input_units,
      output_units: total.output_units + record.usage.output_units,
      total_units: total.total_units + record.usage.total_units,
      cached_input_units: total.cached_input_units + record.usage.cached_input_units,
    }), { input_units: 0, output_units: 0, total_units: 0, cached_input_units: 0 })

    console.log(JSON.stringify({
      task_id: task.task_id,
      target_mko_id: task.target_mko_id,
      status: result.status,
      attempts: result.attempts,
      provider: 'glm',
      model,
      run_ids: taskRecords.map(record => record.run_id),
      usage,
    }))
  } catch (error) {
    failures += 1
    console.error(JSON.stringify({
      task_id: task.task_id,
      target_mko_id: task.target_mko_id,
      status: 'provider_or_schema_failure',
      error: String(error?.message || error).slice(0, 240),
    }))
  }
}

const allRecords = runtime.getRunRecords()
const totalUsage = allRecords.reduce((total, record) => ({
  input_units: total.input_units + record.usage.input_units,
  output_units: total.output_units + record.usage.output_units,
  total_units: total.total_units + record.usage.total_units,
  cached_input_units: total.cached_input_units + record.usage.cached_input_units,
}), { input_units: 0, output_units: 0, total_units: 0, cached_input_units: 0 })
console.log(JSON.stringify({ pilot_summary: { tasks: 3, successful_runtime_tasks: 3 - failures, failures, provider: 'glm', model, run_count: allRecords.length, usage: totalUsage } }))

if (failures > 0) process.exitCode = 1
