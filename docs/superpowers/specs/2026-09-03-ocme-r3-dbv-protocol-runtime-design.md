# OCME R3 Designer / Builder / Verifier Protocol Runtime Design

**Status:** Approved design derived from the OCME Next-Phase Engineering Blueprint  
**Baseline:** `main@2892484bba1c858b3034399e4ad4358905b1de72` (R2 merged and main-verified)

## Goal

Build an offline, provider-neutral Designer / Builder / Verifier protocol runtime that can execute a deterministic candidate-review-repair loop against existing R2 materialization tasks without mutating canonical OCME data or requiring a live AI API.

## Scope

R3 implements only:

- strict role output contracts;
- Designer task contract generation protocol;
- Builder candidate-envelope protocol;
- Verifier structured review / objection protocol;
- objection ledger semantics;
- repair-patch protocol and minimal safe patch application;
- convergence / escalation policy;
- provider interface;
- deterministic Fake Provider;
- one end-to-end offline DBV loop;
- repository validation / regression integration.

R3 explicitly does **not** implement:

- GLM or any live provider;
- mechanical trust reports (R4);
- risk / epistemic diversity routing (R5);
- frontier adjudication;
- canonicalization;
- generative UI;
- AMRAL bridge;
- persistent task execution state beyond the R2 `queued` materialization task.

## Core Boundaries

### 1. R2 Task Is Immutable Input

The R3 runtime consumes an R2 materialization task but does not mutate it.

```text
Atlas -> R2 Materialization Task -> R3 Protocol Runtime
```

The task remains a deterministic projection of the canonical Atlas.

### 2. Candidate Is Not Canonical

```text
Builder output = candidate envelope
```

never implies:

```text
canonical MKO
```

R3 schemas intentionally contain no canonicalization field.

### 3. R3 Candidate Envelope Is Protocol-Level

R3 validates role and identity semantics, not the complete canonical MKO schema. The candidate payload is an opaque JSON object bound to a fixed `candidate_id == task.target_mko_id`.

R4 will bind candidate artifacts to the full mechanical / MKO trust chain.

### 4. Objections Are First-Class

Verifier objections are structured records with stable IDs, type, severity, reason, evidence references, and status.

An objection may not disappear merely because a later Builder output looks better.

### 5. Repair Is Explicit

Repairs are represented as a patch tied to:

- one task;
- one candidate revision;
- one or more objection IDs.

A repair patch that claims to resolve an objection must carry explicit resolution evidence text and must target an open objection.

### 6. No Hidden Reasoning Exchange

Cross-role protocol objects contain only explicit artifacts:

- materialization task;
- design contract;
- candidate envelope;
- verification report;
- objection ledger;
- repair patch;
- convergence result.

No `reasoning_trace`, `chain_of_thought`, or equivalent field is part of any schema.

## Protocol Objects

### Design Contract

Required fields:

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

Semantic invariants:

- `contract_id == contract-${task.task_id}`;
- `task_id == task.task_id`;
- `target_mko_id == task.target_mko_id`;
- `required_prerequisites` must equal `task.prerequisite_atlas_ids` unless a future version explicitly introduces a governed expansion field;
- `completion_criteria` must be non-empty;
- no canonical verdict field exists.

### Candidate Envelope

Required fields:

```text
schema_version
candidate_revision_id
task_id
target_mko_id
candidate_id
candidate_artifact
uncertainties
evidence_refs
proposed_relations
```

Semantic invariants:

- `task_id == task.task_id`;
- `target_mko_id == task.target_mko_id`;
- `candidate_id == task.target_mko_id`;
- candidate artifact must be an object;
- revision ID is stable-format and changes after a repair;
- no canonical state / verdict field exists.

### Verification Objection

Required fields:

```text
objection_id
target_candidate_revision_id
target_candidate_id
type
severity
reason
evidence_refs
status
```

Severity vocabulary:

```text
info
minor
major
critical
```

Status vocabulary:

```text
open
resolved
rejected
deferred
```

R3 Verifier may emit new objections only as `open`.

### Verification Report

Required fields:

```text
schema_version
report_id
task_id
target_candidate_revision_id
objections
verification_passes
counterexample_attempts
recomputed_results
unresolved_risks
```

Semantic invariants:

- task and candidate revision must match inputs;
- all emitted objections target the current candidate;
- Verifier output has no canonical verdict.

### Repair Patch

Required fields:

```text
schema_version
patch_id
task_id
source_candidate_revision_id
next_candidate_revision_id
candidate_id
resolves_objections
resolution_evidence
operations
evidence_updates
dependency_impact
```

Allowed operations:

```text
add
replace
remove
```

Paths use JSON Pointer-like absolute paths and may only modify `candidate_artifact`, `uncertainties`, `evidence_refs`, or `proposed_relations` inside the candidate envelope. Identity fields are immutable.

## Role Responsibilities

### Designer

Consumes:

```text
materialization task + explicit context
```

Produces:

```text
design contract
```

Designer cannot produce candidate content or canonical verdicts.

### Builder

Consumes:

```text
materialization task + design contract + explicit context
```

Produces:

```text
candidate envelope
```

Builder cannot mutate task / Atlas IDs or canonicalize.

### Verifier

Consumes:

```text
materialization task + design contract + candidate envelope + explicit verification context
```

Produces:

```text
verification report + open objections
```

Verifier cannot silently patch the candidate.

### Repair

Consumes:

```text
candidate envelope + current objection ledger + repair patch
```

Produces:

```text
new candidate revision + updated ledger
```

Only objections named by `resolves_objections` may transition from `open` to `resolved`.

## Objection Ledger

The ledger is append-preserving by objection ID.

Rules:

- duplicate objection IDs are rejected;
- a missing earlier objection is rejected;
- existing objection content is immutable except `status`;
- `open -> resolved` requires a matching repair patch and `resolution_evidence`;
- `critical` unresolved objections always block convergence;
- rejected / deferred objections remain visible in history.

## Convergence

R3 uses an explicit deterministic gate, not an LLM score.

Inputs:

```text
objection ledger
attempt number
max attempts
major objection threshold
mechanical_state
```

`mechanical_state` vocabulary for R3:

```text
not_run
passed
failed
```

Rules:

1. if `mechanical_state == failed`: `blocked`;
2. if any open `critical`: continue if attempts remain, otherwise `escalation_required`;
3. if open `major` count exceeds threshold: continue if attempts remain, otherwise `escalation_required`;
4. if attempt number reaches max attempts while blocking objections remain: `escalation_required`;
5. otherwise: `converged`.

R3 never returns `canonical`.

## Provider Interface

Provider-neutral request:

```text
role
prompt_class
context
output_schema_id
run_metadata
```

Provider-neutral response:

```text
structured_output
usage
provider_metadata
```

The Fake Provider is deterministic and fixture-driven. It performs no network access and has no credentials.

## Offline End-to-End Loop

The reference R3 loop executes:

```text
queued task
-> Designer contract
-> Builder candidate revision 0
-> Verifier report
-> if blocking objection:
     Repair patch
     -> candidate revision 1
     -> Verifier recheck
-> Convergence result
```

The loop returns protocol artifacts and state only. It must leave the input R2 task unchanged and must not write canonical MKO / Atlas / SEDB-Math data.

## TDD Slices

1. Design Contract
2. Candidate + Verification Contracts
3. Objection Ledger + Repair Patch
4. Convergence / Escalation
5. Provider Interface + Fake Provider + Offline Loop
6. Repository integration / final validation

Each slice must show RED for the intended missing behavior before GREEN implementation.

## Acceptance Criteria

R3 is accepted only when:

- all role schemas are strict;
- identity mutation is rejected;
- canonical verdict / state injection is rejected;
- objections remain traceable across repair;
- critical objections block convergence;
- max-attempt exhaustion produces `escalation_required`;
- Fake Provider loop runs without network access;
- input materialization task remains byte-equivalent / deep-equal after execution;
- no existing canonical data path changes;
- `npm run check` passes;
- Lean CI passes;
- machine-readable R3 validation evidence is committed and final HEAD is re-verified.
