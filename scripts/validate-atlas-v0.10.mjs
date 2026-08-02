import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'
import { validateCoreAtlas } from '../lib/atlas-validation.js'

const result = await validateCoreAtlas()
await fs.mkdir(path.join(ROOT, 'artifacts'), { recursive: true })
await fs.writeFile(path.join(ROOT, 'artifacts', 'core-atlas-validation.json'), JSON.stringify(result, null, 2) + '\n')
if (!result.ok) {
  for (const error of result.errors) console.error(error)
  process.exit(1)
}
console.log(`Core atlas validation passed: ${result.summary.entry_count} nodes, ${result.summary.canonical_mko_count} canonical MKOs, ${result.summary.atlas_seed_count} queued seeds, ${result.summary.prerequisite_edge_count} prerequisite edges.`)
