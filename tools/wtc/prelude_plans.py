#!/usr/bin/env python3
"""Level P1 (the harmonic plan) for the figuration preludes after Prelude 1: 1/2, 1/5, 1/6.

docs/wtc/PRELUDES.md measured them: each repeats one pattern in most of its bars. From the
public-domain Mutopia editions (tools/wtc/lily.py; checked against Humdrum in docs/wtc/MUTOPIA.md):

  the pattern  the commonest bar: its notes as (hand, voice, onset in the bar, duration);
  a figured bar  a bar with exactly that pattern; its content is the pitch in each place of the
               pattern, the left hand's places and the right hand's;
  a free bar   any other (the opening, the cadenzas, the coda): played as Bach wrote it.

For each figured bar the player chooses its harmony from up to four: Bach's bar, and the right
hand of a neighbouring figured bar (one or two before or after: the harmony held or anticipated)
over this bar's left hand, as for Prelude 1 (there, the upper voices over this bar's bass). Each
option's fundamental is read by the WTC harmonic reader (tools/wtc/harmony.py).

Output: data/wtc/preludes/wtc1pNN.json. Run: python3 tools/wtc/prelude_plans.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harmony as H  # noqa: E402
import lily  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "wtc" / "sources" / "mutopia" / "BachJS"
OUT = ROOT / "data" / "wtc" / "preludes"
PIECES = {
    "wtc1p02": ("BWV847/bwv847a/bwv847a.ly", "Prelude 2 in C minor, BWV 847"),
    "wtc1p05": ("BWV850/bwv850a/bwv850a-lys/bwv850a.ly", "Prelude 5 in D major, BWV 850"),
    "wtc1p06": ("BWV851/bwv851a/bwv851a.ly", "Prelude 6 in D minor, BWV 851"),
}
WEIGHTS = H.weights(1.5, 0.25, 0.25, 0.15, 0.0, 0.0, 0.8, 1.0)
fr = lambda x: f"{x.numerator}/{x.denominator}"  # noqa: E731


def fundamental(notes: list[dict], start: F, end: F) -> dict:
    ns = [{"on": n["on"], "off": n["off"], "step": H.spell(n["pitch"])[0], "pc": H.spell(n["pitch"])[1], "midi": n["midi"], "spine": n["voice"]} for n in notes]
    H.mark_embellishing(ns)
    rows, _ = H.candidates(ns, start, end)
    if not rows:
        return {"root": "?", "chord": "?"}
    X = np.array([r["f"] for r in rows], dtype=float)
    best = rows[int(np.argmax(X @ WEIGHTS))]
    return {"root": H.name(best["root_step"], best["root_pc"]), "chord": best["quality"]}


def build(pid: str, rel: str, title: str) -> dict:
    sc = lily.read(SRC / rel)
    starts = {}
    for m in sc.measures:
        starts.setdefault(m["number"], m["onset"])
    bars = defaultdict(list)
    for n in sc.notes:
        if not n["grace"]:
            bars[n["measure"]].append(n)
    numbers = sorted(bars)
    ends = {b: (starts[numbers[k + 1]] if k + 1 < len(numbers) else sc.length) for k, b in enumerate(numbers)}

    def key(n, b):
        return (n["part"] != "lower", n["voice"], n["onset"] - starts[b], n["duration"])

    pats = Counter(tuple(sorted(key(n, b) for n in bars[b])) for b in numbers)
    pattern = pats.most_common(1)[0][0]
    out_bars = []
    content = {}
    for b in numbers:
        ns = sorted(bars[b], key=lambda n: key(n, b))
        if tuple(key(n, b) for n in ns) == pattern:
            content[b] = [n["pitch"] for n in ns]
    lower = [i for i, k in enumerate(pattern) if not k[0]]  # the left hand's places (part == lower first)
    figured = [b for b in numbers if b in content]
    for b in numbers:
        t0, t1 = starts[b], ends[b]
        if b not in content:
            out_bars.append({"bar": b, "onset": fr(t0), "length": fr(t1 - t0), "figured": False,
                             "notes": [{"onset": fr(n["onset"] - t0), "duration": fr(n["duration"]), "pitch": n["pitch"]} for n in sorted(bars[b], key=lambda n: (n["onset"], n["midi"]))]})
            continue
        k = figured.index(b)
        bach = content[b]
        opts = [bach]
        for d in (-1, 1, -2, 2):
            j = k + d
            if 0 <= j < len(figured):
                other = content[figured[j]]
                cand = [bach[i] if i in lower else other[i] for i in range(len(pattern))]
                if cand not in opts and len(opts) < 4:
                    opts.append(cand)
        choices = []
        for o in sorted(opts, key=lambda c: [lily_midi(p) for p in c]):
            notes = [{"on": t0 + pattern[i][2], "off": t0 + pattern[i][2] + pattern[i][3], "pitch": p, "midi": lily_midi(p), "voice": f"{pattern[i][0]}{pattern[i][1]}"} for i, p in enumerate(o)]
            choices.append({"pitches": o, "bach": o == bach, "fundamental": fundamental(notes, t0, t1)})
        out_bars.append({"bar": b, "onset": fr(t0), "length": fr(t1 - t0), "figured": True, "choices": choices})
    return {"id": pid, "title": title, "source": f"Mutopia Project, {rel} (public domain); tools/wtc/prelude_plans.py",
            "pattern": [{"hand": "upper" if k[0] else "lower", "onset": fr(k[2]), "duration": fr(k[3])} for k in pattern],
            "bars": out_bars}


def lily_midi(p: str) -> int:
    step, rest = p[0], p[1:]
    alter = rest.count("#") - rest.count("b")
    return 12 * (int(rest.lstrip("#b")) + 1) + H.PC[step] + alter


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for pid, (rel, title) in PIECES.items():
        d = build(pid, rel, title)
        (OUT / f"{pid}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")) + "\n")
        fig = [b for b in d["bars"] if b["figured"]]
        print(pid, len(d["bars"]), "bars,", len(fig), "figured; choices", Counter(len(b["choices"]) for b in fig), "pattern notes", len(d["pattern"]))


if __name__ == "__main__":
    main()
