import { promises as fs } from 'node:fs'
import path from 'node:path'
import { adaptLeanManifest } from '../lib/evidence-adapters/lean.js'
import { ROOT, loadObject } from '../lib/store.js'

const manifestDir = path.join(ROOT, 'evidence-sources', 'lean')
const names = (await fs.readdir(manifestDir))
  .filter(name => name.endsWith('.json'))
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

const previews = []
for (const name of names) {
  const manifest = JSON.parse(await fs.readFile(path.join(manifestDir, name), 'utf8'))
  const subject = await loadObject(manifest.subject_id)
  const evidence = await adaptLeanManifest(manifest, { subject, root: ROOT })
  previews.push({
    manifest: name,
    theorem_name: manifest.theorem_name,
    subject_id: manifest.subject_id,
    id: evidence.id,
    sources: evidence.sources,
    digest: evidence.digest,
  })
}

console.log(JSON.stringify({
  schema_version: 'ocme-lean-evidence-preview-v0.2',
  count: previews.length,
  previews,
}, null, 2))
