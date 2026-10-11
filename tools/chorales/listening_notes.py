#!/usr/bin/env python3
"""The listening guide's observations (owner: the guide split between the sessions; the playback
session draws them beside the score): for each of Bach's 370 chorales, the moments a first-time
listener may be shown, computed from the library's readings (the analysis layer, Kirnberger's
categories as checked in C22-C24), never from a second analysis.

Each observation: [onset, end or null, voices, kind, vars], times in 32nds of a whole note (the
grid of study.json), voices 0 soprano .. 3 bass. The kinds:

  picardy            a chorale in minor ending on the major triad of its tonic
  phrygian           a Phrygian half cadence (the bass falling a semitone to the dominant)
  deceptive          a deceptive cadence (Kirnberger's Inganno, Kunst I pp. 97-98)
  foreignClose       a full close in another key than the chorale's (Kunst I pp. 95-96), only where
                     that close is rare in the mode (under 2% of Bach's full closes in it: a close on
                     V in major is the commonest after I, and no listener's surprise), once a degree
  dim7               a diminished seventh chord, read as the dominant seventh with the minor ninth
                     held for its root (Kunst I p. 90; C22)
  improperSeventh    a seventh that is the ninth of a root a third lower (Die wahren Grundsaetze
                     §§ 10-11; C24)
  unpreparedSeventh  an essential seventh entering unprepared: a licence of the free style
                     (Kunst I pp. 80-81; C23)
  suspensionChain    three or more beats in a row each with a suspension
  chromaticLine      a voice moving by three or more semitones in one direction, one at least by an
                     altered letter
  crossRelation      a letter altered in one voice right after another voice sang it unaltered
                     (or the reverse): the false relation
  crossing           two voices crossed on the beat
  neapolitan         the major triad on the lowered second degree
  borrowed           in major, a chord of the minor mode (minor IV, major bVI or bIII)
  pedal              the bass holding one pitch over three beats or more while the harmony changes
  peak               the melody's highest note (where it first comes)

Each kind is kept to a few per chorale (the rarer first), so that the guide points, not lists.

Usage: python3 tools/chorales/listening_notes.py
"""
from __future__ import annotations

import json
import sys
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kirnberger as K  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data/chorales/bach"
STUDY = ROOT / "data/chorales/study.json"
OUT = ROOT / "data/chorales/listening.json"
VOICES = ["soprano", "alto", "tenor", "bass"]
LIMIT = {"dim7": 3, "improperSeventh": 2, "unpreparedSeventh": 2, "suspensionChain": 2, "chromaticLine": 3, "crossRelation": 2, "crossing": 2,
         "foreignClose": 3, "deceptive": 3, "phrygian": 3, "neapolitan": 2, "borrowed": 2, "pedal": 2}
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def q(x: str) -> int:
    return int(F(x) * 32)


def pc_name(name: str) -> int:
    return (PC[name[0]] + name.count("#") - name[1:].count("b")) % 12


RARE_CLOSE = 0.02
CLOSES: dict[tuple, int] = {}
CLOSES_N: dict[str, int] = {}


def close_key(mode: str, tonic: str, fin: dict) -> tuple:
    return (mode, (pc_name(fin["root"]) - pc_name(tonic)) % 12, fin.get("chord") or "")


def count_closes(analyses: list[dict]) -> None:
    """Bach's full closes by mode, the final root's distance from the tonic and the chord's kind."""
    for a in analyses:
        for cd in a["cadences"]:
            fin = cd["final"]
            if fin and fin.get("root") and cd["class"].startswith("authentic"):
                k = close_key(a["key"]["mode"], a["key"]["tonic"], fin)
                CLOSES[k] = CLOSES.get(k, 0) + 1
                CLOSES_N[k[0]] = CLOSES_N.get(k[0], 0) + 1


def close_share(mode: str, tonic: str, fin: dict) -> float:
    return CLOSES.get(close_key(mode, tonic, fin), 0) / max(1, CLOSES_N.get(mode, 0))


def observations(study: dict, a: dict) -> list[list]:
    out: list[list] = []
    tonic, mode = a["key"]["tonic"], a["key"]["mode"]
    verts = a["verticalities"]
    beats = [v for v in verts if v["on_beat"]]
    bar = lambda v: v["measure"]  # noqa: E731

    # Cadences.
    for k, cd in enumerate(a["cadences"]):
        fin = cd["final"]
        if not fin:
            continue
        at = q(fin["t"])
        last = k == len(a["cadences"]) - 1
        if last and mode == "minor" and fin.get("chord") == "major" and fin.get("root") and pc_name(fin["root"]) == pc_name(tonic):
            out.append([at, None, [], "picardy", {"tonic": tonic}])
        if cd["class"] == "Phrygian half":
            out.append([at, None, [3], "phrygian", {"bass": fin["bass"][:-1]}])
        elif cd["class"] == "deceptive":
            out.append([at, None, [3], "deceptive", {"root": fin.get("root") or ""}])
        elif cd["class"].startswith("authentic") and fin.get("root") and pc_name(fin["root"]) != pc_name(tonic) and close_share(mode, tonic, fin) < RARE_CLOSE:
            out.append([at, None, [], "foreignClose", {"root": fin["root"], "chord": fin.get("chord") or "", "degree": cd.get("final_bass_degree") or ""}])

    # Chords and sevenths, on the beat.
    for v in beats:
        at = q(v["t"])
        if v.get("chord") == K.DIMINISHED_KIND:
            ninth = next((VOICES.index(x) for x, r in v["labels"].items() if r == "ninth"), None)
            out.append([at, None, [] if ninth is None else [ninth], "dim7", {"root": v["root"], "bar": bar(v)}])
        if v.get("improper_seventh"):
            ninth = next((VOICES.index(x) for x, r in v["labels"].items() if r == "ninth"), None)
            out.append([at, None, [] if ninth is None else [ninth], "improperSeventh", {"root": v["root"], "bar": bar(v)}])
        for s in v.get("sevenths", []):
            if not s["prepared"] and s["resolves_down"]:
                out.append([at, None, [VOICES.index(s["voice"])], "unpreparedSeventh", {"voice": s["voice"], "root": v["root"], "bar": bar(v)}])
        p = v["pitches"]
        pairs = [(i, i + 1) for i in range(3) if p.get(VOICES[i]) and p.get(VOICES[i + 1]) and K.midi(p[VOICES[i]]) < K.midi(p[VOICES[i + 1]])]
        if pairs:  # two voices crossed (the analysis' `crossing` flag looks only at the bass)
            i, j = pairs[0]
            out.append([at, None, [i, j], "crossing", {"upper": VOICES[i], "lower": VOICES[j], "bar": bar(v)}])

    # Chords from elsewhere, on the beat: the Neapolitan (the major triad on the lowered second
    # degree) and, in major, chords borrowed from the minor (the minor fourth degree, the major
    # triads on the lowered sixth and third).
    t0 = pc_name(tonic)
    for v in beats:
        if not v.get("root") or v.get("chord") not in ("major", "minor"):
            continue
        d = (pc_name(v["root"]) - t0) % 12
        at = q(v["t"])
        if d == 1 and v["chord"] == "major" and mode in ("major", "minor"):  # in the Phrygian mode it is the mode's own
            out.append([at, None, [3], "neapolitan", {"root": v["root"], "bar": bar(v), "inversion": "sixth" if v.get("bass_role") == "third" else "root"}])
        elif mode == "major" and ((d == 5 and v["chord"] == "minor") or (d in (8, 3) and v["chord"] == "major")):
            out.append([at, None, [], "borrowed", {"root": v["root"], "chord": v["chord"], "bar": bar(v)}])

    # Pedal points: the bass holding one pitch for three beats or more while the harmony above it
    # changes twice or more.
    i = 0
    while i < len(beats):
        j = i
        while j + 1 < len(beats) and beats[j + 1]["pitches"].get("bass") == beats[i]["pitches"].get("bass"):
            j += 1
        roots = {b.get("root") for b in beats[i:j + 1] if b.get("root")}
        if j - i >= 2 and len(roots) >= 3 and beats[i]["pitches"].get("bass"):
            out.append([q(beats[i]["t"]), q(beats[j]["t"]), [3], "pedal", {"pitch": beats[i]["pitches"]["bass"][:-1], "bar": bar(beats[i])}])
        i = j + 1

    # Suspension chains: three or more beats in a row with a suspension.
    run: list[dict] = []
    for v in beats + [None]:
        if v is not None and "suspension" in v["labels"].values():
            run.append(v)
            continue
        if len(run) >= 3:
            vs = sorted({VOICES.index(x) for r in run for x, lab in r["labels"].items() if lab == "suspension"})
            out.append([q(run[0]["t"]), q(run[-1]["t"]), vs, "suspensionChain", {"n": len(run), "bar": bar(run[0])}])
        run = []

    # Chromatic lines, in each voice's notes.
    for vi, notes in enumerate(study["voices"]):
        steps = []
        for (a0, _, p0, *_), (a1, _, p1, *_) in zip(notes, notes[1:]):
            d = K.midi(p1) - K.midi(p0)
            steps.append((a0, a1, d, K.diatonic(p1) == K.diatonic(p0)))
        i = 0
        while i < len(steps):
            j = i
            while j < len(steps) and abs(steps[j][2]) == 1 and steps[j][2] == steps[i][2]:
                j += 1
            if j - i >= 3 and any(s[3] for s in steps[i:j]):
                out.append([steps[i][0], steps[j - 1][1], [vi], "chromaticLine", {"voice": VOICES[vi], "dir": "up" if steps[i][2] > 0 else "down", "n": j - i}])
            i = max(j, i + 1)

    # False relations: between one sonority and the next, a letter altered in another voice.
    for v1, v2 in zip(verts, verts[1:]):
        found = None
        for x in VOICES:
            p1 = v1["pitches"].get(x)
            if not p1:
                continue
            for y in VOICES:
                p2 = v2["pitches"].get(y)
                if y == x or not p2 or p2[0] != p1[0] or pc_name(p2) == pc_name(p1):
                    continue
                # The alteration taken chromatically by a voice that had the plain letter: no false relation.
                if any(v1["pitches"].get(z) and v2["pitches"].get(z) and v1["pitches"][z][0] == p1[0] and pc_name(v1["pitches"][z]) == pc_name(p1) and pc_name(v2["pitches"][z]) == pc_name(p2) for z in VOICES):
                    continue
                if any(v2["pitches"].get(z) and pc_name(v2["pitches"][z]) == pc_name(p1) and v2["pitches"][z][0] == p1[0] for z in VOICES):
                    continue
                found = (x, y, p1, p2)
                break
            if found:
                break
        if found:
            x, y, p1, p2 = found
            out.append([q(v2["t"]), None, [VOICES.index(x), VOICES.index(y)], "crossRelation", {"from": p1[:-1], "to": p2[:-1], "a": x, "b": y, "bar": bar(v2)}])

    # The melody's peak.
    sop = study["voices"][0]
    if sop:
        top = max(K.midi(n[2]) for n in sop)
        first = next(n for n in sop if K.midi(n[2]) == top)
        out.append([first[0], None, [0], "peak", {"pitch": first[2]}])

    # A full close away from home once for each place it goes.
    seen: set = set()
    out = [o for o in out if o[3] != "foreignClose" or not ((o[4]["root"], o[4]["chord"]) in seen or seen.add((o[4]["root"], o[4]["chord"])))]
    # A few of each kind, in time order.
    out.sort(key=lambda o: (o[0], o[3]))
    kept, count = [], {}
    for o in out:
        count[o[3]] = count.get(o[3], 0) + 1
        if count[o[3]] <= LIMIT.get(o[3], 1):
            kept.append(o)
    return kept


def main() -> None:
    study = {c["n"]: c for c in json.loads(STUDY.read_text())["chorales"]}
    count_closes([json.loads(f.read_text()) for f in sorted((BACH / "analysis").glob("bach_*.json"))])
    data = {}
    totals: dict[str, int] = {}
    for f in sorted((BACH / "analysis").glob("bach_*.json")):
        a = json.loads(f.read_text())
        if a["number"] not in study:
            continue
        obs = observations(study[a["number"]], a)
        data[a["number"]] = obs
        for o in obs:
            totals[o[3]] = totals.get(o[3], 0) + 1
    OUT.write_text(json.dumps({"generated_by": "tools/chorales/listening_notes.py", "unit": "1/32 whole note", "fields": ["at", "end", "voices", "kind", "vars"],
                               "chorales": data}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(data)} chorales, {OUT.stat().st_size // 1024} KB")
    for k, n in sorted(totals.items(), key=lambda x: -x[1]):
        print(f"  {k}: {n}")


if __name__ == "__main__":
    main()
