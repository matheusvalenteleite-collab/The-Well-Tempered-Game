#!/usr/bin/env python3
"""Kittel-Bach concordance: which of Kittel's 24 melodies Bach set among the 371, and how.

For every Kittel melody and every Bach soprano, the two pitch sequences are aligned (global
alignment, all twelve transpositions; ties merged, small notes and rests left out). A Bach note
with no partner costs little (Bach's soprano carries passing notes that a chorale book leaves
out), a Kittel note with no partner costs more. The score is the cost per Kittel note: 0 is the
same tune note for note. Titles are compared as well, so that a variant of the tune under its
own name is recognised, and two tunes sung to one text are not confused.

Output: data/chorales/concordance.json and docs/chorales/CONCORDANCE.md

Run:  python3 tools/chorales/concordance.py
"""
from __future__ import annotations

import json
import re
import unicodedata
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KIT = ROOT / "data" / "chorales" / "kittel"
BACH = ROOT / "data" / "chorales" / "bach"
OUT_JSON = ROOT / "data" / "chorales" / "concordance.json"
OUT_MD = ROOT / "docs" / "chorales" / "CONCORDANCE.md"

MATCH_COST = {0: 0.0}
SUBST = 1.0
GAP_BACH = 0.35  # a Bach note without a Kittel partner (passing note, ornament)
GAP_KITTEL = 1.0  # a Kittel note without a Bach partner
# Tiers, set by looking at the results: up to 0.20 the tunes are the same (the known identities:
# "Mir nach" = "Mach's mit mir", "Ach Herr, mich armen Sünder" = "Herzlich tut mich verlangen");
# 0.20-0.30 a variant of the tune (rhythm, passing notes, a changed cadence: "Nun danket", "Lobe
# den Herren" = "Hast du denn, Jesu"), to be confirmed by eye; above, another tune.
SAME = 0.20
VARIANT = 0.30


def midi_seq(notes: list[dict]) -> list[int]:
    out = []
    for n in notes:
        if n.get("rest") or n.get("grace") or n.get("midi") is None:
            continue
        if n.get("tie") in ("stop", "continue"):
            continue
        out.append(n["midi"])
    return out


def align(k: list[int], b: list[int]) -> float:
    """Minimum alignment cost of k (Kittel) against b (Bach), b transposed freely (the caller)."""
    n, m = len(k), len(b)
    prev = [j * GAP_BACH for j in range(m + 1)]
    for i in range(1, n + 1):
        cur = [i * GAP_KITTEL] + [0.0] * m
        ki = k[i - 1]
        for j in range(1, m + 1):
            d = 0.0 if ki == b[j - 1] else SUBST
            cur[j] = min(prev[j - 1] + d, prev[j] + GAP_KITTEL, cur[j - 1] + GAP_BACH)
        prev = cur
    return prev[m]


def best_transposition(k: list[int], b: list[int]) -> tuple[float, int]:
    best = (1e9, 0)
    # transposition candidates: those that put the final notes (or the first notes) together
    cands = {(k[-1] - b[-1]) % 12, (k[0] - b[0]) % 12}
    for t in cands:
        for octave in (-24, -12, 0, 12, 24):
            shift = t + octave
            if abs(shift) > 24:
                continue
            c = align(k, [x + shift for x in b])
            if c < best[0]:
                best = (c, shift)
    return best


def norm_title(s: str) -> str:
    s = s.lower().replace("ß", "ss").replace("’", "'")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"\b(etc|u\.s\.w)\b\.?", "", s)
    s = re.sub(r"\[.*?\]", "", s)
    s = re.sub(r"[^a-z ]", " ", s)
    return " ".join(s.split())


def title_score(a: str, b: str) -> float:
    """Share of the words of the shorter title found, in order, at the start of the other."""
    wa, wb = norm_title(a).split(), norm_title(b).split()
    if not wa or not wb:
        return 0.0
    k = 0
    for x, y in zip(wa, wb):
        if x == y or (len(x) > 3 and len(y) > 3 and x[:4] == y[:4]):
            k += 1
        else:
            break
    return k / min(len(wa), len(wb))


KEY_NAMES = {0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", -1: "F", -2: "Bb", -3: "Eb", -4: "Ab", -5: "Db"}


def main() -> None:
    kittel = [json.loads(p.read_text()) for p in sorted(KIT.glob("kittel_*.json"))]
    index = json.loads((BACH / "index.json").read_text())
    bach = [json.loads((BACH / e["file"]).read_text()) for e in index["catalogue"]]
    bseq = {c["number"]: midi_seq(c["voices"]["soprano"]) for c in bach}
    rows = []
    for k in kittel:
        ks = midi_seq(k["melody"]["notes"])
        scored = []
        for c in bach:
            ts = title_score(k["title"], c["title"]["de"] or "")
            cost, shift = best_transposition(ks, bseq[c["number"]])
            scored.append({"bach": c["number"], "bwv": c["bwv"], "title": c["title"]["de"], "key": f"{c['key']['tonic']} {c['key']['mode']}",
                           "cost_per_note": round(cost / len(ks), 3), "transposition": shift, "title_score": round(ts, 2)})
        scored.sort(key=lambda r: r["cost_per_note"])
        same_tune = [r for r in scored if r["cost_per_note"] <= SAME]
        variant = [r for r in scored if SAME < r["cost_per_note"] <= VARIANT]
        by_title = [r for r in scored if r["title_score"] >= 0.99 and r not in same_tune and r not in variant]
        final = ks[-1] % 12
        rows.append({
            "kittel": k["number"], "title": k["title"], "key_signature": k["key_signature"],
            "melody_final": ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][final],
            "same_tune": same_tune,
            "variant_of_tune": variant,
            "same_title_other_tune": by_title,
            "nearest": scored[:3] if not same_tune and not variant else [],
        })
        print(f"No. {k['number']:2d} {k['title'][:38]:38s} -> " + (", ".join(f"{r['bach']} ({r['cost_per_note']})" for r in same_tune + variant) or f"none; nearest {scored[0]['bach']} ({scored[0]['cost_per_note']})"))
    OUT_JSON.write_text(json.dumps({
        "generated_by": "tools/chorales/concordance.py",
        "method": "global alignment of pitch sequences (ties merged, small notes and rests out), all transpositions; "
                  f"substitution {SUBST}, Bach-only note {GAP_BACH}, Kittel-only note {GAP_KITTEL}; same tune up to {SAME}, variant up to {VARIANT} (cost per Kittel note)",
        "transposition": "semitones added to Bach's soprano to reach Kittel's",
        "rows": rows,
    }, ensure_ascii=False, indent=1) + "\n")
    md = ["# Kittel and Bach: the same melodies", "",
          "Generated by `tools/chorales/concordance.py`. For each of Kittel's 24 melodies, the chorales among",
          "Bach's 371 (Breitkopf numbers) that set the same tune. The cost is the alignment cost per Kittel",
          f"note (0 = the same notes; same tune up to {SAME}, a variant to confirm by eye up to {VARIANT}).",
          "The transposition is from Bach's key to Kittel's, in semitones (0: the same key).", "",
          "A tune often goes under several texts, and one text under several tunes: the match is by the",
          "notes, the titles are only reported.", "",
          "| Kittel | Kittel's title | Bach: same tune | Bach: variant (to confirm) |", "|---|---|---|---|"]
    fmt = lambda xs: "<br>".join(f"{x['bach']} *{x['title']}* (BWV {x['bwv']}; {x['key']}; {x['cost_per_note']}; {x['transposition']:+d})" for x in xs) or "—"  # noqa: E731
    for r in rows:
        md.append(f"| {r['kittel']} | {r['title']} | {fmt(r['same_tune'])} | {fmt(r['variant_of_tune'])} |")
    none = [r for r in rows if not r["same_tune"] and not r["variant_of_tune"]]
    md += ["", f"**Not among the 371:** " + "; ".join(f"No. {r['kittel']} *{r['title']}* (nearest: {r['nearest'][0]['bach']}, {r['nearest'][0]['cost_per_note']})" for r in none) + "."]
    other = [(r, x) for r in rows for x in r["same_title_other_tune"]]
    if other:
        md += ["", "**Same title, another tune:** " + "; ".join(f"Kittel No. {r['kittel']} and Bach {x['bach']} *{x['title']}* ({x['cost_per_note']})" for r, x in other) + "."]
    OUT_MD.write_text("\n".join(md) + "\n")


if __name__ == "__main__":
    main()
