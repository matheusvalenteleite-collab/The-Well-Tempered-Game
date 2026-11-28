#!/usr/bin/env python3
# D1070: the listening page's clips and traces for public/dev/shake-slur/ (the ornament slurs: brass, GAME BOY, SWITCHED-ON, guitar).
# Reads <dir>/<name>.wav and <name>.json of render.cjs's jobs (<inst>-today and <inst>-slur / guitar-hammer), cuts the window
# round the ornament, writes <out>/<name>.mp3 and <out>/traces.json (the written notes, the pitch heard, the loudness):
# the same shape as the strings slide page (D1072): pitch (autocorrelation, 25 ms frames every 10 ms, within 150 cents of the
# written note sounding then) and loudness (the phone model: two 600 Hz high-passes, 50 ms RMS every 10 ms).
# usage: python3 -I shake-page.py <render dir> <out dir>
import sys, json, wave, subprocess, os
import numpy as np
from scipy.signal import butter, sosfilt
LEAD, DT = 0.05, 0.01
WIN = {'brass': (0.0, 5.3), 'gameboy': (0.0, 5.3), 'analog': (0.0, 5.3), 'guitar': (6.0, 9.4)}
PAIRS = {'brass': ('brass-today', 'brass-slur'), 'gameboy': ('gameboy-today', 'gameboy-slur'), 'analog': ('analog-today', 'analog-slur'), 'guitar': ('guitar-today', 'guitar-hammer')}
src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
def load(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, w.getframerate()
def pitch(fr, sr, f0):
    fr = fr - fr.mean()
    lo, hi = int(sr / (f0 * 2 ** (150 / 1200))), int(np.ceil(sr / (f0 * 2 ** (-150 / 1200))))
    if hi + 2 >= len(fr) or np.dot(fr, fr) < 1e-7: return None
    ac = np.array([np.dot(fr[:-L], fr[L:]) / np.sqrt(np.dot(fr[:-L], fr[:-L]) * np.dot(fr[L:], fr[L:]) + 1e-12) for L in range(lo - 1, hi + 2)])
    i = int(np.argmax(ac[1:-1])) + 1
    if ac[i] < 0.6: return None
    y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]; den = y0 - 2 * y1 + y2
    per = lo - 1 + i + (0.5 * (y0 - y2) / den if den else 0)
    return 69 + 12 * np.log2((sr / per) / 440)
traces = {}
for inst, (a, b) in PAIRS.items():
    t0, t1 = WIN[inst]
    off = {'brass': 0.04, 'gameboy': 0.03, 'analog': 0.005, 'guitar': 0.04}[inst]  # the scheduling delay of the shake read (shake.py's best match)
    for name in (a, b):
        j = json.load(open(f'{src}/{name}.json')); x, sr = load(f'{src}/{name}.wav')
        parts = j['orn'][0]['parts']
        notes = [[round(on + off + LEAD - t0, 3), d, m] for on, d, m in parts]  # in the window's own audio time
        # the window's audio, as mp3
        seg = x[int((t0) * sr):int((t1) * sr)]
        tmp = f'{out}/_t.wav'; w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(seg, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', '24000', '-b:a', '96k', f'{out}/{name}.mp3'], check=True); os.unlink(tmp)
        hp = butter(2, 600, 'highpass', fs=sr, output='sos'); y = sosfilt(hp, sosfilt(hp, seg))
        n = int((t1 - t0) / DT)
        pit, loud = [], []
        for k in range(n):
            tt = k * DT
            c = int((tt) * sr); r = y[max(0, c - int(0.025 * sr)):c + int(0.025 * sr)]
            loud.append(round(float(10 * np.log10(np.mean(r ** 2) + 1e-12)), 1))
            cur = [m for on, d, m in notes if on <= tt < on + max(d, 0.05)]
            if not cur: pit.append(None); continue
            f0 = 440 * 2 ** ((cur[-1] - 69) / 12)
            fr = seg[int(max(0, tt - 0.0125) * sr):int((tt + 0.0125) * sr)]
            m = pitch(fr, sr, f0) if len(fr) > int(0.02 * sr) else None
            pit.append(None if m is None else round(float(m), 2))
        traces[name] = {'dt': DT, 'notes': [[a_, round(min(d_, t1 - t0 - a_), 3), m_] for a_, d_, m_ in notes], 'pitch': pit, 'loud': loud}
json.dump(traces, open(f'{out}/traces.json', 'w'), separators=(',', ':'))
print('ok', {k: len(v['loud']) for k, v in traces.items()})
