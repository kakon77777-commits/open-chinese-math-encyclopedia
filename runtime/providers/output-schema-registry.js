import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../../lib/store.js'

const SCHEMA_PATHS = Object.freeze({
  'ocme-design-contract-v0.1': 'design-contract.schema.json',
  'ocme-candidate-envelope-v0.1': 'candidate-envelope.schema.json',
  'ocme-verification-report-v0.1': 'verification-report.schema.json',
  'ocme-repair-patch-v0.1': 'repair-patch.schema.json',
})

export async function resolveOutputSchema(outputSchemaId) {
  const filename = SCHEMA_PATHS[outputSchemaId]
  if (!filename) throw new Error(`unsupported output schema ${outputSchemaId}`)
  return JSON.parse(await fs.readFile(path.join(ROOT, 'schemas', filename), 'utf8'))
}

export function listOutputSchemaIds() {
  return Object.keys(SCHEMA_PATHS).sort()
}
