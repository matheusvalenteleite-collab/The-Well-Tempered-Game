/**
 * From the game back to the tutorial (D128): the lesson that teaches each rule, so that a rule
 * broken in the game's evaluation can be learnt where it is explained. Every rule of the game has
 * one (checked in test/tutorial.test.ts).
 */

/** Rules named by what follows their species prefix ("fs.", "ss.", "ts.", "fos.", "fis."). */
const BY_NAME: Record<string, string> = {
  "vertical-consonance": "intervals.classes",
  "prefer-imperfect-consonances": "first.rules",
  "prefer-contrary-motion": "motion.kinds",
  "perfect-approach": "motion.rule",
  "opening-perfect": "first.begin",
  "final-octave-or-unison": "first.end",
  "melodic-tritone": "first.melody",
  "melodic-major-sixth": "first.melody",
  "unison-only-at-ends": "first.melody",
  "unison-leap": "first.melody",
  "converging-leap-into-octave": "first.melody",
};

/** Rules whose lesson is that of their species. */
const EXACT: Record<string, string> = {
  "fs.cadence": "first.end",
  "ss.cadence": "second.cadence",
  "ss.downbeat-consonance": "second.what",
  "ss.passing-dissonance": "second.passing",
  "ss.downbeat-succession": "second.bars",
  "ss.no-repetition": "second.game",
  "ts.cadence": "third.cadence",
  "ts.downbeat-consonance": "third.what",
  "ts.dissonance": "third.cambiata",
  "ts.no-repetition": "third.game",
  "fos.cadence": "fourth.cadence",
  "fos.arsis-consonant": "fourth.what",
  "fos.resolution": "fourth.resolve",
  "fos.ligature-kinds": "fourth.chain",
  "fos.ligature-where-possible": "fourth.game",
  "fos.no-repetition": "fourth.game",
  "fis.cadence": "fourth.cadence",
  "fis.downbeat-consonance": "fifth.choose",
  "fis.quavers": "fifth.choose",
  "fis.suspension": "fourth.resolve",
  "fis.weak-dissonance": "third.cambiata",
  "fis.ligature": "fifth.what",
  "fis.limping": "fifth.what",
  "fis.florid": "fifth.what",
  "t1.consonance-bass": "three.bass",
  "t1.upper-dissonance": "three.bass",
  "t1.triad": "three.chords",
  "t1.parallel-perfect": "three.fill",
  "t1.direct-perfect": "three.fill",
  "t1.false-fifth": "three.fill",
  "t1.unison": "three.fill",
  "t1.opening": "three.cadence",
  "t1.final-chord": "three.cadence",
  "t1.cadence": "three.cadence",
  "t1.melodic": "first.melody",
};

/** The tutorial lesson that teaches a rule, or null. */
export function lessonForRule(ruleId: string): string | null {
  if (EXACT[ruleId]) return EXACT[ruleId];
  const name = ruleId.slice(ruleId.indexOf(".") + 1);
  return BY_NAME[name] ?? null;
}
