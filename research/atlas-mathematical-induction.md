---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-mathematical-induction
target_mko_id: mko-mathematical-induction
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-13
review_required: true
---

# 數學歸納法 research packet

## 範圍與語義決定

本包處理以自然數索引的命題族 `P(n)`。要證明從 0 起的所有自然數都滿足 `P`，需同時完成基礎情況 `P(0)` 與歸納步驟：在任意 `n` 下由 `P(n)` 推出 `P(n+1)`。

歸納假設不是把待證結論無條件假定為真；它只能在歸納步驟的指定作用域中使用。若命題從 1 或其他起點開始，基礎情況與涵蓋範圍也必須同步改變。

## 來源

- [Theorem Proving in Lean 4：Induction and Recursion](https://docs.lean-lang.org/theorem_proving_in_lean4/induction_and_recursion.html)：將歸納定位為對歸納型別的基本證明方式，並展示自然數結構歸納。
- [Functional Programming in Lean：Tactics, Induction, and Proofs](https://lean-lang.org/functional_programming_in_lean/Interlude___-Tactics___-Induction___-and-Proofs/)：明示自然數命題的基礎情況與歸納步驟。
- [Lean Reference：Natural Numbers](https://lean-lang.org/doc/reference/latest/Basic-Types/Natural-Numbers/)：定位 0 與後繼的自然數模型。

Lean 文件採 Apache-2.0。本包只做原創摘要，存取日期為 2026-09-13。

## 候選規格

- 類型：`concept`
- 公式：`P(n)`，只代表自然數索引命題族，不是完整歸納原理公式。
- 依賴：`mko-natural-number`、`mko-proposition`
- 主領域：`history_philosophy_methodology`
- 方法：`method-induction`
- 課程：`curriculum-ocme-university-core:methods.mathematical-induction`
- 形式化義務：建立最小 Lean `Nat` induction 範例，精確標示 base、step 與涵蓋範圍。

本次不新增 Evidence Object；Lean producer 只標 `configured`。

