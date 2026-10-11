#!/usr/bin/env python3
"""Layer 4, first draft: Bach's habits in the chorales, as observations with counts and examples.

Reads the analysis layer (data/chorales/bach/analysis/) and writes docs/chorales/PRINCIPLES.md.
Every statement is a count over the 370 chorales; every example names the chorale (Breitkopf
number, BWV), the bar and the voices, with a link to the page of the 1784 Breitkopf print where
the edition gives one. Nothing here is a rule yet: the owner reads, corrects and decides (as the
Fux rules were decided), and Kirnberger's text is still to be checked (KIRNBERGER.md).

Run:  python3 tools/chorales/principles.py
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
OUT = ROOT / "docs" / "chorales" / "PRINCIPLES.md"
VOICES = ["bass", "tenor", "alto", "soprano"]
N_EX = 3


def load():
    index = json.loads((BACH / "index.json").read_text())
    for e in index["catalogue"]:
        c = json.loads((BACH / e["file"]).read_text())
        a = json.loads((BACH / "analysis" / f"{c['id']}.json").read_text())
        yield c, a


def scan(c: dict) -> str | None:
    urls = c["references"].get("URL-scan")
    if isinstance(urls, str):
        urls = [urls]
    for u in urls or []:
        if "1784" in u or "bsb11137805" in u:
            return u.split()[0]
    return (urls[0].split()[0] if urls else None)


def ex(c: dict, bar, what: str) -> str:
    link = scan(c)
    head = f"no. {c['number']} (BWV {c['bwv']}), bar {bar}"
    return f"{head}: {what}" + (f" — [Breitkopf 1784]({link})" if link else "")


def interval_over(bass: str, upper: str) -> int:
    n = K.diatonic(upper) - K.diatonic(bass)
    r = n % 7 + 1
    if r == 1 and n > 0:
        return 8
    if r == 2 and n >= 7:
        return 9
    return r


def main() -> None:
    roots = Counter()
    root_ex = defaultdict(list)
    sev = Counter()
    sev_ex = defaultdict(list)
    susp = Counter()
    susp_ex = defaultdict(list)
    bass_susp = Counter()
    nct_voice = Counter()
    lt = Counter()
    lt_ex = defaultdict(list)
    cad = Counter()
    cad_ex = defaultdict(list)
    picardy = Counter()
    par_in = []
    aug2 = 0
    ant_tot = ant_near = 0
    n_ch = 0
    for c, a in load():
        n_ch += 1
        vs = a["verticalities"]
        beats = [v for v in vs if v["on_beat"] and v["root"]]
        for v1, v2 in zip(beats, beats[1:]):
            if v1["root"] == v2["root"]:
                continue
            d = (K.STEPS.index(v2["root"][0]) - K.STEPS.index(v1["root"][0])) % 7
            name = {1: "up a step", 2: "up a third", 3: "down a fifth", 4: "up a fifth", 5: "down a third", 6: "down a step"}.get(d)
            if name:
                roots[name] += 1
                if len(root_ex[name]) < N_EX and name in ("up a third", "down a step"):
                    root_ex[name].append(ex(c, v2["measure"], f"{v1['root']} {v1['chord']} → {v2['root']} {v2['chord']}"))
        for i, v in enumerate(vs):
            for s in v.get("sevenths", []):
                key = ("prepared" if s["prepared"] else "free") + ", " + ("resolves down" if s["resolves_down"] else "does not resolve down")
                if s["resolves_down"]:
                    key += ", the bass moves" if s["bass_moves_at_resolution"] else ", over the same bass"
                sev[key] += 1
                if len(sev_ex[key]) < N_EX:
                    sev_ex[key].append(ex(c, v["measure"], f"{s['voice']} {v['pitches'][s['voice']]} over {v['pitches']['bass']} ({v['root']} {v['chord']})"))
            for voice, lab in v["labels"].items():
                if lab in ("root", "third", "fifth", "seventh"):
                    continue
                nct_voice[(lab, voice)] += 1
                if lab == "suspension" and v["on_beat"]:
                    if voice == "bass":
                        bass_susp[1] += 1
                        continue
                    iv = interval_over(v["pitches"]["bass"], v["pitches"][voice])
                    susp[iv] += 1
                    if len(susp_ex[iv]) < N_EX:
                        susp_ex[iv].append(ex(c, v["measure"], f"{voice} {v['pitches'][voice]} over {v['pitches']['bass']}"))
        # the leading tone, by voice (as in BACH-COUNTS, with examples of the alto falling)
        for v1, v2 in zip(beats, beats[1:]):
            if v1["chord"] not in ("major", "dominant seventh") or not v2["root"]:
                continue
            p1 = (K.PC[v1["root"][0]] + v1["root"][1:].count("#") - v1["root"][1:].count("b")) % 12
            p2 = (K.PC[v2["root"][0]] + v2["root"][1:].count("#") - v2["root"][1:].count("b")) % 12
            if (p1 - p2) % 12 != 7:
                continue
            for voice in VOICES[1:]:
                if v1["labels"].get(voice) != "third" or not v2["pitches"][voice]:
                    continue
                d = K.midi(v2["pitches"][voice]) - K.midi(v1["pitches"][voice])
                k = "rises" if d == 1 else "falls to the fifth" if d in (-3, -4) else "other"
                lt[(voice, k)] += 1
                if k == "falls to the fifth" and len(lt_ex[voice]) < N_EX:
                    lt_ex[voice].append(ex(c, v2["measure"], f"{voice} {v1['pitches'][voice]} → {v2['pitches'][voice]}"))
        for cd in a["cadences"]:
            cad[cd["class"]] += 1
            if len(cad_ex[cd["class"]]) < N_EX and cd["final"]:
                cad_ex[cd["class"]].append(ex(c, next((v["measure"] for v in vs if v["t"] == cd["final"]["t"]), "?"),
                                              f"{cd['penultimate']['bass'] if cd['penultimate'] else '?'} → {cd['final']['bass']}, soprano {cd['final']['soprano']}"))
        if a["cadences"] and a["cadences"][-1]["final"] and c["key"]["mode"] in ("minor", "dorian", "phrygian"):
            fin = next(v for v in vs if v["t"] == a["cadences"][-1]["final"]["t"])
            b = fin["pitches"]["bass"]
            thirds = [K.midi(fin["pitches"][x]) - K.midi(b) for x in VOICES[1:] if fin["pitches"][x] and (K.diatonic(fin["pitches"][x]) - K.diatonic(b)) % 7 == 2]
            picardy["major third" if any(t % 12 == 4 for t in thirds) else "minor third" if thirds else "no third"] += 1
        ends = [F(cd["final"]["t"]) for cd in a["cadences"] if cd["final"]]
        for v in vs:
            if v["labels"].get("soprano") == "anticipation":
                ant_tot += 1
                ant_near += any(0 < e - F(v["t"]) <= F(1, 2) for e in ends)
        for p in a["parallels"]:
            if p["motion"] == "parallel" and not p["across_phrase_end"]:
                par_in.append(ex(c, p["measure"], f"{p['voices']}, {p['kind']}, {' '.join(p['pitches'][:2])} → {' '.join(p['pitches'][2:])}" + ("" if p["on_beats"] else ", off the beat")))
        for voice in VOICES:
            notes = [n for n in c["voices"][voice] if not n.get("rest") and n.get("tie") not in ("stop", "continue")]
            for x, y in zip(notes, notes[1:]):
                if abs(K.diatonic(y["pitch"]) - K.diatonic(x["pitch"])) == 1 and abs(K.midi(y["pitch"]) - K.midi(x["pitch"])) == 3:
                    aug2 += 1

    def pct(n, d):
        return f"{100 * n / d:.0f}%" if d else "—"

    md = ["# Bach's habits in the chorales: a first draft", "",
          "Generated by `tools/chorales/principles.py` from the analysis layer. These are **observations**,",
          "each a count over the 370 chorales with examples to look at in the Breitkopf print. They are",
          "not yet rules. The owner reads, corrects and decides which become precepts of the game (as with",
          "Fux: D39, \"every rule is cleared by Fux's own solutions\", here by Bach's, C1). The categories are",
          "Kirnberger's as applied in `KIRNBERGER.md`, still to be checked against his text.", ""]
    tot = sum(roots.values())
    md += ["## 1. The fundamental bass", "",
           f"From beat to beat, where the root changes ({tot} changes), it moves:", ""]
    md += [f"- {k}: {n} ({pct(n, tot)})" for k, n in roots.most_common()]
    md += ["", "Falling fifths dominate (about two to one over rising fifths); rising fifths and rising steps follow.",
           "Falling thirds outnumber rising thirds by about two to one; falling steps are half as common as rising ones.",
           "Rising thirds and falling steps are the rarer motions:", ""]
    for k in ("up a third", "down a step"):
        md += [f"- *{k}*: " + "; ".join(root_ex[k])]
    st = sum(sev.values())
    md += ["", "## 2. The seventh (essential dissonance)", "", f"Sevenths of seventh chords on the beat ({st}):", ""]
    for k, n in sev.most_common():
        md += [f"- {k}: {n} ({pct(n, st)}). E.g. " + "; ".join(sev_ex[k][:2])]
    md += ["", "Most sevenths are prepared and resolve down as the harmony moves (the strict treatment).",
           "A smaller share enters free and resolves; these are the free style's sevenths, to be compared with Kirnberger.",
           "Those that do not resolve down by step need looking at, one by one.", ""]
    ss = sum(susp.values())
    md += ["## 3. Suspensions on the beat", "", f"Upper-voice suspensions on the beat ({ss}), by the interval of the suspended note over the bass:", ""]
    for k, n in susp.most_common():
        md += [f"- {k}: {n} ({pct(n, ss)}). E.g. " + "; ".join(susp_ex[k][:2])]
    md += ["", f"Suspensions in the bass itself (the bass held into a new harmony and falling): {bass_susp[1]}.", ""]
    md += ["## 4. Where the incidental notes are", "", "| kind | soprano | alto | tenor | bass |", "|---|---|---|---|---|"]
    for lab in ("passing", "suspension", "neighbour", "anticipation", "retardation", "appoggiatura", "escape", "free"):
        md.append(f"| {lab} | " + " | ".join(str(nct_voice[(lab, v)]) for v in ("soprano", "alto", "tenor", "bass")) + " |")
    md += ["", "Passing notes are commonest in the bass and tenor; suspensions belong to the alto and tenor (almost",
           f"never the bass); the anticipation is the soprano's ({ant_near} of its {ant_tot} fall in the half bar before a fermata).",
           "The soprano, the given melody, carries the fewest passing notes and suspensions.", ""]
    md += ["## 5. The leading tone", "", "The third of a dominant moving to its tonic (root down a fifth):", "",
           "| voice | rises to the root | falls to the fifth | other |", "|---|---|---|---|"]
    for v in ("soprano", "alto", "tenor"):
        md.append(f"| {v} | {lt[(v, 'rises')]} | {lt[(v, 'falls to the fifth')]} | {lt[(v, 'other')]} |")
    md += ["", "In the soprano the leading tone rises; in the inner voices, and in the alto above all, Bach lets it",
           "fall to the fifth of the tonic, to complete the chord. Examples of the alto falling: " + "; ".join(lt_ex["alto"]), ""]
    ct = sum(cad.values())
    md += ["## 6. Cadences", "", f"At the soprano's fermatas ({ct}):", ""]
    for k, n in cad.most_common():
        md += [f"- {k}: {n} ({pct(n, ct)}). E.g. " + "; ".join(cad_ex[k][:2])]
    pt = sum(picardy.values())
    md += ["", f"The last chord of a chorale in a minor or modal key has a major third in {picardy['major third']} of {pt} ({pct(picardy['major third'], pt)}).", ""]
    md += ["## 7. Consecutive fifths and octaves", "",
           f"Inside a phrase, between two moving voices: {len(par_in)} in 370 chorales, almost all through a passing note off the beat:", ""]
    md += [f"- {x}" for x in par_in]
    md += ["", "## 8. The lines", "",
           f"No augmented second in any voice ({aug2} in all). Diminished fourths and fifths belong to the tenor and bass;",
           "the soprano and alto move by step above all (see `BACH-COUNTS.md`, melodic intervals). Soprano and alto are more",
           "than an octave apart on 0.4% of the beats, alto and tenor on 1.0% (`BACH-COUNTS.md`, spacing).", "",
           "## To decide", "",
           "1. Which of these become precepts of the game (the error the player is told of), which become",
           "   guidance (warnings, the tutor's advice), and which stay knowledge (the Lectio).",
           "2. Where Bach and Kittel differ (KITTEL-BACH.md), Bach decides (C1): which of Kittel's habits",
           "   to keep as alternatives the game accepts.",
           "3. Each category against Kirnberger's text, when it can be read."]
    OUT.write_text("\n".join(md) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
