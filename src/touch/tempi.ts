/**
 * D199: each fugue's own tempo, in two versions (no tempo slider): NORMAL, the standard tempo, the
 * median over many recordings (data/tempi/recordings.csv: every duration turned into an average
 * quarter-note tempo by the piece's length), and SLOW, the easy mode (62% of NORMAL, lowered further
 * so that the busiest voice's sustained load stays at about 3 notes a second, never under 45% of
 * NORMAL or 30; D208: no longer played, the game plays NORMAL only). tools/tempi/compute.ts writes data/tempi/tempi.json from the CSV.
 *
 * As everywhere in the game (D181), a tempo is quarter notes a minute; `unit` and `unitBpm` give
 * the same tempo in the meter's conventional beat, for display ("𝅗𝅥 = 40" for an alla breve fugue).
 */
import data from "../../data/tempi/tempi.json" with { type: "json" };
import moreData from "../../data/tempi/more-bach.json" with { type: "json" };

export type TempoVersion = "normal" | "slow";

export interface PieceTempo {
  /** Quarter notes a minute, the tempo played (D285): the recordings' 15th percentile, the busiest voice
   * at most 4.5 notes a second, never under the slowest recording. */
  normal: number;
  /** D285: the recordings' median, kept for reference. */
  median: number;
  /** Quarter notes a minute: the easy mode. */
  slow: number;
  /** The meter's beat: "♩", "𝅗𝅥" (2/2, 3/2, 4/2), "♩." (3/8, 6/8, 9/8), "𝅗𝅥." (6/4), "♪." (6/16, 12/16). */
  unit: string;
  /** Both tempi counted in `unit`. */
  unitBpm: { normal: number; slow: number };
  /** How many recordings the median is over. */
  n: number;
  /** The middle half of the recordings' tempi (quarter notes), and their whole range. */
  iqr: [number, number];
  range: [number, number];
  /** The busiest voice's sustained load at NORMAL, in notes a second (2 s windows, 90th percentile). */
  busiest: number;
  /** Set where the median rests on fewer than 5 recordings. */
  flag?: string;
}

/** The 48 fugues and Contrapunctus XIV, by piece id. */
export const TEMPO: Record<string, PieceTempo> = data as unknown as Record<string, PieceTempo>;
/** D340: the MORE BACH and CHORALES tabs' tempi (tools/tempi/more-bach.ts: an editorial reference, the busiest voice capped as the WTC's). */
export const MORE_TEMPO: Record<string, PieceTempo> = moreData as unknown as Record<string, PieceTempo>;

/**
 * The preludes' tempi (D184, kept until they get their own NORMAL and SLOW). D229: Book I's from
 * Kimiko Ishizaka's recording (data/recordings/ishizaka-book1.json): the median bar's length turned
 * into quarter notes a minute (so I/2's Presto, not its Adagio, sets its pace). Book II's still the
 * playability audit's, from one aligned recording each (Loesser).
 */
const PRELUDES: Record<string, number> = {
  wtc1p01: 55, wtc1p02: 100, wtc1p03: 136, wtc1p04: 88, wtc1p05: 109, wtc1p06: 71, wtc1p07: 83, wtc1p08: 64,
  wtc1p09: 87, wtc1p10: 65, wtc1p11: 107, wtc1p12: 32, wtc1p13: 56, wtc1p14: 101, wtc1p15: 87, wtc1p16: 37,
  wtc1p17: 94, wtc1p18: 46, wtc1p19: 70, wtc1p20: 96, wtc1p21: 78, wtc1p22: 42, wtc1p23: 88, wtc1p24: 84,
  wtc2p01: 42, wtc2p02: 46, wtc2p03: 46, wtc2p04: 64, wtc2p05: 46, wtc2p06: 62, wtc2p07: 88, wtc2p08: 40,
  wtc2p09: 44, wtc2p10: 52, wtc2p11: 88, wtc2p12: 48, wtc2p13: 44, wtc2p14: 34, wtc2p15: 60, wtc2p16: 30,
  wtc2p17: 40, wtc2p18: 48, wtc2p19: 90, wtc2p20: 42, wtc2p21: 44, wtc2p22: 88, wtc2p23: 46, wtc2p24: 74,
};

/** A piece's tempo in quarter notes a minute: the standard one (D208: the only one played). */
/** D270: the TUTORIAL's invention, a little under the recordings' usual pace (about 66 to 80 a quarter), for learning. */
const TUTORIAL_TEMPO: Record<string, number> = { inv01: 60 };
export function tempoOf(id: string): number {
  const t = TEMPO[id];
  // D594: a fugue that opens on its FAST step plays it from the start (the friends' view too, where the button is shut).
  if (t && OPENING_STEP[id] === "fast") return fastTempo(t);
  return t?.normal ?? MORE_TEMPO[id]?.normal ?? PRELUDES[id] ?? TUTORIAL_TEMPO[id] ?? 46;
}

// D481 (the owner: "some fugues' fast tempo is quite conservative and similar to standard. The fast version
// ought to be faster"): FAST 1.4× the default, never less than 1.3×, and its own load cap (FAST_LOAD, a
// challenge chosen by the player) instead of the default's 5.5 notes a second. (D594: here from tempo-steps.ts,
// which re-exports them, so the opening tempo below can be read without it.)
export const FAST_SHARE = 1.4;
/** FAST at least this much quicker than DEFAULT, even past the load (where DEFAULT is already at it). */
export const FAST_MIN_SHARE = 1.3;
/** D481: the busiest line's notes a second FAST may reach (DEFAULT keeps STEP_LOAD). */
export const FAST_LOAD = 7.5;
/** D481: a piece's FAST step (quarter notes a minute) from its record: 1.4× its NORMAL, at least 1.3×, the busiest line at most FAST_LOAD. */
export function fastTempo(t: PieceTempo): number {
  const d = t.normal;
  const cap = t.busiest > 0 ? (d * FAST_LOAD) / t.busiest : Infinity;
  return Math.round(Math.max(d * FAST_MIN_SHARE, Math.min(d * FAST_SHARE, cap)));
}

/**
 * D594: the tempo step a fugue opens on (tempo-steps.ts SLOW · DEFAULT · FAST; DEFAULT where none is named): the owner,
 * on I/24 "Too slow and boring. We definitely need to make its fast tempo the default one", and II/22 "sounds much cooler
 * as Krautrock and fast tempo as default". The step's tempo is what `tempoOf` plays; the button still cycles all three,
 * and a player's choice of DEFAULT is kept (tempo-steps.ts saveStep). Difficulty, stars and tiers stay on
 * `standardTempo` (the recordings' median), so the ranking does not move.
 */
export type OpeningStep = "default" | "fast";
export const OPENING_STEP: Readonly<Record<string, OpeningStep>> = { wtc1f24: "fast", wtc2f22: "fast" };
export const openingStep = (id: string): OpeningStep => OPENING_STEP[id] ?? "default";

/**
 * D285: the measuring tempo: the recordings' median, as before the game slowed down. Difficulty, stars,
 * tiers and the lessons' search are measured at it, so the pieces' ranking (and what a player has
 * unlocked) stays as it was; what is played is `tempoOf`.
 */
export function standardTempo(id: string): number {
  return TEMPO[id]?.median ?? MORE_TEMPO[id]?.median ?? tempoOf(id);
}
