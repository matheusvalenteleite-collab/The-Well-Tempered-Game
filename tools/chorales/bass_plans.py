#!/usr/bin/env python3
"""Level 3 of the chorale mode (CONCEPT.md): the bass under the melody.

Kittel's book is this level: eight or nine basses under one melody. For every melody note the
player chooses the bass note, as a scale degree of the chorale's key (the octave follows the line:
the nearest to the bass before). The comparison, as at levels 1 and 2: the bass notes of Kittel's
basses at that note, the bass of Bach's settings of the tune (aligned note by note), and Bach's
habit, the bass degree under this melody degree after the bass before, with examples.

Bach's habit is measured as at level 2 (each tune held out in turn; the tune identified by its
melody): how well the melody degree, the bass before, and both, predict Bach's bass degree.

Output: data/chorales/level3.json and docs/chorales/LEVEL3.md.
Run:  python3 tools/chorales/bass_plans.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cadence_plans import MINORISH, degree, pcn  # noqa: E402
from harmony_plans import Model, merged, nw_pairs, tune_key  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
KIT = ROOT / "data" / "chorales" / "kittel"
OUT_JSON = ROOT / "data" / "chorales" / "level3.json"
OUT_MD = ROOT / "docs" / "chorales" / "LEVEL3.md"
DEGREES = ["1", "#1", "b2", "2", "#2", "b3", "3", "4", "#4", "b5", "5", "#5", "b6", "6", "#6", "b7", "7"]


def order_key(d: str) -> int:
    return DEGREES.index(d) if d in DEGREES else len(DEGREES)


def bach_events() -> list[dict]:
    index = json.loads((BACH / "index.json").read_text())
    out = []
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = json.loads((BACH / "analysis" / f"{c['id']}.json").read_text())
        tonic = c["key"]["tonic"]
        mode = "minor" if c["key"]["mode"] in MINORISH else "major"
        tune = tune_key(c["voices"]["soprano"])
        prev = "start"
        for v in a["verticalities"]:
            if not v["on_beat"] or "soprano" not in v["struck"]:
                continue
            b = degree(v["pitches"]["bass"], tonic)
            out.append({"no": c["number"], "tune": tune, "mode": mode, "measure": v["measure"],
                        "deg": degree(v["pitches"]["soprano"], tonic), "chord": b, "prev": prev})
            prev = b
    return out


def evaluate(events: list[dict], fields: list[str]) -> dict:
    import math
    by = defaultdict(list)
    for e in events:
        by[e["tune"]].append(e)
    bits = first = top3 = n = 0
    for t, held in by.items():
        m = Model([e for e in events if e["tune"] != t], fields)
        for e in held:
            p = m.dist(e)
            bits += -math.log2(p.get(e["chord"], 1e-6))
            ranked = sorted(p, key=lambda c: -p[c])
            first += ranked[0] == e["chord"]
            top3 += e["chord"] in ranked[:3]
            n += 1
    return {"bits": bits / n, "first": first / n, "top3": top3 / n, "tunes": len(by)}


def kittel_level3(events: list[dict]) -> list[dict]:
    conc = {r["kittel"]: r for r in json.loads((ROOT / "data" / "chorales" / "concordance.json").read_text())["rows"]}
    habit = Model(events, ["mode", "deg"])
    examples = defaultdict(list)
    for e in events:
        k = (e["mode"], e["deg"], e["chord"])
        if len(examples[k]) < 2:
            examples[k].append({"no": e["no"], "bar": e["measure"]})
    out = []
    for p in sorted(KIT.glob("kittel_*.json")):
        c = json.loads(p.read_text())
        a = json.loads((KIT / "analysis" / p.name).read_text())
        mel = merged(c["melody"]["notes"])
        hs1 = [h for h in a["basses"][0]["harmonies"] if h.get("root")]
        tonic_name = hs1[-1]["root"] if hs1 else "C"
        mode = "major" if pcn(tonic_name) == (7 * c["key_signature"]) % 12 else "minor"
        bach_at: dict[int, list[dict]] = defaultdict(list)
        for s in conc.get(c["number"], {}).get("same_tune", []):
            bc = json.loads((BACH / "chorales" / f"bach_{s['bach']:03d}.json").read_text())
            sop = merged(bc["voices"]["soprano"])
            bass = [n for n in bc["voices"]["bass"] if not n.get("rest") and n.get("midi") is not None]
            for i, j in nw_pairs([n["midi"] for n in mel], [n["midi"] + s["transposition"] for n in sop]):
                t = F(sop[j]["offset"])
                bn = None
                for x in bass:
                    if F(x["offset"]) <= t:
                        bn = x
                if bn:
                    bach_at[i].append({"no": s["bach"], "chord": degree(bn["pitch"], bc["key"]["tonic"]), "bar": bn["measure"]})
        notes = []
        for i, n in enumerate(mel):
            t = F(n["offset"])
            kit = []
            for b in c["basses"]:
                bn = None
                for x in b["notes"]:
                    if not x.get("rest") and F(x["offset"]) <= t:
                        bn = x
                kit.append({"bass": b["label"], "chord": degree(bn["pitch"], tonic_name) if bn else "?", "pitch": bn["pitch"] if bn else None})
            deg = degree(n["pitch"], tonic_name)
            cnt = habit.counts[1].get((mode, deg), Counter())
            used = {x["chord"] for x in kit if x["chord"] != "?"} | {x["chord"] for x in bach_at[i]}
            options = sorted({d for d, _ in cnt.most_common(4)} | used, key=order_key)
            notes.append({"offset": n["offset"], "measure": n["measure"], "pitch": n["pitch"], "degree": deg, "fermata": bool(n.get("fermata")),
                          "options": options, "kittel": kit, "bach": bach_at[i],
                          "habit": {"n": sum(cnt.values()), "options": [{"chord": d, "count": k, "examples": examples[(mode, deg, d)]} for d, k in cnt.most_common(6)]}})
        out.append({"number": c["number"], "title": c["title"], "tonic": tonic_name, "mode": mode, "notes": notes})
    return out


def main() -> None:
    events = bach_events()
    models = [("mode + melody degree", ["mode", "deg"]), ("mode + bass before", ["mode", "prev"]),
              ("mode + melody degree + bass before", ["mode", "deg", "prev"])]
    results = [(name, evaluate(events, f)) for name, f in models]
    kit = kittel_level3(events)
    OUT_JSON.write_text(json.dumps({"generated_by": "tools/chorales/bass_plans.py", "level": 3,
                                    "note": "Bass notes as scale degrees of the chorale's key (by spelling: #4, b7...); 'chord' holds the degree, as at levels 1-2.",
                                    "chorales": kit}, ensure_ascii=False, separators=(",", ":")) + "\n")
    n_notes = sum(len(c["notes"]) for c in kit)
    with_bach = [n for c in kit for n in c["notes"] if n["bach"]]
    agree = sum(1 for n in with_bach if any(k["chord"] == n["bach"][0]["chord"] for k in n["kittel"]))
    spread = sum(len({k["chord"] for k in n["kittel"]}) for c in kit for n in c["notes"]) / max(1, n_notes)
    md = ["# Level 3: the bass under every melody note", "",
          "Generated by `tools/chorales/bass_plans.py` (method in its docstring).", "",
          f"**Bach: {len(events)} on-beat soprano attacks, {results[0][1]['tunes']} tunes, each held out in turn.**", "",
          "| model | bits | first | top 3 |", "|---|---|---|---|"]
    md += [f"| {name} | {r['bits']:.2f} | {100 * r['first']:.0f}% | {100 * r['top3']:.0f}% |" for name, r in results]
    md += ["", f"**Kittel's 24 melodies, {n_notes} notes.** Bach's bass known under {len(with_bach)}; one of Kittel's basses has the",
           f"same bass degree under {agree} of them ({100 * agree / max(1, len(with_bach)):.0f}%). Kittel's basses put {spread:.1f} different bass",
           "degrees under a melody note on average."]
    OUT_MD.write_text("\n".join(md) + "\n")
    print("\n".join(md[6:]))


if __name__ == "__main__":
    main()
