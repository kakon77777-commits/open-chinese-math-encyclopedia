---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: computer_science_mathematics
status: ai_candidate_for_gpt6_review
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
| 2 | `atlas-computational-model` | 計算模型 | `atlas-relation`, `atlas-function-mapping`, `atlas-sequence` | `method-construction` | 必須命名模型與轉移語義；不能用「電腦可算」作未定義直覺 |
| 3 | `atlas-algorithm-correctness` | 算法正確性與不變量 | `atlas-decision-problem`, `atlas-computational-model`, `atlas-mathematical-induction`, `atlas-proof` | `method-invariant`, `method-induction`, `method-formal-verification` | partial／total correctness、終止性與規格必須分開 |
| 4 | `atlas-asymptotic-resource-bound` | 漸近資源界 | `atlas-natural-number`, `atlas-order-relation`, `atlas-function-mapping`, `atlas-quantifier` | `method-direct-proof`, `method-counterexample-search` | 必須指定輸入大小、成本模型、上／下／緊界；有限 benchmark 不是漸近證明 |

建議新群組為 `computer_science_mathematics`，`expected_count=4`。Representative 可以先從 decision problem 開始，因其最小語義可完全建立在已 Canonical 的集合、命題與函數映射；其餘三個節點仍有 seed 前置。

## Representative MKO candidate

- ID：`mko-decision-problem`
- 最小 statement：在已指定輸入型別 `X` 上，決定問題以子集合 `Y⊆X` 或等價的布林／命題謂詞描述哪些輸入是 yes-instance；這個規格不保證存在終止算法。
- 必須明示：布林值與命題在形式系統中可能需要一個可判定性橋；不能未經證明把任意 `Prop` 當成可執行 `Bool`。
- 反例邊界：一組樣例輸入輸出不是完整問題規格；一段可在部分輸入運行的程式不自動證明可判定性或 total correctness。
- Evidence：首輪無 Evidence；後續需要規格的有限示例 validator 與獨立的普遍性／可判定性正式義務，不能混成一個 green gate。
- 依賴狀態：`mko-set`、`mko-proposition`、`mko-function-mapping` 目前皆為 Canonical，但 `subset` 尚未；可用集合／謂詞版本避開立即依賴 `mko-subset`。

## 需 GPT-6 裁決

1. `decision problem` 作第一個 representative 是否過度偏向理論計算機科學，還是比「algorithm」更適合作為可精確定義的最小根節點？
2. `computational model` 是否需要先拆出 `formal language／finite word`；若首波加入，總節點應增加而不是把字串偷偷塞進模型定義。
3. `algorithm correctness` 是 primary CS mathematics，或應 primary `foundations_logic`、secondary CS？
4. 漸近界節點是否需要新的 `method-asymptotic-analysis`；首波沿用 direct proof 可避免 method registry 過早膨脹，但表達力較弱。
