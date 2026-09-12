# OCME Question Factory Contract v0.1

## 目的

Question Factory 每次由使用者手動啟動，依當日 brief 產生最多 100 道結構化變種題候選，供 OCME 的練習與評量層使用。現階段不設自動排程。題目不是 Canonical MKO、不是 Evidence Object，也不能授權修改 Atlas、MKO、架構分類或形式證明狀態。

## 角色分工

- 主架構者：選擇當日 MKO、題型、受眾、比例與驗收門檻；整合批次並決定是否發布。
- Question Producer：依 brief 實際產生題目與答案；預設模型為 GPT-5.6 Terra，必要時可改用經核准的高速模型。
- 高階數學審查者：低頻抽查高風險題型、跨領域一致性與數學嚴證；完成前先與主架構者討論。

Question Producer 不得自行宣稱人類已審查，不得把模型共識當成獨立驗證，也不得直接部署網站。

## 每日輸入 brief

每日 brief 必須至少指定：

1. `batch_id` 與日期；
2. 可使用的 `source_mko_ids`；
3. 題數與題型比例；
4. 受眾與難度分布；
5. 禁止範圍與已知語義邊界；
6. 可執行的答案檢查器；
7. 輸出位置與驗收指令。

未收到明確 brief 時，Question Producer 應停止生產，不得自行擴大選題。

## 輸出契約

- 一題一行 JSONL，符合 `schemas/question-v0.1.schema.json`。
- ID 格式為 `q-YYYYMMDD-<family>-NNNN`，批次內唯一。
- 每題保留來源 MKO、題幹、答案、中文解釋、難度、題族、seed、參數、檢查與生成 provenance。
- 同一題族的變種必須由明示參數或 seed 區分；只改人名、語序或無關文字不算有效變種。
- 產出時狀態一律為 `candidate`。只有實際執行指定檢查後才能標成 `mechanically_checked`。

## 第一批選題

第一批以已存在計算 Evidence 的三個幾何 MKO 為主：

- `mko-euclidean-length`
- `mko-right-triangle`
- `mko-euclid-pythagorean-theorem`

建議比例：距離計算 30 題、直角三角形判定 30 題、畢達哥拉斯缺邊與反例辨識 40 題。所有數值題必須可由獨立程式重算答案；有限重算不構成定理的普遍證明。

## 發布閘門

批次發布前必須通過：

- JSON Schema；
- ID、seed 與題幹去重；
- `source_mko_ids` 全部存在；
- 數值／選擇題答案由獨立檢查器重算；
- 題目與答案不依賴未聲明假設；
- 批次 manifest 記錄模型、日期、題數、檢查與雜湊；
- 網站只顯示真實發布數，不以每日目標冒充實際庫存。

## 每日停止條件

若來源 MKO 漂移、檢查器失敗、輸出重複率超標、題數不足、模型身分或版本無法記錄，該批保持 candidate 並停止發布。問題應回報主架構者，而不是降低閘門。
