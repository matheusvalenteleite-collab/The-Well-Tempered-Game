/**
 * Tonal counterpoint in three (or more) voices, in free rhythm: one voice judged against the others
 * as they stand (the third entry against the subject and countersubject, a free voice against two
 * given ones). Dissonance is judged against the harmony, as thoroughbass and the chorale teach it,
 * not voice against voice: each beat is read as the chord its notes best fit (the bass weighing
 * most), and every note outside that chord must be one of the figures that carry a dissonance:
 *
 * - **passing note or neighbour** (entered and left by step);
 * - **suspension** (held over from the beat before, resolved by step down; or up, a retardation);
 * - **appoggiatura** (struck, left by step);
 * - **échappée** (entered by step, left by a leap the other way; short);
 * - **anticipation** (the next note's pitch, taken early);
 * - **cambiata** (by step, a third on, a step back);
 * - against a **pedal** (a bass held a bar or more, under which the harmony moves freely), or
 *   **ornamental** (shorter than a quarter of the beat, entered or left by step).
 *
 * And the seventh of a chord leaves by step or is held. Consecutive fifths and octaves (unisons)
 * between the judged voice and another, both moving in the same direction, are faults.
 *
 * Calibrated on the 48 (tools/wtc/trio-calibration.ts, docs/wtc/trio-calibration.md): every figure
 * is there because Bach's voices need it, and the calibration counts what the rules still flag in
 * Bach and what they catch when his notes are altered.
 */
import { parsePitch } from "../music/pitch.ts";
import { TPQ } from "./corpus.ts";
import type { Note } from "./fugue.ts";

export type TrioRule = "non-chord tone" | "suspension" | "seventh" | "fifths" | "octaves";

export interface TrioIssue {
  rule: TrioRule;
  /**
   * "error" for consecutives (which Bach's third entries never have, and the whole 48 only at a few
   * final cadences); "warning" for the rest, which Bach does rarely (under 1% of his notes) and
   * which are better shown beside his practice than forbidden.
   */
  severity: "error" | "warning";
  /** Index of the judged voice's note at fault. */
  note: number;
  /** Onset of the moment judged, in ticks. */
  on: number;
  /** The other voice involved (consecutives), or -1. */
  against: number;
  detail: string;
}

/** The beat in ticks: the denominator's value, or three of them in compound time. */
export function beatTicks(meter: string): number {
  const [n, d] = meter.split("/").map(Number);
  const unit = (4 * TPQ) / d;
  return n % 3 === 0 && n > 3 ? 3 * unit : unit;
}

/** The span over which one chord is read: the beat, but no longer than a half note. */
export const harmonicWindow = (meter: string) => Math.min(beatTicks(meter), 2 * TPQ);

const P = parsePitch;
const pc = (p: string) => ((P(p).midi % 12) + 12) % 12;
const step = (a: string, b: string) => Math.abs(P(a).diatonic - P(b).diatonic) === 1 && Math.abs(P(a).midi - P(b).midi) <= 2;
const dir = (a: string, b: string) => Math.sign(P(b).midi - P(a).midi);

/** Triads (major, minor, diminished, augmented) and sevenths (dominant, minor, major, half-diminished, diminished). */
const CHORDS: { iv: number[]; name: string }[] = [
  { iv: [0, 4, 7], name: "major" },
  { iv: [0, 3, 7], name: "minor" },
  { iv: [0, 3, 6], name: "diminished" },
  { iv: [0, 4, 8], name: "augmented" },
  { iv: [0, 4, 7, 10], name: "dominant seventh" },
  { iv: [0, 3, 7, 10], name: "minor seventh" },
  { iv: [0, 4, 7, 11], name: "major seventh" },
  { iv: [0, 3, 6, 10], name: "half-diminished seventh" },
  { iv: [0, 3, 6, 9], name: "diminished seventh" },
];

export interface Harmony {
  on: number;
  root: number;
  pcs: number[];
  /** The seventh's pitch class, if a seventh chord. */
  seventh: number | null;
  name: string;
}

/**
 * The chord of each window: the root and quality whose pitch classes cover the most of the sounding
 * notes, weighted by how long each sounds in the window, doubled for notes sounding at its start
 * (the metrical accent), and for the bass at the start more again; a seventh chord must earn its
 * seventh (a small penalty against it), and an augmented triad more.
 */
export function harmonies(lines: Note[][], meter: string, length: number, window?: number): Harmony[] {
  const w = window ?? harmonicWindow(meter);
  const out: Harmony[] = [];
  const idx = lines.map(() => 0);
  for (let t = 0; t < length; t += w) {
    const weight = new Array(12).fill(0);
    let bass: Note | null = null;
    lines.forEach((l, v) => {
      let k = idx[v];
      while (k < l.length && l[k].on + l[k].dur <= t) k++;
      idx[v] = k;
      for (let j = k; j < l.length && l[j].on < t + w; j++) {
        const n = l[j];
        const overlap = Math.min(n.on + n.dur, t + w) - Math.max(n.on, t);
        if (overlap <= 0) continue;
        const atStart = n.on <= t;
        weight[pc(n.pitch)] += overlap * (atStart ? 2 : 1);
        if (atStart && (!bass || P(n.pitch).midi < P(bass.pitch).midi)) bass = n;
      }
    });
    if (bass) weight[pc((bass as Note).pitch)] += w;
    const total = weight.reduce((a, b) => a + b, 0);
    if (!total) {
      // A silent window keeps its place (harmonies are indexed by window).
      out.push({ on: t, root: 0, pcs: [], seventh: null, name: "rest" });
      continue;
    }
    let best: Harmony | null = null;
    let bestScore = -Infinity;
    for (let r = 0; r < 12; r++)
      for (const c of CHORDS) {
        const pcs = c.iv.map((x) => (x + r) % 12);
        let s = 0;
        for (let x = 0; x < 12; x++) s += pcs.includes(x) ? weight[x] : -weight[x];
        // Every chord tone that is missing costs a little; a seventh and an augmented triad must earn their place.
        s -= pcs.filter((x) => weight[x] === 0).length * w * 0.25;
        if (c.iv.length === 4) s -= w * 0.3;
        if (c.name === "augmented") s -= w;
        if (s > bestScore) {
          bestScore = s;
          best = { on: t, root: r, pcs, seventh: c.iv.length === 4 ? (c.iv[3] + r) % 12 : null, name: c.name };
        }
      }
    out.push(best!);
  }
  return out;
}

export interface TrioOptions {
  /** Judge only the judged voice's notes beginning in [from, to). */
  from?: number;
  to?: number;
  /** The harmonies, if already read (they depend on all the voices): by window, and by half window. */
  harmony?: Harmony[];
  halves?: Harmony[];
}

/**
 * The faults of voice `judged` against the others. `trace`, for calibration only, counts the
 * figures that explained a non-chord tone, by name.
 */
export function evaluateTrio(lines: Note[][], meter: string, judged: number, opts: TrioOptions = {}, trace?: Map<string, number>): TrioIssue[] {
  const beat = beatTicks(meter);
  const w = harmonicWindow(meter);
  const [num, den] = meter.split("/").map(Number);
  const bar = (num * 4 * TPQ) / den;
  const length = Math.max(...lines.map((l) => (l.length ? l[l.length - 1].on + l[l.length - 1].dur : 0)));
  const H = opts.harmony ?? harmonies(lines, meter, length);
  const hAt = (t: number) => H[Math.min(H.length - 1, Math.floor(t / w))];
  const H2 = opts.halves ?? harmonies(lines, meter, length, w / 2);
  const h2At = (t: number) => H2[Math.min(H2.length - 1, Math.floor(t / (w / 2)))];
  /** The lowest note sounding at t, in any voice. */
  const bassAt = (t: number) => {
    let m: string | null = null;
    for (const l of lines) {
      const k = sounding(l, t);
      if (k >= 0 && (!m || P(l[k].pitch).midi < P(m).midi)) m = l[k].pitch;
    }
    return m;
  };
  const J = lines[judged];
  const out: TrioIssue[] = [];
  const from = opts.from ?? -Infinity;
  const to = opts.to ?? Infinity;
  const ok = (name: string) => (trace?.set(name, (trace.get(name) ?? 0) + 1), true);
  const prevOf = (i: number) => (i > 0 && J[i].on - (J[i - 1].on + J[i - 1].dur) <= beat ? J[i - 1] : null);
  const nextOf = (i: number) => (i < J.length - 1 && J[i + 1].on - (J[i].on + J[i].dur) <= beat ? J[i + 1] : null);
  const sounding = (l: Note[], t: number) => {
    let lo = 0;
    let hi = l.length - 1;
    let k = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (l[m].on <= t) (k = m), (lo = m + 1);
      else hi = m - 1;
    }
    return k >= 0 && t < l[k].on + l[k].dur ? k : -1;
  };
  /** A pedal: the lowest voice holding one note for a bar or more, sounding at t. */
  const pedal = (t: number) =>
    lines.some((l, v) => {
      if (v === judged) return false;
      const k = sounding(l, t);
      if (k < 0 || l[k].dur < bar) return false;
      const m = P(l[k].pitch).midi;
      return lines.every((x, u) => u === v || (() => {
        const j = sounding(x, t);
        return j < 0 || P(x[j].pitch).midi >= m;
      })());
    });

  /** The figure a struck non-chord tone belongs to, if any. */
  const figure = (i: number): string | null => {
    const n = J[i];
    const p = prevOf(i);
    const x = nextOf(i);
    const inStep = !!p && step(p.pitch, n.pitch);
    const outStep = !!x && step(n.pitch, x.pitch);
    if (inStep && outStep) return "passing note or neighbour";
    if (x && pc(x.pitch) === pc(n.pitch)) return "anticipation";
    if (outStep) return "appoggiatura";
    if (inStep && x && n.dur <= beat / 2 && dir(p!.pitch, n.pitch) !== dir(n.pitch, x.pitch)) return "échappée";
    const y = x ? J[i + 2] : null;
    if (inStep && x && y && Math.abs(P(x.pitch).diatonic - P(n.pitch).diatonic) === 2 && dir(p!.pitch, n.pitch) === dir(n.pitch, x.pitch) && step(x.pitch, y.pitch) && dir(x.pitch, y.pitch) !== dir(n.pitch, x.pitch)) return "cambiata";
    if (n.dur < beat / 4 && (inStep || outStep)) return "ornament";
    return null;
  };

  for (let i = 0; i < J.length; i++) {
    const n = J[i];
    if (n.on < from || n.on >= to) continue;
    const x = pc(n.pitch);
    // The moments this note is judged at: its attack, and each window it is held into.
    const moments = [n.on];
    for (let t = (Math.floor(n.on / w) + 1) * w; t < n.on + n.dur; t += w) moments.push(t);
    for (const t of moments) {
      const h = hAt(t);
      if (!h || !h.pcs.length) continue;
      const struck = t === n.on;
      if (h.pcs.includes(x)) {
        // A chord's seventh: leaves by step, or is held, or repeated.
        if (h.seventh === x && struck) {
          const nx = nextOf(i);
          if (nx && !step(n.pitch, nx.pitch) && pc(nx.pitch) !== x && !(H[Math.floor(nx.on / w)]?.pcs.includes(x))) {
            out.push({ rule: "seventh", severity: "warning", note: i, on: t, against: -1, detail: `the seventh of the chord (${n.pitch}) leaves by leap` });
          }
        }
        continue;
      }
      if (pedal(t) && ok("pedal")) continue;
      const bass = bassAt(t);
      // The harmony of the half window, where the chord changes within the beat (keeping its bass).
      const h2 = h2At(t);
      if (h2 && h2.pcs.includes(x) && bass && h2.pcs.includes(pc(bass)) && ok("chord of the half beat")) continue;
      // An arpeggio: the voice outlines a triad (this note and its neighbours) that holds the bass.
      if (struck) {
        const p0 = prevOf(i);
        const n0 = nextOf(i);
        const outline = [p0, n, n0].filter((q): q is Note => !!q).map((q) => pc(q.pitch));
        const leaps = (p0 && !step(p0.pitch, n.pitch) ? 1 : 0) + (n0 && !step(n.pitch, n0.pitch) ? 1 : 0);
        if (outline.length === 3 && leaps >= 1 && bass && CHORDS.slice(0, 3).some((c) => Array.from({ length: 12 }, (_, r) => c.iv.map((y) => (y + r) % 12)).some((pcs) => [...outline, pc(bass)].every((q) => pcs.includes(q)))) && ok("arpeggio")) continue;
      }
      if (struck) {
        const f = figure(i);
        if (f && ok(f)) continue;
        out.push({ rule: "non-chord tone", severity: "warning", note: i, on: t, against: -1, detail: `${n.pitch} is not in the chord here and is neither a passing note, neighbour, appoggiatura, échappée nor anticipation` });
      } else {
        const nx = nextOf(i);
        if (nx && step(n.pitch, nx.pitch) && ok(dir(n.pitch, nx.pitch) < 0 ? "suspension" : "retardation")) continue;
        // An ornamented resolution: one note between, then the step.
        const ny = nx ? J[i + 2] : null;
        if (ny && step(n.pitch, ny.pitch) && dir(n.pitch, ny.pitch) < 0 && ok("suspension, ornamented resolution")) continue;
        out.push({ rule: "suspension", severity: "warning", note: i, on: t, against: -1, detail: `${n.pitch}, held into a chord it does not belong to, is not resolved by step` });
      }
      break;
    }
    // Consecutive fifths and octaves: from the sonority before this note to this one, both voices moving.
    const p = i > 0 ? J[i - 1] : null;
    if (!p || n.on - (p.on + p.dur) > beat || p.pitch === n.pitch) continue;
    for (let o = 0; o < lines.length; o++) {
      if (o === judged) continue;
      const k1 = sounding(lines[o], p.on + p.dur - 1);
      const k2 = sounding(lines[o], n.on);
      if (k1 < 0 || k2 < 0 || k1 === k2) continue;
      const a = lines[o][k1];
      const b = lines[o][k2];
      if (b.on !== n.on || dir(p.pitch, n.pitch) !== dir(a.pitch, b.pitch)) continue;
      // The first interval must be heard: two notes sounding together for at least half a beat (a
      // sixteenth passing through the other voice's note is figuration, not a consecutive).
      if (Math.min(p.on + p.dur, a.on + a.dur) - Math.max(p.on, a.on) < beat / 2) continue;
      const i1 = (((P(p.pitch).midi - P(a.pitch).midi) % 12) + 12) % 12;
      const i2 = (((P(n.pitch).midi - P(b.pitch).midi) % 12) + 12) % 12;
      const fifth = (s: number, u: string, v: string) => (s === 7 || s === 5) && Math.abs(P(u).diatonic - P(v).diatonic) % 7 === 4;
      if (fifth(i1, p.pitch, a.pitch) && fifth(i2, n.pitch, b.pitch) && i1 === i2) out.push({ rule: "fifths", severity: "error", note: i, on: n.on, against: o, detail: `parallel fifths with the ${b.pitch}` });
      else if (i1 === 0 && i2 === 0 && P(p.pitch).diatonic % 7 === P(a.pitch).diatonic % 7 && P(n.pitch).diatonic % 7 === P(b.pitch).diatonic % 7) out.push({ rule: "octaves", severity: "error", note: i, on: n.on, against: o, detail: `parallel octaves with the ${b.pitch}` });
    }
  }
  return out;
}
