import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT, listObjects, loadAllObjects } from '../lib/store.js'
import { createMkoValidator, formatSchemaErrors } from '../lib/schema-validation.js'

const errors = []
const entries = await listObjects()
const objects = await loadAllObjects()
const entryIds = entries.map(entry => entry.id)
const objectIds = objects.map(object => object.id)
const knownIds = new Set(objectIds)

const schema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko.schema.json'), 'utf8'))
const validateSchema = createMkoValidator(schema)

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

  if (!validateSchema(object)) errors.push(...formatSchemaErrors(object.id, validateSchema.errors))

  for (const companion of object.computational_companions || []) {
    const companionPath = path.resolve(ROOT, companion.path)
    if (companionPath !== ROOT && !companionPath.startsWith(`${ROOT}${path.sep}`)) {
      errors.push(`${object.id}/${companion.id}: companion path escapes repository`)
    } else {
      const stat = await fs.stat(companionPath).catch(() => null)
      if (!stat?.isFile()) errors.push(`${object.id}/${companion.id}: missing companion file ${companion.path}`)
    }
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
function visit(id, pathIds = []) {
  if (visiting.has(id)) {
    cycles.push([...pathIds, id])
    return
  }
  if (visited.has(id)) return
  visiting.add(id)
  const object = byId.get(id)
  for (const dependency of object?.dependencies || []) visit(dependency.id, [...pathIds, id])
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
  schema_version: 'ocme-validation-v0.3',
  json_schema_draft: '2020-12',
  mko_schema_version: 'mko-v0.2',
  object_count: objects.length,
  dependency_edges: dependencyEdges,
  unresolved_dependencies: 0,
  dependency_cycles: 0,
  missing_companion_files: 0,
}
await fs.mkdir('artifacts', { recursive: true })
await fs.writeFile('artifacts/validation-v0.3.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`MKO validation passed: ${objects.length} objects, ${dependencyEdges} dependency edge(s), Draft 2020-12 schema.`)
