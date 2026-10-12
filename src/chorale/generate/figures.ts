/**
 * Step 5, second form: the surface of the lower voices as Bach writes it, beat by beat.
 *
 * The first form (diminution.ts) knows five dissonant kinds, one per note, and was calibrated against Bach's
 * embellishments as the game's reduction reads them, which leave out most of what he writes: two thirds of his
 * inner voices' quavers and four fifths of his bass's are chord tones (a voice moving within the chord, the
 * bass's octaves and thirds, a walking bass, a harmony changing on the quaver). Heard alone, the generated
 * voices were block crotchets (the playback session's measures, 12 October 2026: short notes 11-14% of the
 * lower voices' notes against Bach's 34-54%).
 *
 * Here every beat of a lower voice is a *figure*: what Bach writes from the voice's chord tone on one beat
 * (the reduced line, `bachAligned`) to its chord tone on the next, read from his full voices. A figure is its
 * notes in the beat, each as an onset in the beat, a distance in letters and in semitones from the beat's chord
 * tone, and whether it is the note before held over (a suspension, a tie). The model counts Bach's figures by
 * voice, the move to the next chord tone (in letters) and the beat's length, and the generator draws them
 * (drawn, not chosen: the commonest figure is almost always a plain crotchet, so the cheapest path writes
 * blocks), one voice at a time against the voices already written (the bass first), each figure weighed by
 * what it does against them: parallel fifths or octaves, two dissonances struck together, a crossing.
 */
import type { Note } from "../level6.ts";
import type { BachChorale } from "./corpus.ts";
import { STUDY, bachAligned, type StudyChorale } from "./diminution.ts";
import { midiOf } from "./theory.ts";

const LETTERS = "CDEFGAB";
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const diatonic = (p: string) => LETTERS.indexOf(p[0]) + 7 * Number(p.replace(/^[A-G][#b]*/, ""));
const mod = (x: number, m: number) => ((x % m) + m) % m;

/** One note of a figure: onset in the beat (32nds), letters and semitones from the beat's chord tone, held
 *  over from the beat before (then its pitch is the note before's). */
type FigNote = [number, number, number, 0 | 1];
export type Figure = FigNote[];

/** Spell the pitch `letters` and `semis` from a pitch. */
function from(p: string, letters: number, semis: number): string {
  const d = diatonic(p) + letters;
  const letter = LETTERS[mod(d, 7)];
  const oct = Math.floor(d / 7);
  const target = midiOf(p) + semis;
  const a = target - (12 * (oct + 1) + NATURAL[LETTERS.indexOf(letter)]);
  if (Math.abs(a) > 2) return "";
  return `${letter}${a > 0 ? "#".repeat(a) : "b".repeat(-a)}${oct}`;
}

const moveOf = (a: string, b: string) => Math.max(-5, Math.min(5, diatonic(b) - diatonic(a)));
const ctxKeys = (v: number, move: number, len: number, held: boolean) => [`${v}|${move}|${len}|${held ? 1 : 0}`, `${v}|${move}|${len}`, `${v}|${len}`, `${v}`];

/** Bach's figure for one beat of one voice: his notes from the beat's onset to the next beat's. */
function figureOf(full: Note[], a: string, t0: number, t1: number): Figure | null {
  const out: Figure = [];
  for (const n of full) {
    if (n[0] + n[1] <= t0 || n[0] >= t1) continue;
    const held = n[0] < t0;
    out.push([Math.max(0, n[0] - t0), diatonic(n[2]) - diatonic(a), midiOf(n[2]) - midiOf(a), held ? 1 : 0]);
  }
  return out.length ? out : null;
}

export class FigureModel {
  /** Counts of each figure (by its key) in each context (finest first: voice, move, beat length, held over). */
  private readonly counts = new Map<string, Map<string, number>>();
  private readonly figs = new Map<string, Figure>();

  constructor(chorales: { study: StudyChorale; bach: BachChorale }[]) {
    for (const { study, bach } of chorales) {
      const al = bachAligned(study, bach);
      if (!al) continue;
      const times = al.lines[0].map((n) => n[0]);
      for (let v = 1; v < 4; v++) {
        const line = al.lines[v];
        for (let i = 0; i + 1 < line.length; i++) {
          const f = figureOf(study.voices[v] as Note[], line[i][2], times[i], times[i + 1]);
          if (!f) continue;
          const key = JSON.stringify(f);
          this.figs.set(key, f);
          for (const k of ctxKeys(v, moveOf(line[i][2], line[i + 1][2]), times[i + 1] - times[i], f[0][3] === 1)) {
            const m = this.counts.get(k) ?? new Map<string, number>();
            m.set(key, (m.get(key) ?? 0) + 1);
            this.counts.set(k, m);
          }
        }
      }
    }
  }

  /** Bach's figures for a beat of voice v from chord tone a to b over `len` 32nds, with their shares, from the
   *  finest context that has at least `min` of them. `held`: whether the beat starts with the note before
   *  held over. */
  options(v: number, a: string, b: string, len: number, held: boolean | null, min = 20): { f: Figure; p: number }[] {
    const keys = ctxKeys(v, moveOf(a, b), len, !!held);
    for (const k of held === null ? keys.slice(1) : keys) {
      const m = this.counts.get(k);
      if (!m) continue;
      const tot = [...m.values()].reduce((x, y) => x + y, 0);
      if (tot < min && !k.endsWith(`|${v}`) && k !== `${v}`) continue;
      return [...m].map(([key, n]) => ({ f: this.figs.get(key)!, p: n / tot }));
    }
    return [];
  }
}

/** A figure written out from the chord tone `a` at `t0`: its notes (the held-over first note's pitch is the
 *  one before, `prev`), or null where a pitch cannot be spelled or a held note does not match. */
function realise(f: Figure, a: string, t0: number, t1: number, prev: string | null): Note[] | null {
  const out: Note[] = [];
  for (let k = 0; k < f.length; k++) {
    const [on, letters, semis, held] = f[k];
    const end = k + 1 < f.length ? f[k + 1][0] : t1 - t0;
    if (end <= on) return null;
    let p: string;
    if (held) {
      if (!prev) return null;
      p = prev;
      // the held note is the note before: its distance from this beat's tone must be what Bach's was
      if (diatonic(p) - diatonic(a) !== letters || midiOf(p) - midiOf(a) !== semis) return null;
    } else {
      p = from(a, letters, semis);
      if (!p) return null;
    }
    out.push([t0 + on, end - on, p]);
  }
  return out;
}

/** The pitch sounding in a line at time t (null in a rest). */
const at = (line: Note[], t: number) => line.find((n) => n[0] <= t && t < n[0] + n[1]) ?? null;

/** What a voice's notes in a beat do against the voices already written: parallel fifths or octaves between
 *  consecutive onsets, two notes a second (or seventh, ninth) apart struck together when both are off their
 *  chord tones, a crossing. In units of one pair of parallels. */
function against(notes: Note[], v: number, fixed: Note[][], tones: Set<number>, before: Note | null = null): number {
  let cost = 0;
  for (const [u, line] of fixed.map((l, u) => [u, l] as const)) {
    if (!line.length || u === v) continue;
    for (let k = 0; k < notes.length; k++) {
      const n = notes[k];
      const o = at(line, n[0]);
      if (!o) continue;
      const x = midiOf(n[2]),
        y = midiOf(o[2]);
      // crossing: an upper voice below a lower one
      if ((u < v && x > y) || (u > v && x < y)) cost += 1;
      // a second, seventh or ninth struck together, neither a chord tone
      const iv = mod(x - y, 12);
      if ((iv === 1 || iv === 2 || iv === 10 || iv === 11) && !tones.has(mod(x, 12)) && !tones.has(mod(y, 12)) && o[0] === n[0]) cost += 0.5;
      // parallels from the note before this one (in this voice) to this one
      const prevT = n[0] - 1;
      const p0 = k > 0 ? notes[k - 1] : before;
      if (p0) {
        const o0 = at(line, prevT);
        if (o0) {
          const x0 = midiOf(p0[2]),
            y0 = midiOf(o0[2]);
          const i0 = Math.abs(x0 - y0) % 12,
            i1 = Math.abs(x - y) % 12;
          if (x0 !== x && y0 !== y && (i0 === 0 || i0 === 7) && i0 === i1 && Math.sign(x - x0) === Math.sign(y - y0)) cost += 1;
        }
      }
    }
  }
  return cost;
}

export interface FigureOptions {
  /** Cost (bits) of one unit of `against` (a pair of parallels). */
  parallel?: number;
  /** Temperature of the draw (1: each figure as often as Bach writes it). */
  T?: number;
  /** The order the lower voices are drawn in (3 bass, 2 tenor, 1 alto); each against those before it. */
  order?: number[];
}

/**
 * The lower voices figured: `grid` gives soprano, alto, tenor, bass as one chord tone a beat (onsets at the
 * beats, the soprano as the melody's beat notes), `surface` the soprano as sung (its own notes), `tones` the
 * pitch classes of each beat's chord. Each lower voice is drawn in turn (bass, tenor, alto), every beat's figure
 * from Bach's for that move, weighed by 2^-(parallel x what it does against the voices already written).
 * `free`: which of alto, tenor, bass to figure (a given voice, Bach's or Kittel's, keeps its notes: `given[v]`,
 * its surface, where it has one, else its notes on the grid).
 */
export function figurate(fm: FigureModel, grid: Note[][], surface: Note[], tones: Set<number>[], r: () => number, o: FigureOptions = {}, free = [true, true, true], given: (Note[] | null)[] = []): Note[][] {
  const { parallel = 6, T = 1, order = [3, 1, 2] } = o;
  const n = grid[0].length;
  const out: Note[][] = [surface, [], [], []];
  for (const v of order) {
    if (!free[v - 1]) {
      // a given voice as written (with its own quavers, where it has them), the others figured against it
      out[v] = given[v] ?? grid[v];
      continue;
    }
    const line = grid[v];
    const fixed = out.map((l, u) => (u === v ? [] : l));
    // the states at beat i: the figures possible there, each with its notes and weight
    const cache = new Map<string, { notes: Note[]; w: number; last: string; held: boolean }[]>();
    const cands = (i: number, prev: string | null) => {
      const key = `${i}|${prev}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const t0 = line[i][0],
        t1 = i + 1 < n ? line[i + 1][0] : t0 + line[i][1];
      const res: { notes: Note[]; w: number; last: string; held: boolean }[] = [];
      const last = i + 1 >= n || line[i][3];
      if (last) {
        // the last note of a phrase (a fermata) or of the piece: held
        const nt: Note[] = [[t0, t1 - t0, line[i][2], ...(line[i][3] ? [1 as const] : [])] as Note];
        res.push({ notes: nt, w: 2 ** (-parallel * against(nt, v, fixed, tones[i], prev ? [t0 - 1, 1, prev] : null)), last: line[i][2], held: false });
      } else {
        for (const { f, p } of fm.options(v, line[i][2], line[i + 1][2], t1 - t0, null)) {
          const notes = realise(f, line[i][2], t0, t1, f[0][3] ? prev : null);
          if (!notes) continue;
          const c = against(notes, v, fixed, tones[i], prev && !f[0][3] ? [t0 - 1, 1, prev] : null);
          res.push({ notes, w: Math.pow(p * 2 ** (-parallel * c), 1 / T), last: notes[notes.length - 1][2], held: f[0][3] === 1 });
        }
        if (!res.length) {
          const nt: Note[] = [[t0, t1 - t0, line[i][2]]];
          res.push({ notes: nt, w: 2 ** (-parallel * against(nt, v, fixed, tones[i], prev ? [t0 - 1, 1, prev] : null)), last: line[i][2], held: false });
        }
      }
      cache.set(key, res);
      return res;
    };
    // the whole line drawn at once: a state is the figure's last pitch at a beat; each beat's figures are
    // weighed by what the rest of the line can still do after them (backward filtering), then drawn forward
    const lastsAt: Set<string | null>[] = [new Set([null])];
    for (let i = 0; i < n; i++) {
      const next = new Set<string | null>();
      for (const p of lastsAt[i]) for (const c of cands(i, p)) next.add(c.last);
      lastsAt.push(next);
    }
    const beta: Map<string | null, number>[] = new Array(n + 1);
    beta[n] = new Map([...lastsAt[n]].map((p) => [p, 1]));
    for (let i = n - 1; i >= 0; i--) {
      const m = new Map<string | null, number>();
      let z = 0;
      for (const p of lastsAt[i]) {
        let x = 0;
        for (const c of cands(i, p)) x += c.w * (beta[i + 1].get(c.last) ?? 0);
        m.set(p, x);
        z += x;
      }
      if (z > 0) for (const [p, x] of m) m.set(p, x / z);
      beta[i] = m;
    }
    const notes: Note[] = [];
    let prev: string | null = null;
    for (let i = 0; i < n; i++) {
      const cs = cands(i, prev);
      const ws = cs.map((c) => c.w * (beta[i + 1].get(c.last) ?? 0));
      const z = ws.reduce((a, b) => a + b, 0);
      let u = r() * (z > 0 ? z : cs.length),
        k = 0;
      const wk = (j: number) => (z > 0 ? ws[j] : 1);
      while (k < cs.length - 1 && u > wk(k)) u -= wk(k++);
      const pick = cs[k];
      pick.notes.forEach((nt, j) => {
        const lastNote = notes[notes.length - 1];
        // the note held over is one note with the one before: lengthened, not struck again
        if (j === 0 && pick.held && lastNote) lastNote[1] += nt[1];
        else notes.push([...nt] as Note);
      });
      prev = pick.last;
    }
    // keep the fermatas where the grid has them
    out[v] = notes;
  }
  return out;
}

/** Bach's chorales as the figure model learns them: his study chorale with its events. */
export const studyPairs = (bach: BachChorale[]) => {
  const st = new Map(STUDY.chorales.map((s) => [s.n, s]));
  return bach.filter((b) => st.has(b.no)).map((b) => ({ study: st.get(b.no)!, bach: b }));
};
