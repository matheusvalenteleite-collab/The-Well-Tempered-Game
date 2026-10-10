#!/usr/bin/env python3
"""The 48 fugues from Kyle Rother's open-score edition (CC BY 4.0; data/wtc/sources/open-score/SOURCE.md),
read with tools/wtc/lily.py, into the corpus format of data/wtc/fugues.json (src/wtc/corpus.ts): voices
top first, each a list of [onset, duration, pitch, sub] in ticks (1920 a quarter), the main line sub 0 and
the other notes of a chord in one voice sub 1, 2...; bars; length. Key, mode, BWV and metre are taken
from the Humdrum-derived corpus, which names the same pieces.

It then compares the two editions, attack by attack (onset and pitch, all voices together, and voice by
voice), bar by bar, and writes data/wtc/fugues-open.json and docs/wtc/open-score-check.md.

Usage: python3 tools/wtc/open_import.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import re  # noqa: E402

from lily import parse  # noqa: E402

TPQ = 1920
SRC = ROOT / "data" / "wtc" / "sources" / "open-score"
# Engraving slips in the edition, corrected at the note where they begin (in \relative, every later note of
# the voice follows): (book, number): (text, corrected text, reason).
PATCHES = {
    (1, 4): ("r2 cis | % m. 25", "r2 cis, | % m. 25",
             "the mezzo's re-entry after its rests, written a third above the A sharp before them, puts the rest of the voice an octave too high (C sharp 5, above the alto); the Bach-Gesellschaft and the voice's range have C sharp 4"),
}
humdrum = {p["id"]: p for p in json.loads((ROOT / "data" / "wtc" / "fugues.json").read_text())}


def ticks(x: F) -> int:
    t = x * 4 * TPQ
    return int(t) if t.denominator == 1 else round(float(t))


def piece(book: int, number: int) -> dict:
    path = SRC / f"book{book}" / f"fugue{number:02d}.ly"
    # \set Score.timeSignatureFraction only changes the printed signature (Book II no. 9: 2/2 printed
    # over breve bars); the reader does not know it, so it is dropped here.
    text = re.sub(r"\\set\s+Score\.timeSignatureFraction\s*=\s*\S+", "", path.read_text(encoding="utf-8", errors="replace"))
    # An octave mark written apart from its note ("dis ,", Book I no. 8, b. 60) belongs to the note: the
    # editor's intent, and Humdrum's reading.
    text = re.sub(r"(?<![\\\w])([a-g](?:isis|eses|is|es)?)\s+([,']+)(?=[\s\d|~.\]>)])", r"\1\2", text)
    for (b, n), (old, fix, why) in PATCHES.items():
        if (b, n) == (book, number):
            assert text.count(old) == 1, (book, number, old)
            text = text.replace(old, fix)
    s = parse(text, str(path), path.parent)
    staves = [st for st in s.staves if any(n["part"] == st for n in s.notes)]
    if len(staves) < 2:
        # Staves named in a \with block (Book I no. 10) leave the reader's own part names: take those,
        # the highest first.
        parts = {n["part"] for n in s.notes}
        mean = {pt: sum(n["midi"] for n in s.notes if n["part"] == pt) / sum(1 for n in s.notes if n["part"] == pt) for pt in parts}
        staves = sorted(parts, key=lambda pt: -mean[pt])
    voices = []
    for st in staves:
        ns = sorted((n for n in s.notes if n["part"] == st and not n["grace"]), key=lambda n: (n["onset"], -n["midi"]))
        out = []
        prev = None
        by_onset = defaultdict(list)
        for n in ns:
            by_onset[n["onset"]].append(n)
        for on in sorted(by_onset):
            group = by_onset[on]
            # The main line: in a chord, the note nearest the line's previous note.
            main = min(group, key=lambda n: abs(n["midi"] - prev)) if prev is not None else group[0]
            prev = main["midi"]
            out.append([ticks(on), ticks(main["duration"]), main["pitch"], 0])
            for k, n in enumerate(x for x in group if x is not main):
                out.append([ticks(on), ticks(n["duration"]), n["pitch"], k + 1])
        voices.append(out)
    pid = f"wtc{book}f{number:02d}"
    h = humdrum[pid]
    bars = [{"n": m["number"], "on": ticks(m["onset"])} for m in s.measures]
    return {
        "id": pid, "book": book, "number": number, "kind": "fugue", "key": h["key"], "mode": h["mode"],
        "bwv": h["bwv"], "meter": h["meter"], "voices": voices, "bars": bars, "length": ticks(s.length),
        "staves": staves, "warnings": s.warnings,
    }


def attacks(p: dict, by_voice: bool) -> Counter:
    c = Counter()
    for v, voice in enumerate(p["voices"]):
        for on, dur, pitch, sub in voice:
            c[(v if by_voice else 0, on, pitch)] += 1
    return c


def bar_of(p: dict, t: int) -> int:
    n = 1
    for b in p["bars"]:
        if b["on"] <= t:
            n = b["n"]
    return n


rows = []
out = []
for book in (1, 2):
    for number in range(1, 25):
        o = piece(book, number)
        h = humdrum[o["id"]]
        out.append({k: v for k, v in o.items() if k not in ("staves", "warnings")})
        a, b = attacks(o, False), attacks(h, False)
        same = sum((a & b).values())
        # Bars where every attack (onset, pitch) is the same in both.
        diff_bars = set()
        for (v, on, pitch), k in (a - b).items():
            diff_bars.add(bar_of(h, on))
        for (v, on, pitch), k in (b - a).items():
            diff_bars.add(bar_of(h, on))
        nbars = len(h["bars"])
        # Voice by voice: the open score's voices against Humdrum's, in order.
        av, bv = attacks(o, True), attacks(h, True)
        voice_same = sum((av & bv).values())
        rows.append((o["id"], len(o["voices"]), len(h["voices"]), sum(a.values()), sum(b.values()), same, nbars - len(diff_bars), nbars, voice_same, sorted(diff_bars)[:8], o["warnings"]))

(ROOT / "data" / "wtc" / "fugues-open.json").write_text(json.dumps(out, separators=(",", ":")))

tot_a = sum(r[3] for r in rows)
tot_b = sum(r[4] for r in rows)
tot_same = sum(r[5] for r in rows)
tot_vs = sum(r[8] for r in rows)
tot_bars = sum(r[7] for r in rows)
tot_ok = sum(r[6] for r in rows)
lines = [
    "# The open-score edition checked against the Humdrum encoding",
    "",
    "Generated by `python3 tools/wtc/open_import.py`. The 48 fugues of Kyle Rother's open-score edition",
    "(University of Cape Town, 2015, CC BY 4.0; data/wtc/sources/open-score/SOURCE.md), from the Bach-Gesellschaft",
    "text, read with tools/wtc/lily.py into data/wtc/fugues-open.json, against data/wtc/fugues.json (David",
    "Huron's Humdrum encoding, whose rights to derivative electronic formats are reserved).",
    "",
    f"- **Attacks** (onset and spelled pitch): {tot_same} of {tot_b} Humdrum attacks found in the open score "
    f"({100 * tot_same / tot_b:.1f}%); the open score has {tot_a}.",
    f"- **Voice by voice** (the same attack in the same voice, voices top first): {tot_vs} ({100 * tot_vs / tot_b:.1f}%).",
    f"- **Bars identical** in every attack: {tot_ok} of {tot_bars} ({100 * tot_ok / tot_bars:.1f}%).",
    "",
    "| fugue | voices (open / Humdrum) | attacks (open / Humdrum) | same | same voice | identical bars | first differing bars |",
    "|---|---|---|---|---|---|---|",
]
for (pid, vo, vh, na, nb, same, okb, nbars, vs, diffs, warns) in rows:
    lines.append(f"| {pid} | {vo} / {vh} | {na} / {nb} | {100 * same / nb:.0f}% | {100 * vs / nb:.0f}% | {okb}/{nbars} | {', '.join(map(str, diffs)) or '–'} |")
lines += ["", ""]
(ROOT / "docs" / "wtc" / "open-score-check.md").write_text("\n".join(lines))
print("\n".join(lines[7:11]))
