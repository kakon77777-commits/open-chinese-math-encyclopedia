const MECHANICAL_STATES = new Set(['not_run', 'passed', 'failed'])

export function evaluateConvergence({ ledger, attempt, maxAttempts, majorThreshold, mechanicalState }) {
  if (!Array.isArray(ledger)) throw new TypeError('ledger must be an array')
  if (!Number.isInteger(attempt) || attempt < 1) throw new RangeError('attempt must be an integer >= 1')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new RangeError('maxAttempts must be an integer >= 1')
  if (!Number.isInteger(majorThreshold) || majorThreshold < 0) throw new RangeError('majorThreshold must be an integer >= 0')
  if (!MECHANICAL_STATES.has(mechanicalState)) throw new RangeError('mechanicalState must be not_run, passed, or failed')

  const open = ledger.filter(objection => objection.status === 'open')
  const openCritical = open.filter(objection => objection.severity === 'critical').length
  const openMajor = open.filter(objection => objection.severity === 'major').length
  const base = {
    open_critical: openCritical,
    open_major: openMajor,
    attempt,
    max_attempts: maxAttempts,
  }

  if (mechanicalState === 'failed') return { status: 'blocked', ...base }

  const blocking = openCritical > 0 || openMajor > majorThreshold
  if (blocking && attempt >= maxAttempts) return { status: 'escalation_required', ...base }
  if (blocking) return { status: 'continue', ...base }
  return { status: 'converged', ...base }
}
