"""build_consort_bow.py <TinySOL dir (its Strings/)> <out dir (public/samples)> [--dry]: D1056, the bow's colour layers for STRING CONSORT's
violin and cello (THE NEW LAB's bowing, MECH.bow, src/touch/bow.ts): TinySOL's ordinario pp and ff (IRCAM, CC BY 4.0,
zenodo.org/records/3685367; streamed out of the archive, only Strings/Violin, Strings/Violoncello and Strings/Viola ordinario kept), the
same pitches and the same strings as build_consort.py's mf recordings (violinSolo/, celloSolo/), made the same way (build_consort.py's
prepare: onset 1 ms before the bow, retuned by resampling to within a cent, 4.5 s with a 0.3 s fade, the held swell evened, the violin's
onset quickened), so the three layers line up note for note and the engine crossfades them at one pitch (chip.ts bowLayers).

Their level: each layer's recording brought to its mf recording's loudness THROUGH THE PHONE MODEL (two 600 Hz high-passes, then EBU R128's
integrated loudness, ffmpeg's ebur128, over the held note's 0.05-4.0 s: a bowed note is a held one) plus OFFSET_DB (pp -0.75, ff +0.75): the bow's
speed changes the colour (the ff's fuller, brighter tone, the pp's airier one), the level hardly (D508). The mf files are rebuilt in memory
(build_consort.py --dry gives the strings it picked and their trims) and never written. Prints per note the files, the cents, the levels and
the measure: each layer's level against the mf's, full band and phone model. Then node tools/playback/codec/transcode.mjs and node
tools/sample-manifest.mjs."""
import sys, os, glob, json, re, subprocess
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

src, out = sys.argv[1], sys.argv[2]
DRY = "--dry" in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build_consort.py")
# build_consort.py's functions (prepare, kw_rms, midi_of, ...), without running its build.
code = open(BUILD).read().split("\nreport = {}")[0]
argv0 = sys.argv
sys.argv = [BUILD, src, out, "--dry"]
ns = {"__file__": BUILD}
exec(compile(code, BUILD, "exec"), ns)
sys.argv = argv0
prepare, kw_rms, midi_of, ATTACK, SETS = ns["prepare"], ns["kw_rms"], ns["midi_of"], ns["ATTACK"], ns["SETS"]

OFFSET_DB = {"pp": -0.75, "ff": 0.75}
# Every layer file written HEAD_DB under its level (headroom: at the mf's level a pp's or an ff's peak can pass the mf set's -1 dBFS);
# the engine gives it back (sampled.ts BOW_LAYER_GAIN, 10 ** (-HEAD_DB / 20)).
HEAD_DB = -4
LAYERS = {"violinSolo": ("violinSoloPp", "violinSoloFf"), "celloSolo": ("celloSoloPp", "celloSoloFf")}

# the mf build's choice (deterministic): its last line is the report
res = subprocess.run([sys.executable, "-I", BUILD, src, out, "--dry", "--only", ",".join(LAYERS)], capture_output=True, text=True, check=True)
picked = json.loads(res.stdout.strip().splitlines()[-1])

SOS = butter(2, 600, "highpass", fs=44100, output="sos")


def phone(y, sr):
    sos = SOS if sr == 44100 else butter(2, 600, "highpass", fs=sr, output="sos")
    return sosfilt(sos, sosfilt(sos, y))


def level(y, sr, ph=False):
    """The loudness (LUFS: ffmpeg's EBU R128 integrated, the K-weighting and gating it applies) of the note's 0.05-4.0 s, through the
    phone model (`ph`: two 600 Hz high-passes first) or full band: what a held, bowed note is heard at."""
    z = phone(y, sr) if ph else y
    tmp = os.path.join(out, "_bow_lufs.wav")
    sf.write(tmp, z[int(0.05 * sr):int(4.0 * sr)], sr, subtype="FLOAT")
    r = subprocess.run(["ffmpeg", "-nostats", "-i", tmp, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    os.remove(tmp)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def centroid_oct(y, sr, hz):
    seg = y[int(0.5 * sr):int(3 * sr)]
    Y = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / sr)
    s = (f > 50) & (f < 12000)
    return float(np.log2((Y[s] * f[s]).sum() / max(Y[s].sum(), 1e-20) / hz))


report = {}
for folder, (pp_folder, ff_folder) in LAYERS.items():
    inst, ab, _ = SETS[folder]
    for name, row in picked[folder].items():
        # e.g. Vn-ord-G3-mf-4c-N.wav: the pitch and the string
        parts = row["file"].split("-")
        pitch, string = parts[2], parts[4]
        mi = midi_of(pitch)
        mf = prepare(os.path.join(src, inst, "ordinario", row["file"]), mi, ATTACK.get(folder))
        y_mf = mf["y"] * 10 ** (row["trim"] / 20)
        sr = mf["sr"]
        hz = 440 * 2 ** ((mi - 69) / 12)
        l_mf, p_mf = level(y_mf, sr), level(y_mf, sr, True)
        for dyn, lf in (("pp", pp_folder), ("ff", ff_folder)):
            cands = [f for f in sorted(glob.glob(os.path.join(src, inst, "ordinario", f"{ab}-ord-{pitch}-{dyn}-*.wav"))) if "-R" not in os.path.basename(f)]
            same = [f for f in cands if f"-{dyn}-{string}-" in os.path.basename(f)]
            f = (same or cands)[0]
            n = prepare(f, mi, ATTACK.get(folder))
            g = 10 ** ((p_mf + OFFSET_DB[dyn] - level(n["y"], n["sr"], True)) / 20)
            y = n["y"] * g * 10 ** (HEAD_DB / 20)
            peak = float(np.abs(y).max())
            assert peak < 1, (lf, name, peak)
            if not DRY:
                os.makedirs(os.path.join(out, lf), exist_ok=True)
                tmp = os.path.join(out, lf, "_t.wav")
                sf.write(tmp, y, n["sr"], subtype="PCM_16")
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "80k", os.path.join(out, lf, name + ".mp3")], check=True)
                os.remove(tmp)
            r = dict(file=os.path.basename(f), sameString=bool(same), cents=n["cents"], left=n["left"], trim=round(20 * np.log10(g), 1), peak=round(20 * np.log10(peak), 1),
                     fullDb=round(level(y, n["sr"]) - HEAD_DB - l_mf, 2), phoneDb=round(level(y, n["sr"], True) - HEAD_DB - p_mf, 2), brightOct=round(centroid_oct(y, n["sr"], hz) - centroid_oct(y_mf, sr, hz), 2))
            report.setdefault(lf, {})[name] = r
            print(lf, name, json.dumps(r))
# The viola (violaSolo/, D365: tools/playback/viola/build_viola.py, ordinario mf every whole tone C3-D6, each from the highest string
# that has it, not retuned: its cents in sampled.ts): its pp and ff the same pitches and strings, made build_viola.py's way (onset 1 ms
# before the bow, 4.5 s, a 0.3 s fade), their tuning measured and printed for sampled.ts, levelled against the shipped mf file itself.
f0 = ns["f0"]
VA = os.path.join(src, "Strings/Viola/ordinario")
SHIP = os.path.join(out, "violaSolo")
cents = {"violaSoloPp": {}, "violaSoloFf": {}}


def viola_take(f):
    x, sr = sf.read(f)
    if x.ndim > 1:
        x = x.mean(1)
    env = np.sqrt(np.convolve(x ** 2, np.ones(256) / 256, "same"))
    on = max(0, int(np.argmax(env > env.max() * 0.03)) - int(0.001 * sr))
    y = x[on:on + int(4.5 * sr)].copy()
    fade = int(0.3 * sr)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y, sr


picked_va = {}
for f in glob.glob(VA + "/Va-ord-*-mf-*.wav"):
    m = re.match(r"Va-ord-([A-G]#?\d)-mf-(\d)c-(\w+)\.wav", os.path.basename(f))
    note, string, tune = m.group(1), int(m.group(2)), m.group(3)
    mi = midi_of(note)
    if tune.startswith("R") or mi % 2 != 0 or mi < 48 or mi > 86:
        continue
    if mi not in picked_va or string < picked_va[mi][1]:
        picked_va[mi] = (note, string)
for mi, (note, string) in sorted(picked_va.items()):
    name = ns["fname"](mi)
    mp3 = os.path.join(SHIP, name + ".mp3")
    tmp = os.path.join(out, "_ship.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, tmp], check=True)
    y_mf, sr_mf = sf.read(tmp)
    os.remove(tmp)
    hz = 440 * 2 ** ((mi - 69) / 12)
    l_mf, p_mf = level(y_mf, sr_mf), level(y_mf, sr_mf, True)
    for dyn, lf in (("pp", "violaSoloPp"), ("ff", "violaSoloFf")):
        cands = [f for f in sorted(glob.glob(os.path.join(VA, f"Va-ord-{note}-{dyn}-*.wav"))) if "-R" not in os.path.basename(f)]
        same = [f for f in cands if f"-{dyn}-{string}c-" in os.path.basename(f)]
        f = (same or cands)[0]
        y, sr = viola_take(f)
        c = round(float(1200 * np.log2(f0(y[int(1.0 * sr):int(3.0 * sr)], sr, hz) / hz)), 1)
        g = 10 ** ((p_mf + OFFSET_DB[dyn] - level(y, sr, True)) / 20) * 10 ** (HEAD_DB / 20)
        y = y * g
        peak = float(np.abs(y).max())
        assert peak < 1, (lf, name, peak)
        if not DRY:
            os.makedirs(os.path.join(out, lf), exist_ok=True)
            tmp = os.path.join(out, lf, "_t.wav")
            sf.write(tmp, y, sr, subtype="PCM_16")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "80k", os.path.join(out, lf, name + ".mp3")], check=True)
            os.remove(tmp)
        cents[lf][name] = c
        r = dict(file=os.path.basename(f), sameString=bool(same), cents=c, trim=round(20 * np.log10(g), 1), peak=round(20 * np.log10(peak), 1),
                 fullDb=round(level(y, sr) - HEAD_DB - l_mf, 2), phoneDb=round(level(y, sr, True) - HEAD_DB - p_mf, 2), brightOct=round(centroid_oct(y, sr, hz) - centroid_oct(y_mf, sr_mf, hz), 2))
        report.setdefault(lf, {})[name] = r
        print(lf, name, json.dumps(r))
print("cents", json.dumps(cents))
summary = {}
for lf, rows in report.items():
    v = list(rows.values())
    summary[lf] = {k: [round(min(x[k] for x in v), 2), round(float(np.mean([x[k] for x in v])), 2), round(max(x[k] for x in v), 2)] for k in ("fullDb", "phoneDb", "brightOct")}
    summary[lf]["sameString"] = sum(x["sameString"] for x in v)
    summary[lf]["notes"] = len(v)
print(json.dumps({"summary": summary, "report": report}))
