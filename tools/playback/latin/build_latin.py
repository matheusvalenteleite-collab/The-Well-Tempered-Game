"""D520/D522: SALSA's and CHORINHO's Latin percussion (public/samples/latinPerc/), from the Versilian Community Sample
Library (VCSL, Versilian Studios LLC, CC0 1.0: https://github.com/sgossner/VCSL). One kit for both bands, each piece
filed under note names (src/touch/sampled.ts LATIN_FILES says which is which):

  SALSA     conga (open and slap), tumba, bongos (high open, high muted, low), the bongo bell (Cowbell 1), the timbal
            bell (Cowbell 2), claves, timbales (VCSL's snare with the snares off, two tunings: the hembra as recorded,
            the macho 5 semitones up), the timbal's rimshot, the cascara (stick on the shell: the snare's stick click);
  CHORINHO  the pandeiro (VCSL's Tambourine 1 for the jingles, its small frame drum "HDrumS" for the head: the thumb's
            bass and the slap, each with the jingles mixed in), the surdo (VCSL's Bass Drum 1), the tamborim (the
            small frame drum's muted hit, 7 semitones up), the agogo (high and low), the ganza (Shaker, Small).

Each hit cut 2 ms before its strike, high-passed (45 Hz; the surdo 30 Hz), trimmed with a fade (drums 0.8 s, bells
0.9 s, the surdo 1.4 s, shakers 0.3 s), its loudness over the first 0.15 s (K-weighted as the audit measures it)
evened to one reference (the kit's levels are set per piece in src/touch/chip.ts LATIN_KIT, the recordings' dynamic
layers kept as colour), one gain for all (the loudest peak at -1 dBFS); mono 44.1 kHz 64 kbit/s MP3.
Usage: python3 -I build_latin.py <VCSL wav dir (flat)> <public/samples>. The downloads are data, never code."""
import sys, os, subprocess
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample

SRC, OUT = sys.argv[1], sys.argv[2]
SR = 44100
NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"]


def fname(m):
    return NAMES[m % 12] + str(m // 12 - 1)


def mono(f):
    x, sr = sf.read(os.path.join(SRC, f), dtype="float64")
    assert sr == SR, (f, sr)
    return x.mean(1) if x.ndim > 1 else x


def hp(x, f):
    return sosfilt(butter(4, f, "highpass", fs=SR, output="sos"), x)


def strike_at(x):
    w = np.abs(x[: int(0.4 * SR)])
    h = int(0.001 * SR)
    n = len(w) // h
    e = w[: n * h].reshape(n, h).max(1)
    p = int(np.argmax(e))
    j = p
    while j > 0 and e[j - 1] > e[p] * 0.05:
        j -= 1
    return j * h


def kw_rms(m):
    X = np.fft.rfft(m)
    f = np.fft.rfftfreq(len(m), 1 / SR)
    g = (f / np.sqrt(f ** 2 + 100 ** 2)) * np.where(f > 2000, 10 ** (4 / 20), 1)
    return np.sqrt((np.fft.irfft(X * g, len(m)) ** 2).mean())


def hit(f, length, fade, lo=45, semis=0, mix=None):
    x = mono(f)
    if mix:
        y = mono(mix[0])
        y = y[strike_at(y):]
        x = x[strike_at(x):]
        n = max(len(x), len(y))
        x = np.pad(x, (0, n - len(x))) + mix[1] * np.pad(y, (0, n - len(y)))
    i = strike_at(x)
    x = x[max(0, i - int(0.002 * SR)):]
    if semis:
        x = resample(x, int(len(x) / 2 ** (semis / 12)))
    x = hp(x, lo)
    y = x[: int(length * SR)].copy()
    fl = min(len(y), int(fade * SR))
    y[-fl:] *= np.linspace(1, 0, fl) ** 2
    return y


def mp3(y, path):
    tmp = path + ".wav"
    sf.write(tmp, np.clip(y, -1, 1), SR, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", str(SR), "-codec:a", "libmp3lame", "-b:a", "64k", path], check=True)
    os.remove(tmp)


D, B, S = (0.8, 0.5), (0.9, 0.5), (0.3, 0.15)
T1 = "Tamb1_Hit_v1_rr1_Mid.wav"
# piece: [dynamic layer: [round robin: (file, (length, fade), options)]], numbered from MIDI 36 in this order.
KIT = {
    "conga": [[("Conga_HitN_v2_rr1_Sum.wav", D, {}), ("Conga_HitN_v2_rr2_Sum.wav", D, {})], [("Conga_HitN_v3_rr1_Sum.wav", D, {}), ("Conga_HitN_v3_rr2_Sum.wav", D, {})]],
    "slap": [[("Conga_HitFM_v1_rr1_Sum.wav", D, {}), ("Conga_HitFM_v1_rr2_Sum.wav", D, {})], [("Conga_HitFM_v2_rr1_Sum.wav", D, {}), ("Conga_HitFM_v2_rr2_Sum.wav", D, {})]],
    "tumba": [[("Tumba_HitN_v2_rr1_Sum.wav", D, {}), ("Tumba_HitN_v2_rr2_Sum.wav", D, {})], [("Tumba_HitN_v4_rr1_Sum.wav", D, {}), ("Tumba_HitN_v4_rr2_Sum.wav", D, {})]],
    "bongoHi": [[("BongoH_Hit1_v2_rr1_Mid.wav", D, {}), ("BongoH_Hit1_v2_rr2_Mid.wav", D, {})], [("BongoH_Hit1_v3_rr1_Mid.wav", D, {}), ("BongoH_Hit1_v3_rr2_Mid.wav", D, {})]],
    "bongoMute": [[("BongoH_HitMuted1_v1_rr1_Mid.wav", D, {}), ("BongoH_HitMuted1_v1_rr2_Mid.wav", D, {})], [("BongoH_HitMuted1_v2_rr1_Mid.wav", D, {}), ("BongoH_HitMuted1_v2_rr2_Mid.wav", D, {})]],
    "bongoLo": [[("BongoL_Hit1_v2_rr1_Mid.wav", D, {}), ("BongoL_Hit1_v2_rr2_Mid.wav", D, {})], [("BongoL_Hit1_v3_rr1_Mid.wav", D, {}), ("BongoL_Hit1_v3_rr2_Mid.wav", D, {})]],
    "bell": [[("Cowbell1_Normal_v2_rr1_Mid.wav", B, {})], [("Cowbell1_Normal_v3_rr1_Mid.wav", B, {})]],
    "bellLow": [[("Cowbell1_Hit_v4_rr1_Mid.wav", B, {})]],
    "timbalBell": [[("Cowbell2_Normal_v2_rr1_Mid.wav", B, {})], [("Cowbell2_Normal_v3_rr1_Mid.wav", B, {})]],
    "clave": [[("Claves1_Hit_v2_rr1_Mid.wav", D, {}), ("Claves2_Hit_v2_rr1_Mid.wav", D, {})], [("Claves1_Hit_v3_rr1_Mid.wav", D, {}), ("Claves2_Hit_v3_rr1_Mid.wav", D, {})]],
    "hembra": [[("Snare2_HitNS_v4_rr1_Mid.wav", D, {}), ("Snare2_HitNS_v4_rr2_Mid.wav", D, {})], [("Snare2_HitNS_v5_rr1_Mid.wav", D, {}), ("Snare2_HitNS_v5_rr2_Mid.wav", D, {})]],
    "macho": [[("Snare2_HitNS_v4_rr1_Mid.wav", D, {"semis": 5}), ("Snare2_HitNS_v4_rr2_Mid.wav", D, {"semis": 5})], [("Snare2_HitNS_v5_rr1_Mid.wav", D, {"semis": 5}), ("Snare2_HitNS_v5_rr2_Mid.wav", D, {"semis": 5})]],
    "rimshot": [[("Snare2_HitNS_v6_rr1_Mid.wav", D, {"semis": 2}), ("Snare2_HitNS_v6_rr2_Mid.wav", D, {"semis": 2})]],
    "cascara": [[("Snare2_stick_v1_rr1_Mid.wav", S, {}), ("Snare2_stick_v1_rr2_Mid.wav", S, {})]],
    "pandJingle": [[("Tamb1_Shake_rr2_Mid.wav", S, {}), ("Tamb1_Shake_rr1_Mid.wav", S, {})]],
    "pandHit": [[(T1, D, {})], [("Tamb1_Hit_v2_rr1_Mid.wav", D, {})]],
    "pandBass": [[("HDrumS_Hit_v3_rr1_Sum.wav", D, {"mix": (T1, 0.35)}), ("HDrumS_Hit_v3_rr2_Sum.wav", D, {"mix": (T1, 0.35)})]],
    "pandSlap": [[("HDrumS_HitMuted_v3_rr1_Sum.wav", D, {"mix": (T1, 0.5)}), ("HDrumS_HitMuted_v3_rr2_Sum.wav", D, {"mix": (T1, 0.5)})]],
    "surdo": [[("BDrumNew_hit_v2_rr1_Sum.wav", (1.4, 0.8), {"lo": 30}), ("BDrumNew_hit_v2_rr2_Sum.wav", (1.4, 0.8), {"lo": 30})], [("BDrumNew_hit_v3_rr1_Sum.wav", (1.4, 0.8), {"lo": 30}), ("BDrumNew_hit_v3_rr2_Sum.wav", (1.4, 0.8), {"lo": 30})]],
    "tamborim": [[("HDrumS_HitMuted_v3_rr1_Sum.wav", (0.4, 0.25), {"semis": 7, "lo": 200}), ("HDrumS_HitMuted_v3_rr2_Sum.wav", (0.4, 0.25), {"semis": 7, "lo": 200})]],
    "agogoHi": [[("Agogo_High_v2_rr1_Mid.wav", B, {})], [("Agogo_High_v3_rr1_Mid.wav", B, {})]],
    "agogoLo": [[("Agogo_Low_v2_rr1_Mid.wav", (1.1, 0.6), {})]],
    "ganza": [[("Mid_ShakerHighFaster_Down_rr1.wav", S, {}), ("Mid_ShakerHighFaster_Up_rr1.wav", S, {})], [("Mid_ShakerDouble_Down_rr1.wav", S, {}), ("Mid_ShakerDouble_Down_rr2.wav", S, {})]],
}
ys, files, m = {}, {}, 36
for piece, layers in KIT.items():
    files[piece] = []
    for layer in layers:
        row = []
        for f, (length, fade), opt in layer:
            ys[m] = hit(f, length, fade, **opt)
            row.append(m)
            m += 1
        files[piece].append(row)
REF = 0.1
for k in ys:
    ys[k] = ys[k] * REF / kw_rms(ys[k][: int(0.15 * SR)])
g = 10 ** (-1 / 20) / max(np.abs(y).max() for y in ys.values())
os.makedirs(os.path.join(OUT, "latinPerc"), exist_ok=True)
lens = {}
for k, y in sorted(ys.items()):
    mp3(y * g, os.path.join(OUT, "latinPerc", fname(k) + ".mp3"))
    lens[k] = round(len(y) / SR, 2)
print("LATIN_FILES =", {p: v for p, v in files.items()})
print("LATIN_LEN =", lens)
print("ref dB %.1f (K-weighted, first 0.15 s), gain %.2f" % (20 * np.log10(REF * g), g))
