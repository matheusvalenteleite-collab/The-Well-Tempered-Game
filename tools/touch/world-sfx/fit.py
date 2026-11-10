# D628: the pilot worlds' effects data (src/touch/world-sfx-data.ts) from render.cjs's renders: the band's momentary loudness
# (400 ms, phone model and desktop K-weighted) from each half beat, and each effect's loudness at velocity 1 (its loudest
# 400 ms window, a robust median over its events, an event sharing its window with another effect left out of the fit).
# usage: python3 -I tools/touch/world-sfx/fit.py <renders dir> > src/touch/world-sfx-data.ts
import json, math, sys
import numpy as np

M = sys.argv[1]
PIECES = {"wtc2f01": 960, "wtc2f03": 960, "wtc2f04": 960, "wtc2f06": 960}  # the step (ticks): half a crotchet beat at tpq 1920
DUR = {"click": 0.1, "thud": 0.26, "rumble": 0.9, "sweep": 2.0}
N = 19  # frames in a 400 ms window (512 samples at 24 kHz)
lufs = lambda ms: -0.691 + 10 * math.log10(max(ms, 1e-14))

def win(a, i):
    i = max(0, min(len(a) - 1, i))
    s = a[i:i + N]
    return lufs(sum(s) / len(s))

band, fxdb, err = {}, {}, []
for p, step in PIECES.items():
    band[p] = {"step": step}
    for suf, model in (("p", "P"), ("d", "K")):
        b = json.load(open(f"{M}/{p}-band-{suf}.json"))
        ticks = np.array(b["fr"]["tick"])
        B = b["fr"][model]
        n = int(ticks.max() // step) + 1
        band[p][suf] = [round(win(B, int(np.searchsorted(ticks, i * step))), 1) for i in range(n)]
        # the effects render, and any of one effect alone (`<piece>r-fx-<suf>`: II/6's rumble, else always with the thud)
        for name in (f"{p}-fx-{suf}", f"{p}r-fx-{suf}"):
          try:
            fx = json.load(open(f"{M}/{name}.json"))
          except FileNotFoundError:
            continue
          F, dt = fx["fr"][model], fx["dt"]
          W = lambda t: win(F, int(round(t / dt)))
          ev = fx["sfx"]
          for kind in sorted(set(e[0] for e in ev)):
              es = [e for e in ev if e[0] == kind]
              vals = []
              if kind == "swell":
                  top = max(e[4] for e in es)
                  for e in es:
                      if e[4] < 0.3 * top: continue
                      # the mean square of the swell's level over the window (each beat's piece a ramp from vel to vel1)
                      ts = np.arange(e[2], e[2] + 0.4, 0.005)
                      v = [next((o[4] + (o[5] - o[4]) * (t - o[2]) / max(1e-6, o[3] - o[2]) for o in es if o[2] <= t < o[3]), 0) for t in ts]
                      vals.append(W(e[2]) - 10 * math.log10(max(1e-12, float(np.mean(np.square(v))))))
              else:
                  for e in es:
                      alone = all(abs(o[2] - e[2]) > 0.45 + DUR[kind] for o in ev if o is not e and o[0] != kind)
                      if not alone or e[4] <= 0: continue
                      mx = max(W(t) for t in np.arange(e[2] - 0.2, e[2] + DUR[kind], dt))
                      vals.append(mx - 20 * math.log10(e[4]))
              if not vals: continue
              med = float(np.median(vals))
              fxdb.setdefault(p, {}).setdefault(kind, {})[suf] = round(med, 1)
              err.append(f"{p} {kind} {suf} {np.median(np.abs(np.array(vals) - med)):.1f}/{np.percentile(np.abs(np.array(vals) - med), 95):.1f}/{len(vals)}")

print("/**")
print(" * D628, THE PILOT WORLDS' EFFECTS DATA (generated: tools/touch/world-sfx/fit.py from render.cjs's offline renders; do not edit by")
print(" * hand). BAND_FX: each pilot fugue on its own sound, the band alone (no effects, no drummer), its momentary loudness (400 ms, dB)")
print(" * from each `step` ticks, on the phone model (p: mono, two 2nd-order 600 Hz high-passes, K-weighted) and a desktop's (d: the")
print(" * desktop mix, K-weighted). FX_DB: each effect's loudness at velocity 1 (its loudest 400 ms; the swell's beat at its level), p and d.")
print(" * The fit's error (median |dB| / 95th percentile / events): " + "; ".join(err) + ".")
print(" */")
print("export const BAND_FX: Readonly<Record<string, { step: number; p: readonly number[]; d: readonly number[] }>> = " + json.dumps(band, separators=(",", ":")) + ";")
print("export const FX_DB: Readonly<Record<string, Readonly<Record<string, { p: number; d: number }>>>> = " + json.dumps(fxdb, separators=(",", ":")) + ";")
