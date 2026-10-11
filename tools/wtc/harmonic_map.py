#!/usr/bin/env python3
"""A harmonic map of every prelude and fugue of the WTC, for the study guide (C14).

The reader of tools/wtc/harmony.py, with the parameters fitted there on the When in Rome analyses,
applied without a human segmentation: every half beat of every movement is read (the notes sounding
in it, passing and neighbour notes discounted), and consecutive readings that agree are merged into
one harmony. The half beat was chosen by the same yardstick: read by the half beat, the map agrees
with the analysts at 71.8% of their segments; by the beat, 68.6%; by two beats, 46.5%; a
segmentation that charges for every change of harmony (dynamic programming over spans of one to
four beats) does worse, from 65.7% down, because the analysts change harmony more often than such a
reader expects. The map gives, for each harmony, where it starts (bar, beat, onset), its length and
its fundamental (root and chord).

How far to trust it is measured, not assumed: at the start of every segment of the When in Rome
analyses (31 movements), does the map's harmony there have the analyst's root? (The reader with the
analyst's segmentation agrees in 83.3%, docs/wtc/HARMONY.md; this is the same question when the
reader must also find where the harmony changes.)

Moments the map marks, as starting points for "listen to the important moments":
  pedal       the same bass pitch under four or more beats of changing harmony
  dim7        a diminished seventh chord (Bach's chord of tension, often before a cadence or a
              fermata)
  cadence     a dominant (major triad or dominant seventh) moving down a fifth to a triad, both on
              the beat, the second at least as long as the first
These are computed readings, offered to be listened to and checked, not claims about Bach.

Output: data/wtc/harmonic-maps.json (facts: chords and bar positions, no notes) and
docs/wtc/HARMONIC-MAPS.md. Run: python3 tools/wtc/harmonic_map.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from fractions import Fraction as F
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import harmony as H  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / "data" / "local" / "wtc"
OUT = ROOT / "data" / "wtc" / "harmonic-maps.json"
REPORT = ROOT / "docs" / "wtc" / "HARMONIC-MAPS.md"
WEIGHTS = H.weights(1.5, 0.25, 0.25, 0.15, 0.0, 0.0, 0.8, 1.0)
fr = lambda x: f"{x.numerator}/{x.denominator}"  # noqa: E731


def beat_of(meter: str) -> F:
    num, den = (int(x) for x in meter.split("/"))
    # compound metres beat in dotted notes
    if num in (6, 9, 12, 24) and den >= 8:
        return F(3, den)
    return F(1, den)


def read_span(notes: list[dict], t: F, u: F):
    """The span's harmony, or None where no two notes sound together in it (a subject alone before
    the answer enters: a line, not a harmony)."""
    here = [n for n in notes if n["off"] > t and n["on"] < u]
    starts = {max(n["on"], t) for n in here}
    if not any(sum(1 for n in here if n["on"] <= x < n["off"]) >= 2 for x in starts):
        return None
    rows, bass_pc = H.candidates(notes, t, u)
    if not rows:
        return None
    X = np.array([r["f"] for r in rows], dtype=float)
    r = rows[int(np.argmax(X @ WEIGHTS))]
    return {"root": H.name(r["root_step"], r["root_pc"]), "root_pc": r["root_pc"], "chord": r["quality"], "bass_pc": bass_pc}


def map_piece(piece: dict, unit: F = F(1, 2)) -> list[dict]:
    """The harmonies of a movement: every `unit` of a beat read on its own (the notes sounding in it,
    passing and neighbour notes discounted), consecutive readings that agree merged."""
    notes = [{"on": F(n["onset"]), "off": F(n["onset"]) + F(n["duration"]), "step": H.spell(n["pitch"])[0], "pc": H.spell(n["pitch"])[1],
              "midi": n["midi"], "spine": n["spine"]} for n in piece["notes"] if n["pitch"] and not n.get("grace") and F(n["duration"]) > 0]
    H.mark_embellishing(notes)
    meter = piece["meters"][0] if piece["meters"] else "4/4"
    beat = beat_of(meter)
    step = beat * unit
    length = F(piece["length"])
    bars = [(F(m["onset"]), m["number"]) for m in piece["measures"] if m["number"] > 0]
    out = []
    t = F(0)
    while t < length:
        u = min(t + step, length)
        r = read_span(notes, t, u)
        if r:
            bar = max((num for on, num in bars if on <= t), default=0)
            bar_on = max((on for on, num in bars if on <= t), default=F(0))
            if out and out[-1]["root_pc"] == r["root_pc"] and out[-1]["chord"] == r["chord"]:
                out[-1]["end"] = u
                out[-1]["basses"].append(r["bass_pc"])
            else:
                out.append({**r, "onset": t, "end": u, "bar": bar, "beat": int((t - bar_on) / beat) + 1, "basses": [r["bass_pc"]]})
        t = u
    return out


def moments(m: list[dict], beat: F) -> list[dict]:
    found = []
    # pedal: the same bass pitch class through 4+ beats spanning 2+ harmonies
    i = 0
    while i < len(m):
        j = i
        bass = m[i]["basses"][0]
        while j + 1 < len(m) and all(b == bass for b in m[j + 1]["basses"]) and all(b == bass for b in m[j]["basses"]):
            j += 1
        if j > i and (m[j]["end"] - m[i]["onset"]) >= 4 * beat:
            found.append({"kind": "pedal", "bar": m[i]["bar"], "onset": fr(m[i]["onset"]), "to_bar": m[j]["bar"]})
            i = j + 1
        else:
            i += 1
    for a, b in zip(m, m[1:]):
        if a["chord"] == "diminished seventh":
            found.append({"kind": "dim7", "bar": a["bar"], "onset": fr(a["onset"])})
        if a["chord"] in ("major", "dominant seventh") and b["chord"] in ("major", "minor") and (a["root_pc"] - b["root_pc"]) % 12 == 7 \
                and (b["end"] - b["onset"]) >= (a["end"] - a["onset"]) and b["beat"] == 1:
            found.append({"kind": "cadence", "bar": b["bar"], "onset": fr(b["onset"]), "to": b["root"] + (" minor" if b["chord"] == "minor" else "")})
    if m and m[-1]["chord"] == "diminished seventh":
        found.append({"kind": "dim7", "bar": m[-1]["bar"], "onset": fr(m[-1]["onset"])})
    return sorted(found, key=lambda x: F(x["onset"]))


def validate(maps: dict) -> tuple[int, int, dict]:
    ok = tot = 0
    per = {}
    for pid, path in H.wir_pieces():
        piece = json.loads((LOCAL / f"{pid}.json").read_text())
        m = maps[pid]
        a = b = 0
        for sp in H.wir_spans(path, piece):
            mid = sp["t"] + F(1, 1000)
            h = next((x for x in m if x["onset"] <= mid < x["end"]), None)
            if h is None:
                continue
            a += h["root_pc"] == sp["root_pc"]
            b += 1
        per[pid] = (a, b)
        ok += a
        tot += b
    return ok, tot, per


def main() -> None:
    idx = json.loads((LOCAL / "index.json").read_text())
    maps, out, kinds = {}, [], Counter()
    for x in idx:
        piece = json.loads((LOCAL / f"{x['id']}.json").read_text())
        m = map_piece(piece)
        maps[x["id"]] = m
        meter = piece["meters"][0] if piece["meters"] else "4/4"
        mo = moments(m, beat_of(meter))
        kinds.update(k["kind"] for k in mo)
        out.append({"id": x["id"], "book": x["book"], "kind": x["kind"], "number": x["number"], "key": x["key"], "meter": meter,
                    "harmonies": [{"bar": h["bar"], "beat": h["beat"], "onset": fr(h["onset"]), "length": fr(h["end"] - h["onset"]),
                                   "root": h["root"], "chord": h["chord"]} for h in m],
                    "moments": mo})
    ok, tot, per = validate(maps)
    OUT.write_text(json.dumps({"generated_by": "tools/wtc/harmonic_map.py", "note": "Computed readings: see the module docstring and docs/wtc/HARMONIC-MAPS.md for how far they agree with human analyses.",
                               "pieces": out}, ensure_ascii=False, separators=(",", ":")) + "\n")
    n_h = sum(len(p["harmonies"]) for p in out)
    md = ["# Harmonic maps of the 96 movements", "",
          "Generated by `tools/wtc/harmonic_map.py` (method in its docstring): the WTC harmonic reader applied beat by beat,",
          "with no human segmentation, consecutive beats with the same reading merged.", "",
          f"**{len(out)} movements, {n_h} harmonies.** Moments marked: " + ", ".join(f"{k} {v}" for k, v in kinds.most_common()) + ".", "",
          "## How far to trust it", "",
          f"At the start of each segment of the When in Rome analyses (31 movements), the map has the analyst's root in **{ok} of {tot}",
          f"({100 * ok / tot:.1f}%)**. With the analyst's own segmentation the reader agrees in 83.3% (docs/wtc/HARMONY.md): the cost of",
          "finding the changes as well is the difference (by the beat instead of the half beat: 68.6%; by two beats: 46.5%). Where the map and an analyst differ, the map is a reading to be heard and",
          "checked, as the moments are.", "",
          "| movement | agreement |", "|---|---|"]
    md += [f"| {pid} | {a}/{b} ({100 * a / b:.0f}%) |" for pid, (a, b) in per.items() if b]
    REPORT.write_text("\n".join(md) + "\n")
    print("\n".join(md[4:13]))


if __name__ == "__main__":
    main()
