import json, sys
# Common prelude: count the nodes made inside a note (patchNote/sampledNote), and an onset split (band / player) for the string patches.
PRE = """const s = await import('/src/touch/sound.ts'); const C = (await import('/src/touch/chip.ts')).Chip; const pr = s.preset();
window.__nodes = { notes: 0, nodes: 0 }; let inNote = 0;
for (const m of Object.getOwnPropertyNames(BaseAudioContext.prototype).filter((k) => k.startsWith('create'))) { const o = BaseAudioContext.prototype[m]; BaseAudioContext.prototype[m] = function (...a) { if (inNote) window.__nodes.nodes++; return o.apply(this, a); }; }
for (const m of ['patchNote', 'sampledNote']) { const o = C.prototype[m]; C.prototype[m] = function (...a) { inNote++; window.__nodes.notes++; try { return o.apply(this, a); } finally { inNote--; } }; }
const po = C.prototype.patchNote;
C.prototype.patchNote = function (midi, at, dur, v, pt, p, bag) { if (pt.__onset) pt = { ...pt, amp: { ...pt.amp, a: p && p.lead ? pt.__onset[1] : pt.__onset[0] } }; return po.call(this, midi, at, dur, v, pt, p, bag); };
"""
def lanes(vl, cl):
    # the violins' and the cellos' lanes (body EQ, an absolute top), in BAROQUE BAND's chain or a chain of their own for STRING CONSORT
    return ("const LV = %s, LC = %s;" % (json.dumps(vl), json.dumps(cl)) +
      " if (pr.id === 'baroqueBand') { pr.chain = { ...pr.chain, lanes: { ...(pr.chain.lanes ?? {}), sv: LV, sc: LC } }; pr.lanes = { ...(pr.lanes ?? {}), bandViolin: 'sv', bandCello: 'sc' }; }"
      " else if (pr.id === 'stringConsort') { pr.chain = { band: 'stringConsort', bus: [], lanes: { sv: LV, sc: LC } }; pr.lanes = { consViolin: 'sv', consCello: 'sc' }; }")
def synth(vio, cel, onset):
    js = PRE
    for ids, d in ((("bandViolin", "consViolin"), vio), (("bandCello", "consCello"), cel)):
        for i in ids:
            js += f" Object.assign(s.PATCHES.{i}, {json.dumps(d['patch'])}); s.PATCHES.{i}.level *= {d.get('k', 1)}; s.PATCHES.{i}.sample = undefined; s.PATCHES.{i}.bow = undefined; s.PATCHES.{i}.__onset = {json.dumps(onset)};"
    js += lanes(vio["lane"], cel["lane"])
    return js
H = lambda n: round(1200 * __import__('math').log2(n), 1)
SUB_V = {"k": 0.9, "patch": {"osc": [{"wave": "saw", "detune": -5, "gain": 0.55}, {"wave": "saw", "detune": 5, "gain": 0.55}], "filter": {"freq": 3.0, "q": 0.6, "env": 1.25, "envDecay": 0.25, "poles": 4},
         "vib": {"depth": 14, "rate": 5.3, "delay": 0.28}, "amp": {"a": 0.05, "d": 0.2, "s": 0.9, "r": 0.16}},
         "lane": [{"kind": "eq", "bands": [{"type": "peaking", "hz": 280, "db": 3, "q": 1.4}, {"type": "peaking", "hz": 1000, "db": 3, "q": 1.4}, {"type": "lowpass", "hz": 2500, "q": 0.7}]}]}
SUB_C = {"k": 1, "patch": {"osc": [{"wave": "saw", "detune": -4, "gain": 0.55}, {"wave": "saw", "detune": 4, "gain": 0.55}], "filter": {"freq": 1400, "hz": True, "q": 0.6, "env": 1.25, "envDecay": 0.3, "poles": 4},
         "vib": {"depth": 10, "rate": 4.8, "delay": 0.3}, "amp": {"a": 0.06, "d": 0.2, "s": 0.9, "r": 0.18}},
         "lane": [{"kind": "eq", "bands": [{"type": "peaking", "hz": 200, "db": 3, "q": 1.4}, {"type": "peaking", "hz": 700, "db": 2.5, "q": 1.4}, {"type": "lowpass", "hz": 2000, "q": 0.7}]}]}
VG = [1, 0.55, 0.38, 0.25, 0.16, 0.1, 0.06, 0.035]
CG = [1, 0.7, 0.45, 0.3, 0.2, 0.12, 0.07, 0.04]
ADD_V = {"k": 0.35, "patch": {"osc": [{"wave": "sine", "detune": H(n + 1), "gain": g} for n, g in enumerate(VG)], "filter": {"freq": 2200, "hz": True, "q": 0.6, "env": 1, "envDecay": 0.1, "poles": 4},
         "vib": {"depth": 14, "rate": 5.3, "delay": 0.28}, "amp": {"a": 0.05, "d": 0.2, "s": 0.9, "r": 0.16}},
         "lane": [{"kind": "eq", "bands": [{"type": "peaking", "hz": 280, "db": 3, "q": 1.4}, {"type": "peaking", "hz": 1000, "db": 3, "q": 1.4}]}]}
ADD_C = {"k": 0.42, "patch": {"osc": [{"wave": "sine", "detune": H(n + 1), "gain": g} for n, g in enumerate(CG)], "filter": {"freq": 1800, "hz": True, "q": 0.6, "env": 1, "envDecay": 0.1, "poles": 4},
         "vib": {"depth": 10, "rate": 4.8, "delay": 0.3}, "amp": {"a": 0.06, "d": 0.2, "s": 0.9, "r": 0.18}},
         "lane": [{"kind": "eq", "bands": [{"type": "peaking", "hz": 200, "db": 3, "q": 1.4}, {"type": "peaking", "hz": 700, "db": 2.5, "q": 1.4}]}]}
SOFT, FIRM = [0.055, 0.03], [0.015, 0.015]
C = {"base": PRE,
     "sub-soft": synth(SUB_V, SUB_C, SOFT), "sub-firm": synth(SUB_V, SUB_C, FIRM),
     "add-soft": synth(ADD_V, ADD_C, SOFT), "add-firm": synth(ADD_V, ADD_C, FIRM)}
json.dump(C, open(sys.argv[1], "w"), indent=1)
