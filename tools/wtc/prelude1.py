#!/usr/bin/env python3
"""Prelude 1 in C (BWV 846/1): the harmonic plan, from a public-domain source.

Source: the Mutopia Project edition (data/wtc/sources/mutopia/wtk1-prelude1.ly; typeset by Shay
Rojansky, Han-Wen Nienhuys, Tobias Erbsland, Javier Ruiz-Alma; "placed in the public domain by the
typesetter"), so the notes may be committed and used by the game, unlike the Humdrum encodings.

The prelude is one figuration applied to a chord per bar: bass (half note), tenor (entering a
sixteenth late, held), and three upper notes in sixteenths, the half bar repeated. So a bar is five
pitches; the piece, in bars 1-32, is 32 five-note chords. Bars 33-35 are the coda (the figuration
breaks off over the tonic pedal).

For each bar: the five pitches; the thoroughbass figures (intervals above the bass, as a continuo
player would read them); the fundamental (the WTC reader, tools/wtc/harmony.py, reading the
bar's notes). Cross-checked against the Humdrum edition (local, when present).

Output: data/wtc/prelude1.json. Run: python3 tools/wtc/prelude1.py
"""
from __future__ import annotations

import json
import re
import sys
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harmony as H  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "wtc" / "sources" / "mutopia" / "wtk1-prelude1.ly"
OUT = ROOT / "data" / "wtc" / "prelude1.json"
LOCAL = ROOT / "data" / "local" / "wtc" / "wtc1p01.json"
STEPS = "CDEFGAB"
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
LY = re.compile(r"([a-g])((?:is|es|s)*)(!?)([',]*)")


def ly_pitch(tok: str, shift: int = 0) -> str:
    m = LY.fullmatch(tok)
    step, acc, _, octs = m.groups()
    alter = acc.count("is") - acc.count("es") - (1 if acc in ("s",) else 0)
    if step in "ae" and acc.startswith("s"):  # as, es
        alter = -1 - acc[1:].count("es")
    octave = 3 + octs.count("'") - octs.count(",") + shift
    return step.upper() + ("#" * alter if alter > 0 else "b" * -alter) + str(octave)


def midi(p: str) -> int:
    alter = p.count("#") - p.count("b")
    return 12 * (int(p.lstrip("ABCDEFG#b")) + 1) + PC[p[0]] + alter


def bars_of(block: str) -> list[str]:
    return [b.strip() for b in block.split("|") if re.search(r"[a-g]", b)]


def notes_in(bar: str) -> list[str]:
    toks = re.findall(r"(?<![\\a-z])([a-g](?:is|es|s)*!?[',]*)(?=\d|\[|\]|\s|~|$)", bar)
    return toks


def figures(pitches: list[str]) -> list[int]:
    bass = pitches[0]
    b = STEPS.index(bass[0]) + 7 * int(bass.lstrip("ABCDEFG#b"))
    out = set()
    for p in pitches[1:]:
        d = STEPS.index(p[0]) + 7 * int(p.lstrip("ABCDEFG#b")) - b
        g = d % 7 + 1
        out.add(8 if g == 1 and d > 0 else g)
    return sorted(out, reverse=True)


def fundamental(p: list[str]) -> dict:
    """The fundamental of a bar, read from one half bar of the figuration (tools/wtc/harmony.py,
    with the parameters fitted there)."""
    import numpy as np
    notes = [{"on": F(0), "off": F(1, 2), "step": H.spell(p[0])[0], "pc": H.spell(p[0])[1], "midi": midi(p[0]), "emb": False},
             {"on": F(1, 16), "off": F(1, 2), "step": H.spell(p[1])[0], "pc": H.spell(p[1])[1], "midi": midi(p[1]), "emb": False}]
    for k, q in enumerate(p[2:] * 2):
        on = F(1, 8) + F(k, 16)
        notes.append({"on": on, "off": on + F(1, 16), "step": H.spell(q)[0], "pc": H.spell(q)[1], "midi": midi(q), "emb": False})
    rows, _ = H.candidates(notes, F(0), F(1, 2))
    X = np.array([r["f"] for r in rows], dtype=float)
    best = rows[int(np.argmax(X @ H.weights(1.5, 0.25, 0.25, 0.15, 0.0, 0.0, 0.8, 1.0)))]
    return {"root": H.name(best["root_step"], best["root_pc"]), "chord": best["quality"]}


def main() -> None:
    text = SRC.read_text()
    right = text[text.index("right = {"):text.index("left = {")]
    left = text[text.index("left = {"):text.index("\\score")]
    rbars = bars_of(right[right.index("\\tempo"):])
    upper_l, lower_l = left.split("\\\\")
    tbars = bars_of(upper_l[upper_l.index("<<") + 2:])
    bbars = bars_of(lower_l)
    plan = []
    for i in range(32):
        r = [ly_pitch(t, 1) for t in notes_in(rbars[i])][:3]
        t = ly_pitch(notes_in(tbars[i])[0])
        b = ly_pitch(notes_in(bbars[i])[0])
        pitches = [b, t] + r
        plan.append({"bar": i + 1, "pitches": pitches, "figures": figures(pitches)})
    for x in plan:
        x["fundamental"] = fundamental(x["pitches"])
    # the choices of the game (level 1: the harmonic plan). For each bar, Bach's chord and up to three
    # others over the same bass, all from Bach's own vocabulary in this prelude: the upper voices of
    # the bar before (the harmony held over a new bass), of the bar after (the harmony anticipated), of the bars two
    # before and after,
    # and of any other bar on the same bass note. A choice is the five pitches.
    for i, x in enumerate(plan):
        bass = x["pitches"][0]
        opts = [x["pitches"]]
        cands = []
        for j in (i - 1, i + 1, i - 2, i + 2):
            if 0 <= j < len(plan):
                cands.append([bass] + plan[j]["pitches"][1:])
        cands += [y["pitches"] for y in plan if y["pitches"][0] == bass]
        for c in cands:
            ups = c[1:]
            if any(midi(u) <= midi(bass) for u in ups):
                continue  # an upper voice at or below the bass
            if c not in opts and len(opts) < 4:
                opts.append(c)
        # a stable, not alphabetical, order: by the sum of the upper pitches (Bach's not always first)
        opts.sort(key=lambda c: (sum(midi(u) for u in c[1:]), c))
        x["choices"] = [{"pitches": c, "figures": figures(c), "fundamental": fundamental(c), "bach": c == x["pitches"]} for c in opts]
    # cross-check with the Humdrum edition (local)
    check = "Humdrum edition not present (tools/wtc/fetch_wtc.sh)"
    if LOCAL.exists():
        piece = json.loads(LOCAL.read_text())
        diffs = []
        for x in plan:
            got = sorted({n["midi"] for n in piece["notes"] if n["pitch"] and n["measure"] == x["bar"]})
            if got != sorted({midi(p) for p in x["pitches"]}):
                diffs.append(x["bar"])
        check = f"Humdrum edition: {32 - len(diffs)} of 32 bars have the same pitches" + (f"; differ: {diffs}" if diffs else "")
    out = {"source": "Mutopia Project, BWV 846 Prelude (public domain); tools/wtc/prelude1.py",
           "figuration": {"meter": "4/4", "half_bar": [
               {"voice": 0, "onset": "0", "duration": "1/2"},
               {"voice": 1, "onset": "1/16", "duration": "7/16"},
               *[{"voice": 2 + k % 3, "onset": str(F(1, 8) + F(k, 16)), "duration": "1/16"} for k in range(6)]],
               "repeat": "each bar plays the half bar twice"},
           "check": check, "bars": plan}
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    print(check)
    for x in plan:
        print(x["bar"], " ".join(x["pitches"]), x["figures"], x["fundamental"]["root"], x["fundamental"]["chord"], len(x["choices"]))


if __name__ == "__main__":
    main()
