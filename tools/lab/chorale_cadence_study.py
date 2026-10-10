"""Does the level-1 context predict Bach's cadence chord in chorales the model has not seen?

The chorale session's level 1 (branch claude/loving-noether-81pf56, data/chorales/cadence_plans.json)
tells the player "what Bach does at a phrase end like this one", the context being the mode, the
phrase's position (first, inner, last) and the melody's close (its last two degrees). This study
asks whether that context predicts Bach's cadence chord in held-out chorales, and whether more
context helps (the chord of the phrase end before; the position dropped).

Held out by tune, not by setting: Bach set many tunes more than once, and a setting of the same
tune left in training would let the model remember the answer. Tunes are identified by the German
title.

Read-only on the chorale branch (through git). Writes docs/chorales-lab/cadence-study.md on this
branch. Usage: python3 tools/lab/chorale_cadence_study.py
"""
import json
import math
import os
import re
import subprocess
from collections import Counter, defaultdict

BRANCH = "origin/claude/loving-noether-81pf56"


def show(path):
    return subprocess.run(["git", "show", f"{BRANCH}:{path}"], capture_output=True, text=True, check=True).stdout


ends = json.loads(show("data/chorales/cadence_plans.json"))["bach_phrase_ends"]

# Tune of each chorale, by its German title (normalised).
tune = {}
for n in sorted({e["bach"] for e in ends}):
    meta = json.loads(show(f"data/chorales/bach/chorales/bach_{n:03d}.json"))
    t = (meta.get("title") or {}).get("de") or meta.get("id")
    tune[n] = re.sub(r"[^a-zäöüß]", "", t.lower())

# The chord of the phrase end before, within the chorale.
by_chorale = defaultdict(list)
for e in ends:
    by_chorale[e["bach"]].append(e)
for lst in by_chorale.values():
    lst.sort(key=lambda e: e["measure"])
    prev = "start"
    for e in lst:
        e["prev"] = prev
        prev = e["chord"]

CHORDS = sorted({e["chord"] for e in ends})

# Each model is a chain of contexts, from coarse to fine; estimates back off along it.
MODELS = {
    "mode only": [("mode",)],
    "mode + melody close": [("mode",), ("mode", "melody")],
    "mode + melody close + position (level 1)": [("mode",), ("mode", "melody"), ("mode", "melody", "position")],
    "mode + melody close + chord before": [("mode",), ("mode", "melody"), ("mode", "melody", "prev")],
    "level 1 + chord before": [("mode",), ("mode", "melody"), ("mode", "melody", "position"), ("mode", "melody", "position", "prev")],
    "mode + last melody degree + position": [("mode",), ("mode", "last"), ("mode", "last", "position")],
}
for e in ends:
    e["last"] = e["melody"].split("-")[-1]

BETA = 2.0  # weight of the coarser estimate (Witten-Bell-like backoff)


def train(rows, chain):
    tables = [defaultdict(Counter) for _ in chain]
    for e in rows:
        for t, keys in zip(tables, chain):
            t[tuple(e[k] for k in keys)][e["chord"]] += 1
    return tables


def predict(tables, chain, e):
    p = {c: 1 / len(CHORDS) for c in CHORDS}
    for t, keys in zip(tables, chain):
        cnt = t.get(tuple(e[k] for k in keys))
        if not cnt:
            continue
        n = sum(cnt.values())
        p = {c: (cnt[c] + BETA * p[c]) / (n + BETA) for c in CHORDS}
    return p


def evaluate(chain, position=None):
    tunes = sorted(set(tune.values()))
    bits = top1 = top3 = n = unseen = 0
    for tn in tunes:
        test = [e for e in ends if tune[e["bach"]] == tn and (position is None or e["position"] == position)]
        if not test:
            continue
        tables = train([e for e in ends if tune[e["bach"]] != tn], chain)
        for e in test:
            p = predict(tables, chain, e)
            ranked = sorted(CHORDS, key=lambda c: -p[c])
            bits += -math.log2(p[e["chord"]])
            top1 += ranked[0] == e["chord"]
            top3 += e["chord"] in ranked[:3]
            n += 1
            if tuple(e[k] for k in chain[-1]) not in tables[-1]:
                unseen += 1
    return {"bits": bits / n, "top1": top1 / n, "top3": top3 / n, "n": n, "unseen": unseen / n}


ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7}


def root_degree(chord):
    m = re.match(r"[b#]?([IViv]+)", chord)
    return ROMAN.get(m.group(1).upper()) if m else None


def contains(chord, degree):
    """Does the chord (root and its third and fifth, by letter) contain the melody degree?"""
    r = root_degree(chord)
    d = int(re.sub(r"[^0-9]", "", degree))
    return r is not None and (d - r) % 7 in (0, 2, 4)


def evaluate_fit(weighted):
    """Arithmetic only: the chords that contain the melody's last note, uniform or weighted by how
    often Bach uses each in the mode (learnt without the held-out tune)."""
    bits = top1 = n = 0
    for tn in sorted(set(tune.values())):
        test = [e for e in ends if tune[e["bach"]] == tn]
        freq = defaultdict(Counter)
        for e in ends:
            if tune[e["bach"]] != tn:
                freq[e["mode"]][e["chord"]] += 1
        for e in test:
            fit = [c for c in CHORDS if contains(c, e["last"])] or CHORDS
            w = {c: (freq[e["mode"]][c] + 0.5 if weighted else 1.0) for c in fit}
            z = sum(w.values())
            p = {c: 0.98 * w.get(c, 0) / z + 0.02 / len(CHORDS) for c in CHORDS}
            bits += -math.log2(p[e["chord"]])
            top1 += max(CHORDS, key=lambda c: p[c]) == e["chord"]
            n += 1
    return {"bits": bits / n, "top1": top1 / n}


pct = lambda x: f"{round(100 * x)}%"
out = [
    "# Level 1 tested: does the context predict Bach's cadence chord?",
    "",
    "Generated by `python3 tools/lab/chorale_cadence_study.py` (Choices lab session), from the chorale",
    "session's `data/chorales/cadence_plans.json` (branch claude/loving-noether-81pf56), read-only.",
    f"{len(ends)} phrase ends in {len(by_chorale)} chorales, {len(set(tune.values()))} distinct tunes. Each tune is held out in",
    "turn (all its settings together) and the model, learnt from the other tunes, ranks the possible",
    "cadence chords at each of its phrase ends. **Bits**: the mean surprise at Bach's chord (lower is",
    f"better; {math.log2(len(CHORDS)):.2f} bits for {len(CHORDS)} chords taken as equally likely). **First**: Bach's chord ranked first;",
    "**top 3**: among the first three. **Unseen**: the finest context of the phrase end never occurs",
    "in training (the estimate then rests on a coarser one).",
    "",
    "| model | bits | first | top 3 | unseen |",
    "|---|---|---|---|---|",
]
results = {}
for name, chain in MODELS.items():
    r = evaluate(chain)
    results[name] = r
    out.append(f"| {name} | {r['bits']:.2f} | {pct(r['top1'])} | {pct(r['top3'])} | {pct(r['unseen'])} |")
inside = sum(contains(e["chord"], e["last"]) for e in ends) / len(ends)
u = evaluate_fit(False)
w = evaluate_fit(True)
out += [
    "",
    f"**How much is arithmetic?** The cadence chord contains the melody's last note in {pct(inside)} of Bach's phrase ends,",
    "so the melody already narrows the choice to a few chords. Two baselines that know only that:",
    "",
    "| baseline | bits | first |",
    "|---|---|---|",
    f"| a chord containing the last melody note, any one alike | {u['bits']:.2f} | {pct(u['top1'])} |",
    f"| the same, weighted by how often Bach uses each chord in the mode | {w['bits']:.2f} | {pct(w['top1'])} |",
]
out += ["", "By position, the level-1 model:", "", "| position | phrase ends | bits | first | top 3 |", "|---|---|---|---|---|"]
for pos in ["first", "inner", "last"]:
    r = evaluate(MODELS["mode + melody close + position (level 1)"], pos)
    out.append(f"| {pos} | {r['n']} | {r['bits']:.2f} | {pct(r['top1'])} | {pct(r['top3'])} |")
out.append("")

# The same, with the settings of a tune not held out together (to show how much repetition flatters).
def evaluate_by_setting(chain):
    bits = top1 = n = 0
    for b in by_chorale:
        tables = train([e for e in ends if e["bach"] != b], chain)
        for e in by_chorale[b]:
            p = predict(tables, chain, e)
            bits += -math.log2(p[e["chord"]])
            top1 += max(CHORDS, key=lambda c: p[c]) == e["chord"]
            n += 1
    return bits / n, top1 / n

b, t = evaluate_by_setting(MODELS["level 1 + chord before"])
out.append(f"Held out by setting instead of by tune (other settings of the same tune left in training), the richest model scores {b:.2f} bits, first {pct(t)}: the difference from the table above is what repeated tunes would flatter.")
out.append("")
out += [
    "**Reading.**",
    "",
    "- The melody's close carries most of what level 1 knows: from 2.60 bits (34% first) with the mode",
    "  alone to 1.28 (70%). Part of that is arithmetic (the chord must contain the melody's last note),",
    "  but not most: knowing only that, and how often Bach uses each chord, gives 1.62 bits (51%). The",
    "  close and the position add real information beyond it: 1.18 bits, Bach's chord first at 74%,",
    "  in the first three at 95%.",
    "- The position helps mainly at the last phrase (94% first); inner phrases are where Bach's choice",
    "  is open (69% first, 93% in the first three): there the screen should show the distribution and",
    "  examples, as the concept says, never a single answer.",
    "- More context makes it worse here: the chord of the phrase end before, added to level 1, raises",
    "  the surprise (1.18 to 1.28 bits): with 239 tunes the finer contexts are too thin (11% never seen",
    "  in training). The last melody degree alone does almost as well as the two-note close (1.22).",
    "- Holding out by setting rather than by tune flatters a little (1.15 bits, 77%): repeated tunes.",
    "",
]
os.makedirs("docs/chorales-lab", exist_ok=True)
with open("docs/chorales-lab/cadence-study.md", "w") as f:
    f.write("\n".join(out))
print("\n".join(out))
