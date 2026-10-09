/**
 * The rhythm that defines a species (D92). Without these, a line of whole notes could be entered
 * in the later species (repeated, or held) and clear them: the other rules judge the notes written,
 * not whether the species was written at all.
 *
 * - Second and third species: no note repeated. Fux defines the species by its values ("two minims
 *   against a semibreve", p. 56; "four crotchets", p. 63) and never strikes the same note twice in
 *   a row in any of his eighteen solutions; a repeated note is a longer note in disguise. Our
 *   reading of the definition, checked against his practice.
 * - Fifth species: florid counterpoint is "a heap and combination of the preceding species", with
 *   "an elegant variety of figures" (pp. 76-77). Checked as: an inner bar in which nothing moves
 *   (one note, or a note held over from the bar before) may occur at most twice — the most in any
 *   of Fux's twelve solutions — and the line must move in crotchets somewhere. Our reading.
 */
import { HOLD, REST } from "../layout.ts";
import { ruleBase, v } from "./third-species.ts";
import type { Rule, Violation } from "./types.ts";

const repetition = (species: "second" | "third", prefix: string, page: string): Rule => ({
  ...ruleBase(species, `${prefix}.no-repetition`, "error", {
    status: "unverified",
    ref: `Gradus (1725), Exercitii I, ${species === "second" ? "Lectio II, p. 56" : "Lectio III, p. 63"}`,
    note: `The species is defined by its note values (p. ${page}); a repeated note is a longer value in disguise. Fux never repeats a note in a row in any of his solutions of this species. Our reading (D92).`,
  }),
  check(a) {
    const out: Violation[] = [];
    const ev = a.events;
    for (let i = 1; i < ev.length; i++) if (ev[i].counterpoint === ev[i - 1].counterpoint) out.push(v(this, [ev[i - 1].slot, ev[i].slot], { pitch: ev[i].counterpoint }));
    return out;
  },
});

export const secondNoRepetition = repetition("second", "ss", "56");
export const thirdNoRepetition = repetition("third", "ts", "63");

export const floridRhythm: Rule = {
  ...ruleBase("fifth", "fis.florid", "error", {
    status: "unverified",
    ref: "Gradus (1725), Exercitii I, Lectio V, pp. 76-77",
    note: "'Nihil aliud est, quàm ... praecedentium Specierum ... congeries' and 'elegans figurarum varietas'. Checked as: at most two inner bars in which nothing moves (the most in Fux's twelve solutions), and some crotchets. Our reading (D92).",
  }),
  check(a) {
    const line = a.input.counterpoint.map((n) => n.pitch);
    const layout = a.input.counterpoint.map((n) => n.duration);
    // Onsets per bar (eight quaver slots, the final bar one whole note).
    const still: number[] = [];
    for (let b = 1; b < a.bars - 1; b++) {
      const slots = Array.from({ length: 8 }, (_, j) => b * 8 + j);
      const moves = slots.filter((k) => line[k] !== HOLD && line[k] !== null && line[k] !== REST).length;
      if (moves < 2) still.push(b * 8);
    }
    const crotchets = a.events.some((e) => !e.tied && e.len !== undefined && Math.abs(e.len - 0.25) < 1e-9);
    const out: Violation[] = [];
    if (still.length > 2) out.push(v(this, still, { still: still.length }));
    if (!crotchets && layout.length > 8) out.push(v(this, [8], { crotchets: 0 }));
    return out;
  },
};

/** Fourth species: the upbeat is a new note, tied over the bar line; never the downbeat struck again. */
export const fourthNoRepetition: Rule = {
  ...ruleBase("fourth", "fos.no-repetition", "error", {
    status: "unverified",
    ref: "Gradus (1725), Exercitii I, Lectio IV, p. 69",
    note: "The ligature joins the upbeat to the next downbeat; striking the downbeat again on its own upbeat makes a whole note in disguise. Never in Fux's six solutions. Our reading (D92).",
  }),
  check(a) {
    const out: Violation[] = [];
    const ev = a.events;
    for (let i = 1; i < ev.length; i++) if (ev[i].beat === 1 && ev[i - 1].beat === 0 && ev[i].bar === ev[i - 1].bar && ev[i].counterpoint === ev[i - 1].counterpoint) out.push(v(this, [ev[i - 1].slot, ev[i].slot], { pitch: ev[i].counterpoint }));
    return out;
  },
};
