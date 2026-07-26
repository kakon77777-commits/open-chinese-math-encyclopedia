import { promises as fs } from 'node:fs'
import { listObjects, loadAllObjects } from '../lib/store.js'

const required = [
  'schema_version', 'id', 'semantic_family_id', 'type', 'version', 'titles',
  'statement', 'formula', 'assumptions', 'symbols', 'computational_companions',
  'verification', 'formalization', 'provenance'
]
const errors = []
const entries = await listObjects()
const objects = await loadAllObjects()
const entryIds = entries.map(entry => entry.id)
const objectIds = objects.map(object => object.id)
const knownIds = new Set(objectIds)

for (const id of new Set(entryIds)) {
  if (entryIds.filter(value => value === id).length > 1) errors.push(`index: duplicate id ${id}`)
}
for (const id of new Set(objectIds)) {
  if (objectIds.filter(value => value === id).length > 1) errors.push(`objects: duplicate id ${id}`)
}

for (let index = 0; index < objects.length; index += 1) {
  const object = objects[index]
  const entry = entries[index]
  if (entry?.id !== object.id) errors.push(`index/object mismatch: ${entry?.id} != ${object.id}`)
  for (const key of required) if (!(key in object)) errors.push(`${object.id}: missing ${key}`)
  if (object.formula?.tex == null) errors.push(`${object.id}: formula.tex missing`)
  if (object.formula?.mathml == null) errors.push(`${object.id}: formula.mathml missing`)
  if (object.formula?.semantic_ast == null) errors.push(`${object.id}: semantic AST missing`)
  for (const companion of object.computational_companions || []) {
    if (!companion.non_identity) errors.push(`${object.id}/${companion.id}: non-identity declaration missing`)
  }
  for (const dependency of object.dependencies || []) {
    if (dependency.id === object.id) errors.push(`${object.id}: self dependency`)
    if (!knownIds.has(dependency.id)) errors.push(`${object.id}: unresolved dependency ${dependency.id}`)
  }
}

const byId = new Map(objects.map(object => [object.id, object]))
const visiting = new Set()
const visited = new Set()
const cycles = []
function visit(id, path = []) {
  if (visiting.has(id)) {
    cycles.push([...path, id])
    return
  }
  if (visited.has(id)) return
  visiting.add(id)
  const object = byId.get(id)
  for (const dependency of object?.dependencies || []) visit(dependency.id, [...path, id])
  visiting.delete(id)
  visited.add(id)
}
for (const id of objectIds) visit(id)
for (const cycle of cycles) errors.push(`dependency cycle: ${cycle.join(' -> ')}`)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const dependencyEdges = objects.reduce((sum, object) => sum + (object.dependencies || []).length, 0)
const result = {
  ok: true,
  schema_version: 'ocme-validation-v0.2',
  object_count: objects.length,
  dependency_edges: dependencyEdges,
  unresolved_dependencies: 0,
  dependency_cycles: 0,
}
await fs.mkdir('artifacts', { recursive: true })
await fs.writeFile('artifacts/validation.json', JSON.stringify(result, null, 2))
console.log(`MKO validation passed: ${objects.length} objects, ${dependencyEdges} dependency edge(s).`)
