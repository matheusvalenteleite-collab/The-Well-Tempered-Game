/* Touch-area mode, SOUND LAYER: musical events in, sound out. Knows nothing about touches.
   One voice per held thumb. The contact class picks the timbre:
     null / "normal": two slightly detuned saws through a low-pass, short attack, gentle decay to a sustain;
     "tip": a bell (four inharmonic sine partials, each decaying on its own);
     "flat": a short muted tone (dark triangle + saw, gone in ~0.2 s even if held).
   "contact" events on held notes move loudness and brightness relative to the onset (setTargetAtTime,
   the smoothing time from settings). "tilt" events bend (or set vibrato depth on) every sounding note
   and shift brightness, through shared nodes (a ConstantSource into each oscillator's detune, an LFO
   for vibrato, a ConstantSource into each filter's detune). Plus the optional background loop. */
(function () {
  "use strict";
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BELL = [[1, 1, 1.8], [2.76, 0.45, 0.9], [5.4, 0.22, 0.5], [8.93, 0.1, 0.3]]; // ratio, level, decay s

  class TouchSound {
    constructor(ctx) {
      this.ctx = ctx; this.voices = new Map();
      this.P = { ctDb: 4, ctBright: 0.6, ctTau: 80 };
      this.out = ctx.createGain(); this.out.gain.value = 0.5; this.out.connect(ctx.destination);
      const sr = ctx.sampleRate, nb = ctx.createBuffer(1, sr, sr), d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
      this.loop = null;
      // tilt: shared modulation sources
      this.bend = ctx.createConstantSource(); this.bend.offset.value = 0; this.bend.start();
      this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 5.5; this.lfo.start();
      this.vib = ctx.createGain(); this.vib.gain.value = 0; this.lfo.connect(this.vib);
      this.tiltBright = ctx.createConstantSource(); this.tiltBright.offset.value = 0; this.tiltBright.start();
    }
    pitchMod(o) { this.bend.connect(o.detune); this.vib.connect(o.detune); }
    handle(ev) {
      const c = this.ctx, t = c.currentTime;
      if (ev.type === "onset") {
        this.stopVoice(ev.id, t);
        const f = hz(ev.midi), lp = c.createBiquadFilter(), env = c.createGain(), expr = c.createGain(), oscs = [];
        lp.type = "lowpass"; env.gain.value = 0;
        this.tiltBright.connect(lp.detune);
        const osc = (type, ratio, det) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f * ratio; o.detune.value = det; this.pitchMod(o); o.start(t); oscs.push([o, ratio]); return o; };
        if (ev.cls === "tip") {
          lp.frequency.value = Math.min(16000, f * 14); lp.Q.value = 0.5;
          for (const [r, lvl, dec] of BELL) { const o = osc("sine", r, 0), g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, dec / 3); o.connect(g); g.connect(lp); }
          env.gain.setValueAtTime(0.3, t);
        } else if (ev.cls === "flat") {
          lp.frequency.value = Math.min(4000, f * 2.2); lp.Q.value = 0.4;
          const a = osc("triangle", 1, 0), b = osc("sawtooth", 1, 0), gb = c.createGain(); gb.gain.value = 0.35;
          a.connect(lp); b.connect(gb); gb.connect(lp);
          env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.32, t + 0.003); env.gain.setTargetAtTime(0, t + 0.01, 0.05);
        } else {
          lp.frequency.value = Math.min(9000, f * 6); lp.Q.value = 0.8;
          osc("sawtooth", 1, -6).connect(lp); osc("sawtooth", 1, 6).connect(lp);
          env.gain.setTargetAtTime(0.22, t, 0.004); env.gain.setTargetAtTime(0.13, t + 0.03, 0.25);
        }
        lp.connect(env); env.connect(expr); expr.connect(this.out);
        this.voices.set(ev.id, { oscs, lp, env, expr, cls: ev.cls });
      } else if (ev.type === "pitch") {
        const v = this.voices.get(ev.id); if (!v) return;
        for (const [o, r] of v.oscs) o.frequency.setTargetAtTime(hz(ev.midi) * r, t, 0.01);
      } else if (ev.type === "contact") {
        const v = this.voices.get(ev.id); if (!v || v.cls === "flat") return;
        const d = ev.norm - ev.norm0, tau = this.P.ctTau / 1000;
        v.expr.gain.setTargetAtTime(Math.pow(10, (d * this.P.ctDb) / 20), t, tau);
        v.lp.detune.setTargetAtTime(d * this.P.ctBright * 1200, t, tau);
      } else if (ev.type === "tilt") {
        this.bend.offset.setTargetAtTime(ev.bend * 100, t, 0.02);
        this.vib.gain.setTargetAtTime(ev.vib, t, 0.03);
        this.tiltBright.offset.setTargetAtTime(ev.bright, t, 0.03);
      } else if (ev.type === "release") this.stopVoice(ev.id, t);
    }
    resetTilt() { const t = this.ctx.currentTime; this.bend.offset.setTargetAtTime(0, t, 0.02); this.vib.gain.setTargetAtTime(0, t, 0.02); this.tiltBright.offset.setTargetAtTime(0, t, 0.02); }
    stopVoice(id, t) {
      const v = this.voices.get(id); if (!v) return;
      this.voices.delete(id);
      v.env.gain.cancelScheduledValues(t); v.env.gain.setTargetAtTime(0, t, v.cls === "tip" ? 0.06 : 0.04);
      for (const [o] of v.oscs) o.stop(t + 0.5);
      setTimeout(() => { try { this.tiltBright.disconnect(v.lp.detune); for (const [o] of v.oscs) { this.bend.disconnect(o.detune); this.vib.disconnect(o.detune); } } catch (e) { /* gone */ } }, 700);
    }
    silence() { const t = this.ctx.currentTime; for (const id of [...this.voices.keys()]) this.stopVoice(id, t); }

    /* ---- background loop: kick, soft backbeat, eighth hats, a two-note bass on the tonic and fifth ---- */
    startLoop(bpm, tonicMidi, level) {
      this.stopLoop();
      const c = this.ctx, bus = c.createGain(); bus.gain.value = level; bus.connect(c.destination);
      const L = { bus, bpm, tonic: tonicMidi, next: c.currentTime + 0.08, step: 0 };
      L.timer = setInterval(() => {
        const spb = 60 / L.bpm / 2; // eighth notes
        while (L.next < c.currentTime + 0.12) { this.loopStep(L, L.step, L.next); L.next += spb; L.step = (L.step + 1) % 8; }
      }, 25);
      this.loop = L;
    }
    setLoop(bpm, tonicMidi, level) { if (!this.loop) return; this.loop.bpm = bpm; this.loop.tonic = tonicMidi; this.loop.bus.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05); }
    stopLoop() { if (!this.loop) return; clearInterval(this.loop.timer); const b = this.loop.bus; b.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03); setTimeout(() => b.disconnect(), 300); this.loop = null; }
    loopStep(L, s, t) {
      const c = this.ctx, bus = L.bus;
      const hit = (dur, make) => { const g = c.createGain(); g.connect(bus); make(g); setTimeout(() => g.disconnect(), (dur + 0.5) * 1000); };
      if (s === 0 || s === 4) hit(0.3, (g) => { const o = c.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); o.start(t); o.stop(t + 0.3); });
      if (s === 2 || s === 6) hit(0.2, (g) => { const n = c.createBufferSource(); n.buffer = this.noise; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); n.connect(f); f.connect(g); n.start(t, Math.random() * 0.5); n.stop(t + 0.15); });
      hit(0.1, (g) => { const n = c.createBufferSource(); n.buffer = this.noise; const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000; g.gain.setValueAtTime(s % 2 ? 0.08 : 0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); n.connect(f); f.connect(g); n.start(t, Math.random() * 0.5); n.stop(t + 0.05); });
      if (s === 0 || s === 4) hit(60 / L.bpm + 0.4, (g) => { const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = hz(L.tonic - 24 + (s === 4 ? 7 : 0)); const o2 = c.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = o.frequency.value; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500; const g2 = c.createGain(); g2.gain.value = 0.25; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6, t + 0.01); g.gain.setTargetAtTime(0, t + 60 / L.bpm - 0.05, 0.05); o.connect(g); o2.connect(g2); g2.connect(f); f.connect(g); const end = t + 60 / L.bpm + 0.4; o.start(t); o2.start(t); o.stop(end); o2.stop(end); });
    }
  }
  window.TouchSound = { TouchSound, hz };
})();
