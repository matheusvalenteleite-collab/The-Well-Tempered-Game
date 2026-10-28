#!/usr/bin/env python3
"""D340: a Mutopia LilyPond file read by tools/wtc/lily.py, printed as one JSON object for
tools/touch/more-bach.ts: the notes (onset and duration in whole notes as "n/d"; spelled pitch, MIDI,
voice, staff, part, grace; D366: the ornament signs and the grace's kind), the bars, the time signatures, the anacrusis and the length.

    python3 -I tools/touch/lily_json.py FILE.ly [SCORE] [--as-written]

SCORE picks a \\score in a file holding several (the concerto's movements). --as-written plays each
\\repeat volta once, as the score is printed and as LilyPond's own MIDI plays it (lily.py unfolds
them), so the notes line up with the edition's MIDI file.
"""
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "wtc"))
import lily  # noqa: E402


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_written = "--as-written" in sys.argv
    path = Path(args[0])
    score = int(args[1]) if len(args) > 1 else 0
    text = path.read_text(encoding="utf-8", errors="replace")
    if as_written:
        text = re.sub(r"\\repeat\s+volta\s+\d+", r"\\repeat volta 1", text)
    s = lily.parse(text, str(path), path.parent, score)
    fr = lambda x: f"{Fraction(x).numerator}/{Fraction(x).denominator}"  # noqa: E731
    print(json.dumps({
        "notes": [{"on": fr(n["onset"]), "dur": fr(n["duration"]), "pitch": n["pitch"], "midi": n["midi"],
                   "voice": n["voice"], "staff": n["staff"], "part": n["part"], "grace": bool(n["grace"]),
                   **({"orn": n["orn"]} if n.get("orn") else {}),
                   **({"graceKind": n["grace_kind"]} if n.get("grace_kind") else {}),
                   **({"host": n["host"]} if n.get("host") else {})} for n in s.notes],
        "measures": [{"n": m["number"], "on": fr(m["onset"])} for m in s.measures],
        "times": [{"on": fr(t["onset"]), "text": t["text"]} for t in s.time_signatures],
        "partial": fr(s.partial) if s.partial else None,
        "length": fr(s.length),
        "staves": s.staves,
        "warnings": s.warnings,
    }))


if __name__ == "__main__":
    main()
