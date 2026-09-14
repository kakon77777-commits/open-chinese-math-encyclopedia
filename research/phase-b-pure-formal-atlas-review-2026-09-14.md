---
review_version: ocme-phase-b-atlas-review-v1.0
status: discussion_completed_with_recorded_obligations
reviewed_snapshot: 25879a9f012b34be0b8d067ec009913c4801cc59
reviewer_thread_id: 01a09e48-d69f-7300-95bb-82400b4764f8
speaker_label: unresolved
implementation_authorized: false
canonical_promotion_authorized: false
deployment_authorized: false
---

# Phase B 純數與形式波：Atlas 高階審查紀錄

## 身分與證據邊界

本紀錄整理 host-observed Codex task `01a09e48-d69f-7300-95bb-82400b4764f8` 對 snapshot `25879a9f012b34be0b8d067ec009913c4801cc59` 的兩輪唯讀審查，以及主架構者針對七項問題與兩項追加異議的回覆。task 顯示標題為「Atlas（GPT-6）」且建立時請求 `gpt-6-astra`；模型名稱、標題與自稱都不作 speaker identity 證據，因此 speaker label 維持 `unresolved`。

完整機器可讀 ledger 位於 [phase-b-pure-formal-review-v1.0.json](./phase-b-pure-formal-review-v1.0.json)。本紀錄是 review artifact，不授權修改 Core Atlas、Canonical MKO、Evidence、PR、部署或排程。

## 結論

- `topology`：`CONCUR_WITH_CHANGES`，保留 4 個 research candidates。
- `number_theory`：`CONCUR_WITH_CHANGES`，保留 4 個 research candidates，固定自然數含 0 的首波範圍。
- `computer_science_mathematics`：`CONCUR_WITH_CHANGES`，保留 4 個 research candidates，區分問題規格、計算模型、正確性與資源界。
- `formalized_mathematics`：只對修改後的混合 domain 規則 `CONCUR_WITH_CHANGES`；保留 2 個 Lean 首實例 research candidates，撤回 2 個流程節點。
- 最終 ledger：14 個候選、33 條 hard prerequisite edges。原始 16／44 是已被此審查 supersede 的歷史提案，不是實作數量目標。

## 關鍵架構裁決

現有 `prerequisites` 在 runtime 中會被 materialization scheduler 當成硬阻塞條件，不能同時拿來表示語義背景、教學順序或常用證法。新版 Atlas Schema 必須保留 `prerequisites=materialization_blocking`，並以 typed `relationships` 保存非阻塞的 semantic support、specialization、representation bridge 等關係。方法仍由 method registry 表示；課程先後仍由 learning paths 表示。

現行 `core-atlas.schema.json` 固定 80 entries、8 groups 與既有 group enum。Phase B 不能直接修改公開 JSON；必須先提出並驗收新 Schema／Atlas version。這次建立的 `core-atlas-v0.2-candidate.schema.json` 只是一份候選契約，沒有改變公開 v0.10。

20-domain registry 是重疊導航分類，不是 20 個互斥、等粒度或等 Evidence 類型的學科桶。Coverage 必須分成 primary-domain navigation、supporting/contextual facet、逐 statement formal Evidence；不得用 object-level formal-proof 數量假裝 statement coverage 已量測。

## 撤回的 Atlas candidates

- `atlas-kernel-checking`：移入 Evidence/runtime backlog；若未來提出 checker soundness 等可判真 statement，另案研究。
- `atlas-axiom-assumption-inventory`：移入 Evidence/runtime backlog；公理盤點是 Evidence receipt，不能由盤點成功推出一致性。

## 仍未封閉的義務

- 拓撲連續與實函數極限式連續只能先建立 semantic specialization；subspace topology、isolated point 與 punctured-limit 唯一性需要精確橋接。
- 自然數模同餘採對稱 witness 定義；與 `Nat.ModEq`／餘數相等的等價性另需 formal proof。
- Decision problem 採 `P:X→Prop` 規格；可執行 `Bool`、uniform decider 與 effective presentation 是另一層義務。
- 計算模型的 finite execution prefix 不代表所有 execution 終止；partial correctness、termination 與 total correctness 分開。
- `mko-lean-formal-statement` 必須研究 source syntax 在 pinned environment／context 中 elaborates to `P:Prop`，不能只重複現有命題 MKO。
- 現有 Lean Evidence 沒有逐 theorem 的 axiom/import/declaration closure receipt；在此落地前，高保證 axiom coverage 保持 `NOT_MEASURED`／`unresolved`。

## Closure vector

- Behavioral：`PASS` — review ledger 可被機械解析，14 node／33 hard edge 數量可重算。
- Structural：`PARTIAL` — 新 Schema 候選能表達擴張與 hard/supporting 分層，但六個 legacy Canonical dependency mismatch 尚未逐項遷移。
- Discriminative：`PASS`（候選契約範圍）— validator 能拒絕 hard cycle、hierarchy cycle、未知 supporting target、target collision、group drift、空／遺漏 MKO catalogue 與隱藏的 alignment mismatch。
- Mathematical／formal Evidence closure：`NOT_CLAIMED`。
