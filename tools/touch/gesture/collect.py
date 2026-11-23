#!/usr/bin/env python3
# D1014-D1017: the gestures' measurements for test/d1014-gestures.test.ts. For each render pair in <dir> (render.cjs's jobs, run on
# the code before into <dir>/base and on this code into <dir>/new): measure.py's numbers (the gesture's loudness against the
# thumb still, the level swing, the timbre, the pitch) and how far this code's still render is from the one before (max |diff|,
# 16-bit steps: "nothing changes when the thumb does not move"). A slide job (no still) is measured against its before, its
# pitch from 0.15 s into each note (after the glide), on the slid notes alone.
# usage: python3 -I collect.py <dir> <jobs.json> <out.json>
import sys, json, subprocess, os, wave
import numpy as np
D, jobs, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
M = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'measure.py')
def pcm(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.int32)
res = {}
for j in jobs:
    if not j['name'].endswith('-solo'): continue
    k = j['name'][:-5]
    slide = bool(j.get('slides'))
    st = f'{D}/base/{k}-solo.wav' if slide else f'{D}/base/{k}-still.wav'
    args = ['python3', '-I', M, st, f'{D}/base/{k}-solo.wav', f'{D}/new/{k}-solo.wav'] + (['--skip', '0.15', '--q', '0.6'] if slide else [])
    r = json.loads(subprocess.run(args, capture_output=True, text=True).stdout)
    row = {'piece': j['piece'], 'sound': j['sound'], 'player': j['player'], 'fromBar': j['fromBar'], 'gesture': 'slides' if slide else j['sway']['shape'],
           'gesture_lu': r['gesture_lu_phone'], 'level_swing_db': {b: [r['vs_still'][b]['level_mean_abs_db'], r['vs_still'][b]['level_p95_abs_db']] for b in ('before', 'after')},
           'timbre_db': {b: r['vs_still'][b]['timbre_db'] for b in ('before', 'after')}, 'centroid_hz': {b: round(r[b]['centroid']) for b in ('before', 'after')},
           'pitch': {x: r['pitch'][x] for x in ('frames', 'after_mean_cents', 'diff_mean_cents', 'per_note_mean_max_abs', 'diff_p95_abs')} if 'pitch' in r else None}
    if slide:
        # the slid notes alone: each note's mean pitch after the glide, this code's against the written pitch
        sys.argv = ['m', 'x', 'x', 'x', '--skip', '0.15', '--q', '0.6']
        ns = {}
        exec(open(M).read().split('s0, b, a = sys.argv')[0], ns)
        jj = json.load(open(f'{D}/new/{k}-solo.json'))
        x, sr = ns['load'](f'{D}/new/{k}-solo.wav')
        per = {}
        for i, t, c, q in ns['track'](x, sr, jj['swayed']):
            if q > 0.6: per.setdefault(i, []).append(c)
        slid = [i for i, n in enumerate(jj['swayed']) if any(abs(n['at'] - s) < 0.02 for s in jj['slid'])]
        means = [float(np.mean(per[i])) for i in slid if i in per]
        row['slides'] = {'scripted': len(jj['slid']), 'played': jj['slides'], 'slid_note_mean_max_abs_cents': round(max(abs(m) for m in means), 2) if means else None, 'measured': len(means)}
    else:
        a, b = pcm(st), pcm(f'{D}/new/{k}-still.wav')
        row['still_max_diff'] = int(np.abs(a - b).max())
    res[k] = row
json.dump(res, open(out, 'w'), indent=1)
print(json.dumps({k: [v['gesture_lu'], v.get('still_max_diff'), (v['pitch'] or {}).get('per_note_mean_max_abs'), v.get('slides')] for k, v in res.items()}))
