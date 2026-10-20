"""P44: the practice analysis of Contrapunctus XIV for four hands (data/aotf/cp14.json ->
data/aotf/cp14-analysis.json): subject entries (I, II, III = B-A-C-H; prime and inverted), the hands'
encounters (one voice per hand: primo RH soprano, primo LH alto, secondo RH tenor, secondo LH bass),
a suggested fingering for each hand's line, editorial articulation and a dynamics plan.
Everything here is computed and editorial: the source has no fingering, articulation or dynamics.
Usage: python3 tools/aotf/analyse_cp14.py"""
import json, re

D = json.load(open("data/aotf/cp14.json"))
V = D["voices"]  # S A T B, notes [onset, length, pitch] in 32nds
BAR = 32
NAMES = "SATB"
STEPS = {"C": 0, "D": 1, "E": 2, "F": 3, "G": 4, "A": 5, "B": 6}
SEMI = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

def parse(p):
    m = re.match(r"([A-G])(#|b|##|bb)?(-?\d+)", p)
    acc = {None: 0, "#": 1, "b": -1, "##": 2, "bb": -2}[m.group(2)]
    o = int(m.group(3))
    return SEMI[m.group(1)] + acc + 12 * (o + 1), STEPS[m.group(1)] + 7 * o

MIDI = [[parse(n[2])[0] for n in v] for v in V]
DIA = [[parse(n[2])[1] for n in v] for v in V]

def where(at):
    """Bar (1-based) and beat (1-based, halves of beats as .5) of an onset."""
    return at // BAR + 1, (at % BAR) / 8 + 1

def contiguous(v, i, j):
    return all(V[v][k][0] + V[v][k][1] == V[v][k + 1][0] for k in range(i, j))

# ---- Subject entries.
entries = []
for v in range(4):
    n = V[v]
    for i in range(len(n)):
        # I: a head, then 3:1 (dotted half, quarter) and three wholes; steps from the third note -1 +1 +1.
        durs = [n[i + k][1] for k in range(1, 6) if i + k < len(n)]
        if i + 6 < len(n) and durs == [24, 8, 32, 32, 32] and contiguous(v, i, i + 6) and n[i][1] >= 8:
            st = [DIA[v][i + k + 1] - DIA[v][i + k] for k in range(2, 5)]
            if st == [-1, 1, 1]:
                entries.append({"subject": "I", "form": "prime", "voice": v, "from": i, "to": i + 6})
            elif st == [1, -1, -1]:
                entries.append({"subject": "I", "form": "inverted", "voice": v, "from": i, "to": i + 6})
        # II: running sixteenths, steps from the third note +1 +1 -1 -1 +2 -1.
        if i + 8 < len(n) and all(n[i + k][1] == 4 for k in range(9)) and contiguous(v, i, i + 8):
            st = [DIA[v][i + k + 1] - DIA[v][i + k] for k in range(2, 8)]
            form = "prime" if st == [1, 1, -1, -1, 2, -1] else "inverted" if st == [-1, -1, 1, 1, -2, 1] else None
            if form and not any(e["subject"] == "II" and e["voice"] == v and e["to"] >= i for e in entries):
                j = i
                while j + 1 < len(n) and n[j + 1][1] <= 4 and contiguous(v, j, j + 1) and n[j + 1][0] < n[i][0] + 2 * BAR:
                    j += 1
                entries.append({"subject": "II", "form": form, "voice": v, "from": i, "to": j})
        # III: B-A-C-H, three equal notes and a fourth at least as long as a quarter, semitones -1 +3 -1.
        if i + 3 < len(n) and len({n[i + k][1] for k in range(3)}) == 1 and n[i][1] >= 8 and n[i + 3][1] >= 8 and contiguous(v, i, i + 3):
            se = [MIDI[v][i + k + 1] - MIDI[v][i + k] for k in range(3)]
            if se in ([-1, 3, -1], [1, -3, 1]):
                entries.append({"subject": "III", "form": "prime" if se[0] == -1 else "inverted", "voice": v, "from": i, "to": i + 3})
for e in entries:
    n = V[e["voice"]]
    e["at"], e["end"] = n[e["from"]][0], n[e["to"]][0] + n[e["to"]][1]
    e["bar"], e["beat"] = where(e["at"])
    e["notes"] = [n[k][2] for k in range(e["from"], e["to"] + 1)]
entries.sort(key=lambda e: (e["at"], e["voice"]))

# ---- Encounters between the hands: at every onset, pairs of neighbouring hands.
times = sorted({x[0] for v in V for x in v})
def sounding(v, t):
    for k, x in enumerate(V[v]):
        if x[0] <= t < x[0] + x[1]:
            return k
    return None
PAIRS = [(1, 2, "between", "primo LH (alto) and secondo RH (tenor)"), (0, 1, "primo", "the primo's hands (soprano and alto)"), (2, 3, "secondo", "the secondo's hands (tenor and bass)")]
raw = []
for t in times:
    idx = [sounding(v, t) for v in range(4)]
    for hi, lo, kind, _ in PAIRS:
        if idx[hi] is None or idx[lo] is None:
            continue
        gap = MIDI[hi][idx[hi]] - MIDI[lo][idx[lo]]
        if gap <= 2:
            what = "cross" if gap < 0 else "unison" if gap == 0 else "second"
            raw.append({"t": t, "kind": kind, "what": what, "gap": gap, "hi": hi, "lo": lo})
# Group into passages: same pair, onsets within two beats of each other.
encounters = []
for r in raw:
    last = next((g for g in reversed(encounters) if g["kind"] == r["kind"]), None)
    if last and r["t"] - last["end"] <= 16:
        last["end"] = r["t"]
        last["whats"].add(r["what"])
        last["min"] = min(last["min"], r["gap"])
    else:
        encounters.append({"kind": r["kind"], "start": r["t"], "end": r["t"], "whats": {r["what"]}, "min": r["gap"], "hi": r["hi"], "lo": r["lo"]})
for g in encounters:
    g["bar"], g["beat"] = where(g["start"])
    g["toBar"] = where(g["end"])[0]
    g["whats"] = sorted(g["whats"], key=["cross", "unison", "second"].index)
    worst = g["whats"][0]
    hi, lo = NAMES[g["hi"]], NAMES[g["lo"]]
    if g["kind"] == "between":
        g["advice"] = {
            "cross": f"The alto goes below the tenor (by up to {-g['min']} semitones): the hands interlock. Decide who plays nearer the fallboard (usually the hand holding the longer notes) and keep the other hand's fingers flat and forward.",
            "unison": "Alto and tenor meet on the same key: whoever holds the note lets the other strike it (the voice with the subject keeps it); release just before, without a gap in the line you keep.",
            "second": "Alto and tenor a second apart: thumbs collide. Primo LH plays a little further into the keys, secondo RH nearer the edge, or the reverse, agreed in advance.",
        }[worst]
    elif g["kind"] == "primo":
        g["advice"] = {"cross": "Soprano below alto: the primo's hands cross; the hand with the subject stays on top.", "unison": "Soprano and alto on one key: one hand yields the note to the other.", "second": "Soprano and alto a second apart: the primo's thumbs meet; one plays further into the keys."}[worst]
    else:
        g["advice"] = {"cross": "Tenor below bass: the secondo's hands cross; the hand with the subject stays on top.", "unison": "Tenor and bass on one key: one hand yields the note to the other.", "second": "Tenor and bass a second apart: the secondo's thumbs meet; one plays further into the keys."}[worst]
    del g["hi"], g["lo"]

# ---- Fingering: one line per hand, dynamic programming over the fingers (a simplified form of the
# span rules of Parncutt, Sloboda, Clarke, Raekallio & Desain, Music Perception 14/4, 1997).
SPANS = {  # finger pair (lower, higher): min practicable, min comfortable, min relaxed, max relaxed, max comfortable, max practicable (semitones, right hand)
    (1, 2): (-5, -3, 1, 5, 8, 10), (1, 3): (-4, -2, 3, 7, 10, 12), (1, 4): (-3, -1, 5, 9, 12, 14), (1, 5): (-1, 1, 7, 10, 13, 15),
    (2, 3): (1, 1, 1, 2, 3, 5), (2, 4): (1, 1, 3, 4, 5, 7), (2, 5): (2, 2, 5, 6, 8, 10), (3, 4): (1, 1, 1, 2, 2, 4), (3, 5): (1, 1, 3, 4, 5, 7), (4, 5): (1, 1, 1, 2, 3, 5),
}
BLACK = {1, 3, 6, 8, 10}
def step_cost(m1, f1, m2, f2, right):
    d = m2 - m1 if right else m1 - m2  # toward the little finger is positive
    if f1 == f2:
        return 0.5 if d == 0 else 30  # a new key with the same finger breaks the legato
    lo, hi = sorted((f1, f2))
    span = d if f1 < f2 else -d
    mnp, mnc, mnr, mxr, mxc, mxp = SPANS[(lo, hi)]
    c = 0.0
    if span > mxp or span < mnp:
        c += 40
    if span > mxc:
        c += 2 * (span - mxc)
    elif span > mxr:
        c += span - mxr
    if span < mnc:
        c += 2 * (mnc - span)
    elif span < mnr:
        c += mnr - span
    if 1 in (f1, f2) and span < 0:
        c += 1  # thumb passing under or a finger crossing over
        if m2 % 12 in BLACK and f2 == 1:
            c += 2
    if f2 == 1 and m2 % 12 in BLACK:
        c += 2.5
    if f2 == 5 and m2 % 12 in BLACK:
        c += 1
    if {f1, f2} == {3, 4}:
        c += 1
    if {f1, f2} == {4, 5} and d != 0:
        c += 0.5
    if d == 0:
        c += 1  # a repeated note: change finger
    return c

def finger_line(v, right):
    n, m = V[v], MIDI[v]
    out = [0] * len(n)
    start = 0
    while start < len(n):
        end = start
        while end + 1 < len(n) and n[end][0] + n[end][1] == n[end + 1][0]:
            end += 1
        # one phrase between rests
        cost = [{f: (0.0, None) for f in range(1, 6)}]
        for k in range(start + 1, end + 1):
            row = {}
            for f2 in range(1, 6):
                best = min(((cost[-1][f1][0] + step_cost(m[k - 1], f1, m[k], f2, right), f1) for f1 in range(1, 6)))
                row[f2] = best
            cost.append(row)
        f = min(range(1, 6), key=lambda x: cost[-1][x][0])
        for k in range(end, start - 1, -1):
            out[k] = f
            f = cost[k - start][f][1]
        start = end + 1
    return out
fingers = [finger_line(0, True), finger_line(1, False), finger_line(2, True), finger_line(3, False)]
# Which fingerings to print when only the useful ones are shown: after a rest, at a thumb passing
# or a crossing, at a stretch beyond the relaxed span, and at a thumb on a black key.
def show(v, k, right):
    n, m, f = V[v], MIDI[v], fingers[v]
    if k == 0 or n[k - 1][0] + n[k - 1][1] != n[k][0]:
        return True
    d = m[k] - m[k - 1] if right else m[k - 1] - m[k]
    f1, f2 = f[k - 1], f[k]
    if f1 == f2:
        return d != 0
    lo, hi = sorted((f1, f2))
    span = d if f1 < f2 else -d
    if span < 0 or span > SPANS[(lo, hi)][3] or span < SPANS[(lo, hi)][2]:
        return True
    return f2 == 1 and m[k] % 12 in BLACK
key_fingers = [[show(v, k, v % 2 == 0) for k in range(len(V[v]))] for v in range(4)]

# ---- Articulation (editorial): the default is legato; marks only where the line asks for one.
# "." detached (not short: about three quarters of the value) before a leap of a fourth or more and
# on the first of two repeated notes; "-" leaned on: a suspension (a note held over the beat that
# becomes a second, seventh or ninth against another voice, then falls by step).
artic = [[None] * len(v) for v in V]
for v in range(4):
    n, m, dia = V[v], MIDI[v], DIA[v]
    for k in range(len(n) - 1):
        joined = n[k][0] + n[k][1] == n[k + 1][0]
        if not joined:
            continue
        if m[k + 1] == m[k]:
            artic[v][k] = "."
        elif abs(dia[k + 1] - dia[k]) >= 3 and n[k][1] <= 16:
            artic[v][k] = "."
    for k in range(len(n) - 1):
        x = n[k]
        if x[1] < 8 or not (1 <= m[k] - m[k + 1] <= 2) or n[k + 1][0] != x[0] + x[1]:
            continue
        # a beat inside the note where another voice strikes and makes a dissonance with it
        for t in range(x[0] + 8 - x[0] % 8, x[0] + x[1], 8):
            for w in range(4):
                if w == v:
                    continue
                j = next((j for j, y in enumerate(V[w]) if y[0] == t), None)
                if j is not None and (abs(m[k] - MIDI[w][j]) % 12) in (1, 2, 10, 11):
                    artic[v][k] = "-"
            if artic[v][k] == "-":
                break

# ---- Dynamics plan (editorial): sections from the entries, levels from the texture.
first = {s: min((e["at"] for e in entries if e["subject"] == s), default=None) for s in ("I", "II", "III")}
def voices_at(t):
    return sum(sounding(v, t) is not None for v in range(4))
sections = [
    {"from": 0, "title": "First fugue: subject I", "text": "A ricercar in long notes. Begin quietly and let each entry add a voice; the subject is the line to hear, the others accompany it."},
]
if first["II"] is not None:
    sections.append({"from": first["II"] // BAR * BAR, "title": "Second fugue: subject II", "text": "Running quavers and semiquavers: lighter, more speaking. Keep the semiquavers even and legato in small groups; do not let them cover the longer notes."})
I_with_II = [e for e in entries if e["subject"] == "I" and first["II"] is not None and e["at"] > first["II"]]
if I_with_II:
    sections.append({"from": I_with_II[0]["at"] // BAR * BAR, "title": "Subjects I and II together", "text": "The first subject returns against the second: two characters at once. Give subject I its weight and length while II keeps moving."})
if first["III"] is not None:
    sections.append({"from": first["III"] // BAR * BAR, "title": "Third fugue: B-A-C-H", "text": "The composer's name in notes (B flat, A, C, B natural). A new, chromatic colour: more inward, never forced."})
I_with_III = [e for e in entries if e["subject"] == "I" and first["III"] is not None and e["at"] > first["III"]]
if I_with_III:
    sections.append({"from": I_with_III[0]["at"] // BAR * BAR, "title": "All three subjects", "text": "The three subjects sound together for the first time; then the manuscript breaks off. Voice it so that all three are heard; how to end a performance (stop in silence, or close another way) is the players' decision."})
sections.sort(key=lambda s: s["from"])
for s in sections:
    s["bar"] = s["from"] // BAR + 1
dyn = []
level = {1: "p", 2: "p", 3: "mp", 4: "mf"}
prev = None
for bar in range(D["bars"]):
    t = bar * BAR
    k = max(voices_at(t + x) for x in (0, 8, 16, 24))
    lv = level[max(1, k)]
    if lv != prev:
        dyn.append({"bar": bar + 1, "level": lv, "voices": k})
        prev = lv

out = {
    "entries": entries,
    "encounters": encounters,
    "fingers": fingers,
    "keyFingers": key_fingers,
    "artic": artic,
    "sections": sections,
    "dynamics": dyn,
}
json.dump(out, open("data/aotf/cp14-analysis.json", "w"), separators=(",", ":"))
from collections import Counter
print("entries:", Counter((e["subject"], e["form"]) for e in entries))
for e in entries:
    print(f'  {e["subject"]:>3} {e["form"]:<8} {NAMES[e["voice"]]} bar {e["bar"]} beat {e["beat"]:.2g}: {" ".join(e["notes"][:8])}')
print("encounters:", Counter((g["kind"], g["whats"][0]) for g in encounters), len(encounters))
print("sections:", [(s["bar"], s["title"]) for s in sections])
print("dynamics changes:", len(dyn))
print("articulation:", Counter(a for v in artic for a in v))
print("fingers shown:", sum(sum(x) for x in key_fingers), "of", sum(len(v) for v in V))
