import { promises as fs } from 'node:fs'
import path from 'node:path'
import { ROOT } from './store.js'
import { createMkoValidator, formatSchemaErrors } from './schema-validation.js'
import { canTransition } from './sedb-math-transitions.js'

export async function loadSedbMathSchemas() {
  const schemaDir = path.join(ROOT, 'schemas')
  const [objectStateSchema, claimStateSchema, eventSchema] = await Promise.all([
    fs.readFile(path.join(schemaDir, 'sedb-math-object-state.schema.json'), 'utf8'),
    fs.readFile(path.join(schemaDir, 'sedb-math-claim-state.schema.json'), 'utf8'),
    fs.readFile(path.join(schemaDir, 'sedb-math-event.schema.json'), 'utf8'),
  ])
  return {
    objectStateSchema: JSON.parse(objectStateSchema),
    claimStateSchema: JSON.parse(claimStateSchema),
    eventSchema: JSON.parse(eventSchema),
  }
}

export function createSedbMathValidators({ objectStateSchema, claimStateSchema, eventSchema }) {
  return {
    validateObjectState: createMkoValidator(objectStateSchema),
    validateClaimState: createMkoValidator(claimStateSchema),
    validateEvent: createMkoValidator(eventSchema),
  }
}

function recordDuplicateErrors(records, key, label, errors) {
  const seen = new Set()
  for (const record of records) {
    const value = record?.[key]
    if (typeof value !== 'string') continue
    if (seen.has(value)) errors.push(`${label}: duplicate ${key} ${value}`)
    seen.add(value)
  }
}

function eventIdentity(event) {
  return event.claim_id ? `${event.object_id}#${event.claim_id}` : event.object_id
}

export async function validateSedbMathBundle(bundle, { knownObjectIds = [], schemas = null } = {}) {
  const errors = []
  const objectStates = Array.isArray(bundle?.objectStates) ? bundle.objectStates : []
  const claimStates = Array.isArray(bundle?.claimStates) ? bundle.claimStates : []
  const events = Array.isArray(bundle?.events) ? bundle.events : []

  if (!Array.isArray(bundle?.objectStates)) errors.push('bundle: objectStates must be an array')
  if (!Array.isArray(bundle?.claimStates)) errors.push('bundle: claimStates must be an array')
  if (!Array.isArray(bundle?.events)) errors.push('bundle: events must be an array')

  const loadedSchemas = schemas ?? await loadSedbMathSchemas()
  const { validateObjectState, validateClaimState, validateEvent } = createSedbMathValidators(loadedSchemas)

  for (const state of objectStates) {
    if (!validateObjectState(state)) {
      errors.push(...formatSchemaErrors(state?.id ?? 'object-state', validateObjectState.errors))
    }
  }
  for (const state of claimStates) {
    if (!validateClaimState(state)) {
      errors.push(...formatSchemaErrors(state?.id ?? 'claim-state', validateClaimState.errors))
    }
  }
  for (const event of events) {
    if (!validateEvent(event)) {
      errors.push(...formatSchemaErrors(event?.event_id ?? 'event', validateEvent.errors))
    }
  }

  recordDuplicateErrors(objectStates, 'id', 'object-state', errors)
  recordDuplicateErrors(objectStates, 'object_id', 'object-state', errors)
  recordDuplicateErrors(claimStates, 'id', 'claim-state', errors)
  recordDuplicateErrors(claimStates, 'claim_id', 'claim-state', errors)
  recordDuplicateErrors(events, 'event_id', 'event', errors)

  const stateObjectIds = new Set(objectStates.map(state => state.object_id).filter(Boolean))
  const allowedObjectIds = knownObjectIds.length > 0 ? new Set(knownObjectIds) : stateObjectIds
  const claimIds = new Set(claimStates.map(state => state.claim_id).filter(Boolean))

  for (const state of objectStates) {
    if (allowedObjectIds.size > 0 && !allowedObjectIds.has(state.object_id)) {
      errors.push(`${state.id ?? 'object-state'}: unknown object_id ${state.object_id}`)
    }
  }
  for (const state of claimStates) {
    if (allowedObjectIds.size > 0 && !allowedObjectIds.has(state.object_id)) {
      errors.push(`${state.id ?? 'claim-state'}: unknown object_id ${state.object_id}`)
    }
  }

  const eventById = new Map()
  const lastToState = new Map()
  for (const event of events) {
    if (typeof event.event_id === 'string' && !eventById.has(event.event_id)) {
      eventById.set(event.event_id, event)
    }

    if (allowedObjectIds.size > 0 && !allowedObjectIds.has(event.object_id)) {
      errors.push(`${event.event_id ?? 'event'}: unknown object_id ${event.object_id}`)
    }
    if (event.claim_id && !claimIds.has(event.claim_id)) {
      errors.push(`${event.event_id ?? 'event'}: unknown claim_id ${event.claim_id}`)
    }
    if (!canTransition(event.from_state, event.to_state)) {
      errors.push(`${event.event_id ?? 'event'}: illegal SEDB-Math transition: ${event.from_state} -> ${event.to_state}`)
    }

    const identity = eventIdentity(event)
    const previousTo = lastToState.get(identity)
    if (previousTo && event.from_state !== previousTo) {
      errors.push(`${event.event_id ?? 'event'}: history discontinuity for ${identity}: expected ${previousTo}, got ${event.from_state}`)
    }
    if (typeof event.to_state === 'string') lastToState.set(identity, event.to_state)
  }

  for (const state of objectStates) {
    const latest = eventById.get(state.latest_event_id)
    if (!latest) {
      errors.push(`${state.id ?? 'object-state'}: latest_event_id ${state.latest_event_id} does not resolve`)
      continue
    }
    if (latest.object_id !== state.object_id || latest.claim_id) {
      errors.push(`${state.id ?? 'object-state'}: latest_event_id ${state.latest_event_id} does not belong to object ${state.object_id}`)
      continue
    }
    if (state.state !== latest.to_state) {
      errors.push(`${state.id ?? 'object-state'}: current state ${state.state} does not match latest event state ${latest.to_state}`)
    }
    if (state.state === 'canonical' && !(latest.from_state === 'verified' && latest.to_state === 'canonical')) {
      errors.push(`${state.id ?? 'object-state'}: canonical state requires terminal verified -> canonical event`)
    }
  }

  for (const state of claimStates) {
    const latest = eventById.get(state.latest_event_id)
    if (!latest) {
      errors.push(`${state.id ?? 'claim-state'}: latest_event_id ${state.latest_event_id} does not resolve`)
      continue
    }
    if (latest.object_id !== state.object_id || latest.claim_id !== state.claim_id) {
      errors.push(`${state.id ?? 'claim-state'}: latest_event_id ${state.latest_event_id} does not belong to claim ${state.claim_id}`)
      continue
    }
    if (state.state !== latest.to_state) {
      errors.push(`${state.id ?? 'claim-state'}: current state ${state.state} does not match latest event state ${latest.to_state}`)
    }
    if (state.state === 'canonical' && !(latest.from_state === 'verified' && latest.to_state === 'canonical')) {
      errors.push(`${state.id ?? 'claim-state'}: canonical state requires terminal verified -> canonical event`)
    }
  }

  return { ok: errors.length === 0, errors }
}
