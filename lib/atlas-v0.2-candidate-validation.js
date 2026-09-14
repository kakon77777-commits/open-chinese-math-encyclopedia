import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'

function duplicates(values) {
  const seen = new Set()
  const repeated = new Set()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

function sameSet(left, right) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every(value => rightSet.has(value))
}

function cyclePath(ids, edges) {
  const outgoing = new Map(ids.map(id => [id, []]))
  for (const [from, to] of edges) outgoing.get(from)?.push(to)
  const visiting = new Set()
  const visited = new Set()
  const stack = []

  function walk(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id)
      return [...stack.slice(start), id]
    }
    if (visited.has(id)) return null
    visiting.add(id)
    stack.push(id)
    for (const target of outgoing.get(id) || []) {
      const found = walk(target)
      if (found) return found
    }
    stack.pop()
    visiting.delete(id)
    visited.add(id)
    return null
  }

  for (const id of ids) {
    const found = walk(id)
    if (found) return found
  }
  return null
}

export function canonicalDependencyMismatches(atlas, objects) {
  const entryById = new Map((atlas.entries || []).map(entry => [entry.id, entry]))
  const objectById = new Map(objects.map(object => [object.id, object]))
  const mismatches = []

  for (const entry of (atlas.entries || []).filter(item => item.maturity === 'canonical_mko')) {
    const object = objectById.get(entry.canonical_mko_id)
    if (!object) continue
    const hardTargetMkoIds = (entry.prerequisites || [])
      .map(id => entryById.get(id)?.target_mko_id)
      .filter(Boolean)
      .sort()
    const actualMkoDependencyIds = (object.dependencies || []).map(dependency => dependency.id).sort()
    if (!sameSet(hardTargetMkoIds, actualMkoDependencyIds)) {
      mismatches.push({
        atlas_id: entry.id,
        hard_target_mko_ids: hardTargetMkoIds,
        actual_mko_dependency_ids: actualMkoDependencyIds,
      })
    }
  }
  return mismatches.sort((left, right) => left.atlas_id.localeCompare(right.atlas_id, 'en'))
}

export async function loadCoreAtlasV02CandidateSchema() {
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'core-atlas-v0.2-candidate.schema.json'), 'utf8'))
}

export async function validateCoreAtlasV02Candidate(atlas, {
  objects = null,
  domains = [],
  methods = [],
  schema = null,
} = {}) {
  const errors = []
  const candidateSchema = schema ?? await loadCoreAtlasV02CandidateSchema()
  const validateSchema = createMkoValidator(candidateSchema)
  if (!validateSchema(atlas)) errors.push(...formatSchemaErrors('core-atlas-v0.2-candidate', validateSchema.errors))

  const entries = atlas.entries || []
  const groups = atlas.groups || []
  const observedObjects = Array.isArray(objects) ? objects : []
  if (!Array.isArray(objects)) errors.push('core-atlas-v0.2-candidate validation requires a complete MKO catalogue')
  const entryIds = new Set(entries.map(entry => entry.id))
  const groupIds = new Set(groups.map(group => group.id))
  const domainIds = new Set(domains.map(domain => domain.id))
  const methodIds = new Set(methods.map(method => method.id))
  const objectIds = new Set(observedObjects.map(object => object.id))
  const canonicalEntries = entries.filter(entry => entry.maturity === 'canonical_mko')
  const missingCanonicalObjectIds = canonicalEntries
    .map(entry => entry.canonical_mko_id)
    .filter(id => typeof id === 'string' && !objectIds.has(id))

  for (const id of duplicates(groups.map(group => group.id))) errors.push(`duplicate Atlas group ID: ${id}`)
  for (const id of duplicates(entries.map(entry => entry.id))) errors.push(`duplicate Atlas entry ID: ${id}`)
  for (const id of duplicates(entries.map(entry => entry.target_mko_id))) errors.push(`duplicate target MKO ID: ${id}`)

  const groupCounts = new Map(groups.map(group => [group.id, 0]))
  const hardEdges = []
  const hierarchyEdges = []

  for (const entry of entries) {
    groupCounts.set(entry.group, (groupCounts.get(entry.group) || 0) + 1)
    if (!groupIds.has(entry.group)) errors.push(`${entry.id}: unknown group ${entry.group}`)
    if (domainIds.size && !domainIds.has(entry.primary_domain)) errors.push(`${entry.id}: unknown primary domain ${entry.primary_domain}`)
    for (const methodId of entry.methods || []) {
      if (methodIds.size && !methodIds.has(methodId)) errors.push(`${entry.id}: unknown method ${methodId}`)
    }
    for (const prerequisiteId of entry.prerequisites || []) {
      hardEdges.push([entry.id, prerequisiteId])
      if (!entryIds.has(prerequisiteId)) errors.push(`${entry.id}: unknown hard prerequisite ${prerequisiteId}`)
      if (prerequisiteId === entry.id) errors.push(`${entry.id}: self hard prerequisite`)
    }

    const relationKeys = new Set()
    for (const relation of entry.relationships || []) {
      const key = `${relation.relation}:${relation.target_atlas_id}`
      if (relationKeys.has(key)) errors.push(`${entry.id}: duplicate supporting relation ${key}`)
      relationKeys.add(key)
      if (!entryIds.has(relation.target_atlas_id)) errors.push(`${entry.id}: unknown supporting relation target ${relation.target_atlas_id}`)
      if (relation.target_atlas_id === entry.id) errors.push(`${entry.id}: self supporting relation ${key}`)
      if (relation.relation === 'specialization_of') hierarchyEdges.push([entry.id, relation.target_atlas_id])
      if (relation.relation === 'generalization_of') hierarchyEdges.push([relation.target_atlas_id, entry.id])
    }

    if (entry.maturity === 'canonical_mko') {
      if (!entry.canonical_mko_id) errors.push(`${entry.id}: canonical entry is missing canonical_mko_id`)
      if (entry.target_mko_id !== entry.canonical_mko_id) errors.push(`${entry.id}: canonical target must equal canonical_mko_id`)
      if (!objectIds.has(entry.canonical_mko_id)) errors.push(`${entry.id}: canonical MKO was not observed in the supplied catalogue ${entry.canonical_mko_id}`)
    } else {
      if (entry.canonical_mko_id) errors.push(`${entry.id}: seed must not declare canonical_mko_id`)
      if (objectIds.has(entry.target_mko_id)) errors.push(`${entry.id}: seed target already exists ${entry.target_mko_id}`)
    }
  }

  for (const group of groups) {
    if (groupCounts.get(group.id) !== group.expected_count) {
      errors.push(`${group.id}: expected ${group.expected_count} entries but found ${groupCounts.get(group.id) || 0}`)
    }
  }

  const hardCycle = cyclePath([...entryIds], hardEdges)
  if (hardCycle) errors.push(`hard prerequisite cycle: ${hardCycle.join(' -> ')}`)
  const hierarchyCycle = cyclePath([...entryIds], hierarchyEdges)
  if (hierarchyCycle) errors.push(`specialization/generalization cycle: ${hierarchyCycle.join(' -> ')}`)

  const alignmentMeasured = Array.isArray(objects) && missingCanonicalObjectIds.length === 0
  const mismatches = canonicalDependencyMismatches(atlas, observedObjects)
  const alignment = atlas.migration?.canonical_dependency_alignment
  const exceptions = alignment?.exceptions || []
  const mismatchById = new Map(mismatches.map(mismatch => [mismatch.atlas_id, mismatch]))
  const exceptionById = new Map(exceptions.map(exception => [exception.atlas_id, exception]))
  for (const id of duplicates(exceptions.map(exception => exception.atlas_id))) errors.push(`duplicate canonical alignment exception: ${id}`)

  if (alignment?.status === 'complete') {
    if (!alignmentMeasured) errors.push('canonical dependency alignment cannot be complete without the full Canonical MKO catalogue')
    if (mismatches.length) errors.push(`canonical dependency alignment marked complete with ${mismatches.length} mismatch(es)`)
    if (exceptions.length) errors.push('canonical dependency alignment marked complete with exceptions')
  } else if (alignment?.status === 'legacy_unresolved') {
    if (!sameSet([...mismatchById.keys()], [...exceptionById.keys()])) {
      errors.push('legacy alignment exceptions must exactly cover observed canonical dependency mismatches')
    }
    for (const [id, mismatch] of mismatchById) {
      const exception = exceptionById.get(id)
      if (!exception) continue
      if (!sameSet(exception.hard_target_mko_ids, mismatch.hard_target_mko_ids)) errors.push(`${id}: exception hard targets do not match observed Atlas targets`)
      if (!sameSet(exception.actual_mko_dependency_ids, mismatch.actual_mko_dependency_ids)) errors.push(`${id}: exception MKO dependencies do not match observed object dependencies`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      entry_count: entries.length,
      group_count: groups.length,
      hard_prerequisite_edge_count: hardEdges.length,
      supporting_relation_count: entries.reduce((sum, entry) => sum + (entry.relationships || []).length, 0),
      canonical_dependency_alignment_measurement: alignmentMeasured ? 'measured' : 'not_measured_missing_catalogue',
      canonical_dependency_mismatch_count: mismatches.length,
    },
  }
}
