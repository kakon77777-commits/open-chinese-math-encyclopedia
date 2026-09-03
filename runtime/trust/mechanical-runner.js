import { validateCandidateEnvelope } from '../../lib/candidate-envelope-validation.js'
import { sha256CanonicalJson } from '../../lib/canonical-json.js'
import { validateMechanicalTrustReport } from '../../lib/mechanical-trust-validation.js'
import { executeCommandGate } from './command-executor.js'
import { validateMechanicalGateRegistry } from './mechanical-gates.js'

const INTERNAL_TOOL = Object.freeze({ name: 'ocme-runtime', version: 'r4-v0.1' })

function internalCandidateGate(validation) {
  const ok = validation.ok
  return {
    gate_id: 'candidate_envelope',
    scope: ['candidate envelope schema', 'task and target identity binding', 'protocol authority boundary'],
    status: ok ? 'pass' : 'fail',
    executable: 'internal',
    args: [],
    exit_code: ok ? 0 : 1,
    stdout_sha256: sha256CanonicalJson(ok ? { result: 'candidate envelope valid' } : { result: 'candidate envelope invalid' }),
    stderr_sha256: sha256CanonicalJson(ok ? [] : validation.errors),
    duration_ms: 0,
    tool: structuredClone(INTERNAL_TOOL),
  }
}

function sameStringArray(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((item, index) => item === right[index])
}

function assertExecutorResultBound(gate, result) {
  const matches = result
    && typeof result === 'object'
    && !Array.isArray(result)
    && result.gate_id === gate.gate_id
    && sameStringArray(result.scope, gate.scope)
    && result.executable === gate.executable
    && sameStringArray(result.args, gate.args)
    && result.tool?.name === gate.tool_name

  if (!matches) throw new Error(`executor result does not match gate definition: ${gate.gate_id}`)
}

export async function runMechanicalTrust({
  candidate,
  task,
  contract,
  sourceRevision,
  gates = [],
  executor = executeCommandGate,
}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new TypeError('candidate must be an object')
  if (!task || typeof task !== 'object' || Array.isArray(task)) throw new TypeError('task must be an object')
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) throw new TypeError('contract must be an object')
  if (typeof sourceRevision !== 'string' || sourceRevision.length === 0) throw new TypeError('sourceRevision must be a non-empty string')
  if (typeof executor !== 'function') throw new TypeError('executor must be a function')

  const registryValidation = validateMechanicalGateRegistry(gates)
  if (!registryValidation.ok && gates.length > 0) throw new Error(registryValidation.errors.join('\n'))

  const candidateHashBefore = sha256CanonicalJson(candidate)
  const artifactHashBefore = sha256CanonicalJson(candidate.candidate_artifact)
  const candidateValidation = await validateCandidateEnvelope(candidate, task, contract)
  const gateResults = [internalCandidateGate(candidateValidation)]

  if (candidateValidation.ok) {
    for (const gate of gates) {
      const result = await executor(structuredClone(gate))
      assertExecutorResultBound(gate, result)
      gateResults.push(structuredClone(result))
    }
  }

  const candidateHashAfter = sha256CanonicalJson(candidate)
  const artifactHashAfter = sha256CanonicalJson(candidate.candidate_artifact)
  if (candidateHashAfter !== candidateHashBefore || artifactHashAfter !== artifactHashBefore) {
    throw new Error('candidate mutated during mechanical verification')
  }

  const report = {
    schema_version: 'ocme-mechanical-trust-report-v0.1',
    report_id: `mechanical-${candidate.candidate_revision_id}`,
    epistemic_scope: 'mechanical_only',
    candidate_revision_id: candidate.candidate_revision_id,
    candidate_id: candidate.candidate_id,
    target_mko_id: candidate.target_mko_id,
    candidate_sha256: candidateHashBefore,
    candidate_artifact_sha256: artifactHashBefore,
    source_revision: sourceRevision,
    mechanical_status: gateResults.every(gate => gate.status === 'pass') ? 'pass' : 'fail',
    gates: gateResults,
  }

  const reportValidation = await validateMechanicalTrustReport(report, candidate, { expectedSourceRevision: sourceRevision })
  if (!reportValidation.ok) throw new Error(`Mechanical trust report invalid:\n${reportValidation.errors.join('\n')}`)
  return report
}
