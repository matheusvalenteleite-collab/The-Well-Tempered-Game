"""D305: SOLO VOICES' four singers rebuilt as straight tone (one singer per part, after the OVPP
recordings: little or no vibrato). python -I build_straight.py SEGS.json VOCALSET_DIR OUT_DIR

SEGS.json: segs2.py's steady notes of the VocalSet files fetched (fetch.py): the straight, slow
scales/arpeggios and long-tone takes on "a". For every semitone of a part's range:
  1. the source: the singer's steadiest note within 4 semitones (`MAX_SHIFT`), straight takes
     preferred, longer ones preferred;
  2. its pitch made steady: the YIN track's wobble undone by reading the recording at a varying
     rate (the vibrato's own inverse; the formants move with it by the vibrato's few cents only);
  3. its level made steady (the 60 ms envelope divided out: no tremolo, no swell);
  4. shifted to the target (ffmpeg rubberband, formant preserved) if not sung there;
  5. tiled by pitch-aligned crossfades (120 ms) into 3.25 s, of which 1.0-3.0 s loops seamlessly
     (as build.py's files: the touch game's and the chorales' loop points unchanged); RMS 0.12;
     MP3 96 kbit/s mono.
Prints, per file, the source and the shift, and the pitch wobble left (cents, 3-9 Hz semi-amplitude).
"""
import json, os, subprocess, sys, tempfile
import numpy as np
import librosa
import soundfile as sf

SR = 44100
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
MAX_SHIFT = 4
# part: (singer, lowest, highest)
PARTS = {"soloSoprano": ("f7", 60, 81), "soloAlto": ("f8", 53, 74), "soloTenor": ("m3", 47, 69), "soloBass": ("m8", 38, 66)}
LEAD, BLOCK, TAIL = 1.0, 2.0, 0.25
TMP = tempfile.mkdtemp()


def name(m):
    return f"{NAMES[m % 12]}{m // 12 - 1}"


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def track(y, m):
    hop = 64
    f0 = librosa.yin(y, fmin=50, fmax=1400, sr=SR, frame_length=4096 if m < 57 else 2048, hop_length=hop, trough_threshold=0.1)
    c = 1200 * np.log2(f0 / hz(m))
    med = np.median(c)
    bad = np.abs(c - med) > 90
    idx = np.arange(len(c))
    if bad.any() and (~bad).sum() > 4:
        c[bad] = np.interp(idx[bad], idx[~bad], c[~bad])
    from scipy.ndimage import median_filter
    c = median_filter(c, size=5)
    t = idx * hop / SR
    return t, c


def wobble(y, m):
    t, c = track(y, m)
    fs = SR / 64
    X = np.fft.rfft(c - c.mean()); f = np.fft.rfftfreq(len(c), 1 / fs)
    X[(f < 3) | (f > 9)] = 0
    return float(np.sqrt(2) * np.fft.irfft(X, len(c)).std()), float(np.median(c))


def steady_pitch(y, m):
    """Read y at a varying rate so that its pitch is hz(m) throughout."""
    t, c = track(y, m)
    n = np.arange(len(y))
    cs = np.interp(n / SR, t, c)  # cents off hz(m) at each input sample
    r = 2 ** (-cs / 1200)  # the reading rate that brings it to hz(m)
    u = np.concatenate([[0], np.cumsum(1 / r)])[:-1]  # output time of each input sample
    k = np.arange(int(u[-1]))
    p = np.interp(k, u, n)
    from scipy.interpolate import CubicSpline
    return CubicSpline(n, y)(p)


def steady_level(y):
    w = int(0.06 * SR)
    env = np.sqrt(np.convolve(y ** 2, np.hanning(w) / np.hanning(w).sum(), mode="same") + 1e-10)
    g = np.median(env) / env
    g = np.clip(g, 0.5, 2.0)
    return y * g


def shift(a, semis):
    if abs(semis) < 0.01:
        return a
    i, o = f"{TMP}/in.wav", f"{TMP}/out.wav"
    sf.write(i, a, SR, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", i, "-af", f"rubberband=pitch={2 ** (semis / 12)}:formant=preserved:pitchq=quality", o], check=True)
    b, _ = sf.read(o)
    return b[: len(a)]


def tile(chunk, n, X, P):
    out = chunk.copy()
    fi = np.sin(np.linspace(0, np.pi / 2, X)) ** 2
    fo = 1 - fi
    while len(out) < n:
        tail = out[-X - P:]
        best, bk = -1e9, 0
        for k in range(P):
            seg = tail[k:k + X]
            cc = np.dot(seg, chunk[:X]) / (np.linalg.norm(seg) * np.linalg.norm(chunk[:X]) + 1e-9)
            if cc > best:
                best, bk = cc, k
        cut = len(out) - X - P + bk
        out = np.concatenate([out[:cut], out[cut:cut + X] * fo + chunk[:X] * fi, chunk[X:]])
    return out[:n]



if __name__ == "__main__":
    SEGS, VS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
    ONLY = sys.argv[4:]  # parts to build (default all)
    segs = json.load(open(SEGS))
    os.makedirs(OUT, exist_ok=True)
    report = json.load(open(f"{OUT}/report.json")) if ONLY and os.path.exists(f"{OUT}/report.json") else {}
    for part, (who, lo, hi) in PARTS.items():
        if ONLY and part not in ONLY:
            continue
        cands = []
        for p, ss in segs.items():
            if os.path.basename(p).split("_")[0] != who:
                continue
            for s in ss:
                d = s["t1"] - s["t0"]
                if d < 0.4:
                    continue
                cands.append((p, s, d))
        os.makedirs(f"{OUT}/{part}", exist_ok=True)
        rows = []
        for m in range(lo, hi + 1):
            def cost(c):
                p, s, d = c
                straight = "/straight/" in p
                return abs(m - s["midi"]) * 0.8 + s["vib"] / 5 + s["wander"] / 10 - min(d, 2.0) * 0.6 - (0.6 if straight else 0)
            near = [c for c in cands if abs(c[1]["midi"] - m) <= MAX_SHIFT]
            pool = near or cands
            p, s, d = min(pool, key=cost)
            y, _ = librosa.load(p, sr=SR, mono=True)
            a = y[int((s["t0"] + 0.03) * SR): int((s["t1"] - 0.03) * SR)]
            before, _ = wobble(a, s["midi"])
            a = steady_pitch(a, s["midi"])
            a = steady_level(a)
            a = shift(a, m - s["midi"])
            a = a / (np.sqrt((a ** 2).mean()) + 1e-9) * 0.12
            P = int(round(SR / hz(m)))
            X = min(int(0.12 * SR), len(a) // 3)
            T = tile(a, int((LEAD + BLOCK + TAIL + 0.6) * SR), X, P)
            L, B = int(LEAD * SR), int(BLOCK * SR)
            Xl = int(0.12 * SR)
            fi = np.sin(np.linspace(0, np.pi / 2, Xl)) ** 2
            bs, bc = L, -1e9
            for s0 in range(L, L + int(0.3 * SR), 4):
                u = T[s0 + B - Xl:s0 + B]; v = T[s0 - Xl:s0]
                cc = np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9)
                if cc > bc:
                    bc, bs = cc, s0
            blk = T[bs:bs + B].copy()
            blk[-Xl:] = blk[-Xl:] * (1 - fi) + T[bs - Xl:bs] * fi
            out = np.concatenate([T[bs - L:bs], blk, blk[:int(TAIL * SR)]])
            f = int(0.03 * SR)
            out[:f] *= np.linspace(0, 1, f)
            out[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
            after, cents = wobble(out[int(1.0 * SR):int(3.0 * SR)], m)
            sf.write(f"{TMP}/n.wav", out, SR, subtype="PCM_16")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{TMP}/n.wav", "-ac", "1", "-b:a", "96k", f"{OUT}/{part}/{name(m)}.mp3"], check=True)
            src = f"{os.path.basename(p)[:-4]}@{s['t0']:.1f}s:{name(s['midi'])}"
            rows.append(dict(note=name(m), src=src, shift=m - s["midi"], dur=round(d, 2), vib_before=round(before, 1), vib_after=round(after, 1), cents=round(cents, 1)))
            print(part, name(m), src, f"shift {m - s['midi']:+d}", f"len {d:.2f}s", f"wobble {before:.1f} -> {after:.1f} c", f"tuning {cents:+.1f} c", flush=True)
        report[part] = rows
    json.dump(report, open(f"{OUT}/report.json", "w"), indent=1)
