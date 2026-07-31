import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT, loadAllObjects } from './store.js'
import {
  DIFFICULTY_DIMENSIONS,
  listArchitectureProfiles,
  loadArchitectureRegistries,
} from './architecture-store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

async function loadSchema(name) {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', name), 'utf8'))
}

function duplicates(values) {
  const seen = new Set()
  const repeated = new Set()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

function cyclePath(nodes, edges) {
  const adjacency = new Map(nodes.map(node => [node, []]))
  for (const edge of edges) adjacency.get(edge.from)?.push(edge.to)
  const visiting = new Set()
  const visited = new Set()
  const stack = []

  function walk(node) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node)
      return [...stack.slice(start), node]
    }
    if (visited.has(node)) return null
    visiting.add(node)
    stack.push(node)
    for (const next of adjacency.get(node) || []) {
      const cycle = walk(next)
      if (cycle) return cycle
    }
    stack.pop()
    visiting.delete(node)
    visited.add(node)
    return null
  }

  for (const node of nodes) {
    const cycle = walk(node)
    if (cycle) return cycle
  }
  return null
}

export async function loadArchitectureBundle() {
  const [objects, registries, profiles] = await Promise.all([
    loadAllObjects(),
    loadArchitectureRegistries(),
    listArchitectureProfiles(),
  ])
  return { objects, ...registries, profiles }
}

export async function validateArchitectureBundle(bundle) {
  const errors = []
  const [classificationSchema, difficultySchema, architectureSchema, learningPathSchema, methodologySchema, curriculumSchema] = await Promise.all([
    loadSchema('classification.schema.json'),
    loadSchema('difficulty-profile.schema.json'),
    loadSchema('architecture-profile.schema.json'),
    loadSchema('learning-path.schema.json'),
    loadSchema('methodology.schema.json'),
    loadSchema('curriculum-alignment.schema.json'),
  ])

  const validateProfile = createMkoValidator(architectureSchema, [classificationSchema, difficultySchema])
  const validatePath = createMkoValidator(learningPathSchema)
  const validateMethod = createMkoValidator(methodologySchema)
  const validateCurricula = createMkoValidator(curriculumSchema)

  const objectIds = new Set(bundle.objects.map(object => object.id))
  const domainIds = new Set(bundle.domains.map(domain => domain.id))
  const methodIds = new Set(bundle.methods.map(method => method.id))
  const pathIds = new Set(bundle.learningPaths.map(pathObject => pathObject.id))
  const frameworkIds = new Set(bundle.curricula.frameworks.map(framework => framework.id))
  const alignmentIds = new Set(bundle.curricula.alignments.map(item => `${item.framework_id}:${item.item_id}`))

  for (const id of duplicates(bundle.objects.map(object => object.id))) errors.push(`duplicate MKO ID: ${id}`)
  for (const id of duplicates(bundle.domains.map(domain => domain.id))) errors.push(`duplicate domain ID: ${id}`)
  for (const id of duplicates(bundle.methods.map(method => method.id))) errors.push(`duplicate method ID: ${id}`)
  for (const id of duplicates(bundle.learningPaths.map(pathObject => pathObject.id))) errors.push(`duplicate learning path ID: ${id}`)
  for (const id of duplicates(bundle.profiles.map(profile => profile.object_id))) errors.push(`duplicate architecture profile: ${id}`)

  if (bundle.domains.length < 20) errors.push(`expected at least 20 domains, found ${bundle.domains.length}`)
  for (const domain of bundle.domains) {
    if (!domain.id || !domain.title_zh || !domain.description_zh) errors.push(`invalid domain record: ${JSON.stringify(domain)}`)
    if (domain.parent_id && !domainIds.has(domain.parent_id)) errors.push(`${domain.id}: missing parent domain ${domain.parent_id}`)
  }

  for (const method of bundle.methods) {
    if (!validateMethod(method)) errors.push(...formatSchemaErrors(method.id, validateMethod.errors))
    for (const relatedId of method.related_methods || []) {
      if (!methodIds.has(relatedId)) errors.push(`${method.id}: unknown related method ${relatedId}`)
      if (relatedId === method.id) errors.push(`${method.id}: method cannot relate to itself`)
    }
  }

  for (const pathObject of bundle.learningPaths) {
    if (!validatePath(pathObject)) errors.push(...formatSchemaErrors(pathObject.id, validatePath.errors))
    const nodeIds = new Set(pathObject.nodes.map(node => node.object_id))
    for (const node of pathObject.nodes) {
      if (!objectIds.has(node.object_id)) errors.push(`${pathObject.id}: unknown MKO node ${node.object_id}`)
    }
    for (const edge of pathObject.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push(`${pathObject.id}: edge endpoints must both be path nodes (${edge.from} -> ${edge.to})`)
      if (edge.from === edge.to) errors.push(`${pathObject.id}: self edge ${edge.from}`)
    }
    const cycle = cyclePath([...nodeIds], pathObject.edges)
    if (cycle) errors.push(`${pathObject.id}: learning cycle ${cycle.join(' -> ')}`)
  }

  if (!validateCurricula(bundle.curricula)) errors.push(...formatSchemaErrors('curricula', validateCurricula.errors))
  for (const alignment of bundle.curricula.alignments) {
    if (!objectIds.has(alignment.object_id)) errors.push(`curriculum alignment references unknown MKO ${alignment.object_id}`)
    if (!frameworkIds.has(alignment.framework_id)) errors.push(`curriculum alignment references unknown framework ${alignment.framework_id}`)
  }

  const profileIds = new Set(bundle.profiles.map(profile => profile.object_id))
  for (const objectId of objectIds) if (!profileIds.has(objectId)) errors.push(`missing architecture profile for ${objectId}`)
  for (const profileId of profileIds) if (!objectIds.has(profileId)) errors.push(`architecture profile references unknown MKO ${profileId}`)

  for (const profile of bundle.profiles) {
    if (!validateProfile(profile)) errors.push(...formatSchemaErrors(profile.object_id, validateProfile.errors))
    if (profile.classification.object_id !== profile.object_id) errors.push(`${profile.object_id}: classification object_id mismatch`)
    if (profile.difficulty.object_id !== profile.object_id) errors.push(`${profile.object_id}: difficulty object_id mismatch`)

    const primaryDomains = profile.classification.assertions.filter(assertion => assertion.axis === 'domain' && assertion.role === 'primary')
    if (!primaryDomains.length) errors.push(`${profile.object_id}: at least one primary domain is required`)

    for (const assertion of profile.classification.assertions) {
      if (assertion.axis === 'domain' && !domainIds.has(assertion.term_id)) errors.push(`${profile.object_id}: unknown domain ${assertion.term_id}`)
      if (assertion.axis === 'method' && !methodIds.has(assertion.term_id)) errors.push(`${profile.object_id}: unknown classification method ${assertion.term_id}`)
    }
    for (const methodId of profile.methodology.method_ids) {
      if (!methodIds.has(methodId)) errors.push(`${profile.object_id}: unknown methodology method ${methodId}`)
    }
    for (const pathId of profile.learning.path_ids) {
      if (!pathIds.has(pathId)) {
        errors.push(`${profile.object_id}: unknown learning path ${pathId}`)
        continue
      }
      const pathObject = bundle.learningPaths.find(item => item.id === pathId)
      if (!pathObject.nodes.some(node => node.object_id === profile.object_id)) errors.push(`${profile.object_id}: referenced path ${pathId} does not contain object`)
    }
    for (const alignmentId of profile.curriculum_alignment_ids) {
      if (!alignmentIds.has(alignmentId)) errors.push(`${profile.object_id}: unknown curriculum alignment ${alignmentId}`)
    }

    for (const difficultyProfile of profile.difficulty.profiles) {
      const actual = Object.keys(difficultyProfile.dimensions)
      if (actual.length !== DIFFICULTY_DIMENSIONS.length || DIFFICULTY_DIMENSIONS.some(id => !actual.includes(id))) {
        errors.push(`${profile.object_id}: difficulty dimensions do not match v0.1 registry`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      object_count: bundle.objects.length,
      profile_count: bundle.profiles.length,
      domain_count: bundle.domains.length,
      method_count: bundle.methods.length,
      learning_path_count: bundle.learningPaths.length,
      curriculum_framework_count: bundle.curricula.frameworks.length,
      curriculum_alignment_count: bundle.curricula.alignments.length,
      difficulty_dimension_count: DIFFICULTY_DIMENSIONS.length,
    },
  }
}

export async function validateCurrentArchitecture() {
  return validateArchitectureBundle(await loadArchitectureBundle())
}
