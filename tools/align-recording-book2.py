"""Book II (D131): Arthur Loesser's 1964 recording, one track per prelude-and-fugue.
1. The prelude and the fugue are laid end to end and aligned with the whole track, for a first
   estimate of where the fugue begins; the track is cut at the silence nearest that estimate.
2. Each half is aligned alone. A prelude with repeats (marked in the Humdrum encoding by section
   labels) is tried in every order its sections allow (each once or twice) and the order whose
   alignment costs least per frame is kept: the performance's own (Loesser plays some repeats).
Output per piece: the bar lines in the order played, as times ("t") and the bar each begins ("b")."""
import json, sys, os, re, itertools
import numpy as np, librosa
NOTES, MP3DIR, KERN, OUT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
SR, HOP, FR = 22050, 512, 1 / 16
score = json.load(open(NOTES))

def chroma(notes, end):
    n = int(np.ceil(end / FR)) + 1
    C = np.zeros((12, n))
    for m, at, dur in notes:
        a = int(round(at / FR)); b = max(int(round((at + dur) / FR)), a + 1)
        k = np.arange(b - a)
        C[m % 12, a:b] += 0.4 + 0.6 * np.exp(-k * FR / 1.0)
    C = C + 1e-3
    return C / np.linalg.norm(C, axis=0, keepdims=True)

def audio_chroma(y):
    A = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP) + 1e-3
    return A / np.linalg.norm(A, axis=0, keepdims=True)

def align(notes, end, A, t0):
    C = chroma(notes, end)
    D, wp = librosa.sequence.dtw(X=C, Y=A, metric="cosine"); wp = wp[::-1]
    tm = {}
    for i, j in wp: tm.setdefault(i, []).append(j)
    idx = np.array(sorted(tm)); t = np.maximum.accumulate(np.array([np.mean(tm[i]) for i in idx]) * HOP / SR + t0)
    return (lambda x: float(np.interp(x, idx * FR, t))), D[-1, -1] / len(wp)

def sections(n):
    """Section starts (bar indices) from the kern file's labels, or [] without repeats."""
    lines = open(os.path.join(KERN, f"wtc2p{n:02d}.krn")).read().split("\n")
    if not any(l.startswith("*>[") for l in lines): return []
    k, starts = -1, []
    for l in lines:
        f = l.split("\t")
        if l.startswith("=") and re.match(r"^=(\d+)", f[0]): k += 1
        elif l.startswith("*>") and not l.startswith("*>[") and not l.startswith("*>norep"):
            lab = f[0][2:]
            if "ending" in lab or lab == "": continue
            starts.append(max(k, 0))
    return sorted(set(starts))

out = {}
for n in range(1, 25):
    P, F = score[f"wtc2.{n:02d}p"], score[f"wtc2.{n:02d}f"]
    endP = max(a + d for _, a, d in P["notes"]); endF = max(a + d for _, a, d in F["notes"])
    y, _ = librosa.load(os.path.join(MP3DIR, f"{n:02d}.mp3"), sr=SR, mono=True)
    # 1. A first estimate of the fugue's start: the whole track against prelude + fugue.
    yt, (i0, i1) = librosa.effects.trim(y, top_db=45)
    A = audio_chroma(yt)
    off = endP + 8
    at, _ = align(P["notes"] + [[m, a + off, d] for m, a, d in F["notes"]], off + endF, A, i0 / SR)
    est = at(off + min(a for _, a, _ in F["notes"]))
    # The silences (a frame under 2% of the loudest, 0.4 s or more); the one nearest the estimate.
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]; quiet = rms < 0.02 * rms.max()
    gaps, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None: s = i
        if not q and s is not None:
            if (i - s) * HOP / SR >= 0.4: gaps.append(((s + i) / 2) * HOP / SR)
            s = None
    cut = min(gaps, key=lambda g: abs(g - est)) if gaps else est
    cs = int(cut * SR)
    # 2. Each half alone.
    res = {}
    for key, S, seg, base in ((f"wtc2-{n:02d}p", P, y[:cs], 0.0), (f"wtc2-{n:02d}f", F, y[cs:], cut)):
        st, (j0, _) = librosa.effects.trim(seg, top_db=45)
        Aseg = audio_chroma(st)
        bq, nb = S["barQ"], S["bars"]
        secs = sections(n) if key.endswith("p") else []
        bounds = [0] + [s for s in secs if 0 < s < nb] + [nb]
        parts = [list(range(bounds[i], bounds[i + 1])) for i in range(len(bounds) - 1)]
        best = None
        for reps in itertools.product([1, 2], repeat=len(parts)) if len(parts) > 1 else [(1,)]:
            order = [b for p, r in zip(parts, reps) for b in p * r]
            # The score in this order: each bar's notes moved to its place in the performance.
            notes, place = [], 0.0
            for b in order:
                for m, a, d in S["notes"]:
                    if b * bq - 1e-6 <= a < (b + 1) * bq - 1e-6: notes.append([m, a - b * bq + place, d])
                place += bq
            f, cost = align(notes, place, Aseg, base + j0 / SR)
            if best is None or cost < best[1]: best = (order, cost, f, place, reps)
        order, cost, f, place, reps = best
        first = min(a for _, a, _ in S["notes"])
        t = [f(max(k * bq, first if k == 0 else 0)) for k in range(len(order))] + [f(min(place, len(order) * bq - bq + (max(a + d for _, a, d in S["notes"]) - order[-1] * bq)))]
        if first > 1e-6 and len(t) > 2: t[0] = max(base, t[0] - first * (t[2] - t[1]) / bq)
        res[key] = {"t": [round(x, 3) for x in t], "b": order}
        ds = np.diff(t[:-1]); med = float(np.median(ds))
        print(key, "reps", reps, "bars", len(order), "start", round(t[0], 1), "end", round(t[-1], 1), "cv", round(float(np.std(ds) / med), 2), "odd", [i + 1 for i, x in enumerate(ds) if x > 1.7 * med or x < 0.55 * med][:8], flush=True)
    out.update(res)
    json.dump(out, open(OUT, "w"))
