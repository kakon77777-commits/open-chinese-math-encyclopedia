---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-variable-expression
target_mko_id: mko-variable-expression
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-13
review_required: true
---

# 變數與代數式 research packet

## 範圍與語義決定

本包把代數式視為由常數、變數與已定義運算依語法組成的表達式。變數的值或作用域未指定時，`x+1` 表示依賴 `x` 的表達式，而不是一個已求出的固定數。

代數式不自動等於方程式：`x+1` 是表達式，只有加入等號與另一表達式後才形成方程。相同值也不表示語法結構相同；等價改寫需要明示適用的數系與規則。

## 來源

- [Functional Programming in Lean：Evaluating Expressions](https://docs.lean-lang.org/functional_programming_in_lean/Getting-to-Know-Lean/Evaluating-Expressions/)：說明含變數表達式需取得變數值才能求值，並區分運算優先順序。
- [Lean Reference：The Type System](https://lean-lang.org/doc/reference/latest/The-Type-System/)：把 term／expression 定位為有型別才具有意義的核心單位。
- [Common Core State Standards for Mathematics](https://corestandards.org/wp-content/uploads/2023/09/ADA-Compliant-Math-Standards.pdf)：支持表達式、方程與恆等式在課程語境中的區分。

Lean 文件採 Apache-2.0；Common Core 僅作課程參考。本包不複製來源段落，存取日期為 2026-09-13。

## 候選規格

- 類型：`concept`
- 公式：`x+1`
- 依賴：`mko-arithmetic-operations`
- 主領域：`algebra`
- 方法：`method-direct-proof`
- 課程：`curriculum-ocme-university-core:algebra.variable-expression`
- 形式化義務：明示變數型別與允許運算，建立表達式求值函數及作用域檢查。

本次不新增 Evidence Object；Lean producer 只標 `configured`。

