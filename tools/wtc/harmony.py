#!/usr/bin/env python3
"""A harmonic reader for the Well-Tempered Clavier, measured against human analyses.

The chorale reader (tools/chorales/kirnberger.py) reads four-part sonorities, one note per voice.
The WTC is figuration: a chord is spread over a span (Prelude 1 in C sounds each harmony as an
arpeggio across a bar), and the span holds passing and neighbour notes besides. So the question
changes from "which chord do these four notes form?" to "which fundamental chord does this span
of notes unfold, and which of its notes are incidental?" (Kirnberger's essential/incidental
distinction applied to time rather than to a vertical).

The reading. For a span, every sounding note weighs its duration within the span (more if it
sounds at the span's start). For every candidate fundamental, a note present in the span taken as
root, and every chord on it (four triads, five seventh chords; members by letter, so spelling
decides: C-E-G# is augmented, C-E-Ab is not a chord), the score is

    weight of the members - weight of the other notes (incidental)
    - a  if the third is missing  - b  if the fifth is missing
    + c  if the bass (the lowest note at the span's start) is the root
    - d  for a seventh chord (the seventh is a dissonance: the reading needs it to be heard)
    - f  if the bass is not a member (the thoroughbass assumption: the bass bears the harmony)
    - g  for an augmented triad (a dissonant triad, rare as a harmony in Bach)

where an embellishing note (short, off the beat, approached and left by step: a passing or
neighbour note, Kirnberger's incidental dissonance in its commonest form) weighs (1 - h).

and the best-scoring chord is the reading. the parameters a to h are not guessed: they
are fitted on the human analyses, and the fit is tested by leaving one piece out (fit on the
other 30, measure on the one left out), the choices-lab method.

The yardstick: the When in Rome analyses (Gotham et al., CC BY-SA 4.0; tools/wtc/fetch_wir.sh) of
the 24 preludes of Book I and of seven fugues. Their segmentation is taken as given (where the
analyst puts a chord change); what is measured is whether the reader finds the same fundamental
(root) in each segment, and the same seventh or triad. Baseline: the lowest note at the segment's
start taken as the root (the bass read as fundamental, as without figures).

Output: docs/wtc/HARMONY.md (agreement, by piece, and the disagreements by kind); counts only.

Run:  python3 tools/wtc/fetch_wir.sh && python3 tools/wtc/harmony.py
"""
from __future__ import annotations

import json
import re
import warnings
from collections import Counter, defaultdict
from fractions import Fraction as F
from itertools import product
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / "data" / "local" / "wtc"
WIR = ROOT / "data" / "local" / "sources" / "when-in-rome" / "Corpus" / "Keyboard_Other" / "Bach,_Johann_Sebastian"
REPORT = ROOT / "docs" / "wtc" / "HARMONY.md"
STEPS = "CDEFGAB"
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

# members above the root: (letters up, semitones up)
QUALITIES = {
    "major": [(2, 4), (4, 7)], "minor": [(2, 3), (4, 7)], "diminished": [(2, 3), (4, 6)], "augmented": [(2, 4), (4, 8)],
    "dominant seventh": [(2, 4), (4, 7), (6, 10)], "minor seventh": [(2, 3), (4, 7), (6, 10)],
    "half-diminished seventh": [(2, 3), (4, 6), (6, 10)], "diminished seventh": [(2, 3), (4, 6), (6, 9)],
    "major seventh": [(2, 4), (4, 7), (6, 11)],
}
FEATURES = ["P", "Ps", "N", "Ns", "miss3", "miss5", "bassroot", "seventh", "bassforeign", "Pemb", "Nemb", "augmented"]


def spell(p: str) -> tuple[int, int]:
    """(letter index, pitch class) of 'F#4' / 'Bb3'."""
    step, rest = p[0], p[1:]
    alter = rest.count("#") - rest.count("b")
    return STEPS.index(step), (PC[step] + alter) % 12


def name(step: int, pc: int) -> str:
    alter = (pc - PC[STEPS[step]] + 6) % 12 - 6
    return STEPS[step] + ("#" * alter if alter > 0 else "b" * -alter)


def wir_pieces() -> list[tuple[str, Path]]:
    out = []
    for f in sorted(WIR.glob("*/*/analysis.txt")):
        book = 1 if f.parts[-3].endswith("_I") else 2
        m = re.match(r"(\d\d)(_fugue)?$", f.parts[-2])
        out.append((f"wtc{book}{'f' if m.group(2) else 'p'}{m.group(1)}", f))
    return out


def wir_spans(path: Path, piece: dict) -> list[dict]:
    from music21 import converter, roman
    warnings.filterwarnings("ignore")
    s = converter.parse(str(path), format="romantext")
    bars = {}
    for m in piece["measures"]:
        bars.setdefault(m["number"], F(m["onset"]))
    rns = list(s.recurse().getElementsByClass(roman.RomanNumeral))
    spans = []
    for r in rns:
        if r.measureNumber not in bars:
            continue
        t = bars[r.measureNumber] + F(r.offset).limit_denominator(96) / 4
        spans.append({"t": t, "figure": r.figure, "key": r.key.tonicPitchNameWithCase, "root_pc": r.root().pitchClass,
                      "seventh": r.seventh is not None, "inversion": r.inversion(), "measure": r.measureNumber})
    spans.sort(key=lambda x: x["t"])
    end = F(piece["length"])
    for a, b in zip(spans, spans[1:] + [{"t": end}]):
        a["u"] = b["t"]
    return [x for x in spans if x["u"] > x["t"]]


def candidates(notes: list[dict], t: F, u: F) -> tuple[list[dict], int | None]:
    """Feature rows, one per (root, quality), for the notes sounding in [t, u)."""
    present = []
    for n in notes:
        on, off = n["on"], n["off"]
        if off <= t or on >= u:
            continue
        w = float((min(off, u) - max(on, t)) / (u - t))
        present.append((n["step"], n["pc"], w, on <= t, n["midi"], n["emb"]))
    if not present:
        return [], None
    at_start = [x for x in present if x[3]] or present
    bass = min(at_start, key=lambda x: x[4])
    rows = []
    for rstep, rpc in {(x[0], x[1]) for x in present}:
        for q, members in QUALITIES.items():
            P = Ps = N = Ns = 0.0
            have = set()
            bass_member = False
            Pe = Ne = 0.0
            for step, pc, w, st, mid, emb in present:
                g, s = (step - rstep) % 7, (pc - rpc) % 12
                if g == 0 and s == 0:
                    role = 0
                else:
                    role = next((gg for gg, ss in members if gg == g and ss == s), None)
                if role is None:
                    N += w
                    Ns += w * st
                    Ne += w * emb
                else:
                    have.add(role)
                    P += w
                    Ps += w * st
                    Pe += w * emb
                    bass_member |= (step, pc, mid, st) == (bass[0], bass[1], bass[4], bass[3])
            rows.append({"root_pc": rpc, "root_step": rstep, "quality": q,
                         "f": [P, Ps, N, Ns, 2 not in have, 4 not in have, (bass[0], bass[1]) == (rstep, rpc), len(members) == 3, not bass_member, Pe, Ne, q == "augmented"]})
    return rows, bass[1]


def mark_embellishing(notes: list[dict]) -> None:
    """A note is embellishing (a candidate incidental note: passing or neighbour) when it is short
    (an eighth or less), approached and left by step in its own line, and does not begin on a beat
    (a quarter-note position)."""
    lines = defaultdict(list)
    for n in notes:
        lines[n["spine"]].append(n)
    for line in lines.values():
        line.sort(key=lambda n: n["on"])
        for i, n in enumerate(line):
            n["emb"] = False
            if 0 < i < len(line) - 1 and n["off"] - n["on"] <= F(1, 8) and (n["on"] * 4).denominator != 1:
                a, b = line[i - 1], line[i + 1]
                if a["off"] == n["on"] and n["off"] == b["on"] and abs(a["midi"] - n["midi"]) <= 2 and abs(b["midi"] - n["midi"]) <= 2:
                    n["emb"] = True


def build() -> list[dict]:
    pieces = []
    for pid, path in wir_pieces():
        piece = json.loads((LOCAL / f"{pid}.json").read_text())
        notes = [{"on": F(n["onset"]), "off": F(n["onset"]) + F(n["duration"]), "step": spell(n["pitch"])[0], "pc": spell(n["pitch"])[1], "midi": n["midi"], "spine": n["spine"]}
                 for n in piece["notes"] if n["pitch"] and not n.get("grace") and F(n["duration"]) > 0]
        mark_embellishing(notes)
        spans = wir_spans(path, piece)
        for sp in spans:
            sp["rows"], sp["bass_pc"] = candidates(notes, sp["t"], sp["u"])
        pieces.append({"id": pid, "spans": [s for s in spans if s["rows"]], "bars": piece["measures"][-1]["number"]})
    return pieces


def weights(a, b, c, d, e, f, h, g) -> np.ndarray:
    # score = P + e*Ps - N - e*Ns - a*miss3 - b*miss5 + c*bassroot - d*seventh - f*bassforeign
    #         - h*(Pemb - Nemb): embellishing notes count (1 - h) as much, member or not
    #         - g*augmented
    return np.array([1, e, -1, -e, -a, -b, c, -d, -f, -h, h, -g], dtype=float)


GRID = list(product([0.5, 1.0, 1.5, 2.0], [0.0, 0.25], [0.0, 0.25, 0.5], [0.05, 0.15, 0.3], [0.0, 0.5], [0.0, 0.25], [0.5, 0.8, 1.0], [0.0, 0.25, 1.0]))
WGRID = np.stack([weights(*g) for g in GRID], axis=1)  # features x grid


def matrices(pieces):
    for p in pieces:
        for sp in p["spans"]:
            sp["X"] = np.array([r["f"] for r in sp["rows"]], dtype=float)
        p["hits"] = hits(p)


def predict(sp, w):
    return sp["rows"][int(np.argmax(sp["X"] @ w))]


def score(pieces, w) -> tuple[int, int]:
    ok = tot = 0
    for p in pieces:
        for sp in p["spans"]:
            ok += predict(sp, w)["root_pc"] == sp["root_pc"]
            tot += 1
    return ok, tot


def hits(piece) -> np.ndarray:
    """For one piece: how many segments each grid point reads right."""
    h = np.zeros(len(GRID), dtype=int)
    for sp in piece["spans"]:
        choice = np.argmax(sp["X"] @ WGRID, axis=0)
        right = np.array([r["root_pc"] == sp["root_pc"] for r in sp["rows"]])
        h += right[choice]
    return h


def fit(pieces):
    return GRID[int(np.argmax(sum(p["hits"] for p in pieces)))]


def main() -> None:
    pieces = build()
    matrices(pieces)
    total = sum(len(p["spans"]) for p in pieces)
    base_ok = sum(sp["bass_pc"] == sp["root_pc"] for p in pieces for sp in p["spans"])
    g_all = fit(pieces)
    w_all = weights(*g_all)
    in_ok, _ = score(pieces, w_all)
    # leave one piece out
    loo = {}
    for i, p in enumerate(pieces):
        rest = pieces[:i] + pieces[i + 1:]
        g = fit(rest)
        loo[p["id"]] = (score([p], weights(*g)), g)
    loo_ok = sum(v[0][0] for v in loo.values())
    # disagreements, with the parameters fitted on all
    kinds = Counter()
    sev = Counter()
    by_piece = []
    examples = defaultdict(list)
    for p in pieces:
        ok = 0
        for sp in p["spans"]:
            r = predict(sp, w_all)
            fig = sp["figure"]
            if r["root_pc"] == sp["root_pc"]:
                ok += 1
                sev[("seventh" if sp["seventh"] else "triad", "seventh" if "seventh" in r["quality"] else "triad")] += 1
                continue
            iv = (sp["root_pc"] - r["root_pc"]) % 12
            if re.match(r"^[iIvV]+64$", fig.split("/")[0]) or fig.startswith("Cad64"):
                k = "six-four chord (analyst's root: the 6-4's bass + a fourth; the reader's: the bass)"
            elif "o7" in fig or "o65" in fig or "o43" in fig or "o42" in fig or "o2" in fig:
                k = "diminished seventh / leading-tone chord"
            elif iv == 8 and r["quality"] in ("diminished", "half-diminished seventh", "diminished seventh") and (sp["seventh"] or "V" in fig):
                k = "leading-tone chord against a dominant seventh (the reader omits the dominant's root)"
            elif iv in (3, 9):
                k = "root a third apart (e.g. IV6 against ii, vi against I)"
            elif iv in (5, 7):
                k = "root a fifth apart (e.g. V over a tonic pedal)"
            else:
                k = "root a step or tritone apart"
            kinds[k] += 1
            if len(examples[k]) < 6:
                examples[k].append(f"{p['id']} m{sp['measure']} {sp['key']}: {fig} — reader: {name(r['root_step'], r['root_pc'])} ({r['quality']})")
        by_piece.append((p["id"], ok, len(p["spans"]), loo[p["id"]][0][0]))
    a, b, c, d, e, f, h, g = g_all
    rival = sum(v for k, v in kinds.items() if k.startswith(("six-four", "diminished seventh", "leading-tone")))
    pct = lambda x, n: f"{100 * x / n:.1f}%"  # noqa: E731
    md = ["# A harmonic reader on the WTC, measured against When in Rome", "",
          "Generated by `tools/wtc/harmony.py` (method in its docstring). Yardstick: the human Roman-numeral",
          "analyses of When in Rome (M. Gotham et al., CC BY-SA 4.0; `tools/wtc/fetch_wir.sh`): the 24 preludes of",
          "Book I and fugues I/19, I/22, II/7, II/11, II/16, II/23, II/24. The analyst's segmentation is taken as",
          "given; the question is whether the reader finds the analyst's fundamental (root) in each segment.", "",
          f"**{len(pieces)} pieces, {total} segments.**", "",
          "| reading | root agrees |", "|---|---|",
          f"| baseline: the bass at the segment's start is the root | {base_ok} ({pct(base_ok, total)}) |",
          f"| the reader, parameters fitted on all pieces | {in_ok} ({pct(in_ok, total)}) |",
          f"| the reader, each piece read with parameters fitted on the other {len(pieces) - 1} (leave one out) | {loo_ok} ({pct(loo_ok, total)}) |", "",
          f"Fitted on all: third missing a = {a}, fifth missing b = {b}, bass-as-root c = {c}, seventh d = {d}, start weight e = {e}, bass not a member f = {f}, embellishing discount h = {h}, augmented triad g = {g}.",
          "Parameters chosen in the leave-one-out folds: " + ", ".join(f"{k} × {v}" for k, v in Counter(str(x[1]) for x in loo.values()).most_common(4)) + ".", "",
          f"Of the {total - in_ok} disagreements, {rival} fall where theories of the fundamental differ (six-four",
          "chords, diminished sevenths, leading-tone chords read as dominant sevenths without root; see the last section);",
          f"not all of them are rival readings rather than errors, so counting them as agreements gives an upper bound: {pct(in_ok + rival, total)}.", "",
          "## Triad or seventh (segments where the roots agree)", "",
          "| analyst | reader: triad | reader: seventh |", "|---|---|---|",
          f"| triad | {sev[('triad', 'triad')]} | {sev[('triad', 'seventh')]} |",
          f"| seventh | {sev[('seventh', 'triad')]} | {sev[('seventh', 'seventh')]} |", "",
          "## Where the reader and the analyst differ", "",
          "| kind | segments |", "|---|---|"]
    md += [f"| {k} | {v} |" for k, v in kinds.most_common()]
    md += [""]
    for k, _ in kinds.most_common():
        md += [f"**{k}**", ""] + [f"- {x}" for x in examples[k]] + [""]
    md += ["## By piece", "", "| piece | segments | root agrees (fitted on all) | leave one out |", "|---|---|---|---|"]
    md += [f"| {pid} | {n} | {pct(ok, n)} | {pct(lo, n)} |" for pid, ok, n, lo in by_piece]
    md += ["", "## What the disagreements mean", "",
           "Not every disagreement is the reader's error. The six-four chord is the clearest case: the analyst",
           "writes a cadential I64 (root: the tonic), while a thoroughbass reading puts the fundamental on the bass",
           "(the dominant, the 6 and 4 suspensions before 5 and 3), the reading this project ascribes to Kirnberger",
           "(to verify against his text, docs/chorales/KIRNBERGER.md). Likewise the diminished seventh: the analyst",
           "names the leading-tone chord (viio7, root the leading tone); a dominant reading puts the root a third",
           "lower. These are rival theories of the fundamental, not misreadings, and they are counted apart."]
    REPORT.write_text("\n".join(md) + "\n")
    print(f"{len(pieces)} pieces, {total} segments; baseline {pct(base_ok, total)}, fitted {pct(in_ok, total)}, LOO {pct(loo_ok, total)}; params {g_all}")
    print(kinds.most_common())


if __name__ == "__main__":
    main()
