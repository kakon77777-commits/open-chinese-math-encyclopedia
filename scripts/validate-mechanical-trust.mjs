import { execFileSync } from 'node:child_process'
import { ROOT } from '../lib/store.js'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { validateMechanicalTrustReport } from '../lib/mechanical-trust-validation.js'
import { MECHANICAL_GATES } from '../runtime/trust/mechanical-gates.js'
import { runMechanicalTrust } from '../runtime/trust/mechanical-runner.js'

function currentSourceRevision() {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

const [task] = await loadMaterializationTasks()
if (!task) throw new Error('mechanical trust validation requires at least one materialization task')

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

const candidate = {
  schema_version: 'ocme-candidate-envelope-v0.1',
  candidate_revision_id: `candidate-${task.task_id}-r0`,
  task_id: task.task_id,
  target_mko_id: task.target_mko_id,
  candidate_id: task.target_mko_id,
  candidate_artifact: {
    title: 'R4 deterministic mechanical trust fixture',
    claims: ['This fixture exists only to bind repository mechanical checks to a concrete candidate revision.'],
  },
  uncertainties: [],
  evidence_refs: [],
  proposed_relations: [],
}

const sourceRevision = currentSourceRevision()
const report = await runMechanicalTrust({
  candidate,
  task,
  contract,
  sourceRevision,
  gates: MECHANICAL_GATES,
})

const validation = await validateMechanicalTrustReport(report, candidate, { expectedSourceRevision: sourceRevision })
if (!validation.ok) throw new Error(validation.errors.join('\n'))
if (report.gates.length !== MECHANICAL_GATES.length + 1) {
  throw new Error(`expected ${MECHANICAL_GATES.length + 1} mechanical gates including candidate_envelope, got ${report.gates.length}`)
}

const failed = report.gates.filter(gate => gate.status !== 'pass')
if (failed.length > 0 || report.mechanical_status !== 'pass') {
  console.error(`Mechanical trust validation failed: ${failed.map(gate => gate.gate_id).join(', ') || 'derived report status is fail'}`)
  process.exitCode = 1
} else {
  console.log(`Mechanical trust validation passed: ${report.gates.length} scoped gates bound to ${report.candidate_revision_id} @ ${sourceRevision.slice(0, 12)}.`)
  console.log('Epistemic scope: mechanical_only; this report does not assert mathematical truth, formal compilation, or canonical eligibility.')
}
