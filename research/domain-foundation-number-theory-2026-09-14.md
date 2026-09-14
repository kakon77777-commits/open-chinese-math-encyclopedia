---
packet_version: ocme-domain-foundation-packet-v0.1
domain_id: number_theory
status: reviewed_candidate_waiting_schema
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
| 1 | `atlas-natural-divisibility` | 自然數整除 | `atlas-natural-number`, `atlas-arithmetic-operations` | `method-direct-proof`, `method-construction` | `a ∣ b` 必須有自然數 witness `k` 使 `b=a*k`；特別處理 0 |
| 2 | `atlas-gcd-coprime` | 自然數最大公因數與互質 | `atlas-natural-divisibility` | `method-invariant`, `method-construction` | gcd 採整除偏序的 universal property；`gcd(0,0)=0` |
| 3 | `atlas-prime-number` | 自然數質數 | `atlas-natural-divisibility` | `method-direct-proof`, `method-contradiction` | 首波以 `p≠0`、`p≠1` 與除數刻畫；不延伸到一般環 |
| 4 | `atlas-modular-congruence` | 自然數模同餘 | `atlas-natural-number`, `atlas-arithmetic-operations` | `method-direct-proof` | `m≠0`；首波採對稱自然數 witness，等價關係與 `Nat.ModEq` 橋另證 |

候選群組為 `number_theory`，目前 4 個 reviewed candidates、6 條 hard edges。量詞、順序、反例與 relation 是 supporting／curriculum／method 關係，不得重新塞回 scheduler。這是新 Schema ledger，不表示目前 v0.10 已增加節點。

## Representative MKO candidate

- ID：`mko-natural-divisibility`
- 最小 statement：對 `a,b∈ℕ`，`a ∣ b` 當且僅當存在 `k∈ℕ` 使 `b=a*k`。
- 必須明示：`0∣b` 只在 `b=0` 時成立；每個自然數都整除 0；這些結論需要由 witness 定義重算，不靠語感。
- 反例邊界：不能把整數論域的單位 `±1`、負因數或環論整除直接混入自然數版本。
- Evidence：先維持 `evidence_refs=[]`、`not_formalized`；下一義務是建立定義對齊、0 邊界與傳遞性的 Lean Evidence，且把有限數值測試和普遍證明分開。
- 依賴狀態：hard dependencies 限定為 `mko-natural-number`、`mko-arithmetic-operations`；量詞是 supporting 語言／課程關係。只有新 Schema 與 packet migration 通過後才能重新評估 ready。

## 高階審查結論與保留義務

1. 首波固定 `ℕ` 且包含 0；整數與環論版本另建語義層。
2. `gcd` 與 `coprime` 可保留同一教學頁，但 function／relation statements 必須分欄；算法另證。
3. 模同餘最小定義為 `∃u,v∈ℕ, a+m*u=b+m*v`，不 hard-depend divisibility。自反、對稱、傳遞與 `Nat.ModEq` 等價橋仍需 formal proof。
4. 禁止使用自然數截斷減法 `m∣(a-b)` 當定義；例如 `m=2,a=0,b=1` 會產生錯誤結果。
