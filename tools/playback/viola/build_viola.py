"""build_viola.py <tinysol Viola/ordinario dir> <out dir>: TinySOL's solo viola (IRCAM, CC BY 4.0), ordinario mf,
every whole tone C3-D6, each from the string nearest first position (the highest string that has it): mono, onset kept
1 ms before the bow's attack, 4.5 s with a 0.3 s fade, each note's steady loudness (0.5-3 s, K-weighted as the audit measures it) evened, the set's loudest
peak at -1 dBFS; tuning measured (YIN-like autocorrelation over 1-3 s) and printed as cents for sampled.ts."""
import sys, os, glob, re, subprocess, json
import numpy as np, soundfile as sf

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
def midi_of(n):
    m = re.match(r"([A-G]#?)(\d)", n)
    return NAMES.index(m.group(1)) + 12 * (int(m.group(2)) + 1)
def fname(m):
    return NAMES[m % 12].replace("#", "s") + str(m // 12 - 1)

def f0(x, sr, guess):
    lo, hi = int(sr / (guess * 1.1)), int(sr / (guess / 1.1))
    seg = x[int(1.0 * sr):int(3.0 * sr)]
    seg = seg - seg.mean()
    n = len(seg)
    X = np.fft.rfft(seg, 2 * n)
    ac = np.fft.irfft(X * np.conj(X))[:hi + 2]
    k = lo + np.argmax(ac[lo:hi + 1])
    a, b, c = ac[k - 1], ac[k], ac[k + 1]
    p = k + 0.5 * (a - c) / (a - 2 * b + c)
    return sr / p

def kw_rms(m, sr):
    # crude K-weighting (as the audit's stems.py): a 100 Hz high-pass and +4 dB above 2 kHz
    X = np.fft.rfft(m)
    f = np.fft.rfftfreq(len(m), 1 / sr)
    g = (f / np.sqrt(f ** 2 + 100 ** 2)) * np.where(f > 2000, 10 ** (4 / 20), 1)
    return np.sqrt((np.fft.irfft(X * g, len(m)) ** 2).mean())

picked = {}
for f in glob.glob(src + "/Va-ord-*-mf-*.wav"):
    b = os.path.basename(f)
    m = re.match(r"Va-ord-([A-G]#?\d)-mf-(\d)c-(\w+)\.wav", b)
    note, string, tune = m.group(1), int(m.group(2)), m.group(3)
    if tune.startswith("R"):
        continue
    mi = midi_of(note)
    if mi % 2 != 0 or mi < 48 or mi > 86:
        continue
    if mi not in picked or string < picked[mi][1]:
        picked[mi] = (f, string)

notes = {}
for mi, (f, string) in sorted(picked.items()):
    x, sr = sf.read(f)
    if x.ndim > 1:
        x = x.mean(1)
    env = np.sqrt(np.convolve(x ** 2, np.ones(256) / 256, "same"))
    on = max(0, int(np.argmax(env > env.max() * 0.03)) - int(0.001 * sr))
    y = x[on:on + int(4.5 * sr)]
    fade = int(0.3 * sr)
    y[-fade:] *= np.linspace(1, 0, fade)
    steady = kw_rms(y[int(0.5 * sr):int(3 * sr)], sr)
    hz = f0(y, sr, 440 * 2 ** ((mi - 69) / 12))
    cents = 1200 * np.log2(hz / (440 * 2 ** ((mi - 69) / 12)))
    notes[mi] = (y / steady, sr, round(float(cents), 1), string, os.path.basename(f))

peak = max(np.abs(y).max() for y, *_ in notes.values())
g = 10 ** (-1 / 20) / peak
cents = {}
for mi, (y, sr, c, string, b) in notes.items():
    tmp = os.path.join(out, "_t.wav")
    sf.write(tmp, y * g, sr, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "80k", os.path.join(out, fname(mi) + ".mp3")], check=True)
    os.remove(tmp)
    cents[fname(mi)] = c
    print(fname(mi), b, "string", string, "cents", c)
print(json.dumps(cents).replace('"', "").replace(":", ": "))
