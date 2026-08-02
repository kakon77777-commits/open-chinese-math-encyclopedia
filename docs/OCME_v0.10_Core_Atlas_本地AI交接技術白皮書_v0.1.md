# OCME v0.10 Core Mathematical Atlas
## 本地 AI 交接技術白皮書與後續工程規格 v0.1

**專案：** Open Chinese Mathematical Encyclopedia（OCME）／開源中文數學百科  
**文件版本：** v0.1  
**對應系統版本：** OCME v0.10  
**日期：** 2026-08-02  
**狀態：** 本地 AI 交接基線／網站版前置規格  

---

## 摘要

OCME v0.1～v0.8 已逐步驗證：中文數學內容可以被建造成具有 TeX、MathML、Semantic AST、計算伴隨、內容定址 Evidence、FELRA、Lean／Mathlib 與 EveGlyph 審查邊界的 Mathematical Knowledge Object（MKO）。v0.9 進一步建立 Mathematical World Architecture，將數學領域、方法、學習路徑、課綱位置與十二維難度從單一條目中抽離，形成可版本化的上位知識架構。

v0.10 的任務不是把 80 個數學概念一次全部製作成 v0.8 等級的完整 MKO，而是建立一個可驗證、可導航、可供網站使用、也可作為本地 AI 工作佇列的 **Core Mathematical Atlas**。

本版本正式建立 80 個核心 Atlas 節點，其中 6 個已對應既有 Canonical MKO，另外 74 個則以 `atlas_seed` 形式進入 materialization queue。每個 seed 均已有穩定 ID、預定 MKO ID、分類、前置關係、方法、課程帶、十二維難度 seed 與 P1／P2／P3 優先級。

因此，v0.10 的完成定義是：

```text
完整而可驗證的核心數學地圖
+ 穩定的 Canonical MKO 對應
+ 可機器執行的 74 項 materialization queue
+ 嚴格成熟度與證據邊界
+ 可交接給本地 AI 的工作契約
```

而不是：

```text
80 個 Atlas 節點 = 80 個已完成、已證明、已審查 MKO
```

此區分是本次交接最重要的安全與工程原則。

---

# 一、為何 v0.10 不直接製作 80 個完整 MKO

## 1.1 早期 OCME 的深度工程已證明底層可行

目前 6 個既有 Canonical MKO 已經證明以下鏈條可以成立：

```text
自然語言數學敘述
→ Canonical MKO
→ TeX
→ MathML
→ Semantic AST
→ computational companion
→ Python / FELRA Evidence
→ Lean / Mathlib formal evidence
→ Architecture Profile
→ MCP / Website / EveGlyph
```

因此 v0.10 已不需要再用 80 個條目重複證明相同的底層架構可行性。

## 1.2 大量生成的真正風險是架構漂移

若直接要求 AI 一次產生 80 個完整條目，容易出現：

- 同一概念出現不同 ID；
- 前置依賴彼此矛盾；
- 同義條目重複；
- 學校課程順序被誤認成邏輯順序；
- 高等／初等被誤認為總難度；
- AI 為了補滿欄位虛構 Evidence；
- 尚未實際編譯的 Lean 候選被標成 formal proof；
- 未完成來源審查的文字直接進 Canonical Store；
- 網站分類與內容生產各自發展，最後無法對齊。

先建立 Atlas，可以讓所有後續內容生產發生在一個已知的數學地圖內。

## 1.3 Atlas 是規劃層，不是知識真值層

形式上：

```text
Atlas Entry
→ 描述應該建立哪個知識節點
→ 提供分類、依賴、難度與優先級

Canonical MKO
→ 描述已實際建立的數學物件
→ 具有公式、來源、Evidence、版本與審查契約
```

因此：

```text
Atlas node ≠ Canonical MKO
```

這條界線不得在後續自動化中被取消。

---

# 二、v0.10 現況基線

## 2.1 核心數量

```text
80 個 Core Atlas nodes
6 個 canonical MKO mappings
74 個 atlas_seed
74 個 materialization tasks
9 個既有 Evidence Object
5 個 formal_proof Evidence
20 個頂層數學領域
20 個核心數學方法
5 條學習路徑
4 套課綱／能力框架
12 個難度維度
```

## 2.2 八個 Atlas 群組

```text
數與運算        10
集合與邏輯      10
代數與方程      12
幾何與向量      12
函數與圖形      10
微積分基礎      12
機率與統計       8
離散數學         6
------------------
總計            80
```

這八組首先服務「現代通識＋大學核心」網站入口，不宣稱等同完整數學學科分類。

## 2.3 六個已成熟 Canonical 節點

```text
atlas-set-membership
→ mko-set-membership

atlas-function-mapping
→ mko-function-mapping

atlas-tends-to-relation
→ mko-tends-to-relation

atlas-euclidean-length
→ mko-euclidean-length

atlas-right-triangle
→ mko-right-triangle

atlas-pythagorean-theorem
→ mko-euclid-pythagorean-theorem
```

Validator 對這六組映射採硬性保護，避免本地 AI 在批次工作中意外改名或降級。

---

# 三、系統分層

OCME 接手時應被理解為五個互相連接但不可混用的資料層。

## 3.1 Canonical MKO Layer

位置：

```text
public/data/mko/
```

責任：

- 數學敘述；
- 公式；
- assumptions；
- symbols；
- dependencies；
- human proof summary；
- computational companions；
- evidence_refs；
- producer contracts；
- formalization status；
- provenance。

只有這一層可以代表「OCME 已正式建立此數學知識物件」。

## 3.2 Evidence Layer

位置：

```text
public/data/evidence/
evidence-sources/
```

責任：

- Python 有限計算證據；
- FELRA 有限域／反例搜尋；
- Lean／Mathlib 精確形式證明；
- 來源 SHA-256；
- 精確 claim scope；
- replay command；
- limitations。

核心原則：

```text
數學敘述
≠ 程式
≠ 有限計算 Evidence
≠ formal proof
```

## 3.3 Architecture Layer

位置：

```text
public/data/architecture/
```

責任：

- domain；
- mathematical method；
- learning path；
- curriculum alignment；
- task-sensitive difficulty；
- Architecture Profile。

核心原則：

```text
研究分類 ≠ 邏輯依賴
邏輯依賴 ≠ 教學順序
教學順序 ≠ 歷史順序
課程位置 ≠ 固有難度
```

## 3.4 Core Atlas Layer

位置：

```text
public/data/atlas/core-atlas.json
```

責任：

- 網站第一批核心數學節點；
- Atlas prerequisites；
- 預定 Canonical ID；
- materialization priority；
- 網站目錄與 planned page；
- 本地 AI 工作佇列。

Atlas 不直接保存完整 Evidence 或完整公式物件。

## 3.5 Presentation / Agent Layer

包含：

```text
Website
MCP
EveGlyph
Search Index
AI Scheduler
Local Research Runtime
```

這一層只能讀取或提出修改 Canonical Store，不應自行建立第二套知識真值。

---

# 四、Atlas Entry 契約

每個 Atlas Entry 至少具有：

```yaml
id: atlas-...
title_zh: ...
group: ...
primary_domain: ...
object_kind: ...
summary_zh: ...
prerequisites: []
methods: []
curriculum_band: ...
difficulty: {...12 dimensions...}
maturity: atlas_seed | canonical_mko
target_mko_id: mko-...
materialization_priority: canonical | P1 | P2 | P3
```

若 `maturity=canonical_mko`，還必須實際存在：

```yaml
canonical_mko_id: mko-...
```

並且：

```text
target_mko_id = canonical_mko_id
```

## 4.1 ID 穩定性

Atlas ID 與 `target_mko_id` 應視為穩定公開識別子。

除非發現真正的本體重複或命名錯誤，不應因文字風格、網站 URL 或翻譯偏好隨意改 ID。

改標題通常應：

```text
保留 ID
→ 修改 title / alias
```

而不是重建新物件。

---

# 五、成熟度模型

## 5.1 `atlas_seed`

表示：

- 此數學節點已被納入 Core Atlas；
- 分類、前置與優先級已規劃；
- 預定 MKO ID 已保留；
- 可以作為網站 planned node；
- 可以進入本地 AI materialization queue。

不表示：

- 已有正式數學頁；
- 已完成人工審查；
- 已有可靠來源；
- 已有公式 AST；
- 已有 Python／FELRA；
- 已有 Lean proof；
- 已經「證明」。

## 5.2 `canonical_mko`

只有在以下條件成立後才可升級：

1. `target_mko_id` 的 Canonical MKO 已實際建立；
2. MKO 通過 Schema；
3. 依賴 ID 可解析；
4. 公式衍生層可重建；
5. provenance 已存在；
6. 該物件所宣稱的 Evidence 狀態都有真實 Evidence Object；
7. `npm run check` 全部通過。

升級 Atlas maturity 應與 MKO 建立發生在同一個 PR 或同一批次的可審查提交中。

---

# 六、Materialization Priority

## P1：網站骨架與高依賴核心

P1 優先處理：

- 基本數系；
- 四則運算；
- 集合；
- 命題與證明；
- 方程式；
- 基本函數；
- 三角形與座標；
- 基礎微積分直觀；
- 基礎機率；
- 基礎計數。

原則：

> 若大量 P2／P3 節點依賴某 P1 節點，應先 materialize P1，而不是跳過依賴鏈。

## P2：大學核心與第二層結構

例如：

- 矩陣；
- 線性映射；
- 極限；
- 導數；
- 定積分；
- 隨機變數；
- 圖論。

## P3：較進階的延伸節點

例如：

- 特徵值與特徵向量等較高依賴節點。

P3 不代表「本體上比較高級」，只代表 v0.10 網站與 materialization 排程上的較後優先級。

---

# 七、本地 AI 接手時的讀取順序

本地 AI 初次載入此專案時，建議固定讀取順序：

```text
1. README.md
2. docs/OCME_v0.10_Core_Atlas_本地AI交接技術白皮書_v0.1.md
3. docs/mathematical-world-architecture-v0.9.md
4. public/data/atlas/core-atlas.json
5. artifacts/materialization-queue.jsonl（執行 export 後）
6. public/data/architecture/domains.json
7. public/data/architecture/methods.json
8. public/data/architecture/learning-paths.json
9. public/data/architecture/curricula.json
10. public/data/mko/
11. public/data/evidence/
12. schemas/
13. tests/
```

不要只讀 Atlas 後就開始生成內容。

---

# 八、本地 AI 每批 Materialization 標準流程

建議每批只處理 **3～10 個** Atlas seed。

## Step 0：建立乾淨基線

```bash
npm install
npm run check
npm run export:atlas
```

若基線已紅燈，不應開始產生新 MKO。

## Step 1：選取 queue

優先：

```text
P1
→ 同 prerequisite 層的小批次
→ 再 P2
→ 最後 P3
```

不可單純依標題字母順序或隨機抽取。

## Step 2：來源研究

至少保存：

- 權威教材或學術來源；
- 官方標準／形式庫（適用時）；
- 原始 URL 或可追蹤來源；
- 存取日期；
- 授權資訊。

AI 應先做 research packet，再寫 Canonical MKO。

## Step 3：建立 MKO

使用 Atlas `target_mko_id`，不得另造新 ID。

至少完成：

- title；
- statement；
- formula；
- assumptions；
- symbols；
- dependencies；
- explanation；
- provenance；
- verification producer 狀態。

## Step 4：Formula Pipeline

```text
TeX
→ Formula Core
→ MathML
→ Semantic AST
→ source SHA
```

不得手工修改 MathML／AST 使它們與 TeX 漂移。

## Step 5：Architecture 對齊

Atlas seed 的資料是初始規劃，不是不可修正真理。

建立正式 MKO 後應重新檢查：

- primary domain；
- methods；
- prerequisites；
- difficulty；
- learning path；
- curriculum band。

若需修改 Atlas，必須說明原因並保留 reviewable diff。

## Step 6：計算伴隨與 Evidence

並非每個 MKO 都需要 Python 或 FELRA。

只有在計算有實際教育、驗證或反例搜尋價值時才加入。

一旦加入，就必須遵守：

```text
finite evidence != universal proof
```

## Step 7：Lean／Mathlib 候選

Lean 是可選強化層，不是所有條目 materialization 的阻塞條件。

若建立 formal evidence：

```text
candidate theorem name
→ exact semantic mapping
→ pinned environment
→ lake build
→ no sorry/admit
→ content-addressed Evidence
→ MKO evidence_ref
```

不得因 Mathlib 有「名稱看起來相似」的 theorem 就升級 formalization status。

## Step 8：EveGlyph Review

人類文字可透過 review patch 修改；公式、Evidence、producer、formalization、provenance 等機器敏感層保持受保護。

## Step 9：升級 Atlas maturity

MKO 真正存在且完整檢查通過後：

```text
atlas_seed
→ canonical_mko
```

同時：

```text
materialization_priority
→ canonical
```

## Step 10：完整檢查

```bash
npm run check
```

任何失敗都應先修復，不得用「暫時忽略」方式合併。

---

# 九、禁止事項

本地 AI 不應：

1. 一次生成全部 74 個 MKO 再統一驗證；
2. 把 `atlas_seed` 顯示成已完成百科條目；
3. 自動修改既有 Evidence ID；
4. 把有限計算通過標成 formal proof；
5. 把 Lean candidate 標成已證明；
6. 把年級或「高等／初等」直接轉成單一難度；
7. 因 Atlas primary domain 而刪除跨域關係；
8. 為了方便網站而建立第二套獨立分類資料；
9. 未追蹤來源就批次生成歷史事實；
10. 直接覆寫 Canonical MKO 而不留下 Git diff；
11. 在既有 CI 紅燈時繼續擴大批次；
12. 為追求條目數而降低 provenance、Evidence 或 Schema 要求。

---

# 十、網站版 v0.11 交接規格

v0.10 Atlas 已經足以支援網站資訊架構的第一版。

## 10.1 六個主要入口

### A. 現代通識數學

以八個 Core Atlas group 為主要入口，面向一般讀者與中學到大學初期。

### B. 大學核心數學

依 `curriculum_band` 與 domain 投影：

- 微積分；
- 線性代數；
- 機率統計；
- 離散數學；
- 基礎邏輯。

### C. 數學領域地圖

讀取 Architecture domain registry，而不是直接用八個 Atlas group 取代完整領域分類。

### D. 數學方法地圖

讀取 20 個 method object，讓使用者依「怎麼思考」而不是只依「研究什麼」探索數學。

### E. 學習路徑

使用 Architecture learning path，未來可再生成個人化路徑。

### F. AI 導航

AI 應根據：

```text
使用者目標
+ 已知前置
+ Atlas graph
+ task-sensitive difficulty
+ maturity
```

產生可解釋導航。

## 10.2 Atlas Seed 在網站上的顯示

建議：

```text
canonical_mko
→ 可進入完整文章頁

atlas_seed
→ 顯示簡要卡片／規劃中
→ 可顯示前置、領域、難度 seed
→ 不顯示虛構公式、證明或 Evidence
```

這可讓網站在 80 個節點全部 materialize 前就先建立完整導航結構。

## 10.3 建議路由

```text
/
/learn
/learn/:path
/atlas
/atlas/:id
/math/:mko_id
/domains
/domains/:id
/methods
/methods/:id
/evidence/:id
/search
/about
```

---

# 十一、搜尋與索引

v0.11 搜尋索引可將 Atlas 與 MKO 合併為一個「導航索引」，但必須保留 maturity。

建議欄位：

```yaml
id:
title_zh:
kind: atlas | mko
maturity:
group:
domain:
curriculum_band:
methods:
summary:
prerequisites:
canonical_url:
```

搜尋結果 UI 必須清楚區分：

```text
正式條目
規劃中節點
```

---

# 十二、自動化與排程

等本地 AI 可以穩定完成小批次 materialization 後，再開啟排程。

## 12.1 推薦排程

### 每日

- `npm run check`；
- broken link／source check；
- Evidence replay candidate；
- Atlas／MKO maturity consistency。

### 每週

- 選取下一批 P1／P2 seed；
- 來源研究；
- draft generation；
- 未審批次整理。

### 每月

- Atlas 覆蓋率；
- difficulty calibration；
- learning path coverage；
- external standards update；
- website broken navigation；
- materialization throughput review。

## 12.2 不建議立即全自動發布

v1.0 前仍應維持：

```text
AI research/draft
→ machine validation
→ EveGlyph / review
→ CI
→ publish
```

不要直接：

```text
scheduler
→ AI generation
→ production website
```

---

# 十三、驗證命令

## 完整檢查

```bash
npm run check
```

## Atlas 單獨檢查

```bash
npm run validate:atlas
```

## Atlas 匯出

```bash
npm run export:atlas
```

## Architecture

```bash
npm run validate:architecture
npm run export:architecture
```

## Formula

```bash
npm run verify:formulas
```

## Evidence

```bash
npm run verify:evidence
```

## Python

```bash
npm run verify:python
```

## Lean Source Gate

```bash
npm run verify:lean-sources
npm run preview:lean-evidence
```

完整 Lean／Mathlib replay：

```bash
cd formal/lean
lake update
lake exe cache get
lake build
```

---

# 十四、Validator 必須保持的硬性規則

Core Atlas Validator 目前保護：

- 80 節點固定基線；
- 八個群組數量；
- Atlas ID 唯一；
- target MKO ID 唯一；
- domain 存在；
- method 存在；
- prerequisite 存在；
- prerequisite 無 self loop；
- prerequisite graph 無 cycle；
- canonical_mko 必須真的存在；
- canonical_mko target 必須一致；
- atlas_seed 不得帶 canonical ID；
- atlas_seed 不得指向已存在 MKO；
- 六個既有 canonical mapping 不得漂移。

未來增加 Atlas 節點時，可以升級 Schema 版本，不應直接修改 v0.1 的「80 節點」語義卻保持同一版本號。

---

# 十五、難度資料的後續校準

v0.10 Atlas difficulty 是規劃 seed。

下一步應建立：

```text
gold/classification-gold.jsonl
gold/difficulty-gold.jsonl
gold/prerequisite-gold.jsonl
gold/method-gold.jsonl
gold/learning-path-gold.jsonl
```

難度後續可以由：

- 人工專家評估；
- 前置圖結構；
- 題目與證明資料；
- 學習者表現；
- AI 候選比較；
- 形式化成本；
- 計算 benchmark；

共同校準。

但不得產生一個看似精確的全域單分數。

---

# 十六、建議本地 AI 第一批工作

第一批不要選最有趣的高階節點，而應先建立高連接度 P1 基礎。

建議順序可從：

```text
自然數
→ 四則運算
→ 整數／有理數／實數
→ 集合
→ 命題／邏輯連接詞／量詞
→ 關係
→ 方程式
→ 三角形／角／座標
→ 定義域／陪域／值域
→ 數列／變化率
→ 樣本空間／事件／機率
→ 基本計數
```

實際批次仍應依 prerequisite graph 與 P1 queue 動態選擇。

---

# 十七、網站與 Materialization 可以平行

本地 AI 不必等 74 個 seed 全部成熟才開始網站。

建議平行兩條線：

```text
Track A：內容 materialization
P1 → P2 → P3

Track B：網站 v0.11
Atlas navigation → Search → Domain / Method / Path → MKO page integration
```

網站可以先展示 Atlas 結構，同時把 canonical 節點逐步變成完整頁面。

這比等待所有內容完成後才開始網站更適合 OCME。

---

# 十八、Git 工作方式

建議本地 AI 每批：

```text
main
→ feature/materialize-<batch>
→ research / data / tests
→ npm run check
→ PR
→ review
→ squash merge
```

不要長期在同一大型分支累積數十個未審條目。

每批 PR 應列出：

- materialized Atlas IDs；
- new MKO IDs；
- dependency changes；
- Evidence changes；
- Atlas maturity upgrades；
- unresolved obligations。

---

# 十九、本地 AI 操作契約

本地 AI 可把下列文字視為 OCME 後續工作的操作契約：

> 以 `public/data/atlas/core-atlas.json` 作為核心數學地圖，以 `target_mko_id` 作為預定 Canonical ID，以 materialization priority 與 prerequisite graph 選擇小批次工作。不得把 atlas seed 宣稱為已完成 MKO。建立 MKO 時必須保存來源、公式衍生關係與 verification 邊界；只有實際存在的 Evidence 才能寫入 evidence_refs。Lean／Mathlib 候選必須通過真實編譯才能成為 formal Evidence。每批修改前後執行 `npm run check`，紅燈不得合併。網站、MCP 與排程均讀取同一 Canonical Store，不建立第二套知識真值。

---

# 二十、後續版本

## v0.11 Website Information Architecture

主要目標：

- 六入口首頁；
- Atlas browse；
- maturity-aware search；
- Domain page；
- Method page；
- Learning Path page；
- canonical MKO page；
- Evidence progressive disclosure；
- mobile／desktop；
- MathML accessibility；
- SEO／JSON-LD。

## v1.0 Automated Publishing System

主要目標：

```text
Scheduler
→ Research Agent
→ Ontology / Atlas Agent
→ MKO Draft
→ Formula Compiler
→ Python / FELRA
→ Lean Candidate
→ EveGlyph Review
→ CI
→ Website Publish
```

並保留 approve 與 publish 權限分離。

---

# 二十一、交接驗收清單

本地 AI 接手前，應確認：

- [ ] `package.json` 為 v0.10.0；
- [ ] `public/data/atlas/core-atlas.json` 可讀；
- [ ] Core Atlas 有 80 節點；
- [ ] canonical mapping 為 6；
- [ ] materialization queue 為 74；
- [ ] 八群組數量合計 80；
- [ ] `npm run validate:atlas` 通過；
- [ ] `npm run validate:architecture` 通過；
- [ ] `npm run verify:evidence` 通過；
- [ ] `npm run check` 通過；
- [ ] pinned Lean／Mathlib CI 通過；
- [ ] 本文件與 README 已讀取；
- [ ] 首批工作只從 P1 小批次開始；
- [ ] 不將 Atlas seed 冒充 Canonical MKO。

---

# 二十二、結論

OCME v0.10 的意義不是「百科已經有 80 篇文章」，而是第一次擁有一個可以被人類、網站與 AI 共用的核心數學宇宙。

它把問題從：

> 下一篇要寫什麼？

轉換為：

> 在一個已驗證的數學地圖中，下一個最值得 materialize 的節點是什麼？它依賴什麼？應該以什麼成熟度、證據與網站狀態發布？

因此後續本地 AI 的工作不再是自由生成百科，而是執行一個受 Atlas、Schema、Evidence、Git、CI 與審查約束的持續知識建設流程。

這正是 OCME 從研究型 MVP 轉入網站化與長期自動化生產之前，需要的交接點。
