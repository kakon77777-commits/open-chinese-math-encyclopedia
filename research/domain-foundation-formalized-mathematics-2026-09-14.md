---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: formalized_mathematics
status: ai_candidate_challenge_for_gpt6_review
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
- 只有當研究對象本身是形式陳述、proof term、kernel checking、axiom inventory 或可信重播時，才使用 `primary_domain=formalized_mathematics`。
- 因此可保留 registry domain 作導航與元數學／形式化基礎，但不得把所有 Lean-backed MKO 複製或重新歸類到此領域。

## 候選 Atlas 節點

| 順序 | Candidate ID | 顯示名稱 | prerequisites | methods | 關鍵邊界 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `atlas-formal-statement` | 形式陳述 | `atlas-proposition`, `atlas-logical-connectives`, `atlas-quantifier` | `method-construction`, `method-formal-verification` | 自然語言主張、型別正確的形式陳述、可證定理是三個不同狀態 |
| 2 | `atlas-proof-term` | 證明項 | `atlas-formal-statement`, `atlas-proof` | `method-construction`, `method-formal-verification` | tactic log 不是權威證據；核心可檢查的 proof term 才是證明產物 |
| 3 | `atlas-kernel-checking` | 核心檢查與可信基底 | `atlas-proof-term` | `method-formal-verification` | 編譯、外部求解器、kernel check 與獨立 replay 必須分層 |
| 4 | `atlas-axiom-assumption-inventory` | 公理與假設盤點 | `atlas-formal-statement`, `atlas-proof-term` | `method-formal-verification`, `method-counterexample-search` | `sorryAx`／額外公理／unsafe 或 compiler trust 不能隱藏在「PASS」後面 |

建議新群組為 `formalized_mathematics`，`expected_count=4`，但群組是否進入 Core Atlas 必須先通過 GPT-6 的分類裁決。這四個節點是 formalization 的研究對象；現有九個 Evidence Object 與五個 Lean formal proof Evidence 不因此被複製成新 MKO。

## Representative MKO candidate

- ID：`mko-formal-statement`
- 最小 statement：形式陳述是在明示形式語言、型別／語法環境與假設上下文中可被解析與型別檢查的命題；well-formed 或 type-correct 不等於已證明。
- 必須明示：source statement、elaborated expression、assumption context 與工具鏈版本；人類語義對齊仍是獨立義務。
- 反例邊界：一段能 parse 的文字可能型別錯誤；一個 type-correct proposition 可能未證；一個 theorem 若含 `sorryAx` 或未盤點公理，不能宣稱完整可信。
- Evidence：首輪不新建 Evidence；後續至少需要 statement identity、Lean source hash、toolchain、axiom inventory、kernel result 與 replay result 的分欄紀錄。
- 依賴狀態：`mko-proposition` 已 Canonical；`mko-logical-connectives` 與 `mko-quantifier` 尚未，因此代表性 MKO 目前不是 dependency-safe materialization。

## 需 GPT-6 裁決

1. `formalized_mathematics` 應保留 primary domain、改為 supporting／method facet，或採混合規則？
2. `formal statement` 是否屬 `foundations_logic` primary、`formalized_mathematics` secondary；目前 Schema 若只允許一個 primary，需先決定分類而非偷偷複製。
3. proof term 與 kernel checking 是否應是 Atlas 數學節點，還是 Evidence／runtime architecture profile；若後者，應拒絕本封包對應節點而改建非 Atlas artifact。
4. 哪些 trust assumptions 必須納入 acceptance gate：公理、`sorryAx`、Lean／Mathlib version、kernel、compiler trust、外部 prover、平台可重播性？
