import assert from 'node:assert/strict'
import { loadCoreAtlas, getCoreAtlasSummary, getMaterializationQueue } from '../lib/atlas-store.js'
import { validateCoreAtlas } from '../lib/atlas-validation.js'

const atlas = await loadCoreAtlas()
const result = await validateCoreAtlas()
assert.equal(result.ok, true, result.errors.join('\n'))
assert.equal(atlas.entries.length, 80)
assert.equal(atlas.entries.filter(x => x.maturity === 'canonical_mko').length, 6)
assert.equal((await getMaterializationQueue()).length, 74)
const summary = await getCoreAtlasSummary()
assert.equal(summary.entry_count, 80)
assert.equal(summary.groups.reduce((sum, group) => sum + group.actual_count, 0), 80)

const unknownDomain = structuredClone(atlas)
unknownDomain.entries[0].primary_domain = 'not-a-domain'
assert.equal((await validateCoreAtlas(unknownDomain)).ok, false)

const brokenDep = structuredClone(atlas)
brokenDep.entries[1].prerequisites = ['atlas-does-not-exist']
assert.equal((await validateCoreAtlas(brokenDep)).ok, false)

const cycle = structuredClone(atlas)
const a = cycle.entries.find(x => x.id === 'atlas-natural-number')
const b = cycle.entries.find(x => x.id === 'atlas-integer')
a.prerequisites = [b.id]
assert.equal((await validateCoreAtlas(cycle)).ok, false)

const fakeCanonical = structuredClone(atlas)
const seed = fakeCanonical.entries.find(x => x.maturity === 'atlas_seed')
seed.maturity = 'canonical_mko'
seed.canonical_mko_id = 'mko-does-not-exist'
seed.materialization_priority = 'canonical'
assert.equal((await validateCoreAtlas(fakeCanonical)).ok, false)

console.log('Core atlas tests passed: 80-node baseline and negative graph/maturity cases.')
