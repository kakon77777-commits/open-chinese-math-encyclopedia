---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-proposition
target_mko_id: mko-proposition
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-08-07
review_required: true
---

# 命題 research packet

## 範圍與核心決定

本包以入門古典邏輯語境說明命題：它是可被斷言或否定、並可談論真假的有意義數學陳述。假的陳述仍可以是命題；「命題」與「已經有證明的真命題」不可混同。

含未指定自由變數的開放句，如單獨寫出的 `x > 0`，尚未在封閉語境中給出固定真值；代入、量化或明確指定脈絡後才形成可評估的陳述。代表公式採單一符號 `P`，只表示一個命題變項，不宣稱 `P` 為真。

## 來源與主張對照

| 來源 | 用途 | 授權／使用界線 |
| --- | --- | --- |
| [Open Logic Project：Propositional Logic](https://builds.openlogicproject.org/content/propositional-logic/propositional-logic.pdf) | 支持命題變項、真假值與古典真值函數語境的入門說明。 | [CC BY 4.0](https://openlogicproject.org/olp-license/)；本包只做摘要改寫。 |
| [Lean Reference：Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) | 確認 Lean 中命題屬於 `Prop`，真假命題都仍是命題；定位未來形式化目標。 | Lean 4 文件隨專案採 Apache-2.0；本包只提供語義定位。 |
| [Theorem Proving in Lean 4：Propositions and Proofs](https://lean-lang.org/theorem_proving_in_lean4/Propositions-and-Proofs/) | 支持 `P : Prop` 與「項作為命題之證明」的區分。 | Lean 4 文件隨專案採 Apache-2.0；本包不逐字摘錄。 |

存取日期：2026-08-07。

## 候選內容規格

- 標題：命題 / Proposition
- 類型：`concept`
- 代表公式：`P`
- 必要假設：`P` 是指定邏輯脈絡中良構且有意義的命題；真假二分的敘述限於本包採用的入門古典語境。
- 核心說明：命題可以真也可以假；證明是一種支持命題為真的對象或論證；開放句需經代入、量化或脈絡封閉。
- 常見誤解：把疑問句、命令句或未封閉表達式直接視為命題；把「是命題」誤解成「已證明為真」。
- MKO 依賴：空陣列。邏輯連接詞與量詞是 Atlas 下游項目。

## 架構候選

- 主領域：`foundations_logic`
- 物件種類：`concept`
- 主要表示：`symbolic_formula`
- 方法：`method-direct-proof`（分類用途，非既有證明宣稱）
- 課程對齊：`curriculum-ocme-university-core:foundations.proposition`
- 學習路徑：`path-foundational-language-candidate`

以上分類、難度與課程對齊皆為 `ai_candidate`／`candidate`，待人工審查。

## Evidence 與形式化邊界

本次不新增 Evidence Object。來源文件是研究依據，不是 OCME 的 formal proof。MKO 的 Lean producer 僅標為 `configured`。

下一個形式化義務是建立最小 Lean 4 檔案，以 `P : Prop` 展示命題與其證明型別的區別，並清楚隔開「古典真假語義」與 Lean 核心命題型別所需的額外原理。

## 審查清單

- [ ] 審查古典語境限定是否足夠醒目。
- [ ] 確認開放句的措辭不會否定依賴脈絡的命題族。
- [ ] 確認與 `mko-logical-connectives`、`mko-quantifier` 的責任切分。
- [ ] 形式化完成前保持 Evidence refs 為空。

