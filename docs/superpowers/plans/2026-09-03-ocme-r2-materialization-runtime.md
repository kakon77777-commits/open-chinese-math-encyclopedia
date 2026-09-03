# OCME R2 Materialization Task Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, schema-validated, dependency-aware Materialization Task Runtime derived exclusively from the canonical OCME Core Atlas.

**Architecture:** R2 adds one task schema, deterministic task derivation/serialization, semantic cross-validation against Atlas/MKO, a non-mutating dependency scheduler, a reproducible JSONL export, and focused positive/negative tests. The runtime derives from canonical Atlas every time; exported queues are projections, never authority.

**Tech Stack:** Node.js >=18, ECMAScript modules, Ajv 2020 through existing `lib/schema-validation.js`, `node:assert/strict`, JSON / JSONL.

**Spec:** `docs/superpowers/specs/2026-09-03-ocme-r2-materialization-runtime-design.md`

## Global Constraints

- Base is merged/verified R1 main commit `27a91a05e7f96f6ad2492c3544f43e1b6b967009`.
- Preserve existing canonical MKO, Evidence, Architecture, Atlas and formal sources unchanged.
- No live AI provider or network dependency in R2.
- Runtime task authority is always the canonical Atlas, not an artifact file.
- Only `atlas_seed` entries become tasks.
- Real baseline must derive exactly 74 tasks.
- R2 task state is only `queued`.
- Dependency constraints dominate materialization priority.
- Follow RED -> GREEN -> regression for every production behavior.

---

### Task 1: Materialization task schema and deterministic derivation

**Files:**
- Create: `schemas/materialization-task.schema.json`
- Create: `lib/materialization-task-store.js`
- Test: `tests/materialization-task.mjs`

**Interfaces:**
- Consumes: `loadCoreAtlas()` from `lib/atlas-store.js`
- Produces: `buildMaterializationTasks(atlas)`
- Produces: `loadMaterializationTasks()`
- Produces: `serializeMaterializationTasks(tasks)`

- [ ] **Step 1: Write failing test**

Create `tests/materialization-task.mjs` that imports the three functions and asserts against the real Atlas:

```js
const atlas = await loadCoreAtlas()
const tasks = buildMaterializationTasks(atlas)
assert.equal(tasks.length, 74)
assert.equal(tasks.every(task => task.state === 'queued'), true)
assert.equal(tasks.every(task => task.task_id === `task-${task.atlas_id}`), true)
assert.equal(new Set(tasks.map(task => task.task_id)).size, 74)
assert.equal(new Set(tasks.map(task => task.atlas_id)).size, 74)
assert.equal(new Set(tasks.map(task => task.target_mko_id)).size, 74)

const seedIds = atlas.entries.filter(entry => entry.maturity === 'atlas_seed').map(entry => entry.id).sort()
assert.deepEqual(tasks.map(task => task.atlas_id).sort(), seedIds)

const serialized1 = serializeMaterializationTasks(tasks)
const serialized2 = serializeMaterializationTasks(buildMaterializationTasks(atlas))
assert.equal(serialized1, serialized2)
assert.equal(serialized1.endsWith('\n'), true)
```

Also assert one known seed copies `target_mko_id`, `materialization_priority`, and prerequisites exactly from Atlas.

- [ ] **Step 2: Verify RED**

Run:

```bash
node tests/materialization-task.mjs
```

Expected: FAIL because `lib/materialization-task-store.js` does not exist.

- [ ] **Step 3: Add strict task schema**

`schemas/materialization-task.schema.json` requires exactly:

```text
schema_version = ocme-materialization-task-v0.1
task_id          /^task-atlas-/
atlas_id         /^atlas-/
target_mko_id    /^mko-/
priority         P1 | P2 | P3
state            queued
prerequisite_atlas_ids unique /^atlas-/ array
```

Use `additionalProperties:false`.

- [ ] **Step 4: Implement minimal derivation**

`buildMaterializationTasks(atlas)`:

1. filter `maturity === 'atlas_seed'`;
2. map each seed to the exact schema above;
3. set `task_id = task-${entry.id}`;
4. copy target, priority and prerequisites;
5. sort deterministically by P1/P2/P3, then Atlas ID.

`loadMaterializationTasks()` calls `loadCoreAtlas()` and derives in memory.

`serializeMaterializationTasks(tasks)` serializes one compact JSON object per line plus final newline.

- [ ] **Step 5: Verify GREEN**

```bash
node tests/materialization-task.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add schemas/materialization-task.schema.json lib/materialization-task-store.js tests/materialization-task.mjs
git commit -m "feat: derive materialization tasks from Atlas"
```

---

### Task 2: Cross-validate derived tasks against Atlas and MKO

**Files:**
- Create: `lib/materialization-task-validation.js`
- Test: `tests/materialization-negative.mjs`

**Interfaces:**
- Consumes: task schema; canonical Atlas; known MKO IDs
- Produces: `loadMaterializationTaskSchema()`
- Produces: `createMaterializationTaskValidator(schema)`
- Produces: `validateMaterializationTasks(tasks, { atlas, knownMkoIds }) -> {ok, errors}`

- [ ] **Step 1: Write failing negative tests**

Build the valid real task set, then clone/mutate one case at a time and assert validation fails for:

```text
duplicate task_id
duplicate atlas_id
duplicate target_mko_id
unknown atlas_id
canonical_mko Atlas entry scheduled as task
target_mko_id mismatch
priority mismatch
prerequisite list mismatch
missing task for an atlas_seed
extra task for a canonical_mko entry
target MKO already exists
unknown prerequisite Atlas ID
state != queued
```

- [ ] **Step 2: Verify RED**

```bash
node tests/materialization-negative.mjs
```

Expected: FAIL because validator module does not exist.

- [ ] **Step 3: Implement schema + semantic validation**

Rules:

1. schema-validate every task;
2. reject duplicate task / Atlas / target IDs;
3. require exact one-to-one coverage of all Atlas seeds;
4. reject any task whose Atlas entry is not a seed;
5. require target/priority/prerequisite equality with Atlas;
6. reject task targets found in `knownMkoIds`;
7. reject prerequisites that do not resolve in Atlas;
8. return data errors, do not throw for ordinary validation failures.

- [ ] **Step 4: Verify GREEN and regression**

```bash
node tests/materialization-negative.mjs
node tests/materialization-task.mjs
node tests/atlas.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/materialization-task-validation.js tests/materialization-negative.mjs
git commit -m "feat: validate materialization task coverage"
```

---

### Task 3: Dependency-aware scheduler

**Files:**
- Create: `runtime/production/task-scheduler.js`
- Test: `tests/materialization-scheduler.mjs`

**Interfaces:**
- Produces: `classifyMaterializationTasks(tasks, atlas, { completedTaskIds = [] } = {})`
- Produces: `buildMaterializationBatches(tasks, atlas, { completedTaskIds = [] } = {})`

- [ ] **Step 1: Write failing scheduler test**

Use the real Atlas plus a small synthetic fixture.

Assertions:

1. task with no prerequisite or only canonical prerequisites is ready;
2. task depending on an unfinished seed is blocked and reports that seed task in `blocked_by`;
3. once the prerequisite task ID is supplied in `completedTaskIds`, the dependent task becomes ready;
4. unknown completed task ID throws/rejects;
5. `buildMaterializationBatches` covers every remaining task exactly once;
6. for every seed dependency `A -> B`, B occurs in a later batch than A unless A is already completed;
7. within the same ready batch, P1 precedes P2 precedes P3, then Atlas ID;
8. scheduler never mutates input tasks.

- [ ] **Step 2: Verify RED**

```bash
node tests/materialization-scheduler.mjs
```

Expected: FAIL because scheduler module does not exist.

- [ ] **Step 3: Implement minimal scheduler**

Use Atlas entries as dependency authority. Canonical prerequisites are satisfied. Seed prerequisites require `task-${prerequisiteAtlasId}` in the completed set. Build batches iteratively; if remaining tasks exist but no ready task exists, throw a dependency deadlock error rather than looping forever.

- [ ] **Step 4: Verify GREEN**

```bash
node tests/materialization-scheduler.mjs
node tests/materialization-task.mjs
node tests/materialization-negative.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add runtime/production/task-scheduler.js tests/materialization-scheduler.mjs
git commit -m "feat: schedule Atlas materialization dependencies"
```

---

### Task 4: Reproducible materialization task export

**Files:**
- Create: `scripts/export-materialization-tasks.mjs`
- Create: `artifacts/materialization-tasks.jsonl`
- Test: `tests/materialization-export.mjs`

**Interfaces:**
- Consumes: `loadMaterializationTasks()` and `serializeMaterializationTasks()`
- Produces deterministic `artifacts/materialization-tasks.jsonl`
- CLI supports `--check`

- [ ] **Step 1: Write failing export test**

Assert:

```text
fresh serialization contains 74 lines
committed artifact must byte-match serialization
--check behavior rejects missing/drifted artifact through exported comparison helper or CLI subprocess
artifact regeneration does not change canonical Atlas
```

- [ ] **Step 2: Verify RED**

```bash
node tests/materialization-export.mjs
```

Expected: FAIL because export script/artifact do not exist.

- [ ] **Step 3: Implement exporter**

Default invocation writes the artifact. `--check` reads existing artifact and exits 1 if missing or different. Do not read the artifact as runtime authority.

- [ ] **Step 4: Generate artifact and verify GREEN**

```bash
node scripts/export-materialization-tasks.mjs
node scripts/export-materialization-tasks.mjs --check
node tests/materialization-export.mjs
```

Expected: PASS; 74 JSONL records.

- [ ] **Step 5: Commit**

```bash
git add scripts/export-materialization-tasks.mjs artifacts/materialization-tasks.jsonl tests/materialization-export.mjs
git commit -m "feat: export reproducible materialization tasks"
```

---

### Task 5: Repository integration and final R2 evidence

**Files:**
- Modify: `package.json`
- Create: `scripts/validate-materialization-runtime.mjs`
- Create: `artifacts/r2-materialization-validation.json`

**Interfaces:**
- Produces npm scripts:
  - `validate:materialization`
  - `export:materialization`
  - `verify:materialization-export`
- Adds R2 syntax/tests/checks to the existing chain only after all isolated tests are green.

- [ ] **Step 1: Add validator CLI**

The CLI loads Atlas, current MKO IDs, derives tasks, validates them, and prints a concise PASS/FAIL summary.

- [ ] **Step 2: Run isolated R2 suite**

```bash
node tests/materialization-task.mjs
node tests/materialization-negative.mjs
node tests/materialization-scheduler.mjs
node tests/materialization-export.mjs
node scripts/validate-materialization-runtime.mjs
node scripts/export-materialization-tasks.mjs --check
```

Expected: all PASS.

- [ ] **Step 3: Modify `package.json`**

Add syntax checks for new modules/scripts, append four R2 tests to `npm test`, add `validate:materialization` and `verify:materialization-export` to `npm run check` before general tests.

- [ ] **Step 4: Run full regression**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 5: Scope verification**

Compare R2 branch to base `27a91a05...` and require no modifications under:

```text
public/data/mko/
public/data/evidence/
public/data/architecture/
public/data/atlas/
public/data/sedb-math/
formal/
```

`artifacts/materialization-tasks.jsonl` is allowed as a derived R2 artifact.

- [ ] **Step 6: Record R2 validation artifact**

Machine-readable evidence must record:

```text
base commit
validated implementation commit
74 task count
Atlas seed/canonical counts
R2 test results
full OCME CI result
Lean CI result
canonical-data drift=false
live AI provider dependency=false
```

- [ ] **Step 7: Final-head verification**

After writing the evidence artifact, require the final branch HEAD itself to pass both OCME CI and Lean CI before R2 can be labelled FINAL ACCEPTED.

---

## Self-review

- Spec coverage: task derivation, exact seed coverage, semantic validation, scheduler, reproducible export, integration and scope gates are all assigned to tasks.
- No placeholder implementation steps remain.
- Interface names are consistent across tasks.
- R2 does not consume live AI providers and does not mutate R1 state data.

## Execution

The user already authorized continuation into R2. Execute inline in this session using strict TDD; do not pause for a separate execution-choice confirmation.
