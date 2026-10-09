/**
 * A synthesized percussion section: a drum kit, hand percussion, "tribal" drums and orchestral
 * instruments (timpani tuned to the final and the fifth of the exercise's mode, bass drum,
 * field snare, cymbals, triangle).
 *
 * A pattern is one loop written as step strings (one per instrument): "X" accent, "x" normal,
 * "g" ghost, "." silence. The loop lasts `length` bars (a bar = one whole note of the cantus):
 * x2 stretches it over twice as many bars, /2 fits it twice into one bar. Each pattern also says
 * how the piece opens, how the bar before the last is filled and how the final bar is struck.
 */
export type DrumVoice =
  | "kick" | "snare" | "hat" | "openhat" | "crash" | "ride" | "tomHigh" | "tomLow" | "rim" | "clap"
  | "shaker" | "tambourine" | "cowbell" | "congaHigh" | "congaLow" | "bongo" | "woodblock" | "claves"
  | "djembeLow" | "djembeSlap" | "frameDrum" | "taiko"
  | "timpTonic" | "timpFifth" | "bassDrum" | "fieldSnare" | "cymbals" | "triangle" | "guiro";

export type DrumFamily = "kit" | "machines" | "percussion" | "tribal" | "orchestral";

/**
 * The sound of the drums (D71): the game's own studio kit, or a synthesized imitation of a vintage
 * machine. Any kit plays any pattern; a pattern written for a machine selects it.
 *   tr808      Roland TR-808 (1980): all analog; a ringing bridged-T bass drum around 50 Hz, the
 *              cowbell and cymbals from one bank of six square-wave oscillators (cowbell 540/800 Hz).
 *   tr909      Roland TR-909 (1983): analog bass drum (a fast pitch sweep), snare with "snappy"
 *              noise and clap; its hats and cymbals were 6-bit samples (imitated here, not sampled).
 *   cr78       Roland CR-78 CompuRhythm (1978): soft analog voices, the "metal beat", guiro, tambourine.
 *   rhythmAce  Ace Tone Rhythm Ace (1967), the preset rhythm boxes of the organ era: short, dull, plain.
 *   sdsv       Simmons SDS-V (1981): toms and snare as an oscillator with a deep pitch bend plus noise.
 */
export type DrumKit = "studio" | "tr808" | "tr909" | "cr78" | "rhythmAce" | "sdsv";
export const DRUM_KITS: readonly DrumKit[] = ["studio", "tr808", "tr909", "cr78", "rhythmAce", "sdsv"];

export interface DrumPattern {
  id: string;
  family: DrumFamily;
  /** The machine the pattern is written for (selected with it); the studio kit otherwise. */
  kit?: DrumKit;
  /** Steps per loop (16 = sixteenths of a bar at length 1; 12 for a shuffle). */
  steps: number;
  loop: Partial<Record<DrumVoice, string>>;
  /** Hits on the very first beat. */
  start?: DrumVoice[];
  /** Replaces the loop in the bar before the last (written for one bar, `steps` long). */
  fill?: Partial<Record<DrumVoice, string>>;
  /** Hits on the final bar's downbeat (the loop stops there). */
  end: DrumVoice[];
}

export const DRUM_PATTERNS: readonly DrumPattern[] = [
  // ---- drum kit
  {
    id: "rock", family: "kit", steps: 16,
    loop: { kick: "X.......x.......", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x.", openhat: "..............x." },
    start: ["crash"], fill: { kick: "X.......x.......", snare: "....X.......X...", tomHigh: "..........x.x...", tomLow: "..............xx" }, end: ["kick", "crash"],
  },
  {
    id: "funk", family: "kit", steps: 16,
    loop: { kick: "X..x..x...x..x..", snare: "....X..g.g..X..g", hat: "xgxgxgxgxgxgxgxg", openhat: "..........x....." },
    start: ["crash"], fill: { kick: "X..x..x.........", snare: "....X..gx.xxXxXX" }, end: ["kick", "crash"],
  },
  {
    id: "halftime", family: "kit", steps: 16,
    loop: { kick: "X.........x.....", snare: "........X.......", hat: "x.x.x.x.x.x.x.x.", ride: "x...x...x...x..." },
    start: ["crash"], fill: { kick: "X.........x.....", snare: "........X...xxXX" }, end: ["kick", "crash"],
  },
  {
    id: "motorik", family: "kit", steps: 16,
    loop: { kick: "X...x...X...x.x.", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", tambourine: "....x.......x..." },
    start: ["crash"], end: ["kick", "crash"],
  },
  {
    id: "shuffle", family: "kit", steps: 12,
    loop: { kick: "X.....x.....", snare: "...X.....X..", hat: "x.xx.xx.xx.x" },
    start: ["crash"], fill: { kick: "X.....x.....", snare: "...X..x.xXxX" }, end: ["kick", "crash"],
  },
  // ---- drum machines (D71)
  {
    id: "electro", family: "machines", kit: "tr808", steps: 16,
    loop: { kick: "X.....x...X..x..", clap: "....X.......X...", hat: "x.x.x.x.x.xxx.x.", cowbell: "......x.......x.", congaHigh: "..x.......x....." },
    start: ["crash"], fill: { kick: "X.....x...X.....", clap: "....X.......X.X.", tomLow: "........x.x.x.xx", tomHigh: "..........x.x..." }, end: ["kick", "crash"],
  },
  {
    id: "slowjam", family: "machines", kit: "tr808", steps: 16,
    loop: { kick: "X......x..X.....", snare: "....X.......X...", hat: "x.xx.xx.x.xx.x.x", rim: "..x.....x.....x.", congaLow: "..........x....." },
    end: ["kick", "crash"],
  },
  {
    id: "house", family: "machines", kit: "tr909", steps: 16,
    loop: { kick: "X...X...X...X...", clap: "....X.......X...", openhat: "..x...x...x...x.", hat: "x.xxx.xxx.xxx.x." },
    start: ["crash"], fill: { kick: "X...X...X...X...", snare: "....x.x.xxxxXXXX" }, end: ["kick", "crash"],
  },
  {
    id: "techno", family: "machines", kit: "tr909", steps: 16,
    loop: { kick: "X...X...X...X...", hat: "..x...x...x...x.", ride: "x.x.x.x.x.x.x.x.", snare: ".......g....x..g", rim: "...x......x....." },
    start: ["crash"], end: ["kick", "crash"],
  },
  {
    id: "newwave", family: "machines", kit: "cr78", steps: 16,
    loop: { kick: "X.....x.X.......", snare: "....X.......X...", hat: "xgxgxgxgxgxgxgxg", tambourine: "....x.......x...", guiro: "x.......x......." },
    end: ["kick", "cymbals"],
  },
  {
    id: "rhythmbox", family: "machines", kit: "rhythmAce", steps: 16,
    loop: { kick: "X.......x.x.....", snare: "....x.......x...", claves: "x..x..x...x.x...", ride: "x.x.x.x.x.x.x.x." },
    end: ["kick", "ride"],
  },
  {
    id: "synthtoms", family: "machines", kit: "sdsv", steps: 16,
    loop: { kick: "X.......X.x.....", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x.", tomLow: "..............x." },
    start: ["crash"], fill: { kick: "X.......x.......", tomHigh: "x.x.x.x.........", tomLow: "........x.x.xXXX" }, end: ["kick", "crash"],
  },
  // ---- hand percussion
  {
    id: "bossa", family: "percussion", steps: 16,
    loop: { kick: "X..xx..xX..xx..x", rim: "x..x..x...x..x..", shaker: "xgxgxgxgxgxgxgxg" },
    end: ["kick", "rim"],
  },
  {
    id: "conga", family: "percussion", steps: 16,
    loop: { congaLow: "x.....x...x.....", congaHigh: "...x.x.x...x.xx.", cowbell: "x.x.xx.x.x.xx.x.", shaker: "xgxgxgxgxgxgxgxg" },
    fill: { congaHigh: "x.x.x.x.xxxxXXXX", congaLow: "x.......x......." }, end: ["congaLow", "cowbell"],
  },
  {
    id: "clave", family: "percussion", steps: 16,
    loop: { claves: "x..x..x...x.x...", woodblock: "..x...x...x...x.", bongo: "x.gx.gx.x.gx.gxg" },
    end: ["claves", "woodblock"],
  },
  // ---- tribal
  {
    id: "tribal", family: "tribal", steps: 16,
    loop: { djembeLow: "X.....x...X.....", djembeSlap: "...x.....x..x..x", frameDrum: "x.......x.......", shaker: "x.x.x.x.x.x.x.x." },
    fill: { djembeLow: "X.x.X.x.X.x.XxXx", djembeSlap: "................" }, end: ["djembeLow", "frameDrum"],
  },
  {
    id: "taiko", family: "tribal", steps: 16,
    loop: { taiko: "X...x.x.X...x...", rim: "..x...x...x...x.", clap: "....x.......x..." },
    fill: { taiko: "X.x.x.x.XxXxXxXX" }, end: ["taiko", "clap"],
  },
  {
    id: "ritual", family: "tribal", steps: 16,
    loop: { frameDrum: "X..x............", shaker: "....x.......x...", triangle: "........x......." },
    end: ["frameDrum", "triangle"],
  },
  // ---- orchestral
  {
    id: "timpani", family: "orchestral", steps: 16,
    loop: { timpTonic: "X...............", timpFifth: "........x......." },
    fill: { timpFifth: "x.g.g.g.x.x.xxxx" }, end: ["timpTonic", "cymbals"],
  },
  {
    id: "march", family: "orchestral", steps: 16,
    loop: { fieldSnare: "X.xxx.x.X.xxx.x.", bassDrum: "X.......x.......", cymbals: "x...............", timpTonic: "x..............." },
    fill: { fieldSnare: "xxxxxxxxXXXXXXXX", bassDrum: "X.......x......." }, end: ["bassDrum", "cymbals", "timpTonic"],
  },
  {
    id: "processional", family: "orchestral", steps: 16,
    loop: { bassDrum: "X...............", timpTonic: "........g.......", timpFifth: "............g...", triangle: "....x.......x..." },
    fill: { timpFifth: "g.g.g.g.x.x.x.x.", timpTonic: "................" }, end: ["bassDrum", "timpTonic", "cymbals"],
  },
];

export const DRUM_FAMILIES: readonly DrumFamily[] = ["kit", "machines", "percussion", "tribal", "orchestral"];

export interface DrumSettings {
  pattern: string;
  /** Loop length in bars, 1/8..8: any product of the factors 2 and 1.5 (D70). */
  length: number;
  /** 0..1 */
  level: number;
  /** The sound (D71); absent = the pattern's own machine, or the studio kit. */
  kit?: DrumKit;
}

export const DEFAULT_DRUMS: DrumSettings = { pattern: "rock", length: 1, level: 0.55 };
/** The kit a setting plays with. */
export const kitOf = (s: DrumSettings): DrumKit => s.kit ?? patternById(s.pattern).kit ?? "studio";
export const LOOP_MIN = 1 / 8;
export const LOOP_MAX = 8;
/** The time factors offered (D70): ×2 and ×1.5 lengthen the loop (slower), ÷ shortens it (faster). */
export const LOOP_FACTORS = [2, 1.5] as const;

const DENOMINATORS = [1, 2, 3, 4, 6, 8, 9, 12, 16, 18, 24, 27, 32, 36, 48, 54, 64, 72, 81, 96, 108, 128, 144, 162, 216, 243, 256];
/** The loop length as a fraction n/d (d a product of 2s and 3s), or null if it is not one. */
export function loopFraction(length: number): [number, number] | null {
  for (const d of DENOMINATORS) {
    const n = Math.round(length * d);
    if (n > 0 && Math.abs(n / d - length) < 1e-9) return [n, d];
  }
  return null;
}
export const validLoopLength = (l: unknown): l is number => typeof l === "number" && l >= LOOP_MIN - 1e-9 && l <= LOOP_MAX + 1e-9 && loopFraction(l) !== null;
/** The loop length multiplied by `factor` (snapped to its exact fraction), or null if out of range. */
export function scaleLoop(length: number, factor: number): number | null {
  const raw = length * factor;
  for (const d of DENOMINATORS) {
    const n = Math.round(raw * d);
    if (Math.abs(n / d - raw) < 1e-6) return validLoopLength(n / d) ? n / d : null;
  }
  return null;
}

export const patternById = (id: string) => DRUM_PATTERNS.find((p) => p.id === id) ?? DRUM_PATTERNS[0];

const VELOCITY: Record<string, number> = { X: 1, x: 0.75, g: 0.3 };

/** A roll for the last bar of a looped piece (D72), leading back into bar 1 instead of ending. */
const ROLL: Partial<Record<DrumVoice, string>> = { snare: "x...x...x.x.xxXX", kick: "X.......x......." };

/**
 * The hits of bar `bar` as [voice, velocity, offset within the bar (0..1)]. When the piece loops,
 * the drums never stop (D72): the last bar keeps the groove, and the breath before the next pass
 * carries the roll into bar 1 (see hitsForBreath).
 */
export function hitsForBar(settings: DrumSettings, bar: number, totalBars: number, looping = false): [DrumVoice, number, number][] {
  const p = patternById(settings.pattern);
  const out: [DrumVoice, number, number][] = [];
  if (bar === totalBars - 1 && !looping) return p.end.map((v) => [v, 1, 0]);
  const write = (lines: Partial<Record<DrumVoice, string>>, from: number, span: number) => {
    for (const [v, line] of Object.entries(lines) as [DrumVoice, string][]) {
      [...line].forEach((ch, s) => {
        const vel = VELOCITY[ch];
        const at = from + (s / p.steps) * span;
        if (vel && at >= bar - 1e-9 && at < bar + 1 - 1e-9) out.push([v, vel, at - bar]);
      });
    }
  };
  if (!looping && bar === totalBars - 2 && p.fill) {
    write(p.fill, bar, 1);
  } else {
    const L = settings.length;
    for (let loop = Math.floor(bar / L); loop * L < bar + 1; loop++) write(p.loop, loop * L, L);
  }
  if (bar === 0) for (const v of p.start ?? []) out.push([v, 1, 0]);
  return out;
}

/**
 * The breath between two passes of a loop (`span` bars, half a bar in the engine): the second half
 * of the pattern's fill (or a snare roll), stretched to the breath, leading into bar 1 (D72).
 */
export function hitsForBreath(settings: DrumSettings, span = 0.5): [DrumVoice, number, number][] {
  const p = patternById(settings.pattern);
  const lines = p.fill ?? ROLL;
  const steps = p.fill ? p.steps : 16;
  const out: [DrumVoice, number, number][] = [];
  for (const [v, line] of Object.entries(lines) as [DrumVoice, string][]) {
    [...line].forEach((ch, i) => {
      const vel = VELOCITY[ch];
      const at = i / steps;
      if (vel && at >= 0.5 - 1e-9) out.push([v, vel, (at - 0.5) * (span / 0.5)]);
    });
  }
  return out;
}

const FINAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** The six square-wave pitches commonly given for the TR-808 cymbal bank (approximate values). */
const METAL_FREQS = [205.3, 304.4, 369.6, 522.7, 540, 800];

export class DrumMachine {
  private ctx: BaseAudioContext;
  private out: GainNode;
  private noise: AudioBuffer;
  private live = new Set<AudioScheduledSourceNode>();
  settings: DrumSettings = { ...DEFAULT_DRUMS };
  /** The mode's final: the timpani are tuned to it and to its fifth. */
  final = "D";

  constructor(ctx: BaseAudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = DEFAULT_DRUMS.level;
    this.out.connect(destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  setLevel(level: number) {
    this.out.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
  }

  private track<T extends AudioScheduledSourceNode>(n: T): T {
    this.live.add(n);
    n.onended = () => this.live.delete(n);
    return n;
  }

  private env(t: number, peak: number, decay: number, attack = 0.002): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    g.connect(this.out);
    return g;
  }

  private tone(t: number, f0: number, f1: number, decay: number, peak: number, type: OscillatorType = "sine", attack = 0.002) {
    const o = this.track(this.ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
    o.connect(this.env(t, peak, decay, attack));
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  private hiss(t: number, filter: BiquadFilterType, freq: number, decay: number, peak: number, q = 1, attack = 0.002) {
    const src = this.track(this.ctx.createBufferSource());
    src.buffer = this.noise;
    src.loop = decay > 0.9;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(t, peak, decay, attack));
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  /** Timpano: a few inharmonic partials over a pitched fundamental, and the felt of the mallet. */
  private timpano(t: number, freq: number, vel: number) {
    for (const [ratio, level, decay] of [[1, 1, 1.6], [1.5, 0.35, 1.0], [1.98, 0.22, 0.8], [2.44, 0.1, 0.5]]) {
      this.tone(t, freq * ratio * 1.02, freq * ratio, decay, 0.6 * vel * level);
    }
    this.hiss(t, "lowpass", 600, 0.08, 0.25 * vel);
  }

  /** Pitch of the timpano on the final (octave 2) or on its fifth. */
  private timpFreq(fifth: boolean) {
    const pc = FINAL_PC[this.final[0]] ?? 2;
    const midi = 36 + pc + (fifth ? 7 : 0); // C2..A2, the fifth above

    return 440 * 2 ** ((midi - 69) / 12);
  }

  /** An oscillator with a fast pitch sweep (f0 to f1 in `sweep` seconds), then a decay. */
  private sweep(t: number, f0: number, f1: number, sweep: number, decay: number, peak: number, type: OscillatorType = "sine") {
    const o = this.track(this.ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    o.connect(this.env(t, peak, decay));
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  /** Metallic voices: square waves at inharmonic pitches, band-passed and high-passed (808 style). */
  private metal(t: number, decay: number, peak: number, highpass = 7000, freqs = METAL_FREQS) {
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 10000;
    bp.Q.value = 0.7;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;
    bp.connect(hp).connect(this.env(t, peak, decay));
    for (const f of freqs) {
      const o = this.track(this.ctx.createOscillator());
      o.type = "square";
      o.frequency.value = f;
      o.connect(bp);
      o.start(t);
      o.stop(t + decay + 0.05);
    }
  }

  /** The kit in use (D71). */
  kit: DrumKit = "studio";

  /** A machine's own voice, or false to fall back on the studio kit. */
  private machine(v: DrumVoice, t: number, vel: number): boolean {
    switch (this.kit) {
      case "tr808":
        switch (v) {
          case "kick": this.sweep(t, 62, 49, 0.03, 0.9, vel); this.hiss(t, "lowpass", 1500, 0.006, 0.25 * vel); return true;
          case "snare": this.tone(t, 185, 180, 0.12, 0.45 * vel); this.tone(t, 330, 325, 0.07, 0.25 * vel); this.hiss(t, "highpass", 1800, 0.16, 0.5 * vel); return true;
          case "clap": for (const d of [0, 0.01, 0.02]) this.hiss(t + d, "bandpass", 1000, 0.012, 0.9 * vel, 1.2); this.hiss(t + 0.03, "bandpass", 1000, 0.3, 0.55 * vel, 1.2); return true;
          case "hat": this.metal(t, 0.045, 0.32 * vel); return true;
          case "openhat": this.metal(t, 0.35, 0.28 * vel); return true;
          case "crash": case "cymbals": this.metal(t, 1.3, 0.3 * vel, 4500); return true;
          case "ride": this.metal(t, 0.7, 0.16 * vel, 5500); return true;
          case "cowbell": this.metal(t, 0.28, 0.5 * vel, 600, [540, 800]); return true;
          case "tomHigh": case "congaHigh": this.sweep(t, v === "tomHigh" ? 210 : 370, v === "tomHigh" ? 190 : 340, 0.05, 0.35, 0.65 * vel); return true;
          case "tomLow": case "congaLow": this.sweep(t, v === "tomLow" ? 140 : 250, v === "tomLow" ? 125 : 225, 0.05, 0.45, 0.75 * vel); return true;
          case "rim": this.tone(t, 1670, 1660, 0.025, 0.35 * vel, "square"); return true;
          case "claves": this.tone(t, 2500, 2500, 0.06, 0.4 * vel); return true;
          case "shaker": this.hiss(t, "highpass", 6000, 0.03, 0.3 * vel); return true;
        }
        return false;
      case "tr909":
        switch (v) {
          case "kick": this.sweep(t, 240, 52, 0.035, 0.5, vel); this.hiss(t, "lowpass", 3000, 0.008, 0.4 * vel); return true;
          case "snare": this.sweep(t, 200, 180, 0.02, 0.1, 0.4 * vel, "triangle"); this.sweep(t, 340, 320, 0.02, 0.06, 0.25 * vel, "triangle"); this.hiss(t, "highpass", 2200, 0.22, 0.65 * vel); return true;
          case "clap": for (const d of [0, 0.009, 0.018]) this.hiss(t + d, "bandpass", 1300, 0.01, 0.9 * vel, 1); this.hiss(t + 0.027, "bandpass", 1300, 0.22, 0.6 * vel, 1); return true;
          case "hat": this.metal(t, 0.06, 0.2 * vel, 8500); this.hiss(t, "highpass", 9000, 0.05, 0.18 * vel); return true;
          case "openhat": this.metal(t, 0.4, 0.17 * vel, 8000); this.hiss(t, "highpass", 8500, 0.35, 0.15 * vel); return true;
          case "ride": this.metal(t, 0.9, 0.1 * vel, 5000); this.hiss(t, "bandpass", 7000, 0.8, 0.08 * vel, 2); return true;
          case "crash": case "cymbals": this.metal(t, 1.6, 0.2 * vel, 4000); this.hiss(t, "highpass", 5000, 1.5, 0.22 * vel); return true;
          case "tomHigh": this.sweep(t, 300, 190, 0.08, 0.3, 0.7 * vel); return true;
          case "tomLow": this.sweep(t, 200, 120, 0.08, 0.4, 0.8 * vel); return true;
          case "rim": this.tone(t, 1900, 1880, 0.02, 0.35 * vel, "triangle"); this.hiss(t, "bandpass", 3500, 0.02, 0.3 * vel, 3); return true;
        }
        return false;
      case "cr78":
        switch (v) {
          case "kick": this.sweep(t, 75, 62, 0.02, 0.25, 0.75 * vel); return true;
          case "snare": this.hiss(t, "lowpass", 4000, 0.12, 0.45 * vel); this.tone(t, 250, 240, 0.06, 0.25 * vel); return true;
          case "hat": case "openhat": this.hiss(t, "bandpass", 9000, v === "hat" ? 0.035 : 0.2, 0.3 * vel, 2); this.metal(t, v === "hat" ? 0.03 : 0.18, 0.06 * vel, 9000); return true;
          case "crash": case "cymbals": case "ride": this.hiss(t, "highpass", 6000, v === "ride" ? 0.5 : 1.0, 0.2 * vel); return true;
          case "tambourine": this.hiss(t, "highpass", 7000, 0.12, 0.22 * vel); this.metal(t, 0.1, 0.05 * vel, 6000); return true;
          case "cowbell": this.tone(t, 800, 800, 0.12, 0.18 * vel, "square"); return true;
          case "rim": this.tone(t, 1200, 1200, 0.02, 0.3 * vel, "triangle"); return true;
        }
        return false;
      case "rhythmAce":
        switch (v) {
          case "kick": this.tone(t, 95, 80, 0.16, 0.7 * vel); return true;
          case "snare": case "clap": this.hiss(t, "bandpass", 1500, 0.1, 0.5 * vel, 0.8); return true;
          case "hat": case "openhat": case "shaker": this.hiss(t, "highpass", 6500, v === "openhat" ? 0.15 : 0.04, 0.2 * vel); return true;
          case "ride": case "crash": case "cymbals": this.hiss(t, "highpass", 5000, 0.25, 0.14 * vel); return true;
          case "claves": case "rim": this.tone(t, 2000, 2000, 0.04, 0.3 * vel); return true;
          case "cowbell": this.tone(t, 700, 700, 0.1, 0.15 * vel, "square"); return true;
          case "congaHigh": case "bongo": this.tone(t, 420, 400, 0.08, 0.45 * vel); return true;
          case "congaLow": case "tomLow": case "tomHigh": this.tone(t, 220, 210, 0.12, 0.5 * vel); return true;
        }
        return false;
      case "sdsv":
        switch (v) {
          case "kick": this.sweep(t, 130, 48, 0.08, 0.4, vel); this.hiss(t, "lowpass", 800, 0.03, 0.3 * vel); return true;
          case "snare": this.sweep(t, 320, 170, 0.1, 0.18, 0.4 * vel, "triangle"); this.hiss(t, "bandpass", 2500, 0.28, 0.6 * vel, 0.7); return true;
          case "tomHigh": this.sweep(t, 440, 170, 0.3, 0.5, 0.7 * vel, "triangle"); this.hiss(t, "lowpass", 1200, 0.05, 0.2 * vel); return true;
          case "tomLow": this.sweep(t, 280, 95, 0.35, 0.6, 0.8 * vel, "triangle"); this.hiss(t, "lowpass", 900, 0.06, 0.2 * vel); return true;
        }
        return false;
      default:
        return false;
    }
  }

  hit(v: DrumVoice, t: number, vel = 1) {
    if (this.kit !== "studio" && this.machine(v, t, vel)) return;
    switch (v) {
      case "kick": return this.tone(t, 150, 42, 0.38, vel);
      case "snare": this.hiss(t, "bandpass", 1900, 0.2, 0.7 * vel); return this.tone(t, 220, 160, 0.12, 0.4 * vel, "triangle");
      case "hat": return this.hiss(t, "highpass", 7500, 0.05, 0.28 * vel);
      case "openhat": return this.hiss(t, "highpass", 7000, 0.28, 0.25 * vel);
      case "crash": return this.hiss(t, "highpass", 4500, 1.4, 0.35 * vel);
      case "ride": this.hiss(t, "bandpass", 6000, 0.6, 0.12 * vel, 2); return this.tone(t, 3100, 3000, 0.4, 0.04 * vel);
      case "tomHigh": return this.tone(t, 260, 170, 0.25, 0.7 * vel);
      case "tomLow": return this.tone(t, 170, 105, 0.3, 0.8 * vel);
      case "rim": this.tone(t, 1700, 1600, 0.03, 0.3 * vel, "square"); return this.hiss(t, "bandpass", 3200, 0.03, 0.4 * vel, 4);
      case "clap":
        for (const d of [0, 0.011, 0.023]) this.hiss(t + d, "bandpass", 1200, 0.03, 0.8 * vel, 1.5);
        return this.hiss(t + 0.03, "bandpass", 1200, 0.18, 0.55 * vel, 1.5);
      case "shaker": return this.hiss(t, "highpass", 5500, 0.06, 0.22 * vel, 1, 0.012);
      case "tambourine": this.hiss(t, "highpass", 8000, 0.16, 0.25 * vel); return this.hiss(t, "bandpass", 5200, 0.1, 0.2 * vel, 8);
      case "cowbell": this.tone(t, 545, 540, 0.25, 0.16 * vel, "square"); return this.tone(t, 815, 810, 0.25, 0.12 * vel, "square");
      case "congaHigh": this.tone(t, 380, 330, 0.18, 0.6 * vel); return this.hiss(t, "bandpass", 1800, 0.015, 0.2 * vel);
      case "congaLow": this.tone(t, 240, 200, 0.25, 0.7 * vel); return this.hiss(t, "bandpass", 1200, 0.015, 0.2 * vel);
      case "bongo": return this.tone(t, 520, 450, 0.1, 0.5 * vel);
      case "woodblock": return this.tone(t, 950, 900, 0.06, 0.45 * vel, "triangle");
      case "claves": return this.tone(t, 2500, 2480, 0.05, 0.35 * vel);
      case "djembeLow": this.tone(t, 95, 70, 0.4, vel); return this.hiss(t, "lowpass", 400, 0.05, 0.3 * vel);
      case "djembeSlap": this.hiss(t, "bandpass", 2200, 0.06, 0.55 * vel, 2); return this.tone(t, 420, 380, 0.05, 0.3 * vel);
      case "frameDrum": this.tone(t, 75, 55, 0.6, 0.9 * vel); return this.hiss(t, "lowpass", 300, 0.2, 0.25 * vel);
      case "taiko": this.tone(t, 60, 40, 0.9, vel); return this.hiss(t, "lowpass", 220, 0.6, 0.5 * vel);
      case "timpTonic": return this.timpano(t, this.timpFreq(false), vel);
      case "timpFifth": return this.timpano(t, this.timpFreq(true), vel);
      case "bassDrum": this.tone(t, 55, 45, 1.2, vel); return this.hiss(t, "lowpass", 150, 0.8, 0.4 * vel);
      case "fieldSnare": this.hiss(t, "bandpass", 2400, 0.3, 0.6 * vel, 0.8); return this.tone(t, 200, 180, 0.08, 0.3 * vel, "triangle");
      case "cymbals": return this.hiss(t, "highpass", 3800, 2.4, 0.4 * vel, 0.7);
      case "triangle": this.tone(t, 4200, 4200, 1.4, 0.09 * vel); return this.tone(t, 6150, 6150, 1.0, 0.05 * vel);
      case "guiro":
        // A scraped gourd: a quick train of filtered noise ticks.
        for (let i = 0; i < 7; i++) this.hiss(t + i * 0.014, "bandpass", 3200, 0.012, 0.25 * vel, 3);
        return;
    }
  }

  /** Schedule bar `bar` starting at time `t`, a bar lasting `barSeconds`. */
  scheduleBar(t: number, barSeconds: number, bar: number, totalBars: number, looping = false) {
    this.kit = kitOf(this.settings);
    for (const [v, vel, at] of hitsForBar(this.settings, bar, totalBars, looping)) this.hit(v, t + at * barSeconds, vel);
  }

  /** The breath before the next pass of a loop, starting at `t` (D72). */
  scheduleBreath(t: number, barSeconds: number, span = 0.5) {
    this.kit = kitOf(this.settings);
    for (const [v, vel, at] of hitsForBreath(this.settings, span)) this.hit(v, t + at * barSeconds, vel);
  }

  stop() {
    for (const n of this.live) n.stop();
    this.live.clear();
  }
}
