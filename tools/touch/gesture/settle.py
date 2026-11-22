#!/usr/bin/env python3
# D1017 follow-up: how a slid note reaches its pitch (render.cjs `slides`, the player alone). For each slid note: every 2 ms a
# 25 ms frame's period by normalised autocorrelation within +-250 cents of the written pitch (parabolic peak; frames with a
# peak under 0.6 dropped); the note's mean pitch (cents from the written) over its whole length, and the time (ms from its
# onset, the frame's middle) after which every frame stays within SETTLE_CENTS of the written pitch ("reached"), and that as a
# share of the note; and the first time it comes within SETTLE_CENTS (`first_ms`: where the voice's own vibrato moves it on after). usage: python3 -I settle.py <render.wav> [more.wav ...]   (each with its render.json beside it)
import sys, json, wave
import numpy as np
SETTLE_CENTS, WIN, HOP, LEAD = 15, 0.025, 0.002, 0.05
def load(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, w.getframerate()
def pitch(fr, sr, f0):
    fr = fr - fr.mean()
    lo, hi = int(sr / (f0 * 2 ** (250 / 1200))), int(np.ceil(sr / (f0 * 2 ** (-250 / 1200))))
    if hi + 2 >= len(fr): return None, 0
    ac = np.array([np.dot(fr[:-L], fr[L:]) / np.sqrt(np.dot(fr[:-L], fr[:-L]) * np.dot(fr[L:], fr[L:]) + 1e-12) for L in range(lo - 1, hi + 2)])
    i = int(np.argmax(ac[1:-1])) + 1
    y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]
    den = y0 - 2 * y1 + y2
    per = lo - 1 + i + (0.5 * (y0 - y2) / den if den else 0)
    return 1200 * np.log2((sr / per) / f0), y1
out = {}
for path in sys.argv[1:]:
    j = json.load(open(path[:-4] + '.json'))
    x, sr = load(path)
    slid = [n for n in j['swayed'] if any(abs(n['at'] - s) < 0.02 for s in j['slid'])]
    rows = []
    for n in slid:
        f0 = 440 * 2 ** ((n['midi'] - 69) / 12)
        fr = []
        t = 0.0
        while t + WIN <= n['dur']:
            a = int((n['at'] + LEAD + t) * sr)
            c, q = pitch(x[a:a + int(WIN * sr)], sr, f0)
            if c is not None and q > 0.6: fr.append((t + WIN / 2, c))
            t += HOP
        if len(fr) < 5: continue
        reach = None
        for k in range(len(fr)):
            if all(abs(c) <= SETTLE_CENTS for _, c in fr[k:]): reach = fr[k][0]; break
        first = next((t for t, c in fr if abs(c) <= SETTLE_CENTS), None)
        rows.append({'first_ms': None if first is None else round(first * 1000), 'midi': n['midi'], 'dur_ms': round(n['dur'] * 1000), 'mean_cents': round(float(np.mean([c for _, c in fr])), 1), 'reach_ms': None if reach is None else round(reach * 1000), 'reach_share': None if reach is None else round(reach / n['dur'], 2)})
    reached = [r for r in rows if r['reach_ms'] is not None]
    out[path.split('/')[-1][:-4]] = {'slid': len(slid), 'measured': len(rows), 'never_reached': len(rows) - len(reached),
        'mean_cents_abs_median': round(float(np.median([abs(r['mean_cents']) for r in rows])), 1) if rows else None,
        'mean_cents_abs_max': max((abs(r['mean_cents']) for r in rows), default=None),
        'reach_ms_median': float(np.median([r['reach_ms'] for r in reached])) if reached else None, 'reach_ms_max': max((r['reach_ms'] for r in reached), default=None),
        'over_third': sum(1 for r in rows if r['reach_share'] is None or r['reach_share'] > 1 / 3), 'notes': rows}
print(json.dumps(out, indent=1))
