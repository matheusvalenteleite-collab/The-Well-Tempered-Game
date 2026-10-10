/**
 * Fifth species (florid counterpoint, two voices): rhythm learnt from Fux's twelve solutions, then
 * pitches found by the same kind of beam search as the other species, judged by the game's own
 * fifth-species rules (D82).
 *
 * Rhythm. Each bar of the game's layout has eight quaver slots: "x" a note begins, "~" it is held
 * (over the bar line too: the tie), "r" a rest. Fux's bars, read from his solutions, follow a small
 * grammar, kept here:
 *   - the first bar is always the half rest and a minim ("r~~~x~~~");
 *   - the bar before the last is a held minim and a minim ("~~~~x~~~": the suspension of the cadence);
 *   - the last bar is a whole note;
 *   - a bar may begin tied ("~...") only when the bar before ends with a minim on its half bar
 *     (ties from the second half of the bar, p. 69), and so must the bar before the cadence;
 *   - two crotchets and a minim are followed by a tie (else the melody "limps", pp. 80-81: advice,
 *     which Fux's own Fig. 88a disregards once, with an NB);
 *   - the other bars are drawn from Fux's own middle bars, as often as he writes each.
 *
 * Pitches. Onset by onset: a cheap local check (consonant downbeats, a dissonance entered and left
 * by step or the cambiata, a tied dissonance resolved a step down, quavers by step, the melodic
 * intervals Fux allows), Fux's habits (the weighted model, learnt on his florid lines), and the
 * engine on the prefix at every bar line (rules about the ending waiting for the end).
 */
import { evaluate } from "../engine.ts";
import { harmonic, interval, isConsonant } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { ModalFinal, Staff } from "../../music/fux/index.ts";
import { HOLD, REST, slotLayout, sounding, type Slot } from "../layout.ts";
import type { Rule } from "../rules/types.ts";
import { rng } from "./cantus.ts";
import type { FuxLine } from "./corpus.ts";
import type { HabitTables } from "./habits.ts";
import { modelBits } from "./features.ts";
import { sharpAllowed } from "./vocabulary.ts";

const midi = (p: string) => parsePitch(p).midi;
export const FIRST_BAR = "r~~~x~~~";
export const CADENCE_BAR = "~~~~x~~~";

/** The rhythm of each bar of a florid line ("x" onset, "~" held, "r" rest), the last bar "x". */
export function barRhythms(layout: Slot[], line: (string | null)[]): string[] {
  const bars: string[] = [];
  layout.forEach((s, k) => {
    const c = line[k] === HOLD ? "~" : line[k] === REST || line[k] === null ? "r" : "x";
    bars[s.bar] = (bars[s.bar] ?? "") + c;
  });
  return bars;
}

/** Fux's middle bars (neither the first, nor the two last), each as often as he writes it. */
export function middleBars(lines: FuxLine[]): string[] {
  return lines.flatMap((l) => barRhythms(l.layout, l.line).slice(1, -2));
}

const lastOnset = (bar: string) => bar.lastIndexOf("x");

/** A rhythm for n bars, drawn from Fux's middle bars under the grammar above. */
export function sampleRhythm(n: number, pool: string[], rand: () => number): string[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const bars = [FIRST_BAR];
    let ok = true;
    for (let b = 1; b <= n - 3; b++) {
      const prev = bars[b - 1];
      const mustTieOut = b === n - 3; // the bar before the cadence ties into it
      // Two crotchets and a minim not held over "limp" (pp. 80-81): after such a bar, a tie.
      const limps = prev.startsWith("x~x~x~~~");
      const fits = pool.filter((x) => (x[0] !== "~" || lastOnset(prev) === 4) && (!limps || x[0] === "~") && (!mustTieOut || lastOnset(x) === 4));
      if (!fits.length) {
        ok = false;
        break;
      }
      bars.push(fits[Math.floor(rand() * fits.length)]);
    }
    if (!ok) continue;
    if (n >= 3) bars.push(CADENCE_BAR);
    bars.push("x");
    if (bars.length === n) return bars;
  }
  throw new Error("no rhythm fits these bars");
}

export interface FloridOptions {
  modalFinal: ModalFinal;
  cantusVoice: Staff;
  cantus: string[];
  rules: Rule[];
  vocabulary: string[];
  habits: HabitTables;
  /** Fux's florid lines, for the rhythms. */
  lines: FuxLine[];
  seed?: number;
  width?: number;
  temperature?: number;
}

export interface FloridLine {
  line: string[];
  layout: Slot[];
  rhythm: string[];
  warnings: string[];
}

const DEFERRED = /cadence|final|prefer-imperfect|ligature-where-possible/;

function judge(o: FloridOptions, bars: number, line: string[], rules: Rule[]) {
  const layout = slotLayout("fifth", bars);
  return evaluate(
    {
      species: "fifth",
      modalFinal: o.modalFinal,
      cantusVoice: o.cantusVoice,
      cantus: o.cantus.slice(0, bars).map((p) => ({ pitch: p, duration: "1/1" })),
      counterpoint: line.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: layout[k].duration })),
    },
    rules,
  );
}

/** The last note begun before slot k, with its slot. */
function lastNote(line: string[], k: number): [number, string] | null {
  for (let j = k - 1; j >= 0; j--) if (sounding(line[j])) return [j, line[j]];
  return null;
}

/** Can p begin at slot k? Local and cheap; may be stricter than the rules. */
function prefilter(o: FloridOptions, layout: Slot[], rhythm: string, line: string[], k: number, p: string): boolean {
  const s = layout[k];
  const n = o.cantus.length;
  if (!sharpAllowed(p, s.bar, n)) return false;
  const cf = o.cantus[s.bar];
  const consonant = isConsonant(harmonic(cf, p));
  const prev = lastNote(line, k);
  // A quaver: a note begun next to another begun (only Fux's quaver pairs do that).
  const quaver = (j: number) => rhythm[j] === "x" && (rhythm[j + 1] === "x" || rhythm[j - 1] === "x");
  if (s.beat === 0 && !consonant) return false;
  if (prev) {
    const [pk, q] = prev;
    const d = midi(p) - midi(q);
    const i = interval(q, p);
    if (d === 0 || Math.abs(d) > 12 || i.quality === "A" || i.quality === "d" || i.number === 7 || (i.number === 6 && i.quality === "M")) return false;
    // A dissonance is entered by step (off the downbeat).
    if (!consonant && Math.abs(d) > 2) return false;
    // Quavers move by step, into and out of the pair.
    if ((quaver(k) || quaver(pk)) && Math.abs(d) > 2) return false;
    // Leaving a dissonance: by step, or the cambiata's third down.
    const qBar = layout[pk].bar;
    const qDiss = !isConsonant(harmonic(o.cantus[qBar], q));
    if (qDiss && !(Math.abs(d) <= 2 || (d >= -4 && d <= -3))) return false;
    // A note held over the bar line into a dissonance (the suspension) resolves a step down.
    const heldInto = layout.findIndex((x, j) => j > pk && j < k && x.beat === 0 && line[j] === HOLD);
    if (heldInto >= 0 && !isConsonant(harmonic(o.cantus[layout[heldInto].bar], q)) && !(d < 0 && d >= -2)) return false;
  }
  return true;
}

/**
 * Fux's counsel of variety ("an elegant variety of figures", p. 77): a line rocking between two
 * notes (a b a b) costs as much as a very rare move. The habit model, which sees only pairs of
 * moves, does not see it.
 */
function rocking(line: string[]): number {
  const on = line.filter(sounding).slice(-4);
  return on.length === 4 && on[0] === on[2] && on[1] === on[3] ? 8 : 0;
}

export function generateFlorid(o: FloridOptions): FloridLine {
  const n = o.cantus.length;
  const layout = slotLayout("fifth", n);
  const r = rng(o.seed ?? Date.now());
  const T = o.temperature ?? 0.75;
  const noise = () => -(T / Math.LN2) * -Math.log(-Math.log(Math.max(1e-12, r())));
  const prefixRules = o.rules.filter((x) => !DEFERRED.test(x.id));
  const pool = middleBars(o.lines);
  for (let attempt = 0; attempt < 8; attempt++) {
    const rhythm = sampleRhythm(n, pool, r);
    const flat = rhythm.join("");
    const width = o.width ?? 30;
    let beam: { line: string[]; cost: number }[] = [{ line: [], cost: 0 }];
    for (let k = 0; k < layout.length && beam.length; k++) {
      const c = flat[k];
      const s = layout[k];
      let next: typeof beam;
      if (c !== "x") next = beam.map((st) => ({ line: [...st.line, c === "~" ? HOLD : REST], cost: st.cost }));
      else {
        next = [];
        for (const st of beam) {
          for (const p of o.vocabulary) {
            if (!prefilter(o, layout, flat, st.line, k, p)) continue;
            const line = [...st.line, p];
            const h = modelBits(o.habits.features, { layout, cantus: o.cantus, line, cantusVoice: o.cantusVoice, unit: [k] });
            next.push({ line, cost: st.cost + h.melodic + h.vertical + rocking(line) + noise() });
          }
        }
        next.sort((a, b) => a.cost - b.cost);
      }
      // At each bar line (from the second), the prefix is judged; a finding on its last slot waits.
      const kept: typeof beam = [];
      const last = k === layout.length - 1;
      for (const st of next) {
        if (!last && kept.length >= width) break;
        if (s.beat === 0 && s.bar >= 2 && !last) {
          let ev;
          try {
            ev = judge(o, s.bar + 1, st.line, prefixRules);
          } catch {
            continue;
          }
          if (ev.errors.some((v) => !v.positions.includes(k))) continue;
        }
        kept.push(st);
      }
      beam = kept;
    }
    const done = beam
      .map((st) => {
        try {
          return { st, ev: judge(o, n, st.line, o.rules) };
        } catch {
          return null;
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.ev.passed)
      .sort((a, b) => a.ev.warnings.length - b.ev.warnings.length || a.st.cost - b.st.cost);
    if (done.length) return { line: done[0].st.line, layout, rhythm, warnings: [...new Set(done[0].ev.warnings.map((v) => v.ruleId))] };
  }
  throw new Error("no florid counterpoint found for this cantus firmus");
}
