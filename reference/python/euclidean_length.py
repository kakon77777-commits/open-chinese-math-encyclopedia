"""歐幾里得長度定義的有限浮點計算伴隨。

此程式只計算具體座標，不證明距離函數對所有實數點滿足全部度量公理。
"""
from __future__ import annotations

from math import hypot, isclose

Point2D = tuple[float, float]


def euclidean_distance(p: Point2D, q: Point2D) -> float:
    x1, y1 = p
    x2, y2 = q
    return hypot(x2 - x1, y2 - y1)


def run_checks() -> dict[str, bool]:
    p = (1.5, -2.0)
    q = (-4.0, 3.25)
    return {
        "3-4-5": isclose(euclidean_distance((0, 0), (3, 4)), 5.0),
        "identity": isclose(euclidean_distance(p, p), 0.0),
        "symmetry": isclose(euclidean_distance(p, q), euclidean_distance(q, p)),
        "nonnegative": euclidean_distance(p, q) >= 0,
    }


if __name__ == "__main__":
    checks = run_checks()
    print(checks)
    raise SystemExit(0 if all(checks.values()) else 1)
