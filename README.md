# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

OCME v0.4 已建立兩條可重建資料鏈：

```text
formula.tex
→ OCME Formula Core
→ 原生 MathML
→ Semantic AST
→ SHA-256 公式血統
```

```text
Python 計算伴隨
+ 執行結果
+ 公式與來源程式雜湊
+ 聲明範圍與限制
→ Evidence Object
→ SHA-256 內容地址
```

現有數學知識圖：

```text
直角三角形 ─┐
             ├→ 畢達哥拉斯定理
歐幾里得長度 ┘
```

完整系統鏈：

```text
MKO JSON
→ Draft 2020-12 Schema
→ 公式衍生層漂移檢查
→ 內容定址 Evidence Object
→ 原生 MathML 人類介面
→ 可解析依賴圖
→ MCP AI 介面
→ Python 計算伴隨
→ FELRA 專案
→ MKO／Evidence JSONL 匯出
```

## 核心界線

$$
\text{數學}\neq\text{程式}\neq\text{有限計算證據}\neq\text{形式證明}
$$

目前三份 Evidence Object 均明確標記：

```text
quantification: finite_declared_cases
universal_proof: false
```

## 安裝與啟動

```bash
npm install
npm start
```

開啟 `http://127.0.0.1:4173`。介面支援：

- 三個數學知識物件切換；
- 標題、類型與標籤搜尋；
- `?id=` 可分享條目網址；
- 前置知識依賴跳轉；
- 公式編譯器版本與來源 SHA-256；
- 外部 Evidence Object、限制、來源與重播命令；
- 「數學／解釋／程式碼／計算證據／形式化／AI 結構」六個頁籤。

## 公式編譯

`formula.tex` 是公式衍生層的單一來源。

```bash
npm run compile:formulas
npm run verify:formulas
```

目前支援等式、加減、冪、下標、函數呼叫、分數、平方根、括號與少量白名單希臘符號。未支援的 TeX 命令會直接失敗，不會猜測或降級成圖片。

## 證據物件

先重播 Python 伴隨，再重建證據：

```bash
npm run verify:python
npm run build:evidence
```

只檢查已提交 Evidence Object：

```bash
npm run verify:python
npm run verify:evidence
```

Evidence ID 由標準化 payload 的 SHA-256 決定。下列任一內容變動都會產生新地址：

- 執行結果；
- 計算伴隨程式；
- 統一重播器；
- 公式 TeX 來源；
- 聲明範圍；
- 限制；
- 重播命令。

## 一次完成全部檢查

```bash
npm run check
```

執行順序：

```bash
npm run verify:formulas
npm run verify:python
npm run verify:evidence
npm run validate
npm test
npm run export
```

驗證內容包括：

- Ajv JSON Schema Draft 2020-12；
- MKO v0.2 與 Evidence v0.1；
- 12 種遞迴公式 AST 節點；
- 公式與證據漂移；
- Evidence 地址重算與竄改測試；
- 重複 ID、懸空依賴與循環依賴；
- 計算伴隨檔案存在性；
- Python 計算伴隨；
- MKO／Evidence JSONL 與依賴圖匯出。

## FELRA

已安裝 FELRA CLI 時：

```bash
npm run verify:felra
```

規格位於 `felra/pythagorean/project.yaml`。FELRA 的「未發現反例」與有限網格結果不等於定理證明。FELRA 證據轉換為 Evidence Object 將使用相同接口。

## MCP

```bash
npm run mcp
```

v0.4 工具：

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
- `get_computational_companion`
- `get_verification_status`

`get_evidence` 會重新計算 Evidence 地址；`get_math_context_bundle` 與 `get_verification_status` 會解析外部證據。

## 主要檔案

- `public/data/mko/`：Canonical MKO；
- `public/data/evidence/`：內容定址 Evidence Object；
- `schemas/mko.schema.json`：MKO Draft 2020-12 Schema；
- `schemas/evidence.schema.json`：Evidence Draft 2020-12 Schema；
- `lib/formula-compiler.js`：公式編譯核心；
- `lib/evidence-store.js`：Evidence 讀取、標準化與地址驗證；
- `scripts/compile-formulas.mjs`：公式重建與漂移檢查；
- `scripts/build-evidence.mjs`：證據重建與漂移檢查；
- `src/`：人類閱讀介面；
- `mcp-server.js`：AI 取用層；
- `reference/python/`：計算伴隨與統一重播；
- `docs/formula-compiler-v0.3.md`：公式編譯規格；
- `docs/evidence-objects-v0.4.md`：證據物件規格；
- `docs/technical-whitepaper-v0.1.md`：技術白皮書。

## 遷移狀態

v0.4 將外部 Evidence Object 視為權威證據層；MKO 內嵌測試摘要暫時保留供舊讀取器使用，後續版本再移除。

## 下一步

1. 對接 EveGlyph Editor 的 MKO／Evidence 自訂區塊與工作區 MCP。
2. 將 FELRA 輸出轉換成相同 Evidence Object。
3. 加入 Lean／Mathlib 對應與形式化證據類型。
4. 擴展至集合、函數、極限、導數與定積分。
