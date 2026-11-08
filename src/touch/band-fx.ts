/**
 * D540, BANDS v2: the bands' processing chains (the owner: "Feel free to use more configs, like fx effects, eqs, etc."; the
 * study: scratchpad/bands2/STUDY.md). One shared chain per band, never one per note: built once when the band's first note
 * plays (chip.ts Chip.period), torn down when another sound plays, every note of the band passing through it.
 *
 * A chain is three parts, all optional but the bus:
 *   lanes   shared buses for one instrument family (a patch names its lane: Patch.lane): the organ's Leslie, the
 *           guitar's fuzz and tape echo, the double-tracked voice. Each lane's output joins the bus.
 *   bus     the whole band after its lanes, in order: the console and the tape (era EQ, compression, saturation,
 *           stereo placement).
 *   reverb  the band's one plate, spring or chamber (a convolver on a synthesised impulse), fed by the patches' sends
 *           (Patch.send) in place of the preset's `fx`; its return joins the output after the bus (a console's return).
 *
 * The drums do not pass through it (they join the master as before: their own kits and levels, D514).
 *
 * The building blocks are plain Web Audio (GainNode, BiquadFilterNode, WaveShaperNode, ConvolverNode, DelayNode,
 * DynamicsCompressorNode, StereoPannerNode, OscillatorNode as LFOs): no worklets, so the cost is the browser's
 * native nodes'. `chainCost` counts a spec's nodes before it is built (test/d540-band-fx.test.ts holds every band's
 * chain under CHAIN_CAP).
 */

/**
 * D540: the bands that have a v2 (sound.ts V2_PRESETS: "<BAND> v2" beside the original, in the Sound Lab), its id from the
 * band's ("krautrock" → "krautrockV2"), and the band a sound is (a v2's original, else itself: the id-keyed tables).
 */
export const V2_BANDS = ["krautrock", "abbeyRoad", "salsa", "bossaNova", "chorinho", "jazzQuartet", "baroqueBand", "bachBrass", "oboeTrio", "petSounds"] as const;
export const v2Id = (band: string) => `${band}V2`;
export const baseSound = (id: string): string => (id.endsWith("V2") && (V2_BANDS as readonly string[]).includes(id.slice(0, -2)) ? id.slice(0, -2) : id);

/** A built block: where sound goes in, where it comes out, every node it made (to disconnect) and its LFOs (to stop). */
export interface Block {
  input: AudioNode;
  output: AudioNode;
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
}

/** Tape: the machine's saturation (soft, asymmetric: even harmonics), its head bump and its top rolled off; wow optional. */
export interface TapeOpts {
  /** Drive into the curve (1: barely; 3: a hot 1967 bounce). */
  drive: number;
  /** Asymmetry (0..0.3): the bias's even harmonics. */
  bias?: number;
  /** The low-frequency head bump (a peak). */
  bump?: { hz: number; db: number };
  /** The top's roll-off (Hz, a 12 dB/oct lowpass). */
  rolloff?: number;
  /** Wow (slow) as a modulated delay: rate Hz, depth s. */
  wow?: { rate: number; depth: number };
}
/** A plate, spring or chamber reverb, on an impulse made here (no file). */
export interface ReverbOpts {
  ir: "plate" | "spring" | "chamber";
  /** The impulse's length (s), and on a phone (the convolver costs most there). */
  seconds: number;
  phoneSeconds?: number;
  /** Decay to -60 dB (s). */
  rt60: number;
  predelay?: number;
  /** The send's high-pass and the return's lowpass (Hz). */
  hp?: number;
  lp?: number;
  /** 0 dark .. 1 bright (how slowly the impulse darkens). */
  brightness?: number;
  /** The return's level, and on a phone (D549: the v1 rooms' phone tails are shorter, so their phone returns softer). */
  level?: number;
  phoneLevel?: number;
  /** A spring's round trip (s): its "drip". */
  spring?: number;
}
/** ADT (Abbey Road, 1966): the line again from a second, varispeeded machine, a few ms late, wavering, to the other side. */
export interface AdtOpts {
  /** Mean delay (s): 0.008-0.03. */
  delay: number;
  /** Its wavering (s) and rate (Hz). */
  depth?: number;
  rate?: number;
  /** Where the two copies sit (±). */
  spread?: number;
  /** The copy's level against the line. */
  level?: number;
}
/** A Leslie 122: the horn and the drum turning (chorale or tremolo), Doppler, amplitude and the stereo of two mics. */
export interface LeslieOpts {
  speed: "chorale" | "tremolo";
  /** The crossover (Hz; the 122's is 800). */
  crossover?: number;
  /** Doppler depth (s) of the horn. */
  doppler?: number;
  /** Amplitude modulation depth (0..1) of horn and drum. */
  am?: number;
  /** The mics' spread (±). */
  spread?: number;
}
/** A phaser (the Small Stone, the Uni-Vibe's cousin): all-pass stages swept by an LFO, mixed with the dry line. */
export interface PhaserOpts {
  stages?: number;
  rate: number;
  /** Centre (Hz) and sweep (cents either side). */
  hz?: number;
  sweep?: number;
  q?: number;
  mix?: number;
}
/** Fuzz (Fuzz Face, Tone Bender): pre-emphasis, a hard asymmetric clip, a tone control. */
export interface FuzzOpts {
  drive: number;
  /** The tone's lowpass (Hz). */
  tone?: number;
  /** Output level. */
  level?: number;
}
/** Tape echo (Echoplex, Binson, Space Echo): a delay through a saturating, band-limited loop, with wow. */
export interface EchoOpts {
  /** Delay (s); `beats` instead follows the beat (BandChain.setBeat). */
  time: number;
  beats?: number;
  feedback: number;
  hp?: number;
  lp?: number;
  drive?: number;
  wow?: { rate: number; depth: number };
  /** The repeats' level and their side. */
  mix: number;
  pan?: number;
}
/** A compressor by its model (Fairchild 660/670, LA-2A, 1176, a bus "glue"), or set by hand. */
export interface CompOpts {
  model?: keyof typeof COMP_MODELS;
  threshold?: number;
  ratio?: number;
  knee?: number;
  attack?: number;
  release?: number;
  /** Makeup (dB). */
  makeup?: number;
}
/** One band of EQ (a console's: shelves, peaks, the passes). */
export interface EqBand {
  type: BiquadFilterType;
  hz: number;
  db?: number;
  q?: number;
}
/** Wah: a peaking band (cocked, or swept by an LFO), mixed with the line. */
export interface WahOpts {
  hz: number;
  q?: number;
  db?: number;
  /** Swept: rate (Hz) and sweep (cents either side). */
  rate?: number;
  sweep?: number;
}
/** Stereo placement: the whole lane or bus's pan, and its width (1 as it is, 0 mono: Pet Sounds' mono mix). */
export interface PlaceOpts {
  pan?: number;
  width?: number;
}
/** Lo-fi: the band narrowed (a radio, a 78, an AM broadcast) and a little crunch. */
export interface LofiOpts {
  hp: number;
  lp: number;
  crunch?: number;
}

export type Stage =
  | ({ kind: "tape" } & TapeOpts)
  | ({ kind: "adt" } & AdtOpts)
  | ({ kind: "leslie" } & LeslieOpts)
  | ({ kind: "phaser" } & PhaserOpts)
  | ({ kind: "fuzz" } & FuzzOpts)
  | ({ kind: "echo" } & EchoOpts)
  | ({ kind: "comp" } & CompOpts)
  | { kind: "eq"; era?: EraId; bands?: EqBand[] }
  | ({ kind: "wah" } & WahOpts)
  | ({ kind: "place" } & PlaceOpts)
  | ({ kind: "lofi" } & LofiOpts)
  | { kind: "gain"; db: number };

export interface ChainSpec {
  /** The band (its preset's id, the v1's). */
  band: string;
  lanes?: Readonly<Record<string, readonly Stage[]>>;
  bus: readonly Stage[];
  reverb?: ReverbOpts;
}

/** A built chain (chip.ts Chip.period keeps one). */
export interface BandChain {
  spec: ChainSpec;
  /** Where a note without a lane joins (the bus's input). */
  input: AudioNode;
  /** A lane's input (null: no such lane; the note joins `input`). */
  lane(name: string | undefined): AudioNode | null;
  /** The reverb's send (the patches' sends), or null. */
  send: AudioNode | null;
  /** Into the master. */
  output: AudioNode;
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
  /** The beat as it sounds (s): the echoes with `beats` follow it. */
  setBeat(s: number): void;
  /** How long the chain rings after its input stops (s): the reverb's, the echoes'. */
  tail: number;
  /** Disconnect and stop everything. */
  dispose(): void;
}

/**
 * The compressor models (DynamicsCompressor's terms; attack and release in s, threshold and knee in dB). Fairchild:
 * variable-mu, a wide soft knee, a gentle ratio rising with level, its "time constant 2" (0.8 ms attack, 2 s release
 * shortened here to the bus's 0.8 s); LA-2A: optical, slow (10 ms attack, a long release), 3:1 soft; 1176: FET, fast
 * (0.3 ms), 4:1, a hard knee; glue: an SSL-like bus compressor, 2:1, 10 ms/0.3 s.
 */
export const COMP_MODELS = {
  fairchild: { threshold: -22, ratio: 3, knee: 18, attack: 0.0008, release: 0.8, makeup: 3 },
  la2a: { threshold: -24, ratio: 3, knee: 12, attack: 0.01, release: 0.5, makeup: 3 },
  "1176": { threshold: -20, ratio: 4, knee: 3, attack: 0.0003, release: 0.12, makeup: 4 },
  glue: { threshold: -18, ratio: 2, knee: 6, attack: 0.01, release: 0.3, makeup: 2 },
} as const;

/**
 * The eras' console and tape curves (the study's; db at hz, q). emi67: the REDD.51/TG desk and the J37's 4-track bounce:
 * the lows tightened under 60 Hz, a presence lift at 2.5-3 kHz, the top rolled from 10 kHz. goldStar66: Gold Star's
 * home-built desk and the 3-track Ampex: warm, a mid bump at 1.5 kHz, the top rolled from 8 kHz, no deep lows (the Spector
 * and Wilson records' "mono wall"). rio63: the Odeon/Elenco and the New York bossa sessions: close, warm, the top soft
 * (7 kHz), a dip at 3 kHz (no edge on the nails and the breath). ny58: Van Gelder's and Atlantic's 1950s jazz: the bass
 * round at 100 Hz, a gentle presence at 4 kHz, the top rolled at 9 kHz. fania72: the 1970s New York salsa: bright,
 * horns forward (a lift at 1.2 and 4 kHz), the lows lean. plank72: Conny Plank's and Can's: lows tight and solid at 80
 * Hz, the low mids scooped at 400 Hz, a dry, forward 2 kHz. radio50: a 1950s broadcast of a regional (AM, 150 Hz-5 kHz,
 * the mids forward). (emi67 retuned to the 1969 TG12345's extended lows and clarity: highpass 35 Hz, lowpass 12 kHz; the
 * study's section 2.) hip: a modern early-music session (flat but for the air at 10 kHz and the room's low mud cut).
 */
export type EraId = "emi67" | "goldStar66" | "rio63" | "ny58" | "fania72" | "plank72" | "radio50" | "hip";
export const ERA_EQ: Readonly<Record<EraId, readonly EqBand[]>> = {
  emi67: [
    { type: "highpass", hz: 35, q: 0.7 },
    { type: "peaking", hz: 3000, db: 2, q: 0.9 },
    { type: "lowpass", hz: 12000, q: 0.6 },
  ],
  goldStar66: [
    { type: "highpass", hz: 70, q: 0.6 },
    { type: "peaking", hz: 1500, db: 2, q: 0.8 },
    { type: "lowpass", hz: 8000, q: 0.6 },
  ],
  rio63: [
    { type: "lowshelf", hz: 200, db: 1.5 },
    { type: "peaking", hz: 3000, db: -2, q: 1 },
    { type: "lowpass", hz: 7000, q: 0.6 },
  ],
  ny58: [
    { type: "peaking", hz: 100, db: 1.5, q: 0.8 },
    { type: "peaking", hz: 4000, db: 1.5, q: 0.8 },
    { type: "lowpass", hz: 9000, q: 0.6 },
  ],
  fania72: [
    { type: "highpass", hz: 60, q: 0.7 },
    { type: "peaking", hz: 1200, db: 2, q: 1 },
    { type: "highshelf", hz: 4000, db: 2.5 },
  ],
  plank72: [
    { type: "peaking", hz: 80, db: 2, q: 0.9 },
    { type: "peaking", hz: 400, db: -2.5, q: 1 },
    { type: "peaking", hz: 2000, db: 2, q: 0.9 },
  ],
  radio50: [
    { type: "highpass", hz: 150, q: 0.7 },
    { type: "peaking", hz: 1500, db: 3, q: 0.8 },
    { type: "lowpass", hz: 5000, q: 0.8 },
  ],
  hip: [
    { type: "highpass", hz: 40, q: 0.7 },
    { type: "peaking", hz: 250, db: -1, q: 1 },
    { type: "highshelf", hz: 10000, db: 1 },
  ],
};

const dbGain = (db: number) => 10 ** (db / 20);
/** A deterministic noise source (the impulses repeat exactly, as darkHall's). */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
}

/**
 * Tape's transfer curve: tanh at `drive`, a little asymmetric by `bias` (even harmonics), normalised so a full-scale
 * input leaves at about full scale (a quiet one a little louder: drive/tanh(drive); the bus's makeup is the comp's).
 */
export function tapeCurve(drive: number, bias = 0, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const norm = Math.tanh(drive);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(drive * (x + bias * x * x)) / norm;
  }
  return c;
}
/** Fuzz's curve: a hard, asymmetric clip (the germanium pair's: one side flattening sooner), softened at its knee. */
export function fuzzCurve(drive: number, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = ((i / (n - 1)) * 2 - 1) * drive;
    const pos = x > 0 ? Math.min(1, x / Math.pow(1 + Math.pow(x, 4), 0.25)) : 0;
    const neg = x < 0 ? Math.max(-0.7, x / Math.pow(1 + Math.pow(-x / 0.7, 3), 1 / 3)) : 0;
    c[i] = pos + neg;
  }
  return c;
}

/**
 * The impulses (stereo, decorrelated sides, seeded). A plate: dense at once (no early reflections: the sheet's waves
 * spread immediately), bright and slow to darken. A chamber (EMI's, Gold Star's): a few discrete early reflections
 * (7-29 ms) then a diffuse tail darkening as it decays. A spring: the dispersive "drip": chirps (high frequencies first)
 * repeating at the spring's round trip, band-limited to 120 Hz-4.5 kHz, over a thin diffuse floor.
 */
export function reverbImpulse(sr: number, o: ReverbOpts, seconds = o.seconds): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const len = Math.max(1, Math.floor(sr * seconds));
  const tau = o.rt60 / Math.log(1000);
  const bright = o.brightness ?? (o.ir === "plate" ? 0.6 : 0.4);
  const out: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [new Float32Array(len), new Float32Array(len)];
  for (let c = 0; c < 2; c++) {
    const d = out[c];
    const r = rng(9001 + 131 * c + (o.ir === "spring" ? 7 : o.ir === "chamber" ? 3 : 0));
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const k = Math.min(0.97, (1 - bright) * 0.55 + (t / seconds) * (o.ir === "plate" ? 0.2 : 0.38));
      lp = lp * k + r() * (1 - k);
      const fade = Math.min(1, (len - i) / (0.04 * sr));
      d[i] = lp * Math.exp(-t / tau) * fade * (o.ir === "spring" ? 0.35 : 1);
    }
    if (o.ir === "chamber") {
      // The early reflections: the chamber's walls (s, level), the sides a little apart.
      const taps: [number, number][] = [[0.007, 0.8], [0.013, 0.6], [0.019, 0.5], [0.029, 0.4]];
      for (const [at, lv] of taps) {
        const j = Math.floor((at + c * 0.0017) * sr);
        if (j < len) d[j] += lv * (c ? -1 : 1);
      }
      // The diffuse part enters after the first reflection.
      for (let i = 0; i < Math.min(len, Math.floor(0.007 * sr)); i++) d[i] *= i / (0.007 * sr);
    }
    if (o.ir === "spring") {
      const trip = o.spring ?? 0.033;
      // Each return a chirp falling from 4.5 kHz to 300 Hz over 18 ms (the spring's dispersion), weaker each trip.
      const chirpS = 0.018;
      for (let k = 1; k * trip < seconds; k++) {
        const t0 = k * trip + c * 0.0011;
        const amp = Math.exp(-(k * trip) / tau) * 0.6;
        const n0 = Math.floor(t0 * sr);
        const n = Math.floor(chirpS * sr);
        let ph = 0;
        for (let i = 0; i < n && n0 + i < len; i++) {
          const x = i / n;
          const f = 4500 * Math.pow(300 / 4500, x);
          ph += (2 * Math.PI * f) / sr;
          d[n0 + i] += amp * Math.sin(ph) * Math.sin(Math.PI * x);
        }
      }
    }
  }
  // Normalise the two sides together to a unit-energy impulse (the return's level its own).
  let e = 0;
  for (const d of out) for (let i = 0; i < d.length; i++) e += d[i] * d[i];
  const g = e > 0 ? 1 / Math.sqrt(e / 2) : 1;
  for (const d of out) for (let i = 0; i < d.length; i++) d[i] *= g;
  return out;
}

/** The nodes a stage makes (counted from its builder below; test/d540-band-fx.test.ts checks the count against a build). */
export function stageCost(s: Stage): { nodes: number; oscillators: number; convolvers: number; shapers: number } {
  const n = (nodes: number, oscillators = 0, shapers = 0) => ({ nodes, oscillators, convolvers: 0, shapers });
  switch (s.kind) {
    case "tape":
      return n(5 + (s.bump ? 1 : 0) + (s.wow ? 3 : 0), s.wow ? 1 : 0, 1);
    case "adt":
      return n(8, 1);
    case "leslie":
      return n(20, 2);
    case "phaser":
      return n(6 + (s.stages ?? 4), 1);
    case "fuzz":
      return n(6, 0, 1);
    case "echo":
      return n(9 + (s.wow ? 2 : 0) + (s.pan ? 1 : 0), s.wow ? 1 : 0, 1);
    case "comp":
      return n(2);
    case "eq":
      return n(Math.max(1, (s.bands ?? (s.era ? ERA_EQ[s.era] : [])).length));
    case "wah":
      return n(4 + (s.rate ? 2 : 0), s.rate ? 1 : 0);
    case "place":
      return n(5 + (s.pan ? 1 : 0));
    case "lofi":
      return n(3 + (s.crunch ? 1 : 0), 0, s.crunch ? 1 : 0);
    case "gain":
      return n(1);
  }
}
/** A whole chain's cost (its stages', its lanes' inputs, the reverb's five nodes and one convolver, the output). */
export function chainCost(spec: ChainSpec): { nodes: number; oscillators: number; convolvers: number; shapers: number } {
  const all = [...spec.bus, ...Object.values(spec.lanes ?? {}).flat()];
  const sum = { nodes: 1 + (spec.bus.length ? 0 : 1) + Object.values(spec.lanes ?? {}).reduce((k, st) => k + 1 + (st.length ? 0 : 1), 0), oscillators: 0, convolvers: 0, shapers: 0 };
  for (const s of all) {
    const c = stageCost(s);
    sum.nodes += c.nodes;
    sum.oscillators += c.oscillators;
    sum.shapers += c.shapers;
  }
  if (spec.reverb) (sum.nodes += 6), (sum.convolvers += 1);
  return sum;
}
/** At most this many nodes in a chain (a band's one: a note makes 10-30 of its own, a fugue sounds 30-60 at once), never two convolvers (one reverb a band), and six LFOs. */
export const CHAIN_CAP = { nodes: 120, convolvers: 1, oscillators: 6 } as const;

/** The builders, on one context. Every node is recorded in `nodes`, every LFO in `sources`. */
export class FxKit {
  readonly nodes: AudioNode[] = [];
  readonly sources: AudioScheduledSourceNode[] = [];
  readonly ctx: BaseAudioContext;
  readonly phone: boolean;
  constructor(ctx: BaseAudioContext, phone = false) {
    this.ctx = ctx;
    this.phone = phone;
  }
  private n<T extends AudioNode>(x: T): T {
    this.nodes.push(x);
    return x;
  }
  gain(v = 1): GainNode {
    const g = this.n(this.ctx.createGain());
    g.gain.value = v;
    return g;
  }
  filter(type: BiquadFilterType, hz: number, q = 0.7071, db = 0): BiquadFilterNode {
    const b = this.n(this.ctx.createBiquadFilter());
    b.type = type;
    b.frequency.value = hz;
    b.Q.value = q;
    b.gain.value = db;
    return b;
  }
  /** An LFO (a sine) into the params, at `depth` (the params' units). */
  lfo(rate: number, depth: number, params: AudioParam[], phase = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.frequency.value = rate;
    this.sources.push(o);
    this.nodes.push(o);
    const d = this.gain(depth);
    o.connect(d);
    for (const p of params) d.connect(p);
    // (A phase: the oscillator started a fraction of its period early; the context's clock is the same for all.)
    o.start(Math.max(0, this.ctx.currentTime - phase / Math.max(0.01, rate)));
    return o;
  }
  panner(pan: number): AudioNode {
    if (!this.ctx.createStereoPanner) return this.gain();
    const p = this.n(this.ctx.createStereoPanner());
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  }
  private block(input: AudioNode, output: AudioNode): Block {
    return { input, output, nodes: this.nodes, sources: this.sources };
  }

  tape(o: TapeOpts): Block {
    const input = this.gain(1);
    const sh = this.n(this.ctx.createWaveShaper());
    sh.curve = tapeCurve(o.drive, o.bias ?? 0.08);
    sh.oversample = "2x";
    let at: AudioNode = input;
    if (o.wow) {
      const d = this.n(this.ctx.createDelay(0.05));
      d.delayTime.value = 0.004 + o.wow.depth;
      this.lfo(o.wow.rate, o.wow.depth, [d.delayTime]);
      at = at.connect(d);
    }
    at = at.connect(sh).connect(this.filter("highpass", 25, 0.7));
    if (o.bump) at = at.connect(this.filter("peaking", o.bump.hz, 1, o.bump.db));
    const lp = this.filter("lowpass", o.rolloff ?? 15000, 0.6);
    const out = this.gain(1);
    at.connect(lp).connect(out);
    return this.block(input, out);
  }
  reverb(o: ReverbOpts): Block {
    const ctx = this.ctx;
    const input = this.gain(1);
    const pre = this.n(ctx.createDelay(0.2));
    pre.delayTime.value = o.predelay ?? 0.01;
    const hp = this.filter("highpass", o.hp ?? 200);
    const conv = this.n(ctx.createConvolver());
    const secs = this.phone ? (o.phoneSeconds ?? o.seconds) : o.seconds;
    const [l, r] = reverbImpulse(ctx.sampleRate, o, secs);
    const buf = ctx.createBuffer(2, l.length, ctx.sampleRate);
    buf.getChannelData(0).set(l);
    buf.getChannelData(1).set(r);
    conv.normalize = false;
    conv.buffer = buf;
    const lp = this.filter("lowpass", o.lp ?? 6000);
    lp.gain.value = 0;
    const out = this.gain(this.phone ? (o.phoneLevel ?? o.level ?? 1) : (o.level ?? 1));
    input.connect(pre).connect(hp).connect(conv).connect(lp).connect(out);
    return this.block(input, out);
  }
  adt(o: AdtOpts): Block {
    const input = this.gain(1);
    const out = this.gain(1);
    const spread = o.spread ?? 0.5;
    const dry = this.panner(-spread);
    const d = this.n(this.ctx.createDelay(0.1));
    d.delayTime.value = o.delay;
    this.lfo(o.rate ?? 0.7, o.depth ?? 0.0015, [d.delayTime]);
    const wet = this.gain(o.level ?? 0.8);
    const wp = this.panner(spread);
    input.connect(dry).connect(out);
    input.connect(d).connect(wet).connect(wp).connect(out);
    return this.block(input, out);
  }
  leslie(o: LeslieOpts): Block {
    // The 122's rotors: horn (treble) and drum (bass), each its own speed (chorale 0.8/0.7 Hz; tremolo 6.8/5.9 Hz).
    const fast = o.speed === "tremolo";
    const horn = fast ? 6.8 : 0.83;
    const drum = fast ? 5.9 : 0.7;
    const am = o.am ?? 0.35;
    const spread = o.spread ?? 0.6;
    const input = this.gain(1);
    const out = this.gain(1);
    const side = (rate: number, type: "lowpass" | "highpass", doppler: number) => {
      const xo = this.filter(type, o.crossover ?? 800, 0.7071);
      const d = this.n(this.ctx.createDelay(0.02));
      d.delayTime.value = 0.002 + doppler;
      const amp = this.gain(1 - am / 2);
      const p = this.panner(0);
      const g = this.gain(1);
      input.connect(xo).connect(d).connect(amp).connect(p).connect(g).connect(out);
      // One LFO each rotor: the Doppler, the level and the side follow the same turning (a quarter turn apart).
      const lfo = this.lfo(rate, doppler, [d.delayTime]);
      const a = this.gain(am / 2);
      lfo.connect(a).connect(amp.gain);
      const s = this.gain(spread);
      if ("pan" in p) lfo.connect(s).connect((p as StereoPannerNode).pan);
      return g;
    };
    side(horn, "highpass", o.doppler ?? 0.0004);
    side(drum, "lowpass", (o.doppler ?? 0.0004) / 3);
    return this.block(input, out);
  }
  phaser(o: PhaserOpts): Block {
    const input = this.gain(1);
    const out = this.gain(1);
    const dry = this.gain(1 - (o.mix ?? 0.5));
    const wet = this.gain(o.mix ?? 0.5);
    let at: AudioNode = input;
    const params: AudioParam[] = [];
    for (let i = 0; i < (o.stages ?? 4); i++) {
      const ap = this.filter("allpass", o.hz ?? 800, o.q ?? 0.7);
      params.push(ap.detune);
      at = at.connect(ap);
    }
    at.connect(wet).connect(out);
    input.connect(dry).connect(out);
    this.lfo(o.rate, o.sweep ?? 1600, params);
    return this.block(input, out);
  }
  fuzz(o: FuzzOpts): Block {
    const input = this.gain(1);
    const hp = this.filter("highpass", 150, 0.7);
    const sh = this.n(this.ctx.createWaveShaper());
    sh.curve = fuzzCurve(o.drive);
    sh.oversample = "4x";
    const dc = this.filter("highpass", 30, 0.7);
    const tone = this.filter("lowpass", o.tone ?? 3000, 0.8);
    const out = this.gain(o.level ?? 0.5);
    input.connect(hp).connect(sh).connect(dc).connect(tone).connect(out);
    return this.block(input, out);
  }
  echo(o: EchoOpts): Block & { delay: DelayNode; beats?: number } {
    const ctx = this.ctx;
    const input = this.gain(1);
    const out = this.gain(1);
    const sum = this.gain(1);
    const hp = this.filter("highpass", o.hp ?? 300);
    const sh = this.n(ctx.createWaveShaper());
    sh.curve = tapeCurve(o.drive ?? 1.8, 0.05, 1024);
    const delay = this.n(ctx.createDelay(2));
    delay.delayTime.value = o.time;
    if (o.wow) this.lfo(o.wow.rate, o.wow.depth, [delay.delayTime]);
    const lp = this.filter("lowpass", o.lp ?? 2800);
    const fb = this.gain(o.feedback);
    const wet = this.gain(o.mix);
    input.connect(out);
    input.connect(hp).connect(sum).connect(sh).connect(delay).connect(lp);
    lp.connect(fb).connect(sum);
    const ret = o.pan ? lp.connect(wet).connect(this.panner(o.pan)) : lp.connect(wet);
    ret.connect(out);
    return { ...this.block(input, out), delay, beats: o.beats };
  }
  comp(o: CompOpts): Block {
    const m = { ...(o.model ? COMP_MODELS[o.model] : COMP_MODELS.glue), ...o };
    const c = this.n(this.ctx.createDynamicsCompressor());
    c.threshold.value = m.threshold;
    c.ratio.value = m.ratio;
    c.knee.value = m.knee;
    c.attack.value = m.attack;
    c.release.value = m.release;
    const out = this.gain(dbGain(m.makeup ?? 0));
    c.connect(out);
    return this.block(c, out);
  }
  eq(bands: readonly EqBand[]): Block {
    if (!bands.length) {
      const g = this.gain(1);
      return this.block(g, g);
    }
    const fs = bands.map((b) => this.filter(b.type, b.hz, b.q ?? (b.type === "lowshelf" || b.type === "highshelf" ? 0.7071 : 0.9), b.db ?? 0));
    for (let i = 1; i < fs.length; i++) fs[i - 1].connect(fs[i]);
    return this.block(fs[0], fs[fs.length - 1]);
  }
  wah(o: WahOpts): Block {
    const input = this.gain(1);
    const out = this.gain(1);
    const pk = this.filter("peaking", o.hz, o.q ?? 4, o.db ?? 9);
    const lp = this.filter("lowpass", o.hz * 3, 0.6);
    input.connect(pk).connect(lp).connect(out);
    if (o.rate) this.lfo(o.rate, o.sweep ?? 900, [pk.detune]);
    return this.block(input, out);
  }
  place(o: PlaceOpts): Block {
    // Width: the stereo line blended with its own mono fold (a one-channel gain downmixes; its output upmixes to both sides).
    const input = this.gain(1);
    const out = this.gain(1);
    const w = Math.max(0, Math.min(1, o.width ?? 1));
    const st = this.gain(w);
    const mono = this.gain(1);
    mono.channelCount = 1;
    mono.channelCountMode = "explicit";
    mono.channelInterpretation = "speakers";
    const mg = this.gain(1 - w);
    input.connect(st);
    input.connect(mono).connect(mg);
    const at: AudioNode = o.pan ? this.panner(o.pan) : out;
    st.connect(at);
    mg.connect(at);
    if (at !== out) at.connect(out);
    return this.block(input, out);
  }
  lofi(o: LofiOpts): Block {
    const input = this.filter("highpass", o.hp, 0.7);
    const lp = this.filter("lowpass", o.lp, 0.8);
    let at: AudioNode = input.connect(lp);
    if (o.crunch) {
      const sh = this.n(this.ctx.createWaveShaper());
      sh.curve = tapeCurve(1 + 4 * o.crunch, 0.15, 1024);
      at = at.connect(sh);
    }
    const out = this.gain(1);
    at.connect(out);
    return this.block(input, out);
  }
  stage(s: Stage): Block & { delay?: DelayNode; beats?: number } {
    switch (s.kind) {
      case "tape":
        return this.tape(s);
      case "adt":
        return this.adt(s);
      case "leslie":
        return this.leslie(s);
      case "phaser":
        return this.phaser(s);
      case "fuzz":
        return this.fuzz(s);
      case "echo":
        return this.echo(s);
      case "comp":
        return this.comp(s);
      case "eq":
        return this.eq(s.bands ?? (s.era ? ERA_EQ[s.era] : []));
      case "wah":
        return this.wah(s);
      case "place":
        return this.place(s);
      case "lofi":
        return this.lofi(s);
      case "gain": {
        const g = this.gain(dbGain(s.db));
        return this.block(g, g);
      }
    }
  }
  /** Stages in series: the first's input, the last's output (a plain gain where there are none). */
  series(stages: readonly Stage[], echoes: { delay: DelayNode; beats: number }[]): Block {
    if (!stages.length) {
      const g = this.gain(1);
      return this.block(g, g);
    }
    const bs = stages.map((s) => {
      const b = this.stage(s);
      if (b.delay && b.beats) echoes.push({ delay: b.delay, beats: b.beats });
      return b;
    });
    for (let i = 1; i < bs.length; i++) bs[i - 1].output.connect(bs[i].input);
    return this.block(bs[0].input, bs[bs.length - 1].output);
  }
}

/** Build a band's chain on a context. */
export function buildChain(ctx: BaseAudioContext, spec: ChainSpec, opts: { phone?: boolean } = {}): BandChain {
  const kit = new FxKit(ctx, !!opts.phone);
  const echoes: { delay: DelayNode; beats: number }[] = [];
  const bus = kit.series(spec.bus, echoes);
  const lanes = new Map<string, AudioNode>();
  for (const [name, stages] of Object.entries(spec.lanes ?? {})) {
    const inp = kit.gain(1);
    const b = kit.series(stages, echoes);
    inp.connect(b.input);
    b.output.connect(bus.input);
    lanes.set(name, inp);
  }
  const output = kit.gain(1);
  bus.output.connect(output);
  let send: AudioNode | null = null;
  if (spec.reverb) {
    const r = kit.reverb(spec.reverb);
    r.output.connect(output);
    send = r.input;
  }
  const echoTail = Math.max(0, ...[...spec.bus, ...Object.values(spec.lanes ?? {}).flat()].map((s) => (s.kind === "echo" ? (s.time * Math.log(1000)) / -Math.log(Math.max(0.01, s.feedback)) : 0)));
  const tail = Math.max(echoTail, spec.reverb ? (opts.phone ? (spec.reverb.phoneSeconds ?? spec.reverb.seconds) : spec.reverb.seconds) : 0);
  let gone = false;
  return {
    spec,
    input: bus.input,
    lane: (name) => (name ? (lanes.get(name) ?? null) : null),
    send,
    output,
    nodes: kit.nodes,
    sources: kit.sources,
    tail,
    setBeat(s: number) {
      for (const e of echoes) {
        const t = Math.max(0.05, Math.min(1.9, e.beats * s));
        if (Math.abs(e.delay.delayTime.value - t) > 0.005) e.delay.delayTime.setTargetAtTime(t, ctx.currentTime, 0.05);
      }
    },
    dispose() {
      if (gone) return;
      gone = true;
      for (const s of kit.sources)
        try {
          s.stop();
        } catch {
          /* never started */
        }
      for (const n of kit.nodes)
        try {
          n.disconnect();
        } catch {
          /* already */
        }
    },
  };
}

/**
 * One chain a band (the study's signature designs, STUDY.md; phase 2 tunes them by ear-proxy measurement). The v2 presets
 * (sound.ts V2_PRESETS) carry them; the v1 bands play as before.
 */
export const BAND_CHAINS = {
  // Conny Plank / Can / Neu!: the combo organ and the fuzz guitar each their lane; a phased, echoing guitar; the bus
  // tight, scooped and driven onto 1972 tape; a short EMT-like plate.
  krautrock: {
    band: "krautrock",
    lanes: {
      organ: [{ kind: "phaser", rate: 0.25, hz: 900, sweep: 1500, mix: 0.45 }],
      guitar: [{ kind: "fuzz", drive: 6, tone: 2600, level: 0.45 }, { kind: "echo", time: 0.36, beats: 0.75, feedback: 0.35, mix: 0.45, pan: 0.3, wow: { rate: 0.55, depth: 0.0011 } }],
      mellotron: [{ kind: "tape", drive: 1.4, rolloff: 9000, wow: { rate: 0.6, depth: 0.0015 } }, { kind: "lofi", hp: 120, lp: 6000 }],
    },
    bus: [{ kind: "eq", era: "plank72" }, { kind: "comp", model: "1176", threshold: -18 }, { kind: "tape", drive: 1.8, bump: { hz: 90, db: 1.5 }, rolloff: 12000 }],
    reverb: { ir: "plate", seconds: 1.4, phoneSeconds: 0.9, rt60: 1.2, predelay: 0.01, hp: 250, lp: 6000, level: 0.8 },
  },
  // EMI Studio Two, 1967-69: the Hammond through its Leslie; the guitar double-tracked by ADT; the bass dry and round;
  // the REDD desk's curve, the Fairchild, the bounce onto 4-track tape; the chamber (and the EMT plate's brightness).
  abbeyRoad: {
    band: "abbeyRoad",
    lanes: {
      guitar: [{ kind: "leslie", speed: "chorale" }, { kind: "adt", delay: 0.018, depth: 0.0018, rate: 0.6, spread: 0.3, level: 0.8 }, { kind: "place", pan: -0.8 }],
      organ: [{ kind: "leslie", speed: "chorale" }, { kind: "tape", drive: 1.5 }, { kind: "place", pan: 0.8 }],
      moog: [{ kind: "tape", drive: 1.3 }],
      brass: [{ kind: "adt", delay: 0.014, depth: 0.0012, rate: 0.5, spread: 0.4, level: 0.7 }, { kind: "comp", model: "fairchild" }, { kind: "place", pan: 0.6 }],
    },
    bus: [{ kind: "eq", era: "emi67" }, { kind: "comp", model: "fairchild" }, { kind: "tape", drive: 2.2, bias: 0.1, bump: { hz: 110, db: 1.5 }, rolloff: 11000 }],
    reverb: { ir: "chamber", seconds: 1.6, phoneSeconds: 1.0, rt60: 1.4, predelay: 0.02, hp: 250, lp: 7000, brightness: 0.5, level: 0.9 },
  },
  // 1970s New York salsa (Fania): the brass section's lane bright and pushed; the tres crisp; bright console EQ, a fast
  // compressor on the horns, a short bright plate; no tape drive to speak of (the clean 16-track).
  salsa: {
    band: "salsa",
    lanes: {
      horns: [{ kind: "comp", model: "1176", threshold: -20 }, { kind: "eq", bands: [{ type: "peaking", hz: 1400, db: 2, q: 1 }] }],
      tres: [{ kind: "eq", bands: [{ type: "highpass", hz: 180 }, { type: "peaking", hz: 2500, db: 3, q: 1.2 }] }],
    },
    bus: [{ kind: "eq", era: "fania72" }, { kind: "comp", model: "glue" }, { kind: "tape", drive: 1.2, rolloff: 14000 }],
    reverb: { ir: "plate", seconds: 1.2, phoneSeconds: 0.8, rt60: 1.0, predelay: 0.015, hp: 300, lp: 7000, brightness: 0.65, level: 0.7 },
  },
  // Rio / New York, 1959-64: close, soft and narrow; the guitar and the voice-like flute in the middle; the Rhodes warm
  // (a slow vibrato-free tremolo is the Suitcase's, not the Fender's: none); the LA-2A; a small dark chamber.
  bossaNova: {
    band: "bossaNova",
    lanes: {
      keys: [{ kind: "tape", drive: 1.3, rolloff: 7000 }],
    },
    bus: [{ kind: "eq", era: "rio63" }, { kind: "comp", model: "la2a", threshold: -26 }, { kind: "place", width: 0.6 }, { kind: "tape", drive: 1.3, bump: { hz: 120, db: 1 }, rolloff: 10000 }],
    reverb: { ir: "chamber", seconds: 1.1, phoneSeconds: 0.75, rt60: 0.9, predelay: 0.012, hp: 180, lp: 5000, brightness: 0.35, level: 0.8 },
  },
  // A regional on the radio, 1950s (Jacob do Bandolim's broadcasts and 78s): the bandolim's and the cavaquinho's
  // brightness kept, the whole a little narrowed (AM's band), compressed as a broadcast chain is; a short spring.
  chorinho: {
    band: "chorinho",
    lanes: {
      plucked: [{ kind: "eq", bands: [{ type: "peaking", hz: 3000, db: 2, q: 1 }] }],
    },
    bus: [{ kind: "lofi", hp: 110, lp: 7500, crunch: 0.15 }, { kind: "eq", era: "radio50" }, { kind: "comp", model: "la2a", threshold: -22 }, { kind: "place", width: 0.5 }],
    reverb: { ir: "spring", seconds: 1.1, phoneSeconds: 0.8, rt60: 1.0, predelay: 0.008, hp: 300, lp: 4500, spring: 0.031, level: 0.6 },
  },
  // Atlantic / Van Gelder, the 1950s: the vibraphone's motor in its own lane (the slow tremolo as the Leslie's drum only:
  // no Doppler), the bass round, warm tape, a small plate. D549-D552 (the classic four): each return calibrated to the
  // original's room (this unit-energy impulse returned 6-10 dB more than the v1 rooms' normalised ones), each bus trimmed
  // back to the original's level (the compressor's automatic makeup, the tape's small-signal gain, the slim fold's 3 dB).
  jazzQuartet: {
    band: "jazzQuartet",
    lanes: {
      vibes: [{ kind: "eq", bands: [{ type: "peaking", hz: 2500, db: 1.5, q: 1 }] }],
    },
    bus: [{ kind: "eq", era: "ny58" }, { kind: "comp", model: "la2a", threshold: -18 }, { kind: "tape", drive: 1.4, bump: { hz: 100, db: 1 }, rolloff: 11000 }, { kind: "gain", db: -10.7 }],
    reverb: { ir: "plate", seconds: 1.3, phoneSeconds: 0.85, rt60: 1.1, predelay: 0.015, hp: 200, lp: 5500, brightness: 0.45, level: 0.32, phoneLevel: 0.265 },
  },
  // A modern period-instrument session in a hall: clean (no tape), the room's mud cut, the air lifted; a chamber.
  baroqueBand: {
    band: "baroqueBand",
    bus: [{ kind: "eq", era: "hip" }],
    reverb: { ir: "chamber", seconds: 1.6, phoneSeconds: 1.0, rt60: 1.4, predelay: 0.022, hp: 150, lp: 6500, brightness: 0.4, level: 0.33, phoneLevel: 0.25 },
  },
  // Brass in a church: a gentle bus compressor (the brass's peaks only, D551), the hall long (its impulse 1.8 s: 4x CPU); no tape.
  bachBrass: {
    band: "bachBrass",
    bus: [{ kind: "eq", era: "hip" }, { kind: "comp", model: "la2a", threshold: -10 }, { kind: "gain", db: -3.4 }],
    reverb: { ir: "chamber", seconds: 1.8, phoneSeconds: 1.6, rt60: 2.4, predelay: 0.03, hp: 120, lp: 5500, brightness: 0.3, level: 0.52, phoneLevel: 0.385 },
  },
  // A 1970s Archiv / Telefunken analog trio recording: close, the reeds' edge softened a touch, warm tape, a small room.
  oboeTrio: {
    band: "oboeTrio",
    bus: [{ kind: "eq", bands: [{ type: "peaking", hz: 3200, db: -1.5, q: 1 }, { type: "lowshelf", hz: 180, db: 1 }] }, { kind: "tape", drive: 1.2, rolloff: 13000 }],
    reverb: { ir: "chamber", seconds: 1.2, phoneSeconds: 0.8, rt60: 1.05, predelay: 0.014, hp: 140, lp: 6500, brightness: 0.4, level: 0.3, phoneLevel: 0.23 },
  },
  // Gold Star / Western, 1966: Brian Wilson's mono wall: everything folded to one image (width 0.15), the Fairchild-like
  // squeeze, hot 3-track tape, the echo chamber; the bass and the doubled keyboards in one lane with a tape slap.
  petSounds: {
    band: "petSounds",
    lanes: {
      wall: [{ kind: "echo", time: 0.09, feedback: 0.12, mix: 0.25, lp: 3500, hp: 250 }, { kind: "adt", delay: 0.012, depth: 0.0008, rate: 0.4, spread: 0, level: 0.5 }],
    },
    bus: [{ kind: "eq", era: "goldStar66" }, { kind: "comp", model: "fairchild", threshold: -24 }, { kind: "tape", drive: 2, bias: 0.12, bump: { hz: 100, db: 2 }, rolloff: 9000 }, { kind: "place", width: 0.15 }],
    reverb: { ir: "chamber", seconds: 1.8, phoneSeconds: 1.1, rt60: 1.6, predelay: 0.02, hp: 200, lp: 6000, brightness: 0.45, level: 1 },
  },
} as const satisfies Record<string, ChainSpec>;
export type ChainBand = keyof typeof BAND_CHAINS;
