import { promises as fs } from 'node:fs'
import { listEvidence, loadEvidence } from '../lib/evidence-store.js'
import { buildDependencyGraph, loadAllObjects } from '../lib/store.js'

await fs.mkdir('artifacts', { recursive: true })
const objects = await loadAllObjects()
const evidenceEntries = await listEvidence()
const evidence = await Promise.all(evidenceEntries.map(entry => loadEvidence(entry.id)))

await fs.writeFile('artifacts/mko.jsonl', objects.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8')
await fs.writeFile('artifacts/evidence.jsonl', evidence.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8')
await fs.writeFile('artifacts/dependency-graph.json', JSON.stringify(await buildDependencyGraph(), null, 2), 'utf8')
console.log(`Exported ${objects.length} MKO(s), ${evidence.length} Evidence Object(s), and dependency graph to artifacts/.`)
