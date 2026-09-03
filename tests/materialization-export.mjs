import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT } from '../lib/store.js'
import {
  loadMaterializationTasks,
  serializeMaterializationTasks,
} from '../lib/materialization-task-store.js'

const artifactPath = path.join(ROOT, 'artifacts', 'materialization-tasks.jsonl')
const expected = serializeMaterializationTasks(await loadMaterializationTasks())
assert.equal(expected.trimEnd().split('\n').length, 74)

let actual
try {
  actual = await fs.readFile(artifactPath, 'utf8')
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error('MATERIALIZATION_TASKS_JSONL_BEGIN')
    console.error(expected)
    console.error('MATERIALIZATION_TASKS_JSONL_END')
  }
  throw error
}
assert.equal(actual, expected, 'committed materialization task artifact must match canonical Atlas derivation')

const check = spawnSync(process.execPath, ['scripts/export-materialization-tasks.mjs', '--check'], {
  cwd: ROOT,
  encoding: 'utf8',
})
assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`)
assert.match(check.stdout, /Materialization task export check passed: 74 task\(s\)/)

console.log('Materialization export tests passed: committed JSONL exactly matches the 74-task derivation.')
