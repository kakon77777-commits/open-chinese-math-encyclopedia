---
plan_version: ocme-daily-operating-plan-v0.1
status: active
effective_date: 2026-09-12
execution_mode: manual_only
automatic_schedule: false
question_batch_limit: 100
---

# OCME 每日人工營運計畫 v0.1

## 1. 目的與不可變原則

本計畫是 OCME 日常工作的正式操作基準。每日流程由使用者手動開啟對話，不建立 heartbeat、cron 或其他自動排程。若對話內容與本文件衝突，以使用者當次明確指示為準，並在需要時透過 PR 更新本文件。

每日工作的核心順序是：

```text
先擴大可靠覆蓋
→ 再增加每個概念的內容密度
→ 最後才提高大量出題規模
```

長期目標可以是百萬乃至千萬題，但目前單批上限固定為 100 題。提高到 1,000、10,000 或以上必須通過本計畫第 10 節的擴量閘門。

以下界線不可因追求產量而取消：

- Atlas seed 不等於 Canonical MKO。
- AI 候選不等於人工審定。
- 有限計算不等於普遍證明。
- 模型共識不等於獨立驗證。
- 題目數量不等於領域覆蓋。
- 正式網站只發布已通過對應閘門的內容。

## 2. 三方角色與權限

### 2.1 主架構者／企劃負責人

日常由目前 OCME 主對話承擔，負責：

- 新 GitHub 與本機 checkout 的同步、分支與 PR 管理；
- Atlas、領域、依賴、方法、課程與學習路徑設計；
- 每日選題與 Question Producer brief；
- research packet、MKO 候選、Evidence 邊界與網站整合；
- 驗收其他模型的輸出並保存未解異議；
- 測試、部署、公開讀回與每日結案紀錄。

主架構者不得把自己或其他 AI 的候選內容標成人工審查完成，也不得把網站已部署誤寫成 PR 已合併。

### 2.2 高階數學審查者

由使用者另開 GPT-6 或當時更高階的模型對話。它是低頻、高保證審查者，負責：

- 全庫數學嚴證與跨領域架構整合；
- 新頂層領域、重大 Schema、形式語義橋與高風險主張審查；
- 尋找隱含假設、定理逆向誤用、定義循環與跨傳統歧義；
- 對主架構者選定的候選提供異議與修正方向。

高階審查者完成前必須先與主架構者討論。它不直接覆蓋 Canonical 資料、不自行部署，也不因模型等級較高而自動取得發布權。

### 2.3 Question Producer

預設由「OCME 每日 100 題工廠」的 GPT-5.6 Terra 對話承擔；必要時可由使用者手動改用經核准的高速模型。它負責：

- 依當日明確 brief 生產最多 100 道實質變種題；
- 保存來源 MKO、參數、seed、答案、解釋、難度與真實模型資訊；
- 執行 Schema、去重與答案重算；
- 在獨立 staging 中交付 JSONL、manifest 與驗證結果。

Question Producer 不自行選題、不直接從 Atlas seed 出題、不修改主 repo、不建立 Evidence、不部署網站。沒有當日 brief 時停止。

## 3. 2026-09-12 已確認基線

| 項目 | 基線 |
| --- | ---: |
| Core Atlas nodes | 80 |
| Canonical MKO | 9 |
| Materialization queue | 71 |
| Evidence Objects | 9 |
| Formal proof Evidence | 5 |
| Domain registry | 20 |
| 已有 Atlas primary nodes 的領域 | 8 |
| 已有 Canonical primary coverage 的領域 | 4 |
| 學習路徑 | 6 |
| 每批題目上限 | 100 |

正式站：<https://ocme.evemisslab.com/>

GitHub：<https://github.com/kakon77777-commits/open-chinese-math-encyclopedia>

現有 Canonical primary coverage：

- `arithmetic_number_systems`
- `foundations_logic`
- `geometry`
- `analysis`

已有 Atlas 節點、但尚無 Canonical primary coverage：

- `algebra`
- `combinatorics_discrete`
- `probability_statistics`
- `history_philosophy_methodology`

尚無 Core Atlas primary node 的 12 個 registry 領域：

- `topology`
- `number_theory`
- `dynamical_systems`
- `differential_equations`
- `numerical_computational`
- `optimization_operations_research`
- `mathematical_physics`
- `mathematical_biology`
- `economics_finance`
- `computer_science_mathematics`
- `mathematics_education`
- `formalized_mathematics`

## 4. 每日人工啟動方式

使用者要開始主流程時，可在 OCME 主對話貼上：

> 執行 OCME 今日人工流程，依 `docs/OCME_DAILY_OPERATING_PLAN_v0.1.md`；先報告昨日狀態與今日候選工作，再完成可安全完成的範圍。不要建立排程。

要開始出題時，在「OCME 每日 100 題工廠」貼上：

> 依主架構者今天的 Question Brief 生產 100 題；沒有完整 brief 就停止。不得修改主 repo 或部署。

要做高階整合時，在 GPT-6 審查對話貼上：

> 依 OCME 主架構者指定範圍做高階數學嚴證與架構審查；先提出異議與整合建議，完成前先和主架構者討論，不直接修改 Canonical 或部署。

## 5. 主流程的每日步驟

### A. 起始閘門

1. 讀本文件與前一份 `docs/daily/` 紀錄。
2. `git fetch`，確認目前 checkout、HEAD、遠端差異與 PR 狀態。
3. 檢查工作樹；保留使用者根目錄白皮書，不覆寫不明變更。
4. 確認正式站首頁、`/data/index.json`、`/data/questions/index.json` 為 HTTP 200。
5. 確認沒有把候選題、runtime 私有檔或研究草稿誤放進 production build。

若有不明髒檔、遠端無法安全銜接、前一批未結案或正式站來源 revision 不明，當日停止寫入並回報。

### B. 回收前一批

1. 讀 Question Producer 的 JSONL、manifest、驗證報告與雜湊。
2. 驗證題數、ID、來源 MKO、參數、答案、解釋、難度與模型 provenance。
3. 執行 Schema、題幹／seed 去重與獨立答案重算。
4. 保存失敗題與原因；不得為湊滿 100 題降低閘門。
5. 只有合格題才能更新 `public/data/questions/index.json` 與公開批次。

### C. 當日內容建設

1. 從 materialization queue 選一個依賴已滿足的小型 P1 工作。
2. 建立 source-grounded research packet。
3. 建立或修正 MKO、公式、依賴、架構 profile、課程與路徑。
4. 明示 AI candidate、Evidence refs 與 formalization 狀態。
5. 加入正向與負向測試。
6. 若工作超過單一小批次，拆成可審查 PR，不以半成品冒充完成。

### D. 建立當日 Question Brief

1. 只能選已存在的 Canonical MKO。
2. 上限 100 題，通常分成 2–5 個題族。
3. 優先給剛建立且已有可靠答案檢查方法的新領域。
4. 明示禁止使用的逆定理、隱含假設、近似／精確界線與受眾。
5. 以 `docs/templates/OCME_QUESTION_BRIEF.example.json` 為格式基準。
6. 由使用者手動開啟 Question Producer；主流程不得自行建立排程。

### E. 驗證、提交與發布

1. 執行 `npm run check`。
2. 執行 `npm audit`，不得帶已知 high／critical vulnerability 上線。
3. 執行 production build 與瀏覽器桌面／手機 smoke test。
4. 提交到獨立分支，推送並建立或更新 draft PR。
5. 檢查 Ubuntu、Windows 與 formal-proof CI。
6. 日常 production 原則上只部署已進入 `origin/main` 的提交；若使用者明確要求預覽或首發例外，必須在紀錄中標明。
7. 部署後讀回 HTTP 狀態、資料數量、安全標頭與瀏覽器畫面。

### F. 結案

使用 `docs/templates/OCME_DAILY_RUN_LOG_TEMPLATE.md` 建立 `docs/daily/YYYY-MM-DD.md`，至少記錄：

- 起始／結束 commit；
- PR 與 CI；
- 新增或修改的 Atlas／MKO／Evidence；
- Question Brief 與批次結果；
- token、位元組、重複率、驗證時間；
- 部署版本與公開讀回；
- 未解異議、停止原因與下一個義務。

## 6. 覆蓋優先路線

### Phase A：把現有 8 個 Atlas primary 領域補齊 Canonical

建議的依賴安全順序：

1. `mko-arithmetic-operations`：解鎖代數與組合基礎。
2. `mko-variable-expression`：取得 `algebra` 的第一個 Canonical primary coverage。
3. `mko-sample-space`：取得 `probability_statistics` coverage；其集合前置已存在。
4. `mko-mathematical-induction`：取得 `history_philosophy_methodology` coverage；自然數與命題前置已存在。
5. `mko-counting-principle`：取得 `combinatorics_discrete` coverage；需先完成四則運算。

每項都仍須逐日重新檢查 queue 與依賴，這個順序不是跳過 research／validation 的授權。

### Phase B：建立其餘 12 領域的 Atlas 骨架

因為這會改動 80-node baseline 與頂層架構，先由主架構者提出 domain foundation packet，再交 GPT-6 審查。至少分兩波：

- 純數與形式波：拓撲、數論、計算機科學數學、形式化數學。
- 分析與應用波：動力系統、微分方程、數值計算、最佳化、數理物理、數學生物、經濟金融、數學教育。

每個新領域先建立少量基礎節點、依賴與一個代表性 Canonical MKO，不用題目數量掩蓋架構空白。

### Phase C：從廣度轉向密度

所有 20 領域有基礎 Canonical coverage 後，才依學習路徑、需求與缺題率增加每個 MKO 的題族密度。定理逆向、等價命題、邊界案例與高階證明題需要更高審查層級。

## 7. 每批 100 題的預設品質指標

| 指標 | 發布要求 |
| --- | --- |
| Schema 合格率 | 100% |
| 來源 MKO 存在率 | 100% |
| 可機械重算題的答案通過率 | 100% |
| 題目 ID 重複 | 0 |
| 精確題幹重複 | 0 |
| 僅表面換詞的偽變種 | 人工／規則抽查後不得發布 |
| 未聲明逆定理或額外假設 | 0 |
| provenance 完整率 | 100% |
| 發布狀態 | candidate 或 mechanically_checked；不得偽標 reviewed |

當日實際合格題少於 100 題時，發布真實合格數，不補造、不隱瞞。

## 8. GPT-6 高階審查觸發條件

不設時間排程，符合任一條件時由使用者手動開啟：

- 準備新增目前 80-node baseline 沒有的頂層領域；
- 每累積約 20–25 個新 Canonical MKO；
- 修改 MKO、Evidence、Question、Atlas 或形式化 Schema；
- 新增重要定理的逆命題、等價刻畫或跨傳統定義；
- 風險路由達 L3／L4、出現持續分歧或語義橋無法封閉；
- 準備把題庫從 100 題提高到 1,000 題以上；
- 準備發布一次主要版本。

GPT-6 的輸出先進 discussion／review artifact；主架構者整理差異與影響後，才由使用者決定是否改 Canonical 方法。

## 9. 每日停止閘門

出現下列任一情況就停止發布：

- 工作樹含來源不明的追蹤變更；
- GitHub 不能 fast-forward 或 PR base 已漂移；
- research packet 的來源、授權或語義範圍不明；
- 引用了尚未建立的定理或把逆命題當原命題；
- Evidence address、Lean source、公式衍生或 materialization export 漂移；
- Question batch 缺 manifest、來源、模型版本或獨立重算；
- `npm run check`、CI、production smoke 或安全稽核失敗；
- 正式站內容與宣稱的 commit 不一致。

停止不是失敗；降低閘門、隱藏錯誤或偽造完成才是失敗。

## 10. 從 100 題擴量的決策閘門

只有累積足夠實測資料後才討論擴量。至少需要：

1. 連續多批的 token input/output、有效題成本與總執行時間；
2. 每題平均／P95 位元組與年度儲存推估；
3. 題族重複率、拒絕率與人工抽查缺陷率；
4. Schema、去重、答案重算與批次雜湊全部自動化；
5. 公開題庫從 static assets 遷移到合適的索引／物件儲存架構；
6. 20 領域的基礎覆蓋不再被少數熱門題族擠壓；
7. 使用者核准新的 token 與基礎設施預算。

建議資料架構演進：

```text
目前：小批 JSONL + 靜態公開索引
→ 數萬題：R2 保存批次物件，D1 保存題目 metadata／查詢索引
→ 更大規模：分片、內容位址、增量索引、冷熱分層與抽樣審查
```

## 11. 本計畫的變更方式

- 本文件透過 Git／PR 版本化。
- 每日紀錄只能附加新日期，不回寫成看似早已知道後來結果。
- 改變角色權限、擴量閘門或 Canonical 升格規則，必須在 PR 中明示。
- 「暫時不排程」是目前正式決定；除非使用者再次明確要求，不得自行恢復任何 automation。

