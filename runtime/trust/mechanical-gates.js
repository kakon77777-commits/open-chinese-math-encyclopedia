const GATE_KEYS = new Set(['gate_id', 'scope', 'executable', 'args', 'tool_name'])

export const MECHANICAL_GATES = Object.freeze([
  {
    gate_id: 'formula_drift',
    scope: ['canonical formula source/generator drift for current repository MKO objects'],
    executable: 'node',
    args: ['scripts/compile-formulas.mjs', '--check'],
    tool_name: 'node',
  },
  {
    gate_id: 'python_replay',
    scope: ['finite Python computational replay suites', 'not universal mathematical proof'],
    executable: 'python',
    args: ['reference/python/verify_all.py'],
    tool_name: 'python',
  },
  {
    gate_id: 'lean_source_gate',
    scope: ['Lean source/toolchain/import/placeholder source checks', 'not formal compilation'],
    executable: 'node',
    args: ['scripts/verify-lean-sources.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'evidence_integrity',
    scope: ['content-addressed Evidence Object regeneration and address consistency'],
    executable: 'node',
    args: ['scripts/build-evidence-v0.7.mjs', '--check'],
    tool_name: 'node',
  },
  {
    gate_id: 'mko_validation',
    scope: ['canonical MKO schema and dependency validation for current repository data'],
    executable: 'node',
    args: ['scripts/validate-v0.7.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'architecture_validation',
    scope: ['mathematical architecture profiles, domains, methods, paths and difficulty dimensions'],
    executable: 'node',
    args: ['scripts/validate-architecture-v0.9.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'atlas_validation',
    scope: ['Core Mathematical Atlas identities, maturity rules and prerequisite graph invariants'],
    executable: 'node',
    args: ['scripts/validate-atlas-v0.10.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'sedb_math_validation',
    scope: ['SEDB-Math state/event schema and transition invariants'],
    executable: 'node',
    args: ['scripts/validate-sedb-math.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'materialization_validation',
    scope: ['Atlas-derived materialization task identity and dependency-safe scheduling invariants'],
    executable: 'node',
    args: ['scripts/validate-materialization-runtime.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'materialization_export',
    scope: ['committed materialization JSONL byte equivalence to fresh Atlas derivation'],
    executable: 'node',
    args: ['scripts/export-materialization-tasks.mjs', '--check'],
    tool_name: 'node',
  },
  {
    gate_id: 'dbv_validation',
    scope: ['offline Designer/Builder/Verifier protocol fixtures and deterministic Fake Provider behavior'],
    executable: 'node',
    args: ['scripts/validate-dbv-runtime.mjs'],
    tool_name: 'node',
  },
  {
    gate_id: 'repository_tests',
    scope: ['repository syntax, positive and negative regression test suites'],
    executable: 'npm',
    args: ['test'],
    tool_name: 'npm',
  },
])

export function validateMechanicalGateRegistry(gates) {
  const errors = []
  if (!Array.isArray(gates) || gates.length === 0) return { ok: false, errors: ['mechanical gate registry must be a non-empty array'] }

  const seen = new Set()
  for (const [index, gate] of gates.entries()) {
    const prefix = `gate[${index}]`
    if (!gate || typeof gate !== 'object' || Array.isArray(gate)) {
      errors.push(`${prefix}: must be an object`)
      continue
    }
    for (const key of Object.keys(gate)) {
      if (!GATE_KEYS.has(key)) errors.push(`${prefix}: unsupported property ${key}`)
    }
    if (typeof gate.gate_id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(gate.gate_id)) errors.push(`${prefix}: invalid gate_id`)
    else if (seen.has(gate.gate_id)) errors.push(`${prefix}: duplicate gate_id ${gate.gate_id}`)
    else seen.add(gate.gate_id)

    if (!Array.isArray(gate.scope) || gate.scope.length === 0 || gate.scope.some(item => typeof item !== 'string' || item.length === 0)) {
      errors.push(`${prefix}: scope must be a non-empty string array`)
    } else if (new Set(gate.scope).size !== gate.scope.length) {
      errors.push(`${prefix}: scope entries must be unique`)
    }
    if (typeof gate.executable !== 'string' || gate.executable.length === 0 || /\s/.test(gate.executable)) errors.push(`${prefix}: executable must be one token`)
    if (!Array.isArray(gate.args) || gate.args.some(item => typeof item !== 'string')) errors.push(`${prefix}: args must be a string array`)
    if (typeof gate.tool_name !== 'string' || gate.tool_name.length === 0) errors.push(`${prefix}: tool_name is required`)
  }

  return { ok: errors.length === 0, errors }
}
