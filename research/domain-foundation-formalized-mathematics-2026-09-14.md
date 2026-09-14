---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: formalized_mathematics
status: reviewed_mixed_domain_candidate_waiting_schema
prepared_at: 2026-09-14
review_required: true
atlas_change_authorized: false
---

# 形式化數學 domain foundation packet

## 來源支持的形式系統事實

Lean 的參考文件說明：tactic 在背後建構 proof term；proof term 是可獨立檢查的定理證據，並由 kernel 檢查。這支持 OCME 把「策略執行成功」「proof term 已形成」「kernel 已接受」分成不同狀態。[Lean Reference：Tactic Proofs](https://lean-lang.org/doc/reference/latest/Tactic-Proofs/)

Lean 的公理文件同時明確指出，依賴公理的證明只能在該公理真實且與其他公理一致的範圍內被信任；`sorryAx` 不應出現在完成的證明中，而某些標記會擴大到編譯器信任。這支持 OCME 為正式 Evidence 保存公理／假設與信任基底，而不是只記「編譯通過」。[Lean Reference：Axioms](https://lean-lang.org/doc/reference/latest/Axioms/)

MSC2020 在電腦科學主類中特別列出 68V「支援數學研究與實務的電腦科學」。這說明形式化實務有分類位置，但不足以單獨證明 `formalized_mathematics` 應和拓撲、數論完全同型地成為所有相關 MKO 的 primary domain。[MSC2020：68-XX Computer science](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=68-XX)

## OCME 分類提案與異議

主架構者對「形式化數學是純 primary domain」提出 `CHALLENGE`：

- 一個形式化的畢達哥拉斯定理，其數學 primary domain 仍應是 `geometry`；形式化狀態由 `method-formal-verification`、Evidence Object、producer 與 formalization metadata 表達。
- 只有當研究對象本身是形式陳述或 proof term 時，才使用 `primary_domain=formalized_mathematics`；kernel checking、axiom inventory 與 replay receipt 目前分流到 Evidence/runtime。
- 因此可保留 registry domain 作導航與元數學／形式化基礎，但不得把所有 Lean-backed MKO 複製或重新歸類到此領域。

## 候選 Atlas 節點

| 順序 | Candidate ID | 顯示名稱 | prerequisites | methods | 關鍵邊界 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `atlas-formal-statement` | 證明助理中的形式陳述（Lean 首實例） | `atlas-proposition` | `method-construction`, `method-formal-verification` | source syntax 在 pinned environment／context 中 elaborates to `P:Prop`；不等於已有 proof term |
| 2 | `atlas-proof-term` | 證明項（Lean 首實例） | `atlas-formal-statement`, `atlas-proof` | `method-construction`, `method-formal-verification` | `Γ⊢t:P` 綁定指定演算與 statement；tactic log 不是 proof term receipt |

候選群組為 `formalized_mathematics`，目前只保留 2 個 reviewed candidates、3 條 hard edges；沒有 4-node 配額。`atlas-kernel-checking` 與 `atlas-axiom-assumption-inventory` 已撤回並移到 Evidence/runtime backlog。現有 Evidence 不因此被複製成新 MKO。

## Representative MKO candidate

- ID：`mko-lean-formal-statement`
- 最小 statement：在 pinned Lean environment `E` 與合法 context `Γ` 下，source syntax `s` elaboration 成功得到 `P` 且 `Γ⊢P:Prop`；parse 成功、type-correct 與已證明是三個不同狀態。
- 必須明示：source statement、elaborated expression、assumption context 與工具鏈版本；人類語義對齊仍是獨立義務。
- 反例邊界：一段能 parse 的文字可能型別錯誤；一個 type-correct proposition 可能未證；一個 theorem 若含 `sorryAx` 或未盤點公理，不能宣稱完整可信。
- Evidence：首輪不新建 Evidence；後續至少需要 statement identity、Lean source hash、toolchain、axiom inventory、kernel result 與 replay result 的分欄紀錄。
- 依賴狀態：hard 只依 `mko-proposition`；connectives／quantifier 是 supporting 語言與課程關係。即使依賴已 Canonical，新 Schema 與非重複語義審查未完成前仍不 materialize。

## 高階審查結論與保留義務

1. 採混合 domain 規則：形式化物件本身可 primary；一般數學內容只用 supporting facet、method 與 Evidence。
2. 新 MKO 必須研究 `E/Γ/s/P` 表示關係，不能只重複既有 `mko-proposition` 的 `P:Prop`。
3. Evidence pipeline 後續需保存逐 theorem identity、context、import/declaration closure 與 `#print axioms` 類 receipt；目前為 `NOT_MEASURED`。
4. `sorryAx` 與未核准 custom axioms 拒絕；compiler-trust 路徑預設分流。Kernel PASS 不替代自然語言 semantic alignment 或公理一致性。
