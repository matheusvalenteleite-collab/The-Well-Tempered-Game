"""
D707: THE ART OF FUGUE'S ENTRIES, SCANNED. Every statement of a piece's themes in its notes, by letter steps and
rhythm (prime and inverted; at the theme's own values, in augmentation and in diminution), for the table
data/touch/aof-entries.txt (read by tools/touch/more-bach.ts and extract.ts through expert.ts placeExpert).
A theme is given by its first statement (voice, bar, beat, notes): its letter steps and onsets are laid from
every note of every voice; a statement is kept where its first MIN notes all fit (a step off by one at
most once in the head: a tonal answer) and three quarters of all its notes fit; overlapping finds in a voice
the best kept. Prints each find as a table line with its fit, for review.
usage: python3 -I tools/touch/aof-entries/scan.py <id> [theme spec ...]   theme: voice:bar:beatQ:notes[:label]
"""
import json, sys, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../")


def load(pid):
    for f in ("data/touch/more-bach.json", "data/touch/pieces.json"):
        for p in json.load(open(ROOT + f)):
            if p["id"] == pid:
                return p
    raise SystemExit("no piece " + pid)


def line_of(v):
    out = []
    for n in sorted(v, key=lambda n: (n[0], -n[2])):
        if out and out[-1][0] == n[0]:
            continue
        out.append(n)
    return out


def bar_of(p, t):
    b = [x for x in p["bars"] if x["on"] <= t]
    b = b[-1] if b else p["bars"][0]
    return b["n"], (t - b["on"]) / p["tpq"]


def theme_at(p, lines, v, bar, q, count):
    on = [b["on"] for b in p["bars"] if b["n"] == bar][0] + round(q * p["tpq"])
    ns = [n for n in lines[v] if n[0] >= on][:count]
    return [(n[0] - ns[0][0], n[3] - ns[0][3], n[1]) for n in ns]


def scan(p, theme, minhead=6, need=0.75, scales=(1, 0.5, 2), signs=(1, -1)):
    lines = [line_of(v) for v in p["voices"]]
    finds = []
    for vi, ln in enumerate(lines):
        at = {n[0]: n for n in ln}
        for i, n0 in enumerate(ln):
            for s in scales:
                for sg in signs:
                    hits, half, head_ok, k_last = 0.0, 0, True, 0
                    for k, (rel, st, du) in enumerate(theme):
                        n = at.get(n0[0] + round(rel * s))
                        d = abs(n[3] - n0[3] - sg * st) if n else 99
                        if d == 0:
                            hits += 1
                            k_last = k
                        elif d == 1:
                            hits += 0.5
                            half += 1
                            k_last = k
                            if k < minhead and half > 1:
                                head_ok = False
                        else:
                            if k < minhead:
                                head_ok = False
                    if not head_ok:
                        continue
                    fit = hits / len(theme)
                    if fit < need:
                        continue
                    finds.append(dict(v=vi, on=n0[0], s=s, sg=sg, fit=round(fit, 2), half=half, first=n0[2]))
    # overlapping finds in a voice: the best (then the earliest)
    finds.sort(key=lambda f: (-f["fit"], f["on"]))
    kept = []
    span = theme[-1][0] + theme[-1][2]
    for f in finds:
        if any(g["v"] == f["v"] and abs(g["on"] - f["on"]) < span * min(f["s"], g["s"]) * 0.5 for g in kept):
            continue
        kept.append(f)
    return sorted(kept, key=lambda f: (f["on"], f["v"]))


LET = {2: ["U", "L"], 3: ["S", "A", "B"], 4: ["S", "A", "T", "B"]}
NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"]

if __name__ == "__main__":
    pid = sys.argv[1]
    p = load(pid)
    lines = [line_of(v) for v in p["voices"]]
    for k, spec in enumerate(sys.argv[2:]):
        parts = spec.split(":")
        v, bar, q, cnt = int(parts[0]), int(parts[1]), float(parts[2]), int(parts[3])
        label = parts[4] if len(parts) > 4 else ""
        th = theme_at(p, lines, v, bar, q, cnt)
        mh = int(parts[5]) if len(parts) > 5 else min(6, cnt)
        print(f"# theme {k+1} {label}: {cnt} notes from b{bar}+{q} voice {v}: steps {[t[1] for t in th]}")
        for f in scan(p, th, minhead=mh):
            b, qq = bar_of(p, f["on"])
            flags = (["inv"] if f["sg"] < 0 else []) + (["aug"] if f["s"] == 2 else ["dim"] if f["s"] == 0.5 else [])
            print(f"{b}+{qq:g} {LET[len(p['voices'])][f['v']]} {' '.join(flags)}  # fit {f['fit']} half {f['half']} from {NAMES[f['first']%12]}{f['first']//12-1}")
