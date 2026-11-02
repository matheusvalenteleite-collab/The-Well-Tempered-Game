"""build_brass.py <iowa brass dir> <out dir (public/samples)>: D502, BACH BRASS's recordings.

Sources (University of Iowa Electronic Music Studios, Musical Instrument Samples, Lawrence Fritts: "may be downloaded
and used for any projects, without restrictions"; theremin.music.uiowa.edu/MIS.html):
  the FORTE layer: the 2014 single notes, ff, 24-bit stereo 44.1 kHz ("MIS Pitches - 2014/Brass": Bb trumpet without
  vibrato, horn, tenor trombone), named <Instrument>.ff.<note>.aif in the source dir; the bass trombone's from its
  1997 mf scale files (BassTrombone.mf.<range>.aiff: its ff singles' low notes are a blare, centroid 3.4-6.1 kHz);
  the PIANO layer: the 1997 chromatic scale files, pp, 16-bit mono ("MIS/Brass": Trumpet.novib.pp.<range>,
  TenorTrombone.pp, BassTrombone.pp), named <Instrument>.pp.<range>.aiff, cut into notes here (each named by its
  measured pitch).

Every minor third of each instrument's part, the same pitches in both layers (sampled.ts SAMPLED.*.blend: the touch's
brassiness crossfades them, chip.ts). Each note: mono; onset kept 1 ms before the attack (5 ms RMS reaching 3% of its
peak); held on past the recording's own sustain by crossfaded passages of its steady stretch (each joined where the
waveform matches best, 60 ms equal-power: no repeated loop heard within the file), to 4.3 s with a 0.3 s fade, so
sampled.ts WIND_LOOP (1.4-3.6 s from the onset) lies in steady tone; each note's steady loudness (0.25-1.0 s,
K-weighted as the audit measures it) brought to one level, both layers alike (the layers differ in colour, the
engine sets the level); every peak checked under -1 dBFS; tuning measured (autocorrelation over the steady stretch)
and printed as cents for sampled.ts. The horn's 1997 pp and mf scales have a noise floor 23-33 dB under the notes and
lack C3-B3: its piano layer is the forte note darkened by the trumpet's and the trombone's measured pp/ff difference
by harmonic (their median: -5 dB at the 2nd harmonic, -10 at the 3rd, -17 at the 5th, at most -24), as is the
trombone's one note its scale lost (G4). The bass is the bass trombone throughout, Bb1-G4.
Encoded as the other sets: mono 44.1 kHz 80 kbit/s MP3 (ffmpeg, libmp3lame).

Run: python3 -I tools/playback/brass/build_brass.py <src> public/samples   (numpy and ffmpeg only).
"""
import sys, os, re, subprocess, json
import numpy as np

SR = 44100
NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
OUT_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]
LEN, FADE, XF = 4.3, 0.3, 0.06


def midi_of(n):
    m = re.match(r"([A-G]b?)(\d)$", n)
    return NAMES.index(m.group(1)) + 12 * (int(m.group(2)) + 1)


def fname(m):
    return OUT_NAMES[m % 12] + str(m // 12 - 1)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def rms_env(x, win):
    k = np.ones(win) / win
    return np.sqrt(np.convolve(x * x, k, "same"))


def f0(seg, guess):
    lo, hi = int(SR / (guess * 1.12)), int(SR / (guess / 1.12))
    seg = seg - seg.mean()
    n = len(seg)
    X = np.fft.rfft(seg, 2 * n)
    ac = np.fft.irfft(X * np.conj(X))[: hi + 2]
    k = lo + int(np.argmax(ac[lo : hi + 1]))
    a, b, c = ac[k - 1], ac[k], ac[k + 1]
    p = k + 0.5 * (a - c) / (a - 2 * b + c)
    return SR / p


def kw_rms(m):
    X = np.fft.rfft(m)
    f = np.fft.rfftfreq(len(m), 1 / SR)
    g = (f / np.sqrt(f ** 2 + 100 ** 2)) * np.where(f > 2000, 10 ** (4 / 20), 1)
    return np.sqrt((np.fft.irfft(X * g, len(m)) ** 2).mean())


def onset(x):
    env = rms_env(x, int(0.005 * SR))
    return max(0, int(np.argmax(env > env.max() * 0.03)) - int(0.001 * SR))


def steady_end(y):
    """Where the note's sustain ends (s from the onset): its 20 ms RMS falls under 70% of the steady median."""
    env = rms_env(y, int(0.02 * SR))
    a = int(0.25 * SR)
    med = np.median(env[a : max(a + 1, int(len(y) * 0.6))])
    below = np.nonzero(env[a:] < med * 0.7)[0]
    end = (a + below[0]) if len(below) else len(y)
    return max(a + int(0.3 * SR), end - int(0.08 * SR))


def extend(y):
    """The note held on to LEN s: its steady stretch's passages appended, each where the waveform best matches."""
    se = steady_end(y)
    s0 = int(0.3 * SR)
    out = y[:se].copy()
    xf = int(XF * SR)
    need = int(LEN * SR)
    rng = np.random.default_rng(len(y))
    while len(out) < need:
        tail = out[-xf:]
        best, bp = -2, s0
        hi = max(s0 + 1, se - xf - int(0.3 * SR))
        cands = np.linspace(s0, hi, num=min(400, hi - s0 + 1)).astype(int)
        # Prefer passages from the first half (never the stretch just played): a little randomness so the joins differ.
        for p in cands:
            seg = y[p : p + xf]
            c = float(np.dot(tail, seg) / (np.linalg.norm(tail) * np.linalg.norm(seg) + 1e-12))
            c += rng.uniform(0, 0.01)
            if c > best:
                best, bp = c, p
        w = np.linspace(0, np.pi / 2, xf)
        out[-xf:] = tail * np.cos(w) + y[bp : bp + xf] * np.sin(w)
        out = np.concatenate([out, y[bp + xf : se]])
    out = out[:need]
    f = int(FADE * SR)
    out[-f:] *= np.linspace(1, 0, f)
    return out


def segments(x):
    """A scale file's notes: (start, end) samples where the 10 ms RMS stands 18 dB over the file's floor."""
    env = rms_env(x, int(0.01 * SR))
    floor = np.percentile(env, 8) + 1e-9
    peakish = np.percentile(env, 99)
    th = max(floor * 10 ** (18 / 20), peakish * 10 ** (-38 / 20))
    on = (env > th).astype(np.int32)
    # Gaps shorter than 0.12 s bridged (a note's own wobble), then the runs of sound.
    bridge = int(0.12 * SR)
    filled = np.convolve(on, np.ones(bridge, dtype=np.int32), "full")[: len(on)] > 0
    edges = np.diff(np.concatenate([[0], filled.astype(np.int8), [0]]))
    starts, ends = np.nonzero(edges == 1)[0], np.nonzero(edges == -1)[0]
    segs = [(int(a), int(b) - bridge) for a, b in zip(starts, ends) if b - bridge - a > int(0.5 * SR)]
    return segs, 20 * np.log10(peakish / floor)


def cut_scale(path, lo):
    """The notes of a chromatic scale file from `lo` (MIDI) up: {midi: samples}, each named by its measured pitch (the
    semitone nearest its place in the scale that it is within 45 cents of; a merged or unclear segment left out)."""
    x = decode(path)
    segs, snr = segments(x)
    notes = {}
    for k, (a, b) in enumerate(segs):
        seg = x[a:b]
        mid = seg[int(0.3 * SR) : int(min(len(seg), 1.3 * SR))]
        best = None
        for m in range(lo - 1, lo + 16):
            c = 1200 * np.log2(f0(mid, hz(m)) / hz(m))
            if abs(c) <= 45 and (best is None or abs(m - lo - k) < abs(best - lo - k)):
                best = m
        if best is None or best in notes:
            print(f"  ! {os.path.basename(path)} segment {k}: no clean pitch, left out", file=sys.stderr)
            continue
        notes[best] = x[max(0, a - int(0.05 * SR)) : b + int(0.2 * SR)]
    print(f"  {os.path.basename(path)}: {' '.join(fname(m) for m in sorted(notes))}; floor {snr:.0f} dB under the loudest", file=sys.stderr)
    return notes


def harm_profile(y, m, H=24):
    """A steady tone's level at each harmonic (dB, 1..H)."""
    seg = y[int(0.3 * SR) : int(1.3 * SR)]
    seg = seg * np.hanning(len(seg))
    X = np.abs(np.fft.rfft(seg))
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    fh = f0(y[int(0.3 * SR) : int(1.3 * SR)], hz(m))
    out = []
    for h in range(1, H + 1):
        sel = (f > fh * (h - 0.3)) & (f < fh * (h + 0.3))
        out.append(20 * np.log10(X[sel].max() + 1e-12) if sel.any() else -120)
    return np.array(out)


def darken(y, m, diff):
    """y filtered by `diff` (dB per harmonic of its pitch): the horn's piano layer made from its forte (no pp there)."""
    n = len(y)
    X = np.fft.rfft(y)
    f = np.fft.rfftfreq(n, 1 / SR)
    h = f / hz(m)
    g = np.interp(h, np.arange(1, len(diff) + 1), diff, left=diff[0], right=diff[-1])
    return np.fft.irfft(X * 10 ** (g / 20), n)


# The parts: each minor third of its compass (MIDI), the forte file's instrument name, the scale files (layer, range, first note).
PARTS = {
    "brassTrumpet": {"ff": "Trumpet", "notes": ["E3", "G3", "Bb3", "Db4", "E4", "G4", "Bb4", "Db5", "E5", "G5", "Bb5", "Db6"],
                     "scales": [("Trumpet.pp.E3B3", "E3"), ("Trumpet.pp.C4B4", "C4"), ("Trumpet.pp.C5B5", "C5"), ("Trumpet.pp.C6Eb6", "C6")]},
    "brassHorn": {"ff": "Horn", "notes": ["F2", "Ab2", "B2", "D3", "F3", "Ab3", "B3", "D4", "F4", "Ab4", "B4", "D5", "F5"],
                  # (Its 1997 pp and mf scales have a noise floor 23-33 dB under the notes and lack C3-B3: none taken.)
                  "scales": []},
    "brassTrombone": {"ff": "TenorTrombone", "notes": ["E2", "G2", "Bb2", "Db3", "E3", "G3", "Bb3", "Db4", "E4", "G4", "Bb4", "C5"],
                      "scales": [("TenorTrombone.pp.E2B2", "E2"), ("TenorTrombone.pp.C3B3", "C3"), ("TenorTrombone.pp.C4B4", "C4"), ("TenorTrombone.pp.C5", "C5")]},
    # The bass: the bass trombone throughout (Bb1-Db4), its strong layer the mf scale, not the ff singles (measured:
    # the ff low notes a blare, spectral centroid 3.4-6.1 kHz at Bb1-Eb2, the "weird and ugly" bass; mf 1.5-2.5 kHz).
    "brassBass": {"ff": None, "notes": ["Bb1", "C2", "Eb2", "Gb2", "A2", "C3", "Eb3", "Gb3", "A3", "C4", "Eb4", "G4"],
                  "forte": [("BassTrombone.mf.C1B1", "Db1"), ("BassTrombone.mf.C2B2", "C2"), ("BassTrombone.mf.C3B3", "C3"), ("BassTrombone.mf.C4G4", "C4")],
                  "scales": [("BassTrombone.pp.C1B1", "C1"), ("BassTrombone.pp.C2B2", "C2"), ("BassTrombone.pp.C3B3", "C3"), ("BassTrombone.pp.C4Bb4", "C4")]},
}
# The horn after the trumpet and the trombone: its piano layer their pooled pp/ff difference by harmonic.
PARTS = {k: PARTS[k] for k in ("brassTrumpet", "brassTrombone", "brassHorn", "brassBass")}
POOL = []
TARGET = 0.05  # each note's steady K-weighted RMS (about -26 dBFS)


def main():
    src, out = sys.argv[1], sys.argv[2]
    made = {}  # set -> {midi: (forte, piano)}
    tuning = {}
    for name, part in PARTS.items():
        print(name, file=sys.stderr)
        scale = {}
        for f, lo in part["scales"]:
            scale.update(cut_scale(os.path.join(src, f + ".aiff"), midi_of(lo)))
        forte = {}
        for f, lo in part.get("forte", []):
            forte.update(cut_scale(os.path.join(src, f + ".aiff"), midi_of(lo)))
        fortes, pianos = {}, {}
        for n in part["notes"]:
            m = midi_of(n)
            x = forte[m] if part["ff"] is None else decode(os.path.join(src, f"{part['ff']}.ff.{n}.aif"))
            fortes[m] = x[onset(x) :]
            if m in scale:
                p = scale[m]
                pianos[m] = p[onset(p) :]
        missing = [m for m in fortes if m not in pianos]
        if name in ("brassTrumpet", "brassTrombone"):
            POOL.extend(harm_profile(pianos[m], m) - harm_profile(fortes[m], m) for m in fortes if m in pianos)
        if missing:
            # A note without a piano layer (the horn's): its forte darkened by the trumpet's and trombone's measured difference.
            diff = np.median(np.array(POOL), axis=0)
            diff -= diff[0]
            diff = np.clip(diff, -24, 0)
            print(f"  darkened from forte for {[fname(m) for m in missing]}: dB by harmonic {np.round(diff[:12], 1).tolist()}", file=sys.stderr)
            for m in missing:
                pianos[m] = darken(fortes[m], m, diff)
        made[name] = {}
        for m in fortes:
            layers = []
            for y in (fortes[m], pianos[m]):
                z = extend(y)
                z = z / kw_rms(z[int(0.25 * SR) : int(1.0 * SR)]) * TARGET
                layers.append(z)
            made[name][m] = layers
    for name, part in PARTS.items():
        if "above" in part:
            other, ns = part["above"]
            for n in ns:
                made[name][midi_of(n)] = made[other][midi_of(n)]
    peak = max(np.abs(z).max() for s in made.values() for ls in s.values() for z in ls)
    print(f"loudest peak {20 * np.log10(peak):.1f} dBFS", file=sys.stderr)
    g = min(1.0, 10 ** (-1 / 20) / peak)
    total = 0
    for name, notes in made.items():
        for layer, suffix in ((0, ""), (1, "P")):
            folder = os.path.join(out, name + suffix)
            os.makedirs(folder, exist_ok=True)
            cents = {}
            for m, ls in sorted(notes.items()):
                z = ls[layer] * g
                tmp = os.path.join(folder, "_t.f32")
                z.astype(np.float32).tofile(tmp)
                dst = os.path.join(folder, fname(m) + ".mp3")
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "80k", dst], check=True)
                os.remove(tmp)
                total += os.path.getsize(dst)
                seg = z[int(0.4 * SR) : int(1.6 * SR)]
                cents[fname(m)] = round(float(1200 * np.log2(f0(seg, hz(m)) / hz(m))), 1)
            tuning[name + suffix] = cents
    print(json.dumps(tuning))
    print(f"total {total / 1e6:.2f} MB", file=sys.stderr)


if __name__ == "__main__":
    main()
