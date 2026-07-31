# OCME Lean Formal Evidence v0.7

## 1. 目的

本規格定義 OCME 如何將真正通過 Lean／Mathlib 編譯的定理，轉換成內容定址 `formal_proof` Evidence Object。

形式證據與有限計算證據共用同一 Canonical Evidence Store，但具有更嚴格的範圍約束。

## 2. 發布條件

形式 producer 只有在以下條件全部成立時才能標記為 `active`：

1. Lean 與 Mathlib 版本明確固定；
2. `lake update` 成功；
3. Mathlib cache 可取得或可重建；
4. `lake build` 成功；
5. 來源中沒有 `sorry` 或 `admit`；
6. manifest 通過 Draft 2020-12 Schema；
7. Evidence 地址可由已提交來源重新計算；
8. MKO 明確引用該 Evidence ID。

工作流成功完成不等於形式命題通過；只有實際 `lake build` 步驟成功才可建立 passed manifest。

## 3. 精確聲明範圍

目前定理：

```lean
theorem OCMEFormal.pythagorean_vector
    {V : Type*} [NormedAddCommGroup V] [InnerProductSpace ℝ V]
    (x y : V) (h : angle x y = Real.pi / 2) :
    ‖x + y‖ * ‖x + y‖ = ‖x‖ * ‖x‖ + ‖y‖ * ‖y‖
```

它證明的是任意實內積空間中的向量形式。

因此 Evidence 可標記：

```json
{
  "quantification": "formal_universal",
  "universal_proof": true
}
```

但 `universal_proof: true` 只適用於上述精確形式命題，不自動涵蓋：

- 中文自然語言的全部可能解讀；
- 三角形頂點與向量的模型建立；
- 邊長符號 a、b、c 與向量範數的綁定；
- 直角幾何條件與向量夾角等式的映射；
- 非歐幾里得幾何中的同名命題。

## 4. 語義橋狀態

畢達哥拉斯 MKO 使用：

```text
formalized_equivalent_vector_form
```

而不是：

```text
fully_formalized
```

原因是向量定理已通過，但百科三角形敘述到向量模型的完整橋接尚未獨立證明。

## 5. 內容地址

Evidence payload 綁定：

- Lean 工具鏈版本；
- Mathlib 版本；
- Lake 專案；
- Lean 根模組；
- 定理來源；
- 公式來源 SHA-256；
- 精確聲明；
- 檢查結果；
- 限制；
- 重播命令。

任一項改變時，Evidence ID 必須改變。

目前地址：

```text
evidence-sha256-dd7d2bb464dd8f503fa5be9f4c68e01ce0947e506e137a064bdaa1b950c8628f
```

## 6. 重播

```bash
cd formal/lean
lake update
lake exe cache get
lake build
```

CI 另執行：

```bash
grep -R -nE '\b(sorry|admit)\b' OCMEFormal OCMEFormal.lean
```

若找到佔位符，工作流失敗。

## 7. Adapter 安全邊界

Lean Adapter 會拒絕：

- subject ID 與 MKO 不一致；
- 非 passed manifest；
- `universal_proof` 不是 `true`；
- quantification 不是 `formal_universal`；
- 來源路徑逃逸儲存庫；
- 來源檔案不存在；
- 內容地址與提交物件不一致。

## 8. 下一個義務

下一階段應建立：

```text
歐幾里得直角三角形
→ 頂點差向量
→ 直角條件對應 angle = π/2
→ 邊長對應向量範數
→ pythagorean_vector
→ a²+b²=c²
```

只有這條語義橋也完成後，才可考慮將該百科物件提升為更完整的形式化狀態。
