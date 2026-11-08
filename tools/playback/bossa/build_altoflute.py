"""build_altoflute.py <iowa alto flute dir> <out dir (public/samples)>: D547, BOSSA NOVA v2's alto flute.

Source (University of Iowa Electronic Music Studios, Musical Instrument Samples, Lawrence Fritts: "may be downloaded
and used for any projects, without restrictions"; theremin.music.uiowa.edu/MIS.html): the 2014 single notes, alto
flute with vibrato, ff, 24-bit stereo 44.1 kHz ("MIS Pitches - 2014/Woodwinds/Alto Flute"), named
AltoFlute.vib.ff.<note>.aif in the source dir. (The 1997 pp and mf scales are without vibrato but must be cut from
scale files; the ff singles' alto flute is still the soft, breathy instrument the bossa's arrangements used: its
spectral centroid at C5 is about a third of the C flute's.)

Every minor third G3-Db6, and F6 (Iowa has no E6): 12 notes. Each note made as BACH BRASS's are (build_brass.py's
functions, imported): mono; the onset kept 1 ms before the attack; held on past its own sustain by crossfaded passages
of its steady stretch to 4.3 s with a 0.3 s fade (sampled.ts WIND_LOOP lies in steady tone); each note's steady
loudness brought to one level; every peak under -1 dBFS; tuning measured and printed as cents for sampled.ts.
Encoded as the other sets: mono 44.1 kHz 80 kbit/s MP3 (ffmpeg, libmp3lame), into public/samples/altoFlute/.

Run: python3 -I tools/playback/bossa/build_altoflute.py <src> public/samples   (numpy and ffmpeg only).
"""
import sys, os, json, subprocess, importlib.util
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("build_brass", os.path.join(here, "..", "brass", "build_brass.py"))
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)
SR = B.SR

NOTES = ["G3", "Bb3", "Db4", "E4", "G4", "Bb4", "Db5", "E5", "G5", "Bb5", "Db6", "F6"]
TARGET = 0.05


def main():
    src, out = sys.argv[1], sys.argv[2]
    made = {}
    for n in NOTES:
        m = B.midi_of(n)
        x = B.decode(os.path.join(src, f"AltoFlute.vib.ff.{n}.aif"))
        y = x[B.onset(x) :]
        z = B.extend(y)
        made[m] = z / B.kw_rms(z[int(0.25 * SR) : int(1.0 * SR)]) * TARGET
    peak = max(np.abs(z).max() for z in made.values())
    print(f"loudest peak {20 * np.log10(peak):.1f} dBFS", file=sys.stderr)
    g = min(1.0, 10 ** (-1 / 20) / peak)
    folder = os.path.join(out, "altoFlute")
    os.makedirs(folder, exist_ok=True)
    cents, total = {}, 0
    for m, z in sorted(made.items()):
        z = z * g
        tmp = os.path.join(folder, "_t.f32")
        z.astype(np.float32).tofile(tmp)
        dst = os.path.join(folder, B.fname(m) + ".mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp, "-codec:a", "libmp3lame", "-b:a", "80k", dst], check=True)
        os.remove(tmp)
        total += os.path.getsize(dst)
        seg = z[int(0.4 * SR) : int(1.6 * SR)]
        cents[B.fname(m)] = round(float(1200 * np.log2(B.f0(seg, B.hz(m)) / B.hz(m))), 1)
    print(json.dumps({"altoFlute": cents}))
    print(f"total {total / 1e6:.2f} MB", file=sys.stderr)


if __name__ == "__main__":
    main()
