# OCME R6 Real Provider Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the verified R3 Designer / Builder / Verifier runtime to a real GLM-compatible provider through a provider-neutral registry/runtime while preserving R4/R5 trust boundaries and network-free CI.

**Architecture:** Keep the existing R3 `provider.run(request)` contract unchanged. Insert `ProviderRuntime` behind it: deterministic Model Policy resolves role/provider/model metadata, Provider Registry resolves the adapter, GLM Adapter performs the HTTP call, and an immutable AI Run Record captures non-secret provenance. CI injects fetch and never uses network; the live GLM pilot is a separate credential-gated script.

**Tech Stack:** Node.js >=18 ES modules, built-in `fetch`, built-in `crypto`, JSON Schema Draft 2020-12, Ajv 8.17.1, existing OCME R3/R4/R5 validation stack, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-ocme-r6-real-provider-integration-design.md`

## Global Constraints

- Baseline is `main@a41ff5d42f3c7d8974c8e23a9512541c7cc90df1`.
- Preserve existing R3 provider request/response surface.
- Do not modify canonical MKO, Evidence, Architecture, Atlas, SEDB-Math, or formal source data.
- No live network in `npm run check`.
- No API key in source, fixtures, logs, errors, run records, or artifacts.
- No provider fallback on error.
- No provider tools, web search, MCP, or function execution in R6.
- No hidden reasoning exchange; `reasoning_content` is discarded.
- Real model output remains subject to existing R3 semantic validators, R4 Mechanical Trust, and R5 routing.
- Live pilot status is separate from implementation acceptance.

---

### Task 1: AI Run Record and Provider Registry

**Files:**
- Create: `schemas/ai-run-record.schema.json`
- Create: `lib/ai-run-record-validation.js`
- Create: `runtime/providers/provider-registry.js`
- Test: `tests/provider-registry.mjs`
- Test: `tests/ai-run-record.mjs`
- Modify: `package.json` to register RED tests only after test files exist.

**Interfaces:**
- `new ProviderRegistry()`
- `registry.register(providerId, adapter)`
- `registry.resolve(providerId) -> adapter`
- `registry.list() -> string[]`
- `validateAiRunRecord(record, { request, policy, response }) -> { ok, errors }`

- [ ] **Step 1: Write provider-registry RED tests**

Assert:

```js
const registry = new ProviderRegistry()
registry.register('fake', fakeProvider)
assert.equal(registry.resolve('fake'), fakeProvider)
assert.deepEqual(registry.list(), ['fake'])
assert.throws(() => registry.register('fake', fakeProvider), /already registered/)
assert.throws(() => registry.resolve('missing'), /not registered/)
```

Also assert invalid provider IDs and adapters are rejected and no fallback occurs.

- [ ] **Step 2: Write AI Run Record RED tests**

Create one request, one non-secret resolved policy, and one response fixture. Assert the validator accepts exact hashes and rejects:

- wrong candidate/request input hash;
- wrong output hash;
- role mismatch;
- prompt metadata mismatch;
- forbidden `api_key`, `authorization`, `reasoning_content`, `canonical_verdict`, or `mathematically_true` fields;
- invalid billing provenance.

- [ ] **Step 3: Verify RED through PR CI**

Expected: existing R1-R5 checks pass first; new tests fail because registry/run-record implementation does not exist.

- [ ] **Step 4: Implement strict schema, validator, and registry**

Run-record schema fields:

```text
schema_version = ocme-ai-run-record-v0.1
run_id
provider
model
model_version
role
prompt_id
prompt_version
prompt_class
context_class
source_set_id
tool_set_id
verification_goal
input_sha256
output_sha256
started_at
duration_ms
usage { input_units, output_units, total_units, cached_input_units }
billing { status, amount, currency }
network_used
```

`billing.status` enum:

```text
not_computed
estimated
provider_reported
```

`not_computed` requires null amount/currency.

- [ ] **Step 5: Full regression and commit GREEN**

Expected: `npm run check` PASS.

---

### Task 2: Deterministic Model Policy, Prompt Library, and Output Schema Registry

**Files:**
- Create: `runtime/providers/model-policy.js`
- Create: `runtime/providers/output-schema-registry.js`
- Create: `runtime/production/prompts/role-prompts.js`
- Create: `runtime/providers/prompt-renderer.js`
- Test: `tests/model-policy.mjs`
- Test: `tests/prompt-renderer.mjs`
- Modify: `package.json` to register tests.

**Interfaces:**
- `createModelPolicy(config) -> { resolve(request) }`
- `resolveOutputSchema(outputSchemaId) -> Promise<object>`
- `buildProviderMessages({ request, policy, outputSchema }) -> Message[]`

- [ ] **Step 1: Write Model Policy RED tests**

Assert four request classes resolve to distinct prompt/context/source/goal identities:

```text
designer:design_contract
builder:candidate_build
builder:builder_repair
verifier:candidate_verify
```

Assert the same GLM model may be used for all roles without collapsing policy metadata. Assert role-specific model overrides beat `GLM_MODEL`-equivalent fallback configuration. Reject unknown role/prompt combinations and unsupported request option keys.

- [ ] **Step 2: Write prompt/schema RED tests**

Assert only the four existing R3 output schema IDs resolve. Unknown schema IDs reject.

Assert rendered messages contain:

- role authority boundary;
- JSON-only requirement;
- exact output schema;
- canonical JSON context;
- explicit prohibition on canonical/truth authority;
- explicit instruction not to disclose hidden reasoning.

Assert prompts do not contain an API key.

- [ ] **Step 3: Verify RED**

Expected: missing policy / prompt / schema modules.

- [ ] **Step 4: Implement minimal deterministic policy**

Use role-specific model overrides:

```text
designer -> config.models.designer ?? config.model
builder / builder_repair -> config.models.builder ?? config.model
verifier -> config.models.verifier ?? config.model
```

Default provider: `glm`.
Default model if not configured: `glm-5.3-flash`.

Allow only these generation-option keys:

```text
thinking
reasoning_effort
max_tokens
temperature
top_p
do_sample
```

No tools.

- [ ] **Step 5: Implement versioned prompts and schema resolver**

Map exactly:

```text
ocme-design-contract-v0.1 -> schemas/design-contract.schema.json
ocme-candidate-envelope-v0.1 -> schemas/candidate-envelope.schema.json
ocme-verification-report-v0.1 -> schemas/verification-report.schema.json
ocme-repair-patch-v0.1 -> schemas/repair-patch.schema.json
```

- [ ] **Step 6: Full regression and commit GREEN**

---

### Task 3: GLM HTTP Adapter

**Files:**
- Create: `runtime/providers/glm-adapter.js`
- Test: `tests/glm-adapter.mjs`
- Modify: `package.json` to register test.

**Interfaces:**

```js
new GlmAdapter({
  apiKey,
  baseUrl,
  fetchImpl,
  timeoutMs,
  schemaResolver,
  messageBuilder,
})

adapter.run(request) -> ProviderResponse
```

- [ ] **Step 1: Write request-construction RED**

Inject a fake `fetchImpl` that captures URL, headers, and body. Assert:

```text
POST <baseUrl>/chat/completions
Authorization: Bearer <key>
Content-Type: application/json
stream=false
response_format.type=json_object
model=<resolved policy model>
```

Assert no `tools`, `web_search`, `mcp`, or unknown generation settings are sent.

- [ ] **Step 2: Write response RED**

Fake a 200 payload containing:

```json
{
  "id":"provider-task-id",
  "request_id":"provider-request-id",
  "model":"glm-5.3-flash",
  "choices":[{
    "message":{
      "role":"assistant",
      "content":"{\"schema_version\":\"fixture-v0.1\",\"value\":\"ok\"}",
      "reasoning_content":"SECRET_CHAIN"
    },
    "finish_reason":"stop"
  }],
  "usage":{
    "prompt_tokens":10,
    "completion_tokens":4,
    "total_tokens":14,
    "prompt_tokens_details":{"cached_tokens":2}
  }
}
```

Assert:

- structured output parsed;
- usage normalized;
- provider/model/request IDs retained;
- `reasoning_content` text is absent from the entire returned response;
- only `reasoning_content_discarded=true` may be recorded.

- [ ] **Step 3: Write error RED tests**

Assert rejection for:

- missing key;
- non-HTTPS remote base URL;
- non-2xx response;
- invalid HTTP JSON;
- missing choices/content;
- content that is not JSON;
- `finish_reason=tool_calls`;
- abort timeout.

Assert thrown error strings never contain the API key.

- [ ] **Step 4: Verify RED**

Expected: missing GLM adapter.

- [ ] **Step 5: Implement minimal adapter using built-in fetch**

Use `AbortController`; do not add dependencies.

Do not strip markdown fences. Parse content with `JSON.parse` directly.

- [ ] **Step 6: Full regression and commit GREEN**

---

### Task 4: ProviderRuntime and Existing DBV Integration

**Files:**
- Create: `runtime/providers/provider-runtime.js`
- Test: `tests/provider-runtime.mjs`
- Test: `tests/dbv-provider-runtime.mjs`
- Modify: `package.json` to register tests.

**Interfaces:**

```js
new ProviderRuntime({
  registry,
  modelPolicy,
  clock,
  idFactory,
})

runtime.run(request) -> ProviderResponse
runtime.getRunRecords() -> AiRunRecord[]
```

- [ ] **Step 1: Write ProviderRuntime RED**

Register Fake Provider under `fake`, resolve a policy that selects it, and assert one call produces one AI Run Record with exact input/output hashes and cloned immutable retrieval.

Assert provider failure produces no successful run record and never falls back.

- [ ] **Step 2: Write existing DBV integration RED**

Pass `ProviderRuntime` wrapping Fake Provider into the unchanged `runDbvLoop`. Assert the same fixture still converges and run records are captured for each Designer/Builder/Verifier/Repair call.

Assert role/prompt metadata across captured records remains distinct.

- [ ] **Step 3: Verify RED**

Expected: missing ProviderRuntime.

- [ ] **Step 4: Implement runtime orchestration**

For each call:

1. validate request;
2. resolve policy;
3. create enriched request with `run_metadata.provider_policy`;
4. hash canonical `{request, policy}`;
5. call registry adapter;
6. hash structured output;
7. construct and validate run record;
8. append cloned record;
9. return response with `provider_metadata.run_id` only added as non-secret provenance.

- [ ] **Step 5: Full regression and commit GREEN**

---

### Task 5: Offline Repository Integration and Credential-Gated GLM Pilot

**Files:**
- Create: `scripts/validate-provider-runtime.mjs`
- Create: `scripts/run-glm-pilot.mjs`
- Modify: `package.json`

**Interfaces:**
- `npm run validate:provider-runtime` — offline and mandatory in `npm run check`.
- `npm run pilot:glm` — manual, networked, credential-gated, never part of `check`.

- [ ] **Step 1: Add integration RED**

Add scripts and put `validate:provider-runtime` after `validate:risk-routing` and before `npm test`. Do not create validator script yet.

Expected CI failure: missing `scripts/validate-provider-runtime.mjs` after all earlier gates pass.

- [ ] **Step 2: Implement offline integration validator**

It must:

- create registry + deterministic fake provider;
- create model policy;
- create ProviderRuntime with deterministic clock/id factory;
- run one complete existing DBV fixture;
- verify AI Run Records;
- instantiate GLM adapter with injected fake fetch and perform one request-shape/response-shape smoke;
- print no API key and use no real network.

- [ ] **Step 3: Implement manual live pilot**

Read:

```text
GLM_API_KEY
GLM_BASE_URL (default https://open.bigmodel.cn/api/paas/v4)
GLM_MODEL (default glm-5.3-flash)
```

If `GLM_API_KEY` is absent, exit non-zero with a concise message and do not attempt network.

Select three P1 materialization tasks. Run bounded DBV (`maxAttempts=2`) through real ProviderRuntime/GLMAdapter. Print only compact task/run/usage/status summaries.

Never print raw prompt, raw response, reasoning content, or API key.

- [ ] **Step 4: Extend syntax gate**

Add all new R6 source and scripts to `test:syntax`.

- [ ] **Step 5: Integrated implementation HEAD verification**

Require exact HEAD:

- OCME CI PASS;
- Lean CI PASS;
- protected canonical/formal paths zero diff;
- no new npm dependency;
- no committed secret-like values;
- `pilot:glm` not part of normal check.

- [ ] **Step 6: Record live pilot state explicitly**

If no credentials exist in the implementation environment, record:

```text
live_pilot.status = not_run_no_credentials
```

Do not claim live connectivity.

If credentials are available, run `npm run pilot:glm` and record only sanitized summaries.

---

### Task 6: Machine-Readable Validation Artifact and Final Head Gate

**Files:**
- Create: `artifacts/r6-real-provider-validation.json`

- [ ] **Step 1: Commit validation artifact**

Record:

- base commit;
- validated implementation commit;
- R6 contracts;
- RED/GREEN run IDs;
- GLM API compatibility assumptions;
- AI Run Record semantics;
- reasoning discard invariant;
- secret non-leak invariant;
- normal CI network-free invariant;
- live pilot status;
- scope audit;
- OCME/Lean implementation-head results.

- [ ] **Step 2: Verify validation-artifact HEAD independently**

Require fresh OCME CI + Lean CI on exact artifact HEAD.

- [ ] **Step 3: Finish branch**

Post final status to PR and mark Ready for Review.

Do not merge `main` without explicit user choice.
