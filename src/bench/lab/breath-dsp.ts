/**
 * D323, THE LAB's BREATH: the microphone as a breath controller (as Smule's Ocarina, Wang, CMJ 38(2),
 * 2014: "a leaky integrator, implemented as a one-pole feedback filter" on the mic's amplitude). Pure
 * functions and small state machines, no Web Audio, so they are tested on synthetic signals:
 *   - the ENVELOPE: the RMS of 64-sample chunks (1.3 ms) through a one-pole follower, fast to rise (attack
 *     ~6 ms) and slower to fall (release ~60 ms); a second, faster one (2 ms / 10 ms) for the tongue;
 *   - BLOW-NESS: blowing on a mic is turbulence, a broadband noise (Patel & Abowd, UIST 2007: "Wind
 *     noise produces a broadband frequency response through the microphone, which is very high in
 *     amplitude for low frequency components"); a voice, a hum or the instrument's own sound coming
 *     back from the speaker is periodic. Two measures on the pre-emphasised signal (the first difference,
 *     which flattens wind's low-frequency weight): SPECTRAL FLATNESS (geometric over arithmetic mean of
 *     the power spectrum, 150 Hz to 6 kHz: noise high, a tone low) and PERIODICITY (the normalised
 *     autocorrelation's highest peak between 1 and 10 ms, i.e. 100 to 1000 Hz, corrected for the window
 *     as Boersma 1993 does: a tone near 1, noise low). NOISY = both say noise;
 *   - the GATE with hysteresis: opens when the breath is above the threshold and noisy for two looks in
 *     a row, closes when it falls below the threshold less the hysteresis (or stops being noisy, the
 *     speaker's own sound holding it up) for a while;
 *   - the TONGUE: while the breath is on, the fast envelope dips under the slow one (the tongue stops the
 *     air: "tu", "du", "di-dl") and comes back above it: a re-articulation;
 *   - the LEAK: the speaker heard by the mic, estimated from the voice's own output level times a factor
 *     measured once (calibration's LEAK TEST), taken off the breath before the gate and the envelope.
 * The pressure (0..1) is the envelope between the gate's threshold and the "strong" level calibrated.
 */

/** The parameters, all live in the BREATH tab. */
export interface BreathTuning {
  /** The envelope's rise and fall (ms): the sound's loudness and the gate. */
  attackMs: number;
  releaseMs: number;
  /** The tongue's fast envelope (ms). */
  fastAttackMs: number;
  fastReleaseMs: number;
  /** The gate closes this far (dB) under where it opens. */
  hysteresisDb: number;
  /** How noisy (0..1) the sound must be for the gate to open; under half of it the open gate closes. */
  minNoisy: number;
  /** The gate opens after this many looks (≈5.3 ms each) above the threshold and noisy. */
  openLooks: number;
  /** The gate closes after the breath stays under its close level (or not noisy) this long (ms). */
  closeMs: number;
  /** A tongue: the fast envelope at least this far (dB) under the slow one, then back within `tongueBackDb` of it… */
  tongueDipDb: number;
  tongueBackDb: number;
  /** …within this long (ms) of the dip, and at least this long (ms) after the last onset. */
  tongueWithinMs: number;
  tongueGapMs: number;
}

export const BREATH_DEFAULTS: Readonly<BreathTuning> = {
  attackMs: 6,
  releaseMs: 50,
  fastAttackMs: 2,
  fastReleaseMs: 10,
  hysteresisDb: 6,
  minNoisy: 0.5,
  openLooks: 3,
  closeMs: 50,
  tongueDipDb: 8,
  tongueBackDb: 1.5,
  tongueWithinMs: 140,
  tongueGapMs: 60,
};

/** Levels measured in calibration (dBFS of the breath envelope). */
export interface BreathCal {
  /** Breathing normally near the phone, the room: the gate stays shut at this level. */
  floorDb: number;
  /** Blowing softly: the gate opens well under it. */
  softDb: number;
  /** Blowing strongly: full pressure. */
  strongDb: number;
  /** The speaker heard by the mic: mic RMS per unit of the voice's output RMS (0 with headphones). */
  leak: number;
}

/** Before any calibration: a phone's bottom mic blown on from a few centimetres (a guess; calibrate). */
export const CAL_DEFAULT: Readonly<BreathCal> = { floorDb: -60, softDb: -36, strongDb: -14, leak: 0 };

export const dbOf = (ms: number) => 10 * Math.log10(Math.max(ms, 1e-12));
export const msOf = (db: number) => 10 ** (db / 10);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** The one-pole leaky integrator's coefficient for a time constant `ms` at steps of `dtMs`. */
export function poleOf(ms: number, dtMs: number): number {
  return ms <= 0 ? 0 : Math.exp(-dtMs / ms);
}

/** One step of an attack/release follower: rises with `attackMs`, falls with `releaseMs`. */
export function follow(prev: number, x: number, dtMs: number, attackMs: number, releaseMs: number): number {
  const a = poleOf(x > prev ? attackMs : releaseMs, dtMs);
  return a * prev + (1 - a) * x;
}

/** Mean square of `buf[from, from + n)`. */
export function meanSquare(buf: ArrayLike<number>, from = 0, n = buf.length - from): number {
  let s = 0;
  for (let i = from; i < from + n; i++) s += buf[i] * buf[i];
  return n > 0 ? s / n : 0;
}

/** Zero crossings per sample (noise ≈ high, a low tone ≈ 2·f/sr). Kept for the readout. */
export function zeroCrossRate(buf: ArrayLike<number>): number {
  let z = 0;
  for (let i = 1; i < buf.length; i++) if (buf[i - 1] < 0 !== buf[i] < 0) z++;
  return buf.length > 1 ? z / (buf.length - 1) : 0;
}

/** In-place radix-2 complex FFT (re, im of a power-of-two length); `inverse` without the 1/N. */
export function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** The blow-ness measures of one window. */
export interface Noisiness {
  /** Spectral flatness 0..1 (white noise ≈ 0.5–0.6 on one window; a tone ≈ 0). */
  flat: number;
  /** Periodicity 0..1 (a tone ≈ 1; noise ≈ 0.1–0.3). */
  per: number;
  /** 0..1: how sure it is breath (noise), from both. */
  noisy: number;
}

/**
 * The analyser of one window size: Hann window, zero-padded to twice its length, so one FFT gives the
 * power spectrum (flatness) and, transformed back, the autocorrelation (periodicity), normalised by the
 * window's own autocorrelation.
 */
export class NoiseMeter {
  readonly n: number;
  readonly sr: number;
  private win: Float64Array;
  private winAc: Float64Array;
  private re: Float64Array;
  private im: Float64Array;
  private bins: [number, number];
  private lags: [number, number];

  constructor(sr: number, n = 1024) {
    this.n = n;
    this.sr = sr;
    this.win = new Float64Array(n);
    for (let i = 0; i < n; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / n);
    this.re = new Float64Array(2 * n);
    this.im = new Float64Array(2 * n);
    this.bins = [Math.max(1, Math.round((150 * 2 * n) / sr)), Math.min(n - 1, Math.round((6000 * 2 * n) / sr))];
    this.lags = [Math.max(2, Math.round(sr / 1000)), Math.min(n - 2, Math.round(sr / 100))];
    // The window's own autocorrelation (for Boersma's correction).
    this.re.fill(0);
    this.im.fill(0);
    for (let i = 0; i < n; i++) this.re[i] = this.win[i];
    fft(this.re, this.im);
    for (let k = 0; k < 2 * n; k++) (this.re[k] = this.re[k] ** 2 + this.im[k] ** 2), (this.im[k] = 0);
    fft(this.re, this.im, true);
    this.winAc = new Float64Array(n);
    for (let i = 0; i < n; i++) this.winAc[i] = this.re[i] / this.re[0];
  }

  /** The measures of the last `n` samples of `x` (pre-emphasised here: y = x[i] − 0.95·x[i−1]). */
  measure(x: ArrayLike<number>): Noisiness {
    const { n, re, im, win } = this;
    const off = x.length - n;
    re.fill(0);
    im.fill(0);
    let mean = 0;
    for (let i = 0; i < n; i++) mean += x[off + i] - 0.95 * (off + i > 0 ? x[off + i - 1] : 0);
    mean /= n;
    for (let i = 0; i < n; i++) re[i] = (x[off + i] - 0.95 * (off + i > 0 ? x[off + i - 1] : 0) - mean) * win[i];
    fft(re, im);
    // Flatness over the band.
    let logSum = 0;
    let sum = 0;
    const [b0, b1] = this.bins;
    for (let k = b0; k <= b1; k++) {
      const p = re[k] * re[k] + im[k] * im[k] + 1e-20;
      logSum += Math.log(p);
      sum += p;
    }
    const cnt = b1 - b0 + 1;
    const flat = sum > 0 ? Math.exp(logSum / cnt) / (sum / cnt) : 0;
    // Autocorrelation: the power spectrum transformed back.
    for (let k = 0; k < 2 * n; k++) (re[k] = re[k] * re[k] + im[k] * im[k]), (im[k] = 0);
    fft(re, im, true);
    const r0 = re[0];
    let per = 0;
    if (r0 > 0) {
      const [l0, l1] = this.lags;
      for (let l = l0; l <= l1; l++) {
        // A peak only (not the slope down from lag 0).
        if (re[l] < re[l - 1] || re[l] < re[l + 1]) continue;
        const v = re[l] / r0 / this.winAc[l];
        if (v > per) per = v;
      }
    }
    per = clamp01(per);
    return { flat, per, noisy: noisinessOf(flat, per) };
  }
}

/** 0..1 from flatness and periodicity: noise only when the spectrum is flat AND nothing repeats. */
export function noisinessOf(flat: number, per: number): number {
  const f = clamp01((flat - 0.08) / (0.3 - 0.08));
  const p = clamp01((0.8 - per) / (0.8 - 0.45));
  return Math.min(f, p);
}

export type GateEvent = "on" | "off";

/** The gate with hysteresis, on the breath level (dB) and its noisiness, one look at a time. */
export class Gate {
  open = false;
  private above = 0;
  private belowSince: number | null = null;
  openDb: number;
  tune: BreathTuning;
  constructor(openDb: number, tune: BreathTuning) {
    this.openDb = openDb;
    this.tune = tune;
  }
  get closeDb(): number {
    return this.openDb - this.tune.hysteresisDb;
  }
  /**
   * One look: the level (dB) that opens it, the noisiness that opens it (the caller: the lower of the latest and the smoothed, so a tone starting after the room's noise does not open it), the time (ms),
   * the level that keeps it open (the fast envelope: a breath's end closes it quickly) and the noisiness that keeps it (the higher).
   */
  step(db: number, noisy: number, tMs: number, holdDb = db, holdNoisy = noisy): GateEvent | null {
    const t = this.tune;
    if (!this.open) {
      this.above = Math.min(db, holdDb) >= this.openDb && noisy >= t.minNoisy ? this.above + 1 : 0;
      if (this.above >= t.openLooks) {
        this.open = true;
        this.above = 0;
        this.belowSince = null;
        return "on";
      }
      return null;
    }
    const low = holdDb < this.closeDb || holdNoisy < t.minNoisy * 0.5;
    if (!low) {
      this.belowSince = null;
      return null;
    }
    if (this.belowSince === null) this.belowSince = tMs;
    if (tMs - this.belowSince >= t.closeMs) {
      this.open = false;
      this.belowSince = null;
      return "off";
    }
    return null;
  }
}

/** The tongue: a dip of the fast envelope under the slow one, then back up to it, while the breath is on. */
export class Tongue {
  private dipAt = -Infinity;
  private dipDepth = 0;
  private inDip = false;
  private lastOnset = -Infinity;
  tune: BreathTuning;
  constructor(tune: BreathTuning) {
    this.tune = tune;
  }
  /** The gate opened (an onset: the next tongue at least tongueGapMs after it). */
  onset(tMs: number) {
    this.lastOnset = tMs;
    this.inDip = false;
    this.dipDepth = 0;
  }
  /** One step: fast and slow envelopes (dB), the time (ms); the dip's depth (dB) when a tongue is found. */
  step(fastDb: number, slowDb: number, tMs: number): number | null {
    const t = this.tune;
    const d = fastDb - slowDb;
    if (d <= -t.tongueDipDb) {
      if (!this.inDip) this.dipDepth = 0;
      this.dipDepth = Math.max(this.dipDepth, -d);
      this.dipAt = tMs;
      this.inDip = true;
      return null;
    }
    if (this.inDip && d >= -t.tongueBackDb) {
      this.inDip = false;
      if (tMs - this.dipAt <= t.tongueWithinMs && tMs - this.lastOnset >= t.tongueGapMs) {
        this.lastOnset = tMs;
        return this.dipDepth;
      }
    }
    return null;
  }
}

/** One look's result. */
export interface BreathLook {
  /** Time (ms) at the end of the look. */
  t: number;
  /** The breath envelope (dB, after the leak), its fast twin, and the raw mic level (dB) of the look. */
  envDb: number;
  fastDb: number;
  micDb: number;
  /** 0..1 between the gate's threshold and "strong" (0 while the gate is shut). */
  pressure: number;
  /**
   * 0..1: the fast envelope between the gate's close and open lines (1 above): the sound's own fade, so a
   * breath's end and a tongue's stop are heard at once (0 while the gate is shut).
   */
  fade: number;
  open: boolean;
  noise: Noisiness;
  /** The noisiness smoothed over a few looks (what the gate uses). */
  noisy: number;
  events: { kind: "on" | "off" | "tongue"; depth?: number }[];
}

/** Where the gate opens for a calibration: between breathing and blowing softly, never under the room + 6 dB. */
export function openDbOf(cal: BreathCal): number {
  return Math.max(cal.floorDb + 6, cal.floorDb + 0.5 * (cal.softDb - cal.floorDb));
}

/** The pressure (0..1) of an envelope level for a calibration: from the gate's threshold to "strong". */
export function pressureOf(envDb: number, cal: BreathCal): number {
  const lo = openDbOf(cal);
  const hi = Math.max(lo + 6, cal.strongDb);
  return clamp01((envDb - lo) / (hi - lo));
}

/**
 * The whole chain on the mic's samples, pushed in blocks of any length (the worklet posts 256): chunks
 * of 64 samples (1.3 ms) feed the envelopes and the tongue; every 256 samples (≈5.3 ms at 48 kHz) a look
 * steps the gate and reports, every other one measuring noisiness on the last 1024 samples. `outMs`: the voice's own output (mean square) during
 * the block, for the leak.
 */
export class BreathAnalyser {
  readonly sr: number;
  tune: BreathTuning;
  cal: BreathCal;
  readonly gate: Gate;
  readonly tongue: Tongue;
  private meter: NoiseMeter;
  private ring: Float32Array;
  private lin: Float32Array;
  private w = 0;
  private filled = 0;
  private chunk = 0;
  private chunkSum = 0;
  private sinceLook = 0;
  private env = 1e-6;
  private fast = 1e-6;
  private peakMic = 0;
  private noisySm = 0;
  private samples = 0;
  private lookN = 256;
  private lookIx = 0;
  private noise: Noisiness = { flat: 0, per: 1, noisy: 0 };
  private pending: BreathLook["events"] = [];
  /** The latest look. */
  last: BreathLook | null = null;

  constructor(sr: number, tune: BreathTuning = { ...BREATH_DEFAULTS }, cal: BreathCal = { ...CAL_DEFAULT }) {
    this.sr = sr;
    this.tune = tune;
    this.cal = cal;
    this.gate = new Gate(openDbOf(cal), tune);
    this.tongue = new Tongue(tune);
    const n = sr > 64000 ? 2048 : 1024;
    this.meter = new NoiseMeter(sr, n);
    this.ring = new Float32Array(n);
    this.lin = new Float32Array(n);
    this.lookN = Math.round((256 * sr) / 48000);
  }

  setCal(cal: BreathCal) {
    this.cal = cal;
    this.gate.openDb = openDbOf(cal);
  }
  setTune(tune: BreathTuning) {
    this.tune = tune;
    this.gate.tune = tune;
    this.tongue.tune = tune;
  }

  /** Feed a block; returns the looks completed in it (usually 0 or 1). */
  push(block: ArrayLike<number>, outMs = 0): BreathLook[] {
    const out: BreathLook[] = [];
    const leakMs = this.cal.leak > 0 ? this.cal.leak * this.cal.leak * outMs * 1.5 : 0;
    const dt = (64 / this.sr) * 1000;
    const t = this.tune;
    const ring = this.ring;
    for (let i = 0; i < block.length; i++) {
      const x = block[i];
      // The ring of the last n samples.
      ring[this.w] = x;
      this.w = (this.w + 1) % ring.length;
      if (this.filled < ring.length) this.filled++;
      this.chunkSum += x * x;
      this.samples++;
      if (++this.chunk === 64) {
        const ms = this.chunkSum / 64;
        this.peakMic = Math.max(this.peakMic, ms);
        const breath = Math.sqrt(Math.max(1e-12, ms - leakMs));
        this.env = follow(this.env, breath, dt, t.attackMs, t.releaseMs);
        this.fast = follow(this.fast, breath, dt, t.fastAttackMs, t.fastReleaseMs);
        this.chunk = 0;
        this.chunkSum = 0;
        if (this.gate.open) {
          const tMs = (this.samples / this.sr) * 1000;
          const depth = this.tongue.step(dbOf(this.fast * this.fast), dbOf(this.env * this.env), tMs);
          if (depth !== null) this.pending.push({ kind: "tongue", depth });
        }
      }
      if (++this.sinceLook >= this.lookN) {
        this.sinceLook = 0;
        out.push(this.look());
      }
    }
    return out;
  }

  private look(): BreathLook {
    const tMs = (this.samples / this.sr) * 1000;
    // Noisiness every other look (≈10.7 ms), smoothed a little (over ~3 measures), quicker to believe noise than to forget it.
    if (this.lookIx++ % 2 === 0 && this.filled === this.ring.length) {
      const n = this.ring.length;
      this.lin.set(this.ring.subarray(this.w), 0);
      this.lin.set(this.ring.subarray(0, this.w), n - this.w);
      this.noise = this.meter.measure(this.lin);
      this.noisySm = follow(this.noisySm, this.noise.noisy, 1, this.noise.noisy > this.noisySm ? 1.2 : 3, 3);
    }
    const noise = this.noise;
    const envDb = dbOf(this.env * this.env);
    const events = this.pending;
    this.pending = [];
    const fastDb = dbOf(this.fast * this.fast);
    const ev = this.gate.step(envDb, Math.min(this.noisySm, noise.noisy), tMs, fastDb, Math.max(this.noisySm, noise.noisy));
    if (ev === "on") {
      this.tongue.onset(tMs);
      events.length = 0;
      events.push({ kind: "on" });
    } else if (ev === "off") events.push({ kind: "off" });
    const micDb = dbOf(this.peakMic);
    this.peakMic = 0;
    const look: BreathLook = { t: tMs, envDb, fastDb, micDb, pressure: this.gate.open ? pressureOf(envDb, this.cal) : 0, fade: this.gate.open ? fadeOf(fastDb, envDb, this.gate.closeDb, this.tune.hysteresisDb) : 0, open: this.gate.open, noise, noisy: this.noisySm, events };
    this.last = look;
    return look;
  }
}

/**
 * The sound's fade (0..1) from the fast envelope: full until it is 3 dB under the slow one, none 15 dB
 * under (a tongue's stop heard as a gap); and none at the gate's close line, full the hysteresis above.
 */
export function fadeOf(fastDb: number, envDb: number, closeDb: number, hysteresisDb: number): number {
  const dip = clamp01(1 + (fastDb - envDb + 3) / 12);
  const gate = clamp01((fastDb - closeDb) / Math.max(1, hysteresisDb));
  return Math.min(dip, gate);
}

/** A percentile (0..1) of a list. */
export function percentile(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))));
  return s[i];
}

/**
 * Calibration from the envelope levels (dB) of the three steps: breathing normally (its 95th percentile
 * is the floor: the gate must stay shut there), blowing softly (the median of its loud half: the player
 * pauses between breaths), blowing strongly (its 90th percentile). Returns the levels and what is wrong
 * with them, if anything.
 */
export function solveCal(rest: readonly number[], soft: readonly number[], strong: readonly number[], leak = 0): { cal: BreathCal; problems: string[] } {
  const problems: string[] = [];
  const floorDb = rest.length ? percentile(rest, 0.95) : CAL_DEFAULT.floorDb;
  const loudHalf = (xs: readonly number[]) => {
    const m = percentile(xs, 0.5);
    return xs.filter((x) => x >= m);
  };
  let softDb = soft.length ? percentile(loudHalf(soft), 0.5) : CAL_DEFAULT.softDb;
  let strongDb = strong.length ? percentile(strong, 0.9) : CAL_DEFAULT.strongDb;
  if (softDb - floorDb < 6) {
    problems.push(`Blowing softly (${softDb.toFixed(0)} dB) is hardly above breathing normally (${floorDb.toFixed(0)} dB): blow nearer the microphone, at the phone's bottom edge.`);
    softDb = floorDb + 6;
  }
  if (strongDb - softDb < 4) {
    problems.push(`Blowing strongly (${strongDb.toFixed(0)} dB) is hardly above blowing softly (${softDb.toFixed(0)} dB): the range of loudness will be small.`);
    strongDb = softDb + 4;
  }
  return { cal: { floorDb, softDb, strongDb, leak }, problems };
}

/** The leak factor from a silent stretch while the voice played: mic RMS per output RMS. */
export function leakOf(micMs: readonly number[], outMs: readonly number[]): number {
  const n = Math.min(micMs.length, outMs.length);
  let m = 0;
  let o = 0;
  for (let i = 0; i < n; i++) (m += micMs[i]), (o += outMs[i]);
  return o > 0 ? Math.sqrt(m / o) : 0;
}
