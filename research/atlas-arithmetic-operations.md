---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-arithmetic-operations
target_mko_id: mko-arithmetic-operations
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-13
review_required: true
---

# 四則運算 research packet

## 範圍與語義決定

本包把加、減、乘、除視為依特定數系定義的基本二元運算家族。它不宣稱四種運算在所有數系都封閉：自然數相減可能離開自然數，除法也可能沒有整除結果，而除以零不在通常數系的除法定義域中。

代表公式採 `a+b`，只代表四則運算家族中的加法介面；v0.4 公式編譯器尚未提供乘法 AST，因此不得把這一個公式誤解成完整列舉。

## 來源

- [Lean Reference：Natural Numbers](https://lean-lang.org/doc/reference/latest/Basic-Types/Natural-Numbers/)：確認自然數、算術運算與其邏輯模型的形式化位置。
- [Theorem Proving in Lean 4：Induction and Recursion](https://docs.lean-lang.org/theorem_proving_in_lean4/induction_and_recursion.html)：以後繼遞迴展示自然數加法與乘法的定義方式。

Lean 文件隨 Lean 4 專案採 Apache-2.0。本包只做原創改寫與來源定位，存取日期為 2026-09-13。

## 候選規格

- 類型：`concept`
- 公式：`a+b`
- 依賴：`mko-natural-number`
- 主領域：`arithmetic_number_systems`
- 方法：`method-direct-proof`
- 課程：`curriculum-ocme-general:numbers.arithmetic-operations`
- 形式化義務：分別指定運算所在的數系、封閉條件與除零邊界，再建立 Lean 語義橋。

本次不新增 Evidence Object；Lean producer 只標 `configured`。

