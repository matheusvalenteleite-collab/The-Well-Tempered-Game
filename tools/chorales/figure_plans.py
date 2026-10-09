#!/usr/bin/env python3
"""Level 4 of the chorale mode (CONCEPT.md): the figures.

The exercise of Kittel's book read the other way: one of his basses is given, unfigured, with the
melody above it; the player figures it. What a figure says is the chord's position over the bass
(5/3 root position, 6 first inversion, 6/4 second; 7, 6/5, 4/3, 4/2 for the seventh chord), so
that is what the player chooses; Kittel's printed figure (with its suspensions and accidentals)
is shown beside it, and his chord's position as Kirnberger's reading of it gives it is the
comparison. Bach's habit: the position he uses over this bass degree under this melody degree.

Bach's habit is measured as at levels 2-3 (each tune held out; the tune identified by its melody).

Output: data/chorales/level4.json and docs/chorales/LEVEL4.md.
Run:  python3 tools/chorales/figure_plans.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cadence_plans import MINORISH, degree, pcn  # noqa: E402
from harmony_plans import Model, merged, tune_key  # noqa: E402
from bass_plans import evaluate  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
KIT = ROOT / "data" / "chorales" / "kittel"
OUT_JSON = ROOT / "data" / "chorales" / "level4.json"
OUT_MD = ROOT / "docs" / "chorales" / "LEVEL4.md"
POSITIONS = ["5/3", "6", "6/4", "7", "6/5", "4/3", "4/2"]
ACC = {"sharp": "♯", "flat": "♭", "natural": "♮"}


def position(bass_role: str | None, kind: str | None) -> str | None:
    """The figure class of a chord over its bass: the bass's role in the chord, and whether the
    chord is a seventh chord."""
    if not bass_role or not kind:
        return None
    seventh = "seventh" in kind
    table = {("root", False): "5/3", ("third", False): "6", ("fifth", False): "6/4",
             ("root", True): "7", ("third", True): "6/5", ("fifth", True): "4/3", ("seventh", True): "4/2"}
    return table.get((bass_role, seventh))


def printed(stack: list[dict]) -> str:
    """Kittel's figure as printed, top row first: accidental and number, a raised number marked
    '+', a dash for a held row."""
    rows = []
    for r in sorted(stack, key=lambda r: -r["level"]):
        if r.get("continuation"):
            rows.append("–")
            continue
        acc = ACC.get(r.get("accidental", ""), "")
        n = str(r["interval"]) if "interval" in r else ""
        rows.append(acc + n + ("+" if r.get("raised") else ""))
    return "/".join(rows)


def bach_events() -> list[dict]:
    index = json.loads((BACH / "index.json").read_text())
    out = []
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = json.loads((BACH / "analysis" / f"{c['id']}.json").read_text())
        tonic = c["key"]["tonic"]
        mode = "minor" if c["key"]["mode"] in MINORISH else "major"
        tune = tune_key(c["voices"]["soprano"])
        for v in a["verticalities"]:
            if not v["on_beat"] or "bass" not in v["struck"] or not v["pitches"].get("soprano") or not v["pitches"].get("bass"):
                continue
            pos = position(v.get("bass_role"), v.get("chord"))
            if pos is None:
                continue
            out.append({"no": c["number"], "tune": tune, "mode": mode, "measure": v["measure"],
                        "bdeg": degree(v["pitches"]["bass"], tonic), "deg": degree(v["pitches"]["soprano"], tonic),
                        "chord": pos, "prev": "-"})
    return out


def sounding(notes: list[dict], t: F) -> dict | None:
    cur = None
    for n in notes:
        if F(n["offset"]) <= t and not n.get("grace"):
            cur = n
    return cur


def kittel_level4(events: list[dict]) -> list[dict]:
    habit = Model(events, ["mode", "bdeg", "deg"])
    examples = defaultdict(list)
    for e in events:
        k = (e["mode"], e["bdeg"], e["deg"], e["chord"])
        if len(examples[k]) < 2:
            examples[k].append({"no": e["no"], "bar": e["measure"]})
    out = []
    for p in sorted(KIT.glob("kittel_*.json")):
        c = json.loads(p.read_text())
        a = json.loads((KIT / "analysis" / p.name).read_text())
        hs1 = [h for h in a["basses"][0]["harmonies"] if h.get("root")]
        tonic = hs1[-1]["root"] if hs1 else "C"
        mode = "major" if pcn(tonic) == (7 * c["key_signature"]) % 12 else "minor"
        mel = merged(c["melody"]["notes"])
        basses = []
        for b, ab in zip(c["basses"], a["basses"]):
            figs = {F(f["onset"]): f for f in b.get("figures", []) if f.get("onset")}
            harms = {F(h["t"]): h for h in ab["harmonies"]}
            notes = []
            for n in b["notes"]:
                if n.get("rest") or n.get("midi") is None or n.get("tie") in ("stop", "continue"):
                    continue
                t = F(n["offset"])
                h = harms.get(t)
                m = sounding(mel, t)
                bdeg = degree(n["pitch"], tonic)
                mdeg = degree(m["pitch"], tonic) if m and m.get("pitch") else None
                cnt = habit.counts[2].get((mode, bdeg, mdeg), Counter()) if mdeg else Counter()
                kpos = position(h.get("bass_role"), h.get("kind")) if h and h.get("root") else None
                notes.append({"offset": n["offset"], "measure": n["measure"], "pitch": n["pitch"], "degree": bdeg,
                              "melody": m["pitch"] if m else None, "melodyDegree": mdeg,
                              "printed": printed(figs[t]["stack"]) if t in figs else "",
                              "kittel": kpos,
                              "habit": {"n": sum(cnt.values()), "options": [{"chord": d, "count": k, "examples": examples[(mode, bdeg, mdeg, d)]} for d, k in cnt.most_common(5)]}})
            basses.append({"label": b["label"], "notes": notes})
        out.append({"number": c["number"], "title": c["title"], "tonic": tonic, "mode": mode, "basses": basses})
    return out


def main() -> None:
    events = bach_events()
    models = [("mode + bass degree", ["mode", "bdeg"]), ("mode + bass degree + melody degree", ["mode", "bdeg", "deg"])]
    results = [(name, evaluate(events, f)) for name, f in models]
    kit = kittel_level4(events)
    OUT_JSON.write_text(json.dumps({"generated_by": "tools/chorales/figure_plans.py", "level": 4, "positions": POSITIONS,
                                    "chorales": kit}, ensure_ascii=False, separators=(",", ":")) + "\n")
    allnotes = [n for c in kit for b in c["basses"] for n in b["notes"]]
    known = [n for n in allnotes if n["kittel"]]
    agree = sum(1 for n in known if n["habit"]["options"] and n["habit"]["options"][0]["chord"] == n["kittel"])
    dist = Counter(n["kittel"] for n in known)
    md = ["# Level 4: the figures (the chord's position over the bass)", "",
          "Generated by `tools/chorales/figure_plans.py` (method in its docstring).", "",
          f"**Bach: {len(events)} on-beat bass attacks with a reading, {results[0][1]['tunes']} tunes, each held out in turn.**", "",
          "| model | bits | first | top 3 |", "|---|---|---|---|"]
    md += [f"| {name} | {r['bits']:.2f} | {100 * r['first']:.0f}% | {100 * r['top3']:.0f}% |" for name, r in results]
    md += ["", f"**Kittel's {sum(len(c['basses']) for c in kit)} basses, {len(allnotes)} bass notes** ({len(known)} with a reading of his chord).",
           f"Bach's commonest position in the same context is Kittel's at {agree} of them ({100 * agree / max(1, len(known)):.0f}%).",
           "Kittel's positions: " + ", ".join(f"{k} {100 * v / len(known):.0f}%" for k, v in dist.most_common()) + "."]
    OUT_MD.write_text("\n".join(md) + "\n")
    print("\n".join(md[6:]))


if __name__ == "__main__":
    main()
