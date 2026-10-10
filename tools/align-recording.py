"""Score-to-recording alignment (D128): chroma of the score (each sounding note, its onset weighted
and decaying) against the recording's CQT chroma, matched by dynamic time warping; for each bar
line, its time in the recording. Quality: the share of the score's onsets that land within 70 ms
of an onset in the recording, against the same with the times shifted by half a beat (chance)."""
import json, sys, glob, os
import numpy as np, librosa

NOTES, MP3DIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
only = sys.argv[4].split(",") if len(sys.argv) > 4 else None
SR, HOP = 22050, 512
FR = 1 / 16  # score frame, in quarters
score = json.load(open(NOTES))
files = sorted(glob.glob(os.path.join(MP3DIR, "*.mp3")))
out = json.load(open(OUT)) if os.path.exists(OUT) else {}

def score_chroma(notes, end):
    n = int(np.ceil(end / FR)) + 1
    C = np.zeros((12, n))
    O = np.zeros((12, n))
    for m, at, dur in notes:
        a, b = int(round(at / FR)), max(int(round((at + dur) / FR)), int(round(at / FR)) + 1)
        k = np.arange(b - a)
        C[m % 12, a:b] += 0.4 + 0.6 * np.exp(-k * FR / 1.0)
        O[m % 12, a] += 1
    return C, O

for key, s in score.items():
    if only and key not in only: continue
    track = 2 * s["number"] - (1 if s["kind"] == "p" else 0)
    f = files[track - 1]
    y, _ = librosa.load(f, sr=SR, mono=True)
    yt, (i0, i1) = librosa.effects.trim(y, top_db=45)
    off = i0 / SR
    A = librosa.feature.chroma_cqt(y=yt, sr=SR, hop_length=HOP)
    A = A + 1e-3
    A = A / np.linalg.norm(A, axis=0, keepdims=True)
    notes = s["notes"]
    end = max(at + d for _, at, d in notes)
    first = min(at for _, at, _ in notes)
    C, O = score_chroma(notes, end)
    C = C + 1e-3
    C = C / np.linalg.norm(C, axis=0, keepdims=True)
    D, wp = librosa.sequence.dtw(X=C, Y=A, metric="cosine")
    wp = wp[::-1]
    # Score frame -> audio time (mean of the matched audio frames), then monotone.
    tmap = {}
    for i, j in wp:
        tmap.setdefault(i, []).append(j)
    idx = np.array(sorted(tmap))
    t = np.array([np.mean(tmap[i]) for i in idx]) * HOP / SR + off
    t = np.maximum.accumulate(t)
    q = idx * FR
    at_q = lambda x: float(np.interp(x, q, t))
    bars = [at_q(max(b * s["barQ"], first)) for b in range(s["bars"])] + [at_q(end)]
    # Bar 1 begins before its first note when the piece starts with a rest: extrapolated at bar 2's pace.
    if first > 1e-6 and len(bars) > 2:
        spq = (bars[2] - bars[1]) / s["barQ"]
        bars[0] = max(0.0, bars[0] - first * spq)
    bars = [round(x, 3) for x in bars]
    # Quality: onsets.
    env = librosa.onset.onset_detect(y=yt, sr=SR, hop_length=256, units="time") + off
    ons = sorted({at for _, at, _ in notes})
    mapped = np.array([at_q(x) for x in ons])
    near = lambda ts: float(np.mean([np.min(np.abs(env - x)) < 0.07 for x in ts]))
    beat = 1.0
    hit = near(mapped)
    chance = near(np.array([at_q(x + beat / 2) for x in ons]))
    out[key] = {"file": os.path.basename(f), "bars": bars, "hit": round(hit, 3), "chance": round(chance, 3), "duration": round(len(y) / SR, 2)}
    print(key, os.path.basename(f)[60:100], "bars", s["bars"], "hit", round(hit, 2), "chance", round(chance, 2), "start", bars[0], "end", bars[-1], "dur", round(len(y) / SR, 1), flush=True)
    json.dump(out, open(OUT, "w"))
