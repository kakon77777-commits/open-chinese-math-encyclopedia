# OCME FELRA Evidence Adapter v0.5

## 1. 目的

FELRA 的執行成功、FELRA 的輸出檔案，以及 OCME 正式承認的 Evidence Object，是三種不同狀態。

```text
FELRA execution
≠ normalized manifest
≠ canonical Evidence Object
≠ mathematical proof
```

Adapter 的任務，是把已完成的 FELRA 執行結果轉成 OCME 可驗證、可重播、可內容定址的證據候選。

## 2. 邊界

Adapter 不做：

- 不推測 FELRA 未提供的檢查結果；
- 不把「未發現反例」改寫成普遍證明；
- 不從圖片或自由文字猜測結論；
- 不直接修改 MKO 的數學敘述；
- 不直接繞過 Evidence Builder 寫入 Canonical Index。

## 3. 正規化 manifest

輸入必須符合：

```text
schemas/felra-run-manifest.schema.json
```

必要資料包括：

- `subject_id`：對應 MKO；
- `project_id`：FELRA 專案；
- `producer_version`：實際 FELRA 生產器版本；
- `evidence_type`；
- `status`；
- `claim_scope`；
- `checks`；
- `limitations`；
- `project_path`；
- `result_sources`；
- `replay`。

`claim_scope.universal_proof` 在 FELRA manifest v0.1 中固定為 `false`。

## 4. 內容地址

Adapter 會讀取實際專案與結果檔案 bytes，計算 SHA-256，並建立：

```text
manifest semantics
+ FELRA project bytes
+ result source bytes
+ MKO formula source SHA-256
→ canonical JSON payload
→ Evidence SHA-256 ID
```

路徑必須位於儲存庫內；`../` 路徑逃逸會被拒絕。

## 5. 操作流程

### 預覽

```bash
npm run adapt:felra -- --manifest artifacts/felra/ocme-manifest.json
```

### 輸出預覽檔

```bash
npm run adapt:felra -- \
  --manifest artifacts/felra/ocme-manifest.json \
  --output artifacts/felra/evidence-preview.json
```

### 接受 manifest

```bash
npm run adapt:felra -- \
  --manifest artifacts/felra/ocme-manifest.json \
  --ingest
```

### 建立 Canonical Evidence

```bash
npm run build:evidence
npm run check
```

## 6. MKO Producer 狀態

```text
active       已有 Evidence ref，且生產者可重播
configured   設定存在，但尚無被 MKO 引用的正式證據
unavailable  已知目前不可執行
```

`configured` 不可被 UI 或 MCP 顯示為「驗證通過」。

## 7. 第一份 FELRA 證據的完成條件

畢達哥拉斯定理的 FELRA producer 要從 `configured` 升為 `active`，必須同時完成：

1. 實際執行 FELRA；
2. 保存輸出與環境資訊；
3. 產生合法 manifest；
4. Adapter 轉換成功；
5. Evidence Builder 建立內容地址；
6. MKO 新增對該 Evidence ID 的 `evidence_refs`；
7. GitHub Actions 全部通過。

在此之前，系統只能宣稱「FELRA 專案已設定」，不能宣稱「FELRA 證據已存在」。
