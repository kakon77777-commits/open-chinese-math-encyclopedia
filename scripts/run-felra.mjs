import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const project = process.env.FELRA_PROJECT || 'felra/pythagorean/project.yaml'
const output = process.env.FELRA_OUTPUT || 'artifacts/felra'
mkdirSync(output, { recursive: true })

const result = spawnSync('felra', ['run', project, '--output', output], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error?.code === 'ENOENT') {
  console.error('找不到 felra CLI。請先安裝 FELRA：pip install -e /path/to/FELRA')
  process.exit(2)
}
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1)

console.error('FELRA 執行完成，但尚未成為 OCME Canonical Evidence。')
console.error('請依 schemas/felra-run-manifest.schema.json 產生正規化 manifest，然後執行：')
console.error('npm run adapt:felra -- --manifest <manifest-path> --ingest')
console.error('npm run build:evidence && npm run check')
