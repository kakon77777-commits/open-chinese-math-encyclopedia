import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

mkdirSync('artifacts/felra', { recursive: true })
const result = spawnSync('felra', [
  'run', 'felra/pythagorean/project.yaml', '--output', 'artifacts/felra'
], { stdio: 'inherit', shell: process.platform === 'win32' })

if (result.error?.code === 'ENOENT') {
  console.error('找不到 felra CLI。請先安裝 FELRA：pip install -e /path/to/FELRA')
  process.exit(2)
}
process.exit(result.status ?? 1)
