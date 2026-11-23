# per render: the phone model (mono, two 2nd-order 600 Hz high-passes); the scale's notes (0.05-0.45 s each) and the holds (0.8-3.8 s)
import numpy as np, json, sys, os
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
D, META = sys.argv[1], json.load(open(sys.argv[2]))
def load(n):
    sr, x = wavfile.read(f'{D}/{n}.wav'); x = x.astype(float).mean(1) / 32768
    hp = butter(2, 600, 'hp', fs=sr, output='sos'); return sr, x, sosfilt(hp, sosfilt(hp, x))
def bands(y, sr):
    Y = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2; f = np.fft.rfftfreq(len(y), 1 / sr)
    tot = Y[(f > 50) & (f < 12000)].sum()
    return Y, f, tot
out = {}
for n, m in META.items():
    if not os.path.exists(f'{D}/{n}.wav'): continue
    sr, x, xp = load(n); r = {}
    if m['kind'] == 'scale':
        H, C, P, L, I = [], [], [], [], []
        for k, mid in enumerate(m['midis']):
            t = 0.5 + k * 0.6; y = xp[int((t + 0.05) * sr):int((t + 0.45) * sr)]
            Y, f, tot = bands(y, sr); H.append(Y[(f >= 2000) & (f <= 5000)].sum() / tot)
            C.append(float((Y[(f > 50) & (f < 12000)] * f[(f > 50) & (f < 12000)]).sum() / tot))
            f0 = 440 * 2 ** ((mid - 69) / 12); sel = (f > 600) & (f < 8000); near = np.zeros_like(f, bool)
            for h in range(1, int(8000 / f0) + 1): near |= np.abs(f - h * f0) < 0.03 * h * f0 + 6
            I.append(10 * np.log10(Y[sel & ~near].sum() / Y[sel & near].sum()))
            P.append(np.abs(y).max() / (np.sqrt((y ** 2).mean()) + 1e-12)); L.append(10 * np.log10((y ** 2).mean() + 1e-20))
        r = dict(harsh_2_5k_pct=round(100 * float(np.median(H)), 1), centroid_hz=round(float(np.median(C))), crest_db=round(float(20 * np.log10(np.median(P))), 1), inharmonic_db=round(float(np.median(I)), 1), level_db=round(float(10 * np.log10(np.mean(10 ** (np.array(L) / 10)))), 1))
    else:
        R = []
        for k, mid in enumerate(m['midis']):
            t = 0.5 + k * 5; y = xp[int((t + 0.8) * sr):int((t + 3.8) * sr)]
            Y, f, tot = bands(y, sr); f0 = 440 * 2 ** ((mid - 69) / 12)
            # energy near the partials (within 3 % of k*f0) against the energy between them, 600 Hz-8 kHz: the noise and the
            # distortion's inharmonic products (a held bowed note's own bow noise included: compared across candidates)
            sel = (f > 600) & (f < 8000); near = np.zeros_like(f, bool)
            for h in range(1, int(8000 / f0) + 1): near |= np.abs(f - h * f0) < 0.03 * h * f0 + 6
            R.append(10 * np.log10(Y[sel & ~near].sum() / Y[sel & near].sum()))
            h = int(0.02 * sr); e = 20 * np.log10(np.sqrt((y[:len(y) // h * h].reshape(-1, h) ** 2).mean(1)) + 1e-9)
        r = dict(inharmonic_db=[round(float(v), 1) for v in R])
    out[n] = r
json.dump(out, open(f'{D}/metrics.json', 'w'), indent=1)
for n, r in out.items(): print(n, json.dumps(r))
