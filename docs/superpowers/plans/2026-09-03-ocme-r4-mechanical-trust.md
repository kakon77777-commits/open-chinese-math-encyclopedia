# OCME R4 Mechanical Trust Integration — Implementation Plan

## Baseline

Base: verified `main@41c80cec6e6bd6c0a3c7dfe3af62ce996fdbc978`.

## Task 1 — Trust report schema and candidate hash binding

RED:
- report validator module absent;
- reject stale candidate hash;
- reject stale candidate artifact hash;
- reject forbidden mathematical/canonical authority fields;
- require explicit gate scope and tool provenance.

GREEN:
- `schemas/mechanical-trust-report.schema.json`
- `lib/mechanical-trust-validation.js`
- `lib/canonical-json.js` (stable JSON + SHA-256)
- `tests/mechanical-trust-report.mjs`
- `tests/mechanical-trust-negative.mjs`

## Task 2 — Mechanical gate registry / executor

RED:
- registry module absent;
- require stable gate IDs;
- require non-empty scopes;
- no shell command strings;
- output retained only by hash.

GREEN:
- `runtime/trust/mechanical-gates.js`
- `runtime/trust/command-executor.js`
- `tests/mechanical-gates.mjs`

## Task 3 — Per-candidate mechanical runner

RED:
- runner absent;
- one failed gate must produce `mechanical_status=fail`;
- report must bind candidate hashes before and after execution;
- candidate mutation during execution must reject report;
- no canonical/truth verdict.

GREEN:
- `runtime/trust/mechanical-runner.js`
- `tests/mechanical-runner.mjs`

## Task 4 — Repository integration

- Add `scripts/validate-mechanical-trust.mjs` using a deterministic R3 fixture candidate.
- Add syntax/test/check integration.
- Run current leaf gates through R4 runner without recursive `npm run check`.
- Preserve separate Lean CI as external formal-build verification.
- Full scope audit.
- Add machine-readable `artifacts/r4-mechanical-trust-validation.json` only after implementation head passes OCME CI + Lean CI.
- Verify artifact HEAD again.

## Explicit non-goals

- no R5 risk routing
- no diversity profile
- no live AI provider
- no frontier adjudication
- no canonicalization policy
- no canonical data mutation
