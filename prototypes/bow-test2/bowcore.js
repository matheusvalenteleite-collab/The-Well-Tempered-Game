/* Bow test 2: the logic of the control, without the page.
   Pure functions and small classes, shared by the page (app.js), the unit tests
   and the offline audio render. Times are in milliseconds unless named ...S. */
(function (root) {
  "use strict";

  const S_MIN = 2; // px/s: the slowest bow the curve is drawn for ("noise floor" is the level here)

  function dbToAmp(db) { return Math.pow(10, db / 20); }
  function ampToDb(a) { return a > 0 ? 20 * Math.log10(a) : -Infinity; }

  /* Speed (px/s) -> normalised loudness position 0..1 on the log curve. */
  function speedNorm(s, p) {
    if (!(s > S_MIN)) return 0;
    if (s >= p.sMax) return 1;
    const x = Math.log(s / S_MIN) / Math.log(p.sMax / S_MIN);
    return Math.pow(x, p.exp);
  }

  /* Speed (px/s) -> linear gain 0..1.
     2 px/s .. sMax is a dB-linear curve (shaped by exp) from floorDb up to 0 dB.
     Below 2 px/s the gain fades to zero smoothly (no hard dead zone). */
  function speedToGain(s, p) {
    if (!(s > 0)) return 0;
    if (s < S_MIN) { const r = s / S_MIN; return dbToAmp(p.floorDb) * r * r; }
    return dbToAmp(p.floorDb * (1 - speedNorm(s, p)));
  }

  /* Backlash ("play") filter: the output follows the finger but ignores wobbles
     smaller than h px. It adds h px of lag, never a dead zone in speed.
     A reversal is reported only after the finger comes back by more than 2h. */
  class Backlash {
    constructor(h) { this.h = h; this.reset(); }
    reset() { this.y = null; this.dir = 0; }
    push(raw) {
      if (this.y === null) { this.y = raw; return { y: raw, moved: false, reversed: false }; }
      const d = raw - this.y;
      if (Math.abs(d) <= this.h) return { y: this.y, moved: false, reversed: false };
      const nd = Math.sign(d);
      const prev = this.y;
      const reversed = this.dir !== 0 && nd !== this.dir;
      this.dir = nd;
      this.y = raw - this.h * nd;
      return { y: this.y, prev, moved: true, reversed };
    }
  }

  /* Adaptive-window speed estimate.
     The window reaches back from the newest sample until it is at least minWin ms long
     AND the finger has travelled at least minTravel px, but never beyond maxWin ms.
     So fast strokes are measured over ~30 ms, very slow ones over up to maxWin.
     When samples stop arriving, the estimate is capped by "how far could it have gone
     unseen": resolution / idle time, so a stopped bow decays to silence. */
  class SpeedEstimator {
    constructor(o) { this.o = Object.assign({ minWin: 30, maxWin: 600, minTravel: 1.5, resPx: 0.6 }, o || {}); this.reset(); }
    reset() { this.s = []; this.evInt = 16; }
    push(t, y) {
      const s = this.s;
      if (s.length) {
        const dt = t - s[s.length - 1].t;
        if (dt > 0) this.evInt += (Math.min(200, Math.max(4, dt)) - this.evInt) * 0.2;
      }
      s.push({ t, y });
      while (s.length > 2 && t - s[1].t > this.o.maxWin) s.shift();
      if (s.length > 400) s.shift();
    }
    estimate(now) {
      const s = this.s, n = s.length;
      if (n < 2) return 0;
      const last = s[n - 1];
      let ref = null;
      for (let i = n - 2; i >= 0; i--) {
        const c = s[i], dt = last.t - c.t;
        if (dt > this.o.maxWin) break;
        ref = c;
        if (dt >= this.o.minWin && Math.abs(last.y - c.y) >= this.o.minTravel) break;
      }
      if (!ref || last.t <= ref.t) return 0;
      let v = Math.abs(last.y - ref.y) / ((last.t - ref.t) / 1000);
      const extra = (now - last.t) - 1.5 * this.evInt;
      if (extra > 0) v = Math.min(v, this.o.resPx / (extra / 1000));
      if (now - last.t > 1500) v = 0;
      return v;
    }
  }

  /* Row choice for a sliding pitch thumb. u = position in row units from the bottom
     (row k spans k..k+1). Leaving a row needs hystPx extra travel past its edge;
     a new row sounds only after the thumb has stayed in it dwellMs (so rows crossed
     quickly are skipped), or at once if the thumb lifts there. */
  class RowSelector {
    constructor(n, o) { this.n = n; this.o = o; this.row = -1; this.cand = -1; this.candT = 0; }
    clampRow(u) { return Math.max(0, Math.min(this.n - 1, Math.floor(u))); }
    down(u) { this.row = this.clampRow(u); this.cand = -1; return this.row; }
    move(u, t, rowH) {
      if (this.row < 0) return null;
      const hf = this.o.hystPx / rowH;
      let target = this.row;
      if (u >= this.row + 1 + hf || u < this.row - hf) target = this.clampRow(u);
      if (target === this.row) { this.cand = -1; return null; }
      if (target !== this.cand) { this.cand = target; this.candT = t; }
      return this.tick(t);
    }
    tick(t) {
      if (this.cand >= 0 && t - this.candT >= this.o.dwellMs) { this.row = this.cand; this.cand = -1; return this.row; }
      return null;
    }
    up() { if (this.cand >= 0) { this.row = this.cand; this.cand = -1; return this.row; } return null; }
  }

  /* The sound: two detuned saws -> low-pass -> bow gain -> articulation gain -> gate -> out.
     Bow noise (band-passed noise) rides the bow gain; a short noise "chiff" marks fresh attacks.
     Every call takes a context time t (seconds) so the same code renders offline. */
  function buildVoice(ctx, dest) {
    const sr = ctx.sampleRate;
    const nb = ctx.createBuffer(1, Math.floor(sr * 2), sr);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const mk = (type) => { const o = ctx.createOscillator(); o.type = type; return o; };
    const o1 = mk("sawtooth"), o2 = mk("sawtooth");
    o1.detune.value = -6; o2.detune.value = 6;
    const mix = ctx.createGain(); mix.gain.value = 0.5;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.7; lp.frequency.value = 1200;
    const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2500; bp.Q.value = 0.9;
    const noiseAmt = ctx.createGain(); noiseAmt.gain.value = 0;
    const bow = ctx.createGain(); bow.gain.value = 0;
    const artic = ctx.createGain(); artic.gain.value = 1;
    const gate = ctx.createGain(); gate.gain.value = 0;
    const chiffSrc = ctx.createBufferSource(); chiffSrc.buffer = nb; chiffSrc.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
    const chiff = ctx.createGain(); chiff.gain.value = 0;
    const master = ctx.createGain(); master.gain.value = 0.6;
    o1.connect(mix); o2.connect(mix); mix.connect(lp); lp.connect(bow);
    noise.connect(bp); bp.connect(noiseAmt); noiseAmt.connect(bow);
    bow.connect(artic); artic.connect(gate); gate.connect(master);
    chiffSrc.connect(hp); hp.connect(chiff); chiff.connect(gate);
    master.connect(dest || ctx.destination);
    o1.start(0); o2.start(0); noise.start(0); chiffSrc.start(0, 0.7);
    return {
      setFreq(hz, t, glideMs) {
        for (const o of [o1, o2]) {
          o.frequency.cancelScheduledValues(t);
          if (glideMs > 0) o.frequency.setTargetAtTime(hz, t, glideMs / 3000);
          else o.frequency.setValueAtTime(hz, t);
        }
      },
      setBend(cents, t) { o1.detune.setTargetAtTime(cents - 6, t, 0.012); o2.detune.setTargetAtTime(cents + 6, t, 0.012); },
      setLevel(a, t, tauS) { bow.gain.setTargetAtTime(a, t, Math.max(0.002, tauS)); },
      setCutoff(hz, t) { lp.frequency.setTargetAtTime(Math.min(16000, Math.max(80, hz)), t, 0.02); },
      setNoise(a, t) { noiseAmt.gain.setTargetAtTime(a, t, 0.02); },
      gate(open, t) { gate.gain.setTargetAtTime(open ? 1 : 0, t, open ? 0.004 : 0.012); },
      dip(t, gapS) { // bow change: fall to silence, wait, come back
        artic.gain.cancelScheduledValues(t);
        artic.gain.setTargetAtTime(0, t, 0.003);
        artic.gain.setTargetAtTime(1, t + gapS, 0.005);
      },
      chiff(t, amt) {
        if (!(amt > 0)) return;
        chiff.gain.cancelScheduledValues(t);
        chiff.gain.setTargetAtTime(amt, t, 0.002);
        chiff.gain.setTargetAtTime(0, t + 0.012, 0.015);
      },
      ctx,
    };
  }

  const D_MAJOR = [293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 554.37]; // D4 .. C#5
  const NOTE_NAMES = ["D", "E", "F♯", "G", "A", "B", "C♯"];

  const DEFAULTS = {
    mode: "latchslide", floorDb: -34, sMax: 450, exp: 0.75, tauMs: 35, gapMs: 0, glideMs: 15,
    dwellMs: 30, rowHystPx: 7, jitterPx: 0.4, minWin: 30, maxWin: 600, minTravel: 1.5,
    bright: 0.6, noise: 0.06, chiff: 0.12, pressure: false, vibrato: false, vibDepth: 30,
  };

  /* The engine: turns bow and pitch gestures into calls on the voice.
     toCtx(tMs) gives the context time to schedule at (live: currentTime; offline: tMs/1000). */
  class BowEngine {
    constructor(voice, params, toCtx, log) {
      this.v = voice; this.p = Object.assign({}, DEFAULTS, params || {}); this.toCtx = toCtx;
      this.log = log || (() => {});
      this.filt = new Backlash(this.p.jitterPx);
      this.est = new SpeedEstimator({ minWin: this.p.minWin, maxWin: this.p.maxWin, minTravel: this.p.minTravel });
      this.bowId = null; this.stopped = true; this.slowSince = 0;
      this.speed = 0; this.gain = 0; this.norm = 0;
      this.vRev = 0; this.tRev = -1e9; this.x = 0; this.xSlow = 0; this.lastTick = 0; this.bend = 0;
      this.pitchPtrs = new Map(); // id -> {sel, row, t}
      this.row = -1; this.gateOpen = false;
      this.area = { min: Infinity, max: -Infinity, cur: null };
      this.counts = { reversal: 0, restart: 0, slur: 0, newNote: 0, skippedRows: 0 };
    }
    set(k, val) {
      this.p[k] = val;
      if (k === "jitterPx") this.filt.h = val;
      if (k === "minWin" || k === "maxWin" || k === "minTravel") this.est.o[k] = val;
      if (k === "mode") { this.log("mode " + val); this.refreshGate(performance0()); }
    }
    latching() { return this.p.mode === "latch" || this.p.mode === "latchslide"; }
    sliding() { return this.p.mode === "slide" || this.p.mode === "latchslide"; }
    sounding() { return this.bowId !== null && !this.stopped && this.gateOpen; }

    /* ---- bow thumb ---- */
    bowDown(id, t, x, y) {
      this.bowId = id; this.filt.reset(); this.est.reset(); this.filt.push(y); this.est.push(t, y);
      this.stopped = true; this.slowSince = t; this.x = this.xSlow = x;
    }
    bowMove(id, t, x, y, area) {
      if (id !== this.bowId) return;
      this.x = x;
      if (area != null && area > 0) { this.area.cur = area; this.area.min = Math.min(this.area.min, area); this.area.max = Math.max(this.area.max, area); }
      const r = this.filt.push(y);
      if (!r.moved) return;
      if (r.reversed) {
        // the window must not span the turn, or the two directions cancel out
        const lastT = this.est.s.length ? this.est.s[this.est.s.length - 1].t : t;
        if (!this.stopped) {
          this.vRev = Math.max(this.speed, this.est.estimate(t));
          this.tRev = t;
          this.counts.reversal++;
          if (this.p.gapMs > 0) { const c = this.toCtx(t); this.v.dip(c, this.p.gapMs / 1000); this.v.chiff(c + this.p.gapMs / 1000, this.p.chiff * Math.sqrt(this.gain)); }
        }
        this.est.reset(); this.est.push(lastT, r.prev); this.est.push(t, r.y);
      } else this.est.push(t, r.y);
      this.tick(t);
    }
    bowUp(id, t) {
      if (id !== this.bowId) return;
      this.bowId = null; this.stopped = true; this.speed = 0; this.gain = 0;
      this.v.setLevel(0, this.toCtx(t), 0.03);
    }

    /* ---- pitch thumb ---- */
    pitchDown(id, t, u) {
      const sel = new RowSelector(D_MAJOR.length, { hystPx: this.p.rowHystPx, dwellMs: this.p.dwellMs });
      const row = sel.down(u);
      this.pitchPtrs.set(id, { sel, t });
      this.setRow(row, t, "tap");
    }
    pitchMove(id, t, u, rowH) {
      const pp = this.pitchPtrs.get(id);
      if (!pp || !this.sliding() || id !== this.latestPitchId()) return;
      pp.sel.o.hystPx = this.p.rowHystPx; pp.sel.o.dwellMs = this.p.dwellMs;
      const prevCand = pp.sel.cand;
      const r = pp.sel.move(u, t, rowH);
      if (prevCand >= 0 && pp.sel.cand !== prevCand && r === null) this.counts.skippedRows++;
      if (r !== null) this.setRow(r, t, "slide");
    }
    pitchUp(id, t) {
      const pp = this.pitchPtrs.get(id);
      if (!pp) return;
      const wasLatest = id === this.latestPitchId();
      if (this.sliding() && wasLatest) { const r = pp.sel.up(); if (r !== null) this.setRow(r, t, "slide"); }
      this.pitchPtrs.delete(id);
      if (wasLatest && this.pitchPtrs.size) { const other = this.pitchPtrs.get(this.latestPitchId()); this.setRow(other.sel.row, t, "tap"); }
      this.refreshGate(t);
    }
    latestPitchId() { let best = null, bt = -Infinity; for (const [id, pp] of this.pitchPtrs) if (pp.t >= bt) { bt = pp.t; best = id; } return best; }
    setRow(row, t, how) {
      const c = this.toCtx(t);
      const wasGate = this.gateOpen;
      if (row !== this.row) {
        if (this.sounding()) { this.v.setFreq(D_MAJOR[row], c, this.p.glideMs); this.counts.slur++; }
        else this.v.setFreq(D_MAJOR[row], c, 0);
        this.row = row;
      }
      this.refreshGate(t);
      if (!wasGate && this.gateOpen && this.bowId !== null && !this.stopped) { this.v.chiff(c, this.p.chiff * Math.sqrt(this.gain)); this.counts.newNote++; }
    }
    refreshGate(t) {
      const open = this.row >= 0 && (this.latching() || this.pitchPtrs.size > 0);
      if (open !== this.gateOpen) { this.gateOpen = open; this.v.gate(open, this.toCtx(t)); }
    }

    /* ---- called every frame and on every bow sample ---- */
    tick(t) {
      for (const [id, pp] of this.pitchPtrs) if (this.sliding() && id === this.latestPitchId()) { const r = pp.sel.tick(t); if (r !== null) this.setRow(r, t, "slide"); }
      const c = this.toCtx(t);
      if (this.bowId === null) { this.speed = 0; this.gain = 0; this.norm = 0; return; }
      let v = this.est.estimate(t);
      const since = t - this.tRev;
      if (since < 150) v = Math.max(v, this.vRev * Math.exp(-since / 45)); // carry the level through a bow change
      this.speed = v;
      if (v < 1) { if (!this.stopped && t - this.slowSince > 150) this.stopped = true; }
      else {
        this.slowSince = t;
        if (this.stopped && v > 1.5) { this.stopped = false; this.counts.restart++; if (this.gateOpen) this.v.chiff(c, this.p.chiff * Math.sqrt(speedToGain(v, this.p))); }
      }
      const g = speedToGain(v, this.p);
      this.gain = g; this.norm = speedNorm(v, this.p);
      this.v.setLevel(g, c, this.p.tauMs / 1000);
      let press = 0.5;
      if (this.p.pressure && this.area.cur != null && this.area.max > this.area.min * 1.05) press = (this.area.cur - this.area.min) / (this.area.max - this.area.min);
      const f0 = this.row >= 0 ? D_MAJOR[this.row] : 300;
      const oct = 1.2 + this.p.bright * 4 * this.norm + (this.p.pressure ? (press - 0.5) * 1.6 : 0);
      this.v.setCutoff(f0 * Math.pow(2, oct), c);
      this.v.setNoise(this.p.noise * (this.p.pressure ? 0.3 + 1.4 * press : 1), c);
      const dt = Math.max(0, t - this.lastTick); this.lastTick = t;
      this.xSlow += (this.x - this.xSlow) * (1 - Math.exp(-dt / 250));
      const bend = this.p.vibrato ? this.p.vibDepth * Math.max(-1, Math.min(1, (this.x - this.xSlow) / 10)) : 0;
      if (Math.abs(bend - this.bend) > 0.5) { this.bend = bend; this.v.setBend(bend, c); }
    }
  }
  function performance0() { return typeof performance !== "undefined" ? performance.now() : 0; }

  const api = { S_MIN, dbToAmp, ampToDb, speedNorm, speedToGain, Backlash, SpeedEstimator, RowSelector, buildVoice, BowEngine, D_MAJOR, NOTE_NAMES, DEFAULTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BowCore = api;
})(typeof window !== "undefined" ? window : globalThis);
