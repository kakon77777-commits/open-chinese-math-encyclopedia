import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from './store.js'

export const ATLAS_DIR = path.join(DATA_DIR, 'atlas')
export const CORE_ATLAS_PATH = path.join(ATLAS_DIR, 'core-atlas.json')

export async function loadCoreAtlas() {
  return JSON.parse(await fs.readFile(CORE_ATLAS_PATH, 'utf8'))
}

export async function listAtlasEntries() {
  const atlas = await loadCoreAtlas()
  return atlas.entries
}

export async function getAtlasEntry(id) {
  const entries = await listAtlasEntries()
  const entry = entries.find(item => item.id === id || item.target_mko_id === id || item.canonical_mko_id === id)
  if (!entry) throw new Error(`unknown atlas entry: ${id}`)
  return entry
}

export async function browseAtlas({ group, domain, band, maturity, priority, query = '' } = {}) {
  const atlas = await loadCoreAtlas()
  const q = query.trim().toLowerCase()
  const entries = atlas.entries.filter(entry => {
    if (group && entry.group !== group) return false
    if (domain && entry.primary_domain !== domain) return false
    if (band && entry.curriculum_band !== band) return false
    if (maturity && entry.maturity !== maturity) return false
    if (priority && entry.materialization_priority !== priority) return false
    if (q && !`${entry.id} ${entry.title_zh} ${entry.summary_zh} ${entry.target_mko_id}`.toLowerCase().includes(q)) return false
    return true
  })
  return {
    schema_version: 'ocme-core-atlas-query-v0.1',
    filters: { group: group || null, domain: domain || null, band: band || null, maturity: maturity || null, priority: priority || null, query },
    count: entries.length,
    entries,
  }
}

export async function getCoreAtlasSummary() {
  const atlas = await loadCoreAtlas()
  const by = key => Object.fromEntries([...new Set(atlas.entries.map(entry => entry[key]))].sort().map(value => [
    value, atlas.entries.filter(entry => entry[key] === value).length
  ]))
  return {
    schema_version: 'ocme-core-atlas-summary-v0.1',
    atlas_version: atlas.atlas_version,
    entry_count: atlas.entries.length,
    canonical_mko_count: atlas.entries.filter(entry => entry.maturity === 'canonical_mko').length,
    materialization_queue_count: atlas.entries.filter(entry => entry.maturity === 'atlas_seed').length,
    groups: atlas.groups.map(group => ({
      ...group,
      actual_count: atlas.entries.filter(entry => entry.group === group.id).length,
    })),
    by_curriculum_band: by('curriculum_band'),
    by_maturity: by('maturity'),
    by_priority: by('materialization_priority'),
  }
}

export async function getMaterializationQueue({ priority } = {}) {
  const entries = (await listAtlasEntries())
    .filter(entry => entry.maturity === 'atlas_seed')
    .filter(entry => !priority || entry.materialization_priority === priority)
  const rank = { P1: 1, P2: 2, P3: 3 }
  return entries.sort((a, b) =>
    (rank[a.materialization_priority] - rank[b.materialization_priority]) ||
    a.group.localeCompare(b.group, 'en') ||
    a.id.localeCompare(b.id, 'en')
  )
}
