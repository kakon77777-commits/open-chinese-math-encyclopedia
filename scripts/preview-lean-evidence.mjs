import { promises as fs } from 'node:fs'
import path from 'node:path'
import { adaptLeanManifest } from '../lib/evidence-adapters/lean.js'
import { ROOT, loadObject } from '../lib/store.js'

const manifestPath = path.join(ROOT, 'evidence-sources', 'lean', 'pythagorean-vector.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const subject = await loadObject(manifest.subject_id)
const evidence = await adaptLeanManifest(manifest, { subject, root: ROOT })
console.log(JSON.stringify({
  id: evidence.id,
  sources: evidence.sources,
  digest: evidence.digest,
}, null, 2))
