"""
Level 5 of the chorale mode, the voices (CONCEPT.md section 3; C16, C17): the alto and tenor
written over one of Kittel's figured basses, under the melody, one note to each of his harmonies.

For each of Kittel's 24 melodies and each of his 194 basses: the melody (main notes; the small ones
are passing notes and are left out of the score), the bass, and the slots of the inner voices, one
at every onset where Kittel's chord changes ([onset, length, soprano sounding, bass sounding, root,
kind, the bass's role, the printed figure, the chord's letters above the bass with their roles]).

And Bach's habits for what the inner voices decide, counted in contexts fine enough to discipline
(C16), each with examples (chorale number, bar):
  - doubling: which member a triad doubles, by kind and by the bass's member;
  - the seventh of a seventh chord: how it goes on, by its voice, whether it was prepared (the same
    pitch in the same voice at the onset before) and whether the bass moves;
  - the leading tone (the third of a dominant whose root then falls a fifth): how it goes on, by voice;
  - spacing: the upper voices more than an octave apart, the tenor more than a twelfth over the bass.

Times are integers in 32nds of a whole note, as in study.json. Readings, not source facts.

Usage: python3 tools/chorales/voice_plans.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cadence_plans import pcn  # noqa: E402
from figure_plans import printed, sounding  # noqa: E402
from harmony_plans import merged, nw_pairs  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
KIT = ROOT / "data" / "chorales" / "kittel"
OUT = ROOT / "data" / "chorales" / "level5.json"
LETTERS = "CDEFGAB"
VOICES = ["soprano", "alto", "tenor", "bass"]
TRIADS = {"major", "minor", "diminished", "augmented"}
EXAMPLES = 3


def q(x) -> int:
    v = F(x) * 32
    assert v.denominator == 1, x
    return int(v)


def letter_role(root: str, letter: str) -> str:
    """The member a letter is of a chord on `root`, by letter distance (C to E a third, and so on)."""
    d = (LETTERS.index(letter) - LETTERS.index(root[0])) % 7
    return {0: "root", 2: "third", 4: "fifth", 6: "seventh"}.get(d, "other")


def midi(p: str) -> int:
    acc = p[1:].rstrip("0123456789-")
    octave = int(p[1 + len(acc):])
    return 12 * (octave + 1) + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[p[0]] + acc.count("#") - acc.count("b") - acc.count("-")


class Habit:
    """Counts by context, with the first few examples of each outcome."""

    def __init__(self) -> None:
        self.n: dict[str, Counter] = defaultdict(Counter)
        self.ex: dict[tuple[str, str], list[list[int]]] = defaultdict(list)

    def add(self, ctx: str, outcome: str, no: int, bar: int) -> None:
        self.n[ctx][outcome] += 1
        if len(self.ex[(ctx, outcome)]) < EXAMPLES:
            self.ex[(ctx, outcome)].append([no, bar])

    def table(self) -> dict:
        return {ctx: {"n": sum(c.values()), "options": [[o, k, self.ex[(ctx, o)]] for o, k in c.most_common()]} for ctx, c in sorted(self.n.items())}


def motion(a: str, b: str) -> str:
    """How a voice goes on: held, a step or a leap, up or down (semitones for the step's size)."""
    d = midi(b) - midi(a)
    if d == 0:
        return "held"
    return ("step " if abs(d) <= 2 else "leap ") + ("up" if d > 0 else "down")


def bach_habits() -> dict:
    doubling, seventh, leading, spacing = Habit(), Habit(), Habit(), Habit()
    for f in sorted((BACH / "analysis").glob("bach_*.json")):
        a = json.loads(f.read_text())
        no = a["number"]
        vs = [v for v in a["verticalities"] if all(v["pitches"].get(x) for x in VOICES)]
        for i, v in enumerate(vs):
            P, L, bar = v["pitches"], v.get("labels", {}), v["measure"]
            nxt = vs[i + 1] if i + 1 < len(vs) else None
            prv = vs[i - 1] if i > 0 else None
            if v["on_beat"]:
                # Doubling: a triad with every voice on a chord member.
                if v.get("chord") in TRIADS and all(L.get(x) in ("root", "third", "fifth") for x in VOICES):
                    c = Counter(L[x] for x in VOICES)
                    doubled = [m for m, k in c.items() if k >= 2]
                    if len(doubled) == 1:
                        doubling.add(f"{v['chord']}|{v.get('bass_role')}", doubled[0] + ("" if c[doubled[0]] == 2 else "×3"), no, bar)
                # Spacing.
                spacing.add("soprano-alto", "over an octave" if midi(P["soprano"]) - midi(P["alto"]) > 12 else "within", no, bar)
                spacing.add("alto-tenor", "over an octave" if midi(P["alto"]) - midi(P["tenor"]) > 12 else "within", no, bar)
                spacing.add("tenor-bass", "over a twelfth" if midi(P["tenor"]) - midi(P["bass"]) > 19 else "within", no, bar)
                # The seventh in an inner voice.
                # Its resolution is read at the next change of chord (not at a passing note in another voice).
                change = next((w for w in vs[i + 1:] if (w.get("root"), w.get("chord")) != (v.get("root"), v.get("chord"))), None)
                if change:
                    for x in ("alto", "tenor"):
                        if L.get(x) == "seventh":
                            prepared = "prepared" if prv and prv["pitches"].get(x) == P[x] else "free"
                            bass = "bass moves" if change["pitches"]["bass"] != P["bass"] else "bass holds"
                            seventh.add(f"{x}|{prepared}|{bass}", motion(P[x], change["pitches"][x]), no, bar)
            # The leading tone: the third of a dominant whose root then falls a fifth.
            if nxt and v.get("chord") in ("major", "dominant seventh") and v.get("root") and nxt.get("root") and nxt["root"] != v["root"]:
                if (pcn(v["root"]) - pcn(nxt["root"])) % 12 == 7:
                    for x in ("alto", "tenor"):
                        if L.get(x) == "third":
                            d = midi(nxt["pitches"][x]) - midi(P[x])
                            leading.add(x, "rises a semitone" if d == 1 else "falls a third" if d in (-3, -4) else "held" if d == 0 else "other", no, bar)
    return {"doubling": doubling.table(), "seventh": seventh.table(), "leading": leading.table(), "spacing": spacing.table()}


def pickup(c: dict) -> int:
    """The upbeat's length, where the first bar is shorter than the meter's."""
    num, den = (int(x) for x in c["meter"].split("/"))
    first = q(c["measures"][0]["length"])
    return first if first < 32 * num // den else 0


def diatonic(p: str) -> int:
    """Letter steps from C0 (C4 is 28): the spelling's place, whatever its accidental."""
    acc = p[1:].rstrip("0123456789-")
    return LETTERS.index(p[0]) + 7 * int(p[1 + len(acc):])


def transpose(p: str, steps: int, semis: int) -> str:
    """A pitch moved by `steps` letters and `semis` semitones, spelled (sharps and flats as needed)."""
    d = diatonic(p) + steps
    letter, octave = LETTERS[d % 7], d // 7
    natural = 12 * (octave + 1) + {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[letter]
    alter = midi(p) + semis - natural
    return f"{letter}{'#' * alter if alter > 0 else 'b' * -alter}{octave}"


def bach_settings(number: int, mel: list[dict]) -> list[dict]:
    """Bach's settings of the tune (the concordance's same tune), in Kittel's key: at each of
    Kittel's melody notes that the alignment matches, Bach's alto, tenor and bass sounding there
    (null elsewhere)."""
    rows = {r["kittel"]: r for r in json.loads((ROOT / "data" / "chorales" / "concordance.json").read_text())["rows"]}
    out = []
    for st in rows.get(number, {}).get("same_tune", []):
        bc = json.loads((BACH / "chorales" / f"bach_{st['bach']:03d}.json").read_text())
        ba = json.loads((BACH / "analysis" / f"bach_{st['bach']:03d}.json").read_text())
        sop = merged(bc["voices"]["soprano"])
        pairs = nw_pairs([n["midi"] for n in mel], [n["midi"] + st["transposition"] for n in sop])
        if not pairs:
            continue
        i0, j0 = pairs[0]
        steps = diatonic(mel[i0]["pitch"]) - diatonic(sop[j0]["pitch"])
        vs = ba["verticalities"]
        inner: list = [None] * len(mel)
        for i, j in pairs:
            t = F(sop[j]["offset"])
            v = next((x for x in reversed(vs) if F(x["t"]) <= t), None)
            if v and all(v["pitches"].get(x) for x in ("alto", "tenor", "bass")):
                inner[i] = [transpose(v["pitches"][x], steps, st["transposition"]) for x in ("alto", "tenor", "bass")]
        out.append({"no": st["bach"], "bwv": st["bwv"], "title": st["title"], "inner": inner})
    return out


def kittel_level5() -> list[dict]:
    out = []
    for p in sorted(KIT.glob("kittel_*.json")):
        c = json.loads(p.read_text())
        a = json.loads((KIT / "analysis" / p.name).read_text())
        hs1 = [h for h in a["basses"][0]["harmonies"] if h.get("root")]
        tonic = hs1[-1]["root"] if hs1 else "C"
        mode = "major" if pcn(tonic) == (7 * c["key_signature"]) % 12 else "minor"
        mel = merged(c["melody"]["notes"])
        end = q(c["length"])
        melody = [[q(n["offset"]), (q(mel[i + 1]["offset"]) if i + 1 < len(mel) else end) - q(n["offset"]), n["pitch"]] + ([1] if n.get("fermata") else []) for i, n in enumerate(mel)]
        basses = []
        for b, ab in zip(c["basses"], a["basses"]):
            figs = {F(f["onset"]): f for f in b.get("figures", []) if f.get("onset")}
            bn = merged(b["notes"])
            bass = [[q(n["offset"]), (q(bn[i + 1]["offset"]) if i + 1 < len(bn) else end) - q(n["offset"]), n["pitch"]] for i, n in enumerate(bn)]
            hs = [h for h in ab["harmonies"] if h.get("root") and h.get("kind")]
            slots = []
            for i, h in enumerate(hs):
                t = F(h["t"])
                nxt = q(hs[i + 1]["t"]) if i + 1 < len(hs) else end
                s = sounding(mel, t)
                bs = sounding(bn, t)
                if not s or not bs:
                    continue
                above = [x for x in h["figure"].split("/") if x] if h.get("figure") else []
                slots.append([q(t), nxt - q(t), s["pitch"], bs["pitch"], h["root"], h["kind"], h.get("bass_role") or "",
                              printed(figs[t]["stack"]) if t in figs else "", [[x, letter_role(h["root"], x[0])] for x in above]])
            basses.append({"label": b["label"], "bass": bass, "slots": slots})
        out.append({"number": c["number"], "title": c["title"], "tonic": tonic, "mode": mode, "sig": c["key_signature"], "meter": c["meter"],
                    "pickup": pickup(c), "length": end, "melody": melody, "basses": basses, "bach": bach_settings(c["number"], mel)})
    return out


SLOT_FIELDS = ["at", "dur", "soprano", "bass", "root", "kind", "bassRole", "printed", "above"]


def main() -> None:
    data = {"generated_by": "tools/chorales/voice_plans.py", "unit": "1/32 whole note", "slotFields": SLOT_FIELDS,
            "habits": bach_habits(), "chorales": kittel_level5()}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    n = sum(len(b["slots"]) for c in data["chorales"] for b in c["basses"])
    print(f"wrote {OUT.relative_to(ROOT)}: {len(data['chorales'])} melodies, {n} slots, {OUT.stat().st_size // 1024} KB")
    for k, v in data["habits"].items():
        print(k, len(v), "contexts")


if __name__ == "__main__":
    main()
