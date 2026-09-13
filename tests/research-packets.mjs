import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const cases = [
  ['atlas-natural-number', 'mko-natural-number'],
  ['atlas-set', 'mko-set'],
  ['atlas-proposition', 'mko-proposition'],
]

for (const [atlasId, mkoId] of cases) {
  const packet = await fs.readFile(path.join('research', `${atlasId}.md`), 'utf8')
  assert.equal(packet.includes('packet_version: ocme-research-packet-v0.1'), true)
  assert.equal(packet.includes(`atlas_id: ${atlasId}`), true)
  assert.equal(packet.includes(`target_mko_id: ${mkoId}`), true)
  assert.equal(packet.includes('status: ai_candidate_complete'), true)
  assert.equal(packet.includes('review_required: true'), true)
  assert.equal(packet.includes('https://'), true)
  assert.equal(packet.includes('Evidence refs 為空'), true)
}

console.log('Research packet tests passed: three source-grounded AI candidates require review and preserve an empty-Evidence boundary.')
