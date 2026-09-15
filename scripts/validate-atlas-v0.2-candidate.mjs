import { execFileSync } from 'node:child_process'
import { loadArchitectureRegistries } from '../lib/architecture-store.js'
import { loadCoreAtlas } from '../lib/atlas-store.js'
import { loadAllObjects } from '../lib/store.js'
import { migrateV01AtlasToV02Candidate } from '../lib/atlas-v0.2-candidate-migration.js'
import { validateCoreAtlasV02Candidate } from '../lib/atlas-v0.2-candidate-validation.js'

const [atlas, objects, registries] = await Promise.all([
  loadCoreAtlas(),
  loadAllObjects(),
  loadArchitectureRegistries(),
])
const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const candidate = migrateV01AtlasToV02Candidate(atlas, objects, { baselineCommit })
const result = await validateCoreAtlasV02Candidate(candidate, {
  objects,
  domains: registries.domains,
  methods: registries.methods,
})

if (!result.ok) {
  console.error(result.errors.join('\n'))
  process.exit(1)
}

console.log(
  `Atlas v0.2 candidate contract passed: ${result.summary.entry_count} baseline entries, ` +
  `${result.summary.group_count} groups, ${result.summary.hard_prerequisite_edge_count} hard edges, ` +
  `${result.summary.canonical_dependency_mismatch_count} explicit legacy alignment exception(s).`,
)
console.log('Candidate-only boundary: the public Atlas schema/version and 80-node set remain v0.10; no Phase B node is authorized.')
