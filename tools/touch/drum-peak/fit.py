#!/usr/bin/env python3
# D601, THE DRUM-PEAK DATA (src/touch/drum-peak-data.ts) from the offline renders (render.cjs): for each fugue on its own
# sound, the band's momentary loudness on the phone model (400 ms, dB) at every beat of the score (the band alone, DRUMS
# off: measured); for each style, each piece's loudness at velocity 1 on the phone model (dB; a stroke's energy in the
# 400 ms after it), fitted by non-negative least squares to the drums alone (DRUMS on, every note silenced): the window
# energy after each stroke as the sum of the strokes in it (velocity squared), a stroke struck up to 0.3 s before the
# window counted at TAIL. test/d601-drum-peaks.test.ts then plays every stroke of the fugue's styles through the engine
# (no audio) and holds each one's modelled loudness under the band's measured loudness there.
# usage: python3 -I tools/touch/drum-peak/fit.py <renders dir> <finfo.json> <jobs.json> > src/touch/drum-peak-data.ts
import sys, json, os
import numpy as np
from scipy.optimize import nnls

D, FI, JOBS = sys.argv[1:4]
fi = json.load(open(FI)); jobs = json.load(open(JOBS))
NW = 19
TAIL = 0.3
TAIL_W = 0.25
def lu(e): return -0.691 + 10 * np.log10(max(e, 1e-14))
def load(n):
    p = f"{D}/{n}.json"
    return json.load(open(p)) if os.path.exists(p) else None
band = {}
by_style = {}
for j in jobs:
    r = load(j['name'])
    if not r: continue
    if j['mode'] == 'band':
        P = np.array(r['fr']['P'], float); ticks = np.array(r['fr']['tick']); dt = r['dt']
        F = fi[j['piece']]; beat = F['beat']
        cs = np.concatenate([[0], np.cumsum(P)])
        curve = []
        for b0 in range(0, F['length'] + 1, beat):
            i = int(np.searchsorted(ticks, b0))
            if i >= len(P): curve.append(curve[-1] if curve else -99); continue
            j1 = min(len(P), i + NW)
            curve.append(round(lu((cs[j1] - cs[i]) / max(1, j1 - i)), 1))
        band[j['piece']] = {'beat': beat, 'db': curve}
    elif j['mode'] == 'drums':
        by_style.setdefault(j['style'], []).append((j['piece'], r))
pieces_db = {}
err = {}
for st, rs in sorted(by_style.items()):
    names = sorted({k[2] for _, r in rs for k in r['kit']})
    col = {n: i for i, n in enumerate(names)}
    X, y = [], []
    for pid, r in rs:
        P = np.array(r['fr']['P'], float); dt = r['dt']; cs = np.concatenate([[0], np.cumsum(P)])
        lv = 10 ** (fi[pid]['levelDb'] / 10)
        kit = sorted(r['kit'], key=lambda k: k[1])
        whens = np.array([k[1] for k in kit])
        for idx, (tick, w, piece, vel, role) in enumerate(kit[:: max(1, len(kit) // 1500)]):
            i0 = int(w / dt)
            if i0 + NW >= len(P): continue
            e = (cs[i0 + NW] - cs[i0]) / NW
            if e <= 0: continue
            row = np.zeros(len(names))
            lo, hi = np.searchsorted(whens, w - TAIL), np.searchsorted(whens, w + NW * dt)
            for k in kit[lo:hi]:
                row[col[k[2]]] += (k[3] ** 2) * (1 if k[1] >= w - 1e-4 else TAIL_W) * lv
            X.append(row / e); y.append(1.0)
    X = np.array(X); y = np.array(y)
    a, _ = nnls(X, y)
    # the model's error on the windows (dB)
    pred = X @ a
    e_db = 10 * np.log10(np.maximum(pred, 1e-9))
    err[st] = (round(float(np.median(np.abs(e_db))), 2), round(float(np.percentile(e_db, 95)), 2), len(y))
    # a piece the fit left at 0 (always struck with a louder one): the median of the others' (never silent in the model)
    pos = a[a > 0]
    fill = float(np.median(pos)) if len(pos) else 1e-6
    pieces_db[st] = {n: round(lu(a[i] if a[i] > 0 else fill) + 0.691, 1) for n, i in col.items()}
print("/**")
print(" * D601, THE DRUM-PEAK DATA (generated: tools/touch/drum-peak/fit.py from render.cjs's offline renders; do not edit by hand).")
print(" * BAND: each fugue on its own sound, the band alone (DRUMS off), its momentary loudness on the phone model (400 ms, dB) from")
print(" * each beat of the score (index = tick / beat). PIECE_DB: each style's pieces, a stroke's loudness at velocity 1 on the phone")
print(" * model (dB, the 400 ms after it), fitted to the drums alone. The model's error per style (median |dB|, 95th percentile,")
print(" * windows): " + "; ".join(f"{k} {v[0]}/{v[1]}/{v[2]}" for k, v in sorted(err.items())) + ".")
print(" */")
print("export const BAND: Readonly<Record<string, { beat: number; db: readonly number[] }>> = " + json.dumps(band, separators=(',', ':')) + ";")
print("export const PIECE_DB: Readonly<Record<string, Readonly<Record<string, number>>>> = " + json.dumps(pieces_db, separators=(',', ':')) + ";")
print(f"export const TAIL_S = {TAIL};")
print(f"export const TAIL_W = {TAIL_W};")
