import Mathlib.Geometry.Euclidean.Angle.Unoriented.RightAngle

namespace OCMEFormal

open Real
open InnerProductGeometry

/--
OCME 對畢達哥拉斯定理的 Mathlib 映射。

這個聲明採用實內積空間中的向量形式：若 `x` 與 `y` 的夾角是 π/2，
則向量和的範數平方等於兩向量範數平方之和。
-/
theorem pythagorean_vector
    {V : Type*} [NormedAddCommGroup V] [InnerProductSpace ℝ V]
    (x y : V) (h : angle x y = Real.pi / 2) :
    ‖x + y‖ * ‖x + y‖ = ‖x‖ * ‖x‖ + ‖y‖ * ‖y‖ := by
  exact InnerProductGeometry.norm_add_sq_eq_norm_sq_add_norm_sq' x y h

end OCMEFormal
