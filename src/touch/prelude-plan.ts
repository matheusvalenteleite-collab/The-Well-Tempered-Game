/**
 * D881-D885: THE WTC PRELUDES IN THE MAIN GAME, the per-piece plan (docs/audits/PRELUDES-PLAN.md; the board's rulings for
 * the owner): which voices a prelude offers (the others still sound, by the game: voice-mode.ts `voicesFrom`), at which
 * tempo, and which are held back. Voice numbers are data/touch/pieces.json's (highest first). Book I and Book II 1-12.
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
  wtc1p02: { offer: [1], why: "figuration in both hands: the left hand, at the tempo (D950; held back before, D883)" },
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
  // D888, D889, D899, D907: batch 2, Book I 13-24 (D899 and D907 were numbered D890 and D891 first, numbers another session held).
  wtc1p13: { offer: [0, 1], why: "two-part: a tune over an accompanying motif" },
  wtc1p14: { offer: [0, 1], why: "two-part, invention-like (D907: at the ceiling)" },
  wtc1p15: { offer: [0, 1], why: "two-part figuration, the hands swapping the figure (D907)" },
  wtc1p16: { offer: [0, 1, 2], why: "three voices: a trilled soprano, an alto, a bass (D888)" },
  wtc1p17: { offer: [0, 1], why: "concerto-like: a tune over a broken-chord bass, not dull by any test (D907)" },
  wtc1p18: { offer: [0, 1, 2], why: "three-part, sinfonia-like (D888)" },
  wtc1p19: { offer: [0, 1, 2], why: "three-part, imitative; the middle voice crossing the hands (D888)" },
  wtc1p20: { offer: [0, 1], why: "two-part, invention-like (D907)" },
  wtc1p21: { offer: [0], tempo: "slow", why: "toccata: the right hand, at the slow tempo (D889)" },
  wtc1p22: { offer: [0], why: "a five-part arioso: the melody alone (D899)" },
  wtc1p23: { offer: [0, 1, 2], why: "three-part, imitative (D888)" },
  wtc1p24: { offer: [0, 1, 2], why: "a trio: two upper voices over a walking bass (D888)" },
  // D953-D956: batch 3, Book II 1-12.
  wtc2p01: { offer: [0], why: "a figured upper part over a held bass: the melody (D953)" },
  wtc2p02: { offer: [0, 1], why: "two-part, at the ceiling" },
  wtc2p03: { offer: [0, 1], why: "broken chords, then a fughetta: played as a fugue; its bass's pedal figure dull (D954)" },
  wtc2p04: { offer: [0, 1, 2], why: "a three-part trio (D953)" },
  wtc2p05: { offer: [0, 1, 2], tempo: "slow", why: "three voices, concerto-like, at the slow tempo (D955)" },
  wtc2p06: { offer: [0, 1], tempo: "slow", why: "two-part figuration, at the slow tempo (D955)" },
  wtc2p07: { offer: [0, 1], why: "a pastorale, the two hands" },
  wtc2p08: { offer: [0, 1], tempo: "slow", why: "two-part, at the slow tempo (D955)" },
  wtc2p09: { offer: [0, 1, 2], why: "three-part, stile antico (D953)" },
  wtc2p10: { offer: [0, 1], tempo: "slow", why: "two-part, at the slow tempo (D955)" },
  wtc2p11: { offer: [0, 1, 2, 3], why: "four voices, imitative (D953)" },
  wtc2p12: { offer: [0, 1], why: "two-part; the bass's octave figures at the yardstick's edge, not beyond (D956)" },
};
/**
 * D882: the deliberate exceptions to D864's dull-lines rule (the board for the owner): I/1's right hand, whose bars
 * are each their own first half twice (91 %, every WTC fugue voice at most 8 %), offered because its harmony changes
 * every bar; D950: and I/2's left hand (64 %), on the same ground, so that all of Book I is offered. No other.
 */
export const DULL_EXCEPTIONS: Readonly<Record<string, { voice: number; why: string }>> = {
  wtc1p01: { voice: 0, why: "the harmony changes every bar" },
  // D950: and I/2's left hand (its bars 64 % their own first half twice), on the same ground, for the whole of Book I.
  wtc1p02: { voice: 1, why: "the harmony changes every bar" },
};
/** The voices a planned prelude does not offer (none for a piece without a plan). */
export function preludeExcluded(id: string, voices: number): number[] {
  const p = PRELUDE_PLAN[id];
  return p ? Array.from({ length: voices }, (_, v) => v).filter((v) => !p.offer.includes(v)) : [];
}

/**
 * D980: a prelude is offered on play.html only once it is planned and not held (I/2, D883): a prelude with no row
 * (Book I 13-24 until claude/preludes-b2's rows land, all of Book II) shows PRELUDE · COMING. The gate is in the data
 * as well as on the button: `preludeExcluded` gives nothing for an unplanned prelude, so it would offer every voice.
 */
// D988 (the board): Book I only for now; Book II's rows (D953-D956) stay COMING until the board opens them (this book flag).
export const PRELUDE_BOOKS: readonly number[] = [1];
export const preludeReady = (id: string): boolean => /^wtc[12]p\d\d$/.test(id) && PRELUDE_BOOKS.includes(Number(id[3])) && !!PRELUDE_PLAN[id] && !PRELUDE_PLAN[id].held;
/** D980: a WTC prelude's fugue ("wtc1p09" → "wtc1f09"); any other id as it is. */
export const fugueOfPrelude = (id: string): string => id.replace(/^(wtc[12])p(\d\d)$/, "$1f$2");
/** D980: a WTC fugue's prelude ("wtc1f09" → "wtc1p09"); any other id as it is. */
export const preludeOfFugue = (id: string): string => id.replace(/^(wtc[12])f(\d\d)$/, "$1p$2");
/**
 * D980 (the owner: the prelude shares its fugue's world): the id a world is looked up by: a WTC prelude's is its
 * fugue's (the stage and its backdrop, the picture, the world's sound effects, its name, its HOME sound and drums).
 */
export const worldOf = (id: string): string => fugueOfPrelude(id);
/** D980: a prelude offered at the slow tempo only (I/5, I/21: D883, D887). */
export const slowOnly = (id: string): boolean => PRELUDE_PLAN[id]?.tempo === "slow";
