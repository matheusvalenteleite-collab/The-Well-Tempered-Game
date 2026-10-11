#!/usr/bin/env python3
"""Write the generator's settings of Kittel's melodies as MusicXML: the melody and the generated
figured basses, one staff each, as tools/chorales/kittel_musicxml.py writes Kittel's own (open both
side by side in a notation program to compare, or to hear).

Input : data/chorales/generator/kittel-settings.json (from tools/chorales/generator_report.ts)
        data/chorales/kittel/kittel_NN.json (the melody, the bars)
Output: data/chorales/generator/musicxml/generated_kittel_NN.musicxml

Each bass note lasts until the next melody note (the melody's small notes aside); a note crossing a
bar line is split and tied.

Run:  python3 tools/chorales/generator_musicxml.py [--chorales 1,7]
"""
from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from pathlib import Path

import kittel_musicxml as KX

ROOT = Path(__file__).resolve().parents[2]
SETTINGS = ROOT / "data" / "chorales" / "generator" / "kittel-settings.json"
KIT = ROOT / "data" / "chorales" / "kittel"
OUT = ROOT / "data" / "chorales" / "generator" / "musicxml"


def bass_notes(c: dict, notes: list[dict]) -> list[dict]:
    """The generated notes with durations, split at bar lines (tied)."""
    end = F(c["measures"][-1]["offset"]) + F(c["measures"][-1]["length"])
    out = []
    for k, n in enumerate(notes):
        on = F(n["offset"])
        off = F(notes[k + 1]["offset"]) if k + 1 < len(notes) else end
        pieces = []
        t = on
        while t < off:
            m = next(m for m in c["measures"] if F(m["offset"]) <= t < F(m["offset"]) + F(m["length"]))
            stop = min(off, F(m["offset"]) + F(m["length"]))
            pieces.append({"pitch": n["pitch"], "offset": str(t), "duration": str(stop - t), "measure": m["number"]})
            t = stop
        if len(pieces) > 1:
            for j, p in enumerate(pieces):
                p["tie"] = "start" if j == 0 else "stop" if j == len(pieces) - 1 else "continue"
        if n is notes[-1]:
            pieces[-1]["fermata"] = True
        out += pieces
    return out


def figures(notes: list[dict]) -> list[dict]:
    out = []
    for n in notes:
        if not n["figure"]:
            continue
        stack = [{"level": i, "y": float(i), **({"interval": r["interval"]} if "interval" in r else {}),
                  **({"accidental": r["accidental"]} if "accidental" in r else {})} for i, r in enumerate(n["figure"])]
        out.append({"onset": n["offset"], "stack": stack})
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chorales", default="")
    a = ap.parse_args()
    want = {int(x) for x in a.chorales.split(",") if x}
    data = json.loads(SETTINGS.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for g in data["chorales"]:
        if want and g["number"] not in want:
            continue
        c = json.loads((KIT / f"kittel_{g['number']:02d}.json").read_text())
        c = dict(c, title=f"{c['title']} (generated basses)", basses=[
            {"label": f"[g{k + 1}]", "notes": bass_notes(c, s["notes"]), "figures": figures(s["notes"])}
            for k, s in enumerate(g["settings"])
        ])
        path = OUT / f"generated_kittel_{g['number']:02d}.musicxml"
        path.write_text(KX.chorale_xml(c))
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
