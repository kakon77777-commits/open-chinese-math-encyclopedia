# OCME R5 Risk / Epistemic Diversity / Escalation Routing Design

## Status

Approved implementation design for R5, derived from the accepted OCME Next-Phase Engineering Blueprint and the verified R4 baseline.

## Goal

Add a deterministic routing layer that turns R4 mechanical evidence, Atlas structure, verifier objections, and review-topology metadata into four explicit artifacts:

1. Risk Profile;
2. Diversity Profile;
3. Disagreement Object(s);
4. Escalation Decision.

R5 does not estimate mathematical truth probability. It does not call GLM/frontier providers and it does not canonicalize anything.

## Non-goals

- no live AI provider calls;
- no frontier adjudication execution;
- no canonical state mutation;
- no Bayesian or learned correctness probability;
- no majority-vote truth rule;
- no replacement of R4 Mechanical Trust Reports;
- no mutation of Atlas, MKO, Evidence, SEDB-Math, or formal sources.

## Epistemic boundary

`risk_class` means routing burden, not probability of error.

`diversity_level` means independence of review topology, not confidence.

`disagreement` remains open until a later process resolves it; review counts never select a winner.

## Inputs

### Risk classifier

- R2 Materialization Task;
- matching canonical Atlas entry;
- R4 Mechanical Trust Report;
- zero or more R3 Verification Objections;
- zero or more unresolved-risk strings from R3 verification reports;
- downstream Atlas dependency count computed from the canonical Atlas.

### Diversity evaluator

A list of normalized review observations. Every observation contains:

- `review_id`;
- `candidate_revision_id`;
- `issue_key`;
- `position`: `support | oppose | uncertain`;
- `model_family`;
- `model_version`;
- `role`;
- `prompt_class`;
- `context_class`;
- `source_set_id`;
- `tool_set_id`;
- `verification_goal`.

Review observations are metadata fixtures in R5. R6 may later populate them from real provider run records.

## Risk scoring policy v0.1

Risk score is an explainable integer from 0 to 100. Every contribution is emitted as a factor.

### Base contributions

- Mechanical report failure: hard floor `L4`, score contribution 100 before cap.
- Each open critical objection: hard floor `L4`, +40.
- Each open major objection: hard floor `L3`, +25, capped at +50 for major objections.
- Each open minor objection: +8, capped at +24 for minor objections.
- Each unresolved-risk string: +6, capped at +18.
- Open `counterexample_found`: hard floor `L4`.
- Open `formalization_mismatch`: hard floor `L3`.

### Atlas difficulty contribution

Let `dmax` be the maximum of:

- `prerequisite_depth`;
- `abstraction_level`;
- `proof_burden`;
- `exception_boundary_density`;
- `formalization_burden`.

Contribution is `(dmax - 1) * 5`, therefore 0 to 20 for the current 1–5 Atlas scale.

### Downstream centrality contribution

Count Atlas entries whose `prerequisites` contain the target Atlas ID:

- 0 dependents: +0;
- 1–3 dependents: +5;
- 4–7 dependents: +10;
- 8+ dependents: +15.

### Object-kind contribution

- `theorem` or `proof`: +15;
- `function` or `relation`: +5;
- `concept`, `notation`, `operation`, `representation`: +0;
- unknown object kinds: +10 and an explicit warning factor.

### Score bands

Before hard-floor application:

- 0–14: `L0`;
- 15–29: `L1`;
- 30–49: `L2`;
- 50–74: `L3`;
- 75–100: `L4`.

Hard floors may only increase the class.

Materialization priority is recorded in the profile but is not interpreted as truth risk.

## Risk Profile contract

Required fields:

- `schema_version = ocme-risk-profile-v0.1`;
- `profile_id`;
- `policy_version = ocme-risk-policy-v0.1`;
- `epistemic_scope = routing_risk_only`;
- `task_id`;
- `atlas_id`;
- `candidate_revision_id`;
- `mechanical_report_id`;
- `materialization_priority`;
- `risk_score`;
- `risk_class`;
- `hard_floor` (`null | L0..L4`);
- `factors`;
- `downstream_dependency_count`.

Schema and semantic validation must reject truth-probability, confidence, canonical-verdict, or canonical-state fields.

## Diversity policy v0.1

The independent axes are:

1. model family;
2. prompt class;
3. context class;
4. source set;
5. tool set;
6. verification goal.

`diversified_axes` is the count of axes with more than one unique value.

`effective_review_groups` is the number of unique tuples across all six axes. Repeating the exact same topology does not increase this number.

### Diversity levels

- `high`: at least 4 diversified axes, at least 2 model families, and at least 2 source sets;
- `medium`: at least 2 diversified axes and at least one of model family / source set / tool set is diversified;
- `low`: otherwise.

When 3+ observations share one model family, one context class, one source set, and one tool set, emit `pseudo_independent_consensus` regardless of whether their positions agree.

No numeric diversity value may be labeled confidence or correctness probability.

## Diversity Profile contract

Required fields:

- `schema_version = ocme-diversity-profile-v0.1`;
- `profile_id`;
- `policy_version = ocme-diversity-policy-v0.1`;
- `epistemic_scope = review_topology_only`;
- `candidate_revision_id`;
- `review_count`;
- `effective_review_groups`;
- `diversified_axes`;
- `unique_counts`;
- `diversity_level`;
- `warnings`;
- `reviews`.

## Disagreement policy

Group observations by `issue_key`.

Create a Disagreement Object whenever an issue contains more than one distinct position among `support`, `oppose`, and `uncertain`.

A disagreement stores every observation and remains `status=open`.

The schema forbids `winner`, `majority_verdict`, `truth`, and `canonical_verdict` fields. Two support observations versus one oppose observation is still an open disagreement.

## Escalation policy v0.1

R5 chooses a route marker. It does not execute the next stage.

Priority order:

1. if Mechanical Trust is `fail`: `repair_required`;
2. else if Risk Class is `L4`: `high_assurance_review_required`;
3. else if any open disagreement exists: `independent_verification_required`;
4. else if Risk Class is `L3` and Diversity is `low`: `independent_verification_required`;
5. else if Risk Class is `L3`: `high_assurance_review_required`;
6. else if Risk Class is `L2` and Diversity is `low`: `independent_verification_required`;
7. otherwise: `continue_local`.

`high_assurance_review_required` is deliberately provider-neutral. R7 may later map it to frontier and/or human adjudication policy.

Escalation never emits `canonical`, `accept`, or mathematical-truth verdicts.

## Escalation Decision contract

Required fields:

- `schema_version = ocme-escalation-decision-v0.1`;
- `decision_id`;
- `policy_version = ocme-escalation-policy-v0.1`;
- `candidate_revision_id`;
- `risk_profile_id`;
- `diversity_profile_id`;
- `mechanical_report_id`;
- `route`;
- `blocking`;
- `reasons`;
- `open_disagreement_ids`.

All referenced artifacts must target the same candidate revision. A stale/mismatched profile is rejected.

## File layout

Add:

- `schemas/risk-profile.schema.json`
- `schemas/diversity-profile.schema.json`
- `schemas/disagreement.schema.json`
- `schemas/escalation-decision.schema.json`
- `lib/risk-profile-validation.js`
- `lib/diversity-profile-validation.js`
- `lib/disagreement-validation.js`
- `lib/escalation-decision-validation.js`
- `runtime/trust/risk-classifier.js`
- `runtime/trust/diversity.js`
- `runtime/trust/disagreement.js`
- `runtime/trust/escalation.js`
- `tests/risk-routing.mjs`
- `tests/diversity-profile.mjs`
- `tests/diversity-negative.mjs`
- `tests/disagreement.mjs`
- `tests/escalation.mjs`
- `scripts/validate-risk-routing.mjs`

Modify only `package.json` for integration.

## TDD acceptance cases

### Risk

- same input produces byte-equivalent semantic profile;
- Mechanical Trust failure forces `L4`;
- critical objection forces `L4`;
- major objection cannot remain below `L3`;
- an open counterexample forces `L4`;
- high Atlas difficulty contributes deterministically;
- downstream centrality is computed from canonical Atlas, not caller claims;
- no truth/confidence/canonical fields are allowed.

### Diversity

- three identical review topologies produce `low` diversity and one effective group;
- different model names alone are insufficient for `high` diversity;
- sufficiently different model/source/context/tool topology produces `high` diversity;
- `pseudo_independent_consensus` is emitted for 3+ same-topology reviews.

### Disagreement

- 2 support + 1 oppose remains one open disagreement;
- no majority winner is emitted;
- unanimous positions do not create disagreement objects;
- mixed uncertainty creates an open disagreement.

### Escalation

- Mechanical FAIL routes to `repair_required`;
- L4 routes to `high_assurance_review_required` even with high diversity;
- L3 + low diversity routes to independent verification;
- any open disagreement routes to independent verification unless a higher-priority rule applies;
- low-risk, no-disagreement candidate may continue locally;
- mismatched candidate IDs across artifacts are rejected.

## Repository acceptance gate

R5 is accepted only when:

- all new RED cases have demonstrated the intended failure;
- all new GREEN tests pass;
- `npm run check` passes with R5 integrated;
- the existing R4 mechanical-trust live validation still passes;
- Lean CI passes on the exact final implementation HEAD;
- base-to-head diff shows no canonical data/formal drift;
- a machine-readable R5 validation artifact is committed;
- the validation-artifact HEAD independently passes both OCME CI and Lean CI.
