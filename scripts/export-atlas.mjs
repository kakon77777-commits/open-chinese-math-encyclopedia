import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'
import { getCoreAtlasSummary, getMaterializationQueue, loadCoreAtlas } from '../lib/atlas-store.js'

const atlas = await loadCoreAtlas()
const summary = await getCoreAtlasSummary()
const queue = await getMaterializationQueue()
await fs.mkdir(path.join(ROOT, 'artifacts'), { recursive: true })
await fs.writeFile(path.join(ROOT, 'artifacts', 'core-atlas.json'), JSON.stringify(atlas, null, 2) + '\n')
await fs.writeFile(path.join(ROOT, 'artifacts', 'core-atlas-summary.json'), JSON.stringify(summary, null, 2) + '\n')
await fs.writeFile(path.join(ROOT, 'artifacts', 'materialization-queue.jsonl'), queue.map(entry => JSON.stringify(entry)).join('\n') + '\n')
console.log(`Core atlas export completed: ${atlas.entries.length} nodes; ${queue.length} materialization tasks.`)
