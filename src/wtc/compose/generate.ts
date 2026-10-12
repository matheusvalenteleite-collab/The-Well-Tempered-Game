/**
 * Proposals (the composer's second milestone, docs/wtc/COMPOSE.md L3): a line against a given one,
 * in free rhythm, in a key (or moving between two). The Fux beam (src/counterpoint/choices/) carried
 * into tonal music:
 *
 * 1. **Rhythm** first, complementary to the given line, beat by beat: where the given voice moves
 *    quickly the new one holds, where it holds the new one moves (Bach's countersubjects against
 *    their answers). Several rhythms are sampled.
 * 2. **Pitches** by a beam over the degrees of the key, each note costed by local rules:
 *    consonance on the beat (an imperfect one preferred; a fifth costly where the line must invert);
 *    a dissonance only as a passing or neighbour note off the beat, or as a suspension (held, then
 *    resolved down by step); no consecutive fifths or octaves; steps preferred, a leap recovered by
 *    a step the other way, no augmented or diminished leap, nothing beyond the octave; the leading
 *    note to the tonic; contrary motion favoured; the line kept on its side of the given one; the
 *    last note leading to where the line must go next. Gumbel noise varies the proposals.
 * 3. **Verification** by the judge the player's own lines face (invertible.ts `judgePair`, with
 *    Bach's licences, isolated), and for a countersubject the inverted placing too: proposals with
 *    the fewest faults first.
 *
 * What it proposes is plain and correct, not Bach: the composer sets Bach's own passages beside it.
 */
import { harmonic, interval, isConsonant, isPerfectConsonance } from "../../counterpoint/interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import { beatOf } from "../counterpoint.ts";
import type { WtcNote } from "../fugues.ts";
import { across, judgePair } from "./invertible.ts";
import { atPlace, barQuarters, EPS, modeOf, type Ev, type FugueDraft } from "./model.ts";

export interface GenOptions {
  /** The key at each time (an episode moves from one to another). */
  keyAt: (t: number) => string;
  time: string;
  /** Where time 0 lies in its bar. */
  phase: number;
  /** The stretch to fill, in quarters. */
  from: number;
  to: number;
  given: WtcNote[];
  /** The new line lies above the given one. */
  above: boolean;
  /** The note before the stretch (how the line is approached), and the note after it (where it must lead). */
  before?: string;
  after?: string;
  /** The register: lowest and highest MIDI numbers. */
  low: number;
  high: number;
  /** The line must also stand inverted at the octave (a countersubject). */
  invertible?: boolean;
  /** Fixed rhythm (lengths in quarters, laid end to end from `from`), instead of a sampled one. */
  rhythm?: number[];
  seed?: number;
  /** How many proposals. */
  count?: number;
  /** For verification: the draft (metre, licences). */
  draft: FugueDraft;
}

/** A small seeded generator (mulberry32), so that proposals can be asked for again. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sounding = (xs: WtcNote[], t: number) => xs.find((n) => n.at <= t + EPS && t < n.at + n.dur - EPS);
const midi = (p: string) => parsePitch(p).midi;
const dia = (p: string) => parsePitch(p).diatonic;

/** The rhythm: lengths filling [from, to), beat by beat against the given line's motion. */
export function sampleRhythm(o: GenOptions, rand: () => number): number[] {
  const beat = beatOf(o.time);
  const compound = Math.abs(beat - 1.5) < EPS || Math.abs(beat - 0.75) < EPS;
  const out: number[] = [];
  let t = o.from;
  // To the first beat, one note.
  const into = (((t + o.phase) % beat) + beat) % beat;
  if (into > EPS && t + (beat - into) <= o.to + EPS) {
    out.push(beat - into);
    t += beat - into;
  }
  while (t < o.to - EPS) {
    const w = Math.min(beat, o.to - t);
    if (w < beat - EPS) {
      out.push(w);
      break;
    }
    const busy = o.given.filter((n) => n.at >= t - EPS && n.at < t + beat - EPS).length;
    const r = rand();
    let parts: number[];
    if (busy >= 3) parts = r < 0.25 && t + 2 * beat <= o.to + EPS ? [2 * beat] : [beat];
    else if (busy === 2) parts = r < 0.55 ? [beat] : compound ? [beat / 3 * 2, beat / 3] : [beat / 2, beat / 2];
    else parts = compound ? (r < 0.5 ? [beat / 3, beat / 3, beat / 3] : [beat / 3 * 2, beat / 3]) : r < 0.5 ? [beat / 2, beat / 2] : r < 0.8 ? [beat / 4, beat / 4, beat / 4, beat / 4] : [beat / 2, beat / 4, beat / 4];
    for (const p of parts) out.push(p);
    t += parts.reduce((a, b) => a + b, 0);
  }
  return out;
}

/** The pitches a note may take in a key: its degrees (in minor both forms of ^6 and ^7) within the register. */
export function candidates(key: string, low: number, high: number): string[] {
  const out: string[] = [];
  for (let octave = -4; octave <= 3; octave++)
    for (let deg = 0; deg < 7; deg++)
      for (const raised of modeOf(key) === "minor" && deg >= 5 ? [false, true] : [false]) {
        const p = atPlace({ deg, alter: 0, octave, raised }, key);
        const m = midi(p);
        if (m >= low && m <= high) out.push(p);
      }
  return out;
}

interface State {
  notes: WtcNote[];
  cost: number;
  /** The next note must move by step (after a passing or neighbour dissonance), or step down (after a suspension). */
  need: "step" | "down" | null;
}

/** The cost of a note after the line so far, or Infinity where the rules forbid it. */
function noteCost(o: GenOptions, s: State, n: WtcNote, last: boolean): { cost: number; need: State["need"] } {
  const prev = s.notes[s.notes.length - 1] ?? (o.before ? { pitch: o.before, at: o.from - 1, dur: 1 } : undefined);
  const beat = beatOf(o.time);
  const bar = barQuarters(o.time);
  const pos = (((n.at + o.phase) % bar) + bar) % bar;
  const onBeat = Math.abs(((pos % beat) + beat) % beat) < EPS || Math.abs(beat - (pos % beat)) < EPS;
  const downbeat = pos < EPS || bar - pos < EPS;
  let cost = 0;
  let need: State["need"] = null;
  const key = o.keyAt(n.at);
  // Melody.
  if (prev) {
    const iv = interval(prev.pitch, n.pitch);
    const steps = Math.abs(dia(n.pitch) - dia(prev.pitch));
    if (s.need === "step" && steps !== 1) return { cost: Infinity, need };
    if (s.need === "down" && !(steps === 1 && midi(n.pitch) < midi(prev.pitch))) return { cost: Infinity, need };
    if (["A", "AA", "d", "dd"].includes(iv.quality) && steps !== 0) return { cost: Infinity, need };
    if (steps > 7 || steps === 6) return { cost: Infinity, need };
    cost += steps === 0 ? 1.5 : steps === 1 ? 0 : steps === 2 ? 0.5 : steps <= 4 ? 1.5 : steps === 5 ? 3 : 2;
    const before = s.notes[s.notes.length - 2];
    if (before) {
      const leap = dia(prev.pitch) - dia(before.pitch);
      const now = dia(n.pitch) - dia(prev.pitch);
      if (Math.abs(leap) >= 3 && !(Math.abs(now) === 1 && Math.sign(now) !== Math.sign(leap))) cost += 2;
      if (Math.abs(leap) >= 2 && Math.abs(now) >= 2 && Math.sign(leap) === Math.sign(now) && Math.abs(leap + now) > 7) return { cost: Infinity, need };
    }
    // No circling: a note returning to the one before last costs a little, a trill (a b a b) much,
    // a line that stays within a third for six notes too.
    const b2 = s.notes[s.notes.length - 2];
    const b3 = s.notes[s.notes.length - 3];
    if (b2 && b2.pitch === n.pitch) cost += 0.8;
    if (b2 && b3 && b2.pitch === n.pitch && b3.pitch === prev.pitch) cost += 3;
    const recent = [...s.notes.slice(-5), n].map((x) => dia(x.pitch));
    if (recent.length === 6 && Math.max(...recent) - Math.min(...recent) <= 2) cost += 1.5;
    // A false relation in one line: the same letter altered from one note to the next (F, F♯).
    const pp0 = parsePitch(prev.pitch);
    const np0 = parsePitch(n.pitch);
    if (pp0.step === np0.step && pp0.alter !== np0.alter) cost += 2.5;
    // The leading note rises to the tonic.
    const pp = parsePitch(prev.pitch);
    const lead = atPlace({ deg: 6, alter: 0, octave: 0, raised: modeOf(key) === "minor" }, key);
    if ((pp.step === lead[0] && pp.alter === parsePitch(lead).alter) && !(dia(n.pitch) - dia(prev.pitch) === 1)) cost += 2;
  }
  // Against the given line: at the onset, and where the given line moves under a held note.
  const g = sounding(o.given, n.at);
  if (g) {
    const iv = harmonic(n.pitch, g.pitch);
    const crossing = o.above ? midi(n.pitch) < midi(g.pitch) : midi(n.pitch) > midi(g.pitch);
    if (crossing) cost += 4;
    if (isConsonant(iv)) {
      if (isPerfectConsonance(iv)) {
        cost += onBeat ? 1 : 0.4;
        if (iv.simple === 1) cost += 2.5;
        if (o.invertible && iv.simple === 5) cost += onBeat ? 4 : 1.5;
      }
    } else if (!onBeat && prev && Math.abs(dia(n.pitch) - dia(prev.pitch)) === 1) {
      cost += 1;
      need = "step";
    } else if (onBeat && prev && prev.pitch === n.pitch) {
      // A suspension: prepared (struck again or held), resolved down by step.
      cost += downbeat ? 0.5 : 1;
      need = "down";
    } else return { cost: Infinity, need };
    // Consecutive fifths and octaves: the sonority before and this one, both voices moving.
    if (prev) {
      const gPrev = sounding(o.given, n.at - EPS * 10);
      if (gPrev) {
        const ivPrev = harmonic(prev.pitch, gPrev.pitch);
        if (isPerfectConsonance(ivPrev) && isPerfectConsonance(iv) && ivPrev.simple === iv.simple && gPrev !== g) {
          const dl = Math.sign(midi(n.pitch) - midi(prev.pitch));
          const dg = Math.sign(midi(g.pitch) - midi(gPrev.pitch));
          if (dl !== 0 && dl === dg) return { cost: Infinity, need };
        }
        // Direct fifths and octaves on a strong beat, the new line leaping in similar motion.
        if (isPerfectConsonance(iv) && downbeat && gPrev !== g) {
          const dl = midi(n.pitch) - midi(prev.pitch);
          const dg = midi(g.pitch) - midi(gPrev.pitch);
          if (Math.sign(dl) === Math.sign(dg) && Math.abs(dia(n.pitch) - dia(prev.pitch)) > 1) cost += 2;
        }
        const dl = Math.sign(midi(n.pitch) - midi(prev.pitch));
        const dg = Math.sign(midi(g.pitch) - midi(gPrev.pitch));
        if (dl && dg && dl !== dg) cost -= 0.3;
      }
    }
  }
  for (const h of o.given.filter((x) => x.at > n.at + EPS && x.at < n.at + n.dur - EPS)) {
    const iv = harmonic(n.pitch, h.pitch);
    if (!isConsonant(iv)) cost += 2.5;
  }
  if (last && o.after) {
    const d = Math.abs(dia(o.after) - dia(n.pitch));
    cost += d <= 1 ? 0 : d === 2 ? 1 : d <= 4 ? 2.5 : 5;
  }
  return { cost, need };
}

/** One beam over a rhythm: the cheapest lines, a few of each. */
function beam(o: GenOptions, rhythm: number[], rand: () => number, width = 48): State[] {
  let states: State[] = [{ notes: [], cost: 0, need: null }];
  let t = o.from;
  const gumbel = () => -Math.log(-Math.log(Math.max(1e-12, rand())));
  rhythm.forEach((len, k) => {
    const last = k === rhythm.length - 1;
    const pool = candidates(o.keyAt(t), o.low, o.high);
    const next: (State & { score: number })[] = [];
    for (const s of states) {
      for (const p of pool) {
        const n = { pitch: p, at: t, dur: len };
        const c = noteCost(o, s, n, last);
        if (!Number.isFinite(c.cost)) continue;
        const cost = s.cost + c.cost;
        next.push({ notes: [...s.notes, n], cost, need: c.need, score: cost + 0.8 * gumbel() });
      }
    }
    next.sort((a, b) => a.score - b.score);
    states = next.slice(0, width);
    t += len;
  });
  // A line may not end on an unresolved dissonance.
  return states.filter((s) => s.need === null || !s.notes.length);
}

export interface Proposal {
  notes: WtcNote[];
  /** Faults the judge still finds (errors), where it stands and inverted. */
  faults: number;
  cost: number;
}

/** Proposals for a line, the best first, distinct from one another. */
export function propose(o: GenOptions): Proposal[] {
  const rand = rng(o.seed ?? 1);
  const pool: Proposal[] = [];
  const tries = o.rhythm ? 1 : 5;
  for (let k = 0; k < tries; k++) {
    const rhythm = o.rhythm ?? sampleRhythm(o, rand);
    for (const s of beam(o, rhythm, rand).slice(0, 6)) {
      if (!s.notes.length) continue;
      const before = o.before ? [{ pitch: o.before, at: o.from - 0.5, dur: 0.5 }] : [];
      const phase0 = 0;
      const errs = (line: WtcNote[]) => judgePair(line, o.given, o.draft, before, phase0 + o.phase).filter((v) => v.severity === "error").length;
      let faults = o.given.length ? errs(s.notes) : 0;
      if (o.invertible && o.given.length) {
        const inv = across(s.notes, o.given, !o.above);
        faults += judgePair(inv, o.given, o.draft, [], o.phase).filter((v) => v.severity === "error").length;
      }
      pool.push({ notes: s.notes, faults, cost: s.cost });
    }
  }
  pool.sort((a, b) => a.faults - b.faults || a.cost - b.cost);
  const out: Proposal[] = [];
  const differ = (a: WtcNote[], b: WtcNote[]) => {
    if (a.length !== b.length) return true;
    return a.filter((n, i) => n.pitch !== b[i].pitch || Math.abs(n.at - b[i].at) > EPS).length >= Math.max(2, a.length / 4);
  };
  for (const p of pool) {
    if (out.every((q) => differ(q.notes, p.notes))) out.push(p);
    if (out.length >= (o.count ?? 3)) break;
  }
  return out;
}

/** Notes (from `from`) as events, the gaps as rests. */
export function asEvents(ns: WtcNote[], from: number): Ev[] {
  const out: Ev[] = [];
  let t = from;
  for (const n of ns) {
    if (n.at > t + EPS) out.push({ pitch: null, dur: n.at - t });
    out.push({ pitch: n.pitch, dur: n.dur });
    t = n.at + n.dur;
  }
  return out;
}
