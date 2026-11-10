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
import type { TouchFugue } from "./fugue.ts";
import { formOf } from "./form-points.ts";
import { hasStage, stageMode } from "./stage-bg.ts";

export type SfxKind = "swell" | "click" | "sweep" | "thud" | "rumble";
/** The pilot worlds and their effects (an empty list: no sound, deliberately). */
export const PILOT_SFX: Readonly<Record<string, readonly SfxKind[]>> = {
  wtc2f01: ["swell"],
  wtc2f02: [],
  wtc2f03: ["click"],
  // D626: THE CHASE's noise-band sweep built, measured and dropped (an unpitched band does not read as a siren at the
  // level allowed); the sound kept (SFX_SOUND.sweep) for the Sound Lab's A/B (SWEEP_TRIAL), never in the game.
  wtc2f04: [],
  wtc2f05: [],
  wtc2f06: ["thud", "rumble"],
};
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
export const SFX_SOUND: Readonly<Record<SfxKind, SfxSound>> = {
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
