# OCME R2 Materialization Task Runtime Design

## Status

Approved implementation design derived from the OCME Next-Phase Engineering Blueprint. R2 extends the merged R1 SEDB-Math baseline and does not introduce live AI providers.

## Goal

Turn the canonical Core Atlas `atlas_seed` entries into a deterministic, schema-validated, dependency-aware Materialization Task Runtime that later Designer/Builder/Verifier orchestration can consume.

## Core boundary

```text
Canonical Atlas
  -> deterministic task derivation
  -> validation / scheduling
  -> optional reproducible JSONL export
```

The derived task queue is never a second canonical Atlas.

```text
Derived Task / Export != Canonical Atlas
```

Runtime behavior must not depend on `artifacts/materialization-queue.jsonl` already existing. The canonical source is `public/data/atlas/core-atlas.json`; artifacts are rebuildable projections.

## Explicit non-goals

R2 does not implement:

- Designer / Builder / Verifier orchestration;
- GLM or any live AI provider;
- risk classification beyond the existing Atlas materialization priority;
- trust/adjudication logic;
- generative UI;
- AMRAL bridge;
- mutation of canonical Atlas or MKO data;
- persistent task execution state beyond the initial `queued` task record.

## Materialization task model

Each `atlas_seed` becomes exactly one task:

```json
{
  "schema_version": "ocme-materialization-task-v0.1",
  "task_id": "task-atlas-natural-number",
  "atlas_id": "atlas-natural-number",
  "target_mko_id": "mko-natural-number",
  "priority": "P1",
  "state": "queued",
  "prerequisite_atlas_ids": []
}
```

Rules:

1. `task_id` is deterministic: `task-${atlas_id}`.
2. Only `maturity=atlas_seed` entries produce tasks.
3. `priority` must equal the Atlas entry's `materialization_priority` and is limited to `P1|P2|P3`.
4. `target_mko_id` must equal the Atlas entry's target and must not already exist as a canonical MKO.
5. `prerequisite_atlas_ids` must exactly preserve the Atlas prerequisite list.
6. R2 task state is exactly `queued`; execution-state transitions are deferred to later production-runtime phases.
7. The real v0.10 baseline must derive exactly 74 tasks from 80 Atlas entries / 6 canonical mappings.

## Canonical coverage invariant

For an Atlas `A` and task set `Q`:

```text
seed(A) <-> exactly one task in Q
canonical_mko(A) <-> no task in Q
```

No seed may be silently omitted and no canonical node may be scheduled for materialization.

## Runtime interfaces

### `lib/materialization-task-validation.js`

Exports:

```js
loadMaterializationTaskSchema()
createMaterializationTaskValidator(schema)
validateMaterializationTasks(tasks, { atlas, knownMkoIds })
```

Validation rejects:

- malformed task records;
- duplicate task IDs;
- duplicate Atlas IDs;
- duplicate target MKO IDs;
- missing or extra tasks relative to Atlas seeds;
- task bound to unknown Atlas entry;
- task bound to `canonical_mko` entry;
- target ID / priority / prerequisite mismatch;
- target MKO that already exists;
- unknown prerequisite Atlas IDs;
- task-state values other than `queued`.

### `lib/materialization-task-store.js`

Exports:

```js
buildMaterializationTasks(atlas)
loadMaterializationTasks()
serializeMaterializationTasks(tasks)
```

`loadMaterializationTasks()` always derives from the canonical Atlas. It does not read an artifact as authority.

### `runtime/production/task-scheduler.js`

Exports:

```js
classifyMaterializationTasks(tasks, atlas, { completedTaskIds = [] } = {})
buildMaterializationBatches(tasks, atlas, { completedTaskIds = [] } = {})
```

A prerequisite is satisfied when either:

- its Atlas entry has `maturity=canonical_mko`; or
- its seed task ID appears in `completedTaskIds`.

`classifyMaterializationTasks` returns ready and blocked tasks plus `blocked_by` information without mutating tasks.

`buildMaterializationBatches` deterministically computes dependency-safe batches for all remaining tasks. Within a ready set, ordering is `P1 -> P2 -> P3`, then Atlas ID. Dependency constraints always dominate priority.

Unknown completed task IDs are rejected.

## Export contract

`scripts/export-materialization-tasks.mjs` writes:

```text
artifacts/materialization-tasks.jsonl
```

The file contains one task JSON object per line and a final newline.

The script supports `--check`, which compares the committed artifact with a fresh derivation and exits non-zero on drift or missing artifact.

This artifact is a reproducible projection for local AI / batch tooling, not a canonical source.

## TDD requirements

R2 implementation follows strict RED -> GREEN cycles.

Required negative cases include:

- duplicate task ID;
- duplicate target MKO;
- unknown Atlas ID;
- canonical Atlas node scheduled as task;
- target mismatch;
- priority mismatch;
- prerequisite mismatch;
- seed omitted from queue;
- task added for non-seed;
- target MKO already exists;
- unknown completed task ID;
- scheduler ignoring an unfinished seed prerequisite.

## Acceptance gate

R2 is accepted only when:

```text
main/R1 baseline remains green
74 deterministic tasks derived
canonical Atlas/MKO/Evidence/formal data unchanged
all R2 positive and negative tests pass
full npm run check passes
materialization task export --check passes
merged-result verification later passes before main acceptance
```
