/**
 * Fux's habits, measured on his own solutions: how often each melodic move (signed semitones) and
 * each vertical interval (by downbeat / other beats) occurs, per species. A candidate's habit cost
 * is its surprisal under these frequencies (bits): low = what Fux usually does. These are
 * observations of his practice, never precepts; they only rank choices that every rule allows.
 *
 * The counterpoint's role matters (in three voices the bass leaps about 1.5 times as often as the
 * upper voices), so melodic frequencies are kept per role (counterpoint above / below the cantus)
 * and shrunk towards the pooled frequencies where the role has few observations.
 */
import { harmonic, simpleName } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { Staff } from "../../music/fux/index.ts";
import type { SpeciesId } from "../layout.ts";
import { onsets, type FuxLine } from "./corpus.ts";

type Counts = Map<string, number>;
const add = (m: Counts, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const total = (m: Counts) => [...m.values()].reduce((a, b) => a + b, 0);

export interface HabitTables {
  species: SpeciesId;
  /** Exercises the tables were built from. */
  from: string[];
  melodic: { pooled: Counts; upper: Counts; lower: Counts };
  vertical: { down: Counts; other: Counts };
  /** Successive downbeats on the same perfect consonance (fifths or octaves broken by the upbeats), and all successive downbeats. */
  succession: { same: number; total: number };
}

/** Role of the counterpoint: "upper" when the cantus is below. */
export const roleOf = (cantusVoice: Staff): "upper" | "lower" => (cantusVoice === "lower" ? "upper" : "lower");

export const melodicKey = (from: string, to: string) => {
  const d = parsePitch(to).midi - parsePitch(from).midi;
  return String(Math.max(-12, Math.min(12, d)));
};
/**
 * The vertical interval with its octave count ("M3", "M3+1" = a tenth), so that spacing is learnt
 * too, marked "x" when the counterpoint has crossed to the cantus's side.
 */
export const verticalKey = (cantus: string, cp: string, cantusVoice: Staff) => {
  const h = harmonic(cantus, cp);
  const octaves = Math.floor((h.number - 1) / 7) - (h.number > 1 && (h.number - 1) % 7 === 0 ? 1 : 0);
  const d = parsePitch(cp).midi - parsePitch(cantus).midi;
  const crossed = cantusVoice === "lower" ? d < 0 : d > 0;
  return `${crossed ? "x" : ""}${simpleName(h)}${octaves > 0 ? `+${octaves}` : ""}`;
};

/** Tables from Fux's lines of one species, leaving out the exercises in `exclude` (leave-one-out). */
export function buildHabits(lines: FuxLine[], species: SpeciesId, exclude: string[] = []): HabitTables {
  const t: HabitTables = { species, from: [], melodic: { pooled: new Map(), upper: new Map(), lower: new Map() }, vertical: { down: new Map(), other: new Map() }, succession: { same: 0, total: 0 } };
  for (const l of lines) {
    if (l.species !== species || exclude.includes(l.exerciseId)) continue;
    t.from.push(l.exerciseId);
    const on = onsets(l.layout, l.line);
    for (let i = 1; i < on.length; i++) {
      const k = melodicKey(on[i - 1][1], on[i][1]);
      add(t.melodic.pooled, k);
      add(t.melodic[roleOf(l.cantusVoice)], k);
    }
    let prevDown: string | null = null;
    l.line.forEach((p, k) => {
      if (!/^[A-G]/.test(p)) return;
      if (l.layout[k].beat === 0) {
        const key = verticalKey(l.cantus[l.layout[k].bar], p, l.cantusVoice);
        if (prevDown !== null) {
          t.succession.total++;
          if (samePerfect(prevDown, key)) t.succession.same++;
        }
        prevDown = key;
      }
      const s = l.layout[k];
      add(s.beat === 0 ? t.vertical.down : t.vertical.other, verticalKey(l.cantus[s.bar], p, l.cantusVoice));
    });
  }
  return t;
}

/** Additive smoothing over a vocabulary of `size` outcomes. */
const prob = (m: Counts, k: string, size: number, alpha = 0.5) => ((m.get(k) ?? 0) + alpha) / (total(m) + alpha * size);
const MELODIC_SIZE = 25; // -12..+12 semitones
const VERTICAL_SIZE = 60; // interval names with octave counts, generously

/** Probability of a melodic move for a role, shrunk towards the pooled table (strength 5). */
export function melodicProb(t: HabitTables, role: "upper" | "lower", key: string): number {
  const r = t.melodic[role];
  const pooled = prob(t.melodic.pooled, key, MELODIC_SIZE);
  const n = total(r);
  return ((r.get(key) ?? 0) + 5 * pooled) / (n + 5);
}

export const verticalProb = (t: HabitTables, downbeat: boolean, key: string) => prob(downbeat ? t.vertical.down : t.vertical.other, key, VERTICAL_SIZE);

export const bits = (p: number) => -Math.log2(p);

/** Two vertical keys on successive downbeats: the same fifth or octave (unison) again? */
export const samePerfect = (a: string, b: string) => /^x?(5|8|1)(\+\d)?$/.test(a) && a.replace(/^x|\+\d$/g, "") === b.replace(/^x|\+\d$/g, "");

/** Surprisal of a downbeat following another on the same (or a different) perfect consonance. */
export const successionBits = (t: HabitTables, same: boolean) => {
  const p = (t.succession.same + 0.5) / (t.succession.total + 1);
  return bits(same ? p : 1 - p);
};
