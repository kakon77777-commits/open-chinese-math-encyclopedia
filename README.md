# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

OCME v0.2 已從單一條目擴展為第一個可解析的數學知識圖：

```text
直角三角形 ─┐
             ├→ 畢達哥拉斯定理
歐幾里得長度 ┘
```

完整資料鏈：

```text
MKO JSON
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

## 啟動網站

```bash
npm start
```

網站端為零外部依賴，開啟 `http://127.0.0.1:4173`。介面支援：

- 三個數學知識物件切換；
- 標題、類型與標籤搜尋；
- `?id=` 可分享條目網址；
- 前置知識依賴跳轉；
- 「數學／解釋／程式碼／計算證據／形式化／AI 結構」六個頁籤。

## 一次完成全部本地檢查

```bash
npm run check
```

等同於：

```bash
npm run validate
npm test
npm run verify:python
npm run export
```

輸出位於 `artifacts/`，包含：

- `validation.json`；
- `python-evidence-v0.2.json`；
- `mko.jsonl`；
- `dependency-graph.json`。

驗證器會拒絕：

- 重複物件 ID；
- 索引與物件 ID 不一致；
- 懸空 dependency；
- 自我依賴；
- 循環依賴；
- 缺少 Semantic AST；
- 計算伴隨缺少非同一性聲明。

## FELRA

已安裝 FELRA CLI 時：

```bash
npm run verify:felra
```

規格位於 `felra/pythagorean/project.yaml`。FELRA 的「未發現反例」與有限網格結果不等於定理證明。

## MCP

MCP 使用官方 SDK；第一次執行前安裝依賴：

```bash
npm install
npm run mcp
```

v0.2 工具：

- `search_math_objects`
- `get_math_object`
- `get_math_context_bundle`
- `get_dependencies`
- `get_formula_ast`
- `get_dependency_graph`
- `get_computational_companion`
- `get_verification_status`

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
- `schemas/mko.schema.json`：MKO v0.1 Schema；
- `lib/store.js`：物件讀取、依賴解析與知識圖；
- `src/`：多物件人類 UI；
- `mcp-server.js`：AI 取用層；
- `reference/python/`：計算伴隨與統一重播；
- `felra/pythagorean/project.yaml`：FELRA 規格；
- `content/articles/`：EveGlyph-MD 文章草稿；
- `docs/technical-whitepaper-v0.1.md`：技術白皮書。

## 下一步

1. 使用完整 JSON Schema validator 執行 Draft 2020-12 驗證。
2. 增加公式 TeX → MathML → Semantic AST 編譯器。
3. 對接 EveGlyph Editor 的數學物件自訂區塊與工作區 MCP。
4. 將 FELRA 輸出自動寫入獨立 `evidence/` 物件，不修改數學結論。
5. 加入 Lean／Mathlib 對應。
6. 擴展至集合、函數、極限、導數與定積分。
