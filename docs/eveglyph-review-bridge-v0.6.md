# OCME v0.6：EveGlyph 文字審查橋接

## 目的

OCME 的 Canonical MKO 同時包含人類文字與機器管理欄位。EveGlyph 橋接只允許審查繁體中文敘述，不允許文字編輯流程直接改寫公式、Semantic AST、Evidence、producer、形式化狀態或來源血統。

## 可審欄位

```text
title_zh
summary_zh
statement_zh
explanation_paragraphs_zh
common_misconception_zh
proof_summaries_zh
```

下列欄位為唯讀：

```text
formula
assumptions
symbols
dependencies
computational_companions
verification
formalization
provenance
```

## 匯出審查封包

```bash
npm run export:eveglyph
```

輸出：

```text
artifacts/eveglyph-review/
├── manifest.json
├── <object>.review.json
└── <object>.review.md
```

Markdown 可直接放入 EveGlyph 進行閱讀、修改建議與 Git Diff 審查；JSON packet 則保留精確的欄位界線與基線雜湊。

## 樂觀鎖

每份 review packet 都包含：

```text
base_object_sha256
```

它由完整 Canonical MKO 的標準化 JSON 計算。若公式、證據、文字或任何其他欄位在審查期間已改變，舊 patch 的 base SHA 將失效，系統會拒絕套用。

因此：

$$
\text{Review Patch}
+
\text{Fresh Base SHA}
\rightarrow
\text{可審查更新}
$$

而不是最後寫入者無條件覆蓋。

## Patch 格式

Patch 必須符合：

```text
schemas/eveglyph-review-patch.schema.json
```

範例：

```json
{
  "schema_version": "ocme-eveglyph-review-patch-v0.1",
  "object_id": "mko-euclid-pythagorean-theorem",
  "base_object_sha256": "<64-hex>",
  "new_object_version": "0.6.1",
  "rationale_zh": "改善繁體中文敘述。",
  "changes": {
    "summary_zh": "直角三角形的兩股平方和等於斜邊平方。"
  }
}
```

預覽：

```bash
npm run apply:eveglyph -- --patch path/to/patch.json
```

正式寫入工作區：

```bash
npm run apply:eveglyph -- --patch path/to/patch.json --write
npm run check
```

## 拒絕條件

- `base_object_sha256` 已過期；
- 新版本號沒有增加；
- patch 指向另一個 MKO；
- proof ID 不存在；
- patch 出現未知欄位；
- 嘗試加入 `formula`、`verification`、`evidence_refs` 等機器欄位；
- 套用後 MKO 不符合 Draft 2020-12 Schema；
- 任一機器管理欄位在套用前後不同。

## MCP

MCP 提供：

```text
get_eveglyph_review_packet
```

此工具只產生唯讀 review packet，並明確回傳：

```text
direct_publish_available: false
```

v0.6 不允許 Agent 透過 MCP 直接發布修改。正式套用仍需 patch 檔、Schema 驗證、基線 SHA 與完整 `npm run check`。
