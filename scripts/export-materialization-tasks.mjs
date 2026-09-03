import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'
import {
  loadMaterializationTasks,
  serializeMaterializationTasks,
} from '../lib/materialization-task-store.js'

const OUTPUT_PATH = path.join(ROOT, 'artifacts', 'materialization-tasks.jsonl')
const checkOnly = process.argv.includes('--check')

const tasks = await loadMaterializationTasks()
const expected = serializeMaterializationTasks(tasks)

if (checkOnly) {
  let actual
  try {
    actual = await fs.readFile(OUTPUT_PATH, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.error('Materialization task export check failed: artifact is missing.')
      process.exit(1)
    }
    throw error
  }

  if (actual !== expected) {
    console.error('Materialization task export check failed: artifact drift detected.')
    process.exit(1)
  }

  console.log(`Materialization task export check passed: ${tasks.length} task(s).`)
} else {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, expected, 'utf8')
  console.log(`Exported ${tasks.length} materialization task(s) to artifacts/materialization-tasks.jsonl.`)
}
