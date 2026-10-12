"""P29: three chorales on original hymns, for the owner's test page.

The texts, the melodies and the harmony (one chord to each melody note) are composed here by hand;
the alto, tenor and bass are then voiced by a search (dynamic programming over the chords) under the
rules of four-part writing: no consecutive fifths or octaves between any two voices (nor by contrary
motion), no hidden fifth or octave in the outer voices when the soprano leaps, no crossing, the upper
voices within an octave of each other, the third always present, the leading tone and a seventh never
doubled, a seventh resolving down by step, no augmented second or tritone in a line. Passing notes
are then added in the lower voices where they make no new fault. Writes data/playback/test-pieces.json
(the chorales); the checker in check.py reads it back.

Usage: python3 tools/playback/compose/chorales.py
"""
import itertools, json, os, re

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def pc(name):
    return (PC[name[0]] + name[1:].count("#") - name[1:].count("b")) % 12
def midi(p):
    m = re.match(r"([A-G])([#b]*)(-?\d+)$", p)
    return 12 * (int(m.group(3)) + 1) + PC[m.group(1)] + m.group(2).count("#") - m.group(2).count("b")

QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "dim": [0, 3, 6], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10]}
def chord(sym):
    m = re.match(r"([A-G][#b]?)(m7|dim|m|7)?(?:/([A-G][#b]?))?$", sym)
    root, q, bass = m.group(1), m.group(2) or "", m.group(3) or m.group(1)
    r = pc(root)
    pcs = [(r + x) % 12 for x in QUAL[q]]
    return {"root": r, "pcs": pcs, "third": pcs[1], "fifth": pcs[2], "seventh": pcs[3] if len(pcs) > 3 else None, "bass": pc(bass), "sym": sym}

# Spelling: each piece's own accidentals.
def namer(key_sharps):
    sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    flat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
    def name(m, prefer):
        n = (prefer.get(m % 12)) or (sharp if key_sharps >= 0 else flat)[m % 12]
        return f"{n}{m // 12 - 1}"
    return name

A_RANGE, T_RANGE, B_RANGE = range(55, 75), range(48, 68), range(40, 63)
PERFECT = {0, 7}

def leap_bad(a, b):
    d = abs(a - b)
    return d in (6, 10, 11) or d > 12

def candidates(s, ch, leading):
    out = []
    for b in B_RANGE:
        if b % 12 != ch["bass"]:
            continue
        for t in T_RANGE:
            if t % 12 not in ch["pcs"] or t <= b or t - b > 19:
                continue
            for a in A_RANGE:
                if a % 12 not in ch["pcs"] or a < t or a > s or s - a > 12 or a - t > 12:
                    continue
                notes = [s, a, t, b]
                pcs = [x % 12 for x in notes]
                if ch["third"] not in pcs:
                    continue
                if ch["seventh"] is not None and ch["seventh"] not in pcs:
                    continue
                if leading is not None and pcs.count(leading) > 1 and leading in ch["pcs"]:
                    continue
                if ch["seventh"] is not None and pcs.count(ch["seventh"]) > 1:
                    continue
                cost = 0
                if ch["fifth"] not in pcs:
                    cost += 2
                if pcs.count(ch["third"]) > 1:
                    cost += 1.5
                if ch["bass"] == ch["root"] and pcs.count(ch["root"]) < 2:
                    cost += 0.8
                cost += max(0, (s - t) - 19) * 0.3
                out.append((tuple(notes), cost))
    return out

def transition_ok(p, c, prev_ch):
    for i in range(4):
        if leap_bad(p[i], c[i]):
            return False
        if i > 0 and abs(c[i] - p[i]) == 3 and (p[i] % 12, c[i] % 12) in AUG2:
            return False
    for i, j in itertools.combinations(range(4), 2):
        if c[i] < c[j] - 0:  # crossing
            return False
        ip, ic = (p[i] - p[j]) % 12, (c[i] - c[j]) % 12
        moved = p[i] != c[i] and p[j] != c[j]
        if moved and ip in PERFECT and ic == ip:
            return False
    # overlap: a voice may not pass the neighbour's previous note
    for i in range(3):
        if c[i + 1] > p[i] or c[i] < p[i + 1]:
            return False
    # hidden perfect in outer voices with the soprano leaping
    ds, db = c[0] - p[0], c[3] - p[3]
    if ds * db > 0 and (c[0] - c[3]) % 12 in PERFECT and abs(ds) > 2:
        return False
    # a seventh resolves down by step
    if prev_ch and prev_ch["seventh"] is not None:
        for i in range(4):
            if p[i] % 12 == prev_ch["seventh"] and not (1 <= p[i] - c[i] <= 2):
                return False
    return True

AUG2 = set()  # filled per key (the minor's sixth to raised seventh)

def voice(sop, chords, leading):
    layers = []
    for s, sym in zip(sop, chords):
        ch = chord(sym)
        cands = candidates(s, ch, leading)
        if not cands:
            raise SystemExit(f"no voicing for {sym} under {s}")
        layers.append((ch, cands))
    INF = float("inf")
    best = [{c: (cost, None) for c, cost in layers[0][1]}]
    for k in range(1, len(layers)):
        ch, cands = layers[k]
        prev_ch = layers[k - 1][0]
        row = {}
        for c, cost in cands:
            bestv, arg = INF, None
            for p, (pv, _) in best[k - 1].items():
                if pv >= bestv or not transition_ok(p, c, prev_ch):
                    continue
                motion = abs(c[1] - p[1]) + abs(c[2] - p[2]) + 0.5 * max(0, abs(c[3] - p[3]) - 5)
                same = sum(1 for i in (1, 2, 3) if c[i] == p[i]) * 0.2
                v = pv + cost + motion * 0.6 + same
                if v < bestv:
                    bestv, arg = v, p
            if arg is not None:
                row[c] = (bestv, arg)
        if not row:
            raise SystemExit(f"dead end at {k} ({chords[k]})")
        best.append(row)
    c = min(best[-1], key=lambda x: best[-1][x][0])
    path = [c]
    for k in range(len(layers) - 1, 0, -1):
        c = best[k][c][1]
        path.append(c)
    return list(reversed(path))

def parallels(lines):
    """Consecutive fifths/octaves on the eighth grid: lines are [onset, dur, midi] lists (units: 32nds)."""
    grid = sorted({n[0] for l in lines for n in l})
    def at(l, t):
        for n in l:
            if n[0] <= t < n[0] + n[1]:
                return n
        return None
    bad = []
    for t0, t1 in zip(grid, grid[1:]):
        for i, j in itertools.combinations(range(len(lines)), 2):
            a0, a1, b0, b1 = at(lines[i], t0), at(lines[i], t1), at(lines[j], t0), at(lines[j], t1)
            if not all((a0, a1, b0, b1)):
                continue
            # a voice that holds or repeats its pitch does not move
            if a0[2] == a1[2] or b0[2] == b1[2]:
                continue
            i0, i1 = (a0[2] - b0[2]) % 12, (a1[2] - b1[2]) % 12
            if i0 in PERFECT and i0 == i1:
                bad.append((t1, i, j))
    return bad

def add_passing(lines, scale, ferm=()):
    """Quavers filling a third in the bass, tenor and alto (at most one in three notes of a voice),
    where they make no consecutive and no crossing."""
    def ok(test, v, mid_t, mid):
        if parallels(test):
            return False
        # the passing note stays between its neighbours' voices at that moment
        def at(l, t):
            for n in l:
                if n[0] <= t < n[0] + n[1]:
                    return n[2]
        up = at(test[v - 1], mid_t) if v > 0 else None
        down = at(test[v + 1], mid_t) if v < 3 else None
        return (up is None or mid <= up) and (down is None or mid >= down)
    for v in (3, 2, 1):
        k, since = 0, 3
        while k < len(lines[v]) - 1:
            a, b = lines[v][k], lines[v][k + 1]
            gap = b[2] - a[2]
            if since >= 3 and a[1] == 8 and a[0] + 8 == b[0] and abs(gap) in (3, 4) and a[0] not in ferm:
                step = 1 if gap > 0 else -1
                # a major third: the note between (a whole step each side); a minor third: the whole step first
                tries = [a[2] + 2 * step] if abs(gap) == 4 else [a[2] + 2 * step, a[2] + step]
                mid = next((x for x in tries if x % 12 in scale and abs(b[2] - x) in (1, 2)), None)
                if mid is not None:
                    trial = [list(x) for x in lines[v]]
                    trial[k] = [a[0], 4, a[2]]
                    trial.insert(k + 1, [a[0] + 4, 4, mid])
                    test = [lines[i] if i != v else trial for i in range(4)]
                    if ok(test, v, a[0] + 4, mid):
                        lines[v] = trial
                        k, since = k + 2, 0
                        continue
            k += 1
            since += 1
    return lines

def build(piece):
    global AUG2
    sop = [midi(p) for p in piece["melody"]]
    chords = piece["chords"]
    tonic = pc(piece["tonic"])
    minor = piece["mode"] == "minor"
    leading = (tonic + 11) % 12
    AUG2 = {((tonic + 8) % 12, (tonic + 11) % 12), ((tonic + 11) % 12, (tonic + 8) % 12)} if minor else set()
    path = voice(sop, chords, leading)
    onsets, durs, ferm = piece["onsets"], piece["durs"], piece["fermatas"]
    lines = [[[onsets[k], durs[k], path[k][v]] for k in range(len(path))] for v in range(4)]
    scale = {(tonic + x) % 12 for x in ([0, 2, 3, 5, 7, 8, 10] if minor else [0, 2, 4, 5, 7, 9, 11])}
    lines = add_passing(lines, scale, set(ferm))
    # tied repeated notes are kept as written; the fermatas on every voice's note at each fermata onset
    name = namer(piece["sig"])
    prefer = {pc(x): x for x in piece.get("spell", [])}
    voices = []
    for v, l in enumerate(lines):
        out = []
        for n in l:
            f = 1 if n[0] in ferm and n[1] >= 8 else 0
            out.append([n[0], n[1], name(n[2], prefer)] + ([1] if f else []))
        voices.append(out)
    bad = parallels(lines)
    return voices, bad

def plan(lines_of_notes, pickup=8, final_len=16):
    """Onsets: a pickup, then each line's eight notes (the eighth on a fermata, a crotchet); the last a minim."""
    onsets, durs, ferm = [], [], []
    t = 0
    for li, line in enumerate(lines_of_notes):
        for k, _ in enumerate(line):
            onsets.append(t)
            last = li == len(lines_of_notes) - 1 and k == len(line) - 1
            d = final_len if last else 8
            durs.append(d)
            if k == len(line) - 1:
                ferm.append(t)
            t += d
    return onsets, durs, ferm

# P30: one syllable to each melody note (a hyphen ends a word's inner syllable).
LYRICS = {'hymn-morning': 'The night has spent its si- lent store, the dawn is kin- dled at the door; O Light that ne- ver knows a close, be with us as the day- light grows.',
    'hymn-evening': 'When sha- dows length- en on the hill and all the bu- sy roads are still, then keep, O Lord, our hearts a- wake to watch with Thee till mor- ning break.',
    'hymn-spring': "Lift up your songs, you hills and streams, the hid- den spring has burst its seams; the win- ter's bond is loosed and gone, and all things wake to praise the One."}

PIECES = [
    {
        "id": "hymn-morning",
        "title": "The night has spent its silent store",
        "text": ["The night has spent its silent store,", "the dawn is kindled at the door;", "O Light that never knows a close,", "be with us as the daylight grows."],
        "tonic": "G", "mode": "major", "sig": 1,
        "lines": [
            ["D4", "G4", "G4", "A4", "B4", "C5", "B4", "A4"],
            ["B4", "D5", "C5", "B4", "B4", "A4", "A4", "G4"],
            ["B4", "E5", "D5", "C5", "B4", "A4", "G4", "F#4"],
            ["A4", "B4", "C5", "D5", "B4", "A4", "A4", "G4"],
        ],
        "chords": [
            ["G", "G/B", "C", "Am", "G", "C", "G/D", "D"],
            ["G", "G/B", "C", "G", "Em", "Am/C", "D", "G"],
            ["Em", "C", "G/B", "Am", "Em", "Am/C", "Em", "B"],
            ["Am/C", "G", "Am", "G/B", "Em", "Am/C", "D", "G"],
        ],
    },
    {
        "id": "hymn-evening",
        "title": "When shadows lengthen on the hill",
        "text": ["When shadows lengthen on the hill", "and all the busy roads are still,", "then keep, O Lord, our hearts awake", "to watch with Thee till morning break."],
        "tonic": "D", "mode": "minor", "sig": -1, "spell": ["Bb", "C#", "F#"],
        "lines": [
            ["A4", "D5", "C5", "Bb4", "A4", "G4", "F4", "E4"],
            ["F4", "G4", "A4", "Bb4", "A4", "G4", "G4", "F4"],
            ["A4", "C5", "C5", "D5", "C5", "Bb4", "A4", "G4"],
            ["A4", "Bb4", "A4", "G4", "F4", "E4", "E4", "D4"],
        ],
        "chords": [
            ["Dm", "Bb", "Am", "Gm", "F", "A7/C#", "Dm", "A"],
            ["Dm", "Gm", "F", "Gm", "F/C", "C", "C7/E", "F"],
            ["Dm", "Am", "F", "Bb", "F/A", "Gm", "D", "Gm"],
            ["Dm", "Gm", "F", "Gm/Bb", "Bb", "Edim/G", "A", "D"],
        ],
    },
    {
        "id": "hymn-spring",
        "title": "Lift up your songs, you hills and streams",
        "text": ["Lift up your songs, you hills and streams,", "the hidden spring has burst its seams;", "the winter's bond is loosed and gone,", "and all things wake to praise the One."],
        "tonic": "F", "mode": "major", "sig": -1, "spell": ["Bb", "C#", "B"],
        "lines": [
            ["C4", "F4", "G4", "A4", "F4", "Bb4", "A4", "G4"],
            ["A4", "C5", "Bb4", "A4", "G4", "A4", "B4", "C5"],
            ["A4", "D5", "C5", "Bb4", "A4", "G4", "F4", "E4"],
            ["F4", "G4", "A4", "Bb4", "C5", "A4", "G4", "F4"],
        ],
        "chords": [
            ["F", "Dm", "C", "F", "Dm", "Gm", "F/C", "C"],
            ["F", "F/A", "Bb", "F", "C/E", "Dm", "G", "C"],
            ["F", "Bb", "Am", "Gm", "Dm", "Gm/Bb", "Dm/A", "A"],
            ["Dm", "C/E", "F", "Bb/D", "F/A", "F/C", "C7", "F"],
        ],
    },
]

if __name__ == "__main__":
    out = []
    for p in PIECES:
        p["melody"] = [n for l in p["lines"] for n in l]
        p["chords"] = [c for l in p["chords"] for c in l]
        p["onsets"], p["durs"], p["fermatas"] = plan(p["lines"])
        voices, bad = build(p)
        print(p["id"], "consecutives:", bad)
        lyrics = LYRICS[p["id"]].split()
        assert len(lyrics) == len(p["melody"]), p["id"]
        out.append({"id": p["id"], "title": p["title"], "text": p["text"], "lyrics": lyrics, "tonic": p["tonic"], "mode": p["mode"], "sig": p["sig"], "meter": "4/4", "pickup": 8, "voices": voices})
    os.makedirs("data/playback", exist_ok=True)
    path = "data/playback/test-pieces.json"
    data = json.load(open(path)) if os.path.exists(path) else {}
    data["chorales"] = out
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=1)
