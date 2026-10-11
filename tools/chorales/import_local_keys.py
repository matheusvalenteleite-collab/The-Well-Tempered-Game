#!/usr/bin/env python3
"""A snapshot of the generator session's local keys (its branch claude/chorale-fugue-generation-fbclx4:
src/chorale/generate/keys.ts, docs/chorales/KEYS.md): every on-beat soprano attack of Bach's 370
chorales read in its local key (regions confirmed by phrase closes; applied chords inside them).
Written here as data/chorales/local-keys.json, {chorale: [[t, tonic, mode, chord in the local key,
"d" | "a:<degree>" | "c"], ...]}, the onsets those of the analysis layer, so that the chorale
analysis can use them until the two branches are merged.

Usage: git fetch origin claude/chorale-fugue-generation-fbclx4 && python3 tools/chorales/import_local_keys.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRANCH = "origin/claude/chorale-fugue-generation-fbclx4"
OUT = ROOT / "data/chorales/local-keys.json"


def show(path: str) -> dict:
    return json.loads(subprocess.check_output(["git", "show", f"{BRANCH}:{path}"], cwd=ROOT))


def main() -> None:
    events = {c["no"]: c["notes"] for c in show("data/chorales/generator/bach-events.json")["chorales"]}
    keys = show("data/chorales/generator/local-keys.json")
    rev = subprocess.check_output(["git", "rev-parse", "--short", BRANCH], cwd=ROOT, text=True).strip()
    out = {}
    for c in keys["chorales"]:
        ev = events[c["no"]]
        assert len(ev) == len(c["keys"]), c["no"]
        out[c["no"]] = [[e["t"], *k] for e, k in zip(ev, c["keys"])]
    OUT.write_text(json.dumps({"source": f"{BRANCH} at {rev} (data/chorales/generator/local-keys.json, bach-events.json)",
                               "fields": ["t", "tonic", "mode", "chord in the local key", "d diatonic | a:<degree> applied | c chromatic"],
                               "chorales": out}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(out)} chorales from {rev}")


if __name__ == "__main__":
    main()
