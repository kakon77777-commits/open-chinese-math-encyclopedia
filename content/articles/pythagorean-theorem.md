---
type: math_article
status: mvp
language: zh-Hant
tags: [幾何, 定理, 計算伴隨]
object_ids: [mko-euclid-pythagorean-theorem]
license: CC-BY-SA-4.0
---

# 畢達哥拉斯定理

:::theorem{id="mko-euclid-pythagorean-theorem"}
在歐幾里得平面中的直角三角形，若兩股長為 $a,b$，斜邊長為 $c$，則：

$$
a^2+b^2=c^2
$$
:::

:::computational-companion{id="cc-python-pythagorean-001" relation="finite_instance_checker"}
參考程式位於 `reference/python/pythagorean.py`。它能檢查具體案例與有限整數範圍，但不構成定理的普遍證明。
:::

:::felra-evidence{id="ocme-pythagorean-finite-check"}
FELRA 規格位於 `felra/pythagorean/project.yaml`。輸出必須標示為有限計算證據。
:::
