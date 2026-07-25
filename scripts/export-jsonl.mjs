import { promises as fs } from 'node:fs'
import { listObjects, loadObject } from '../lib/store.js'

await fs.mkdir('artifacts', { recursive: true })
const objects = []
for (const entry of await listObjects()) objects.push(await loadObject(entry.id))
await fs.writeFile('artifacts/mko.jsonl', objects.map(x => JSON.stringify(x)).join('\n') + '\n', 'utf8')
console.log(`Exported ${objects.length} object(s) to artifacts/mko.jsonl`)
