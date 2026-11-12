#!/usr/bin/env python3
# D645, THE BASS ON A PHONE: the renders of render.cjs read through the phone model (mono, two 2nd-order 600 Hz
# high-passes, ffmpeg's ebur128: integrated loudness, LUFS) and full range (ebur128), cached by file in <dir>/lufs.json.
# For each fugue, two runs: the player on the top voice (the bass in the band) and the player on the bass; each voice
# alone (render.cjs `solo`) and the whole mix. The bass gap: the loudest other voice alone minus the bass alone (LU).
# A render named "<piece>-p<player>-s<solo>@x<db>" (or "@xoff") is the bass alone with its exciter's mix at db (D645's
# fit: fit.ts); "--json" prints every render's loudness for fit.ts.
# usage: python3 -I tools/touch/bass-phone/measure.py <renders dir> [--json]
import sys, os, json, subprocess, re

D = sys.argv[1]
cache_f = os.path.join(D, 'lufs.json')
cache = json.load(open(cache_f)) if os.path.exists(cache_f) else {}

def lufs(path, phone):
    af = ('highpass=f=600,highpass=f=600,' if phone else '') + 'ebur128'
    out = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', af, '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+|-inf) LUFS', out)
    return float(m[-1]) if m and m[-1] != '-inf' else -99.0

names = sorted(f[:-4] for f in os.listdir(D) if f.endswith('.wav'))
for n in names:
    st = os.stat(os.path.join(D, n + '.wav'))
    k = f'{st.st_size}:{int(st.st_mtime)}'
    if cache.get(n, {}).get('k') == k: continue
    p = os.path.join(D, n + '.wav')
    cache[n] = {'k': k, 'ph': lufs(p, True), 'full': lufs(p, False)}
json.dump(cache, open(cache_f, 'w'), indent=0, sort_keys=True)

if '--json' in sys.argv:
    out = []
    for n, v in sorted(cache.items()):
        m = re.match(r'(wtc\df\d\d)-p(\d)-s(\d|mix)(?:@x(off|-?[\d.]+))?$', n)
        if m: out.append({'piece': m.group(1), 'player': int(m.group(2)), 'solo': m.group(3) if m.group(3) == 'mix' else int(m.group(3)), 'x': m.group(4), 'ph': v['ph'], 'full': v['full']})
    print(json.dumps(out)); sys.exit(0)
runs = {}
for n, v in cache.items():
    m = re.match(r'(wtc\df\d\d)-p(\d)-s(\d|mix)$', n)
    if not m: continue
    piece, pv, s = m.group(1), int(m.group(2)), m.group(3)
    runs.setdefault(piece, {}).setdefault(pv, {})[s] = v
res = {}
for piece in sorted(runs):
    pvs = sorted(runs[piece])
    nv = max(int(s) for r in runs[piece].values() for s in r if s != 'mix') + 1
    b = nv - 1
    row = {'nv': nv}
    for pv in pvs:
        r = runs[piece][pv]
        if not all(str(u) in r for u in range(nv)) or 'mix' not in r: continue
        ph = [r[str(u)]['ph'] for u in range(nv)]
        full = [r[str(u)]['full'] for u in range(nv)]
        top = max(range(b), key=lambda u: ph[u])
        topf = max(range(b), key=lambda u: full[u])
        row['band' if pv != b else 'player'] = {'ph': ph, 'full': full, 'gap': round(ph[top] - ph[b], 1), 'top': top, 'gapFull': round(full[topf] - full[b], 1), 'mix': r['mix']['ph'], 'mixFull': r['mix']['full']}
    res[piece] = row
if True:
    print('fugue     nv  band gap       player gap     (phone LU (full-range))  mix phone/full LUFS: band run, player run')
    for piece, row in res.items():
        a, p = row.get('band'), row.get('player')
        f = lambda x: f"{x['gap']:5.1f} ({x['gapFull']:5.1f})" if x else '   -        '
        print(f"{piece} {row['nv']}  {f(a)}  {f(p)}   {a['mix'] if a else '-'} / {a['mixFull'] if a else '-'}   {p['mix'] if p else '-'} / {p['mixFull'] if p else '-'}")
