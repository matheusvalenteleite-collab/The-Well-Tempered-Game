/**
 * Fux mode, first species: the exercises in the order of the Gradus (1725, Exercitii I,
 * Lectio I, pp. 45-55), and the point at which each rule is introduced.
 *
 * Owner decisions (docs/DECISIONS.md): the player is Josephus; a rule is checked only from
 * the step where Fux introduces or notes it; rules not found in the text are not used.
 */
import type { ModalFinal, Staff } from "../../music/fux/types.ts";
import type { SpeciesId } from "../layout.ts";

export interface RuleIntroduction {
  ruleId: string;
  /** Printed page of the 1725 edition. */
  page: string;
  /** How Fux introduces it at this point. */
  occasion: string;
}

export interface CurriculumStep {
  /** Stable id of the step (not a Fux id). */
  id: string;
  ordinal: number;
  voices: 2;
  species: SpeciesId;
  /**
   * "canonical": a Fux exercise with his original solution.
   * "fux-cantus": Fux's cantus firmus, assigned by Aloysius but not worked out in the book (no original solution).
   */
  kind: "canonical" | "fux-cantus";
  /** Dataset exercise id (canonical steps only). */
  exercise_id: string | null;
  cf_id: string;
  modal_final: ModalFinal;
  cantus_voice: Staff;
  page: string;
  introduces: RuleIntroduction[];
}

const step = (
  ordinal: number,
  exercise: string | null,
  cf_id: string,
  modal_final: ModalFinal,
  cantus_voice: Staff,
  page: string,
  introduces: RuleIntroduction[] = [],
): CurriculumStep => ({
  id: `fux-mode.s1.${String(ordinal).padStart(2, "0")}`,
  ordinal,
  voices: 2,
  species: "first",
  kind: exercise ? "canonical" : "fux-cantus",
  exercise_id: exercise,
  cf_id,
  modal_final,
  cantus_voice,
  page,
  introduces,
});

export const FUX_FIRST_SPECIES_CURRICULUM: readonly CurriculumStep[] = [
  step(1, "fux_2v_fig_005", "fux_cf_d_01", "D", "lower", "45-47", [
    { ruleId: "fs.vertical-consonance", page: "45", occasion: "First species is made of consonances only." },
    { ruleId: "fs.prefer-contrary-motion", page: "45", occasion: "Use contrary or oblique motion as much as possible." },
    { ruleId: "fs.perfect-approach", page: "45", occasion: "The rules of motion stated at the end of Liber I." },
    { ruleId: "fs.prefer-imperfect-consonances", page: "46", occasion: "More imperfect than perfect consonances, the beginning and end excepted." },
    { ruleId: "fs.opening-perfect", page: "47", occasion: "Begin with a perfect consonance (precept recalled by Josephus)." },
    { ruleId: "fs.final-octave-or-unison", page: "47", occasion: "End with a perfect consonance (precept recalled by Josephus)." },
    { ruleId: "fs.cadence", page: "47", occasion: "Penultimate major sixth, the cantus being below." },
  ]),
  // At Fig. 6 Aloysius adds the voicing-specific forms of fs.opening-perfect (pp. 48-49: octave, not fifth, below)
  // and fs.cadence (p. 49: minor third with the cantus above); both rules already carry these forms.
  step(2, "fux_2v_fig_006", "fux_cf_d_01", "D", "upper", "48-50"),
  step(3, "fux_2v_fig_011", "fux_cf_e_01", "E", "lower", "51"),
  step(4, "fux_2v_fig_012", "fux_cf_e_01", "E", "upper", "51-52", [
    { ruleId: "fs.melodic-tritone", page: "51-52", occasion: "Josephus's first version leaps a tritone: 'mi contra fa'." },
  ]),
  step(5, "fux_2v_fig_013", "fux_cf_f_01", "F", "lower", "52"),
  step(6, "fux_2v_fig_014", "fux_cf_f_01", "F", "upper", "52", [
    { ruleId: "fs.no-voice-crossing", page: "52", occasion: "Josephus crosses the cantus (Aloysius approves; a warning by owner decision D2)." },
  ]),
  step(7, "fux_2v_fig_015", "fux_cf_g_01", "G", "lower", "53-54", [
    { ruleId: "fs.melodic-major-sixth", page: "53", occasion: "Josephus's first version leaps a major sixth." },
    { ruleId: "fs.unison-only-at-ends", page: "53-54", occasion: "The unison only at the beginning and the end." },
    { ruleId: "fs.converging-leap-into-octave", page: "54", occasion: "No leap into the octave (or unison) from a remoter consonance by converging motion." },
  ]),
  step(8, "fux_2v_fig_021", "fux_cf_g_01", "G", "upper", "54-55", [
    { ruleId: "fs.unison-leap", page: "54", occasion: "NB on the first note: no leap out of or into the unison." },
  ]),
  step(9, "fux_2v_fig_022", "fux_cf_a_01", "A", "lower", "55"),
  step(10, "fux_2v_fig_023", "fux_cf_a_01", "A", "upper", "55"),
  // "Perge ergo ad A. & C., duos superstites Tonos" (p. 55): C is assigned, but no example follows.
  step(11, null, "fux_cf_c_01", "C", "lower", "55"),
  step(12, null, "fux_cf_c_01", "C", "upper", "55"),
];
