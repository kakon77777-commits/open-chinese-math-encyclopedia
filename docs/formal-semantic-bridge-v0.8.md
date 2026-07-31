# OCME v0.8 形式語義橋規格

## 1. 目的

OCME 的形式層不把「找到相似的 Mathlib 定理」當成百科物件已形式化。每條橋必須明確記錄：

1. 中文物件的語義角色；
2. Lean 中使用的型別與定義；
3. 精確全稱聲明；
4. 來源與工具鏈；
5. 尚未封閉的語義差異。

## 2. 證據狀態

```text
configured
→ Lean source exists
→ pinned lake build passed
→ no sorry/admit
→ manifest passed
→ content-addressed formal_proof
→ MKO evidence_ref
→ producer active
```

任何前一步缺失，都不得跳到後一步。

## 3. 集合隸屬

百科語句：

```text
x∈A 表示 x 是 A 的元素。
```

Lean 模型：

```lean
A : Set α
x : α
```

形式聲明：

```lean
x ∈ A ↔ A x
```

狀態：`formalized_lean_set_semantics`。

限制：此橋採用 Lean `Set α = α → Prop` 的語義，不宣稱涵蓋所有集合論基礎；程式容器成員測試也不自動等同於此物件。

## 4. 函數映射

百科語句：

```text
f:X→Y 對每個輸入指定唯一輸出。
```

Lean 模型：

```lean
f : X → Y
x : X
```

形式聲明：

```lean
∃! y : Y, f x = y
```

狀態：`formalized_total_function_core`。

限制：只處理純總函數型別；不涵蓋部分函數、副作用、隨機程序或執行失敗，也不聲稱函數為滿射。

## 5. 趨近關係

百科語句：

```text
x→a 描述方向性趨近，不等同於 x=a。
```

Mathlib 模型：

```lean
Filter.Tendsto f l₁ l₂
```

形式聲明：

```lean
Filter.Tendsto f l₁ l₂ ↔ Filter.map f l₁ ≤ l₂
```

狀態：`formalized_filter_tendsto_core`。

限制：裸箭頭必須先補上函數與來源、目標濾子；此橋不是特定函數極限，也不是單獨的 ε–δ 定義。

## 6. 畢達哥拉斯語義橋

### 6.1 向量核心

```lean
angle x y = π / 2
→ ‖x+y‖² = ‖x‖² + ‖y‖²
```

### 6.2 邊長角色綁定

```lean
a = ‖x‖
b = ‖y‖
c = ‖x+y‖
```

### 6.3 推論

```lean
a·a+b·b=c·c
```

狀態：`formalized_declared_side_model`。

限制：這完成 OCME 明示的向量邊長模型，但尚未證明任意仿射歐幾里得三角形頂點排列、邊向量方向與此模型全部等價。

## 7. Evidence 原則

一個 MKO 可以引用多份同一 producer 的形式證據。例如畢達哥拉斯定理同時引用：

- 向量核心定理；
- 邊長語義橋定理。

兩份 Evidence 不合併，因為它們具有不同聲明與限制。

```text
formal_proof A + formal_proof B
≠ 一個無邊界的「完全證明」標籤
```

## 8. 重播環境

```text
Elan v4.2.1
Lean 4.30.0
Mathlib v4.30.0
```

```bash
cd formal/lean
lake update
lake exe cache get
lake build
```

CI 另行掃描 `sorry` 與 `admit`，並由 Evidence Builder 重算來源 SHA-256 與內容地址。
