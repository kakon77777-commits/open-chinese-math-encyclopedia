---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-counting-principle
target_mko_id: mko-counting-principle
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-13
review_required: true
---

# 基本計數原理 research packet

## 範圍與語義決定

本包建立有限選擇的加法原理與乘法原理。互斥情況分支的數量可以相加；連續且每個前一步選擇都具有明示數量的後續選擇時，選擇序列的數量可以相乘。

加法原理要求案例不重疊，否則會重複計數；乘法原理要求每一階段的選項數與依賴條件被正確描述。代表公式 `N(A)` 只表示有限集合或選擇族的數量，不把兩條原理壓成一個未受支持的公式 AST。

## 來源

- [Mathlib：Fintype Sum](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Fintype/Sum.html)：`card_sum` 形式化不相交型別和的基數為兩者基數相加。
- [Mathlib：Fintype Prod](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Fintype/Prod.html)：`card_prod` 形式化有限型別積的基數為基數相乘。
- [Mathematics in Lean](https://leanprover-community.github.io/mathematics_in_lean/mathematics_in_lean.pdf)：定位有限集合基數與乘積的基本形式化操作。

Mathlib 與相關文件採 Apache-2.0。本包只做原創改寫與語義定位，存取日期為 2026-09-13。

## 候選規格

- 類型：`concept`
- 公式：`N(A)`
- 依賴：`mko-natural-number`、`mko-arithmetic-operations`
- 主領域：`combinatorics_discrete`
- 方法：`method-construction`
- 課程：`curriculum-ocme-general:discrete.counting-principle`
- 形式化義務：分別對齊 `Fintype.card_sum` 與 `Fintype.card_prod`，不得把非互斥聯集直接套加法原理。

本次不新增 Evidence Object；Lean producer 只標 `configured`。

