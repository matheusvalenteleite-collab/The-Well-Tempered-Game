"""Build data/fux/three-voice/fux-three-voice.json from the vendored Exercitium II files.

Reads data/sources/fux-species/II/sp*/gap_*.krn (version of record) and the matching .json
metadata (figure, species, modal final, cantus part, original clefs, printed page) and writes one
record per exercise, its three parts listed from the top down (upstream part 1 = top). Stdlib only.

Usage: python3 tools/fux_import/build_three_voice.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from kern import read_kern  # noqa: E402
from pitch import frac  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "sources" / "fux-species"
OUT = ROOT / "data" / "fux" / "three-voice" / "fux-three-voice.json"


def build() -> dict:
    source = json.loads((SRC / "SOURCE.json").read_text())
    exercises = []
    for krn in sorted(SRC.glob("II/sp*/gap_*.krn")):
        meta = json.loads(krn.with_suffix(".json").read_text())
        if meta.get("voices") != 3:
            raise ValueError(f"{krn}: expected three voices")
        score = read_kern(krn)
        parts = sorted(score.parts, key=lambda p: int(p.part or 0))
        if [p.part for p in parts] != ["1", "2", "3"]:
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
            # 0 = top, 1 = middle, 2 = bottom.
            "cantus_index": int(meta["cantus_firmus"]["part"]) - 1,
            "measures": meta["measures"],
            "clefs_1725": meta["clefs"],
            "page": meta["page"],
            "pdf_page": meta["source"]["pdf_page"],
            "voices": voices,
        })
    exercises.sort(key=lambda e: (e["species"][0], int("".join(c for c in e["figure"] if c.isdigit()))))
    return {
        "schema_version": "1.0.0",
        "dataset_id": "fux-gradus-ad-parnassum-part-II-three-voices",
        "title": "Johann Joseph Fux, Gradus ad Parnassum (1725), Exercitium II: three-voice species counterpoint",
        "generated_by": "tools/fux_import/build_three_voice.py",
        "conventions": "As fux-two-voice.json; voices are listed from the top staff down; cantus_index names the cantus firmus (0 top, 2 bottom).",
        "provenance": {"repository": source["repository"], "commit": source["commit"]},
        "license": "CC0-1.0 (encodings: Mark Gotham / FourScoreAndMore.org)",
        "exercises": exercises,
    }


if __name__ == "__main__":
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(data['exercises'])} exercises")
