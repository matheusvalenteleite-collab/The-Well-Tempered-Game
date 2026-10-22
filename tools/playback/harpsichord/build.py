# D190: prepare the sampled harpsichord and organ for the bench (src/touch/sampled.ts).
# Usage: python3 -I tools/playback/harpsichord/build.py RAW OUT_SAMPLES OUT_TS
#   RAW: fetch.py's folder (sus/<midi>.wav, rel/<midi>.wav, organ/<name>.wav, pedal/<name>.wav)
#   OUT_SAMPLES: public/samples (writes harpsichord/, harpsichordRel/, pipeOrgan/, pipePedal/)
#   OUT_TS: src/touch/sampled-data.ts (each note's tuning and length, the organ's loops)
import json, os, subprocess, sys
import numpy as np

RAW, OUT, TS = sys.argv[1:4]
SR = 44100
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]


def name(m):
    return f"{NAMES[m % 12]}{m // 12 - 1}"


def load(p, ch=2):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).reshape(-1, ch).astype(np.float64)


def encode(a, path, kbps):
    """a: frames x channels, float. LAME via ffmpeg, constant bit rate."""
    ch = a.shape[1]
    raw = np.clip(a, -1, 1).astype(np.float32).tobytes()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-i", "-", "-c:a", "libmp3lame", "-b:a", f"{kbps}k", "-ac", str(ch), path],
        input=raw, check=True,
    )


def onset(m, db=-40):
    pk = np.abs(m).max()
    return int(np.argmax(np.abs(m) > pk * 10 ** (db / 20)))


def f0(x):
    """Autocorrelation pitch with parabolic interpolation (a steady stretch)."""
    x = x - x.mean()
    n = len(x)
    X = np.fft.rfft(x * np.hanning(n), 2 * n)
    ac = np.fft.irfft(np.abs(X) ** 2)[:n]
    a, b = int(SR / 2500), int(SR / 25)
    k = a + int(np.argmax(ac[a:b]))
    y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
    return SR / (k + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2))


def cents_off(m, nominal):
    """How far the recording is from its nominal pitch (cents); 0 when the estimate is an octave error."""
    try:
        f = f0(m)
    except Exception:
        return 0.0
    c = 1200 * np.log2(f / (440 * 2 ** ((nominal - 69) / 12)))
    return float(round(c, 1)) if abs(c) < 40 else 0.0


def fade(n):
    return 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n))


meta = {"harpsichord": {}, "pipeOrgan": {}, "pipePedal": {}}

# --- The harpsichord (VCSL "Harpsichord, Unk", Harpsi4): 57 keys, MIDI 33-89, sustains and key-up releases.
PRE = int(0.001 * SR)  # 1 ms kept before the pluck
sus, rel, loud = {}, {}, {}
for m in range(33, 90):
    a = load(f"{RAW}/sus/{m}.wav")
    on = max(0, onset(a.mean(1)) - PRE)
    a = a[on:]
    sus[m] = a
    r = load(f"{RAW}/rel/{m}.wav")
    ron = max(0, onset(r.mean(1), -30) - PRE)
    rel[m] = r[ron:]
    # Loudness of the pluck: RMS over its first 0.4 s.
    loud[m] = 20 * np.log10(np.sqrt((a[: int(0.4 * SR)] ** 2).mean()))
ms = np.array(sorted(sus))
lv = np.array([loud[m] for m in ms])
trend = np.polyval(np.polyfit(ms, lv, 2), ms)
# Even out the recording's unevenness halfway towards the smooth trend (at most 3 dB): the voicing's
# own shape across the compass stays, single loud or weak notes do not stick out.
corr = {int(m): float(np.clip((t - l) * 0.5, -3, 3)) for m, l, t in zip(ms, lv, trend)}
peak = max(np.abs(sus[m]).max() * 10 ** (corr[m] / 20) for m in ms)
g_all = 10 ** (-1 / 20) / peak  # the loudest note at -1 dBFS
for m in ms:
    m = int(m)
    g = g_all * 10 ** (corr[m] / 20)
    # Kept: 6.5 s in the bass to 3 s at the top (a harpsichord's damper ends any note at key-up, and
    # D184 damps a plucked note at its written end), with a 0.6 s fade.
    keep = 6.5 - 3.5 * (m - 33) / (89 - 33)
    a = sus[m][: int(keep * SR)] * g
    nf = int(0.6 * SR)
    a[-nf:] *= fade(nf)[:, None]
    encode(a, f"{OUT}/harpsichord/{name(m)}.mp3", 128)
    # The key-up "thunk" (jack and damper): 0.5 s, mono, the same gain as its note.
    r = rel[m][: int(0.5 * SR)].mean(1, keepdims=True) * g
    nr = int(0.15 * SR)
    r[-nr:] *= fade(nr)[:, None]
    encode(r, f"{OUT}/harpsichordRel/{name(m)}.mp3", 64)
    mono = sus[m].mean(1)
    meta["harpsichord"][name(m)] = {"cents": cents_off(mono[int(0.3 * SR) : int(0.3 * SR) + 16384], m), "len": round(len(a) / SR, 3)}

# --- The organ (VCSL Pipe Organ, Ivy Audio "Rode Man3Open" loud manual, and the loud pedal): looped.
NOTE = {"C": 0, "D#": 3, "F#": 6, "A": 9}


def midi_of(n):
    return 12 * (int(n[-1]) + 1) + NOTE[n[:-1]]


def env(m, win):
    n = len(m) // win
    return np.sqrt((m[: n * win].reshape(n, win) ** 2).mean(1))


def loop_points(m, hz, start_s=1.0, lo=1.6, hi=2.4):
    """A loop over the steady stretch: begins at a rising zero crossing near start_s after the onset; its
    end chosen (1.6-2.4 s later, to the sample) where the waveform over the last few periods best matches
    what precedes the beginning (normalised cross-correlation)."""
    S = int(start_s * SR)
    zc = np.where((m[:-1] <= 0) & (m[1:] > 0))[0]
    S = int(zc[np.argmin(np.abs(zc - S))]) + 1
    W = int(max(0.04, 4 / hz) * SR)
    ref = m[S - W : S]
    a, b = S + int(lo * SR), S + int(hi * SR)
    seg = m[a - W : b]
    num = np.correlate(seg, ref, "valid")  # num[i] = <m[a-W+i : a+i], ref>
    en = np.sqrt(np.convolve(seg**2, np.ones(W), "valid")) * np.linalg.norm(ref) + 1e-12
    c = num / en
    i = int(np.argmax(c))
    return S, a + i, float(c[i])


def organ(src, dst, mn):
    a = load(f"{RAW}/{src}/{mn}.wav", 1)[:, 0]
    on = max(0, onset(a) - PRE)
    a = a[on:]
    hz = 440 * 2 ** ((midi_of(mn) - 69) / 12)
    S, E, match = loop_points(a, hz)
    # 150 ms crossfade (250 ms on the pedal): a pipe's sound with its room is not strictly periodic.
    X = int((0.25 if src == "pedal" else 0.15) * SR)
    fi = np.sin(np.linspace(0, np.pi / 2, X)) ** 2
    out = a[: E + int(0.15 * SR)].copy()
    # The crossfade baked into the loop's last stretch: at its end the sound is already what precedes
    # the loop's beginning, so the jump back is seamless; after the end, the beginning's continuation.
    out[E - X : E] = a[E - X : E] * (1 - fi) + a[S - X : S] * fi
    out[E : E + int(0.15 * SR)] = a[S : S + int(0.15 * SR)]
    return out, S, E, match


org = {}
for d, setname in (("organ", "pipeOrgan"), ("pedal", "pipePedal")):
    for f in sorted(os.listdir(f"{RAW}/{d}")):
        mn = f[:-4]
        org[(setname, mn)] = organ(d, setname, mn)
# Levelled: the recording's treble pipes are up to 13 dB below its bass (the organ's voicing, heard in
# its church); in the game the voices of a fugue must stand level, so each note's steady level is
# brought three quarters of the way to the manual's median (the pedal to the same), then one gain puts
# the loudest peak of both sets at -3 dBFS.
steady = {k: 20 * np.log10(np.sqrt((v[0][v[1] : v[2]] ** 2).mean())) for k, v in org.items()}
target = float(np.median([l for k, l in steady.items() if k[0] == "pipeOrgan"]))
lift = {k: 10 ** (0.75 * (target - l) / 20) for k, l in steady.items()}
pk = max(np.abs(org[k][0]).max() * lift[k] for k in org)
for setname in ("pipeOrgan", "pipePedal"):
    for k in [k for k in org if k[0] == setname]:
        out, S, E, match = org[k]
        m = midi_of(k[1])
        encode((out * lift[k] * 10 ** (-3 / 20) / pk)[:, None], f"{OUT}/{setname}/{name(m)}.mp3", 96)
        meta[setname][name(m)] = {"cents": cents_off(out[int(0.5 * SR) : int(0.5 * SR) + 32768], m), "len": round(len(out) / SR, 3), "loop": [round((S - PRE) / SR, 4), round((E - PRE) / SR, 4)], "match": round(match, 3)}

with open(TS, "w") as fh:
    fh.write(
        "/** Generated by tools/playback/harpsichord/build.py (do not edit by hand), D190: each sampled note's\n"
        " * departure from its nominal pitch (cents, measured), its length (s) and, for the organ, its loop\n"
        " * (s from the onset; crossfade baked in). */\n"
        "export const SAMPLED_NOTES: Record<string, Record<string, { cents: number; len: number; loop?: [number, number] }>> = "
        + json.dumps({s: {n: {k: v for k, v in d.items() if k != "match"} for n, d in notes.items()} for s, notes in meta.items()}, separators=(",", ":"))
        + ";\n"
    )
for s, notes in meta.items():
    print(s, len(notes), "notes; cents", [v["cents"] for v in notes.values()])
    if s != "harpsichord":
        print("  loop match", [v["match"] for v in notes.values()])
