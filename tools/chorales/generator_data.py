#!/usr/bin/env python3
"""Training corpus for the chorale generator (src/chorale/generate/, Phase A steps 1-2).

One event per on-beat soprano attack in Bach's 370 chorales, as in level 2
(tools/chorales/harmony_plans.py): the melody's scale degree, Kirnberger's fundamental chord under
it as a degree of the chorale's key, the bass's degree and the figure. Phrase ends are marked
where the soprano's note carries a fermata (a fermata on the second half of a tie belongs to the
note), with the melody's close there (the last two soprano notes as degrees, every soprano note
counted, as in tools/chorales/cadence_plans.py).

Each chorale carries its tune key (harmony_plans.tune_key), so that a model can hold out every
setting of a tune at once, and Kittel's melodies can be judged by a model that has not seen Bach's
settings of them.

Output: data/chorales/generator/bach-events.json (compact; read by the TypeScript generator).

Run:  python3 tools/chorales/generator_data.py
"""
from __future__ import annotations

import json
import sys
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cadence_plans import MINORISH, chord_label, degree, pcn, quality  # noqa: E402
from figure_plans import position  # noqa: E402
from harmony_plans import tune_key  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
OUT = ROOT / "data" / "chorales" / "generator" / "bach-events.json"


def midi(name: str) -> int:
    """MIDI number of a spelled pitch (C4 = 60; B#3 = 60, Cb4 = 59)."""
    acc = name[1:].rstrip("0123456789-")
    octave = int(name[1 + len(acc):])
    return 12 * (octave + 1) + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]] + acc.count("#") - acc.count("b")


def soprano_notes(sop: list[dict]) -> list[dict]:
    """The soprano's notes with ties merged; a fermata on a tied continuation moves to the note."""
    out: list[dict] = []
    for n in sop:
        if n.get("rest") or n.get("midi") is None:
            continue
        if n.get("tie") in ("stop", "continue") and out:
            if n.get("fermata"):
                out[-1] = dict(out[-1], fermata=True)
            continue
        out.append(dict(n))
    return out


def chorale_events(c: dict, a: dict) -> dict:
    tonic_name = c["key"]["tonic"]
    tonic = pcn(tonic_name)
    mode = "minor" if c["key"]["mode"] in MINORISH else "major"
    sop = soprano_notes(c["voices"]["soprano"])
    at = {F(n["offset"]): i for i, n in enumerate(sop)}
    notes = []
    for v in a["verticalities"]:
        if not v["on_beat"] or "soprano" not in v["struck"] or not v["root"]:
            continue
        i = at.get(F(v["t"]))
        if i is None:
            continue
        n = sop[i]
        e = {
            "t": v["t"],
            "m": v["measure"],
            "deg": degree(v["pitches"]["soprano"], tonic_name),
            "chord": chord_label(pcn(v["root"]), tonic, quality(v["chord"])),
            "bass": degree(v["pitches"]["bass"], tonic_name),
            "fig": v["figure"],
            "bm": midi(v["pitches"]["bass"]),
            "sm": midi(v["pitches"]["soprano"]),
        }
        pos = position(v.get("bass_role"), v.get("chord"))
        if pos:
            e["pos"] = pos
        if n.get("fermata"):
            e["end"] = 1
            if i > 0:
                e["close"] = f"{degree(sop[i - 1]['pitch'], tonic_name)}-{degree(n['pitch'], tonic_name)}"
        notes.append(e)
    return {"no": c["number"], "tune": tune_key(c["voices"]["soprano"]), "tonic": tonic_name, "mode": mode, "notes": notes}


def main() -> None:
    index = json.loads((BACH / "index.json").read_text())
    chorales = []
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = json.loads((BACH / "analysis" / f"{c['id']}.json").read_text())
        chorales.append(chorale_events(c, a))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "generated_by": "tools/chorales/generator_data.py",
        "note": "On-beat soprano attacks of Bach's chorales. deg: melody degree; chord: Kirnberger's fundamental as a degree of the key (upper case major, lower case minor, ° diminished); bass: bass degree; fig: figure in period abbreviation; bm, sm: bass and soprano MIDI; pos: the chord's position over the bass (5/3, 6, 6/4, 7, 6/5, 4/3, 4/2; absent where the bass is not a chord tone); end: soprano fermata; close: the melody's last two degrees at a phrase end.",
        "chorales": chorales,
    }, ensure_ascii=False, separators=(",", ":")) + "\n")
    n = sum(len(c["notes"]) for c in chorales)
    ends = sum(1 for c in chorales for x in c["notes"] if x.get("end"))
    print(f"{len(chorales)} chorales, {n} events, {ends} phrase ends, {len({c['tune'] for c in chorales})} tunes -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
