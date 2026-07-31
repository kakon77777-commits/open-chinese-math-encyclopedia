import { promises as fs } from 'node:fs'
import path from 'node:path'
import { listEvidence, loadEvidence } from '../lib/evidence-store.js'
import { ROOT, listObjects, loadAllObjects } from '../lib/store.js'
import { createMkoValidator, formatSchemaErrors } from '../lib/schema-validation.js'

const errors = []
const entries = await listObjects()
const objects = await loadAllObjects()
const evidenceEntries = await listEvidence()
const evidenceObjects = await Promise.all(evidenceEntries.map(entry => loadEvidence(entry.id)))
const entryIds = entries.map(entry => entry.id)
const objectIds = objects.map(object => object.id)
const knownIds = new Set(objectIds)
const evidenceById = new Map(evidenceObjects.map(evidence => [evidence.id, evidence]))

const legacySchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko.schema.json'), 'utf8'))
const schemaV03 = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko-v0.3.schema.json'), 'utf8'))
const schemaV04 = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko-v0.4.schema.json'), 'utf8'))
const validators = new Map([
  ['mko-v0.3', createMkoValidator(schemaV03, [legacySchema])],
  ['mko-v0.4', createMkoValidator(schemaV04, [legacySchema])],
])

function resolveInsideRepository(relativePath, label) {
  const target = path.resolve(ROOT, relativePath)
  if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`)) {
    errors.push(`${label}: path escapes repository: ${relativePath}`)
    return null
  }
  return target
}

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
  const validator = validators.get(object.schema_version)
  if (!validator) {
    errors.push(`${object.id}: unsupported schema_version ${object.schema_version}`)
  } else if (!validator(object)) {
    errors.push(...formatSchemaErrors(object.id, validator.errors))
  }
  if ('evidence' in (object.verification || {})) errors.push(`${object.id}: embedded verification.evidence is forbidden`)
  if ('felra_project' in (object.verification || {})) errors.push(`${object.id}: legacy verification.felra_project is forbidden`)

  for (const companion of object.computational_companions || []) {
    const companionPath = resolveInsideRepository(companion.path, `${object.id}/${companion.id}`)
    if (companionPath) {
      const stat = await fs.stat(companionPath).catch(() => null)
      if (!stat?.isFile()) errors.push(`${object.id}/${companion.id}: missing companion file ${companion.path}`)
    }
  }

  for (const dependency of object.dependencies || []) {
    if (dependency.id === object.id) errors.push(`${object.id}: self dependency`)
    if (!knownIds.has(dependency.id)) errors.push(`${object.id}: unresolved dependency ${dependency.id}`)
  }

  const producers = object.verification?.producers || []
  const producerIds = producers.map(producer => producer.id)
  for (const id of new Set(producerIds)) {
    if (producerIds.filter(value => value === id).length > 1) errors.push(`${object.id}: duplicate producer ${id}`)
  }
  for (const producer of producers) {
    const configPath = resolveInsideRepository(producer.config_path, `${object.id}/${producer.id}`)
    if (configPath) {
      const stat = await fs.stat(configPath).catch(() => null)
      if (!stat?.isFile()) errors.push(`${object.id}/${producer.id}: missing producer config ${producer.config_path}`)
    }
  }

  const refs = object.verification?.evidence_refs || []
  const refIds = refs.map(ref => ref.id)
  for (const id of new Set(refIds)) {
    if (refIds.filter(value => value === id).length > 1) errors.push(`${object.id}: duplicate evidence ref ${id}`)
  }
  for (const ref of refs) {
    const producer = producers.find(candidate => candidate.id === ref.producer_id)
    if (!producer) errors.push(`${object.id}: evidence ref ${ref.id} uses undeclared producer ${ref.producer_id}`)
    const evidence = evidenceById.get(ref.id)
    if (!evidence) {
      errors.push(`${object.id}: unresolved evidence ref ${ref.id}`)
      continue
    }
    if (evidence.subject_id !== object.id) errors.push(`${object.id}: evidence ${ref.id} belongs to ${evidence.subject_id}`)
    if (evidence.evidence_type !== ref.role) errors.push(`${object.id}: evidence ${ref.id} type ${evidence.evidence_type} != ref role ${ref.role}`)
    if (evidence.producer.id !== ref.producer_id) errors.push(`${object.id}: evidence ${ref.id} producer ${evidence.producer.id} != ${ref.producer_id}`)
    if (ref.role === 'formal_proof') {
      if (evidence.claim_scope.quantification !== 'formal_universal') errors.push(`${object.id}: formal proof ${ref.id} is not formal_universal`)
      if (evidence.claim_scope.universal_proof !== true) errors.push(`${object.id}: formal proof ${ref.id} must set universal_proof=true`)
      if (evidence.status !== 'passed') errors.push(`${object.id}: formal proof ${ref.id} is not passed`)
    }
  }
  for (const producer of producers.filter(item => item.status === 'active')) {
    if (!refs.some(ref => ref.producer_id === producer.id)) errors.push(`${object.id}: active producer ${producer.id} has no evidence ref`)
  }
}

for (const evidence of evidenceObjects) {
  const subject = objects.find(object => object.id === evidence.subject_id)
  if (!subject) {
    errors.push(`${evidence.id}: unknown subject ${evidence.subject_id}`)
    continue
  }
  const referenced = (subject.verification?.evidence_refs || []).some(ref => ref.id === evidence.id)
  if (!referenced) errors.push(`${evidence.id}: evidence is not referenced by subject ${evidence.subject_id}`)
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
  schema_version: 'ocme-validation-v0.7',
  json_schema_draft: '2020-12',
  mko_schema_versions: [...new Set(objects.map(object => object.schema_version))].sort(),
  object_count: objects.length,
  evidence_object_count: evidenceObjects.length,
  evidence_ref_count: objects.reduce((sum, object) => sum + object.verification.evidence_refs.length, 0),
  configured_producer_count: objects.reduce((sum, object) => sum + object.verification.producers.length, 0),
  dependency_edges: dependencyEdges,
  unresolved_dependencies: 0,
  unresolved_evidence_refs: 0,
  dependency_cycles: 0,
  missing_companion_files: 0,
  missing_producer_configs: 0
}
await fs.mkdir('artifacts', { recursive: true })
await fs.writeFile('artifacts/validation-v0.7.json', `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`MKO validation passed: ${objects.length} objects, ${evidenceObjects.length} evidence objects, ${dependencyEdges} dependency edge(s).`)
