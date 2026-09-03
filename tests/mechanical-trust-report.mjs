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
  candidate_artifact: { title: 'Mechanical trust fixture', claims: ['Fixture claim.'] },
  uncertainties: [],
  evidence_refs: [],
  proposed_relations: [],
}

const reordered = {
  proposed_relations: [],
  evidence_refs: [],
  uncertainties: [],
  candidate_artifact: { claims: ['Fixture claim.'], title: 'Mechanical trust fixture' },
  candidate_id: task.target_mko_id,
  target_mko_id: task.target_mko_id,
  task_id: task.task_id,
  candidate_revision_id: `candidate-${task.task_id}-r0`,
  schema_version: 'ocme-candidate-envelope-v0.1',
}
assert.equal(sha256CanonicalJson(candidate), sha256CanonicalJson(reordered))

const report = {
  schema_version: 'ocme-mechanical-trust-report-v0.1',
  report_id: `mechanical-${candidate.candidate_revision_id}`,
  epistemic_scope: 'mechanical_only',
  candidate_revision_id: candidate.candidate_revision_id,
  candidate_id: candidate.candidate_id,
  target_mko_id: candidate.target_mko_id,
  candidate_sha256: sha256CanonicalJson(candidate),
  candidate_artifact_sha256: sha256CanonicalJson(candidate.candidate_artifact),
  source_revision: 'fixture-source-revision',
  mechanical_status: 'pass',
  gates: [
    {
      gate_id: 'candidate_envelope',
      scope: ['candidate envelope schema', 'task and target identity binding'],
      status: 'pass',
      executable: 'internal',
      args: [],
      exit_code: 0,
      stdout_sha256: sha256CanonicalJson('candidate envelope valid'),
      stderr_sha256: sha256CanonicalJson(''),
      duration_ms: 0,
      tool: { name: 'ocme-runtime', version: 'r4-v0.1' },
    },
  ],
}

const validation = await validateMechanicalTrustReport(report, candidate)
assert.equal(validation.ok, true, validation.errors.join('\n'))
console.log('Mechanical trust report binding tests passed.')
