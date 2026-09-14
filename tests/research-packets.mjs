import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const cases = [
  ['atlas-natural-number', 'mko-natural-number'],
  ['atlas-set', 'mko-set'],
  ['atlas-proposition', 'mko-proposition'],
  ['atlas-arithmetic-operations', 'mko-arithmetic-operations'],
  ['atlas-variable-expression', 'mko-variable-expression'],
  ['atlas-sample-space', 'mko-sample-space'],
  ['atlas-mathematical-induction', 'mko-mathematical-induction'],
  ['atlas-counting-principle', 'mko-counting-principle'],
]

for (const [atlasId, mkoId] of cases) {
  const packet = await fs.readFile(path.join('research', `${atlasId}.md`), 'utf8')
  assert.equal(packet.includes('packet_version: ocme-research-packet-v0.1'), true)
  assert.equal(packet.includes(`atlas_id: ${atlasId}`), true)
  assert.equal(packet.includes(`target_mko_id: ${mkoId}`), true)
  assert.equal(packet.includes('status: ai_candidate_complete'), true)
  assert.equal(packet.includes('review_required: true'), true)
  assert.equal(packet.includes('https://'), true)
  assert.equal(packet.includes('Evidence refs 為空') || packet.includes('不新增 Evidence Object'), true)
}

const wavePath = path.join('research', 'domain-foundation-pure-formal-wave-2026-09-14.md')
const wave = await fs.readFile(wavePath, 'utf8')
for (const boundary of [
  'status: awaiting_high_assurance_review',
  'atlas_write_authorized: false',
  'canonical_write_authorized: false',
  'deployment_authorized: false',
]) {
  assert.equal(wave.includes(boundary), true, `domain foundation wave missing boundary: ${boundary}`)
}

const domainPackets = [
  ['topology', 'domain-foundation-topology-2026-09-14.md'],
  ['number_theory', 'domain-foundation-number-theory-2026-09-14.md'],
  ['computer_science_mathematics', 'domain-foundation-computer-science-mathematics-2026-09-14.md'],
  ['formalized_mathematics', 'domain-foundation-formalized-mathematics-2026-09-14.md'],
]
const atlas = JSON.parse(await fs.readFile(path.join('public', 'data', 'atlas', 'core-atlas.json'), 'utf8'))
const existingIds = new Set(atlas.entries.map(entry => entry.id))
const proposed = []

for (const [domainId, filename] of domainPackets) {
  const packet = await fs.readFile(path.join('research', filename), 'utf8')
  assert.equal(packet.includes('packet_version: ocme-domain-foundation-packet-v0.1'), true)
  assert.equal(packet.includes(`domain_id: ${domainId}`), true)
  assert.equal(packet.includes('review_required: true'), true)
  assert.equal(packet.includes('atlas_change_authorized: false'), true)
  assert.equal(packet.includes('## Representative MKO candidate'), true)
  assert.equal(packet.includes('## 需 GPT-6 裁決'), true)
  assert.equal(packet.includes('https://'), true)

  const rows = packet.split(/\r?\n/).filter(line => /^\| [1-4] \| `atlas-/.test(line))
  assert.equal(rows.length, 4, `${domainId} must propose exactly four bounded foundation nodes`)
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim())
    const id = cells[1].match(/`(atlas-[^`]+)`/)?.[1]
    const prerequisites = [...cells[3].matchAll(/`(atlas-[^`]+)`/g)].map(match => match[1])
    assert.ok(id)
    proposed.push({ id, prerequisites })
  }
}

const proposedIds = new Set(proposed.map(node => node.id))
assert.equal(proposed.length, 16)
assert.equal(proposedIds.size, 16, 'domain foundation candidate IDs must be unique')
assert.equal(proposed.every(node => !existingIds.has(node.id)), true, 'review-only candidates must not collide with the 80-node baseline')

for (const node of proposed) {
  for (const prerequisite of node.prerequisites) {
    assert.equal(existingIds.has(prerequisite) || proposedIds.has(prerequisite), true, `${node.id} has unknown prerequisite ${prerequisite}`)
  }
}

const visiting = new Set()
const visited = new Set()
const byId = new Map(proposed.map(node => [node.id, node]))
function assertAcyclic(id) {
  if (visited.has(id)) return
  assert.equal(visiting.has(id), false, `cycle detected at ${id}`)
  visiting.add(id)
  for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
    if (proposedIds.has(prerequisite)) assertAcyclic(prerequisite)
  }
  visiting.delete(id)
  visited.add(id)
}
for (const id of proposedIds) assertAcyclic(id)

assert.equal(atlas.entries.length, 80, 'review packets must not mutate the 80-node Atlas before GPT-6 review')
assert.equal(atlas.entries.some(entry => domainPackets.some(([domainId]) => entry.primary_domain === domainId)), false)

console.log('Research packet tests passed: eight materialization packets and four review-only domain packets preserve evidence, authority, ID, prerequisite, DAG, and 80-node baseline boundaries.')
