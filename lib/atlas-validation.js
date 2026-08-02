import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT, loadAllObjects } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'
import { loadArchitectureRegistries } from './architecture-store.js'
import { loadCoreAtlas } from './atlas-store.js'

function duplicates(values) {
  const seen = new Set()
  const repeated = new Set()
  for (const value of values) {
    if (seen.has(value)) repeated.add(value)
    seen.add(value)
  }
  return [...repeated]
}

function cyclePath(entries) {
  const byId = new Map(entries.map(entry => [entry.id, entry]))
  const visiting = new Set()
  const visited = new Set()
  const stack = []
  function walk(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id)
      return [...stack.slice(start), id]
    }
    if (visited.has(id)) return null
    visiting.add(id); stack.push(id)
    for (const dep of byId.get(id)?.prerequisites || []) {
      const found = walk(dep)
      if (found) return found
    }
    stack.pop(); visiting.delete(id); visited.add(id)
    return null
  }
  for (const entry of entries) {
    const found = walk(entry.id)
    if (found) return found
  }
  return null
}

export async function validateCoreAtlas(atlasOverride = null) {
  const atlas = atlasOverride || await loadCoreAtlas()
  const [schema, registries, objects] = await Promise.all([
    fs.readFile(path.join(ROOT, 'schemas', 'core-atlas.schema.json'), 'utf8').then(JSON.parse),
    loadArchitectureRegistries(),
    loadAllObjects(),
  ])
  const errors = []
  const validate = createMkoValidator(schema)
  if (!validate(atlas)) errors.push(...formatSchemaErrors('core-atlas', validate.errors))

  const entries = atlas.entries || []
  const entryIds = new Set(entries.map(entry => entry.id))
  const domainIds = new Set(registries.domains.map(item => item.id))
  const methodIds = new Set(registries.methods.map(item => item.id))
  const mkoIds = new Set(objects.map(item => item.id))

  for (const duplicate of duplicates(entries.map(entry => entry.id))) errors.push(`duplicate atlas id: ${duplicate}`)
  for (const duplicate of duplicates(entries.map(entry => entry.target_mko_id))) errors.push(`duplicate target_mko_id: ${duplicate}`)

  const groupCounts = new Map((atlas.groups || []).map(group => [group.id, 0]))
  for (const entry of entries) {
    groupCounts.set(entry.group, (groupCounts.get(entry.group) || 0) + 1)
    if (!domainIds.has(entry.primary_domain)) errors.push(`${entry.id}: unknown primary_domain ${entry.primary_domain}`)
    for (const methodId of entry.methods || []) if (!methodIds.has(methodId)) errors.push(`${entry.id}: unknown method ${methodId}`)
    for (const depId of entry.prerequisites || []) {
      if (!entryIds.has(depId)) errors.push(`${entry.id}: unresolved prerequisite ${depId}`)
      if (depId === entry.id) errors.push(`${entry.id}: self prerequisite`)
    }
    if (entry.maturity === 'canonical_mko') {
      if (!entry.canonical_mko_id) errors.push(`${entry.id}: canonical_mko maturity requires canonical_mko_id`)
      if (entry.materialization_priority !== 'canonical') errors.push(`${entry.id}: canonical_mko maturity requires canonical priority`)
      if (!mkoIds.has(entry.canonical_mko_id)) errors.push(`${entry.id}: canonical MKO does not exist: ${entry.canonical_mko_id}`)
      if (entry.target_mko_id !== entry.canonical_mko_id) errors.push(`${entry.id}: canonical target must equal canonical_mko_id`)
    } else {
      if (entry.canonical_mko_id) errors.push(`${entry.id}: atlas_seed must not declare canonical_mko_id`)
      if (!['P1', 'P2', 'P3'].includes(entry.materialization_priority)) errors.push(`${entry.id}: atlas_seed requires P1/P2/P3 priority`)
      if (mkoIds.has(entry.target_mko_id)) errors.push(`${entry.id}: target MKO already exists but maturity is atlas_seed`)
    }
  }

  for (const group of atlas.groups || []) {
    if (groupCounts.get(group.id) !== group.expected_count) {
      errors.push(`${group.id}: expected ${group.expected_count} entries but found ${groupCounts.get(group.id) || 0}`)
    }
  }

  const cycle = cyclePath(entries)
  if (cycle) errors.push(`atlas prerequisite cycle: ${cycle.join(' -> ')}`)

  const expectedCanonical = new Map([
    ['atlas-set-membership', 'mko-set-membership'],
    ['atlas-function-mapping', 'mko-function-mapping'],
    ['atlas-tends-to-relation', 'mko-tends-to-relation'],
    ['atlas-euclidean-length', 'mko-euclidean-length'],
    ['atlas-right-triangle', 'mko-right-triangle'],
    ['atlas-pythagorean-theorem', 'mko-euclid-pythagorean-theorem'],
  ])
  const canonicalEntries = entries.filter(entry => entry.maturity === 'canonical_mko')
  if (canonicalEntries.length !== expectedCanonical.size) errors.push(`expected 6 canonical atlas entries, found ${canonicalEntries.length}`)
  for (const [atlasId, mkoId] of expectedCanonical) {
    const entry = entries.find(item => item.id === atlasId)
    if (!entry || entry.canonical_mko_id !== mkoId) errors.push(`${atlasId}: canonical mapping must be ${mkoId}`)
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      entry_count: entries.length,
      canonical_mko_count: canonicalEntries.length,
      atlas_seed_count: entries.filter(entry => entry.maturity === 'atlas_seed').length,
      prerequisite_edge_count: entries.reduce((sum, entry) => sum + entry.prerequisites.length, 0),
      group_counts: Object.fromEntries(groupCounts),
    },
  }
}
