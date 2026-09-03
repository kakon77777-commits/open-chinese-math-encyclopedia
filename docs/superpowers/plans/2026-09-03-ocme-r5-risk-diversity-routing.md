# OCME R5 Risk / Diversity / Escalation Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic routing-risk, epistemic-diversity, disagreement-preservation, and escalation-decision artifacts on top of the verified R4 Mechanical Trust layer.

**Architecture:** R5 is a pure policy layer. It consumes existing R2/R3/R4 artifacts plus canonical Atlas structure, emits immutable structured profiles/decisions, and performs no provider calls or canonical writes. Every policy output is schema-valid, candidate-bound, explainable, and explicitly non-probabilistic.

**Tech Stack:** Node.js ES modules, JSON Schema Draft 2020-12, Ajv 8.17.1, existing OCME stores/validators/tests, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-ocme-r5-risk-diversity-routing-design.md`

## Global Constraints

- Preserve the verified R4 baseline at `main@edaf8e4938a176478a87a18c894a27a9358fbd4f`.
- Do not modify canonical MKO, Evidence, Architecture, Atlas, SEDB-Math, or formal source data.
- Do not call live AI providers.
- Do not emit correctness probability, mathematical truth, canonical state, or canonical verdict fields.
- Risk means routing burden only; diversity means review-topology independence only.
- Every task uses strict RED -> GREEN -> full regression before proceeding.

---

### Task 1: Deterministic Risk Profile

**Files:**
- Create: `schemas/risk-profile.schema.json`
- Create: `lib/risk-profile-validation.js`
- Create: `runtime/trust/risk-classifier.js`
- Test: `tests/risk-routing.mjs`
- Modify: `package.json` only to add the RED test after the test file exists.

**Interfaces:**
- Consumes: `task`, `atlasEntry`, full canonical `atlas`, `mechanicalReport`, `objections`, `unresolvedRisks`.
- Produces: `classifyRoutingRisk({ task, atlasEntry, atlas, mechanicalReport, objections, unresolvedRisks }) -> RiskProfile`.
- Produces validator: `validateRiskProfile(profile, { task, atlasEntry, mechanicalReport }) -> { ok, errors }`.

- [ ] **Step 1: Write the failing test**

Create `tests/risk-routing.mjs` with fixtures built from the first materialization task and matching Atlas entry. Assert:

```js
const baseline = classifyRoutingRisk({
  task,
  atlasEntry,
  atlas,
  mechanicalReport: passMechanicalReport,
  objections: [],
  unresolvedRisks: [],
})
assert.equal(baseline.epistemic_scope, 'routing_risk_only')
assert.match(baseline.risk_class, /^L[0-4]$/)

const mechanicalFail = classifyRoutingRisk({
  ...inputs,
  mechanicalReport: { ...passMechanicalReport, mechanical_status: 'fail' },
})
assert.equal(mechanicalFail.risk_class, 'L4')

const critical = classifyRoutingRisk({
  ...inputs,
  objections: [{ ...objectionFixture, severity: 'critical', status: 'open' }],
})
assert.equal(critical.risk_class, 'L4')
```

Also assert an open `major` objection cannot be below `L3`, an open `counterexample_found` forces `L4`, high difficulty increases score, caller-supplied fake downstream counts are impossible because classifier computes from Atlas, and no truth/confidence/canonical fields exist.

- [ ] **Step 2: Run CI to verify RED**

Expected failure: `ERR_MODULE_NOT_FOUND` for `runtime/trust/risk-classifier.js` or `lib/risk-profile-validation.js`, after all R1-R4 checks pass.

- [ ] **Step 3: Implement minimal schema and classifier**

Implement exact spec policy:

```js
const CLASS_RANK = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 }

function scoreToClass(score) {
  if (score >= 75) return 'L4'
  if (score >= 50) return 'L3'
  if (score >= 30) return 'L2'
  if (score >= 15) return 'L1'
  return 'L0'
}
```

Compute downstream dependents by scanning `atlas.entries` for `entry.prerequisites.includes(atlasEntry.id)`. Cap score at 100. Apply hard floors only upward. Emit every contribution in `factors`.

- [ ] **Step 4: Run full `npm run check` through PR CI**

Expected: PASS.

- [ ] **Step 5: Commit GREEN separately from later tasks**

Commit message: `feat(r5): add deterministic routing risk profile`.

---

### Task 2: Epistemic Diversity Profile

**Files:**
- Create: `schemas/diversity-profile.schema.json`
- Create: `lib/diversity-profile-validation.js`
- Create: `runtime/trust/diversity.js`
- Test: `tests/diversity-profile.mjs`
- Test: `tests/diversity-negative.mjs`
- Modify: `package.json` only to register tests.

**Interfaces:**
- Consumes: normalized review observation array.
- Produces: `buildDiversityProfile({ candidateRevisionId, reviews }) -> DiversityProfile`.
- Produces: `validateDiversityProfile(profile, { candidateRevisionId }) -> { ok, errors }`.

- [ ] **Step 1: Write RED tests**

Use three exact-duplicate topology reviews:

```js
const low = buildDiversityProfile({ candidateRevisionId, reviews: [r1, r2, r3] })
assert.equal(low.diversity_level, 'low')
assert.equal(low.effective_review_groups, 1)
assert.ok(low.warnings.includes('pseudo_independent_consensus'))
```

Use three reviewers with different model names but identical source/context/tool; assert diversity is not `high`.

Use sufficiently heterogeneous model/source/context/tool/prompt/goal inputs; assert `high`.

Negative tests reject duplicate `review_id`, candidate mismatch, invalid positions, and forbidden confidence/truth/canonical fields.

- [ ] **Step 2: Verify RED in PR CI**

Expected failure: missing `runtime/trust/diversity.js`.

- [ ] **Step 3: Implement exact topology rules**

Axes:

```js
const AXES = [
  'model_family',
  'prompt_class',
  'context_class',
  'source_set_id',
  'tool_set_id',
  'verification_goal',
]
```

Unique review-group key is the canonical JSON tuple of all six axes. `high` requires >=4 diversified axes, >=2 model families, >=2 source sets. `medium` requires >=2 diversified axes and diversification of model family/source set/tool set. Otherwise `low`.

- [ ] **Step 4: Run full regression**

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(r5): add epistemic diversity profile`.

---

### Task 3: Disagreement Preservation and Escalation Decision

**Files:**
- Create: `schemas/disagreement.schema.json`
- Create: `schemas/escalation-decision.schema.json`
- Create: `lib/disagreement-validation.js`
- Create: `lib/escalation-decision-validation.js`
- Create: `runtime/trust/disagreement.js`
- Create: `runtime/trust/escalation.js`
- Test: `tests/disagreement.mjs`
- Test: `tests/escalation.mjs`
- Modify: `package.json` only to register tests.

**Interfaces:**
- Produces: `buildDisagreements({ candidateRevisionId, reviews }) -> Disagreement[]`.
- Produces: `routeEscalation({ mechanicalReport, riskProfile, diversityProfile, disagreements }) -> EscalationDecision`.

- [ ] **Step 1: Write disagreement RED**

```js
const disagreements = buildDisagreements({
  candidateRevisionId,
  reviews: [support1, support2, oppose1],
})
assert.equal(disagreements.length, 1)
assert.equal(disagreements[0].status, 'open')
assert.equal(Object.hasOwn(disagreements[0], 'winner'), false)
assert.equal(Object.hasOwn(disagreements[0], 'majority_verdict'), false)
```

Assert unanimous reviews create no disagreement and support+uncertain creates one open disagreement.

- [ ] **Step 2: Verify disagreement RED**

Expected failure: missing `runtime/trust/disagreement.js`.

- [ ] **Step 3: Implement disagreement grouping**

Group by `issue_key`; create a disagreement only if the set of positions has size >1. Preserve all observations in stable order by `review_id`.

- [ ] **Step 4: Write escalation RED**

Assert priority order:

```js
assert.equal(route(mechanicalFail).route, 'repair_required')
assert.equal(route(l4HighDiversity).route, 'high_assurance_review_required')
assert.equal(route(l3LowDiversity).route, 'independent_verification_required')
assert.equal(route(withOpenDisagreement).route, 'independent_verification_required')
assert.equal(route(lowRiskNoDisagreement).route, 'continue_local')
```

Also create mismatched candidate revision fixtures and require rejection.

- [ ] **Step 5: Verify escalation RED**

Expected failure: missing `runtime/trust/escalation.js`.

- [ ] **Step 6: Implement minimal deterministic router and validators**

`blocking=true` for every route except `continue_local`. No provider is called.

- [ ] **Step 7: Run full regression and commit**

Commit message: `feat(r5): preserve disagreement and route escalation`.

---

### Task 4: Repository Integration and Final Acceptance

**Files:**
- Create: `scripts/validate-risk-routing.mjs`
- Create after implementation validation: `artifacts/r5-risk-diversity-validation.json`
- Modify: `package.json`

**Interfaces:**
- `npm run validate:risk-routing` exercises one deterministic low/medium route fixture plus explicit L4/low-diversity/disagreement routes without network access.

- [ ] **Step 1: Add integration RED**

Add to `package.json`:

```json
"validate:risk-routing": "node scripts/validate-risk-routing.mjs"
```

Insert `npm run validate:risk-routing` after `validate:mechanical-trust` and before `npm test` in `check`. Do not create the script yet.

- [ ] **Step 2: Verify RED**

Expected: all previous gates pass, then `MODULE_NOT_FOUND: scripts/validate-risk-routing.mjs`.

- [ ] **Step 3: Create the integration validator**

The script must load canonical Atlas/materialization inputs, construct a schema-valid R3/R4 candidate context, build risk/diversity/disagreement/route artifacts, validate them, and print a compact summary such as:

```text
R5 routing validation passed: baseline=<class>/<route>; critical=L4/high_assurance_review_required; pseudo-consensus=low; disagreement=independent_verification_required.
```

No network and no raw model output.

- [ ] **Step 4: Extend syntax gate**

Add all R5 `lib/`, `runtime/trust/`, and `scripts/validate-risk-routing.mjs` files to `test:syntax`.

- [ ] **Step 5: Run integrated HEAD verification**

Require exact HEAD:

- OCME CI PASS;
- Lean CI PASS;
- base-to-head diff contains only R5 docs/schema/lib/runtime/script/tests/package integration;
- protected canonical/formal paths have zero diff.

- [ ] **Step 6: Commit machine-readable validation artifact**

Record:

- base SHA;
- validated implementation SHA;
- TDD RED/Green run IDs;
- policy semantics;
- scope audit;
- CI and Lean evidence;
- no live provider;
- no canonical authority.

- [ ] **Step 7: Verify artifact HEAD independently**

The artifact commit creates a new HEAD. Require fresh OCME CI + Lean CI on that exact HEAD.

- [ ] **Step 8: Finish branch**

Post final verification to the PR and mark it Ready for Review. Do not merge without explicit user choice.
