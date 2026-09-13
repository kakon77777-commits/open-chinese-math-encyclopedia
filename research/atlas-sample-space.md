---
packet_version: ocme-research-packet-v0.1
atlas_id: atlas-sample-space
target_mko_id: mko-sample-space
status: ai_candidate_complete
prepared_by: Codex local AI
prepared_at: 2026-09-13
review_required: true
---

# 樣本空間 research packet

## 範圍與語義決定

樣本空間 `S` 是針對一個已明示隨機試驗所列出的所有可能基本結果。樣本空間取決於試驗如何描述；同一現象若觀察尺度不同，可以得到不同但各自合法的結果空間。

本包只建立結果與樣本空間，不把「所有結果」誤寫成「所有結果等可能」，也不在此定義事件的機率。代表公式 `x∈S` 表示一個可能結果屬於樣本空間。

## 來源

- [Penn State STAT 415：Sample Spaces](https://online.stat.psu.edu/stat415/lesson/sample-spaces)：將 sample space 定位為隨機研究所有可能結果的集合，並展示不同測量方式如何改變空間。
- [Penn State STAT 414：Properties of Probability](https://online.stat.psu.edu/stat414/Lesson02)：區分樣本空間、事件與機率指派，支持「樣本空間不自動表示等可能」。
- [Mathlib Set definitions](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Data/Set/Defs.html)：作為結果型別與事件集合之未來形式化介面定位。

Penn State 課程頁只作來源引用與原創改寫；Mathlib 採 Apache-2.0。存取日期為 2026-09-13。

## 候選規格

- 類型：`concept`
- 公式：`x\in S`
- 依賴：`mko-set`
- 主領域：`probability_statistics`
- 方法：`method-probabilistic`
- 課程：`curriculum-ocme-university-core:probability.sample-space`
- 形式化義務：選定結果型別 `Ω`，區分全體結果與事件集合，且不額外假設均勻分布。

本次不新增 Evidence Object；Lean producer 只標 `configured`。

