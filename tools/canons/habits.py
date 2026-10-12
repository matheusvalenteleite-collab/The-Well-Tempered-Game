#!/usr/bin/env python3
"""How Bach's two-voice canons work, measured (CANON session, first pass): for each canonic section in
data/canons/readings.json (the Goldberg canons and the Art of Fugue canon at the octave, whose readings
are settled), between leader and follower:

  V  the vertical interval at every attack of either voice, and how each dissonance is treated
     (passing, neighbour, suspension, appoggiatura, other)
  R  rhythm: at how many attack points only one voice moves (complementarity)
  S  sequence: the share of the leader's bars that repeat the previous bar's rhythm and melodic intervals
     at another pitch
  M  the leader's melody: steps, leaps, repeated notes
  G  (Goldberg) the free bass against the Aria's bass, bar by bar: same pitch class on the downbeat

Optionally the same for a canon written by the first prototype generator (lab/canon), for contrast.
Every count comes with examples (piece, bar). Writes docs/canons/HABITS-1.md and data/canons/habits-1.json."""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

CORPUS = json.loads(Path("data/canons/corpus.json").read_text())
READ = json.loads(Path("data/canons/readings.json").read_text())
OUT_DOC = Path("docs/canons/HABITS-1.md")
OUT_JSON = Path("data/canons/habits-1.json")

GEN = {0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", 6: "7"}
CONS = {(0, 0), (2, 3), (2, 4), (4, 7), (5, 8), (5, 9)}


def simple(gen, semis):
    g = gen % 7
    s = semis - 12 * (gen // 7)
    return g, s


def is_cons(up, lo):
    gen, semis = up["step"] - lo["step"], up["midi"] - lo["midi"]
    if gen < 0:
        gen, semis = -gen, -semis
    return simple(gen, semis) in CONS


def ivname(up, lo):
    gen = abs(up["step"] - lo["step"])
    return "8" if gen and gen % 7 == 0 else GEN[gen % 7]


def at(line, t):
    """index of the note of line sounding at t, or None"""
    for i, n in enumerate(line):
        if n["on"] <= t + 1e-9 < n["on"] + n["dur"] - 1e-9:
            return i
    return None


def step_between(a, b):
    return a is not None and b is not None and abs(a["step"] - b["step"]) == 1


def bars_of(pc):
    return [b["on"] for b in pc["bars"]]


def bar_no(pc, t):
    n = pc["bars"][0]["n"]
    for b in pc["bars"]:
        if b["on"] <= t + 1e-9:
            n = b["n"]
    return n


def beat_len(meter):
    return {"12/8": 1.5, "9/8": 1.5, "6/8": 1.5, "3/8": 0.5, "9/16": 0.75, "2/2": 2.0}.get(meter, 1.0)


def strong(pc, t):
    """on a beat (the notated beat of the metre)"""
    bl = beat_len(pc["meter"])
    bo = max([b for b in bars_of(pc) if b <= t + 1e-9], default=0)
    return abs(((t - bo) / bl) - round((t - bo) / bl)) < 1e-6


def dissonance_kind(pc, me, other, i, t, attacked_me, attacked_other):
    """treatment of a dissonance at t: me is the voice whose note makes it (by attack or by holding)"""
    n = me[i]
    prev = me[i - 1] if i > 0 and abs(me[i - 1]["on"] + me[i - 1]["dur"] - n["on"]) < 1e-6 else None
    nxt = me[i + 1] if i + 1 < len(me) and abs(n["on"] + n["dur"] - me[i + 1]["on"]) < 1e-6 else None
    if attacked_me:
        if step_between(prev, n) and step_between(n, nxt):
            same_dir = (n["step"] - prev["step"]) * (nxt["step"] - n["step"]) > 0
            kind = "passing" if same_dir else "neighbour"
            return kind + (" (on the beat)" if strong(pc, t) else "")
        if step_between(n, nxt):
            return "appoggiatura / leapt-to, resolved by step" if strong(pc, t) else "leapt-to, resolved by step (échappée/cambiata family)"
        return "other"
    # held into the other voice's attack
    if nxt is not None and nxt["step"] - n["step"] == -1:
        return "suspension (resolves down)"
    if nxt is not None and nxt["step"] - n["step"] == 1:
        return "suspension resolving up (retardation)"
    return "held, other"


def analyse_pair(pc, L, F, label):
    events = sorted({n["on"] for n in L} | {n["on"] for n in F})
    rows = []
    for t in events:
        i, j = at(L, t), at(F, t)
        if i is None or j is None:
            continue
        a, b = L[i], F[j]
        up, lo = (a, b) if a["midi"] >= b["midi"] else (b, a)
        aA, bA = abs(a["on"] - t) < 1e-9, abs(b["on"] - t) < 1e-9
        cons = is_cons(up, lo)
        kind = None
        if not cons:
            # who makes the dissonance: first a moving voice's passing or neighbour note; then a held voice
            # (suspension, prepared and resolved by step); then what is left
            cands = []
            if aA:
                cands.append(dissonance_kind(pc, L, F, i, t, True, bA))
            if bA:
                cands.append(dissonance_kind(pc, F, L, j, t, True, aA))
            if not aA:
                cands.append(dissonance_kind(pc, L, F, i, t, False, True))
            if not bA:
                cands.append(dissonance_kind(pc, F, L, j, t, False, True))
            order = ["passing", "neighbour", "suspension (resolves down)", "suspension resolving up (retardation)",
                     "appoggiatura", "leapt-to", "passing (on the beat)", "neighbour (on the beat)", "held, other", "other"]
            kind = min(cands, key=lambda k: next((n for n, o in enumerate(order) if k.startswith(o)), 99))
        rows.append({"t": t, "bar": bar_no(pc, t), "iv": ivname(up, lo), "cons": cons, "kind": kind,
                     "both": aA and bA, "strong": strong(pc, t)})
    return rows


def sequence_share(pc, line):
    """the share of the leader's units (beat, half bar, bar, two bars) that repeat the previous unit's rhythm and
    melodic intervals at another pitch; the unit size with the highest share is reported"""
    barlen = pc["bars"][1]["on"] - pc["bars"][0]["on"]
    start = pc["bars"][0]["on"]
    best = (0, 1, [], "bar")
    for name, u in (("beat", beat_len(pc["meter"])), ("half bar", barlen / 2), ("bar", barlen), ("two bars", 2 * barlen)):
        units = defaultdict(list)
        for n in line:
            units[int((n["on"] - start + 1e-9) // u)].append(n)
        shape = {}
        for k, ns in units.items():
            if len(ns) >= 2:
                shape[k] = (tuple(round(n["on"] - start - k * u, 3) for n in ns),
                            tuple(ns[x + 1]["step"] - ns[x]["step"] for x in range(len(ns) - 1)), ns[0]["step"])
        seq = [k for k in shape if k - 1 in shape and shape[k][:2] == shape[k - 1][:2] and shape[k][2] != shape[k - 1][2]]
        share = len(seq) / max(1, len(shape))
        if share > best[0] / max(1, best[1]):
            best = (len(seq), len(shape), sorted(bar_no(pc, start + k * u) for k in seq), name)
    return best


def melody(line):
    c = Counter()
    for a, b in zip(line, line[1:]):
        d = abs(b["step"] - a["step"])
        c["repeat" if d == 0 else "step" if d == 1 else "third" if d == 2 else "fourth/fifth" if d in (3, 4) else "sixth+"] += 1
    return c


def aria_bass():
    """the Aria's lowest note on each of its 32 downbeats, as a letter (so that the minor variations compare)"""
    pc = CORPUS["gv-aria"]
    lows = [n for v in pc["voices"].values() for n in v]
    out = {}
    for b in pc["bars"]:
        cand = [n for n in lows if n["on"] <= b["on"] + 1e-6 < n["on"] + n["dur"]]
        if cand:
            out[b["n"]] = min(cand, key=lambda n: n["midi"])["p"][0]
    return out


def bass_agreement(pc, free):
    """the free voice's lowest note against the Aria's, at the points that correspond to the Aria's downbeats
    (a 16-bar variation holds two Aria bars in each of its bars: its downbeat and its half bar)"""
    ab = aria_bass()
    lows = [n for v in free for n in pc["voices"][v]]
    barlen = pc["bars"][1]["on"] - pc["bars"][0]["on"]
    per = 2 if len(pc["bars"]) == 16 else 1
    agree, tot, miss = 0, 0, []
    for b in pc["bars"]:
        for k in range(per):
            t = b["on"] + k * barlen / per
            an = (b["n"] - 1) * per + k + 1
            span = barlen / per
            cand = [n for n in lows if n["on"] < t + span - 1e-6 and n["on"] + n["dur"] > t + 1e-6]
            if not cand or an not in ab:
                continue
            tot += 1
            # the ground note kept: the lowest note the free voice sounds within that Aria bar's span (an ornamented,
            # arpeggiated or delayed bass still counts)
            if min(cand, key=lambda n: n["midi"])["p"][0] == ab[an]:
                agree += 1
            else:
                miss.append(f"{b['n']}" + (f".{k + 1}" if per > 1 else ""))
    return agree, tot, miss


def section_lines(pc, sec):
    lo, hi = (int(x) for x in sec["bars"].replace("~", "").split("-"))
    on0 = pc["bars"][[b["n"] for b in pc["bars"]].index(lo)]["on"]
    on1 = pc["bars"][[b["n"] for b in pc["bars"]].index(hi)]["on"] + (pc["bars"][1]["on"] - pc["bars"][0]["on"])
    pick = lambda v: [n for n in pc["voices"][v] if not n.get("chord") and on0 - 1e-9 <= n["on"] < on1 - 1e-9]
    return pick(sec["leader"]), pick(sec["follower"]), (lo, hi)


def main():
    results = {}
    for r in READ["pieces"]:
        if r["id"] not in CORPUS or "canon" not in r:
            continue
        pc = CORPUS[r["id"]]
        for k, sec in enumerate(r["canon"]):
            if not sec.get("follower") or sec["leader"].startswith("see") or "~" in sec["bars"] or sec["motion"] not in ("rectus", "inversus"):
                continue
            L, F, span = section_lines(pc, sec)
            rows = analyse_pair(pc, L, F, r["id"])
            res = {"piece": r["id"], "title": r["title"], "section": sec["bars"], "interval": sec["interval"], "motion": sec["motion"],
                   "lag": sec["lag"], "verticals": len(rows)}
            res["consonant"] = sum(x["cons"] for x in rows) / max(1, len(rows))
            res["strong_consonant"] = sum(x["cons"] for x in rows if x["strong"]) / max(1, sum(1 for x in rows if x["strong"]))
            res["iv_hist"] = Counter(x["iv"] for x in rows if x["cons"])
            kinds = Counter(x["kind"] for x in rows if not x["cons"])
            res["diss_kinds"] = kinds
            res["diss_examples"] = defaultdict(list)
            for x in rows:
                if not x["cons"] and len(res["diss_examples"][x["kind"]]) < 4:
                    res["diss_examples"][x["kind"]].append(x["bar"])
            res["one_voice_moves"] = sum(1 for x in rows if not x["both"]) / max(1, len(rows))
            seq, nb, ex, unit = sequence_share(pc, L)
            res["sequence"] = (seq, nb, sorted(set(ex))[:8], unit)
            res["melody"] = melody(L)
            results[f"{r['id']}:{sec['bars']}"] = res
        if r["id"].startswith("gv"):
            res = results.setdefault(f"{r['id']}:bass", {"piece": r["id"]})
            res["bass"] = bass_agreement(pc, [v.split(" ")[0] for v in r.get("free", [])]) if r.get("free") else None
    write(results)


def pct(x):
    return f"{100 * x:.0f}%"


def write(results):
    L = ["# How Bach's canons work: first measurements (HABITS-1)", "",
         "Generated by `python3 tools/canons/habits.py` from `data/canons/corpus.json` and the hand reading "
         "`data/canons/readings.json`. First pass: the Goldberg canons (Var. 3-27) and the Art of Fugue canon at the octave, "
         "the pieces whose reading is settled. Numbers come with bars to look at. These are observations, not rules (the owner "
         "decides what becomes a precept).", ""]
    L += ["## 1. The vertical: what the two canonic voices make together", "",
          "At every attack of either canonic voice (the free bass left out), the interval between leader and follower. "
          "*On the beat*: attacks on the notated beat. Dissonances are classed by how they are treated.", "",
          "| canon | section | lag | verticals | consonant | on the beat consonant | commonest consonances | dissonances by treatment (bars) | one voice moves alone |",
          "|---|---|---|---|---|---|---|---|---|"]
    for key, r in results.items():
        if "verticals" not in r:
            continue
        ivs = ", ".join(f"{k}: {v}" for k, v in r["iv_hist"].most_common(4))
        ds = "; ".join(f"{k} {v} ({', '.join(map(str, r['diss_examples'][k]))})" for k, v in r["diss_kinds"].most_common())
        L.append(f"| {r['title']} | {r['section']} | {r['lag']} | {r['verticals']} | {pct(r['consonant'])} | {pct(r['strong_consonant'])} | {ivs} | {ds} | {pct(r['one_voice_moves'])} |")
    L += ["", "## 2. The leader's line", "",
          "*Sequence*: units (beat, half bar, bar or two bars; the size with the highest share is shown) whose rhythm and melodic "
          "intervals repeat the previous unit's at another pitch. A strict test: an ornamented or altered repetition is not counted.", "",
          "| canon | section | bars in sequence | examples (bars) | steps | thirds | fourths/fifths | sixths+ | repeated notes |", "|---|---|---|---|---|---|---|---|---|"]
    for key, r in results.items():
        if "verticals" not in r:
            continue
        s, nb, ex, unit = r["sequence"]
        m = r["melody"]
        tot = sum(m.values())
        L.append(f"| {r['title']} | {r['section']} | {s} of {nb} {unit}s | {', '.join(map(str, ex))} | {pct(m['step'] / tot)} | {pct(m['third'] / tot)} | {pct(m['fourth/fifth'] / tot)} | {pct(m['sixth+'] / tot)} | {pct(m['repeat'] / tot)} |")
    L += ["", "## 3. The Goldberg canons over the ground", "",
          "The lowest note the free voice sounds within the span of each Aria bar, against the Aria's lowest note on that bar's downbeat, by letter "
          "(so that the G minor variations compare). The 16-bar variations hold two Aria bars in each bar (bar.1 and bar.2 below).", "",
          "| variation | Aria downbeats agreeing | where they differ |", "|---|---|---|"]
    for key, r in results.items():
        if key.endswith(":bass") and r.get("bass"):
            a, t, miss = r["bass"]
            L.append(f"| {r['piece']} | {a} of {t} ({pct(a / max(1, t))}) | {', '.join(map(str, miss))} |")
    L += ["", "**Caveat on section 3.** The test compares with the Aria's lowest sounding note, which is not the ground itself "
          "(Aria bar 7 sounds E over a ground on D), and the variations realise the ground's harmony rather than its exact notes. "
          "The low agreement is therefore not a finding; the test is to be redone against the ground as the literature states it "
          "(PLAN.md, K3)."]
    proto = Path("data/canons/prototype-canons.json")
    if proto.exists():
        runs = json.loads(proto.read_text())
        pcp = {"meter": "4/4", "bars": [{"n": i + 1, "on": 4.0 * i} for i in range(8)]}
        agg, kinds, ivs, mel, sq = Counter(), Counter(), Counter(), Counter(), [0, 0]
        for r in runs:
            rows = [x for x in analyse_pair(pcp, r["up"], r["lo"], "proto") if x["t"] >= 8]
            agg["n"] += len(rows); agg["cons"] += sum(x["cons"] for x in rows)
            agg["strong"] += sum(1 for x in rows if x["strong"]); agg["sc"] += sum(x["cons"] for x in rows if x["strong"])
            agg["alone"] += sum(1 for x in rows if not x["both"])
            ivs.update(x["iv"] for x in rows if x["cons"]); kinds.update(x["kind"] for x in rows if not x["cons"])
            mel.update(melody(r["up"]))
            s_, nb, _, _ = sequence_share(pcp, r["up"]); sq[0] += s_; sq[1] += nb
        t = sum(mel.values())
        L += ["", "## 4. Against the first prototype (lab/canon/canon-at-the-octave.html)", "",
              f"Ten canons at the octave written by the prototype on one subject (G major, 8 bars, lag 2 bars), measured the same way "
              f"(bars 3-8, where both voices sound): {agg['n']} verticals, {pct(agg['cons'] / agg['n'])} consonant, "
              f"{pct(agg['sc'] / agg['strong'])} on the beat; consonances {', '.join(f'{k}: {v}' for k, v in ivs.most_common(4))}; "
              f"one voice moves alone at {pct(agg['alone'] / agg['n'])} of the attacks; dissonances: "
              f"{', '.join(f'{k} {v}' for k, v in kinds.most_common(6))}. Leader's melody: steps {pct(mel['step'] / t)}, "
              f"thirds {pct(mel['third'] / t)}, fourths/fifths {pct(mel['fourth/fifth'] / t)}, sixths+ {pct(mel['sixth+'] / t)}; "
              f"units in sequence {sq[0]} of {sq[1]}.", "",
              "**What this shows.** On these local measures the prototype is within Bach's range (consonance, imperfect consonances "
              "first, complementary rhythm). Two local differences: its line is more stepwise and never leaps a sixth or more, and 28% of its "
              "dissonances are passing or neighbour notes on the beat, against 4-16% in Bach's canons (25% in Var. 6, the canon at "
              "the second). Neither explains why it sounds aimless. "
              "What it lacks must be measured at a higher level: harmonic plan and cadences, phrase, motive and its sequential "
              "working, register and climax, and (in the Goldberg canons) the bass. That is the next study (PLAN.md, K3-K5)."]
    OUT_DOC.write_text("\n".join(L) + "\n")
    OUT_JSON.write_text(json.dumps(results, indent=1, default=lambda o: dict(o) if isinstance(o, Counter) else str(o)))
    print("\n".join(L))


if __name__ == "__main__":
    main()
