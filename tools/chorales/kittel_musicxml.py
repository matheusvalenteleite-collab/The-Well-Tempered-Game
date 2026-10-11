#!/usr/bin/env python3
"""Write each extracted Kittel chorale as MusicXML (melody + its basses, with the figures), so that
it can be opened, heard and proofread in any notation program (MuseScore, Dorico, Finale).

Input : data/chorales/kittel/kittel_NN.json
Output: data/chorales/kittel/musicxml/kittel_NN.musicxml

The bars keep the edition's irregular lengths (a hidden time signature where a bar's length
changes); a staff that is empty in a bar gets a hidden rest. Figures are written as
<figured-bass> before the note they stand over, with a duration when several fall on one note.

Run:  python3 tools/chorales/kittel_musicxml.py [--chorales 1,2]
"""
from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "data" / "chorales" / "kittel"
OUT = DIR / "musicxml"
DIV = 24  # divisions per quarter note

TYPES = {F(2): ("breve", 0), F(1): ("whole", 0), F(3, 2): ("whole", 1), F(1, 2): ("half", 0), F(3, 4): ("half", 1),
         F(7, 8): ("half", 2), F(1, 4): ("quarter", 0), F(3, 8): ("quarter", 1), F(7, 16): ("quarter", 2),
         F(1, 8): ("eighth", 0), F(3, 16): ("eighth", 1), F(1, 16): ("16th", 0), F(3, 32): ("16th", 1), F(1, 32): ("32nd", 0)}
ACC = {-2: "flat-flat", -1: "flat", 0: "natural", 1: "sharp", 2: "double-sharp"}


def parse(name: str) -> tuple[str, int, int]:
    step, rest = name[0], name[1:]
    alter = 0
    while rest and rest[0] in "#b":
        alter += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return step, alter, int(rest)


def dur(x: F) -> int:
    d = x * 4 * DIV
    if d.denominator != 1:
        raise ValueError(f"duration {x} not representable with {DIV} divisions")
    return int(d)


def meter_of(length: F) -> tuple[int, int]:
    """A time signature for a bar of this length (in whole notes): n/4 when possible, else n/8."""
    q = length * 4
    if q.denominator == 1:
        return int(q), 4
    e = length * 8
    if e.denominator == 1:
        return int(e), 8
    s = length * 16
    return int(s), 16


def figure_xml(stack: list[dict], above: list[float] | None = None) -> str:
    """`above`: the baselines of the rows of the figure before (on the same note). MusicXML stacks
    figures from the top, so a figure whose rows stand lower ("8 7" in the bottom row under
    "5 / 3 / 8") gets empty figures above it."""
    out = []
    if above and stack:
        pad = sum(1 for y in above if y < stack[0]["y"] - 1.5)
        out += ["<figure/>"] * pad
    for r in stack:
        parts = []
        if r.get("accidental") and r.get("interval") is None:
            parts.append(f"<prefix>{ACC[{'flat': -1, 'natural': 0, 'sharp': 1}[r['accidental']]]}</prefix>")
        elif r.get("accidental"):
            parts.append(f"<prefix>{ACC[{'flat': -1, 'natural': 0, 'sharp': 1}[r['accidental']]]}</prefix>")
        if r.get("interval") is not None:
            parts.append(f"<figure-number>{r['interval']}</figure-number>")
        if r.get("raised"):
            parts.append("<suffix>" + ("plus" if r.get("interval") in (2, 4, 5) else "slash") + "</suffix>")
        if r.get("continuation"):
            parts.append('<extend type="continue"/>')
        elif "extender_to_x" in r:
            parts.append('<extend type="start"/>')
        out.append("<figure>" + "".join(parts) + "</figure>")
    paren = ' parentheses="yes"' if stack and all(r.get("editorial") for r in stack) else ""
    return f"<figured-bass{paren}>" + "".join(out)


def note_xml(n: dict, chord: bool = False, pitch: str | None = None) -> str:
    d = F(n["duration"])
    x = ["<note>"]
    if n.get("grace"):
        x.append('<grace slash="yes"/>')
    if chord:
        x.append("<chord/>")
    if n.get("rest"):
        x.append("<rest/>")
    else:
        step, alter, octave = parse(pitch or n["pitch"])
        x.append(f"<pitch><step>{step}</step>" + (f"<alter>{alter}</alter>" if alter else "") + f"<octave>{octave}</octave></pitch>")
    if not n.get("grace"):
        x.append(f"<duration>{dur(d)}</duration>")
    tie = n.get("tie")
    if tie in ("stop", "continue"):
        x.append('<tie type="stop"/>')
    if tie in ("start", "continue"):
        x.append('<tie type="start"/>')
    if n.get("grace"):
        x.append("<type>eighth</type>")
    elif d in TYPES:
        t, dots = TYPES[d]
        x.append(f"<type>{t}</type>" + "<dot/>" * dots)
    if n.get("accidental_shown") and not n.get("rest"):
        alter = parse(pitch or n["pitch"])[1]
        x.append(f"<accidental>{ACC[alter]}</accidental>")
    notations = []
    if tie in ("stop", "continue"):
        notations.append('<tied type="stop"/>')
    if tie in ("start", "continue"):
        notations.append('<tied type="start"/>')
    if n.get("fermata") and not chord:
        notations.append("<fermata/>")
    slur = n.get("slur")
    if slur and not chord:
        for kind in slur.split("+"):
            notations.append(f'<slur type="{kind}"/>')
    if notations:
        x.append("<notations>" + "".join(notations) + "</notations>")
    x.append("</note>")
    return "".join(x)


def part_measures(c: dict, notes: list[dict], figures: list[dict], clef: str) -> list[str]:
    measures = c["measures"]
    by_m: dict[int, list[dict]] = {m["number"]: [] for m in measures}
    for n in notes:
        if n.get("measure") in by_m:
            by_m[n["measure"]].append(n)
    figs = sorted((f for f in figures if f.get("onset") is not None), key=lambda f: F(f["onset"]))
    out = []
    prev_len = None
    for i, m in enumerate(measures):
        L = F(m["length"])
        attrs = []
        if i == 0:
            attrs.append(f"<divisions>{DIV}</divisions><key><fifths>{c['key_signature']}</fifths></key>")
        if L != prev_len:
            if i == 0 and c.get("meter_sign") == "C" and L == 1:
                attrs.append('<time symbol="common"><beats>4</beats><beat-type>4</beat-type></time>')
            else:
                b, t = meter_of(L)
                attrs.append(f'<time print-object="no"><beats>{b}</beats><beat-type>{t}</beat-type></time>')
        if i == 0:
            attrs.append("<clef><sign>G</sign><line>2</line></clef>" if clef == "G" else "<clef><sign>F</sign><line>4</line></clef>")
        body = []
        if attrs:
            body.append("<attributes>" + "".join(attrs) + "</attributes>")
        content = by_m[m["number"]]
        if not content:
            # A figure can stand over an empty bar: the resolution of a cadence over the bass note
            # held under its fermata (No. 6, bass [6]: 6/4 on the note, 5/3 in the next bar).
            start = F(m["offset"])
            here = [f for f in figs if start <= F(f["onset"]) < start + L]
            for k, f in enumerate(here):
                nxt = F(here[k + 1]["onset"]) if k + 1 < len(here) else start + L
                if k == 0 and F(f["onset"]) > start:
                    body.append(f"<figured-bass><figure/><duration>{dur(F(f['onset']) - start)}</duration></figured-bass>")
                body.append(figure_xml(f["stack"]) + f"<duration>{dur(nxt - F(f['onset']))}</duration></figured-bass>")
            body.append(f'<note print-object="no"><rest measure="yes"/><duration>{dur(L)}</duration></note>')
        else:
            start = F(m["offset"])
            t = start
            for n in content:
                on = F(n["offset"])
                if on > t and not n.get("grace"):
                    body.append(f'<forward><duration>{dur(on - t)}</duration></forward>')
                    t = on
                end = on + F(n["duration"])
                mine = [f for f in figs if on <= F(f["onset"]) < end] if not n.get("grace") else []
                for k, f in enumerate(mine):
                    nxt = F(mine[k + 1]["onset"]) if k + 1 < len(mine) else end
                    fx = figure_xml(f["stack"], [r["y"] for r in mine[k - 1]["stack"]] if k else None)
                    if len(mine) > 1 or F(f["onset"]) != on:
                        if F(f["onset"]) > on and k == 0:
                            # the first figure falls inside the note: a silent figure before it
                            body.append(f"<figured-bass><figure/><duration>{dur(F(f['onset']) - on)}</duration></figured-bass>")
                        fx += f"<duration>{dur(nxt - F(f['onset']))}</duration>"
                    body.append(fx + "</figured-bass>")
                body.append(note_xml(n))
                for p in n.get("chord", []):
                    body.append(note_xml(n, chord=True, pitch=p))
                if not n.get("grace"):
                    t = end
            if t < start + L:
                body.append(f'<forward><duration>{dur(start + L - t)}</duration></forward>')
        barline = m.get("barline_after") or ""
        if "end-repeat" in barline:
            body.append('<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>')
        elif i == len(measures) - 1:
            body.append('<barline location="right"><bar-style>light-heavy</bar-style></barline>')
        elif barline.startswith("dashed"):
            body.append('<barline location="right"><bar-style>dashed</bar-style></barline>')
        out.append(f'<measure number="{m["number"]}">' + "".join(body) + "</measure>")
        prev_len = L
    return out


def chorale_xml(c: dict) -> str:
    parts = [("P0", "Melody", c["melody"]["notes"], [], "G")]
    for b in c["basses"]:
        if "melody_variant" in b:
            parts.append((f"P{b['label'].strip('[]')}m", f"Melody (for bass {b['label']})", b["melody_variant"]["notes"], [], "G"))
        parts.append((f"P{b['label'].strip('[]')}", f"Bass {b['label']}", b["notes"], b["figures"], "F"))
    head = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
        '<score-partwise version="4.0">',
        f"<work><work-title>{escape(c['title'])}</work-title><work-number>{c['number']}</work-number></work>",
        "<identification><creator type=\"composer\">Johann Christian Kittel</creator>"
        "<encoding><software>tools/chorales/kittel_musicxml.py</software></encoding>"
        "<source>Vierundzwanzig Choräle mit acht verschiedenen Bässen über eine Melodie (1811), from the engraved edition</source></identification>",
        "<part-list>",
    ]
    for pid, name, *_ in parts:
        head.append(f'<score-part id="{pid}"><part-name>{escape(name)}</part-name></score-part>')
    head.append("</part-list>")
    body = []
    for pid, name, notes, figures, clef in parts:
        body.append(f'<part id="{pid}">' + "".join(part_measures(c, notes, figures, clef)) + "</part>")
    return "\n".join(head + body + ["</score-partwise>"]) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chorales", default="")
    a = ap.parse_args()
    want = {int(x) for x in a.chorales.split(",") if x}
    OUT.mkdir(parents=True, exist_ok=True)
    for path in sorted(DIR.glob("kittel_*.json")):
        c = json.loads(path.read_text())
        if want and c["number"] not in want:
            continue
        (OUT / f"{c['id']}.musicxml").write_text(chorale_xml(c))
        print(f"wrote musicxml/{c['id']}.musicxml")


if __name__ == "__main__":
    main()
