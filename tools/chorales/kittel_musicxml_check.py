#!/usr/bin/env python3
"""Round trip: read the exported MusicXML back with music21 (an independent parser) and compare
every note (pitch, onset, duration) with the JSON it was written from; the figures are counted
in the XML itself, since music21 does not import <figured-bass>.

Run:  python3 tools/chorales/kittel_musicxml_check.py   (needs: pip install music21)
"""
from __future__ import annotations

import json
import sys
from fractions import Fraction as F
from pathlib import Path

import xml.etree.ElementTree as ET

import music21

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "chorales" / "kittel"


def flat_events(part) -> list[tuple]:
    out = []
    for n in part.recurse().notes:
        if n.duration.isGrace:
            continue
        on = F(n.getOffsetInHierarchy(part)).limit_denominator(64) / 4
        d = F(n.quarterLength).limit_denominator(64) / 4
        pitches = [p.nameWithOctave.replace("-", "b") for p in n.pitches]
        out.append((on, d, sorted(pitches)))
    return out


def json_events(notes: list[dict]) -> list[tuple]:
    out = []
    for n in notes:
        if n.get("rest") or n.get("grace"):
            continue
        out.append((F(n["offset"]), F(n["duration"]), sorted([n["pitch"]] + n.get("chord", []))))
    return out


def main() -> None:
    bad = 0
    for path in sorted(DIR.glob("kittel_*.json")):
        c = json.loads(path.read_text())
        score = music21.converter.parse(str(DIR / "musicxml" / f"{c['id']}.musicxml"))
        parts = {p.partName: p for p in score.parts}
        # figures: counted from the XML itself (music21 does not import <figured-bass>)
        root = ET.parse(DIR / "musicxml" / f"{c['id']}.musicxml").getroot()
        names = {sp.get("id"): sp.findtext("part-name") for sp in root.iter("score-part")}
        fig_count = {names[p.get("id")]: sum(1 for fb in p.iter("figured-bass") if any(len(f) for f in fb.findall("figure"))) for p in root.iter("part")}
        voices = [("Melody", c["melody"]["notes"], [])]
        for b in c["basses"]:
            voices.append((f"Bass {b['label']}", b["notes"], b["figures"]))
        problems = []
        for name, notes, figs in voices:
            p = parts.get(name)
            if p is None:
                problems.append(f"missing part {name}")
                continue
            a, b_ = flat_events(p), json_events(notes)
            if a != b_:
                k = next((i for i, (x, y) in enumerate(zip(a, b_)) if x != y), min(len(a), len(b_)))
                problems.append(f"{name}: differs at event {k}: xml {a[k] if k < len(a) else None} json {b_[k] if k < len(b_) else None}")
            want = len([f for f in figs if f.get("onset") is not None])
            if fig_count.get(name, 0) != want:
                problems.append(f"{name}: {fig_count.get(name, 0)} figures in the XML, {want} in the data")
        bad += bool(problems)
        print(f"No. {c['number']:2d}: " + ("ok" if not problems else "; ".join(problems[:3])))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
