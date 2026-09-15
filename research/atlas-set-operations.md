---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-set-operations
target_mko_id: mko-set-operations
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-15
review_required: true
---

# 集合運算 research packet

## 範圍與語義決定

本包建立二元聯集、交集、差集，以及相對明示全集的補集。對同一論域中的集合 `A`、`B`：

- `x∈A∪B` 當且僅當 `x∈A` 或 `x∈B`；
- `x∈A∩B` 當且僅當 `x∈A` 且 `x∈B`；
- `x∈A\B` 當且僅當 `x∈A` 且 `x∉B`；
- 在明示全集 `U` 中，`A` 的相對補集是 `U\A`。

代表公式只使用 `A∪B`。它不是四種運算的單一公式，也不預先宣稱交換律、結合律、分配律或德摩根律；這些普遍性質若加入，必須另有 statement 與 Evidence。

## 來源

- [Mathlib：Set Operations](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Set/Operations.html)：列出聯集、交集、補集與差集記號，並給出 complement／difference 的 membership unfolding。
- [Mathlib：Set Basic](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Set/Basic.html)：`Set.mem_union` 將聯集隸屬對齊邏輯析取，也收錄基本集合性質。
- [Mathematics in Lean：Sets and Functions](https://leanprover-community.github.io/mathematics_in_lean/C04_Sets_and_Functions.html)：以 `Set α` 的同型別論域說明 `∪`、`∩`、`\`、`univ` 與集合外延。

本包只做 OCME 原創改寫與語義定位；來源存取日期為 2026-09-15。

## 候選規格

- 類型：`definition`
- 公式：`A\cup B`
- hard dependency：`mko-set-membership`
- 主領域：`foundations_logic`
- 方法：`method-direct-proof`
- 課程：`curriculum-ocme-university-core:foundations.set-operations`
- 學習路徑：`path-set-language-to-topology-candidate`
- 形式化義務：分別對齊 union、intersection、difference、complement 的 membership iff；不得用有限列舉取代普遍聲明。

本次 Evidence refs 為空；Lean producer 只標 `configured`，formalization 維持 `not_formalized`。補集的全集／ambient type 必須明示，避免把補集寫成與論域無關的絕對集合。
