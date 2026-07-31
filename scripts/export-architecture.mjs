import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../lib/store.js'
import {
  getArchitectureSummary,
  listArchitectureProfiles,
  loadArchitectureRegistries,
} from '../lib/architecture-store.js'

const [registries, profiles, summary] = await Promise.all([
  loadArchitectureRegistries(),
  listArchitectureProfiles(),
  getArchitectureSummary(),
])

const outDir = path.join(ROOT, 'artifacts')
await fs.mkdir(outDir, { recursive: true })
await Promise.all([
  fs.writeFile(
    path.join(outDir, 'architecture-profiles.jsonl'),
    profiles.map(profile => JSON.stringify(profile)).join('\n') + '\n',
    'utf8',
  ),
  fs.writeFile(
    path.join(outDir, 'architecture-summary.json'),
    JSON.stringify(summary, null, 2) + '\n',
    'utf8',
  ),
  fs.writeFile(
    path.join(outDir, 'learning-paths.json'),
    JSON.stringify({ schema_version: 'ocme-learning-path-export-v0.1', paths: registries.learningPaths }, null, 2) + '\n',
    'utf8',
  ),
])

console.log(`Exported ${profiles.length} architecture profiles, ${registries.learningPaths.length} learning paths and summary artifacts.`)
