# FELRA Evidence Sources

此目錄只保存已接受、符合 `felra-run-manifest-v0.1` 的正規化 manifest。

- 不要直接放任意 FELRA 輸出。
- 不要手工建立 Evidence ID。
- 不要把 `configured` producer 當成已存在證據。
- 先使用 `npm run adapt:felra -- --manifest <path>` 預覽。
- 使用 `--ingest` 寫入此目錄後，再執行 `npm run build:evidence`。

目前沒有正式 FELRA manifest；`tests/fixtures/` 中的檔案只用於 Adapter 測試，不會進入 Canonical Evidence Index。
