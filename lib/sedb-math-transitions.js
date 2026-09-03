export const SEDB_MATH_STATES = Object.freeze([
  'planned',
  'proposed',
  'draft',
  'under_review',
  'verified',
  'canonical',
  'contested',
  'revision_required',
  'deprecated',
  'superseded',
])

const STATE_SET = new Set(SEDB_MATH_STATES)
const ALLOWED_TRANSITIONS = new Set([
  'planned->proposed',
  'proposed->draft',
  'draft->under_review',
  'under_review->verified',
  'verified->canonical',
  'canonical->contested',
  'contested->revision_required',
  'revision_required->under_review',
  'canonical->deprecated',
  'canonical->superseded',
])

export function canTransition(fromState, toState) {
  if (!STATE_SET.has(fromState) || !STATE_SET.has(toState)) return false
  if (fromState === toState) return false
  return ALLOWED_TRANSITIONS.has(`${fromState}->${toState}`)
}

export function assertLegalTransition(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new Error(`illegal SEDB-Math transition: ${fromState} -> ${toState}`)
  }
  return true
}
