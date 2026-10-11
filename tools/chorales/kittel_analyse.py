#!/usr/bin/env python3
"""Kirnberger's reading of Kittel's basses, and their comparison with Bach's settings.

For each of Kittel's 194 basses, every harmony (at each bass note on the beat and each figure)
is read as a fundamental chord: the bass, the figure (as a continuo player reads it, with held
rows; see kittel_check.harmonies) and the melody note, standing in thirds over a root. A melody
note or a figured interval that does not fit is incidental.

Then, for each of Kittel's melodies that Bach set (data/chorales/concordance.json), each Kittel
melody note is aligned with its note in Bach's soprano, and the harmony under it is compared:
same fundamental bass (root), same bass note, same position of the bass in the chord.

Output: data/chorales/kittel/analysis/kittel_NN.json and docs/chorales/KITTEL-BACH.md

Run:  python3 tools/chorales/kittel_analyse.py
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from fractions import Fraction as F
from itertools import combinations
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kirnberger as K  # noqa: E402
from kittel_check import chord_spelling, harmonies, key_alters, melody_timeline, sounding  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
KIT = ROOT / "data" / "chorales" / "kittel"
BACH = ROOT / "data" / "chorales" / "bach"
OUT = KIT / "analysis"
REPORT = ROOT / "docs" / "chorales" / "KITTEL-BACH.md"
PCN = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def pc(name: str) -> int:
    s, a, _ = K.parse(name if name[-1].isdigit() else name + "4")
    return (PCN[s] + a) % 12


def read_harmony(bass: str, spelled: list[str], melody: str | None) -> dict:
    """The fundamental chord of a figured harmony with its melody note."""
    voices = {"bass": bass}
    for i, p in enumerate(spelled[1:]):
        voices[f"f{i}"] = p + "4"
    if melody:
        voices["melody"] = melody
    ch = K.fundamental(voices)
    incidental = []
    if ch is None and melody:
        ch = K.fundamental({k: v for k, v in voices.items() if k != "melody"})
        incidental = ["melody"] if ch else []
    if ch is None:
        fig = [k for k in voices if k.startswith("f")]
        for k in (1, 2):
            for drop in combinations(fig, k):
                rest = {v: p for v, p in voices.items() if v not in drop and v != "melody"}
                ch = K.fundamental(rest)
                if ch:
                    incidental = list(drop) + (["melody"] if melody and not K.fundamental({**rest, "melody": melody}) else [])
                    break
            if ch:
                break
    if ch is None:
        return {"root": None}
    return {"root": ch.root, "kind": ch.kind, "bass_role": ch.members.get("bass"),
            "melody_role": "incidental" if "melody" in incidental else ch.members.get("melody"),
            "incidental_in_figure": [spelled[1 + int(v[1:])] for v in incidental if v.startswith("f")]}


def analyse(c: dict) -> dict:
    ks = key_alters(c["key_signature"])
    melody = melody_timeline(c["melody"]["notes"])
    out = []
    for b in c["basses"]:
        hs = []
        for t, bn, chord_bass, current, fig in harmonies(b):
            spelled = chord_spelling(chord_bass["pitch"], current, ks)
            if spelled is None:  # 0: the bass alone (tasto solo)
                hs.append({"t": str(t), "bass": bn["pitch"], "root": None, "tasto_solo": True})
                continue
            m = sounding(melody, t)
            h = read_harmony(chord_bass["pitch"], spelled, None if m is None or m.get("rest") else m["pitch"])
            h.update({"t": str(t), "bass": bn["pitch"], "chord_bass": chord_bass["pitch"], "figure": "/".join(spelled[1:])})
            hs.append(h)
        out.append({"label": b["label"], "harmonies": hs})
    return {"id": c["id"], "number": c["number"], "title": c["title"], "basses": out}


# --- alignment of the melodies (with traceback) ----------------------------------------------------


def seq(notes: list[dict]) -> list[dict]:
    out = []
    for n in notes:
        if n.get("rest") or n.get("grace") or n.get("midi") is None or n.get("tie") in ("stop", "continue"):
            continue
        out.append(n)
    return out


def align(k: list[int], b: list[int]) -> list[tuple[int, int]]:
    GB, GK, SUB = 0.35, 1.0, 1.0
    n, m = len(k), len(b)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for j in range(1, m + 1):
        D[0][j] = j * GB
    for i in range(1, n + 1):
        D[i][0] = i * GK
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j - 1] + (0 if k[i - 1] == b[j - 1] else SUB), D[i - 1][j] + GK, D[i][j - 1] + GB)
    i, j, pairs = n, m, []
    while i > 0 and j > 0:
        if D[i][j] == D[i - 1][j - 1] + (0 if k[i - 1] == b[j - 1] else SUB):
            if k[i - 1] == b[j - 1]:
                pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif D[i][j] == D[i - 1][j] + GK:
            i -= 1
        else:
            j -= 1
    return pairs[::-1]


def harmony_at(hs: list[dict], t: F) -> dict | None:
    cur = None
    for h in hs:
        if F(h["t"]) <= t:
            cur = h
        else:
            break
    return cur


def bach_at(verts: list[dict], t: F) -> dict | None:
    cur = None
    for v in verts:
        if F(v["t"]) <= t:
            if v["on_beat"] or cur is None:
                cur = v
        else:
            break
    return cur


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    conc = json.loads((ROOT / "data" / "chorales" / "concordance.json").read_text())
    kit = {}
    for p in sorted(KIT.glob("kittel_*.json")):
        c = json.loads(p.read_text())
        a = analyse(c)
        (OUT / f"{c['id']}.json").write_text(json.dumps(a, ensure_ascii=False, separators=(",", ":")) + "\n")
        kit[c["number"]] = (c, a)
    rows = []
    for r in conc["rows"]:
        c, a = kit[r["kittel"]]
        kmel = seq(c["melody"]["notes"])
        fermata_idx = {i for i, n in enumerate(kmel) if n.get("fermata")}
        for x in r["same_tune"] + r["variant_of_tune"]:
            bc = json.loads((BACH / "chorales" / f"bach_{x['bach']:03d}.json").read_text())
            ba = json.loads((BACH / "analysis" / f"bach_{x['bach']:03d}.json").read_text())
            bmel = seq(bc["voices"]["soprano"])
            shift = x["transposition"]
            pairs = align([n["midi"] for n in kmel], [n["midi"] + shift for n in bmel])
            for bass in a["basses"]:
                stats = defaultdict(int)
                for ki, bi in pairs:
                    kh = harmony_at(bass["harmonies"], F(kmel[ki]["offset"]))
                    bv = bach_at(ba["verticalities"], F(bmel[bi]["offset"]))
                    if not kh or not bv or kh.get("root") is None or bv.get("root") is None:
                        continue
                    cad = ki in fermata_idx
                    same_root = pc(kh["root"]) == (pc(bv["root"]) + shift) % 12
                    same_bass = pc(kh["chord_bass"]) == (pc(bv["pitches"]["bass"]) + shift) % 12
                    for scope in (("all",) + (("cadence",) if cad else ())):
                        stats[scope + ":n"] += 1
                        stats[scope + ":root"] += same_root
                        stats[scope + ":bass"] += same_bass
                rows.append({"kittel": r["kittel"], "bass": bass["label"], "bach": x["bach"], "bwv": x["bwv"],
                             "aligned_notes": len(pairs), **stats})
    # benchmark: two of Bach's own settings of the same tune, compared the same way
    bench = defaultdict(int)
    for r in conc["rows"]:
        xs = r["same_tune"] + r["variant_of_tune"]
        for x, y in combinations(xs, 2):
            bx = [json.loads((BACH / d / f"bach_{z['bach']:03d}.json").read_text()) for d in ("chorales", "analysis") for z in (x,)]
            by = [json.loads((BACH / d / f"bach_{z['bach']:03d}.json").read_text()) for d in ("chorales", "analysis") for z in (y,)]
            mx, my = seq(bx[0]["voices"]["soprano"]), seq(by[0]["voices"]["soprano"])
            sx, sy = x["transposition"], y["transposition"]
            pairs = align([n["midi"] + sx for n in mx], [n["midi"] + sy for n in my])
            fx = {i for i, n in enumerate(mx) if n.get("fermata")}
            for i, j in pairs:
                vx, vy = bach_at(bx[1]["verticalities"], F(mx[i]["offset"])), bach_at(by[1]["verticalities"], F(my[j]["offset"]))
                if not vx or not vy or vx.get("root") is None or vy.get("root") is None:
                    continue
                same_root = (pc(vx["root"]) + sx) % 12 == (pc(vy["root"]) + sy) % 12
                same_bass = (pc(vx["pitches"]["bass"]) + sx) % 12 == (pc(vy["pitches"]["bass"]) + sy) % 12
                for scope in (("all",) + (("cadence",) if i in fx else ())):
                    bench[scope + ":n"] += 1
                    bench[scope + ":root"] += same_root
                    bench[scope + ":bass"] += same_bass
    # report
    md = ["# Kittel's basses against Bach's settings of the same tunes", "",
          "Generated by `tools/chorales/kittel_analyse.py`. Each of Kittel's melody notes is aligned",
          "with its note in Bach's soprano (concordance, `CONCORDANCE.md`). Under each, the harmony of",
          "one of Kittel's basses is compared with Bach's harmony on the beat, both read as Kirnberger's",
          "fundamental chords (`KIRNBERGER.md`). \"Root\" is the share of melody notes on the same",
          "fundamental bass; \"bass\" the share on the same bass note (pitch class); \"cadence\" the same",
          "two at the melody's fermatas.", ""]
    tot = defaultdict(int)
    for x in rows:
        for k, v in x.items():
            if ":" in k:
                tot[k] += v
    pct = lambda a, b: f"{100 * a / b:.0f}%" if b else "—"  # noqa: E731
    md += [f"**Over all {len(rows)} comparisons (Kittel bass × Bach setting):** same root {pct(tot['all:root'], tot['all:n'])}, "
           f"same bass {pct(tot['all:bass'], tot['all:n'])}; at the cadences same root {pct(tot['cadence:root'], tot['cadence:n'])}, "
           f"same bass {pct(tot['cadence:bass'], tot['cadence:n'])}.", "",
           f"**Benchmark: two of Bach's own settings of the same tune**, compared the same way: same root "
           f"{pct(bench['all:root'], bench['all:n'])}, same bass {pct(bench['all:bass'], bench['all:n'])}; at the cadences "
           f"same root {pct(bench['cadence:root'], bench['cadence:n'])}, same bass {pct(bench['cadence:bass'], bench['cadence:n'])} "
           f"({bench['all:n']} aligned melody notes).", ""]
    by_bass = defaultdict(lambda: defaultdict(int))
    for x in rows:
        for k, v in x.items():
            if ":" in k:
                by_bass[x["bass"]][k] += v
    md += ["## By the number of the bass (does Kittel order his basses by distance from the plain setting?)", "",
           "| bass | same root | same bass | cadence: same root | cadence: same bass |", "|---|---|---|---|---|"]
    for lab in sorted(by_bass, key=lambda s: int(s.strip("[]"))):
        d = by_bass[lab]
        md.append(f"| {lab} | {pct(d['all:root'], d['all:n'])} | {pct(d['all:bass'], d['all:n'])} | {pct(d['cadence:root'], d['cadence:n'])} | {pct(d['cadence:bass'], d['cadence:n'])} |")
    md += ["", "## Each tune: Kittel's bass closest to Bach", "",
           "| Kittel | Bach | closest bass (same root) | farthest | mean |", "|---|---|---|---|---|"]
    groups = defaultdict(list)
    for x in rows:
        groups[(x["kittel"], x["bach"])].append(x)
    for (kn, bn), xs in sorted(groups.items()):
        sc = [(x["all:root"] / x["all:n"] if x.get("all:n") else 0, x["bass"]) for x in xs]
        sc.sort()
        mean = sum(s for s, _ in sc) / len(sc)
        md.append(f"| {kn} | {bn} | {sc[-1][1]} ({100 * sc[-1][0]:.0f}%) | {sc[0][1]} ({100 * sc[0][0]:.0f}%) | {100 * mean:.0f}% |")
    REPORT.write_text("\n".join(md) + "\n")
    (ROOT / "data" / "chorales" / "kittel_bach_comparison.json").write_text(json.dumps(rows, indent=1) + "\n")
    print(f"{len(rows)} comparisons; same root {pct(tot['all:root'], tot['all:n'])}, cadence root {pct(tot['cadence:root'], tot['cadence:n'])}; "
          f"Bach vs Bach: root {pct(bench['all:root'], bench['all:n'])}, cadence {pct(bench['cadence:root'], bench['cadence:n'])}")


if __name__ == "__main__":
    main()
