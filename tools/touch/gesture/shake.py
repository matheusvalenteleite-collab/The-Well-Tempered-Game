#!/usr/bin/env python3
# D1040 draft: a shake's before and after (render.cjs `shake`, the player alone; the render's json lists every ornament
# performed and its notes, `orn`). Over the ornaments' spans (first note to the last note's end):
#   lu        their loudness joined (ffmpeg ebur128, the phone model: two 600 Hz high-passes)
#   pitch     each ornament note's mean pitch (a 25 ms frame every 5 ms from 12 ms into it, autocorrelation within ±150
#             cents of its written pitch), cents from it: the median |x| and the largest
#   attacks   how many of the ornament's notes after its first begin with a re-attack: the level (5 ms RMS) dips 3 dB or
#             more in the 25 ms around the note's start and comes back (a new note's envelope), as a share of those notes
#   edge      the energy over 3 kHz in each note's first 20 ms against its next 40 ms (dB, mean): a chiff or a pluck's edge
#   gesture_lu  the ornaments' spans against the same spans with the thumb held still (`still`: no shake, no ornament)
# The ornaments' logged times are those the game scheduled them at; the sound found at a constant offset after them (the
# shake read on the step it came), the offset (0-90 ms) that best matches the before's pitches applied to every render.
# usage: python3 -I shake.py <still.wav> <before.wav> <after.wav>   (each with its render.json beside it)
import sys, json, wave, subprocess, tempfile, os, re
import numpy as np
from scipy.signal import butter, sosfilt
LEAD = 0.05
def load(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, w.getframerate()
def lufs(x, sr):
    fd, tmp = tempfile.mkstemp(suffix='.wav'); os.close(fd)
    w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    out = subprocess.run(['ffmpeg', '-nostats', '-i', tmp, '-af', 'highpass=f=600,highpass=f=600,ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.unlink(tmp); m = re.findall(r'I:\s+(-?[\d.]+) LUFS', out); return float(m[-1]) if m else -99.0
def pitch(fr, sr, f0):
    fr = fr - fr.mean()
    lo, hi = int(sr / (f0 * 2 ** (150 / 1200))), int(np.ceil(sr / (f0 * 2 ** (-150 / 1200))))
    if hi + 2 >= len(fr): return None, 0
    ac = np.array([np.dot(fr[:-L], fr[L:]) / np.sqrt(np.dot(fr[:-L], fr[:-L]) * np.dot(fr[L:], fr[L:]) + 1e-12) for L in range(lo - 1, hi + 2)])
    i = int(np.argmax(ac[1:-1])) + 1; y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]; den = y0 - 2 * y1 + y2
    per = lo - 1 + i + (0.5 * (y0 - y2) / den if den else 0)
    return 1200 * np.log2((sr / per) / f0), y1
def measure(path, OFF, orn=None):
    j = json.load(open(path[:-4] + '.json')); x, sr = load(path)
    if orn is not None: j = {**j, 'orn': orn}
    hp = butter(4, 3000, 'highpass', fs=sr, output='sos'); xh = sosfilt(hp, x)
    rms = lambda a, b: 10 * np.log10(np.mean(x[max(0, a):b] ** 2) + 1e-12)
    spans, cents, att, n_after, edges = [], [], 0, 0, []
    for o in j['orn']:
        ps = [[on + OFF, d, m] for on, d, m in o['parts']]; a = int((ps[0][0] + LEAD) * sr); e = int((ps[-1][0] + LEAD + min(ps[-1][1], 0.3)) * sr)
        spans.append(x[a:e])
        for k, (on, d, m) in enumerate(ps):
            s0 = int((on + LEAD) * sr); f0 = 440 * 2 ** ((m - 69) / 12)
            cs = []
            t = 0.012
            while t + 0.025 <= min(d, 0.3) - 0.005:
                c, q = pitch(x[s0 + int(t * sr):s0 + int((t + 0.025) * sr)], sr, f0)
                if c is not None and q > 0.6: cs.append(c)
                t += 0.005
            if cs: cents.append(float(np.mean(cs)))
            if k:
                n_after += 1
                lv = [rms(s0 + int(u * sr), s0 + int((u + 0.005) * sr)) for u in np.arange(-0.0125, 0.0125, 0.0025)]
                before = rms(s0 - int(0.02 * sr), s0 - int(0.012 * sr)); after = rms(s0 + int(0.015 * sr), s0 + int(0.025 * sr))
                if min(lv) < min(before, after) - 3: att += 1
            h1 = np.mean(xh[s0:s0 + int(0.02 * sr)] ** 2) + 1e-14; h2 = np.mean(xh[s0 + int(0.02 * sr):s0 + int(0.06 * sr)] ** 2) + 1e-14
            edges.append(10 * np.log10(h1 / h2))
    c = np.abs(np.array(cents)) if cents else np.array([np.nan])
    return {'ornaments': len(j['orn']), 'notes': sum(len(o['parts']) for o in j['orn']), 'lu': lufs(np.concatenate(spans), sr) if spans else None,
            'pitch_median_abs_cents': round(float(np.median(c)), 1), 'pitch_max_abs_cents': round(float(np.max(c)), 1), 'pitch_measured': len(cents),
            're_attacks': f'{att}/{n_after}', 'edge_db': round(float(np.mean(edges)), 1) if edges else None}
st_p, b_p, a_p = sys.argv[1:4]
off = min(np.arange(0, 0.091, 0.005), key=lambda o: measure(b_p, o)['pitch_median_abs_cents'])
b, a = measure(b_p, off), measure(a_p, off)
s = measure(st_p, off, json.load(open(b_p[:-4] + '.json'))['orn'])
print(json.dumps({'offset_ms': round(off * 1000), 'still_lu': s['lu'], 'before': b, 'after': a, 'gesture_lu': {'before': round(b['lu'] - s['lu'], 2), 'after': round(a['lu'] - s['lu'], 2)}}, indent=1))
