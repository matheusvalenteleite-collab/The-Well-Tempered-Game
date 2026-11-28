#!/usr/bin/env python3
# D1076: the clips and traces for public/dev/shake-slur2/ (the ornament slurs of the winds, the sung voices and the strings, and the
# sway onto the brass's lip vibrato and the organ's tremulant). Reads <dir>/<name>.wav and <name>.json of render.cjs's jobs
# (<inst>-today and <inst>-slur for the trills; lip-today / lip-sway and trem-today / trem-sway for the sways), cuts the window round
# the ornament (or the held notes), writes <out>/<name>.mp3 and <out>/traces.json, in the shape of shake-page.py's:
#   trills: the written notes, the pitch heard (autocorrelation, 25 ms frames every 10 ms, within 150 cents of the written note
#           sounding then) and the loudness (the phone model: two 600 Hz high-passes, 50 ms RMS every 10 ms);
#   sways:  the thumb's place across its bar (from the render's touches), the pitch heard in cents from the median of the
#           note's own pitch (a 40 ms frame every 10 ms), and the loudness.
# Also prints the numbers the decision row quotes (per-note pitch error against the print, the trill's level against the held note).
# usage: python3 -I shake-page2.py <render dir> <out dir>
import sys, json, wave, subprocess, os
import numpy as np
from scipy.signal import butter, sosfilt
LEAD, DT = 0.05, 0.01
TRILLS = ['oboe', 'flute', 'bassoon', 'singers', 'vocal', 'violin']
SWAYS = {'lip': ('lip-today', 'lip-sway'), 'trem': ('trem-today', 'trem-sway')}
src, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
def load(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, w.getframerate()
def pitch(fr, sr, f0, span=150):
    fr = fr - fr.mean()
    lo, hi = int(sr / (f0 * 2 ** (span / 1200))), int(np.ceil(sr / (f0 * 2 ** (-span / 1200))))
    if hi + 2 >= len(fr) or np.dot(fr, fr) < 1e-7: return None
    ac = np.array([np.dot(fr[:-L], fr[L:]) / np.sqrt(np.dot(fr[:-L], fr[:-L]) * np.dot(fr[L:], fr[L:]) + 1e-12) for L in range(lo - 1, hi + 2)])
    i = int(np.argmax(ac[1:-1])) + 1
    if ac[i] < 0.6: return None
    y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]; den = y0 - 2 * y1 + y2
    per = lo - 1 + i + (0.5 * (y0 - y2) / den if den else 0)
    return 69 + 12 * np.log2((sr / per) / 440)
def mp3(seg, sr, name):
    tmp = f'{out}/_t.wav'; w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(seg, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', '24000', '-b:a', '96k', f'{out}/{name}.mp3'], check=True); os.unlink(tmp)
def loud_of(seg, sr, n):
    hp = butter(2, 600, 'highpass', fs=sr, output='sos'); y = sosfilt(hp, sosfilt(hp, seg))
    L = []
    for k in range(n):
        c = int(k * DT * sr); r = y[max(0, c - int(0.025 * sr)):c + int(0.025 * sr)]
        L.append(round(float(10 * np.log10(np.mean(r ** 2) + 1e-12)), 1))
    return L
def fit_offset(seg, sr, notes):
    # the scheduling delay of the shake read: the offset (0-90 ms) at which the most frames agree with the print
    best, bo = -1, 0.0
    for off in np.arange(0, 0.091, 0.005):
        good = 0
        for on, d, m in notes[:12]:
            tt = on + off + d * 0.6
            f0 = 440 * 2 ** ((m - 69) / 12); fr = seg[int((tt - 0.0125) * sr):int((tt + 0.0125) * sr)]
            if len(fr) < int(0.02 * sr): continue
            p = pitch(fr, sr, f0, 100)
            if p is not None and abs(p - m) < 0.5: good += 1
        if good > best: best, bo = good, off
    return float(bo)
traces, facts = {}, {}
for inst in TRILLS:
    a, b = f'{inst}-today', f'{inst}-slur'
    ja = json.load(open(f'{src}/{a}.json')); xa, sr = load(f'{src}/{a}.wav')
    parts = max(ja['orn'], key=lambda o: len(o['parts']))['parts']
    t0 = max(0.0, parts[0][0] + LEAD - 0.3); t1 = min(len(xa) / sr, parts[-1][0] + parts[-1][1] + LEAD + 0.9)
    off = fit_offset(xa[int(t0 * sr):int(t1 * sr)], sr, [[on + LEAD - t0, d, m] for on, d, m in parts])
    facts[inst] = {'n': len(parts), 'offset': off, 'span': [round(t0, 2), round(t1, 2)]}
    for name in (a, b):
        j = json.load(open(f'{src}/{name}.json')); x, sr = load(f'{src}/{name}.wav')
        pp = max(j['orn'], key=lambda o: len(o['parts']))['parts']
        notes = [[round(on + off + LEAD - t0, 3), d, m] for on, d, m in pp]
        seg = x[int(t0 * sr):int(t1 * sr)]
        mp3(seg, sr, name)
        n = int((t1 - t0) / DT)
        loud = loud_of(seg, sr, n)
        pit, errs = [], []
        for k in range(n):
            tt = k * DT
            cur = [m for on, d, m in notes if on <= tt < on + max(d, 0.05)]
            if not cur: pit.append(None); continue
            f0 = 440 * 2 ** ((cur[-1] - 69) / 12)
            fr = seg[int(max(0, tt - 0.0125) * sr):int((tt + 0.0125) * sr)]
            m = pitch(fr, sr, f0) if len(fr) > int(0.02 * sr) else None
            pit.append(None if m is None else round(float(m), 2))
        # per-note pitch error (cents) from 40 ms into the note to its end, the median
        for on, d, m in notes[1:-1]:
            fr_ps = [pit[k] for k in range(int((on + 0.04) / DT), min(n, int((on + d) / DT))) if pit[k] is not None]
            if fr_ps: errs.append(abs(float(np.median(fr_ps)) - m) * 100)
        lv = [10 ** (loud[k] / 10) for k in range(int(notes[0][0] / DT), int(min(t1 - t0, notes[-1][0] + notes[-1][1]) / DT))]
        traces[name] = {'dt': DT, 'notes': [[a_, round(min(d_, t1 - t0 - a_), 3), m_] for a_, d_, m_ in notes], 'pitch': pit, 'loud': loud}
        facts[inst][name] = {'median_cents': round(float(np.median(errs)), 1) if errs else None, 'max_cents': round(float(np.max(errs)), 1) if errs else None, 'trill_db': round(float(10 * np.log10(np.mean(lv))), 1)}
for kind, (a, b) in SWAYS.items():
    for name in (a, b):
        j = json.load(open(f'{src}/{name}.json')); x, sr = load(f'{src}/{name}.wav')
        sw = j['swayed']
        t0 = max(0.0, sw[0]['at'] + LEAD - 0.3); t1 = min(len(x) / sr, sw[0]['at'] + sw[0]['dur'] + LEAD + 1.0)
        # the longest swayed note: the window
        ln = max(sw, key=lambda s: s['dur']); t0 = max(0.0, ln['at'] + LEAD - 0.3); t1 = min(len(x) / sr, ln['at'] + ln['dur'] + LEAD + 0.8)
        seg = x[int(t0 * sr):int(t1 * sr)]
        mp3(seg, sr, name)
        n = int((t1 - t0) / DT)
        loud = loud_of(seg, sr, n)
        midi = ln['midi']; f0 = 440 * 2 ** ((midi - 69) / 12)
        pit = []
        for k in range(n):
            tt = k * DT
            fr = seg[int(max(0, tt - 0.02) * sr):int((tt + 0.02) * sr)]
            m = pitch(fr, sr, f0, 100) if len(fr) > int(0.03 * sr) else None
            pit.append(None if m is None else round(float((m - midi) * 100), 1))
        # the thumb across the bar: from the touches' moves (px from the bar's inner edge, as a share of the screen's width)
        # the thumb's sway as the game reads it (touch-expr.ts holdValue): its distance across the bar from where it landed, in
        # half bars (0 still, 1 the full sway), for the held note's own touch
        down = min((tt for tt in j['touches'] if tt['k'] == 'down' and tt['side']), key=lambda tt: abs(tt['t'] - ln['at']))
        W = j['W']
        mv = [(round(tt['t'] - t0 + LEAD, 3), min(1.0, abs(tt['x'] - down['x']) / (W * 0.22) / 0.5)) for tt in j['touches'] if tt['k'] == 'move' and tt['id'] == down['id']]
        thumb = [round(float(np.interp(k * DT, [a for a, b in mv], [b for a, b in mv], left=0, right=0)), 3) for k in range(n)]
        traces[name] = {'dt': DT, 'midi': midi, 'loud': loud, 'cents': pit, 'thumb': thumb}
        # the held note itself (from 0.4 s in to 0.15 s before its end): the vibrato's size is the pitch's spread about its slow
        # drift (a 0.4 s moving median), as the peak (sd x sqrt 2); the loudness its mean and the span of its 5th to 95th percentile
        a_, e_ = int((ln['at'] + LEAD - t0 + 0.4) / DT), int((ln['at'] + LEAD - t0 + ln['dur'] - 0.15) / DT)
        v = np.array([np.nan if p is None else p for p in pit[a_:e_]])
        ok = ~np.isnan(v)
        slow = np.array([np.nanmedian(v[max(0, i - 20):i + 21]) if ok[max(0, i - 20):i + 21].any() else np.nan for i in range(len(v))])
        dev = (v - slow)[ok]
        lvk = [10 ** (loud[k] / 10) for k in range(a_, e_)]
        facts[name] = {'vib_peak_cents': round(float(np.std(dev) * 2 ** 0.5), 1) if len(dev) else None, 'frames_pitched': f'{int(ok.sum())}/{len(v)}',
                       'level_span_db': round(float(np.percentile(loud[a_:e_], 95) - np.percentile(loud[a_:e_], 5)), 1), 'mean_db': round(float(10 * np.log10(np.mean(lvk))), 1)}
json.dump(traces, open(f'{out}/traces.json', 'w'), separators=(',', ':'))
json.dump(facts, open(f'{out}/facts.json', 'w'), indent=1)
print(json.dumps(facts, indent=1))
