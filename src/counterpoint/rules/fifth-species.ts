/**
 * Fifth-species rules (florid counterpoint), two voices (D82).
 *
 * Page references are to the 1725 print, Exercitii I, Lectiones IV-V (pp. 76-81), read from the
 * page scans (gap_p084.pdf ... gap_p089.pdf; printed page = file page - 8).
 *
 * What Fux states. At the end of Lectio IV, ahead of this species: a ligature may be decorated or
 * "broken" without changing its substance (p. 76); two quavers (fusae) may be mixed in, "on the
 * second and fourth part of the bar, never on the first and third" (p. 76). Lectio V: florid
 * counterpoint "should flourish like a garden with little flowers": every kind of ornament, for the
 * sake of singing, easy flexible motion and an elegant variety of figures (pp. 76-77); it is
 * "nothing other than a heap and combination of the preceding species", and nothing new is to be
 * learnt except the elegance of the melody (p. 77). Aloysius praises entering the downbeat mostly
 * by oblique motion or by syncopation (pp. 78-79). Two crotchets at the beginning of a bar with no
 * ligature following make the melody "limp" (claudicare): better to tie them to a following
 * ligature, or to go on with two more crotchets; given "not as a precept, but as advice" (pp. 80-81),
 * and printed with an NB in Fux's own last example (Fig. 88a, bar 5).
 *
 * Reading (D82): the rules of the earlier species apply to the values they govern: the downbeat
 * consonant (all species); a dissonance tied over the bar line prepared and resolved a step down
 * (fourth, with its forbidden kinds); a dissonance off the downbeat passing by step, or the
 * cambiata (third), or, for a quaver, a step to a neighbour and back (the decorations of p. 76);
 * the cadence on the note below the final.
 */
import { harmonic, interval, isConsonant, type Interval } from "../interval.ts";
import { carriedRules, ruleBase, v } from "./third-species.ts";
import type { Analysis, NoteEvent, Rule, Violation } from "./types.ts";

const P = "Gradus (1725), Exercitii I, Lectio V";
const base = (id: string, severity: Rule["severity"], attribution: Rule["attribution"], messageKey?: string) => ruleBase("fifth", id, severity, attribution, messageKey);

const vert = (e: NoteEvent): Interval => harmonic(e.cantus, e.counterpoint);
const step = (a: string, b: string) => interval(a, b).number === 2;
const dir = (a: string, b: string) => interval(a, b).direction;
const EIGHTH = 0.125;
const QUARTER = 0.25;
const near = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 1e-9;
/** Onsets only (a note held over the bar line counts once, at its onset). */
const onsets = (a: Analysis) => a.events.filter((e) => !e.tied);

export const downbeatConsonance: Rule = {
  ...base("fis.downbeat-consonance", "error", {
    status: "verified",
    ref: `${P}, p. 77 (with Lectiones I-IV)`,
    note: "A note struck on the downbeat is consonant, as in every species; only a note tied over the bar line may be dissonant there (see fis.suspension).",
  }),
  check(a) {
    return a.events.filter((e) => near(e.pos, 0) && !e.tied && !isConsonant(vert(e))).map((e) => v(this, [e.slot], { interval: vert(e).name }));
  },
};

export const suspension: Rule = {
  ...base("fis.suspension", "error", {
    status: "verified",
    ref: "Gradus (1725), Exercitii I, Lectio IV, pp. 69-73, 76",
    note: "A dissonance held over the bar line is prepared by a consonance and resolved a step down to a consonance: by the next note, or on the half bar after consonant notes interposed (the 'variations' of p. 76, as in Figs. 82, 83, 87a, 87b, 88a, 88b). Cantus below: not from the unison to the second nor the octave to the ninth; cantus above: not the seventh to the octave (pp. 71-73).",
  }),
  check(a) {
    const out: Violation[] = [];
    a.events.forEach((e, i) => {
      if (!e.tied || isConsonant(vert(e))) return;
      // The onset of the held note (its preparation) and the next note begun after it.
      let p = i - 1;
      while (p >= 0 && a.events[p].tied) p--;
      const prep = a.events[p];
      const res = a.events.slice(i + 1).find((x) => !x.tied);
      const prepared = !!prep && isConsonant(vert(prep));
      const below = (x: NoteEvent | undefined) => !!x && step(e.counterpoint, x.counterpoint) && dir(e.counterpoint, x.counterpoint) === "down" && isConsonant(vert(x));
      // The substance (p. 76): the resolution a step down on the half bar; its variations decorate
      // it, either resolving at once (then ornamenting) or interposing consonant notes first.
      const half = a.events.find((x) => !x.tied && x.bar === e.bar && near(x.pos, 0.5));
      const between = a.events.filter((x) => !x.tied && x.bar === e.bar && (x.pos ?? 0) < 0.5 - 1e-9 && x.slot > e.slot);
      const resolved = below(res) || (below(half) && between.every((x) => isConsonant(vert(x))));
      const now = vert(e).simple;
      const from = prep ? vert(prep) : null;
      const badKind = a.input.cantusVoice === "lower" ? !!from && now === 2 && (from.simple === 8 || from.number === 1) : now === 7;
      if (!prepared || !resolved || badKind) out.push(v(this, res ? [e.slot, res.slot] : [e.slot], { interval: vert(e).name }));
    });
    return out;
  },
};

export const weakDissonance: Rule = {
  ...base("fis.weak-dissonance", "error", {
    status: "verified",
    ref: "Gradus (1725), Exercitii I, Lectiones II-III, pp. 56-65; p. 76",
    note: "A dissonance struck off the downbeat passes by step in one direction (second and third species), or is the cambiata (third species, a step down, then a third down to a consonance), or steps to a neighbour and back: a quaver (the decorations of p. 76), or a crotchet on the second or fourth crotchet (Fux's own practice, Fig. 86b, bar 8).",
  }),
  check(a) {
    const out: Violation[] = [];
    a.events.forEach((e, i) => {
      if (e.tied || near(e.pos, 0) || isConsonant(vert(e))) return;
      const prev = a.events[i - 1];
      const next = a.events[i + 1];
      if (!prev || !next) return void out.push(v(this, [e.slot], { interval: vert(e).name }));
      const into = step(prev.counterpoint, e.counterpoint);
      const outOf = step(e.counterpoint, next.counterpoint);
      const passing = into && outOf && dir(prev.counterpoint, e.counterpoint) === dir(e.counterpoint, next.counterpoint);
      const cambiata = near(e.len, QUARTER) && into && dir(prev.counterpoint, e.counterpoint) === "down" && interval(e.counterpoint, next.counterpoint).number === 3 && dir(e.counterpoint, next.counterpoint) === "down" && isConsonant(vert(next));
      // A neighbour and back: a quaver anywhere off the beat (p. 76), a crotchet on the second or
      // fourth crotchet (Fux's practice: Fig. 86b, bar 8).
      const weakQuarter = near(e.pos, 0.25) || near(e.pos, 0.75);
      const neighbour = (near(e.len, EIGHTH) || (near(e.len, QUARTER) && weakQuarter)) && into && outOf && next.counterpoint === prev.counterpoint;
      if (!passing && !cambiata && !neighbour) out.push(v(this, [e.slot], { interval: vert(e).name }));
    });
    return out;
  },
};

export const quavers: Rule = {
  ...base("fis.quavers", "error", {
    status: "verified",
    ref: "Gradus (1725), Exercitii I, Lectio IV, p. 76",
    note: "'duae Fusae ... in secunda, & quarta tactus parte, nunquam vero in prima & tertia ponendae sunt': quavers come two at a time, on the second or the fourth crotchet of the bar.",
  }),
  check(a) {
    const out: Violation[] = [];
    const notes = onsets(a);
    for (let i = 0; i < notes.length; i++) {
      const e = notes[i];
      if (!near(e.len, EIGHTH)) continue;
      const pair = notes[i + 1];
      const ok = (near(e.pos, 0.25) || near(e.pos, 0.75)) && !!pair && near(pair.len, EIGHTH) && pair.bar === e.bar && near(pair.pos, (e.pos ?? 0) + EIGHTH);
      if (ok) {
        i++;
        continue;
      }
      out.push(v(this, [e.slot]));
    }
    return out;
  },
};

export const ligature: Rule = {
  ...base("fis.ligature", "error", {
    status: "verified",
    ref: "Gradus (1725), Exercitii I, Lectio IV, p. 69",
    note: "A note is held over the bar line only from the second half of the bar: the first note of a ligature is in arsis.",
  }),
  check(a) {
    const out: Violation[] = [];
    a.events.forEach((e, i) => {
      if (!e.tied) return;
      let p = i - 1;
      while (p >= 0 && a.events[p].tied) p--;
      const start = a.events[p];
      if (start && (start.pos ?? 0) < 0.5 - 1e-9) out.push(v(this, [start.slot, e.slot]));
    });
    return out;
  },
};

export const cadence: Rule = {
  ...base("fis.cadence", "error", {
    status: "verified",
    ref: "Gradus (1725), Exercitii I, Lectiones III-V, pp. 65-66, 73-74, 77-80",
    note: "The penultimate bar ends on the note below the final: a major sixth with the cantus below, a minor third with it above (in all of Fux's twelve examples, reached from a tied seventh or second).",
  }),
  check(a) {
    const last = a.events.filter((e) => e.bar === a.bars - 2);
    const e = last[last.length - 1];
    if (!e) return [];
    const i = vert(e);
    const below = a.input.cantusVoice === "lower";
    const ok = below ? i.quality === "M" && i.simple === 6 : i.quality === "m" && i.simple === 3;
    return ok ? [] : [v(this, [e.slot], { interval: i.name, expected: below ? "M6" : "m3" })];
  },
};

export const limping: Rule = {
  ...base("fis.limping", "warning", {
    status: "verified",
    ref: "Gradus (1725), Exercitii I, Lectio V, pp. 80-81",
    note: "Advice, not a precept: two crotchets at the start of a bar, with no ligature following, make the melody limp ('claudicare'); tie them into a ligature, or go on with two more crotchets. Fux's own Fig. 88a, bar 5, carries the NB.",
  }),
  check(a) {
    const out: Violation[] = [];
    const notes = onsets(a);
    for (let i = 0; i + 2 < notes.length; i++) {
      const [x, y, z] = [notes[i], notes[i + 1], notes[i + 2]];
      if (!near(x.pos, 0) || !near(x.len, QUARTER) || !near(y.pos, QUARTER) || !near(y.len, QUARTER) || x.bar !== y.bar) continue;
      // Followed by a half note in the same bar that is not held over: it limps.
      if (z.bar === x.bar && near(z.pos, 0.5) && near(z.len, 0.5)) out.push(v(this, [x.slot, y.slot, z.slot]));
    }
    return out;
  },
};

const carried = carriedRules("fifth", "fis", P, "77");

export const FIFTH_SPECIES_FUX_STRICT: readonly Rule[] = [downbeatConsonance, suspension, weakDissonance, quavers, ligature, cadence, limping, ...carried];
