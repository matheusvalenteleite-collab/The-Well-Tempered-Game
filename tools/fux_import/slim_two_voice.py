"""
The two-voice dataset as the game loads it (housekeeping after D155): the canonical
data/fux/two-voice/fux-two-voice.json less the MusicXML locator of every note (file, divisions,
duration...), which the game never reads; 0.4 MB of the single-file page. The notes, solutions,
annotations and provenance are unchanged. test/fux-dataset.test.ts checks the two agree.

Usage: python3 tools/fux_import/slim_two_voice.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/fux/two-voice/fux-two-voice.json"
OUT = ROOT / "data/fux/two-voice/fux-two-voice.game.json"


def slim(x, in_notes: bool = False):
    if isinstance(x, dict):
        return {k: slim(v, k == "notes") for k, v in x.items() if not (in_notes and k == "musicxml")}
    if isinstance(x, list):
        return [slim(v, in_notes) for v in x]
    return x


def main() -> None:
    data = json.loads(SRC.read_text())
    OUT.write_text(json.dumps(slim(data), ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
