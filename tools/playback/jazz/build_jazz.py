"""build_jazz.py <iowa dir> <swirly dir> <out dir>: JAZZ QUARTET's recordings (D503).

<iowa dir> holds the University of Iowa Electronic Music Studios' MIS scale files (theremin.music.uiowa.edu,
"may be downloaded and used for any projects, without restrictions"): Vibraphone.sustain.{pp,mf,ff}.{C3B3,C4B4,
C5B5,C6F6}.aif (motor off, pedal down) and Bass.pizz.{mf,ff}.sul?.*.aiff (the double bass, pizzicato, one string
per file). <swirly dir> holds Karoryfer Samples' Swirly Drums (CC0; github.com/sfzinstruments/karoryfer.swirly-drums),
its Samples/ folders snare_main, snare_stir, snare_flutter, ride, hat_foot (the dry mics). <out dir> is public/samples.

Writes, mono 44.1 kHz MP3:
  jazzVibes/      the vibraphone at mf, every semitone C3-F6 (the band's and the player's middle touch);
  jazzVibesSoft/  at pp, every whole tone C3-F6 (the soft mallet: darker, rounder);
  jazzVibesHard/  at ff, every whole tone C3-F6 (the hard mallet: the bar's bright strike);
  jazzBass/       the double bass pizzicato at mf, every semitone E1-G4, each from the string a jazz bassist would
                  take it on (E1-G#1 the E string, A1-C#2 the A, D2-F#2 the D, G2 up the G);
  jazzBassHard/   at ff, every whole tone E1-G4 (a stronger pluck: more of the string's snap);
  jazzBrushes/    the brush kit, its pieces filed under note names (sampled.ts BRUSH_FILES says which is which):
                  brushed snare taps at four dynamics, two strokes each; two stir loops (the brush circling the
                  head, 4 s each, made loopable); two flutters (the brush's buzz roll); the brushed ride at three
                  dynamics; the hi-hat's foot at two, two strokes each.
Each scale file is cut at its onsets (a 90 Hz high-pass first: the 1997 recordings' rumble lies under 50 Hz), each
segment's pitch checked against the scale's next note (autocorrelation; more than 60 cents off: skipped, a later
onset tried), the onset kept 2 ms before the strike, trimmed (vibraphone 4 s, bass 2.6 s) with a fade, high-passed
(vibraphone 90 Hz, bass 28 Hz), each note's loudness over its first 0.5 s (K-weighted as the audit measures it)
evened within its set, every set of an instrument at one gain (its loudest peak at -1 dBFS); the tuning measured
(autocorrelation over 0.25-1.25 s, the bass's 0.12-0.7 s) and printed as cents for src/touch/sampled.ts.
Run it with python3 -I (the downloads are data, never code)."""
import sys, os, re, subprocess, json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

IOWA, SWIRLY, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
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
    assert sr == SR, (path, sr)
    return x.mean(1) if x.ndim > 1 else x


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
    g = 10 ** (-1 / 20) / max(np.abs(y).max() for y, _ in ev.values())
    cents = {}
    for (folder, m), (y, c) in sorted(ev.items()):
        os.makedirs(os.path.join(OUT, folder), exist_ok=True)
        mp3(y * g, os.path.join(OUT, folder, fname(m) + ".mp3"), kbps)
        cents.setdefault(folder, {})[fname(m)] = c
    for folder, cs in cents.items():
        print(folder, len(cs), "notes:", json.dumps(cs).replace('"', "").replace(":", ": "))


# ---- The vibraphone ----
VIBE_FILES = [("C3B3", "C3", "B3"), ("C4B4", "C4", "B4"), ("C5B5", "C5", "B5"), ("C6F6", "C6", "F6")]
vibes = {}
for dyn, folder, step in [("mf", "jazzVibes", 1), ("pp", "jazzVibesSoft", 2), ("ff", "jazzVibesHard", 2)]:
    got = {}
    for f, lo, hi in VIBE_FILES:
        x = mono(os.path.join(IOWA, f"Vibraphone.sustain.{dyn}.{f}.aif"))
        got.update(cut(x, scale(lo, hi), 4.0, 0.6, 0.25, 1.25, 90))
    want = [m for m in scale("C3", "F6") if (m - 48) % step == 0]
    miss = [fname(m) for m in want if m not in got]
    if miss:
        print("vibes", dyn, "missing", miss)
    vibes[folder] = {m: got[m] for m in want if m in got}
write_sets(vibes, 72, 0.5)

# ---- The double bass, pizzicato ----
# The string each note is taken on, and the file that has it.
BASS_FROM = [("sulE.E1B1", "E1", "B1", "E1", "Ab1"), ("sulA.A1B1", "A1", "B1", "A1", "B1"), ("sulA.C2B2", "C2", "B2", "C2", "Db2"),
             ("sulD.D2B2", "D2", "B2", "D2", "Gb2"), ("sulG.G2B2", "G2", "B2", "G2", "B2"), ("sulG.C3B3", "C3", "B3", "C3", "B3"),
             ("sulG.C4G4", "C4", "G4", "C4", "G4")]
bass = {}
for dyn, folder, step in [("mf", "jazzBass", 1), ("ff", "jazzBassHard", 2)]:
    got = {}
    for f, lo, hi, take_lo, take_hi in BASS_FROM:
        x = mono(os.path.join(IOWA, f"Bass.pizz.{dyn}.{f}.aiff"))
        seg = cut(x, scale(lo, hi), 2.6, 0.5, 0.12, 0.7, 28)
        for m, v in seg.items():
            if midi_of(take_lo) <= m <= midi_of(take_hi):
                got[m] = v
    want = [m for m in scale("E1", "G4") if (m - 28) % step == 0]
    miss = [fname(m) for m in want if m not in got]
    if miss:
        print("bass", dyn, "missing", miss)
    bass[folder] = {m: got[m] for m in want if m in got}
write_sets(bass, 64, 0.35)

# ---- The brushes ----
def sw(rel):
    return mono(os.path.join(SWIRLY, "Samples", rel))


def trim(x, length, fade, onset=True):
    if onset:
        i = strike_at(x, 0)
        x = x[max(0, i - int(0.002 * SR)):]
    y = x[:int(length * SR)].copy()
    fl = int(fade * SR)
    y[-fl:] *= np.linspace(1, 0, fl) ** 2
    return y


def loopable(x, start, length, xf=0.25):
    """A stretch of a steady stir made to loop: its last `xf` s crossfaded into its first (equal power)."""
    a = int(start * SR)
    n = int(length * SR)
    k = int(xf * SR)
    y = x[a:a + n].copy()
    tail = x[a + n:a + n + k]
    w = np.linspace(0, 1, k)
    y[:k] = y[:k] * np.sin(w * np.pi / 2) + tail * np.cos(w * np.pi / 2)
    return y


# The kit's files (sampled.ts BRUSH_FILES): snare taps C3-G3 (four dynamics x two strokes), stirs C4 D4, flutters E4 F4,
# ride C5 D5 E5, hat foot C6 Cs6 D6 Ds6.
kit = {}
for k, v in enumerate([4, 6, 8, 12]):
    for r in (1, 2):
        top, btm = sw(f"snare_main/snare_hit_vl{v}_rr{r}_top.wav"), sw(f"snare_main/snare_hit_vl{v}_rr{r}_btm.wav")
        n = min(len(top), len(btm))
        kit[48 + 2 * k + (r - 1)] = hp(trim(top[:n] + 0.6 * btm[:n], 0.9, 0.3), 60)
for k, d in enumerate([2, 3]):
    s = sw(f"snare_stir/stir_dl{d}_rr1.wav") + 0.5 * sw(f"snare_stir/stir_dl{d}_skin_rr1.wav")
    kit[60 + 2 * k] = hp(loopable(s, 1.0, 4.0), 120)
for k, r in enumerate([1, 3]):
    s = sw(f"snare_flutter/flutter_rr{r}.wav") + 0.5 * sw(f"snare_flutter/flutter_skin_rr{r}.wav")
    kit[64 + k] = hp(loopable(s, 0.5, 3.0), 120)
for k, v in enumerate([6, 9, 12]):
    kit[72 + 2 * k] = hp(trim(sw(f"ride/ride_vl{v}_rr1.wav"), 2.5, 1.2), 150)
for k, v in enumerate([5, 8]):
    for r in (1, 2):
        kit[84 + 2 * k + (r - 1)] = hp(trim(sw(f"hat_foot/hh_foot_vl{v}_rr{r}.wav"), 0.6, 0.25), 150)
# The kit as recorded (its dynamics are its own: the snare's soft taps softer, the ride's layers as played), one gain
# for all: the loudest peak at -1 dBFS; the stirs and flutters (steady) each evened to the louder stir.
ref = max(kw_rms(kit[m]) for m in (60, 62))
for m in (60, 62, 64, 65):
    kit[m] = kit[m] / kw_rms(kit[m]) * ref
g = 10 ** (-1 / 20) / max(np.abs(y).max() for y in kit.values())
os.makedirs(os.path.join(OUT, "jazzBrushes"), exist_ok=True)
for m, y in sorted(kit.items()):
    mp3(y * g, os.path.join(OUT, "jazzBrushes", fname(m) + ".mp3"), 64)
    print("brush", fname(m), "%.2f s" % (len(y) / SR), "peak %.1f dB" % (20 * np.log10(np.abs(y * g).max())), "rms %.1f dB" % (20 * np.log10(kw_rms(y * g))))
