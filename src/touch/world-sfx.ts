/**
 * D623-D629, THE PILOT WORLDS' SOUND EFFECTS (instruments session, with the design studio's D479): unpitched effects
 * for the worlds of II/1-II/6, on the musical events the pictures follow (form-points.ts: the entries' onsets, the
 * climax's rise and peak; stage-bg.ts reads the same). The stage emits no sound events: the sound reads the score.
 *
 *   II/1 THE OLYMPIAN    a crowd swell (filtered noise) over the climax's rise to its peak, gone before the last chord
 *   II/2 THE SHADOWS     nothing, deliberately
 *   II/3 THE SWITCHBOARD a patch-click on each entry's onset (a noise tick, a short filtered tail)
 *   II/4 THE CHASE       nothing: the far-off noise-band "siren" tried and dropped (D626: no siren without a pitch)
 *   II/5 THE BELL TOWER  nothing
 *   II/6 THE CATAPULT    a thud on each entry's onset; a rumble (under 1 s, high-passed off the bass) on the peak
 *
 * The rules: nothing pitched (noise through low-Q filters only: no oscillator, no tuned resonance, no glide); nothing of
 * the player's notes, right or wrong (the plan is the score's, fixed per piece); scheduled through Chip.scheduleSfx, the
 * drums' choke point's twin with its thinning (none before the first note, none in a general rest, at the band's
 * texture; none past the last chord); only in a pilot world, only where the game shows it in full (the design studio's
 * rule: a fugue with a world, STAGE FULL (QUIET and OFF silent), not the tutorial's box), and WORLD SOUNDS on. Pure: no audio here.
 */
import { beatOf, type TouchFugue } from "./fugue.ts";
import { formOf } from "./form-points.ts";
import { tempoOf } from "./tempi.ts";
import { wholeReadingOf } from "./readings.ts";
import { wholeMarks, wholePlan } from "./whole-reading.ts";
import { ART_HOLD } from "./phrasing.ts";
import { hasStage, stageMode } from "./stage-bg.ts";

export type SfxKind =
  | "swell" | "click" | "sweep" | "thud" | "rumble"
  // D640-D644, the second batch: the entries' one-shots and figures, the climaxes' shapes, the beds.
  | "crackle" | "plop" | "rustle" | "hoof" | "bubble" | "flipper" | "clack" | "page" | "rotary" | "hop" | "stamp" | "quake" | "hush"
  | "murmur" | "flutter" | "clatter"
  | "whirr" | "gravel" | "grass" | "rail" | "steps" | "vinyl" | "lowwind" | "rain" | "fair" | "ballroom" | "leaves" | "court" | "wind" | "harbour";
/** D640: what each effect follows: an entry's onset (a one-shot, or a figure fitted to the entry's own notes), the climax's ramp, or the whole piece (a bed). */
export type SfxEventKind = "entry" | "climax" | "bed";
/** The worlds and their effects (an empty list: no sound, deliberately; a fugue not listed: none). */
export const PILOT_SFX: Readonly<Record<string, readonly SfxKind[]>> = {
  wtc2f01: ["swell"],
  wtc2f02: [],
  wtc2f03: ["click"],
  // D626: THE CHASE's noise-band sweep built, measured and dropped (an unpitched band does not read as a siren at the
  // level allowed); the sound kept (SFX_SOUND.sweep) for the Sound Lab's A/B (SWEEP_TRIAL), never in the game.
  wtc2f04: [],
  wtc2f05: [],
  wtc2f06: ["thud", "rumble"],
  // D640-D644, the second batch (the studio's and the owner's list).
  wtc1f01: ["murmur"],
  wtc1f02: ["crackle"],
  wtc1f03: ["plop"],
  wtc1f04: [],
  wtc1f05: ["hush", "murmur"],
  wtc1f06: ["rustle"],
  wtc1f07: ["whirr"],
  wtc1f08: ["gravel"],
  wtc1f09: ["flutter"],
  wtc1f10: ["hoof"],
  wtc1f11: ["grass"],
  wtc1f12: [],
  wtc1f13: ["bubble"],
  wtc1f14: [],
  wtc1f15: ["flipper"],
  wtc1f16: ["clack"],
  wtc1f17: ["page"],
  wtc1f18: [],
  wtc1f19: ["clatter"],
  wtc1f20: ["rail"],
  wtc1f21: ["clack"],
  wtc1f22: ["steps"],
  wtc1f23: ["vinyl"],
  wtc1f24: ["lowwind"],
  wtc2f07: [],
  wtc2f08: ["rain"],
  wtc2f09: [],
  wtc2f10: ["fair"],
  wtc2f11: ["grass"],
  wtc2f12: ["ballroom"],
  wtc2f13: ["rotary"],
  wtc2f14: ["leaves"],
  wtc2f15: ["hop"],
  wtc2f16: ["court"],
  wtc2f17: [],
  wtc2f18: ["stamp"],
  wtc2f19: ["wind"],
  wtc2f20: ["quake"],
  wtc2f21: [],
  wtc2f22: ["harbour"],
  wtc2f23: [],
  wtc2f24: ["ballroom"],
};
/** D640: the worlds silent by design (the list's own). */
export const SILENT_SFX: readonly string[] = ["wtc1f04", "wtc1f12", "wtc1f14", "wtc1f18", "wtc2f07", "wtc2f09", "wtc2f17", "wtc2f21", "wtc2f23"];
/** D626: the dropped sweep, playable on II/4 in the Sound Lab only (its "sweep (dropped)" toggle). */
export const SWEEP_TRIAL: Readonly<Record<string, readonly SfxKind[]>> = { wtc2f04: ["sweep"] };

export interface SfxEvent {
  kind: SfxKind;
  /** The tick it lands on (the swell: where it begins). */
  tick: number;
  /** The swell: the tick it is gone by (the others: their tick). */
  end: number;
  /** The plan's level 0..1 (before the choke point's thinning). */
  vel: number;
  /** D640: a one-shot's variation (its entry's index: each crackle, rustle or burst of bubbles its own). */
  seed?: number;
}

/** D624: the swell's fade after the peak: over this share of the way from the peak to the last chord, at most to a beat before it. */
export const SWELL_FADE_SHARE = 0.6;
/** D624: the swell's surge (dB either way, a beat's level by the score's tick: a crowd's breath, not a tremolo). */
export const SWELL_SURGE_DB = 1.5;

const memo = new Map<string, SfxEvent[]>();
/** The piece's effects by tick (memoised), from its world's list (or `kinds`). */
export function sfxPlan(f: TouchFugue, kinds: readonly SfxKind[] = PILOT_SFX[f.id] ?? []): SfxEvent[] {
  const key = `${f.id}:${kinds.join(",")}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const F = formOf(f);
  const ons = [...new Set(f.entries.map((e) => e.on))].sort((a, b) => a - b);
  const out: SfxEvent[] = [];
  for (const k of kinds) {
    const C = CURVE_SOUND[k];
    if (C) {
      const v = trimOf(f.id, k);
      if (C.event === "bed") out.push({ kind: k, tick: ons[0] ?? 0, end: bedEnd(f, k), vel: v });
      else if (C.event === "climax" && C.shot) out.push({ kind: k, tick: F.climax.rise, end: F.climax.rise, vel: v });
      else if (C.event === "climax") out.push({ kind: k, tick: F.climax.rise, end: swellEnd(f), vel: v });
      else
        ons.forEach((t, i) => {
          if (!C.figure) return void out.push({ kind: k, tick: t, end: t, vel: v, seed: i });
          figureOf(f, t, C.figure).forEach((h, j) => out.push({ kind: k, tick: h, end: h, vel: v * (C.figure!.levels[j] ?? 0.7), seed: i * 8 + j }));
        });
      continue;
    }
    if (k === "click" || k === "thud") for (const t of ons) out.push({ kind: k, tick: t, end: t, vel: 1 });
    else if (k === "sweep") for (const t of ons.slice(1)) out.push({ kind: k, tick: t, end: t, vel: 1 });
    else if (k === "rumble") out.push({ kind: k, tick: F.climax.peak, end: F.climax.peak, vel: 1 });
    else if (k === "swell") out.push({ kind: k, tick: F.climax.rise, end: swellEnd(f), vel: 1 });
  }
  out.sort((a, b) => a.tick - b.tick);
  memo.set(key, out);
  return out;
}

/** D624: where the swell is gone: past the peak, SWELL_FADE_SHARE of the way to the last chord, a beat before it at the latest. */
export function swellEnd(f: TouchFugue): number {
  const F = formOf(f);
  return Math.max(F.climax.peak, Math.min(F.last - f.tpq, F.climax.peak + (F.last - F.climax.peak) * SWELL_FADE_SHARE));
}
const smooth = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * (3 - 2 * u);
};
/** D624: the swell's level 0..1 at a tick: rising (smoothstep) from the climax's rise to its peak, falling to nothing by swellEnd. */
export function swellEnv(f: TouchFugue, tick: number): number {
  const F = formOf(f);
  const { rise, peak } = F.climax;
  const end = swellEnd(f);
  if (tick <= rise || tick >= end) return 0;
  if (tick <= peak) return smooth((tick - rise) / Math.max(1, peak - rise));
  return 1 - smooth((tick - peak) / Math.max(1, end - peak));
}
/** D624: the surge at a beat (a fixed hash of the beat's index: the same every run). */
export function swellSurge(beatIndex: number): number {
  const x = Math.sin(beatIndex * 12.9898 + 4.1414) * 43758.5453;
  return 10 ** ((SWELL_SURGE_DB * (2 * (x - Math.floor(x)) - 1)) / 20);
}

/**
 * The sounds (D625-D627): noise only, every filter of low Q (at most SFX_MAX_Q: a slope, no resonance), times in s, levels
 * the share of the chip's master (measured, D628). `hp`/`lp`: the filters in turn (type, Hz, Q).
 */
export const SFX_MAX_Q = 1;
export interface SfxLayer {
  filters: readonly (readonly ["highpass" | "lowpass" | "bandpass", number, number])[];
  /** Level (share of the layer's peak), attack, hold and the time it is gone by (an exponential fall). */
  level: number;
  attack: number;
  hold: number;
  len: number;
}
export interface SfxSound {
  layers: readonly SfxLayer[];
  /** The effect's level (the master's share at vel 1). */
  gain: number;
  /** The sweep: the band's centre from `lo` to `hi` and back, `cycles` times over its length. */
  sweep?: { lo: number; hi: number; cycles: number };
}
export const SFX_SOUND: Readonly<Partial<Record<SfxKind, SfxSound>>> = {
  // II/3: the jack going in: a bright tick (a few ms) and a short dry tail.
  click: {
    gain: 0.75,
    layers: [
      { filters: [["highpass", 2500, 0.5]], level: 1, attack: 0.0005, hold: 0, len: 0.012 },
      { filters: [["highpass", 900, 0.5], ["lowpass", 4500, 0.5]], level: 0.3, attack: 0.002, hold: 0, len: 0.09 },
    ],
  },
  // II/6: the stone landing: a low thump and its knock (the knock what a phone hears).
  thud: {
    gain: 0.6,
    layers: [
      { filters: [["highpass", 60, 0.5], ["lowpass", 420, 0.5], ["lowpass", 420, 0.5]], level: 1, attack: 0.004, hold: 0, len: 0.26 },
      { filters: [["highpass", 600, 0.5], ["lowpass", 2000, 0.5]], level: 0.22, attack: 0.002, hold: 0, len: 0.05 },
    ],
  },
  // II/6: the gate falling: a rumble under 1 s, high-passed twice off the bass's room (D627).
  rumble: {
    gain: 0.05,
    layers: [{ filters: [["highpass", 320, 0.5], ["highpass", 320, 0.5], ["lowpass", 900, 0.5], ["lowpass", 900, 0.5]], level: 1, attack: 0.07, hold: 0.15, len: 0.9 }],
  },
  // II/4 (dropped, D626): a noise band swept up and back, far off (no peak of its own: Q 1).
  sweep: {
    gain: 0.05,
    sweep: { lo: 650, hi: 1300, cycles: 2 },
    layers: [{ filters: [["bandpass", 900, 1], ["lowpass", 3000, 0.5]], level: 1, attack: 0.3, hold: 1.3, len: 2 }],
  },
  // II/1: the crowd: a band of noise (the voices' range, no vowel), swelling by the beat.
  swell: {
    gain: 0.075,
    layers: [{ filters: [["highpass", 280, 0.5], ["lowpass", 2600, 0.5], ["lowpass", 4000, 0.5]], level: 1, attack: 0, hold: 0, len: 0 }],
  },
};

// --- The switches.
const SFX_KEY = "tb-sfx-v1";
let on: boolean | null = null;
/** WORLD SOUNDS (Settings): on unless turned off (persisted). */
export function sfxOn(): boolean {
  if (on !== null) return on;
  try {
    on = globalThis.localStorage?.getItem(SFX_KEY) !== "off";
  } catch {
    on = true;
  }
  return on;
}
export function setSfxOn(v: boolean) {
  on = v;
  try {
    globalThis.localStorage?.setItem(SFX_KEY, v ? "on" : "off");
  } catch {
    /* not kept */
  }
}
/** The Sound Lab's override (it draws no stage): the effects heard (with `trial`: the dropped ones too), or not; null: the game's rule. */
let lab: { on: boolean; trial: boolean } | null = null;
export function setSfxLab(v: { on: boolean; trial?: boolean } | null) {
  lab = v ? { on: v.on, trial: !!v.trial } : null;
}
/** The effects a piece plays now (none: not a pilot world, the world not shown, or switched off). `shown`: the game's box draws its world. */
export function sfxKindsNow(f: TouchFugue, shown: boolean): readonly SfxKind[] {
  if (lab) return lab.on ? [...(PILOT_SFX[f.id] ?? []), ...(lab.trial ? (SWEEP_TRIAL[f.id] ?? []) : [])] : [];
  // The design studio's rule: only with STAGE FULL (QUIET and OFF silent), a piece with a world, not the tutorial's box.
  if (!sfxOn() || !shown || !hasStage(f.id) || stageMode() !== "full") return [];
  return PILOT_SFX[f.id] ?? [];
}

// --- D640-D644, THE SECOND BATCH: one engine for every new effect (CURVE_SOUND). Each sound is a few layers of the
// effects' one noise through low-Q filters (as the pilots'), its level a CURVE: the event's envelope times its layer's
// textures (mods), all pure numbers of the score's ticks (and the piece's nominal seconds), the same every run; the chip
// sets the curve on the layer's gain (Chip.sfxSound). Nothing pitched: no oscillator, no tuned filter, no glide; the
// textures are amplitude only (a murmur's syllables, a gust, crackle's grains, a footstep on the beat).

/** A layer's texture: its level's factor at a moment (all of a layer's mods multiplied). */
export type Mod =
  /** Slow irregular flutter (value noise: a murmur's syllables, wind's gusts): between 1-depth and 1, about `hz` changes a second. */
  | { t: "flutter"; hz: number; depth: number; seed: number }
  /** Bursts: on where a slow value noise is over `th` (the sparrow's wings). */
  | { t: "gate"; hz: number; th: number; seed: number }
  /** Grains at random times (`rate` a second, each slot's place jittered by `jit` of a slot), each falling in `decay` s, its size floor..1 (`pow` skews to the small). */
  | { t: "grains"; rate: number; decay: number; jit: number; floor: number; pow: number; seed: number }
  /** D642: strokes ON THE SCORE'S BEAT (the drums' pulse: beatOf; `span` beats apart, or one a bar), each rising in `attack` s and falling in `decay`; between 1-depth and 1; every other stroke at `alt`. */
  | { t: "pulse"; span: number | "bar"; attack: number; decay: number; depth: number; alt?: number }
  /** D642: a wheel's turn locked to the beat (`per` turns a beat), a smooth dip of `depth`. */
  | { t: "wheel"; per: number; depth: number };
export type Filter = readonly ["highpass" | "lowpass" | "bandpass", number, number];
export interface CurveLayer {
  filters: readonly Filter[];
  level: number;
  mods: readonly Mod[];
  /** A one-shot's envelope: attack, hold, the time it is gone by (an exponential fall), s. */
  attack?: number;
  hold?: number;
  len?: number;
  /** The curve's step (s): fine for grains and strokes, coarse for the slow textures. */
  res: number;
}
export interface CurveSound {
  event: SfxEventKind;
  /** A climax's one-shot (the hush on the rise), else a climax's shape over the rise to the peak and away. */
  shot?: boolean;
  /** D642: a figure fitted to the entry's own rhythm: the entering voice's first `n` onsets at least `minGap` s apart within `span` s, each at its level. */
  figure?: { n: number; minGap: number; span: number; levels: readonly number[] };
  /** A bed: its level's range over the entries (dB; `fall`: II/24, the other way); `stop`: II/8's rain, gone at the climax's peak. */
  bed?: { range: number; fall?: boolean; stop?: "peak" };
  gain: number;
  layers: readonly CurveLayer[];
}
const HP = (hz: number, q = 0.5): Filter => ["highpass", hz, q];
const LP = (hz: number, q = 0.5): Filter => ["lowpass", hz, q];
const fl = (hz: number, depth: number, seed: number): Mod => ({ t: "flutter", hz, depth, seed });
const gr = (rate: number, decay: number, jit: number, floor: number, pow: number, seed: number): Mod => ({ t: "grains", rate, decay, jit, floor, pow, seed });
const RISE = { range: 9 };
/** D641-D643: the murmurs (crowd, ballroom, court, audience): band-passed noise, two bands each with its own slow syllabic flutter, no formant, no vowel. */
const murmur = (lo: number, hi: number, depth: number, seed: number): CurveLayer[] => [
  { filters: [HP(lo), LP(hi), LP(hi)], level: 1, mods: [fl(3.1, depth, seed), fl(0.35, 0.3, seed + 1)], res: 0.01 },
  { filters: [HP(lo * 1.8), LP(hi * 1.5)], level: 0.6, mods: [fl(4.3, depth, seed + 2), fl(0.27, 0.3, seed + 3)], res: 0.01 },
];
export const CURVE_SOUND: Readonly<Partial<Record<SfxKind, CurveSound>>> = {
  // ---- the entries' one-shots (D641) ----
  // I/2 THE IMP: the fire catching: a few crackles (grains) over a short breath of flame.
  crackle: { event: "entry", gain: 0.5, layers: [
    { filters: [HP(1500), LP(6500)], level: 1, mods: [gr(16, 0.003, 1, 0.2, 2, 21)], attack: 0.01, hold: 0.25, len: 0.7, res: 0.0005 },
    { filters: [HP(300), LP(1500)], level: 0.12, mods: [], attack: 0.04, hold: 0.1, len: 0.5, res: 0.005 },
  ] },
  // I/3 THE STONE-SKIPPER: a soft plop (a low noise thump, no falling tone) and its few droplets.
  plop: { event: "entry", gain: 0.5, layers: [
    { filters: [HP(90), LP(550), LP(550)], level: 1, mods: [], attack: 0.004, hold: 0, len: 0.14, res: 0.001 },
    { filters: [HP(1500), LP(5000)], level: 0.3, mods: [gr(30, 0.005, 1, 0.3, 1.5, 31)], attack: 0.02, hold: 0.03, len: 0.25, res: 0.0005 },
  ] },
  // I/6 THE AMBUSH: leaves rustling (dense small grains under a swell of 0.7 s).
  rustle: { event: "entry", gain: 0.3, layers: [
    { filters: [HP(1200), LP(7000)], level: 1, mods: [gr(90, 0.004, 1, 0.3, 1.5, 61)], attack: 0.12, hold: 0.15, len: 0.75, res: 0.0005 },
    { filters: [HP(400), LP(1800)], level: 0.25, mods: [], attack: 0.1, hold: 0.05, len: 0.5, res: 0.005 },
  ] },
  // I/10 THE TWO HORSEMEN: soft hoofbeats on the entry's own first notes (D642), on turf: a low thud and a little knock.
  hoof: { event: "entry", gain: 0.5, figure: { n: 4, minGap: 0.13, span: 1.0, levels: [1, 0.75, 0.85, 0.65] }, layers: [
    { filters: [HP(80), LP(500), LP(500)], level: 1, mods: [], attack: 0.003, hold: 0, len: 0.12, res: 0.001 },
    { filters: [HP(700), LP(2500)], level: 0.25, mods: [], attack: 0.001, hold: 0, len: 0.03, res: 0.0005 },
  ] },
  // I/13 THE AQUARIUM: bubbles: a cluster of short noise bursts in two bands (no sine blip, no glide).
  bubble: { event: "entry", gain: 0.5, layers: [
    { filters: [HP(600), LP(1600)], level: 1, mods: [gr(9, 0.018, 0.6, 0.4, 1, 131)], attack: 0.005, hold: 0.3, len: 0.6, res: 0.001 },
    { filters: [HP(1200), LP(3000)], level: 0.6, mods: [gr(7, 0.012, 0.8, 0.4, 1, 137)], attack: 0.005, hold: 0.3, len: 0.6, res: 0.001 },
  ] },
  // I/15 THE PINBALL: the flipper: a bright tick and a short thunk.
  flipper: { event: "entry", gain: 0.5, layers: [
    { filters: [HP(2500)], level: 1, mods: [], attack: 0.0005, hold: 0, len: 0.012, res: 0.0005 },
    { filters: [HP(150), LP(900)], level: 0.5, mods: [], attack: 0.002, hold: 0, len: 0.06, res: 0.001 },
  ] },
  // I/16 THE KNIGHT, I/21 THE MARIONETTES: a wooden clack (a dry band, no ring).
  clack: { event: "entry", gain: 0.5, layers: [
    { filters: [HP(1000), LP(3500)], level: 1, mods: [], attack: 0.0005, hold: 0, len: 0.035, res: 0.0005 },
    { filters: [HP(300), LP(1200)], level: 0.4, mods: [], attack: 0.001, hold: 0, len: 0.05, res: 0.0005 },
  ] },
  // I/17 THE DIARY: a page turned: a swish with the paper's grain.
  page: { event: "entry", gain: 0.3, layers: [
    { filters: [HP(700), LP(6000)], level: 1, mods: [gr(60, 0.005, 1, 0.45, 1, 171)], attack: 0.14, hold: 0.08, len: 0.5, res: 0.0005 },
    { filters: [HP(2500), LP(8000)], level: 0.3, mods: [], attack: 0.2, hold: 0, len: 0.45, res: 0.005 },
  ] },
  // II/13 THE TELEPHONE: the dial running back: a short train of clicks (jittered: no tone), no bell.
  rotary: { event: "entry", gain: 0.5, layers: [
    { filters: [HP(2200), LP(7000)], level: 1, mods: [gr(11, 0.002, 0.25, 0.7, 1, 213)], attack: 0.001, hold: 0.55, len: 0.65, res: 0.0005 },
    { filters: [HP(600), LP(2000)], level: 0.35, mods: [gr(11, 0.006, 0.25, 0.7, 1, 213)], attack: 0.001, hold: 0.55, len: 0.65, res: 0.0005 },
  ] },
  // II/15 HOPSCOTCH: a soft hop on the entry's own first notes (D642): a landing and its scuff.
  hop: { event: "entry", gain: 0.5, figure: { n: 3, minGap: 0.25, span: 1.2, levels: [1, 0.8, 0.9] }, layers: [
    { filters: [HP(90), LP(600)], level: 1, mods: [], attack: 0.003, hold: 0, len: 0.1, res: 0.001 },
    { filters: [HP(1500), LP(6000)], level: 0.3, mods: [gr(120, 0.003, 1, 0.4, 1, 215)], attack: 0.005, hold: 0, len: 0.08, res: 0.0005 },
  ] },
  // II/18 THE GIGUE: stamping feet on the entry's own first notes (D642): a floor's thud and its knock.
  stamp: { event: "entry", gain: 0.5, figure: { n: 3, minGap: 0.2, span: 1.1, levels: [1, 0.8, 0.9] }, layers: [
    { filters: [HP(70), LP(450), LP(450)], level: 1, mods: [], attack: 0.003, hold: 0, len: 0.16, res: 0.001 },
    { filters: [HP(600), LP(2200)], level: 0.35, mods: [], attack: 0.001, hold: 0, len: 0.04, res: 0.0005 },
  ] },
  // II/20 THE EARTHQUAKE: a short low rumble, high-passed twice off the bass's fundamentals (D643, as II/6's).
  quake: { event: "entry", gain: 0.1, layers: [
    { filters: [HP(250), HP(250), LP(900), LP(900)], level: 1, mods: [gr(25, 0.03, 1, 0.5, 1, 220)], attack: 0.05, hold: 0.15, len: 0.8, res: 0.002 },
  ] },
  // ---- the climaxes (D641) ----
  // I/5 THE CORONATION: the crowd hushed as the climax begins ("shh"), then its murmur (below).
  hush: { event: "climax", shot: true, gain: 0.05, layers: [
    { filters: [HP(2500), LP(7000)], level: 1, mods: [fl(2.5, 0.3, 51)], attack: 0.25, hold: 0.3, len: 1.3, res: 0.01 },
  ] },
  // I/1 THE CANON (the audience), I/5 THE CORONATION (the crowd): a murmur over the rise to the peak, gone before the last chord.
  murmur: { event: "climax", gain: 0.05, layers: murmur(300, 2200, 0.55, 11) },
  // I/9 THE SPARROW: the wings: bursts of flutter, more as the climax rises.
  flutter: { event: "climax", gain: 0.1, layers: [
    { filters: [HP(500), LP(4000)], level: 1, mods: [{ t: "gate", hz: 0.8, th: 0.5, seed: 91 }, gr(18, 0.012, 0.5, 0.5, 1, 93)], res: 0.001 },
  ] },
  // I/19 THE THREE STOOGES: the projector's clatter (an irregular dense rattle, no frame-rate tone), the film running up to the peak.
  clatter: { event: "climax", gain: 0.1, layers: [
    { filters: [HP(1500), LP(6000)], level: 1, mods: [gr(24, 0.004, 0.35, 0.55, 1, 191)], res: 0.0005 },
    { filters: [HP(300), LP(1200)], level: 0.4, mods: [gr(24, 0.01, 0.35, 0.55, 1, 191)], res: 0.001 },
  ] },
  // ---- the beds (D642) ----
  // I/7 THE BICYCLE: the wheel's whirr, its turn locked to the beat (two a beat), and the tyre on the road; no bell.
  whirr: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(1200), LP(5000)], level: 1, mods: [{ t: "wheel", per: 2, depth: 0.35 }], res: 0.01 },
    { filters: [HP(150), LP(700)], level: 0.5, mods: [fl(0.4, 0.3, 71)], res: 0.01 },
  ] },
  // I/8 THE PILGRIM: footsteps on gravel, very low: a crunch on each beat (the drums' pulse), the other foot a little softer.
  gravel: { event: "bed", bed: RISE, gain: 0.1, layers: [
    { filters: [HP(900), LP(4500)], level: 1, mods: [{ t: "pulse", span: 1, attack: 0.012, decay: 0.05, depth: 1, alt: 0.8 }, gr(220, 0.002, 1, 0.3, 1, 81)], res: 0.0005 },
  ] },
  // I/11 THE SHEPHERDESS, II/11 THE BUTTERFLY: wind in the grass: a gusting band and the blades' faster hiss.
  grass: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(300), LP(2500)], level: 1, mods: [fl(0.22, 0.55, 111)], res: 0.01 },
    { filters: [HP(2500), LP(8000)], level: 0.5, mods: [fl(2.5, 0.5, 113), fl(0.22, 0.55, 111)], res: 0.01 },
  ] },
  // I/20 THE LOCOMOTIVE: the wheels' low rumble, swelling a little on each beat (no clack: no click track).
  rail: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(110), LP(450), LP(450)], level: 1, mods: [{ t: "pulse", span: 1, attack: 0.03, decay: 0.25, depth: 0.45 }], res: 0.005 },
    { filters: [HP(500), LP(1500)], level: 0.35, mods: [{ t: "pulse", span: 1, attack: 0.02, decay: 0.15, depth: 0.5 }], res: 0.005 },
  ] },
  // I/22 THE PROCESSION: distant footsteps on the beat (many feet: a soft blurred step, dull with distance); no bells.
  steps: { event: "bed", bed: RISE, gain: 0.1, layers: [
    { filters: [HP(250), LP(1400), LP(1400)], level: 1, mods: [{ t: "pulse", span: 1, attack: 0.015, decay: 0.09, depth: 1, alt: 0.85 }, gr(150, 0.003, 1, 0.4, 1, 221)], res: 0.0005 },
  ] },
  // I/23 THE GRAMOPHONE: vinyl crackle, very low: sparse irregular ticks and a faint hiss.
  vinyl: { event: "bed", bed: RISE, gain: 0.1, layers: [
    { filters: [HP(2000), LP(8000)], level: 1, mods: [gr(6, 0.0012, 1, 0.1, 4, 231)], res: 0.0005 },
    { filters: [HP(3000), LP(9000)], level: 0.04, mods: [], res: 0.02 },
  ] },
  // I/24 FAUST: low wind at the study's window: slow gusts, high-passed twice (off the bass on a desktop, D643).
  lowwind: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(150), HP(150), LP(600), LP(600)], level: 1, mods: [fl(0.12, 0.65, 241), fl(0.7, 0.25, 243)], res: 0.01 },
  ] },
  // II/8 THE RAIN: the rain's hiss and its drops, growing with the entries, stopping at the climax's peak.
  rain: { event: "bed", bed: { range: 12, stop: "peak" }, gain: 0.05, layers: [
    { filters: [HP(1500), LP(7000)], level: 1, mods: [fl(0.3, 0.15, 81)], res: 0.01 },
    { filters: [HP(1200), LP(5000)], level: 1, mods: [gr(10, 0.006, 1, 0.15, 2.5, 83)], res: 0.0005 },
  ] },
  // II/10 THE CROOK: the fair, low: the crowd's murmur and the rides' machinery (a slow rumble); no calliope, nothing pitched.
  fair: { event: "bed", bed: RISE, gain: 0.05, layers: [
    ...murmur(300, 2000, 0.5, 101),
    { filters: [HP(150), LP(600)], level: 0.6, mods: [fl(0.3, 0.4, 105)], res: 0.01 },
  ] },
  // II/12 THE MASQUERADE, II/24 THE LAST DANCE: a ballroom's murmur (II/24's falling as the candles go out).
  ballroom: { event: "bed", bed: RISE, gain: 0.05, layers: murmur(300, 2400, 0.5, 121) },
  // II/14 THE THREE SISTERS: wind through the leaves: their quick shimmer under slow gusts.
  leaves: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(1800), LP(8000)], level: 1, mods: [fl(1.8, 0.6, 141), fl(0.2, 0.5, 143)], res: 0.01 },
    { filters: [HP(400), LP(1500)], level: 0.4, mods: [fl(0.2, 0.5, 143)], res: 0.01 },
  ] },
  // II/16 THE JURY: the court's murmur, lower and sparer than a crowd's.
  court: { event: "bed", bed: RISE, gain: 0.05, layers: murmur(250, 1600, 0.7, 161) },
  // II/19 THE WANDERER: wind over the hills.
  wind: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(200), LP(1800), LP(1800)], level: 1, mods: [fl(0.18, 0.6, 191), fl(0.9, 0.2, 193)], res: 0.01 },
  ] },
  // II/22 THE COLOSSUS: harbour water, low: a wave's lap on each bar (the score's), the slosh after it.
  harbour: { event: "bed", bed: RISE, gain: 0.05, layers: [
    { filters: [HP(100), LP(700)], level: 1, mods: [{ t: "pulse", span: "bar", attack: 0.6, decay: 0.9, depth: 0.6 }], res: 0.01 },
    { filters: [HP(500), LP(2200)], level: 0.5, mods: [fl(2, 0.6, 221), { t: "pulse", span: "bar", attack: 0.3, decay: 0.5, depth: 0.7 }], res: 0.01 },
  ] },
};
/** D644: II/24's bed falls with the entries (the candles going out) over a wider range. */
export const BED_FALL: Readonly<Record<string, { range: number }>> = { wtc2f24: { range: 12 } };
/**
 * D644: each fugue's level for its effects (dB on the sound's gain; "<id>:<kind>" for one kind), measured against its band
 * (tools/touch/world-sfx/: the least gap at least 6 LU, the median at least 12, phone and desktop, with room to spare).
 */
export const SFX_TRIM_DB: Readonly<Record<string, number>> = {
  "wtc1f01": 5.0, "wtc1f02": -0.5, "wtc1f03": 4.5, "wtc1f05:hush": -3.5, "wtc1f05:murmur": 4.5, "wtc1f06": -8.0, "wtc1f07": -1.0, "wtc1f08": 9.5, "wtc1f09": 4.5, "wtc1f10": 7.0, "wtc1f11": -1.5, "wtc1f13": -7.0, "wtc1f15": 2.5, "wtc1f16": 0.0, "wtc1f17": -7.5, "wtc1f19": 5.0, "wtc1f20": 10.0, "wtc1f21": -1.5, "wtc1f22": 10.0, "wtc1f23": 10.0, "wtc1f24": 10.0, "wtc2f08": -1.5, "wtc2f10": -2.0, "wtc2f11": 0.5, "wtc2f12": 2.0, "wtc2f13": -2.5, "wtc2f14": 0.0, "wtc2f15": 6.0, "wtc2f16": 4.5, "wtc2f18": -0.5, "wtc2f19": 7.5, "wtc2f20": 6.0, "wtc2f22": 9.5, "wtc2f24": 3.0,
};
export function trimOf(id: string, k: SfxKind): number {
  return 10 ** ((SFX_TRIM_DB[`${id}:${k}`] ?? SFX_TRIM_DB[id] ?? 0) / 20);
}
export const isCurve = (k: string): boolean => k in CURVE_SOUND;
/** D640: a flowing effect (a bed, a climax's shape): cut into the beats as the swell is; else a one-shot. */
export const isFlow = (k: string): boolean => {
  const C = CURVE_SOUND[k as SfxKind];
  return !!C && C.event !== "entry" && !C.shot;
};

// The textures' numbers (pure, the same every run).
const hash = (n: number, seed: number) => {
  const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const vnoise = (x: number, seed: number) => {
  const i = Math.floor(x);
  const u = x - i;
  return hash(i, seed) + (hash(i + 1, seed) - hash(i, seed)) * u * u * (3 - 2 * u);
};
/** The piece's nominal ticks a second (its tempo: the textures' clock, continuous across the beats). */
export const tpsOf = (f: TouchFugue) => (f.tpq * tempoOf(f.id)) / 60;
/** A mod's factor at a tick (`sec`: the texture's clock, s). */
export function modAt(f: TouchFugue, m: Mod, tick: number, sec: number, seed = 0): number {
  switch (m.t) {
    case "flutter":
      return 1 - m.depth + m.depth * vnoise(sec * m.hz, m.seed + seed * 7);
    case "gate": {
      const u = Math.max(0, Math.min(1, (vnoise(sec * m.hz, m.seed + seed * 7) - m.th) / Math.max(0.05, 1 - m.th) * 3));
      return u * u * (3 - 2 * u);
    }
    case "grains": {
      const k0 = Math.floor(sec * m.rate);
      const back = Math.ceil(6 * m.decay * m.rate) + 1;
      let v = 0;
      for (let k = k0 - back; k <= k0 + 1; k++) {
        const sk = (k + 0.5 + (hash(k, m.seed + seed * 13) - 0.5) * m.jit) / m.rate;
        if (sec < sk) continue;
        const a = m.floor + (1 - m.floor) * hash(k, m.seed + seed * 13 + 5) ** m.pow;
        v += a * Math.exp(-(sec - sk) / m.decay);
      }
      return Math.min(1.5, v);
    }
    case "pulse": {
      const tps = tpsOf(f);
      const per = m.span === "bar" ? f.barTicks : beatOf(f).ticks * m.span;
      const base = (f.bars[0]?.on ?? 0) % per;
      const k = Math.floor((tick - base) / per);
      let v = 0;
      for (const j of [k - 1, k]) {
        const dt = (tick - (base + j * per)) / tps;
        if (dt < 0) continue;
        const a = m.alt !== undefined && j % 2 ? m.alt : 1;
        v += a * (dt < m.attack ? dt / m.attack : Math.exp(-(dt - m.attack) / m.decay));
      }
      return 1 - m.depth + m.depth * Math.min(1, v);
    }
    case "wheel": {
      const per = beatOf(f).ticks / m.per;
      const ph = ((((tick - (f.bars[0]?.on ?? 0)) % per) + per) % per) / per;
      return 1 - m.depth * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph));
    }
  }
}
/** A layer's textures together at a tick. */
export function modsAt(f: TouchFugue, L: CurveLayer, tick: number, sec: number, seed = 0): number {
  let v = 1;
  for (const m of L.mods) v *= modAt(f, m, tick, sec, seed);
  return v;
}
/** A one-shot layer's envelope at `s` s from its onset (attack, hold, an exponential fall to -60 dB by `len`). */
export function shotEnv(L: CurveLayer, s: number): number {
  const a = L.attack ?? 0.001;
  const h = L.hold ?? 0;
  const len = L.len ?? 0.1;
  if (s < 0 || s >= len) return 0;
  if (s < a) return s / a;
  if (s < a + h) return 1;
  return Math.exp((Math.log(1e-3) * (s - a - h)) / Math.max(1e-3, len - a - h));
}
/** A one-shot's length (its longest layer). */
export const shotLen = (k: SfxKind) => Math.max(...(CURVE_SOUND[k]?.layers ?? []).map((L) => L.len ?? 0.1));

const onsMemo = new Map<string, number[]>();
const onsOf = (f: TouchFugue) => {
  let o = onsMemo.get(f.id);
  if (!o) onsMemo.set(f.id, (o = [...new Set(f.entries.map((e) => e.on))].sort((a, b) => a - b)));
  return o;
};
/** D642: a figure's strokes (ticks): the entering voice's first onsets from the entry, at least minGap s apart, within span s. */
export function figureOf(f: TouchFugue, on: number, fig: NonNullable<CurveSound["figure"]>): number[] {
  const e = f.entries.find((x) => x.on === on);
  const tps = tpsOf(f);
  const notes = (e ? f.voices[e.voice] : []).filter((n) => n[0] >= on && (n[0] - on) / tps <= fig.span);
  const out = [on];
  for (const n of notes) {
    if (out.length >= fig.n) break;
    if ((n[0] - out[out.length - 1]) / tps >= fig.minGap) out.push(n[0]);
  }
  return out;
}
/** D642: where a bed is gone: the final chord (II/8's rain: the climax's peak). */
export function bedEnd(f: TouchFugue, k: SfxKind): number {
  const F = formOf(f);
  return CURVE_SOUND[k]?.bed?.stop === "peak" ? F.climax.peak : F.last;
}
/** D642: the bed's fade before it is gone (s; the rain stops quicker). */
export const BED_FADE_S = 1;
export const RAIN_STOP_S = 0.5;
/** D642: the bed's fade-in from its first note (s). */
export const BED_IN_S = 1.5;
/**
 * D642: a bed's level at a tick (0..1, times the fugue's trim): stepping up with each distinct entry begun (from -range dB
 * at the first to 0 at the last; II/24 the other way), each step eased over a beat; in over BED_IN_S from the first entry,
 * out over BED_FADE_S before the last chord (the rain's over RAIN_STOP_S before the peak). The thinning is the choke point's.
 */
export function bedEnv(f: TouchFugue, k: SfxKind, tick: number): number {
  const C = CURVE_SOUND[k];
  if (!C?.bed) return 0;
  const ons = onsOf(f);
  const N = ons.length;
  let n = 0;
  while (n < N && ons[n] <= tick) n++;
  if (!n) return 0;
  const fall = BED_FALL[f.id];
  const range = fall?.range ?? C.bed.range;
  const dbOf = (i: number) => {
    const x = N > 1 ? (i - 1) / (N - 1) : 1;
    return fall ? -range * x : -range * (1 - x);
  };
  const beat = beatOf(f).ticks;
  const u = n > 1 ? Math.max(0, Math.min(1, (tick - ons[n - 1]) / beat)) : 1;
  const db = n > 1 ? dbOf(n - 1) + (dbOf(n) - dbOf(n - 1)) * u * u * (3 - 2 * u) : dbOf(1);
  const tps = tpsOf(f);
  const end = bedEnd(f, k);
  const fade = (C.bed.stop === "peak" ? RAIN_STOP_S : BED_FADE_S) * tps;
  const g = Math.min(1, Math.max(0, (tick - ons[0]) / (BED_IN_S * tps)), Math.max(0, (end - tick) / fade));
  return 10 ** (db / 20) * g * trimOf(f.id, k);
}
/** D642: the score's silences a flowing effect dips in: at least REST_MIN_S long, the effect falling over REST_DIP_S before one and rising over it after. */
export const REST_DIP_S = 0.15;
export const REST_MIN_S = 0.1;
/**
 * D642: a world's band taken to hold its notes this much shorter again than the phrasing does (II/10: its SALSA measured
 * silent 0.3 s before its detached crotchets' written ends, the band's struck and plucked sounds dying sooner).
 */
export const SILENT_HOLD: Readonly<Record<string, number>> = { wtc2f10: 0.7 };
/** D642: under this MIDI pitch a texture is the bass's alone (a phone hears little of it): a flowing effect at LOW_DIP there. */
export const LOW_TOP = 50;
export const LOW_DIP = 0.15;
const silMemo = new Map<string, number[]>();
/** The score's silences as played (ticks, flat start/end pairs): no voice sounding, each note held as the band holds it (the reading's marks). */
function silencesOf(f: TouchFugue): number[] {
  let m = silMemo.get(f.id);
  if (m) return m;
  const plan = wholePlan(f, wholeReadingOf(f.id));
  const marks = plan ? wholeMarks(plan) : null;
  const tps = tpsOf(f);
  const sp: [number, number][] = [];
  const tops: [number, number, number][] = [];
  f.voices.forEach((vn, v) => {
    for (const n of vn) {
      const mk = marks?.get(`${v}:${n[0]}`);
      // as the band may play it (phrasing.ts ART_HOLD, and the plucked and struck sounds' own decay: SILENT_HOLD): a short
      // note under half its length, a joined one whole, the rest detached
      const sh = SILENT_HOLD[f.id] ?? 1;
      const hold = mk?.short ? ART_HOLD.short * sh : mk?.join ? 1 : ART_HOLD.detach * sh;
      sp.push([n[0], n[0] + n[1] * hold]);
      tops.push([n[0], n[0] + n[1] * hold, n[2]]);
    }
  });
  sp.sort((a, b) => a[0] - b[0]);
  m = [];
  let end = sp.length ? sp[0][1] : 0;
  for (const [a, b] of sp) {
    if (a - end >= REST_MIN_S * tps) m.push(end, a);
    end = Math.max(end, b);
  }
  silMemo.set(f.id, m);
  // the highest pitch sounding, by eighth of a crotchet
  const step = f.tpq / 8;
  const top = new Uint8Array(Math.ceil(f.length / step) + 1);
  for (const [a, b, p] of tops) for (let i = Math.floor(a / step); i < Math.ceil(b / step) && i < top.length; i++) if (p > top[i]) top[i] = p;
  topMemo.set(f.id, { step, top });
  return m;
}
const topMemo = new Map<string, { step: number; top: Uint8Array }>();
/** D642: a flowing effect's dip where only the bass sounds (the highest pitch under LOW_TOP, the cells either side counted): LOW_DIP, else 1. */
export function lowDip(f: TouchFugue, tick: number): number {
  silencesOf(f);
  const { step, top } = topMemo.get(f.id)!;
  const i = Math.floor(tick / step);
  let s = 0;
  for (let j = i - 2; j <= i + 2; j++) {
    const p = top[Math.max(0, Math.min(top.length - 1, j))];
    s += p === 0 || p >= LOW_TOP ? 1 : LOW_DIP;
  }
  return s / 5;
}
/**
 * D642: the beds' and climax shapes' dip in the music's own silences (a rest, a breath, detached or short notes stopping
 * together: what the drums' 400 ms thinning window is too long to see): 0 in a silence, rising to 1 over REST_DIP_S from it.
 */
export function restDip(f: TouchFugue, tick: number): number {
  const m = silencesOf(f);
  let lo = 0;
  let hi = m.length / 2;
  while (lo < hi) {
    const k = (lo + hi) >> 1;
    if (m[2 * k + 1] <= tick) lo = k + 1;
    else hi = k;
  }
  // silence lo is the first ending after tick
  if (lo < m.length / 2 && m[2 * lo] <= tick) return 0;
  const prevEnd = lo > 0 ? m[2 * lo - 1] : -Infinity;
  const nextOn = lo < m.length / 2 ? m[2 * lo] : Infinity;
  const d = Math.min(tick - prevEnd, nextOn - tick) / tpsOf(f);
  return Math.min(1, d / REST_DIP_S);
}
/** D641/D642: a flowing effect's envelope at a tick (a bed's, or a climax's: the swell's shape), with the fugue's trim. */
export function flowEnv(f: TouchFugue, k: SfxKind, tick: number): number {
  const C = CURVE_SOUND[k];
  if (!C) return 0;
  return (C.event === "bed" ? bedEnv(f, k, tick) : swellEnv(f, tick) * trimOf(f.id, k)) * restDip(f, tick) * lowDip(f, tick);
}
