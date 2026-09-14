---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: topology
status: ai_candidate_for_gpt6_review
prepared_at: 2026-09-14
review_required: true
atlas_change_authorized: false
---

# 拓撲 domain foundation packet

## 來源支持的數學事實

Mathlib 的基礎定義以 `TopologicalSpace X` 賦予型別 `X` 一族開集；整個空間為開集、兩個開集的交集為開集、任意開集族的聯集為開集。閉集以補集為開集定義；連續映射以每個開集的逆像為開集定義。[Mathlib：TopologicalSpace 基礎定義](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Defs/Basic.html)

MSC2020 把一般拓撲列為 54-XX，並分出一般性、基本構造、由映射定義的空間與映射、一般性質等子類，因此把拓撲保留為 OCME primary domain 有外部分類依據；這仍不是對具體 Atlas 節點的授權。[MSC2020：54-XX General topology](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=54-XX)

## OCME 分類提案

- `primary_domain=topology`：拓撲空間、開閉集、鄰域、一般拓撲連續性。
- `supporting`：集合、集合運算、子集合、函數映射與量詞仍使用既有節點，不在拓撲群組重造。
- 現有 `atlas-continuity` 暫時視為實函數／分析語境中的連續性。若加入一般拓撲連續性，應縮窄其顯示名稱與摘要，而不是刪除歷史 ID。

## 候選 Atlas 節點

| 順序 | Candidate ID | 顯示名稱 | prerequisites | methods | 關鍵邊界 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `atlas-topological-space` | 拓撲空間 | `atlas-set`, `atlas-set-operations` | `method-construction`, `method-direct-proof` | 空間與其拓撲結構必須分清；同一底集合可有不同拓撲 |
| 2 | `atlas-open-closed-set` | 開集與閉集 | `atlas-topological-space`, `atlas-subset`, `atlas-set-operations` | `method-direct-proof` | 閉集不是「不開」；同一集合可同時開且閉 |
| 3 | `atlas-neighborhood` | 鄰域 | `atlas-topological-space`, `atlas-open-closed-set`, `atlas-set-membership` | `method-localization` | 鄰域需要包含點的一個開集，不能等同單一開球 |
| 4 | `atlas-topological-continuity` | 拓撲連續映射 | `atlas-topological-space`, `atlas-open-closed-set`, `atlas-function-mapping` | `method-direct-proof` | 使用開集逆像，不把像集開放性誤當一般連續性的定義 |

建議新群組為 `topology`，`expected_count=4`。若 GPT-6 同意連續性分層，再把既有 `atlas-continuity` 顯示名稱縮窄為「實函數連續性」，並考慮加入 `atlas-topological-continuity` 作前置；需先檢查 `atlas-function-limit → atlas-continuity` 與新邊不形成語義循環。

## Representative MKO candidate

- ID：`mko-topological-space`
- 最小 statement：在底集合／型別 `X` 上，拓撲以一族開集給出，滿足全空間、有限交（由二元交可推出）與任意聯集封閉。
- 必須明示：空集合開放性由空族聯集推出，或在教學版本中獨立列出並說明與所採公理組等價。
- 反例邊界：任意子集合族都不是拓撲；若缺任意聯集封閉或有限交封閉，不能升格。
- Evidence：首輪 `evidence_refs=[]`、`formalization.status=not_formalized`；下一義務是以 Mathlib `TopologicalSpace` 建立精確聲明、示範離散拓撲與平凡拓撲，保存 Lean source 與內容位址。
- 依賴狀態：`mko-set` 與 `mko-set-operations` 的 Canonical 狀態必須在 materialization 當天重查；目前 `mko-set-operations` 尚未 materialize，因此雖然 Atlas edge 可提案，不能宣稱 immediate dependency-safe。

## 需 GPT-6 裁決

1. `atlas-topological-space` 是否只依賴集合，將集合運算作同層必要語彙，還是必須等待 `mko-set-operations` Canonical 後再 materialize？
2. 一般拓撲連續性應成為既有實函數連續性的前置、上位概念，或只做 semantic cross-link？
3. 首波是否應以 `atlas-topological-basis` 取代 `atlas-neighborhood`；兩者都不應在最小骨架中同時膨脹。
4. 是否需要新增 `method-homeomorphism`，或暫以 `method-construction`／`method-direct-proof` 表示，避免為單一領域過早擴張 method registry？
