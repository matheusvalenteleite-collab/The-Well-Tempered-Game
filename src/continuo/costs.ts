/**
 * Every tuning constant of the realization, in one place, to be adjusted by ear.
 * Voicing costs are in "semitones of motion": one semitone of right-hand motion costs 1.
 */
export const COSTS = {
  /** Per semitone of right-hand motion between consecutive downbeats (voices paired low to high). */
  motionPerSemitone: 1,
  /** Per common tone held in the same right-hand voice (negative: a reward). */
  commonToneHeld: -1.5,
  /** Per right-hand leap larger than `leapSemitones`. */
  leap: 2,
  leapSemitones: 4,
  /** Per parallel (or consecutive) 5th or 8ve between a right-hand voice and the bass. */
  parallelWithBass: 6,
  /** Per parallel 5th or 8ve between a right-hand voice and a sung upper voice (not a doubling of it). */
  parallelWithSung: 3,
  /** Per doubled leading tone (an unsharped "mi" rising to "fa" in the bass; sharped ones are never doubled). */
  doubledLeadingTone: 10,
  /** Per semitone that the right hand's top note lies above the highest sung note. */
  topAboveSung: 2,
  /** Voicing outside close or semi-close position. */
  notClose: 1,
  /** A doubling other than the preferred one (5/3: the bass; 6/3: the third or the sixth). */
  doublingNotPreferred: 1,
  /** A bar whose cost on the best path exceeds this is played colla parte. */
  fallbackThreshold: 25,
};

export type Costs = typeof COSTS;

/** Structural defaults (not costs). */
export const DEFAULTS = {
  window: { low: "G3", high: "D5" },
  /** Largest distance between the outer right-hand notes, in semitones. */
  maxRhSpan: 12,
  /**
   * "auto" bass octave: the shift k minimizing, over the bass notes, the semitones outside
   * `bassRange` (C2..G3, MIDI) plus `bassOctavePenalty` per note per octave of shift.
   */
  bassRange: { low: 36, high: 55 },
  bassOctavePenalty: 0.5,
  /** Largest octave shift "auto" may choose. */
  maxBassOctaves: 2,
};
