"""Roman numerals in the textbooks' convention, in the local key (C32, C33).

A chord is named as a degree of the key its passage is in. A tonicisation is an applied chord of that
key (V/V, vii°/ii); a modulation is shown by the new key's name where its region begins (the screens
do that), and the pivot read in both keys (the screens too, with `numeral_in`). In minor the degrees
are those of the minor scale (III, VI, VII for the relative major, the subdominant's major and the
subtonic; V and vii° with the raised leading tone, IV and ii with the melodic minor's raised sixth).

The local keys of Bach's 370 come from the generator session's reading (data/chorales/local-keys.json,
C31). Kittel's 24 melodies have none of their own: each note takes the local key of the note of Bach's
settings of the same tune aligned with it (the concordance; the key transposed to Kittel's), the
majority where there are several settings, the key before where there is none, the home key at the
start and where no setting exists.

Every label in levels 2-4 is computed by this module from a root and a chord kind, so that the
player's answers, Kittel's chords, Bach's chords and Bach's habit are named the same way.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / "data/chorales/local-keys.json"
PCS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
LETTERS = "CDEFGAB"
NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"]
SCALE = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10]}
NAMES_SHARP = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def pcn(name: str) -> int:
    acc = name[1:].rstrip("0123456789-")
    return (PCS[name[0]] + acc.count("#") - acc.count("b")) % 12


def quality(kind: str | None) -> str:
    if not kind:
        return "?"
    if kind.startswith("major") or kind.startswith("dominant"):
        return "major"
    if kind.startswith("minor"):
        return "minor"
    if kind.startswith("diminished") or kind.startswith("half"):
        return "diminished"
    return "open"


# The degree of a root so many semitones above the tonic, against the mode's scale; the chromatic
# roots named as the textbooks name them (bII, bIII, #IV, bVI, bVII in major; bII, #III, #IV, #VI in
# minor, where VII is the subtonic and the raised leading tone's chord is vii°).
DEGREES = {
    "major": ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"],
    "minor": ["I", "bII", "II", "III", "#III", "IV", "#IV", "V", "VI", "#VI", "VII", "VII"],
}


# The degrees a chord can be applied to, with their quality.
TARGETS = {
    "major": {2: "minor", 4: "minor", 5: "major", 7: "major", 9: "minor"},
    "minor": {3: "major", 5: "minor", 7: "major", 8: "major", 10: "major"},
}


def degree_name(semis: int, mode: str) -> str:
    return DEGREES["major" if mode == "major" else "minor"][semis % 12]


def label(root_pc: int, q: str, tonic_pc: int, mode: str) -> str:
    """The plain numeral of a chord in a key (case by quality, ° for diminished)."""
    n = degree_name((root_pc - tonic_pc) % 12, mode)
    if q == "minor":
        return n.lower()
    if q == "diminished":
        return n.lower() + "°"
    return n


def diatonic(root_pc: int, q: str, tonic_pc: int, mode: str) -> bool:
    third = {"major": 4, "minor": 3, "diminished": 3}.get(q)
    fifth = {"major": 7, "minor": 7, "diminished": 6}.get(q)
    if third is None:
        return False
    scale = {(tonic_pc + x) % 12 for x in SCALE["major" if mode == "major" else "minor"]}
    if mode != "major":
        scale |= {(tonic_pc + 9) % 12, (tonic_pc + 11) % 12}  # the melodic minor's raised sixth and leading tone: V, vii°, IV, ii
    return {root_pc, (root_pc + third) % 12, (root_pc + fifth) % 12} <= scale


def in_key(root_pc: int, q: str, tonic_pc: int, mode: str) -> str:
    """A chord in the convention: diatonic, else applied to a degree of the key (a major chord a fifth
    above it, or a diminished one a semitone below), else chromatic."""
    if q == "?":
        return "?"
    if q == "open":  # no third sounding: named by its root
        return label(root_pc, "major", tonic_pc, mode)
    if diatonic(root_pc, q, tonic_pc, mode):
        return label(root_pc, q, tonic_pc, mode)
    for target, kind in (((root_pc - 7) % 12, "V"), ((root_pc + 1) % 12, "vii°")):
        if (kind == "V" and q != "major") or (kind == "vii°" and q != "diminished"):
            continue
        if target == tonic_pc:
            continue
        # The degree applied to, with its quality in the key (in minor, the harmonic minor's: iv, V, VI ...).
        tq = TARGETS["major" if mode == "major" else "minor"].get((target - tonic_pc) % 12)
        if tq:
            return f"{kind}/{label(target, tq, tonic_pc, mode)}"
    return label(root_pc, q, tonic_pc, mode)


def key_name(tonic_pc: int, mode: str, spelled: str | None = None) -> str:
    name = spelled or NAMES_SHARP[tonic_pc]
    return name if mode == "major" else name + "m"


def bach_local() -> dict[int, dict[str, tuple[str, str]]]:
    """Bach's chorales: at each on-beat soprano attack (by onset), the local key (tonic, mode)."""
    if not LOCAL.exists():
        return {}
    raw = json.loads(LOCAL.read_text())["chorales"]
    return {int(n): {e[0]: (e[1], "major" if e[2] == "major" else "minor") for e in es} for n, es in raw.items()}


def kittel_regions(mel: list[dict], settings: list[dict], home: tuple[str, str], align) -> list[tuple[str, str]]:
    """The local key of each of Kittel's melody notes from Bach's settings of the tune (see above).
    `settings`: [{"sop": Bach's merged soprano notes, "transposition": semitones, "local": t -> key}],
    `align(a, b)`: the note-by-note alignment of two pitch sequences."""
    votes: list[Counter] = [Counter() for _ in mel]
    from fractions import Fraction as F
    for s in settings:
        for i, j in align([n["midi"] for n in mel], [n["midi"] + s["transposition"] for n in s["sop"]]):
            k = s["local"].get(str(F(s["sop"][j]["offset"])))
            if k:
                votes[i][((pcn(k[0]) + s["transposition"]) % 12, k[1])] += 1
    out: list[tuple[str, str]] = []
    prev = (pcn(home[0]), home[1])
    for v in votes:
        if v:
            prev = v.most_common(1)[0][0]
        out.append(prev)
    # Spelled tonic: the home key's spelling where it is home, else a sharp-or-flat name by the key signature's side.
    return [(home[0] if pc == pcn(home[0]) else spell(pc, home), m) for pc, m in out]


def spell(pc: int, home: tuple[str, str]) -> str:
    flats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
    flat_side = pcn(home[0]) in (5, 10, 3, 8, 1) or (home[1] != "major" and pcn(home[0]) in (2, 7, 0, 5))
    return flats[pc] if flat_side else NAMES_SHARP[pc]


def kittel_keys() -> dict[int, list[tuple[str, tuple[str, str]]]]:
    """Kittel's melodies: each melody note's local key as level 2 found it, [(offset, (tonic, mode))],
    in time order (harmony_plans.py writes them; levels 3 and 4 read them)."""
    path = ROOT / "data/chorales/level2.json"
    out = {}
    for c in json.loads(path.read_text())["chorales"]:
        notes = [dict(zip(json.loads(path.read_text()).get("noteFields", []), n)) if isinstance(n, list) else n for n in c["notes"]]
        out[c["number"]] = [(n["offset"], tuple(n["key"])) for n in notes]
    return out


def key_at(keys: list[tuple[str, tuple[str, str]]], t, home: tuple[str, str]) -> tuple[str, str]:
    """The local key sounding at time `t` (a Fraction): the key of the last melody note at or before it."""
    from fractions import Fraction as F
    k = home
    for off, key in keys:
        if F(off) <= t:
            k = key
        else:
            break
    return k


def bach_key_at(local: dict[str, tuple[str, str]], t: str, home: tuple[str, str]) -> tuple[str, str]:
    """Bach's local key at any onset: the key of the last on-beat soprano attack at or before it."""
    from fractions import Fraction as F
    if t in local:
        return local[t]
    ft, best, k = F(t), None, home
    for x, key in local.items():
        fx = F(x)
        if fx <= ft and (best is None or fx > best):
            best, k = fx, key
    return k
