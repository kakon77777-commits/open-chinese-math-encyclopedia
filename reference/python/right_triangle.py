"""直角三角形定義的有限角度檢查伴隨。

此程式只檢查具體浮點輸入，不取代幾何定義或形式化證明。
"""
from __future__ import annotations

from math import isclose


def is_right_triangle_angles(
    alpha: float,
    beta: float,
    gamma: float,
    *,
    tol: float = 1e-9,
) -> bool:
    angles = (alpha, beta, gamma)
    if min(angles) <= 0:
        return False
    return isclose(sum(angles), 180.0, abs_tol=tol) and any(
        isclose(angle, 90.0, abs_tol=tol) for angle in angles
    )


def run_checks() -> dict[str, bool]:
    return {
        "30-60-90": is_right_triangle_angles(30, 60, 90),
        "45-45-90": is_right_triangle_angles(45, 45, 90),
        "60-60-60_rejected": not is_right_triangle_angles(60, 60, 60),
        "degenerate_rejected": not is_right_triangle_angles(0, 90, 90),
    }


if __name__ == "__main__":
    checks = run_checks()
    print(checks)
    raise SystemExit(0 if all(checks.values()) else 1)
