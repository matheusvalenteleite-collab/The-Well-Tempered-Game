# D266: the ensembles' recorded instruments, looped so a note is held as long as the thumb holds it.
# Usage: python3 -I tools/playback/ensemble/build.py SCRATCH OUT_SAMPLES OUT_TS
#   SCRATCH: a folder holding a VSCO-2-CE checkout (github.com/sgossner/VSCO-2-CE)
#   OUT_SAMPLES: public/samples (reads the sets already there, writes the lp* sets)
#   OUT_TS: src/touch/sampled-ensemble.ts (each note's tuning, length and loop)
# Sources (see public/samples/LICENSES.txt): the violin, viola, cello and clarinet sets already in
# public/samples; VSCO-2-CE woodwinds without vibrato (flute susNV, oboe Sus, bassoon sus; CC0). VSCO
# names middle C "C3": one octave is added. (Recorders, brass and the contrabass were tried and left out:
# the fugues' parts, written for the keyboard, go beyond their ranges.)
import json, os, re, subprocess, sys
import numpy as np

SCRATCH, OUT, TS = sys.argv[1:4]
SR = 44100
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
PCS = {"C": 0, "C#": 1, "Cs": 1, "D": 2, "D#": 3, "Ds": 3, "E": 4, "F": 5, "F#": 6, "Fs": 6, "G": 7, "G#": 8, "Gs": 8, "A": 9, "A#": 10, "As": 10, "B": 11}


def name(m):
    return f"{NAMES[m % 12]}{m // 12 - 1}"


def midi(pc, octv):
    return 12 * (octv + 1) + PCS[pc]


def load(p):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def encode(a, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-i", "-", "-c:a", "libmp3lame", "-b:a", "96k", path], input=np.clip(a, -1, 1).astype(np.float32).tobytes(), check=True)


def onset(m, db=-40):
    pk = np.abs(m).max()
    return int(np.argmax(np.abs(m) > pk * 10 ** (db / 20)))


def f0(x):
    x = x - x.mean()
    n = len(x)
    X = np.fft.rfft(x * np.hanning(n), 2 * n)
    ac = np.fft.irfft(np.abs(X) ** 2)[:n]
    a, b = int(SR / 2500), int(SR / 25)
    k = a + int(np.argmax(ac[a:b]))
    y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
    return SR / (k + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2))


def cents_off(m, nominal):
    try:
        f = f0(m)
    except Exception:
        return 0.0
    for octave in (0, 1, -1):  # an octave error in the estimate is not a mistuning
        c = 1200 * np.log2(f / (440 * 2 ** ((nominal - 69) / 12))) - 1200 * octave
        if abs(c) < 40:
            return float(round(c, 1))
    return 0.0


def loop_points(m, hz, start_s, lo, hi):
    S = int(start_s * SR)
    zc = np.where((m[:-1] <= 0) & (m[1:] > 0))[0]
    S = int(zc[np.argmin(np.abs(zc - S))]) + 1
    W = int(max(0.04, 4 / hz) * SR)
    ref = m[S - W : S]
    a, b = S + int(lo * SR), S + int(hi * SR)
    seg = m[a - W : b]
    num = np.correlate(seg, ref, "valid")
    en = np.sqrt(np.convolve(seg**2, np.ones(W), "valid")) * np.linalg.norm(ref) + 1e-12
    c = num / en
    i = int(np.argmax(c))
    return S, a + i, float(c[i])


PRE = int(0.001 * SR)
X = int(0.15 * SR)


def looped(a, m):
    """Trimmed at the onset; a loop over the steady stretch (after the attack, before any fade), its
    150 ms crossfade baked in; kept to the loop's end and a little after."""
    on = max(0, onset(a) - PRE)
    a = a[on:]
    dur = len(a) / SR
    # The steady stretch: from 0.6 s (past a bow's or a breath's attack) to well before the end.
    start = min(0.6, dur * 0.2)
    room = max(0.5, dur - start - 0.9)
    lo, hi = min(0.9, room * 0.6), min(1.8, room)
    hz = 440 * 2 ** ((m - 69) / 12)
    S, E, match = loop_points(a, hz, start, lo, hi)
    fi = np.sin(np.linspace(0, np.pi / 2, X)) ** 2
    out = a[: E + X].copy()
    out[E - X : E] = a[E - X : E] * (1 - fi) + a[S - X : S] * fi
    out[E : E + X] = a[S : S + X]
    return out, S, E, match


def from_set(folder):
    """A set already in public/samples: <note>.mp3 (C4 = middle C)."""
    out = {}
    for f in sorted(os.listdir(f"{OUT}/{folder}")):
        r = re.match(r"^([A-G]s?)(\d)\.mp3$", f)
        if r:
            out[midi(r.group(1), int(r.group(2)))] = f"{OUT}/{folder}/{f}"
    return out


def from_raw(folder, pattern, prefer=("v3", "v2", "v1")):
    """Raw WAVs named an octave low (C3 = middle C); one dynamic layer, the louder where there are several."""
    found = {}
    for f in sorted(os.listdir(folder)):
        r = re.search(pattern, f)
        if not r:
            continue
        m = midi(r.group(1), int(r.group(2))) + 12
        layer = r.group(3) if r.lastindex and r.lastindex >= 3 else ""
        rank = prefer.index(layer) if layer in prefer else len(prefer)
        if m not in found or rank < found[m][0]:
            found[m] = (rank, f"{folder}/{f}")
    return {m: p for m, (_, p) in found.items()}


V = f"{SCRATCH}/VSCO-2-CE"
SETS = {
    "lpViolin": from_set("violin"),
    "lpViola": from_set("violaSus"),
    "lpCello": from_set("cello"),
    "lpClarinet": from_set("clarinet"),
    "lpFlute": from_raw(f"{V}/Woodwinds/Flute/susNV", r"_([A-G]#?)(\d)_(v\d)"),
    "lpOboe": from_raw(f"{V}/Woodwinds/Oboe/Sus", r"_([A-G]#?)(\d)_(v\d)"),
    "lpBassoon": from_raw(f"{V}/Woodwinds/Bassoon/sus", r"_([A-G]#?)(\d)_(v\d)"),
}

# The level all sets are brought to: the organ's (D190, measured equal to the synthesizer at its gain).
org = [load(f"{OUT}/pipeOrgan/{f}") for f in sorted(os.listdir(f"{OUT}/pipeOrgan")) if f.endswith(".mp3") and f != "pack.mp3"]
TARGET = float(np.median([20 * np.log10(np.sqrt((a[int(0.8 * SR) : int(2.0 * SR)] ** 2).mean())) for a in org]))

meta = {}
for s, files in SETS.items():
    built = {m: looped(load(p), m) for m, p in sorted(files.items())}
    steady = {m: 20 * np.log10(np.sqrt((v[0][v[1] : v[2]] ** 2).mean()) + 1e-12) for m, v in built.items()}
    med = float(np.median(list(steady.values())))
    meta[s] = {}
    for m, (out, S, E, match) in built.items():
        # Each note three quarters of the way to the set's median, the set's median at the organ's level.
        g = 10 ** ((0.75 * (med - steady[m]) + (TARGET - med)) / 20)
        a = out * g
        if np.abs(a).max() > 0.95:
            a *= 0.95 / np.abs(a).max()
        encode(a, f"{OUT}/{s}/{name(m)}.mp3")
        meta[s][name(m)] = {"cents": cents_off(out[S : S + min(32768, E - S)], m), "len": round(len(out) / SR, 3), "loop": [round((S - PRE) / SR, 4), round((E - PRE) / SR, 4)], "match": round(match, 3)}
    print(s, len(built), "notes", [name(m) for m in built], "loop match", [meta[s][name(m)]["match"] for m in built])

with open(TS, "w") as fh:
    fh.write(
        "/** Generated by tools/playback/ensemble/build.py (do not edit by hand), D266: each looped ensemble note's\n"
        " * departure from its nominal pitch (cents, measured), its length (s) and its loop (s from the onset;\n"
        " * crossfade baked in). */\n"
        "export const ENSEMBLE_NOTES: Record<string, Record<string, { cents: number; len: number; loop?: [number, number] }>> = "
        + json.dumps({s: {n: {k: v for k, v in d.items() if k != "match"} for n, d in notes.items()} for s, notes in meta.items()}, separators=(",", ":"))
        + ";\n"
    )
