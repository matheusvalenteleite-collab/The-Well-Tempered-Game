#!/usr/bin/env python3
"""Level 1 of the chorale mode (CONCEPT.md): the cadence plan.

For every phrase end in Bach's 370 chorales: the context a player sees (how the melody closes:
its last two notes as scale degrees; where the phrase stands: first, inner, last; major or minor
key) and what Bach does there (the root of the cadence chord as a degree of the chorale's key, its
quality, and the kind of cadence). Counted per context, with examples.

For Kittel's 24 melodies: at each phrase end, the cadence chords of his 8-9 basses side by side,
and Bach's where he set the tune: the options of the masters for one question.

Output: data/chorales/cadence_plans.json and docs/chorales/CADENCE-PLANS.md

Run:  python3 tools/chorales/cadence_plans.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kirnberger as K  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
KIT = ROOT / "data" / "chorales" / "kittel"
OUT_JSON = ROOT / "data" / "chorales" / "cadence_plans.json"
OUT_MD = ROOT / "docs" / "chorales" / "CADENCE-PLANS.md"
DEG = {0: "1", 1: "b2", 2: "2", 3: "b3", 4: "3", 5: "4", 6: "#4", 7: "5", 8: "b6", 9: "6", 10: "b7", 11: "7"}
ROMAN = {0: "I", 1: "bII", 2: "II", 3: "bIII", 4: "III", 5: "IV", 6: "#IV", 7: "V", 8: "bVI", 9: "VI", 10: "bVII", 11: "VII"}
MINORISH = ("minor", "dorian", "phrygian")


def pcn(name: str) -> int:
    s = name[0]
    acc = name[1:].rstrip("0123456789-")
    return (K.PC[s] + acc.count("#") - acc.count("b")) % 12


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


MAJOR = [0, 2, 4, 5, 7, 9, 11]


def degree(name: str, tonic: str) -> str:
    """Scale degree by spelling: the letter's distance from the tonic's letter, with the
    alteration against the major scale (G# in G major is #1, Ab is b2)."""
    d = (K.STEPS.index(name[0]) - K.STEPS.index(tonic[0])) % 7
    semis = (pcn(name) - pcn(tonic)) % 12
    alt = (semis - MAJOR[d] + 6) % 12 - 6
    return ("#" * alt if alt > 0 else "b" * -alt) + str(d + 1)


def chord_label(root_pc: int, tonic: int, q: str) -> str:
    r = ROMAN[(root_pc - tonic) % 12]
    return r.lower() if q == "minor" else r + ("°" if q == "diminished" else "")


def bach_rows() -> list[dict]:
    index = json.loads((BACH / "index.json").read_text())
    rows = []
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = json.loads((BACH / "analysis" / f"{c['id']}.json").read_text())
        tonic = pcn(c["key"]["tonic"])
        mode = "minor" if c["key"]["mode"] in MINORISH else "major"
        sop = [n for n in c["voices"]["soprano"] if not n.get("rest") and n.get("tie") not in ("stop", "continue")]
        cads = a["cadences"]
        for i, cd in enumerate(cads):
            if not cd["final"]:
                continue
            t = F(cd["final"]["t"])
            k = max((j for j, n in enumerate(sop) if F(n["offset"]) <= t), default=None)
            if k is None or k == 0:
                continue
            last, prev = sop[k], sop[k - 1]
            v = next((x for x in a["verticalities"] if x["t"] == cd["final"]["t"]), None)
            if v is None or v["root"] is None:
                continue
            q = quality(v["chord"])
            rows.append({
                "bach": c["number"], "bwv": c["bwv"], "measure": v["measure"], "mode": mode,
                "position": "first" if i == 0 else "last" if i == len(cads) - 1 else "inner",
                "melody": f"{degree(prev['pitch'], c['key']['tonic'])}-{degree(last['pitch'], c['key']['tonic'])}",
                "chord": chord_label(pcn(v["root"]), tonic, q), "class": cd["class"],
            })
    return rows


def kittel_rows() -> list[dict]:
    conc = {r["kittel"]: r for r in json.loads((ROOT / "data" / "chorales" / "concordance.json").read_text())["rows"]}
    out = []
    for p in sorted(KIT.glob("kittel_*.json")):
        c = json.loads(p.read_text())
        a = json.loads((KIT / "analysis" / p.name).read_text())
        mel = [n for n in c["melody"]["notes"] if not n.get("rest") and not n.get("grace") and n.get("tie") not in ("stop", "continue")]
        ends = [i for i, n in enumerate(mel) if n.get("fermata")]
        # the tonic: the root of the last harmony of bass [1] (the final cadence)
        hs1 = [h for h in a["basses"][0]["harmonies"] if h.get("root")]
        tonic_name = hs1[-1]["root"] if hs1 else "C"
        tonic = pcn(tonic_name)
        final_third = None
        phrases = []
        for i in ends:
            t = F(mel[i]["offset"])
            opts = []
            for b in a["basses"]:
                h = None
                for x in b["harmonies"]:
                    if F(x["t"]) <= t and x.get("root"):
                        h = x
                opts.append((b["label"], chord_label(pcn(h["root"]), tonic, quality(h["kind"])) if h else "?"))
            phrases.append({"measure": mel[i]["measure"],
                            "melody": f"{degree(mel[i - 1]['pitch'], tonic_name)}-{degree(mel[i]['pitch'], tonic_name)}" if i else "?",
                            "kittel": opts})
        bach = [x["bach"] for x in conc.get(c["number"], {}).get("same_tune", [])]
        out.append({"kittel": c["number"], "title": c["title"], "tonic_pc": tonic, "phrases": phrases, "bach_settings": bach})
    return out


def main() -> None:
    rows = bach_rows()
    by_ctx: dict[tuple, Counter] = defaultdict(Counter)
    ex: dict[tuple, list] = defaultdict(list)
    for r in rows:
        key = (r["mode"], r["position"], r["melody"])
        by_ctx[key][r["chord"]] += 1
        if len(ex[key + (r["chord"],)]) < 2:
            ex[key + (r["chord"],)].append(f"{r['bach']}/{r['measure']}")
    kit = kittel_rows()
    bach_by_no = defaultdict(list)
    for r in rows:
        bach_by_no[r["bach"]].append(r)
    OUT_JSON.write_text(json.dumps({"bach_phrase_ends": rows, "kittel": kit}, ensure_ascii=False, indent=1) + "\n")

    md = ["# Level 1: the cadence plan", "",
          "Generated by `tools/chorales/cadence_plans.py` (CONCEPT.md, level 1). At a phrase end the player sees",
          "how the melody closes (its last two notes as degrees of the chorale's key) and where the phrase stands;",
          "the question is the cadence: on which chord, in the chorale's key (I, V, vi, iii, IV ...; lower case = minor).",
          "", "Examples are given as chorale/bar.", ""]
    for mode in ("major", "minor"):
        md += [f"## Bach, chorales in {mode}" + (" (with the dorian and phrygian ones)" if mode == "minor" else " (with the mixolydian ones)"), "",
               "| phrase | melody closes | n | Bach's cadence chords (share; examples) |", "|---|---|---|---|"]
        keys = sorted((k for k in by_ctx if k[0] == mode), key=lambda k: (["first", "inner", "last"].index(k[1]), -sum(by_ctx[k].values())))
        for k in keys:
            n = sum(by_ctx[k].values())
            if n < 8:
                continue
            cells = []
            for ch, m in by_ctx[k].most_common(4):
                cells.append(f"**{ch}** {100 * m / n:.0f}% ({', '.join(ex[k + (ch,)])})")
            md.append(f"| {k[1]} | {k[2]} | {n} | " + "; ".join(cells) + " |")
        md.append("")
    md += ["## Kittel's 24 melodies: the masters' options at each phrase end", "",
           "For each phrase end: the cadence chord of each of Kittel's basses ([1] to [8]/[9]), and Bach's in his",
           "settings of the tune (by Breitkopf number). Degrees are of the chorale's final key.", ""]
    for k in kit:
        md += [f"### No. {k['kittel']}: {k['title']}", "", "| bar | melody | Kittel's basses | Bach |", "|---|---|---|---|"]
        for i, ph in enumerate(k["phrases"]):
            ks = Counter(ch for _, ch in ph["kittel"])
            kcell = ", ".join(f"{ch}×{n}" if n > 1 else ch for ch, n in ks.most_common())
            bcell = []
            for bn in k["bach_settings"]:
                br = bach_by_no[bn]
                if i < len(br):
                    # Bach's chord in his own key; transposed degree is the same when the tune's final is the same
                    bcell.append(f"{br[i]['chord']} ({bn})")
            md.append(f"| {ph['measure']} | {ph['melody']} | {kcell} | {', '.join(bcell) or '—'} |")
        md.append("")
    OUT_MD.write_text("\n".join(md) + "\n")
    print(f"{len(rows)} Bach phrase ends in {len(by_ctx)} contexts; {len(kit)} Kittel melodies")


if __name__ == "__main__":
    main()
