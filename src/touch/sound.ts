/**
 * The ensembles (D177): presets that give each voice an instrument of its own, chosen together so
 * the voices stand apart and sound well together (some sustained, some plucked and dying away; bright
 * above, round below), in four families: ACOUSTIC, BANDS (with a rhythm section), CHIP and MOOG. All
 * is synthesized (oscillators, filters, envelopes, a little drive, vowel formants): no recordings.
 * A patch is played by chip.ts; the player's own voice takes its patch, shaped by the touch.
 */

export type Wave = "saw" | "square" | "triangle" | "sine" | "pulse12" | "pulse25" | "pulse50" | "organ" | "reed" | "bell";

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
}

const P = (p: Patch) => p;

/** The instruments. */
export const PATCHES = {
  // Strings and winds (ACOUSTIC).
  violin: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 7, gain: 0.5 }], filter: { freq: 7, q: 1, env: 1.5, envDecay: 0.2 }, amp: { a: 0.06, d: 0.2, s: 0.85, r: 0.12 }, vib: { depth: 14, rate: 5.6, delay: 0.25 }, level: 0.42 }),
  violin2: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: -6, gain: 0.5 }], filter: { freq: 5.5, q: 0.9, env: 1.3, envDecay: 0.2 }, amp: { a: 0.07, d: 0.2, s: 0.85, r: 0.12 }, vib: { depth: 11, rate: 5.2, delay: 0.3 }, level: 0.4 }),
  viola: P({ osc: [{ wave: "saw" }, { wave: "pulse25", gain: 0.4 }], filter: { freq: 4.5, q: 1, env: 1.3, envDecay: 0.25 }, amp: { a: 0.08, d: 0.2, s: 0.85, r: 0.14 }, vib: { depth: 10, rate: 5, delay: 0.3 }, level: 0.45 }),
  cello: P({ osc: [{ wave: "saw" }, { wave: "square", octave: -1, gain: 0.25 }], filter: { freq: 4, q: 1.1, env: 1.4, envDecay: 0.25 }, amp: { a: 0.08, d: 0.25, s: 0.85, r: 0.16 }, vib: { depth: 9, rate: 4.8, delay: 0.35 }, level: 0.55 }),
  oboe: P({ osc: [{ wave: "reed" }], filter: { freq: 6, q: 2, env: 1.2, envDecay: 0.1 }, amp: { a: 0.03, d: 0.1, s: 0.9, r: 0.08 }, vib: { depth: 8, rate: 5.5, delay: 0.3 }, level: 0.4 }),
  flute: P({ osc: [{ wave: "sine" }, { wave: "triangle", octave: 1, gain: 0.15 }], amp: { a: 0.05, d: 0.1, s: 0.9, r: 0.1 }, vib: { depth: 10, rate: 5, delay: 0.2 }, breath: 0.12, level: 0.55 }),
  clarinet: P({ osc: [{ wave: "square" }], filter: { freq: 4, q: 0.7 }, amp: { a: 0.03, d: 0.1, s: 0.9, r: 0.08 }, vib: { depth: 4, rate: 5, delay: 0.4 }, level: 0.38 }),
  bassoon: P({ osc: [{ wave: "reed" }, { wave: "saw", gain: 0.3 }], filter: { freq: 3, q: 1.4, env: 1.3, envDecay: 0.1 }, amp: { a: 0.04, d: 0.1, s: 0.9, r: 0.1 }, vib: { depth: 5, rate: 5, delay: 0.4 }, level: 0.5 }),
  recorder: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: 1, gain: 0.1 }], amp: { a: 0.03, d: 0.1, s: 0.92, r: 0.06 }, vib: { depth: 6, rate: 5.2, delay: 0.35 }, breath: 0.08, level: 0.55 }),
  viol: P({ osc: [{ wave: "saw" }, { wave: "pulse25", gain: 0.3 }], filter: { freq: 4.5, q: 0.8, env: 1.6, envDecay: 0.15 }, amp: { a: 0.05, d: 0.3, s: 0.7, r: 0.1 }, vib: { depth: 4, rate: 5, delay: 0.5 }, level: 0.48 }),
  harpsichord: P({ osc: [{ wave: "saw" }, { wave: "pulse25", octave: 1, gain: 0.35 }], filter: { freq: 10, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.002, d: 0.9, s: 0, r: 0.08 }, level: 0.36 }),
  harpsiBass: P({ osc: [{ wave: "saw" }, { wave: "pulse25", gain: 0.3 }], filter: { freq: 6, q: 1, env: 2, envDecay: 0.2 }, amp: { a: 0.002, d: 1.2, s: 0, r: 0.08 }, level: 0.45 }),
  lute: P({ osc: [{ wave: "triangle" }, { wave: "saw", gain: 0.3 }], filter: { freq: 4, q: 1.2, env: 2, envDecay: 0.1 }, amp: { a: 0.003, d: 0.7, s: 0, r: 0.1 }, level: 0.42 }),
  // Bands.
  leadGuitar: P({ osc: [{ wave: "saw" }, { wave: "square", detune: 5, gain: 0.5 }], filter: { freq: 2600, hz: true, q: 1.2, env: 1.3, envDecay: 0.2 }, amp: { a: 0.005, d: 0.4, s: 0.75, r: 0.1 }, vib: { depth: 20, rate: 5.5, delay: 0.35 }, drive: 6, level: 0.22 }),
  rhythmGuitar: P({ osc: [{ wave: "square" }, { wave: "saw", octave: -1, gain: 0.4 }], filter: { freq: 1800, hz: true, q: 1 }, amp: { a: 0.004, d: 0.5, s: 0.6, r: 0.08 }, drive: 3, level: 0.22 }),
  rockOrgan: P({ osc: [{ wave: "organ" }], amp: { a: 0.01, d: 0.1, s: 1, r: 0.06 }, vib: { depth: 8, rate: 6.5, delay: 0 }, trem: { depth: 0.15, rate: 6.5 }, level: 0.32 }),
  bassGuitar: P({ osc: [{ wave: "square" }, { wave: "sine", gain: 0.8 }], filter: { freq: 3, q: 1, env: 2, envDecay: 0.15 }, amp: { a: 0.004, d: 0.5, s: 0.6, r: 0.08 }, level: 0.5 }),
  altoSax: P({ osc: [{ wave: "reed" }, { wave: "saw", gain: 0.3 }], filter: { freq: 5, q: 2.5, env: 1.6, envDecay: 0.15 }, amp: { a: 0.04, d: 0.2, s: 0.85, r: 0.1 }, vib: { depth: 18, rate: 5, delay: 0.3 }, drive: 1.5, breath: 0.05, level: 0.36 }),
  mutedTrumpet: P({ osc: [{ wave: "square" }, { wave: "saw", gain: 0.5 }], filter: { freq: 3, q: 4, env: 2, envDecay: 0.12 }, amp: { a: 0.03, d: 0.2, s: 0.75, r: 0.08 }, vib: { depth: 10, rate: 5.5, delay: 0.35 }, level: 0.32 }),
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
  carlosLead: P({ osc: [{ wave: "square" }], filter: { freq: 3, q: 5, env: 3, envDecay: 0.2 }, amp: { a: 0.01, d: 0.3, s: 0.7, r: 0.08 }, level: 0.4 }),
  carlosZap: P({ osc: [{ wave: "saw" }], filter: { freq: 2.5, q: 7, env: 4, envDecay: 0.12 }, amp: { a: 0.005, d: 0.25, s: 0.6, r: 0.06 }, level: 0.36 }),
  carlosReed: P({ osc: [{ wave: "pulse25" }], filter: { freq: 4, q: 3, env: 2, envDecay: 0.3 }, amp: { a: 0.02, d: 0.2, s: 0.8, r: 0.08 }, level: 0.5 }),
  carlosBass: P({ osc: [{ wave: "saw" }, { wave: "square", octave: -1, gain: 0.6 }], filter: { freq: 400, hz: true, q: 3, env: 2, envDecay: 0.15 }, amp: { a: 0.005, d: 0.3, s: 0.7, r: 0.06 }, level: 0.5 }),
  minimoog: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 9 }, { wave: "saw", detune: -9, octave: -1, gain: 0.5 }], filter: { freq: 3, q: 3, env: 2.5, envDecay: 0.25 }, amp: { a: 0.005, d: 0.3, s: 0.8, r: 0.08 }, level: 0.26 }),
  squareReed: P({ osc: [{ wave: "square" }, { wave: "square", detune: 6, gain: 0.5 }], filter: { freq: 3.5, q: 2 }, amp: { a: 0.02, d: 0.2, s: 0.85, r: 0.08 }, vib: { depth: 6, rate: 5.5, delay: 0.3 }, level: 0.3 }),
  brass: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 5 }], filter: { freq: 1.6, q: 1.5, env: 4, envDecay: 0.45 }, amp: { a: 0.06, d: 0.3, s: 0.85, r: 0.1 }, level: 0.3 }),
  subBass: P({ osc: [{ wave: "triangle" }, { wave: "sine", octave: -1, gain: 0.8 }], amp: { a: 0.01, d: 0.3, s: 0.9, r: 0.08 }, level: 0.5 }),
  bells: P({ osc: [{ wave: "bell" }, { wave: "sine", octave: 1, gain: 0.3 }], amp: { a: 0.002, d: 1.1, s: 0, r: 0.2 }, level: 0.5 }),
  pad: P({ osc: [{ wave: "saw" }, { wave: "saw", detune: 12 }, { wave: "saw", detune: -12 }], filter: { freq: 2.2, q: 1 }, amp: { a: 0.15, d: 0.4, s: 0.85, r: 0.25 }, vib: { depth: 5, rate: 4, delay: 0.5 }, level: 0.22 }),
  pwmLead: P({ osc: [{ wave: "pulse25" }, { wave: "pulse12", detune: 8, gain: 0.7 }], filter: { freq: 5, q: 2, env: 1.5, envDecay: 0.2 }, amp: { a: 0.01, d: 0.2, s: 0.85, r: 0.08 }, vib: { depth: 9, rate: 6, delay: 0.25 }, level: 0.3 }),
  // Chip sets.
  nesTop: P({ osc: [{ wave: "pulse12" }], amp: { a: 0.002, d: 0.08, s: 0.75, r: 0.04 }, level: 0.42 }),
  nesMid: P({ osc: [{ wave: "pulse25" }], amp: { a: 0.002, d: 0.08, s: 0.75, r: 0.04 }, level: 0.42 }),
  nesTri: P({ osc: [{ wave: "triangle" }], amp: { a: 0.002, d: 0.05, s: 1, r: 0.03 }, level: 0.8 }),
  gbWave: P({ osc: [{ wave: "pulse50" }], filter: { freq: 2800, hz: true }, amp: { a: 0.002, d: 0.25, s: 0.55, r: 0.05 }, level: 0.5 }),
  gbSoft: P({ osc: [{ wave: "triangle" }, { wave: "pulse50", gain: 0.25 }], amp: { a: 0.002, d: 0.4, s: 0.4, r: 0.05 }, level: 0.6 }),
  sidSaw: P({ osc: [{ wave: "saw" }, { wave: "pulse25", detune: 4, gain: 0.6 }], filter: { freq: 3, q: 6, env: 2, envDecay: 0.2 }, amp: { a: 0.002, d: 0.2, s: 0.7, r: 0.05 }, level: 0.3 }),
  sidPulse: P({ osc: [{ wave: "pulse25" }, { wave: "pulse12", detune: 10, gain: 0.7 }], amp: { a: 0.002, d: 0.2, s: 0.7, r: 0.05 }, vib: { depth: 15, rate: 7, delay: 0.15 }, level: 0.3 }),
  atari: P({ osc: [{ wave: "pulse50" }], amp: { a: 0.001, d: 0.1, s: 0.8, r: 0.02 }, drive: 4, level: 0.35 }),
  arcadeBell: P({ osc: [{ wave: "bell" }], amp: { a: 0.002, d: 0.6, s: 0.3, r: 0.08 }, level: 0.5 }),
} satisfies Record<string, Patch>;

export type PatchId = keyof typeof PATCHES;
export type Groove = "rock" | "jazz" | "bossa" | "brushes" | "chipMarch" | "chipDrive" | "chipHalf" | "chipArcade" | "cr78" | "funk808" | "analogRock" | "analogSoft";
/** The drums' sound: a band's kit, a console's noise channel, an analog drum machine's circuits. */
export type Kit = "acoustic" | "chip" | "analog";

export interface Preset {
  id: string;
  name: string;
  /** The voices' instruments from the top down: top, upper inner, inner, lower inner, bass. Null: the classic chip sound. */
  slots: [PatchId, PatchId, PatchId, PatchId, PatchId] | null;
  /** A band's rhythm section, always. */
  groove?: Groove;
  /** D181: CHIP and MOOG: a drum loop, when DRUMS is on; and its kit. */
  drums?: Groove;
  kit?: Kit;
  /** The room's share (0.16 by default; the bands more). */
  room?: number;
}

export const FAMILIES: { name: string; presets: Preset[] }[] = [
  {
    name: "ACOUSTIC",
    presets: [
      { id: "strings", name: "STRINGS", slots: ["violin", "violin2", "viola", "viola", "cello"] },
      { id: "baroque", name: "BAROQUE BAND", slots: ["oboe", "violin", "harpsichord", "harpsichord", "cello"] },
      { id: "winds", name: "WINDS", slots: ["flute", "oboe", "clarinet", "clarinet", "bassoon"] },
      { id: "consort", name: "CONSORT", slots: ["recorder", "lute", "viol", "viol", "harpsiBass"] },
    ],
  },
  {
    name: "BANDS",
    presets: [
      { id: "rock", name: "ROCK BAND", slots: ["leadGuitar", "rockOrgan", "rhythmGuitar", "rhythmGuitar", "bassGuitar"], groove: "rock", room: 0.26 },
      { id: "jazz", name: "JAZZ BAND", slots: ["altoSax", "mutedTrumpet", "vibraphone", "jazzPiano", "uprightBass"], groove: "jazz", room: 0.3 },
      { id: "bossa", name: "BOSSA NOVA", slots: ["softFlute", "rhodes", "nylonGuitar", "nylonGuitar", "softBass"], groove: "bossa", room: 0.3 },
      { id: "swingle", name: "SWINGLE", slots: ["sopDah", "altoDoo", "tenDah", "tenDah", "uprightBass"], groove: "brushes", room: 0.34 },
    ],
  },
  {
    name: "CHIP",
    presets: [
      { id: "chip", name: "CHIP", slots: null, drums: "chipMarch", kit: "chip" },
      { id: "chip2", name: "CHIP 2 · NES", slots: ["nesTop", "nesMid", "nesMid", "nesTop", "nesTri"], drums: "chipArcade", kit: "chip" },
      { id: "chip3", name: "CHIP 3 · GAME BOY", slots: ["gbWave", "nesMid", "gbSoft", "gbSoft", "nesTri"], drums: "chipHalf", kit: "chip" },
      { id: "chip4", name: "CHIP 4 · C64", slots: ["sidPulse", "sidSaw", "sidPulse", "sidSaw", "carlosBass"], drums: "chipDrive", kit: "chip" },
      { id: "chip5", name: "CHIP 5 · ARCADE", slots: ["arcadeBell", "atari", "nesMid", "atari", "nesTri"], drums: "chipArcade", kit: "chip" },
    ],
  },
  {
    name: "MOOG",
    presets: [
      { id: "carlos", name: "WENDY CARLOS", slots: ["carlosLead", "carlosReed", "carlosZap", "carlosReed", "carlosBass"], drums: "cr78", kit: "analog" },
      { id: "moog1", name: "MOOG 1 · LEADS", slots: ["minimoog", "squareReed", "minimoog", "squareReed", "subBass"], drums: "funk808", kit: "analog" },
      { id: "moog2", name: "MOOG 2 · REEDS", slots: ["squareReed", "pwmLead", "squareReed", "pwmLead", "carlosBass"], drums: "cr78", kit: "analog" },
      { id: "moog3", name: "MOOG 3 · BRASS", slots: ["brass", "pwmLead", "brass", "brass", "subBass"], drums: "analogRock", kit: "analog" },
      { id: "moog4", name: "MOOG 4 · BELLS", slots: ["bells", "carlosLead", "bells", "carlosReed", "subBass"], drums: "analogSoft", kit: "analog" },
    ],
  },
];

export const PRESETS = FAMILIES.flatMap((f) => f.presets);
export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === "chip")!;

/** Which of the five slots each of n voices takes (from the top down). */
export function slotOf(voice: number, count: number): number {
  const map: Record<number, number[]> = { 1: [0], 2: [0, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };
  return (map[count] ?? map[5])[Math.min(voice, (map[count] ?? map[5]).length - 1)];
}

/** The ensemble playing now (set from the settings), and whether CHIP's and MOOG's drums play. */
let current: Preset = presetById("bossa");
let drumsOn = false;
export function setPreset(id: string) {
  current = presetById(id);
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
    case "rock":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 1 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.9 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.5 : 0.8 });
      if (per === 4 && b === 2) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.6 });
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
    case "brushes":
      out.push({ drum: "brush", at: 0, vel: 0.7 });
      if (back) out.push({ drum: "hat", at: 0, vel: 0.4 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.3 });
      break;
    // D181, the consoles' loops (CHIP).
    case "chipMarch":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 0.9 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.8 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: 0.35 });
      break;
    case "chipDrive":
      out.push({ drum: "kick", at: 0, vel: 0.9 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.85 });
      out.push({ drum: "hat", at: subs[subs.length - 1], vel: 0.55 });
      break;
    case "chipHalf":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.9 });
      if (b === Math.floor(per / 2) && per > 1) out.push({ drum: "snare", at: 0, vel: 0.85 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.25 : 0.4 });
      break;
    case "chipArcade":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.9 });
      if (b === 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.7 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.8 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: 0.3 });
      break;
    // The analog drum machines' loops (MOOG).
    case "cr78":
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.3 : 0.45 });
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.8 });
      if (b === per - 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.55 });
      if (back) out.push({ drum: "rim", at: 0, vel: 0.5 });
      break;
    case "funk808":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 1 });
      if (b === 1) out.push({ drum: "kick", at: subs[subs.length - 1], vel: 0.75 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.7 }, { drum: "clap", at: 0, vel: 0.6 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: s ? 0.35 : 0.5 });
      break;
    case "analogRock":
      if (b === 0 || (per === 4 && b === 2)) out.push({ drum: "kick", at: 0, vel: 1 });
      if (back) out.push({ drum: "snare", at: 0, vel: 0.9 });
      for (const s of subs) out.push({ drum: "hat", at: s, vel: 0.45 });
      break;
    case "analogSoft":
      if (b === 0) out.push({ drum: "kick", at: 0, vel: 0.6 });
      for (const s of subs) out.push({ drum: "shaker", at: s, vel: s ? 0.25 : 0.4 });
      if (b === per - 1) out.push({ drum: "rim", at: subs[subs.length - 1], vel: 0.45 });
      break;
  }
  return out;
}
