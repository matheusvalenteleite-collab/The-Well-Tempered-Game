#!/usr/bin/env python3
"""Analysis layer over Bach's chorales (layer 3): computed facts, each labelled as a reading.

Input : data/chorales/bach/chorales/bach_NNN.json (the parsed layer)
Output: data/chorales/bach/analysis/bach_NNN.json and docs/chorales/BACH-COUNTS.md

For every chorale:

  verticalities   every onset at which some voice strikes a note: the four sounding pitches (and
                  which are struck, which held), the intervals of the upper voices over the bass,
                  and the figure a continuo player would read there. Two figures: `literal` (every
                  interval present, reduced to the octave except 9, with the accidentals that the
                  key signature does not give) and `figure` (the period abbreviation: 5/3 -> "",
                  6/3 -> 6, 6/5/3 -> 6/5, 6/4/3 -> 4/3, 6/4/2 -> 4/2, 7/5/3 -> 7; accidentals kept).
                  Only figures on the beat are marked `on_beat`; between beats Bach's voices pass.
  phrases         the lines of the hymn, ending at the soprano's fermatas (in the written order).
  cadences        for each phrase end: the bass and soprano motion into the final chord, the final
                  and penultimate figures, the degree of the final bass in the chorale's key, and a
                  class (authentic perfect / imperfect, plagal, half, Phrygian half, deceptive,
                  other), by the rules written in `classify_cadence`.

The figures are derived from the notes, not read from a source: Bach's chorales carry no figures.

Run:  python3 tools/chorales/bach_analyse.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from fractions import Fraction as F
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "fux_import"))
from pitch import Pitch, frac, parse_pitch_name  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kirnberger as K  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACH = ROOT / "data" / "chorales" / "bach"
OUT = BACH / "analysis"
REPORT = ROOT / "docs" / "chorales" / "BACH-COUNTS.md"
VOICES = ["bass", "tenor", "alto", "soprano"]
STEPS = "CDEFGAB"
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ACC_SIGN = {-2: "bb", -1: "b", 0: "n", 1: "#", 2: "x"}


def key_signature(ks: str | None) -> dict[str, int]:
    out: dict[str, int] = {}
    if not ks:
        return out
    i = 0
    while i < len(ks):
        step = ks[i].upper()
        i += 1
        alt = 0
        while i < len(ks) and ks[i] in "#-":
            alt += 1 if ks[i] == "#" else -1
            i += 1
        out[step] = alt
    return out


def timeline(notes: list[dict]) -> list[tuple[F, F, dict]]:
    """(start, end, note) for each sounding note; tied notes are merged into one."""
    out: list[tuple[F, F, dict]] = []
    for n in notes:
        if n.get("rest"):
            continue
        s, e = F(n["offset"]), F(n["offset"]) + F(n["duration"])
        if n.get("tie") in ("stop", "continue") and out and out[-1][2]["pitch"] == n["pitch"] and out[-1][1] == s:
            # a fermata written on the tied half belongs to the note
            first = dict(out[-1][2], fermata=True) if n.get("fermata") else out[-1][2]
            out[-1] = (out[-1][0], e, first)
            continue
        out.append((s, e, n))
    return out


def at(tl: list[tuple[F, F, dict]], t: F) -> tuple[dict | None, bool]:
    for s, e, n in tl:
        if s <= t < e:
            return n, s == t
    return None, False


def interval_number(bass: Pitch, upper: Pitch) -> int:
    return upper.diatonic - bass.diatonic + 1


def figure_of(bass: Pitch, uppers: list[Pitch], ks: dict[str, int]) -> tuple[str, str, list[dict]]:
    """Literal and abbreviated figures of a sonority over its bass."""
    rows: dict[int, str] = {}
    detail = []
    for u in uppers:
        n = interval_number(bass, u)
        if n < 1:
            n = 1  # a voice below the bass (a crossing): read as a unison
        simple = (n - 1) % 7 + 1
        if simple == 1 and n > 1:
            simple = 8
        num = 9 if simple == 2 and n >= 9 else simple
        acc = ""
        if u.alter != ks.get(u.step, 0):
            acc = ACC_SIGN.get(u.alter, "?")
        detail.append({"pitch": u.name, "interval": n, "figure": num, "accidental": acc or None})
        key = num if num != 8 else 8
        if key not in rows or acc:
            rows[key] = acc
    nums = set(rows) - {8, 1}
    # a 9 in a chord with 4 or 6 reads as 2 (4/2); otherwise it stays 9 (a suspension over the bass)
    if 9 in nums and (4 in nums or 6 in nums) and 7 not in nums:
        rows[2] = rows.pop(9)
        nums = (nums - {9}) | {2}
    literal = "/".join(f"{rows[k]}{k}" if rows[k] else str(k) for k in sorted(rows, reverse=True))
    s = frozenset(nums)
    abbreviations = {
        frozenset({5, 3}): [], frozenset({3}): [], frozenset({5}): [], frozenset(): [],
        frozenset({6, 3}): [6], frozenset({6}): [6],
        frozenset({6, 4}): [6, 4],
        frozenset({7, 5, 3}): [7], frozenset({7, 3}): [7], frozenset({7, 5}): [7], frozenset({7}): [7],
        frozenset({6, 5, 3}): [6, 5], frozenset({6, 5}): [6, 5],
        frozenset({6, 4, 3}): [4, 3], frozenset({4, 3}): [4, 3],
        frozenset({6, 4, 2}): [4, 2], frozenset({4, 2}): [4, 2], frozenset({2}): [2], frozenset({6, 2}): [4, 2],
        frozenset({5, 4}): [4], frozenset({4}): [4],
        frozenset({9, 5, 3}): [9], frozenset({9, 3}): [9], frozenset({9, 5}): [9], frozenset({9}): [9],
    }
    shown = abbreviations.get(s)
    if shown is None:
        shown = sorted(nums, reverse=True)
    # accidentals the abbreviation hides (an altered third under 6, or alone) are shown
    parts = [f"{rows.get(k, '')}{k}" for k in shown]
    if 3 in rows and rows[3] and 3 not in shown:
        parts.append(rows[3])  # "#" alone = sharp third
    for k in (5, 6) :
        if k in rows and rows[k] and k not in shown:
            parts.append(f"{rows[k]}{k}")
    figure = "/".join(parts)
    return literal, figure, detail


DEGREES = {0: "I", 1: "bII", 2: "II", 3: "bIII", 4: "III", 5: "IV", 6: "#IV", 7: "V", 8: "bVI", 9: "VI", 10: "bVII", 11: "VII"}


def numbers(literal: str) -> set[int]:
    return {int("".join(ch for ch in part if ch.isdigit())) for part in literal.split("/") if any(ch.isdigit() for ch in part)}


def root_position(v: dict) -> bool:
    """No sixth and no second over the bass: a triad or seventh chord on its root, suspensions
    (4, 9, 7) included."""
    n = numbers(v["literal"]) - {8}
    return 6 not in n and 2 not in n


def classify_cadence(pen: dict, fin: dict, tonic_pc: int) -> str:
    """The usual classes, by the bass motion into the final and the position of the two chords.
    Written to be corrected: each test is one line."""
    if pen is None or fin is None:
        return "other"
    b1, b2 = parse_pitch_name(pen["bass"]), parse_pitch_name(fin["bass"])
    dia = (b2.diatonic - b1.diatonic) % 7  # generic interval up, within the octave: 3 = a fourth up
    semis = (b2.midi - b1.midi) % 12
    rp_pen, rp_fin = root_position(pen), root_position(fin)
    deg = (PC[b2.step] + b2.alter - tonic_pc) % 12
    if rp_fin and rp_pen and dia == 3 and semis == 5:
        return "authentic, perfect" if fin["soprano_over_bass"] in (1, 8) else "authentic, imperfect"
    if rp_fin and not rp_pen and dia == 1 and semis == 1 and 6 in numbers(pen["literal"]):
        return "authentic, dominant inverted (leading tone in the bass)"
    if rp_fin and dia == 6 and semis == 11 and 6 in numbers(pen["literal"]):
        return "Phrygian half"
    if rp_fin and deg == 7:
        return "half"
    if rp_fin and rp_pen and dia == 4 and semis == 7:
        return "bass up a fifth: plagal, or a half cadence in another key"
    if rp_fin and rp_pen and dia == 1 and semis in (1, 2):
        return "deceptive"
    if dia == 0 and semis == 0:
        return "other: bass repeated"
    return "other"


def analyse(c: dict) -> dict:
    ks = key_signature(c["key_signature"])
    tl = {v: timeline(c["voices"][v]) for v in VOICES}
    onsets = sorted({s for v in VOICES for s, _, _ in tl[v]})
    measures = c["measures"]
    beat = F(1, 2) if (c["meters"] and c["meters"][0]["meter"] == "3/2") else F(1, 4)

    def measure_start(t: F) -> F:
        return max((F(m["offset"]) for m in measures if F(m["offset"]) <= t), default=F(0))

    verts = []
    for t in onsets:
        sounding = {v: at(tl[v], t) for v in VOICES}
        if sounding["bass"][0] is None:
            continue
        bass = parse_pitch_name(sounding["bass"][0]["pitch"])
        uppers = [parse_pitch_name(sounding[v][0]["pitch"]) for v in VOICES[1:] if sounding[v][0] is not None]
        literal, figure, detail = figure_of(bass, uppers, ks)
        verts.append({
            "t": frac(t),
            "measure": sounding["bass"][0]["measure"],
            "on_beat": ((t - measure_start(t)) / beat).denominator == 1,
            "pitches": {v: (sounding[v][0]["pitch"] if sounding[v][0] else None) for v in VOICES},
            "struck": [v for v in VOICES if sounding[v][1]],
            "literal": literal,
            "figure": figure,
            "crossing": any(d["interval"] < 1 for d in detail),
        })
        # Kirnberger: the fundamental chord and the part each voice plays in it
        ctx = {}
        for v in VOICES:
            n, struck = sounding[v]
            if n is None:
                continue
            idx = next(i for i, (a, _, m) in enumerate(tl[v]) if m is n)
            ctx[v] = {"pitch": n["pitch"], "struck": struck, "held": not struck,
                      "prev": tl[v][idx - 1][2]["pitch"] if idx > 0 and tl[v][idx - 1][1] == tl[v][idx][0] else (tl[v][idx - 1][2]["pitch"] if idx > 0 else None),
                      "next": tl[v][idx + 1][2]["pitch"] if idx + 1 < len(tl[v]) else None,
                      "on_beat": verts[-1]["on_beat"]}
        ch, labels = K.analyse_sonority(ctx)
        vv = verts[-1]
        vv["root"] = ch.root if ch else None
        vv["chord"] = ch.kind if ch else None
        vv["bass_role"] = labels.get("bass")
        vv["labels"] = labels
    # sevenths: how each is treated (Kirnberger's essential dissonance)
    # Counted where a seventh sounds on the beat: between beats a held chord tone can make a
    # momentary "seventh" with a passing note, which is no part of the harmony.
    for i, v in enumerate(verts):
        if not v["on_beat"]:
            continue
        for voice, lab in v["labels"].items():
            if lab != "seventh":
                continue
            n = at(tl[voice], F(v["t"]))[0]
            idx = next(j for j, (_, _, m) in enumerate(tl[voice]) if m is n)
            start = tl[voice][idx][0]
            if F(v["t"]) != start and any(F(w["t"]) == start and w["on_beat"] and w["labels"].get(voice) == "seventh" for w in verts):
                continue  # counted where it became a seventh
            prev = tl[voice][idx - 1][2]["pitch"] if idx > 0 else None
            nxt = tl[voice][idx + 1] if idx + 1 < len(tl[voice]) else None
            prepared = (prev == n["pitch"] and tl[voice][idx - 1][1] == start) or F(v["t"]) > start
            resolves = nxt is not None and K.diatonic(nxt[2]["pitch"]) - K.diatonic(n["pitch"]) == -1
            bass_at_res = at(tl["bass"], nxt[0])[0] if nxt else None
            bass_now = v["pitches"]["bass"]
            v.setdefault("sevenths", []).append({
                "voice": voice, "prepared": prepared, "resolves_down": resolves,
                "bass_moves_at_resolution": (bass_at_res is not None and bass_at_res["pitch"] != bass_now) if resolves else None,
            })
    # phrases and cadences
    sop = tl["soprano"]
    ends = [(s, e) for s, e, n in sop if n.get("fermata")]
    tonic_pc = (PC[c["key"]["tonic"][0]] + (1 if "#" in c["key"]["tonic"] else -1 if c["key"]["tonic"][1:2] == "b" else 0)) % 12
    phrases, cadences = [], []
    start = F(0)
    for s, e in ends:
        phrases.append({"number": len(phrases) + 1, "start": frac(start), "end": frac(e), "final_onset": frac(s)})
        fin = next((v for v in verts if F(v["t"]) == s), None)
        if fin is None:  # the soprano's final note may be struck before the others: take the last sonority at or before
            fin = max((v for v in verts if F(v["t"]) <= s), key=lambda v: F(v["t"]), default=None)
        fin_bass_start = max((x for x, _, _ in tl["bass"] if x <= s), default=None)
        pen = None
        if fin_bass_start is not None:
            # the penultimate chord: the last sonority on the beat before the final bass note
            # (a bass that passes in quavers into the final is passed over)
            before = [v for v in verts if F(v["t"]) < fin_bass_start and v["on_beat"]]
            if before:
                pen = before[-1]
        def brief(v):  # noqa: E306
            if v is None:
                return None
            b, so = parse_pitch_name(v["pitches"]["bass"]), parse_pitch_name(v["pitches"]["soprano"])
            n = so.diatonic - b.diatonic
            return {"t": v["t"], "bass": v["pitches"]["bass"], "soprano": v["pitches"]["soprano"], "figure": v["figure"],
                    "literal": v["literal"], "soprano_over_bass": n % 7 + 1 if n % 7 else 8}
        bf, bp = brief(fin), brief(pen)
        cls = classify_cadence(bp, bf, tonic_pc)
        degree = None
        if bf:
            fb = parse_pitch_name(bf["bass"])
            degree = DEGREES[(PC[fb.step] + fb.alter - tonic_pc) % 12]
        cadences.append({"phrase": len(phrases), "final": bf, "penultimate": bp, "final_bass_degree": degree, "class": cls})
        start = e
    return {
        "id": c["id"], "number": c["number"], "bwv": c["bwv"], "title": c["title"]["de"],
        "key": c["key"], "beat": frac(beat),
        "verticalities": verts, "phrases": phrases, "cadences": cadences,
        "parallels": parallels(verts, phrases),
        "voice_leading": voice_leading(verts, tl),
    }


def voice_leading(verts: list[dict], tl: dict) -> dict:
    """Counts per chorale (summed in the report): doubling in complete triads on the beat, spacing,
    the leading tone of a dominant whose root falls a fifth, and the melodic intervals of each
    voice. All read from the Kirnberger labels of the verticalities."""
    out = {"doubling": Counter(), "spacing": Counter(), "leading_tone": Counter(), "melodic": Counter(), "overlap": 0}
    beats = [v for v in verts if v["on_beat"] and v["root"]]
    for v in beats:
        roles = [v["labels"].get(x) for x in VOICES]
        if v["chord"] in ("major", "minor", "diminished") and None not in roles and all(r in ("root", "third", "fifth") for r in roles):
            if len(set(roles)) == 3:
                dbl = next(r for r in ("root", "third", "fifth") if roles.count(r) == 2)
                out["doubling"][(v["chord"], v["bass_role"], dbl)] += 1
            elif len(set(roles)) == 2:
                out["doubling"][(v["chord"], v["bass_role"], "incomplete: " + "+".join(sorted(set(roles))))] += 1
        p = {x: v["pitches"][x] for x in VOICES}
        if None not in p.values():
            m = {x: K.midi(p[x]) for x in VOICES}
            out["spacing"]["soprano-alto over an octave"] += m["soprano"] - m["alto"] > 12
            out["spacing"]["alto-tenor over an octave"] += m["alto"] - m["tenor"] > 12
            out["spacing"]["tenor-bass over a twelfth"] += m["tenor"] - m["bass"] > 19
            out["spacing"]["beats"] += 1
    # the leading tone: the third of a major triad or dominant seventh whose root then falls a fifth
    for v1, v2 in zip(beats, beats[1:]):
        if v1["chord"] not in ("major", "dominant seventh") or not v2["root"]:
            continue
        if (pc_of(v1["root"]) - pc_of(v2["root"])) % 12 != 7:
            continue
        for x in VOICES:
            if v1["labels"].get(x) != "third" or v2["pitches"][x] is None:
                continue
            d = K.midi(v2["pitches"][x]) - K.midi(v1["pitches"][x])
            kind = {1: "rises a semitone (to the root)", 0: "held", -3: "falls a third (to the fifth)", -4: "falls a third (to the fifth)",
                    -1: "falls a semitone", -2: "falls a tone"}.get(d, "other")
            out["leading_tone"][(x, kind)] += 1
    # melodic intervals, note to note in each voice (ties merged)
    for x in VOICES:
        for (_, _, a), (_, _, b) in zip(tl[x], tl[x][1:]):
            d = abs(K.midi(b["pitch"]) - K.midi(a["pitch"]))
            g = abs(K.diatonic(b["pitch"]) - K.diatonic(a["pitch"]))
            name = {0: "unison", 1: "second", 2: "third", 3: "fourth", 4: "fifth", 5: "sixth", 6: "seventh", 7: "octave"}.get(g, "wider than an octave")
            aug = (g == 1 and d == 3) or (g == 3 and d == 6) or (g == 4 and d == 8) or (g == 2 and d == 5)
            dim = (g == 3 and d == 4) or (g == 4 and d == 6) or (g == 6 and d == 9) or (g == 2 and d == 2)
            out["melodic"][(x, name + (" (augmented)" if aug else " (diminished)" if dim else ""))] += 1
    return {k: ({"|".join(map(str, kk)) if isinstance(kk, tuple) else kk: n for kk, n in v.items()} if isinstance(v, Counter) else v) for k, v in out.items()}


def pc_of(name: str) -> int:
    s, a = name[0], name[1:]
    return (PC[s] + a.count("#") - a.count("b")) % 12


def parallels(verts: list[dict], phrases: list[dict]) -> list[dict]:
    """Consecutive perfect fifths, octaves and unisons between two voices that both move, from one
    verticality to the next (any onset, so passing notes count; `on_beats` says whether both
    chords fall on beats). Across a phrase end (after a fermata) they are kept but marked."""
    out = []
    ends = {F(p["end"]) for p in phrases}
    pairs = [(a, b) for i, a in enumerate(VOICES) for b in VOICES[i + 1:]]
    for v1, v2 in zip(verts, verts[1:]):
        across = any(F(v1["t"]) < e <= F(v2["t"]) for e in ends)
        for lo, hi in pairs:
            a1, b1, a2, b2 = v1["pitches"][lo], v1["pitches"][hi], v2["pitches"][lo], v2["pitches"][hi]
            if None in (a1, b1, a2, b2) or (a1 == a2 and b1 == b2):
                continue
            if a1 == a2 or b1 == b2:
                continue  # one voice holds: no parallel motion
            p1, q1, p2, q2 = map(parse_pitch_name, (a1, b1, a2, b2))
            # absolute intervals: a crossed pair (tenor above alto) is measured as it sounds
            i1, i2 = abs(q1.midi - p1.midi) % 12, abs(q2.midi - p2.midi) % 12
            g1, g2 = abs(q1.diatonic - p1.diatonic) % 7, abs(q2.diatonic - p2.diatonic) % 7
            kind = None
            if i1 == i2 == 7 and g1 == g2 == 4:
                kind = "fifths"
            elif i1 == i2 == 0 and g1 == g2 == 0:
                kind = "octaves" if q1.midi != p1.midi or q2.midi != p2.midi else "unisons"
            if kind:
                same_dir = (p2.midi - p1.midi) * (q2.midi - q1.midi) > 0
                out.append({"from": v1["t"], "to": v2["t"], "measure": v2["measure"], "voices": f"{lo}-{hi}", "kind": kind,
                            "motion": "parallel" if same_dir else "contrary (by octave leap)",
                            "on_beats": v1["on_beat"] and v2["on_beat"], "across_phrase_end": across,
                            "pitches": [a1, b1, a2, b2]})
    return out


def main() -> None:
    index = json.loads((BACH / "index.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    figs_beat, figs_all, cads, cad_deg, finals = Counter(), Counter(), Counter(), Counter(), Counter()
    n_vert = 0
    vl = defaultdict(Counter)
    par = Counter()
    par_list = []
    chords, inv, nct, nct_beat, sev, roots, unan = Counter(), Counter(), Counter(), Counter(), Counter(), Counter(), 0
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = analyse(c)
        (OUT / f"{c['id']}.json").write_text(json.dumps(a, ensure_ascii=False, separators=(",", ":")) + "\n")
        n_vert += len(a["verticalities"])
        for k, d in a["voice_leading"].items():
            if isinstance(d, dict):
                for kk, n in d.items():
                    vl[k][kk] += n
        prev_root = None
        for v in a["verticalities"]:
            if v["root"] is None:
                unan += 1
                continue
            if v["on_beat"]:
                chords[v["chord"]] += 1
                inv[(v["chord"].endswith("seventh"), v["bass_role"])] += 1
                if prev_root and prev_root != v["root"]:
                    d = (K.STEPS.index(v["root"][0]) - K.STEPS.index(prev_root[0])) % 7
                    roots[{0: "same letter, altered", 1: "up a second", 2: "up a third", 3: "up a fourth (down a fifth)", 4: "up a fifth (down a fourth)", 5: "down a third", 6: "down a second"}[d]] += 1
                prev_root = v["root"]
            for voice, lab in v["labels"].items():
                if lab not in ("root", "third", "fifth", "seventh"):
                    nct[(voice, lab)] += 1
                    nct_beat[(lab, v["on_beat"])] += 1
            for x in v.get("sevenths", []):
                sev[(x["prepared"], x["resolves_down"], x["bass_moves_at_resolution"])] += 1
        for x in a["parallels"]:
            par[(x["kind"], x["motion"], x["on_beats"], x["across_phrase_end"])] += 1
            if x["motion"] == "parallel" and not x["across_phrase_end"]:
                par_list.append((c["number"], x))
        for v in a["verticalities"]:
            figs_all[v["figure"] or "5/3"] += 1
            if v["on_beat"]:
                figs_beat[v["figure"] or "5/3"] += 1
        for k, cd in enumerate(a["cadences"]):
            cads[cd["class"]] += 1
            if cd["final_bass_degree"]:
                cad_deg[(c["key"]["mode"] in ("minor", "dorian", "phrygian") and "minor-type" or "major-type", cd["final_bass_degree"])] += 1
            if k == len(a["cadences"]) - 1 and cd["final"]:
                third = None
                b = parse_pitch_name(cd["final"]["bass"])
                for vv in ("tenor", "alto", "soprano"):
                    p = next((v for v in a["verticalities"] if v["t"] == cd["final"]["t"]), None)
                    if p and p["pitches"][vv]:
                        u = parse_pitch_name(p["pitches"][vv])
                        if (u.diatonic - b.diatonic) % 7 == 2:
                            third = (u.midi - b.midi) % 12
                finals[(c["key"]["mode"], {3: "minor third", 4: "major third", None: "no third"}.get(third, "?"))] += 1
    total_beat = sum(figs_beat.values())
    md = ["# Bach's chorales: first counts", "",
          "Generated by `tools/chorales/bach_analyse.py` over the 370 chorales (Breitkopf numbering).",
          "These are counts of derived facts, not rules. The figures are read off Bach's four voices",
          "(the chorales carry none). The cadence classes follow the simple tests written in",
          "`classify_cadence`, which are meant to be corrected.", "",
          f"- Verticalities (onsets where some voice moves): {n_vert}",
          f"- On the beat: {total_beat}", "",
          "## Figures on the beat (period abbreviation; \"5/3\" = no figure)", "",
          "| figure | count | share |", "|---|---|---|"]
    for f, k in figs_beat.most_common(30):
        md.append(f"| {f} | {k} | {100 * k / total_beat:.1f}% |")
    md += ["", "## Cadences at the fermatas", "", "| class | count |", "|---|---|"]
    for f, k in cads.most_common():
        md.append(f"| {f} | {k} |")
    md += ["", "## Where the phrases end (degree of the final bass in the chorale's key)", "",
           "| key type | degree | count |", "|---|---|---|"]
    for (kt, d), k in sorted(cad_deg.items(), key=lambda x: (x[0][0], -x[1])):
        md.append(f"| {kt} | {d} | {k} |")
    md += ["", "## The last chord", "", "| mode (editor's label) | third of the last chord | count |", "|---|---|---|"]
    for (m, t), k in sorted(finals.items(), key=lambda x: (x[0][0], -x[1])):
        md.append(f"| {m} | {t} | {k} |")
    md += ["", "## Kirnberger: fundamental chords (on the beat)", "",
           "Read with `tools/chorales/kirnberger.py`: the notes of a sonority stand in thirds over a",
           "fundamental bass (triad or seventh chord); a note that does not is taken away as an incidental",
           f"dissonance, by its melodic shape. Sonorities left unanalysed: {unan} of {n_vert}.", "",
           "| chord | count |", "|---|---|"]
    for k, n in chords.most_common():
        md.append(f"| {k} | {n} |")
    md += ["", "| chord | bass is | count |", "|---|---|---|"]
    for (is7, role), n in sorted(inv.items(), key=lambda x: -x[1]):
        md.append(f"| {'seventh chord' if is7 else 'triad'} | {role} | {n} |")
    md += ["", "## The fundamental bass: how it moves (from beat to beat, when the root changes)", "", "| motion | count |", "|---|---|"]
    for k, n in roots.most_common():
        md.append(f"| {k} | {n} |")
    md += ["", "## Incidental dissonances (by melodic shape)", "", "| kind | on the beat | count |", "|---|---|---|"]
    for (k, ob), n in sorted(nct_beat.items(), key=lambda x: -x[1]):
        md.append(f"| {k} | {'yes' if ob else 'no'} | {n} |")
    md += ["", "| voice | kind | count |", "|---|---|---|"]
    for (voice, k), n in sorted(nct.items(), key=lambda x: (VOICES[::-1].index(x[0][0]), -x[1])):
        md.append(f"| {voice} | {k} | {n} |")
    md += ["", "## Sevenths: essential or incidental?", "",
           "Each seventh of a seventh chord on the beat, where it becomes one: prepared (held or struck again from the",
           "chord before) or free; resolving down by step or not; and, when it resolves, whether the bass moves",
           "at that moment (the harmony moves on: an essential seventh) or stays (the seventh resolves over",
           "the same bass, as a suspension does).", "",
           "| prepared | resolves down by step | bass moves at the resolution | count |", "|---|---|---|---|"]
    for (pr, rd, bm), n in sorted(sev.items(), key=lambda x: -x[1]):
        md.append(f"| {'yes' if pr else 'no'} | {'yes' if rd else 'no'} | {'—' if bm is None else ('yes' if bm else 'no')} | {n} |")
    md += ["", "## Doubling in complete triads on the beat", "",
           "Four voices, three chord members: which is doubled, by chord and by the bass's place in it.", "",
           "| triad | bass is | doubled | count | share of that triad and position |", "|---|---|---|---|---|"]
    groups = defaultdict(int)
    for k, n in vl["doubling"].items():
        ch, br, d = k.split("|")
        groups[(ch, br)] += n
    for k, n in sorted(vl["doubling"].items(), key=lambda x: (x[0].split("|")[0], x[0].split("|")[1], -x[1])):
        ch, br, d = k.split("|")
        if groups[(ch, br)] >= 30:
            md.append(f"| {ch} | {br} | {d} | {n} | {100 * n / groups[(ch, br)]:.0f}% |")
    md += ["", "## Spacing (on the beat)", "", "| | count | share |", "|---|---|---|"]
    for k in ("soprano-alto over an octave", "alto-tenor over an octave", "tenor-bass over a twelfth"):
        md.append(f"| {k} | {vl['spacing'][k]} | {100 * vl['spacing'][k] / vl['spacing']['beats']:.1f}% |")
    md += ["", "## The leading tone", "",
           "The third of a major triad or dominant seventh whose root then falls a fifth (V-I, in any key):",
           "where that voice goes.", "", "| voice | goes | count |", "|---|---|---|"]
    for k, n in sorted(vl["leading_tone"].items(), key=lambda x: (VOICES[::-1].index(x[0].split("|")[0]), -x[1])):
        voice, kind = k.split("|")
        md.append(f"| {voice} | {kind} | {n} |")
    md += ["", "## Melodic intervals", "", "| voice | interval | count |", "|---|---|---|"]
    for k, n in sorted(vl["melodic"].items(), key=lambda x: (VOICES[::-1].index(x[0].split("|")[0]), -x[1])):
        voice, kind = k.split("|")
        md.append(f"| {voice} | {kind} | {n} |")
    md += ["", "## Consecutive fifths and octaves", "",
           "Between two voices that both move, from one onset to the next. Contrary motion means the",
           "perfect interval is kept by an octave leap. Rows after a phrase end are kept apart: the fermata",
           "separates the chords.", "",
           "| kind | motion | both on beats | across a phrase end | count |", "|---|---|---|---|---|"]
    for (k, m, ob, ac), n in sorted(par.items(), key=lambda x: -x[1]):
        md.append(f"| {k} | {m} | {'yes' if ob else 'no'} | {'yes' if ac else 'no'} | {n} |")
    md += ["", "Parallel motion inside a phrase, every case (no., bar, voices, pitches):", ""]
    for num, x in par_list:
        md.append(f"- no. {num}, bar {x['measure']}, {x['voices']}: {x['kind']}, {' '.join(x['pitches'][:2])} → {' '.join(x['pitches'][2:])}{'' if x['on_beats'] else ' (off the beat)'}")
    REPORT.write_text("\n".join(md) + "\n")
    print(f"{len(index['catalogue'])} chorales, {n_vert} verticalities; cadences: {dict(cads)}")


if __name__ == "__main__":
    main()
