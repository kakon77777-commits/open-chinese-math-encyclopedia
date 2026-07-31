import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  createEveGlyphReviewPacket,
  renderEveGlyphReviewMarkdown,
} from '../lib/eveglyph-review.js'
import { ROOT, loadAllObjects } from '../lib/store.js'

const outputDir = path.join(ROOT, 'artifacts', 'eveglyph-review')
await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })

const objects = await loadAllObjects()
const manifest = {
  schema_version: 'ocme-eveglyph-review-export-v0.1',
  generated_from: 'canonical_mko_store',
  object_count: objects.length,
  packets: [],
}

for (const object of objects) {
  const packet = createEveGlyphReviewPacket(object)
  const baseName = object.id.replace(/^mko-/, '')
  const jsonPath = `${baseName}.review.json`
  const markdownPath = `${baseName}.review.md`
  await fs.writeFile(path.join(outputDir, jsonPath), `${JSON.stringify(packet, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(outputDir, markdownPath), renderEveGlyphReviewMarkdown(packet), 'utf8')
  manifest.packets.push({
    object_id: object.id,
    object_version: object.version,
    base_object_sha256: packet.base_object_sha256,
    json: jsonPath,
    markdown: markdownPath,
  })
}

await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Exported ${objects.length} EveGlyph review packet(s) to artifacts/eveglyph-review.`)
