import Mathlib.Geometry.Euclidean.Angle.Unoriented.RightAngle

namespace OCMEFormal

open Real
open InnerProductGeometry

/--
OCME 對畢達哥拉斯定理的 Mathlib 向量映射。

這個聲明採用實內積空間中的向量形式：若 `x` 與 `y` 的夾角是 π/2，
則向量和的範數平方等於兩向量範數平方之和。
-/
theorem pythagorean_vector
    {V : Type*} [NormedAddCommGroup V] [InnerProductSpace ℝ V]
    (x y : V) (h : angle x y = Real.pi / 2) :
    ‖x + y‖ * ‖x + y‖ = ‖x‖ * ‖x‖ + ‖y‖ * ‖y‖ := by
  exact InnerProductGeometry.norm_add_sq_eq_norm_sq_add_norm_sq' x y h

/--
OCME 中文邊長語句到向量模型的明示語義橋。

`x`、`y` 是互相垂直的兩股向量；`a`、`b` 分別綁定為它們的範數，
`c` 綁定為向量和的範數。這個模型把三個非負邊長角色連到 Mathlib
已檢查的向量定理，但不宣稱它自動涵蓋所有仿射幾何表示法。
-/
def IsRightTriangleSideModel
    {V : Type*} [NormedAddCommGroup V] [InnerProductSpace ℝ V]
    (x y : V) (a b c : ℝ) : Prop :=
  angle x y = Real.pi / 2 ∧
    a = ‖x‖ ∧
    b = ‖y‖ ∧
    c = ‖x + y‖

/--
在 `IsRightTriangleSideModel` 明示的語義映射下，中文條目中的邊長平方式成立。
-/
theorem pythagorean_side_lengths
    {V : Type*} [NormedAddCommGroup V] [InnerProductSpace ℝ V]
    (x y : V) (a b c : ℝ)
    (h : IsRightTriangleSideModel x y a b c) :
    a * a + b * b = c * c := by
  rcases h with ⟨hangle, rfl, rfl, rfl⟩
  exact (pythagorean_vector x y hangle).symm

end OCMEFormal
