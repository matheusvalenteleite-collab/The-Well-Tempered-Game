/**
 * A3 (three-voice right hand chosen by Viterbi: the greedy nearest voicing, optimized over the
 * whole piece) and A4 (colla parte fallback).
 */
import type { Costs } from "./costs.ts";
import { DEFAULTS } from "./costs.ts";
import { clashes, mod, pcOf, spellAt, toPc, type Chord, type Frame } from "./frame.ts";
import type { EventRole, ParallelCount, SpelledPc, SungNote } from "./types.ts";

export interface Voicing {
  /** Right-hand notes, low to high. */
  midi: number[];
  pitches: string[];
  roles: EventRole[];
  /** For colla parte notes: the sung voice they double. */
  doubles: (string | null)[];
  /** Cost of the voicing on its own (doubling, position, height). */
  barCost: number;
}

export interface Window {
  low: number;
  high: number;
}

/** Spell a MIDI note as the chord tone with that pitch class. */
export function spellIn(tones: SpelledPc[], midi: number): string {
  const t = tones.find((x) => pcOf(x) === mod(midi, 12));
  if (!t) throw new Error(`MIDI ${midi} is not a tone of ${tones.map((x) => x.step + x.alter).join(" ")}`);
  return spellAt(t, midi);
}

/**
 * Every three-note right hand for the chord: in the window, above the bass, outer notes at most
 * an octave apart, all chord tones present with the bass, sharped tones never doubled.
 * Sorted by top note, then middle, then bottom (Viterbi ties prefer the lower top note).
 */
export function candidates(chord: Chord, bassMidi: number, highestSung: number | null, win: Window, costs: Costs): Voicing[] {
  const lo = Math.max(win.low, bassMidi + 1);
  const pool: number[] = [];
  for (let m = lo; m <= win.high; m++) if (chord.pcs.includes(mod(m, 12))) pool.push(m);
  const bassPc = mod(bassMidi, 12);
  const out: Voicing[] = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++) {
        const v = [pool[i], pool[j], pool[k]];
        if (v[2] - v[0] > DEFAULTS.maxRhSpan) continue;
        const all = [bassMidi, ...v].map((m) => mod(m, 12));
        if (new Set(all).size !== chord.pcs.length) continue;
        const count = (pc: number) => all.filter((x) => x === pc).length;
        if (chord.sharpPcs.some((pc) => count(pc) > 1)) continue;
        let cost = 0;
        if (chord.pcs.length === 3) {
          const doubled = chord.pcs.find((pc) => count(pc) > 1)!;
          if (chord.shape === "53" && doubled !== bassPc) cost += costs.doublingNotPreferred;
          if (chord.shape === "63" && doubled === bassPc) cost += costs.doublingNotPreferred;
        }
        for (const pc of chord.miPcs) cost += costs.doubledLeadingTone * Math.max(0, count(pc) - 1);
        // Close: adjacent right-hand notes are adjacent chord tones; semi-close: one tone skipped.
        let skipped = 0;
        for (let a = 0; a < 2; a++) for (let m = v[a] + 1; m < v[a + 1]; m++) if (chord.pcs.includes(mod(m, 12))) skipped++;
        if (skipped > 1) cost += costs.notClose;
        if (highestSung !== null && v[2] > highestSung) cost += costs.topAboveSung * (v[2] - highestSung);
        out.push({ midi: v, pitches: v.map((m) => spellIn(chord.tones, m)), roles: ["rh", "rh", "rh"], doubles: [null, null, null], barCost: cost });
      }
  return out.sort((a, b) => a.midi[2] - b.midi[2] || a.midi[1] - b.midi[1] || a.midi[0] - b.midi[0]);
}

/** Downbeat context of one bar, for transitions. */
export interface DownbeatContext {
  bassMidi: number;
  /** Sung voices above the bass at the downbeat: voice id -> MIDI. */
  uppers: Map<string, number>;
}

const isPerfect = (d: number) => d === 0 || d === 7;

/** Parallel / consecutive perfect intervals between two right hands of the same size. */
export function parallels(prev: Voicing, cur: Voicing, a: DownbeatContext, b: DownbeatContext): ParallelCount {
  const res = { withBass: 0, withSung: 0 };
  if (prev.midi.length !== cur.midi.length) return res;
  for (let i = 0; i < cur.midi.length; i++) {
    const p = prev.midi[i];
    const c = cur.midi[i];
    if (p === c) continue;
    const d0 = mod(p - a.bassMidi, 12);
    if (a.bassMidi !== b.bassMidi && isPerfect(d0) && d0 === mod(c - b.bassMidi, 12)) res.withBass++;
    for (const [voice, s0] of a.uppers) {
      const s1 = b.uppers.get(voice);
      if (s1 === undefined || s0 === s1) continue;
      const e0 = Math.abs(p - s0) % 12;
      const e1 = Math.abs(c - s1) % 12;
      // A right-hand voice doubling the sung voice in both bars is a doubling, not a fault.
      if (e0 === 0 && e1 === 0) continue;
      if (isPerfect(e0) && e0 === e1) res.withSung++;
    }
  }
  return res;
}

/** A3 transition cost between consecutive downbeat voicings. */
export function transitionCost(prev: Voicing, cur: Voicing, a: DownbeatContext, b: DownbeatContext, costs: Costs): number {
  let cost = 0;
  const paired =
    prev.midi.length === cur.midi.length
      ? cur.midi.map((c, i) => [prev.midi[i], c])
      : cur.midi.map((c) => [prev.midi.reduce((best, p) => (Math.abs(p - c) < Math.abs(best - c) ? p : best), prev.midi[0] ?? c), c]);
  for (const [p, c] of paired) {
    const d = Math.abs(c - p);
    cost += costs.motionPerSemitone * d;
    if (d === 0 && prev.midi.length === cur.midi.length) cost += costs.commonToneHeld;
    if (d > costs.leapSemitones) cost += costs.leap;
  }
  const par = parallels(prev, cur, a, b);
  return cost + costs.parallelWithBass * par.withBass + costs.parallelWithSung * par.withSung;
}

/**
 * Viterbi over the bars. A layer with no candidates is a gap: it costs nothing and does not
 * connect its neighbours. Returns the chosen voicing per bar (null in gaps) and its local cost.
 */
export function viterbi(layers: Voicing[][], ctx: DownbeatContext[], costs: Costs): { choice: (Voicing | null)[]; local: number[] } {
  const n = layers.length;
  const total: number[][] = [];
  const back: number[][] = [];
  const EPS = 1e-9;
  for (let b = 0; b < n; b++) {
    const layer = layers[b];
    const prevLayer = b > 0 ? layers[b - 1] : [];
    total.push([]);
    back.push([]);
    for (let j = 0; j < layer.length; j++) {
      let best = Infinity;
      let arg = -1;
      if (prevLayer.length === 0) best = b > 0 && total[b - 1].length === 0 ? minOf(total, b - 1) : 0;
      else
        for (let i = 0; i < prevLayer.length; i++) {
          const c = total[b - 1][i] + transitionCost(prevLayer[i], layer[j], ctx[b - 1], ctx[b], costs);
          if (c < best - EPS) {
            best = c;
            arg = i;
          }
        }
      total[b].push(best + layer[j].barCost);
      back[b].push(arg);
    }
  }
  const choice: (Voicing | null)[] = new Array(n).fill(null);
  const local: number[] = new Array(n).fill(0);
  let j = -1;
  for (let b = n - 1; b >= 0; b--) {
    if (layers[b].length === 0) {
      j = -1;
      continue;
    }
    if (j < 0) j = argMin(total[b]);
    choice[b] = layers[b][j];
    const i = back[b][j];
    local[b] = layers[b][j].barCost + (i >= 0 ? transitionCost(layers[b - 1][i], layers[b][j], ctx[b - 1], ctx[b], costs) : 0);
    j = i;
  }
  return { choice, local };
}

const argMin = (xs: number[]) => xs.reduce((best, x, i) => (x < xs[best] - 1e-9 ? i : best), 0);
const minOf = (total: number[][], b: number): number => {
  for (let k = b; k >= 0; k--) if (total[k].length) return Math.min(...total[k]);
  return 0;
};

/** Place a sung note by whole octaves in the window, above the bass, nearest to `ref`. */
export function placeByOctave(midi: number, ref: number[], bassMidi: number, win: Window): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  const target = ref.length ? ref : [(win.low + win.high) / 2];
  for (let m = midi - 60; m <= midi + 60; m += 12) {
    if (m < win.low || m > win.high || m <= bassMidi) continue;
    const d = Math.min(...target.map((r) => Math.abs(r - m)));
    if (d < bestD - 1e-9) {
      best = m;
      bestD = d;
    }
  }
  return best;
}

/**
 * A4: the right hand doubles the sung upper voice(s), each moved by octaves next to the previous
 * right hand, and adds one chord tone of a triad consistent with the sung notes, if there is one.
 */
export function collaParte(frame: Frame, bassMidi: number, ref: number[], win: Window, triads: Chord[]): Voicing {
  const notes: { midi: number; pitch: string; role: EventRole; doubles: string | null }[] = [];
  const seen = new Set<number>();
  const uppers: SungNote[] = frame.uppers.filter((u) => {
    const pc = mod(u.pitch.midi, 12);
    if (pc === mod(frame.bass.pitch.midi, 12) || seen.has(pc)) return false;
    seen.add(pc);
    return true;
  });
  for (const u of [...uppers].reverse()) {
    const m = placeByOctave(u.pitch.midi, ref, bassMidi, win);
    if (m === null || notes.some((x) => x.midi === m)) continue;
    notes.push({ midi: m, pitch: spellAt(toPc(u.pitch), m), role: "doubling", doubles: u.voice });
  }
  const chord = triads[0];
  if (chord) {
    const sungPcs = frame.sounding.map((n) => mod(n.pitch.midi, 12));
    const missing = chord.tones.find((t) => !sungPcs.includes(pcOf(t)));
    if (missing) {
      const anchor = notes.length ? notes.map((x) => x.midi) : ref;
      let best: number | null = null;
      let bestD = Infinity;
      for (let m = Math.max(win.low, bassMidi + 1); m <= win.high; m++) {
        if (mod(m, 12) !== pcOf(missing) || notes.some((x) => x.midi === m)) continue;
        if (notes.some((x) => Math.abs(x.midi - m) > DEFAULTS.maxRhSpan)) continue;
        if (frame.sounding.some((s) => clashes(s.pitch.midi, m) && mod(s.pitch.midi, 12) !== mod(m, 12))) continue;
        const d = anchor.length ? Math.min(...anchor.map((r) => Math.abs(r - m))) : 0;
        if (d < bestD - 1e-9) {
          best = m;
          bestD = d;
        }
      }
      if (best !== null) notes.push({ midi: best, pitch: spellAt(missing, best), role: "rh", doubles: null });
    }
  }
  notes.sort((a, b) => a.midi - b.midi);
  return { midi: notes.map((x) => x.midi), pitches: notes.map((x) => x.pitch), roles: notes.map((x) => x.role), doubles: notes.map((x) => x.doubles), barCost: 0 };
}
