/**
 * Second-species rules (two half notes against a whole note), two voices.
 *
 * Page references are to the 1725 print, Exercitii I, Lectio II (pp. 56-63), read from the
 * upstream page scans (source_pdf/gap_p064.pdf ... gap_p071.pdf; printed page = file page - 8).
 *
 * What Fux states for this species: the thesis (downbeat) note is always consonant; the arsis
 * (upbeat) note may be dissonant only when it moves by step from the preceding note into the
 * following one, filling a third (p. 56); the precepts of first species on motion and progression
 * still hold ("Vel maximè", p. 56); a new penultimate bar (p. 56-57); and the skip-of-a-third
 * argument about successive downbeats (pp. 57-59).
 *
 * Owner rule (D35): a first-species precept stays in force unless Fux's own examples break it.
 * - The unison only at the ends (p. 54): Fux's examples have upbeat unisons (Figs. 36, 39, 42)
 *   but never an interior downbeat unison, so it is checked on downbeats.
 * - More imperfect than perfect consonances (p. 46): Fig. 36 has six perfect against two
 *   imperfect downbeats, so it is dropped, not even kept as a recommendation: Fux's own solution
 *   must be able to earn a star (owner: "Fux is always the last word", D39).
 * - No leap into or out of the unison (pp. 54-55): broken in Figs. 36, 39, 41 and 42; dropped.
 */
import { harmonic, interval, isAbove, isConsonant, isLeap, isOctaveClass, isPerfectConsonance, isUnison, motion, type Interval } from "../interval.ts";
import { MELODIC_FORBIDDEN } from "./first-species.ts";
import type { Analysis, NoteEvent, Rule, Violation } from "./types.ts";

const P = "Gradus (1725), Exercitii I, Lectio II";

const v = (rule: Rule, positions: number[], detail?: Violation["detail"]): Violation => ({
  ruleId: rule.id,
  positions,
  severity: rule.severity,
  messageKey: rule.messageKey,
  ...(detail ? { detail } : {}),
});

const vert = (e: NoteEvent): Interval => harmonic(e.cantus, e.counterpoint);
const pairs = (a: Analysis) => a.events.slice(1).map((e, i) => [a.events[i], e] as const);
const moveOf = (x: NoteEvent, y: NoteEvent) => motion(x.cantus, x.counterpoint, y.cantus, y.counterpoint);

const base = (id: string, severity: Rule["severity"], attribution: Rule["attribution"], messageKey = `rule.${id}`): Omit<Rule, "check"> => ({
  id,
  source: "fux",
  severity,
  species: ["second"],
  voicing: "any",
  messageKey,
  attribution,
});

export const downbeatConsonance: Rule = {
  ...base("ss.downbeat-consonance", "error", { status: "verified", ref: `${P}, p. 56`, note: "'quarum una in Thesi veniens, semper consonans sit, necesse est'." }),
  check(a) {
    return a.events.filter((e) => e.beat === 0 && !isConsonant(vert(e))).map((e) => v(this, [e.slot], { interval: vert(e).name }));
  },
};

export const passingDissonance: Rule = {
  ...base("ss.passing-dissonance", "error", {
    status: "verified",
    ref: `${P}, p. 56`,
    note: "The arsis note may be dissonant only if it moves by step from the preceding note into the following one ('per diminutionem ... implendo illud spatium intermedium, quod intercedit duas Notas per saltum Tertiae distantes'); after or before a skip it must be consonant.",
  }),
  check(a) {
    const out: Violation[] = [];
    a.events.forEach((e, i) => {
      if (e.beat !== 1 || isConsonant(vert(e))) return;
      const prev = a.events[i - 1];
      const next = a.events[i + 1];
      const ok =
        prev !== undefined &&
        next !== undefined &&
        prev.bar === e.bar &&
        interval(prev.counterpoint, e.counterpoint).number === 2 &&
        interval(e.counterpoint, next.counterpoint).number === 2 &&
        interval(prev.counterpoint, e.counterpoint).direction === interval(e.counterpoint, next.counterpoint).direction;
      if (!ok) out.push(v(this, [e.slot], { interval: vert(e).name }));
    });
    return out;
  },
};

export const openingPerfect: Rule = {
  ...base(
    "ss.opening-perfect",
    "error",
    { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, pp. 47-49; Lectio II, p. 56", note: "First-species precept, recalled for this species on p. 56; applied to the first note sung (after the rest, if any)." },
    "rule.fs.opening-perfect",
  ),
  check(a) {
    const e = a.events[0];
    const i = vert(e);
    const ok = a.input.cantusVoice === "lower" ? isPerfectConsonance(i) : isOctaveClass(i);
    return ok ? [] : [v(this, [e.slot], { interval: i.name })];
  },
};

export const finalOctaveOrUnison: Rule = {
  ...base("ss.final-octave-or-unison", "error", { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, p. 48; Lectio II, p. 56" }, "rule.fs.final-octave-or-unison"),
  check(a) {
    const e = a.events[a.events.length - 1];
    return isOctaveClass(vert(e)) ? [] : [v(this, [e.slot], { interval: vert(e).name })];
  },
};

/** Is the diatonic fifth on the counterpoint's side of `cantus` a diminished fifth (mi contra fa)? */
export function fifthIsDiminished(cantus: string, cantusVoice: "upper" | "lower"): boolean {
  const steps = ["C", "D", "E", "F", "G", "A", "B"];
  const letter = cantus[0];
  const k = steps.indexOf(letter) + (cantusVoice === "lower" ? 4 : -4);
  const other = steps[((k % 7) + 7) % 7];
  const pair = cantusVoice === "lower" ? [letter, other] : [other, letter];
  return pair[0] === "B" && pair[1] === "F";
}

export const cadence: Rule = {
  ...base("ss.cadence", "error", {
    status: "verified",
    ref: `${P}, pp. 56-57 and 60-61`,
    note: "Penultimate bar: a fifth, then a major sixth when the cantus is below; a fifth, then a minor third when it is above (pp. 56-57). Where that fifth would be mi contra fa (E mode, cantus above), a sixth instead: Josephus's reasoning at Fig. 37, approved by Aloysius (pp. 60-61).",
  }),
  check(a) {
    const bar = a.bars - 2;
    const down = a.events.find((e) => e.bar === bar && e.beat === 0);
    const up = a.events.find((e) => e.bar === bar && e.beat === 1);
    const below = a.input.cantusVoice === "lower";
    const out: Violation[] = [];
    if (down) {
      const i = vert(down);
      const sixthAllowed = fifthIsDiminished(down.cantus, a.input.cantusVoice);
      const ok = (i.quality === "P" && i.simple === 5) || (sixthAllowed && i.simple === 6 && (i.quality === "M" || i.quality === "m"));
      if (!ok) out.push(v(this, [down.slot], { interval: i.name, expected: sixthAllowed ? "5 or 6" : "5" }));
    }
    if (up) {
      const i = vert(up);
      const want = below ? { quality: "M", simple: 6 } : { quality: "m", simple: 3 };
      if (!(i.quality === want.quality && i.simple === want.simple)) out.push(v(this, [up.slot], { interval: i.name, expected: `${want.quality}${want.simple}` }));
    }
    return out;
  },
};

export const perfectApproach: Rule = {
  ...base(
    "ss.perfect-approach",
    "error",
    { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, pp. 47-50; Lectio II, p. 56", note: "First-species rule of motion, recalled on p. 56; checked between successive notes." },
    "rule.fs.perfect-approach",
  ),
  check(a) {
    return pairs(a).flatMap(([x, y]) => {
      if (!isPerfectConsonance(vert(y))) return [];
      const m = moveOf(x, y);
      return m === "similar" || m === "parallel" ? [v(this, [x.slot, y.slot], { motion: m, from: vert(x).name, to: vert(y).name })] : [];
    });
  },
};

export const downbeatSuccession: Rule = {
  ...base("ss.downbeat-succession", "error", {
    status: "verified",
    ref: `${P}, pp. 57-59`,
    note: "Between successive downbeats the upbeat note counts as absent when it is reached by a step or a skip of a third: the downbeats must then obey the rules of motion by themselves (no two fifths or octaves; no direct motion into a perfect consonance). A skip of a fourth, fifth or sixth from the downbeat makes the ear forget the first note, and the progression is free (p. 58). Introduced at Josephus's first attempt (Fig. 26 = 1725 p. 57), corrected as Fig. 33.",
  }),
  check(a) {
    const out: Violation[] = [];
    for (let bar = 0; bar < a.bars - 1; bar++) {
      const d0 = a.events.find((e) => e.bar === bar && e.beat === 0);
      const up = a.events.find((e) => e.bar === bar && e.beat === 1);
      const d1 = a.events.find((e) => e.bar === bar + 1 && e.beat === 0);
      if (!d0 || !up || !d1) continue;
      if (interval(d0.counterpoint, up.counterpoint).number >= 4) continue; // the skip "saves" it
      if (!isPerfectConsonance(vert(d1))) continue;
      const m = moveOf(d0, d1);
      if (m === "similar" || m === "parallel") out.push(v(this, [d0.slot, d1.slot], { motion: m, from: vert(d0).name, to: vert(d1).name }));
    }
    return out;
  },
};

function melodic(id: string, firstSpeciesId: string, ref: string, forbidden: (i: Interval) => boolean): Rule {
  return {
    ...base(id, "error", { status: "verified", ref, note: "First-species precept, still in force (p. 56)." }, `rule.${firstSpeciesId}`),
    check(a) {
      return pairs(a).flatMap(([x, y]) => {
        const i = interval(x.counterpoint, y.counterpoint);
        return forbidden(i) ? [v(this, [x.slot, y.slot], { interval: i.name, direction: i.direction })] : [];
      });
    },
  };
}

export const melodicTritone = melodic("ss.melodic-tritone", "fs.melodic-tritone", "Gradus (1725), Exercitii I, Lectio I, pp. 51-52", MELODIC_FORBIDDEN.tritone);
export const melodicMajorSixth = melodic("ss.melodic-major-sixth", "fs.melodic-major-sixth", "Gradus (1725), Exercitii I, Lectio I, p. 53; Lectio II, p. 60 (the minor sixth is allowed)", MELODIC_FORBIDDEN.majorSixth);

export const convergingLeapIntoOctave: Rule = {
  ...base(
    "ss.converging-leap-into-octave",
    "error",
    { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, p. 54", note: "Stated as not tolerable even in more voices, hence general." },
    "rule.fs.converging-leap-into-octave",
  ),
  check(a) {
    return pairs(a).flatMap(([x, y]) => {
      const now = vert(y);
      if (!isOctaveClass(now) || moveOf(x, y) !== "contrary") return [];
      const leap = isLeap(interval(x.cantus, y.cantus)) || isLeap(interval(x.counterpoint, y.counterpoint));
      return leap && vert(x).semitones > now.semitones ? [v(this, [x.slot, y.slot], { from: vert(x).name, to: now.name })] : [];
    });
  },
};

export const unisonOnlyAtEnds: Rule = {
  ...base(
    "ss.unison-only-at-ends",
    "error",
    { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, pp. 53-54", note: "Checked on interior downbeats only: Fux's second-species examples place unisons on upbeats, never on an interior downbeat (D35)." },
    "rule.fs.unison-only-at-ends",
  ),
  check(a) {
    return a.events.filter((e) => e.beat === 0 && e.bar > 0 && e.bar < a.bars - 1 && isUnison(vert(e))).map((e) => v(this, [e.slot]));
  },
};

export const preferContraryMotion: Rule = {
  ...base(
    "ss.prefer-contrary-motion",
    "warning",
    { status: "verified", ref: "Gradus (1725), Exercitii I, Lectio I, p. 45", note: "Counted over the moves into each downbeat, where both voices may move." },
    "rule.fs.prefer-contrary-motion",
  ),
  check(a) {
    let good = 0;
    const bad: number[] = [];
    for (const [x, y] of pairs(a)) {
      if (y.beat !== 0) continue;
      const m = moveOf(x, y);
      if (m === "contrary" || m === "oblique") good++;
      else if (m === "similar" || m === "parallel") bad.push(y.slot);
    }
    return bad.length > good ? [v(this, bad, { contraryOrOblique: good, similarOrParallel: bad.length })] : [];
  },
};

export const SECOND_SPECIES_FUX_STRICT: readonly Rule[] = [
  downbeatConsonance,
  passingDissonance,
  openingPerfect,
  finalOctaveOrUnison,
  cadence,
  perfectApproach,
  downbeatSuccession,
  melodicTritone,
  melodicMajorSixth,
  convergingLeapIntoOctave,
  unisonOnlyAtEnds,
  preferContraryMotion,
];
