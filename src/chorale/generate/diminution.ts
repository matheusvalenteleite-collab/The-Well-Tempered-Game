/**
 * Step 5 of the generator: diminution (docs/chorales/CONCEPT.md, level 6). The alto, tenor and bass
 * of a four-part setting in chord tones are embellished as Bach embellishes his: a passing note, a
 * neighbour (up or down), a suspension or an anticipation on a note, towards the next one. The kinds,
 * what a note can take, and how it is written are the game's own (src/chorale/level6.ts: options,
 * realise); where Bach puts them is learnt from his 370 chorales reduced by level6.ts `reduce`.
 *
 * At every note, the three voices' choices are made together (one chain over the notes): each voice's
 * choice weighted by how often Bach makes it in that context (the voice, the move to the next note,
 * the place in the phrase, the note's length), and the surface the choices make costed by its rarity
 * in Bach, as in step 4: parallel fifths or octaves made by an incidental note, two incidental notes
 * a second or seventh apart at once, an augmented second.
 *
 * The most likely choice at a note is almost always none: the cheapest path is a setting with few
 * embellishments. The settings are therefore drawn (at T = 1, each choice as often as Bach makes it),
 * which gives Bach's density of diminution; GENERATOR-DIMINUTION.md measures both.
 */
import studyRaw from "../../../data/chorales/study.json" with { type: "json" };
import { bachAs, options, realise, reduce, type Embellishment, type Note, type StudyLike } from "../level6.ts";
import type { BachChorale } from "./corpus.ts";
import { Backoff, temper, type Ctx } from "./model.ts";
import { bestChain, sampleChain, type Step } from "./chain.ts";
import { augmentedSecond } from "./voices.ts";
import { midiOf } from "./theory.ts";

type Kind = Embellishment | "none";
/** A note rescaled in time, its fermata kept only where it has one. */
const scaled = (n: Note, k: number): Note => (n[3] ? [n[0] * k, n[1] * k, n[2], n[3]] : [n[0] * k, n[1] * k, n[2]]);
const VOICES = ["soprano", "alto", "tenor", "bass"] as const;
const LETTERS = "CDEFGAB";
const diatonic = (p: string) => LETTERS.indexOf(p[0]) + 7 * Number(p.replace(/^[A-G][#b]*/, ""));

export interface StudyChorale extends StudyLike {
  n: number;
  bwv: string;
  title: string;
  tonic: string;
  mode: string;
  meter: string;
  pickup: number;
  /** In 32nds of a whole note. */
  length: number;
  /** The Breitkopf print's page (a link), where the study has it. */
  scan?: string;
}
export const STUDY = studyRaw as unknown as { kinds: string[]; chorales: StudyChorale[] };

/** A note's context: the move to the next note (in letters), its place in the phrase, its length. */
function context(line: Note[], i: number, v: number): Ctx {
  const a = line[i],
    b = line[i + 1];
  const d = diatonic(b[2]) - diatonic(a[2]);
  const move = Math.abs(d) >= 3 ? (d > 0 ? "+3" : "-3") : String(d);
  const place = b[3] ? "end" : line[i + 2]?.[3] ? "pre" : "mid";
  return { voice: VOICES[v], move, place, len: a[1] > 8 ? "long" : "short" };
}

/** The interval (in letters, 1-7: 2 a second or ninth, 4 a fourth, 7 a seventh) that an embellishment's
 *  incidental note makes over the bass sounding then: the held note over the next bass (suspension), the
 *  passing or neighbour note, or the anticipated note, on the note's last quaver. Null without a bass. */
export function overBass(line: Note[], i: number, kind: Embellishment, bass: Note[]): number | null {
  const a = line[i],
    b = line[i + 1];
  if (!a || !b) return null;
  const t = kind === "suspension" ? b[0] : b[0] - 4;
  const under = bass.find((n) => n[0] <= t && t < n[0] + n[1]);
  if (!under) return null;
  const d = diatonic(b[2]) - diatonic(a[2]);
  const note =
    kind === "suspension" ? diatonic(a[2]) : kind === "passing" ? diatonic(a[2]) + Math.sign(d) : kind === "neighbourUp" ? diatonic(a[2]) + 1 : kind === "neighbourDown" ? diatonic(a[2]) - 1 : diatonic(b[2]);
  return ((((note - diatonic(under[2])) % 7) + 7) % 7) + 1;
}

/** Bach's choices, note by note, in his reduced chorales: the training rows. */
export function bachRows(chorales: StudyChorale[]): (Ctx & { kind: string })[] {
  const rows: (Ctx & { kind: string })[] = [];
  for (const c of chorales) {
    const { voices, bach } = reduce(c, STUDY.kinds);
    for (let v = 1; v < 4; v++) {
      const line = voices[v];
      const at = new Map(bach.filter((p) => p.voice === v).map((p) => [p.index, p]));
      for (let i = 0; i + 1 < line.length; i++) {
        const opts = options(line, i);
        if (!opts.length) continue;
        const p = at.get(i);
        const kind = p ? bachAs(p, line) : "none";
        // his escapes, appoggiaturas and free notes are not among the kinds: the note is left out
        if (kind === null || (kind !== "none" && !opts.includes(kind))) continue;
        rows.push({ ...context(line, i, v), kind });
      }
    }
  }
  return rows;
}

export class DiminutionModel {
  readonly model: Backoff;
  /** Costs (bits) of the surface's rarities, from VoiceModel (step 4) and its counts. */
  readonly parallel: number;
  readonly clash: number;
  readonly augSecond: number;

  /** How often Bach takes each embellishment where it is open, by voice and by the interval its
   *  incidental note makes over the bass, and by voice alone: [taken, open]. */
  private readonly over = new Map<string, [number, number]>();

  constructor(chorales: StudyChorale[], costs: { parallel: number; augSecond: number }) {
    this.model = new Backoff(bachRows(chorales), ["voice", "move", "place", "len"], "kind");
    for (const c of chorales) {
      const { voices, bach } = reduce(c, STUDY.kinds);
      for (const v of [1, 2]) {
        const line = voices[v];
        const at = new Map(bach.filter((p) => p.voice === v).map((p) => [p.index, p]));
        for (let i = 0; i + 1 < line.length; i++) {
          const p = at.get(i);
          const taken = p ? bachAs(p, line) : null;
          for (const k of options(line, i)) {
            const iv = overBass(line, i, k, voices[3]);
            if (iv === null) continue;
            for (const key of [`${v}|${k}|${iv}`, `${v}|${k}`]) {
              const x = this.over.get(key) ?? [0, 0];
              x[1]++;
              if (taken === k) x[0]++;
              this.over.set(key, x);
            }
          }
        }
      }
    }
    this.parallel = costs.parallel;
    this.augSecond = costs.augSecond;
    this.clash = costs.parallel / 2;
  }

  /** The choices a voice's note can take, with Bach's probabilities in its context (at temperature T).
   *  With the bass, an inner voice's embellishments are weighed by what their incidental note makes over
   *  it: Bach suspends where the held note makes a fourth, seventh or ninth over the new bass (a fifth of
   *  the time) and seldom where it makes a sixth or a third (3-5%), which the line alone cannot tell. */
  choices(line: Note[], i: number, v: number, T = 1, bass?: Note[]): Map<Kind, number> {
    const opts: Kind[] = ["none", ...options(line, i)];
    const p = temper(this.model.dist(context(line, i, v)), opts, T) as Map<Kind, number>;
    if (!bass || v > 2) return p;
    let z = 0;
    for (const [k, q] of p) {
      let f = 1;
      const iv = k === "none" ? null : overBass(line, i, k, bass);
      if (iv !== null && k !== "none") {
        const all = this.over.get(`${v}|${k}`);
        const one = this.over.get(`${v}|${k}|${iv}`) ?? [0, 0];
        if (all && all[0] > 0) {
          const base = all[0] / all[1];
          f = (one[0] + 10 * base) / (one[1] + 10) / base;
        }
      }
      p.set(k, q * f);
      z += q * f;
    }
    for (const [k, q] of p) p.set(k, q / z);
    return p;
  }
}

interface Voiced {
  /** The incidental note's pitch where the kind writes one in the note's second half. */
  pitch?: string;
}

/** What each kind writes on note i of a line: the incidental pitch, by level6.ts `realise`. */
function incidental(line: Note[], i: number, kind: Kind, sig: number): Voiced {
  if (kind === "none" || kind === "suspension") return {};
  const out = realise([line[i], line[i + 1]], { 0: kind as Embellishment }, sig);
  return { pitch: out[1][2] };
}

/** The four voices' pitches at the three moments of note i (its onset, its middle, the next onset),
 *  given the choices on notes i-1 and i, and which of them are incidental. */
function moments(lines: Note[][], i: number, prev: Kind[], cur: Kind[], inc: Voiced[][]) {
  const at: { p: string; inc: boolean }[][] = [[], [], []];
  for (let v = 0; v < 4; v++) {
    const line = lines[v];
    const here = line[i][2];
    const next = line[i + 1]?.[2] ?? here;
    if (v === 0) {
      at[0].push({ p: here, inc: false }), at[1].push({ p: here, inc: false }), at[2].push({ p: next, inc: false });
      continue;
    }
    const k0 = prev[v - 1],
      k1 = cur[v - 1];
    at[0].push(k0 === "suspension" ? { p: line[i - 1][2], inc: true } : { p: here, inc: false });
    const mid = inc[v][i]?.pitch;
    at[1].push(mid && k1 !== "none" && k1 !== "suspension" ? { p: mid, inc: true } : { p: here, inc: false });
    at[2].push(k1 === "suspension" ? { p: here, inc: true } : { p: next, inc: false });
  }
  return at;
}

/** The surface cost of note i: parallel fifths/octaves in a succession with an incidental note, two
 *  incidental notes a second, seventh or tritone apart, an augmented second into or out of one. */
function surface(dm: DiminutionModel, lines: Note[][], i: number, prev: Kind[], cur: Kind[], inc: Voiced[][]): number {
  const m = moments(lines, i, prev, cur, inc);
  let cost = 0;
  for (const [a, b] of [[0, 1], [1, 2]] as const) {
    for (let x = 0; x < 4; x++)
      for (let y = x + 1; y < 4; y++) {
        if (!(m[a][x].inc || m[b][x].inc || m[a][y].inc || m[b][y].inc)) continue;
        const [x0, x1, y0, y1] = [midiOf(m[a][x].p), midiOf(m[b][x].p), midiOf(m[a][y].p), midiOf(m[b][y].p)];
        if (x0 === x1 || y0 === y1) continue;
        const i0 = Math.abs(x0 - y0) % 12;
        if ((i0 === 0 || i0 === 7) && i0 === Math.abs(x1 - y1) % 12 && Math.sign(x1 - x0) === Math.sign(y1 - y0)) cost += dm.parallel;
      }
    for (let x = 1; x < 4; x++) if (m[a][x].p !== m[b][x].p && augmentedSecond(m[a][x].p, m[b][x].p)) cost += dm.augSecond;
  }
  for (const t of m)
    for (let x = 1; x < 4; x++)
      for (let y = x + 1; y < 4; y++) {
        if (!t[x].inc || !t[y].inc) continue;
        const d = Math.abs(midiOf(t[x].p) - midiOf(t[y].p)) % 12;
        if ([1, 2, 6, 10, 11].includes(d)) cost += dm.clash;
      }
  return cost;
}

export interface Diminished {
  /** Soprano as given; alto, tenor, bass with their incidental notes (in the input's time unit). */
  lines: Note[][];
  /** The choice on every note of each lower voice (index: the note's). */
  chosen: Record<number, Embellishment>[];
  /** How many notes were embellished, by voice (alto, tenor, bass). */
  count: number[];
}

/** The restraint (bits; alto, tenor, bass) on passing notes that brings the drawn chain's density of
 *  embellishment to Bach's with his balance of kinds, each tune held out (11 October 2026: alto 12% of
 *  the notes that can take one, 44% of them suspensions, against Bach's 11.7% and 49%; tenor about 11%,
 *  21% against 23%; bass about 11%; read one chord per beat). Restraining every kind alike (leaving the
 *  note plain) matched the density but thinned the suspensions, which the chain already writes fewer of. */
export const RESTRAINT = [2, 1.9, 3.2];
/** The kind restrained: the chain's surplus over Bach is in passing notes (its suspensions are fewer
 *  than his already). */
const RESTRAINED: Kind = "passing";

/**
 * The lower voices of a four-part setting embellished. `lines`: soprano, alto, tenor, bass, one note
 * per chord in each (the same onsets), [onset, length, pitch, fermata?] in 32nds; `sig`: the key
 * signature (sharps positive). Drawn with `r` at temperature T; without `r`, the cheapest (few
 * embellishments). Settings in minims are read as Bach's crotchets (and written back in minims).
 * `free`: which of alto, tenor, bass may be embellished (a given bass, Kittel's, is not).
 * `restraint` (bits, one per voice: alto, tenor, bass): a passing note made 2^-restraint times as
 * likely; the drawn chain embellishes more than Bach, its surplus in passing notes (GENERATOR-DIMINUTION.md), and its excess figures
 * repeat generically (docs/chorales/MOTIVES.md). The default, RESTRAINT, is calibrated on Bach; [0, 0, 0]
 * is the chain as learnt. `bassAware`: an inner voice's embellishments weighed by what their incidental
 * note makes over the bass (DiminutionModel.choices); false for the earlier behaviour.
 */
export function diminish(dm: DiminutionModel, input: Note[][], sig: number, r?: () => number, T = 1, free: boolean[] = [true, true, true], restraint: number[] = RESTRAINT, bassAware = true): Diminished {
  const lens = input[1].map((n) => n[1]).sort((a, b) => a - b);
  // a power of two, so that every time stays a whole number of 32nds
  const scale = 2 ** Math.max(0, Math.floor(Math.log2(lens[Math.floor(lens.length / 2)] / 8)));
  const lines = input.map((l) => l.map((n) => scaled(n, 1 / scale)));
  const n = lines[1].length;
  const opts: Map<Kind, number>[][] = [[], [], [], []];
  for (let v = 1; v < 4; v++)
    for (let i = 0; i < n - 1; i++) {
      const o = free[v - 1] ? dm.choices(lines[v], i, v, T, bassAware ? lines[3] : undefined) : new Map<Kind, number>([["none", 1]]);
      if (restraint[v - 1] && o.has(RESTRAINED) && o.size > 1) {
        let z = 0;
        for (const [k, p] of o) z += k === RESTRAINED ? p * 2 ** -restraint[v - 1] : p;
        for (const [k, p] of o) o.set(k, (k === RESTRAINED ? p * 2 ** -restraint[v - 1] : p) / z);
      }
      opts[v][i] = o;
    }
  // a state is the three voices' choices on one note
  const states = (i: number): string[] => {
    if (i >= n - 1) return ["none|none|none"];
    const ks = [1, 2, 3].map((v) => [...opts[v][i].keys()]);
    return ks[0].flatMap((a) => ks[1].flatMap((t) => ks[2].map((b) => `${a}|${t}|${b}`)));
  };
  const memo = new Map<string, Map<string, number>>();
  const step: Step = (i, prev) => {
    const key = `${i}#${prev}`;
    const hit = memo.get(key);
    if (hit) return hit;
    const pk = (prev === "start" ? "none|none|none" : prev).split("|") as Kind[];
    const out = new Map<string, number>();
    let z = 0;
    for (const s of states(i)) {
      const ck = s.split("|") as Kind[];
      let w = 1;
      if (i < n - 1) for (let v = 1; v < 4; v++) w *= opts[v][i].get(ck[v - 1]) ?? 0;
      if (!w) continue;
      const incHere: Voiced[][] = [[], [], [], []];
      for (let v = 1; v < 4; v++) incHere[v][i] = incidental(lines[v], i, ck[v - 1], sig);
      if (i < n - 1) w *= Math.pow(2, -surface(dm, lines, i, pk, ck, incHere) / T);
      out.set(s, w);
      z += w;
    }
    if (z > 0) for (const [s, w] of out) out.set(s, w / z);
    memo.set(key, out);
    return out;
  };
  const path = r ? sampleChain(n, step, states, r) : bestChain(n, step);
  const chosen: Record<number, Embellishment>[] = [{}, {}, {}, {}];
  const count = [0, 0, 0];
  path.forEach((s, i) =>
    s.split("|").forEach((k, j) => {
      if (k !== "none") {
        chosen[j + 1][i] = k as Embellishment;
        count[j]++;
      }
    }),
  );
  const out = lines.map((l, v) => (v === 0 ? l : realise(l, chosen[v], sig)));
  return { lines: out.map((l) => l.map((x) => scaled(x, scale))), chosen, count };
}

/** The key signature (sharps positive) of a tonic and mode. */
export function signature(tonic: string, mode: string): number {
  const order = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
  return order.indexOf(mode === "minor" ? relativeMajor(tonic) : tonic) - 7;
}

function relativeMajor(tonic: string): string {
  const pcs: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = (pcs[tonic[0]] + [...tonic.slice(1)].reduce((a, c) => a + (c === "#" ? 1 : -1), 0) + 3 + 12) % 12;
  const letter = LETTERS[(LETTERS.indexOf(tonic[0]) + 2) % 7];
  const a = ((pc - pcs[letter] + 18) % 12) - 6;
  return letter + (a > 0 ? "#".repeat(a) : "b".repeat(-a));
}

/** The surface cost of a given choice of embellishments (for calibration on Bach's own choices). */
export function surfaceCost(dm: DiminutionModel, input: Note[][], chosen: Record<number, Embellishment>[], sig: number): number {
  const lens = input[1].map((n) => n[1]).sort((a, b) => a - b);
  // a power of two, so that every time stays a whole number of 32nds
  const scale = 2 ** Math.max(0, Math.floor(Math.log2(lens[Math.floor(lens.length / 2)] / 8)));
  const lines = input.map((l) => l.map((n) => scaled(n, 1 / scale)));
  const n = lines[1].length;
  const kinds = (i: number): Kind[] => (i < 0 ? ["none", "none", "none"] : [1, 2, 3].map((v) => (chosen[v][i] && options(lines[v], i).includes(chosen[v][i]) ? chosen[v][i] : "none")));
  let cost = 0;
  for (let i = 0; i < n - 1; i++) {
    const ck = kinds(i);
    const inc: Voiced[][] = [[], [], [], []];
    for (let v = 1; v < 4; v++) inc[v][i] = incidental(lines[v], i, ck[v - 1], sig);
    cost += surface(dm, lines, i, kinds(i - 1), ck, inc);
  }
  return cost;
}

/** One of Bach's chorales reduced and read one chord per on-beat melody attack (as the generator
 *  writes), with his embellishments placed on those chords. */
export function bachAligned(c: StudyChorale, b: BachChorale): { lines: Note[][]; bach: Record<number, Embellishment>[] } | null {
  const { voices, bach } = reduce(c, STUDY.kinds);
  const thirty = (t: string) => {
    const [x, y] = t.split("/").map(Number);
    return Math.round((32 * x) / (y ?? 1));
  };
  const times = b.notes.map((n) => thirty(n.t));
  const end = c.length;
  const sounding = (line: Note[], t: number) => line.find((n) => n[0] <= t && t < n[0] + n[1]);
  const fermata = times.map((t) => !!sounding(c.voices[0], t)?.[3]);
  const lines: Note[][] = [];
  for (let v = 0; v < 4; v++) {
    const line: Note[] = [];
    for (let k = 0; k < times.length; k++) {
      const n = sounding(v === 0 ? c.voices[0] : voices[v], times[k]);
      if (!n) return null;
      const dur = (times[k + 1] ?? end) - times[k];
      line.push(fermata[k] ? [times[k], dur, n[2], 1] : [times[k], dur, n[2]]);
    }
    lines.push(line);
  }
  const chosen: Record<number, Embellishment>[] = [{}, {}, {}, {}];
  for (const p of bach) {
    const note = voices[p.voice][p.index];
    const kind = bachAs(p, voices[p.voice]);
    if (!kind) continue;
    const last = times.reduce((best, t, k) => (t < note[0] + note[1] ? k : best), -1);
    if (last >= 0 && options(lines[p.voice], last).includes(kind)) chosen[p.voice][last] = kind;
  }
  return { lines, bach: chosen };
}
