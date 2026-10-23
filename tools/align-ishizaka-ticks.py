"""D215/D221, KIMIKO: tick -> seconds anchors for the 24 Book I fugues in Kimiko Ishizaka's
recording (data/recordings/ishizaka-book1.json gives the bar lines; this refines them to the beat
and, where reliable, to the note).

  1. The bar-line map (linear within each bar) is the starting point.
  2. A fine DTW in a band of +-300 ms around it: the score's chroma (every note, its onset weighted
     and decaying) and chroma onsets against the recording's CQT chroma and its rises.
  3. Each onset of the score is snapped to the recording's nearest detected onset when one lies
     within 30 ms of the DTW's time and agrees with its neighbours' corrections (within a beat);
     the others take their neighbours' median correction.
  4. Anchors: every beat, plus each note onset whose time differs by more than 6 ms from the
     beats' interpolation; monotone (an anchor out of order is dropped). Any piece the refinement
     fails for falls back to the bar-line map (still sampled every beat).
  5. Her pitch: librosa.estimate_tuning on the whole track (A in Hz).

Usage: python tools/align-ishizaka-ticks.py MP3DIR [OUT] [N,N,...]
  MP3DIR holds wtc1-NNf.mp3 (fetched from the Internet Archive if missing; keep them out of the repo).
  OUT defaults to data/recordings/ishizaka-ticks.json. N,N,...: only these fugues, merged into OUT's
  others (default: all 24). Four pieces at a time. Needs numpy and librosa.
"""
import json, os, sys, math, urllib.parse, urllib.request
import numpy as np, librosa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP3 = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "data/recordings/ishizaka-ticks.json")
PIECES = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else list(range(1, 25))
P = {p["id"]: p for p in json.load(open(os.path.join(ROOT, "data/touch/pieces.json")))}
REC = json.load(open(os.path.join(ROOT, "data/recordings/ishizaka-book1.json")))
SR, HOP, OHOP = 22050, 256, 128
SNAP_S, AGREE_S, KEEP_S, BAND_S = 0.030, 0.025, 0.006, 0.300


def pct(a, q):
    return float(np.percentile(a, q)) if len(a) else float("nan")


def beat_of(f):
    num, den = map(int, f["meter"].split("/"))
    unit = f["tpq"] * 4 // den
    return unit * 3 if num % 3 == 0 and num > 3 else unit


def line_ticks(f, lines):
    """The tick of each bar line (a padded pickup bar 0 where the recording's lines have one more)."""
    on = [b["on"] for b in f["bars"]] + [f["length"]]
    if len(lines) == len(on):
        return np.array(on, float)
    if len(lines) == len(on) + 1:
        return np.array([on[0] - f["barTicks"]] + on, float)
    raise ValueError(f"{len(lines)} bar lines for {len(on) - 1} bars")


def fetch(key):
    path = os.path.join(MP3, f"{key}.mp3")
    if not os.path.exists(path):
        url = REC["archive"] + urllib.parse.quote(REC["files"][key])
        print("fetching", url, flush=True)
        urllib.request.urlretrieve(url, path)
    return path


def fine_dtw(f, y, bar_map, LT, lines):
    """The bar-line map refined by DTW in a band: a function score-seconds (bar map) -> recording seconds."""
    C = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP, fmin=librosa.note_to_hz("A0"), n_bins=88))
    LC = np.log1p(100 * C)
    chroma = np.zeros((12, LC.shape[1]))
    onch = np.zeros_like(chroma)
    dif = np.maximum(0, np.diff(LC, axis=1, prepend=LC[:, :1]))
    for k in range(88):
        chroma[(k + 21) % 12] += LC[k]
        onch[(k + 21) % 12] += dif[k]
    nA = chroma.shape[1]
    fr = HOP / SR
    u0, u1 = lines[0], lines[-1]
    nS = int((u1 - u0) / fr) + 1
    u = u0 + np.arange(nS) * fr
    SC = np.zeros((12, nS))
    SO = np.zeros((12, nS))
    for v in f["voices"]:
        for on, d_, m, *_ in v:
            a0, a1 = bar_map(on), bar_map(min(on + d_, f["length"]))
            i0 = int(round((a0 - u0) / fr))
            i1 = max(i0 + 1, int(round((a1 - u0) / fr)))
            i0, i1 = max(0, i0), min(nS, i1)
            if i0 >= nS:
                continue
            k = np.arange(i1 - i0) * fr
            SC[m % 12, i0:i1] += 0.4 + 0.6 * np.exp(-k / 1.0)
            for j, w in enumerate([1, 0.6, 0.3]):
                if i0 + j < nS:
                    SO[m % 12, i0 + j] += w

    def nrm(X):
        X = X + 1e-4
        return X / np.linalg.norm(X, axis=0, keepdims=True)

    SCn, SOn, ACn, AOn = nrm(SC), nrm(SO), nrm(chroma), nrm(onch)
    B = int(BAND_S / fr)
    j0 = np.round(u / fr).astype(int)
    cost = np.full((nS, 2 * B + 1), np.inf)
    for dd in range(-B, B + 1):
        j = j0 + dd
        ok = (j >= 0) & (j < nA)
        jj = np.clip(j, 0, nA - 1)
        c = (1 - np.sum(SCn * ACn[:, jj], 0)) + (1 - np.sum(SOn * AOn[:, jj], 0))
        cost[:, dd + B] = np.where(ok, c, np.inf)
    D = np.full_like(cost, np.inf)
    BP = np.zeros(cost.shape, dtype=np.int8)
    D[0] = cost[0]
    pen = 0.05
    for i in range(1, nS):
        diag = D[i - 1] + cost[i]
        vert = np.full(2 * B + 1, np.inf)
        vert[:-1] = D[i - 1, 1:] + cost[i, :-1] + pen
        row = np.minimum(diag, vert)
        bp = np.where(diag <= vert, 0, 1).astype(np.int8)
        for d in range(1, 2 * B + 1):
            h = row[d - 1] + cost[i, d] + pen
            if h < row[d]:
                row[d] = h
                bp[d] = 2
        D[i] = row
        BP[i] = bp
    d = int(np.argmin(D[-1]))
    i = nS - 1
    path = {}
    while i >= 0:
        path.setdefault(i, []).append(j0[i] + d - B)
        b = BP[i, d] if i > 0 else -1
        if b == 0:
            i -= 1
        elif b == 1:
            i -= 1
            d += 1
        elif b == 2:
            d -= 1
        else:
            break
    idx = np.array(sorted(path))
    tj = np.maximum.accumulate(np.array([min(path[k]) for k in idx]) * fr)
    return lambda s: np.interp(s, u[idx], tj)


def errs(pred, det):
    return np.array([det[np.argmin(np.abs(det - p))] - p for p in pred])


def summ(e, win=0.15):
    m = np.abs(e) < win
    ab = np.abs(e[m])
    return dict(median_ms=round(float(np.median(ab)) * 1000, 1), p95_ms=round(pct(ab, 95) * 1000, 1), within50=round(float(np.mean(np.abs(e) < 0.05)), 3))


def piece(n):
    key = f"wtc1-{n:02d}f"
    fid = f"wtc1f{n:02d}"
    f = P[fid]
    lines = np.array(REC["bars"][key], float)
    LT = line_ticks(f, lines)
    bar_map = lambda tk: np.interp(tk, LT, lines)
    beat = beat_of(f)
    y, _ = librosa.load(fetch(key), sr=SR, mono=True)
    tun = float(librosa.estimate_tuning(y=y, sr=SR, resolution=0.005))
    A = round(440 * 2 ** (tun / 12), 1)
    ticks = np.array(sorted({x[0] for v in f["voices"] for x in v}), float)
    last_bar = LT[-2]
    body = ticks < last_bar  # the last bar's chord is judged alone (its decay is no measure)
    oenv = librosa.onset.onset_strength(y=y, sr=SR, hop_length=OHOP)
    det = librosa.onset.onset_detect(onset_envelope=oenv, sr=SR, hop_length=OHOP, units="time")
    rep = {"bar_linear": summ(errs(bar_map(ticks[body]), det))}
    method = "dtw"
    try:
        warp = fine_dtw(f, y, bar_map, LT, lines)
        pred = warp(bar_map(ticks))
        if not np.all(np.diff(pred) >= 0):
            raise ValueError("not monotone")
        rep["dtw"] = summ(errs(pred[body], det))
        if rep["dtw"]["median_ms"] > rep["bar_linear"]["median_ms"] + 5:
            raise ValueError("worse than the bar lines")
    except Exception as ex:  # the fallback: the bar lines
        print(key, "refinement failed:", ex, flush=True)
        method = "bars"
        pred = bar_map(ticks)
    # Snap to detected onsets where reliable.
    near = errs(pred, det)
    cand = (np.abs(near) <= SNAP_S) & body
    corr = np.zeros(len(ticks))
    rel = np.zeros(len(ticks), bool)
    for i in range(len(ticks)):
        nb = (np.abs(ticks - ticks[i]) <= beat) & cand
        nb[i] = False
        med = float(np.median(near[nb])) if nb.sum() >= 2 else 0.0
        if cand[i] and abs(near[i] - med) <= AGREE_S:
            rel[i] = True
            corr[i] = near[i]
        else:
            corr[i] = med if nb.sum() >= 2 else 0.0
    if method == "bars":
        corr[:] = 0
        rel[:] = False
    sec = pred + corr
    # Leave-one-out: a reliable onset's time from its neighbours (the interpolation's error between anchors).
    loo = []
    ri = np.flatnonzero(rel)
    for k in range(1, len(ri) - 1):
        a, b, c = ri[k - 1], ri[k], ri[k + 1]
        if ticks[c] - ticks[a] > 2 * beat:
            continue
        s = sec[a] + (sec[c] - sec[a]) * (ticks[b] - ticks[a]) / (ticks[c] - ticks[a])
        loo.append(s - sec[b])
    loo = np.array(loo)
    # The anchors: the first bar line, every onset (monotone), the last bar line.
    at_t = np.concatenate([[LT[0]], ticks, [LT[-1]]])
    at_s = np.concatenate([[lines[0]], sec, [lines[-1]]])
    keep_t, keep_s = [at_t[0]], [at_s[0]]
    for t, s in zip(at_t[1:], at_s[1:]):
        if t > keep_t[-1] and s > keep_s[-1] + 0.004:
            keep_t.append(t)
            keep_s.append(s)
    keep_t, keep_s = np.array(keep_t), np.array(keep_s)
    full = lambda tk: np.interp(tk, keep_t, keep_s)
    # Every beat; then each onset the beats alone would place more than KEEP_S off.
    beats = np.arange(LT[0], LT[-1] + 1, beat, dtype=float)
    beats = np.unique(np.concatenate([[LT[0]], beats, [LT[-1]]]))
    sel = set(beats.tolist())
    bt = np.array(sorted(sel))
    coarse = np.interp(keep_t, bt, full(bt))
    for t, s, c in zip(keep_t, keep_s, coarse):
        if abs(s - c) > KEEP_S:
            sel.add(float(t))
    out_t = np.array(sorted(sel))
    out_ms = np.round(full(out_t) * 1000).astype(int)
    ok = np.concatenate([[True], np.diff(out_ms) > 0])
    out_t, out_ms = out_t[ok], out_ms[ok]
    g = 0
    for t in out_t:
        g = math.gcd(g, int(t))
    g = g or 1
    q = (out_t / g).astype(int)
    rep.update(method=method, reliable=round(float(rel[body].mean()), 3), loo=dict(median_ms=round(float(np.median(np.abs(loo))) * 1000, 1), p95_ms=round(pct(np.abs(loo), 95) * 1000, 1)) if len(loo) else None, anchors=int(len(out_t)), A=A)
    print(key, json.dumps(rep), flush=True)
    return key, {"a": A, "unit": g, "t0": int(q[0]), "s0": int(out_ms[0]), "dt": np.diff(q).tolist(), "dms": np.diff(out_ms).tolist(), "method": method, "q": rep}


def run(n):
    try:
        return piece(n)
    except Exception as ex:
        print(f"wtc1-{n:02d}f failed:", ex, flush=True)
        return None


def main():
    from multiprocessing import Pool
    old = json.load(open(OUT))["pieces"] if len(sys.argv) > 3 and os.path.exists(OUT) else {}
    out = {
        "about": "D215/D221, KIMIKO (tools/align-ishizaka-ticks.py): tick -> seconds anchors in Kimiko Ishizaka's Book I (CC0), every beat and the notes where they depart from it. tick = (t0 + cumsum(dt)) * unit; ms = s0 + cumsum(dms) from the track's start. a: her A (Hz). q: the alignment's quality (onset errors against the recording's detected onsets).",
        "pieces": {},
    }
    with Pool(4) as pool:
        got = dict(r for r in pool.map(run, PIECES) if r)
    for n in range(1, 25):
        k = f"wtc1-{n:02d}f"
        if k in got or k in old:
            out["pieces"][k] = got.get(k, old.get(k))
    with open(OUT, "w") as fh:
        fh.write("{\n" + f' "about": {json.dumps(out["about"])},\n "pieces": {{\n')
        fh.write(",\n".join(f"  {json.dumps(k)}: {json.dumps(v, separators=(',', ':'))}" for k, v in out["pieces"].items()))
        fh.write("\n }\n}\n")


if __name__ == "__main__":
    main()
