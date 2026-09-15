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
  ['atlas-set-operations', 'mko-set-operations'],
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
  'status: high_assurance_review_complete_waiting_schema',
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
const expectedNodeCounts = new Map([
  ['topology', 4],
  ['number_theory', 4],
  ['computer_science_mathematics', 4],
  ['formalized_mathematics', 2],
])
const atlas = JSON.parse(await fs.readFile(path.join('public', 'data', 'atlas', 'core-atlas.json'), 'utf8'))
const reviewLedger = JSON.parse(await fs.readFile(path.join('research', 'phase-b-pure-formal-review-v1.0.json'), 'utf8'))
const reviewArtifact = await fs.readFile(path.join('research', 'phase-b-pure-formal-atlas-review-2026-09-14.md'), 'utf8')
const existingIds = new Set(atlas.entries.map(entry => entry.id))
const proposed = []

for (const [domainId, filename] of domainPackets) {
  const packet = await fs.readFile(path.join('research', filename), 'utf8')
  assert.equal(packet.includes('packet_version: ocme-domain-foundation-packet-v0.1'), true)
  assert.equal(packet.includes(`domain_id: ${domainId}`), true)
  assert.equal(packet.includes('review_required: true'), true)
  assert.equal(packet.includes('atlas_change_authorized: false'), true)
  assert.equal(packet.includes('## Representative MKO candidate'), true)
  assert.equal(packet.includes('## 高階審查結論與保留義務'), true)
  assert.equal(packet.includes('https://'), true)

  const rows = packet.split(/\r?\n/).filter(line => /^\| [1-4] \| `atlas-/.test(line))
  assert.equal(rows.length, expectedNodeCounts.get(domainId), `${domainId} reviewed candidate count mismatch`)
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim())
    const id = cells[1].match(/`(atlas-[^`]+)`/)?.[1]
    const prerequisites = [...cells[3].matchAll(/`(atlas-[^`]+)`/g)].map(match => match[1])
    assert.ok(id)
    proposed.push({ id, prerequisites })
  }
}

const proposedIds = new Set(proposed.map(node => node.id))
assert.equal(proposed.length, 14)
assert.equal(proposedIds.size, 14, 'domain foundation candidate IDs must be unique')
assert.equal(proposed.every(node => !existingIds.has(node.id)), true, 'review-only candidates must not collide with the 80-node baseline')
assert.equal(proposed.reduce((sum, node) => sum + node.prerequisites.length, 0), 33)

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

assert.equal(reviewLedger.schema_version, 'ocme-phase-b-domain-review-v1.0')
assert.equal(reviewLedger.reviewed_snapshot, '25879a9f012b34be0b8d067ec009913c4801cc59')
assert.equal(reviewLedger.status, 'discussion_completed_with_recorded_obligations')
assert.equal(reviewLedger.authority.implementation_authorized, false)
assert.equal(reviewLedger.authority.canonical_promotion_authorized, false)
assert.equal(reviewLedger.authority.deployment_authorized, false)
assert.equal(reviewLedger.candidate_node_count, 14)
assert.equal(reviewLedger.hard_prerequisite_edge_count, 33)
assert.equal(reviewLedger.withdrawn_atlas_candidates.length, 2)
assert.deepEqual(
  new Set(reviewLedger.withdrawn_atlas_candidates.map(node => node.id)),
  new Set(['atlas-kernel-checking', 'atlas-axiom-assumption-inventory']),
)
assert.equal(reviewLedger.withdrawn_atlas_candidates.every(node => !proposedIds.has(node.id)), true)

const ledgerById = new Map(reviewLedger.candidate_nodes.map(node => [node.id, node]))
assert.deepEqual(new Set(ledgerById.keys()), proposedIds)
for (const node of proposed) {
  assert.deepEqual(
    [...ledgerById.get(node.id).hard_prerequisites].sort(),
    [...node.prerequisites].sort(),
    `${node.id} Markdown and machine-readable hard prerequisites must agree`,
  )
}

for (const boundary of [
  'implementation_authorized: false',
  'canonical_promotion_authorized: false',
  'deployment_authorized: false',
  'Structural：`PARTIAL`',
  'Mathematical／formal Evidence closure：`NOT_CLAIMED`',
]) {
  assert.equal(reviewArtifact.includes(boundary), true, `review artifact missing boundary: ${boundary}`)
}

assert.equal(atlas.entries.length, 80, 'review packets must not mutate the public 80-node Atlas before a new active Schema is approved')
assert.equal(atlas.entries.some(entry => domainPackets.some(([domainId]) => entry.primary_domain === domainId)), false)

console.log('Research packet tests passed: the reviewed 14-node/33-edge ledger, two withdrawals, authority boundaries, DAG, and unchanged 80-node public Atlas agree across Markdown and JSON.')
