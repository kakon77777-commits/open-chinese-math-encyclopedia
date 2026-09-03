import assert from 'node:assert/strict'
import { loadMaterializationTasks } from '../lib/materialization-task-store.js'
import { sha256CanonicalJson } from '../lib/canonical-json.js'
import { validateMechanicalTrustReport } from '../lib/mechanical-trust-validation.js'

const [task] = await loadMaterializationTasks()
const candidate = {
  schema_version: 'ocme-candidate-envelope-v0.1',
  candidate_revision_id: `candidate-${task.task_id}-r0`,
  task_id: task.task_id,
  target_mko_id: task.target_mko_id,
  candidate_id: task.target_mko_id,
  candidate_artifact: { title: 'Mechanical trust negative fixture', claims: ['Fixture claim.'] },
  uncertainties: [],
  evidence_refs: [],
  proposed_relations: [],
}

function report() {
  return {
    schema_version: 'ocme-mechanical-trust-report-v0.1',
    report_id: `mechanical-${candidate.candidate_revision_id}`,
    epistemic_scope: 'mechanical_only',
    candidate_revision_id: candidate.candidate_revision_id,
    candidate_id: candidate.candidate_id,
    target_mko_id: candidate.target_mko_id,
    candidate_sha256: sha256CanonicalJson(candidate),
    candidate_artifact_sha256: sha256CanonicalJson(candidate.candidate_artifact),
    source_revision: 'source-a',
    mechanical_status: 'pass',
    gates: [{
      gate_id: 'candidate_envelope',
      scope: ['candidate envelope schema'],
      status: 'pass',
      executable: 'internal',
      args: [],
      exit_code: 0,
      stdout_sha256: sha256CanonicalJson('ok'),
      stderr_sha256: sha256CanonicalJson(''),
      duration_ms: 0,
      tool: { name: 'ocme-runtime', version: 'r4-v0.1' },
    }],
  }
}

const staleCandidate = report()
staleCandidate.candidate_sha256 = '0'.repeat(64)
assert.equal((await validateMechanicalTrustReport(staleCandidate, candidate)).ok, false)

const staleArtifact = report()
staleArtifact.candidate_artifact_sha256 = '1'.repeat(64)
assert.equal((await validateMechanicalTrustReport(staleArtifact, candidate)).ok, false)

const duplicateGate = report()
duplicateGate.gates.push(structuredClone(duplicateGate.gates[0]))
assert.equal((await validateMechanicalTrustReport(duplicateGate, candidate)).ok, false)

const falsePass = report()
falsePass.gates[0].status = 'fail'
falsePass.gates[0].exit_code = 1
assert.equal((await validateMechanicalTrustReport(falsePass, candidate)).ok, false)

const truthAuthority = { ...report(), mathematically_true: true }
assert.equal((await validateMechanicalTrustReport(truthAuthority, candidate)).ok, false)

const canonicalAuthority = { ...report(), canonical_state: 'canonical' }
assert.equal((await validateMechanicalTrustReport(canonicalAuthority, candidate)).ok, false)

const staleSource = report()
assert.equal((await validateMechanicalTrustReport(staleSource, candidate, { expectedSourceRevision: 'source-b' })).ok, false)

console.log('Mechanical trust negative tests passed.')
