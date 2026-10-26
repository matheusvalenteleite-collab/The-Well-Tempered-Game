/**
 * The ensembles (D177): presets that give each voice an instrument of its own, chosen together so
 * the voices stand apart and sound well together (some sustained, some plucked and dying away; bright
 * above, round below), in four families: ACOUSTIC, BANDS (with a rhythm section), CHIP and MOOG. All
 * is synthesized (oscillators, filters, envelopes, a little drive, vowel formants); D190 adds two
 * recorded instruments (sampled.ts), whose patches keep a synthesized sound for any note not loaded yet.
 * A patch is played by chip.ts; the player's own voice takes its patch, shaped by the touch.
 */
import type { SampledId } from "./sampled.ts";

export type Wave = "saw" | "square" | "triangle" | "sine" | "pulse12" | "pulse25" | "pulse50" | "organ" | "reed" | "bell" | ShapedWave;

const TAU = 2 * Math.PI;
/**
 * D209: the consoles' own wave shapes, drawn sample by sample over one cycle (x, the phase, 0 to 1;
 * the value -1 to 1) and played from their harmonics (one PeriodicWave each, built once: no cost per note).
 */
export const SHAPES = {
  /** The NES triangle: 32 steps of 4 bits (15 down to 0 and back up), the stair audible as a faint buzz. */
  tri4: (x: number) => {
    const k = Math.floor(x * 32) % 32;
    return (k < 16 ? 15 - k : k - 16) / 7.5 - 1;
  },
  /** A Game Boy wave-channel sample (32 steps of 4 bits), DMG style: a quick rise and a long ramp down, reedy. */
  gbRamp: (x: number) => {
    const k = Math.floor(x * 32) % 32;
    return Math.round(k < 6 ? (k / 5) * 15 : 15 - ((k - 6) / 25) * 15) / 7.5 - 1;
  },
  /** A Game Boy Color-era wave sample: a rounded, sine-like hump in 4 bits, the octave a little in it. */
  gbRound: (x: number) => {
    const k = Math.floor(x * 32) % 32;
    const v = Math.sin((TAU * (k + 0.5)) / 32) + 0.25 * Math.sin((2 * TAU * (k + 0.5)) / 32);
    return Math.round(7.5 + 6.2 * v) / 7.5 - 1;
  },
  /** The VRC6 sawtooth (Akumajou Densetsu): an accumulator reset every seventh step, a 7-step stair. */
  saw7: (x: number) => Math.floor((x % 1) * 7) / 3 - 1,
  /** YM2612 FM, one carrier under a modulator fed by another (feedback-like): the gritty Mega Drive bass. */
  fmBass: (x: number) => Math.sin(TAU * x + 2.2 * Math.sin(TAU * x + 0.9 * Math.sin(TAU * x))),
  /** FM brass: a 1:1 modulator, index 1.6 (a rounded sawtooth with a bite). */
  fmBrass: (x: number) => Math.sin(TAU * x + 1.6 * Math.sin(TAU * x)),
  /** An FM bell / electric piano: a 1:7 modulator (partials 1, 6, 8, 13, 15): glassy. */
  fmBell: (x: number) => Math.sin(TAU * x + 1.3 * Math.sin(7 * TAU * x)),
} satisfies Record<string, (x: number) => number>;
export type ShapedWave = keyof typeof SHAPES;
export const isShaped = (w: Wave): w is ShapedWave => w in SHAPES;

/** A shape's Fourier coefficients (cosine, sine) up to harmonic n - 1, for createPeriodicWave. */
export function harmonicsOf(shape: (x: number) => number, n = 64): { real: Float32Array; imag: Float32Array } {
  const M = 1024;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let j = 0; j < M; j++) {
    const x = (j + 0.5) / M;
    const y = shape(x);
    for (let k = 1; k < n; k++) {
      real[k] += (2 / M) * y * Math.cos(TAU * k * x);
      imag[k] += (2 / M) * y * Math.sin(TAU * k * x);
    }
  }
  return { real, imag };
}

export interface Osc {
  wave: Wave;
  /** Cents off the note, and octaves. */
  detune?: number;
  octave?: number;
  gain?: number;
}

export interface Patch {
  osc: Osc[];
  /** A lowpass (or bandpass) at `freq` times the note's frequency (or Hz when `hz`), opened `env` times at the attack, closing over `envDecay` s. */
  filter?: { freq: number; hz?: boolean; q?: number; env?: number; envDecay?: number; type?: BiquadFilterType };
  /** Attack, decay, sustain level, release (s). A pluck (sustain 0) dies away over `decay` (s, a time constant, longer low). */
  amp: { a: number; d: number; s: number; r: number };
  /** Vibrato: depth (cents), rate (Hz), how soon it comes (s). */
  vib?: { depth: number; rate: number; delay: number };
  /** Tremolo (amplitude), 0 to 1, at `rate`. */
  trem?: { depth: number; rate: number };
  /** Overdrive, 0 to 10. */
  drive?: number;
  /** A sung vowel: two formants (Hz). */
  vowel?: [number, number];
  /** Breath noise, 0 to 1. */
  breath?: number;
  level: number;
  /** D190: played from recordings (sampled.ts) where they are loaded; the rest of the patch is its stand-in until then. */
  sample?: SampledId;
  /** D209: the pitch starts `cents` off and settles within `time` (s, a time constant): a lip's scoop, a pluck's twang, a slap's snap. */
  scoop?: { cents: number; time: number };
}

const P = (p: Patch) => p;

/** The instruments. */
export const PATCHES = {
  // Strings and winds (ACOUSTIC).
  violin: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "sine", gain: 0.6 }, { wave: "saw", detune: 7, gain: 0.3 }], filter: { freq: 4.5, q: 0.7, env: 1.4, envDecay: 0.2 }, amp: { a: 0.06, d: 0.2, s: 0.85, r: 0.14 }, vib: { depth: 10, rate: 5.2, delay: 0.3 }, level: 0.42 }),
  violin2: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "sine", gain: 0.6 }], filter: { freq: 3.8, q: 0.7, env: 1.6, envDecay: 0.15 }, amp: { a: 0.03, d: 0.55, s: 0.45, r: 0.12 }, vib: { depth: 7, rate: 5, delay: 0.35 }, level: 0.4 }),
  viola: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 3.2, q: 0.8, env: 1.6, envDecay: 0.15 }, amp: { a: 0.03, d: 0.6, s: 0.4, r: 0.14 }, vib: { depth: 6, rate: 4.8, delay: 0.35 }, level: 0.45 }),
  cello: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "sine", gain: 0.7 }, { wave: "square", octave: -1, gain: 0.15 }], filter: { freq: 3, q: 0.8, env: 1.4, envDecay: 0.2 }, amp: { a: 0.05, d: 0.6, s: 0.55, r: 0.16 }, vib: { depth: 7, rate: 4.6, delay: 0.4 }, level: 0.55 }),
  oboe: P({ osc: [{ wave: "reed" }, { wave: "sine", gain: 0.4 }], filter: { freq: 4.2, q: 1.4, env: 1.2, envDecay: 0.1 }, amp: { a: 0.04, d: 0.1, s: 0.9, r: 0.1 }, vib: { depth: 7, rate: 5, delay: 0.3 }, level: 0.4 }),
  flute: P({ osc: [{ wave: "sine" }, { wave: "triangle", octave: 1, gain: 0.15 }], amp: { a: 0.05, d: 0.1, s: 0.9, r: 0.1 }, vib: { depth: 10, rate: 5, delay: 0.2 }, breath: 0.12, level: 0.55 }),
  clarinet: P({ osc: [{ wave: "square", gain: 0.7 }, { wave: "sine", gain: 0.5 }], filter: { freq: 3, q: 0.7 }, amp: { a: 0.03, d: 0.5, s: 0.6, r: 0.1 }, vib: { depth: 4, rate: 5, delay: 0.4 }, level: 0.38 }),
  bassoon: P({ osc: [{ wave: "reed" }, { wave: "sine", gain: 0.6 }], filter: { freq: 2.4, q: 1, env: 1.3, envDecay: 0.1 }, amp: { a: 0.04, d: 0.4, s: 0.6, r: 0.1 }, vib: { depth: 4, rate: 5, delay: 0.4 }, level: 0.52 }),
  recorder: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: 1, gain: 0.1 }], amp: { a: 0.03, d: 0.1, s: 0.92, r: 0.06 }, vib: { depth: 6, rate: 5.2, delay: 0.35 }, breath: 0.08, level: 0.55 }),
  viol: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 3.4, q: 0.7, env: 1.6, envDecay: 0.15 }, amp: { a: 0.04, d: 0.5, s: 0.45, r: 0.12 }, vib: { depth: 4, rate: 5, delay: 0.5 }, level: 0.48 }),
  harpsichord: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "triangle", gain: 0.5 }, { wave: "pulse25", octave: 1, gain: 0.2 }], filter: { freq: 6, q: 0.8, env: 2, envDecay: 0.12 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.08 }, level: 0.38 }),
  harpsiBass: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 4.2, q: 0.8, env: 2, envDecay: 0.2 }, amp: { a: 0.002, d: 1.2, s: 0, r: 0.08 }, level: 0.48 }),
  // D190: recorded (the synthesized sound above stands in for a note until its recording is loaded).
  harpsiSampled: P({ osc: [{ wave: "saw" }, { wave: "pulse25", octave: 1, gain: 0.35 }], filter: { freq: 10, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.08 }, level: 0.36, sample: "harpsichord" }),
  harpsiBassSampled: P({ osc: [{ wave: "saw" }, { wave: "pulse25", gain: 0.3 }], filter: { freq: 6, q: 1, env: 2, envDecay: 0.2 }, amp: { a: 0.002, d: 1.2, s: 0, r: 0.08 }, level: 0.45, sample: "harpsichord" }),
  organSampled: P({ osc: [{ wave: "organ" }, { wave: "organ", octave: 1, gain: 0.3 }], amp: { a: 0.012, d: 0.1, s: 1, r: 0.06 }, level: 0.3, sample: "organ" }),
  lute: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.3 }], filter: { freq: 4, q: 1.2, env: 2, envDecay: 0.1 }, amp: { a: 0.003, d: 0.7, s: 0, r: 0.1 }, level: 0.42 }),
  // Bands.
  leadGuitar: P({ osc: [{ wave: "saw" }, { wave: "triangle", gain: 0.6 }], filter: { freq: 2000, hz: true, q: 0.9, env: 1.3, envDecay: 0.2 }, amp: { a: 0.005, d: 0.4, s: 0.75, r: 0.12 }, vib: { depth: 16, rate: 5.2, delay: 0.35 }, drive: 3.5, level: 0.24 }),
  rhythmGuitar: P({ osc: [{ wave: "square", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 1400, hz: true, q: 0.9, env: 1.8, envDecay: 0.08 }, amp: { a: 0.003, d: 0.45, s: 0.15, r: 0.08 }, drive: 1.8, level: 0.26 }),
  rockOrgan: P({ osc: [{ wave: "organ" }], amp: { a: 0.01, d: 0.1, s: 1, r: 0.06 }, vib: { depth: 8, rate: 6.5, delay: 0 }, trem: { depth: 0.15, rate: 6.5 }, level: 0.32 }),
  bassGuitar: P({ osc: [{ wave: "square" }, { wave: "sine", gain: 0.8 }], filter: { freq: 3, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.004, d: 0.5, s: 0.6, r: 0.08 }, level: 0.5 }),
  altoSax: P({ osc: [{ wave: "reed" }, { wave: "sine", gain: 0.5 }], filter: { freq: 3.8, q: 1.6, env: 1.5, envDecay: 0.15 }, amp: { a: 0.04, d: 0.2, s: 0.85, r: 0.12 }, vib: { depth: 14, rate: 4.8, delay: 0.3 }, drive: 0.8, breath: 0.08, level: 0.36 }),
  mutedTrumpet: P({ osc: [{ wave: "square", gain: 0.6 }, { wave: "sine", gain: 0.5 }], filter: { freq: 2.6, q: 2.2, env: 2, envDecay: 0.12 }, amp: { a: 0.03, d: 0.5, s: 0.5, r: 0.1 }, vib: { depth: 8, rate: 5.2, delay: 0.35 }, level: 0.34 }),
  vibraphone: P({ osc: [{ wave: "sine" }, { wave: "sine", octave: 2, gain: 0.25 }], amp: { a: 0.002, d: 1.6, s: 0, r: 0.2 }, trem: { depth: 0.3, rate: 5 }, level: 0.5 }),
  jazzPiano: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.25 }], filter: { freq: 6, q: 0.7, env: 1.5, envDecay: 0.3 }, amp: { a: 0.003, d: 1.2, s: 0, r: 0.1 }, level: 0.36 }),
  uprightBass: P({ osc: [{ wave: "sine" }, { wave: "triangle", gain: 0.6 }], filter: { freq: 3, q: 1, env: 1.5, envDecay: 0.1 }, amp: { a: 0.006, d: 0.6, s: 0, r: 0.08 }, level: 0.55 }),
  nylonGuitar: P({ osc: [{ wave: "triangle" }, { wave: "square", gain: 0.15 }], filter: { freq: 3.5, q: 1, env: 2, envDecay: 0.08 }, amp: { a: 0.003, d: 0.65, s: 0, r: 0.1 }, level: 0.42 }),
  rhodes: P({ osc: [{ wave: "sine" }, { wave: "bell", gain: 0.25 }], amp: { a: 0.003, d: 1.4, s: 0, r: 0.15 }, trem: { depth: 0.2, rate: 4.5 }, level: 0.36 }),
  softFlute: P({ osc: [{ wave: "sine" }], amp: { a: 0.07, d: 0.1, s: 0.9, r: 0.12 }, vib: { depth: 8, rate: 4.8, delay: 0.3 }, breath: 0.15, level: 0.35 }),
  softBass: P({ osc: [{ wave: "sine" }, { wave: "triangle", gain: 0.4 }], amp: { a: 0.01, d: 0.8, s: 0.3, r: 0.1 }, level: 0.55 }),
  // Voices (the Swingle Singers' "dah", "doo", "bah", "dm").
  sopDah: P({ osc: [{ wave: "saw" }], vowel: [800, 1150], amp: { a: 0.04, d: 0.2, s: 0.8, r: 0.1 }, vib: { depth: 12, rate: 5.5, delay: 0.25 }, level: 0.9 }),
  altoDoo: P({ osc: [{ wave: "saw" }], vowel: [350, 900], amp: { a: 0.05, d: 0.2, s: 0.8, r: 0.1 }, vib: { depth: 10, rate: 5.2, delay: 0.3 }, level: 1.5 }),
  tenDah: P({ osc: [{ wave: "saw" }], vowel: [650, 1080], amp: { a: 0.04, d: 0.2, s: 0.8, r: 0.1 }, vib: { depth: 9, rate: 5, delay: 0.3 }, level: 1.3 }),
  bassDm: P({ osc: [{ wave: "saw" }, { wave: "sine", gain: 1 }], vowel: [400, 800], amp: { a: 0.03, d: 0.3, s: 0.6, r: 0.1 }, level: 1 }),
  // Moog.
  // D209: Wendy Carlos's Switched-On Bach (1968): a Moog modular, one note at a time, every line its own
  // patch: a bright sawtooth trumpet with a lip's scoop, a nasal resonant reed, a plucked "boing" of a
  // resonant filter swept shut, a wooden blip, a round bass that snaps; detached (each note let go before
  // the next), the oscillators a few cents apart as the drifting Moog was.
  carlosLead: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "saw", detune: 6, gain: 0.45 }], filter: { freq: 2.2, q: 3, env: 3.2, envDecay: 0.12 }, amp: { a: 0.012, d: 0.25, s: 0.72, r: 0.05 }, vib: { depth: 7, rate: 5.6, delay: 0.35 }, scoop: { cents: -45, time: 0.025 }, level: 0.3 }),
  carlosReed: P({ osc: [{ wave: "pulse12" }, { wave: "triangle", detune: -4, gain: 0.5 }], filter: { freq: 3.2, q: 7, env: 1.5, envDecay: 0.08 }, amp: { a: 0.02, d: 0.2, s: 0.85, r: 0.05 }, vib: { depth: 5, rate: 5.2, delay: 0.4 }, level: 0.28 }),
  carlosPluck: P({ osc: [{ wave: "pulse25", gain: 0.8 }, { wave: "saw", detune: 5, gain: 0.5 }], filter: { freq: 1.1, q: 10, env: 9, envDecay: 0.07 }, amp: { a: 0.003, d: 0.4, s: 0.3, r: 0.05 }, scoop: { cents: 60, time: 0.012 }, level: 0.34 }),
  carlosWood: P({ osc: [{ wave: "triangle" }, { wave: "pulse50", octave: 1, gain: 0.2 }], filter: { freq: 2.6, q: 4, env: 4, envDecay: 0.04 }, amp: { a: 0.003, d: 0.25, s: 0.5, r: 0.04 }, scoop: { cents: 320, time: 0.008 }, level: 0.9 }),
  carlosBass: P({ osc: [{ wave: "saw" }, { wave: "square", octave: -1, detune: 3, gain: 0.5 }], filter: { freq: 280, hz: true, q: 6, env: 5, envDecay: 0.09 }, amp: { a: 0.004, d: 0.3, s: 0.6, r: 0.05 }, level: 0.5 }),
  minimoog: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "saw", detune: 8, gain: 0.4 }, { wave: "sine", octave: -1, gain: 0.5 }], filter: { freq: 2.2, q: 2, env: 2.2, envDecay: 0.25 }, amp: { a: 0.006, d: 0.3, s: 0.8, r: 0.1 }, vib: { depth: 6, rate: 5, delay: 0.4 }, level: 0.28 }),
  squareReed: P({ osc: [{ wave: "square", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 2.8, q: 1.4 }, amp: { a: 0.02, d: 0.4, s: 0.55, r: 0.1 }, vib: { depth: 6, rate: 5.2, delay: 0.3 }, level: 0.32 }),
  brass: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 5 }], filter: { freq: 1.6, q: 1.5, env: 4, envDecay: 0.45 }, amp: { a: 0.06, d: 0.3, s: 0.85, r: 0.1 }, level: 0.3 }),
  subBass: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: -1, gain: 0.8 }], amp: { a: 0.01, d: 0.3, s: 0.9, r: 0.08 }, level: 0.5 }),
  bells: P({ osc: [{ wave: "bell" }, { wave: "sine", octave: 1, gain: 0.3 }], amp: { a: 0.002, d: 1.1, s: 0, r: 0.2 }, level: 0.5 }),
  pad: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 12 }, { wave: "saw", detune: -12 }], filter: { freq: 2.2, q: 1 }, amp: { a: 0.15, d: 0.4, s: 0.85, r: 0.25 }, vib: { depth: 5, rate: 4, delay: 0.5 }, level: 0.22 }),
  pwmLead: P({ osc: [{ wave: "pulse25", gain: 0.7 }, { wave: "sine", gain: 0.5 }], filter: { freq: 3.4, q: 1.4, env: 1.5, envDecay: 0.2 }, amp: { a: 0.01, d: 0.2, s: 0.85, r: 0.1 }, vib: { depth: 8, rate: 5.4, delay: 0.3 }, level: 0.3 }),
  // D209, the consoles (CHIP): each set after one classic soundtrack's chip and its composer's habits.
  /** The NES triangle (2A03, VRC6): no volume control, so it holds full until it stops; the 4-bit stair. */
  triBass: P({ osc: [{ wave: "tri4" }], amp: { a: 0.002, d: 0.05, s: 1, r: 0.02 }, level: 0.5 }),
  // Pokémon Red/Blue (Game Boy DMG, Masuda): two pulses with decaying envelopes, a delayed vibrato on
  // the lead, the wave channel (no envelope: it holds) under them.
  pkLead: P({ osc: [{ wave: "pulse50" }], filter: { freq: 5000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.6, s: 0.6, r: 0.03 }, vib: { depth: 14, rate: 6, delay: 0.25 }, level: 0.42 }),
  pkHarm: P({ osc: [{ wave: "pulse25" }], filter: { freq: 4600, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.45, s: 0.5, r: 0.03 }, level: 0.45 }),
  pkWave: P({ osc: [{ wave: "gbRamp" }], filter: { freq: 3800, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.05, s: 1, r: 0.02 }, level: 0.45 }),
  pkThin: P({ osc: [{ wave: "pulse12" }], filter: { freq: 4600, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.35, s: 0.5, r: 0.03 }, level: 0.52 }),
  // Pokémon Gold/Silver (Game Boy Color, Ichinose and Masuda): rounder wave samples, softer pulses, more vibrato.
  gsLead: P({ osc: [{ wave: "pulse25" }], filter: { freq: 3800, hz: true, q: 0.5 }, amp: { a: 0.004, d: 0.6, s: 0.7, r: 0.05 }, vib: { depth: 18, rate: 5.5, delay: 0.2 }, level: 0.36 }),
  gsHarm: P({ osc: [{ wave: "pulse50" }], filter: { freq: 2600, hz: true, q: 0.5 }, amp: { a: 0.004, d: 0.5, s: 0.65, r: 0.05 }, vib: { depth: 10, rate: 5.5, delay: 0.3 }, level: 0.36 }),
  gsWave: P({ osc: [{ wave: "gbRound" }], amp: { a: 0.003, d: 0.05, s: 1, r: 0.03 }, vib: { depth: 8, rate: 5, delay: 0.35 }, level: 0.3 }),
  gsEcho: P({ osc: [{ wave: "pulse12" }], filter: { freq: 3200, hz: true, q: 0.5 }, amp: { a: 0.004, d: 0.4, s: 0.55, r: 0.05 }, level: 0.44 }),
  gsBass: P({ osc: [{ wave: "gbRound" }], amp: { a: 0.003, d: 0.05, s: 1, r: 0.03 }, level: 0.4 }),
  // Super Mario Bros. (NES 2A03, Kondo): bouncy, short-enveloped pulses, hardly any vibrato.
  smbLead: P({ osc: [{ wave: "pulse50" }], filter: { freq: 6000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.25, s: 0.4, r: 0.03 }, level: 0.43 }),
  smbHarm: P({ osc: [{ wave: "pulse25" }], filter: { freq: 6000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.3, s: 0.45, r: 0.03 }, level: 0.46 }),
  smbThin: P({ osc: [{ wave: "pulse12" }], filter: { freq: 6000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.3, s: 0.45, r: 0.03 }, level: 0.53 }),
  // The Legend of Zelda (NES, Kondo): long held, heroic pulses, a slow vibrato.
  zLead: P({ osc: [{ wave: "pulse25" }], filter: { freq: 4500, hz: true, q: 0.5 }, amp: { a: 0.003, d: 0.4, s: 0.82, r: 0.05 }, vib: { depth: 12, rate: 5, delay: 0.3 }, level: 0.41 }),
  zHarm: P({ osc: [{ wave: "pulse50" }], filter: { freq: 3000, hz: true, q: 0.5 }, amp: { a: 0.003, d: 0.4, s: 0.72, r: 0.05 }, level: 0.43 }),
  zThin: P({ osc: [{ wave: "pulse12" }], filter: { freq: 4000, hz: true, q: 0.5 }, amp: { a: 0.003, d: 0.35, s: 0.6, r: 0.05 }, vib: { depth: 8, rate: 5, delay: 0.35 }, level: 0.5 }),
  // Mega Man 2 (NES, Tateishi): thin, driven pulse leads with a quick, wide vibrato; chugging staccato.
  mmLead: P({ osc: [{ wave: "pulse12" }], filter: { freq: 5000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.5, s: 0.85, r: 0.03 }, vib: { depth: 20, rate: 6.5, delay: 0.15 }, drive: 1.5, level: 0.15 }),
  mmHarm: P({ osc: [{ wave: "pulse25" }], filter: { freq: 5000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.4, s: 0.75, r: 0.03 }, vib: { depth: 12, rate: 6.5, delay: 0.2 }, level: 0.36 }),
  mmChug: P({ osc: [{ wave: "pulse50" }], filter: { freq: 4200, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.15, s: 0.35, r: 0.02 }, drive: 1, level: 0.5 }),
  // Castlevania III / Akumajou Densetsu (NES + Konami VRC6): the VRC6's sawtooth among the pulses; gothic vibrato.
  cvLead: P({ osc: [{ wave: "pulse25" }], filter: { freq: 4500, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.4, s: 0.8, r: 0.04 }, vib: { depth: 14, rate: 6, delay: 0.2 }, level: 0.34 }),
  cvSaw: P({ osc: [{ wave: "saw7" }], filter: { freq: 3400, hz: true, q: 0.7 }, amp: { a: 0.002, d: 0.4, s: 0.75, r: 0.04 }, vib: { depth: 8, rate: 6, delay: 0.3 }, level: 0.22 }),
  cvThin: P({ osc: [{ wave: "pulse12" }], filter: { freq: 4500, hz: true, q: 0.5 }, amp: { a: 0.002, d: 0.3, s: 0.55, r: 0.04 }, level: 0.6 }),
  cvBass: P({ osc: [{ wave: "tri4" }, { wave: "saw7", gain: 0.3 }], filter: { freq: 1400, hz: true, q: 0.7 }, amp: { a: 0.002, d: 0.05, s: 1, r: 0.02 }, level: 0.56 }),
  // Super Mario World (SNES SPC700, Kondo): sampled instruments, dulled by the chip's Gaussian
  // interpolation, in its echo: a brassy lead, a marimba, a plucky keyboard, strings, a round bass.
  smwLead: P({ osc: [{ wave: "saw" }], filter: { freq: 2.4, q: 1.2, env: 1.8, envDecay: 0.12 }, amp: { a: 0.01, d: 0.3, s: 0.72, r: 0.06 }, vib: { depth: 10, rate: 5.5, delay: 0.3 }, level: 0.34 }),
  smwMarimba: P({ osc: [{ wave: "sine" }, { wave: "bell", octave: 1, gain: 0.25 }], amp: { a: 0.002, d: 0.45, s: 0, r: 0.08 }, level: 0.45 }),
  smwKeys: P({ osc: [{ wave: "pulse50", gain: 0.5 }, { wave: "triangle" }], filter: { freq: 3, q: 1, env: 2, envDecay: 0.1 }, amp: { a: 0.003, d: 0.45, s: 0.3, r: 0.06 }, level: 0.6 }),
  smwStrings: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 9, gain: 0.7 }], filter: { freq: 1.9, q: 0.8 }, amp: { a: 0.05, d: 0.3, s: 0.85, r: 0.12 }, level: 0.6 }),
  smwBass: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.3 }], filter: { freq: 900, hz: true, q: 1, env: 1.6, envDecay: 0.08 }, amp: { a: 0.003, d: 0.4, s: 0.55, r: 0.05 }, level: 0.8 }),
  // The Legend of Zelda: A Link to the Past (SNES SPC700): the sampled orchestra: trumpet, strings, harp, horn, basses.
  lttpTrumpet: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 6, gain: 0.5 }], filter: { freq: 2.2, q: 1.2, env: 2, envDecay: 0.15 }, amp: { a: 0.03, d: 0.3, s: 0.8, r: 0.08 }, vib: { depth: 9, rate: 5.2, delay: 0.3 }, level: 0.28 }),
  lttpStrings: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: -8, gain: 0.7 }], filter: { freq: 2, q: 0.8 }, amp: { a: 0.06, d: 0.3, s: 0.85, r: 0.14 }, vib: { depth: 6, rate: 5, delay: 0.35 }, level: 0.4 }),
  lttpHarp: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: 1, gain: 0.3 }], amp: { a: 0.002, d: 0.7, s: 0, r: 0.1 }, level: 0.45 }),
  lttpHorn: P({ osc: [{ wave: "square", gain: 0.6 }, { wave: "sine" }], filter: { freq: 1.6, q: 0.8, env: 1.5, envDecay: 0.2 }, amp: { a: 0.05, d: 0.3, s: 0.85, r: 0.1 }, level: 0.38 }),
  lttpBass: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "sine" }], filter: { freq: 2, q: 0.8 }, amp: { a: 0.03, d: 0.3, s: 0.85, r: 0.08 }, level: 0.65 }),
  // Sonic the Hedgehog (Mega Drive YM2612 FM, Nakamura): an FM brass lead, glassy FM bells, a funky
  // FM clav, a snapping FM bass; a little drive for the chip's crossover grit.
  mdLead: P({ osc: [{ wave: "fmBrass" }], amp: { a: 0.005, d: 0.4, s: 0.8, r: 0.05 }, vib: { depth: 12, rate: 5.8, delay: 0.25 }, drive: 0.8, level: 0.25 }),
  mdBell: P({ osc: [{ wave: "fmBell" }], amp: { a: 0.002, d: 0.6, s: 0.3, r: 0.08 }, level: 0.44 }),
  mdClav: P({ osc: [{ wave: "fmBass" }], filter: { freq: 5, q: 1.5, env: 1.6, envDecay: 0.06 }, amp: { a: 0.002, d: 0.3, s: 0.35, r: 0.04 }, level: 0.6 }),
  mdBass: P({ osc: [{ wave: "fmBass" }], filter: { freq: 4, q: 1.2, env: 2.5, envDecay: 0.08 }, amp: { a: 0.002, d: 0.35, s: 0.6, r: 0.04 }, scoop: { cents: 90, time: 0.015 }, drive: 0.8, level: 0.55 }),
  // D200: instruments once given to single fugues (withdrawn in D208, kept for future ensembles), made on the bossa's lines (D193): a sine or
  // triangle body under any edge, each its own way of speaking, a slow vibrato in the sustained ones.
  /** A sung "oo" over a soft body: the vocal top of a stile antico consort. */
  choirOo: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.35 }, { wave: "sine", gain: 0.5 }], vowel: [480, 950], amp: { a: 0.09, d: 0.3, s: 0.85, r: 0.16 }, vib: { depth: 9, rate: 5, delay: 0.3 }, level: 0.6 }),
  /** The cornett: a lip-blown treble, likened to the voice; soft-edged, a little breath. */
  cornetto: P({ osc: [{ wave: "triangle", gain: 0.7 }, { wave: "sine", gain: 0.6 }, { wave: "saw", gain: 0.2 }], filter: { freq: 3.4, q: 1, env: 1.6, envDecay: 0.15 }, amp: { a: 0.04, d: 0.3, s: 0.82, r: 0.1 }, vib: { depth: 6, rate: 5, delay: 0.3 }, breath: 0.04, level: 0.33 }),
  /** The sackbut: the stile antico's tenor and bass brass, round and dark. */
  sackbut: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.3 }, { wave: "sine", gain: 0.5 }], filter: { freq: 2.2, q: 0.9, env: 1.8, envDecay: 0.25 }, amp: { a: 0.06, d: 0.4, s: 0.82, r: 0.14 }, vib: { depth: 3, rate: 4.6, delay: 0.5 }, level: 0.35 }),
  /** The viola da gamba: a bowed tenor and bass, sustained, darker than the cello (the bass viol's seventh string reaches A1). */
  gamba: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.35 }, { wave: "sine", gain: 0.4 }], filter: { freq: 2.8, q: 0.8, env: 1.4, envDecay: 0.2 }, amp: { a: 0.06, d: 0.5, s: 0.72, r: 0.16 }, vib: { depth: 6, rate: 4.6, delay: 0.4 }, level: 0.37 }),
  /** The violone: the bowed bass, round, slow to speak. */
  violone: P({ osc: [{ wave: "sine", gain: 0.8 }, { wave: "triangle", gain: 0.6 }, { wave: "saw", gain: 0.22 }], filter: { freq: 2.5, q: 0.7, env: 1.3, envDecay: 0.2 }, amp: { a: 0.07, d: 0.5, s: 0.7, r: 0.18 }, vib: { depth: 5, rate: 4.5, delay: 0.45 }, level: 0.42 }),
  /** The oboe d'amore: the oboe's darker, sweeter cousin. */
  oboeDamore: P({ osc: [{ wave: "reed", gain: 0.7 }, { wave: "sine", gain: 0.7 }], filter: { freq: 2.8, q: 0.9, env: 1.3, envDecay: 0.12 }, amp: { a: 0.06, d: 0.2, s: 0.86, r: 0.12 }, vib: { depth: 6, rate: 4.8, delay: 0.35 }, breath: 0.06, level: 0.43 }),
  /** The basset horn: a dark, breathing clarinet, for the laments' inner voices. */
  bassetHorn: P({ osc: [{ wave: "square", gain: 0.45 }, { wave: "sine", gain: 0.8 }], filter: { freq: 2.2, q: 0.6 }, amp: { a: 0.07, d: 0.3, s: 0.85, r: 0.14 }, vib: { depth: 4, rate: 4.5, delay: 0.45 }, breath: 0.1, level: 0.32 }),
  /** The traverso: the baroque flute, breathier and softer than the modern one. */
  traverso: P({ osc: [{ wave: "sine" }, { wave: "triangle", gain: 0.25 }, { wave: "sine", octave: 1, gain: 0.08 }], amp: { a: 0.06, d: 0.15, s: 0.88, r: 0.12 }, vib: { depth: 7, rate: 4.6, delay: 0.35 }, breath: 0.18, level: 0.36 }),
  /** The theorbo: a plucked bass, long-ringing and round. */
  theorbo: P({ osc: [{ wave: "triangle" }, { wave: "sine", gain: 0.8 }, { wave: "saw", gain: 0.12 }], filter: { freq: 3, q: 0.9, env: 1.8, envDecay: 0.1 }, amp: { a: 0.003, d: 1.5, s: 0, r: 0.12 }, level: 0.28 }),
  /** The celesta: a bell-like decay, glassy, without the vibraphone's tremolo. */
  celesta: P({ osc: [{ wave: "sine" }, { wave: "sine", octave: 2, gain: 0.18 }, { wave: "bell", gain: 0.12 }], amp: { a: 0.002, d: 0.9, s: 0, r: 0.15 }, level: 0.4 }),
  /** The marimba: wood, struck, short; repeated notes stay crisp. */
  marimba: P({ osc: [{ wave: "sine" }, { wave: "sine", octave: 2, gain: 0.1 }, { wave: "triangle", gain: 0.2 }], amp: { a: 0.002, d: 0.4, s: 0, r: 0.08 }, level: 0.47 }),
  /** The natural horn: mellow, sustained. */
  horn: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.25 }, { wave: "sine", gain: 0.4 }], filter: { freq: 2.2, q: 0.8, env: 2, envDecay: 0.3 }, amp: { a: 0.07, d: 0.4, s: 0.85, r: 0.14 }, vib: { depth: 5, rate: 4.8, delay: 0.4 }, level: 0.33 }),
  /** The clarino: the baroque trumpet's high register, bright over a sine body. */
  clarino: P({ osc: [{ wave: "triangle", gain: 0.8 }, { wave: "saw", gain: 0.35 }, { wave: "sine", gain: 0.4 }], filter: { freq: 3.2, q: 1, env: 2.4, envDecay: 0.2 }, amp: { a: 0.03, d: 0.3, s: 0.8, r: 0.1 }, vib: { depth: 6, rate: 5, delay: 0.4 }, level: 0.34 }),
  /** The harp: plucked, ringing longer and rounder than the lute. */
  harp: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: 1, gain: 0.15 }], filter: { freq: 5, q: 0.8, env: 1.5, envDecay: 0.1 }, amp: { a: 0.003, d: 1.1, s: 0, r: 0.12 }, level: 0.48 }),
  /** The lute-harpsichord (Lautenwerk, gut-strung; Bach owned two): a soft, quick pluck. */
  lautenwerk: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.2 }, { wave: "pulse25", octave: 1, gain: 0.08 }], filter: { freq: 4, q: 0.9, env: 1.8, envDecay: 0.1 }, amp: { a: 0.003, d: 0.8, s: 0, r: 0.1 }, level: 0.44 }),
  /** An organ's flute stop (a Gedackt): soft, a little chiff. */
  organFlute: P({ osc: [{ wave: "sine" }, { wave: "sine", octave: 1, gain: 0.3 }, { wave: "triangle", gain: 0.25 }], amp: { a: 0.03, d: 0.1, s: 1, r: 0.06 }, breath: 0.03, level: 0.3 }),
  /** An organ's reed stop (a soft Trompete): a cantus firmus colour. */
  organReed: P({ osc: [{ wave: "reed", gain: 0.7 }, { wave: "sine", gain: 0.5 }], filter: { freq: 3, q: 0.8 }, amp: { a: 0.02, d: 0.1, s: 1, r: 0.06 }, level: 0.43 }),
  /** The organ's pedal: a 16' bourdon under an 8'. */
  pedalBourdon: P({ osc: [{ wave: "sine" }, { wave: "sine", octave: -1, gain: 0.45 }, { wave: "organ", gain: 0.25 }], amp: { a: 0.03, d: 0.1, s: 1, r: 0.08 }, level: 0.4 }),
  // D266: the ensembles' recorded instruments (sampled.ts SAMPLED: looped, held while the thumb holds);
  // the synthesized sound stands in until a recording has loaded.
} satisfies Record<string, Patch>;

export type PatchId = keyof typeof PATCHES;
export type Groove = "rock" | "jazz" | "bossa" | "brushes" | "chamber" | "chipMarch" | "chipDrive" | "chipHalf" | "chipArcade" | "chipBounce" | "chipFunk" | "cr78" | "funk808" | "analogRock" | "analogSoft"
  // D200: loops once given to single fugues (withdrawn in D208).
  | "tactus" | "lament" | "toccata" | "gigue" | "passepied" | "minuet" | "sarabande" | "gavotte" | "overture" | "triplet";
/** The drums' sound: a band's kit, a console's noise channel, an analog drum machine's circuits. */
export type Kit = "acoustic" | "chip" | "analog";

export interface Preset {
  id: string;
  name: string;
  /** The voices' instruments from the top down: top, upper inner, inner, lower inner, bass. Null: the classic chip sound. */
  slots: [PatchId, PatchId, PatchId, PatchId, PatchId] | null;
  /** A band's rhythm section, always. */
  groove?: Groove;
  /** D181, D193: ACOUSTIC, CHIP and MOOG: a drum loop, when DRUMS is on; and its kit. */
  drums?: Groove;
  kit?: Kit;
  /** The room's share (0.16 by default; the bands more). */
  room?: number;
}

export const FAMILIES: { name: string; presets: Preset[] }[] = [
  {
    name: "ACOUSTIC",
    presets: [
      { id: "strings", name: "STRINGS", slots: ["violin", "violin2", "viola", "viola", "cello"], drums: "chamber", room: 0.3 },
      { id: "baroque", name: "BAROQUE BAND · SYNTH", slots: ["oboe", "violin", "harpsichord", "harpsichord", "cello"], drums: "chamber", room: 0.28 },
      { id: "winds", name: "WINDS", slots: ["flute", "oboe", "clarinet", "clarinet", "bassoon"], drums: "chamber", room: 0.3 },
      { id: "consort", name: "CONSORT", slots: ["recorder", "lute", "viol", "viol", "harpsiBass"], drums: "chamber", room: 0.28 },
      // D190: recorded, every voice on the one instrument (as Bach played his fugues).
      { id: "harpsichordSampled", name: "HARPSICHORD (SAMPLED)", slots: ["harpsiSampled", "harpsiSampled", "harpsiSampled", "harpsiSampled", "harpsiBassSampled"], room: 0.24 },
      // D249: the sampled organ withdrawn until the new organs (ORGAN_SAMPLED, below, kept for them).
      // D219: the player's voice over Kimiko Ishizaka's piano (WITH KIMIKO ISHIZAKA's default): a breathy,
      // sustained baroque flute on top, a soft stopped organ flute below: no hammer, so heard apart from her.
      { id: "traverso", name: "TRAVERSO", slots: ["traverso", "traverso", "traverso", "organFlute", "organFlute"], room: 0.2 },
    ],
  },
  {
    name: "BANDS",
    presets: [
      { id: "bossa", name: "BOSSA NOVA", slots: ["softFlute", "rhodes", "nylonGuitar", "nylonGuitar", "softBass"], groove: "bossa", room: 0.3 },
    ],
  },
  {
    name: "CHIP",
    presets: [
      // D209: the ten consoles. The classic sound (the game's own: 2A03-like pulses of three widths over a triangle), then
      // nine after classic soundtracks, each named for its world, not its trademark. Slots top to bottom; with three
      // voices slots 0, 2, 4 play, with four 0, 1, 3, 4, so those sets differ within themselves.
      { id: "chip", name: "CLASSIC CHIP", slots: null, drums: "chipMarch", kit: "chip", room: 0.22 },
      { id: "chipPocket", name: "POCKET MONSTERS · GB", slots: ["pkLead", "pkHarm", "pkThin", "pkThin", "pkWave"], drums: "chipHalf", kit: "chip", room: 0.18 },
      { id: "chipGold", name: "GOLD & SILVER · GBC", slots: ["gsLead", "gsHarm", "gsEcho", "gsWave", "gsBass"], drums: "chipHalf", kit: "chip", room: 0.2 },
      { id: "chipPlumber", name: "PLUMBER BROS · NES", slots: ["smbLead", "smbHarm", "smbThin", "smbThin", "triBass"], drums: "chipBounce", kit: "chip", room: 0.2 },
      { id: "chipHyrule", name: "HYRULE QUEST · NES", slots: ["zLead", "zHarm", "zThin", "zThin", "triBass"], drums: "chipMarch", kit: "chip", room: 0.22 },
      { id: "chipBomber", name: "BLUE BOMBER · NES", slots: ["mmLead", "mmHarm", "mmChug", "mmChug", "triBass"], drums: "chipDrive", kit: "chip", room: 0.2 },
      { id: "chipVampire", name: "VAMPIRE KILLER · VRC6", slots: ["cvLead", "cvSaw", "cvSaw", "cvThin", "cvBass"], drums: "chipArcade", kit: "chip", room: 0.24 },
      { id: "chipDino", name: "DINOSAUR LAND · SNES", slots: ["smwLead", "smwMarimba", "smwKeys", "smwStrings", "smwBass"], drums: "chipBounce", kit: "chip", room: 0.32 },
      { id: "chipLight", name: "LIGHT WORLD · SNES", slots: ["lttpTrumpet", "lttpStrings", "lttpHarp", "lttpHorn", "lttpBass"], drums: "chipMarch", kit: "chip", room: 0.34 },
      { id: "chipBlur", name: "BLUE BLUR · MEGA DRIVE", slots: ["mdLead", "mdBell", "mdClav", "mdClav", "mdBass"], drums: "chipFunk", kit: "chip", room: 0.24 },
    ],
  },
  {
    name: "MOOG",
    presets: [
      // D209: Switched-On Bach had no drums, so none here.
      { id: "carlos", name: "WENDY CARLOS", slots: ["carlosLead", "carlosReed", "carlosPluck", "carlosWood", "carlosBass"], room: 0.26 },
    ],
  },
];

/**
 * D249: the sampled organ, out of the players' choices (FAMILIES, PRESETS) until the new organs come
 * (ROADMAP Batch 2); set only as a preset object (setPreset(ORGAN_SAMPLED)), by the tests.
 */
export const ORGAN_SAMPLED: Preset = { id: "organSampled", name: "ORGAN (SAMPLED)", slots: ["organSampled", "organSampled", "organSampled", "organSampled", "organSampled"], room: 0.24 };

export const PRESETS = FAMILIES.flatMap((f) => f.presets);
/** D249: presets withdrawn, and what a stored choice of one opens as instead. */
/** D288: the sampled ensembles withdrawn (muddled on a phone speaker): a choice of one plays classic chip. */
export const RETIRED: Readonly<Record<string, string>> = { organSampled: "harpsichordSampled", stringsReal: "chip", baroqueBand: "chip", reedTrio: "chip", windTrio: "chip", clarinetTrio: "chip", windsReal: "chip", galantTrio: "chip" };
/** A preset by its id (a withdrawn one's stand-in, D249; else CLASSIC CHIP). */
export const presetById = (id: string) => PRESETS.find((p) => p.id === (RETIRED[id] ?? id)) ?? PRESETS.find((p) => p.id === "chip")!;

/** Which of the five slots each of n voices takes (from the top down). */
export function slotOf(voice: number, count: number): number {
  const map: Record<number, number[]> = { 1: [0], 2: [0, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };
  return (map[count] ?? map[5])[Math.min(voice, (map[count] ?? map[5]).length - 1)];
}

/** The ensemble playing now (set from the settings), and whether CHIP's and MOOG's drums play. */
let current: Preset = presetById("bossa");
let drumsOn = true;
/** By its id, or a preset itself. */
export function setPreset(id: string | Preset) {
  current = typeof id === "string" ? presetById(id) : id;
}
export function preset(): Preset {
  return current;
}
export function setDrums(on: boolean) {
  drumsOn = on;
}
export const drums = () => drumsOn;
/** The groove playing now, if any: a band's always, CHIP's and MOOG's when DRUMS is on. */
export function grooveNow(): { groove: Groove; kit: Kit } | null {
  const g = current.groove ?? (drumsOn ? current.drums : undefined);
  return g ? { groove: g, kit: current.kit ?? "acoustic" } : null;
}

/** D190: the recorded instruments the ensemble now plays, if any. */
export function sampledNow(): SampledId[] {
  return [...new Set((current.slots ?? []).map((id) => PATCHES[id].sample).filter((s): s is SampledId => !!s))];
}

/** A voice's patch in the ensemble now, or null for the classic chip sound. */
export function patchFor(voice: number, count: number): Patch | null {
  return current.slots ? PATCHES[current.slots[slotOf(voice, count)]] : null;
}

export type Drum = "kick" | "snare" | "hat" | "ride" | "rim" | "brush" | "shaker" | "clap";

/**
 * The rhythm section's hits in one beat: which drum, where in the beat (0 to 1), how strong. `b` is
 * the beat's place in the bar, `bar` the bar's number, `per` the beats in a bar, `compound` whether
 * the beat divides in three.
 */
export function grooveHits(g: Groove, b: number, bar: number, per: number, compound: boolean): { drum: Drum; at: number; vel: number }[] {
  const subs = compound ? [0, 1 / 3, 2 / 3] : [0, 0.5];
  const back = per % 2 === 0 ? b % 2 === 1 : b > 0;
  const out: { drum: Drum; at: number; vel: number }[] = [];
  switch (g) {
    // D193: every loop lighter, after the bossa's: the snare under the voices, the hats softer.
    case "rock":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 0.75 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.55 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.32 : 0.5 });
      if (per === 4 && b === 2) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.45 });
      break;
    case "jazz":
      out.push({ drum: "ride", at: 0, vel: 0.8 });
      if (back) out.push({ drum: "ride", at: subs[subs.length - 1], vel: 0.5 }, { drum: "hat", at: 0, vel: 0.6 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.35 });
      break;
    case "bossa": {
      for (const s of subs) out.push({ drum: "shaker", at: s, vel: s ? 0.4 : 0.6 });
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 0.6 });
      if (b === per - 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.45 });
      // The clave-like rim over two bars.
      const pattern = bar % 2 === 0 ? [0, 3, 6] : [2, 4];
      for (const k of pattern) if (Math.floor(k / subs.length) === b) out.push({ drum: "rim", at: subs[k % subs.length], vel: 0.6 });
      break;
    }
    // D193: the acoustic ensembles' loop: the bossa's shaker and soft kick, a frame-drum rim on the
    // bar's last beat; no backbeat (the music's own metre leads).
    case "chamber":
      for (const s of subs) out.push({ drum: "shaker", at: s, vel: s ? 0.28 : 0.42 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.42 });
      if (b === per - 1) out.push({ drum: "rim", at: subs[subs.length - 1], vel: 0.35 });
      break;
    case "brushes":
      out.push({ drum: "brush", at: 0, vel: 0.7 });
      if (back) out.push({ drum: "hat", at: 0, vel: 0.4 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.3 });
      break;
    // D181, the consoles' loops (CHIP).
    case "chipMarch":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 0.7 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.5 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: 0.26 });
      break;
    case "chipDrive":
      out.push({ drum: "kick", at: 0, vel: b === 0 ? 0.7 : 0.5 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.52 });
      out.push({ drum: "hat", at: subs[subs.length - 1], vel: 0.38 });
      break;
    case "chipHalf":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.7 });
      if (b === Math.floor(per / 2) && per > 1) out.push({ drum: "snare", at: 0, vel: 0.5 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.25 : 0.4 });
      break;
    case "chipArcade":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.7 });
      if (b === 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.5 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.5 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: 0.24 });
      break;
    // D209: a bouncing platformer's loop (kick on the downbeat, hats off the beat, a bongo-like click
    // before the next beat) and a Mega Drive funk (a syncopated kick, the backbeat, every hat).
    case "chipBounce":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 0.65 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.4 });
      if (subs.length > 1) out.push({ drum: "hat", at: subs[1], vel: 0.3 });
      out.push({ drum: "rim", at: subs[subs.length - 1], vel: b === per - 1 ? 0.4 : 0.25 });
      break;
    case "chipFunk":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.7 });
      if (b === Math.max(1, per - 2)) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.5 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.5 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.22 : 0.32 });
      break;
    // The analog drum machines' loops (MOOG).
    case "cr78":
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.3 : 0.45 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.8 });
      if (b === per - 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.55 });
      if (back) out.push({ drum: "rim", at: 0, vel: 0.5 });
      break;
    case "funk808":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.75 });
      if (b === 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.55 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.45 }, { drum: "clap", at: 0, vel: 0.35 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.25 : 0.36 });
      break;
    case "analogRock":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 0.72 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.52 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: 0.3 });
      break;
    case "analogSoft":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.6 });
      for (const s of subs) out.push({ drum: "shaker", at: s, vel: s ? 0.25 : 0.4 });
      if (b === per - 1) out.push({ drum: "rim", at: subs[subs.length - 1], vel: 0.45 });
      break;
    // D200: the loops once given to single fugues, after the bossa's (D193): soft, above the voices;
    // no snare, no clap, nothing after the downbeat louder than it, so the written metre leads.
    case "tactus":
      // The stile antico's beat: a breath of kick on the bar, a soft shaker on each beat.
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.32 });
      out.push({ drum: "shaker", at: 0, vel: b === 0 ? 0.26 : 0.17 });
      break;
    case "lament":
      // A slow heartbeat on the bar's first beat, and nothing else.
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.36 }, { drum: "kick", at: 0.3, vel: 0.2 });
      break;
    case "toccata":
      // A light motor: the shaker in sixteenths (or the beat's thirds), a soft kick on the bar and its
      // middle, a rim lifting into the next bar.
      for (const s of compound ? subs : [0, 0.25, 0.5, 0.75]) out.push({ drum: "shaker", at: s, vel: s === 0 ? 0.34 : s === 0.5 ? 0.24 : 0.16 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.48 });
      else if (per === 4 && b === 2) out.push({ drum: "kick", at: 0, vel: 0.34 });
      if (b === per - 1 && per > 1) out.push({ drum: "rim", at: subs[subs.length - 1], vel: 0.3 });
      break;
    case "gigue":
      // The long-short lilt: the shaker on the beat and its last third, the kick on the bar (softer on
      // the bar's middle beat), a rim on the last third of the bar.
      if (compound) {
        out.push({ drum: "shaker", at: 0, vel: b === 0 ? 0.38 : 0.28 }, { drum: "shaker", at: 2 / 3, vel: 0.22 });
        if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.5 });
        else if (per === 4 && b === 2) out.push({ drum: "kick", at: 0, vel: 0.34 });
        if (b === per - 1) out.push({ drum: "rim", at: 2 / 3, vel: 0.3 });
      } else {
        out.push({ drum: "shaker", at: 0, vel: b === 0 ? 0.36 : 0.24 }, { drum: "shaker", at: 0.75, vel: 0.2 });
        if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.48 });
      }
      break;
    case "passepied":
      // Quick triple time felt one in a bar: the kick on the bar, the shaker on each beat, the rim lifting the last.
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.48 });
      out.push({ drum: "shaker", at: 0, vel: b === 0 ? 0.34 : 0.2 });
      if (b === per - 1 && per > 1) out.push({ drum: "rim", at: 0, vel: 0.26 });
      break;
    case "minuet":
      // Triple time: the kick on one, the shaker in the halves, a soft rim on the last beat.
      for (const s of subs) out.push({ drum: "shaker", at: s, vel: s ? 0.18 : b === 0 ? 0.32 : 0.24 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.46 });
      if (b === per - 1 && per > 1) out.push({ drum: "rim", at: 0, vel: 0.28 });
      break;
    case "sarabande":
      // The weight on the second beat of three: a soft kick on one, a brush on two, a breath on three
      // (in 6/4 the same within each dotted half).
      if (compound) {
        if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.42 });
        out.push({ drum: "shaker", at: 0, vel: 0.2 }, { drum: "brush", at: 1 / 3, vel: 0.34 }, { drum: "shaker", at: 2 / 3, vel: 0.14 });
      } else {
        if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.42 }, { drum: "shaker", at: 0, vel: 0.22 });
        else if (b === 1) out.push({ drum: "brush", at: 0, vel: 0.34 });
        else out.push({ drum: "shaker", at: 0, vel: 0.14 });
      }
      break;
    case "gavotte":
      // Two in a bar, phrased from the half bar: the kick on one, a rim on the half bar's upbeat, the shaker in the halves.
      for (const s of subs) out.push({ drum: "shaker", at: s, vel: s ? 0.18 : 0.3 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.46 });
      if (b === per - 1 && per > 1) out.push({ drum: "rim", at: 0, vel: 0.3 });
      break;
    case "overture":
      // The French overture: a timpani-like kick on one (and, softer, three), the shaker dotted (the beat and its last sixteenth).
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.5 });
      else if (per === 4 && b === 2) out.push({ drum: "kick", at: 0, vel: 0.38 });
      out.push({ drum: "shaker", at: 0, vel: b === 0 ? 0.32 : 0.24 }, { drum: "shaker", at: 0.75, vel: 0.2 });
      break;
    case "triplet":
      // A beat in three in simple time: the shaker on the triplets, the kick on one, a rim on the bar's last triplet.
      for (const s of [0, 1 / 3, 2 / 3]) out.push({ drum: "shaker", at: s, vel: s === 0 ? 0.32 : s > 0.5 ? 0.22 : 0.16 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.48 });
      if (b === per - 1 && per > 1) out.push({ drum: "rim", at: 2 / 3, vel: 0.28 });
      break;
  }
  return out;
}

/**
 * D186: the layers a run of right notes adds over the band (or the click), beat by beat: from ×2 a
 * shaker on the half beats, from ×3 a clap on the back beats, at ×4 the kick on every beat and a ride
 * on the bar's first. `level` 0 to 3; `b` the beat in the bar, `per` beats a bar.
 */
export function layerHits(level: number, b: number, per: number, compound: boolean): { drum: Drum; at: number; vel: number }[] {
  const out: { drum: Drum; at: number; vel: number }[] = [];
  if (level >= 1) {
    const subs = compound ? 3 : 2;
    for (let i = 0; i < subs; i++) out.push({ drum: "shaker", at: i / subs, vel: i === 0 ? 0.2 : 0.13 });
  }
  const back = per % 2 === 0 ? b % 2 === 1 : per === 3 ? b === 2 : b === per - 1;
  if (level >= 2 && back) out.push({ drum: "clap", at: 0, vel: 0.32 });
  if (level >= 3) {
    out.push({ drum: "kick", at: 0, vel: b === 0 ? 0.6 : 0.42 });
    if (b === 0) out.push({ drum: "ride", at: 0, vel: 0.35 });
  }
  return out;
}
