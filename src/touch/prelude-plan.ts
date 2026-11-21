/**
 * D881-D885: THE WTC PRELUDES IN THE MAIN GAME, the per-piece plan (docs/audits/PRELUDES-PLAN.md; the board's rulings for
 * the owner): which voices a prelude offers (the others still sound, by the game: voice-mode.ts `voicesFrom`), at which
 * tempo, and which are held back. Voice numbers are data/touch/pieces.json's (highest first). Book I 1-12 so far.
 */
export interface PreludePlan {
  /** The voices the player may take. */
  offer: readonly number[];
  /** Offered at the slow tempo only (the right hand over the ceiling at D861's). */
  tempo?: "slow";
  /** Not offered yet. */
  held?: true;
  /** Why, in a few words. */
  why: string;
}
export const PRELUDE_PLAN: Readonly<Record<string, PreludePlan>> = {
  wtc1p01: { offer: [0], why: "figuration: the right hand's figure (D882: the named exception to the dull-lines rule)" },
  wtc1p02: { offer: [], held: true, why: "figuration in both hands, over the ceiling in the Presto: held back (D883)" },
  wtc1p03: { offer: [0, 1], why: "two-part: the hands swap the figure and the tune" },
  wtc1p04: { offer: [0, 3], why: "four-part arioso: soprano and bass; the inner voices too sparse (D884, as D864)" },
  wtc1p05: { offer: [0], tempo: "slow", why: "figuration over a staccato bass: the right hand, at the slow tempo (D883)" },
  wtc1p06: { offer: [0], why: "figuration: the right hand; the bass's halves repeated (dull)" },
  wtc1p07: { offer: [0, 1, 2, 3], why: "fugal: toccata, fugato, double fugue: played as a fugue (D881)" },
  wtc1p08: { offer: [0], why: "a melody over arpeggiated chords: the melody (D881)" },
  wtc1p09: { offer: [0, 1, 2], why: "three-part pastorale: every voice (D881)" },
  wtc1p10: { offer: [0], why: "an ornate melody over broken chords: the melody (D881)" },
  wtc1p11: { offer: [0, 1], why: "two-part, as an invention" },
  wtc1p12: { offer: [0, 1, 2, 3], why: "four voices (D881; voiced after Mutopia, CC BY-SA 4.0)" },
};
/**
 * D882: the one deliberate exception to D864's dull-lines rule (the board for the owner): I/1's right hand, whose bars
 * are each their own first half twice (91 %, every WTC fugue voice at most 8 %), offered because its harmony changes
 * every bar. No other.
 */
export const DULL_EXCEPTIONS: Readonly<Record<string, { voice: number; why: string }>> = {
  wtc1p01: { voice: 0, why: "the harmony changes every bar" },
};
/** The voices a planned prelude does not offer (none for a piece without a plan). */
export function preludeExcluded(id: string, voices: number): number[] {
  const p = PRELUDE_PLAN[id];
  return p ? Array.from({ length: voices }, (_, v) => v).filter((v) => !p.offer.includes(v)) : [];
}
