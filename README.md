# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

## OCME v0.8

v0.8 將五份真正通過 Lean／Mathlib 編譯的精確聲明接入 Canonical Evidence Store，並完成第一輪基礎語義橋：

```text
集合隸屬 x∈A
→ 函數映射 f:X→Y
→ Filter.Tendsto 趨近核心
```

畢達哥拉斯線則分為兩份形式聲明：

```text
向量夾角核心
→ OCME 宣告的邊長綁定模型
→ a²+b²=c²
```

目前知識圖共有 6 個 MKO：

- 直角三角形；
- 歐幾里得長度；
- 畢達哥拉斯定理；
- 集合隸屬；
- 函數映射；
- 趨近關係。

Canonical Evidence Store 共有 9 份物件，其中 5 份為 `formal_proof`。

## 四層分離

```text
中文數學敘述
≠ 程式實作
≠ 有限計算證據
≠ 精確形式證明
```

形式證明也不自動等於整個百科物件已完全形式化：

```text
精確 Lean 聲明通過
≠ 所有自然語言、仿射表示與替代基礎系統均已自動等價
```

每份 Evidence 都保留自己的：

- 精確形式聲明；
- 量化範圍；
- 來源 SHA-256；
- 執行環境；
- 重播命令；
- 語義限制。

## 五份 Lean／Mathlib Evidence

### 集合隸屬

```lean
OCMEFormal.set_membership_semantics
```

精確聲明：對任意 `x : α` 與 `A : Set α`，`x ∈ A ↔ A x`。

Evidence ID：

```text
evidence-sha256-702de77019f352eb431eb67bd7b266491b7c36c922d952e44be2b11ba95bcb5d
```

### 函數映射

```lean
OCMEFormal.function_total_unique
```

精確聲明：對任意 `f : X → Y` 與 `x : X`，存在唯一 `y : Y` 滿足 `f x = y`。

Evidence ID：

```text
evidence-sha256-d999133c1ae711b73752af8ee4b1b3ce74ca135ff7c06aabbe9fc8a3186f434b
```

### Filter.Tendsto

```lean
OCMEFormal.tendsTo_filter_semantics
```

精確聲明：`Filter.Tendsto f l₁ l₂ ↔ Filter.map f l₁ ≤ l₂`。

Evidence ID：

```text
evidence-sha256-38b848281997cbb1a2c1ea5559c6937dbb67ee03ac0be338756320a99e0f8b1d
```

裸符號 `x→a` 必須先補上函數與來源、目標濾子，才能連接到這份形式聲明。

### 畢達哥拉斯向量核心

```lean
OCMEFormal.pythagorean_vector
```

精確聲明：在任意實內積空間中，若向量 `x` 與 `y` 的夾角為 π/2，則向量和的範數平方等於兩向量範數平方之和。

Evidence ID：

```text
evidence-sha256-4d31c152012f8b561749e354f3789344c91e1fea26cead1468e95417b2e84752
```

### 畢達哥拉斯邊長語義橋

```lean
OCMEFormal.IsRightTriangleSideModel
OCMEFormal.pythagorean_side_lengths
```

模型明示：

```text
angle x y = π/2
a = ‖x‖
b = ‖y‖
c = ‖x+y‖
```

並推出：

```text
a·a+b·b=c·c
```

Evidence ID：

```text
evidence-sha256-701b8066d363dadf2cc1ec21bc0d21f7c680a6eb187a37fd309c0f2e4c86d08e
```

這完成 OCME 宣告的向量邊長模型，不宣稱所有仿射三角形頂點排列已自動完成等價證明。

## Lean／Mathlib 重播

版本固定為：

```text
Lean 4.30.0
Mathlib v4.30.0
Elan v4.2.1（CI 安裝器）
```

本地重播：

```bash
cd formal/lean
lake update
lake exe cache get
lake build
```

主要來源：

```text
formal/lean/lean-toolchain
formal/lean/lakefile.toml
formal/lean/OCMEFormal.lean
formal/lean/OCMEFormal/Foundations.lean
formal/lean/OCMEFormal/Pythagorean.lean
```

GitHub Actions 另行執行 `OCME Lean CI`，並拒絕 `sorry`／`admit` 佔位符。

## Formula Core v0.4

既有算術公式保持相容，並支援三種關係 AST：

```text
membership  x\in A
mapping     f:X\to Y
tends_to    x\to a
```

重建與漂移檢查：

```bash
npm run compile:formulas
npm run verify:formulas
```

未支援語法直接失敗，不猜測，也不退化成公式圖片。

## Evidence Store

所有證據共用同一資料模型：

```text
Python／FELRA／Lean 原始結果
+ 來源檔案 SHA-256
+ 公式來源 SHA-256
+ 精確聲明範圍
+ 限制
+ 重播命令
→ Canonical Evidence Object
→ SHA-256 內容地址
→ MKO evidence_refs
```

建置與驗證：

```bash
npm run verify:python
npm run verify:lean-sources
npm run preview:lean-evidence
npm run build:evidence
npm run verify:evidence
npm run validate
```

## 啟動

```bash
npm install
npm start
```

開啟：

```text
http://127.0.0.1:4173
```

介面可查看：

- 中文定義與解釋；
- 原生 MathML 與 Semantic AST；
- 依賴知識圖；
- Python、FELRA、Lean producer 狀態；
- 每個 MKO 引用的精確形式聲明數；
- 聲明、來源、限制與重播命令；
- AI 原始結構。

## MCP

```bash
npm run mcp
```

主要工具包括：

- `search_math_objects`
- `get_math_object`
- `get_math_context_bundle`
- `get_formula_ast`
- `compile_formula`
- `get_dependencies`
- `get_dependency_graph`
- `list_evidence`
- `get_evidence`
- `get_evidence_for_object`
- `get_evidence_producers`
- `get_formal_proof`
- `get_verification_status`
- `get_eveglyph_review_packet`

`get_formal_proof` 回傳：

- `formal_evidence_count`；
- 每份 `exact_claims`；
- `semantic_mapping_status`；
- 完整形式 Evidence；
- 是否真正達到 `fully_formalized`。

## EveGlyph Review Bridge

匯出文字審查封包：

```bash
npm run export:eveglyph
```

套用 patch：

```bash
npm run apply:eveglyph -- --patch path/to/patch.json
npm run apply:eveglyph -- --patch path/to/patch.json --write
```

EveGlyph patch 只能修改人類文字欄位；公式、AST、Evidence、producer、形式化狀態與 provenance 維持唯讀。

## 完整檢查

```bash
npm run check
```

涵蓋：

```text
公式漂移
→ Python 重播
→ Lean 來源固定、六個宣告與無佔位符
→ 9 份 Python／FELRA／Lean Evidence 地址重算
→ MKO v0.3／v0.4 Schema
→ 跨物件依賴與 producer 一致性
→ 五份 Lean manifest Adapter 測試
→ 正向與攻擊性負向測試
→ JSONL、依賴圖與 EveGlyph review packet 匯出
```

## 下一步

- 建立任意歐幾里得仿射三角形頂點表示與 `IsRightTriangleSideModel` 的等價定理；
- 新增子集合、集合相等與集合運算物件；
- 新增值域、單射、滿射、雙射與部分函數物件；
- 建立 `atTop`、`nhds`、`nhdsWithin`，再展開數列極限、函數點極限與 ε–δ 定義；
- 建立 Wikipedia／Wikidata 來源修訂與授權血統匯入器。
