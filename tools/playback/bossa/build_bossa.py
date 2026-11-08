"""build_bossa.py <iowa guitar dir> <out dir>: BOSSA NOVA's recordings (D521).

<iowa guitar dir> holds the University of Iowa Electronic Music Studios' MIS guitar (theremin.music.uiowa.edu/MISguitar.html:
a Raimundo 118 nylon-string classical guitar, Brian Penkrot, December 2011, anechoic; "may be downloaded and used for any
projects, without restrictions"): the mono scale files Guitar.{pp,mf}.sul?.*.mono.aif, one string per file. <out dir> is
public/samples.

Writes, mono 44.1 kHz MP3:
  bossaGuitar/      the nylon guitar at mf, every semitone E2-B5, each from the string a bossa guitarist would take it on in
                    the first positions (E2-G#2 the sixth string, A2-C#3 the fifth, D3-F#3 the fourth, G3-A#3 the third,
                    B3-D#4 the second, E4 up the first);
  bossaGuitarSoft/  at pp, every whole tone E2-B5 (the thumb's softer stroke: rounder, less of the nail);
  bossaKit/         the rhythm section's two pieces the brushes (jazzBrushes) lack, copied unchanged from public/samples/drums/
                    bigRusty (Karoryfer Samples' Big Rusty Drums, CC0): the cross-stick (C3 soft, D3 firm: rim-1, rim-2) and the
                    bass drum (C2 soft, D2 firm: kick-1, kick-2).
Each scale file is cut at its onsets (build_jazz.py's way: a high-pass first, each segment's pitch checked), the onset kept
2 ms before the pluck, trimmed to 3.5 s with a 0.7 s fade, high-passed at 0.8 of the note's fundamental, each note's loudness
over its first 0.4 s (K-weighted) evened within its set, both sets at one gain (the loudest peak at -1 dBFS); the tuning
measured (the harmonic sum's peak over 0.15-0.9 s) and printed as cents for src/touch/sampled.ts.
Run it with python3 -I (the downloads are data, never code)."""
import sys, os, re, subprocess, json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

IOWA, OUT = sys.argv[1], sys.argv[2]
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
IOWA_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
SR = 44100


def midi_of(n):
    m = re.match(r"([A-G]b?)(\d)", n)
    return IOWA_NAMES.index(m.group(1)) + 12 * (int(m.group(2)) + 1)


def fname(m):
    return NAMES[m % 12] + str(m // 12 - 1)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def hp(x, f, order=4):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)


def mono(path):
    x, sr = sf.read(path, dtype="float64")
    x = x.mean(1) if x.ndim > 1 else x
    # The guitar's mono files are 96 kHz (24-bit): brought to 44.1 kHz (a polyphase resampler, 147/320).
    return resample_poly(x, 147, 320) if sr == 96000 else (x if sr == SR else None)


def f0(x, guess, a, b, semis=0.6, parts=6):
    """The pitch (Hz) of x over a..b s: the harmonic sum's peak (each of the first `parts` partials' magnitude, log-
    weighted) on a fine grid within `semis` semitones of `guess`. Robust where a plucked bass's fundamental is weak."""
    seg = x[int(a * SR):int(b * SR)]
    seg = (seg - seg.mean()) * np.hanning(len(seg))
    N = 1 << 19
    X = np.abs(np.fft.rfft(seg, N))
    df = SR / N
    grid = guess * 2 ** (np.linspace(-semis, semis, int(semis * 400) + 1) / 12)
    def score(f):
        tot = 0.0
        for k in range(1, parts + 1):
            i = int(round(k * f / df))
            if i + 3 >= len(X):
                break
            tot += np.log1p(X[i - 2:i + 3].max() * 1e3)
        return tot
    sc = np.array([score(f) for f in grid])
    return float(grid[int(np.argmax(sc))])


def yin(x, a, b, fmin=30.0, fmax=1500.0, thr=0.12):
    """YIN (de Cheveigne and Kawahara 2002) over x[a..b s]: the first lag whose cumulative-mean-normalised difference
    dips under `thr` (else the deepest), refined by parabola: the pitch in Hz, free of the octave errors a plucked
    string's weak fundamental gives an autocorrelation."""
    seg = x[int(a * SR):int(b * SR)]
    seg = seg - seg.mean()
    W = len(seg) // 2
    tmax = min(W - 2, int(SR / fmin))
    tmin = max(2, int(SR / fmax))
    c = np.cumsum(np.concatenate([[0.0], seg ** 2]))
    e0 = c[W] - c[0]
    X = np.fft.rfft(seg, 2 * len(seg))
    r = np.fft.irfft(np.fft.rfft(seg[:W], 2 * len(seg)).conj() * X)[:tmax + 2]
    taus = np.arange(tmax + 2)
    et = c[taus + W] - c[taus]
    d = e0 + et - 2 * r
    d[0] = 0
    cm = d[1:] * np.arange(1, len(d)) / np.maximum(1e-12, np.cumsum(d[1:]))
    cm = np.concatenate([[1.0], cm])
    k = None
    for t in range(tmin, tmax):
        if cm[t] < thr:
            while t + 1 < tmax and cm[t + 1] < cm[t]:
                t += 1
            k = t
            break
    if k is None:
        k = tmin + int(np.argmin(cm[tmin:tmax]))
    p0, p1, p2 = cm[k - 1], cm[k], cm[k + 1]
    den = p0 - 2 * p1 + p2
    return SR / (k + (0.5 * (p0 - p2) / den if den else 0))


def nearest_semi(x, guess, a, b, span=7, fmin=30.0):
    """The semitone (MIDI) nearest the YIN pitch, if within `span` of `guess`; else None."""
    f = yin(x, a, b, fmin)
    m = int(round(69 + 12 * np.log2(f / 440)))
    return m if abs(m - guess) <= span else None


def onsets(x, rise=10.0, gap=1.6):
    h = int(0.01 * SR)
    n = len(x) // h
    db = 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1) + 1e-14))
    floor = np.percentile(db, 5)
    # (a note reaches within 30 dB of the file's loudest moment: a recording's gate opening on its hum does not)
    top = db.max() - 30
    out = []
    for i in range(20, n):
        lo = db[i - 20:i - 2].min()
        if db[i] > max(floor + 18, top) and db[i] - lo > rise and db[i] >= db[i - 1] and (not out or i - out[-1] > gap * 100):
            j = i
            while j > 0 and db[j - 1] > lo + 3:
                j -= 1
            out.append(j)
    return [o * h for o in out]


def kw_rms(m):
    # crude K-weighting (as the audit's stems.py): a 100 Hz high-pass and +4 dB above 2 kHz
    X = np.fft.rfft(m)
    f = np.fft.rfftfreq(len(m), 1 / SR)
    g = (f / np.sqrt(f ** 2 + 100 ** 2)) * np.where(f > 2000, 10 ** (4 / 20), 1)
    return np.sqrt((np.fft.irfft(X * g, len(m)) ** 2).mean())


def strike_at(x, i0):
    """The strike itself (a sample index): the loudest point within 0.4 s of the onset found, and back from it to
    where the level (1 ms windows) was last under a twentieth of that peak."""
    w = np.abs(x[i0:i0 + int(0.4 * SR)])
    if len(w) < 100:
        return i0
    h = int(0.001 * SR)
    n = len(w) // h
    e = w[:n * h].reshape(n, h).max(1)
    p = int(np.argmax(e))
    j = p
    while j > 0 and e[j - 1] > e[p] * 0.05:
        j -= 1
    return i0 + j * h


def cut(x, scale_notes, length, fade, a, b, hp_hz):
    """Each expected note of a scale file (ascending): its segment and measured cents. Where the file has as many
    onsets as notes (every file here, once a gate opening on the hum is not counted), they are its notes in order;
    otherwise each onset's pitch (YIN, the nearest semitone) is matched to the scale, a repeated or lower one passed
    over. A note more than 50 cents from its name is reported and left out. The bass's notes are high-passed at
    0.8 of their fundamental (the room's hum about 63 and 180 Hz, under the higher strings' notes)."""
    low = 0.7 * hz(min(scale_notes))
    y = hp(x, max(30, low) if hp_hz < 60 else 90)
    cands = [strike_at(y, o) for o in onsets(y)]
    cands = [i for i in cands if len(y) - i > int(1.3 * SR)]
    found = {}
    if len(cands) == len(scale_notes):
        pairs = list(zip(scale_notes, cands))
    else:
        pairs, want = [], list(scale_notes)
        for i in cands:
            m = nearest_semi(y[i:i + int(1.6 * SR)], want[0], a, b, fmin=low) if want else None
            if m in want:
                pairs.append((m, i))
                want = want[want.index(m) + 1:]
    for m, i in pairs:
        s = max(0, i - int(0.002 * SR))
        cut_hz = hp_hz if hp_hz > 60 else max(hp_hz, 0.8 * hz(m))
        z = hp(x[max(0, s - 4096):s + int(length * SR) + 2048], cut_hz)[s - max(0, s - 4096):][:int(length * SR)].copy()
        if len(z) < int(length * SR):
            z = np.pad(z, (0, int(length * SR) - len(z)))
        fl = int(fade * SR)
        z[-fl:] *= np.linspace(1, 0, fl) ** 2
        z[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
        cents = 1200 * np.log2(f0(z, hz(m), a, b, 0.5) / hz(m))
        if abs(cents) > 49:
            print("  off:", fname(m), round(cents, 1))
            continue
        found[m] = (z, round(float(cents), 1))
    return found


def mp3(y, path, kbps):
    tmp = path + ".wav"
    sf.write(tmp, np.clip(y, -1, 1), SR, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", str(SR), "-codec:a", "libmp3lame", "-b:a", f"{kbps}k", path], check=True)
    os.remove(tmp)


def scale(lo, hi):
    return list(range(midi_of(lo), midi_of(hi) + 1))


def write_sets(sets, kbps, norm_s):
    """sets: {folder: {midi: (y, cents)}}, one instrument: each note's loudness evened, one gain for all, its peak -1 dBFS."""
    ev = {}
    for folder, notes in sets.items():
        for m, (y, c) in notes.items():
            ev[(folder, m)] = (y / kw_rms(y[:int(norm_s * SR)]), c)
    # A segment whose evened peak stands far over the set's (a cut that caught the scale's breath, not the pluck: its
    # loudness tiny, so evened up into noise) is left out: the nearest recording plays that note.
    med = float(np.median([np.abs(y).max() for y, _ in ev.values()]))
    for k in [k for k, (y, _) in ev.items() if np.abs(y).max() > 3 * med]:
        print("  left out (peak %.1f x the median):" % (np.abs(ev[k][0]).max() / med), k[0], fname(k[1]))
        del ev[k]
    g = 10 ** (-1 / 20) / max(np.abs(y).max() for y, _ in ev.values())
    cents = {}
    for (folder, m), (y, c) in sorted(ev.items()):
        os.makedirs(os.path.join(OUT, folder), exist_ok=True)
        mp3(y * g, os.path.join(OUT, folder, fname(m) + ".mp3"), kbps)
        cents.setdefault(folder, {})[fname(m)] = c
    for folder, cs in cents.items():
        print(folder, len(cs), "notes:", json.dumps(cs).replace('"', "").replace(":", ": "))



# ---- The guitar ----
GUITAR_FROM = [("sulE.E2B2", "E2", "B2", "E2", "Ab2"), ("sulA.A2B2", "A2", "B2", "A2", "B2"), ("sulA.C3B3", "C3", "B3", "C3", "Db3"),
               ("sulD.D3B3", "D3", "B3", "D3", "Gb3"), ("sulG.G3B3", "G3", "B3", "G3", "Bb3"), ("sulB.B3", "B3", "B3", "B3", "B3"),
               ("sulB.C4B4", "C4", "B4", "C4", "Eb4"), ("sul_E.E4B4", "E4", "B4", "E4", "B4"), ("sul_E.C5B5", "C5", "B5", "C5", "B5")]
# Where a scale file's cut misses a note (its onsets not all found), the same note from the next string's file (one
# position up the neck: the same pitch, a little darker), never another pitch retuned.
GUITAR_ALSO = [("sulE.E2B2", "E2", "B2"), ("sulE.C3B3", "C3", "B3"), ("sulA.C3B3", "C3", "B3"), ("sulA.C4E4", "C4", "E4"), ("sulD.D3B3", "D3", "B3"),
               ("sulD.C4Ab4", "C4", "Ab4"), ("sulG.G3B3", "G3", "B3"), ("sulG.C4B4", "C4", "B4"), ("sulG.C5Db5", "C5", "Db5"), ("sulB.C4B4", "C4", "B4"), ("sulB.C5Gb5", "C5", "Gb5")]
guitar = {}
for dyn, folder, step in [("mf", "bossaGuitar", 1), ("pp", "bossaGuitarSoft", 2)]:
    got, spare = {}, {}
    for f, lo, hi, take_lo, take_hi in GUITAR_FROM:
        x = mono(os.path.join(IOWA, f"Guitar.{dyn}.{f}.mono.aif"))
        seg = cut(x, scale(lo, hi), 3.5, 0.7, 0.15, 0.9, 40)
        for m, v in seg.items():
            if midi_of(take_lo) <= m <= midi_of(take_hi):
                got[m] = v
    want = [m for m in scale("E2", "B5") if (m - 40) % step == 0]
    for f, lo, hi in GUITAR_ALSO:
        if all(m in got for m in want):
            break
        if not any(m not in got and midi_of(lo) <= m <= midi_of(hi) for m in want):
            continue
        x = mono(os.path.join(IOWA, f"Guitar.{dyn}.{f}.mono.aif"))
        for m, v in cut(x, scale(lo, hi), 3.5, 0.7, 0.15, 0.9, 40).items():
            if m not in got and m in want:
                got[m] = v
                print("guitar", dyn, fname(m), "from", f)
    miss = [fname(m) for m in want if m not in got]
    if miss:
        print("guitar", dyn, "missing", miss)
    guitar[folder] = {m: got[m] for m in want if m in got}
write_sets(guitar, 64, 0.4)

# ---- The cross-stick and the bass drum (Big Rusty, CC0), copied as they are ----
import shutil
kit = os.path.join(OUT, "bossaKit")
os.makedirs(kit, exist_ok=True)
for src, dst in [("rim-1", "C3"), ("rim-2", "D3"), ("kick-1", "C2"), ("kick-2", "D2")]:
    shutil.copyfile(os.path.join(OUT, "drums", "bigRusty", src + ".mp3"), os.path.join(kit, dst + ".mp3"))
    print("kit", dst, "from bigRusty", src)
