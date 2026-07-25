# 開源中文數學百科技術白皮書  
## 面向人類與 AI 的可閱讀、可計算、可驗證數學知識系統

**專案暫名：** Open Chinese Mathematical Encyclopedia（OCME）  
**中文名稱：** 開源中文數學百科  
**版本：** v0.1  
**日期：** 2026-07-25  
**作者：** Neo.K、Aletheia（GPT）  
**組織：** EveMissLab／一言諾科技有限公司  
**文件類型：** 技術白皮書／系統架構母規格  
**狀態：** 初始設計版  

---

## 摘要

本白皮書提出一套面向人類與人工智慧的開源中文數學百科架構。其目標不是建立另一個以頁面、段落與公式圖片為核心的傳統百科網站，而是將數學知識重新建造成可閱讀、可計算、可重播、可驗證、可引用且可由 AI 直接取得的結構化知識系統。

傳統數學百科通常以文章作為基本單位，公式則主要作為排版結果呈現。即使原始來源中保留 TeX，經過網頁轉換、內容抽取、搜尋摘要、PDF 化或模型資料清洗後，公式仍可能退化為圖片、純字串或缺乏語義的符號序列。此類內容適合人類閱讀，卻不一定適合 AI 精確理解公式結構、符號角色、依賴關係、證明狀態與計算限制。

本系統將「數學知識物件」而非「頁面」作為最小核心單元。每一數學物件可同時包含：

- 中文數學敘述；
- TeX／MathML；
- 數學抽象語法樹；
- 符號定義與綁定；
- 前置知識與依賴圖；
- 證明、反例與限制；
- 參考程式碼；
- FELRA 計算證據；
- 形式化證明狀態；
- 來源、版本與授權血統；
- 人類閱讀介面；
- MCP／API／批次資料介面。

系統明確區分數學命題、程式實作、有限計算證據與形式證明。參考程式碼只作為數學內容的計算伴隨物，不與數學物件本身等同。FELRA 負責反例搜尋、數值分析、符號檢查、跨方法一致性與可重播證據；EveGlyph Editor 負責 Markdown 原生編輯、KaTeX 預覽、AI 協作、差異審查與 MCP 工作區介面；EML／ULEI 可作為未來高密度語義投影與跨語言形式中介。

本專案以繁體中文作為第一人類介面，但資料模型保持多語言與語言中立。長期而言，本系統可從中文數學百科逐步擴展為中文科學百科、中文形式知識百科，最終成為 AI 原生中文百科的基礎工程。

---

## 關鍵詞

中文數學百科、AI 原生知識、數學知識物件、FELRA、EveGlyph、MCP、數學 AST、計算伴隨、形式驗證、語料血統、開源百科

---

# 一、專案背景

## 1.1 從中文百科願景收斂到數學百科

建立完整中文 AI 原生百科，是一項極大規模的長期工程。一般百科包含人物、歷史、政治、地理、生物、文化、醫學、工程與大量難以統一建模的異質內容。若一開始即處理全部領域，系統將同時面對：

- 多種內容結構；
- 不同證據標準；
- 不同授權；
- 不同知識更新頻率；
- 高度爭議性敘述；
- 複雜的編輯與治理問題。

數學則具有較穩定的知識結構：

$$
\text{定義}
\rightarrow
\text{命題}
\rightarrow
\text{定理}
\rightarrow
\text{證明}
\rightarrow
\text{推論}
\rightarrow
\text{應用}
$$

此外，數學天然具有：

- 明確符號；
- 條件與量詞；
- 依賴關係；
- 可計算案例；
- 可搜尋反例；
- 可形式化驗證；
- 可建立知識圖。

因此，中文數學百科適合作為 AI 原生百科的第一個垂直領域。

## 1.2 現有數學網頁的 AI 取用問題

傳統數學網頁的公式可能經過：

$$
\text{TeX 原始碼}
\rightarrow
\text{MathML 或 SVG}
\rightarrow
\text{HTML 顯示}
$$

但 AI 實際取得內容時，可能只看到：

```html
<img src="formula.svg" alt="...">
```

或只得到：

```text
Image: formula
```

即使成功取得 TeX，AI 仍未必知道：

- 公式是定義、定理、假設還是推導結果；
- 每個符號在本文中的意義；
- 符號的有效範圍；
- 公式依賴哪些定義；
- 哪些變數是自由變數或約束變數；
- 公式能否直接計算；
- 程式近似保留了哪些語義；
- 是否已有形式證明。

因此，問題不只是公式渲染，而是數學語義缺乏顯式結構。

## 1.3 AI 原生數學百科的核心目標

本專案的目標可表示為：

$$
\text{數學內容}
\rightarrow
\text{數學知識物件}
\rightarrow
\begin{cases}
\text{人類閱讀介面}\\
\text{AI 結構化介面}\\
\text{計算與驗證後端}\\
\text{批次資料與訓練語料}
\end{cases}
$$

系統不是要求 AI 從頁面外觀重新猜測數學，而是直接提供數學結構。

---

# 二、設計原則

## 2.1 數學優先

數學敘述、條件、定義、證明與反例是核心。程式碼、圖形、數值實驗與 AI 解釋都只能作為衍生層。

$$
\text{Mathematics}
\neq
\text{Program}
$$

## 2.2 程式碼是計算伴隨物

若數學物件具有可計算部分，系統可提供參考程式碼，但必須標記其關係：

- 完整實作；
- 部分投影；
- 數值近似；
- 有限範圍驗證；
- 教學示例；
- 反例搜尋器；
- 視覺化工具。

形式上：

$$
\Pi_A(M)=P
$$

其中：

- $M$：數學物件；
- $A$：程式實作採用的額外假設；
- $P$：程式投影。

一般情況下：

$$
P\neq M
$$

## 2.3 計算證據不冒充證明

程式執行結果可提供：

- 有限案例；
- 數值證據；
- 反例；
- 統計結果；
- 敏感度；
- 誤差；
- 跨方法一致性。

但：

$$
\text{大量測試通過}
\not\Rightarrow
\text{普遍命題已證明}
$$

## 2.4 所有假設必須顯式

系統必須區分：

```text
explicit
inferred
assumed
clarified
unknown
```

任何數值範圍、精度、終止條件、隨機種子、資料分布與環境假設都必須可見。

## 2.5 來源與衍生層分離

Wikimedia、公共領域書籍、開放教材、形式化證明庫與專案自行生成內容，必須保留來源血統。

不得將：

- 原始文本；
- AI 翻譯；
- AI 重編；
- 人工修訂；
- 程式生成；
- 計算證據；
- 形式證明；

混合為無法追溯的單一文章。

## 2.6 人類與 AI 共用同一知識核心

人類 UI 與 AI MCP 不應維護兩套互相漂移的資料。

$$
\text{Canonical Knowledge Store}
\rightarrow
\begin{cases}
\text{Human UI}\\
\text{AI MCP/API}\\
\text{Dataset Export}
\end{cases}
$$

## 2.7 開源與可重現

資料規格、核心程式、驗證流程、示例與基礎介面原則上應開源。計算結果必須可重播，資料來源必須可追蹤。

---

# 三、系統定位

## 3.1 一句話定位

> 開源中文數學百科是一套以繁體中文為主要人類介面，將數學敘述、公式語義、參考程式、計算證據與形式驗證狀態對齊，並透過 MCP、API 與批次資料供 AI 直接取用的開源數學知識系統。

## 3.2 不做什麼

第一階段不以以下目標為核心：

- 重建完整 Wikipedia；
- 大規模開放式社群編輯；
- 取代現有形式證明器；
- 將程式輸出宣稱為數學證明；
- 一次匯入所有數學條目；
- 建立封閉的專有知識庫；
- 以頁面數量作為首要成功指標。

## 3.3 成功指標

第一版成功的判準不是條目總數，而是是否打通：

$$
\text{中文敘述}
\rightarrow
\text{TeX}
\rightarrow
\text{數學 AST}
\rightarrow
\text{符號綁定}
\rightarrow
\text{程式投影}
\rightarrow
\text{FELRA 證據}
\rightarrow
\text{MCP 取用}
$$

---

# 四、核心概念：數學知識物件

## 4.1 定義

數學知識物件，英文暫稱：

```text
Mathematical Knowledge Object
MKO
```

它是系統中可獨立引用、驗證、版本化與投影的最小知識單元。

可表示為：

$$
K
=
(I,S,D,P,C,E,F,V,M)
$$

其中：

- $I$：Identity，物件身份；
- $S$：Statement，數學敘述；
- $D$：Dependencies，前置依賴；
- $P$：Proofs，證明與推導；
- $C$：Computational Companions，計算伴隨；
- $E$：Evidence，計算與實驗證據；
- $F$：Formalization，形式化狀態；
- $V$：Version，版本；
- $M$：Metadata，來源與授權。

## 4.2 物件類型

第一版可支援：

```text
concept
definition
axiom
notation
formula
identity
proposition
lemma
theorem
corollary
conjecture
proof
proof_step
counterexample
algorithm
example
exercise
dataset
visualization
formal_proof
```

## 4.3 物件範例

```yaml
id: mko-euclid-pythagorean-theorem
type: theorem
version: 1

titles:
  zh-Hant: 畢達哥拉斯定理
  en: Pythagorean theorem

statement:
  natural_language:
    zh-Hant: >
      在歐幾里得平面中的直角三角形內，
      兩股長度的平方和等於斜邊長度的平方。
  tex: "a^2+b^2=c^2"
  mathml: "<math>...</math>"

assumptions:
  - geometry: euclidean
  - object: right_triangle
  - lengths_are_nonnegative: true

symbols:
  - symbol: a
    role: leg_length
  - symbol: b
    role: leg_length
  - symbol: c
    role: hypotenuse_length

dependencies:
  definitions:
    - mko-right-triangle
    - mko-euclidean-length

proofs:
  - id: proof-geometric-001
    type: geometric
    status: human_reviewed

computational_companions:
  - id: cc-python-001
    language: python
    relation: finite_instance_checker
    status: reference_only

verification:
  computational: finite_cases_passed
  symbolic: verified
  formal: not_available

provenance:
  sources: []
  license: CC-BY-SA-4.0
```

---

# 五、四層知識架構

## 5.1 第一層：數學語義層

包含：

- 原始數學敘述；
- 定義；
- 量詞；
- 假設；
- 符號；
- 公式；
- 定理；
- 證明；
- 反例；
- 適用範圍；
- 已知限制。

此層是整個系統的最高語義層。

## 5.2 第二層：計算伴隨層

包含：

- 參考程式碼；
- 算法；
- 數值方法；
- 符號方法；
- 圖形；
- 動畫；
- 可互動示例；
- 資料生成器；
- 反例搜尋器。

每個計算伴隨都必須具有：

```yaml
relation_type:
preserved_semantics:
approximated_semantics:
omitted_semantics:
runtime_assumptions:
numerical_precision:
```

## 5.3 第三層：證據驗證層

由 FELRA 或其他驗證後端提供：

- 有限網格測試；
- 隨機反例搜尋；
- 數值健全性；
- 任意精度比較；
- 符號恆等；
- 導數驗證；
- 跨方法一致性；
- 敏感度；
- 殘差；
- 統計分析；
- 可重播證據包。

## 5.4 第四層：形式證明層

包含：

- Lean；
- SMT；
- Coq；
- Isabelle；
- RWL；
- 其他證明系統。

必須區分：

- 尚未形式化；
- 部分形式化；
- 證明義務已產生；
- 自動證明完成；
- 人工形式證明完成；
- 形式證明與百科敘述尚未完全對齊。

---

# 六、數學非同一性聲明

## 6.1 必要性

數學與程式之間存在語義差異。系統必須自動產生：

```text
Non-Identity Declaration
數學—程式非同一性聲明
```

## 6.2 資料結構

```yaml
non_identity_declaration:
  mathematical_object: mko-limit-001
  computational_object: cc-python-004

  relation:
    type: numerical_approximation

  preserved:
    - sequence_definition
    - convergence_target
    - declared_input_domain

  approximated:
    - infinite_limit
    - real_number_arithmetic

  omitted:
    - universal_quantification
    - epsilon_delta_proof

  runtime_constraints:
    max_iterations: 100000
    tolerance: 1e-12
    precision: float64

  conclusion:
    computational_evidence_is_not_proof: true
```

## 6.3 常見語義損失

### 無窮轉有限

$$
\lim_{n\to\infty}a_n
$$

在程式中可能變成：

```python
for n in range(max_iterations):
    ...
```

系統必須標記：

```text
infinite_process → finite_approximation
```

### 實數轉浮點數

$$
x\in\mathbb{R}
$$

在程式中可能變成 `float64`，因此必須標記：

```text
real_number → finite_precision_floating_point
```

### 全稱量詞轉抽樣

$$
\forall x\in X,\ P(x)
$$

程式測試通常只驗證有限集合：

$$
X_{\mathrm{test}}\subset X
$$

因此：

$$
\forall x\in X_{\mathrm{test}},P(x)
\not\Rightarrow
\forall x\in X,P(x)
$$

---

# 七、FELRA 整合

## 7.1 FELRA 的定位

FELRA 作為本系統的計算證據與驗證後端，負責將：

$$
\text{理論／資料}
\rightarrow
\text{可重現計算證據}
\rightarrow
\text{反例、殘差、敏感度與圖形}
\rightarrow
\text{修正命題或證明義務}
$$

FELRA 不取代形式證明器，而是填補百科敘述與正式證明之間的計算驗證層。

## 7.2 主要整合能力

第一階段可使用：

- 安全 AST 數值表達式；
- 有限宣告網格；
- 隨機反例搜尋；
- 數值溢位與 NaN 檢查；
- float64 與任意精度比較；
- SymPy 符號恆等；
- 導數驗證；
- 跨方法一致性；
- 內容定址快取；
- SHA-256 指紋；
- 重播；
- JSON／Markdown／SVG／PDF 證據包。

## 7.3 FELRA 證據物件

```yaml
felra_evidence:
  run_id: felra-run-000123
  object_id: mko-identity-001
  project_hash: "..."
  data_hash: "..."
  seed: 42
  environment:
    python: "3.x"
    platform: "..."
  checks:
    - type: symbolic_identity
      status: passed
    - type: numerical_soundness
      status: passed
    - type: cross_method_consistency
      status: passed
  counterexamples_found: 0
  limitations:
    - finite_declared_domain
    - no_formal_proof
  replayable: true
```

## 7.4 驗證級別

```text
E0 — 未執行
E1 — 示例可執行
E2 — 有限測試通過
E3 — 反例搜尋未發現反例
E4 — 符號或跨方法一致
E5 — 性質驗證
E6 — 形式證明完成
```

其中任何級別都不得被模糊顯示為單一「已證明」。

---

# 八、EveGlyph Editor 整合

## 8.1 編輯工作流

EveGlyph Editor 作為本專案的內容工作台，可支援：

```text
作者撰寫 Markdown
↕
KaTeX 即時預覽
↕
AI Agent 編修
↕
Git Diff 審查
↕
接受／拒絕
↕
資料物件編譯
```

## 8.2 EveGlyph-MD 文件格式

每篇內容可使用：

```yaml
---
type: math_article
status: draft
tags:
  - calculus
  - limits
language: zh-Hant
license: CC-BY-SA-4.0
---
```

正文中使用明確區塊：

```markdown
:::definition{id="mko-limit-definition"}
...
:::

:::formula{id="formula-limit-001"}
$$
\lim_{x\to a}f(x)=L
$$
:::

:::computational-companion{id="cc-python-001"}
...
:::

:::felra-evidence{id="felra-run-001"}
...
:::
```

## 8.3 AIMD-C

AIMD-C 可承擔：

- 小型公式計算；
- 文件內參數化示例；
- 可重播教學實驗；
- 輕量化數學互動；
- 編輯階段的快速檢查。

複雜驗證則交由 FELRA。

## 8.4 MCP 工作區

EveGlyph 既有 MCP 可作為作者與 AI Agent 的本地工作區介面，第一階段可使用：

```text
list_files
read_file
write_file
evaluate_aimdc
validate_world_ir
```

並新增數學百科專用工具。

---

# 九、MCP 與 AI 介面

## 9.1 MCP 定位

MCP 不負責大量資料搬運，而負責 AI 在任務期間精確取用知識物件。

$$
\text{Bulk Data Plane}
\neq
\text{Agent Retrieval Plane}
$$

## 9.2 基本 MCP 工具

```text
search_math_objects
get_math_object
get_definition
get_theorem
get_formula
get_formula_tex
get_formula_mathml
get_formula_ast
get_symbol_bindings
get_dependencies
get_proof
get_proof_steps
get_counterexamples
get_reference_code
get_computational_companion
get_non_identity_declaration
run_aimdc_example
run_felra_verification
get_felra_evidence
get_formal_proof_status
get_source_provenance
compare_versions
export_context_bundle
```

## 9.3 MCP 回傳範例

```json
{
  "id": "mko-pythagorean-theorem",
  "type": "theorem",
  "language": "zh-Hant",
  "statement": {
    "text": "在直角三角形中，兩股長度平方和等於斜邊長度平方。",
    "tex": "a^2+b^2=c^2"
  },
  "assumptions": [
    "Euclidean geometry",
    "right triangle"
  ],
  "symbols": {
    "a": "leg length",
    "b": "leg length",
    "c": "hypotenuse length"
  },
  "proof_status": "human_proof_available",
  "formal_status": "not_formalized",
  "computational_status": "finite_tests_passed",
  "warning": "Finite computation is not a universal proof."
}
```

## 9.4 Context Bundle

AI 可請求針對任務產生最小上下文包：

```yaml
context_bundle:
  topic: definite_integral
  definitions: []
  formulas: []
  prerequisites: []
  proof_summaries: []
  code_companions: []
  verification_status: []
  citations: []
```

避免把整篇百科與無關內容全部送入上下文。

---

# 十、人類閱讀介面

## 10.1 頁面層級

每篇文章可分為：

1. 導讀；
2. 核心定義；
3. 數學敘述；
4. 公式；
5. 直觀解釋；
6. 例子；
7. 證明；
8. 反例；
9. 計算伴隨；
10. 驗證；
11. 前置知識；
12. 延伸主題；
13. 來源與版本。

## 10.2 五個主要頁籤

```text
數學
解釋
程式碼
計算證據
形式化
```

### 數學

原始定義、命題、公式與證明。

### 解釋

繁體中文直觀敘述、符號說明、常見誤解與前置知識。

### 程式碼

Python、Julia、Rust、JavaScript 或 EML-P 參考實作。

### 計算證據

FELRA 執行結果、圖形、殘差、反例搜尋、誤差與重播資訊。

### 形式化

Lean／SMT／Coq／RWL 狀態與證明義務。

## 10.3 公式互動

公式應支援：

- 複製 TeX；
- 複製 MathML；
- 顯示 AST；
- 點擊符號看定義；
- 顯示符號作用域；
- 顯示上下游依賴；
- 查看對應程式片段；
- 查看語義損失；
- 送至 FELRA；
- 送至形式證明工作流。

## 10.4 閱讀模式

可支援：

```text
初學模式
標準模式
進階模式
AI 原始結構模式
```

---

# 十一、資料來源與匯入

## 11.1 初期資料來源

- Wikipedia／Wikimedia 數學條目；
- Wikidata；
- Wikimedia Commons；
- 公共領域數學書籍；
- 開放授權教材；
- arXiv 或其他允許重用的開放內容；
- Mathlib／Lean 等形式化資料；
- 開源程式；
- EveMissLab 原生內容。

## 11.2 Wikimedia 匯入流程

```text
Wikimedia Dump
↓
Wikitext Parser
↓
章節與模板抽取
↓
<math> TeX 抽取
↓
引用與來源抽取
↓
數學物件候選切分
↓
AI 輔助重編
↓
人工／多模型審查
↓
MKO 建立
```

## 11.3 原文與重編分離

```yaml
source_layer:
  source_project: en.wikipedia.org
  page_id: ...
  revision_id: ...
  original_language: en
  original_text: ...

derived_layer:
  language: zh-Hant
  transformation: ai_assisted_recompilation
  human_reviewed: false
  semantic_changes: []
```

## 11.4 媒體授權

每張圖、動畫與影音必須單獨保存：

```yaml
media:
  source:
  creator:
  license:
  attribution:
  modifications:
  share_alike_required:
```

---

# 十二、語料血統與版本控制

## 12.1 來源血統

每個 MKO 必須記錄：

- 原始來源；
- 原始版本；
- 擷取時間；
- 原始語言；
- 翻譯模型；
- 編輯模型；
- 人類審閱；
- 母語審閱；
- 數學審閱；
- 程式審閱；
- 驗證執行；
- 形式證明來源。

## 12.2 語義家族

同一知識物件的多語版本、不同解釋與不同程式投影應共享：

```text
semantic_family_id
```

例如：

```yaml
semantic_family_id: sf-pythagorean-theorem
```

## 12.3 版本

```yaml
version:
  object_version: 3
  source_revision: 123456789
  schema_version: mko-v0.1
  last_verified_at: 2026-07-25
```

## 12.4 不可變執行紀錄

FELRA 證據包可採內容定址：

$$
H
=
\operatorname{SHA256}
(
\text{object}
+
\text{data}
+
\text{environment}
+
\text{seed}
)
$$

---

# 十三、Canonical Knowledge Store

## 13.1 儲存結構

```text
knowledge-store/
├── objects/
│   ├── definitions/
│   ├── theorems/
│   ├── proofs/
│   ├── formulas/
│   └── algorithms/
├── articles/
├── sources/
├── media/
├── code/
├── evidence/
├── formal/
├── graphs/
├── indexes/
└── manifests/
```

## 13.2 建議格式

### 主要交換格式

- JSON；
- JSONL；
- YAML；
- Markdown；
- TeX；
- MathML。

### 大型分析格式

- Parquet；
- SQLite；
- DuckDB；
- 圖資料庫；
- 向量索引。

## 13.3 物件與頁面分離

一篇文章可包含多個 MKO：

```text
article
├── definition-001
├── theorem-001
├── proof-001
├── example-001
└── algorithm-001
```

同一 MKO 也可被多篇文章引用。

---

# 十四、數學 AST 與符號綁定

## 14.1 公式表示

每個公式至少保存：

```yaml
formula:
  tex:
  mathml:
  presentation_ast:
  semantic_ast:
  normalized_form:
```

## 14.2 符號表

```yaml
symbols:
  - token: f
    role: function
    scope: formula-001
    definition_ref: definition-function
  - token: x
    role: bound_variable
    binder: integral-001
  - token: a
    role: lower_bound
  - token: b
    role: upper_bound
```

## 14.3 符號歧義

同一符號在不同條目可具有不同意義：

$$
i
=
\begin{cases}
\text{索引}\\
\sqrt{-1}\\
\text{電流}\\
\text{單位向量}
\end{cases}
$$

因此符號必須依物件與作用域綁定，而不能只建立全域字典。

## 14.4 公式依賴圖

```text
definition
↓
lemma
↓
theorem
↓
corollary
↓
application
```

---

# 十五、API 與批次資料

## 15.1 REST API

```text
GET /objects/{id}
GET /objects/{id}/formula
GET /objects/{id}/symbols
GET /objects/{id}/dependencies
GET /objects/{id}/proofs
GET /objects/{id}/code
GET /objects/{id}/evidence
GET /objects/{id}/formal
GET /search
```

## 15.2 GraphQL

適合一次取得：

```text
定理
＋前置定義
＋證明摘要
＋程式
＋驗證狀態
```

## 15.3 批次資料

```text
mko.jsonl
articles.jsonl
formulas.jsonl
symbol-bindings.parquet
dependencies.parquet
evidence.jsonl
provenance.jsonl
```

## 15.4 訓練資料分層

- 原始來源；
- 中文翻譯；
- 中文原生重編；
- 問答；
- 公式解析；
- 數學—程式對齊；
- 失敗與修正；
- 計算軌跡；
- 形式證明對齊。

---

# 十六、品質與審查

## 16.1 多維品質向量

$$
Q(K)
=
(q_m,q_l,q_s,q_c,q_e,q_f,q_p)
$$

其中：

- $q_m$：數學正確性；
- $q_l$：中文品質；
- $q_s$：符號與語義結構；
- $q_c$：程式伴隨品質；
- $q_e$：計算證據；
- $q_f$：形式化狀態；
- $q_p$：來源血統完整度。

## 16.2 審查角色

```text
語言審查
數學審查
程式審查
驗證審查
形式化審查
授權審查
```

同一人不必完成所有角色。

## 16.3 AI 審查

AI 可負責：

- 格式檢查；
- 引用檢查；
- 公式對齊；
- 程式靜態分析；
- 測試生成；
- 語義損失報告；
- 術語一致性；
- 多語比較。

但高風險數學結論仍需人工或形式系統確認。

---

# 十七、安全模型

## 17.1 程式執行沙盒

所有百科程式預設：

- 無網路；
- 限制檔案系統；
- CPU 配額；
- 記憶體配額；
- 執行超時；
- 固定隨機種子；
- 系統呼叫限制；
- 套件白名單；
- 結果大小限制。

## 17.2 MCP 權限分層

```text
read
compute
draft
edit
publish
admin
```

一般 AI 查詢只能使用：

```text
read + compute
```

## 17.3 內容注入風險

外部來源文本不得被視為高權限指令。匯入器應將來源內容視為資料，而非 Agent 指令。

## 17.4 證據偽造

每個執行結果應保存：

- 輸入；
- 環境；
- 版本；
- 雜湊；
- 日誌；
- 重播方法。

---

# 十八、開源策略

## 18.1 建議開源範圍

- MKO Schema；
- 內容匯入器；
- 數學 AST；
- 人類 UI；
- MCP Server；
- REST API；
- FELRA Adapter；
- EveGlyph Plugin；
- 示例資料；
- 文件；
- 測試。

## 18.2 資料授權

不同來源可能具有不同授權。系統必須允許：

```yaml
content_license:
code_license:
media_license:
formal_proof_license:
```

## 18.3 品牌與資料分離

核心資料格式與開源軟體可獨立於品牌。即使出現其他前端或衍生站，也能共用 MKO 標準。

---

# 十九、MVP

## 19.1 第一版範圍

第一版只完成十個高品質主題：

1. 集合；
2. 函數；
3. 極限；
4. 導數；
5. 定積分；
6. 向量；
7. 矩陣；
8. 質數；
9. 畢達哥拉斯定理；
10. 二次方程式。

## 19.2 每個主題必須包含

- 一篇中文主文章；
- 至少三個 MKO；
- TeX；
- MathML；
- 數學 AST；
- 符號綁定；
- 前置知識；
- 至少一個參考程式；
- 非同一性聲明；
- 至少一份 FELRA 證據；
- MCP 回傳；
- 來源血統；
- 人類 UI。

## 19.3 第一版技術棧建議

### 前端

- TypeScript；
- Vite；
- KaTeX／MathJax；
- CodeMirror；
- 圖形視覺化函式庫。

### 後端

- Python；
- FastAPI；
- SQLite／DuckDB；
- JSONL；
- FELRA。

### AI 介面

- MCP；
- REST；
- 批次 JSONL。

### 編輯

- EveGlyph Editor；
- Git；
- Markdown；
- YAML／JSON Schema。

## 19.4 MVP 成功條件

```text
10 個完整條目
30 個以上 MKO
100% 公式保有 TeX
100% 公式具符號表
100% 程式伴隨具非同一性聲明
所有 FELRA 證據可重播
所有 MCP 物件可引用版本
所有內容具來源與授權欄位
```

---

# 二十、分階段路線

## Phase 0：規格

完成：

- MKO Schema；
- Formula Schema；
- Symbol Binding Schema；
- Computational Companion Schema；
- Evidence Schema；
- Provenance Schema；
- MCP Tool Spec。

## Phase 1：十個示範條目

建立完整垂直切片。

## Phase 2：數學基礎域

擴展至：

- 初等代數；
- 幾何；
- 微積分；
- 線性代數；
- 離散數學；
- 機率統計。

## Phase 3：自動匯入

支援 Wikimedia 與開放教材的半自動匯入、公式抽取與物件候選生成。

## Phase 4：形式化整合

加入 Lean／SMT／RWL 對應。

## Phase 5：社群貢獻

建立提案、審查、測試與版本治理。

## Phase 6：多語言

加入：

- 簡體中文；
- 英文；
- 日文；
- 其他語言。

## Phase 7：中文科學百科

將架構擴張至：

- 物理；
- 化學；
- 計算機科學；
- 工程；
- 其他形式知識領域。

---

# 二十一、儲存庫建議結構

```text
open-chinese-math-encyclopedia/
├── apps/
│   ├── web/
│   ├── api/
│   ├── mcp-server/
│   └── importer/
├── packages/
│   ├── mko-schema/
│   ├── math-parser/
│   ├── symbol-binding/
│   ├── provenance/
│   ├── felra-adapter/
│   ├── eveglyph-plugin/
│   └── ui-components/
├── content/
│   ├── articles/
│   ├── objects/
│   ├── sources/
│   ├── code/
│   ├── evidence/
│   └── formal/
├── datasets/
├── examples/
├── docs/
├── schemas/
├── tests/
└── governance/
```

---

# 二十二、核心技術命題

## 命題一：數學物件優先命題

以數學知識物件為核心，比以頁面為核心更適合 AI 精確取用與跨頁重組。

## 命題二：計算伴隨增益命題

在不混淆數學與程式的前提下，參考程式能提升數學內容的可操作性、可理解性與可驗證性。

## 命題三：非同一性透明命題

若系統能顯式標記程式投影所保存、近似與遺失的語義，AI 將較不容易把有限計算誤認為數學等價物。

## 命題四：重播優於靜態聲明

可重播的計算證據，比只顯示「已驗證」標籤更具可信度。

## 命題五：雙介面同源命題

人類 UI 與 AI MCP 若讀取同一 Canonical Store，可降低知識漂移與版本不一致。

## 命題六：數學百科先導命題

數學百科可作為完整 AI 原生中文百科的先導領域，因為其知識結構最適合物件化、驗證與形式化。

---

# 二十三、長期願景

本專案的長期路線為：

$$
\text{開源中文數學百科}
\rightarrow
\text{開源中文科學百科}
\rightarrow
\text{中文形式知識百科}
\rightarrow
\text{AI 原生中文百科}
$$

最終目標不是建立更多靜態頁面，而是讓中文數學與科學知識成為：

- 可閱讀；
- 可搜尋；
- 可引用；
- 可計算；
- 可重播；
- 可驗證；
- 可形式化；
- 可由 AI 精確取得；
- 可供下一代模型學習。

---

# 二十四、結論

開源中文數學百科不應只是 Wikipedia 的繁體中文翻譯站，也不應只是將舊式公式顯示改成 KaTeX。

真正的工程目標是：

> 將數學內容從以頁面與視覺排版為核心的資料，重新編譯成以數學物件、符號結構、計算伴隨、驗證證據與形式證明狀態為核心的知識系統。

其完整架構為：

$$
\boxed{
\text{中文數學敘述}
\rightarrow
\text{數學知識物件}
\rightarrow
\text{程式計算伴隨}
\rightarrow
\text{FELRA 計算證據}
\rightarrow
\text{形式證明狀態}
\rightarrow
\text{人類 UI 與 AI MCP}
}
$$

本系統必須始終維持一條清楚界線：

$$
\text{數學}
\neq
\text{程式}
\neq
\text{有限計算證據}
\neq
\text{形式證明}
$$

但這些層次並非互相排斥。當它們被正確對齊時，數學知識將比傳統百科更容易被人類理解，也更容易被 AI 重新計算、驗證與吸收。

這正是開源中文數學百科的核心價值：

> **不是把數學變成程式，而是讓數學在不失去自身嚴格性的前提下，獲得更完整的可計算性、可驗證性與 AI 可讀性。**
