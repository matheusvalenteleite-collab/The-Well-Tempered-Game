/**
 * Fux mode, third and fourth species (two voices): the exercises in the order of the Gradus (1725,
 * Exercitii I, Lectiones III-IV, pp. 63-76), and the point at which each rule is introduced.
 *
 * Josephus writes every worked exercise (D, E, F modes, the cantus below and above). Aloysius then
 * leaves the G, A and C cantus firmi to private study (third species, p. 69; fourth species,
 * p. 75): those are tasks without an original solution, as the C cantus of first species (D32).
 */
import type { CurriculumStep, RuleIntroduction } from "./fux-first-species.ts";
import type { ModalFinal, Staff } from "../../music/fux/types.ts";
import type { SpeciesId } from "../layout.ts";

const make =
  (species: SpeciesId, n: number) =>
  (ordinal: number, figure: number | null, cf_id: string, modal_final: ModalFinal, cantus_voice: Staff, page: string, introduces: RuleIntroduction[] = []): CurriculumStep => ({
    id: `fux-mode.s${n}.${String(ordinal).padStart(2, "0")}`,
    ordinal,
    voices: 2,
    species,
    kind: figure ? "canonical" : "fux-cantus",
    exercise_id: figure ? `fux_2v_fig_${String(figure).padStart(3, "0")}` : null,
    cf_id,
    modal_final,
    cantus_voice,
    page,
    introduces,
  });

const s3 = make("third", 3);
const kept3 = "Everything said of the other species still holds ('iis, quae de aliis Speciebus jam dicta sunt', p. 66).";

export const FUX_THIRD_SPECIES_CURRICULUM: readonly CurriculumStep[] = [
  s3(1, 55, "fux_cf_d_01", "D", "lower", "63-66", [
    { ruleId: "ts.downbeat-consonance", page: "63-64", occasion: "Of five quarters by step, the first must be consonant." },
    { ruleId: "ts.dissonance", page: "63-65", occasion: "The second and fourth may be dissonant, passing by step; the third too when it fills a skip of a third; and the nota cambiata, a skip of a third down from a dissonant second quarter." },
    { ruleId: "ts.cadence", page: "65-66", occasion: "The penultimate bar, which has more difficulty than the others, ends on the note below the final." },
    { ruleId: "ts.opening-perfect", page: "66", occasion: kept3 },
    { ruleId: "ts.final-octave-or-unison", page: "66", occasion: kept3 },
    { ruleId: "ts.perfect-approach", page: "66", occasion: kept3 },
    { ruleId: "ts.melodic-tritone", page: "66", occasion: kept3 },
    { ruleId: "ts.melodic-major-sixth", page: "66", occasion: kept3 },
    { ruleId: "ts.converging-leap-into-octave", page: "66", occasion: kept3 },
    { ruleId: "ts.unison-only-at-ends", page: "66", occasion: `${kept3} Checked on downbeats, as in second species (D35).` },
  ]),
  s3(2, 56, "fux_cf_d_01", "D", "upper", "67"),
  s3(3, 57, "fux_cf_e_01", "E", "lower", "67"),
  s3(4, 58, "fux_cf_e_01", "E", "upper", "67"),
  s3(5, 59, "fux_cf_f_01", "F", "lower", "68"),
  // Aloysius asks about the flats; Josephus: accidental, against mi contra fa (pp. 68-69).
  s3(6, 60, "fux_cf_f_01", "F", "upper", "68-69"),
  // "The three remaining modes, G, A, C, ... I leave to your private study" (p. 69).
  s3(7, null, "fux_cf_g_01", "G", "lower", "69"),
  s3(8, null, "fux_cf_g_01", "G", "upper", "69"),
  s3(9, null, "fux_cf_a_02", "A", "lower", "69"),
  s3(10, null, "fux_cf_a_01", "A", "upper", "69"),
  s3(11, null, "fux_cf_c_01", "C", "lower", "69"),
  s3(12, null, "fux_cf_c_01", "C", "upper", "69"),
];

const s4 = make("fourth", 4);
const kept4 = "The rules of motion hold, read with the retardation taken away ('sublatâ retardatione', p. 71).";

export const FUX_FOURTH_SPECIES_CURRICULUM: readonly CurriculumStep[] = [
  s4(1, 73, "fux_cf_d_01", "D", "lower", "69-74", [
    { ruleId: "fos.arsis-consonant", page: "69", occasion: "The first note of a ligature, in arsis, is always consonant." },
    { ruleId: "fos.resolution", page: "70", occasion: "A dissonance on the downbeat is a retardation of the following note: it resolves by step down to the next consonance." },
    { ruleId: "fos.ligature-kinds", page: "71-73", occasion: "Not from the unison to the second, nor from the octave to the ninth (cantus below); not the seventh to the octave (cantus above)." },
    { ruleId: "fos.cadence", page: "73-74", occasion: "The penultimate bar: the seventh resolving to the sixth (cantus below); the second to the minor third (cantus above)." },
    { ruleId: "fos.ligature-where-possible", page: "74", occasion: "A ligature in every bar where possible; Aloysius accepts one left out for variety." },
    { ruleId: "fos.opening-perfect", page: "69", occasion: "The first note sung, after the half rest, as in the other species." },
    { ruleId: "fos.final-octave-or-unison", page: "73-74", occasion: kept4 },
    { ruleId: "fos.perfect-approach", page: "71", occasion: kept4 },
    { ruleId: "fos.melodic-tritone", page: "71", occasion: kept4 },
    { ruleId: "fos.melodic-major-sixth", page: "71", occasion: kept4 },
    { ruleId: "fos.converging-leap-into-octave", page: "71", occasion: kept4 },
    { ruleId: "fos.unison-only-at-ends", page: "71", occasion: `${kept4} Checked on downbeats not tied over.` },
  ]),
  s4(2, 74, "fux_cf_d_01", "D", "upper", "74"),
  s4(3, 75, "fux_cf_e_01", "E", "lower", "75"),
  s4(4, 76, "fux_cf_e_01", "E", "upper", "75"),
  s4(5, 77, "fux_cf_f_01", "F", "lower", "75"),
  s4(6, 78, "fux_cf_f_01", "F", "upper", "75"),
  // "the cantus firmi of the other three modes ... I commend to you" (pp. 75-76).
  s4(7, null, "fux_cf_g_01", "G", "lower", "75-76"),
  s4(8, null, "fux_cf_g_01", "G", "upper", "75-76"),
  s4(9, null, "fux_cf_a_02", "A", "lower", "75-76"),
  s4(10, null, "fux_cf_a_01", "A", "upper", "75-76"),
  s4(11, null, "fux_cf_c_01", "C", "lower", "75-76"),
  s4(12, null, "fux_cf_c_01", "C", "upper", "75-76"),
];
