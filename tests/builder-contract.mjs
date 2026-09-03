import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { validateCandidateEnvelope } from '../lib/candidate-envelope-validation.js'

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

function validCandidate() {
  return {
    schema_version: 'ocme-candidate-envelope-v0.1',
    candidate_revision_id: `candidate-${task.task_id}-r0`,
    task_id: task.task_id,
    target_mko_id: task.target_mko_id,
    candidate_id: task.target_mko_id,
    candidate_artifact: {
      title: 'Protocol-level candidate',
      claims: ['Candidate claim.'],
    },
    uncertainties: [],
    evidence_refs: [],
    proposed_relations: [],
  }
}

const valid = await validateCandidateEnvelope(validCandidate(), task, contract)
assert.equal(valid.ok, true, valid.errors.join('\n'))

const wrongTask = validCandidate()
wrongTask.task_id = 'task-atlas-wrong'
assert.equal((await validateCandidateEnvelope(wrongTask, task, contract)).ok, false)

const wrongTarget = validCandidate()
wrongTarget.target_mko_id = 'mko-wrong-target'
assert.equal((await validateCandidateEnvelope(wrongTarget, task, contract)).ok, false)

const wrongCandidateId = validCandidate()
wrongCandidateId.candidate_id = 'mko-other'
assert.equal((await validateCandidateEnvelope(wrongCandidateId, task, contract)).ok, false)

const canonicalState = { ...validCandidate(), canonical_state: 'canonical' }
assert.equal((await validateCandidateEnvelope(canonicalState, task, contract)).ok, false)

const reasoningTrace = { ...validCandidate(), reasoning_trace: 'must not cross the protocol boundary' }
assert.equal((await validateCandidateEnvelope(reasoningTrace, task, contract)).ok, false)

const nestedCanonicalState = validCandidate()
nestedCanonicalState.candidate_artifact.metadata = { canonical_state: 'canonical' }
assert.equal((await validateCandidateEnvelope(nestedCanonicalState, task, contract)).ok, false)

const nestedReasoningTrace = validCandidate()
nestedReasoningTrace.candidate_artifact.analysis = { reasoning_trace: 'must not be hidden in candidate payload' }
assert.equal((await validateCandidateEnvelope(nestedReasoningTrace, task, contract)).ok, false)

console.log('Builder candidate envelope tests passed.')
