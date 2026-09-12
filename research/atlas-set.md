---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-set
target_mko_id: mko-set
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-08-07
review_required: true
---

# 集合 research packet

## 範圍與核心決定

本包建立集合語言的入門概念：元素可被判定為屬於或不屬於指定集合，而集合的相同由其元素決定。它不選定完整的 ZF/ZFC 公理系統，也不允許「任意條件都自動產生集合」的無限制概括。

代表公式採 `x \in A`。它是集合概念的使用介面，不是宣稱以單一公式完整定義集合。`mko-set-membership` 保持為獨立的關係 MKO，Atlas 已把它排在 `atlas-set` 之後。

## 來源與主張對照

| 來源 | 用途 | 授權／使用界線 |
| --- | --- | --- |
| [Open Logic Project：Sets](https://builds.openlogicproject.org/content/sets-functions-relations/sets/sets.pdf) | 支持元素、外延性與羅素悖論所顯示的無限制概括風險。 | [CC BY 4.0](https://openlogicproject.org/olp-license/)；本包只做摘要改寫。 |
| [Mathlib：Set definitions](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Set/Defs.html) | 定位 Mathlib 中 `Set α`、集合建構記法與元素隸屬的形式語義候選。 | Mathlib 採 Apache-2.0；本包只提供語義定位與連結。 |

存取日期：2026-08-07。

## 候選內容規格

- 標題：集合 / Set
- 類型：`concept`
- 代表公式：`x\in A`
- 必要假設：討論的對象型別或論域已指定；`A` 是該脈絡中的集合；`x` 是候選元素。
- 核心說明：集合把若干對象視為整體；隸屬回答個別對象是否為元素；外延性要求元素完全相同的集合相同。
- 常見誤解：把元素與子集合混同；認為每個可寫出的條件都能不受限制地生成集合。
- MKO 依賴：空陣列。集合與隸屬在基礎層互相解釋，但 Atlas 的教學順序已明示 `set -> set-membership`，因此不製造反向循環。

## 架構候選

- 主領域：`foundations_logic`
- 物件種類：`concept`
- 主要表示：`set_theoretic`
- 方法：`method-direct-proof`（分類用途，非既有證明宣稱）
- 課程對齊：`curriculum-ocme-university-core:foundations.set`
- 學習路徑：`path-foundational-language-candidate`

以上分類、難度與課程對齊皆為 `ai_candidate`／`candidate`，待人工審查。

## Evidence 與形式化邊界

本次不新增 Evidence Object，也不宣稱 OCME 已選定集合論公理或已證明外延性。MKO 的 Lean producer 僅標為 `configured`。

下一個形式化義務是把入門語義明確映射到 Mathlib 的 `Set α` 與隸屬記法，並另外決定外延性應由哪個後續 theorem/axiom MKO 承擔；未完成前不可把研究來源登錄成 formal proof。

## 審查清單

- [ ] 確認入門概念與特定公理化集合論的界線。
- [ ] 確認 `mko-set` 與 `mko-set-membership` 的責任不重疊。
- [ ] 審查「論域／型別」措辭是否適合一般讀者。
- [ ] 形式化完成前保持 Evidence refs 為空。

