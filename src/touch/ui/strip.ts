/**
 * D227: the engraved strip behind the GERUBACH and SCORE interfaces: a whole piece laid out once as one
 * long line of music (no system breaks), the way a scrolling-score video shows it. Pure (no DOM), so it is
 * tested in node; scroll-score.ts paints it in tiles and scrolls it under a fixed band.
 *
 * Every voice's notes become written events: split at the bar lines (tied), long or odd values split
 * into ones the notation has (tied: a half tied to an eighth), the gaps filled with rests (a bar's
 * silence a whole-bar rest), a chord within a voice one event of several heads. Accidentals by the bar,
 * per staff, against the key signature (a tied note carries its own). Beams by the beat (a compound
 * meter's dotted beat, else a quarter at most). Stems by the voice where a staff holds two voices (the
 * upper up, the lower down), else by the group's place on the staff.
 *
 * The horizontal spacing is an engraver's, not time's: every onset of any voice is a column, each as wide
 * as the time to the next one asks (a logarithmic rule: each doubling of the value adds the same room),
 * more room before a bar line and before an accidental. `xOf(tick)` maps time to x through the columns
 * (linear between two), monotonic, so the scroll follows the clock. Units: staff spaces of the full-size
 * staff.
 */
import { beatOf, type TouchFugue } from "../fugue.ts";
import { keySignature, spelled } from "./core.ts";

/** Treble, bass, soprano clef, and the tenor's treble an octave down (D231). */
export type Clef = "g" | "f" | "c1" | "g8";
export const LINES: Record<Clef, number[]> = { g: [30, 32, 34, 36, 38], f: [18, 20, 22, 24, 26], c1: [28, 30, 32, 34, 36], g8: [23, 25, 27, 29, 31] };

export interface StaffSpec {
  voices: number[];
  clef: Clef;
  /** The five lines' steps, bottom first. */
  lines: number[];
  /** 1 full size, 0.7 cue size. */
  scale: number;
}

export interface Head {
  step: number;
  midi: number;
  /** The alteration to print (0 a natural), or null. */
  acc: number | null;
}
export interface Ev {
  voice: number;
  staff: number;
  on: number;
  dur: number;
  /** The note's own onset (a tied piece's first), for the game's notes and the entries. */
  src: number;
  rest: boolean;
  heads: Head[];
  /** The written value in quarters (4 a whole), and a dot. */
  base: number;
  dot: boolean;
  /** Tied to the voice's next event. */
  tie: boolean;
  /** Part of a tie from the previous event (its accidental not printed again). */
  tied: boolean;
  /** A bar of silence. */
  measure: boolean;
  up: boolean;
  /** The head's left edge (staff spaces). */
  x: number;
  /** The beam group (index into Strip.groups), or -1. */
  group: number;
}
export interface Strip {
  staves: StaffSpec[];
  evs: Ev[];
  /** Beamed groups: indices into evs, in time. */
  groups: number[][];
  /** The columns: an onset and its x. */
  cols: { t: number; x: number }[];
  /** Bar lines: the bar's number, its first tick, the line's x. */
  bars: { n: number; on: number; x: number }[];
  /** The final bar line's x; the strip's width. */
  end: number;
  width: number;
  /** Time (ticks) to x (staff spaces), monotonic. */
  xOf: (tick: number) => number;
}

/** Written values, in quarters, longest first; the dotted ones only for notes. */
const NOTE_VALUES = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.1875, 0.125, 0.0625];
const REST_VALUES = [4, 2, 1, 0.5, 0.25, 0.125, 0.0625];
const EPS = 0.01;

function isDot(q: number): boolean {
  return [3, 1.5, 0.75, 0.375, 0.1875].some((v) => Math.abs(v - q) < EPS);
}

/** A length (ticks) as written values, tied: the greedy split, or the nearest single value where that needs more than three. */
export function writtenValues(len: number, tpq: number, rest: boolean): number[] {
  const q = len / tpq;
  const vals = rest ? REST_VALUES : NOTE_VALUES;
  const out: number[] = [];
  let left = q;
  while (left > 0.0625 - EPS && out.length < 4) {
    const v = vals.find((x) => x <= left + EPS);
    if (v === undefined) break;
    out.push(v);
    left -= v;
  }
  if (!out.length || out.length > 3 || left > EPS) {
    const v = vals.find((x) => x <= q + EPS) ?? vals[vals.length - 1];
    return [v];
  }
  return out;
}

/** The beam's unit: a compound meter's dotted beat, else the beat but a quarter at most. */
export function beamUnit(f: TouchFugue): number {
  const [num, den] = f.meter.split("/").map(Number);
  if (num === 3 && den >= 8) return f.barTicks;
  const b = beatOf(f).ticks;
  return num % 3 === 0 && num > 3 ? b : Math.min(b, f.tpq);
}

/** The column's width for the time to the next onset (staff spaces). */
export function colWidth(ticks: number, tpq: number): number {
  const q = Math.max(1 / 32, ticks / tpq);
  return Math.max(1.25, 1.65 + 1.05 * Math.log2(q / 0.25));
}

/** The bars' starts and the piece's end: [from, to) for each bar, a pickup as bar 0. */
function barRanges(f: TouchFugue): { n: number; on: number; to: number }[] {
  const list = f.bars.map((b) => ({ n: b.n, on: b.on }));
  if (!list.length || list[0].on > 0) list.unshift({ n: 0, on: 0 });
  return list.map((b, i) => ({ ...b, to: list[i + 1]?.on ?? Math.max(f.length, b.on + 1) }));
}

/** One staff per voice group as asked; the stems' sides fixed where a staff holds more than one voice. */
export function layoutStrip(f: TouchFugue, staves: StaffSpec[]): Strip {
  const bars = barRanges(f);
  const unit = beamUnit(f);
  const staffOf = (v: number) => Math.max(0, staves.findIndex((s) => s.voices.includes(v)));
  const evs: Ev[] = [];
  const barOf = (t: number) => {
    let lo = 0;
    let hi = bars.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (bars[m].on <= t) lo = m;
      else hi = m - 1;
    }
    return bars[lo];
  };

  // The events, voice by voice.
  f.voices.forEach((notes, v) => {
    const staff = staffOf(v);
    const st = staves[staff];
    const k = st.voices.indexOf(v);
    const shared = st.voices.length > 1;
    const fixedUp = shared ? k < st.voices.length / 2 : null;
    // Chords: the notes struck together, as long as the shortest; a note overlapped by the next cut short.
    const chords: { on: number; dur: number; ns: { midi: number; step: number }[] }[] = [];
    for (const [on, dur, midi, step] of [...notes].sort((a, b) => a[0] - b[0] || b[3] - a[3])) {
      const last = chords[chords.length - 1];
      if (last && last.on === on) {
        last.ns.push({ midi, step });
        last.dur = Math.min(last.dur, dur);
      } else chords.push({ on, dur, ns: [{ midi, step }] });
    }
    for (let i = 0; i < chords.length - 1; i++) chords[i].dur = Math.min(chords[i].dur, chords[i + 1].on - chords[i].on);
    const push = (on: number, len: number, rest: boolean, ns: { midi: number; step: number }[]) => {
      const start = evs.length;
      // Split at the bar lines.
      let a = on;
      const end = on + len;
      while (a < end - 0.5) {
        const bar = barOf(a);
        const b = Math.min(end, bar.to);
        if (rest && a === bar.on && b === bar.to && bar.to - bar.on > 0) {
          evs.push({ voice: v, staff, on: a, dur: b - a, src: a, rest, heads: [], base: 4, dot: false, tie: false, tied: false, measure: true, up: true, x: 0, group: -1 });
          a = b;
          continue;
        }
        // A rest off the beat ends at the beat first.
        const parts: [number, number][] = [];
        let c = a;
        if (rest && (c - bar.on) % unit !== 0) {
          const nb = bar.on + Math.ceil((c - bar.on) / unit) * unit;
          if (nb < b) parts.push([c, nb]), (c = nb);
        }
        parts.push([c, b]);
        for (const [p, q] of parts) {
          let t = p;
          for (const val of writtenValues(q - p, f.tpq, rest)) {
            const d = Math.round(val * f.tpq);
            evs.push({
              voice: v,
              staff,
              on: t,
              dur: d,
              src: on,
              rest,
              heads: ns.map((n) => ({ ...n, acc: null })),
              base: isDot(val) ? (val * 2) / 3 : val,
              dot: isDot(val),
              tie: !rest,
              tied: !rest,
              measure: false,
              up: fixedUp ?? true,
              x: 0,
              group: -1,
            });
            t += d;
          }
        }
        a = b;
      }
      // The last piece of a note is not tied on; the first not tied in.
      if (!rest) {
        const mine = evs.slice(start);
        if (mine.length) {
          mine[0].tied = false;
          mine[mine.length - 1].tie = false;
        }
      }
    };
    let cursor = bars[0].on;
    for (const c of chords) {
      if (c.on > cursor) push(cursor, c.on - cursor, true, []);
      if (c.dur > 0) push(c.on, c.dur, false, c.ns);
      cursor = Math.max(cursor, c.on + c.dur);
    }
    const last = bars[bars.length - 1].to;
    if (cursor < last) push(cursor, last - cursor, true, []);
  });
  evs.sort((a, b) => a.on - b.on || a.staff - b.staff || a.voice - b.voice);

  // Accidentals, by the bar and the staff, against the key signature.
  const sig = keySignature(f.key);
  const state = new Map<string, number>();
  let barAt = -1;
  for (const e of evs) {
    if (e.rest) continue;
    const bar = barOf(e.on).on;
    if (bar !== barAt) state.clear(), (barAt = bar);
    for (const h of e.heads) {
      const { letter, alter } = spelled(f, h.midi);
      const key = `${e.staff}:${letter}${Math.floor(h.step / 7)}`;
      const was = state.get(key) ?? sig.get(letter) ?? 0;
      if (alter !== was && !e.tied) h.acc = alter;
      state.set(key, alter);
    }
  }

  // Beams: a voice's notes of an eighth or less, back to back, within a beat unit.
  const groups: number[][] = [];
  const byVoice = new Map<number, number[]>();
  evs.forEach((e, i) => {
    const l = byVoice.get(e.voice);
    if (l) l.push(i);
    else byVoice.set(e.voice, [i]);
  });
  for (const list of byVoice.values()) {
    let cur: number[] = [];
    let unitAt = -1;
    const flush = () => {
      if (cur.length > 1) {
        const g = groups.length;
        groups.push(cur);
        for (const i of cur) evs[i].group = g;
      }
      cur = [];
    };
    for (const i of list) {
      const e = evs[i];
      const bar = barOf(e.on);
      const u = Math.floor((e.on - bar.on) / unit) + bar.on * 1e3;
      const prev = cur.length ? evs[cur[cur.length - 1]] : null;
      const beamable = !e.rest && e.base <= 0.5;
      if (!beamable || !prev || u !== unitAt || prev.on + prev.dur !== e.on) flush();
      if (beamable) cur.push(i);
      unitAt = u;
    }
    flush();
  }
  // Stems where the staff holds one voice: by the group's (or the note's) place against the middle line.
  const mean = (is: number[]) => is.reduce((a, i) => a + evs[i].heads.reduce((s, h) => s + h.step, 0) / Math.max(1, evs[i].heads.length), 0) / is.length;
  evs.forEach((e, i) => {
    if (!e.rest && staves[e.staff].voices.length === 1 && e.group < 0) e.up = mean([i]) < staves[e.staff].lines[2];
  });
  for (const g of groups) {
    const e0 = evs[g[0]];
    if (staves[e0.staff].voices.length === 1) {
      const up = mean(g) < staves[e0.staff].lines[2];
      for (const i of g) evs[i].up = up;
    }
  }

  // The columns and their x.
  const onsets = new Map<number, { acc: boolean; dot: boolean }>();
  for (const e of evs) {
    const o = onsets.get(e.on) ?? { acc: false, dot: false };
    if (e.heads.some((h) => h.acc !== null)) o.acc = true;
    if (e.dot) o.dot = true;
    onsets.set(e.on, o);
  }
  for (const b of bars) if (!onsets.has(b.on)) onsets.set(b.on, { acc: false, dot: false });
  const ts = [...onsets.keys()].sort((a, b) => a - b);
  const barSet = new Set(bars.map((b) => b.on));
  const cols: { t: number; x: number }[] = [];
  const barXs: { n: number; on: number; x: number }[] = [];
  let x = 1.2;
  let prevDot = false;
  ts.forEach((t, i) => {
    if (i > 0) x += colWidth(t - ts[i - 1], f.tpq) + (prevDot ? 0.35 : 0);
    if (barSet.has(t) && i > 0) {
      barXs.push({ n: barOf(t).n, on: t, x: x + 0.3 });
      x += 1.3;
    } else if (i === 0) barXs.push({ n: barOf(t).n, on: t, x: 0 });
    const o = onsets.get(t)!;
    if (o.acc) x += 1.15;
    cols.push({ t, x });
    prevDot = o.dot;
  });
  const lastT = bars[bars.length - 1].to;
  const end = x + colWidth(lastT - ts[ts.length - 1], f.tpq) + (prevDot ? 0.35 : 0);
  cols.push({ t: lastT, x: end });
  const at = new Map(cols.map((c) => [c.t, c.x]));
  for (const e of evs) e.x = at.get(e.on) ?? 0;
  // A bar of silence centred in its bar.
  for (const e of evs) if (e.measure) e.x = ((at.get(e.on) ?? 0) + (at.get(e.on + e.dur) ?? end)) / 2 - 0.6;

  const xOf = (tick: number): number => {
    if (tick <= cols[0].t) return cols[0].x - ((cols[0].t - tick) / f.tpq) * 3.6;
    if (tick >= lastT) return end + ((tick - lastT) / f.tpq) * 3.6;
    let lo = 0;
    let hi = cols.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cols[m].t <= tick) lo = m;
      else hi = m;
    }
    const a = cols[lo];
    const b = cols[hi];
    return a.x + ((tick - a.t) / (b.t - a.t)) * (b.x - a.x);
  };
  return { staves, evs, groups, cols, bars: barXs, end, width: end + 1, xOf };
}

/** The grand staff: the upper half of the voices on the treble staff, the rest on the bass. */
export function grandStaves(count: number): StaffSpec[] {
  const top = count <= 2 ? 1 : count === 5 ? 3 : 2;
  const all = Array.from({ length: count }, (_, i) => i);
  return [
    { voices: all.slice(0, top), clef: "g", lines: LINES.g, scale: 1 },
    { voices: all.slice(top), clef: "f", lines: LINES.f, scale: 1 },
  ];
}

/** The ledger lines a note (step) needs on a staff (its lines' steps, bottom first). */
export function ledgersOf(step: number, lines: number[]): number {
  return Math.max(0, Math.floor((step - lines[4]) / 2), Math.floor((lines[0] - step) / 2));
}

/**
 * A voice's clef on a staff of its own (D231): the one its notes need the fewest ledger lines on, the
 * treble or the bass; a tenor also the treble an octave down ("g8", where it saves a third of them:
 * I/12's tenor, on the bass staff, climbed to A4 over five ledger lines). An alto keeps the treble or bass.
 */
export function clefOf(steps: number[], tenor = false): Clef {
  if (!steps.length) return "g";
  const cost = (c: Clef) => steps.reduce((a, s) => a + ledgersOf(s, LINES[c]), 0);
  const plain: Clef = cost("g") <= cost("f") ? "g" : "f";
  return tenor && cost("g8") < cost(plain) * 0.67 ? "g8" : plain;
}

/** One staff per voice, in the clef its notes ask (clefOf); the player's full size, the others cue size. */
export function voiceStaves(f: TouchFugue, player: number, cue = 0.7): StaffSpec[] {
  return f.voices.map((ns, v) => {
    const clef = clefOf(
      ns.map((n) => n[3]),
      /tenor/i.test(f.voiceNames[v] ?? ""),
    );
    return { voices: [v], clef, lines: LINES[clef], scale: v === player ? 1 : cue };
  });
}
