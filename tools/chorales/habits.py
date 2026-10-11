"""
Bach's habit in a context (its counts and examples) is the same at every note that shares the
context, so the level files keep each habit once, in a table, and the notes refer to it by index
(housekeeping after D155: level 4 held 8,033 copies of 170 habits). src/chorale/habits.ts puts
them back on load.
"""
from __future__ import annotations

import copy
import json
from typing import Callable, Iterable


def share_habits(chorales: list[dict], notes_of: Callable[[dict], Iterable[dict]]) -> tuple[list[dict], list[dict]]:
    """A copy of `chorales` with every note's "habit" replaced by its index in the returned table."""
    out = copy.deepcopy(chorales)
    table: list[dict] = []
    index: dict[str, int] = {}
    for c in out:
        for n in notes_of(c):
            key = json.dumps(n["habit"], sort_keys=True, ensure_ascii=False)
            if key not in index:
                index[key] = len(table)
                table.append(n["habit"])
            n["habit"] = index[key]
    return out, table
