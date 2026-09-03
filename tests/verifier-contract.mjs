import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { validateVerificationReport } from '../lib/verification-report-validation.js'

const [task] = await loadMaterializationTasks()
const candidate = {
  schema_version: 'ocme-candidate-envelope-v0.1',
  candidate_revision_id: `candidate-${task.task_id}-r0`,
  task_id: task.task_id,
  target_mko_id: task.target_mko_id,
  candidate_id: task.target_mko_id,
  candidate_artifact: { title: 'Candidate', claims: ['Candidate claim.'] },
  uncertainties: [],
  evidence_refs: [],
  proposed_relations: [],
}

function validReport() {
  return {
    schema_version: 'ocme-verification-report-v0.1',
    report_id: `verification-${candidate.candidate_revision_id}`,
    task_id: task.task_id,
    target_candidate_revision_id: candidate.candidate_revision_id,
    objections: [
      {
        objection_id: `objection-${candidate.candidate_revision_id}-001`,
        target_candidate_revision_id: candidate.candidate_revision_id,
        target_candidate_id: candidate.candidate_id,
        type: 'missing_assumption',
        severity: 'major',
        reason: 'A required assumption is not explicit.',
        evidence_refs: [],
        status: 'open',
      },
    ],
    verification_passes: ['identity_binding'],
    counterexample_attempts: [],
    recomputed_results: [],
    unresolved_risks: ['Assumption completeness remains unresolved.'],
  }
}

const valid = await validateVerificationReport(validReport(), task, candidate)
assert.equal(valid.ok, true, valid.errors.join('\n'))

const wrongTask = validReport()
wrongTask.task_id = 'task-atlas-wrong'
assert.equal((await validateVerificationReport(wrongTask, task, candidate)).ok, false)

const wrongRevision = validReport()
wrongRevision.target_candidate_revision_id = `candidate-${task.task_id}-r99`
assert.equal((await validateVerificationReport(wrongRevision, task, candidate)).ok, false)

const wrongCandidate = validReport()
wrongCandidate.objections[0].target_candidate_id = 'mko-other'
assert.equal((await validateVerificationReport(wrongCandidate, task, candidate)).ok, false)

const preResolved = validReport()
preResolved.objections[0].status = 'resolved'
assert.equal((await validateVerificationReport(preResolved, task, candidate)).ok, false)

const canonicalVerdict = { ...validReport(), canonical_verdict: 'accept' }
assert.equal((await validateVerificationReport(canonicalVerdict, task, candidate)).ok, false)

const reasoningTrace = { ...validReport(), reasoning_trace: 'must not cross the protocol boundary' }
assert.equal((await validateVerificationReport(reasoningTrace, task, candidate)).ok, false)

console.log('Verifier report contract tests passed.')
