import { promises as fs } from 'node:fs'
import { listObjects, loadObject } from '../lib/store.js'

const required = [
  'schema_version', 'id', 'semantic_family_id', 'type', 'version', 'titles',
  'statement', 'formula', 'assumptions', 'symbols', 'computational_companions',
  'verification', 'formalization', 'provenance'
]
const errors = []
for (const entry of await listObjects()) {
  const object = await loadObject(entry.id)
  for (const key of required) if (!(key in object)) errors.push(`${entry.id}: missing ${key}`)
  if (object.formula?.tex == null) errors.push(`${entry.id}: formula.tex missing`)
  if (object.formula?.semantic_ast == null) errors.push(`${entry.id}: semantic AST missing`)
  for (const companion of object.computational_companions || []) {
    if (!companion.non_identity) errors.push(`${entry.id}/${companion.id}: non-identity declaration missing`)
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
await fs.mkdir('artifacts', { recursive: true })
await fs.writeFile('artifacts/validation.json', JSON.stringify({ ok: true, object_count: (await listObjects()).length }, null, 2))
console.log('MKO validation passed.')
