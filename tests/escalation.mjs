import assert from 'node:assert/strict'
import { routeEscalation } from '../runtime/trust/escalation.js'
import { validateEscalationDecision } from '../lib/escalation-decision-validation.js'

const candidateRevisionId = 'candidate-task-atlas-natural-number-r0'
const mechanicalReportId = `mechanical-${candidateRevisionId}`

function mechanical(status = 'pass') {
  return {
    report_id: mechanicalReportId,
    candidate_revision_id: candidateRevisionId,
    mechanical_status: status,
  }
}

function risk(riskClass = 'L1') {
  return {
    profile_id: `risk-${candidateRevisionId}`,
    candidate_revision_id: candidateRevisionId,
    mechanical_report_id: mechanicalReportId,
    risk_class: riskClass,
  }
}

function diversity(level = 'high', revision = candidateRevisionId) {
  return {
    profile_id: `diversity-${revision}`,
    candidate_revision_id: revision,
    diversity_level: level,
  }
}

function disagreement(id = 'disagreement-definition') {
  return {
    disagreement_id: id,
    candidate_revision_id: candidateRevisionId,
    status: 'open',
  }
}

function route({ mechanicalStatus = 'pass', riskClass = 'L1', diversityLevel = 'high', disagreements = [] } = {}) {
  return routeEscalation({
    mechanicalReport: mechanical(mechanicalStatus),
    riskProfile: risk(riskClass),
    diversityProfile: diversity(diversityLevel),
    disagreements,
  })
}

const mechanicalFail = route({ mechanicalStatus: 'fail', riskClass: 'L0', diversityLevel: 'high' })
assert.equal(mechanicalFail.route, 'repair_required')
assert.equal(mechanicalFail.blocking, true)

const l4 = route({ riskClass: 'L4', diversityLevel: 'high' })
assert.equal(l4.route, 'high_assurance_review_required')
assert.equal(l4.blocking, true)

const l3Low = route({ riskClass: 'L3', diversityLevel: 'low' })
assert.equal(l3Low.route, 'independent_verification_required')

const l3High = route({ riskClass: 'L3', diversityLevel: 'high' })
assert.equal(l3High.route, 'high_assurance_review_required')

const l2Low = route({ riskClass: 'L2', diversityLevel: 'low' })
assert.equal(l2Low.route, 'independent_verification_required')

const withDisagreement = route({
  riskClass: 'L1',
  diversityLevel: 'high',
  disagreements: [disagreement()],
})
assert.equal(withDisagreement.route, 'independent_verification_required')
assert.deepEqual(withDisagreement.open_disagreement_ids, ['disagreement-definition'])

const local = route({ riskClass: 'L1', diversityLevel: 'high' })
assert.equal(local.route, 'continue_local')
assert.equal(local.blocking, false)
assert.equal(Object.hasOwn(local, 'canonical_verdict'), false)
assert.equal(Object.hasOwn(local, 'mathematically_true'), false)
assert.equal(Object.hasOwn(local, 'accept'), false)

const validationInputs = {
  mechanicalReport: mechanical(),
  riskProfile: risk('L1'),
  diversityProfile: diversity('high'),
  disagreements: [],
}
const validation = await validateEscalationDecision(local, validationInputs)
assert.equal(validation.ok, true, validation.errors.join('\n'))

const tamperedRoute = structuredClone(local)
tamperedRoute.route = 'high_assurance_review_required'
tamperedRoute.blocking = true
tamperedRoute.reasons = ['Tampered route that does not follow the R5 policy inputs.']
const tamperedValidation = await validateEscalationDecision(tamperedRoute, validationInputs)
assert.equal(tamperedValidation.ok, false, 'validator must recompute and reject a tampered escalation route')
assert.ok(tamperedValidation.errors.some(error => error.includes('route must equal continue_local')))

assert.throws(
  () => routeEscalation({
    mechanicalReport: mechanical(),
    riskProfile: risk('L1'),
    diversityProfile: diversity('high', 'candidate-task-atlas-stale-r0'),
    disagreements: [],
  }),
  /candidate revision mismatch/,
)

assert.throws(
  () => routeEscalation({
    mechanicalReport: mechanical(),
    riskProfile: risk('L1'),
    diversityProfile: diversity('high'),
    disagreements: [{ ...disagreement(), candidate_revision_id: 'candidate-task-atlas-stale-r0' }],
  }),
  /candidate revision mismatch/,
)

console.log('R5 escalation routing RED/GREEN tests passed.')
