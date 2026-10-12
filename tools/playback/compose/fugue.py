"""P29: a short three-voice fugue in D minor (original), for the owner's test page.

Composed here: the subject, its tonal answer, a countersubject, the episodes' motifs and the final
cadence. The free voices (quarter notes) are found by a search over each passage under the rules of
counterpoint: on every beat each note consonant with the lowest voice (no fourth above the bass) and
with the other voices (no second, seventh or tritone), a dissonance off the beat only as a passing
note of a moving voice; no consecutive fifths or octaves between any two voices on the quaver grid;
no augmented second or tritone in a line; ranges kept. check() re-reads the whole fugue.

Usage: python3 tools/playback/compose/fugue.py
"""
import itertools, json, os, re

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def midi(p):
    m = re.match(r"([A-G])([#b]*)(-?\d+)$", p)
    return 12 * (int(m.group(3)) + 1) + PC[m.group(1)] + m.group(2).count("#") - m.group(2).count("b")
SPELL = {0: "C", 1: "C#", 2: "D", 3: "Eb", 4: "E", 5: "F", 6: "F#", 7: "G", 8: "G#", 9: "A", 10: "Bb", 11: "B"}
def name(m):
    return f"{SPELL[m % 12]}{m // 12 - 1}"

BARS = 16
E = 8 * BARS  # quavers
def line(spec):
    """'D4:2 A4:2 F4 G4 ...' (lengths in quavers, 1 by default; 'r' a rest) -> pitches per quaver (None: rest)."""
    out = []
    for tok in spec.split():
        p, _, n = tok.partition(":")
        out += [None if p == "r" else midi(p)] * int(n or 1)
    return out
def place(grid, start_bar, seq):
    for i, x in enumerate(seq):
        grid[(start_bar - 1) * 8 + i] = x
    return grid

SUBJECT = "D4:2 A4:2 F4 G4 A4 F4 Bb4:2 A4 G4 F4 E4 D4:2"
ANSWER = "A4:2 D5:2 C5 D5 E5 C5 F5:2 E5 D5 C5 B4 A4:2"
CS = "F4:2 E4:2 D4 E4 F4 D4 G4:2 F4 E4 A4:2 F4:2"
CS_ANSWER = "C4:2 B3:2 A3 B3 C4 A3 D4:2 C4 B3 E4:2 C4:2"
def shift(spec, semis):
    return " ".join(("r" if t.split(":")[0] == "r" else name(midi(t.split(":")[0]) + semis)) + (":" + t.split(":")[1] if ":" in t else "") for t in spec.split())

S, A, B = [None] * E, [None] * E, [None] * E
# Exposition
place(A, 1, line(SUBJECT))
place(S, 3, line(ANSWER)); place(A, 3, line(CS_ANSWER))
place(B, 5, line(shift(SUBJECT, -12))); place(A, 5, line(CS))
# Episode 1 (bars 7-8): the subject's tail in sequence in the soprano, the bass by fifths (Gm C | F C)
place(S, 7, line("Bb4 A4 G4 F4 E4:2 G4:2 A4 G4 F4 E4 E4:2 G4:2"))
place(B, 7, line("G2:4 C3:4 F3:4 C3:4"))
# Middle entry in F (soprano), bars 9-10
# (the subject in the relative major, by the scale: D-A-F-G-A-F | Bb-A-G-F-E-D becomes F-C-A-Bb-C-A | D-C-Bb-A-G-F)
place(S, 9, line("F4:2 C5:2 A4 Bb4 C5 A4 D5:2 C5 Bb4 A4 G4 F4:2"))
# Episode 2 (bars 11-12): the tail in the alto, back to D minor, ending on A
place(A, 11, line("D4 C4 Bb3 A3 G3:2 Bb3:2 C4 Bb3 A3 G3 A3:2 E4:2"))
# Final entry in the bass (bars 13-14), the countersubject in the alto
place(B, 13, line(shift(SUBJECT, -12))); place(A, 13, line(CS))
# Cadence (bars 15-16): Gm6 - G - A | D major
place(S, 15, line("D5:2 E5:2 C#5:4 D5:8"))
place(B, 15, line("Bb2:2 G2:2 A2:4 D3:8"))

RANGES = {"S": range(62, 81), "A": range(55, 75), "B": range(38, 62)}
SCALES = {  # pitch classes allowed for free voices, by bar
    **{b: {2, 4, 5, 7, 9, 10, 0, 1} for b in (1, 2, 5, 6, 12, 13, 14, 15, 16)},
    **{b: {9, 11, 0, 2, 4, 5, 7, 8} for b in (3, 4)},
    **{b: {5, 7, 9, 10, 0, 2, 4} for b in (7, 8, 9, 10, 11)},
    16: {2, 6, 9},  # the final D-major chord (the Picardy third)
}
CONS_BASS = {0, 3, 4, 7, 8, 9}
CONS_UP = {0, 3, 4, 5, 7, 8, 9}
PERF = {0, 7}

def sounding(grids, q):
    return [g[q] for g in grids if g[q] is not None]

def consonant(notes):
    if len(notes) < 2:
        return True
    lo = min(notes)
    # no augmented triad (a major third and a minor sixth over the bass at once)
    rel = {(x - lo) % 12 for x in notes}
    if {4, 8} <= rel:
        return False
    for x in notes:
        if x != lo and (x - lo) % 12 not in CONS_BASS:
            return False
    for x, y in itertools.combinations(notes, 2):
        if x != lo and y != lo and abs(x - y) % 12 not in CONS_UP:
            return False
    return True

def passing(g, q):
    """The note at quaver q of line g is a passing or neighbour note (by step in and out)."""
    if q == 0 or q + 1 >= len(g) or None in (g[q - 1], g[q], g[q + 1]):
        return False
    return g[q - 1] != g[q] and 1 <= abs(g[q] - g[q - 1]) <= 2 and 1 <= abs(g[q + 1] - g[q]) <= 2

def fill(free, fixed, bars, ranges, last=None):
    """Quarter notes for the free lines over bars (inclusive), jointly, by dynamic programming."""
    beats = [(b - 1) * 8 + 2 * k for b in range(bars[0], bars[1] + 1) for k in range(4)]
    def options(q):
        bar = q // 8 + 1
        sc = SCALES[bar]
        return [[m for m in ranges[i] if m % 12 in sc] for i in range(len(free))]
    def ok_at(q, chosen):
        grids = fixed + [[None] * E for _ in chosen]
        for qq in (q, q + 1):
            notes = [g[qq] for g in fixed if g[qq] is not None] + list(chosen)
            if qq == q:
                if not consonant(notes):
                    return False
            else:
                # off the beat: a fixed voice's dissonance must be a passing note
                others = [g for g in fixed if g[qq] is not None]
                for g in others:
                    for c in chosen:
                        pair = sorted([g[qq], c])
                        lo = min(notes)
                        bad = (pair[0] == lo and (pair[1] - lo) % 12 not in CONS_BASS) or (pair[0] != lo and (pair[1] - pair[0]) % 12 not in CONS_UP)
                        if bad and not passing(g, qq):
                            return False
        # free voices: order and spacing
        allv = list(chosen)
        for x, y in zip(allv, allv[1:]):
            if x < y or x - y > 14:
                return False
        return True
    def trans_ok(qp, prev, q, cur):
        for a, b in zip(prev, cur):
            if a % 12 == 1 and b != a and b != a + 1:
                return False
            d = abs(a - b)
            if d in (6, 10, 11) or d > 12:
                return False
            if d == 3 and {a % 12, b % 12} in ({10, 1}, {5, 8}, {0, 3}):
                return False
        # consecutive perfect intervals on the quaver grid, every pair (free-free and free-fixed)
        for qq in (q - 1, q):
            for i, c in enumerate(cur):
                c0 = prev[i] if qq == q else cur[i]
                c1 = cur[i]
                for g in fixed:
                    a0, a1 = g[qq - 1] if qq - 1 >= 0 else None, g[qq]
                    if a0 is None or a1 is None:
                        continue
                    p0 = (prev[i] if qq == q else cur[i]) if qq - 1 < q else cur[i]
                    if qq == q:
                        x0, x1 = prev[i], cur[i]
                    else:
                        x0, x1 = cur[i], cur[i]
                    if x0 == x1 or a0 == a1:
                        continue
                    i0, i1 = abs(x0 - a0) % 12, abs(x1 - a1) % 12
                    if i0 in PERF and i0 == i1:
                        return False
        for i, j in itertools.combinations(range(len(cur)), 2):
            if prev[i] != cur[i] and prev[j] != cur[j]:
                i0, i1 = abs(prev[i] - prev[j]) % 12, abs(cur[i] - cur[j]) % 12
                if i0 in PERF and i0 == i1:
                    return False
        return True
    layers = []
    for q in beats:
        opts = [c for c in itertools.product(*options(q)) if ok_at(q, c)]
        if q == beats[-1] and last:
            opts = [c for c in opts if all(l is None or x == l for x, l in zip(c, last))]
        layers.append(opts)
    INF = float("inf")
    # the free voices' notes just before the passage, if any: the first beat must follow them
    before = tuple(g[beats[0] - 1] for g in free) if beats[0] > 0 else None
    first = layers[0]
    if before and None not in before:
        first = [c for c in first if trans_ok(beats[0] - 2, before, beats[0], c)]
    best = [{c: (0, None) for c in first}]
    for k in range(1, len(layers)):
        row = {}
        for c in layers[k]:
            bv, arg = INF, None
            for p, (pv, _) in best[k - 1].items():
                if not trans_ok(beats[k - 1], p, beats[k], c):
                    continue
                cost = pv + sum(0 if 1 <= abs(a - b) <= 2 else 1.2 if a == b else 0.6 * abs(a - b) ** 0.5 for a, b in zip(p, c))
                notes = [g[beats[k]] for g in fixed if g[beats[k]] is not None] + list(c)
                lo = min(notes)
                pcs = {(x - lo) % 12 for x in notes}
                cost += 0 if (3 in pcs or 4 in pcs) else 1.5
                if cost < bv:
                    bv, arg = cost, p
            if arg is not None:
                row[c] = (bv, arg)
        if not row:
            raise SystemExit(f"no way through at bar {beats[k] // 8 + 1}, beat {(beats[k] % 8) // 2 + 1}")
        best.append(row)
    c = min(best[-1], key=lambda x: best[-1][x][0])
    path = [c]
    for k in range(len(layers) - 1, 0, -1):
        c = best[k][c][1]
        path.append(c)
    path.reverse()
    for q, c in zip(beats, path):
        for g, x in zip(free, c):
            g[q] = g[q + 1] = x

# The free voices, passage by passage.
fill([S], [A, B], (5, 6), [RANGES["S"]])
fill([A], [S, B], (7, 8), [RANGES["A"]])
fill([A, B], [S], (9, 10), [RANGES["A"], RANGES["B"]])
fill([S, B], [A], (11, 12), [RANGES["S"], range(38, 58)])
fill([S], [A, B], (13, 14), [RANGES["S"]])
fill([A], [S, B], (15, 16), [RANGES["A"]], last=(midi("F#4"),))

def check(lines):
    bad = []
    for q in range(1, E):
        for i, j in itertools.combinations(range(3), 2):
            a0, a1, b0, b1 = lines[i][q - 1], lines[i][q], lines[j][q - 1], lines[j][q]
            if None in (a0, a1, b0, b1) or a0 == a1 or b0 == b1:
                continue
            i0, i1 = abs(a0 - b0) % 12, abs(a1 - b1) % 12
            if i0 in PERF and i0 == i1:
                bad.append(("consecutive", q // 8 + 1, q % 8, i, j))
        if q % 2 == 0:
            notes = [l[q] for l in lines if l[q] is not None]
            if not consonant(notes):
                bad.append(("dissonant beat", q // 8 + 1, q % 8, [name(x) for x in notes]))
    return bad

def to_notes(g):
    out, q = [], 0
    while q < E:
        if g[q] is None:
            q += 1
            continue
        start = q
        # quavers of one note: struck again where the composed line repeats it on a beat of its own
        q += 1
        while q < E and g[q] == g[start] and (q - start) < 8 and not (q % 2 == 0 and q - start >= 2 and getattr(g, "_", None)):
            q += 1
        out.append([start * 4, (q - start) * 4, name(g[start])])
    return out

if __name__ == "__main__":
    lines = [S, A, B]
    print("faults:", check(lines))
    piece = {"id": "fugue-d-minor", "title": "Fugue in D minor (three voices)", "meter": "4/4", "tonic": "D", "mode": "minor", "sig": -1, "pickup": 0,
             "voices": [to_notes(g) for g in lines],
             "plan": ["1-2 subject (alto)", "3-4 answer (soprano), countersubject (alto)", "5-6 subject (bass), countersubject (alto)", "7-8 episode", "9-10 subject in F major (soprano)", "11-12 episode", "13-14 subject (bass), countersubject (alto)", "15-16 cadence, Picardy third"]}
    path = "data/playback/test-pieces.json"
    data = json.load(open(path)) if os.path.exists(path) else {}
    data["fugue"] = piece
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=1)
    for v, g in zip("SAB", lines):
        print(v, " ".join(name(x) if x is not None else "-" for x in g[::2]))
