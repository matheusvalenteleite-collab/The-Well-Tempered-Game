/**
 * Counterpoint generator (first to fourth species, two voices): a beam search slot by slot.
 *
 * - A cheap local prefilter drops what can never be right (a dissonant downbeat outside a
 *   suspension, a dissonance not entered by step, a tritone, seventh or major-sixth leap, a leap
 *   beyond the octave, a note struck twice where the species forbids it). It may be stricter than
 *   the rules; it only narrows the search.
 * - Each partial line is judged by the game's own engine at every downbeat, as if it ended there:
 *   rules about the ending (cadence, final, the global counts) wait for the whole line, and a
 *   finding on the last note of the prefix waits for the next downbeat, where its context exists.
 * - States are ranked by Fux's counsel and habits (score.ts, habits.ts), blended into one cost so
 *   that the beam keeps some variety, with a little seeded noise.
 * - The finished lines are judged in full; the best with no error is returned.
 */
import { evaluate } from "../engine.ts";
import { harmonic, interval, isConsonant, isPerfectConsonance, motion } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { ModalFinal, Staff } from "../../music/fux/index.ts";
import { REST, slotLayout, sounding, type Slot, type SpeciesId } from "../layout.ts";
import type { Rule } from "../rules/types.ts";
import { rng } from "./cantus.ts";
import type { HabitTables } from "./habits.ts";
import { modelBits } from "./features.ts";
import { sharpAllowed } from "./vocabulary.ts";

export interface CounterpointOptions {
  species: SpeciesId;
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  rules: Rule[];
  vocabulary: string[];
  habits: HabitTables;
  seed?: number;
  /** Beam width (default 40). */
  width?: number;
  /** Weight of one point of counsel against one bit of habit (default 0: Fux's habits alone, which already reflect his practice; the rules guard the precepts). */
  counselWeight?: number;
  /**
   * Variety (temperature). Each note is in effect drawn at random with probability proportional to
   * 2^(-cost / T): at T = 1, with the counsel weight at 0, a move is chosen about as often as Fux
   * makes it; T = 0 always takes the cheapest; a higher T flattens the odds. (Gumbel-max sampling
   * inside the beam.) Ranking by the most typical move alone gives far fewer leaps than Fux writes.
   */
  temperature?: number;
}

export interface GeneratedLine {
  line: string[];
  layout: Slot[];
  warnings: string[];
  cost: number;
}

export const DEFAULT_COUNSEL_WEIGHT = 0;
/** Calibrated on Fux's own rates of leaps and spacing with the weighted habit model (docs/fux/habits-study.md). */
export const DEFAULT_TEMPERATURE = 0.75;
/** The three-voice model (trio.ts) is unweighted; its calibration stays at 1. */
export const TRIO_TEMPERATURE = 1;

const DEFERRED = /cadence|final|prefer-imperfect|ligature-where-possible/;

interface State {
  line: string[];
  cost: number;
}

const midi = (p: string) => parsePitch(p).midi;

function lastSounding(line: string[], before: number): [number, string] | null {
  for (let j = before - 1; j >= 0; j--) if (sounding(line[j])) return [j, line[j]];
  return null;
}

function judge(o: CounterpointOptions, cantus: string[], line: string[], rules: Rule[]) {
  const layout = slotLayout(o.species, cantus.length);
  return evaluate(
    {
      species: o.species,
      modalFinal: o.modalFinal,
      cantusVoice: o.cantusVoice,
      cantus: cantus.map((p) => ({ pitch: p, duration: "1/1" })),
      counterpoint: line.map((p, k) => ({ pitch: sounding(p) ? p : null, duration: layout[k].duration })),
    },
    rules,
  );
}

/** Can `p` follow the line so far at slot k? Local and cheap. */
function prefilter(o: CounterpointOptions, layout: Slot[], line: string[], k: number, p: string): boolean {
  const s = layout[k];
  const cf = o.cantus[s.bar];
  const consonant = isConsonant(harmonic(cf, p));
  const prev = lastSounding(line, k);
  const tiedIn = o.species === "fourth" && s.beat === 0 && prev !== null && prev[0] === k - 1 && prev[1] === p;
  if (!sharpAllowed(p, s.bar, o.cantus.length)) return false;
  if (prev && !tiedIn) {
    const i = interval(prev[1], p);
    const d = Math.abs(midi(p) - midi(prev[1]));
    if (d === 0 && o.species !== "first") return false;
    if (d > 12 || i.quality === "A" || i.quality === "d" || i.number === 7 || (i.number === 6 && i.quality === "M")) return false;
  }
  if (s.beat === 0 && !consonant && !tiedIn) return false;
  if (o.species === "fourth" && s.beat === 1 && !consonant) return false;
  // Leaving a dissonance: by step (or the cambiata's third down in third species); a suspension falls a step.
  if (prev && prev[0] === k - 1) {
    const ps = layout[k - 1];
    const prevDiss = !isConsonant(harmonic(o.cantus[ps.bar], prev[1]));
    if (prevDiss) {
      const d = midi(p) - midi(prev[1]);
      if (o.species === "fourth") {
        if (!(d < 0 && d >= -2)) return false;
      } else if (!(Math.abs(d) <= 2 && d !== 0) && !(o.species === "third" && d >= -4 && d <= -3)) return false;
    }
  }
  // Entering a dissonance on a weak beat: by step.
  if (s.beat !== 0 && !consonant && o.species !== "fourth") {
    if (!prev || Math.abs(midi(p) - midi(prev[1])) > 2) return false;
  }
  return true;
}

/** Counsel and habit of the new note, looking back only. */
function stepCost(o: CounterpointOptions, layout: Slot[], line: string[], k: number, p: string): number {
  const s = layout[k];
  const cf = (j: number) => o.cantus[layout[j].bar];
  const prev = lastSounding(line, k);
  let counsel = 0;
  // Fux's habits (the weighted model of features.ts), looking back from the new note: its
  // interval with the cantus, the move into it and the pair of moves it ends, how it reaches a
  // downbeat, and whether it repeats the fifth or octave of the downbeat before.
  const h = modelBits(o.habits.features, { layout, cantus: o.cantus, line: [...line.slice(0, k), p], cantusVoice: o.cantusVoice, unit: [k] });
  const habit = h.melodic + h.vertical;
  const tiedIn = prev !== null && prev[0] === k - 1 && prev[1] === p && o.species === "fourth" && s.beat === 0;
  if (prev && !tiedIn) {
    if (s.beat === 0) {
      const m = motion(cf(prev[0]), prev[1], cf(k), p);
      if (m === "similar" || m === "parallel") counsel++;
    }
    const d = Math.abs(midi(p) - midi(prev[1]));
    if (d === 0) counsel++;
    if (d > 2) counsel++;
    if (d > 5) counsel++;
  }
  if (s.beat === 0 && s.bar > 0 && s.bar < o.cantus.length - 1 && isPerfectConsonance(harmonic(cf(k), p))) counsel++;
  return (o.counselWeight ?? DEFAULT_COUNSEL_WEIGHT) * counsel + habit;
}

/** Depth-first completion of the last two bars from each state, best states first; full judgement only. */
function completeCadence(o: CounterpointOptions, layout: Slot[], states: State[], from: number): GeneratedLine | null {
  let budget = 2500;
  const finalCf = o.cantus[o.cantus.length - 1];
  for (const st of states) {
    const walk = (line: string[], cost: number): GeneratedLine | null => {
      const k = line.length;
      if (k === layout.length) {
        if (--budget < 0) return null;
        const ev = judge(o, o.cantus, line, o.rules);
        return ev.passed ? { line, layout, warnings: [...new Set(ev.warnings.map((v) => v.ruleId))], cost } : null;
      }
      for (const p of o.vocabulary) {
        if (budget < 0) return null;
        if (!prefilter(o, layout, line, k, p)) continue;
        if (k === layout.length - 1 && (harmonic(finalCf, p).simple !== 8 && harmonic(finalCf, p).simple !== 1)) continue;
        const got = walk([...line, p], cost + stepCost(o, layout, line, k, p));
        if (got) return got;
      }
      return null;
    };
    const got = walk(st.line.slice(0, from), st.cost);
    if (got) return got;
    if (budget < 0) break;
  }
  return null;
}

export function generateCounterpoint(o: CounterpointOptions): GeneratedLine {
  const layout = slotLayout(o.species, o.cantus.length);
  const r = rng(o.seed ?? Date.now());
  // Gumbel-max: argmin of cost - (T / ln 2) * G samples in proportion to 2^(-cost / T).
  const noise = () => -((o.temperature ?? DEFAULT_TEMPERATURE) / Math.LN2) * -Math.log(-Math.log(Math.max(1e-12, r())));
  const prefixRules = o.rules.filter((x) => !DEFERRED.test(x.id));
  for (let attempt = 0; attempt < 4; attempt++) {
    const width = (o.width ?? 40) * 2 ** attempt;
    let beam: State[] = [{ line: [], cost: 0 }];
    const cadenceStart = layout.findIndex((x) => x.bar === o.cantus.length - 2);
    let snapshot: State[] = [];
    for (let k = 0; k < layout.length && beam.length; k++) {
      const s = layout[k];
      if (k === cadenceStart) snapshot = beam;
      const next: State[] = [];
      for (const st of beam) {
        const options = k === 0 && o.species === "fourth" ? [REST] : o.vocabulary;
        for (const p of options) {
          if (p !== REST && !prefilter(o, layout, st.line, k, p)) continue;
          const line = [...st.line, p];
          next.push({ line, cost: st.cost + (p === REST ? 0 : stepCost(o, layout, st.line, k, p) + noise()) });
        }
      }
      next.sort((a, b) => a.cost - b.cost);
      const kept: State[] = [];
      const last = k === layout.length - 1;
      for (const st of next) {
        if (kept.length >= (last ? next.length : width)) break;
        if (s.beat === 0 && s.bar >= 1 && !last) {
          const ev = judge(o, o.cantus.slice(0, s.bar + 1), st.line, prefixRules);
          if (ev.errors.some((v) => !v.positions.includes(k))) continue;
        }
        kept.push(st);
      }
      beam = kept;
    }
    const done = beam
      .map((st) => ({ st, ev: judge(o, o.cantus, st.line, o.rules) }))
      .filter((x) => x.ev.passed)
      .sort((a, b) => a.ev.warnings.length - b.ev.warnings.length || a.st.cost - b.st.cost);
    if (done.length) return { line: done[0].st.line, layout, warnings: [...new Set(done[0].ev.warnings.map((v) => v.ruleId))], cost: done[0].st.cost };
    // The beam reached the cadence with no state that can make Fux's formula: try every
    // completion of the last two bars from the best states before the cadence.
    const found = completeCadence(o, layout, snapshot, cadenceStart);
    if (found) return found;
  }
  throw new Error("no counterpoint found for this cantus firmus");
}
