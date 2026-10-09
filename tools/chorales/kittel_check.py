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


def expand(stack: list[dict], held: dict[int, dict], last: dict | None = None) -> dict[int, dict]:
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
            prev = next((lr for ly, lr in (last or {}).items() if abs(ly - r["y"]) < 1.5), None)
            if prev is not None:
                rows.append(prev)
            elif hy is not None:
                rows.append(held[hy])
            continue
        rows.append(r)
    for hy, r in held.items():
        if hy not in taken:
            rows.append(r)
    nums = [r.get("interval") for r in rows if r.get("interval") is not None]
    accs_alone = [r for r in rows if r.get("interval") is None and r.get("accidental")]
    s = set(nums) | ({3} if accs_alone else set())
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
        pcs.add(("step", st))  # the letter, for the "accidental supplied by the melody" convention
    pcs.add(("step", step))
    return pcs


def diatonic(name: str) -> int:
    step, _, octave = parse(name)
    return 7 * octave + STEPS.index(step)


def melodic_kind(melody: list[dict], m: dict, t: F, pcs: set[int]) -> str:
    """Why a melody note may lie outside the chord: the usual non-chord tones of the upper voice."""
    sung = [n for n in melody if not n.get("rest") and not n.get("grace")]
    i = next((k for k, n in enumerate(sung) if n is m), None)
    if i is None:
        return "unexplained"
    if F(m["offset"]) < t:
        nxt = sung[i + 1] if i + 1 < len(sung) else None
        if nxt is not None and diatonic(nxt["pitch"]) - diatonic(m["pitch"]) == -1:
            return "suspension in the melody (held, resolving down by step)"
        return "held over a change of harmony"
    prev = sung[i - 1] if i > 0 else None
    nxt = sung[i + 1] if i + 1 < len(sung) else None
    d_in = diatonic(m["pitch"]) - diatonic(prev["pitch"]) if prev else None
    d_out = diatonic(nxt["pitch"]) - diatonic(m["pitch"]) if nxt else None
    if prev and m.get("tie") in ("stop", "continue"):
        return "suspension (tied)"
    if d_in == 0 and d_out in (-1, 1):
        return "suspension (repeated)"
    if d_in in (-1, 1) and d_out in (-1, 1):
        return "passing" if d_in == d_out else "neighbour"
    if d_out in (-1, 1):
        return "appoggiatura (leap, then step)"
    if d_in in (-1, 1) and nxt and d_out == 0:
        return "anticipation"
    return "unexplained"


def melody_timeline(notes: list[dict]) -> list[dict]:
    """The melody as it sounds. A small note before a melody note is a passing note in the time
    of the note before it (the figures place it there: "5 6" over a held bass under B-(C)-D puts
    the 6 under the small C, in the second half of the B). So the note before gives up its second
    half to the small note."""
    out: list[dict] = []
    pending: list[dict] = []
    for n in notes:
        if n.get("grace"):
            pending.append(n)
            continue
        if pending and out and not out[-1].get("rest"):
            prev = out[-1]
            half = F(prev["duration"]) / 2
            prev["duration"] = frac_s(half)
            start = F(prev["offset"]) + half
            share = half / len(pending)
            for k, g in enumerate(pending):
                out.append(dict(g, grace=False, offset=frac_s(start + k * share), duration=frac_s(share), passing_small_note=True))
        pending = []
        out.append(dict(n))
    return out


def frac_s(x: F) -> str:
    return f"{x.numerator}/{x.denominator}"


def sounding(notes: list[dict], t: F) -> dict | None:
    for n in notes:
        if F(n["offset"]) <= t < F(n["offset"]) + F(n["duration"]):
            return n
    return None


def check(c: dict) -> tuple[int, int, list[str]]:
    ks = key_alters(c["key_signature"])
    melody = melody_timeline(c["melody"]["notes"])
    ok = total = 0
    bad = []
    chromatic: list[str] = []
    for b in c["basses"]:
        figs = [f for f in b["figures"] if f["onset"]]
        fig_at = {F(f["onset"]): f for f in figs}
        times = sorted({F(n["offset"]) for n in b["notes"] if not n["rest"]} | set(fig_at))
        held: dict[int, dict] = {}
        last: dict[float, dict] = {}
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
                if all(r.get("continuation") for r in st):
                    pass  # dashes alone: the previous chord holds over this bass note
                else:
                    current = expand(st, held, last)
                    current = {k: (r if "_bass" in r else dict(r, _bass=bn["pitch"])) for k, r in current.items()}
                    new_last = {}
                    for r in st:
                        if r.get("continuation"):
                            prev = next((lr for ly, lr in last.items() if abs(ly - r["y"]) < 1.5), None)
                            if prev is not None:
                                new_last[r["y"]] = prev
                        else:
                            new_last[r["y"]] = dict(r, _bass=bn["pitch"])
                    last = new_last
                    kept = {y: r for y, r in new_last.items() if "extender_to_x" in r}
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
                if held and bn.get("_x") is not None and any(r.get("extender_to_x", 0) > bn["_x"] for r in held.values()):
                    continue  # an extender line runs over this note: the figured chord holds
                current = {k: dict(r, _bass=bn["pitch"]) for k, r in expand([], {}).items()}
                held = {}
                last = {}
                chord_bass = bn
            pcs = chord_pcs(chord_bass["pitch"], current, ks)
            m = sounding(melody, t)
            if pcs is None or m is None or m["rest"]:
                continue
            step, alter, _ = parse(m["pitch"])
            total += 1
            if (PC[step] + alter) % 12 in pcs:
                ok += 1
            elif ("step", step) in pcs:
                # The figure leaves the alteration to the melody, which sings it (a ♯ third
                # under a G♯ in the soprano needs no ♯ in the figure). Counted as agreeing.
                ok += 1
                chromatic.append(f"{b['label']} m.{bn.get('measure')} t={t}: melody {m['pitch']} over {bn['pitch']}")
            else:
                fig = fig_at.get(t)
                desc = "/".join(str(r.get("interval", r.get("accidental", "-"))) for r in fig["stack"]) if fig else "(none)"
                kind = melodic_kind(melody, m, t, pcs)
                if kind == "held over a change of harmony":
                    if F(bn["offset"]) < t:
                        kind = "inner voices move under held melody and bass"
                    elif (t * 2).denominator != 1:
                        kind = "passing harmony on a weak crotchet under a held melody"
                    else:
                        kind = "held melody against a new bass note"
                bad.append(f"[{kind}] {b['label']} m.{bn.get('measure')} t={t}: melody {m['pitch']} over {bn['pitch']} figure {desc}")
    return ok, total, bad + [f"[accidental supplied by the melody] {x}" for x in chromatic]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chorales", default="")
    a = ap.parse_args()
    want = {int(x) for x in a.chorales.split(",") if x}
    grand_ok = grand = 0
    lines = ["# Kittel chorales: harmonic cross-check", "", "Generated by `tools/chorales/kittel_check.py`. At every onset of a bass note or a figure, the melody",
             "note sounding is tested against the chord that the bass and its figure imply. Each line below is a",
             "melody note outside that chord, classed by what the melody does there. Only the last two kinds are", "candidates for extraction errors.", ""]
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
        import collections
        import re as _re
        kinds = collections.Counter(_re.match(r"- \[([^\]]+)\]", x).group(1) for x in lines if _re.match(r"- \[", x))
        summary = [f"**All: {grand_ok}/{grand} onsets agree ({100 * grand_ok / grand:.1f}%)**", "",
                   "| kind | count | reading |", "|---|---|---|"]
        notes = {
            "accidental supplied by the melody": "agrees: the figure leaves to the melody an alteration it sings",
            "inner voices move under held melody and bass": "music: a figure inside a held bass note describes the inner voices",
            "suspension in the melody (held, resolving down by step)": "music",
            "passing harmony on a weak crotchet under a held melody": "music",
            "passing": "music: melodic passing note", "neighbour": "music: melodic neighbour note",
            "appoggiatura (leap, then step)": "music", "anticipation": "music",
            "suspension (tied)": "music", "suspension (repeated)": "music",
            "held melody against a new bass note": "to look at", "unexplained": "to look at",
        }
        for k, v in kinds.most_common():
            summary.append(f"| {k} | {v} | {notes.get(k, '')} |")
        lines[7:7] = summary + [""]
        if not want:
            (DIR / "CHECK.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
