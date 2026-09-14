---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: computer_science_mathematics
status: reviewed_candidate_waiting_schema
prepared_at: 2026-09-14
review_required: true
atlas_change_authorized: false
---

# 計算機科學數學 domain foundation packet

## 來源支持的分類與課程事實

MSC2020 的 68-XX 電腦科學主類分出軟體理論、資料理論、計算理論、與電腦科學相關的離散數學、演算法，以及支援數學研究與實務的電腦科學。這表明它和純粹的組合／離散數學既重疊又不相同。[MSC2020：68-XX Computer science](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?t=68-XX)

MIT 6.1200J 的正式課程綱要把集合、關係、圖、狀態機與不變量、歸納、漸近記號、算法分析、數論、計數與離散機率放在「對電腦科學有用的數學工具與證明技巧」範圍。這支持 OCME 使用既有離散／邏輯節點作前置，而不把它們全部重新歸類為電腦科學。[MIT OpenCourseWare：Mathematics for Computer Science syllabus](https://ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/pages/syllabus/)

## OCME 分類提案

- `primary_domain=computer_science_mathematics`：以「問題是否可判定、以何種抽象模型計算、算法如何證明正確、資源如何漸近界定」為主題的節點。
- `supporting`：一般圖論、計數、歸納、集合、關係仍保留原 primary domain；它們可在 CS learning path 中被引用。
- 排除：數值近似算法歸 `numerical_computational`；形式證明產物的信任鏈歸 `formalized_mathematics`／`method-formal-verification`；實作工程不是 Canonical 數學命題。

## 候選 Atlas 節點

| 順序 | Candidate ID | 顯示名稱 | prerequisites | methods | 關鍵邊界 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `atlas-decision-problem` | 決定問題 | `atlas-set`, `atlas-proposition`, `atlas-function-mapping` | `method-construction`, `method-direct-proof` | 將 yes-instances 視為輸入集合或布林謂詞；問題規格不等於已有算法 |
| 2 | `atlas-computational-model` | 抽象計算模型 | `atlas-set`, `atlas-relation`, `atlas-natural-number` | `method-construction` | 最小 tuple 為 `(S,Init,Step,Halt)`；finite prefix 不表示所有 execution 終止 |
| 3 | `atlas-algorithm-correctness` | 算法正確性 | `atlas-computational-model`, `atlas-proposition`, `atlas-proof` | `method-invariant`, `method-induction`, `method-formal-verification` | partial correctness、termination、total correctness、nondeterminism 與 stuck 分開 |
| 4 | `atlas-asymptotic-resource-bound` | 漸近資源界 | `atlas-natural-number`, `atlas-arithmetic-operations`, `atlas-order-relation`, `atlas-function-mapping` | `method-direct-proof`, `method-counterexample-search` | 必須指定輸入大小、成本模型、上／下／緊界；有限 benchmark 不是漸近證明 |

候選群組為 `computer_science_mathematics`，目前 4 個 reviewed candidates、13 條 hard edges。Decision problem 可以先作 representative candidate；其餘節點仍有 relation、proof 或 order 等 seed 前置，不能以規劃中的 completed task 冒充已驗收 Canonical。

## Representative MKO candidate

- ID：`mko-decision-problem`
- 最小 statement：在已指定輸入型別 `X` 上，決定問題以 `P:X→Prop` 或 yes-instance set 描述哪些輸入回答「是」；這個規格不保證存在 uniform decider 或終止算法。
- 必須明示：布林值與命題在形式系統中可能需要一個可判定性橋；不能未經證明把任意 `Prop` 當成可執行 `Bool`。
- 反例邊界：一組樣例輸入輸出不是完整問題規格；一段可在部分輸入運行的程式不自動證明可判定性或 total correctness。
- Evidence：首輪無 Evidence；後續需要規格的有限示例 validator 與獨立的普遍性／可判定性正式義務，不能混成一個 green gate。
- 依賴狀態：`mko-set`、`mko-proposition`、`mko-function-mapping` 目前皆為 Canonical，但 `subset` 尚未；可用集合／謂詞版本避開立即依賴 `mko-subset`。

## 高階審查結論與保留義務

1. Decision problem 仍是第一個 representative；可執行 `Bool` 必須另有 `b x=true ↔ P x` 與 effective-presentation 橋。
2. 最小計算模型不含 output function，也不要求 `S` 有限；run 只是任意 finite execution prefix。Reachability、termination 與 computability 另作 statement。
3. Generic algorithm correctness 不 hard-depend decision problem 或 induction；後兩者分別是案例與方法。
4. `T,g:ℕ→ℕ` 的 Big-O statement 必須明示 size/cost aggregation；nondeterministic nontermination 不能偷塞進自然數值 `T`。
