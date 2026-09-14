---
design_version: ocme-core-atlas-v0.11-schema-design-v0.1
status: candidate_only
prepared_at: 2026-09-14
baseline_commit: 25879a9f012b34be0b8d067ec009913c4801cc59
public_atlas_change_authorized: false
---

# OCME Core Atlas v0.11 Schema 候選設計

## 目的與非目標

本設計解決 v0.10 的兩個結構限制：公開 Schema 把 Atlas 固定為 80 entries／8 groups；單一 `prerequisites` 欄位容易被誤用來混合 materialization 阻塞、語義背景、教學順序與常用方法。

本輪只建立 candidate Schema、migration audit 與負向測試。它不修改 `public/data/atlas/core-atlas.json`，不新增 Phase B 節點，不升格 MKO，不改 production website。

## v0.2 candidate contract

候選檔：`schemas/core-atlas-v0.2-candidate.schema.json`。

- `schema_version=ocme-core-atlas-v0.2-candidate`。
- `atlas_version=0.11.0-candidate.1`。
- `status=schema_candidate`。
- `groups` 最少 8、不設固定最大值；group ID 改為受格式限制的可擴充字串。
- `entries` 最少 80、不設固定最大值。
- `prerequisites` 的唯一有效語義固定為 `materialization_blocking`。
- 每個 entry 新增 `relationships`，保存非阻塞且具 provenance 的 typed node-to-node 關係。
- Schema candidate 可以驗證擴充能力，但只有另行核准的 active Schema 才能取代 v0.10。

## Hard prerequisite

一條 hard prerequisite 只有在「缺少該前置的穩定 Canonical 語義，目標 MKO 無法被正確陳述與驗證」時成立。它會：

1. 被複製進 materialization task；
2. 阻塞 scheduler；
3. 在 promotion 時和實際 MKO dependency graph 對齊。

量詞記號、常用證法、背景領域或課程先後不會因為常被使用就自動成為 hard prerequisite。這些資料分流到 relationships、methods、classification assertions 或 learning paths。

## Supporting relationships

候選 relation types：

- `semantic_support`
- `specialization_of`
- `generalization_of`
- `representation_bridge`
- `application_context`
- `contrast_with`
- `historical_context`

每條關係保存 target、中文理由與 source method／reviewed 狀態。Validator 檢查 target 存在、禁止 self relation、禁止同 entry 的重複 type+target，並把 specialization／generalization 正規化後拒絕 hierarchy cycle。

Methods 仍使用 `method-*` registry；教學順序仍使用 learning paths。不得把 method ID 或 domain ID 偽裝成 node relation target。

## Migration 與已知 debt

Candidate migration 會從 v0.10 產生一份記憶體內的 v0.2 candidate，不覆寫公開 Atlas。它把每個既有 entry 加上空 `relationships`，並重算 Canonical entry 的 hard target MKO 與實際 MKO dependencies。

目前觀察到 6 個 legacy mismatch：

- `atlas-set-membership`
- `atlas-euclidean-length`
- `atlas-right-triangle`
- `atlas-pythagorean-theorem`
- `atlas-function-mapping`
- `atlas-tends-to-relation`

`legacy_unresolved` 狀態必須以 exceptions 精確覆蓋實際 mismatch；少列、多列或內容不符都會驗證失敗。只有 mismatch 為 0 且 exceptions 為空時才能標 `complete`。這個 audit 不表示六項應採同一修法，也不撤銷現有 Canonical；每項仍需獨立語義審查。

## Coverage contract

下一版 coverage report 必須明示 unit、numerator、denominator 與 measurement status：

- Primary-domain navigation coverage：單位為 domain；分母必須列出哪些 registry domains 被納入。
- Supporting-facet coverage：單位為 Architecture classification assertion；不作 materialization gate。
- Formal Evidence coverage：單位為 statement，不是 MKO 數量。現有資料還沒有完整 statement denominator，因此保持 `NOT_MEASURED`；可以另報 object-level proxy，但不得替代 statement coverage。

## 驗收與啟用閘門

Active v0.11 至少需要：

1. 使用者／架構 authority 核准新 Schema version 與 group strategy；
2. Phase B ledger 與 Schema data model 一致；
3. 六個 legacy mismatch 逐項處理或以明示 migration phase 保留；
4. hard dependency、supporting relation、group count、target collision 與兩類 cycle 的正反例測試；
5. materialization scheduler、export、website 與 MCP consumers 完成相容升級；
6. 正式 PR、Ubuntu／Windows／formal-proof CI 與 deployment authority 另行通過。

本文件與 candidate tests 通過不構成上述任何後續權限。
