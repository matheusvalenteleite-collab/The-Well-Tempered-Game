#!/usr/bin/env python3
"""Bach's other fugues (D160), LilyPond part: the Mutopia editions of the Art of Fugue
(Contrapuncti I-X) and of the fugue of BWV 903, read by lily.py, written as notes per voice
(quarters) to data/wtc/more-ly.json for tools/wtc/import-more.ts.

Voices: in the string-ensemble scores, a staff per voice (top first, as printed); divisi and chords
in a staff go to a sub-line. BWV 903 is a keyboard score: its middle voice moves between the
staves (Mutopia's upper:2 and lower:1), and is joined back into one."""
import json, sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lily import read  # noqa: E402

SRC = Path("data/sources/bach-fugues-more/mutopia")
PIECES = [(f"aof{i:02d}", f"contrapunctus{r}.ly", "d", None) for i, r in enumerate("I II III IV V VI VII VIII IX X XI".split(), 1)]
# The unfinished fugue (Contrapunctus XIV in the modern numbering) is Mutopia's "Contrapunctus XIX, Fuga a 3
# Soggetti", after the Bach-Gesellschaft's numbering (the canons there are XII-XV).
PIECES.append(("aof14", "contrapunctusXIX.ly", "d", None))
PIECES.append(("bwv903f", "bwv903fug.ly", "d", [["upper:1"], ["upper:2", "lower:1"], ["lower:2"]]))


def quarters(x: Fraction) -> float:
    return float(x * 4)


def main() -> None:
    out = {}
    for pid, f, key, groups in PIECES:
        # Contrapunctus I's file holds the parts' variables as scores; its last score is the whole.
        sc = read(SRC / f, 0)
        if pid == "aof01":
            sc = read(SRC / f, 4)
        notes = [n for n in sc.notes if not n.get("grace")]
        if groups is None:
            staves = sorted({n["voice"].split(":")[0].split("/")[0] for n in notes}, key=lambda s: int("".join(c for c in s if c.isdigit()) or 0))
            groups = [[s] for s in staves]
        voices = []
        for g in groups:
            ns = sorted((n for n in notes if any(n["voice"] == v or n["voice"].startswith(v + ":") or n["voice"].startswith(v + "/") for v in g)), key=lambda n: (n["onset"], -n["midi"]))
            line, end, main = [], Fraction(-1), []
            for n in ns:
                sub = 0 if n["onset"] >= end else 1
                if sub == 0:
                    end = n["onset"] + n["duration"]
                line.append([quarters(n["onset"]), quarters(n["duration"]), n["pitch"], sub])
            voices.append(line)
        # Top first: by mean pitch of the main line.
        def mean(v):
            m = [x for x in v if x[3] == 0]
            from statistics import fmean
            return fmean(int(_midi(x[2])) for x in m) if m else 0
        voices.sort(key=mean, reverse=True)
        ts = sc.time_signatures[0]["text"] if sc.time_signatures else "4/4"
        out[pid] = {"key": key, "meter": ts, "length": quarters(sc.length), "partial": quarters(sc.partial) if sc.partial else 0,
                    "bars": [{"n": m["number"], "on": quarters(m["onset"])} for m in sc.measures], "voices": voices, "warnings": sc.warnings}
        print(pid, ts, len(voices), [len(v) for v in voices], sc.warnings[:2])
    Path("data/wtc/more-ly.json").write_text(json.dumps(out))


def _midi(p: str) -> int:
    steps = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    alter = p.count("#") - p[1:].count("b")
    octave = int(p.lstrip("ABCDEFG#b"))
    return 12 * (octave + 1) + steps[p[0]] + alter


if __name__ == "__main__":
    main()
