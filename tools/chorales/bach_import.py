#!/usr/bin/env python3
"""Build the parsed Bach chorale library (layer 1: the notes as written, nothing analysed).

Input : data/sources/bach-370-chorales/kern/chor*.krn  (Craig Sapp's edition; see fetch_bach.sh)
Output: data/chorales/bach/index.json (catalogue) and data/chorales/bach/chorales/bach_NNN.json

Every musical fact is read from the source. Derived conveniences (MIDI numbers, fractions,
ranges) are labelled as such. Anything the reader does not understand aborts the build.

Conventions follow the Fux dataset: spelled pitches in scientific notation (C4 = middle C),
durations and offsets as "n/d" fractions of a whole note, measure 0 = an anacrusis.

Run:  python3 tools/chorales/bach_import.py
"""
from __future__ import annotations

import html
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "fux_import"))
from pitch import Pitch, frac  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "sources" / "bach-370-chorales"
OUT = ROOT / "data" / "chorales" / "bach"  # index.json + chorales/bach_NNN.json

SCHEMA_VERSION = "0.1.0"
VOICES = ["bass", "tenor", "alto", "soprano"]  # spine order in the source (left to right)
EXPECTED_FILES = 370

_TOKEN = re.compile(
    r"^(?P<open>[\[\(\{&]*)"
    r"(?P<recip>\d+)(?P<dots>\.*)"
    r"(?P<pitch>[a-gA-G]+|r)"
    r"(?P<acc>(?:#{1,2}|-{1,2}|n)?)"
    r"(?P<tail>.*)$"
)
# Signifiers the corpus uses after the pitch: beams (L J k K), fermata (;), tie ends (] _),
# slurs (( )), editorial accidental display (X shown, y hidden).
_ALLOWED_TAIL = re.compile(r"^[LJkK;\]_\)Xy]*$")
_KEY = re.compile(r"^\*([A-Ga-g][#-]?):([a-z]*)$")


def kern_pitch(letters: str, acc: str) -> Pitch:
    ch = letters[0]
    if letters != ch * len(letters):
        raise ValueError(f"bad kern pitch {letters!r}")
    octave = 3 + len(letters) if ch.islower() else 4 - len(letters)
    alter = {"": 0, "n": 0, "#": 1, "##": 2, "-": -1, "--": -2}[acc]
    return Pitch(ch.upper(), alter, octave)


def parse_key(tok: str) -> dict:
    m = _KEY.match(tok)
    assert m
    tonic, mode_label = m.group(1), m.group(2)
    name = tonic[0].upper() + tonic[1:].replace("-", "b")
    quality = "minor" if tonic[0].islower() else "major"
    modes = {"": quality, "dor": "dorian", "mix": "mixolydian", "phr": "phrygian", "lyd": "lydian"}
    if mode_label not in modes:
        raise ValueError(f"unknown mode label {tok!r}")
    return {"tonic": name, "mode": modes[mode_label], "kern": tok[1:]}


def read_chorale(path: Path) -> dict:
    refs: dict[str, list[str]] = {}
    lines = path.read_text(encoding="utf-8").splitlines()
    n_spines = None
    cursor = Fraction(0)  # all four voices share one cursor per data line (no splits)
    cursors: list[Fraction] = []
    measure = 0
    section = None
    voices: list[list[dict]] = []
    sections: list[dict] = []
    measures: list[dict] = [{"number": 0, "offset": "0/1", "barline_before": None}]
    meters: list[dict] = []
    key = None
    key_signature = None
    expansion = {}
    tempo = None
    for lineno, line in enumerate(lines, 1):
        where = f"{path.name}:{lineno}"
        if not line:
            continue
        if line.startswith("!!!"):
            k, _, v = line[3:].partition(":")
            refs.setdefault(k.strip().lstrip("!"), []).append(html.unescape(v.strip()))
            continue
        if line.startswith("!"):
            continue
        fields = line.split("\t")
        if n_spines is None:
            if fields != ["**kern"] * 4:
                raise ValueError(f"{where}: expected four **kern spines")
            n_spines = 4
            cursors = [Fraction(0)] * 4
            voices = [[] for _ in range(4)]
            continue
        if len(fields) != n_spines:
            raise ValueError(f"{where}: spine count changed")
        head = fields[0]
        if head.startswith("*"):
            if all(f.startswith(("*I", "*clef")) for f in fields):
                continue
            if len(set(fields)) != 1:
                raise ValueError(f"{where}: interpretations differ between spines: {fields}")
            tok = head
            if tok in ("*", "*-") or tok.startswith("*met"):
                continue
            if tok.startswith("*>["):
                expansion["full"] = tok[3:-1].split(",")
            elif tok.startswith("*>norep["):
                expansion["norep"] = tok[8:-1].split(",")
            elif tok.startswith("*>"):
                section = tok[2:]
                sections.append({"label": section, "offset": frac(cursors[0]), "measure": measure})
            elif tok.startswith("*k["):
                key_signature = tok[3:-1]
            elif _KEY.match(tok):
                key = parse_key(tok)
            elif re.match(r"^\*M\d+/\d+$", tok):
                meters.append({"meter": tok[2:], "offset": frac(cursors[0]), "measure": measure})
            elif tok.startswith("*MM"):
                tempo = int(tok[3:])
            else:
                raise ValueError(f"{where}: unhandled interpretation {tok!r}")
            continue
        if head.startswith("="):
            if len(set(fields)) != 1:
                raise ValueError(f"{where}: barlines differ between spines: {fields}")
            if len(set(cursors)) != 1:
                raise ValueError(f"{where}: voices out of step at a barline: {cursors}")
            m = re.match(r"^=(\d*)(.*)$", head)
            style = m.group(2) or None
            if m.group(1):
                measure = int(m.group(1))
                measures.append({"number": measure, "offset": frac(cursors[0]), "barline_before": style})
            else:
                # An unnumbered barline (a repeat sign or the final bar) closes the current measure.
                measures[-1]["barline_after"] = style if style else "|"
            continue
        for v, tok in enumerate(fields):
            if tok == ".":
                continue
            mt = _TOKEN.match(tok)
            if not mt:
                raise ValueError(f"{where}: cannot parse {tok!r}")
            if not _ALLOWED_TAIL.match(mt["tail"]) or mt["open"].strip("[("):
                raise ValueError(f"{where}: unhandled signifiers in {tok!r}")
            dur = Fraction(2) if mt["recip"] == "0" else Fraction(1, int(mt["recip"]))  # 0 = breve
            add = dur
            for _ in mt["dots"]:
                add /= 2
                dur += add
            tail = mt["tail"]
            rest = mt["pitch"] == "r"
            tie = "start" if "[" in mt["open"] else "continue" if "_" in tail else "stop" if "]" in tail else None
            note = {
                "i": len(voices[v]),
                "pitch": None,
                "midi": None,
                "rest": rest,
                "duration": frac(dur),
                "offset": frac(cursors[v]),
                "measure": measure,
                "section": section,
                "tie": tie,
                "fermata": ";" in tail,
                "accidental_shown": "X" in tail,
                "kern": tok,
            }
            if rest:
                note["hidden"] = "y" in tail
            else:
                p = kern_pitch(mt["pitch"], mt["acc"])
                note["pitch"], note["midi"] = p.name, p.midi
            # Defaults are omitted to keep the files small: tie null, fermata/accidental_shown false.
            voices[v].append({k: x for k, x in note.items() if not (k in ("tie", "fermata", "accidental_shown", "rest") and not x) and not (k in ("pitch", "midi") and rest)})
            cursors[v] += dur
    if len(set(cursors)) != 1:
        raise ValueError(f"{path.name}: voices end at different times: {cursors}")

    one = lambda k: refs[k][0] if k in refs else None  # noqa: E731
    number = int(one("PC#"))
    return {
        "id": f"bach_{number:03d}",
        "number": number,
        "file": f"kern/{path.name}",
        "bwv": (one("SCT") or "").removeprefix("BWV ").strip() or None,
        "title": {"de": one("OTL@@DE"), "en": one("OTL@EN")},
        "references": {k: (v[0] if len(v) == 1 else v) for k, v in refs.items()},
        "key": key,
        "key_signature": key_signature,
        "meters": meters,
        "tempo_mm_editorial": tempo,
        "expansion": expansion,
        "sections": sections,
        "measures": measures,
        "length": frac(cursors[0]),
        "voices": {name: voices[i] for i, name in enumerate(VOICES)},
    }


def main() -> None:
    files = sorted((SRC / "kern").glob("chor*.krn"))
    if len(files) != EXPECTED_FILES:
        raise SystemExit(f"expected {EXPECTED_FILES} files, found {len(files)}")
    source = json.loads((SRC / "SOURCE.json").read_text())
    chorales = [read_chorale(f) for f in files]
    header = {
        "schema_version": SCHEMA_VERSION,
        "dataset_id": "bach-370-chorales",
        "title": "J. S. Bach, 371 vierstimmige Choralgesänge (Breitkopf numbering), parsed",
        "generated_by": "tools/chorales/bach_import.py",
        "conventions": {
            "pitch": "spelled, scientific notation, C4 = middle C; midi derived",
            "time": "duration and offset as 'n/d' fractions of a whole note from the start of the written score",
            "measure": "Humdrum numbering; 0 = anacrusis",
            "voices": "soprano, alto, tenor, bass as written; tenor sounds as written (the source's treble-8 clef is notational)",
            "notes": "omitted fields take their defaults: tie null, fermata false, accidental_shown false, rest false; rests have no pitch or midi",
            "repeats": "written once, as in the source; 'expansion.full' is the performed order of the sections, 'expansion.norep' the order without repeats",
            "key": "the editor's key designation (Sapp), including modal labels; an editorial reading, not Bach's",
        },
        "provenance": source,
        "license": {
            "music": "public domain",
            "encoding": "CC BY-NC-SA 4.0, Craig Stuart Sapp, https://github.com/craigsapp/bach-370-chorales",
            "these_files": "CC BY-NC-SA 4.0 (derived from the encoding)",
        },
    }
    out_dir = OUT / "chorales"
    out_dir.mkdir(parents=True, exist_ok=True)
    for c in chorales:
        (out_dir / f"{c['id']}.json").write_text(json.dumps(c, ensure_ascii=False, indent=None, separators=(",", ":")) + "\n")
    catalogue = [
        {
            "id": c["id"], "number": c["number"], "bwv": c["bwv"], "title": c["title"]["de"],
            "key": f"{c['key']['tonic']} {c['key']['mode']}", "meter": c["meters"][0]["meter"] if c["meters"] else None,
            "measures": c["measures"][-1]["number"], "fermatas": sum(n.get("fermata", False) for n in c["voices"]["soprano"]),
            "file": f"chorales/{c['id']}.json",
        }
        for c in chorales
    ]
    index = {**header, "counts": {"chorales": len(chorales), "missing_numbers": [150]}, "catalogue": catalogue}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}/index.json and {len(chorales)} chorale files")


if __name__ == "__main__":
    main()
