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

export type TempoVersion = "normal" | "slow";

export interface PieceTempo {
  /** Quarter notes a minute: the median of the recordings. */
  normal: number;
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
  return TEMPO[id]?.normal ?? PRELUDES[id] ?? TUTORIAL_TEMPO[id] ?? 46;
}
