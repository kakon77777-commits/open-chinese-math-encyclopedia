# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

OCME v0.6 已打通四條彼此分離、可重建的資料鏈：

```text
formula.tex
→ OCME Formula Core
→ 原生 MathML
→ Semantic AST
→ SHA-256 公式血統
```

```text
Python／FELRA 執行結果
+ 公式與程式來源雜湊
+ 聲明範圍、限制與重播命令
→ Evidence Object
→ SHA-256 內容地址
```

```text
MKO verification.evidence_refs
→ 明確引用 Evidence Object
→ 人類 UI／MCP／JSONL
```

```text
Canonical MKO
→ EveGlyph 文字審查封包
→ base SHA-256 樂觀鎖
→ Schema 驗證文字 patch
→ 完整 OCME 檢查
```

現有知識圖：

```text
直角三角形 ─┐
             ├→ 畢達哥拉斯定理
歐幾里得長度 ┘
```

## 核心界線

$$
\text{數學}\neq\text{程式}\neq\text{有限計算證據}\neq\text{形式證明}
$$

所有現有計算 Evidence 均標記：

```text
universal_proof: false
```

## 安裝與啟動

```bash
npm install
npm start
```

開啟 `http://127.0.0.1:4173`。介面提供原生 MathML、公式 AST、依賴圖、計算伴隨、Evidence Object、producer 狀態與 AI 原始結構。

## 一次完成全部檢查

```bash
npm run check
```

執行內容：

```text
公式漂移
→ Python 重播
→ Evidence 漂移與 FELRA manifest 掃描
→ MKO／Evidence／producer 跨層驗證
→ Schema 與安全負向測試
→ MKO／Evidence JSONL 與依賴圖匯出
→ EveGlyph review packet 匯出
```

## 公式編譯

```bash
npm run compile:formulas
npm run verify:formulas
```

`formula.tex` 是 MathML 與 Semantic AST 的單一來源。未支援的 TeX 命令直接失敗，不做猜測或圖片降級。

## Evidence

```bash
npm run verify:python
npm run build:evidence
npm run verify:evidence
```

Evidence ID 由標準化 payload 的 SHA-256 決定。執行結果、來源程式、公式來源、聲明範圍、限制或重播命令改變時，地址也必須改變。

### 第一份真實 FELRA Evidence

FELRA runtime：

```text
repository: kakon77777-commits/FELRA
commit: 1005228db4bda832f98069f80879ec2ba1dd8440
version: 1.0.0
```

有限整數域 `a,b,c ∈ [1,50]` 的實際結果：

```text
numerical:             125,000 / 125,000 passed
boundaries:                  8 /       8 passed
counterexample_search:  20,000 /  20,000 passed
replay: MATCH
```

```text
result_sha256:
d0efaa650153939ec8492933a667db36d3373d38d765b6ff4acd9a0f58b749ce

Evidence ID:
evidence-sha256-97ad4a4b529de8c77662f823ad0966c24cfe1c121af8cbb4320135b9ea849448
```

此結果只支持有限宣告域中的衍生性質，不是畢達哥拉斯定理的普遍證明。完整紀錄見 `docs/felra-live-evidence-v0.6.md`。

### FELRA 重建

```bash
felra run felra/pythagorean/project.yaml \
  --output artifacts/felra/pythagorean

npm run normalize:felra -- \
  --run-dir artifacts/felra/pythagorean \
  --write

npm run build:evidence
npm run check
```

## EveGlyph 文字審查

匯出：

```bash
npm run export:eveglyph
```

輸出位於：

```text
artifacts/eveglyph-review/
```

Patch 只能修改：

```text
title_zh
summary_zh
statement_zh
explanation_paragraphs_zh
common_misconception_zh
proof_summaries_zh
```

預覽 patch：

```bash
npm run apply:eveglyph -- --patch path/to/patch.json
```

正式套用：

```bash
npm run apply:eveglyph -- --patch path/to/patch.json --write
npm run check
```

公式、AST、Evidence、producer、形式化狀態與來源血統皆為唯讀機器欄位。過期 `base_object_sha256`、版本未遞增或未知欄位都會被拒絕。完整規格見 `docs/eveglyph-review-bridge-v0.6.md`。

## MCP

```bash
npm run mcp
```

主要工具：

- `search_math_objects`
- `get_math_object`
- `get_math_context_bundle`
- `get_dependencies`
- `get_formula_ast`
- `compile_formula`
- `get_dependency_graph`
- `list_evidence`
- `get_evidence`
- `get_evidence_for_object`
- `get_evidence_producers`
- `get_eveglyph_review_packet`
- `get_computational_companion`
- `get_verification_status`

`get_eveglyph_review_packet` 是唯讀工具；MCP 不提供直接發布修改的能力。

## 主要檔案

- `public/data/mko/`：Canonical MKO v0.3；
- `public/data/evidence/`：內容定址 Evidence Object；
- `evidence-sources/felra/`：已接受的 FELRA 正規化來源；
- `felra/FELRA_LOCK.json`：證據生產器版本鎖；
- `schemas/eveglyph-review-patch.schema.json`：文字審查 patch；
- `lib/eveglyph-review.js`：review packet、基線 SHA 與 patch 套用；
- `scripts/normalize-felra-run.mjs`：真實 FELRA 輸出正規化；
- `scripts/export-eveglyph-review.mjs`：EveGlyph 審查匯出；
- `scripts/apply-eveglyph-review.mjs`：安全套用文字 patch。

## 下一步

1. 將 EveGlyph 自訂區塊接到 review packet 與 Git Diff 審查畫面。
2. 加入 Lean／Mathlib 對應與形式證據物件。
3. 擴展至集合、函數、極限、導數與定積分。
