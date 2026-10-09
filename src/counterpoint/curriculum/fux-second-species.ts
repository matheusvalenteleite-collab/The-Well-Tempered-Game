/**
 * Fux mode, second species (two voices): the exercises in the order of the Gradus (1725,
 * Exercitii I, Lectio II, pp. 56-63), and the point at which each rule is introduced.
 *
 * Josephus writes every exercise of this lesson (Aloysius writes none), so every step is a task.
 * Lectio II opens by recalling that the first-species precepts on motion and progression still
 * hold ("Vel maximè", p. 56); those carried rules are introduced at step 1 with that page.
 */
import type { CurriculumStep, RuleIntroduction } from "./fux-first-species.ts";
import type { ModalFinal, Staff } from "../../music/fux/types.ts";

const step = (ordinal: number, figure: number, cf_id: string, modal_final: ModalFinal, cantus_voice: Staff, page: string, introduces: RuleIntroduction[] = []): CurriculumStep => ({
  id: `fux-mode.s2.${String(ordinal).padStart(2, "0")}`,
  ordinal,
  voices: 2,
  species: "second",
  kind: "canonical",
  exercise_id: `fux_2v_fig_${String(figure).padStart(3, "0")}`,
  cf_id,
  modal_final,
  cantus_voice,
  page,
  introduces,
});

const recalled = "Recalled for this species: the precepts of first species on motion and progression still hold ('Vel maximè').";

export const FUX_SECOND_SPECIES_CURRICULUM: readonly CurriculumStep[] = [
  step(1, 33, "fux_cf_d_01", "D", "lower", "56-59", [
    { ruleId: "ss.downbeat-consonance", page: "56", occasion: "The note in thesis is always consonant." },
    { ruleId: "ss.passing-dissonance", page: "56", occasion: "The note in arsis may be dissonant only as a passing note filling a third (diminution)." },
    { ruleId: "ss.no-repetition", page: "56", occasion: "Two minims against a semibreve: two notes, not one struck twice (our reading of the definition, D92)." },
    { ruleId: "ss.perfect-approach", page: "56", occasion: recalled },
    { ruleId: "ss.prefer-contrary-motion", page: "56", occasion: recalled },
    { ruleId: "ss.opening-perfect", page: "56", occasion: recalled },
    { ruleId: "ss.final-octave-or-unison", page: "56", occasion: recalled },
    { ruleId: "ss.melodic-tritone", page: "56", occasion: recalled },
    { ruleId: "ss.melodic-major-sixth", page: "56", occasion: recalled },
    { ruleId: "ss.converging-leap-into-octave", page: "56", occasion: recalled },
    { ruleId: "ss.unison-only-at-ends", page: "56", occasion: `${recalled} Checked on downbeats: Fux's own examples put unisons on upbeats (D35).` },
    { ruleId: "ss.cadence", page: "56-57", occasion: "The penultimate bar: a fifth, then a major sixth (cantus below) or a minor third (cantus above). 'Consider the end before you begin.'" },
    {
      ruleId: "ss.downbeat-succession",
      page: "57-59",
      occasion: "Josephus's first attempt (Fig. 26) has two faults Aloysius had not yet explained: a skip of a third cannot hide two fifths or octaves between downbeats; a skip of a fourth or more can. Corrected as Fig. 33.",
    },
  ]),
  // Before this exercise Aloysius shows two devices (p. 59-60): a half rest may replace the first note,
  // and a skip of a minor sixth (ascending) or an octave can restore contrary motion when the voices are too close.
  step(2, 35, "fux_cf_d_01", "D", "upper", "59-60"),
  step(3, 36, "fux_cf_e_01", "E", "lower", "60"),
  // Josephus: the penultimate fifth is impossible here (mi contra fa), so a sixth; Aloysius approves (pp. 60-61).
  step(4, 37, "fux_cf_e_01", "E", "upper", "60-61"),
  step(5, 38, "fux_cf_f_01", "F", "lower", "61"),
  step(6, 39, "fux_cf_f_01", "F", "upper", "61"),
  step(7, 40, "fux_cf_g_01", "G", "lower", "61"),
  step(8, 41, "fux_cf_g_01", "G", "upper", "61"),
  step(9, 42, "fux_cf_a_02", "A", "lower", "62"),
  step(10, 43, "fux_cf_a_01", "A", "upper", "62"),
  step(11, 44, "fux_cf_c_01", "C", "lower", "62"),
  // Then: look ahead to the following bars, not only the one being written (pp. 62-63).
  step(12, 45, "fux_cf_c_01", "C", "upper", "62-63"),
];
