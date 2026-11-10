"""build_brass_mf.py <iowa brass dir> <out dir (public/samples)>: D609, BACH BRASS v3's main sets at mf.

D540's one-layer rule (sound.ts BAND_SLIM.oneLayer) holds BACH BRASS's piano layers off, so the game played only the
forte layer build_brass.py made: the 2014 ff singles of the trumpet and the tenor trombone (measured, the brass research:
their 2-5 kHz share -8.8 and -7.9 dB, the edge). This builds the trumpet's and the tenor trombone's main sets again from
the University of Iowa's 1997 mezzoforte chromatic scales, the bass trombone's path in build_brass.py:
  Trumpet.novib.mf.<range>.aiff (E3B3, C4B4, C5B5, C6D6; named Trumpet.mf.<range>.aiff in the source dir) and
  TenorTrombone.mf.<range>.aiff (E2B2 (" E2B2" on the server), C3B3, C4B4, C5),
cut into notes by build_brass.py's cut_scale, at the same pitches as the forte sets (every minor third), each held on to
4.3 s and levelled exactly as build_brass.py does (its steady K-weighted RMS to TARGET), then scaled by the gain that
build made (GAIN, measured on its MP3s: 0.950 for every set), so the new sets sit where the old ones did. A note the mf
scale lost falls back to the ff single darkened by the measured mf/ff difference of its neighbours (none needed in the
2026-11-10 build). Written to new folders (brassTrumpetMf, brassTromboneMf): SALSA's, ABBEY ROAD's and the others'
brassTrumpet/brassTrombone stay as they are. The horn keeps its 2014 ff (its 1997 scales noisy), the bass its mf.

Licence: Iowa MIS, "may be downloaded and used for any projects, without restrictions" (as build_brass.py).
Run: python3 -I tools/playback/brass/build_brass_mf.py <src> public/samples   (numpy and ffmpeg only); then
node tools/playback/codec/transcode.mjs and node tools/sample-manifest.mjs.
"""
import sys, os, json, subprocess
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_brass as B  # noqa: E402

GAIN = 0.95
PARTS = {
    "brassTrumpetMf": {"ff": "Trumpet", "notes": B.PARTS["brassTrumpet"]["notes"], "scales": [("Trumpet.mf.E3B3", "E3"), ("Trumpet.mf.C4B4", "C4"), ("Trumpet.mf.C5B5", "C5"), ("Trumpet.mf.C6D6", "C6")]},
    "brassTromboneMf": {"ff": "TenorTrombone", "notes": B.PARTS["brassTrombone"]["notes"], "scales": [("TenorTrombone.mf.E2B2", "E2"), ("TenorTrombone.mf.C3B3", "C3"), ("TenorTrombone.mf.C4B4", "C4"), ("TenorTrombone.mf.C5", "C5")]},
}


def main():
    src, out = sys.argv[1], sys.argv[2]
    tuning, report = {}, {}
    for name, part in PARTS.items():
        print(name, file=sys.stderr)
        scale = {}
        for f, lo in part["scales"]:
            scale.update(B.cut_scale(os.path.join(src, f + ".aiff"), B.midi_of(lo)))
        folder = os.path.join(out, name)
        os.makedirs(folder, exist_ok=True)
        cents, peaks = {}, []
        for n in part["notes"]:
            m = B.midi_of(n)
            if m in scale:
                y = scale[m][B.onset(scale[m]):]
            else:
                # (A note the scale lost: the ff single darkened by its neighbours' mf/ff difference.)
                x = B.decode(os.path.join(src, f"{part['ff']}.ff.{n}.aif"))
                x = x[B.onset(x):]
                names = {B.midi_of(q): q for q in part["notes"]}
                diffs = [B.harm_profile(scale[k][B.onset(scale[k]):], k) - B.harm_profile(B.decode(os.path.join(src, f"{part['ff']}.ff.{names[k]}.aif")), k) for k in scale if k in names and abs(k - m) <= 4]
                d = np.median(np.array(diffs), axis=0)
                d = np.clip(d - d[0], -24, 0)
                y = B.darken(x, m, d)
                print(f"  {n}: not in the mf scale, the ff darkened", file=sys.stderr)
            z = B.extend(y)
            z = z / B.kw_rms(z[int(0.25 * B.SR) : int(1.0 * B.SR)]) * B.TARGET * GAIN
            peaks.append(float(np.abs(z).max()))
            tmp = os.path.join(folder, "_t.f32")
            z.astype(np.float32).tofile(tmp)
            dst = os.path.join(folder, B.fname(m) + ".mp3")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(B.SR), "-ac", "1", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "80k", dst], check=True)
            os.remove(tmp)
            seg = z[int(0.4 * B.SR) : int(1.6 * B.SR)]
            cents[B.fname(m)] = round(float(1200 * np.log2(B.f0(seg, B.hz(m)) / B.hz(m))), 1)
        tuning[name] = cents
        report[name] = round(20 * np.log10(max(peaks)), 1)
        assert max(peaks) < 10 ** (-1 / 20), f"{name}: a peak over -1 dBFS"
    print(json.dumps(tuning))
    print(f"loudest peaks (dBFS): {report}", file=sys.stderr)


if __name__ == "__main__":
    main()
