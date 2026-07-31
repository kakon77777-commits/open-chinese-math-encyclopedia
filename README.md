# 開源中文數學百科（OCME）

面向人類與 AI 的可閱讀、可計算、可驗證、可分類與可規劃學習路徑的中文數學知識系統。

## OCME v0.9

v0.9 在既有 MKO／Evidence／Lean 基礎上加入「數學世界架構層」：

```text
Canonical MKO
├── Formula / Semantic AST
├── Python / FELRA / Lean Evidence
└── Architecture Profile
    ├── 多軸分類
    ├── 十二維難度
    ├── 學習路徑
    ├── 數學方法
    └── 課綱對齊
```

這一版不把研究分類、邏輯依賴、教學順序與固有難度混為一談。

```text
高等 ≠ 必然更難
初等 ≠ 必然更簡單
抽象度 ≠ 總難度
計算量 ≠ 概念難度
課程位置 ≠ 數學本體位置
```

## v0.9 架構基線

```text
6 個 MKO
9 個 Evidence Object
5 個 formal_proof
20 個頂層數學領域
20 個核心數學方法
5 條學習路徑
4 套課綱／能力框架
10 個課綱對齊
12 個難度維度
6 個 Architecture Profile
```

Architecture Store 採外掛式設計，以 `object_id` 對齊既有 MKO，不改寫 v0.8 的公式來源 SHA 或 Evidence ID。

完整規格：

```text
docs/mathematical-world-architecture-v0.9.md
```

## 十二維難度

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

每個維度包含 0～5 等級、語義標籤與中文理由。難度以 audience＋task 分開建模，不提供單一權威總分。

## 現有數學物件

- 直角三角形；
- 歐幾里得長度；
- 畢達哥拉斯定理；
- 集合隸屬；
- 函數映射；
- 趨近關係。

畢達哥拉斯物件同時保留人工證明、Python 有限檢查、FELRA 有限域證據，以及 Lean／Mathlib 的向量核心與邊長模型形式證據。

## 資料位置

```text
public/data/mko/                 Canonical MKO
public/data/evidence/            內容定址 Evidence
public/data/architecture/        領域、方法、路徑、課綱與 Profile seed
schemas/                         所有交換格式
formal/lean/                     Lean／Mathlib 來源
lib/architecture-store.js        確定性 Profile 編譯器
lib/architecture-validation.js   Schema 與跨層 Validator
```

## 啟動網站

```bash
npm install
npm start
```

開啟：

```text
http://127.0.0.1:4173
```

目前網站仍以 MKO、公式與 Evidence 閱讀為主；六入口網站資訊架構安排在 v0.11。

## MCP

```bash
npm run mcp
```

v0.9 新增：

```text
get_architecture_summary
list_architecture_terms
get_classification
get_difficulty_profile
get_learning_paths
browse_domain
get_method
```

`get_math_context_bundle` 現在同時回傳：

```text
compact MKO
+ referenced Evidence
+ Architecture Profile
```

既有公式、依賴、Evidence、形式證明與 EveGlyph 工具維持可用。

## Architecture 驗證與匯出

```bash
npm run validate:architecture
npm run export:architecture
```

輸出：

```text
artifacts/architecture-validation.json
artifacts/architecture-profiles.jsonl
artifacts/architecture-summary.json
artifacts/learning-paths.json
```

Validator 會拒絕：

- 不存在的領域、方法、MKO、路徑或課綱；
- Profile 與 MKO 未一對一覆蓋；
- path 自環與循環；
- related method 懸空；
- Profile 引用不包含自身的路徑；
- 缺少 primary domain；
- 缺少十二維難度欄位。

## 完整檢查

```bash
npm run check
```

執行鏈：

```text
Formula drift
→ Python replay
→ Lean source gate
→ Evidence address verification
→ MKO validation
→ Architecture validation
→ positive / negative tests
→ MKO / Evidence / Architecture / EveGlyph exports
```

## 設計邊界

```text
MSC／研究分類 ≠ 學習路徑
學校年級 ≠ 固有難度
AI 候選分類 ≠ Canonical classification
有限測試 ≠ 普遍證明
精確形式聲明 ≠ 中文條目全部語義自動封閉
多條學習路徑 ≠ 唯一正確順序
```

## 後續里程碑

```text
v0.10 Core Mathematical Atlas
→ 50～100 個核心 MKO
→ 分類、難度、路徑與方法全覆蓋
→ 人工 gold baseline

v0.11 Website Information Architecture
→ 現代通識入口
→ 大學核心入口
→ 領域地圖
→ 方法地圖
→ 學習路徑
→ AI 導航

v1.0 Automated Publishing System
→ 搜尋、草稿、結構化、驗證、審查與發布閉環
```
