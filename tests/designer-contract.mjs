import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { validateDesignContract } from '../lib/design-contract-validation.js'

const [task] = await loadMaterializationTasks()

function validContract() {
  return {
    schema_version: 'ocme-design-contract-v0.1',
    contract_id: `contract-${task.task_id}`,
    task_id: task.task_id,
    target_mko_id: task.target_mko_id,
    required_claims: ['Define the target object precisely.'],
    required_prerequisites: [...task.prerequisite_atlas_ids],
    evidence_requirements: ['At least one addressable source or deterministic evidence path.'],
    counterexample_classes: ['Boundary and degenerate cases.'],
    formalization_requirements: [],
    failure_tests: ['Reject unsupported generalization.'],
    completion_criteria: ['All required claims are explicit and reviewable.'],
    risk_notes: [],
  }
}

const valid = await validateDesignContract(validContract(), task)
assert.equal(valid.ok, true, valid.errors.join('\n'))

const missingCompletion = validContract()
missingCompletion.completion_criteria = []
assert.equal((await validateDesignContract(missingCompletion, task)).ok, false)

const wrongTask = validContract()
wrongTask.task_id = 'task-atlas-wrong'
assert.equal((await validateDesignContract(wrongTask, task)).ok, false)

const wrongTarget = validContract()
wrongTarget.target_mko_id = 'mko-wrong-target'
assert.equal((await validateDesignContract(wrongTarget, task)).ok, false)

const wrongPrerequisites = validContract()
wrongPrerequisites.required_prerequisites = ['atlas-does-not-match']
assert.equal((await validateDesignContract(wrongPrerequisites, task)).ok, false)

const canonicalVerdict = { ...validContract(), canonical_verdict: 'accept' }
assert.equal((await validateDesignContract(canonicalVerdict, task)).ok, false)

const reasoningTrace = { ...validContract(), reasoning_trace: 'hidden reasoning must not cross the protocol boundary' }
assert.equal((await validateDesignContract(reasoningTrace, task)).ok, false)

console.log('Designer contract validation tests passed.')
