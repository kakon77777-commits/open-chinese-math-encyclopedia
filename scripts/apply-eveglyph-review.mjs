import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { applyEveGlyphReviewPatch } from '../lib/eveglyph-review.js'
import { ROOT, listObjects, loadObject } from '../lib/store.js'
import { createMkoValidator, formatSchemaErrors } from '../lib/schema-validation.js'

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function resolveInsideRoot(relativePath) {
  const target = path.resolve(ROOT, relativePath)
  if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`path escapes repository: ${relativePath}`)
  }
  return target
}

const patchArg = argument('--patch')
if (!patchArg) throw new Error('--patch is required')
const write = process.argv.includes('--write')
const patch = JSON.parse(await fs.readFile(resolveInsideRoot(patchArg), 'utf8'))

const patchSchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'eveglyph-review-patch.schema.json'), 'utf8'))
const validatePatch = createMkoValidator(patchSchema)
if (!validatePatch(patch)) {
  throw new Error(formatSchemaErrors('EveGlyph review patch', validatePatch.errors).join('\n'))
}

const original = await loadObject(patch.object_id)
const updated = applyEveGlyphReviewPatch(original, patch)

const mkoSchema = JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', 'mko-v0.3.schema.json'), 'utf8'))
const validateMko = createMkoValidator(mkoSchema)
if (!validateMko(updated)) {
  throw new Error(formatSchemaErrors(updated.id, validateMko.errors).join('\n'))
}

for (const machineField of [
  'formula',
  'assumptions',
  'symbols',
  'dependencies',
  'computational_companions',
  'verification',
  'formalization',
  'provenance',
]) {
  if (!isDeepStrictEqual(original[machineField], updated[machineField])) {
    throw new Error(`review patch changed machine-managed field: ${machineField}`)
  }
}

if (!write) {
  console.log(JSON.stringify(updated, null, 2))
  process.exit(0)
}

const entry = (await listObjects()).find(item => item.id === updated.id)
if (!entry) throw new Error(`object index entry missing: ${updated.id}`)
const relative = entry.path.replace(/^\/data\//, '')
const target = path.join(ROOT, 'public', 'data', relative)
await fs.writeFile(target, `${JSON.stringify(updated, null, 2)}\n`, 'utf8')
console.log(`Applied EveGlyph review patch to ${updated.id}; version ${updated.version}.`)
