/* Touch-area mode, SOUND LAYER: musical events in, sound out. Knows nothing about touches.
   One voice per held thumb: two slightly detuned saws through a low-pass, a short attack and a gentle
   decay to a sustain; a pitch event glides; release fades. Plus the optional background loop. */
(function () {
  "use strict";
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  class TouchSound {
    constructor(ctx) {
      this.ctx = ctx; this.voices = new Map();
      this.out = ctx.createGain(); this.out.gain.value = 0.5; this.out.connect(ctx.destination);
      const sr = ctx.sampleRate, nb = ctx.createBuffer(1, sr, sr), d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
      this.loop = null;
    }
    handle(ev) {
      const c = this.ctx, t = c.currentTime;
      if (ev.type === "onset") {
        this.stopVoice(ev.id, t);
        const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
        o1.type = o2.type = "sawtooth"; o1.detune.value = -6; o2.detune.value = 6;
        o1.frequency.value = o2.frequency.value = hz(ev.midi);
        lp.type = "lowpass"; lp.Q.value = 0.8; lp.frequency.value = Math.min(9000, hz(ev.midi) * 6);
        g.gain.value = 0; g.gain.setTargetAtTime(0.22, t, 0.004); g.gain.setTargetAtTime(0.13, t + 0.03, 0.25);
        o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.out);
        o1.start(t); o2.start(t);
        this.voices.set(ev.id, { o1, o2, lp, g });
      } else if (ev.type === "pitch") {
        const v = this.voices.get(ev.id); if (!v) return;
        for (const o of [v.o1, v.o2]) o.frequency.setTargetAtTime(hz(ev.midi), t, 0.01);
        v.lp.frequency.setTargetAtTime(Math.min(9000, hz(ev.midi) * 6), t, 0.01);
      } else if (ev.type === "release") this.stopVoice(ev.id, t);
      // "contact" events: no sound effect yet (contact size features wait for the probe)
    }
    stopVoice(id, t) {
      const v = this.voices.get(id); if (!v) return;
      this.voices.delete(id);
      v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.04);
      v.o1.stop(t + 0.4); v.o2.stop(t + 0.4);
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
      if (s === 0 || s === 4) hit(60 / L.bpm + 0.4, (g) => { const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = hz(L.tonic - 24 + (s === 4 ? 7 : 0)); const o2 = c.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = o.frequency.value; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500; const g2 = c.createGain(); g2.gain.value = 0.25; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6, t + 0.01); g.gain.setTargetAtTime(0, t + 0.5 * 60 / L.bpm * 2 - 0.05, 0.05); o.connect(g); o2.connect(g2); g2.connect(f); f.connect(g); const end = t + 60 / L.bpm + 0.4; o.start(t); o2.start(t); o.stop(end); o2.stop(end); });
    }
  }
  window.TouchSound = { TouchSound, hz };
})();
