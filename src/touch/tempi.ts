/**
 * D199: each fugue's own tempo, in two versions (no tempo slider): NORMAL, the standard tempo, the
 * median over many recordings (data/tempi/recordings.csv: every duration turned into an average
 * quarter-note tempo by the piece's length), and SLOW, the easy mode (62% of NORMAL, lowered further
 * so that the busiest voice's sustained load stays at about 3 notes a second, never under 45% of
 * NORMAL or 30; D208: no longer played, the game plays NORMAL only). tools/tempi/compute.ts writes data/tempi/tempi.json from the CSV
 * (D861: and the preludes' data/tempi/preludes.json, by the same rule, from data/tempi/prelude-recordings.csv).
 *
 * As everywhere in the game (D181), a tempo is quarter notes a minute; `unit` and `unitBpm` give
 * the same tempo in the meter's conventional beat, for display ("𝅗𝅥 = 40" for an alla breve fugue).
 */
import data from "../../data/tempi/tempi.json" with { type: "json" };
import moreData from "../../data/tempi/more-bach.json" with { type: "json" };
import preludeData from "../../data/tempi/preludes.json" with { type: "json" };
import { slowOnly } from "./prelude-plan.ts";

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
 * D861 (the owner: "Yeah apply the prelude tempos rule"): the 48 preludes by the fugues' rule (D199/D312), no
 * longer a hand-typed table (D184's playability audit for Book II, D229's Ishizaka median bar for Book I).
 * tools/tempi/compute.ts writes data/tempi/preludes.json from data/tempi/prelude-recordings.csv (about 60-80
 * MusicBrainz recordings a prelude, with Ishizaka's and Loesser's aligned ones): the 35th percentile of their
 * tempi, the busiest voice at most 5.5 notes a second, never under the slowest recording. A recording that
 * takes a binary prelude's repeats (I/24; II/2, 5, 8, 9, 10, 12, 15, 18, 20, 21) is read over the halves it
 * plays, the game playing each once. Only `normal` is played: the preludes have no tempo button (tempo-steps.ts),
 * and their difficulty, stars and riding thresholds are measured at the recordings' median, as the fugues' (D285's
 * `standardTempo`; Book I's medians lie near D229's Ishizaka tempi, so the star cuts stand; tiers.ts PRELUDE_FIT refitted).
 */
export const PRELUDE_TEMPO: Record<string, PieceTempo> = preludeData as unknown as Record<string, PieceTempo>;

/** A piece's tempo in quarter notes a minute: the standard one (D208: the only one played). */
/** D270: the TUTORIAL's invention, a little under the recordings' usual pace (about 66 to 80 a quarter), for learning. */
const TUTORIAL_TEMPO: Record<string, number> = { inv01: 60 };
export function tempoOf(id: string): number {
  const t = TEMPO[id];
  // D594: a fugue that opens on its FAST step plays it from the start (the friends' view too, where the button is shut).
  // D710: a MORE BACH piece too (the Art of Fugue's: its record in more-bach.json).
  const rec = t ?? MORE_TEMPO[id];
  if (rec && OPENING_STEP[id] === "fast") return fastTempo(rec);
  // D980: a prelude offered at the slow tempo only (I/5, I/21) plays at its slow tempo (preludes.json `slow`).
  if (slowOnly(id) && PRELUDE_TEMPO[id]?.slow) return PRELUDE_TEMPO[id].slow;
  return t?.normal ?? MORE_TEMPO[id]?.normal ?? PRELUDE_TEMPO[id]?.normal ?? TUTORIAL_TEMPO[id] ?? 46;
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
/**
 * D710: the Art of Fugue's pieces whose DEFAULT (the editorial reference lowered for the load, D340) sits under the
 * slowest of the recordings measured (data/tempi/aof-recordings.csv: track durations on Apple Music's store pages,
 * nine releases, the tempo each implies over the piece's length): they open on FAST, which falls inside that range
 * for every one of them (test/d710-aof-tempo.test.ts). The others' DEFAULT is already inside it and stays.
 */
export const AOF_FAST = ["bwv1080-02", "bwv1080-04", "bwv1080-06", "bwv1080-08", "bwv1080-09", "bwv1080-11", "bwv1080-12r", "bwv1080-12i", "bwv1080-c15", "bwv1080-c17"] as const;
/**
 * D733: the Inventions and Sinfonias the same way (data/tempi/inv-recordings.csv: 14 complete sets on Apple Music's store
 * pages): Invention 10 (DEFAULT 90 a crotchet, the recordings 111-216) and Sinfonia 6 (75; 93-211), both in 9/8, open on
 * FAST (126, 105), inside their range. The other 28 DEFAULTs lie inside theirs (Invention 9 and Sinfonia 4 brought down to
 * the fastest recording, tools/tempi/more-bach.ts RECORDED_MAX; Invention 6 read against its recordings played with the
 * repeats, the game playing each half once).
 */
export const INV_FAST = ["bwv781", "bwv792"] as const;
export const OPENING_STEP: Readonly<Record<string, OpeningStep>> = {
  wtc1f24: "fast",
  wtc2f22: "fast",
  ...Object.fromEntries(AOF_FAST.map((id) => [id, "fast" as const])),
  ...Object.fromEntries(INV_FAST.map((id) => [id, "fast" as const])),
};
export const openingStep = (id: string): OpeningStep => OPENING_STEP[id] ?? "default";

/**
 * D285: the measuring tempo: the recordings' median, as before the game slowed down. Difficulty, stars,
 * tiers and the lessons' search are measured at it, so the pieces' ranking (and what a player has
 * unlocked) stays as it was; what is played is `tempoOf`.
 */
export function standardTempo(id: string): number {
  return TEMPO[id]?.median ?? MORE_TEMPO[id]?.median ?? PRELUDE_TEMPO[id]?.median ?? tempoOf(id);
}

/**
 * D710: a piece that breaks off where its text stops (Contrapunctus 14: Bach's score ends in bar 239, mid-phrase): no
 * final ritard there. D181's automatic one slows into a close; this piece has none to hold back, and no reading marks
 * one (Busoni edited no Art of Fugue). It ends in tempo, on the last note written.
 */
export const BREAKS_OFF: ReadonlySet<string> = new Set(["bwv1080-14"]);
