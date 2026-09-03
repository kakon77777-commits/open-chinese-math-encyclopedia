# OCME R1 SEDB-Math Minimal State Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auditable, schema-validated SEDB-Math object/claim state and event layer without changing existing OCME v0.10 canonical mathematical data.

**Architecture:** R1 adds three strict JSON Schemas, one explicit transition-policy module, one semantic validator, one focused store, empty canonical runtime-state data files, and three executable Node test modules. Existing MKO/Atlas/Evidence remain untouched; `package.json` is modified only after the new tests are green.

**Tech Stack:** Node.js >=18, ECMAScript modules, Ajv 2020 via existing `lib/schema-validation.js`, `node:assert/strict`, JSON files.

**Spec:** `docs/superpowers/specs/2026-09-02-ocme-r1-sedb-math-design.md`

## Global Constraints

- Preserve existing OCME v0.10 canonical MKO, Atlas, Evidence, Architecture and formal data unchanged.
- No AI provider dependency or network call in R1.
- No direct canonicalization API in R1.
- Every legal state mutation requires an explicit event with `reason`, `actor`, and `policy_version`.
- `canonical` is legal only when history contains a final `verified -> canonical` transition.
- Use strict UTF-8 source files.
- Keep existing `npm run check` green.

---

### Task 1: Transition policy — RED then GREEN

**Files:**
- Create: `tests/sedb-math-state.mjs`
- Create: `lib/sedb-math-transitions.js`

**Interfaces:**
- Produces: `SEDB_MATH_STATES: readonly string[]`
- Produces: `canTransition(fromState: string, toState: string): boolean`
- Produces: `assertLegalTransition(fromState: string, toState: string): true` or throws `Error`

- [ ] **Step 1: Write the failing test**

Create `tests/sedb-math-state.mjs`:

```js
import assert from 'node:assert/strict'
import {
  SEDB_MATH_STATES,
  canTransition,
  assertLegalTransition,
} from '../lib/sedb-math-transitions.js'

assert.deepEqual(SEDB_MATH_STATES, [
  'planned', 'proposed', 'draft', 'under_review', 'verified',
  'canonical', 'contested', 'revision_required', 'deprecated', 'superseded',
])

assert.equal(canTransition('planned', 'proposed'), true)
assert.equal(canTransition('verified', 'canonical'), true)
assert.equal(canTransition('canonical', 'contested'), true)
assert.equal(canTransition('contested', 'revision_required'), true)
assert.equal(canTransition('revision_required', 'under_review'), true)
assert.equal(canTransition('canonical', 'deprecated'), true)
assert.equal(canTransition('canonical', 'superseded'), true)

assert.equal(canTransition('canonical', 'draft'), false)
assert.equal(canTransition('canonical', 'canonical'), false)
assert.equal(canTransition('unknown', 'draft'), false)
assert.throws(() => assertLegalTransition('canonical', 'draft'), /illegal SEDB-Math transition/)
assert.equal(assertLegalTransition('draft', 'under_review'), true)

console.log('SEDB-Math transition tests passed.')
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node tests/sedb-math-state.mjs
```

Expected: FAIL because `../lib/sedb-math-transitions.js` does not exist.

- [ ] **Step 3: Implement the minimal transition module**

Create `lib/sedb-math-transitions.js` with the exact state vocabulary and explicit allowed transition set. `canTransition` returns false for unknown states or no-op transitions. `assertLegalTransition` throws `Error('illegal SEDB-Math transition: <from> -> <to>')` when invalid and returns true when valid.

- [ ] **Step 4: Run the test and verify GREEN**

```bash
node tests/sedb-math-state.mjs
```

Expected: PASS and `SEDB-Math transition tests passed.`

- [ ] **Step 5: Commit**

```bash
git add tests/sedb-math-state.mjs lib/sedb-math-transitions.js
git commit -m "feat: add SEDB-Math transition policy"
```

---

### Task 2: Strict state/event schemas — RED then GREEN

**Files:**
- Create: `schemas/sedb-math-object-state.schema.json`
- Create: `schemas/sedb-math-claim-state.schema.json`
- Create: `schemas/sedb-math-event.schema.json`
- Create: `tests/sedb-math-negative.mjs`
- Create: `lib/sedb-math-validation.js`

**Interfaces:**
- Consumes: `SEDB_MATH_STATES`, `canTransition`
- Produces: `loadSedbMathSchemas(): Promise<{objectStateSchema, claimStateSchema, eventSchema}>`
- Produces: `createSedbMathValidators(schemas): {validateObjectState, validateClaimState, validateEvent}`
- Produces: `validateSedbMathBundle(bundle, options?): Promise<{ok:boolean, errors:string[]}>`

- [ ] **Step 1: Write failing schema/semantic negative tests**

Create `tests/sedb-math-negative.mjs` that constructs one valid object state, one valid claim state and two valid events (`under_review -> verified`, `verified -> canonical`). Assert the validator rejects each independently mutated case:

```text
unknown object state
missing event reason
missing event actor
missing event policy_version
illegal canonical -> draft transition
duplicate event_id
claim bound to unknown object
latest_event_id pointing to a different object
canonical object without a verified -> canonical terminal event
```

The test imports `validateSedbMathBundle` from `../lib/sedb-math-validation.js`.

- [ ] **Step 2: Run and verify RED**

```bash
node tests/sedb-math-negative.mjs
```

Expected: FAIL because `lib/sedb-math-validation.js` does not exist.

- [ ] **Step 3: Add strict JSON Schemas**

`sedb-math-object-state.schema.json` requires:

```text
schema_version = ocme-sedb-math-object-state-v0.1
id
object_id
state
content_version
policy_version
latest_event_id
```

`sedb-math-claim-state.schema.json` requires:

```text
schema_version = ocme-sedb-math-claim-state-v0.1
id
claim_id
object_id
statement
assumptions
scope
state
evidence_refs
verification_refs
latest_event_id
```

`sedb-math-event.schema.json` requires:

```text
schema_version = ocme-sedb-math-event-v0.1
event_id
object_id
event_type
from_state
to_state
reason
actor
policy_version
evidence_refs
created_at
```

Schemas use `additionalProperties: false`; state enums exactly match Task 1; identifiers are non-empty strings; arrays contain unique non-empty strings; `created_at` is a non-empty string in R1 because repository Ajv intentionally disables format validation.

- [ ] **Step 4: Implement semantic validation**

`validateSedbMathBundle({ objectStates, claimStates, events }, { knownObjectIds = [] } = {})` must:

1. schema-validate every record;
2. reject duplicate object-state `id`, claim-state `id`, claim IDs, or event IDs;
3. reject events whose `object_id` is not in `knownObjectIds` or the object-state set when `knownObjectIds` is non-empty;
4. reject illegal state-changing events using `canTransition`;
5. reject claims bound to unknown objects;
6. resolve `latest_event_id` to the same object/claim;
7. replay per-object event order as given and require each event's `from_state` to match the previous `to_state`;
8. require an object claiming `canonical` to end on `verified -> canonical` and have `latest_event_id` equal that terminal event;
9. return `{ ok: errors.length === 0, errors }` without throwing for data-validation failures.

- [ ] **Step 5: Run the negative tests and verify GREEN**

```bash
node tests/sedb-math-negative.mjs
```

Expected: PASS.

- [ ] **Step 6: Re-run transition tests**

```bash
node tests/sedb-math-state.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add schemas/sedb-math-*.schema.json lib/sedb-math-validation.js tests/sedb-math-negative.mjs
git commit -m "feat: validate SEDB-Math state and events"
```

---

### Task 3: Runtime state store and event history — RED then GREEN

**Files:**
- Create: `public/data/sedb-math/object-states.json`
- Create: `public/data/sedb-math/claim-states.json`
- Create: `public/data/sedb-math/events.json`
- Create: `lib/sedb-math-store.js`
- Create: `tests/sedb-math-events.mjs`
- Create: `scripts/validate-sedb-math.mjs`

**Interfaces:**
- Consumes: `ROOT` from `lib/store.js`
- Consumes: `validateSedbMathBundle`
- Produces: `SEDB_MATH_DATA_DIR`
- Produces: `loadSedbMathObjectStates()`
- Produces: `loadSedbMathClaimStates()`
- Produces: `loadSedbMathEvents()`
- Produces: `indexSedbMathEvents(events)`
- Produces: `loadAndValidateSedbMathState({knownObjectIds?} = {})`

- [ ] **Step 1: Write the failing store/event test**

Create `tests/sedb-math-events.mjs` that:

1. imports the store functions;
2. asserts the three repository data files initially load as empty arrays;
3. constructs fixture events in memory and asserts `indexSedbMathEvents` returns maps keyed by event ID and object ID;
4. asserts duplicate event IDs are rejected;
5. calls `loadAndValidateSedbMathState()` and expects `{ok:true}` for the empty R1 baseline.

- [ ] **Step 2: Run and verify RED**

```bash
node tests/sedb-math-events.mjs
```

Expected: FAIL because the store module/data files do not exist.

- [ ] **Step 3: Add empty R1 canonical runtime-state files**

Each file is strict JSON with the matching schema version and an array field:

```json
{"schema_version":"ocme-sedb-math-object-state-collection-v0.1","states":[]}
```

```json
{"schema_version":"ocme-sedb-math-claim-state-collection-v0.1","states":[]}
```

```json
{"schema_version":"ocme-sedb-math-event-collection-v0.1","events":[]}
```

These files intentionally do not synthesize states for the six existing canonical MKOs.

- [ ] **Step 4: Implement the focused store**

`lib/sedb-math-store.js` reads the three JSON files, returns their arrays, indexes event history, rejects duplicate event IDs, and `loadAndValidateSedbMathState()` delegates semantic validation.

- [ ] **Step 5: Add CLI validator**

`scripts/validate-sedb-math.mjs` loads current MKO IDs via `listObjects()` from `lib/store.js`, calls `loadAndValidateSedbMathState({knownObjectIds})`, prints errors to stderr and exits 1 on failure; prints a concise success message on pass.

- [ ] **Step 6: Run and verify GREEN**

```bash
node tests/sedb-math-events.mjs
node scripts/validate-sedb-math.mjs
```

Expected: both PASS.

- [ ] **Step 7: Run all three R1 tests**

```bash
node tests/sedb-math-state.mjs
node tests/sedb-math-negative.mjs
node tests/sedb-math-events.mjs
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add public/data/sedb-math lib/sedb-math-store.js scripts/validate-sedb-math.mjs tests/sedb-math-events.mjs
git commit -m "feat: add SEDB-Math state store and event log"
```

---

### Task 4: Package integration and full regression

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes all R1 tests and validator.
- Produces npm scripts `validate:sedb-math` and integration into `test:syntax`, `test`, and `check`.

- [ ] **Step 1: Run existing baseline before modifying package scripts**

```bash
npm install
npm run check
```

Expected: PASS.

- [ ] **Step 2: Modify package scripts**

Add:

```json
"validate:sedb-math": "node scripts/validate-sedb-math.mjs"
```

Append syntax checks for:

```text
lib/sedb-math-transitions.js
lib/sedb-math-validation.js
lib/sedb-math-store.js
scripts/validate-sedb-math.mjs
```

Append tests:

```text
node tests/sedb-math-state.mjs
node tests/sedb-math-negative.mjs
node tests/sedb-math-events.mjs
```

Add `npm run validate:sedb-math` to `check` before the general test phase.

- [ ] **Step 3: Run syntax and R1 tests**

```bash
npm run test:syntax
node tests/sedb-math-state.mjs
node tests/sedb-math-negative.mjs
node tests/sedb-math-events.mjs
npm run validate:sedb-math
```

Expected: PASS.

- [ ] **Step 4: Run full regression**

```bash
npm run check
```

Expected: PASS with all existing and new checks.

- [ ] **Step 5: Verify canonical-data scope**

Compare the branch with its pre-R1 base and confirm no existing files under these paths changed:

```text
public/data/mko/
public/data/evidence/
public/data/architecture/
public/data/atlas/
formal/
```

Expected: no changes.

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "test: integrate SEDB-Math R1 validation"
```

---

### Task 5: Final R1 verification evidence

**Files:**
- Create: `artifacts/r1-sedb-math-validation.json`

**Interfaces:**
- Produces final machine-readable R1 verification record bound to branch HEAD.

- [ ] **Step 1: Run final verification commands from a clean tree**

```bash
npm run check
node tests/sedb-math-state.mjs
node tests/sedb-math-negative.mjs
node tests/sedb-math-events.mjs
npm run validate:sedb-math
```

Expected: PASS.

- [ ] **Step 2: Create validation artifact**

Write JSON containing:

```text
phase = R1
feature = SEDB-Math Minimal State Layer
baseline = OCME v0.10
branch
head_commit
full_check = pass
r1_tests = pass
canonical_data_drift = false
ai_provider_dependency = false
```

- [ ] **Step 3: Validate JSON and rerun full check**

```bash
node -e "JSON.parse(require('fs').readFileSync('artifacts/r1-sedb-math-validation.json','utf8')); console.log('validation artifact JSON PASS')"
npm run check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add artifacts/r1-sedb-math-validation.json
git commit -m "chore: record R1 SEDB-Math validation"
```

- [ ] **Step 5: Final branch verification**

Confirm branch has no uncommitted source changes and report final HEAD SHA plus test evidence. Do not merge automatically.