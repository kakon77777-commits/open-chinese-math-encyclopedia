# OCME R1 SEDB-Math Minimal State Layer Design

**Status:** Approved implementation slice derived from `OCME Next-Phase Engineering Blueprint v0.1`.

## Goal

Add the smallest auditable mathematical-state substrate needed by later OCME runtime phases without changing existing MKO, Atlas, Evidence, formal-source, website, MCP, or AI-provider behavior.

R1 implements only:

- mathematical object state records;
- mathematical claim state records;
- explicit state-transition policy;
- append-only transition events;
- in-memory/file-backed state loading helpers;
- schema and semantic validation;
- architectural negative tests.

R1 explicitly does **not** implement materialization scheduling, Designer/Builder/Verifier orchestration, live model APIs, frontier adjudication, generative UI, or the AMRAL bridge.

## Existing-pattern alignment

The repository already separates JSON Schemas under `schemas/`, reusable stores/validators under `lib/`, scripts under `scripts/`, and executable Node tests under `tests/`. R1 follows those patterns rather than introducing a new framework.

The existing canonical mathematical data remains authoritative. R1 state records refer to existing object IDs but do not rewrite existing MKO files.

## Data contracts

### Object state

A state record has a stable `object_id`, schema version, current epistemic state, content version, policy version, and latest event reference.

Allowed states are exactly:

```text
planned
proposed
draft
under_review
verified
canonical
contested
revision_required
deprecated
superseded
```

No runtime caller may invent additional state values.

### Claim state

A claim-state record binds a stable `claim_id` to an `object_id`, stores the claim statement, assumptions, scope, current state, evidence references, verification references, and latest event reference. Claim state uses the same epistemic-state vocabulary as object state so later trust logic can aggregate claim-level status into MKO-level status.

### Event

Every state mutation is represented by an immutable event containing:

```text
event_id
object_id
claim_id? 
event_type
from_state
to_state
reason
actor
policy_version
evidence_refs
created_at
```

`reason`, `actor`, and `policy_version` are mandatory. State-changing events must match the transition policy.

## Transition policy

R1 permits the following forward transitions:

```text
planned -> proposed
proposed -> draft
draft -> under_review
under_review -> verified
verified -> canonical
canonical -> contested
contested -> revision_required
revision_required -> under_review
canonical -> deprecated
canonical -> superseded
```

A no-op transition is not a transition and must be rejected by the transition helper.

Any unlisted transition is illegal. In particular, `canonical -> draft` must fail.

## Store behavior

`lib/sedb-math-store.js` provides focused helpers rather than a general database abstraction. R1 needs:

- `loadSedbMathObjectStates()`;
- `loadSedbMathClaimStates()`;
- `loadSedbMathEvents()`;
- `indexSedbMathEvents(events)`;
- `assertStateHistoryConsistent({ objectStates, claimStates, events, knownObjectIds })`.

The initial source files live under `public/data/sedb-math/` and may contain empty arrays at R1. R1 must not synthesize canonical states for existing MKOs without history.

## Validation behavior

`lib/sedb-math-validation.js` compiles the three JSON Schemas with the repository's existing Ajv 2020 helper and adds semantic checks that JSON Schema alone cannot express.

Validation must reject:

- unknown epistemic states;
- duplicate state IDs or event IDs;
- event references to unknown object IDs;
- missing reason, actor, or policy version;
- illegal state transitions;
- current state inconsistent with the last transition event;
- a state record claiming `canonical` without a valid history ending in `verified -> canonical`;
- a claim bound to an unknown object;
- a `latest_event_id` that does not resolve to an event for the same object/claim.

## Canonical-boundary invariant

R1 does not grant canonicalization authority. It only validates whether recorded history is structurally legal.

The critical invariant is:

$$
\text{canonical state} \Rightarrow \text{explicit verified -> canonical event}
$$

No test or fixture should introduce a backdoor that directly writes `canonical` as a starting state.

## Testing strategy

TDD order is mandatory:

1. write RED tests for illegal transitions and missing event metadata;
2. implement transition helpers;
3. write RED tests for state/history consistency;
4. implement semantic validation and stores;
5. add schemas and fixtures sufficient to validate the GREEN behavior;
6. run R1 tests;
7. run the existing full regression chain;
8. only after both pass, integrate R1 syntax/tests into `package.json`.

Tests must assert real behavior, not mocks.

## Files

Create:

```text
schemas/sedb-math-object-state.schema.json
schemas/sedb-math-claim-state.schema.json
schemas/sedb-math-event.schema.json

lib/sedb-math-transitions.js
lib/sedb-math-validation.js
lib/sedb-math-store.js

public/data/sedb-math/object-states.json
public/data/sedb-math/claim-states.json
public/data/sedb-math/events.json

tests/sedb-math-state.mjs
tests/sedb-math-negative.mjs
tests/sedb-math-events.mjs

scripts/validate-sedb-math.mjs
```

Modify only after R1 tests are GREEN:

```text
package.json
```

## R1 acceptance gate

R1 is ACCEPTED only when all of the following are true:

```text
existing npm run check                PASS
sedb-math-state.mjs                  PASS
sedb-math-negative.mjs               PASS
sedb-math-events.mjs                 PASS
strict UTF-8                         PASS
no existing canonical MKO/Atlas drift
no AI-provider dependency introduced
```

Implementation existence alone is not completion evidence.