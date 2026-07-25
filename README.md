# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。第一個垂直切片使用「畢達哥拉斯定理」，打通：

```text
MKO JSON
→ KaTeX 人類介面
→ MCP AI 介面
→ Python 計算伴隨
→ FELRA 專案
→ JSONL 匯出
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

網站端為零外部依賴，開啟 `http://127.0.0.1:4173`。頁面提供「數學／解釋／程式碼／計算證據／形式化／AI 結構」六個頁籤。

## 驗證與匯出

```bash
npm run validate
npm test
npm run verify:python
npm run export
```

輸出位於 `artifacts/`。

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

工具：

- `search_math_objects`
- `get_math_object`
- `get_math_context_bundle`
- `get_computational_companion`
- `get_verification_status`

Claude Desktop 類設定：

```json
{
  "mcpServers": {
    "ocme": {
      "command": "node",
      "args": ["/absolute/path/to/ocme-mvp/mcp-server.js"]
    }
  }
}
```

## 主要檔案

- `public/data/mko/pythagorean-theorem.json`：Canonical MKO
- `schemas/mko.schema.json`：MKO v0.1 Schema
- `src/`：人類 UI
- `mcp-server.js`：AI 取用層
- `reference/python/pythagorean.py`：計算伴隨
- `felra/pythagorean/project.yaml`：FELRA 規格
- `content/articles/pythagorean-theorem.md`：EveGlyph-MD 文章草稿

## 下一步

1. 以真正 JSON Schema validator 取代 MVP 必填欄位檢查。
2. 增加公式 TeX → MathML → Semantic AST 編譯器。
3. 加入「直角三角形」與「歐幾里得長度」依賴物件。
4. 對接 EveGlyph Editor 的自訂區塊與現有 MCP。
5. 將 FELRA 輸出自動回寫 `evidence/`，但不可修改數學結論。
6. 加入 Lean／Mathlib 對應。
