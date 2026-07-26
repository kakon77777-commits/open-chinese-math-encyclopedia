# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

OCME v0.3 建立了第一條可重建的公式資料鏈：

```text
formula.tex
→ OCME Formula Core
→ 原生 MathML
→ Semantic AST
→ SHA-256 來源血統
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
→ 原生 MathML 人類介面
→ 可解析依賴圖
→ MCP AI 介面
→ Python 計算伴隨
→ FELRA 專案
→ JSONL／Dependency Graph 匯出
```

## 核心界線

$$
\text{數學}\neq\text{程式}\neq\text{有限計算證據}\neq\text{形式證明}
$$

程式碼與有限計算只用於理解、重播、反例搜尋與驗證參考，不冒充普遍證明。

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
- 「數學／解釋／程式碼／計算證據／形式化／AI 結構」六個頁籤。

## 公式編譯

`formula.tex` 是公式衍生層的單一來源。重建 MathML、Semantic AST 與來源雜湊：

```bash
npm run compile:formulas
```

只檢查已提交資料是否與 TeX 同步：

```bash
npm run verify:formulas
```

目前明確支援：

- 等式；
- 加法與減法；
- 冪與下標；
- 函數呼叫；
- 分數；
- 平方根；
- 括號；
- 少量列入白名單的希臘符號。

遇到未支援的 TeX 命令會直接失敗，不會猜測、OCR 補全或默默降級成圖片。

## 一次完成全部本地檢查

```bash
npm run check
```

等同於：

```bash
npm run verify:formulas
npm run validate
npm test
npm run verify:python
npm run export
```

驗證內容包括：

- Ajv JSON Schema Draft 2020-12；
- `mko-v0.2` 完整物件結構；
- 12 種遞迴公式 AST 節點；
- 公式衍生層漂移；
- 重複物件 ID；
- 索引與物件 ID 不一致；
- 懸空、自我與循環依賴；
- 計算伴隨檔案存在性；
- 非同一性聲明；
- Python 計算伴隨；
- JSONL 與依賴圖匯出。

輸出位於 `artifacts/`。

## FELRA

已安裝 FELRA CLI 時：

```bash
npm run verify:felra
```

規格位於 `felra/pythagorean/project.yaml`。FELRA 的「未發現反例」與有限網格結果不等於定理證明。

## MCP

```bash
npm run mcp
```

v0.3 工具：

- `search_math_objects`
- `get_math_object`
- `get_math_context_bundle`
- `get_dependencies`
- `get_formula_ast`
- `compile_formula`
- `get_dependency_graph`
- `get_computational_companion`
- `get_verification_status`

`compile_formula` 使用和資料建置相同的 OCME Formula Core，回傳 MathML、Semantic AST、編譯器版本與來源 SHA-256。

Claude Desktop 類設定：

```json
{
  "mcpServers": {
    "ocme": {
      "command": "node",
      "args": ["/absolute/path/to/open-chinese-math-encyclopedia/mcp-server.js"]
    }
  }
}
```

## 主要檔案

- `public/data/index.json`：數學物件索引；
- `public/data/mko/`：Canonical MKO；
- `schemas/mko.schema.json`：MKO v0.2 Draft 2020-12 Schema；
- `lib/formula-compiler.js`：確定性公式編譯核心；
- `lib/schema-validation.js`：Ajv 2020-12 驗證器；
- `lib/store.js`：物件讀取、依賴解析與知識圖；
- `scripts/compile-formulas.mjs`：公式重建與漂移檢查；
- `src/`：多物件人類 UI；
- `mcp-server.js`：AI 取用與公式編譯層；
- `reference/python/`：計算伴隨與統一重播；
- `felra/pythagorean/project.yaml`：FELRA 規格；
- `content/articles/`：EveGlyph-MD 文章草稿；
- `docs/technical-whitepaper-v0.1.md`：技術白皮書。

## 下一步

1. 對接 EveGlyph Editor 的數學物件自訂區塊與工作區 MCP。
2. 將 FELRA 輸出寫入獨立、內容定址的 `evidence/` 物件。
3. 加入 Lean／Mathlib 對應與形式化狀態同步。
4. 擴充公式語法但維持白名單與失敗即停止原則。
5. 擴展至集合、函數、極限、導數與定積分。
