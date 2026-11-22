"""build_consort.py <TinySOL Strings dir> <out dir (public/samples)> [--dry]: D1011, STRING CONSORT's own violin and cello
(violinSolo/, celloSolo/) from TinySOL (IRCAM, CC BY 4.0, zenodo.org/records/3685367), ordinario mf, a recording every two or
three semitones (the violin G3-C#7: 17, the cello C2-D#5: 14; STRING CONSORT keeps them all, sound.ts slim.strides 2), so no note
is read more than 1.5 semitones from a recording.

The pitches and each pitch's string (TinySOL records most notes on two to four strings) chosen by dynamic programming from the
lowest to the highest, steps of 2 or 3 semitones, at the least cost: each step's brightness change (the spectral centroid, 50 Hz-
12 kHz, as a ratio to the pitch: the mean over 0.05-0.45 s and 0.5-3 s; octaves), STEP_COST a recording, RIPPLE_COST a dB of held
ripple over 3, and LEAN toward the darker recording (the cello). Files TinySOL itself made by resampling another pitch
("R100u"/"R100d") are not taken. Each note: mono; onset kept 1 ms before the bow's attack; its pitch measured over 1-3 s
(autocorrelation, as build_viola.py) and retuned by resampling to within a cent of its name; 4.5 s with a 0.3 s fade (the
recordings are 6-12 s: sampled.ts's made loop, WIND_LOOP 1.4-3.6 s, lies in the steady stretch); the held tone's slow swell
evened (flatten); the violin's onset quickened (ATTACK); its level evened on both the start a short note plays (0.05-0.45 s) and
the held tone (0.5-3 s), K-weighted as the audit measures, the mean of the two, then each recording's trim measured through the
engine (ENGINE_DB); one gain per instrument, its loudest peak at -1 dBFS. Mono 44.1 kHz 80 kbit/s MP3 (as violaSolo/); then
node tools/playback/codec/transcode.mjs and node tools/sample-manifest.mjs. Prints per note the file taken, the cents measured
and left, the brightness, the levels before evening, the trim and the ripple."""
import sys, os, glob, re, subprocess, json
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from fractions import Fraction

src, out = sys.argv[1], sys.argv[2]
DRY = "--dry" in sys.argv
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
SETS = {"violinSolo": ("Violin", "Vn", (55, 97)), "celloSolo": ("Violoncello", "Vc", (36, 75))}
# The violin's onset quickened (attack): TinySOL's violin at mf takes 110-300 ms to half its held level and 180-470 ms to 90 %
# (the VSO2 violin it replaces 5-70 and 20-140): a fugue's quick notes on it were soft-edged and blurred into the viola (TinySOL's
# too, as slow). Its rise brought up to a 60 ms ramp to the held level (a gain under the 30 ms envelope, at most +9 dB, gone by
# 0.4 s): the bow's own start kept, sooner at full voice. The cello's onsets kept as recorded (they are quicker).
ATTACK = {"violinSolo": 0.06}
# A lean in the choice toward the darker string (the cello: the C and G strings' covered tone, a cello's own against the viola's,
# TinySOL's too): LEAN a step for each octave of brightness, so a recording 0.5 octave darker wins over a step 0.1 more even.
LEAN = {"celloSolo": 0.6}
STEP_COST = 0.15
# and a held note's ripple over 3 dB (its vibrato's swell, 0.8-3.8 s, 95th-5th percentile of 20 ms frames, after flatten) at this a dB
RIPPLE_COST = 0.1
# Each recording's trim (dB) measured through the game's engine (STRING CONSORT, the phone context: a chromatic scale of 0.5 s
# notes, each note's level over 0.05-0.45 s as phase 2 measured it): the steps between neighbouring notes least-squares
# minimised where one recording hands over to the next, held near one level (weight 0.3), within ±6 dB.
ENGINE_DB = {
    "violinSolo": {"G3": -0.8, "As3": -0.7, "C4": -0.8, "D4": -1.8, "F4": -0.9, "Gs4": -0.0, "B4": -0.3, "Cs5": -0.4, "E5": 0.1, "G5": -0.5, "A5": 0.5, "C6": 1.6, "Ds6": 0.4, "Fs6": 0.2, "Gs6": 2.1, "As6": 1.3, "Cs7": 2.6},
    "celloSolo": {"C2": 1.4, "Ds2": 1.6, "Fs2": 2.9, "A2": 0.6, "C3": 1.5, "Ds3": 0.4, "Fs3": 0.7, "A3": 0.1, "C4": -1.0, "Ds4": -1.5, "Fs4": -2.2, "A4": -0.7, "C5": -3.7, "Ds5": 0.0},
}
LEN, FADE = 4.5, 0.3


def midi_of(n):
    m = re.match(r"([A-G]#?)(-?\d)", n)
    return NAMES.index(m.group(1)) + 12 * (int(m.group(2)) + 1)


def fname(m):
    return NAMES[m % 12].replace("#", "s") + str(m // 12 - 1)


def hz_of(m):
    return 440 * 2 ** ((m - 69) / 12)


def f0(seg, sr, guess):
    lo, hi = int(sr / (guess * 1.1)), int(sr / (guess / 1.1))
    seg = seg - seg.mean()
    n = len(seg)
    X = np.fft.rfft(seg, 2 * n)
    ac = np.fft.irfft(X * np.conj(X))[:hi + 2]
    k = lo + int(np.argmax(ac[lo:hi + 1]))
    a, b, c = ac[k - 1], ac[k], ac[k + 1]
    return sr / (k + 0.5 * (a - c) / (a - 2 * b + c))


def kw_rms(m, sr):
    # crude K-weighting (as the audit's stems.py): a 100 Hz high-pass and +4 dB above 2 kHz
    X = np.fft.rfft(m)
    f = np.fft.rfftfreq(len(m), 1 / sr)
    g = (f / np.sqrt(f ** 2 + 100 ** 2)) * np.where(f > 2000, 10 ** (4 / 20), 1)
    return np.sqrt((np.fft.irfft(X * g, len(m)) ** 2).mean())


def centroid(seg, sr):
    Y = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / sr)
    s = (f > 50) & (f < 12000)
    return float((Y[s] * f[s]).sum() / max(Y[s].sum(), 1e-20))


def flatten(y, sr):
    """The held tone's slow swell and fade evened (a bowed note's pressure over its 4 s: up to 7 dB, which the made loop, 1.4-3.6 s,
    would jump back over): from 0.5 s, the level over a 0.4 s window brought to its median over 0.5-3.6 s (within ±8 dB), faded in
    over 0.3-0.6 s; the vibrato's faster swell (5-7 Hz) kept."""
    w = int(0.4 * sr)
    c = np.concatenate([[0], np.cumsum(y ** 2)])
    i = np.arange(len(y))
    lo, hi = np.clip(i - w // 2, 0, len(y)), np.clip(i + w // 2, 0, len(y))
    env = np.sqrt((c[hi] - c[lo]) / np.maximum(hi - lo, 1)) + 1e-9
    target = np.median(env[int(0.5 * sr):int(3.6 * sr)])
    g = np.clip(target / env, 10 ** (-8 / 20), 10 ** (8 / 20))
    t = np.arange(len(y)) / sr
    mix = np.clip((t - 0.3) / 0.3, 0, 1)
    g = 1 + mix * (g - 1)
    g[int((LEN - FADE) * sr):] = g[int((LEN - FADE) * sr) - 1]
    return y * g


def quicken(y, sr, ramp):
    w = int(0.03 * sr)
    c = np.concatenate([[0], np.cumsum(y ** 2)])
    i = np.arange(len(y))
    lo, hi = np.clip(i - w // 2, 0, len(y)), np.clip(i + w // 2, 0, len(y))
    env = np.sqrt((c[hi] - c[lo]) / np.maximum(hi - lo, 1)) + 1e-9
    held = np.median(env[int(0.5 * sr):int(2 * sr)])
    t = i / sr
    want = held * np.minimum(1, (t + 0.005) / ramp)
    g = np.clip(want / env, 1, 10 ** (9 / 20))
    g = 1 + (g - 1) * np.clip((0.4 - t) / 0.15, 0, 1)
    return y * g


def prepare(f, mi, ramp=None):
    x, sr = sf.read(f)
    if x.ndim > 1:
        x = x.mean(1)
    env = np.sqrt(np.convolve(x ** 2, np.ones(256) / 256, "same"))
    on = max(0, int(np.argmax(env > env.max() * 0.03)) - int(0.001 * sr))
    x = x[on:]
    hz = f0(x[int(1.0 * sr):int(3.0 * sr)], sr, hz_of(mi))
    cents = 1200 * np.log2(hz / hz_of(mi))
    if abs(cents) > 0.5:
        r = Fraction(2 ** (cents / 1200)).limit_denominator(4000)
        x = resample_poly(x, r.numerator, r.denominator)
    left = 1200 * np.log2(f0(x[int(1.0 * sr):int(3.0 * sr)], sr, hz_of(mi)) / hz_of(mi))
    y = x[:int(LEN * sr)].copy()
    y[-int(FADE * sr):] *= np.linspace(1, 0, int(FADE * sr))
    held0 = 20 * np.log10(kw_rms(y[int(0.5 * sr):int(3 * sr)], sr))
    y = flatten(y, sr)
    if ramp:
        y = quicken(y, sr, ramp)
    # (the start a short note plays and the held tone, the mean: a short note's colour matters as much as a long one's)
    bright = (np.log2(centroid(y[int(0.05 * sr):int(0.45 * sr)], sr) / hz_of(mi)) + np.log2(centroid(y[int(0.5 * sr):int(3 * sr)], sr) / hz_of(mi))) / 2
    start = 20 * np.log10(kw_rms(y[int(0.05 * sr):int(0.45 * sr)], sr))
    held = held0
    h = int(0.02 * sr)
    e = 20 * np.log10(np.sqrt((y[int(0.8 * sr):int(0.8 * sr) + (int(3 * sr) // h) * h].reshape(-1, h) ** 2).mean(1)) + 1e-9)
    ripple = float(np.percentile(e, 95) - np.percentile(e, 5))
    return dict(ripple=ripple, y=y, sr=sr, cents=round(float(cents), 1), left=round(float(left), 1), bright=float(bright), start=float(start), held=float(held), file=os.path.basename(f))


report = {}
for folder, (inst, ab, pitches) in SETS.items():
    cands = {}
    for f in glob.glob(f"{src}/{inst}/ordinario/{ab}-ord-*-mf-*.wav"):
        m = re.match(ab + r"-ord-([A-G]#?\d)-mf-(\d)c-(\w+)\.wav", os.path.basename(f))
        mi = midi_of(m.group(1))
        if pitches[0] <= mi <= pitches[1] and "R" not in m.group(3):
            cands.setdefault(mi, []).append((int(m.group(2)), f))
    lo, hi = pitches
    missing = [p for p in (lo, hi) if p not in cands]
    assert not missing, (folder, missing)
    info = {p: [prepare(f, p, ATTACK.get(folder)) for _, f in sorted(cands[p])] for p in sorted(cands)}
    # the pitches and strings: dynamic programming from the lowest to the highest over steps of 2 or 3 semitones (no note read
    # more than 1.5 from a recording), the cost each step's brightness change (octaves), STEP_COST a recording (memory) and its ripple (RIPPLE_COST)
    best = {(lo, j): (0.001 * j, None) for j in range(len(info[lo]))}
    for p in range(lo + 1, hi + 1):
        for j, nb in enumerate(info.get(p, [])):
            prev = [(best[(q, i)][0] + abs(nb["bright"] - info[q][i]["bright"]) + STEP_COST + RIPPLE_COST * max(0, nb["ripple"] - 3) + LEAN.get(folder, 0) * nb["bright"], (q, i)) for q in (p - 2, p - 3) for i in range(len(info.get(q, []))) if (q, i) in best]
            if prev:
                c, k = min(prev)
                best[(p, j)] = (c + 0.001 * j, k)
    k = min(((hi, j) for j in range(len(info[hi])) if (hi, j) in best), key=lambda s: best[s][0])
    pick = {}
    while k:
        pick[k[0]] = k[1]
        k = best[k][1]
    ps = sorted(pick)
    notes = {p: info[p][pick[p]] for p in ps}
    gains = {p: 10 ** ((-(n["start"] + n["held"]) / 2 + ENGINE_DB.get(folder, {}).get(fname(p), 0)) / 20) for p, n in notes.items()}
    peak = max(np.abs(n["y"] * gains[p]).max() for p, n in notes.items())
    g = 10 ** (-1 / 20) / peak
    rows = {}
    if not DRY:
        os.makedirs(os.path.join(out, folder), exist_ok=True)
    for p, n in notes.items():
        y = n["y"] * gains[p] * g
        if not DRY:
            tmp = os.path.join(out, folder, "_t.wav")
            sf.write(tmp, y, n["sr"], subtype="PCM_16")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "80k", os.path.join(out, folder, fname(p) + ".mp3")], check=True)
            os.remove(tmp)
        rows[fname(p)] = dict(file=n["file"], cents=n["cents"], left=n["left"], bright=round(n["bright"], 2), start=round(n["start"], 1), held=round(n["held"], 1), trim=round(20 * np.log10(gains[p] * g), 1), ripple=round(n["ripple"], 1))
        print(folder, fname(p), json.dumps(rows[fname(p)]))
    report[folder] = rows
print(json.dumps(report))
