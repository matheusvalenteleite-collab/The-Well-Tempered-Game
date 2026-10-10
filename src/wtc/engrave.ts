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
export function units(time: string): { beat: number; beam: number; bar: number } {
  const [num, den] = time.split("/").map(Number);
  const bar = (num * 4) / den;
  const compound = num % 3 === 0 && num > 3;
  const beat = compound ? (3 * 4) / den : den >= 8 ? 4 / den : 1;
  // 3/8 (and 3/16) is beamed by the bar.
  const beam = num === 3 && den >= 8 ? bar : compound ? beat : den >= 8 ? 4 / den : 1;
  return { beat, beam: Math.max(beam, Math.min(bar, 0.5)), bar };
}

export interface Value {
  len: number;
  dur: string;
  dots: number;
  triplet: boolean;
}

/**
 * A length from `p` (quarters from the bar line) written in values that show the metre (the
 * rules in the header). `rest`: a rest's stricter grid.
 */
export function spell(p: number, len: number, time: string, rest = false, barLen?: number): Value[] {
  const { beat } = units(time);
  const bar = barLen ?? units(time).bar;
  const beats = Math.round(bar / beat);
  const mid = beats >= 4 && beats % 2 === 0 ? bar / 2 : -1;
  // A triplet value: a plain value's two thirds, alone.
  const tri = PLAIN.find(([q]) => Math.abs(q * (2 / 3) - len) < EPS);
  if (tri && !VALUES.some(([q]) => Math.abs(q - len) < EPS)) return [{ len, dur: tri[1], dots: 0, triplet: true }];
  const out: Value[] = [];
  let at = p;
  let left = len;
  let guard = 0;
  while (left > EPS && guard++ < 64) {
    // Off the plain grid (inside a triplet): triplet values, the longest the position allows.
    if (!dyadic(at) || !dyadic(left)) {
      const tv = TRIPLETS.find(([q]) => q <= left + EPS && mod(at, q) === 0) ?? TRIPLETS.find(([q]) => q <= left + EPS) ?? TRIPLETS[TRIPLETS.length - 1];
      out.push({ len: Math.min(tv[0], left), dur: tv[1], dots: 0, triplet: true });
      at += tv[0];
      left -= tv[0];
      continue;
    }
    const fits = VALUES.filter(([q]) => q <= left + EPS);
    if (!fits.length) {
      // Not writable in plain values (a tuplet's piece): the nearest plain value, as a triplet.
      const t = PLAIN.find(([q]) => q * (2 / 3) <= left + EPS) ?? PLAIN[PLAIN.length - 1];
      out.push({ len: left, dur: t[1], dots: 0, triplet: true });
      break;
    }
    const ok = fits.find(([q, , dots]) => {
      const plain = dots ? (q * 2) / 3 : q;
      const end = at + q;
      if (end > bar + EPS) return false;
      if (rest) {
        if (mod(at, plain) !== 0 && !(at < EPS && Math.abs(q - bar) < EPS)) return false;
        if (dots && !(Math.abs(q - beat) < EPS && mod(at, beat) === 0)) return false;
        if (q < beat - EPS && Math.floor(at / beat + EPS) !== Math.floor((end - 2 * EPS) / beat)) return false;
        if (mid > 0 && at < mid - EPS && end > mid + EPS && at > EPS) return false;
        return true;
      }
      if (mod(at, Math.min(plain, beat) / 2) !== 0) return false;
      if (q < beat - EPS) return Math.floor(at / beat + EPS) === Math.floor((end - 2 * EPS) / beat);
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
  return Array.from({ length: count }, (_, v) => {
    const mine = notes.map((n, i) => ({ n, i })).filter(({ i }) => voice[i] === v);
    const mean = mine.length ? mine.reduce((a, { i }) => a + dia[i], 0) / mine.length : 28;
    const home = mean >= 27 ? 0 : 1;
    const cost = Array.from({ length: bars }, () => [0, 0]);
    const tied = new Array(bars).fill(false); // a note of this voice sounds across the bar line before bar b
    for (const { n, i } of mine) {
      const b0 = barIndex(starts, n.at);
      const b1 = barIndex(starts, n.at + n.dur - 2 * EPS);
      for (let b = b0; b <= b1; b++) {
        // A note counts in each bar it sounds in, by how much of the bar it fills (at least a little).
        const len = starts[b + 1] - starts[b];
        const share = Math.max(0.25, (Math.min(n.at + n.dur, starts[b + 1]) - Math.max(n.at, starts[b])) / len);
        for (const s of [0, 1]) cost[b][s] += ledger(dia[i], s) * (b === b0 ? 1 : share);
        if (b > b0) tied[b] = true;
      }
    }
    for (let b = 0; b < bars; b++) cost[b][1 - home] += 0.6;
    const SWITCH = 2.5;
    const best: number[][] = [[cost[0][0], cost[0][1]]];
    const from: number[][] = [[0, 1]];
    for (let b = 1; b < bars; b++) {
      best.push([0, 0]);
      from.push([0, 0]);
      for (const s of [0, 1]) {
        const stay = best[b - 1][s];
        const move = best[b - 1][1 - s] + (tied[b] ? 1e6 : SWITCH);
        best[b][s] = Math.min(stay, move) + cost[b][s];
        from[b][s] = stay <= move ? s : 1 - s;
      }
    }
    const out = new Array(bars).fill(0);
    out[bars - 1] = best[bars - 1][0] <= best[bars - 1][1] ? 0 : 1;
    for (let b = bars - 1; b > 0; b--) out[b - 1] = from[b][out[b]];
    return out;
  });
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
    for (let v = 0; v < count; v++) {
      const here = byVoice[v].filter((i) => notes[i].at < to - EPS && notes[i].at + notes[i].dur > from + EPS);
      if (!here.length) continue;
      // Chords: struck together, ending together, within the bar.
      const chords: Chord[] = [];
      for (const i of here) {
        const n = notes[i];
        const a = Math.max(n.at, from);
        const e = Math.min(n.at + n.dur, to);
        const c = chords.find((c) => Math.abs(c.at - a) < EPS && Math.abs(c.end - e) < EPS);
        const key = { i, pitch: spelled[i] };
        if (c) {
          if (!c.keys.some((k) => dia[k.i] === dia[i])) c.keys.push(key); // the same step twice cannot be drawn in one chord
        } else chords.push({ at: a, end: e, keys: [key], tieIn: n.at < from - EPS, tieOut: n.at + n.dur > to + EPS });
      }
      chords.sort((x, y) => x.at - y.at || y.end - x.end);
      // Layers: each chord on the first layer free when it begins.
      const chains: Chord[][] = [];
      for (const c of chords) {
        const free = chains.find((ch) => ch[ch.length - 1].end <= c.at + EPS);
        if (free) free.push(c);
        else chains.push([c]);
      }
      chains.forEach((ch, sub) => {
        for (const c of ch) c.keys.sort((x, y) => dia[x.i] - dia[y.i]);
        staves[staffOf[v][b]].push({ voice: v, sub, stem: 0, items: layerItems(ch, from, to, meterOf(b), sub > 0, origin) });
      });
    }
    // Stems: on a staff with several layers, the highest up, the lowest down, the others by where they lie.
    for (const layers of staves) {
      if (layers.length < 2) continue;
      const pitch = (l: EngLayer) => {
        const ks = l.items.flatMap((it) => it.keys.map((k) => dia[k.i]));
        return ks.length ? ks.reduce((a, x) => a + x, 0) / ks.length : 0;
      };
      // By voice (the higher voice above), unless two layers clearly cross (by more than a third on average).
      const order = [...layers].sort((x, y) => x.voice - y.voice || x.sub - y.sub);
      for (let pass = 0; pass < order.length; pass++)
        for (let k = 0; k + 1 < order.length; k++)
          if (pitch(order[k + 1]) - pitch(order[k]) > 3) [order[k], order[k + 1]] = [order[k + 1], order[k]];
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
        for (const it of l.items) {
          const ok = !it.rest && it.tuplet === undefined && ["8", "16", "32", "64"].includes(it.dur);
          const u = Math.floor((it.at - bar.origin) / beamUnit + EPS);
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
  let tupletLeft = 0;
  const pushValues = (at: number, len: number, rest: boolean, c: Chord | null) => {
    const vs = spell(at - origin, len, time, rest, to - origin);
    let t = at;
    vs.forEach((v, k) => {
      let tp: number | undefined;
      if (v.triplet) {
        if (tupletLeft <= EPS) {
          tuplet++;
          // A triplet group spans twice the plain value (three in the time of two).
          tupletLeft = (PLAIN.find(([, d]) => d === v.dur)?.[0] ?? v.len * 1.5) * 2;
        }
        tp = tuplet;
        tupletLeft -= v.len;
      } else tupletLeft = 0;
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
