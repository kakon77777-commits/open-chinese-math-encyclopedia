"""重播 OCME 目前全部 Python 計算伴隨，輸出統一證據快照。"""
from __future__ import annotations

import json
from pathlib import Path

from euclidean_length import run_checks as run_length_checks
from pythagorean import integer_triples, is_right_triangle
from right_triangle import run_checks as run_triangle_checks


def main() -> None:
    triples = list(integer_triples(200))
    pythagorean_checks = {
        "3-4-5": is_right_triangle(3, 4, 5),
        "5-12-13": is_right_triangle(5, 12, 13),
        "2-3-4_rejected": not is_right_triangle(2, 3, 4),
        "all_generated_exact": all(a * a + b * b == c * c for a, b, c in triples),
        "triple_count_is_127": len(triples) == 127,
    }
    suites = {
        "mko-right-triangle": run_triangle_checks(),
        "mko-euclidean-length": run_length_checks(),
        "mko-euclid-pythagorean-theorem": pythagorean_checks,
    }
    passed = all(all(checks.values()) for checks in suites.values())
    evidence = {
        "schema_version": "ocme-python-evidence-v0.2",
        "object_count": len(suites),
        "status": "passed" if passed else "failed",
        "suites": suites,
        "warning": "Finite computational checks are not universal mathematical proofs.",
    }
    out = Path(__file__).resolve().parents[2] / "artifacts" / "python-evidence-v0.2.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(evidence, ensure_ascii=False, indent=2))
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
