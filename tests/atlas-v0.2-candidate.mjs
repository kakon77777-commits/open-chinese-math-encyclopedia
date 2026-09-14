import assert from 'node:assert/strict'
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
const options = { objects, domains: registries.domains, methods: registries.methods }

const migrated = await validateCoreAtlasV02Candidate(candidate, options)
assert.equal(migrated.ok, true, migrated.errors.join('\n'))
assert.equal(migrated.summary.entry_count, 80)
assert.equal(migrated.summary.group_count, 8)
assert.equal(migrated.summary.canonical_dependency_mismatch_count, 6)
assert.equal(candidate.migration.canonical_dependency_alignment.status, 'legacy_unresolved')
assert.equal(candidate.migration.canonical_dependency_alignment.exceptions.length, 6)
assert.equal(atlas.schema_version, 'ocme-core-atlas-v0.1')
assert.equal(atlas.entries.length, 80)
assert.equal(atlas.entries.some(entry => Object.hasOwn(entry, 'relationships')), false)

function foundationNode(id, targetMkoId, prerequisites = [], relationships = []) {
  return {
    id,
    title_zh: '候選測試節點',
    group: 'topology_foundations',
    primary_domain: 'topology',
    object_kind: 'definition',
    summary_zh: '只用於驗證新版 Atlas Schema 可安全容納新增群組與節點。',
    prerequisites,
    relationships,
    methods: ['method-direct-proof'],
    curriculum_band: 'undergraduate_core',
    difficulty: {
      prerequisite_depth: 3,
      prerequisite_breadth: 2,
      abstraction_level: 4,
      conceptual_discontinuity: 4,
      notation_density: 3,
      proof_burden: 3,
      computational_burden: 1,
      search_construction_burden: 2,
      representation_switching: 3,
      exception_boundary_density: 3,
      intuition_accessibility: 3,
      formalization_burden: 4
    },
    maturity: 'atlas_seed',
    target_mko_id: targetMkoId,
    materialization_priority: 'P2'
  }
}

const relationSource = { method: 'ai_candidate', reviewed: false, confidence: 0.5 }
const expanded = structuredClone(candidate)
expanded.groups.push({ id: 'topology_foundations', title_zh: '拓撲基礎', expected_count: 1 })
expanded.entries.push(foundationNode(
  'atlas-schema-positive-witness',
  'mko-schema-positive-witness',
  ['atlas-set'],
  [{
    target_atlas_id: 'atlas-tends-to-relation',
    relation: 'semantic_support',
    rationale_zh: '此關聯只作語義背景，不得阻塞 materialization。',
    source: relationSource,
  }],
))
const expandedResult = await validateCoreAtlasV02Candidate(expanded, options)
assert.equal(expandedResult.ok, true, expandedResult.errors.join('\n'))
assert.equal(expandedResult.summary.entry_count, 81)
assert.equal(expandedResult.summary.group_count, 9)
assert.equal(expandedResult.summary.supporting_relation_count, 1)

const unknownRelation = structuredClone(expanded)
unknownRelation.entries.at(-1).relationships[0].target_atlas_id = 'atlas-does-not-exist'
assert.match((await validateCoreAtlasV02Candidate(unknownRelation, options)).errors.join('\n'), /unknown supporting relation target/)

const hardCycle = structuredClone(expanded)
hardCycle.groups.at(-1).expected_count = 2
hardCycle.entries.at(-1).prerequisites = ['atlas-schema-cycle-witness']
hardCycle.entries.push(foundationNode('atlas-schema-cycle-witness', 'mko-schema-cycle-witness', ['atlas-schema-positive-witness']))
assert.match((await validateCoreAtlasV02Candidate(hardCycle, options)).errors.join('\n'), /hard prerequisite cycle/)

const hierarchyCycle = structuredClone(hardCycle)
hierarchyCycle.entries.at(-2).prerequisites = ['atlas-set']
hierarchyCycle.entries.at(-2).relationships = [{
  target_atlas_id: 'atlas-schema-cycle-witness',
  relation: 'specialization_of',
  rationale_zh: '此測試刻意建立錯誤的專門化循環以驗證拒絕能力。',
  source: relationSource,
}, {
  target_atlas_id: 'atlas-schema-cycle-witness',
  relation: 'generalization_of',
  rationale_zh: '同一節點又宣稱是相同目標的一般化，應和前一條形成循環。',
  source: relationSource,
}]
hierarchyCycle.entries.at(-1).relationships = []
assert.match((await validateCoreAtlasV02Candidate(hierarchyCycle, options)).errors.join('\n'), /specialization\/generalization cycle/)

const missingException = structuredClone(candidate)
missingException.migration.canonical_dependency_alignment.exceptions.pop()
assert.match((await validateCoreAtlasV02Candidate(missingException, options)).errors.join('\n'), /exceptions must exactly cover/)

const falseComplete = structuredClone(candidate)
falseComplete.migration.canonical_dependency_alignment.status = 'complete'
falseComplete.migration.canonical_dependency_alignment.exceptions = []
assert.match((await validateCoreAtlasV02Candidate(falseComplete, options)).errors.join('\n'), /marked complete with 6 mismatch/)

const targetCollision = structuredClone(expanded)
targetCollision.entries.at(-1).target_mko_id = 'mko-set'
assert.match((await validateCoreAtlasV02Candidate(targetCollision, options)).errors.join('\n'), /seed target already exists/)

const groupCountDrift = structuredClone(expanded)
groupCountDrift.groups.at(-1).expected_count = 2
assert.match((await validateCoreAtlasV02Candidate(groupCountDrift, options)).errors.join('\n'), /expected 2 entries but found 1/)

console.log('Atlas v0.2 candidate tests passed: expandable groups, hard/supporting separation, cycles, target collisions, group counts, and six explicit legacy dependency mismatches are discriminated.')
