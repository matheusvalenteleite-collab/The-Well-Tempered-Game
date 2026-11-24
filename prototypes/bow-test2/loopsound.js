/* Loop maker, SOUND: the five instruments, the drums, the count-in click, and a Channel per voice.
   Everything takes an AudioContext and a time, so the same code plays live and renders offline (Export).
   A Channel carries the voice's tilt (octave + bend as one pitch offset in cents, vibrato depth, brightness)
   to all its notes, its pan, and its mute/solo gain. Notes carry the contact class (tip brighter, flat
   short and muted) and contact-size expression (loudness and brightness), as in the touch-area prototype. */
(function (root) {
  "use strict";
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const noiseOf = new WeakMap();
  function noise(ctx) {
    let b = noiseOf.get(ctx);
    if (!b) { b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseOf.set(ctx, b); }
    return b;
  }

  class Channel {
    constructor(ctx, dest, pan) {
      this.ctx = ctx;
      this.out = ctx.createGain(); this.out.gain.value = 1;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) { p.pan.value = pan; this.out.connect(p); p.connect(dest); } else this.out.connect(dest);
      this.pitch = ctx.createConstantSource(); this.pitch.offset.value = 0; this.pitch.start();
      this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 5.5; this.lfo.start();
      this.vib = ctx.createGain(); this.vib.gain.value = 0; this.lfo.connect(this.vib);
      this.bright = ctx.createConstantSource(); this.bright.offset.value = 0; this.bright.start();
      this.oct = 0;
    }
    modPitch(param) { this.pitch.connect(param); this.vib.connect(param); }
    modBright(param) { this.bright.connect(param); }
    tilt(t, e) {
      const cents = (e.octave || 0) * 1200 + (e.bend || 0) * 100;
      if ((e.octave || 0) !== this.oct) { this.oct = e.octave || 0; this.pitch.offset.cancelScheduledValues(t); this.pitch.offset.setValueAtTime(cents, t); }
      else this.pitch.offset.setTargetAtTime(cents, t, 0.015);
      this.vib.gain.setTargetAtTime(e.vib || 0, t, 0.03);
      this.bright.offset.setTargetAtTime(e.bright || 0, t, 0.03);
    }
    stopAll(t) { this.out.gain.cancelScheduledValues(t); this.out.gain.setTargetAtTime(0, t, 0.02); }
  }

  /* ---- instruments: start(ch, t, midi, o) -> note {pitch(t, midi), expr(t, gainMul, centsBright), stop(t)} ---- */
  // o.cls: "tip" | "normal" | "flat" | null; o.level 0..1
  function shell(ch, t, o, cutoff, q) {
    const c = ch.ctx, lp = c.createBiquadFilter(), env = c.createGain(), expr = c.createGain();
    lp.type = "lowpass"; lp.Q.value = q || 0.7;
    lp.frequency.value = Math.min(16000, cutoff * (o.cls === "tip" ? 1.7 : o.cls === "flat" ? 0.45 : 1));
    ch.modBright(lp.detune);
    env.gain.value = 0; lp.connect(env); env.connect(expr); expr.connect(ch.out);
    return { lp, env, expr };
  }
  const flatCut = (env, t, o, peak) => { if (o.cls === "flat") env.gain.setTargetAtTime(0, t + 0.06, 0.05); else return peak; };
  function noteApi(c, oscs, sh, extra) {
    return {
      oscs,
      pitch(t, m) { for (const [o, r] of oscs) (o.frequency || o.playbackRate).setTargetAtTime(r(m), t, 0.008); },
      expr(t, gm, cents) { sh.expr.gain.setTargetAtTime(gm, t, extra.tau); sh.lp.detune.setTargetAtTime(cents, t, extra.tau); },
      stop(t, rel = 0.06) { sh.env.gain.cancelScheduledValues(t); sh.env.gain.setTargetAtTime(0, t, rel); for (const [o] of oscs) o.stop(t + rel * 8 + 0.05); if (extra.after) extra.after(t + rel * 8 + 0.05); },
    };
  }
  const ksCache = new WeakMap();
  function ksBuffer(c, midi) {
    let m = ksCache.get(c); if (!m) { m = new Map(); ksCache.set(c, m); }
    const key = Math.round(midi); if (m.has(key)) return m.get(key);
    const sr = c.sampleRate, N = Math.max(2, Math.round(sr / hz(key))), len = Math.floor(sr * 2.5);
    const b = c.createBuffer(1, len, sr), y = b.getChannelData(0);
    let prev = 0; for (let i = 0; i < N; i++) { const v = Math.random() * 2 - 1; y[i] = (v + prev) * 0.5; prev = v; } // a softened burst
    for (let i = N; i < len; i++) y[i] = 0.4985 * (y[i - N] + (i - N - 1 >= 0 ? y[i - N - 1] : 0)); // Karplus-Strong
    const r = { b, f0: sr / N }; m.set(key, r); return r;
  }

  const INSTR = {
    flute: { name: "Flute", start(ch, t, midi, o) {
      const c = ch.ctx, f = hz(midi), sh = shell(ch, t, o, f * 4, 0.5), oscs = [];
      const a = c.createOscillator(); a.type = "sine"; a.frequency.value = f; ch.modPitch(a.detune); a.connect(sh.lp); oscs.push([a, (m) => hz(m)]);
      const b2 = c.createOscillator(); b2.type = "sine"; b2.frequency.value = 2 * f; ch.modPitch(b2.detune); const g2 = c.createGain(); g2.gain.value = 0.12; b2.connect(g2); g2.connect(sh.lp); oscs.push([b2, (m) => 2 * hz(m)]);
      const n = c.createBufferSource(); n.buffer = noise(c); n.loop = true; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(9000, f * 3); bp.Q.value = 1.5; const gn = c.createGain(); gn.gain.value = 0.07; n.connect(bp); bp.connect(gn); gn.connect(sh.env); oscs.push([n, () => 1]);
      a.start(t); b2.start(t); n.start(t, Math.random());
      sh.env.gain.setValueAtTime(0, t); sh.env.gain.linearRampToValueAtTime(0.3, t + 0.045);
      if (o.cls !== "flat") sh.env.gain.setTargetAtTime(0.24, t + 0.05, 0.2); else flatCut(sh.env, t, o);
      const api = noteApi(c, oscs.slice(0, 2), sh, o); api.stop = ((s) => (tt, rel = 0.07) => { s(tt, rel); n.stop(tt + 0.7); })(api.stop); return api;
    } },
    pluck: { name: "Plucked string", start(ch, t, midi, o) {
      const c = ch.ctx, ks = ksBuffer(c, midi), sh = shell(ch, t, o, hz(midi) * 10, 0.6);
      const s = c.createBufferSource(); s.buffer = ks.b; s.playbackRate.value = hz(midi) / ks.f0; ch.modPitch(s.detune); s.connect(sh.lp); s.start(t);
      sh.env.gain.setValueAtTime(o.cls === "flat" ? 0.5 : 0.62, t); if (o.cls === "flat") sh.env.gain.setTargetAtTime(0, t + 0.04, 0.06);
      return noteApi(c, [[s, (m) => hz(m) / ks.f0]], sh, o);
    } },
    bowed: { name: "Bowed", start(ch, t, midi, o) {
      const c = ch.ctx, f = hz(midi), sh = shell(ch, t, o, f * 5, 0.8), oscs = [];
      const v = c.createOscillator(); v.frequency.value = 4.8; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(14, t + 0.5); v.connect(vg); v.start(t);
      for (const d of [-7, 7]) { const s = c.createOscillator(); s.type = "sawtooth"; s.frequency.value = f; s.detune.value = d; ch.modPitch(s.detune); vg.connect(s.detune); s.connect(sh.lp); s.start(t); oscs.push([s, (m) => hz(m)]); }
      sh.env.gain.setValueAtTime(0, t); sh.env.gain.linearRampToValueAtTime(0.2, t + (o.cls === "tip" ? 0.03 : 0.1));
      if (o.cls !== "flat") sh.env.gain.setTargetAtTime(0.17, t + 0.12, 0.3); else flatCut(sh.env, t, o);
      const api = noteApi(c, oscs, sh, o); api.stop = ((st) => (tt, rel = 0.09) => { st(tt, rel); v.stop(tt + 1); })(api.stop); return api;
    } },
    voice: { name: "Voice (ah)", start(ch, t, midi, o) {
      const c = ch.ctx, f = hz(midi), sh = shell(ch, t, o, 5000, 0.5), oscs = [];
      const s = c.createOscillator(); s.type = "sawtooth"; s.frequency.value = f; ch.modPitch(s.detune); oscs.push([s, (m) => hz(m)]);
      const v = c.createOscillator(); v.frequency.value = 5.2; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(22, t + 0.4); v.connect(vg); vg.connect(s.detune); v.start(t);
      for (const [fr, g, q] of [[730, 1, 9], [1090, 0.5, 10], [2440, 0.22, 12]]) { const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fr; bp.Q.value = q; const gg = c.createGain(); gg.gain.value = g * 3.2; s.connect(bp); bp.connect(gg); gg.connect(sh.lp); }
      s.start(t);
      sh.env.gain.setValueAtTime(0, t); sh.env.gain.linearRampToValueAtTime(0.6, t + 0.06);
      if (o.cls !== "flat") sh.env.gain.setTargetAtTime(0.52, t + 0.08, 0.3); else flatCut(sh.env, t, o);
      const api = noteApi(c, oscs, sh, o); api.stop = ((st) => (tt, rel = 0.08) => { st(tt, rel); v.stop(tt + 1); })(api.stop); return api;
    } },
    lead: { name: "Synth lead", start(ch, t, midi, o) {
      const c = ch.ctx, f = hz(midi), sh = shell(ch, t, o, f * 3, 5), oscs = [];
      for (const [type, d, g] of [["square", 0, 0.5], ["sawtooth", 6, 0.5]]) { const s = c.createOscillator(); s.type = type; s.frequency.value = f; s.detune.value = d; ch.modPitch(s.detune); const gg = c.createGain(); gg.gain.value = g; s.connect(gg); gg.connect(sh.lp); s.start(t); oscs.push([s, (m) => hz(m)]); }
      const base = sh.lp.frequency.value; sh.lp.frequency.setValueAtTime(Math.min(16000, base * 4), t); sh.lp.frequency.setTargetAtTime(base, t + 0.01, 0.08);
      sh.env.gain.setValueAtTime(0, t); sh.env.gain.linearRampToValueAtTime(0.3, t + 0.006);
      if (o.cls !== "flat") sh.env.gain.setTargetAtTime(0.24, t + 0.02, 0.2); else flatCut(sh.env, t, o);
      return noteApi(c, oscs, sh, o);
    } },
  };

  /* ---- drums (subtle) and the count-in click ---- */
  function drumsBar(ctx, dest, t, s) {
    const spb = 60 / s.bpm;
    for (let b = 0; b < s.beats; b++) {
      const tb = t + b * spb;
      if (b === 0 || (s.beats === 4 && b === 2)) kick(ctx, dest, tb, b === 0 ? 1 : 0.7);
      hat(ctx, dest, tb, b === 0 ? 0.5 : 0.38); hat(ctx, dest, tb + spb / 2, 0.24);
    }
  }
  function kick(ctx, dest, t, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3); }
  function hat(ctx, dest, t, v) { const n = ctx.createBufferSource(); n.buffer = noise(ctx); const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7500; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045); n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random() * 0.5); n.stop(t + 0.06); }
  function click(ctx, dest, t, accent) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = accent ? 2000 : 1400; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(accent ? 0.35 : 0.22, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.05); }

  root.LoopSound = { INSTR, Channel, drumsBar, kick, click, hz };
})(typeof window !== "undefined" ? window : globalThis);
