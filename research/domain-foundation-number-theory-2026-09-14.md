---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: number_theory
status: ai_candidate_for_gpt6_review
prepared_at: 2026-09-14
review_required: true
atlas_change_authorized: false
---

# 數論 domain foundation packet

## 來源支持的數學事實

Lean 社群的《Mathematics in Lean》把自然數互質定義對齊 `Nat.gcd m n = 1`，使用 `Nat.Prime` 表示自然數質數，並明確提醒自然數、整數、有理數、實數是不同型別；在數論敘述中選定論域會影響定義與推理。[Mathematics in Lean：Elementary Number Theory](https://leanprover-community.github.io/mathematics_in_lean/C05_Elementary_Number_Theory.html)

MSC2020 的 11-XX 是數論；其中初等數論明列乘法結構、歐幾里得算法、最大公因數、合同、質數與因數分解。這支持 OCME 把數論作 primary domain，也支持以下四個首波節點的選擇。[MSC2020：11-XX Number theory](https://mathscinet.ams.org/mathscinet/msc/msc2020.html?btn=Current&t=11A63)

## OCME 分類提案

- 首波固定在自然數論域，避免尚未 materialize 的 `mko-integer` 阻塞代表性 MKO。
- `primary_domain=number_theory`：整除、最大公因數／互質、質數、模合同。
- 算術運算仍屬 `arithmetic_number_systems`；抽象環中的 prime element／irreducible element 留待代數節點，不能用自然數質數的等價性無條件替代。

## 候選 Atlas 節點

| 順序 | Candidate ID | 顯示名稱 | prerequisites | methods | 關鍵邊界 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `atlas-natural-divisibility` | 自然數整除 | `atlas-natural-number`, `atlas-arithmetic-operations`, `atlas-quantifier` | `method-direct-proof`, `method-construction` | `a ∣ b` 必須有自然數 witness `k` 使 `b=a*k`；特別處理 0 |
| 2 | `atlas-gcd-coprime` | 最大公因數與互質 | `atlas-natural-divisibility`, `atlas-order-relation` | `method-invariant`, `method-construction` | gcd 的 0 邊界與互質定義必須固定；算法和規格分開 |
| 3 | `atlas-prime-number` | 質數 | `atlas-natural-divisibility`, `atlas-quantifier`, `atlas-counterexample` | `method-direct-proof`, `method-contradiction` | 自然數質數要求至少為 2；1 不是質數 |
| 4 | `atlas-modular-congruence` | 模合同 | `atlas-natural-divisibility`, `atlas-arithmetic-operations`, `atlas-relation` | `method-direct-proof` | 模數必須限制為正；等價關係性質需另證 |

建議新群組為 `number_theory`，`expected_count=4`。四條新節點鏈只指向既有節點；尚未發現 graph cycle。`atlas-quantifier`、`atlas-order-relation`、`atlas-counterexample`、`atlas-relation` 仍是 seed，只有第一個代表性 MKO 在縮小依賴後可先進入 materialization 候選。

## Representative MKO candidate

- ID：`mko-natural-divisibility`
- 最小 statement：對 `a,b∈ℕ`，`a ∣ b` 當且僅當存在 `k∈ℕ` 使 `b=a*k`。
- 必須明示：`0∣b` 只在 `b=0` 時成立；每個自然數都整除 0；這些結論需要由 witness 定義重算，不靠語感。
- 反例邊界：不能把整數論域的單位 `±1`、負因數或環論整除直接混入自然數版本。
- Evidence：先維持 `evidence_refs=[]`、`not_formalized`；下一義務是建立定義對齊、0 邊界與傳遞性的 Lean Evidence，且把有限數值測試和普遍證明分開。
- 依賴狀態：為了 immediate candidate，可將 MKO 最小依賴限定為 `mko-natural-number`、`mko-arithmetic-operations`；量詞是 statement 語法前置，但在 Canonical materialization 是否為硬依賴需 GPT-6 裁決。

## 需 GPT-6 裁決

1. 整除節點首波應限定 `ℕ`，還是等待 `mko-integer` 後直接建立 `ℤ` 版本？
2. 量詞、順序與反例節點未 materialize 時，是 blocking prerequisite、semantic reference，還是 curriculum-only edge？
3. `gcd` 與 `coprime` 是否應拆成兩節點；首波合併可減少 breadth，但會把函數與關係概念放在同一 MKO。
4. 模合同首波是否只對自然數正模數，日後另以整數商環／`ZMod n` 升級；不得把兩個層次寫成同一無條件定義。
