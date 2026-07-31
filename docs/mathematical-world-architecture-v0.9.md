# OCME v0.9：數學世界架構實作規格

## 1. 目的

OCME v0.1～v0.8 已建立 MKO、公式 AST、計算伴隨、Evidence Object、FELRA、Lean／Mathlib 與 EveGlyph 審查鏈。v0.9 不增加新的數學定理，而是建立網站版與 AI 自動化之前必須存在的上位架構。

核心原則：

```text
研究領域分類
≠ 邏輯依賴
≠ 教學順序
≠ 計算順序
≠ 歷史順序
≠ 形式化順序
```

```text
高等數學 ≠ 固有地比較難
初等數學 ≠ 固有地比較簡單
抽象度 ≠ 總難度
計算量 ≠ 概念難度
```

---

## 2. 外掛式 Architecture Store

v0.9 不直接改寫既有 MKO，而是用 `object_id` 對齊：

```text
Canonical MKO
↕ object_id
Architecture Profile
├── classification
├── difficulty
├── learning paths
├── methodology
└── curriculum alignments
```

這使 v0.8 的公式來源 SHA、Evidence ID 與 Lean 證據保持穩定。待 v0.10 的 50～100 個核心物件驗證完成後，再決定哪些欄位應內嵌至下一版 MKO Schema。

---

## 3. v0.9 資料基線

```text
20 個頂層領域
20 個核心數學方法
5 條學習路徑
4 套課綱／能力框架
10 個課綱對齊
6 個 Architecture Profile
12 個難度維度
```

### 領域

領域是多重 assertion，不是唯一父類。每個 assertion 保存：

- axis；
- term ID；
- primary／supporting／contextual role；
- weight；
- 中文理由；
- 來源方法；
- 審查狀態與信心。

### 方法

方法物件保存：

- 適用訊號；
- 典型步驟；
- 常見失敗；
- 相關方法；
- 審查版本。

### 學習路徑

路徑是可選投影，不是唯一課綱。每個節點標記：

- required；
- optional；
- remedial；
- position；
- 選擇理由。

### 課綱對齊

OCME 內部路徑與外部框架分離。外部標準只作 alignment，不取代 Canonical MKO 或 Difficulty Profile。

---

## 4. 十二維難度模型

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

每一維包含：

```yaml
level: 0..5
meaning: not_applicable | direct | basic | moderate | high | specialized
rationale_zh: 可解釋理由
```

目前 6 個 Profile 採 `general_learner + conceptual_understanding` 作為人工校準起點。後續可以增加不同 audience 與 task，但不得把多維資料壓成單一權威分數。

---

## 5. 確定性 Profile 編譯

Canonical seed 保存簡潔且可審查的分類 assertion 與難度 level。`architecture-store.js` 將它確定性展開為完整 Profile：

```text
profile-seeds.json
→ expandArchitectureProfile
→ architecture-profile.schema.json
→ JSONL export / MCP
```

這避免人工複製 72 組難度欄位，並讓未來 AI 候選值能以 seed diff 方式審查。

---

## 6. 驗證閘門

`npm run validate:architecture` 同時檢查：

### Schema

- Classification Schema；
- Difficulty Profile Schema；
- Learning Path Schema；
- Methodology Schema；
- Curriculum Alignment Schema；
- Integrated Architecture Profile Schema。

### 跨層關係

- MKO、domain、method、path、framework ID 必須存在；
- Profile 必須一對一覆蓋全部 MKO；
- 每個 Profile 至少一個 primary domain；
- Profile 引用的 path 必須真的包含該 MKO；
- curriculum alignment 必須存在；
- learning path 不得有自環或循環；
- related method 不得懸空；
- 12 個 difficulty dimension 不得缺少。

負向測試故意注入未知領域、循環、缺失 Profile 與缺少難度維度，確認 CI 會 fail closed。

---

## 7. MCP

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

`get_math_context_bundle` 現在回傳：

```text
compact MKO
+ referenced Evidence
+ Architecture Profile
```

AI 因此能區分「這是什麼」、「依賴什麼」、「對哪種任務難在哪裡」與「可沿哪些路徑學習」。

---

## 8. 本版刻意未完成

v0.9 不宣稱已完成：

- 完整數學領域本體；
- MSC2020 全碼映射；
- 學校課綱正式匯入；
- 個人化推薦；
- 網站六入口；
- 50～100 個核心物件；
- 難度的學習者資料校準；
- AI 自動接受分類或難度。

以上分別屬於 v0.10、v0.11 與 v1.0。

---

## 9. 下一步

```text
v0.10 Core Mathematical Atlas
→ 50～100 個核心 MKO
→ 分類、難度、路徑與方法全覆蓋
→ 建立人工 gold baseline

v0.11 Website Information Architecture
→ 現代通識
→ 大學核心
→ 領域地圖
→ 方法地圖
→ 學習路徑
→ AI 導航
```
