# OCME R6 Real Provider Integration Design

## Status

Approved implementation design for R6, derived from the accepted OCME Next-Phase Engineering Blueprint and the verified R5 baseline `main@a41ff5d42f3c7d8974c8e23a9512541c7cc90df1`.

## Goal

Connect the existing R3 Designer / Builder / Verifier protocol runtime to real model providers without changing canonical authority, Trust Plane semantics, or CI determinism.

R6 introduces a provider-neutral runtime, one real GLM adapter, deterministic model/role policy, immutable AI Run Records, and a credential-gated live pilot path.

## Explicit non-goals

- no canonicalization authority;
- no bypass of R4 Mechanical Trust;
- no bypass of R5 Risk / Diversity / Escalation;
- no frontier adjudication execution;
- no model-generated hidden reasoning exchange between roles;
- no provider web-search, MCP, or arbitrary tool execution in R6;
- no API key in source, logs, run records, fixtures, or committed artifacts;
- no network calls in normal CI;
- no hard dependency on one GLM model version.

## Existing protocol boundary

R3 already accepts any object implementing:

```js
provider.run(request) -> {
  structured_output,
  usage,
  provider_metadata,
}
```

`runDesigner`, `runBuilder`, `runBuilderRepair`, and `runVerifier` already emit distinct `role`, `prompt_class`, `context`, and `output_schema_id` requests. R6 preserves those public production interfaces.

The new runtime is therefore inserted behind the existing provider interface:

```text
R3 DBV
  -> ProviderRuntime.run(request)
      -> ModelPolicy.resolve(request)
      -> ProviderRegistry.resolve(provider_id)
      -> GLMAdapter.run(enriched_request)
      -> AI Run Record
  -> existing R3 output validators
  -> R4 Mechanical Trust
  -> R5 Routing
```

`Real Model Output != Canonical Authority` remains a hard invariant.

## Provider approaches considered

### A. Modify every R3 role wrapper to know GLM

Rejected. This would leak provider/model details into Designer, Builder, and Verifier and make future providers harder to add.

### B. Put model selection directly inside `GLMAdapter`

Rejected as the primary architecture. It works for one provider but makes role policy, provenance, and future provider routing opaque.

### C. ProviderRuntime + Registry + ModelPolicy

Selected. R3 continues talking to one provider-shaped object, while R6 owns provider selection, model policy, provenance, and run recording behind that interface.

## Provider Registry

`ProviderRegistry` stores named provider adapters.

Required behavior:

- unique provider IDs;
- explicit registration;
- explicit resolution;
- no silent fallback from `glm` to `fake`;
- no mutation of registered adapters;
- adapter must pass `assertProviderAdapter`.

Initial provider IDs:

- `fake` for deterministic CI and fixtures;
- `glm` for live BigModel / Z.AI HTTP access.

## Model Policy

R6 uses one deterministic policy table keyed by `role + prompt_class`.

Initial policy classes:

| Role | Prompt class | Prompt ID | Context class | Source set class | Verification goal |
| --- | --- | --- | --- | --- | --- |
| designer | `design_contract` | `ocme-designer-v0.1` | `atlas_design_context` | `canonical_prerequisite_context` | `contract_construction` |
| builder | `candidate_build` | `ocme-builder-v0.1` | `candidate_build_context` | `design_plus_selected_sources` | `candidate_materialization` |
| builder | `builder_repair` | `ocme-builder-repair-v0.1` | `repair_context` | `candidate_objection_evidence` | `objection_targeted_repair` |
| verifier | `candidate_verify` | `ocme-verifier-v0.1` | `independent_verification_context` | `independent_verifier_sources` | `counterexample_and_gap_search` |

The same model family may serve all roles, but the policy must preserve different prompt classes, context classes, source-set classes, and verification goals.

Default model selection is environment-configurable:

```text
GLM_MODEL_DESIGNER
GLM_MODEL_BUILDER
GLM_MODEL_VERIFIER
GLM_MODEL
```

Role-specific values override `GLM_MODEL`. The implementation default may be `glm-5.3-flash`, but no schema or protocol treats that model string as canonical.

## GLM transport

R6 uses Node's built-in `fetch`; no OpenAI SDK dependency is added.

Supported base URLs are configuration, not hardcoded protocol identity:

- BigModel general endpoint base: `https://open.bigmodel.cn/api/paas/v4`
- BigModel Coding endpoint base when the account requires it: `https://open.bigmodel.cn/api/coding/paas/v4`
- Z.AI endpoint base: `https://api.z.ai/api/paas/v4`

The adapter appends `/chat/completions`.

Environment variables:

```text
GLM_API_KEY
GLM_BASE_URL
GLM_MODEL
GLM_MODEL_DESIGNER
GLM_MODEL_BUILDER
GLM_MODEL_VERIFIER
```

`GLM_API_KEY` is read only by the live adapter constructor / pilot script and must never enter request artifacts, model policy artifacts, run records, errors, or committed data.

## Structured output strategy

The official GLM-compatible endpoint supports:

```json
{"response_format":{"type":"json_object"}}
```

R6 sends:

- role-specific system prompt;
- canonical JSON context;
- exact OCME output schema associated with `output_schema_id`;
- explicit instruction to return only the final JSON artifact.

The adapter parses `choices[0].message.content` as JSON and then returns it through the existing `validateProviderResponse` boundary. R3's existing role-specific validators remain authoritative for semantic protocol acceptance.

No permissive markdown-fence stripping is performed in v0.1: malformed or non-JSON provider output is rejected.

## Hidden reasoning boundary

GLM responses may contain `reasoning_content`. R6 never returns or records it.

The adapter may record only a boolean such as:

```json
{"reasoning_content_discarded": true}
```

It must not copy the reasoning text into:

- `structured_output`;
- `provider_metadata`;
- AI Run Records;
- errors;
- fixtures;
- inter-role context.

The only artifact exchanged between R3 roles remains the validated Design Contract / Candidate Envelope / Verification Report / Repair Patch.

## Prompt library

Provider transport and role prompts are separate modules.

The prompt library contains versioned role prompts. Every prompt states:

- role authority;
- prohibited canonical/truth authority;
- exact output artifact type;
- JSON-only output requirement;
- no hidden reasoning disclosure requirement.

Changing prompt text requires changing its prompt version.

## Output schema registry

R6 resolves only these existing R3 schema IDs:

```text
ocme-design-contract-v0.1 -> schemas/design-contract.schema.json
ocme-candidate-envelope-v0.1 -> schemas/candidate-envelope.schema.json
ocme-verification-report-v0.1 -> schemas/verification-report.schema.json
ocme-repair-patch-v0.1 -> schemas/repair-patch.schema.json
```

Unknown output schema IDs are rejected before a network call.

## AI Run Record

Every `ProviderRuntime.run()` call creates one immutable record.

Minimum fields:

```text
schema_version
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
usage
billing
network_used
```

`input_sha256` hashes the canonical provider request plus resolved non-secret policy. `output_sha256` hashes only `structured_output`.

The record never contains API keys, Authorization headers, raw hidden reasoning, or full raw HTTP bodies.

Billing is provenance, not a pricing database:

```json
{
  "status": "not_computed",
  "amount": null,
  "currency": null
}
```

A future layer may attach provider-reported or policy-estimated cost without changing the R6 trust semantics.

## ProviderRuntime

`ProviderRuntime` implements the existing provider adapter interface.

Responsibilities:

1. validate incoming R3 request;
2. resolve deterministic Model Policy;
3. resolve provider from Provider Registry;
4. enrich `run_metadata` with non-secret policy metadata;
5. call the selected provider adapter;
6. validate provider response;
7. build and validate AI Run Record;
8. store an immutable in-memory copy;
9. return the normal provider response to R3.

`getRunRecords()` returns cloned records. It must not expose mutable internal state.

Provider errors do not trigger fallback to another provider.

## GLM adapter request policy

R6 v0.1 is deliberately tool-free.

Allowed request body fields are limited to:

```text
model
messages
stream=false
response_format={type:json_object}
thinking
reasoning_effort
max_tokens
temperature
top_p
do_sample
request_id
```

No `tools`, provider web search, MCP, browsing, retrieval, or arbitrary function calls are enabled in R6.

The policy layer owns optional generation settings. The transport adapter does not invent role behavior.

## HTTP and error handling

Required behavior:

- HTTPS remote endpoint;
- Bearer Authorization header;
- JSON content type;
- abort timeout;
- non-2xx responses throw sanitized errors;
- invalid response shape throws;
- missing assistant content throws;
- invalid JSON content throws;
- tool-call finish reason is rejected in R6;
- secrets are never interpolated into error messages;
- response `reasoning_content` is discarded.

`fetchImpl` is injectable so CI tests the actual request construction and parsing without network access.

## R6 offline acceptance

Normal CI must remain network-free.

CI verifies:

- registry behavior;
- model-policy role separation;
- prompt/schema resolution;
- GLM HTTP request construction through injected fetch;
- response parsing;
- usage normalization;
- secret non-leak;
- reasoning-content discard;
- timeout / HTTP / invalid-JSON failures;
- AI Run Record hashes and identity binding;
- ProviderRuntime works with existing R3 DBV loop;
- Fake Provider behavior remains intact;
- all R1-R5 checks remain green.

## Credential-gated live pilot

`scripts/run-glm-pilot.mjs` is manual and never part of `npm run check`.

It requires `GLM_API_KEY` and selects three P1 Atlas-seed materialization tasks with existing prerequisites satisfied where possible. It runs the existing DBV loop with bounded attempts and prints only:

- task ID;
- final DBV status;
- attempt count;
- run IDs;
- token usage totals;
- model/provider IDs;
- no raw hidden reasoning;
- no API key.

A pilot result of `escalation_required` is a valid runtime outcome. Provider transport/schema failure is not.

If credentials are unavailable during R6 implementation, the repo may reach `IMPLEMENTATION_VALIDATED / LIVE_PILOT_NOT_RUN` but must not claim live connectivity was executed.

## Acceptance rule

R6 source implementation is accepted only after:

- exact implementation HEAD passes full OCME CI;
- exact implementation HEAD passes Lean CI;
- canonical/formal data paths have zero diff;
- validation artifact is committed;
- artifact HEAD independently passes OCME CI and Lean CI.

Live-provider execution is separately recorded as `run`, `not_run_no_credentials`, or `failed`. No result may be silently upgraded.

## External interface references

- BigModel HTTP API: `https://docs.bigmodel.cn/cn/guide/develop/http/introduction`
- BigModel Chat Completion API: `https://docs.bigmodel.cn/api-reference/模型-api/对话补全`
- Z.AI Chat Completion API: `https://docs.z.ai/api-reference/llm/chat-completion`
- ZCode provider configuration / GLM-5.3 family availability: `https://zcode.z.ai/cn/docs/configuration`
