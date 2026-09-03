import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { validateSedbMathBundle } from './sedb-math-validation.js'

export const SEDB_MATH_DATA_DIR = path.join(ROOT, 'public', 'data', 'sedb-math')

const COLLECTIONS = Object.freeze({
  objectStates: {
    file: 'object-states.json',
    key: 'states',
    schemaVersion: 'ocme-sedb-math-object-state-collection-v0.1',
  },
  claimStates: {
    file: 'claim-states.json',
    key: 'states',
    schemaVersion: 'ocme-sedb-math-claim-state-collection-v0.1',
  },
  events: {
    file: 'events.json',
    key: 'events',
    schemaVersion: 'ocme-sedb-math-event-collection-v0.1',
  },
})

async function loadCollection(name) {
  const config = COLLECTIONS[name]
  const parsed = JSON.parse(await fs.readFile(path.join(SEDB_MATH_DATA_DIR, config.file), 'utf8'))
  if (parsed.schema_version !== config.schemaVersion) {
    throw new Error(`${config.file}: unexpected schema_version ${parsed.schema_version}`)
  }
  if (!Array.isArray(parsed[config.key])) {
    throw new Error(`${config.file}: ${config.key} must be an array`)
  }
  return parsed[config.key]
}

export function loadSedbMathObjectStates() {
  return loadCollection('objectStates')
}

export function loadSedbMathClaimStates() {
  return loadCollection('claimStates')
}

export function loadSedbMathEvents() {
  return loadCollection('events')
}

function pushIndexed(map, key, value) {
  if (!key) return
  const values = map.get(key) ?? []
  values.push(value)
  map.set(key, values)
}

export function indexSedbMathEvents(events) {
  const byId = new Map()
  const byObjectId = new Map()
  const byClaimId = new Map()

  for (const event of events) {
    if (byId.has(event.event_id)) throw new Error(`duplicate event_id ${event.event_id}`)
    byId.set(event.event_id, event)
    pushIndexed(byObjectId, event.object_id, event)
    pushIndexed(byClaimId, event.claim_id, event)
  }

  return { byId, byObjectId, byClaimId }
}

export async function loadAndValidateSedbMathState({ knownObjectIds = [] } = {}) {
  const [objectStates, claimStates, events] = await Promise.all([
    loadSedbMathObjectStates(),
    loadSedbMathClaimStates(),
    loadSedbMathEvents(),
  ])
  return validateSedbMathBundle(
    { objectStates, claimStates, events },
    { knownObjectIds },
  )
}
