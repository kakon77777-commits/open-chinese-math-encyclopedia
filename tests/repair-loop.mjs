import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { mergeVerificationIntoLedger } from '../runtime/production/objection-ledger.js'
import { validateRepairPatch } from '../lib/repair-patch-validation.js'
import { applyRepairPatch } from '../runtime/production/repair.js'

const [task] = await loadMaterializationTasks()
const candidate = {
  schema_version: 'ocme-candidate-envelope-v0.1',
  candidate_revision_id: `candidate-${task.task_id}-r0`,
  task_id: task.task_id,
  target_mko_id: task.target_mko_id,
  candidate_id: task.target_mko_id,
  candidate_artifact: { title: 'Candidate', claims: ['Claim without an explicit assumption.'] },
  uncertainties: ['Assumption completeness is unresolved.'],
  evidence_refs: [],
  proposed_relations: [],
}

const objection1 = {
  objection_id: `objection-${candidate.candidate_revision_id}-001`,
  target_candidate_revision_id: candidate.candidate_revision_id,
  target_candidate_id: candidate.candidate_id,
  type: 'missing_assumption',
  severity: 'critical',
  reason: 'The domain assumption must be explicit.',
  evidence_refs: [],
  status: 'open',
}
const objection2 = {
  objection_id: `objection-${candidate.candidate_revision_id}-002`,
  target_candidate_revision_id: candidate.candidate_revision_id,
  target_candidate_id: candidate.candidate_id,
  type: 'ambiguity',
  severity: 'minor',
  reason: 'The title could be more explicit.',
  evidence_refs: [],
  status: 'open',
}

function report(objections) {
  return {
    schema_version: 'ocme-verification-report-v0.1',
    report_id: `verification-${candidate.candidate_revision_id}`,
    task_id: task.task_id,
    target_candidate_revision_id: candidate.candidate_revision_id,
    objections,
    verification_passes: [],
    counterexample_attempts: [],
    recomputed_results: [],
    unresolved_risks: [],
  }
}

const ledger1 = mergeVerificationIntoLedger([], report([objection1]))
assert.equal(ledger1.length, 1)
assert.equal(ledger1[0].status, 'open')

const ledger2 = mergeVerificationIntoLedger(ledger1, report([objection2]))
assert.equal(ledger2.length, 2)
assert.equal(ledger2[0].objection_id, objection1.objection_id)
assert.equal(ledger2[1].objection_id, objection2.objection_id)
assert.throws(() => mergeVerificationIntoLedger(ledger2, report([objection1])), /duplicate objection_id/)

function validPatch() {
  return {
    schema_version: 'ocme-repair-patch-v0.1',
    patch_id: `repair-${candidate.candidate_revision_id}-to-r1`,
    task_id: task.task_id,
    source_candidate_revision_id: candidate.candidate_revision_id,
    next_candidate_revision_id: `candidate-${task.task_id}-r1`,
    candidate_id: candidate.candidate_id,
    resolves_objections: [objection1.objection_id],
    resolution_evidence: [
      {
        objection_id: objection1.objection_id,
        note: 'The repaired claim now states the required domain assumption explicitly.',
      },
    ],
    operations: [
      {
        op: 'replace',
        path: '/candidate_artifact/claims/0',
        value: 'For the stated domain, the repaired claim holds under the explicit assumption.',
      },
    ],
    evidence_updates: [],
    dependency_impact: [],
  }
}

const valid = await validateRepairPatch(validPatch(), { task, candidate, ledger: ledger2 })
assert.equal(valid.ok, true, valid.errors.join('\n'))

const missingEvidence = validPatch()
delete missingEvidence.resolution_evidence
assert.equal((await validateRepairPatch(missingEvidence, { task, candidate, ledger: ledger2 })).ok, false)

const unknownObjection = validPatch()
unknownObjection.resolves_objections = ['objection-does-not-exist']
unknownObjection.resolution_evidence = [{ objection_id: 'objection-does-not-exist', note: 'No such objection.' }]
assert.equal((await validateRepairPatch(unknownObjection, { task, candidate, ledger: ledger2 })).ok, false)

const identityMutation = validPatch()
identityMutation.operations = [{ op: 'replace', path: '/candidate_id', value: 'mko-other' }]
assert.equal((await validateRepairPatch(identityMutation, { task, candidate, ledger: ledger2 })).ok, false)

const outsideRoot = validPatch()
outsideRoot.operations = [{ op: 'replace', path: '/schema_version', value: 'other' }]
assert.equal((await validateRepairPatch(outsideRoot, { task, candidate, ledger: ledger2 })).ok, false)

const hiddenCanonicalState = validPatch()
hiddenCanonicalState.operations = [
  {
    op: 'add',
    path: '/candidate_artifact/metadata',
    value: { canonical_state: 'canonical' },
  },
]
assert.equal((await validateRepairPatch(hiddenCanonicalState, { task, candidate, ledger: ledger2 })).ok, false)

const hiddenReasoningTrace = validPatch()
hiddenReasoningTrace.operations = [
  {
    op: 'add',
    path: '/candidate_artifact/analysis',
    value: { nested: { reasoning_trace: 'must not cross the protocol boundary' } },
  },
]
assert.equal((await validateRepairPatch(hiddenReasoningTrace, { task, candidate, ledger: ledger2 })).ok, false)

const sameRevision = validPatch()
sameRevision.next_candidate_revision_id = candidate.candidate_revision_id
assert.equal((await validateRepairPatch(sameRevision, { task, candidate, ledger: ledger2 })).ok, false)

const originalCandidate = structuredClone(candidate)
const originalLedger = structuredClone(ledger2)
const applied = await applyRepairPatch(candidate, ledger2, validPatch(), { task })
assert.deepEqual(candidate, originalCandidate)
assert.deepEqual(ledger2, originalLedger)
assert.equal(applied.candidate.candidate_revision_id, `candidate-${task.task_id}-r1`)
assert.equal(applied.candidate.task_id, candidate.task_id)
assert.equal(applied.candidate.target_mko_id, candidate.target_mko_id)
assert.equal(applied.candidate.candidate_id, candidate.candidate_id)
assert.match(applied.candidate.candidate_artifact.claims[0], /explicit assumption/)
assert.equal(applied.ledger.find(item => item.objection_id === objection1.objection_id).status, 'resolved')
assert.equal(applied.ledger.find(item => item.objection_id === objection2.objection_id).status, 'open')

const alreadyResolvedPatch = validPatch()
const resolvedLedger = applied.ledger
assert.equal((await validateRepairPatch(alreadyResolvedPatch, { task, candidate, ledger: resolvedLedger })).ok, false)

console.log('Objection ledger and repair patch tests passed.')
