#!/usr/bin/env python3
"""Level 2 of the chorale mode (CONCEPT.md): the harmony, a chord under every melody note.

Bach's practice. For every on-beat soprano attack in the 370 chorales: the melody's scale degree,
the chord Bach puts under it (its root as a degree of the chorale's key and its quality, Kirnberger's
fundamental as tools/chorales/kirnberger.py reads it) and the chord before. From these, Bach's habit
at each melody degree, and after each chord.

How much of Bach's choice the context predicts is measured as the Choices lab measured level 1
(docs/chorales-lab/cadence-study.md on its branch): each tune held out in turn (all its settings
together; a tune is identified by its melody's first eight intervals, whatever the text and key), the
chords ranked by the counts of the other tunes; the mean
surprise at Bach's chord in bits, how often it is ranked first and among the first three.

Kittel's 24 melodies. For each melody note: the chords under it in Kittel's 8-9 basses, the chord
in Bach's settings of the same tune (the melodies aligned note by note, as in the concordance), and
Bach's habit at that melody degree; the options offered to the player are the commonest chords in
Bach's habit there plus every chord Bach or Kittel actually uses, in a fixed (diatonic) order.

Output: data/chorales/level2.json and docs/chorales/LEVEL2.md.

Run:  python3 tools/chorales/harmony_plans.py
"""
from __future__ import annotations

import json
import math
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cadence_plans import MINORISH, ROMAN, chord_label, degree, pcn, quality  # noqa: E402
from concordance import GAP_BACH, GAP_KITTEL, SUBST  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
KIT = ROOT / "data" / "chorales" / "kittel"
OUT_JSON = ROOT / "data" / "chorales" / "level2.json"
OUT_MD = ROOT / "docs" / "chorales" / "LEVEL2.md"
ORDER = [r for pc in range(12) for r in (ROMAN[pc], ROMAN[pc].lower(), ROMAN[pc].lower() + "°", ROMAN[pc] + "°")]


def order_key(label: str) -> int:
    return ORDER.index(label) if label in ORDER else len(ORDER)


def tune_key(soprano: list[dict]) -> str:
    """The tune, independent of text and key: the intervals of the melody's first eight notes."""
    m = [n["midi"] for n in merged(soprano)][:9]
    return " ".join(str(b - a) for a, b in zip(m, m[1:]))


def bach_events() -> list[dict]:
    """One event per on-beat soprano attack with a reading: the chorale, its tune, the mode, the
    melody degree, the chord and the chord before."""
    index = json.loads((BACH / "index.json").read_text())
    out = []
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = json.loads((BACH / "analysis" / f"{c['id']}.json").read_text())
        tonic_name = c["key"]["tonic"]
        tonic = pcn(tonic_name)
        mode = "minor" if c["key"]["mode"] in MINORISH else "major"
        prev = "start"
        for v in a["verticalities"]:
            if not v["on_beat"] or "soprano" not in v["struck"] or not v["root"]:
                continue
            ch = chord_label(pcn(v["root"]), tonic, quality(v["chord"]))
            out.append({"no": c["number"], "tune": tune_key(c["voices"]["soprano"]), "mode": mode, "measure": v["measure"], "t": v["t"],
                        "deg": degree(v["pitches"]["soprano"], tonic_name), "chord": ch, "prev": prev})
            prev = ch
    return out


class Model:
    """Counts of the chord in a context, backed off to coarser contexts where the fine one is thin."""

    def __init__(self, events: list[dict], fields: list[str]):
        self.fields = fields
        self.counts = [defaultdict(Counter) for _ in fields]
        self.vocab = Counter(e["chord"] for e in events)
        for e in events:
            for k in range(len(fields)):
                self.counts[k][tuple(e[f] for f in fields[: k + 1])][e["chord"]] += 1

    def dist(self, e: dict) -> dict[str, float]:
        """Interpolated: each level weighted by its count (Witten-Bell style), add-one at the bottom."""
        total_v = sum(self.vocab.values())
        p = {c: (n + 1) / (total_v + len(self.vocab)) for c, n in self.vocab.items()}
        for k in range(len(self.fields)):
            cnt = self.counts[k].get(tuple(e[f] for f in self.fields[: k + 1]))
            if not cnt:
                continue
            n, types = sum(cnt.values()), len(cnt)
            lam = n / (n + types)
            p = {c: lam * cnt.get(c, 0) / n + (1 - lam) * q for c, q in p.items()}
        return p


def evaluate(events: list[dict], fields: list[str]) -> dict:
    tunes = sorted({e["tune"] for e in events})
    by = defaultdict(list)
    for e in events:
        by[e["tune"]].append(e)
    bits = first = top3 = n = 0
    for t in tunes:
        train = [e for e in events if e["tune"] != t]
        m = Model(train, fields)
        for e in by[t]:
            p = m.dist(e)
            q = p.get(e["chord"], 1e-6)
            bits += -math.log2(q)
            ranked = sorted(p, key=lambda c: -p[c])
            first += ranked[0] == e["chord"]
            top3 += e["chord"] in ranked[:3]
            n += 1
    return {"bits": bits / n, "first": first / n, "top3": top3 / n, "n": n, "tunes": len(tunes)}


def nw_pairs(k: list[int], b: list[int]) -> list[tuple[int, int]]:
    """The aligned pairs (Kittel note, Bach note) of the concordance's global alignment."""
    n, m = len(k), len(b)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for j in range(1, m + 1):
        D[0][j] = j * GAP_BACH
    for i in range(1, n + 1):
        D[i][0] = i * GAP_KITTEL
        for j in range(1, m + 1):
            D[i][j] = min(D[i - 1][j - 1] + (0 if k[i - 1] == b[j - 1] else SUBST), D[i - 1][j] + GAP_KITTEL, D[i][j - 1] + GAP_BACH)
    i, j, pairs = n, m, []
    while i > 0 and j > 0:
        if D[i][j] == D[i - 1][j - 1] + (0 if k[i - 1] == b[j - 1] else SUBST):
            if k[i - 1] == b[j - 1]:
                pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif D[i][j] == D[i - 1][j] + GAP_KITTEL:
            i -= 1
        else:
            j -= 1
    return pairs[::-1]


def merged(notes: list[dict]) -> list[dict]:
    out = []
    for n in notes:
        if n.get("rest") or n.get("grace") or n.get("midi") is None:
            continue
        if n.get("tie") in ("stop", "continue") and out:
            continue
        out.append(n)
    return out


def kittel_level2(events: list[dict]) -> list[dict]:
    conc = {r["kittel"]: r for r in json.loads((ROOT / "data" / "chorales" / "concordance.json").read_text())["rows"]}
    habit = Model(events, ["mode", "deg"])
    examples = defaultdict(list)
    for e in events:
        key = (e["mode"], e["deg"], e["chord"])
        if len(examples[key]) < 2:
            examples[key].append({"no": e["no"], "bar": e["measure"]})
    out = []
    for p in sorted(KIT.glob("kittel_*.json")):
        c = json.loads(p.read_text())
        a = json.loads((KIT / "analysis" / p.name).read_text())
        mel = merged(c["melody"]["notes"])
        hs1 = [h for h in a["basses"][0]["harmonies"] if h.get("root")]
        tonic_name = hs1[-1]["root"] if hs1 else "C"
        tonic = pcn(tonic_name)
        mode = "major" if tonic == (7 * c["key_signature"]) % 12 else "minor"
        # Bach's settings of the tune, aligned note by note
        bach_at: dict[int, list[dict]] = defaultdict(list)
        for s in conc.get(c["number"], {}).get("same_tune", []):
            bc = json.loads((BACH / "chorales" / f"bach_{s['bach']:03d}.json").read_text())
            ba = json.loads((BACH / "analysis" / f"bach_{s['bach']:03d}.json").read_text())
            sop = merged(bc["voices"]["soprano"])
            vt = {v["t"]: v for v in ba["verticalities"]}
            btonic = bc["key"]["tonic"]
            for i, j in nw_pairs([n["midi"] for n in mel], [n["midi"] + s["transposition"] for n in sop]):
                key_t = str(F(sop[j]["offset"]))
                v = vt.get(key_t)
                if v is None:
                    # the last verticality at or before the note
                    cands = [x for x in ba["verticalities"] if F(x["t"]) <= F(sop[j]["offset"])]
                    v = cands[-1] if cands else None
                if v and v["root"]:
                    bach_at[i].append({"no": s["bach"], "chord": chord_label(pcn(v["root"]), pcn(btonic), quality(v["chord"])), "bar": v["measure"]})
        notes = []
        for i, n in enumerate(mel):
            t = F(n["offset"])
            kit = []
            for b in a["basses"]:
                h = None
                for x in b["harmonies"]:
                    if F(x["t"]) <= t and x.get("root"):
                        h = x
                kit.append({"bass": b["label"], "chord": chord_label(pcn(h["root"]), tonic, quality(h["kind"])) if h else "?"})
            deg = degree(n["pitch"], tonic_name)
            dist = habit.dist({"mode": mode, "deg": deg})
            cnt = habit.counts[1].get((mode, deg), Counter())
            total = sum(cnt.values())
            top = [c for c, _ in cnt.most_common(4)]
            used = {x["chord"] for x in kit if x["chord"] != "?"} | {x["chord"] for x in bach_at[i]}
            options = sorted(set(top) | used, key=order_key)
            notes.append({
                "offset": n["offset"], "measure": n["measure"], "pitch": n["pitch"], "degree": deg, "fermata": bool(n.get("fermata")),
                "options": options, "kittel": kit, "bach": bach_at[i],
                "habit": {"n": total, "options": [{"chord": ch, "count": k, "examples": examples[(mode, deg, ch)]} for ch, k in cnt.most_common(6)]},
                "predicted": max(dist, key=dist.get) if dist else None,
            })
        out.append({"number": c["number"], "title": c["title"], "tonic": tonic_name, "mode": mode, "notes": notes})
    return out


def main() -> None:
    events = bach_events()
    models = [
        ("mode only", ["mode"]),
        ("mode + melody degree", ["mode", "deg"]),
        ("mode + melody degree + chord before", ["mode", "deg", "prev"]),
        ("mode + chord before + melody degree", ["mode", "prev", "deg"]),
    ]
    results = [(name, evaluate(events, f)) for name, f in models]
    kit = kittel_level2(events)
    OUT_JSON.write_text(json.dumps({"generated_by": "tools/chorales/harmony_plans.py", "level": 2,
                                    "note": "Chords as degrees of the chorale's key (Roman numerals; lower case minor, ° diminished), Kirnberger's fundamentals as tools/chorales/kirnberger.py reads them.",
                                    "chorales": kit}, ensure_ascii=False, separators=(",", ":")) + "\n")
    n_notes = sum(len(c["notes"]) for c in kit)
    with_bach = sum(1 for c in kit for n in c["notes"] if n["bach"])
    agree_kb = sum(1 for c in kit for n in c["notes"] if n["bach"] and any(k["chord"] == n["bach"][0]["chord"] for k in n["kittel"]))
    kit_spread = sum(len({k["chord"] for k in n["kittel"]}) for c in kit for n in c["notes"]) / max(1, n_notes)
    md = ["# Level 2: the chord under every melody note", "",
          "Generated by `tools/chorales/harmony_plans.py` (method in its docstring).", "",
          f"**Bach: {len(events)} on-beat soprano attacks in 370 chorales, {results[0][1]['tunes']} tunes.** Each tune held out in turn;",
          "**bits**: mean surprise at Bach's chord (lower is better); **first** / **top 3**: Bach's chord ranked first / in the first three.", "",
          "| model | bits | first | top 3 |", "|---|---|---|---|"]
    md += [f"| {name} | {r['bits']:.2f} | {100 * r['first']:.0f}% | {100 * r['top3']:.0f}% |" for name, r in results]
    md += ["", f"**Kittel's 24 melodies: {n_notes} melody notes.** Bach's chord known (an aligned setting of the tune) under {with_bach};",
           f"of those, one of Kittel's basses has Bach's chord under {agree_kb} ({100 * agree_kb / max(1, with_bach):.0f}%). Kittel's basses",
           f"put {kit_spread:.1f} different chords under a melody note on average: the many-basses exercise is, at level 2, a",
           "choice among a few chords at almost every note.", "",
           "## Reading", "",
           "- The melody degree alone is a strong cue (the chord must contain the note); the chord before adds to it.",
           "  The numbers say how far a habit can guide the player and how much is left open: at level 2, as at level 1,",
           "  the screen should show the distribution and Bach's and Kittel's choices, never a single answer.",
           "- Chords are degrees of the chorale's home key: a passage in the dominant reads as II, V, and so on.",
           "  Local keys are the next refinement (they would make the habit sharper inside modulations).",
           "- Tested for confounds by the Choices lab (branch claude/beautiful-mccarthy-7li5nv, commit edc0595,",
           "  docs/chorales-lab/level2-confounds.md), each tune held out: the chord before still helps inside the phrase with",
           "  the chord changing (2.27 to 2.11 bits, 44% to 51% first), but most where Bach keeps the chord (1.84 to 1.29 bits,",
           "  53% to 76%), which is harmonic rhythm rather than progression. For the screen: the next-chord distribution as a",
           "  suggestion, and a sign when the melody note invites keeping the chord."]
    OUT_MD.write_text("\n".join(md) + "\n")
    print("\n".join(md[7:13]))
    print(md[14], md[15], md[16])


if __name__ == "__main__":
    main()
