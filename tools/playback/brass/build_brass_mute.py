"""build_brass_mute.py <VSCO-2-CE Brass/Trumpet/straightM-sus dir> <out dir> <v1|v3> [folder]: D614, BACH BRASS v3's
straight-muted trumpet (the episodes' trumpets, and the second trumpet of five throughout).

Source: VSCO 2: Community Edition (Versilian Studios / Sam Gossner; CC0 1.0: "use these samples for ANY purpose", credit
asked: github.com/sgossner/VSCO-2-CE), Brass/Trumpet/straightM-sus, Sum_SHTrumpet_straightM-sus_<name>_<v>_rr1.wav: eight
pitches, each at two dynamics (v1 soft, v3 loud). The files are named an octave under what they sound (measured here by
the spectrum's lowest strong partials: "A#2" sounds B-flat 3, 233 Hz; "A4" sounds A5, 880 Hz), so each is renamed by its
measured pitch: B-flat 3, C4, D4, G4, B-flat 4, D5, F5, A5 (gaps of 2 to 5 semitones).
Each note as build_brass.py makes its notes: mono, its onset 1 ms before the attack, held to 4.3 s (the recordings
sustain 6-10 s: cut, with build_brass.py's 0.3 s fade), its steady K-weighted RMS (0.25-1.0 s) to build_brass.py's
TARGET times the gain that build made (0.95: the brass sets' level), peaks checked under -1 dBFS, tuning measured and
printed as cents for sampled.ts. Encoded as the other sets (mono 44.1 kHz 80 kbit/s MP3), then transcode.mjs.

Run: python3 -I tools/playback/brass/build_brass_mute.py <dir> public/samples v1 brassTrumpetMute
"""
import sys, os, json, subprocess
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_brass as B  # noqa: E402

GAIN = 0.95
# The file's name -> the pitch it sounds (MIDI), measured.
SOUNDS = {"A#2": 58, "C3": 60, "D3": 62, "G3": 67, "A#3": 70, "D4": 74, "F4": 77, "A4": 81}


def main():
    src, out, layer = sys.argv[1], sys.argv[2], sys.argv[3]
    name = sys.argv[4] if len(sys.argv) > 4 else "brassTrumpetMute"
    folder = os.path.join(out, name)
    os.makedirs(folder, exist_ok=True)
    cents, peaks = {}, []
    load = lambda fn, v: (lambda x: x[B.onset(x) :])(B.decode(os.path.join(src, f"Sum_SHTrumpet_straightM-sus_{fn}_{v}_rr1.wav")))
    # The soft layer's "D3" (D4) has a hum about 26 dB under the note (the others 41-67 dB): its loud take darkened by the
    # median soft/loud difference by harmonic of the other seven, as build_brass.py makes the horn's piano layer.
    dark = {"D3"} if layer == "v1" else set()
    diff = None
    if dark:
        d = [B.harm_profile(load(fn, "v1"), m) - B.harm_profile(load(fn, "v3"), m) for fn, m in SOUNDS.items() if fn not in dark]
        diff = np.median(np.array(d), axis=0)
        diff = np.clip(diff - diff[0], -24, 0)
        print(f"  {sorted(dark)} from v3 darkened: dB by harmonic {np.round(diff[:10], 1).tolist()}", file=sys.stderr)
    for fn, m in SOUNDS.items():
        y = B.darken(load(fn, "v3"), m, diff) if fn in dark else load(fn, layer)
        z = B.extend(y)
        z = z / B.kw_rms(z[int(0.25 * B.SR) : int(1.0 * B.SR)]) * B.TARGET * GAIN
        peaks.append(float(np.abs(z).max()))
        tmp = os.path.join(folder, "_t.f32")
        z.astype(np.float32).tofile(tmp)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(B.SR), "-ac", "1", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "80k", os.path.join(folder, B.fname(m) + ".mp3")], check=True)
        os.remove(tmp)
        seg = z[int(0.4 * B.SR) : int(1.6 * B.SR)]
        cents[B.fname(m)] = round(float(1200 * np.log2(B.f0(seg, B.hz(m)) / B.hz(m))), 1)
    assert max(peaks) < 10 ** (-1 / 20), "a peak over -1 dBFS"
    print(json.dumps({name: cents}))
    print(f"loudest peak {20 * np.log10(max(peaks)):.1f} dBFS", file=sys.stderr)


if __name__ == "__main__":
    main()
