"""Steady sung notes in VocalSet files: python -I segs2.py OUT.json files...
YIN (5 ms hop, 44.1 kHz), a note = a run of at least 0.35 s within 45 cents of one semitone (voiced, loud
enough). Per note: start/end (s), midi, median cents, the vibrato (semi-amplitude of the 3-9 Hz band of
the cent track), the slow wander (RMS under 3 Hz), the level's spread (dB p5-p95 over 20 ms frames)."""
import json, sys
import numpy as np
import librosa

out = sys.argv[1]
res = {}
for p in sys.argv[2:]:
    y, sr = librosa.load(p, sr=44100, mono=True)
    hop = 220
    f0 = librosa.yin(y, fmin=60, fmax=1200, sr=sr, frame_length=4096, hop_length=hop, trough_threshold=0.1)
    rms = librosa.feature.rms(y=y, frame_length=882, hop_length=hop)[0][: len(f0)]
    f0 = f0[: len(rms)]
    thr = 0.08 * np.percentile(rms, 99)
    m = 69 + 12 * np.log2(f0 / 440)
    # smooth over 0.2 s (a vibrato cycle) to decide the note, keep the raw track for measuring
    k = 40
    ms = np.convolve(m, np.ones(k) / k, mode="same")
    segs = []
    i = 0
    n = len(m)
    fs = sr / hop
    while i < n:
        if rms[i] < thr:
            i += 1; continue
        note = round(ms[i]); j = i
        while j < n and rms[j] >= thr and abs(ms[j] - note) < 0.45:
            j += 1
        if (j - i) / fs >= 0.35:
            a, b = i + 8, j - 8  # trim the transitions
            c = 100 * (m[a:b] - note)
            c = c[np.abs(c - np.median(c)) < 150]
            if len(c) > 20:
                med = float(np.median(c))
                X = np.fft.rfft(c - c.mean()); f = np.fft.rfftfreq(len(c), 1 / fs)
                X2 = X.copy(); X2[(f < 3) | (f > 9)] = 0
                vib = float(np.sqrt(2) * np.fft.irfft(X2, len(c)).std())
                X3 = X.copy(); X3[f >= 3] = 0
                wander = float(np.fft.irfft(X3, len(c)).std())
                db = 20 * np.log10(rms[a:b] + 1e-9)
                segs.append(dict(t0=a / fs, t1=b / fs, midi=int(note), cents=med, vib=vib, wander=wander, lvl=float(np.percentile(db, 95) - np.percentile(db, 5)), rms=float(np.mean(rms[a:b]))))
        i = max(j, i + 1)
    res[p] = segs
    print(p.split("/")[-1], " ".join(f"{s['midi']}:{s['t1']-s['t0']:.1f}s/{s['vib']:.0f}c" for s in segs), flush=True)
json.dump(res, open(out, "w"), indent=0)
