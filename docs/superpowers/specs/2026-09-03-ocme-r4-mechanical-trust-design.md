# OCME R4 Mechanical Trust Integration — Design

## Goal

Promote the existing deterministic OCME checks from repository-wide pass/fail commands into a candidate-bound Mechanical Trust Report without granting mathematical truth or canonicalization authority.

## Invariants

1. `mechanical PASS != mathematical truth`.
2. Every report binds to one `candidate_revision_id`, `candidate_sha256`, and `candidate_artifact_sha256`.
3. Every gate has an explicit verification `scope`; a gate may only support claims inside that scope.
4. Raw stdout/stderr are not embedded in the report. Only hashes, exit codes, duration, command identity, and tool provenance are retained.
5. A stale report whose candidate hash no longer matches the candidate is invalid.
6. A report cannot contain `mathematically_true`, `canonical`, `canonical_state`, or `canonical_verdict` authority fields.
7. R4 does not mutate SEDB-Math state, Atlas, MKO, Evidence, or formal sources.
8. R4 does not include R5 risk/diversity or frontier adjudication.

## Report Layers

### Candidate binding

- candidate revision id
- candidate id / target MKO id
- stable candidate SHA-256
- stable candidate artifact SHA-256
- optional source revision / repository head

### Gate results

Each gate records:

- gate id
- scope
- status: `pass | fail`
- executable / args identity
- exit code
- stdout SHA-256
- stderr SHA-256
- duration ms
- tool name / version where known

### Report verdict

`mechanical_status` is only:

- `pass`: all required mechanical gates passed
- `fail`: at least one required gate failed

It never means mathematical truth, semantic correctness, evidence sufficiency, or canonical eligibility.

## Initial gate registry

R4 reuses existing deterministic leaf checks:

- formula drift check
- Python replay
- Lean source gate
- Evidence address/build check
- MKO validation
- Architecture validation
- Atlas validation
- SEDB-Math validation
- Materialization runtime validation
- Materialization export check
- DBV runtime validation
- repository test suite

The separate GitHub Lean workflow remains external formal-build evidence and is not silently folded into `lean_source_gate`.

## Runner

`runtime/trust/mechanical-runner.js` executes a supplied gate registry sequentially and returns a structured report. The runner accepts an injected executor for unit tests, while the production executor uses `child_process.spawn` with no shell interpolation.

## Scope

R4 ends when:

- report schema and candidate-hash validation exist,
- deterministic gate adapters exist,
- per-candidate runner exists,
- stale/tampered reports are rejected,
- current repository checks can produce a report,
- `npm run check` validates the R4 contracts,
- canonical data remains unchanged.
