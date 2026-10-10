/**
 * Engraving a piece of the 48 for the score (D147): from notes with voices to what a printed page
 * shows, bar by bar, independently of any drawing library.
 *
 *   - **Staves.** Each voice sits on the treble or the bass staff bar by bar, wherever it reads with
 *     the fewest ledger lines, changing staff only when that saves enough of them (dynamic
 *     programming over the bars; a voice never changes staff under a tie). Bach's alto and tenor
 *     move between the hands; the old score kept each voice on one staff for the whole piece.
 *   - **Layers.** A voice's notes in a bar become one or more layers: notes struck together for the
 *     same length are a chord; a note still sounding when the next begins opens a second layer
 *     (nothing is cut short). On a staff with several layers the highest takes stems up, the lowest
 *     stems down; a staff with one layer lets its stems follow the notes.
 *   - **Rhythm.** Each length is written in values that show the metre: a value shorter than the
 *     beat does not cross a beat, a long value does not hide the middle of a bar of four beats
 *     (except a plain value starting on a beat, the syncopation Bach writes), ties where needed;
 *     rests are stricter (each on its own grid). Triplets are found by their length.
 *   - **Beams** by the beat (a dotted beat in compound time, the whole bar in 3/8), broken by rests.
 */
import { parsePitch } from "../music/pitch.ts";

const EPS = 1e-6;

export interface EngInput {
  notes: { midi: number; at: number; dur: number }[];
  /** Spelled pitches ("F#4"), one per note. */
  spelled: string[];
  voice: number[];
  count: number;
  barQuarters: number;
  /** "4/4", "12/16" … */
  time: string;
  /** Notes left out of the score (not yet revealed in a game). */
  hidden?: Set<number>;
  /** Where each bar begins and the last ends, in quarters (else every `barQuarters`). */
  barStarts?: number[];
  /** Each bar's metre (else `time` throughout). */
  meters?: string[];
  /** The voices are inferred strands (a prelude): those that take turns on a staff share a layer. */
  mergeStrands?: boolean;
}

/** The bar lines of a piece: given, or every `barQuarters` to the end of its notes. */
export function barLines(input: EngInput): number[] {
  if (input.barStarts && input.barStarts.length > 1) return input.barStarts;
  const end = Math.max(...input.notes.map((n) => n.at + n.dur));
  const n = Math.max(1, Math.ceil(end / input.barQuarters - EPS));
  return Array.from({ length: n + 1 }, (_, k) => k * input.barQuarters);
}

/** The bar a position falls in (the last bar for anything after the end). */
export function barIndex(starts: number[], q: number): number {
  let lo = 0;
  let hi = starts.length - 2;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (starts[m] <= q + EPS) lo = m;
    else hi = m - 1;
  }
  return lo;
}

export interface EngKey {
  /** The note's index in the piece. */
  i: number;
  pitch: string;
}

export interface EngItem {
  rest: boolean;
  /** Invisible (a rest that only holds a second layer's time). */
  ghost?: boolean;
  /** Low to high; empty for a rest. */
  keys: EngKey[];
  /** Onset and written length, in quarters from the piece's start. */
  at: number;
  len: number;
  /** VexFlow duration ("w", "h", "q", "8", "16", "32", "64") and dots. */
  dur: string;
  dots: number;
  /** Part of a triplet: the group's number within the layer. */
  tuplet?: number;
  /** The continuation of the item before (a tie into this one). */
  tieIn: boolean;
  /** Tied to the next item of the same layer (or of the voice's next bar). */
  tieOut: boolean;
  /** Beam group number within the layer (groups of two or more). */
  beam?: number;
  /** A whole-bar rest. */
  bar?: boolean;
}

export interface EngLayer {
  voice: number;
  /** 0 for the voice's main line, 1… for the layers its overlapping notes open. */
  sub: number;
  /** 1 up, -1 down, 0 free. */
  stem: 1 | -1 | 0;
  items: EngItem[];
}

export interface EngBar {
  index: number;
  from: number;
  to: number;
  /** The bar's metre. */
  time: string;
  /** Where the bar's metre counts from: its start, or before it for a pickup (a short first bar). */
  origin: number;
  /** Treble, bass. */
  staves: [EngLayer[], EngLayer[]];
}

export interface Engraving {
  bars: EngBar[];
  /** staffOf[voice][bar]: 0 treble, 1 bass. */
  staffOf: number[][];
}

/** [quarters, VexFlow duration, dots], longest first. */
const VALUES: [number, string, number][] = [
  [6, "w", 1], [4, "w", 0], [3, "h", 1], [2, "h", 0], [1.5, "q", 1], [1, "q", 0], [0.75, "8", 1], [0.5, "8", 0],
  [0.375, "16", 1], [0.25, "16", 0], [0.1875, "32", 1], [0.125, "32", 0], [0.0625, "64", 0],
];
const PLAIN: [number, string][] = [[4, "w"], [2, "h"], [1, "q"], [0.5, "8"], [0.25, "16"], [0.125, "32"], [0.0625, "64"]];
/** Triplet values: two thirds of a plain one. */
const TRIPLETS: [number, string][] = [[4 / 3, "h"], [2 / 3, "q"], [1 / 3, "8"], [1 / 6, "16"], [1 / 12, "32"]];
/** A length or position writable in plain values (down to 64ths). */
const dyadic = (x: number) => Math.abs(x * 64 - Math.round(x * 64)) < 1e-4;

const mod = (a: number, m: number) => {
  const r = a - Math.floor(a / m + EPS) * m;
  return Math.abs(r) < EPS || Math.abs(r - m) < EPS ? 0 : r;
};

/** The metre's units: the beat (what short values do not cross) and the beam group. */
export function units(time: string): { beat: number; beam: number; bar: number; sub: number; compound: boolean } {
  const [num, den] = time.split("/").map(Number);
  const bar = (num * 4) / den;
  const compound = num % 3 === 0 && num > 3;
  // The beat: a dotted value in compound time, a half in 2/2, 3/2, 4/2, else the denominator.
  const beat = compound ? (3 * 4) / den : den === 2 ? 2 : den >= 8 ? 4 / den : 1;
  // What shorter values must not cross: the quarter in simple time (the eighth in x/8), the beat in compound.
  const sub = compound ? beat : den >= 8 ? 4 / den : 1;
  // 3/8 (and 3/16) is beamed by the bar; alla breve eighths by the half (see the beams).
  const beam = num === 3 && den >= 8 ? bar : compound ? beat : den >= 8 ? 4 / den : den === 2 ? 2 : 1;
  return { beat, beam: Math.max(beam, Math.min(bar, 0.5)), bar, sub, compound };
}

export interface Value {
  len: number;
  dur: string;
  dots: number;
  triplet: boolean;
}

/** Triplet values for a stretch off the plain grid, each the longest its position allows. */
function tripletValues(at: number, len: number): Value[] {
  const out: Value[] = [];
  let left = len;
  let guard = 0;
  while (left > EPS && guard++ < 64) {
    const tv = TRIPLETS.find(([q]) => q <= left + EPS && mod(at, q) === 0) ?? TRIPLETS.find(([q]) => q <= left + EPS) ?? TRIPLETS[TRIPLETS.length - 1];
    out.push({ len: Math.min(tv[0], left), dur: tv[1], dots: 0, triplet: true });
    at += tv[0];
    left -= tv[0];
  }
  return out;
}

/**
 * A length from `p` (quarters from the bar line) written in values that show the metre (the
 * rules in the header). `rest`: a rest's stricter grid.
 */
export function spell(p: number, len: number, time: string, rest = false, barLen?: number): Value[] {
  const { beat, sub, compound } = units(time);
  const bar = barLen ?? units(time).bar;
  const beats = Math.round(bar / beat);
  const mid = beats >= 4 && beats % 2 === 0 ? bar / 2 : -1;
  // Off the plain grid where it starts: triplet values until it is back on it.
  if (!dyadic(p)) {
    // To the end of the triplet group it is in: the next quarter for triplet eighths (and
    // quarters), the next eighth for triplet sixteenths.
    const g = Math.abs(p * 3 - Math.round(p * 3)) < 1e-6 ? 1 : Math.abs(p * 6 - Math.round(p * 6)) < 1e-6 ? 0.5 : 0.25;
    const head = Math.min(len, Math.ceil(p / g - EPS) * g - p);
    return [...tripletValues(p, head), ...(len - head > EPS ? spell(p + head, len - head, time, rest, barLen) : [])];
  }
  // Ending off the grid: the plain part first, then the triplet tail.
  if (!dyadic(len)) {
    // The tail: from the last quarter (else eighth, sixteenth) line before the end.
    const end = p + len;
    let tail = len;
    for (const g of [1, 0.5, 0.25]) {
      const t = end - Math.floor(end / g + EPS) * g;
      if (t > EPS && t <= len + EPS && dyadic(len - t)) {
        tail = Math.min(len, t);
        break;
      }
    }
    if (len - tail < EPS) {
      // A triplet value alone (within its group's span).
      const tri = PLAIN.find(([q]) => Math.abs(q * (2 / 3) - len) < EPS);
      if (tri) {
        const span = tri[0] * 2;
        if (Math.floor(p / span + EPS) === Math.floor((p + len - 2 * EPS) / span)) return [{ len, dur: tri[1], dots: 0, triplet: true }];
      }
      return tripletValues(p, len);
    }
    return [...spell(p, len - tail, time, rest, barLen), ...tripletValues(p + len - tail, tail)];
  }
  const out: Value[] = [];
  let at = p;
  let left = len;
  let guard = 0;
  const crosses = (a: number, e: number, unit: number) => Math.floor(a / unit + EPS) !== Math.floor((e - 2 * EPS) / unit);
  while (left > EPS && guard++ < 64) {
    const fits = VALUES.filter(([q]) => q <= left + EPS);
    if (!fits.length) {
      out.push(...tripletValues(at, left));
      break;
    }
    const ok =
      fits.find(([q, , dots]) => {
        const plain = dots ? (q * 2) / 3 : q;
        const end = at + q;
        if (end > bar + EPS) return false;
        if (rest) {
          // In compound time a plain rest may finish a beat (an eighth, then a quarter rest).
          const finishes = compound && !dots && Math.abs(mod(at + q, beat)) < EPS && q < beat - EPS;
          if (mod(at, dots ? q : plain) !== 0 && !(at < EPS && Math.abs(q - bar) < EPS) && !finishes) return false;
          if (dots && !(Math.abs(q - beat) < EPS && mod(at, beat) === 0)) return false;
          if (q < beat - EPS && crosses(at, end, beat)) return false;
          if (q < sub - EPS && crosses(at, end, sub)) return false;
          // A rest of a beat or more: whole beats, from a beat.
          if (q >= beat - EPS && (mod(at, beat) !== 0 || mod(q, beat) !== 0)) return false;
          if (mid > 0 && at < mid - EPS && end > mid + EPS && at > EPS) return false;
          return true;
        }
        if (mod(at, Math.min(plain, sub) / 2) !== 0) return false;
        if (q < sub - EPS && crosses(at, end, sub)) return false;
        if (q < beat - EPS) return !crosses(at, end, beat) || (!compound && sub < beat && !dots && mod(at, sub / 2) === 0 && q <= sub + EPS);
        // A beat or more: in compound time whole beats when it crosses one.
        if (compound && crosses(at, end, beat) && (mod(at, beat) !== 0 || mod(q, beat) !== 0) && !(mod(at, beat) === 0 && q <= beat + EPS)) return false;
        if (mid > 0 && at < mid - EPS && end > mid + EPS && at > EPS) return !dots && mod(at, beat) === 0;
        return true;
      }) ?? fits[fits.length - 1];
    out.push({ len: ok[0], dur: ok[1], dots: ok[2], triplet: false });
    at += ok[0];
    left -= ok[0];
  }
  return out;
}

/** Staff positions (diatonic steps) of the staves' outer lines: treble E4–F5, bass G2–A3. */
const LINES: [number, number][] = [[30, 38], [18, 26]];
/** Ledger lines a note needs on a staff (roughly, in lines; more weight the further out). */
function ledger(d: number, staff: number): number {
  const [lo, hi] = LINES[staff];
  const x = Math.max(0, (lo - d - 1) / 2, (d - hi - 1) / 2);
  return x + 0.25 * x * x;
}

/**
 * The staff of each voice in each bar (0 treble, 1 bass): the fewest ledger lines, a cost for each
 * change, no change under a tie, a slight pull towards the voice's usual staff.
 */
export function assignStaves(input: EngInput): number[][] {
  const { notes, spelled, voice, count } = input;
  const starts = barLines(input);
  const bars = starts.length - 1;
  const dia = spelled.map((s) => parsePitch(s).diatonic);
  // Each voice's own costs (ledger lines, its usual staff), its notes in each bar, its ties.
  const own: number[][][] = [];
  const weight: number[][] = [];
  const ties: boolean[][] = [];
  for (let v = 0; v < count; v++) {
    const mine = notes.map((n, i) => ({ n, i })).filter(({ i }) => voice[i] === v);
    const mean = mine.length ? mine.reduce((a, { i }) => a + dia[i], 0) / mine.length : 28;
    const home = mean >= 27 ? 0 : 1;
    const cost = Array.from({ length: bars }, () => [0, 0]);
    const w = new Array(bars).fill(0);
    const tied = new Array(bars).fill(false); // a note of this voice sounds across the bar line before bar b
    for (const { n, i } of mine) {
      const b0 = barIndex(starts, n.at);
      const b1 = barIndex(starts, n.at + n.dur - 2 * EPS);
      w[b0]++;
      for (let b = b0; b <= b1; b++) {
        // A note counts in each bar it sounds in, by how much of the bar it fills (at least a little).
        const len = starts[b + 1] - starts[b];
        const share = Math.max(0.25, (Math.min(n.at + n.dur, starts[b + 1]) - Math.max(n.at, starts[b])) / len);
        for (const s of [0, 1]) cost[b][s] += ledger(dia[i], s) * (b === b0 ? 1 : share);
        if (b > b0) {
          tied[b] = true;
          w[b] = Math.max(w[b], 1);
        }
      }
    }
    for (let b = 0; b < bars; b++) cost[b][1 - home] += 0.6;
    own.push(cost);
    weight.push(w);
    ties.push(tied);
  }
  const SWITCH = 2.5;
  const solve = (v: number, others: number[][] | null): number[] => {
    const cost = own[v].map((c, b) => {
      const out = [...c];
      const w = weight[v][b];
      if (!others || !w) return out;
      // Crowding: being the third voice on a staff; order: a lower voice above a higher one's staff.
      for (const s of [0, 1]) {
        const there = others.filter((st, u) => u !== v && weight[u][b] && st[b] === s).length;
        if (there >= 2) out[s] += 3 * w * (there - 1);
      }
      others.forEach((st, u) => {
        if (u === v || !weight[u][b]) return;
        if (u < v && st[b] === 1) out[0] += 4 * w;
        if (u > v && st[b] === 0) out[1] += 4 * w;
      });
      return out;
    });
    const best: number[][] = [[cost[0][0], cost[0][1]]];
    const from: number[][] = [[0, 1]];
    for (let b = 1; b < bars; b++) {
      best.push([0, 0]);
      from.push([0, 0]);
      for (const s of [0, 1]) {
        const stay = best[b - 1][s];
        const move = best[b - 1][1 - s] + (ties[v][b] ? 1e6 : SWITCH);
        best[b][s] = Math.min(stay, move) + cost[b][s];
        from[b][s] = stay <= move ? s : 1 - s;
      }
    }
    const out = new Array(bars).fill(0);
    out[bars - 1] = best[bars - 1][0] <= best[bars - 1][1] ? 0 : 1;
    for (let b = bars - 1; b > 0; b--) out[b - 1] = from[b][out[b]];
    return out;
  };
  // Each voice alone first, then each again against where the others are, a few rounds.
  const staffs = Array.from({ length: count }, (_, v) => solve(v, null));
  for (let round = 0; round < 3; round++) for (let v = 0; v < count; v++) staffs[v] = solve(v, staffs);
  return staffs;
}

interface Chord {
  at: number;
  end: number;
  keys: EngKey[];
  /** Begun before this bar (a tie in), or going on past it (a tie out). */
  tieIn: boolean;
  tieOut: boolean;
}

/** The engraving of a whole piece (see the header). */
export function engrave(input: EngInput): Engraving {
  const { notes, spelled, voice, count, time } = input;
  const starts = barLines(input);
  const nBars = starts.length - 1;
  const staffOf = assignStaves(input);
  const meterOf = (b: number) => input.meters?.[b] ?? time;
  const dia = spelled.map((s) => parsePitch(s).diatonic);
  const byVoice: number[][] = Array.from({ length: count }, () => []);
  notes.forEach((_, i) => !input.hidden?.has(i) && byVoice[voice[i]]?.push(i));
  for (const xs of byVoice) xs.sort((a, b) => notes[a].at - notes[b].at || dia[a] - dia[b]);
  // Where each voice is in its list (notes are visited bar by bar).
  const bars: EngBar[] = [];
  for (let b = 0; b < nBars; b++) {
    const from = starts[b];
    const to = starts[b + 1];
    const full = units(meterOf(b)).bar;
    const origin = b === 0 && to - from < full - EPS ? to - full : from;
    const staves: [EngLayer[], EngLayer[]] = [[], []];
    // Chords: a voice's notes struck together, ending together, within the bar.
    const chordsOf = (v: number): Chord[] => {
      const chords: Chord[] = [];
      for (const i of byVoice[v]) {
        const n = notes[i];
        if (!(n.at < to - EPS && n.at + n.dur > from + EPS)) continue;
        const a = Math.max(n.at, from);
        const e = Math.min(n.at + n.dur, to);
        const c = chords.find((c) => Math.abs(c.at - a) < EPS && Math.abs(c.end - e) < EPS);
        const key = { i, pitch: spelled[i] };
        if (c) {
          if (!c.keys.some((k) => dia[k.i] === dia[i])) c.keys.push(key); // the same step twice cannot be drawn in one chord
        } else chords.push({ at: a, end: e, keys: [key], tieIn: n.at < from - EPS, tieOut: n.at + n.dur > to + EPS });
      }
      return chords;
    };
    // Layers: each chord on the first layer free when it begins.
    const chainsOf = (chords: Chord[]): Chord[][] => {
      chords.sort((x, y) => x.at - y.at || y.end - x.end);
      const chains: Chord[][] = [];
      for (const c of chords) {
        const free = chains.find((ch) => ch[ch.length - 1].end <= c.at + EPS);
        if (free) free.push(c);
        else chains.push([c]);
        c.keys.sort((x, y) => dia[x.i] - dia[y.i]);
      }
      return chains;
    };
    if (input.mergeStrands) {
      // A prelude's strands (inferred, not Bach's voices) are written in as few layers as a staff
      // needs: strands that take turns share a layer, as a keyboard player reads them.
      for (const st of [0, 1]) {
        const all: Chord[] = [];
        for (let v = 0; v < count; v++) {
          if (staffOf[v][b] !== st) continue;
          for (const c of chordsOf(v)) {
            const same = all.find((x) => Math.abs(x.at - c.at) < EPS && Math.abs(x.end - c.end) < EPS);
            if (same) for (const k of c.keys) !same.keys.some((x) => dia[x.i] === dia[k.i]) && same.keys.push(k);
            else all.push(c);
          }
        }
        chainsOf(all).forEach((ch, sub) => {
          const tally = new Map<number, number>();
          for (const c of ch) for (const k of c.keys) tally.set(voice[k.i], (tally.get(voice[k.i]) ?? 0) + 1);
          const v = [...tally.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0];
          staves[st].push({ voice: v, sub, stem: 0, items: layerItems(ch, from, to, meterOf(b), false, origin) });
        });
      }
    } else
      for (let v = 0; v < count; v++) {
        const chords = chordsOf(v);
        if (!chords.length) continue;
        chainsOf(chords).forEach((ch, sub) => staves[staffOf[v][b]].push({ voice: v, sub, stem: 0, items: layerItems(ch, from, to, meterOf(b), sub > 0, origin) }));
      }
    // Stems: on a staff with several layers, the highest up, the lowest down, the others by where they lie.
    for (const layers of staves) {
      if (layers.length < 2) continue;
      const pitch = (l: EngLayer) => {
        const ks = l.items.flatMap((it) => it.keys.map((k) => dia[k.i]));
        return ks.length ? ks.reduce((a, x) => a + x, 0) / ks.length : 0;
      };
      const ds = (l: EngLayer) => l.items.flatMap((it) => it.keys.map((k) => dia[k.i]));
      const lowest = (l: EngLayer) => Math.min(...ds(l));
      const highest = (l: EngLayer) => Math.max(...ds(l));
      // By voice (the higher voice above), unless two layers clearly cross (by more than a third on
      // average, or the lower voice wholly above the higher).
      const order = [...layers].sort((x, y) => x.voice - y.voice || x.sub - y.sub);
      for (let pass = 0; pass < order.length; pass++)
        for (let k = 0; k + 1 < order.length; k++)
          if (pitch(order[k + 1]) - pitch(order[k]) > 3 || lowest(order[k + 1]) > highest(order[k])) [order[k], order[k + 1]] = [order[k + 1], order[k]];
      order.forEach((l, k) => (l.stem = k === 0 ? 1 : k === order.length - 1 ? -1 : k < order.length / 2 ? 1 : -1));
      // Draw the stems-up layers first (VexFlow shifts colliding heads of the later voices).
      layers.sort((x, y) => y.stem - x.stem || order.indexOf(x) - order.indexOf(y));

    }
    bars.push({ index: b, from, to, time: meterOf(b), origin, staves });
  }
  // Beams: by the beam unit, broken by rests, triplets and anything a quarter or longer.
  for (const bar of bars)
    for (const layers of bar.staves)
      for (const l of layers) {
        const beamUnit = units(bar.time).beam;
        let group = 0;
        let run: EngItem[] = [];
        let unit = -1;
        const flush = () => {
          if (run.length > 1) {
            group++;
            for (const it of run) it.beam = group;
          }
          run = [];
        };
        // Alla breve: eighths beamed by the half, but shorter values by the quarter.
        const quick = beamUnit > 1 && l.items.some((it) => !it.rest && ["16", "32", "64"].includes(it.dur));
        const unitHere = quick ? 1 : beamUnit;
        for (const it of l.items) {
          const ok = !it.rest && it.tuplet === undefined && ["8", "16", "32", "64"].includes(it.dur);
          const u = Math.floor((it.at - bar.origin) / unitHere + EPS);
          if (!ok || u !== unit) flush();
          if (ok) {
            if (!run.length) unit = u;
            run.push(it);
          }
        }
        flush();
      }
  return { bars, staffOf };
}

/** One layer's items in a bar: its chords in written values, rests between (invisible in a second layer). */
function layerItems(chain: Chord[], from: number, to: number, time: string, ghostRests: boolean, origin = from): EngItem[] {
  const out: EngItem[] = [];
  let tuplet = 0;
  /** The open triplet group: its length so far and the shortest value in it. */
  let acc = 0;
  let shortest = Infinity;
  let longest = 0;
  const pushValues = (at: number, len: number, rest: boolean, c: Chord | null) => {
    const vs = spell(at - origin, len, time, rest, to - origin);
    let t = at;
    vs.forEach((v, k) => {
      let tp: number | undefined;
      if (v.triplet) {
        // A group closes when its length is a whole number of its unit: twice the plain value of its
        // shortest note (a quarter for triplet eighths, a half for triplet quarters).
        if (acc <= EPS) tuplet++;
        tp = tuplet;
        acc += v.len;
        shortest = Math.min(shortest, v.len);
        longest = Math.max(longest, v.len);
        // It closes on a beat line: the quarter (the eighth for a group of triplet sixteenths only,
        // the half for triplet quarters), when it has filled a whole number of its units.
        const unit = shortest * 3;
        const line = longest > 0.3 ? (longest > 0.6 ? 2 : 1) : 0.5;
        const endAt = t + v.len - origin;
        if (Math.abs(acc / unit - Math.round(acc / unit)) < 1e-6 && Math.abs(endAt / line - Math.round(endAt / line)) < 1e-6) {
          acc = 0;
          shortest = Infinity;
          longest = 0;
        }
      } else {
        acc = 0;
        shortest = Infinity;
        longest = 0;
      }
      out.push({
        rest,
        ...(rest && ghostRests ? { ghost: true } : {}),
        keys: c ? c.keys : [],
        at: t,
        len: v.len,
        dur: v.dur,
        dots: v.dots,
        ...(tp !== undefined ? { tuplet: tp } : {}),
        tieIn: !rest && (k > 0 || (c?.tieIn ?? false)),
        tieOut: !rest && (k < vs.length - 1 || (c?.tieOut ?? false)),
      });
      t += v.len;
    });
  };
  let t = from;
  for (const c of chain) {
    if (c.at > t + EPS) pushValues(t, c.at - t, true, null);
    pushValues(c.at, c.end - c.at, false, c);
    t = c.end;
  }
  if (to > t + EPS) pushValues(t, to - t, true, null);
  return out;
}
