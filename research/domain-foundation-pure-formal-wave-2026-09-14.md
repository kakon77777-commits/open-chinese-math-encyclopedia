---
packet_version: ocme-domain-foundation-wave-v0.1
wave_id: phase-b-pure-formal-wave
status: awaiting_high_assurance_review
prepared_at: 2026-09-14
baseline_commit: 3f8ab7c
atlas_write_authorized: false
canonical_write_authorized: false
deployment_authorized: false
---

# Phase B：純數與形式波 domain foundation review packet

## 決策範圍

本封包只提出四個目前已有 domain registry、但尚無 Core Atlas primary node 的領域骨架：`topology`、`number_theory`、`computer_science_mathematics`、`formalized_mathematics`。目前基線是 80 個 Atlas 節點、14 個 Canonical MKO；本次不修改 Atlas、MKO、Evidence、課程、路徑或正式網站資料。

外部分類只作為領域邊界的校準資料，不是 OCME 分類決定本身。MSC2020 將一般拓撲、數論與電腦科學列為獨立主類；電腦科學主類內又區分計算理論、與電腦科學相關的離散數學、演算法以及支援數學研究與實務的電腦科學。這支持前三個領域作為 primary domain，但也顯示它們和現有 `combinatorics_discrete`、`foundations_logic`、`numerical_computational` 有必要保留交界。[MSC2020：一般拓撲](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=54-XX)、[MSC2020：數論](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?btn=Current&t=11A63)、[MSC2020：電腦科學](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=68-XX)

## 主架構者的初步立場

| Domain | 初步立場 | Primary 邊界 | 主要異議 |
| --- | --- | --- | --- |
| `topology` | `CONCUR` | 研究拓撲結構、開閉集、鄰域與拓撲連續性本身 | 必須和現有實函數極限式 `atlas-continuity` 分層，避免兩個「連續」互相循環 |
| `number_theory` | `CONCUR` | 整除、最大公因數、質數、合同等整數／自然數算術結構 | 初始節點要先固定自然數或整數論域；不能把環論中的 prime／irreducible 等同搬入 |
| `computer_science_mathematics` | `CONCUR_WITH_NARROW_SCOPE` | 決定問題、計算模型、正確性／不變量與漸近資源界 | 一般離散數學仍留在 `combinatorics_discrete`；數值算法留在 `numerical_computational` |
| `formalized_mathematics` | `CHALLENGE_AS_PURE_PRIMARY_DOMAIN` | 只有以形式陳述、證明項、核心檢查與公理盤點為研究對象的節點可 primary | 多數 Lean-backed 數學 MKO 應保留原數學 primary domain，只加 `method-formal-verification` 與 Evidence，而不是複製到此領域 |

## 候選擴張摘要

四份子封包合計提出 16 個 `atlas_seed` 候選；若全數接受，節點數會由 80 變為 96。每個領域先有四個骨架節點，但第一輪只挑一個 representative MKO materialization candidate。所有新節點與現有節點的邊都由新節點指向既有前置，唯一另行建議的既有節點修正是讓實函數的 `atlas-continuity` 在語義澄清後依賴一般的 `atlas-topological-continuity`；依目前提案不存在回邊。

| Domain | 候選節點數 | Representative MKO candidate | 依賴是否已全為 Canonical |
| --- | ---: | --- | --- |
| `topology` | 4 | `mko-topological-space` | 否；集合運算仍為 Atlas seed |
| `number_theory` | 4 | `mko-natural-divisibility` | 是 |
| `computer_science_mathematics` | 4 | `mko-decision-problem` | 是 |
| `formalized_mathematics` | 4 | `mko-formal-statement` | 否；量詞與邏輯連接詞仍為 Atlas seed |

## 子封包

- [拓撲 domain foundation packet](./domain-foundation-topology-2026-09-14.md)
- [數論 domain foundation packet](./domain-foundation-number-theory-2026-09-14.md)
- [計算機科學數學 domain foundation packet](./domain-foundation-computer-science-mathematics-2026-09-14.md)
- [形式化數學 domain foundation packet](./domain-foundation-formalized-mathematics-2026-09-14.md)

## GPT-6 必須回覆的審查格式

每個領域分別回覆：

1. `CONCUR`、`CONCUR_WITH_CHANGES` 或 `CHALLENGE`。
2. primary／supporting 邊界以及理由。
3. 接受、刪除、改名或拆分的精確 node IDs。
4. 每條 prerequisite edge 的保留或修正；指出任何循環或錯誤方向。
5. 代表性 MKO 的最小 statement、assumptions、反例邊界與 Evidence 義務。
6. 哪些項目只是課程／導航決定，而不是數學命題。
7. 未解異議與需要和主架構者討論的問題。

GPT-6 不直接編輯 Canonical 或 Atlas，不合併 PR、不部署。完成審查前須先和 OCME 主架構者討論；討論結論仍不自動構成寫入或發布授權。
