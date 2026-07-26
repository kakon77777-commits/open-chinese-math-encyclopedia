# OCME Evidence Object v0.4

## 問題

早期 MVP 將有限測試結果直接放在 MKO 的 `verification.evidence` 欄位中。這適合單一示範，但會造成：

- 相同證據難以被多個物件引用；
- 執行結果與數學條目版本耦合；
- 難以辨別證據是否被事後修改；
- Python、FELRA、符號檢查與形式證明缺乏共用接口；
- AI 容易只看到「passed」而忽略適用範圍與限制。

## v0.4 模型

Evidence Object 是獨立資料：

```text
Evidence =
  subject
+ claim scope
+ producer
+ source hashes
+ formula source hash
+ checks
+ limitations
+ replay command
```

標準化 payload 經 SHA-256 後形成 ID：

```text
evidence-sha256-<64 hex characters>
```

`id` 與 `digest` 不參與自身 payload 的雜湊，避免循環定義。

## 關鍵欄位

### `claim_scope`

明確表達證據覆蓋範圍：

```json
{
  "quantification": "finite_declared_cases",
  "universal_proof": false,
  "statement_zh": "……"
}
```

目前三份 Python 證據均不是普遍證明。

### `sources`

每個實際執行來源保存路徑與 SHA-256：

```json
{
  "role": "computational_companion",
  "path": "reference/python/right_triangle.py",
  "sha256": "..."
}
```

修改程式後，即使輸出仍全部通過，Evidence ID 也會改變。

### `formula_source_sha256`

證據綁定當時的公式 TeX 來源。公式改變後，舊證據仍可保存，但不能冒充新公式的證據。

### `limitations`

限制是地址內容的一部分。刪除「有限範圍不等於普遍證明」之類的警告會改變地址，並被漂移驗證拒絕。

## 重建

先執行 Python 計算伴隨，再建立證據：

```bash
npm run verify:python
npm run build:evidence
```

只驗證已提交 Evidence Object：

```bash
npm run verify:python
npm run verify:evidence
```

完整檢查：

```bash
npm run check
```

## MCP

v0.4 新增：

```text
list_evidence
get_evidence
get_evidence_for_object
```

`get_evidence` 會同時回傳重新計算的地址驗證結果。

## 遷移

v0.4 保留 MKO 內嵌測試摘要作為舊版相容層，但 UI 與 MCP 已以外部 Evidence Object 為權威資料。後續版本將把 MKO 改為只保留 evidence reference。
