"""
Fugue expositions from the Well-Tempered Clavier (D119): the subject (dux), the answer (comes) and
the countersubject, read from the ASAP dataset's MusicXML scores (Foscarin, McLeod, Rigaux,
Jacquemard, Sakai 2020, CC BY-NC-SA 4.0). Usage:

  python3 tools/wtc-extract.py <ASAP>/Bach/Fugue data/bach/wtc/fugues.json

The encodings' voice numbers are not reliable (a subject may be split between two of them), so the
lines are found from the notes alone: the exposition is one line until the answer enters (two
notes sound at once), two lines until the third entry (three at once), separated by register. The
answer is the line that repeats the subject's rhythm; the subject lasts as long as it does so at a
fixed transposition (a fifth up or a fourth down), but for the tonal answer's mutations (a step of
one or two semitones off the transposition, which the following notes correct). Overrides
(SUBJECT_NOTES) fix the length where the rhythm runs on past the subject's end. Fails loudly.
"""
import json, sys, os
from fractions import Fraction as F
from music21 import converter, chord, meter, key as m21key

ROOT, OUT = sys.argv[1], sys.argv[2]
KEYS = ["C", "c", "C#", "c#", "D", "d", "Eb", "d#", "E", "e", "F", "f", "F#", "f#", "G", "g", "Ab", "g#", "A", "a", "Bb", "bb", "B", "b"]
SUBJECT_NOTES = {}  # id -> number of notes in the subject, where the rhythm runs on

def info(bwv):
    if 846 <= bwv <= 869: return 1, bwv - 845, KEYS[bwv - 846]
    return 2, bwv - 869, KEYS[bwv - 870]

def pname(p):
    return p.step + {0: "", 1: "#", 2: "##", -1: "b", -2: "bb"}[int(p.alter)] + str(p.octave)

def pool(score):
    raw = []
    for part in score.parts:
        for n in part.recurse().notes:
            on = F(n.getOffsetInHierarchy(part)).limit_denominator(96)
            d = F(n.quarterLength).limit_denominator(96)
            if d == 0: continue
            ps = n.pitches if isinstance(n, chord.Chord) else [n.pitch]
            for p in ps:
                raw.append({"on": on, "dur": d, "p": p, "midi": int(round(p.ps)), "tie": n.tie.type if n.tie else None})
    raw.sort(key=lambda x: (x["on"], x["midi"]))
    out = []
    for n in raw:
        if n["tie"] in ("stop", "continue"):
            prev = next((m for m in reversed(out) if m["midi"] == n["midi"] and m["on"] + m["dur"] == n["on"]), None)
            if prev: prev["dur"] += n["dur"]; continue
        out.append(dict(n))
    return clean(out)

def clean(ns):
    """Written-out trills and turns encoded beside their main note (an ossia): the short notes go,
    the main note stays. A run of three or more notes of a quaver or less, within a tone of a longer
    note they overlap; or a note starting inside a longer note's span, within a tone, ending with it."""
    drop = set()
    for L in ns:
        if L["dur"] < F(3, 8): continue
        end = L["on"] + L["dur"]
        short = [i for i, n in enumerate(ns) if n is not L and n["dur"] <= F(1, 8) and L["on"] <= n["on"] < end and abs(n["midi"] - L["midi"]) <= 2]
        if len(short) >= 3: drop.update(short)
        inside = [i for i, n in enumerate(ns) if n is not L and L["on"] < n["on"] < end and n["on"] + n["dur"] <= end and abs(n["midi"] - L["midi"]) <= 2 and n["dur"] < L["dur"]]
        if any(ns[i]["dur"] <= F(1, 8) and ns[i]["midi"] != L["midi"] for i in inside): drop.update(inside)
    return [n for i, n in enumerate(ns) if i not in drop]

def sounding(ns, t):
    return [n for n in ns if n["on"] <= t < n["on"] + n["dur"]]

def frac(x): return f"{x.numerator}/{x.denominator}"

results, problems = [], []
full = {}
for d in sorted(os.listdir(ROOT)):
    if not d.startswith("bwv_"): continue
    bwv = int(d[4:]); book, num, kname = info(bwv); fid = f"wtc{book}.{num:02d}"
    sc = converter.parse(os.path.join(ROOT, d, "xml_score.musicxml"))
    ts = sc.recurse().getElementsByClass(meter.TimeSignature).first()
    ns = pool(sc)
    # Metre: the bar in quarters, and where the subject starts within its bar (a pickup bar counts).
    m0 = sc.parts[0].getElementsByClass("Measure").first()
    pad = F(m0.paddingLeft).limit_denominator(96)
    barq = F(ts.barDuration.quarterLength).limit_denominator(96)
    onsets = sorted({n["on"] for n in ns})
    t1 = onsets[0]
    t2 = next(t for t in onsets if len(sounding(ns, t)) >= 2)
    t3 = next((t for t in onsets if len(sounding(ns, t)) >= 3), None)
    # Two lines in [t1, t3): upper and lower by register.
    def split(long_up):
        lines = {"u": [], "l": []}
        span = [n for n in ns if n["on"] < (t3 if t3 is not None else n["on"] + 1)]
        for n in span:
            if n["on"] < t2:
                lines["u"].append(n); continue
            together = sorted([m for m in span if m["on"] == n["on"]], key=lambda m: (-m["midi"], -m["dur"] if long_up else m["dur"]))
            if len(together) == 2:
                lines["u" if together[0] is n else "l"].append(n); continue
            others = [m for m in sounding(ns, n["on"]) if m is not n and m["on"] < (t3 or 10**9)]
            if others:
                o = others[0]
                side = "u" if (n["midi"] > o["midi"] or (n["midi"] == o["midi"] and o in lines["l"])) else "l"
            else:
                lu = lines["u"][-1]["midi"] if lines["u"] else 999
                ll = lines["l"][-1]["midi"] if lines["l"] else -999
                side = "u" if abs(n["midi"] - lu) <= abs(n["midi"] - ll) else "l"
            lines[side].append(n)
        return lines
    # Which line after t2 is the comes: the one that repeats the subject's opening longest.
    dux0 = [n for n in ns if n["on"] < t2]
    def prefix(dux, comes):
        k = 0
        while k < min(len(dux), len(comes)):
            a, b = dux[k], comes[k]
            if a["on"] - t1 != b["on"] - t2: break
            k += 1
            if a["dur"] != b["dur"]: break
        return k
    best = None
    for lines, (duxside, comesside) in [(split(lu), sides) for lu in (True, False) for sides in (("l", "u"), ("u", "l"))]:
        dx = dux0 + [n for n in lines[duxside] if n["on"] >= t2]
        cm = [n for n in lines[comesside] if n["on"] >= t2]
        dx.sort(key=lambda n: n["on"]); cm.sort(key=lambda n: n["on"])
        if not cm or cm[0]["on"] != t2: continue
        k0 = prefix(dx, cm)
        if best is None or k0 > best[0]: best = (k0, dx, cm, comesside == "u")
    _, dux, comes, above = best
    dux.sort(key=lambda n: n["on"]); comes.sort(key=lambda n: n["on"])
    # The subject: the comes repeats the dux's rhythm at a fixed transposition (mutations aside).
    k = 0; shifts = []
    limit = SUBJECT_NOTES.get(fid, 10**9)
    while k < min(len(dux), len(comes), limit):
        a, b = dux[k], comes[k]
        if a["on"] - t1 != b["on"] - t2: break
        shifts.append(b["midi"] - a["midi"]); k += 1
        if a["dur"] != b["dur"]: break
    common = max(set(shifts), key=shifts.count) if shifts else 0
    # Trim a tail that has left the transposition (the rhythm ran on into free counterpoint).
    while shifts and shifts[-1] != common and k > 5:
        shifts.pop(); k -= 1
    # The head may be mutated (the tonal answer); a later departure ends the subject.
    late = [i for i, x in enumerate(shifts[:k]) if x != common and i > 4]
    if late: k = late[0]
    subject, answer = dux[:k], comes[:k]
    muts = [i for i, s in enumerate(shifts[:k]) if s != common]
    end = answer[-1]["on"] + answer[-1]["dur"] if answer else t2
    cs = [n for n in dux[k:] if n["on"] < end]
    rec = {
        "id": fid, "bwv": bwv, "book": book, "number": num, "key": kname,
        "time": ts.ratioString if ts else None,
        "startAt": frac(t1), "barQuarters": frac(barq), "phase": frac((t1 + pad) % barq), "answerAt": frac(t2 - t1), "thirdAt": frac(t3 - t1) if t3 is not None else None,
        "answerAbove": above, "answerShift": common, "mutations": muts,
        "subject": [{"pitch": pname(x["p"]), "at": frac(x["on"] - t1), "dur": frac(x["dur"])} for x in subject],
        "answer": [{"pitch": pname(x["p"]), "at": frac(x["on"] - t2), "dur": frac(x["dur"])} for x in answer],
        "countersubject": [{"pitch": pname(x["p"]), "at": frac(x["on"] - t2), "dur": frac(x["dur"])} for x in cs],
    }
    # Every note of the fugue (D121), for listening and for finding the subject's entries:
    # [MIDI, onset, length] in 96ths of a quarter from the start of the first full bar.
    full[fid] = [[n["midi"], int(round((n["on"] + pad) * 96)), int(round(n["dur"] * 96))] for n in ns]
    if common % 12 not in (5, 7) or [m for m in muts if m > 4] or k < 4: problems.append(f"{fid} shift {common} muts {muts} k {k}")
    results.append(rec)

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
json.dump({"source": "ASAP dataset (Foscarin, McLeod, Rigaux, Jacquemard, Sakai 2020), CC BY-NC-SA 4.0", "fugues": results}, open(OUT, "w"), indent=1, ensure_ascii=False)
FULL = os.path.join(os.path.dirname(OUT), "fugues-full.json")
with open(FULL, "w") as fh:
    fh.write('{"source": "ASAP dataset (Foscarin et al. 2020), CC BY-NC-SA 4.0", "unit": "1/96 quarter", "notes": {\n')
    fh.write(",\n".join(f'"{k}": {json.dumps(v, separators=(",", ":"))}' for k, v in full.items()))
    fh.write("\n}}\n")
for r in results:
    print(r["id"], r["key"], r["time"], "ans@", r["answerAt"], "3rd@", r["thirdAt"], "above" if r["answerAbove"] else "below", "shift", r["answerShift"], "mut", r["mutations"])
    print("  S:", " ".join(f"{x['pitch']}:{x['dur']}" for x in r["subject"]))
    print("  A:", " ".join(f"{x['pitch']}:{x['dur']}" for x in r["answer"]))
    print("  CS:", " ".join(f"{x['pitch']}:{x['dur']}" for x in r["countersubject"]))
print("PROBLEMS", problems)
