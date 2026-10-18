import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import calc  # noqa: E402


def test_add():
    assert calc.add(2, 3) == 5


def test_divide():
    assert calc.divide(9, 3) == 3
