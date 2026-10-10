"""Build data/fux/four-voice/fux-four-voice.json from the vendored Exercitium III files.

Reads data/sources/fux-species/III/sp*/gap_*.krn (version of record) and the matching .json
metadata (figure, species, modal final, cantus part, original clefs, printed page) and writes one
record per exercise, its four parts listed from the top down (upstream part 1 = top). Stdlib only.
Fig. 204 (species 2, 3 and 4 combined, p. 138) is listed last.

Usage: python3 tools/fux_import/build_four_voice.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from kern import read_kern  # noqa: E402
from pitch import frac  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "sources" / "fux-species"
OUT = ROOT / "data" / "fux" / "four-voice" / "fux-four-voice.json"
GAME = ROOT / "data" / "fux" / "four-voice" / "fux-four-voice-game.json"


def _frac(r: str) -> float:
    n, _, d = r.partition("/")
    return int(n) / int(d or 1)


def quaver_line(notes: list, bars: int) -> list:
    """A part in quaver slots (eight a bar, one in the last): a pitch or "r" where a note or rest
    begins, "~" where the previous one is held (a tie over the bar line included)."""
    out = [None] * (8 * (bars - 1) + 1)
    for n in notes:
        start = _frac(n["offset"])
        length = _frac(n["duration"])
        k = round(start * 8) if start < bars - 1 - 1e-9 else 8 * (bars - 1)
        count = 1 if start >= bars - 1 - 1e-9 else round(length * 8)
        for j in range(count):
            first = j == 0 and n["tie"] not in ("stop", "continue")
            out[k + j] = (n["pitch"] or "r") if first else "~"
    if any(x is None for x in out):
        raise ValueError("slots left empty")
    return out


def encode(line: list) -> str:
    """Run-length: each onset (or a leading "~") followed by "+n" for the n held slots after it."""
    tokens = []
    for x in line:
        if x == "~" and tokens:
            head, _, n = tokens[-1].partition("+")
            tokens[-1] = f"{head}+{int(n or 0) + 1}"
        else:
            tokens.append(x)
    return " ".join(tokens)


def game(data: dict) -> dict:
    """What the game reads (D148): per exercise its facts and each part, the cantus and first species
    one pitch a bar, the rest in run-length quaver slots."""
    out = []
    for e in data["exercises"]:
        first = e["species"] == [1]
        parts = []
        for i, v in enumerate(e["voices"]):
            if first or i == e["cantus_index"]:
                parts.append(" ".join(n["pitch"] for n in v["notes"]))
            else:
                parts.append(encode(quaver_line(v["notes"], e["measures"])))
        out.append({k: e[k] for k in ("id", "figure", "species", "modal_final", "cantus_index", "measures", "clefs_1725", "page")} | {"parts": parts})
    return {"source": data["dataset_id"], "license": data["license"], "provenance": data["provenance"], "exercises": out}


def build() -> dict:
    source = json.loads((SRC / "SOURCE.json").read_text())
    exercises = []
    for krn in sorted(SRC.glob("III/sp*/gap_*.krn")):
        # Upstream gap_201.json has a trailing comma; read it as written, without the comma.
        meta = json.loads(re.sub(r",(\s*[}\]])", r"\1", krn.with_suffix(".json").read_text()))
        if meta.get("voices") != 4:
            raise ValueError(f"{krn}: expected four voices")
        score = read_kern(krn)
        parts = sorted(score.parts, key=lambda p: int(p.part or 0))
        if [p.part for p in parts] != ["1", "2", "3", "4"]:
            raise ValueError(f"{krn}: parts {[p.part for p in parts]}")
        voices = []
        for p in parts:
            notes = []
            for n in p.notes:
                if n.grace:
                    raise ValueError(f"{krn}: grace notes unsupported")
                notes.append({
                    "pitch": n.pitch.name if n.pitch else None,
                    "duration": frac(n.duration),
                    "offset": frac(n.offset),
                    "measure": int(n.measure),
                    "tie": n.tie,
                })
            voices.append({"part": int(p.part), "kern_clef": p.clef, "notes": notes})
        fig = meta["figure"]
        exercises.append({
            "id": meta["id"],
            "figure": f"{fig['number']}{fig.get('suffix') or ''}",
            "species": meta["species"],
            "modal_final": meta["modal_final"].upper(),
            # 0 = top, 3 = bottom.
            "cantus_index": int(meta["cantus_firmus"]["part"]) - 1,
            "measures": meta["measures"],
            "clefs_1725": meta["clefs"],
            "page": meta["page"],
            "pdf_page": meta["source"]["pdf_page"],
            "voices": voices,
        })
    exercises.sort(key=lambda e: (len(e["species"]) > 1, e["species"][0], int("".join(c for c in e["figure"] if c.isdigit()))))
    return {
        "schema_version": "1.0.0",
        "dataset_id": "fux-gradus-ad-parnassum-part-III-four-voices",
        "title": "Johann Joseph Fux, Gradus ad Parnassum (1725), Exercitium III: four-voice species counterpoint",
        "generated_by": "tools/fux_import/build_four_voice.py",
        "conventions": "As fux-three-voice.json; voices are listed from the top staff down; cantus_index names the cantus firmus (0 top, 3 bottom).",
        "provenance": {"repository": source["repository"], "commit": source["commit"]},
        "license": "CC0-1.0 (encodings: Mark Gotham / FourScoreAndMore.org)",
        "exercises": exercises,
    }


if __name__ == "__main__":
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    GAME.write_text(json.dumps(game(data), indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)} and {GAME.relative_to(ROOT)}: {len(data['exercises'])} exercises")
