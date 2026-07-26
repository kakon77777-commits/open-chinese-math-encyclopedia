# 開源中文數學百科 MVP

面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統。

OCME v0.5 建立三條彼此分離、可重建的資料鏈：

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

現有數學知識圖：

```text
直角三角形 ─┐
             ├→ 畢達哥拉斯定理
歐幾里得長度 ┘
```

## 核心界線

$$
\text{數學}\neq\text{程式}\neq\text{有限計算證據}\neq\text{形式證明}
$$

目前正式 Evidence Object 均標記：

```text
universal_proof: false
```

FELRA producer 被標記為 `configured` 時，只表示設定存在，不表示證據已產生。

## 安裝與啟動

```bash
npm install
npm start
```

開啟 `http://127.0.0.1:4173`。介面支援：

- 三個數學知識物件切換；
- 前置知識跳轉與搜尋；
- 原生 MathML、公式 AST 與編譯器血統；
- MKO 明確引用的 Evidence Object；
- Python／FELRA producer 狀態；
- 證據範圍、限制、來源雜湊與重播命令。

## 公式編譯

```bash
npm run compile:formulas
npm run verify:formulas
```

`formula.tex` 是公式衍生層的單一來源。未支援的 TeX 命令會直接失敗，不會猜測或降級成圖片。

## Python Evidence

```bash
npm run verify:python
npm run build:evidence
```

只檢查已提交證據：

```bash
npm run verify:python
npm run verify:evidence
```

Evidence ID 由標準化 payload 的 SHA-256 決定。執行結果、來源程式、公式來源、聲明範圍、限制或重播命令改變時，地址也必須改變。

## FELRA Evidence Adapter

### 1. 執行 FELRA

```bash
npm run verify:felra
```

現有專案規格：

```text
felra/pythagorean/project.yaml
```

### 2. 產生正規化 manifest

FELRA 執行結果需先整理成：

```text
felra-run-manifest-v0.1
```

Schema：

```text
schemas/felra-run-manifest.schema.json
```

### 3. 預覽 Evidence Object

```bash
npm run adapt:felra -- --manifest artifacts/felra/ocme-manifest.json
```

輸出到檔案：

```bash
npm run adapt:felra -- \
  --manifest artifacts/felra/ocme-manifest.json \
  --output artifacts/felra/evidence-preview.json
```

### 4. 匯入 manifest

```bash
npm run adapt:felra -- \
  --manifest artifacts/felra/ocme-manifest.json \
  --ingest
```

匯入後執行：

```bash
npm run build:evidence
npm run check
```

Canonical Evidence 只能由統一 Builder 建立。Adapter 預覽本身不是已發布證據。

## MKO v0.3 驗證模型

MKO 不再保存內嵌測試摘要，也不再使用單一 `felra_project` 字串。驗證欄位改為：

```json
{
  "verification": {
    "computational_status": "finite_cases_passed",
    "warning_zh": "...",
    "evidence_refs": [
      {
        "id": "evidence-sha256-...",
        "role": "finite_computational_check",
        "producer_id": "ocme-python-suite"
      }
    ],
    "producers": [
      {
        "id": "felra",
        "adapter": "felra",
        "config_path": "felra/pythagorean/project.yaml",
        "status": "configured"
      }
    ]
  }
}
```

驗證器會拒絕：

- 舊版 `verification.evidence`；
- 舊版 `verification.felra_project`；
- 懸空或重複 Evidence ref；
- subject、role 或 producer 不一致；
- producer 設定檔不存在；
- active producer 沒有引用證據；
- Evidence Object 沒被其 subject MKO 引用。

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
→ 正向與負向測試
→ MKO／Evidence JSONL 與依賴圖匯出
```

## MCP

```bash
npm run mcp
```

v0.5 主要工具：

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
- `get_computational_companion`
- `get_verification_status`

`get_evidence_for_object` 只解析 MKO 的 `evidence_refs`；`get_evidence_producers` 會區分「已設定」與「已有引用證據」。

## 主要檔案

- `public/data/mko/`：Canonical MKO v0.3；
- `public/data/evidence/`：內容定址 Evidence Object；
- `evidence-sources/felra/`：已接受的 FELRA 正規化 manifest；
- `schemas/mko-v0.3.schema.json`：MKO v0.3 Schema；
- `schemas/evidence.schema.json`：Evidence Schema；
- `schemas/felra-run-manifest.schema.json`：FELRA Adapter 輸入契約；
- `lib/evidence-adapters/felra.js`：FELRA Evidence Adapter；
- `scripts/adapt-felra-manifest.mjs`：預覽與 ingest CLI；
- `scripts/build-evidence.mjs`：統一證據建置器；
- `docs/felra-evidence-adapter-v0.5.md`：完整適配規格。

## 下一步

1. 由實際 FELRA 執行產生第一份正式 FELRA Evidence Object。
2. 對接 EveGlyph Editor 的 MKO／Evidence 編輯與審查區塊。
3. 加入 Lean／Mathlib 對應與形式證據物件。
4. 擴展至集合、函數、極限、導數與定積分。
