"""
Bach's settings laid open (the chorale mode's "hear and read", CONCEPT.md section 5.1; C15): for
each of the 370 chorales, the four voices as written and what the library reads in them, compact
enough for the single-file page.

Per chorale: number, BWV, title, key, signature, meter, the Breitkopf 1784 scan, and Kittel's
melodies it sets (concordance.json); the voices (soprano, alto, tenor, bass), each note [onset,
length, pitch] (and 1 under a fermata), tied notes joined; for every onset [onset, root, chord,
figure], and [[voice, kind], ...] where incidental notes are struck: the fundamental bass (root
and kind of chord, Kirnberger's reading, C3), the figure derived from Bach's voices (period
abbreviation), the incidental notes by voice and kind; the cadences at the phrase ends [onset,
class, final bass degree].

Times are integers in 32nds of a whole note (the finest value in the chorales). Readings, not
source facts: they are the library's (bach_analyse.py), marked so on the screen.

Usage: python3 tools/chorales/study_data.py
"""
from __future__ import annotations

import json
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data/chorales/bach"
OUT = ROOT / "data/chorales/study.json"
VOICES = ["soprano", "alto", "tenor", "bass"]
# The chord tones; every other label is an incidental note.
TONES = {"root", "third", "fifth", "seventh"}
KINDS = ["passing", "neighbour", "suspension", "retardation", "appoggiatura", "anticipation", "escape", "free"]
CHORDS = {"major": "", "minor": "m", "diminished": "o", "dominant seventh": "7", "minor seventh": "m7",
          "triad, third not sounding": "5", "seventh chord, third not sounding (minor seventh)": "7(no 3)"}


def q(x: str) -> int:
    v = F(x) * 32
    assert v.denominator == 1, x
    return int(v)


def voice(notes: list[dict]) -> list[list]:
    out: list[list] = []
    tie_open = False
    for n in notes:
        k = n["kern"]
        if "r" in k and not any(c in k for c in "abcdefgABCDEFG"):  # a rest
            tie_open = False
            continue
        if tie_open and out and out[-1][2] == n["pitch"] and out[-1][0] + out[-1][1] == q(n["offset"]):
            out[-1][1] += q(n["duration"])
            out[-1][3] = out[-1][3] or (1 if ";" in k else 0)
        else:
            out.append([q(n["offset"]), q(n["duration"]), n["pitch"], 1 if ";" in k else 0])
        tie_open = "[" in k or "_" in k
    # The fermata flag only where there is one.
    return [x if x[3] else x[:3] for x in out]


def scan(refs: dict) -> str | None:
    urls = refs.get("URL-scan") or []
    urls = urls if isinstance(urls, list) else [urls]
    for u in urls:
        if "Breitkopf 1784" in u:
            return u.split(" ")[0]
    return urls[0].split(" ")[0] if urls else None


def kittel_tunes() -> dict[int, list[int]]:
    """Bach's settings of Kittel's melodies (the same tune or a variant of it, concordance.json)."""
    rows = json.loads((ROOT / "data/chorales/concordance.json").read_text())["rows"]
    out: dict[int, list[int]] = {}
    for r in rows:
        for m in r["same_tune"] + r["variant_of_tune"]:
            out.setdefault(m["bach"], []).append(r["kittel"])
    return out


def main() -> None:
    kittel = kittel_tunes()
    index = []
    for f in sorted((BACH / "chorales").glob("bach_*.json")):
        c = json.loads(f.read_text())
        a = json.loads((BACH / "analysis" / f.name).read_text())
        sig = c["key_signature"] or ""
        acc = sig.count("#") - sig.count("-")
        harmony = []
        for v in a["verticalities"]:
            inc = [[VOICES.index(p), KINDS.index(lab)] for p, lab in v.get("labels", {}).items() if lab not in TONES and lab in KINDS]
            row = [q(v["t"]), v.get("root") or "", CHORDS.get(v.get("chord") or "", "?") if v.get("root") else "", v.get("figure", "")]
            harmony.append(row + [inc] if inc else row)
        cad = [[q(x["final"]["t"]), x["class"], x.get("final_bass_degree") or ""] for x in a["cadences"]]
        m = c["measures"]
        index.append({
            "n": c["number"], "bwv": c["bwv"], "title": c["title"]["de"], "tonic": c["key"]["tonic"], "mode": c["key"]["mode"],
            "sig": acc, "meter": c["meters"][0]["meter"], "pickup": q(m[1]["offset"]) if m and m[0]["number"] == 0 and len(m) > 1 else 0,
            "length": q(c["length"]), "scan": scan(c["references"]), **({"kittel": sorted(set(kittel[c["number"]]))} if c["number"] in kittel else {}),
            "voices": [voice(c["voices"][x]) for x in VOICES], "harmony": harmony, "cadences": cad,
        })
    OUT.write_text(json.dumps({"generated_by": "tools/chorales/study_data.py", "unit": "1/32 whole note", "voices": VOICES, "kinds": KINDS,
                               "chorales": index}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(index)} chorales, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
