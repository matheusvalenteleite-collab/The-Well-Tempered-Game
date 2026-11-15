"""
D730: drafts data/touch/inv-entries.txt, the Inventions' and Sinfonias' entries (BWV 772-801), from the Art of
Fugue's scanner (tools/touch/aof-entries/scan.py, D707): for each piece its themes, each given by its first
statement (voice, bar, beat, the notes scanned, the statement's length in quarter notes), every statement found
(prime and inverted; at the theme's values, doubled where asked) at a fit >= NEED, laid from its first note or from
its second (a first note changed: "mod"); one statement at a time in a voice, the better fit kept.
What an entry is here (D730): an Invention's subject (Inventions 1, 7 and 13 its motif, Inventions 2 and 8 the
canon's subject); where an Invention opens on two lines in double counterpoint (5, 6, 9, 11, 12, 14) the second
line too (theme 2); a Sinfonia's subject and its countersubject(s) (themes 2, 3), the countersubject read from the
line the subject's first voice plays against the second entry.
The draft is reviewed by hand (the table says what was kept, changed or added and why); this only proposes.
usage: python3 -I tools/touch/inv-entries/table.py [id ...] > draft.txt   (D740: and the Four Duets, BWV 802-805)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../aof-entries"))
import scan as s

# piece: (header flags, [(voice, bar, q, notes scanned, len quarter notes, need, scales, minhead)])
SPEC = {
    "bwv772": ("", [(0, 1, 0.25, 8, 2.25, 0.8, (1, 2), 6)]),
    "bwv773": ("", [(0, 1, 0.5, 14, 8, 0.8, (1,), 8)]),
    "bwv774": ("", [(0, 0, 0, 14, 3, 0.75, (1,), 5)]),
    "bwv775": ("", [(0, 1, 0, 12, 3, 0.8, (1,), 6)]),
    "bwv776": ("multi", [(0, 1, 0.5, 12, 12.5, 0.75, (1,), 6), (1, 1, 2.25, 12, 10, 0.75, (1,), 6)]),
    "bwv777": ("multi", [(0, 1, 0.25, 8, 4, 0.75, (1,), 5), (1, 1, 0, 8, 3.75, 0.75, (1,), 5)]),
    "bwv778": ("", [(0, 1, 0.5, 7, 2, 0.8, (1, 2), 6)]),
    "bwv779": ("", [(0, 1, 0.5, 16, 5.5, 0.75, (1,), 6)]),
    "bwv780": ("multi", [(0, 1, 0, 12, 12, 0.75, (1,), 6), (1, 1, 0, 9, 12, 0.75, (1,), 6)]),
    "bwv781": ("", [(0, 1, 0, 10, 5.5, 0.75, (1,), 6)]),
    "bwv782": ("multi", [(0, 1, 0.25, 15, 7.75, 0.75, (1,), 6), (1, 1, 0, 12, 8, 0.75, (1,), 6)]),
    "bwv783": ("multi", [(1, 1, 0, 12, 6, 0.75, (1,), 6), (0, 1, 0, 5, 6, 0.8, (1,), 5)]),
    "bwv784": ("", [(0, 1, 0.25, 8, 2.25, 0.8, (1,), 6)]),
    "bwv785": ("multi", [(0, 1, 0.25, 18, 3.75, 0.75, (1,), 6), (1, 1, 0, 5, 4, 0.8, (1,), 5)]),
    "bwv786": ("", [(0, 1, 0.5, 16, 6.75, 0.75, (1,), 6)]),
    "bwv787": ("", [(0, 1, 0.25, 12, 4, 0.75, (1,), 6)]),
    "bwv788": ("", [(0, 1, 0, 8, 12, 0.75, (1,), 5)]),
    "bwv789": ("", [(0, 1, 0.5, 16, 8, 0.75, (1,), 6)]),
    "bwv790": ("", [(0, 1, 0.25, 10, 4, 0.75, (1,), 6)]),
    "bwv791": ("", [(0, 1, 1.75, 8, 6, 0.75, (1,), 6)]),
    "bwv792": ("", [(1, 1, 0, 9, 4.5, 0.75, (1,), 6)]),
    "bwv793": ("", [(0, 1, 0.5, 9, 6, 0.75, (1,), 6)]),
    "bwv794": ("", [(1, 1, 0.5, 10, 4, 0.75, (1,), 6)]),
    "bwv795": ("multi", [(1, 1, 0.5, 8, 8, 0.75, (1,), 6), (2, 1, 0, 7, 8, 0.8, (1,), 6)]),
    "bwv796": ("", [(0, 1, 0.5, 12, 6, 0.75, (1,), 6)]),
    "bwv797": ("", [(0, 1, 0.25, 7, 4.75, 0.7, (1,), 3)]),
    "bwv798": ("", [(0, 1, 0, 12, 8, 0.75, (1,), 6)]),
    "bwv799": ("multi", [(0, 1, 0, 10, 6, 0.75, (1,), 6), (0, 5, 0, 10, 6, 0.8, (1,), 6)]),
    "bwv800": ("", [(1, 1, 0, 9, 4.25, 0.75, (1,), 6)]),
    "bwv801": ("", [(0, 1, 0, 12, 5.25, 0.75, (1,), 6)]),
    # D740: the Four Duets (BWV 802-805), the same way (data/touch/duet-entries.txt).
    "bwv802": ("", [(0, 1, 0, 15, 9, 0.75, (1,), 6)]),
    "bwv803": ("multi", [(0, 1, 0, 12, 8, 0.75, (1,), 6), (0, 5, 0, 12, 8, 0.75, (1,), 6)]),
    "bwv804": ("", [(0, 1, 1.5, 12, 10.5, 0.75, (1,), 6)]),
    "bwv805": ("multi", [(1, 1, 2, 12, 32, 0.75, (1,), 5), (1, 9, 2, 12, 32, 0.75, (1,), 5)]),
}


def finds(p, L, th, need, scales, mh):
    out = []
    for f in s.scan(p, th, minhead=mh, need=need, scales=scales):
        f["how"] = "full"
        out.append(f)
    t2 = th[1:]
    r0, st0 = t2[0][0], t2[0][1]
    t2 = [(r - r0, st - st0, d) for r, st, d in t2]
    for f in s.scan(p, t2, minhead=max(3, mh - 1), need=need, scales=scales):
        ln = L[f["v"]]
        i = [k for k, n in enumerate(ln) if n[0] == f["on"]][0]
        # the varied first note: the one before, unless it lies further back than twice the theme's first step
        # (a held note: then the statement starts on the note found, its first note missing)
        gap = 2 * (th[1][0] - th[0][0]) * f["s"]
        st = ln[i - 1][0] if i > 0 and f["on"] - ln[i - 1][0] <= gap else f["on"]
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
        LET = s.LET[len(p["voices"])]
        rows, defs = [], []
        for k, (v, bar, q, cnt, ln, need, scales, mh) in enumerate(themes):
            th = s.theme_at(p, L, v, bar, q, cnt)
            defs.append((k + 1, v, bar, q, ln))
            for f in finds(p, L, th, need, scales, mh):
                f["t"] = k + 1
                rows.append(f)
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
            print(f"{bar}+{q:g} {LET[v]}{'' if t == 1 else ' t%d' % t} len={ln:g}   # theme {t} read here")
        for f in kept:
            b, qq = s.bar_of(p, f["on"])
            if any(t == f["t"] and f["v"] == v and b == bar and abs(qq - q) < 0.01 for t, v, bar, q, _ in defs):
                continue
            sc = {1: "", 2: " aug", 0.5: " dim"}[f["s"]]
            print(f"{b}+{qq:g} {LET[f['v']]}{'' if f['t'] == 1 else ' t%d' % f['t']}{' inv' if f['sg'] < 0 else ''}{sc}{' mod' if f['how'] == 'from2' else ''}   # fit {f['fit']} {f['how']}")
        print()


if __name__ == "__main__":
    main(sys.argv[1:] or list(SPEC))
