/**
 * Fourth-species rules (the ligature, or syncopation), two voices.
 *
 * Page references are to the 1725 print, Exercitii I, Lectio IV (pp. 69-76), read from the page
 * scans (gap_p077.pdf ... gap_p084.pdf; printed page = file page - 8).
 *
 * What Fux states: two half notes against a whole note, the first in arsis, the second in thesis,
 * tied; the ligature is consonant or dissonant (p. 69). The first note of a ligature is always
 * consonant (p. 69). A dissonance on the thesis is a retardation of the following note and resolves
 * by step down to the next consonance (p. 70). Cantus below: the second resolves to the unison, the
 * fourth to the third, the seventh to the sixth, the ninth to the octave; for that reason no
 * ligature may go from the unison to the second or from the octave to the ninth (which hide two
 * unisons or two octaves), while the third to the second and the tenth to the ninth are good
 * (pp. 71-72). Cantus above: the second resolves to the third, the fourth to the fifth, the ninth
 * to the tenth; the seventh resolving to the octave is avoided on the authority of the classical
 * authors (pp. 72-73). Penultimate bar: the seventh resolving to the sixth (cantus below); the
 * second resolving to the minor third, then the unison (cantus above) (pp. 73-74). A ligature in
 * every bar where possible, otherwise plain half notes (p. 74).
 */
import { harmonic, interval, isConsonant, type Interval } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import { MELODIC_FORBIDDEN } from "./first-species.ts";
import { carriedRules, ruleBase, v, vert } from "./third-species.ts";
import type { Analysis, NoteEvent, Rule, Violation } from "./types.ts";

const P = "Gradus (1725), Exercitii I, Lectio IV";
const base = (id: string, severity: Rule["severity"], attribution: Rule["attribution"], messageKey?: string) => ruleBase("fourth", id, severity, attribution, messageKey);

/** The note after e (the resolution of a downbeat), if any. */
const after = (a: Analysis, e: NoteEvent) => a.events[a.events.indexOf(e) + 1];
const before = (a: Analysis, e: NoteEvent) => a.events[a.events.indexOf(e) - 1];
/** Does the upbeat e start a ligature (tied into the next downbeat)? */
const startsTie = (a: Analysis, e: NoteEvent) => after(a, e)?.tied === true;
const simple = (i: Interval) => i.simple;

export const arsisConsonant: Rule = {
  ...base("fos.arsis-consonant", "error", {
    status: "verified",
    ref: `${P}, p. 69`,
    note: "'cujus prima Nota, nempe in Arhsi quidem Consonans, (quod semper esse debet)'. An upbeat that is not tied over (plain half notes, p. 74) is treated as in second species: it may pass by step.",
  }),
  check(a) {
    const out: Violation[] = [];
    a.events.forEach((e, i) => {
      if (e.beat !== 1 || isConsonant(vert(e))) return;
      if (startsTie(a, e)) return void out.push(v(this, [e.slot], { interval: vert(e).name }));
      const prev = a.events[i - 1];
      const next = a.events[i + 1];
      const passing = !!prev && !!next && interval(prev.counterpoint, e.counterpoint).number === 2 && interval(e.counterpoint, next.counterpoint).number === 2 && interval(prev.counterpoint, e.counterpoint).direction === interval(e.counterpoint, next.counterpoint).direction;
      if (!passing) out.push(v(this, [e.slot], { interval: vert(e).name }));
    });
    return out;
  },
};

export const resolution: Rule = {
  ...base("fos.resolution", "error", {
    status: "verified",
    ref: `${P}, pp. 69-70`,
    note: "A dissonance on the downbeat must be tied from the upbeat (prepared) and resolve by step down to a consonance on the upbeat ('semper in proximam Consonantiam gradatim descendendo').",
  }),
  check(a) {
    const out: Violation[] = [];
    for (const e of a.events) {
      if (e.beat !== 0 || isConsonant(vert(e))) continue;
      const r = after(a, e);
      const ok = !!e.tied && !!r && r.bar === e.bar && interval(e.counterpoint, r.counterpoint).number === 2 && interval(e.counterpoint, r.counterpoint).direction === "down" && isConsonant(vert(r));
      if (!ok) out.push(v(this, r && r.bar === e.bar ? [e.slot, r.slot] : [e.slot], { interval: vert(e).name, tied: e.tied ? "yes" : "no" }));
    }
    return out;
  },
};

export const ligatureKinds: Rule = {
  ...base("fos.ligature-kinds", "error", {
    status: "verified",
    ref: `${P}, pp. 71-73`,
    note: "Cantus below: no ligature from the unison to the second or from the octave to the ninth (they hide two unisons or two octaves). Cantus above: the seventh resolving to the octave is avoided ('Septimam consultò ... omissam').",
  }),
  check(a) {
    const out: Violation[] = [];
    for (const e of a.events) {
      if (e.beat !== 0 || !e.tied || isConsonant(vert(e))) continue;
      const prep = before(a, e);
      const now = simple(vert(e));
      if (a.input.cantusVoice === "lower") {
        const from = prep ? vert(prep) : null;
        if (from && from.simple === 8 && now === 2) out.push(v(this, [prep!.slot, e.slot], { from: from.name, to: vert(e).name }));
        if (from && from.number === 1 && now === 2) out.push(v(this, [prep!.slot, e.slot], { from: from.name, to: vert(e).name }));
      } else if (now === 7) out.push(v(this, [e.slot], { interval: vert(e).name }));
    }
    return out;
  },
};

export const cadence: Rule = {
  ...base("fos.cadence", "error", {
    status: "verified",
    ref: `${P}, pp. 73-74`,
    note: "Penultimate bar: cantus below, the seventh resolving to the (major) sixth; cantus above, the second resolving to the minor third; then the octave or unison.",
  }),
  check(a) {
    const bar = a.bars - 2;
    const d = a.events.find((e) => e.bar === bar && e.beat === 0);
    const u = a.events.find((e) => e.bar === bar && e.beat === 1);
    const below = a.input.cantusVoice === "lower";
    const out: Violation[] = [];
    if (d && !(d.tied && simple(vert(d)) === (below ? 7 : 2))) out.push(v(this, [d.slot], { interval: vert(d).name, expected: below ? "7 (tied)" : "2 (tied)" }));
    if (u) {
      const i = vert(u);
      const ok = below ? i.simple === 6 && i.quality === "M" : i.simple === 3 && i.quality === "m";
      if (!ok) out.push(v(this, [u.slot], { interval: i.name, expected: below ? "M6" : "m3" }));
    }
    return out;
  },
};

const DIATONIC = ["C", "D", "E", "F", "G", "A", "B"];
/** The pitches a ligature may use: the naturals and B flat (Fux's only accidental in the arsis). */
const spellings = (diatonic: number) => {
  const name = `${DIATONIC[((diatonic % 7) + 7) % 7]}${Math.floor(diatonic / 7)}`;
  return name.startsWith("B") ? [name, `Bb${name.slice(1)}`] : [name];
};
const singable = (from: string, to: string) => {
  const i = interval(from, to);
  return i.number <= 8 && i.number !== 7 && !MELODIC_FORBIDDEN.tritone(i) && !MELODIC_FORBIDDEN.majorSixth(i);
};

/**
 * Could the upbeat of bar b - 1 have been tied into bar b? Aloysius: "where there is no room for a
 * ligature" (p. 74). There is room when some note, reached from the downbeat of bar b - 1 by a
 * singable interval, is consonant with that bar's cantus and, held over the bar line, is either
 * consonant with the next cantus note or a dissonance of a permitted kind that can resolve a step
 * down to a consonance. Only the next bar is looked at: a ligature that the line could have taken.
 */
export function ligaturePossible(a: Analysis, b: number): boolean {
  const cf0 = a.input.cantus[b - 1]?.pitch;
  const cf1 = a.input.cantus[b]?.pitch;
  if (!cf0 || !cf1) return false;
  const d = a.events.find((e) => e.bar === b - 1 && e.beat === 0)?.counterpoint;
  const centre = parsePitch(d ?? a.events.find((e) => e.bar === b)!.counterpoint).diatonic;
  const below = a.input.cantusVoice === "lower";
  for (let k = centre - 7; k <= centre + 7; k++) {
    for (const x of spellings(k)) {
      if (below ? parsePitch(x).midi < parsePitch(cf0).midi : parsePitch(x).midi > parsePitch(cf0).midi) continue;
      if (d && !singable(d, x)) continue;
      const prep = harmonic(cf0, x);
      if (!isConsonant(prep)) continue;
      const held = harmonic(cf1, x);
      if (isConsonant(held)) return true;
      if (below && held.simple === 2 && (prep.simple === 8 || prep.number === 1)) continue;
      if (!below && held.simple === 7) continue;
      if (spellings(k - 1).some((r) => isConsonant(harmonic(cf1, r)))) return true;
    }
  }
  return false;
}

/**
 * "A ligature wherever possible" (p. 74), measured against Fux: an untied bar counts against the
 * player only when a ligature was possible there; Aloysius's other licence, variety, is granted as
 * many times as Fux takes it in his own solution to the exercise (D62).
 */
export const ligatureWherePossibleWith = (allowance: number): Rule => ({
  ...base("fos.ligature-where-possible", "warning", {
    status: "verified",
    ref: `${P}, p. 74`,
    note: "'Omnino, ubi esse poterit': plain minims where there is no room for a ligature. Josephus leaves one out where it was possible, to avoid repeating the same ligatures, and Aloysius approves. A bar counts only where a ligature was possible; the player may leave out as many as Fux does in his solution to the exercise (one at most where there is none).",
  }),
  check(a) {
    const omitted = a.events.filter((e) => e.beat === 0 && e.bar > 0 && e.bar < a.bars - 1 && !e.tied && ligaturePossible(a, e.bar));
    return omitted.length > allowance ? [v(this, omitted.map((e) => e.slot), { omitted: omitted.length, allowed: allowance })] : [];
  },
});
/** Without an exercise of Fux's to measure against: the most he allows himself in any of his six. */
export const ligatureWherePossible = ligatureWherePossibleWith(1);

// The rules of motion, read with the retardation taken away (p. 71: 'sublatâ retardatione'): the
// carried perfect-approach rule then sees the real progression between the notes that change.
const carried = carriedRules("fourth", "fos", P, "70-71");

export const FOURTH_SPECIES_FUX_STRICT: readonly Rule[] = [arsisConsonant, resolution, ligatureKinds, cadence, ligatureWherePossible, ...carried];
