"""D310: SOLO VOICES' four singers, straight tone without the copy and paste.
python -I build_sustain.py SEGS.json OUT_DIR [--mode chain|grain|synth] [parts...]

D305's build_straight.py held each note to one stretch of one take (median 0.5-0.7 s) and tiled that
stretch into 3.25 s: the same half second heard five or six times a note (the owner's "copy paste"),
the 120 ms crossfades between the copies dipping 2-3 times a second, and the stretch's own vibrato,
undone in pitch, left in its harmonics' levels (a brightness wobble at the vibrato's 5-6 Hz: the
"tremolo" still heard). Here, for every semitone of a part (one singer per part, as D305):

  1. a pool: the singer's steady notes (segs2.py, its threshold lowered: SEGS.json) within 4 semitones
     (7 where none), the straight takes and the steadiest preferred, up to `POOL` of them;
  2. each one's pitch held steady (build_straight.steady_pitch), shifted to the target (rubberband,
     formants preserved), its level matched, and its spectrogram's magnitudes smoothed along time
     (`smooth`: a Gaussian of 80 ms, -10 dB at 3 Hz, -33 at 5.5 Hz; the phases kept): the vibrato's
     residue in the harmonics' levels and the tremolo gone, the voice's colour and breath kept;
  3. `chain` (the one kept): the note made of long pieces of different takes, 0.45-0.8 s each, at
     random offsets, the same take never twice running, each joined to the last by a 280 ms crossfade
     aligned to the pitch period and compensated for the two pieces' correlation (constant power);
     `grain` (measured, not kept): 100-200 ms Hann grains at 50% overlap from random places of the pool;
     `synth` (measured, not kept): the first 250 ms recorded, then this singer's average spectrum
     (its harmonics' mean levels) resynthesized as a steady harmonic tone with a little jitter and breath;
  4. its level held within half a decibel (a 100 ms envelope divided out);
  5. 3.25 s as before, 1.0-3.0 s still a seamless loop (the chorales loop it; the touch game no longer
     does: chip.ts `chain`), RMS 0.12, MP3 96 kbit/s mono.
Writes report.json (per note: the takes used, shifts, and the measured level and brightness wobble).
"""
import json, os, subprocess, sys, tempfile

for _v in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_v, "1")  # (BLAS threads contending made each short dot product ~1000 times slower)
import numpy as np
import librosa
import soundfile as sf
from scipy.ndimage import gaussian_filter1d

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_straight import PARTS, SR, NAMES, name, hz, steady_pitch, shift  # noqa: E402

args = sys.argv[1:]
SEGS, OUT = args[0], args[1]
rest = args[2:]
MODE = "chain"
if rest and rest[0] == "--mode":
    MODE, rest = rest[1], rest[2:]
ONLY = rest
MAX_SHIFT, WIDE_SHIFT = 4, 7
POOL = 6
LEN = 3.25
XF = 0.28
TMP = tempfile.mkdtemp()


def stft(a):
    return librosa.stft(a, n_fft=2048, hop_length=256)


def istft(S, n):
    return librosa.istft(S, hop_length=256, length=n)


def smooth(a, sigma=0.08, target=None):
    """The magnitudes of a's spectrogram smoothed along time (a Gaussian of `sigma` s), its phases kept;
    and, given the pool's `target` (per bin), every bin's slow course (a Gaussian of 0.2 s) divided out
    and the target's level put in its place (within ±12 dB): each harmonic (the pitch is the same in
    every take, so the same bins) and the breath between them held to the pool's mean, the faster
    natural flicker kept."""
    S = stft(a)
    hop = 256
    M = gaussian_filter1d(np.abs(S), sigma * SR / hop, axis=1, mode="nearest")
    if target is not None:
        own = gaussian_filter1d(M, 0.2 * SR / hop, axis=1, mode="nearest") + 1e-9
        M = M * np.clip(target[:, None] / own, 0.25, 4.0)
    return istft(M * np.exp(1j * np.angle(S)), len(a))


def colour(a):
    """a's long-term magnitude spectrum, per STFT bin."""
    return np.sqrt((np.abs(stft(a)) ** 2).mean(axis=1)) + 1e-9


def matched(pool):
    """Each take held to the pool's mean spectrum (a geometric mean per bin) throughout: one singer's
    one vowel, so neither a take's own course (a swell: louder and brighter, its centroid rising 5-7% in
    0.7 s) nor the joins between takes change its colour (D310: matched only on average, the centroid
    wandered 8-9% at about 1.3-1.8 Hz, twice a real straight tone's 4.5%)."""
    target = np.exp(np.mean([np.log(colour(a)) for a in pool], axis=0))
    return [norm(smooth(a, target=target)) for a in pool]


def clean(pool, least=0.3):
    """The takes cut where they falter: a 25 ms frame more than 1.2 dB under the median of the 120 ms
    about it (a glitch of the take or of its pitch track, which a piece would carry into every note that
    used it: D310 measured -2 to -4 dB blips, the centroid falling 8%); the pieces left of `least` s or
    more kept (the whole pool if nothing is left)."""
    from scipy.ndimage import median_filter
    out = []
    hop, win = int(0.005 * SR), int(0.025 * SR)
    for a in pool:
        fr = np.lib.stride_tricks.sliding_window_view(a, win)[::hop] * np.hanning(win)
        db = 10 * np.log10((fr ** 2).mean(axis=1) + 1e-12)
        bad = db < median_filter(db, size=25, mode="nearest") - 1.2
        cuts, start = [], 0
        for i in np.flatnonzero(bad):
            lo, hi = max(0, i * hop - int(0.03 * SR)), i * hop + win + int(0.03 * SR)
            if lo - start >= least * SR:
                cuts.append(a[start:lo])
            start = max(start, hi)
        if len(a) - start >= least * SR:
            cuts.append(a[start:])
        out += cuts
    return out or pool


def level(a, w=0.1, lo=0.7, hi=1.4):
    """a's level held steady: its `w` s envelope divided out (bounded)."""
    n = int(w * SR)
    win = np.hanning(n) / np.hanning(n).sum()
    env = np.sqrt(np.convolve(a ** 2, win, mode="same") + 1e-10)
    return a * np.clip(np.median(env) / env, lo, hi)


def norm(a):
    return a / (np.sqrt((a ** 2).mean()) + 1e-9) * 0.12


def join(out, piece, X, P):
    """piece joined onto out over X samples: aligned to the period P (the best correlation of its
    opening against out's tail), crossfaded at constant power for the two pieces' correlation."""
    tail = out[-X:]
    best, bk = -2.0, 0
    for k in range(min(P, len(piece) - X)):
        seg = piece[k:k + X]
        c = np.dot(seg, tail) / (np.linalg.norm(seg) * np.linalg.norm(tail) + 1e-9)
        if c > best:
            best, bk = c, k
    inc = piece[bk:]
    w = np.sin(np.linspace(0, np.pi / 2, X)) ** 2
    wa, wb = 1 - w, w
    rho = max(-0.5, min(1.0, best))
    g = 1 / np.sqrt(wa ** 2 + wb ** 2 + 2 * wa * wb * rho)
    mixed = (tail * wa + inc[:X] * wb) * g
    return np.concatenate([out[:-X], mixed, inc[X:]]), best


def chain(pool, n, rng, P):
    first = pool[0]
    X = int(XF * SR)
    cut = min(len(first), int(rng.uniform(0.7, 1.0) * SR))
    out = first[:cut].copy()
    last = 0
    used = {0: [0]}
    joins = []
    while len(out) < n:
        choices = [i for i in range(len(pool)) if i != last] or [last]
        i = int(rng.choice(choices))
        s = pool[i]
        glen = min(len(s), int(rng.uniform(0.6, 1.0) * SR) + X)
        Xi = min(X, (glen - P) // 2, len(out) // 2)
        if glen - P - Xi < int(0.1 * SR):  # too short to add anything: another take
            last = i
            continue
        span = len(s) - glen
        o = 0
        for _ in range(12):
            o = int(rng.uniform(0, max(1, span)))
            if all(abs(o - u) > 0.25 * SR for u in used.get(i, [])):
                break
        used.setdefault(i, []).append(o)
        out, c = join(out, s[o:o + glen], Xi, P)
        joins.append(round(float(c), 2))
        last = i
    return out[:n], joins


def grain(pool, n, rng, P):
    """100-200 ms Hann grains at 50% overlap, each from a random take and place."""
    out = np.zeros(n + SR)
    pos = 0
    first = True
    while pos < n:
        L = int(rng.uniform(0.1, 0.2) * SR)
        if first:
            s, o = pool[0], 0
        else:
            s = pool[int(rng.integers(len(pool)))]
            o = int(rng.uniform(0, max(1, len(s) - L)))
        g = s[o:o + L]
        g = np.pad(g, (0, L - len(g)))
        out[pos:pos + L] += g * np.hanning(L)
        pos += L // 2
        first = False
    return out[:n], []


def synth(pool, n, rng, P, f0):
    """The first 250 ms recorded, then the singer's mean harmonic spectrum resynthesized, crossfaded in."""
    real = pool[0]
    A = int(0.25 * SR)
    X = int(0.12 * SR)
    # the mean levels of the harmonics over the pool (1 s FFT frames)
    K = int(min(9000, SR / 2 - 100) // f0)
    amps = np.zeros(K)
    noise = np.zeros(K)
    for s in pool:
        S = np.abs(np.fft.rfft(s * np.hanning(len(s))))
        fr = np.fft.rfftfreq(len(s), 1 / SR)
        for k in range(1, K + 1):
            band = (fr > (k - 0.15) * f0) & (fr < (k + 0.15) * f0)
            mid = (fr > (k + 0.35) * f0) & (fr < (k + 0.65) * f0)
            if band.any():
                amps[k - 1] += (S[band] ** 2).sum()
            if mid.any():
                noise[k - 1] += (S[mid] ** 2).mean()
    amps = np.sqrt(amps / len(pool))
    t = np.arange(n) / SR
    walk = gaussian_filter1d(rng.normal(0, 1, n), SR * 0.05)
    walk *= 3 / (np.abs(walk).max() + 1e-9)  # a few cents' wander, aperiodic
    ph = 2 * np.pi * f0 * np.cumsum(2 ** (walk / 1200)) / SR
    y = np.zeros(n)
    for k in range(1, K + 1):
        y += amps[k - 1] * np.sin(k * ph + rng.uniform(0, 2 * np.pi))
    # breath: noise shaped as the inter-harmonic floor
    nz = rng.normal(0, 1, n)
    Nf = np.fft.rfft(nz)
    fr = np.fft.rfftfreq(n, 1 / SR)
    shape = np.interp(fr, f0 * (np.arange(1, K + 1) + 0.5), np.sqrt(noise / len(pool)) * np.sqrt(n / SR))
    y += np.fft.irfft(Nf * shape / (np.abs(Nf).mean() + 1e-9) * 0.02, n)
    y = norm(y)
    head = norm(real[: A + X])
    w = np.sin(np.linspace(0, np.pi / 2, X)) ** 2
    out = y.copy()
    out[:A] = head[:A]
    out[A:A + X] = head[A:A + X] * np.sqrt(1 - w) + y[A:A + X] * np.sqrt(w)
    return out, []


def loopable(T):
    """3.25 s with 1.0-3.0 s a seamless loop (its end crossfaded into what precedes its start), as before."""
    L, B, Xl = SR, 2 * SR, int(0.25 * SR)
    fi = np.sin(np.linspace(0, np.pi / 2, Xl)) ** 2
    bs, bc = L, -2.0
    for s0 in range(L, L + int(0.2 * SR), 4):
        u = T[s0 + B - Xl:s0 + B]
        v = T[s0 - Xl:s0]
        cc = np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9)
        if cc > bc:
            bc, bs = cc, s0
    blk = T[bs:bs + B].copy()
    rho = max(-0.5, min(1.0, bc))
    g = 1 / np.sqrt((1 - fi) ** 2 + fi ** 2 + 2 * (1 - fi) * fi * rho)
    blk[-Xl:] = (blk[-Xl:] * (1 - fi) + T[bs - Xl:bs] * fi) * g
    out = np.concatenate([T[bs - L:bs], blk, blk[: int(0.25 * SR)]])
    return out


def wobble_db(a):
    """The level's 1-9 Hz semi-amplitude (dB) and its p95-p5 spread, over 25 ms frames."""
    hop, win = int(0.005 * SR), int(0.025 * SR)
    fr = np.lib.stride_tricks.sliding_window_view(a, win)[::hop] * np.hanning(win)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)
    X = np.fft.rfft(db - db.mean())
    f = np.fft.rfftfreq(len(db), 0.005)
    X[(f < 1) | (f > 9)] = 0
    return float(np.sqrt(2) * np.fft.irfft(X, len(db)).std()), float(np.percentile(db, 95) - np.percentile(db, 5))


segs = json.load(open(SEGS))
os.makedirs(OUT, exist_ok=True)
report = json.load(open(f"{OUT}/report.json")) if ONLY and os.path.exists(f"{OUT}/report.json") else {}
cache = {}
for part, (who, lo, hi) in PARTS.items():
    if ONLY and part not in ONLY:
        continue
    cands = []
    for p, ss in segs.items():
        if os.path.basename(p).split("_")[0] != who:
            continue
        for s in ss:
            d = s["t1"] - s["t0"]
            if d >= 0.4:
                cands.append((p, s, d))
    os.makedirs(f"{OUT}/{part}", exist_ok=True)
    rows = []
    for m in range(lo, hi + 1):
        def cost(c):
            p, s, d = c
            straight = "/straight/" in p
            return abs(m - s["midi"]) * 0.7 + s["vib"] / 4 + s["wander"] / 10 - min(d, 2.5) * 0.5 - (0.5 if straight else 0)
        near = [c for c in cands if abs(c[1]["midi"] - m) <= MAX_SHIFT]
        if len(near) < 2:
            near = [c for c in cands if abs(c[1]["midi"] - m) <= WIDE_SHIFT]
        near.sort(key=cost)
        steady = [c for c in near if c[1]["vib"] <= 15]
        if len(steady) >= 2:
            near = steady + [c for c in near if 15 < c[1]["vib"] <= 25]
        chosen = near[:POOL]
        pool = []
        for p, s, d in chosen:
            key = (p, s["t0"], m)
            if key not in cache:
                if p not in cache:
                    cache[p] = librosa.load(p, sr=SR, mono=True)[0]
                y = cache[p]
                a = y[int((s["t0"] + 0.03) * SR): int((s["t1"] - 0.03) * SR)]
                a = steady_pitch(a, s["midi"])
                a = shift(a, m - s["midi"])
                a = norm(a)
                cache[key] = norm(a)
            pool.append(cache[key])
        if MODE != "raw":
            pool = matched(pool)
        # (their first and last 60 ms left out: the edges of the pitch track, the shift and the spectrogram)
        pool = [a[int(0.06 * SR):-int(0.06 * SR)] if len(a) > 0.5 * SR else a for a in pool]
        pool = clean(pool)
        rng = np.random.default_rng(1000 + m)
        P = int(round(SR / hz(m)))
        n = int((LEN + 0.6) * SR)
        if MODE in ("chain", "raw"):
            T, joins = chain(pool, n, rng, P)
        elif MODE == "grain":
            T, joins = grain(pool, n, rng, P)
        else:
            T, joins = synth(pool, n, rng, P, hz(m))
        T = norm(level(T, 0.06))
        out = loopable(T)
        f = int(0.03 * SR)
        out[:f] *= np.linspace(0, 1, f)
        out[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
        wob, spread = wobble_db(out[int(0.2 * SR):int(3.1 * SR)])
        sf.write(f"{TMP}/n.wav", out, SR, subtype="PCM_16")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{TMP}/n.wav", "-ac", "1", "-b:a", "96k", f"{OUT}/{part}/{name(m)}.mp3"], check=True)
        srcs = [f"{os.path.basename(p)[:-4]}@{s['t0']:.1f}s:{name(s['midi'])}({s['vib']:.0f}c)" for p, s, d in chosen]
        rows.append(dict(note=name(m), takes=srcs, shifts=[m - s["midi"] for p, s, d in chosen], joins=joins, level_wobble_db=round(wob, 2), spread_db=round(spread, 2)))
        print(part, name(m), f"{len(chosen)} takes", f"shifts {[m - s['midi'] for p, s, d in chosen]}", f"joins {len(joins)} rho {np.mean(joins) if joins else 0:.2f}", f"wobble {wob:.2f} dB spread {spread:.1f}", flush=True)
    report[part] = rows
json.dump(report, open(f"{OUT}/report.json", "w"), indent=1)
