import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from './store.js'

export const ARCHITECTURE_DIR = path.join(DATA_DIR, 'architecture')
export const DIFFICULTY_DIMENSIONS = [
  'prerequisite_depth',
  'prerequisite_breadth',
  'abstraction_level',
  'conceptual_discontinuity',
  'notation_density',
  'proof_burden',
  'computational_burden',
  'search_construction_burden',
  'representation_switching',
  'exception_boundary_density',
  'intuition_accessibility',
  'formalization_burden',
]

const LEVEL_MEANINGS = {
  0: 'not_applicable',
  1: 'direct',
  2: 'basic',
  3: 'moderate',
  4: 'high',
  5: 'specialized',
}

async function loadJson(name) {
  return JSON.parse(await fs.readFile(path.join(ARCHITECTURE_DIR, name), 'utf8'))
}

export async function loadArchitectureRegistries() {
  const [domains, methods, learningPaths, curricula, seeds] = await Promise.all([
    loadJson('domains.json'),
    loadJson('methods.json'),
    loadJson('learning-paths.json'),
    loadJson('curricula.json'),
    loadJson('profile-seeds.json'),
  ])
  return {
    domains: domains.domains,
    methods: methods.methods,
    learningPaths: learningPaths.paths,
    curricula,
    seeds: seeds.profiles,
    dimensionOrder: seeds.dimension_order,
  }
}

export function expandArchitectureProfile(seed, dimensionOrder = DIFFICULTY_DIMENSIONS) {
  if (!Array.isArray(seed.difficulty?.levels) || seed.difficulty.levels.length !== dimensionOrder.length) {
    throw new Error(`${seed.object_id}: difficulty level count must equal ${dimensionOrder.length}`)
  }

  const dimensions = Object.fromEntries(dimensionOrder.map((id, index) => {
    const level = seed.difficulty.levels[index]
    return [id, {
      level,
      meaning: LEVEL_MEANINGS[level] ?? 'unknown',
      rationale_zh: `此維度在 v0.9 樣本評估中為 ${level} 級，依現有依賴、表示與證據結構判定。`,
    }]
  }))

  const assertions = seed.classification_assertions.map(([axis, termId, role, weight, rationaleZh]) => ({
    axis,
    term_id: termId,
    role,
    weight,
    rationale_zh: rationaleZh,
    source: {
      method: 'expert_assessment',
      reviewed: true,
      reviewer: 'Neo.K / Aletheia',
      confidence: 0.85,
    },
  }))

  return {
    schema_version: 'ocme-architecture-profile-v0.1',
    object_id: seed.object_id,
    classification: {
      schema_version: 'ocme-classification-v0.1',
      object_id: seed.object_id,
      assertions,
      external_classifications: [],
    },
    difficulty: {
      schema_version: 'ocme-difficulty-v0.1',
      object_id: seed.object_id,
      profiles: [{
        audience: seed.difficulty.audience,
        task: seed.difficulty.task,
        dimensions,
        source: {
          method: 'expert_assessment',
          reviewed: true,
          reviewer: 'Neo.K / Aletheia',
          version: 1,
        },
      }],
    },
    learning: {
      path_ids: seed.path_ids,
      order_roles: seed.order_roles,
    },
    methodology: {
      method_ids: seed.method_ids,
    },
    curriculum_alignment_ids: seed.curriculum_alignment_ids,
    review: {
      status: 'reviewed',
      reviewer: 'Neo.K / Aletheia',
      version: 1,
      rationale_zh: '此設定用於 v0.9 架構樣本，分離分類、難度、路徑與方法論。',
    },
  }
}

export async function listArchitectureProfiles() {
  const registries = await loadArchitectureRegistries()
  return registries.seeds.map(seed => expandArchitectureProfile(seed, registries.dimensionOrder))
}

export async function loadArchitectureProfile(objectId) {
  const profiles = await listArchitectureProfiles()
  const profile = profiles.find(item => item.object_id === objectId)
  if (!profile) throw new Error(`unknown architecture profile: ${objectId}`)
  return profile
}

export async function browseDomain(domainId) {
  const registries = await loadArchitectureRegistries()
  const domain = registries.domains.find(item => item.id === domainId)
  if (!domain) throw new Error(`unknown domain: ${domainId}`)
  const profiles = await listArchitectureProfiles()
  return {
    domain,
    objects: profiles.filter(profile => profile.classification.assertions.some(assertion =>
      assertion.axis === 'domain' && assertion.term_id === domainId
    )).map(profile => ({
      object_id: profile.object_id,
      assertions: profile.classification.assertions.filter(assertion =>
        assertion.axis === 'domain' && assertion.term_id === domainId
      ),
    })),
  }
}

export async function getMethod(methodId) {
  const registries = await loadArchitectureRegistries()
  const method = registries.methods.find(item => item.id === methodId)
  if (!method) throw new Error(`unknown method: ${methodId}`)
  const profiles = await listArchitectureProfiles()
  return {
    method,
    object_ids: profiles.filter(profile => profile.methodology.method_ids.includes(methodId)).map(profile => profile.object_id),
  }
}

export async function getLearningPathsForObject(objectId) {
  const registries = await loadArchitectureRegistries()
  return registries.learningPaths.filter(pathObject =>
    pathObject.nodes.some(node => node.object_id === objectId)
  )
}

export async function getArchitectureSummary() {
  const registries = await loadArchitectureRegistries()
  const profiles = await listArchitectureProfiles()
  return {
    schema_version: 'ocme-architecture-summary-v0.1',
    domain_count: registries.domains.length,
    method_count: registries.methods.length,
    learning_path_count: registries.learningPaths.length,
    curriculum_framework_count: registries.curricula.frameworks.length,
    curriculum_alignment_count: registries.curricula.alignments.length,
    profile_count: profiles.length,
    difficulty_dimensions: DIFFICULTY_DIMENSIONS,
  }
}
