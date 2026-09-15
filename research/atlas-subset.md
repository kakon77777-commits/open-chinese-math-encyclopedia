---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-subset
target_mko_id: mko-subset
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-15
review_required: true
---

# 子集合 research packet

## 範圍與語義決定

本包只建立非嚴格子集合關係。對同一 ambient type 或同一明示論域中的集合 `A`、`B`：

- `A⊆B` 當且僅當對每個對象 `x`，若 `x∈A`，則 `x∈B`；
- `A⊆A` 成立，因此 `⊆` 不要求兩個集合不同；
- `x∈A` 的左側是元素，`A⊆B` 的左右兩側都是集合，兩種關係不可混同；
- 嚴格子集合必須另加 `A≠B` 或改用精確的嚴格包含定義，本包不以 `⊆` 代替它。

代表公式採 `A\subseteq B`。本包不預先宣稱自反性、傳遞性、反對稱性或集合相等判準為已證 theorem；若後續建立這些性質，必須有獨立 statement 與 Evidence。

## 來源

- [Mathlib：Set Definitions](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Set/Defs.html)：`Set.Subset` 明確定義 `s⊆t` 為每個 `s` 的元素亦屬於 `t`。
- [Mathlib：Set Basic](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Set/Basic.html)：提供子集合關係所處的集合次序與基本 API。
- [Mathematics in Lean：Sets and Functions](https://leanprover-community.github.io/mathematics_in_lean/C04_Sets_and_Functions.html)：以逐元素引入的方式展示集合包含證明，並區分 `∈`、`⊆` 與集合相等。

本包只做 OCME 原創改寫與語義定位；來源存取日期為 2026-09-15。

## 候選規格

- 類型：`definition`
- 公式：`A\subseteq B`
- hard dependency：`mko-set-membership`
- 主領域：`foundations_logic`
- 方法：`method-direct-proof`
- 課程：`curriculum-ocme-university-core:foundations.subset`
- 學習路徑：`path-set-language-to-topology-candidate`
- 形式化義務：精確綁定 `Set.Subset` 的定義展開，證明 `A⊆B ↔ ∀ ⦃x⦄, x∈A → x∈B`，並保存使用的 Mathlib 版本與 axiom receipt。

本次 Evidence refs 為空；Lean producer 只標 `configured`，formalization 維持 `not_formalized`。有限集合逐項檢查只能驗證具體實例，不能取代任意集合上的全稱定義或普遍定理。
