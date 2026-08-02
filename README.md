# 開源中文數學百科（OCME）

面向人類與 AI 的可閱讀、可計算、可驗證、可分類、可規劃學習路徑的中文數學知識系統。

## OCME v0.10：Core Mathematical Atlas

v0.10 在 v0.9 Mathematical World Architecture 上加入第一份可供網站與本地 AI 共用的核心數學地圖。

核心界線：

```text
Atlas node != Canonical MKO
```

Atlas 負責描述「OCME 應該有哪些核心節點、它們如何分類、依賴與排序」；Canonical MKO 才是已完成公式、來源、Evidence 與審查契約的正式數學知識物件。

目前基線：

```text
80 個 Core Atlas nodes
6 個 canonical MKO mappings
74 個 atlas_seed / materialization tasks
9 個 Evidence Object
5 個 formal_proof
20 個頂層數學領域
20 個核心數學方法
5 條學習路徑
4 套課綱／能力框架
12 個難度維度
```

## 八個核心數學群組

```text
數與運算       10
集合與邏輯     10
代數與方程     12
幾何與向量     12
函數與圖形     10
微積分基礎     12
機率與統計      8
離散數學        6
-----------------
總計           80
```

這是網站與內容生產的第一個樣本宇宙，不宣稱已涵蓋全部數學。

## 成熟度模型

### `canonical_mko`

代表 Atlas 節點已對應到真正存在的 Canonical MKO。v0.10 共有 6 個：

- 集合隸屬；
- 函數映射；
- 趨近關係；
- 歐幾里得長度；
- 直角三角形；
- 畢達哥拉斯定理。

### `atlas_seed`

代表節點已經具備：

- 穩定 Atlas ID；
- 預定 `target_mko_id`；
- 中文名稱與摘要；
- 領域；
- 物件類型；
- 前置節點；
- 數學方法；
- 課程帶；
- 十二維難度 seed；
- materialization priority。

但它仍然不是正式百科條目，也沒有自動繼承任何證明或 Evidence 狀態。

## Materialization Queue

74 個 `atlas_seed` 依優先級分成：

```text
P1  通識、網站骨架與後續節點高度依賴的核心概念
P2  大學核心與第二層結構
P3  較進階、可在前置物件成熟後展開的節點
```

匯出：

```bash
npm run export:atlas
```

產生：

```text
artifacts/core-atlas.json
artifacts/core-atlas-summary.json
artifacts/materialization-queue.jsonl
```

本地 AI 後續應以 `materialization-queue.jsonl` 為主要工作佇列，而不是自行重新發明條目名稱與 ID。

## 資料位置

```text
public/data/mko/                 Canonical MKO
public/data/evidence/            內容定址 Evidence
public/data/architecture/        領域、方法、路徑、課綱與 Architecture Profile
public/data/atlas/               v0.10 Core Mathematical Atlas
schemas/                         交換格式
formal/lean/                     Lean／Mathlib 來源
lib/atlas-store.js               Atlas 查詢與 materialization queue
lib/atlas-validation.js          Atlas Schema 與跨層 Validator
```

## Atlas 驗證

```bash
npm run validate:atlas
```

Validator 會拒絕：

- Atlas ID 重複；
- `target_mko_id` 重複；
- 不存在的 domain；
- 不存在的 method；
- 懸空 prerequisite；
- 自我依賴；
- prerequisite cycle；
- 群組數量漂移；
- `canonical_mko` 指向不存在的 MKO；
- `atlas_seed` 偽裝為 canonical；
- 已存在 MKO 卻仍標示為 seed；
- 六個既有 canonical mapping 被改寫。

## 十二維難度

Atlas 與 Architecture Store 不使用單一「難度 7/10」。核心維度為：

```text
prerequisite_depth
prerequisite_breadth
abstraction_level
conceptual_discontinuity
notation_density
proof_burden
computational_burden
search_construction_burden
representation_switching
exception_boundary_density
intuition_accessibility
formalization_burden
```

Atlas 中的數值是 v0.10 seed，用於排序與網站原型，不是永恆、全人群通用的難度真值。後續可由人工 gold baseline、學習資料與任務型 profile 逐步校準。

## 完整檢查

```bash
npm install
npm run check
```

目前檢查鏈：

```text
Formula drift
→ Python replay
→ Lean source gate
→ Evidence address verification
→ MKO validation
→ Architecture validation
→ Core Atlas validation
→ positive / negative tests
→ MKO / Evidence / Architecture / Atlas / EveGlyph exports
```

## 網站

目前既有網站仍以 MKO、公式與 Evidence 閱讀為主。

v0.11 將正式以 Core Atlas 建立六個入口：

```text
現代通識數學
大學核心數學
數學領域地圖
數學方法地圖
學習路徑
AI 導航
```

Atlas 可以先作為網站目錄與預覽節點；只有 `canonical_mko` 才能進入完整數學頁面。`atlas_seed` 應顯示為「規劃中／待建置」，不得偽裝成已審定內容。

## MCP 與 AI

v0.9 MCP 已可查詢：

```text
get_architecture_summary
list_architecture_terms
get_classification
get_difficulty_profile
get_learning_paths
browse_domain
get_method
```

v0.10 Atlas 的 canonical 資料目前可直接由 `public/data/atlas/core-atlas.json` 與 `artifacts/materialization-queue.jsonl` 取得。本地端 AI 接手後可再加入 Atlas 專用 MCP 工具，但不得建立第二套與 Canonical Atlas 漂移的資料。

## 本地 AI 交接

交接規格：

```text
docs/OCME_v0.10_Core_Atlas_本地AI交接技術白皮書_v0.1.md
```

本地 AI 的首要任務不是擴張到全部數學，而是依 P1 → P2 → P3 小批次 materialize Atlas seed，並在每批前後執行 `npm run check`。

## 設計邊界

```text
Atlas seed ≠ Canonical MKO
研究分類 ≠ 學習路徑
課程位置 ≠ 固有難度
抽象度 ≠ 總難度
有限計算證據 ≠ 普遍證明
精確 Lean 聲明 ≠ 中文條目全部語義自動封閉
AI 候選分類 ≠ 人工審定分類
大量生成 ≠ 高品質百科
```

## 後續里程碑

```text
v0.10 Core Mathematical Atlas       已建立 80-node baseline
→ 本地 AI 小批次 materialization

v0.11 Website Information Architecture
→ 六入口網站
→ Atlas 搜尋、篩選與局部圖
→ canonical / planned maturity UI

v1.0 Automated Publishing System
→ 搜尋、研究、生成、驗證、EveGlyph 審查、CI、網站發布與排程閉環
```
