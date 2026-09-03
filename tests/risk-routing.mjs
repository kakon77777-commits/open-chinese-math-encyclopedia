import assert from 'node:assert/strict'
import { loadCoreAtlas } from '../lib/atlas-store.js'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { classifyRoutingRisk } from '../runtime/trust/risk-classifier.js'
import { validateRiskProfile } from '../lib/risk-profile-validation.js'

const atlas = await loadCoreAtlas()
const tasks = await loadMaterializationTasks()
const task = tasks[0]
const atlasEntry = atlas.entries.find(entry => entry.id === task.atlas_id)
assert.ok(atlasEntry)

const candidateRevisionId = `candidate-${task.task_id}-r0`
const passMechanicalReport = {
  schema_version: 'ocme-mechanical-trust-report-v0.1',
  report_id: `mechanical-${candidateRevisionId}`,
  epistemic_scope: 'mechanical_only',
  candidate_revision_id: candidateRevisionId,
  candidate_id: task.target_mko_id,
  target_mko_id: task.target_mko_id,
  candidate_sha256: 'a'.repeat(64),
  candidate_artifact_sha256: 'b'.repeat(64),
  source_revision: 'risk-routing-fixture',
  mechanical_status: 'pass',
  gates: [{
    gate_id: 'candidate_envelope',
    scope: ['fixture candidate envelope'],
    status: 'pass',
    executable: 'internal',
    args: [],
    exit_code: 0,
    stdout_sha256: 'c'.repeat(64),
    stderr_sha256: 'd'.repeat(64),
    duration_ms: 0,
    tool: { name: 'ocme-runtime', version: 'fixture' },
  }],
}

const inputs = {
  task,
  atlasEntry,
  atlas,
  mechanicalReport: passMechanicalReport,
  objections: [],
  unresolvedRisks: [],
}

const baseline = classifyRoutingRisk(inputs)
const baselineAgain = classifyRoutingRisk(inputs)
assert.deepEqual(baselineAgain, baseline)
assert.equal(baseline.epistemic_scope, 'routing_risk_only')
assert.match(baseline.risk_class, /^L[0-4]$/)
assert.ok(Number.isInteger(baseline.risk_score))
assert.ok(baseline.risk_score >= 0 && baseline.risk_score <= 100)
assert.equal(baseline.task_id, task.task_id)
assert.equal(baseline.atlas_id, task.atlas_id)
assert.equal(baseline.candidate_revision_id, candidateRevisionId)
assert.equal(baseline.mechanical_report_id, passMechanicalReport.report_id)
assert.equal(baseline.materialization_priority, task.priority)
assert.equal(Object.hasOwn(baseline, 'confidence'), false)
assert.equal(Object.hasOwn(baseline, 'mathematically_true'), false)
assert.equal(Object.hasOwn(baseline, 'canonical_state'), false)
assert.equal(Object.hasOwn(baseline, 'canonical_verdict'), false)

const expectedDownstreamCount = atlas.entries.filter(entry =>
  Array.isArray(entry.prerequisites) && entry.prerequisites.includes(atlasEntry.id)
).length
assert.equal(baseline.downstream_dependency_count, expectedDownstreamCount)

const baselineValidation = await validateRiskProfile(baseline, {
  task,
  atlasEntry,
  mechanicalReport: passMechanicalReport,
})
assert.equal(baselineValidation.ok, true, baselineValidation.errors.join('\n'))

const mechanicalFail = classifyRoutingRisk({
  ...inputs,
  mechanicalReport: { ...passMechanicalReport, mechanical_status: 'fail' },
})
assert.equal(mechanicalFail.risk_class, 'L4')
assert.equal(mechanicalFail.hard_floor, 'L4')

const objectionFixture = {
  objection_id: `objection-${candidateRevisionId}-fixture`,
  target_candidate_revision_id: candidateRevisionId,
  target_candidate_id: task.target_mko_id,
  type: 'other',
  severity: 'minor',
  reason: 'fixture objection',
  evidence_refs: [],
  status: 'open',
}

const critical = classifyRoutingRisk({
  ...inputs,
  objections: [{ ...objectionFixture, severity: 'critical' }],
})
assert.equal(critical.risk_class, 'L4')
assert.equal(critical.hard_floor, 'L4')

const major = classifyRoutingRisk({
  ...inputs,
  objections: [{ ...objectionFixture, severity: 'major' }],
})
assert.ok(['L3', 'L4'].includes(major.risk_class))

const counterexample = classifyRoutingRisk({
  ...inputs,
  objections: [{ ...objectionFixture, type: 'counterexample_found' }],
})
assert.equal(counterexample.risk_class, 'L4')
assert.equal(counterexample.hard_floor, 'L4')

const formalizationMismatch = classifyRoutingRisk({
  ...inputs,
  objections: [{ ...objectionFixture, type: 'formalization_mismatch' }],
})
assert.ok(['L3', 'L4'].includes(formalizationMismatch.risk_class))

const hardAtlasEntry = {
  ...atlasEntry,
  difficulty: Object.fromEntries(Object.entries(atlasEntry.difficulty).map(([key, value]) => [
    key,
    key === 'intuition_accessibility' ? value : 5,
  ])),
}
const harder = classifyRoutingRisk({ ...inputs, atlasEntry: hardAtlasEntry })
assert.ok(harder.risk_score > baseline.risk_score)

const centralAtlas = structuredClone(atlas)
for (let index = 0; index < 8; index += 1) {
  centralAtlas.entries.push({
    ...structuredClone(atlasEntry),
    id: `atlas-risk-dependent-${index}`,
    target_mko_id: `mko-risk-dependent-${index}`,
    prerequisites: [atlasEntry.id],
  })
}
const central = classifyRoutingRisk({ ...inputs, atlas: centralAtlas })
assert.equal(central.downstream_dependency_count, expectedDownstreamCount + 8)
assert.ok(central.risk_score > baseline.risk_score)

const threeCritical = classifyRoutingRisk({
  ...inputs,
  objections: [0, 1, 2].map(index => ({
    ...objectionFixture,
    objection_id: `objection-${candidateRevisionId}-critical-${index}`,
    severity: 'critical',
  })),
})
assert.equal(threeCritical.risk_score, 100)
assert.equal(threeCritical.risk_class, 'L4')
const threeCriticalValidation = await validateRiskProfile(threeCritical, {
  task,
  atlasEntry,
  mechanicalReport: passMechanicalReport,
})
assert.equal(threeCriticalValidation.ok, true, threeCriticalValidation.errors.join('\n'))

console.log(`R5 routing risk RED/GREEN tests passed: baseline=${baseline.risk_class}/${baseline.risk_score}.`)
