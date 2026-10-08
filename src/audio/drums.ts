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
  | "timpTonic" | "timpFifth" | "bassDrum" | "fieldSnare" | "cymbals" | "triangle";

export type DrumFamily = "kit" | "percussion" | "tribal" | "orchestral";

export interface DrumPattern {
  id: string;
  family: DrumFamily;
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

export const DRUM_FAMILIES: readonly DrumFamily[] = ["kit", "percussion", "tribal", "orchestral"];

export interface DrumSettings {
  pattern: string;
  /** Loop length in bars: 1/4, 1/2, 1, 2, 4. */
  length: number;
  /** 0..1 */
  level: number;
}

export const DEFAULT_DRUMS: DrumSettings = { pattern: "rock", length: 1, level: 0.55 };
export const LOOP_LENGTHS = [0.25, 0.5, 1, 2, 4];

export const patternById = (id: string) => DRUM_PATTERNS.find((p) => p.id === id) ?? DRUM_PATTERNS[0];

const VELOCITY: Record<string, number> = { X: 1, x: 0.75, g: 0.3 };

/** The hits of bar `bar` as [voice, velocity, offset within the bar (0..1)]. */
export function hitsForBar(settings: DrumSettings, bar: number, totalBars: number): [DrumVoice, number, number][] {
  const p = patternById(settings.pattern);
  const out: [DrumVoice, number, number][] = [];
  if (bar === totalBars - 1) return p.end.map((v) => [v, 1, 0]);
  const write = (lines: Partial<Record<DrumVoice, string>>, from: number, span: number) => {
    for (const [v, line] of Object.entries(lines) as [DrumVoice, string][]) {
      [...line].forEach((ch, s) => {
        const vel = VELOCITY[ch];
        const at = from + (s / p.steps) * span;
        if (vel && at >= bar - 1e-9 && at < bar + 1 - 1e-9) out.push([v, vel, at - bar]);
      });
    }
  };
  if (bar === totalBars - 2 && p.fill) {
    write(p.fill, bar, 1);
  } else {
    const L = settings.length;
    for (let loop = Math.floor(bar / L); loop * L < bar + 1; loop++) write(p.loop, loop * L, L);
  }
  if (bar === 0) for (const v of p.start ?? []) out.push([v, 1, 0]);
  return out;
}

const FINAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

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

  hit(v: DrumVoice, t: number, vel = 1) {
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
    }
  }

  /** Schedule bar `bar` starting at time `t`, a bar lasting `barSeconds`. */
  scheduleBar(t: number, barSeconds: number, bar: number, totalBars: number) {
    for (const [v, vel, at] of hitsForBar(this.settings, bar, totalBars)) this.hit(v, t + at * barSeconds, vel);
  }

  stop() {
    for (const n of this.live) n.stop();
    this.live.clear();
  }
}
