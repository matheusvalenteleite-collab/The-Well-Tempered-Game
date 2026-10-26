/**
 * The ensembles (D177): presets that give each voice an instrument of its own, chosen together so
 * the voices stand apart and sound well together (some sustained, some plucked and dying away; bright
 * above, round below), in four families: ACOUSTIC, BANDS (with a rhythm section), CHIP and MOOG. All
 * is synthesized (oscillators, filters, envelopes, a little drive, vowel formants); D190 adds two
 * recorded instruments (sampled.ts), whose patches keep a synthesized sound for any note not loaded yet.
 * A patch is played by chip.ts; the player's own voice takes its patch, shaped by the touch.
 * D292: the players now choose among five sounds only (PRESETS); the other patches are kept for later.
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
  /**
   * D294, GAME BOY: the wave channel's bass sample: a falling 4-bit sawtooth (32 steps, 15 down to 0,
   * each level twice). Every harmonic in it (1/n), so a bass a phone's speaker can follow (D291), and
   * the stair's faint buzz of the real channel.
   */
  gbSaw: (x: number) => {
    const k = Math.floor(x * 32) % 32;
    return Math.round(15 - (k * 15) / 31) / 7.5 - 1;
  },
  /**
   * D294: the wave channel's second sample, for a further voice: a 4-bit square with stepped shoulders
   * (two steps up, fourteen held, two down, fourteen held): hollow (odd harmonics), its top softer than a
   * pulse's, so it stands apart from the pulses and from the sawtooth bass.
   */
  gbHollow: (x: number) => {
    const k = Math.floor(x * 32) % 32;
    const v = k < 2 ? 5 + k * 5 : k < 16 ? 15 : k < 18 ? 15 - (k - 15) * 5 : 0;
    return Math.round(v) / 7.5 - 1;
  },
  /** The VRC6 sawtooth (Akumajou Densetsu): an accumulator reset every seventh step, a 7-step stair. */
  saw7: (x: number) => Math.floor((x % 1) * 7) / 3 - 1,
  /** YM2612 FM, one carrier under a modulator fed by another (feedback-like): the gritty Mega Drive bass. */
  fmBass: (x: number) => Math.sin(TAU * x + 2.2 * Math.sin(TAU * x + 0.9 * Math.sin(TAU * x))),
  /** FM brass: a 1:1 modulator, index 1.6 (a rounded sawtooth with a bite). */
  fmBrass: (x: number) => Math.sin(TAU * x + 1.6 * Math.sin(TAU * x)),
  /** An FM bell / electric piano: a 1:7 modulator (partials 1, 6, 8, 13, 15): glassy. */
  fmBell: (x: number) => Math.sin(TAU * x + 1.3 * Math.sin(7 * TAU * x)),
  /**
   * D292: an FM piano's string: a 1:1 modulator (index 1.3) with a little of the octave (0.35), so the
   * low harmonics a struck string has (1 to about 6), falling smoothly; the patch's filter closes on it
   * as a piano's tone darkens while it dies away.
   */
  fmPiano: (x: number) => Math.sin(TAU * x + 1.3 * Math.sin(TAU * x) + 0.35 * Math.sin(2 * TAU * x)),
  /** D292: the FM piano's bass string: a deeper 1:1 index (2.1), so its overtones reach a phone's speaker (D291). */
  fmPianoBass: (x: number) => Math.sin(TAU * x + 2.1 * Math.sin(TAU * x) + 0.4 * Math.sin(2 * TAU * x)),
  // D297, CHAMBER ORGAN: a positive organ's stops, each drawn from its partials (amplitudes, harmonic 1 up).
  /** Principal 8' with the Octave 4' drawn: every harmonic, the even ones (the 4') strong: bright, singing. */
  stopPrincipal: (x: number) => partials(x, [1, 0.95, 0.35, 0.5, 0.18, 0.22, 0.08, 0.12, 0.04, 0.05]),
  /** Gedackt 8' (a stopped flute): the fundamental and the odd harmonics a little, hollow; the twelfth (3) for a phone. */
  stopGedackt: (x: number) => partials(x, [1, 0.04, 0.42, 0.03, 0.16, 0.02, 0.07]),
  /** Krummhorn 8' (a reed with a cylindrical resonator): the odd harmonics strong far up, nasal and buzzy. */
  stopKrummhorn: (x: number) => partials(x, [0.7, 0.12, 1, 0.12, 0.85, 0.1, 0.7, 0.1, 0.55, 0.08, 0.42, 0.06, 0.3, 0.05, 0.22]),
  /** Spitzflöte 8' (a conical flute): soft, every harmonic falling; between the Gedackt and the Principal (enough upper ones for a phone). */
  stopSpitz: (x: number) => partials(x, [1, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08]),
  /** The pedal's Posaune 8' (a trombone reed): every harmonic, slowly falling, so it carries on a phone (D291). */
  stopPosaune: (x: number) => partials(x, [0.8, 1, 0.85, 0.75, 0.62, 0.55, 0.45, 0.4, 0.32, 0.28, 0.22, 0.18, 0.14, 0.12, 0.1, 0.08]),
  /** D302, PIPE ORGAN: Trompete 8' (a conical reed, its brass): every harmonic, the 2nd to 5th strongest, bright far up. */
  stopTrompete: (x: number) => partials(x, [0.55, 0.85, 1, 0.95, 0.85, 0.74, 0.62, 0.52, 0.44, 0.36, 0.3, 0.25, 0.2, 0.17, 0.14, 0.12, 0.1, 0.08, 0.07, 0.06, 0.05, 0.045, 0.04, 0.035, 0.03, 0.026, 0.022, 0.019, 0.016, 0.014]),
  /**
   * D302, VOCAL SYNTH: the source under the formants: a pulse train nearly flat in its harmonics (n^-0.4),
   * as formant synthesis wants, so that each formant sounds at its tabled level (VOWELS) whatever the pitch.
   */
  glottal: (x: number) => partials(x, Array.from({ length: 64 }, (_, k) => 1 / (k + 1) ** 0.4)),
  /**
   * D304: a softer glottis (a more open phase: a mezzo's, a second soprano's): the harmonics falling
   * about 5 dB an octave (n^-0.8), so the high ones no longer buzz through the formants' skirts.
   */
  glottalWarm: (x: number) => partials(x, Array.from({ length: 64 }, (_, k) => 1 / (k + 1) ** 0.8)),
  /**
   * D304: a man's voice sung gently: about 7 dB an octave (n^-1.2). The flat source made the tenor and
   * the bass a buzzing, trumpet-like pulse train (each glottal pulse a click above 5 kHz: 1,700 in the
   * bass's 20 s alone, measured); steeper (12 dB an octave was tried) left them 15 dB softer through a
   * phone's speaker than on a full-range one (D291).
   */
  glottalLow: (x: number) => partials(x, Array.from({ length: 64 }, (_, k) => 1 / (k + 1) ** 1.2)),
  /**
   * D304, MODULAR: a West-coast wavefolder (a Buchla 259's timbre): a triangle folded back on itself
   * (sin of 3 times it, a little offset): the fundamental strongest, the 2nd and 3rd 3-6 dB under, then
   * the odd harmonics falling slowly (-18 dB at the 5th, -29 at the 9th): a woody buzz.
   */
  folded: (x: number) => Math.sin(3 * (1 - 4 * Math.abs(((x + 0.25) % 1) - 0.5)) + 0.6),
  /**
   * D304, MODULAR: a hard-synced sawtooth (an East-coast lead's): a slave sawtooth reset by the master
   * every period, running 1.5 times as fast, over the master's own sawtooth: the fundamental strongest,
   * a formant-like lift about the 3rd and 6th harmonics (the sync's tearing edge).
   */
  hardSync: (x: number) => (0.7 * (2 * ((1.5 * x) % 1) - 1) + 0.6 * (2 * x - 1)) / 1.3,
  /** D302: a 4' flute (Rohrflöte): the fundamental, a little of the 2nd and 3rd (the chimney's). */
  stopFlute4: (x: number) => partials(x, [1, 0.1, 0.2, 0.04]),
} satisfies Record<string, (x: number) => number>;
export type ShapedWave = keyof typeof SHAPES;
/** D297: a periodic wave from its partials' amplitudes (sines in phase), over their sum (within -1..1; the PeriodicWave normalises it anyway). */
function partials(x: number, amps: number[]): number {
  let y = 0;
  for (let k = 0; k < amps.length; k++) y += amps[k] * Math.sin(TAU * (k + 1) * x);
  return y / amps.reduce((a, b) => a + b, 0);
}
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
  /** A lowpass (or bandpass) at `freq` times the note's frequency (or Hz when `hz`), opened `env` times at the attack, closing over `envDecay` s; D294: `poles` 4, two in a row (24 dB an octave, a Moog ladder's slope, the resonance on the first); D302: `sweep`, the cutoff moving slowly with the clock by `octaves` either way at `rate` Hz (TOMITA). */
  filter?: { freq: number; hz?: boolean; q?: number; env?: number; envDecay?: number; type?: BiquadFilterType; poles?: 2 | 4; sweep?: { rate: number; octaves: number } };
  /**
   * D294: a Game Boy volume envelope (the pulse channels' NRx2): the note starts at `from` (of 15) and
   * falls one step every `period` 64ths of a second, abruptly as the hardware does, down to `to`, where
   * it holds (amp.s should be to / from).
   */
  steps?: { from: number; to: number; period: number };
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
  /**
   * D297, a period preset's recorded note shaped as the console's envelope shaped its sample (without
   * it a recording plays as recorded): attack `a`, a fall to `s` of the peak (time constant `d`/3),
   * then, held, an exponential fall toward silence with time constant `fade` (s: the SNES's GAIN
   * "exponential decrease", a sustain that is not one), and `r` (s) to let go.
   */
  rec?: { a: number; d: number; s: number; fade?: number; r: number };
  /**
   * D297, MEGA FM: two-operator FM (the YM2612's way): a sine modulator at `ratio` times the note into
   * every oscillator's frequency, its index (the peak deviation over the modulator's frequency) from
   * `index` falling to `to` over `time` s (bright onset, mellower body); `rise`: first rising to
   * `rise.to` within `rise.time` s (a brass's blare); `mod2`: a second modulator, a fixed index (the
   * operator feedback's extra harmonics, which Web Audio cannot loop sample by sample). D302: `mod2.to`
   * and `time`, its index falling too (an e-piano's tine, a slap's click); `fb`, the modulator fed back
   * on itself (chip.ts feedback: its wave brighter, toward a sawtooth); `detune`, the modulator so many
   * cents off its ratio (the chip's DT1: the timbre beating slowly, not a unison's chorus).
   */
  fm?: { ratio: number; index: number; to: number; time: number; rise?: { to: number; time: number }; mod2?: { ratio: number; index: number; to?: number; time?: number }; fb?: number; detune?: number };
  /** D297: the oscillators' sum quantised to so many bits before the envelope (the YM2612's 9-bit DAC grain). */
  bits?: number;
  /** D297: a high-pass (Hz, 12 dB an octave) under the note (the presets' 120 Hz floor: no boom for a phone's limiter). */
  hp?: number;
  /** D297: the share of the note sent to its preset's own effect (Preset.fx: the echo or the hall); none, dry. */
  send?: number;
  /**
   * D297, SID 64: the sawtooth oscillators made pulses of a moving width (the SID's pulse-width
   * modulation): each sawtooth less itself delayed by `width` of a period, the width swinging by
   * `depth` either way at `rate` Hz (0: a fixed width).
   */
  pwm?: { width: number; depth: number; rate: number };
  /**
   * D297, CHAMBER ORGAN: a pipe's speech: a breath of noise at the onset (band-passed about the
   * `at`th harmonic, peak `level` of the note's), gone within `time` s.
   */
  chiff?: { level: number; time: number; at: number };
  /**
   * D297, SWITCHED-ON and MODULAR: the analog drift: each note a little out of tune, by up to `cents`,
   * the offset wandering slowly with time (a sine of `rate` Hz over the clock, so a voice's notes move
   * together and each voice, its own rate, apart from the others).
   */
  drift?: { cents: number; rate: number };
  /** D302: a portamento (s) into a joined note, from the note before's pitch (Play.from): TOMITA's whistle, TRACKER's tone portamento. */
  slide?: number;
  /** D302, TOMITA's phased strings: two allpass stages swept with the clock between `lo` and `hi` Hz at `rate`, beside the dry sound. */
  phaser?: { rate: number; lo: number; hi: number };
  /** D302, TOMITA's theatrical stereo: the voice's place wandering by `depth` at `rate` Hz with the clock (within ±0.35). */
  autopan?: { rate: number; depth: number };
  /** D302, VOCAL SYNTH: a sung voice (chip.ts singNote, Sing). */
  sing?: Sing;
  /**
   * D302, SOLO VOICES: a sung recording's syllable (chip.ts sampledNote): a new syllable begun with its
   * consonant (`cons`, CONSONANTS: the voice opening from a lowpass, a plosive's burst), the pitch
   * scooped from `scoop` cents below to `over` above; joined, the vowel goes on, the pitch gliding from
   * the note before (Play.from); a phrase's end falls `fall` cents.
   */
  syllable?: { cons: Sing["cons"]; scoop: number; over: number; fall: number };
}

/**
 * D302, VOCAL SYNTH: a singing voice by formant synthesis (chip.ts singNote), after the character
 * singing synthesizers' manner: a glottal source (SHAPES.glottal) and breath noise through five
 * formants in parallel (VOWELS: the vowel `vowel` of the voice type `type`, scaled by `size`: under 1
 * a larger vocal tract, over 1 a smaller, younger one); each new syllable begun with its consonant
 * (`cons`: "l", "d", "n", "r" or "m": the formants coming from the consonant's into the vowel's, a
 * plosive's burst, a nasal's murmur, a tap's dip), the pitch scooped up from `scoop` cents below to
 * `over` cents above and settling (the onset's "shakuri"), the vibrato late (Patch.vib); a joined note
 * no new syllable: the vowel goes on, the pitch glides from the note before (Play.from) with the same
 * small overshoot; at a phrase's end (Play.final) the pitch falls `fall` cents as the voice lets go;
 * `breath` the breathiness (0-1); `ring` a lift (dB) about 3 kHz, the bright, forward "idol" timbre
 * (and the band a phone's speaker gives best).
 */
export interface Sing {
  vowel: Vowel;
  type: VoiceType;
  size: number;
  cons: "l" | "d" | "n" | "r" | "m";
  scoop: number;
  over: number;
  fall: number;
  breath: number;
  ring: number;
  /** D304: a lowpass (Hz, 12 dB an octave) over the voice: nothing glitters above the singer's formants. */
  top?: number;
  /** D304: the formants' bandwidths times this (over 1: lower Qs, a softer, less "ringing" vowel). */
  bw?: number;
  /** D304: dB on F3-F5 (the singer's formant: under 0 less brassy). */
  upper?: number;
}
export type Vowel = "a" | "e" | "i" | "o" | "u";
export type VoiceType = "soprano" | "alto" | "tenor" | "bass";
/**
 * D302: five formants (Hz, dB, bandwidth Hz) of each vowel sung by each voice type: the classic
 * singing-voice formant table of formant synthesis (as tabulated in the Csound manual's appendix of
 * formant values), rounded.
 */
export const VOWELS: Record<VoiceType, Record<Vowel, [number, number, number][]>> = {
  soprano: {
    a: [[800, 0, 80], [1150, -6, 90], [2900, -32, 120], [3900, -20, 130], [4950, -50, 140]],
    e: [[350, 0, 60], [2000, -20, 100], [2800, -15, 120], [3600, -40, 150], [4950, -56, 200]],
    i: [[270, 0, 60], [2140, -12, 90], [2950, -26, 100], [3900, -26, 120], [4950, -44, 120]],
    o: [[450, 0, 70], [800, -11, 80], [2830, -22, 100], [3800, -22, 130], [4950, -50, 135]],
    u: [[325, 0, 50], [700, -16, 60], [2700, -35, 170], [3800, -40, 180], [4950, -60, 200]],
  },
  alto: {
    a: [[800, 0, 80], [1150, -4, 90], [2800, -20, 120], [3500, -36, 130], [4950, -60, 140]],
    e: [[400, 0, 60], [1600, -24, 80], [2700, -30, 120], [3300, -35, 150], [4950, -60, 200]],
    i: [[350, 0, 50], [1700, -20, 100], [2700, -30, 120], [3700, -36, 150], [4950, -60, 200]],
    o: [[450, 0, 70], [800, -9, 80], [2830, -16, 100], [3500, -28, 130], [4950, -55, 135]],
    u: [[325, 0, 50], [700, -12, 60], [2530, -30, 170], [3500, -40, 180], [4950, -64, 200]],
  },
  tenor: {
    a: [[650, 0, 80], [1080, -6, 90], [2650, -7, 120], [2900, -8, 130], [3250, -22, 140]],
    e: [[400, 0, 70], [1700, -14, 80], [2600, -12, 100], [3200, -14, 120], [3580, -20, 120]],
    i: [[290, 0, 40], [1870, -15, 90], [2800, -18, 100], [3250, -20, 120], [3540, -30, 120]],
    o: [[400, 0, 40], [800, -10, 80], [2600, -12, 100], [2800, -12, 120], [3000, -26, 120]],
    u: [[350, 0, 40], [600, -20, 60], [2700, -17, 100], [2900, -14, 120], [3300, -26, 120]],
  },
  bass: {
    a: [[600, 0, 60], [1040, -7, 70], [2250, -9, 110], [2450, -9, 120], [2750, -20, 130]],
    e: [[400, 0, 40], [1620, -12, 80], [2400, -9, 100], [2800, -12, 120], [3100, -18, 120]],
    i: [[250, 0, 60], [1750, -30, 90], [2600, -16, 100], [3050, -22, 120], [3340, -28, 120]],
    o: [[400, 0, 40], [750, -11, 80], [2400, -21, 100], [2600, -20, 120], [2900, -40, 120]],
    u: [[350, 0, 40], [600, -20, 80], [2400, -32, 100], [2675, -28, 120], [2950, -36, 120]],
  },
};
/**
 * D302: where each consonant's formants start (F1, F2, F3 in Hz for a man's voice, scaled with the
 * singer; F4, F5 the vowel's), how long it takes (s), how much of the voice sounds through it, its
 * burst (a plosive's or a tap's noise), and (SOLO VOICES) the lowpass (Hz) a recorded voice opens from.
 */
export const CONSONANTS: Record<Sing["cons"], { f: [number, number, number]; time: number; voiced: number; burst: number; open: number }> = {
  l: { f: [360, 1000, 2600], time: 0.05, voiced: 0.4, burst: 0, open: 900 },
  // (D304: the d's and the r's bursts softer: 0.5 and 0.12 rang on every note as clicks.)
  d: { f: [300, 1700, 2600], time: 0.035, voiced: 0, burst: 0.16, open: 900 },
  n: { f: [260, 1250, 2500], time: 0.055, voiced: 0.35, burst: 0, open: 500 },
  r: { f: [350, 1500, 2300], time: 0.025, voiced: 0.25, burst: 0.05, open: 1200 },
  m: { f: [260, 900, 2300], time: 0.055, voiced: 0.3, burst: 0, open: 450 },
};

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
  // D294, ANALOG SYNTH: revived and remade for the players' list: every patch through a 24 dB lowpass
  // (two filters in a row, as the Moog ladder's slope) with its own envelope; the lip scoops and the
  // wood's pitch blip dropped (on every note of a fugue they blurred the pitch), and the detuned unisons
  // (they thicken a line into a chorus). Top down: a reedy brass lead (a sawtooth with a narrow pulse, the
  // filter opening at each attack), a hollow square "clarinet", a plucky voice (a resonant filter snapping shut), a nasal
  // narrow-pulse reed, and a bass whose filter never closes below 1.4 kHz, so its overtones reach a phone's speaker (D291).
  carlosLead: P({ osc: [{ wave: "saw", gain: 0.8 }, { wave: "pulse25", gain: 0.35 }], filter: { freq: 2.6, q: 2.2, env: 3, envDecay: 0.14, poles: 4 }, amp: { a: 0.01, d: 0.3, s: 0.75, r: 0.05 }, vib: { depth: 6, rate: 5.4, delay: 0.4 }, level: 0.336 }),
  carlosReed: P({ osc: [{ wave: "pulse12" }, { wave: "triangle", gain: 0.5 }], filter: { freq: 3.2, q: 4, env: 1.6, envDecay: 0.08, poles: 4 }, amp: { a: 0.015, d: 0.2, s: 0.85, r: 0.05 }, vib: { depth: 4, rate: 4.6, delay: 0.45 }, level: 0.33 }),
  carlosPluck: P({ osc: [{ wave: "pulse25", gain: 0.8 }, { wave: "saw", gain: 0.5 }], filter: { freq: 1.4, q: 5, env: 7, envDecay: 0.07, poles: 4 }, amp: { a: 0.003, d: 0.35, s: 0.4, r: 0.05 }, level: 0.414 }),
  carlosClarinet: P({ osc: [{ wave: "square", gain: 0.8 }, { wave: "triangle", gain: 0.5 }], filter: { freq: 5, q: 1.2, env: 1.4, envDecay: 0.1, poles: 4 }, amp: { a: 0.015, d: 0.3, s: 0.85, r: 0.05 }, level: 0.16 }),
  carlosWood: P({ osc: [{ wave: "triangle" }, { wave: "pulse50", octave: 1, gain: 0.2 }], filter: { freq: 2.6, q: 4, env: 4, envDecay: 0.04 }, amp: { a: 0.003, d: 0.25, s: 0.5, r: 0.04 }, scoop: { cents: 320, time: 0.008 }, level: 0.9 }),
  carlosBass: P({ osc: [{ wave: "saw" }, { wave: "pulse50", gain: 0.6 }, { wave: "square", octave: -1, gain: 0.25 }], filter: { freq: 1400, hz: true, q: 1.5, env: 1.6, envDecay: 0.12, poles: 4 }, amp: { a: 0.004, d: 0.3, s: 0.72, r: 0.05 }, level: 0.364 }),
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
  // D292, ROUND CHIP: the classic chip's family made softer and rounder: the same pulses and triangle,
  // each through a gentle lowpass (a few harmonics, not dozens), a softer attack, a slow vibrato on the
  // top; each voice keeps its own wave (a square, a Game Boy wave sample, a 25% and a 12% pulse) so the
  // lines stay apart. The bass a triangle with a filtered square in it: the triangle the body on a
  // computer, the square's overtones (up to about 1.6 kHz) its pitch on a phone's speaker (D291).
  rcLead: P({ osc: [{ wave: "pulse50" }], filter: { freq: 5, q: 0.5, env: 1.4, envDecay: 0.08 }, amp: { a: 0.008, d: 0.5, s: 0.75, r: 0.05 }, vib: { depth: 9, rate: 5.4, delay: 0.3 }, level: 0.46 }),
  rcHarm: P({ osc: [{ wave: "gbRamp" }], filter: { freq: 5, q: 0.5, env: 1.3, envDecay: 0.08 }, amp: { a: 0.008, d: 0.5, s: 0.8, r: 0.05 }, vib: { depth: 6, rate: 5, delay: 0.4 }, level: 0.34 }),
  rcMid: P({ osc: [{ wave: "pulse25" }], filter: { freq: 4, q: 0.5, env: 1.4, envDecay: 0.08 }, amp: { a: 0.007, d: 0.5, s: 0.72, r: 0.05 }, level: 0.48 }),
  rcTenor: P({ osc: [{ wave: "pulse12" }], filter: { freq: 3.5, q: 0.5, env: 1.3, envDecay: 0.08 }, amp: { a: 0.007, d: 0.5, s: 0.72, r: 0.05 }, level: 0.6 }),
  rcBass: P({ osc: [{ wave: "triangle", gain: 0.4 }, { wave: "pulse50", gain: 0.8 }], filter: { freq: 1600, hz: true, q: 0.5 }, amp: { a: 0.005, d: 0.3, s: 0.9, r: 0.04 }, level: 0.42 }),
  // D292, PIANO (FM): a struck string from FM waves (fmPiano above): a quick hammer, a decay longer in
  // the bass, the tone darkening as it dies (the filter closing), a sine 3 cents off for the beating of
  // a piano's unison strings, a touch of the FM bell's high partials for the hammer's ring.
  pianoFm: P({ osc: [{ wave: "fmPiano" }, { wave: "sine", detune: 3, gain: 0.35 }, { wave: "fmBell", octave: 1, gain: 0.06 }], filter: { freq: 5, q: 0.6, env: 2.6, envDecay: 0.25 }, amp: { a: 0.002, d: 1.3, s: 0, r: 0.12 }, level: 0.3 }),
  pianoFmBass: P({ osc: [{ wave: "fmPianoBass" }, { wave: "sine", detune: 3, gain: 0.3 }], filter: { freq: 7, q: 0.6, env: 2, envDecay: 0.3 }, amp: { a: 0.002, d: 1.5, s: 0, r: 0.12 }, level: 0.36 }),
  // D292, PIANO (SAMPLED): the Salamander Grand (sampled.ts); the FM piano stands in for a note until its recording has loaded.
  pianoSampled: P({ osc: [{ wave: "fmPiano" }, { wave: "sine", detune: 3, gain: 0.35 }], filter: { freq: 5, q: 0.6, env: 2.6, envDecay: 0.25 }, amp: { a: 0.002, d: 1.3, s: 0, r: 0.12 }, level: 0.3, sample: "piano" }),
  pianoBassSampled: P({ osc: [{ wave: "fmPianoBass" }, { wave: "sine", detune: 3, gain: 0.3 }], filter: { freq: 7, q: 0.6, env: 2, envDecay: 0.3 }, amp: { a: 0.002, d: 1.5, s: 0, r: 0.12 }, level: 0.36, sample: "piano" }),
  // D294: the inner voices a shade lighter (-1 dB) than the top and the bass, so each line is heard as a line.
  pianoInnerSampled: P({ osc: [{ wave: "fmPiano" }, { wave: "sine", detune: 3, gain: 0.35 }], filter: { freq: 5, q: 0.6, env: 2.6, envDecay: 0.25 }, amp: { a: 0.002, d: 1.3, s: 0, r: 0.12 }, level: 0.267, sample: "piano" }),
  // D294, GAME BOY (the DMG's sound, after how Pokémon Red/Blue and Link's Awakening voice their lines):
  // the two pulse channels and the wave channel, unfiltered as the hardware is (bright and forward),
  // each pulse with the hardware's stepped volume envelope (abrupt 1/15 steps every `period`/64 s) down
  // to a floor where a long note holds (a fugue's long notes cannot fade out as a tune's may); the lead's
  // vibrato comes in late, as those soundtracks' do. A fugue has more lines than the DMG's three tonal
  // channels: the fourth and fifth reuse its kinds (a third pulse width, the wave channel's second
  // sample), each still its own colour. Top down: 25% pulse lead (channel 1), 50% pulse (channel 2),
  // the wave channel's hollow sample (a middle voice: three or five voices), a 12.5% pulse (the
  // tenor of four), the wave channel's sawtooth bass (no envelope: it holds).
  gbLead: P({ osc: [{ wave: "pulse25" }], steps: { from: 15, to: 9, period: 3 }, amp: { a: 0.002, d: 0.3, s: 0.6, r: 0.012 }, vib: { depth: 12, rate: 6, delay: 0.32 }, level: 0.63 }),
  gbHarm: P({ osc: [{ wave: "pulse50" }], steps: { from: 14, to: 8, period: 2 }, amp: { a: 0.002, d: 0.3, s: 8 / 14, r: 0.012 }, level: 0.57 }),
  gbThin: P({ osc: [{ wave: "pulse12" }], steps: { from: 14, to: 8, period: 2 }, amp: { a: 0.002, d: 0.3, s: 8 / 14, r: 0.012 }, level: 0.75 }),
  gbWave: P({ osc: [{ wave: "gbHollow" }], amp: { a: 0.002, d: 0.05, s: 1, r: 0.012 }, level: 0.14 }),
  gbBass: P({ osc: [{ wave: "gbSaw" }], amp: { a: 0.002, d: 0.05, s: 1, r: 0.012 }, level: 0.35 }),
  // D297, three period presets (the research report "Polyphony on Game Hardware", §6.1-6.3): each voice
  // its own instrument and its own way of speaking, the outer voices the most unlike (R1); vibrato only
  // on sustained voices, late, at rates at least 0.6 Hz apart, never on the bass (R4); the effect sent
  // from some voices only (R5); every voice high-passed at 120 Hz (R2); pans within ±0.35 (R7, Preset.by).
  // The `osc`/`filter`/`amp` of a recorded patch are its synthesized stand-in until its recording has
  // loaded (D190), the stand-ins of D177's oboe, clarinet, bassoon, violin and harpsichord.
  //
  // SUPER 16-BIT (the SNES's S-DSP: short samples band-limited and softened by its Gaussian
  // interpolation, 4-bit BRR, exponential envelopes, the echo with a filter in its loop, enabled per
  // voice): oboe on top, harpsichord (dry: its plucks carry the beat), clarinet, violin (five voices),
  // bassoon; the recordings made over as the console held them (sampled.ts PERIOD: rate reduced, a
  // 2-pole lowpass at about 0.36 of that rate, 11 bits, mono, a loop). Echo sends (Preset.fx "spc")
  // from the sustained voices only.
  // D302, remade lusher (the owner rated it 4: "boring, dull, flat"): the SNES ensembles' sound: a solo
  // violin with the samples' vibrato on top, a flute (second of five), the harpsichord (in the echo now),
  // the viola section's strings, the bassoon; the recordings at 22
  // kHz (lowpass 6-7 kHz, the Gaussian's softening; they were muffled at 16 kHz, 4.3-6 kHz), their
  // sustain falling more slowly (4 s); the echo longer and in stereo (chip.ts SPC_ECHO), sent most from
  // the strings and the flute.
  s16Violin: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "sine", gain: 0.6 }], filter: { freq: 4.5, q: 0.7, env: 1.4, envDecay: 0.2 }, amp: { a: 0.02, d: 0.3, s: 0.82, r: 0.1 }, rec: { a: 0.02, d: 0.3, s: 0.82, fade: 4, r: 0.1 }, vib: { depth: 16, rate: 6.0, delay: 0.26 }, send: 0.22, level: 0.56, sample: "violin16" }),
  s16Flute: P({ osc: [{ wave: "sine" }, { wave: "triangle", octave: 1, gain: 0.15 }], amp: { a: 0.02, d: 0.2, s: 0.85, r: 0.1 }, rec: { a: 0.02, d: 0.2, s: 0.85, fade: 4, r: 0.1 }, vib: { depth: 12, rate: 5.2, delay: 0.3 }, send: 0.26, level: 0.56, sample: "flute16" }),
  s16Harpsi: P({ osc: [{ wave: "saw" }, { wave: "pulse25", octave: 1, gain: 0.35 }], filter: { freq: 10, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.06 }, rec: { a: 0.001, d: 0, s: 1, r: 0.06 }, send: 0.12, hp: 120, level: 0.75, sample: "harpsi16" }),
  s16Strings: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 3.2, q: 0.8, env: 1.6, envDecay: 0.15 }, amp: { a: 0.05, d: 0.3, s: 0.85, r: 0.12 }, rec: { a: 0.05, d: 0.3, s: 0.85, fade: 4, r: 0.12 }, vib: { depth: 10, rate: 4.6, delay: 0.34 }, send: 0.3, level: 0.6, sample: "strings16" }),
  s16Bassoon: P({ osc: [{ wave: "reed" }, { wave: "sine", gain: 0.6 }], filter: { freq: 2.4, q: 1, env: 1.3, envDecay: 0.1 }, amp: { a: 0.012, d: 0.25, s: 0.78, r: 0.08 }, rec: { a: 0.012, d: 0.25, s: 0.78, fade: 4, r: 0.08 }, send: 0.12, hp: 120, level: 0.64, sample: "bassoon16" }),
  // NOCTURNE 32-BIT (the PlayStation's SPU, after the Baroque-Gothic palette of 1997: violin,
  // harpsichord, strings and organ through a dark half-rate hall): violin on top, oboe (five voices),
  // harpsichord with its key-up noise, a sustained viola, the pipe organ's pedal (its manual above F#3)
  // in the bass; recordings at about 22 kHz, a milder lowpass, 13 bits (sampled.ts PERIOD); each voice
  // its own send to the hall (Preset.fx "hall": 25 ms pre-delay, high-passed send, dark return).
  n32Violin: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "sine", gain: 0.6 }, { wave: "saw", detune: 7, gain: 0.3 }], filter: { freq: 4.5, q: 0.7, env: 1.4, envDecay: 0.2 }, amp: { a: 0.03, d: 0.2, s: 0.85, r: 0.16 }, rec: { a: 0.03, d: 0.2, s: 0.85, r: 0.16 }, vib: { depth: 15, rate: 5.5, delay: 0.3 }, send: 0.18, level: 0.4, sample: "violin32" }),
  n32Oboe: P({ osc: [{ wave: "reed" }, { wave: "sine", gain: 0.4 }], filter: { freq: 4.2, q: 1.4, env: 1.2, envDecay: 0.1 }, amp: { a: 0.015, d: 0.1, s: 0.9, r: 0.12 }, rec: { a: 0.015, d: 0.1, s: 0.9, r: 0.12 }, vib: { depth: 12, rate: 6.2, delay: 0.26 }, send: 0.14, level: 0.36, sample: "oboe32" }),
  n32Harpsi: P({ osc: [{ wave: "saw" }, { wave: "pulse25", octave: 1, gain: 0.35 }], filter: { freq: 10, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.08 }, rec: { a: 0.001, d: 0, s: 1, r: 0.08 }, send: 0.1, hp: 120, level: 0.72, sample: "harpsi32" }),
  n32Viola: P({ osc: [{ wave: "saw", gain: 0.6 }, { wave: "triangle", gain: 0.6 }], filter: { freq: 3.2, q: 0.8, env: 1.6, envDecay: 0.15 }, amp: { a: 0.02, d: 0.25, s: 0.8, r: 0.14 }, rec: { a: 0.02, d: 0.25, s: 0.8, r: 0.14 }, vib: { depth: 10, rate: 4.8, delay: 0.38 }, send: 0.16, level: 0.56, sample: "viola32" }),
  n32Organ: P({ osc: [{ wave: "organ" }, { wave: "organ", octave: 1, gain: 0.3 }], amp: { a: 0.025, d: 0.1, s: 1, r: 0.14 }, rec: { a: 0.025, d: 0, s: 1, r: 0.14 }, send: 0.12, hp: 120, level: 0.4, sample: "organ32" }),
  // MEGA FM (the Mega Drive's YM2612: every channel its own two-operator instrument, the modulation
  // index decaying on every note, no reverb; a 9-bit grain and a 7 kHz lowpass at the output).
  // D302, remade (the owner rated it 3: "boring, dull, flat"): the chip's punch: the modulator fed back
  // on itself (`fm.fb`: operator 1's feedback, the bright, saw-like edge of its leads and basses), a few
  // cents off its ratio (`fm.detune`, DT1: the timbre beating slowly), fast bright attacks with the index
  // falling, a second modulator's own fall for an e-piano's tine and a slap's click; the grain kept, the
  // lowpass opened to 10 kHz, a short dark stereo echo (Preset.fx "echo"). Top down: a fed-back lead, a
  // brass with its index rising first (second of five), a crisp e-piano (1:1 with a 1:14 tine), a clav
  // (1:3, fed back, short), the slap bass (1:1 fed back, a 1:3 click, a 30-cent snap from above).
  fmLead: P({ osc: [{ wave: "sine" }], fm: { ratio: 1, index: 3.2, to: 1.7, time: 0.15, fb: 0.9, detune: 4 }, bits: 9, filter: { freq: 10000, hz: true, q: 0.5 }, drive: 0.4, amp: { a: 0.004, d: 0.25, s: 0.78, r: 0.06 }, vib: { depth: 14, rate: 6.4, delay: 0.26 }, send: 0.1, level: 0.23 }),
  fmBrass: P({ osc: [{ wave: "sine" }], fm: { ratio: 1, index: 1.2, to: 2, time: 0.25, rise: { to: 3, time: 0.05 }, fb: 0.6, detune: -5 }, bits: 9, filter: { freq: 10000, hz: true, q: 0.5 }, amp: { a: 0.025, d: 0.2, s: 0.85, r: 0.07 }, vib: { depth: 10, rate: 5.6, delay: 0.3 }, send: 0.1, level: 0.238 }),
  fmPiano: P({ osc: [{ wave: "sine" }], fm: { ratio: 1, index: 1.8, to: 0.8, time: 0.7, mod2: { ratio: 14, index: 0.9, to: 0, time: 0.08 }, detune: 3 }, bits: 9, filter: { freq: 10000, hz: true, q: 0.5 }, amp: { a: 0.002, d: 1.2, s: 0.3, r: 0.09 }, send: 0.12, level: 0.425 }),
  fmClav: P({ osc: [{ wave: "sine" }], fm: { ratio: 3, index: 5, to: 2, time: 0.09, fb: 0.8, detune: 6 }, bits: 9, filter: { freq: 10000, hz: true, q: 0.5 }, amp: { a: 0.001, d: 0.45, s: 0.35, r: 0.04 }, send: 0.08, level: 0.451 }),
  fmBass: P({ osc: [{ wave: "sine" }], fm: { ratio: 1, index: 7, to: 3.4, time: 0.07, fb: 0.9, mod2: { ratio: 3, index: 2.5, to: 0.5, time: 0.03 } }, scoop: { cents: 30, time: 0.012 }, drive: 0.5, bits: 9, filter: { freq: 10000, hz: true, q: 0.5 }, hp: 70, amp: { a: 0.001, d: 0.35, s: 0.62, r: 0.05 }, send: 0.04, level: 0.289 }),
  // SID 64 (the Commodore 64's SID, after how Hubbard, Galway and Daglish made three channels into
  // three characters: a waveform and a motion of its own per voice): a pulse lead whose width sweeps
  // slowly (0.25-0.45 at 0.7 Hz) with a late vibrato (the only one), a sawtooth, a triangle with a thin
  // pulse an octave up in it (the tenor of four), a narrow pulse sweeping faster (0.12-0.22 at 1.3 Hz:
  // the second of five), a 0.35 pulse bass through a resonant lowpass that opens at each note and never
  // closes below 1.4 kHz (phones, D291); snappy attacks (2-4 ms); no arpeggios, no fast pseudo-polyphony.
  sidLead: P({ osc: [{ wave: "saw" }], pwm: { width: 0.35, depth: 0.1, rate: 0.7 }, filter: { freq: 5000, hz: true, q: 0.7 }, amp: { a: 0.003, d: 0.25, s: 0.7, r: 0.05 }, vib: { depth: 12, rate: 5.6, delay: 0.35 }, level: 0.45 }),
  sidThin: P({ osc: [{ wave: "saw" }], pwm: { width: 0.17, depth: 0.05, rate: 1.3 }, filter: { freq: 4500, hz: true, q: 0.7 }, amp: { a: 0.003, d: 0.2, s: 0.6, r: 0.04 }, level: 0.6 }),
  sidSaw: P({ osc: [{ wave: "saw" }], filter: { freq: 4000, hz: true, q: 0.7 }, amp: { a: 0.002, d: 0.3, s: 0.55, r: 0.04 }, level: 0.5 }),
  sidTri: P({ osc: [{ wave: "triangle", gain: 0.6 }, { wave: "fmBell", gain: 0.6 }], amp: { a: 0.004, d: 0.3, s: 0.75, r: 0.05 }, level: 0.29 }),
  sidBass: P({ osc: [{ wave: "saw" }], pwm: { width: 0.35, depth: 0, rate: 0 }, filter: { freq: 1400, hz: true, q: 3, env: 2.5, envDecay: 0.12 }, hp: 120, amp: { a: 0.002, d: 0.3, s: 0.7, r: 0.04 }, level: 0.45 }),
  // TRACKER (the Amiga's Paula and the MOD trackers, 1987-93: four 8-bit sample channels, two hard left
  // and two hard right, played without interpolation): violin on top, flute (alto of four, second of
  // five), harpsichord, clarinet (fourth of five), bassoon in the bass; the recordings made over at 8-16
  // kHz with no smoothing (sampled.ts PERIOD `hold`: the aliasing grit kept), 8 bits, short loops (0.5
  // s); the tracker's own vibrato (its effect 4xy) late on the held voices, each its own rate; the
  // voices alternating left and right (within ±0.35 for a phone); no reverb, no room.
  // D302, punchier (the owner rated it 5): each sample with a tracker's volume slide (a quick fall from
  // its attack to 0.75-0.85: a shape, not a flat hold), the tracker's tone portamento into a joined
  // note (3xx: Patch.slide, 40 ms), the late vibrato (4xy); the clarinet and the bassoon replaced by
  // two of the MOD era's favourite samples: the 8-bit choir "aah" (the fourth voice) and a slapped
  // electric bass (8 kHz-ish, plucked: punchy, and its harmonics carry on a phone); the channels hard
  // left and right as Paula's, at ±0.35 (a phone's mix).
  trkViolin: P({ osc: [{ wave: "saw", gain: 0.7 }, { wave: "sine", gain: 0.6 }], filter: { freq: 4.5, q: 0.7, env: 1.4, envDecay: 0.2 }, amp: { a: 0.004, d: 0.25, s: 0.8, r: 0.04 }, rec: { a: 0.004, d: 0.25, s: 0.8, r: 0.04 }, slide: 0.04, vib: { depth: 15, rate: 5.6, delay: 0.3 }, level: 0.4, sample: "violinMod" }),
  trkFlute: P({ osc: [{ wave: "sine" }, { wave: "triangle", octave: 1, gain: 0.15 }], amp: { a: 0.004, d: 0.2, s: 0.85, r: 0.04 }, rec: { a: 0.004, d: 0.2, s: 0.85, r: 0.04 }, slide: 0.04, vib: { depth: 12, rate: 6.4, delay: 0.3 }, level: 0.38, sample: "fluteMod" }),
  trkHarpsi: P({ osc: [{ wave: "saw" }, { wave: "pulse25", octave: 1, gain: 0.35 }], filter: { freq: 10, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.04 }, rec: { a: 0.001, d: 0, s: 1, r: 0.04 }, level: 0.76, sample: "harpsiMod" }),
  trkChoir: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 7, gain: 0.7 }], vowel: [700, 1150], amp: { a: 0.005, d: 0.3, s: 0.8, r: 0.06 }, rec: { a: 0.005, d: 0.3, s: 0.8, r: 0.06 }, slide: 0.04, vib: { depth: 10, rate: 4.8, delay: 0.35 }, level: 2.9, sample: "choirMod" }),
  trkBass: P({ osc: [{ wave: "square" }, { wave: "sine", gain: 0.8 }], filter: { freq: 3, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.002, d: 0.5, s: 0, r: 0.04 }, rec: { a: 0.001, d: 0, s: 1, r: 0.04 }, hp: 70, level: 0.6, sample: "bassMod" }),
  // PIPE ORGAN (D302: CHAMBER ORGAN remade; the owner: "real bad too, flat and dull. Why would anyone
  // choose it?!"): an organ registered as an organist registers a trio or a fugue's lines apart, each
  // voice its own registration, in a church. The plenum (Principal 8', Octave 4', Superoctave 2' and a
  // mixture) and the pedal (its reeds and principals at 16' and 8') are the VCSL recordings of a real
  // organ (sampled.ts manualOrg, pedalOrg; mono, 22 kHz, the recordings' own loops); between them two
  // synthesized registrations the recordings do not have: the flutes (Gedackt 8', Rohrflöte 4' a
  // little sharp against it, Nasard 2 2/3' a little flat, Blockflöte 2', a soft Terz 1 3/5': the
  // Sesquialtera's colour, whose upper ranks a phone's speaker hears; their beating, a soft wind
  // noise, a strong chiff; the alto of four, where they carry) and a reed (Trompete 8' with a
  // Principal 4', its brassy speech: the tenor of four; Krummhorn 8' with the Gedackt where there
  // are five voices). Each voice's pipes a cent or so off the others' (`drift`:
  // the beating of ranks not quite in tune). The room a large church (Preset.fx "cathedral": 45 ms
  // pre-delay, RT60 about 2.8 s, the highs damped), sent most from the flutes, least from the pedal.
  // D304 (the owner: "Organ's bass sounds cool but other voices sound muddled and weird … Where's the
  // beautiful trumpet? The sweet flute? They need all be audible and balanced"): registered as a trio
  // over the pedal, each line one clear colour. The top a sweet flute (Flöte 8': nearly a sine, a soft
  // octave and twelfth a cent or so apart, a gentle chiff: the Gedackt's hollow twelfth and the
  // Sesquialtera's Nasard and Terz were the "weird"); the alto a Principal 8' with a quiet Octave 4'
  // (the recorded plenum, Principal to a mixture under a 2.8 s church, was the mud: withdrawn); the
  // tenor the Trompete, a solo reed (every harmonic, the 2nd to 5th strongest, bright to 5 kHz, a quick
  // brassy blip, no Principal under it); the Krummhorn the second of five; the recorded pedal kept. The
  // church smaller (RT60 2.2 s) and sent less (0.1-0.14, was 0.14-0.28): the lines apart.
  orgFlute: P({ osc: [{ wave: "sine" }, { wave: "sine", octave: 1, detune: 1.2, gain: 0.1 }, { wave: "sine", octave: Math.log2(3), detune: -1, gain: 0.05 }], chiff: { level: 0.3, time: 0.03, at: 2 }, breath: 0.012, amp: { a: 0.035, d: 0.05, s: 1, r: 0.1 }, drift: { cents: 0.8, rate: 0.031 }, send: 0.14, level: 0.28 }),
  orgPrincipal: P({ osc: [{ wave: "stopPrincipal" }, { wave: "sine", octave: 1, detune: 1.5, gain: 0.2 }], chiff: { level: 0.22, time: 0.02, at: 6 }, amp: { a: 0.022, d: 0.05, s: 1, r: 0.09 }, drift: { cents: 1, rate: 0.041 }, send: 0.12, level: 0.34 }),
  orgTrompete: P({ osc: [{ wave: "stopTrompete" }, { wave: "stopTrompete", detune: 1.4, gain: 0.25 }], filter: { freq: 5000, hz: true, q: 0.9, env: 1.6, envDecay: 0.03 }, chiff: { level: 0.12, time: 0.012, at: 9 }, amp: { a: 0.01, d: 0.05, s: 1, r: 0.07 }, drift: { cents: 1, rate: 0.047 }, send: 0.12, hp: 110, level: 0.39 }),
  orgKrumm: P({ osc: [{ wave: "stopKrummhorn" }, { wave: "stopGedackt", detune: -1.8, gain: 0.5 }], chiff: { level: 0.25, time: 0.018, at: 5 }, breath: 0.01, amp: { a: 0.016, d: 0.05, s: 1, r: 0.08 }, drift: { cents: 1, rate: 0.023 }, send: 0.12, level: 0.26 }),
  orgPedal: P({ osc: [{ wave: "stopPosaune" }, { wave: "stopGedackt", octave: -1, gain: 0.5 }], amp: { a: 0.03, d: 0.05, s: 1, r: 0.12 }, send: 0.1, level: 0.195, sample: "organPedal" }),
  // SWITCHED-ON (D297: ANALOG SYNTH remade; the owner: "lackluster compared to Carlos' memorable
  // sounds"), after Switched-On Bach's timbres: a modular's sawtooths and squares through the 24 dB
  // ladder with a strong, quick filter envelope (the bright "spit" at each attack and the resonant
  // "wah" as it closes), one patch per line (Carlos's rule), each a little out of tune with the others
  // and wandering slowly (`drift`, as the 1968 oscillators did; per voice, so no two move together).
  // Top down: a bright resonant brass-reed lead (sawtooth and square), a woody, hollow square (detached,
  // its filter blipping shut), the harpsichord-like resonant pluck (the filter snapping shut, the
  // amplitude dying), a nasal narrow-pulse reed with a slow vibrato, the snapping bass (its filter never
  // under 1.4 kHz, D291). Portamento left out (on every note of a fugue it blurs the pitch, D294).
  // D304 (the owner: "way too muddled instead of crunchy and bright and bleepy bloopy like Carlos sound
  // is … This needs be one of the best analog presets"): remade nearly dry (the room 0.05, was 0.24),
  // every filter open well above the note (it closed to 1.3-3.4 times the note: muffled), each attack a
  // quick bright blip of the ladder, a little drive into it (the Moog's crunch). Top down: a bright
  // sawtooth lead through a moderately resonant ladder (4.5 times the note, a 3.5-fold blip over 60 ms);
  // a hollow square (second of five: woody, its blip short); a nasal narrow pulse (12%: the reedy
  // Carlos "oboe", the filter wide open); the "bloop": a square and a sawtooth through a ladder near
  // self-oscillation (Q 9), its envelope sweeping six-fold down in 70 ms (the tenor of four); the punchy
  // bass, a sawtooth over a square an octave down, the filter snapping shut to 1.6 kHz (D291), driven.
  solLead: P({ osc: [{ wave: "saw" }], filter: { freq: 4.5, q: 3, env: 3.5, envDecay: 0.06, poles: 4 }, drive: 0.6, amp: { a: 0.003, d: 0.3, s: 0.82, r: 0.04 }, vib: { depth: 6, rate: 5.4, delay: 0.5 }, drift: { cents: 3, rate: 0.11 }, level: 0.2 }),
  solSquare: P({ osc: [{ wave: "square" }, { wave: "triangle", octave: 1, gain: 0.25 }], filter: { freq: 3.6, q: 1.6, env: 2.6, envDecay: 0.035, poles: 4 }, amp: { a: 0.003, d: 0.15, s: 0.65, r: 0.03 }, drift: { cents: 3, rate: 0.17 }, level: 0.24 }),
  solNasal: P({ osc: [{ wave: "pulse12" }], filter: { freq: 7, q: 2, env: 1.8, envDecay: 0.04, poles: 4 }, amp: { a: 0.004, d: 0.2, s: 0.85, r: 0.04 }, vib: { depth: 5, rate: 4.6, delay: 0.5 }, drift: { cents: 3, rate: 0.13 }, level: 0.5 }),
  solBloop: P({ osc: [{ wave: "square" }, { wave: "saw", gain: 0.5 }], filter: { freq: 6, q: 7, env: 4, envDecay: 0.07, poles: 4 }, amp: { a: 0.002, d: 0.3, s: 0.6, r: 0.04 }, drift: { cents: 3, rate: 0.07 }, level: 0.2 }),
  solBass: P({ osc: [{ wave: "saw" }, { wave: "square", octave: -1, gain: 0.45 }], filter: { freq: 1600, hz: true, q: 2.5, env: 4, envDecay: 0.055, poles: 4 }, drive: 1.2, hp: 45, amp: { a: 0.002, d: 0.2, s: 0.65, r: 0.035 }, drift: { cents: 2, rate: 0.05 }, level: 0.3 }),
  // MODULAR (D297, a niche pick: the fatter 1970s modular and Minimoog sound): two sawtooths a few cents
  // apart in the sustained voices (a thickness that blurs the lines a little: allowed in a niche pick),
  // deeper resonance sweeps, a bouncy filter-envelope bass. Top down: a fat resonant lead, a narrow
  // pulse with a sawtooth beside it (second of five), a resonant square pluck, a slow-opening brass (the
  // tenor of four), the Minimoog-style bass (sawtooth, a sub-octave square, the filter bouncing shut but
  // never under 1.3 kHz).
  // D304 (the owner: "Modular sucks… is this the best you could devise vis a vis a modular setup apt
  // for playing Bach fugues?!"): rethought as a big modular system, East and West coast patched for four
  // lines that never blur (no detuned unisons, each line one module chain): the top a hard-synced
  // sawtooth (hardSync) through the ladder, its blip and a late vibrato (the East-coast lead); the
  // second of five a wavefolded sustained voice (folded: a Buchla 259's woody buzz, a slow vibrato);
  // the alto the West coast's "bongo": the folded wave through a low-pass gate (no resonance, the
  // cutoff and the level falling together in 0.3 s, a vactrol's pluck); the tenor a bell from a
  // frequency modulator 3.5 times the note (inharmonic: the ring modulator's metal) whose index
  // falls in a quarter of a second to a clear, held body; the bass a sequencer's: a sawtooth over a
  // square an octave down, a resonant filter snapping shut (never under 2 kHz, D291), driven. Dry
  // but for a small room (0.12).
  modLead: P({ osc: [{ wave: "hardSync" }], filter: { freq: 6, q: 2.2, env: 2.5, envDecay: 0.08, poles: 4 }, amp: { a: 0.004, d: 0.3, s: 0.8, r: 0.05 }, vib: { depth: 6, rate: 5.6, delay: 0.45 }, drift: { cents: 3, rate: 0.09 }, level: 0.28 }),
  modFold: P({ osc: [{ wave: "folded" }], filter: { freq: 6, q: 0.8, env: 1.8, envDecay: 0.12 }, amp: { a: 0.01, d: 0.3, s: 0.85, r: 0.06 }, vib: { depth: 5, rate: 4.8, delay: 0.45 }, drift: { cents: 3, rate: 0.15 }, level: 0.3 }),
  modBongo: P({ osc: [{ wave: "folded" }], filter: { freq: 5, q: 0.6, env: 4, envDecay: 0.09 }, amp: { a: 0.001, d: 0.32, s: 0, r: 0.05 }, drift: { cents: 3, rate: 0.06 }, level: 0.45 }),
  modBell: P({ osc: [{ wave: "sine" }, { wave: "triangle", gain: 0.35 }], fm: { ratio: 3.5, index: 3, to: 0.12, time: 0.25 }, amp: { a: 0.002, d: 0.6, s: 0.55, r: 0.08 }, drift: { cents: 3, rate: 0.12 }, level: 0.31 }),
  modBass: P({ osc: [{ wave: "saw" }, { wave: "square", octave: -1, gain: 0.45 }], filter: { freq: 2000, hz: true, q: 4, env: 3, envDecay: 0.05, poles: 4 }, drive: 0.8, hp: 45, amp: { a: 0.001, d: 0.15, s: 0.55, r: 0.03 }, drift: { cents: 2, rate: 0.05 }, level: 0.32 }),
  // TOMITA (D297, a niche pick, lush: after Isao Tomita's synthesizer records, Snowflakes Are Dancing
  // 1974 and Pictures at an Exhibition 1975): a whistling lead (a sine with a breath, coming up from
  // below into each note, a wide, late vibrato), a choir-like "ah" pad of three sawtooths (an ensemble
  // chorus), a breathy filtered flute, a slow string ensemble of three sawtooths, a plain filtered bass;
  // the wash (the space echo and long reverb, Preset.fx "space") sent from the inner voices (0.25-0.3),
  // the top and the bass kept nearly dry so the outer lines stay followable.
  // D302, more colour (the owner rated it 5: "boring, dull, flat"): the whistle glides into each joined
  // note (a portamento, Patch.slide: the "Paul Bunyan" whistle) and wanders a little about its place;
  // the strings and the choir phased (two allpass stages swept slowly: moving notches, Patch.phaser);
  // the strings' and the flute's filters sweeping slowly with the clock (Patch.filter.sweep), the
  // strings' resonance higher; the flute drifting across the stereo field (Patch.autopan, within
  // ±0.35); the bass's filter breathing. The sweeps follow the clock, so they go on from note to note.
  tomWhistle: P({ osc: [{ wave: "sine" }, { wave: "triangle", octave: 1, gain: 0.12 }], scoop: { cents: -45, time: 0.035 }, slide: 0.08, breath: 0.04, amp: { a: 0.03, d: 0.2, s: 0.9, r: 0.12 }, vib: { depth: 22, rate: 5.2, delay: 0.22 }, autopan: { rate: 0.07, depth: 0.08 }, send: 0.12, level: 0.25 }),
  tomChoir: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 9, gain: 0.8 }, { wave: "saw", detune: -9, gain: 0.8 }], vowel: [700, 1150], phaser: { rate: 0.13, lo: 400, hi: 3200 }, amp: { a: 0.12, d: 0.3, s: 0.9, r: 0.25 }, vib: { depth: 6, rate: 4.4, delay: 0.4 }, send: 0.3, level: 1.0 }),
  tomFlute: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: 1, gain: 0.15 }], breath: 0.18, filter: { freq: 4.5, q: 2.5, env: 1.5, envDecay: 0.2, sweep: { rate: 0.09, octaves: 0.7 } }, amp: { a: 0.05, d: 0.2, s: 0.85, r: 0.15 }, vib: { depth: 8, rate: 6, delay: 0.3 }, autopan: { rate: 0.11, depth: 0.15 }, send: 0.25, level: 0.34 }),
  tomStrings: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 10, gain: 0.8 }, { wave: "saw", detune: -10, gain: 0.8 }], filter: { freq: 3.2, q: 2.5, env: 1.3, envDecay: 0.3, poles: 4, sweep: { rate: 0.05, octaves: 0.6 } }, phaser: { rate: 0.18, lo: 300, hi: 2600 }, amp: { a: 0.1, d: 0.3, s: 0.9, r: 0.25 }, send: 0.28, level: 0.26 }),
  tomBass: P({ osc: [{ wave: "saw" }, { wave: "pulse50", gain: 0.6 }], filter: { freq: 1400, hz: true, q: 2, env: 2, envDecay: 0.15, poles: 4, sweep: { rate: 0.06, octaves: 0.3 } }, hp: 60, amp: { a: 0.005, d: 0.3, s: 0.75, r: 0.08 }, send: 0.05, level: 0.3 }),
  // D302, VOCAL SYNTH (the owner: "a vocal based preset … inspired by this Asian vocal synths which
  // emulate the singing voice of a character with utmost detail"): five singers by formant synthesis
  // (Patch.sing), each its own voice type, size, vowel and consonant, so the lines are told apart as
  // singers are: top down "la" (a bright young soprano, the "idol" timbre: a lift at 3 kHz, a wide late
  // vibrato, a scoop of 80 cents into each new syllable), "mi" (a smaller, breathier soprano: the second
  // of five), "ro" (a mezzo's dark "o", the tap of a Japanese r), "ne" (a tenor), "da" (a bass, no
  // vibrato, its formants about 0.6-2.8 kHz: a phone hears it though its pitch lies under 150 Hz).
  // Joined notes sung on one vowel, the pitch gliding; detached, a new syllable; a phrase's end falls.
  // D304 (the owner: "Why there's a tinkling sound in the background … Any way to make the lower Asian
  // voices less trumpet-y and more human?"): the source no longer flat for all: the top's bright glottis
  // kept (the "idol"), the second's and the mezzo's softer (glottalWarm, -5 dB an octave), the tenor's
  // and the bass's softer still (glottalLow, -7 dB an octave: their flat pulse train buzzed like a trumpet); a
  // lowpass over each (`top`: 7 kHz on the top down to 3.5 kHz on the bass: the harmonics leaking
  // through the formants' skirts up to 10 kHz, wobbling with the vibrato and the scoops, were the
  // glitter); the low voices' formants wider (`bw`), their F3-F5 lower (`upper`), more breath, sung on
  // "o" ("no", "do"), smaller scoops; the d's and r's bursts softer (CONSONANTS).
  vocLa: P({ osc: [{ wave: "glottal" }], sing: { vowel: "a", type: "soprano", size: 1.04, cons: "l", scoop: 70, over: 15, fall: 120, breath: 0.12, ring: 5, top: 7000 }, amp: { a: 0.03, d: 0.1, s: 1, r: 0.09 }, vib: { depth: 30, rate: 6.0, delay: 0.3 }, send: 0.16, level: 1.25 }),
  vocMi: P({ osc: [{ wave: "glottalWarm" }], sing: { vowel: "i", type: "soprano", size: 1.08, cons: "m", scoop: 50, over: 10, fall: 80, breath: 0.2, ring: 4, top: 6000 }, amp: { a: 0.035, d: 0.1, s: 1, r: 0.09 }, vib: { depth: 24, rate: 6.6, delay: 0.32 }, send: 0.16, level: 0.8 }),
  vocRo: P({ osc: [{ wave: "glottalWarm" }], sing: { vowel: "a", type: "alto", size: 1, cons: "r", scoop: 40, over: 8, fall: 80, breath: 0.2, ring: 2, top: 5000, bw: 1.15, upper: -3 }, amp: { a: 0.035, d: 0.1, s: 1, r: 0.09 }, vib: { depth: 20, rate: 5.4, delay: 0.34 }, send: 0.16, level: 0.59 }),
  vocNe: P({ osc: [{ wave: "glottalLow" }], sing: { vowel: "a", type: "tenor", size: 1, cons: "n", scoop: 25, over: 5, fall: 60, breath: 0.24, ring: 0, top: 4000, bw: 1.3, upper: -4 }, amp: { a: 0.04, d: 0.1, s: 1, r: 0.1 }, vib: { depth: 14, rate: 4.8, delay: 0.38 }, send: 0.14, level: 0.37 }),
  vocDa: P({ osc: [{ wave: "glottalLow" }], sing: { vowel: "a", type: "bass", size: 0.97, cons: "d", scoop: 20, over: 4, fall: 40, breath: 0.22, ring: 0, top: 3500, bw: 1.3, upper: -3 }, amp: { a: 0.035, d: 0.1, s: 1, r: 0.1 }, send: 0.1, level: 0.5 }),
  // D302, SOLO VOICES (the second vocal preset): recorded singers (VocalSet: a soprano, a mezzo, a
  // tenor and a bass, each singing "a"; FluidR3's choir "aah" for the second of five), each line its own
  // singer and consonant ("la", "na", "ra", "da", "ma": the voice opening from a lowpass, a burst for
  // the plosive), the pitch scooped into each new syllable and gliding into a joined note; their own
  // vibrato as recorded (no more added).
  // D304: smaller scoops (the recordings' rate moves their formants too: each scoop a chirp of the
  // highs), no synthesized burst (chip.ts), the d opening from 900 Hz.
  singS: P({ osc: [{ wave: "glottal" }], sing: { vowel: "a", type: "soprano", size: 1, cons: "l", scoop: 60, over: 12, fall: 80, breath: 0.1, ring: 3 }, syllable: { cons: "l", scoop: 35, over: 8, fall: 70 }, amp: { a: 0.03, d: 0.1, s: 1, r: 0.09 }, rec: { a: 0.03, d: 0, s: 1, r: 0.08 }, send: 0.16, level: 0.6, sample: "voiceS" }),
  singChoir: P({ osc: [{ wave: "glottal" }], sing: { vowel: "a", type: "alto", size: 1, cons: "m", scoop: 40, over: 8, fall: 60, breath: 0.15, ring: 2 }, syllable: { cons: "m", scoop: 25, over: 5, fall: 50 }, amp: { a: 0.05, d: 0.1, s: 1, r: 0.12 }, rec: { a: 0.05, d: 0, s: 1, r: 0.1 }, send: 0.2, level: 1.68, sample: "choirAah" }),
  singA: P({ osc: [{ wave: "glottal" }], sing: { vowel: "a", type: "alto", size: 1, cons: "n", scoop: 50, over: 10, fall: 70, breath: 0.12, ring: 2 }, syllable: { cons: "n", scoop: 30, over: 6, fall: 60 }, amp: { a: 0.035, d: 0.1, s: 1, r: 0.09 }, rec: { a: 0.035, d: 0, s: 1, r: 0.08 }, send: 0.16, level: 0.6, sample: "voiceA" }),
  singT: P({ osc: [{ wave: "glottal" }], sing: { vowel: "a", type: "tenor", size: 1, cons: "r", scoop: 50, over: 10, fall: 70, breath: 0.1, ring: 2 }, syllable: { cons: "r", scoop: 25, over: 5, fall: 50 }, amp: { a: 0.03, d: 0.1, s: 1, r: 0.09 }, rec: { a: 0.03, d: 0, s: 1, r: 0.08 }, send: 0.14, level: 0.6, sample: "voiceT" }),
  singB: P({ osc: [{ wave: "glottal" }], sing: { vowel: "a", type: "bass", size: 1, cons: "d", scoop: 40, over: 8, fall: 50, breath: 0.08, ring: 2 }, syllable: { cons: "d", scoop: 15, over: 3, fall: 40 }, amp: { a: 0.025, d: 0.1, s: 1, r: 0.09 }, rec: { a: 0.025, d: 0, s: 1, r: 0.08 }, send: 0.1, level: 0.6, sample: "voiceB" }),
} satisfies Record<string, Patch>;

export type PatchId = keyof typeof PATCHES;
export type Groove = "rock" | "jazz" | "bossa" | "brushes" | "chamber" | "chipMarch" | "chipDrive" | "chipHalf" | "chipArcade" | "chipBounce" | "chipFunk" | "cr78" | "funk808" | "analogRock" | "analogSoft"
  // D200: loops once given to single fugues (withdrawn in D208).
  | "tactus" | "lament" | "toccata" | "gigue" | "passepied" | "minuet" | "sarabande" | "gavotte" | "overture" | "triplet";
/** The drums' sound: a band's kit, a console's noise channel, an analog drum machine's circuits. */
export type Kit = "acoustic" | "chip" | "analog";

/** D297: the presets' own effects (chip.ts: the SNES's echo, and the reverbs of REVERBS). */
export type FxKind = "spc" | "echo" | "hall" | "cathedral" | "plate" | "space";

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
  /** The room's share (0.16 by default; the bands more). D297: 0, the shared room off while it plays (chip.ts `period`). */
  room?: number;
  /**
   * D297: the preset's own effect, fed by its patches' `send` (chip.ts `fxInput`): "spc", the SNES's
   * echo (80 ms, feedback 0.35 through a 2.8 kHz lowpass and a 300 Hz high-pass); "hall", the
   * PlayStation's dark half-rate reverb (25 ms pre-delay, the send high-passed at 350 Hz, RT60 about
   * 1.9 s, the return lowpassed at 5.5 kHz); D302: "cathedral", PIPE ORGAN's large church (45 ms
   * pre-delay, about 2.8 s, D304 2.2 s, its highs damped; D297's small "church" retired with CHAMBER
   * ORGAN; D304: "grove" and "room64" withdrawn with FOREST 64 and PARTY 64); "plate", VOCAL
   * SYNTH's bright, short plate; "echo", MEGA FM's short dark echo (chip.ts FM_ECHO); "space",
   * TOMITA's tape echo and long reverb (chip.ts REVERBS). None: no effect of its own.
   */
  fx?: FxKind;
  /**
   * D297: the voices by their number, top down, each its patch, its pan (within ±0.35, so the mix holds
   * on a phone's one speaker) and a level (1 as the patch), where the five slots cannot say it (the
   * report's three-voice middle is not its five-voice middle). Counts not given: the slots, the usual pans.
   */
  by?: Partial<Record<number, readonly (readonly [patch: PatchId, pan: number, level?: number])[]>>;
}

/**
 * D292: the players' sounds, five and no more (the owner: "let's restrict sound options to just 4: chip
 * basic, another chip possibility (more well rounded than first which is crisper?), harpsichord, piano
 * (… let's try both options and thus have 5 sound options)"): the classic chip, a rounder chip, the
 * recorded harpsichord, the recorded grand piano and an FM piano. In this order on the pop-up and in ⚙
 * SOUND. The ensembles (STRINGS, BAROQUE, WINDS, CONSORT, BOSSA NOVA), the nine consoles after classic
 * soundtracks and WENDY CARLOS are withdrawn (their patches kept above); a stored choice of one opens
 * as RETIRED says. D294 (the owner's ratings: ROUND CHIP "too mellow and feeble", PIANO (FM) "added
 * nothing"): GAME BOY takes ROUND CHIP's place, ANALOG SYNTH (WENDY CARLOS's patches, remade) PIANO (FM)'s.
 * D297: and, after the five (ANALOG SYNTH remade as SWITCHED-ON), ten presets for the owner to judge
 * (fifteen for now): three after the research report's consoles, then SID 64, TRACKER, CHAMBER ORGAN,
 * the two N64 presets, and two niche picks, MODULAR and TOMITA.
 */
export const PRESETS: Preset[] = [
  // D209: the game's own sound: 2A03-like pulses of three widths over a triangle (on a phone, D291, a pulse bass).
  { id: "chip", name: "CLASSIC CHIP", slots: null, drums: "chipMarch", kit: "chip", room: 0.22 },
  // D294: GAME BOY (in place of D292's ROUND CHIP): the DMG's pulses and wave channel; no drums (DRUMS stays the classic chip's).
  { id: "gameboy", name: "GAME BOY", slots: ["gbLead", "gbHarm", "gbWave", "gbThin", "gbBass"], room: 0.18 },
  // D190: recorded, every voice on the one instrument (as Bach played his fugues).
  { id: "harpsichordSampled", name: "HARPSICHORD (SAMPLED)", slots: ["harpsiSampled", "harpsiSampled", "harpsiSampled", "harpsiSampled", "harpsiBassSampled"], room: 0.24 },
  // D292: the Salamander Grand (Alexander Holm, CC BY 3.0), every voice on it; D294: the inner voices a shade lighter.
  { id: "pianoSampled", name: "PIANO (SAMPLED)", slots: ["pianoSampled", "pianoInnerSampled", "pianoInnerSampled", "pianoInnerSampled", "pianoBassSampled"], room: 0.22 },
  // D294: ANALOG SYNTH (in place of D292's PIANO (FM)): WENDY CARLOS's patches (D209) revived, after Switched-On Bach.
  // D297: remade as SWITCHED-ON (the owner: "lackluster"; the id kept, so a stored choice keeps it): the
  // ladder's spit and resonance, the drift, a bass that snaps; the D294 patches kept above (carlos*).
  {
    id: "analog",
    name: "SWITCHED-ON",
    slots: ["solLead", "solSquare", "solNasal", "solBloop", "solBass"],
    // D304: nearly dry (Carlos's records are close and dry; 0.24 fogged the lines).
    room: 0.05,
    by: {
      2: [["solLead", 0.25], ["solBass", -0.1]],
      3: [["solLead", 0.3], ["solBloop", -0.3], ["solBass", 0]],
      4: [["solLead", 0.3], ["solNasal", -0.25], ["solBloop", 0.15], ["solBass", 0]],
      5: [["solLead", 0.3], ["solSquare", -0.3, 0.84], ["solNasal", 0.1], ["solBloop", -0.1, 0.94], ["solBass", 0]],
    },
  },
  // D297: three period presets after the research report (§6.1-6.3), after the five, for the owner to
  // judge: no piece opens on them. Named for what they are, not after the consoles (trademarks).
  // SUPER 16-BIT (D302 remade): violin, flute (five voices), harpsichord, the strings (four), bassoon; the SPC echo, longer, in stereo.
  {
    id: "super16",
    name: "SUPER 16-BIT",
    slots: ["s16Violin", "s16Flute", "s16Harpsi", "s16Strings", "s16Bassoon"],
    room: 0,
    fx: "spc",
    by: {
      2: [["s16Violin", 0.25], ["s16Bassoon", -0.1]],
      3: [["s16Violin", 0.25], ["s16Harpsi", -0.25], ["s16Bassoon", 0]],
      4: [["s16Violin", 0.25], ["s16Harpsi", -0.25], ["s16Strings", 0.12], ["s16Bassoon", 0]],
      5: [["s16Violin", 0.25], ["s16Flute", -0.3, 0.84], ["s16Harpsi", 0.1], ["s16Strings", -0.12, 0.94], ["s16Bassoon", 0]],
    },
  },
  // NOCTURNE 32-BIT: violin, harpsichord, viola, the organ's pedal; oboe as the fifth voice; the dark hall.
  {
    id: "nocturne32",
    name: "NOCTURNE 32-BIT",
    slots: ["n32Violin", "n32Oboe", "n32Harpsi", "n32Viola", "n32Organ"],
    room: 0,
    fx: "hall",
    by: {
      2: [["n32Violin", 0.25], ["n32Organ", 0]],
      3: [["n32Violin", 0.25], ["n32Harpsi", -0.25], ["n32Organ", 0]],
      4: [["n32Violin", 0.25], ["n32Harpsi", -0.25], ["n32Viola", -0.05], ["n32Organ", 0]],
      5: [["n32Violin", 0.25], ["n32Oboe", -0.3, 0.84], ["n32Harpsi", 0.1], ["n32Viola", -0.1, 0.94], ["n32Organ", 0]],
    },
  },
  // MEGA FM (D302 remade): a fed-back lead, brass (five voices), an e-piano (four), a clav (three to five), the slap bass; a short dark echo.
  {
    id: "megaFm",
    name: "MEGA FM",
    slots: ["fmLead", "fmBrass", "fmPiano", "fmClav", "fmBass"],
    room: 0,
    fx: "echo",
    by: {
      2: [["fmLead", 0.3], ["fmBass", 0]],
      3: [["fmLead", 0.3], ["fmClav", -0.3], ["fmBass", 0]],
      4: [["fmLead", 0.3], ["fmPiano", -0.3], ["fmClav", 0.12], ["fmBass", 0]],
      5: [["fmLead", 0.3], ["fmBrass", -0.25, 0.84], ["fmPiano", 0.1], ["fmClav", -0.1, 0.94], ["fmBass", 0]],
    },
  },
  // D297, after the owner asked for "a few more presets … covering different synth aesthetics": SID 64,
  // TRACKER and CHAMBER ORGAN (the triage in DECISIONS.md D297).
  // SID 64: a moving-width pulse lead, a sawtooth, a triangle, a thin faster pulse, a filtered pulse bass.
  {
    id: "sid64",
    name: "SID 64",
    slots: ["sidLead", "sidThin", "sidSaw", "sidTri", "sidBass"],
    room: 0,
    by: {
      2: [["sidLead", 0.25], ["sidBass", -0.1]],
      3: [["sidLead", 0.3], ["sidSaw", -0.3], ["sidBass", 0]],
      4: [["sidLead", 0.3], ["sidSaw", -0.25], ["sidTri", 0.15], ["sidBass", 0]],
      5: [["sidLead", 0.3], ["sidThin", -0.3, 0.84], ["sidSaw", 0.1], ["sidTri", -0.1, 0.94], ["sidBass", 0]],
    },
  },
  // TRACKER (D302 punchier): violin, flute (five voices), harpsichord, the 8-bit choir (four and five), a slapped bass; hard left and right (±0.35).
  {
    id: "tracker",
    name: "TRACKER",
    slots: ["trkViolin", "trkFlute", "trkHarpsi", "trkChoir", "trkBass"],
    room: 0,
    by: {
      2: [["trkViolin", -0.35], ["trkBass", 0.35]],
      3: [["trkViolin", -0.35], ["trkHarpsi", 0.35], ["trkBass", -0.15]],
      4: [["trkViolin", -0.35], ["trkHarpsi", 0.35], ["trkChoir", -0.35], ["trkBass", 0.35]],
      5: [["trkViolin", -0.35], ["trkFlute", 0.35, 0.84], ["trkHarpsi", -0.35], ["trkChoir", 0.35, 0.94], ["trkBass", 0]],
    },
  },
  // D302: PIPE ORGAN (CHAMBER ORGAN remade, its id kept so a stored choice keeps it). D304: a sweet flute
  // on top, a Principal, the Trompete (the top of two), the Krummhorn the second of five, the recorded pedal.
  {
    id: "chamberOrgan",
    name: "PIPE ORGAN",
    slots: ["orgFlute", "orgKrumm", "orgPrincipal", "orgTrompete", "orgPedal"],
    room: 0,
    fx: "cathedral",
    by: {
      2: [["orgTrompete", 0.2], ["orgPedal", -0.1]],
      3: [["orgFlute", 0.25], ["orgTrompete", -0.25], ["orgPedal", 0]],
      4: [["orgFlute", 0.25], ["orgPrincipal", -0.25], ["orgTrompete", 0.12], ["orgPedal", 0]],
      5: [["orgFlute", 0.25], ["orgKrumm", -0.3, 0.84], ["orgPrincipal", 0.12], ["orgTrompete", -0.12, 0.94], ["orgPedal", 0]],
    },
  },
  // D302: VOCAL SYNTH: five synthesized singers (la, mi, ro, ne, da) in a bright plate.
  {
    id: "vocalSynth",
    name: "VOCAL SYNTH",
    slots: ["vocLa", "vocMi", "vocRo", "vocNe", "vocDa"],
    room: 0,
    fx: "plate",
    by: {
      2: [["vocLa", 0.25], ["vocDa", -0.1]],
      3: [["vocLa", 0.25], ["vocRo", -0.25], ["vocDa", 0]],
      4: [["vocLa", 0.25], ["vocRo", -0.25], ["vocNe", 0.12], ["vocDa", 0]],
      5: [["vocLa", 0.25], ["vocMi", -0.3, 0.84], ["vocRo", 0.1], ["vocNe", -0.12, 0.94], ["vocDa", 0]],
    },
  },
  // D302: SOLO VOICES: four recorded singers and a choir, each line its own syllable, in the plate.
  {
    id: "soloVoices",
    name: "SOLO VOICES",
    slots: ["singS", "singChoir", "singA", "singT", "singB"],
    room: 0,
    fx: "plate",
    by: {
      2: [["singS", 0.25], ["singB", -0.1]],
      3: [["singS", 0.25], ["singA", -0.25], ["singB", 0]],
      4: [["singS", 0.25], ["singA", -0.25], ["singT", 0.12], ["singB", 0]],
      5: [["singS", 0.25], ["singChoir", -0.3, 0.84], ["singA", 0.1], ["singT", -0.12, 0.94], ["singB", 0]],
    },
  },
  // D297, MODULAR (a niche pick). D304: East and West coast: a synced lead, a wavefolder, a low-pass gate's bongo, an FM bell, a sequencer's bass.
  {
    id: "modular",
    name: "MODULAR",
    slots: ["modLead", "modFold", "modBongo", "modBell", "modBass"],
    room: 0.12,
    by: {
      2: [["modLead", 0.25], ["modBass", -0.1]],
      3: [["modLead", 0.3], ["modBongo", -0.3], ["modBass", 0]],
      4: [["modLead", 0.3], ["modBongo", -0.25], ["modBell", 0.15], ["modBass", 0]],
      5: [["modLead", 0.3], ["modFold", -0.3, 0.84], ["modBongo", 0.1], ["modBell", -0.1, 0.94], ["modBass", 0]],
    },
  },
  // D297, TOMITA (a niche pick, lush; the owner: "Sometimes a lush one might be nice to have as a more
  // niche pick"): the whistle, the flute, the choir and the strings in a space echo and a long reverb,
  // the outer voices kept nearly dry; the voices wide (±0.35).
  {
    id: "tomita",
    name: "TOMITA",
    slots: ["tomWhistle", "tomStrings", "tomFlute", "tomChoir", "tomBass"],
    room: 0,
    fx: "space",
    by: {
      2: [["tomWhistle", 0.35], ["tomBass", -0.1]],
      3: [["tomWhistle", 0.35], ["tomFlute", -0.35], ["tomBass", 0]],
      4: [["tomWhistle", 0.35], ["tomFlute", -0.35], ["tomChoir", 0.2], ["tomBass", 0]],
      5: [["tomWhistle", 0.35], ["tomStrings", -0.35, 0.84], ["tomFlute", 0.2], ["tomChoir", -0.2, 0.94], ["tomBass", 0]],
    },
  },
];

/**
 * D219: the player's voice over Kimiko Ishizaka's piano (WITH KIMIKO ISHIZAKA's default): a breathy,
 * sustained baroque flute on top, a soft stopped organ flute below: no hammer, so heard apart from her.
 * D292: out of the players' choices, kept for that mode alone (presetById still finds it).
 */
export const TRAVERSO: Preset = { id: "traverso", name: "TRAVERSO", slots: ["traverso", "traverso", "traverso", "organFlute", "organFlute"], room: 0.2 };

/**
 * D249: the sampled organ, out of the players' choices (PRESETS) until the new organs come
 * (ROADMAP Batch 2); set only as a preset object (setPreset(ORGAN_SAMPLED)), by the tests.
 */
export const ORGAN_SAMPLED: Preset = { id: "organSampled", name: "ORGAN (SAMPLED)", slots: ["organSampled", "organSampled", "organSampled", "organSampled", "organSampled"], room: 0.24 };

/** D249: presets withdrawn, and what a stored choice of one opens as instead. */
/** D288: the sampled ensembles withdrawn (muddled on a phone speaker): a choice of one plays classic chip. */
/** D292: every sound but the five withdrawn: the harpsichord-like to the recorded harpsichord, the rest to classic chip. */
export const RETIRED: Readonly<Record<string, string>> = {
  organSampled: "harpsichordSampled",
  harpsichord: "harpsichordSampled",
  stringsReal: "chip",
  baroqueBand: "chip",
  reedTrio: "chip",
  windTrio: "chip",
  clarinetTrio: "chip",
  windsReal: "chip",
  galantTrio: "chip",
  strings: "chip",
  baroque: "chip",
  winds: "chip",
  consort: "chip",
  bossa: "chip",
  // D294: the two sounds replaced, and the withdrawn ones they grew from, open on their successors.
  chipRound: "gameboy",
  pianoFm: "analog",
  carlos: "analog",
  chipPocket: "gameboy",
  chipGold: "gameboy",
  chipPlumber: "chip",
  chipHyrule: "chip",
  chipBomber: "chip",
  chipVampire: "chip",
  chipDino: "chip",
  chipLight: "chip",
  chipBlur: "chip",
  // D302: the N64 presets remade; D304: withdrawn (the owner gave FOREST 64 and PARTY 64 a 0): a stored
  // choice opens on NOCTURNE 32-BIT (sampled instruments of the next console generation, the nearest kin).
  temple64: "nocturne32",
  agent64: "nocturne32",
  forest64: "nocturne32",
  party64: "nocturne32",
};
/** D292: the recorded piano's credit (CC BY 3.0 asks for it), shown wherever the sound is chosen. */
export const PIANO_CREDIT = "PIANO: SALAMANDER GRAND PIANO V3 · ALEXANDER HOLM · CC BY 3.0";
/** The credit a sound owes, if any. */
/** D302: SOLO VOICES' singers (VocalSet, CC BY 4.0) and the choir "aah" it and TRACKER sing with (FluidR3's, as rendered for midi-js-soundfonts, CC BY 3.0). */
export const VOICES_CREDIT = "VOICES: VOCALSET · J. WILKINS, P. SEETHARAMAN, A. WAHL, B. PARDO · CC BY 4.0";
export const CHOIR_CREDIT = "CHOIR: FLUIDR3_GM · FRANK WEN · MIDI-JS-SOUNDFONTS · CC BY 3.0";
const CREDITS: Record<string, string> = { pianoSampled: PIANO_CREDIT, soloVoices: `${VOICES_CREDIT} · ${CHOIR_CREDIT}`, tracker: CHOIR_CREDIT };
export const creditFor = (id: string): string | null => CREDITS[presetById(id).id] ?? null;
/** A sound the players may choose (D292: one of the five). */
export const offered = (id: string) => PRESETS.some((p) => p.id === id);
/** D292: a stored choice as one of the five: a withdrawn one's stand-in (RETIRED), anything else not offered (TRAVERSO, an unknown id) CLASSIC CHIP. */
export function playerSound(id: string): string {
  const r = RETIRED[id] ?? id;
  return offered(r) ? r : "chip";
}
/** A preset by its id (a withdrawn one's stand-in, D249; TRAVERSO for WITH KIMIKO, D219; else CLASSIC CHIP). */
export const presetById = (id: string) => [...PRESETS, TRAVERSO].find((p) => p.id === (RETIRED[id] ?? id)) ?? PRESETS[0];

/** Which of the five slots each of n voices takes (from the top down). */
export function slotOf(voice: number, count: number): number {
  const map: Record<number, number[]> = { 1: [0], 2: [0, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };
  return (map[count] ?? map[5])[Math.min(voice, (map[count] ?? map[5]).length - 1)];
}

/** The ensemble playing now (set from the settings), and whether CHIP's and MOOG's drums play. */
let current: Preset = presetById("chip");
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
  const ids = [...(current.slots ?? []), ...Object.values(current.by ?? {}).flatMap((vs) => (vs ?? []).map(([id]) => id))];
  return [...new Set(ids.map((id) => PATCHES[id].sample).filter((s): s is SampledId => !!s))];
}

/** D297: a voice's entry in the preset's own layout for its number of voices (Preset.by), if it has one. */
const byOf = (voice: number, count: number) => {
  const vs = current.by?.[count];
  return vs ? vs[Math.min(voice, vs.length - 1)] : null;
};

/** A voice's patch in the ensemble now, or null for the classic chip sound. */
export function patchFor(voice: number, count: number): Patch | null {
  const by = byOf(voice, count);
  if (by) return PATCHES[by[0]];
  return current.slots ? PATCHES[current.slots[slotOf(voice, count)]] : null;
}

/** D297: a voice's pan and level in the ensemble now where its preset sets them (Preset.by), else null. */
export function placeFor(voice: number, count: number): { pan: number; level: number } | null {
  const by = byOf(voice, count);
  return by ? { pan: by[1], level: by[2] ?? 1 } : null;
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
