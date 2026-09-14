---
packet_version: ocme-domain-foundation-wave-v0.1
wave_id: phase-b-pure-formal-wave
status: high_assurance_review_complete_waiting_schema
prepared_at: 2026-09-14
baseline_commit: 3f8ab7c
reviewed_snapshot: 25879a9f012b34be0b8d067ec009913c4801cc59
review_artifact: research/phase-b-pure-formal-atlas-review-2026-09-14.md
atlas_write_authorized: false
canonical_write_authorized: false
deployment_authorized: false
---

# Phase B：純數與形式波 domain foundation review packet

## 決策範圍

本封包只提出四個目前已有 domain registry、但尚無 Core Atlas primary node 的領域骨架：`topology`、`number_theory`、`computer_science_mathematics`、`formalized_mathematics`。目前基線是 80 個 Atlas 節點、14 個 Canonical MKO；本次不修改 Atlas、MKO、Evidence、課程、路徑或正式網站資料。

外部分類只作為領域邊界的校準資料，不是 OCME 分類決定本身。MSC2020 將一般拓撲、數論與電腦科學列為獨立主類；電腦科學主類內又區分計算理論、與電腦科學相關的離散數學、演算法以及支援數學研究與實務的電腦科學。這支持前三個領域作為 primary domain，但也顯示它們和現有 `combinatorics_discrete`、`foundations_logic`、`numerical_computational` 有必要保留交界。[MSC2020：一般拓撲](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=54-XX)、[MSC2020：數論](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?btn=Current&t=11A63)、[MSC2020：電腦科學](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=68-XX)

## Atlas 與主架構者的最終審查立場

| Domain | 審查立場 | Primary 邊界 | 保留義務 |
| --- | --- | --- | --- |
| `topology` | `CONCUR_WITH_CHANGES` | 研究拓撲結構、開閉集、鄰域與拓撲連續性本身 | 和現有實函數極限式連續性只先建立 specialization；孤立點與子空間橋仍未證 |
| `number_theory` | `CONCUR_WITH_CHANGES` | 首波限定含 0 的自然數整除、gcd／互質、質數與模同餘 | `Nat.ModEq`、0 邊界與環論 prime／irreducible 另行處理 |
| `computer_science_mathematics` | `CONCUR_WITH_CHANGES` | 決定問題、抽象計算模型、正確性與漸近資源界 | Prop／Bool、有效表示、nondeterminism、stuck 與 termination 分層 |
| `formalized_mathematics` | `CONCUR_WITH_CHANGES_MIXED_DOMAIN` | 只保留以 Lean 形式陳述與 proof term 本身為研究對象的 primary 節點 | 一般數學仍保留原 primary domain；kernel／axiom receipt 改進 Evidence/runtime |

## 候選擴張摘要

高階審查把原始 16 個候選／44 條前置邊收斂為 14 個候選／33 條 hard prerequisite edges。16／96 不再是配額；formalized mathematics 只保留 2 個 Atlas candidates。現有 v0.10 Schema 固定 80 entries／8 groups，因此這份 ledger 仍是 research-only，必須先通過新版 Atlas Schema 才能考慮實作。

| Domain | 候選節點數 | Representative MKO candidate | 依賴是否已全為 Canonical |
| --- | ---: | --- | --- |
| `topology` | 4 | `mko-topological-space` | 否；集合運算仍為 Atlas seed |
| `number_theory` | 4 | `mko-natural-divisibility` | 是 |
| `computer_science_mathematics` | 4 | `mko-decision-problem` | 是 |
| `formalized_mathematics` | 2 | `mko-lean-formal-statement` | 是；但 Schema 與語義審查仍未授權 materialization |

## 子封包

- [拓撲 domain foundation packet](./domain-foundation-topology-2026-09-14.md)
- [數論 domain foundation packet](./domain-foundation-number-theory-2026-09-14.md)
- [計算機科學數學 domain foundation packet](./domain-foundation-computer-science-mathematics-2026-09-14.md)
- [形式化數學 domain foundation packet](./domain-foundation-formalized-mathematics-2026-09-14.md)
- [Atlas 高階審查紀錄](./phase-b-pure-formal-atlas-review-2026-09-14.md)
- [機器可讀 14-node／33-edge ledger](./phase-b-pure-formal-review-v1.0.json)
- [Core Atlas v0.11 Schema 候選設計](../docs/core-atlas-v0.11-schema-design.md)

## 下一個實作閘門

`prerequisites` 必須只表示 materialization-blocking hard dependencies；非阻塞語義關聯、方法與課程先後分流。新版 Schema 需能擴充 groups／entries、驗證 hard 與 supporting cycles、保存 relation provenance，並明示六個 legacy Canonical dependency mismatch。審查完成仍不構成 Atlas／Canonical 寫入、PR、部署或發布授權。
