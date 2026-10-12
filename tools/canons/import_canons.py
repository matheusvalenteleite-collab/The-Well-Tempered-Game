#!/usr/bin/env python3
"""Bach's canons (CANON session): the Mutopia editions read by lily.py (repeats as written), written as
notes per voice to data/canons/corpus.json.

Times are in quarter notes from the start; pitches are spelled ("F#4") with their MIDI number and their
diatonic step (7 * octave + letter index, C4 = 28), which is what canonic imitation preserves.
Voices keep the reader's ids (a staff, or a voice of a staff); a voice that sounds two notes at once
keeps both, and the second is flagged "chord"."""
import json
import sys
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import lily  # noqa: E402

lily.WRITTEN = True
SRC = Path("data/sources/bach-canons/mutopia")
OUT = Path("data/canons/corpus.json")

# id, file, set, title (as printed or as the edition names it), key
PIECES = [
    ("gv-aria", "bwv-988-aria.ly", "Goldberg", "Aria", "G"),
    ("gv03", "bwv-988-v03.ly", "Goldberg", "Var. 3, Canone all'Unisuono", "G"),
    ("gv06", "bwv-988-v06.ly", "Goldberg", "Var. 6, Canone alla Seconda", "G"),
    ("gv09", "bwv-988-v09.ly", "Goldberg", "Var. 9, Canone alla Terza", "G"),
    ("gv12", "bwv-988-v12.ly", "Goldberg", "Var. 12, Canone alla Quarta (in moto contrario)", "G"),
    ("gv15", "bwv-988-v15.ly", "Goldberg", "Var. 15, Canone alla Quinta (in moto contrario), andante", "g"),
    ("gv18", "bwv-988-v18.ly", "Goldberg", "Var. 18, Canone alla Sesta", "G"),
    ("gv21", "bwv-988-v21.ly", "Goldberg", "Var. 21, Canone alla Settima", "g"),
    ("gv24", "bwv-988-v24.ly", "Goldberg", "Var. 24, Canone all'Ottava", "G"),
    ("gv27", "bwv-988-v27.ly", "Goldberg", "Var. 27, Canone alla Nona", "G"),
    ("gv30", "bwv-988-v30.ly", "Goldberg", "Var. 30, Quodlibet (not a canon; the ground's last statement)", "G"),
    ("aof-oct", "contrapunctusXII.ly", "Art of Fugue", "Canon alla Ottava", "d"),
    ("aof-12", "contrapunctusXIII.ly", "Art of Fugue", "Canon alla Duodecima in Contrapunto alla Quinta", "d"),
    ("aof-10", "contrapunctusXIV.ly", "Art of Fugue", "Canon alla Decima in Contrapunto alla Terza", "d"),
    ("aof-aug", "contrapunctusXV.ly", "Art of Fugue", "Canon per Augmentationem in Contrario Motu", "d"),
] + [(f"bwv1087-{i:02d}", f"bwv-1087-{i:02d}.ly", "BWV 1087", f"Canon {i}", "G") for i in range(1, 15)]


def q(x: Fraction) -> float:
    return float(x * 4)


def step(p: str) -> int:
    return int(p.lstrip("ABCDEFG#b")) * 7 + "CDEFGAB".index(p[0])


def main() -> None:
    out = {}
    for pid, f, group, title, key in PIECES:
        sc = lily.read(SRC / f)
        voices: dict[str, list] = {}
        for n in sorted((n for n in sc.notes if not n.get("grace")), key=lambda n: (n["onset"], -n["midi"])):
            v = voices.setdefault(n["voice"], [])
            chord = bool(v) and v[-1]["on"] == q(n["onset"])
            v.append({"on": q(n["onset"]), "dur": q(n["duration"]), "p": n["pitch"], "midi": n["midi"],
                      "step": step(n["pitch"]), "bar": n["measure"], **({"chord": True} if chord else {})})
        bars = [{"n": m["number"], "on": q(m["onset"])} for m in sc.measures]
        ts = sc.time_signatures[0]["text"] if sc.time_signatures else "4/4"
        out[pid] = {"set": group, "title": title, "key": key, "file": f, "meter": ts, "length": q(sc.length),
                    "bars": bars, "voices": voices, "warnings": sc.warnings}
        print(pid, ts, len(bars), {k: len(v) for k, v in voices.items()}, sc.warnings[:1])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))


if __name__ == "__main__":
    main()
