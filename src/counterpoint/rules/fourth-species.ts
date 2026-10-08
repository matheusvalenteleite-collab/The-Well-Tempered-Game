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
import { interval, isConsonant, type Interval } from "../interval.ts";
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

export const ligatureWherePossible: Rule = {
  ...base("fos.ligature-where-possible", "warning", {
    status: "verified",
    ref: `${P}, p. 74`,
    note: "'Omnino, ubi esse poterit' — but Aloysius approves Josephus leaving one out to avoid repeating the same ligatures. Counted over the inner bars: a warning only when more than a third of them are untied.",
  }),
  check(a) {
    const inner = a.events.filter((e) => e.beat === 0 && e.bar > 0 && e.bar < a.bars - 1);
    const untied = inner.filter((e) => !e.tied);
    return untied.length * 3 > inner.length ? [v(this, untied.map((e) => e.slot), { tied: inner.length - untied.length, untied: untied.length })] : [];
  },
};

// The rules of motion, read with the retardation taken away (p. 71: 'sublatâ retardatione'): the
// carried perfect-approach rule then sees the real progression between the notes that change.
const carried = carriedRules("fourth", "fos", P, "70-71");

export const FOURTH_SPECIES_FUX_STRICT: readonly Rule[] = [arsisConsonant, resolution, ligatureKinds, cadence, ligatureWherePossible, ...carried];
