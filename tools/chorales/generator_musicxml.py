#!/usr/bin/env python3
"""Write the generator's settings of Kittel's melodies as MusicXML, as tools/chorales/kittel_musicxml.py
writes Kittel's own (open them side by side in a notation program to compare, or to hear):

- generated_kittel_NN.musicxml: the melody and the eight generated figured basses, one staff each
  (steps 1-3; from data/chorales/generator/kittel-settings.json);
- satb_generated_kittel_NN.mxl: the eight generated settings in four parts (steps 1-5, embellished),
  one after another like a set of variations;
- satb_kittel_NN.mxl: Kittel's own figured basses with generated, embellished alto and tenor (steps
  4-5), one after another (from data/chorales/generator/satb.json: tools/chorales/voices_report.ts,
  then tools/chorales/diminution_report.ts adds the embellished voices).
The four-part files are compressed MusicXML (.mxl), which notation programs open directly.

Input : the files above, and data/chorales/kittel/kittel_NN.json (the melody, the bars)
Output: data/chorales/generator/musicxml/

Each bass note lasts until the next melody note (the melody's small notes aside); a note crossing a
bar line is split and tied.

Run:  python3 tools/chorales/generator_musicxml.py [--chorales 1,7]
"""
from __future__ import annotations

import argparse
import json
import zipfile
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


SATB = ROOT / "data" / "chorales" / "generator" / "satb.json"


def split_notes(measures: list[dict], notes: list[tuple[F, F, str]], fermata_last: bool = False) -> list[dict]:
    """Notes (onset, length in whole notes, pitch) split at bar lines and tied."""
    out = []
    for k, (on, length, pitch) in enumerate(notes):
        off = on + length
        pieces = []
        t = on
        while t < off:
            m = next(m for m in measures if F(m["offset"]) <= t < F(m["offset"]) + F(m["length"]))
            stop = min(off, F(m["offset"]) + F(m["length"]))
            pieces.append({"pitch": pitch, "offset": str(t), "duration": str(stop - t), "measure": m["number"]})
            t = stop
        if len(pieces) > 1:
            for j, p in enumerate(pieces):
                p["tie"] = "start" if j == 0 else "stop" if j == len(pieces) - 1 else "continue"
        if fermata_last and k == len(notes) - 1:
            pieces[-1]["fermata"] = True
        out += pieces
    return out


def write_mxl(path: Path, xml: str) -> None:
    """Compressed MusicXML: the score and the container that points to it, zipped."""
    # a fixed date in the archive, so that a file changes only when its music does
    def entry(name: str) -> zipfile.ZipInfo:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        return info
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(entry("META-INF/container.xml"), '<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>')
        z.writestr(entry("score.musicxml"), xml)


def satb_xml(c: dict, verses: list[dict], title: str) -> str:
    """Verses one after another: the chorale's bars repeated for each (repeat signs dropped), the melody
    in each, a label over its first bar."""
    span = sum(F(m["length"]) for m in c["measures"])
    t0 = F(c["measures"][0]["offset"])
    measures, labels = [], {}
    for k, v in enumerate(verses):
        for j, m in enumerate(c["measures"]):
            num = k * len(c["measures"]) + j + 1
            if j == 0:
                labels[num] = v["label"]
            bl = (m.get("barline_after") or "").replace("end-repeat", "").strip()
            if j == len(c["measures"]) - 1:
                bl = "solid+thick"
            measures.append(dict(m, number=num, offset=str(F(m["offset"]) - t0 + k * span), barline_after=bl))
    cc = dict(c, measures=measures)
    W = F(1, 32)
    mel = [n for n in c["melody"]["notes"] if not n.get("rest")]
    sop, alto, ten, bas, figs = [], [], [], [], []
    for k, v in enumerate(verses):
        shift = k * span - t0
        for n in mel:
            local = [x for x in measures if F(x["offset"]) <= F(n["offset"]) + shift < F(x["offset"]) + F(x["length"])][0]
            sop.append(dict(n, offset=str(F(n["offset"]) + shift), measure=local["number"]))
        src = v.get("dim") or v
        for key, dest in (("alto", alto), ("tenor", ten), ("bass", bas)):
            dest += split_notes(measures, [(F(n[0]) * W + k * span, F(n[1]) * W, n[2]) for n in src[key]], fermata_last=True)
        if "figures" in v:
            for at, rows in v["figures"]:
                if rows:
                    figs.append({"onset": str(F(at) * W + k * span), "stack": [{"level": i, "y": float(i), **({"interval": r["interval"]} if "interval" in r else {}),
                                 **({"accidental": r["accidental"]} if "accidental" in r else {})} for i, r in enumerate(rows)]})
        else:
            # Kittel's own figures, as printed (the bass's label names it in his chorale)
            b = next(x for x in c["basses"] if v["label"].endswith(x["label"]))
            figs += [dict(f, onset=str(F(f["onset"]) + shift)) for f in b["figures"] if f.get("onset") is not None]
    parts = [("PS", "Soprano", sop, [], "G"), ("PA", "Alto", alto, [], "G"), ("PT", "Tenor", ten, [], "F"), ("PB", "Bass", bas, figs, "F")]
    head = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
        '<score-partwise version="4.0">',
        f"<work><work-title>{KX.escape(title)}</work-title><work-number>{c['number']}</work-number></work>",
        "<identification><encoding><software>tools/chorales/generator_musicxml.py</software></encoding></identification>",
        "<part-list>",
    ]
    for pid, name, *_ in parts:
        head.append(f'<score-part id="{pid}"><part-name>{name}</part-name></score-part>')
    head.append("</part-list>")
    body = []
    for pid, name, notes, figures, clef in parts:
        ms = KX.part_measures(cc, notes, figures, clef)
        if pid == "PS":
            ms = [x.replace(f'<measure number="{num}">', f'<measure number="{num}"><direction placement="above"><direction-type><words>{KX.escape(lab)}</words></direction-type></direction>', 1)
                  for x in ms for num, lab in [(int(x.split('"')[1]), labels.get(int(x.split('"')[1]), ""))]] if labels else ms
            ms = [x.replace('<direction placement="above"><direction-type><words></words></direction-type></direction>', "") for x in ms]
        body.append(f'<part id="{pid}">' + "".join(ms) + "</part>")
    return "\n".join(head + body + ["</score-partwise>"]) + "\n"


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
    if SATB.exists():
        for g in json.loads(SATB.read_text())["chorales"]:
            if want and g["number"] not in want:
                continue
            c = json.loads((KIT / f"kittel_{g['number']:02d}.json").read_text())
            for kind, verses, title in (("satb_generated_kittel", g["generated"], "generated settings, four parts"), ("satb_kittel", g["kittel"], "Kittel's basses, generated alto and tenor")):
                if not verses:
                    continue
                path = OUT / f"{kind}_{g['number']:02d}.mxl"
                write_mxl(path, satb_xml(c, verses, f"{c['title']} ({title})"))
                print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
