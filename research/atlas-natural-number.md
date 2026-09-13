---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-natural-number
target_mko_id: mko-natural-number
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-08-07
review_required: true
---

# 自然數 research packet

## 範圍與核心決定

本包只建立自然數的入門概念層，不在此定義整數、算術運算、序關係或皮亞諾公理的完整形式系統。

OCME 在這個 MKO 明定採用 `0, 1, 2, ...` 的慣例，並以 `n \in N` 作為代表性公式。這是 OCME 的編輯選擇，不宣稱所有教材都把 0 納入自然數；遇到外部文本時，讀者仍須先確認該文本的慣例。

## 來源與主張對照

| 來源 | 用途 | 授權／使用界線 |
| --- | --- | --- |
| [Lean Reference：Natural Numbers](https://lean-lang.org/doc/reference/latest/Basic-Types/Natural-Numbers/) | 確認 Lean `Nat` 由 `zero` 與 `succ` 建構，且包含 0；作為未來形式化目標的語義定位。 | Lean 4 文件隨專案採 Apache-2.0；本包只改寫概念並提供連結。 |
| [Open Logic Project：Natural Numbers](https://builds.openlogicproject.org/open-logic-complete.pdf) | 支持以 0、後繼與對後繼封閉描述自然數結構的基礎觀點。 | [CC BY 4.0](https://openlogicproject.org/olp-license/)；本包不逐字摘錄。 |
| [Encyclopedia of Mathematics：Natural number](https://encyclopediaofmath.org/wiki/Natural_number) | 記錄「自然數是否含 0」存在不同慣例。 | CC BY-SA 3.0／GFDL；只用於慣例差異的研究定位。 |

存取日期：2026-08-07。

## 候選內容規格

- 標題：自然數 / Natural number
- 類型：`concept`
- 代表公式：`n\in N`
- 必要假設：本 MKO 的 `N` 包含 0；`n` 是任意候選數。
- 核心說明：自然數支援計數與離散次序；每個自然數都有後繼；數字符號與其表示的數不可混同。
- 常見誤解：把「是否含 0」視為全球一致；把自然數的表示符號誤當成自然數本身。
- MKO 依賴：空陣列。Atlas 已把整數、四則運算、順序等項目設為其下游，不在此反向建立依賴。

## 架構候選

- 主領域：`arithmetic_number_systems`
- 物件種類：`concept`
- 主要表示：`symbolic_formula`
- 方法：`method-direct-proof`（只作 Atlas 方法分類；本 MKO 本身沒有證明宣稱）
- 課程對齊：`curriculum-ocme-general:numbers.natural`
- 學習路徑：`path-foundational-language-candidate`

以上分類、難度與課程對齊皆為 `ai_candidate`／`candidate`，待人工審查。

## Evidence 與形式化邊界

本次不新增 Evidence Object，也不宣稱已證明自然數的歸納、公理刻畫或與 Lean `Nat` 的語義等價。MKO 的 producer 僅標為 `configured`。

下一個形式化義務是建立一個明確的 Lean 4／Mathlib 對應，至少說明 OCME 的 `N`、0 與後繼如何映射至 `Nat`，再以內容位址化 Evidence 記錄驗證結果。

## 審查清單

- [ ] 確認含 0 慣例符合 OCME 全庫政策。
- [ ] 確認不會與後續 `mko-integer`、`mko-order-relation` 重複承擔定義。
- [ ] 審查架構難度與小學基礎課程定位。
- [ ] 形式化完成前保持 Evidence refs 為空。

