# OCME R3 DBV Protocol Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline, provider-neutral Designer / Builder / Verifier protocol runtime with explicit objections, repair patches, deterministic convergence, and a Fake Provider end-to-end loop.

**Architecture:** R3 sits downstream of immutable R2 materialization tasks and upstream of the future R4 Trust Plane. Role outputs are strict protocol envelopes, not canonical MKOs. Each role is schema-validated and semantically bound to the input task/candidate; repair is explicit and objection-driven; convergence is deterministic; the Fake Provider is fixture-driven and network-free.

**Tech Stack:** Node.js ESM, Ajv 2020, JSON Schema draft 2020-12, existing OCME `lib/schema-validation.js`, `node:assert/strict`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-ocme-r3-dbv-protocol-runtime-design.md`

## Global Constraints

- Baseline is `main@2892484bba1c858b3034399e4ad4358905b1de72`.
- Do not modify canonical Atlas, MKO, Evidence, SEDB-Math, Architecture, or `formal/` data.
- No live AI provider, network request, credential, or provider SDK in R3.
- R2 materialization task is immutable input.
- Candidate is never canonical in R3.
- No role schema contains hidden reasoning / chain-of-thought fields.
- No production code before the corresponding RED test fails for the intended reason.
- Each task ends with full regression on its branch HEAD before proceeding.

---

### Task 1: Design Contract

**Files:**
- Create: `tests/designer-contract.mjs`
- Create after RED: `schemas/design-contract.schema.json`
- Create after RED: `lib/design-contract-validation.js`

**Interfaces:**
- Consumes: R2 materialization task object.
- Produces: `validateDesignContract(contract, task, { schema }) -> { ok, errors }`.

- [ ] **Step 1: Write RED test**

Test one real R2 task and assert a valid contract is accepted. Add negative cases for:

```text
missing completion_criteria
wrong task_id
wrong target_mko_id
wrong required_prerequisites
injected canonical_verdict
injected reasoning_trace
```

- [ ] **Step 2: Put the RED test in `npm test` and verify expected failure**

Expected failure:

```text
ERR_MODULE_NOT_FOUND: lib/design-contract-validation.js
```

- [ ] **Step 3: Add strict schema and minimal semantic validator**

Schema required fields:

```text
schema_version
contract_id
task_id
target_mko_id
required_claims
required_prerequisites
evidence_requirements
counterexample_classes
formalization_requirements
failure_tests
completion_criteria
risk_notes
```

- [ ] **Step 4: Run PR CI and verify GREEN**

Expected:

```text
designer-contract.mjs PASS
npm run check PASS
```

- [ ] **Step 5: Commit GREEN**

---

### Task 2: Candidate and Verification Contracts

**Files:**
- Create: `tests/builder-contract.mjs`
- Create: `tests/verifier-contract.mjs`
- Create after RED: `schemas/candidate-envelope.schema.json`
- Create after RED: `schemas/verification-objection.schema.json`
- Create after RED: `schemas/verification-report.schema.json`
- Create after RED: `lib/candidate-envelope-validation.js`
- Create after RED: `lib/verification-report-validation.js`

**Interfaces:**
- Produces: `validateCandidateEnvelope(candidate, task, contract, { schema })`.
- Produces: `validateVerificationReport(report, task, candidate, { reportSchema, objectionSchema })`.

- [ ] **Step 1: Write candidate RED test**

Negative cases:

```text
wrong task_id
wrong target_mko_id
candidate_id != task.target_mko_id
canonical_state injection
reasoning_trace injection
```

- [ ] **Step 2: Verify candidate RED fails because validator module is missing**

- [ ] **Step 3: Implement candidate schema / validator minimally and verify GREEN**

- [ ] **Step 4: Write verifier RED test**

Negative cases:

```text
wrong task_id
wrong candidate revision
objection targeting another candidate
verifier emits resolved objection directly
canonical_verdict injection
reasoning_trace injection
```

- [ ] **Step 5: Verify verifier RED fails because validator module is missing**

- [ ] **Step 6: Implement objection/report schemas and validator minimally**

- [ ] **Step 7: Run full regression and commit GREEN**

---

### Task 3: Objection Ledger and Repair Patch

**Files:**
- Create: `tests/repair-loop.mjs`
- Create after RED: `schemas/repair-patch.schema.json`
- Create after RED: `runtime/production/repair.js`
- Create after RED: `runtime/production/objection-ledger.js`
- Create after RED: `lib/repair-patch-validation.js`

**Interfaces:**
- Produces: `mergeVerificationIntoLedger(previousLedger, verificationReport)`.
- Produces: `validateRepairPatch(patch, { task, candidate, ledger, schema })`.
- Produces: `applyRepairPatch(candidate, ledger, patch) -> { candidate, ledger }`.

- [ ] **Step 1: Write RED test**

Test:

```text
duplicate objection IDs rejected
prior objections cannot disappear
open -> resolved requires repair patch
repair must reference existing open objection
repair cannot change task_id / target_mko_id / candidate_id
repair path outside allowed candidate fields rejected
next revision must differ from source revision
resolution_evidence required
```

- [ ] **Step 2: Verify RED fails on missing repair/ledger modules**

- [ ] **Step 3: Implement strict schema, append-preserving ledger, and safe patch application**

Allowed patch roots:

```text
/candidate_artifact
/uncertainties
/evidence_refs
/proposed_relations
```

- [ ] **Step 4: Verify repair produces a new candidate revision and only named objections resolve**

- [ ] **Step 5: Run full regression and commit GREEN**

---

### Task 4: Deterministic Convergence / Escalation

**Files:**
- Create: `tests/convergence.mjs`
- Create after RED: `runtime/production/convergence.js`

**Interfaces:**
- Produces: `evaluateConvergence({ ledger, attempt, maxAttempts, majorThreshold, mechanicalState })`.

- [ ] **Step 1: Write RED test**

Cases:

```text
mechanical failed -> blocked
open critical + attempts remain -> continue
open critical + max attempts reached -> escalation_required
major count above threshold -> continue / escalate by attempt
no blocking objections -> converged
result never equals canonical
```

- [ ] **Step 2: Verify RED fails because module is missing**

- [ ] **Step 3: Implement minimal deterministic policy**

- [ ] **Step 4: Run full regression and commit GREEN**

---

### Task 5: Provider Interface, Fake Provider, and Offline DBV Loop

**Files:**
- Create: `tests/provider-interface.mjs`
- Create: `tests/dbv-loop.mjs`
- Create after RED: `runtime/providers/provider-interface.js`
- Create after RED: `runtime/providers/fake-provider.js`
- Create after RED: `runtime/production/designer.js`
- Create after RED: `runtime/production/builder.js`
- Create after RED: `runtime/production/verifier.js`
- Create after RED: `runtime/production/dbv-loop.js`

**Interfaces:**
- `assertProviderAdapter(provider)`.
- `FakeProvider.run(request)`.
- `runDesigner({ provider, task, context })`.
- `runBuilder({ provider, task, contract, context })`.
- `runVerifier({ provider, task, contract, candidate, context })`.
- `runDbvLoop({ provider, task, contexts, maxAttempts, majorThreshold })`.

- [ ] **Step 1: Write provider RED test**

Assert malformed adapters / requests are rejected and Fake Provider module is absent.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement provider interface + deterministic fixture-driven Fake Provider**

No network APIs, environment credentials, or random behavior.

- [ ] **Step 4: Write end-to-end DBV RED test**

Fixture path:

```text
design -> candidate revision 0 -> critical objection -> repair patch -> candidate revision 1 -> clean verification -> converged
```

Assert:

```text
input task deep-equal before/after
all outputs schema-valid
objection remains in ledger as resolved
attempt count == 2
final result == converged
no output contains canonical verdict/state
```

Also test a fixture that never resolves and reaches `escalation_required`.

- [ ] **Step 5: Verify DBV RED fails on missing orchestration module**

- [ ] **Step 6: Implement role wrappers and loop minimally**

- [ ] **Step 7: Run full regression and commit GREEN**

---

### Task 6: Repository Integration and R3 Acceptance Evidence

**Files:**
- Create: `scripts/validate-dbv-runtime.mjs`
- Modify: `package.json`
- Create after validated implementation: `artifacts/r3-dbv-validation.json`

**Interfaces:**
- Adds `validate:dbv` to repository checks.
- Adds all R3 files to syntax gate and tests to `npm test`.

- [ ] **Step 1: Add standalone validator**

Validator must run one deterministic successful Fake Provider loop and one deterministic escalation fixture without touching canonical data.

- [ ] **Step 2: Integrate syntax / tests / `validate:dbv` into `npm run check`**

- [ ] **Step 3: Verify integrated branch HEAD**

Require:

```text
OCME CI PASS
Lean CI PASS
```

- [ ] **Step 4: Scope verification**

Require zero changes under:

```text
public/data/mko/
public/data/evidence/
public/data/architecture/
public/data/atlas/
public/data/sedb-math/
formal/
```

- [ ] **Step 5: Commit `artifacts/r3-dbv-validation.json`**

Evidence must record:

```text
base commit
validated implementation commit
RED/GREEN commits
role contract status
repair / ledger status
convergence status
Fake Provider offline status
canonical data drift = false
live provider dependency = false
```

- [ ] **Step 6: Re-run final HEAD CI + Lean CI**

Only after both succeed may R3 be marked `FINAL ACCEPTED`.
