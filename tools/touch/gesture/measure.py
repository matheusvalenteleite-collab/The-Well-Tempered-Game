#!/usr/bin/env python3
# D1014-D1017: a gesture's before and after, the player's voice alone (render.cjs solo "player").
# Loudness: ffmpeg ebur128 integrated (LUFS), full range and through the phone model (two 2nd-order 600 Hz high-passes,
# bass-phone/measure.py's). Pitch: on each swayed note (the render's json: its MIDI and time), every 10 ms a 40 ms frame's
# period found by normalised autocorrelation within +-150 cents of the written pitch (parabolic peak), in cents from it;
# reported: each render's mean and the after-minus-before per frame (mean, mean |x|, 95th percentile |x|).
# Brightness: the spectral centroid (Hz) over the swayed notes. The gesture's own loudness: the swayed notes alone (cut out and
# joined, ebur128 integrated, phone model) against the same notes with the thumb still (`still`: sway amp 0).
# usage: python3 -I measure.py <still.wav> <before.wav> <after.wav> [--skip s (pitch frames from s after the onset; 0.06)] [--q min (0.8)]
import sys, json, re, subprocess
import numpy as np, wave

def lufs(path, phone):
    af = ('highpass=f=600,highpass=f=600,' if phone else '') + 'ebur128'
    out = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', af, '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+|-inf) LUFS', out)
    return float(m[-1]) if m and m[-1] != '-inf' else -99.0

def load(path):
    w = wave.open(path)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    return x, w.getframerate()

SKIP = float(sys.argv[sys.argv.index('--skip') + 1]) if '--skip' in sys.argv else 0.06
QMIN = float(sys.argv[sys.argv.index('--q') + 1]) if '--q' in sys.argv else 0.8
def track(x, sr, notes, lead=0.05):
    out = []  # (note index, frame time, cents)
    for k, n in enumerate(notes):
        if n['midi'] is None: continue
        f0 = 440 * 2 ** ((n['midi'] - 69) / 12)
        a, e = n['at'] + lead + SKIP, n['at'] + lead + n['dur'] - 0.03
        t = a
        while t + 0.04 <= e:
            fr = x[int(t * sr):int((t + 0.04) * sr)]
            if len(fr) < 64: break
            fr = fr - fr.mean()
            if np.sqrt((fr ** 2).mean()) < 1e-4: t += 0.01; continue
            lo, hi = int(sr / (f0 * 2 ** (150 / 1200))), int(np.ceil(sr / (f0 * 2 ** (-150 / 1200))))
            ac = np.array([np.dot(fr[:-L], fr[L:]) / np.sqrt(np.dot(fr[:-L], fr[:-L]) * np.dot(fr[L:], fr[L:]) + 1e-12) for L in range(lo - 1, hi + 2)])
            i = int(np.argmax(ac[1:-1])) + 1
            y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]
            d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0
            per = lo - 1 + i + d
            out.append((k, round(t, 2), 1200 * np.log2((sr / per) / f0), y1))
            t += 0.01
    return out

def centroid(x, sr, notes, lead=0.05):
    cs = []
    for n in notes:
        fr = x[int((n['at'] + lead + 0.05) * sr):int((n['at'] + lead + n['dur'] - 0.02) * sr)]
        if len(fr) < 512: continue
        S = np.abs(np.fft.rfft(fr * np.hanning(len(fr))))
        f = np.fft.rfftfreq(len(fr), 1 / sr)
        cs.append((S * f).sum() / (S.sum() + 1e-12))
    return float(np.mean(cs)) if cs else 0.0

import tempfile, os
def sway_lufs(x, sr, notes, lead=0.05):
    seg = np.concatenate([x[int((n['at'] + lead) * sr):int((n['at'] + lead + n['dur']) * sr)] for n in notes])
    fd, tmp = tempfile.mkstemp(suffix='.wav'); os.close(fd)
    w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(seg, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    v = lufs(tmp, True); os.unlink(tmp); return v

from scipy.signal import butter, sosfilt
def frames(x, sr, notes, lead=0.05):
    # Every 10 ms a 40 ms frame of each swayed note: its level through the phone model (dB) and its third-octave bands (dB).
    sos = butter(2, 600, 'highpass', fs=sr, output='sos')
    xp = sosfilt(sos, sosfilt(sos, x))
    edges = 200 * 2 ** (np.arange(0, 16) / 3)
    out = {}
    for k, n in enumerate(notes):
        t = n['at'] + lead + 0.06
        while t + 0.04 <= n['at'] + lead + n['dur'] - 0.03:
            i, j = int(t * sr), int((t + 0.04) * sr)
            if j > len(x): break
            lv = 10 * np.log10((xp[i:j] ** 2).mean() + 1e-12)
            S = np.abs(np.fft.rfft(x[i:j] * np.hanning(j - i))) ** 2
            f = np.fft.rfftfreq(j - i, 1 / sr)
            bands = np.array([10 * np.log10(S[(f >= lo) & (f < hi)].sum() + 1e-12) for lo, hi in zip(edges[:-1], edges[1:])])
            out[(k, round(t, 2))] = (lv, bands - lv)
            t += 0.01
    return out
def vs_still(fa, f0):
    ks = [k for k in fa if k in f0]
    dl = np.array([fa[k][0] - f0[k][0] for k in ks])
    ds = np.array([np.abs(fa[k][1] - f0[k][1]).mean() for k in ks])
    return {'level_mean_abs_db': round(float(np.abs(dl).mean()), 2), 'level_p95_abs_db': round(float(np.percentile(np.abs(dl), 95)), 2), 'timbre_db': round(float(ds.mean()), 2)}

s0, b, a = sys.argv[1], sys.argv[2], sys.argv[3]
jb = json.load(open(b[:-4] + '.json'))
notes = jb['swayed']
xb, sr = load(b)
xa, _ = load(a)
r = {'before': {'lufs': lufs(b, False), 'phone': lufs(b, True), 'centroid': centroid(xb, sr, notes)},
     'after': {'lufs': lufs(a, False), 'phone': lufs(a, True), 'centroid': centroid(xa, sr, notes)}}
x0, _ = load(s0)
st = sway_lufs(x0, sr, notes)
r['sway_notes_phone_lufs'] = {'still': st, 'before': sway_lufs(xb, sr, notes), 'after': sway_lufs(xa, sr, notes)}
r['gesture_lu_phone'] = {'before': round(r['sway_notes_phone_lufs']['before'] - st, 2), 'after': round(r['sway_notes_phone_lufs']['after'] - st, 2)}
r['still_centroid'] = centroid(x0, sr, notes)
F0 = frames(x0, sr, notes)
r['vs_still'] = {'before': vs_still(frames(xb, sr, notes), F0), 'after': vs_still(frames(xa, sr, notes), F0)}
r['delta_lu'] = round(r['after']['lufs'] - r['before']['lufs'], 2)
r['delta_lu_phone'] = round(r['after']['phone'] - r['before']['phone'], 2)
tb, ta = track(xb, sr, notes), track(xa, sr, notes)
mb = {(k, t): c for k, t, c, q in tb if q > QMIN}
ma = {(k, t): c for k, t, c, q in ta if q > QMIN}
both = [ma[k] - mb[k] for k in ma if k in mb]
if both:
    d = np.array(both)
    r['pitch'] = {'frames': len(d), 'before_mean_cents': round(float(np.mean(list(mb.values()))), 2), 'after_mean_cents': round(float(np.mean(list(ma.values()))), 2),
                  'diff_mean_cents': round(float(d.mean()), 2), 'diff_mean_abs': round(float(np.abs(d).mean()), 2), 'diff_p95_abs': round(float(np.percentile(np.abs(d), 95)), 2)}
    per = {}
    for (k, t), c in ma.items():
        if (k, t) in mb: per.setdefault(k, []).append(c - mb[(k, t)])
    r['pitch']['per_note_mean_max_abs'] = round(max(abs(float(np.mean(v))) for v in per.values()), 2)
print(json.dumps(r, indent=1))
