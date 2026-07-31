# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

## OCME v0.7

v0.7 將形式證明接入既有 Canonical Evidence Store，並加入第一批基礎數學物件：

```text
集合隸屬 x∈A
→ 函數映射 f:X→Y
→ 趨近關係 x→a
```

目前知識圖共有 6 個 MKO：

- 直角三角形；
- 歐幾里得長度；
- 畢達哥拉斯定理；
- 集合隸屬；
- 函數映射；
- 趨近關係。

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
≠ 中文敘述與形式模型的語義映射已自動封閉
```

畢達哥拉斯物件目前同時引用：

- Python 有限案例證據；
- FELRA 有限宣告域證據；
- Lean／Mathlib 向量夾角形式的全稱證據。

Lean Evidence ID：

```text
evidence-sha256-dd7d2bb464dd8f503fa5be9f4c68e01ce0947e506e137a064bdaa1b950c8628f
```

該證據的精確聲明是：

> 在任意實內積空間中，若向量 x 與 y 的夾角為 π/2，則向量和的範數平方等於兩向量範數平方之和。

它標記：

```text
quantification: formal_universal
universal_proof: true
```

這個 `true` 只適用於上述精確 Lean 聲明。

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
formal/lean/OCMEFormal/Pythagorean.lean
```

GitHub Actions 另行執行 `OCME Lean CI`，並拒絕 `sorry`／`admit` 佔位符。

## Formula Core v0.4

既有算術公式保持相容，新增三種關係 AST：

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
- 精確形式聲明、來源、限制與重播命令；
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

`get_formal_proof` 只回傳 MKO 明確引用的 `formal_proof` Evidence，並保留語義映射是否完整的狀態。

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
→ Lean 來源固定與無佔位符
→ Python／FELRA／Lean Evidence 地址重算
→ MKO v0.3／v0.4 Schema
→ 跨物件依賴與 producer 一致性
→ 正向與攻擊性負向測試
→ JSONL、依賴圖與 EveGlyph review packet 匯出
```

## 下一步

- 建立三角形邊長敘述到內積空間向量形式的完整語義橋證明；
- 將集合隸屬與函數映射接到實際 Lean Evidence；
- 展開函數極限、ε–δ 定義與連續性；
- 建立 Wikipedia／Wikidata 來源修訂與授權血統匯入器。
