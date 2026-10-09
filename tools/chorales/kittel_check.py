#!/usr/bin/env python3
"""Harmonic cross-check of the extracted Kittel chorales (an independent test of the extraction).

For every bass, each figure is read as a chord over its bass note (period abbreviations: nothing
or 3 or 5 = 5/3, 6 = 6/3, 7 = 7/5/3, 6/5 = 6/5/3, 4/3 = 6/4/3, 2 or 4/2 = 6/4/2, 4 = 5/4, 9 = 9/5/3;
an accidental alone alters the third; a stroke raises its figure; accidentals are read against the
key signature). The melody note sounding at the onset of every bass note and every figure is then
tested against that chord. A melody note outside the chord is either a non-chord tone in the
melody (rare on these onsets: the melody moves in minims) or an extraction error: a wrong pitch, a
figure on the wrong beat, or a figure misread. Mismatches are listed for review.

Run:  python3 tools/chorales/kittel_check.py [--chorales 1,2]
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "chorales" / "kittel"
STEPS = "CDEFGAB"
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def parse(name: str) -> tuple[str, int, int]:
    step, rest = name[0], name[1:]
    alter = 0
    while rest and rest[0] in "#b":
        alter += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return step, alter, int(rest)


def key_alters(n: int) -> dict[str, int]:
    order = "FCGDAEB" if n > 0 else "BEADGCF"
    return {s: (1 if n > 0 else -1) for s in order[: abs(n)]}


def expand(stack: list[dict], held: dict[int, dict]) -> dict[int, dict]:
    """Intervals of a figure as {generic interval: row}, with abbreviations completed. `held` maps
    row levels to the rows of earlier figures still held (by an extender or a dash): a level the
    new figure leaves empty keeps its held interval."""
    rows = []

    def match(y: float) -> float | None:
        return next((hy for hy in held if abs(hy - y) < 1.5), None)

    taken = set()
    for r in stack:
        hy = match(r["y"])
        if hy is not None:
            taken.add(hy)
        if r.get("continuation"):
            if hy is not None:
                rows.append(held[hy])
            continue
        rows.append(r)
    for hy, r in held.items():
        if hy not in taken:
            rows.append(r)
    nums = [r.get("interval") for r in rows if r.get("interval") is not None]
    accs_alone = [r for r in rows if r.get("interval") is None and r.get("accidental")]
    s = set(nums)
    full: dict[int, dict] = {}
    for r in rows:
        if r.get("interval") is not None:
            full[r["interval"]] = r
    if 0 in s:
        return {0: {"interval": 0}}
    implied: set[int] = set()
    if any(r.get("interval") == 4 and (r.get("raised") or r.get("accidental") == "sharp") for r in rows):
        s = s | {6}
    if not s or s <= {3, 5, 8}:
        implied = {3, 5}
    elif s <= {4, 5, 8}:
        implied = {5}
    elif s <= {6, 3, 8}:
        implied = {3}
    elif s <= {7, 5, 3, 8}:
        implied = {3, 5}
    elif s <= {6, 5, 3}:
        implied = {3}
    elif s <= {4, 3, 6}:
        implied = {6}
    elif s <= {2, 4, 6}:
        implied = {4, 6}
    elif s <= {4, 5, 8}:
        implied = {5}
    elif s <= {9, 8, 5, 3}:
        implied = {3, 5}
    elif s <= {9, 7, 3}:
        implied = {3}
    for k in implied:
        full.setdefault(k, {"interval": k})
    for a in accs_alone:
        full[3] = {"interval": 3, "accidental": a["accidental"]}
    return full


def chord_pcs(bass: str, full: dict[int, dict], ks: dict[str, int]) -> set[int] | None:
    if 0 in full:
        return None
    step, alter, octave = parse(bass)
    bpc = (PC[step] + alter) % 12
    pcs = {bpc}
    for k, r in full.items():
        if k == 0:
            continue
        k = k if k <= 8 else k - 7
        rstep = parse(r["_bass"])[0] if "_bass" in r else step
        st = STEPS[(STEPS.index(rstep) + k - 1) % 7]
        a = ks.get(st, 0)
        acc = r.get("accidental")
        if acc == "sharp":
            a += 1
        elif acc == "flat":
            a -= 1
        elif acc == "natural":
            a = 0
        if r.get("raised"):
            a += 1
        pcs.add((PC[st] + a) % 12)
    return pcs


def sounding(notes: list[dict], t: F) -> dict | None:
    for n in notes:
        if F(n["offset"]) <= t < F(n["offset"]) + F(n["duration"]):
            return n
    return None


def check(c: dict) -> tuple[int, int, list[str]]:
    ks = key_alters(c["key_signature"])
    melody = c["melody"]["notes"]
    ok = total = 0
    bad = []
    for b in c["basses"]:
        figs = [f for f in b["figures"] if f["onset"]]
        fig_at = {F(f["onset"]): f for f in figs}
        times = sorted({F(n["offset"]) for n in b["notes"] if not n["rest"]} | set(fig_at))
        held: dict[int, dict] = {}
        current: dict[int, dict] = {}
        chord_bass = None
        for t in times:
            bn = sounding(b["notes"], t)
            if bn is None or bn["rest"]:
                continue
            new_note = F(bn["offset"]) == t
            if t in fig_at:
                st = fig_at[t]["stack"]
                x = fig_at[t]["x"]
                held = {hy: r for hy, r in held.items() if r.get("extender_to_x", 1e9) >= x - 2}
                current = expand(st, held if not new_note or any(r.get("continuation") for r in st) else held)
                kept = {r["y"]: dict(r, _bass=bn["pitch"]) for r in st if "extender_to_x" in r and not r.get("continuation")}
                for r in st:
                    if r.get("continuation"):
                        hy = next((hy for hy in held if abs(hy - r["y"]) < 1.5), None)
                        if hy is not None:
                            kept[r["y"]] = held[hy]
                held = kept
                chord_bass = bn
            elif new_note:
                # An unfigured bass note off the minim beat passes: the harmony holds. On the beat
                # it carries a plain triad.
                if (t * 2).denominator != 1 and chord_bass is not None:
                    continue
                current = expand([], {})
                held = {}
                chord_bass = bn
            pcs = chord_pcs(chord_bass["pitch"], current, ks)
            m = sounding(melody, t)
            if pcs is None or m is None or m["rest"]:
                continue
            step, alter, _ = parse(m["pitch"])
            total += 1
            if (PC[step] + alter) % 12 in pcs:
                ok += 1
            else:
                fig = fig_at.get(t)
                desc = "/".join(str(r.get("interval", r.get("accidental", "-"))) for r in fig["stack"]) if fig else "(none)"
                bad.append(f"{b['label']} m.{bn.get('measure')} t={t}: melody {m['pitch']} over {bn['pitch']} figure {desc}")
    return ok, total, bad


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chorales", default="")
    a = ap.parse_args()
    want = {int(x) for x in a.chorales.split(",") if x}
    grand_ok = grand = 0
    lines = ["# Kittel chorales: harmonic cross-check", "", "Generated by `tools/chorales/kittel_check.py`. Each line is a melody note outside the chord",
             "that the bass and its figure imply at that onset: a melodic non-chord tone, a gap in the check's", "reading of the figures, or an extraction error. Every line is to be looked at against the PDF.", ""]
    for path in sorted(DIR.glob("kittel_*.json")):
        c = json.loads(path.read_text())
        if want and c["number"] not in want:
            continue
        ok, total, bad = check(c)
        grand_ok += ok
        grand += total
        head = f"No. {c['number']:2d}: melody in the figured chord at {ok}/{total} onsets ({100 * ok / max(total, 1):.1f}%)"
        print(head)
        lines += [f"## {head}", ""] + [f"- {x}" for x in bad] + [""]
        for x in bad:
            print("   ", x)
    if grand:
        print(f"all: {grand_ok}/{grand} ({100 * grand_ok / grand:.1f}%)")
        lines.insert(6, f"**All: {grand_ok}/{grand} ({100 * grand_ok / grand:.1f}%)**\n")
        if not want:
            (DIR / "CHECK.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
