"""build_trio.py <iowa dir> <vsco oboe dir> <out dir (public/samples)>: D504, ZELENKA TRIO's winds.

Sources (each in a directory of its own, read as data only):
  - University of Iowa Electronic Music Studios, Musical Instrument Samples (MIS; "may be downloaded and used for
    any projects, without restrictions"): the oboe (oboe I) and the bassoon. The 2012-2014 chromatic fortissimo
    singles (Oboe.ff.Bb3.stereo.aif ... Ab6, Bassoon.ff.Bb1.stereo.aif ... D5; 24-bit stereo) and the 1997 mezzoforte
    scale files (Oboe.mf.C4B4.aiff, Bassoon.mf.C3B3.aiff ...; 16-bit mono, a chromatic run in one file), sliced here.
  - VS Chamber Orchestra 2 Community Edition (Versilian Studios, CC0): the oboe with vibrato (oboe II): its soft
    layer (Oboe_Vib_*_v1) beside the loud one already in public/samples/oboe (v3), and its staccato (Oboe_Stacc_*_v2).

Each Iowa note: mono; onset kept 1 ms before the attack; the steady stretch (0.35 s to 85% of the note's held part)
measured for pitch (autocorrelation, as build_viola.py) and the note retuned by resampling to within a cent of its
name (the 1997 scale files drift; the bassoon's pianissimo by up to 33 cents, which with its 49 dB of noise is why
pp is left out); made LEN s long by crossfading later passages of its own steady stretch onto it (each joined at a
period-matched point, 60 ms equal-power crossfades: the recordings are 1.5-2.4 s, and sampled.ts's made loop then
loops a stretch that is itself already the instrument), a 0.25 s fade at the end; every note's steady loudness
evened (K-weighted, as the audit measures), the mezzoforte layer at the fortissimo's loudness (the layer a colour:
the game sets the level, sampled.ts soft.gain the step); a short note (`Short` sets) cut from the same player's
sustain (its tongued attack kept, held 90 ms, then falling as a tongued staccato falls: 0.5 s); one gain per
instrument, its loudest peak at -1 dBFS. Oboe II's soft layer and staccato matched note by note to its loud layer's
steady loudness. Mono 44.1 kHz 64 kbit/s MP3. Prints the measured and residual cents for sampled.ts."""
import sys, os, glob, re, subprocess, json
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from fractions import Fraction

iowa, vsco, out = sys.argv[1], sys.argv[2], sys.argv[3]
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
FILE = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
SR = 44100
LEN = 3.4


def midi_of(n):
    m = re.match(r"([A-G]b?)(\d)", n)
    return NAMES.index(m.group(1)) + 12 * (int(m.group(2)) + 1)


def fname(m):
    return FILE[m % 12] + str(m // 12 - 1)


def hz_of(m):
    return 440 * 2 ** ((m - 69) / 12)


def f0(seg, sr, guess):
    lo, hi = int(sr / (guess * 1.12)), int(sr / (guess / 1.12))
    seg = seg - seg.mean()
    n = len(seg)
    X = np.fft.rfft(seg, 2 * n)
    ac = np.fft.irfft(X * np.conj(X))[:hi + 2]
    k = lo + int(np.argmax(ac[lo:hi + 1]))
    a, b, c = ac[k - 1], ac[k], ac[k + 1]
    p = k + 0.5 * (a - c) / (a - 2 * b + c)
    return sr / p


def kw_rms(m, sr):
    # crude K-weighting (as the audit's stems.py): a 100 Hz high-pass and +4 dB above 2 kHz
    X = np.fft.rfft(m)
    f = np.fft.rfftfreq(len(m), 1 / sr)
    g = (f / np.sqrt(f ** 2 + 100 ** 2)) * np.where(f > 2000, 10 ** (4 / 20), 1)
    return np.sqrt((np.fft.irfft(X * g, len(m)) ** 2).mean())


def env_of(x, sr, win=0.01):
    w = max(1, int(win * sr))
    return np.sqrt(np.convolve(x ** 2, np.ones(w) / w, "same"))


def trim(x, sr):
    """The note from 1 ms before its attack; its held part's length (the level last over half its peak)."""
    e = env_of(x, sr)
    pk = e.max()
    on = max(0, int(np.argmax(e > pk * 0.03)) - int(0.001 * sr))
    held = np.where(e > pk * 0.5)[0]
    return x[on:].copy(), (held[-1] - on) / sr


def retune(x, sr, m, steady):
    """Measured over the steady stretch, then resampled to its name (within a cent)."""
    a, z = steady
    hz = f0(x[int(a * sr):int(z * sr)], sr, hz_of(m))
    cents = 1200 * np.log2(hz / hz_of(m))
    if abs(cents) > 0.5:
        r = Fraction(2 ** (cents / 1200)).limit_denominator(4000)
        x = resample_poly(x, r.numerator, r.denominator)
    hz2 = f0(x[int(a * sr):int(z * sr)], sr, hz_of(m))
    return x, round(float(cents), 1), round(float(1200 * np.log2(hz2 / hz_of(m))), 1)


def period_join(x, ref, src):
    """The best place near `src` to join on (the waveform there most like `ref`, within a period either way)."""
    p = len(ref)
    best, bi = -2.0, src
    for k in range(max(0, src - p), min(len(x) - p, src + p)):
        c = np.dot(ref, x[k:k + p]) / (np.linalg.norm(x[k:k + p]) * np.linalg.norm(ref) + 1e-12)
        if c > best:
            best, bi = c, k
    return bi


def lengthen(x, sr, m, steady, total):
    """x made `total` s long: later passages of its own steady stretch crossfaded on, period-matched (60 ms, equal power)."""
    a, z = int(steady[0] * sr), int(steady[1] * sr)
    xf = int(0.06 * sr)
    p = max(8, int(sr / hz_of(m)))
    y = x[:z].copy()
    rng = np.random.default_rng(m)
    w = np.linspace(0, np.pi / 2, xf)
    while len(y) < total * sr + xf:
        span = z - a
        take = int(min(span * 0.8, 0.9 * sr))
        start = a + int(rng.integers(0, max(1, span - take - xf)))
        start = period_join(x, y[len(y) - xf:len(y) - xf + p], start)
        seg = x[start:start + take + xf]
        head = y[-xf:] * np.cos(w) + seg[:xf] * np.sin(w)
        y = np.concatenate([y[:-xf], head, seg[xf:]])
    y = y[:int(total * sr)]
    fade = int(0.25 * sr)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y


def shorten(x, sr):
    """A tongued short note from a sustain: its attack kept, held 90 ms, then falling (a 60 ms time constant), 0.5 s in all."""
    n = int(0.5 * sr)
    y = x[:n].copy()
    t = np.arange(len(y)) / sr
    y *= np.where(t < 0.09, 1.0, np.exp(-(t - 0.09) / 0.06))
    y[-int(0.02 * sr):] *= np.linspace(1, 0, int(0.02 * sr))
    return y


def read(f):
    x, sr = sf.read(f)
    if x.ndim > 1:
        x = x.mean(1)
    assert sr == SR, f
    return x


def slice_scale(f, lo, hi):
    """
    A 1997 scale file cut into its notes (lo..hi chromatic, played nearly legato: the gaps between notes are often
    only a dip of 10-20 dB). By pitch: each 46 ms frame (hop 12 ms) labelled with the note whose period it repeats
    best (normalised autocorrelation at that note's period; within one file no two candidates are an octave apart),
    where it is over -35 dB and that correlation over 0.8; each note the longest run of its label (gaps of up to 3
    frames bridged), from 40 ms before it (the tongue) to its end.
    """
    x = read(f)
    n, hop = 2048, 512
    e = env_of(x, SR, 0.02)
    pk = e.max()
    cands = list(range(lo, hi + 1))
    lags = [SR / hz_of(m) for m in cands]
    labels = []
    for i in range(0, len(x) - n - int(max(lags)) - 2, hop):
        if e[i + n // 2] < pk * 10 ** (-35 / 20):
            labels.append(-1)
            continue
        seg = x[i:i + n]
        best, bm = 0.0, -1
        for m, L in zip(cands, lags):
            k = int(L)
            fr = L - k
            sh = (1 - fr) * x[i + k:i + k + n] + fr * x[i + k + 1:i + k + 1 + n]
            r = np.dot(seg, sh) / (np.linalg.norm(seg) * np.linalg.norm(sh) + 1e-12)
            if r > best:
                best, bm = r, m
        labels.append(bm if best > 0.8 else -1)
    out_notes = {}
    for m in cands:
        runs, s, gap = [], None, 0
        for j, lab in enumerate(labels + [-1] * 5):
            if lab == m:
                if s is None:
                    s = j
                gap, last = 0, j
            elif s is not None:
                gap += 1
                if gap > 3:
                    runs.append((s, last))
                    s, gap = None, 0
        if not runs:
            print("  ! no note", m, "in", os.path.basename(f), file=sys.stderr)
            continue
        a, z = max(runs, key=lambda r: r[1] - r[0])
        if (z - a) * hop / SR < 0.6:
            print("  ! short note", m, "in", os.path.basename(f), (z - a) * hop / SR, file=sys.stderr)
        out_notes[m] = x[max(0, a * hop - int(0.04 * SR)):z * hop + n]
    return out_notes


def write_set(name, notes, gain):
    d = os.path.join(out, name)
    os.makedirs(d, exist_ok=True)
    for m, y in sorted(notes.items()):
        tmp = os.path.join(d, "_t.wav")
        sf.write(tmp, np.clip(y * gain, -1, 1), SR, subtype="PCM_16")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", str(SR), "-codec:a", "libmp3lame", "-b:a", "64k", os.path.join(d, fname(m) + ".mp3")], check=True)
        os.remove(tmp)


def peak_gain(*sets):
    """One gain for sets heard together: their loudest peak at -1 dBFS."""
    return 10 ** (-1 / 20) / max(np.abs(y).max() for d in sets for y in d.values())


def sustained(raw, m):
    """One sustained note made ready: trimmed, retuned, lengthened."""
    x, held = trim(raw, SR)
    steady = (0.35, max(0.7, 0.85 * held))
    x, c0, c1 = retune(x, SR, m, steady)
    loud = kw_rms(x[int(steady[0] * SR):int(steady[1] * SR)], SR)
    return lengthen(x, SR, m, steady, LEN), x, c0, c1, loud


report = {}


def build(inst, ff_glob, mf_files, lo, hi):
    ff, mf, short, res, meas = {}, {}, {}, {}, {}
    for f in sorted(glob.glob(os.path.join(iowa, ff_glob))):
        m = midi_of(re.search(r"\.ff\.([A-G]b?\d)\.", f).group(1))
        if m < lo or m > hi:
            continue
        y, x, c0, c1, loud = sustained(read(f), m)
        ff[m] = y / loud
        short[m] = shorten(x, SR) / loud
        res[fname(m)] = c1
        meas[fname(m)] = c0
    for f, a, b in mf_files:
        for m, raw in slice_scale(os.path.join(iowa, f), a, b).items():
            if m < lo or m > hi:
                continue
            y, x, c0, c1, loud = sustained(raw, m)
            mf[m] = y / loud
            res["mf " + fname(m)] = c1
            meas["mf " + fname(m)] = c0
    g = peak_gain(ff, mf, short)
    write_set(inst, ff, g)
    write_set(inst + "Mf", mf, g)
    write_set(inst + "Short", short, g)
    report[inst] = {"notes": [len(ff), len(mf), len(short)], "measured": meas, "residual": res}


build("trioOboe", "Oboe.ff.*.stereo.aif", [("Oboe.mf.Bb3B3.aiff", 58, 59), ("Oboe.mf.C4B4.aiff", 60, 71), ("Oboe.mf.C5B5.aiff", 72, 83), ("Oboe.mf.C6Ab6.aiff", 84, 92)], 58, 92)
build("trioBassoon", "Bassoon.ff.*.stereo.aif", [("Bassoon.mf.Bb1B1.aiff", 34, 35), ("Bassoon.mf.C2B2.aiff", 36, 47), ("Bassoon.mf.C3B3.aiff", 48, 59), ("Bassoon.mf.C4B4.aiff", 60, 71), ("Bassoon.mf.C5D5.aiff", 72, 74)], 34, 74)

# Oboe II: VSCO's vibrato oboe: its soft layer (v1) beside the loud one already in public/samples/oboe (v3), and its
# staccato; each note's steady loudness matched to the loud layer's note (the layer a colour), the staccato's first
# 0.15 s to the same.
VS = {"As2": 58, "D3": 62, "F3": 65, "As3": 70, "D4": 74, "F4": 77, "As4": 82, "D5": 86, "F5": 89}
soft, stac, res_soft, res_stac = {}, {}, {}, {}
for n, m in VS.items():
    lx, _ = sf.read(os.path.join(out, "oboe", fname(m) + ".mp3"))
    if lx.ndim > 1:
        lx = lx.mean(1)
    ref = kw_rms(lx[int(0.5 * SR):int(3.0 * SR)], SR)
    x, _ = trim(read(os.path.join(vsco, f"Oboe_Vib_{n}_v1.wav")), SR)
    x = x[:int(4.5 * SR)]
    x[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
    hz = f0(x[int(1.0 * SR):int(3.0 * SR)], SR, hz_of(m))
    res_soft[fname(m)] = round(float(1200 * np.log2(hz / hz_of(m))), 1)
    soft[m] = x * ref / kw_rms(x[int(0.5 * SR):int(3.0 * SR)], SR)
    y, _ = trim(read(os.path.join(vsco, f"Oboe_Stacc_{n}_v2.wav")), SR)
    y = y[:int(0.6 * SR)]
    y[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    hz = f0(y[int(0.03 * SR):int(0.18 * SR)], SR, hz_of(m))
    res_stac[fname(m)] = round(float(1200 * np.log2(hz / hz_of(m))), 1)
    stac[m] = y * ref / kw_rms(y[:int(0.15 * SR)], SR)
write_set("oboeSoft", soft, 1.0)
write_set("oboeStac", stac, 1.0)
report["oboeSoft"] = res_soft
report["oboeStac"] = res_stac
print(json.dumps(report))
