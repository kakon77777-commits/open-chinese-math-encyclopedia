import { promises as fs } from 'node:fs'
import { buildDependencyGraph, loadAllObjects } from '../lib/store.js'

await fs.mkdir('artifacts', { recursive: true })
const objects = await loadAllObjects()
await fs.writeFile('artifacts/mko.jsonl', objects.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8')
await fs.writeFile('artifacts/dependency-graph.json', JSON.stringify(await buildDependencyGraph(), null, 2), 'utf8')
console.log(`Exported ${objects.length} object(s) and dependency graph to artifacts/.`)
