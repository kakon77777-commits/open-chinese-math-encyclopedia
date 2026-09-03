import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { runMechanicalTrust } from '../runtime/trust/mechanical-runner.js'
import { validateMechanicalTrustReport } from '../lib/mechanical-trust-validation.js'

const [task] = await loadMaterializationTasks()
const contract = {
  schema_version: 'ocme-design-contract-v0.1',
  contract_id: `contract-${task.task_id}`,
  task_id: task.task_id,
  target_mko_id: task.target_mko_id,
  required_claims: ['Define the target object precisely.'],
  required_prerequisites: [...task.prerequisite_atlas_ids],
  evidence_requirements: [],
  counterexample_classes: [],
  formalization_requirements: [],
  failure_tests: ['Reject unsupported generalization.'],
  completion_criteria: ['All required claims are explicit and reviewable.'],
  risk_notes: [],
}

function makeCandidate() {
  return {
    schema_version: 'ocme-candidate-envelope-v0.1',
    candidate_revision_id: `candidate-${task.task_id}-r0`,
    task_id: task.task_id,
    target_mko_id: task.target_mko_id,
    candidate_id: task.target_mko_id,
    candidate_artifact: { title: 'Mechanical runner fixture', claims: ['Fixture claim.'] },
    uncertainties: [],
    evidence_refs: [],
    proposed_relations: [],
  }
}

const gates = [{
  gate_id: 'fixture_gate',
  scope: ['runner fixture scope'],
  executable: 'fixture',
  args: [],
  tool_name: 'fixture-tool',
}]

function gateResult(gate, status = 'pass') {
  return {
    gate_id: gate.gate_id,
    scope: structuredClone(gate.scope),
    status,
    executable: gate.executable,
    args: structuredClone(gate.args),
    exit_code: status === 'pass' ? 0 : 2,
    stdout_sha256: 'a'.repeat(64),
    stderr_sha256: 'b'.repeat(64),
    duration_ms: 1,
    tool: { name: gate.tool_name, version: 'fixture-v1' },
  }
}

const candidate = makeCandidate()
const passReport = await runMechanicalTrust({
  candidate,
  task,
  contract,
  sourceRevision: 'source-fixture',
  gates,
  executor: async gate => gateResult(gate, 'pass'),
})
assert.equal(passReport.mechanical_status, 'pass')
assert.equal(passReport.epistemic_scope, 'mechanical_only')
assert.equal(passReport.gates[0].gate_id, 'candidate_envelope')
assert.equal(passReport.gates[0].status, 'pass')
assert.equal(passReport.gates[1].gate_id, 'fixture_gate')
assert.equal(passReport.gates[1].status, 'pass')
assert.equal(Object.hasOwn(passReport, 'mathematically_true'), false)
assert.equal(Object.hasOwn(passReport, 'canonical_state'), false)
assert.equal(Object.hasOwn(passReport, 'canonical_verdict'), false)
const passValidation = await validateMechanicalTrustReport(passReport, candidate, { expectedSourceRevision: 'source-fixture' })
assert.equal(passValidation.ok, true, passValidation.errors.join('\n'))

const failCandidate = makeCandidate()
const failReport = await runMechanicalTrust({
  candidate: failCandidate,
  task,
  contract,
  sourceRevision: 'source-fixture',
  gates,
  executor: async gate => gateResult(gate, 'fail'),
})
assert.equal(failReport.mechanical_status, 'fail')
assert.equal(failReport.gates.at(-1).status, 'fail')

const mutatingCandidate = makeCandidate()
await assert.rejects(
  () => runMechanicalTrust({
    candidate: mutatingCandidate,
    task,
    contract,
    sourceRevision: 'source-fixture',
    gates,
    executor: async gate => {
      mutatingCandidate.candidate_artifact.title = 'tampered during verification'
      return gateResult(gate, 'pass')
    },
  }),
  /candidate mutated during mechanical verification/,
)

const amplifiedScopeCandidate = makeCandidate()
await assert.rejects(
  () => runMechanicalTrust({
    candidate: amplifiedScopeCandidate,
    task,
    contract,
    sourceRevision: 'source-fixture',
    gates,
    executor: async gate => {
      const result = gateResult(gate, 'pass')
      result.scope = [...result.scope, 'mathematical truth']
      return result
    },
  }),
  /executor result does not match gate definition/,
)

console.log('Per-candidate mechanical trust runner tests passed.')
