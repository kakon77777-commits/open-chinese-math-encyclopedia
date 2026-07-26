---
type: math_article
status: mvp-v0.2
language: zh-Hant
tags: [幾何, 距離, 定義]
object_ids: [mko-euclidean-length]
license: CC-BY-SA-4.0
---

# 歐幾里得長度

:::definition{id="mko-euclidean-length"}
若 $P=(x_1,y_1)$、$Q=(x_2,y_2)$，則兩點間的歐幾里得距離為：

$$
d(P,Q)=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}
$$
:::

:::computational-companion{id="cc-python-euclidean-length-001" relation="numeric_distance_evaluator"}
參考程式位於 `reference/python/euclidean_length.py`。浮點運算只是實數距離的有限精度投影。
:::
