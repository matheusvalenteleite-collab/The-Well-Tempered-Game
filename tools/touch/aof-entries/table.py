"""
D707: drafts data/touch/aof-entries.txt from scan.py's finds: for each piece its themes (the statement each is
read from, the cycle's orientation), every statement found at fit >= NEED (the whole theme laid from its first
note, or from its second: a first note changed), overlaps across themes kept by fit. The draft is reviewed
by hand (the table says what was kept, changed or added and why); this only proposes.
usage: python3 -I tools/touch/aof-entries/table.py [id ...] > draft.txt
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scan as s

# piece: (header flags, [(voice, bar, q, notes, need, scales)], canon_lag_bars)
# theme 1, 2, 3 in order of first entry; the statement given is the one the theme is read from (the table's len=).
SPEC = {
    "bwv1080-01": ("", [(1, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-02": ("", [(3, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-03": ("upside=1", [(2, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-04": ("upside=1", [(0, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-05": ("", [(3, 4, 0, 12, 0.8, (1,))]),
    "bwv1080-06": ("", [(3, 1, 0, 12, 0.8, (0.5, 1, 2))]),
    "bwv1080-07": ("", [(2, 36, 2, 12, 0.8, (0.5, 1, 2))]),
    "bwv1080-08": ("multi upside=3", [(1, 1, 2, 16, 0.85, (1,)), (1, 39, 3, 14, 0.9, (1,)), (1, 94, 1, 9, 0.85, (1,))]),
    "bwv1080-09": ("multi", [(1, 1, 1, 24, 0.8, (1,)), (0, 35, 0, 12, 0.8, (1,))]),
    "bwv1080-10": ("multi upside=2", [(1, 1, 1, 17, 0.8, (1,)), (0, 23, 0, 12, 0.8, (1,))]),
    "bwv1080-11": ("multi upside=2", [(1, 1, 1, 14, 0.8, (1,)), (1, 27, 2, 16, 0.85, (1,)), (1, 97, 3, 12, 0.9, (1,))]),
    "bwv1080-12r": ("", [(3, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-12i": ("upside=1", [(0, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-13r": ("", [(1, 1, 0, 12, 0.8, (1,))]),
    "bwv1080-13i": ("", [(1, 5, 0, 12, 0.8, (1,))]),
}


def finds(p, L, th, need, scales, mh=6):
    out = []
    for f in s.scan(p, th, minhead=mh, need=need, scales=scales):
        f["how"] = "full"
        out.append(f)
    t2 = th[1:]
    r0, st0 = t2[0][0], t2[0][1]
    t2 = [(r - r0, st - st0, d) for r, st, d in t2]
    for f in s.scan(p, t2, minhead=mh, need=need, scales=scales):
        ln = L[f["v"]]
        i = [k for k, n in enumerate(ln) if n[0] == f["on"]][0]
        st = ln[i - 1][0] if i > 0 else f["on"]
        if any(g["v"] == f["v"] and abs(g["on"] - st) < p["tpq"] * 2 * f["s"] for g in out):
            continue
        f["on"] = st
        f["how"] = "from2"
        out.append(f)
    return out


def main(ids):
    for pid in ids:
        head, themes = SPEC[pid]
        p = s.load(pid)
        L = [s.line_of(v) for v in p["voices"]]
        rows = []
        defs = []
        for k, (v, bar, q, cnt, need, scales) in enumerate(themes):
            if v is None:
                continue
            th = s.theme_at(p, L, v, bar, q, cnt)
            span = th[-1][0] + th[-1][2]
            defs.append((k + 1, v, bar, q, span / p["tpq"]))
            for f in finds(p, L, th, need, scales):
                f["t"] = k + 1
                rows.append(f)
        # one statement at a time in a voice: of overlapping finds the better fit (then the earlier) kept
        spans = {t: ln * p["tpq"] for t, _, _, _, ln in defs}
        rows.sort(key=lambda f: (-f["fit"], f["on"]))
        kept = []
        for f in rows:
            end = f["on"] + spans[f["t"]] * f["s"]
            if any(g["v"] == f["v"] and f["on"] < g["on"] + spans[g["t"]] * g["s"] - p["tpq"] and g["on"] < end - p["tpq"] for g in kept):
                continue
            kept.append(f)
        kept.sort(key=lambda f: (f["on"], f["v"]))
        print(f"== {pid} | S {head}".rstrip())
        for t, v, bar, q, ln in defs:
            print(f"{bar}+{q:g} {s.LET[len(p['voices'])][v]}{'' if t == 1 else ' t%d' % t} len={ln:g}   # theme {t} read here")
        for f in kept:
            b, qq = s.bar_of(p, f["on"])
            if any(t == f["t"] and s.LET[len(p['voices'])][f["v"]] == s.LET[len(p['voices'])][v] and b == bar and abs(qq - q) < 0.01 for t, v, bar, q, _ in defs):
                continue
            sc = {1: "", 2: " aug", 0.5: " dim"}[f["s"]]
            print(f"{b}+{qq:g} {s.LET[len(p['voices'])][f['v']]}{'' if f['t'] == 1 else ' t%d' % f['t']}{' inv' if f['sg'] < 0 else ''}{sc}{' mod' if f['how'] == 'from2' else ''}   # fit {f['fit']} {f['how']}")
        print()


if __name__ == "__main__":
    main(sys.argv[1:] or list(SPEC))
