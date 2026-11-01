/**
 * D486: simulated human slides on a phone, through the real judge (ProtoGame, the game's mechanics:
 * MECH defaults, LADDER, the bars 22% of the width each). A player plays one voice with the thumbs in
 * turn and, on a share of the joined steps, keeps the thumb down and slides it to the next note. Each
 * slide follows a scripted human path at 60 Hz with the sensor's jitter (about half a pixel either way,
 * reported only when it changes, as a touchscreen does), and one way of going wrong at a time:
 *
 *  · clean     on the drawn block, on time (the control);
 *  · relative  landed loosely (a strike is judged by its direction, so players do not aim at the block)
 *              and moved by the drawn distance from there;
 *  · short     stops 15–45% of the way short and rests there, jittering;
 *  · overshoot goes 0.4–1.2 rows past, then settles back on the note;
 *  · early     arrives 120–350 ms before the note's time and rests;
 *  · late      arrives 40–140 ms after the note's time;
 *  · sideways  drifts 15–45 px across the bar as it slides;
 *  · pause     stops halfway for 60–150 ms, then goes on (arriving on time);
 *  · run       a fast run slid through, three or more steps one way, one thumb.
 * And three that must fail, each told at the thumb (D486's cues; not in CAUSES):
 *  · lifted    lifts a third of the way there, a moment before the note (LIFTED);
 *  · fling     arrives early, flung three and a half rows past the note, and stays (TOO FAR);
 *  · back      a step slid, then the next step back the other way slid by the same thumb (LIFT TO TURN).
 *
 * The rows are the box's as drawn (box-zoom.ts touchRows, the altered notes' shift, chroma.ts) for a
 * roll `rollH` CSS px tall, the voice's range over the passage. Success: the note slid to is played by
 * the slide and right.
 */
import type { Chip, Play } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { sideOf } from "../src/touch/thumbs.ts";
import { touchRows } from "../src/touch/box-zoom.ts";
import { chromaLiftPx, signatureOf } from "../src/touch/chroma.ts";


export type SlideCause = "clean" | "relative" | "short" | "overshoot" | "early" | "late" | "sideways" | "pause" | "run" | "lifted" | "fling" | "back";
export const CAUSES: readonly SlideCause[] = ["clean", "relative", "short", "overshoot", "early", "late", "sideways", "pause", "run"];

/** The two phones (CSS px, landscape) and their music box's roll height (measured on the production build). */
export interface Phone {
  name: string;
  w: number;
  h: number;
  rollTop: number;
  rollH: number;
}
export const PHONES: readonly Phone[] = [
  { name: "844×390", w: 844, h: 390, rollTop: 36, rollH: 292.5 },
  { name: "667×375", w: 667, h: 375, rollTop: 36, rollH: 277.5 },
];

export interface SlideTally {
  attempts: number;
  ok: number;
  /** The engine's own reasons for slides that failed (D486 cues), counted. */
  why: Record<string, number>;
  /** Notes the player struck (not slid) judged right, of those struck: the rest of the play unharmed. */
  struck: number;
  struckRight: number;
  /** Free ornaments read during the slides (a slide taken for a shake). */
  orns: number;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** The box's rows for a voice's steps lo..hi, drawn in a roll `rollH` tall from `rollTop`, as BenchApp boxRows gives them. */
export function boxRowsFor(key: string, lo: number, hi: number, ph: Phone): Rows {
  const geo = touchRows(lo, hi, ph.rollH);
  const sig = signatureOf(key);
  const y0 = ph.rollTop + geo.yOf(0);
  return {
    yOf: (step: number) => y0 - step * geo.rowH,
    stepAt: (y: number) => Math.round((y0 - y) / geo.rowH),
    rowH: geo.rowH,
    lift: (step: number, midi: number) => chromaLiftPx(geo.rowH, step, midi, sig, 2),
    xOf: () => ph.w / 2,
  };
}

/** Plays `bars` bars of voice `voice` of `id` with slides made the `cause` way. */
export function simulateSlides(id: string, voice: number, cause: SlideCause, ph: Phone, seed = 1, o: { bars?: number; from?: number; every?: number; log?: (s: string) => void; onTap?: (e: unknown, g: ProtoGame) => void } = {}): SlideTally {
  const R = rng(seed * 7919 + cause.length * 31 + ph.w);
  const U = (a: number, b: number) => a + (b - a) * R();
  const N = (m: number, s: number) => m + s * Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
  const clock = { t: 0 };
  const perf = globalThis.performance;
  const realNow = perf.now.bind(perf);
  Object.defineProperty(perf, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  const quiet = { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
  const chip = { ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: (_m: number, _a: number, _d: number, _v: unknown, _q: Play = {}) => quiet, swoosh() {}, tick() {}, chime() {} } as unknown as Chip;
  const why: Record<string, number> = {};
  try {
    const f = fugueById(id);
    const bars = o.bars ?? 16;
    const until = Math.min(f.length, (bars + 1) * f.barTicks);
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until, wait: false, solo: false, fail: false }, chip);
    const all = g.tracks[0].notes;
    const struck = all.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && all[i - 1].on === n.on) && n.on < until);
    const steps = struck.map(({ n }) => n.step);
    g.rows = boxRowsFor(f.key, Math.min(...steps), Math.max(...steps), ph);
    const rows = g.rows;
    g.tap = (e) => {
      const ev = e as { kind: string; why?: string };
      if (ev.kind === "slideMiss" && ev.why) why[ev.why] = (why[ev.why] ?? 0) + 1;
      o.onTap?.(e, g);
    };
    const drawn = (j: number) => rows.yOf(struck[j].n.step) - (rows.lift?.(struck[j].n.step, struck[j].n.midi) ?? 0);
    const t = (j: number) => g.timeAt(struck[j].n.on);
    const ioi = (j: number) => (j + 1 < struck.length ? t(j + 1) - t(j) : 1);
    const joined = (j: number) => j + 1 < struck.length && struck[j].n.on + struck[j].n.dur >= struck[j + 1].n.on - 1 && struck[j + 1].n.on - struck[j].n.on <= struck[j].n.dur + 1;
    const stepOf = (j: number) => struck[j + 1].n.step - struck[j].n.step;
    // The slides: from note j to j+1 (j+1 the note slid to). A step or a third, joined, not a repeat, not too quick.
    const slideAt = new Set<number>();
    const runOf = new Map<number, number>(); // the run's first slide → its last note
    const every = o.every ?? 3;
    let since = every;
    for (let j = 1; j + 2 < struck.length; j++) {
      since++;
      if (cause === "back") {
        // A step one way slid, then a step back slid by the same thumb (refused: one way only).
        const ok2 = (q: number) => joined(q) && Math.abs(stepOf(q)) >= 1 && Math.abs(stepOf(q)) <= 2 && ioi(q) >= 0.12;
        if (since >= every && ok2(j) && ok2(j + 1) && Math.sign(stepOf(j)) === -Math.sign(stepOf(j + 1)) && j + 3 < struck.length) {
          slideAt.add(j);
          slideAt.add(j + 1);
          since = 0;
          j += 2;
        }
        continue;
      }
      if (cause === "run") {
        // Three or more steps one way, each quick (≤ 220 ms): slid through by one thumb.
        let k = j;
        const dir = Math.sign(stepOf(j));
        while (k + 1 < struck.length && joined(k) && Math.abs(stepOf(k)) === 1 && Math.sign(stepOf(k)) === dir && ioi(k) <= 0.22 && ioi(k) >= 0.06) k++;
        if (dir !== 0 && k - j >= 3 && since >= 2) {
          runOf.set(j, k);
          for (let q = j; q < k; q++) slideAt.add(q);
          since = 0;
          j = k;
        }
        continue;
      }
      if (since < every || !joined(j) || stepOf(j) === 0 || Math.abs(stepOf(j)) > 2 || ioi(j) < 0.09 || slideAt.has(j - 1)) continue;
      slideAt.add(j);
      since = 0;
    }
    type Ev = { t: number; k: number; fn: () => void };
    const evs: Ev[] = [];
    const W = ph.w;
    const H = ph.h;
    let id1 = 0;
    let side: "a" | "b" = "a";
    const where: Record<"a" | "b", number | null> = { a: null, b: null };
    const attempts: number[] = [];
    // Each touch: a landing (with its scatter), the settling roll, then either a lift or a slide on.
    let j = 0;
    while (j < struck.length) {
      const th: "a" | "b" = side;
      const left = th === "a";
      const xLand = left ? U(0.06, 0.18) * W : W - U(0.06, 0.18) * W;
      const sideName = sideOf(xLand, W);
      const scatter = cause === "relative" ? 7 : 2.5;
      let y = Math.max(6, Math.min(H - 6, N(drawn(j), scatter)));
      // Relative players place by the last touch of this thumb: where it is matters less than the way it moved.
      const tl = t(j) + N(0, 0.012);
      const id = ++id1;
      const base = { side: sideName, x: xLand, y, w: W, h: H } as const;
      evs.push({ t: tl, k: 1, fn: () => g.down(id, base, perf.now()) });
      // The path while down: [time, x, y] points, with the jitter added at 60 Hz.
      const path: [number, number, number][] = [[tl, xLand, y]];
      let x = xLand;
      let last = j;
      let lifted: number | undefined;
      // Slides on from j (one, or a run's several).
      while (slideAt.has(last)) {
        const a = last;
        const b = a + 1;
        attempts.push(b);
        const tb = t(b);
        const target = cause === "relative" ? y + (drawn(b) - drawn(a)) * U(0.85, 1.15) : drawn(b) + N(0, 1.5);
        const slideS = Math.min(cause === "run" ? 0.6 * ioi(a) : U(0.06, 0.14), 0.6 * ioi(a));
        let arrive = tb + N(0, 0.012);
        if (cause === "early") arrive = Math.max(path[path.length - 1][0] + slideS + 0.05, tb - U(0.12, 0.35));
        if (cause === "late") arrive = tb + U(0.04, 0.14);
        if (cause === "fling") arrive = Math.max(path[path.length - 1][0] + slideS + 0.05, tb - U(0.2, 0.3));
        const start = Math.max(path[path.length - 1][0] + 0.03, arrive - slideS);
        const dx = cause === "sideways" ? (left ? 1 : -1) * U(15, 45) : 0;
        const y0 = y;
        const x0 = x;
        const ease = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, p)));
        if (cause === "pause") {
          const mid = y0 + (target - y0) * U(0.4, 0.6);
          const hold = U(0.06, 0.15);
          const half = Math.max(0.03, (arrive - start - hold) / 2);
          const s0 = Math.max(path[path.length - 1][0] + 0.03, arrive - 2 * half - hold);
          path.push([s0, x0, y0], [s0 + half, x0, mid], [s0 + half + hold, x0, mid], [arrive, x0, target]);
          y = target;
        } else if (cause === "lifted") {
          const part = y0 + (target - y0) * U(0.3, 0.4);
          path.push([arrive - 0.09, x0, y0], [arrive - 0.04, x0, part]);
          y = part;
          lifted = arrive - 0.03;
        } else if (cause === "fling") {
          const far = target + Math.sign(target - y0 || 1) * 3.5 * Math.max(rows.rowH, 18);
          for (let k = 1; k <= 6; k++) path.push([start + (k / 6) * (arrive - start), x0, y0 + (far - y0) * ease(k / 6)]);
          y = far;
        } else if (cause === "short") {
          const stop = y0 + (target - y0) * U(0.55, 0.85);
          for (let k = 1; k <= 6; k++) path.push([start + (k / 6) * (arrive - start), x0, y0 + (stop - y0) * ease(k / 6)]);
          y = stop;
        } else if (cause === "overshoot") {
          const row = rows.rowH;
          const past = target + Math.sign(target - y0 || 1) * U(0.4, 1.2) * row;
          const back = U(0.06, 0.12);
          const t1 = arrive - 0.02;
          for (let k = 1; k <= 6; k++) path.push([start + (k / 6) * (t1 - start), x0, y0 + (past - y0) * ease(k / 6)]);
          for (let k = 1; k <= 4; k++) path.push([t1 + (k / 4) * back, x0, past + (target - past) * ease(k / 4)]);
          y = target;
        } else {
          for (let k = 1; k <= 6; k++) path.push([start + (k / 6) * (arrive - start), x0 + dx * ease(k / 6), y0 + (target - y0) * ease(k / 6)]);
          y = target;
          x = x0 + dx;
        }
        last = b;
        if (cause !== "run" && cause !== "back") break;
      }
      // The next touch is the other thumb's: this one lifts as it lands (a hair after: a handover).
      const nextJ = last + 1;
      const liftT = lifted ?? (nextJ < struck.length ? t(nextJ) + U(0.005, 0.03) : t(last) + 0.2);
      path.push([liftT, x, y]);
      // Sample the path at 60 Hz with jitter (only changes reported).
      let px = Math.round(xLand * 2) / 2;
      let py = Math.round(path[0][2] * 2) / 2;
      for (let q = 1; q < path.length; q++) {
        const [ta, xa, ya] = path[q - 1];
        const [tb2, xb, yb] = path[q];
        for (let tt = ta + 0.016; tt < tb2 - 1e-6; tt += 0.016) {
          const p = (tt - ta) / Math.max(1e-6, tb2 - ta);
          const xx = Math.round((xa + (xb - xa) * p + N(0, 0.5)) * 2) / 2;
          const yy = Math.round((ya + (yb - ya) * p + N(0, 0.6)) * 2) / 2;
          if (xx === px && yy === py) continue;
          px = xx;
          py = yy;
          const c = { ...base, x: xx, y: Math.max(1, Math.min(H - 1, yy)) };
          evs.push({ t: tt, k: 2, fn: () => g.move(id, c, perf.now()) });
        }
      }
      evs.push({ t: liftT, k: 0, fn: () => g.up(id, perf.now()) });
      where[th] = y;
      side = th === "a" ? "b" : "a";
      j = nextJ;
    }
    evs.sort((a, b) => a.t - b.t || a.k - b.k);
    for (const e of evs) {
      while (clock.t < e.t - 0.016) (clock.t += 0.016), g.step();
      clock.t = Math.max(clock.t, e.t);
      g.step();
      e.fn();
    }
    while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), g.step();
    const slid = new Set(attempts);
    let ok = 0;
    let st = 0;
    let sr = 0;
    for (const b of attempts) {
      const n = struck[b].n;
      if (n.state === "hit" && !n.wrong && n.via === "slide") ok++;
      else o.log?.(`${id} ${cause} ${ph.name} #${b} step ${struck[b - 1].n.step}->${n.step} drawn ${drawn(b - 1).toFixed(1)}->${drawn(b).toFixed(1)} row ${rows.rowH} ioi ${Math.round(ioi(b - 1) * 1000)} ms: ${n.state}${n.wrong ? " wrong" : ""} via ${n.via ?? "-"}`);
    }
    struck.forEach(({ n }, q) => {
      if (slid.has(q) || q === 0) return;
      st++;
      if (n.state === "hit" && !n.wrong) sr++;
    });
    return { attempts: attempts.length, ok, why, struck: st, struckRight: sr, orns: g.freeOrns.mordents + g.freeOrns.shorts + g.freeOrns.trills + g.freeOrns.turns };
  } finally {
    Object.defineProperty(perf, "now", { value: realNow, configurable: true, writable: true });
  }
}

export function sumSlides(ts: SlideTally[]): SlideTally {
  const out: SlideTally = { attempts: 0, ok: 0, why: {}, struck: 0, struckRight: 0, orns: 0 };
  for (const t of ts) {
    out.attempts += t.attempts;
    out.ok += t.ok;
    out.struck += t.struck;
    out.struckRight += t.struckRight;
    out.orns += t.orns;
    for (const [k, v] of Object.entries(t.why)) out.why[k] = (out.why[k] ?? 0) + v;
  }
  return out;
}

/** The pieces the rates are measured on (fast and slow, major and minor, a chromatic subject). */
export const SLIDE_PIECES: readonly [string, number][] = [
  ["wtc1f02", 0],
  ["wtc1f01", 1],
  ["wtc2f12", 0],
  ["wtc1f22", 2],
  ["wtc2f18", 0],
];

/** The success rate of each cause over the pieces, phones and seeds. */
export function slideRates(o: { seeds?: number[]; pieces?: readonly [string, number][]; phones?: readonly Phone[]; bars?: number } = {}): Record<SlideCause, SlideTally> {
  const out = {} as Record<SlideCause, SlideTally>;
  for (const cause of CAUSES) {
    const ts: SlideTally[] = [];
    for (const ph of o.phones ?? PHONES) for (const [id, v] of o.pieces ?? SLIDE_PIECES) for (const s of o.seeds ?? [1, 2]) ts.push(simulateSlides(id, v, cause, ph, s, { bars: o.bars }));
    out[cause] = sumSlides(ts);
  }
  return out;
}

// ---- D488: slide-ins (a slide from a silent landing in a rest to the note after it). ----

export type InFrom = "above" | "below";
export type InTiming = "early" | "ontime" | "late" | "still";
export interface SlideInTally {
  /** Slide-ins tried, and played as slide-ins (right). */
  attempts: number;
  ok: number;
  /** Their notes right however played (a slide-in, or a landing that struck it). */
  right: number;
  /** After a short rest (0.4–1 s) and a long one (over 1 s, or the first note). */
  short: { attempts: number; ok: number };
  long: { attempts: number; ok: number };
  /** Strays and wrong notes over the whole take (a landing must cost nothing). */
  strays: number;
  wrong: number;
  /** The other notes, struck, right. */
  struck: number;
  struckRight: number;
  why: Record<string, number>;
}

/**
 * D488: plays voice `voice` of `id` with the thumbs in turn; each note after a rest of 0.4 s or more (and the
 * first) is slid in to: the thumb lands 1.5–3 rows `from` above or below its block, 0.3–0.8 s before it (never
 * before the rest begins), rests there (jittering), then slides to the block over 100–250 ms, arriving
 * `timing`: 120–300 ms early, on time (±12 ms) or 40–140 ms late; or "still": it never slides, lifting 0.4 s after the note's time.
 */
export function simulateSlideIns(id: string, voice: number, from: InFrom, timing: InTiming, ph: Phone, seed = 1, o: { bars?: number; log?: (s: string) => void; onTap?: (e: unknown, g: ProtoGame) => void } = {}): SlideInTally {
  const R = rng(seed * 104729 + (from === "above" ? 7 : 3) + timing.length * 131 + ph.w);
  const U = (a: number, b: number) => a + (b - a) * R();
  const N = (m: number, s: number) => m + s * Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
  const clock = { t: 0 };
  const perf = globalThis.performance;
  const realNow = perf.now.bind(perf);
  Object.defineProperty(perf, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  const quiet = { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
  const chip = { ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: () => quiet, swoosh() {}, tick() {}, chime() {} } as unknown as Chip;
  const why: Record<string, number> = {};
  try {
    const f = fugueById(id);
    const until = Math.min(f.length, ((o.bars ?? 24) + 1) * f.barTicks);
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until, wait: false, solo: false, fail: false }, chip);
    const all = g.tracks[0].notes;
    const struck = all.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && all[i - 1].on === n.on) && n.on < until);
    const steps = struck.map(({ n }) => n.step);
    g.rows = boxRowsFor(f.key, Math.min(...steps), Math.max(...steps), ph);
    const rows = g.rows;
    const row = Math.max(rows.rowH, 18);
    g.tap = (e) => {
      const ev = e as { kind: string; why?: string };
      if (ev.kind === "slideMiss" && ev.why) why[ev.why] = (why[ev.why] ?? 0) + 1;
      o.onTap?.(e, g);
    };
    const drawn = (j: number) => rows.yOf(struck[j].n.step) - (rows.lift?.(struck[j].n.step, struck[j].n.midi) ?? 0);
    const t = (j: number) => g.timeAt(struck[j].n.on);
    const end = (j: number) => g.timeAt(struck[j].n.on + struck[j].n.dur);
    const restS = (j: number) => (j === 0 ? Infinity : t(j) - end(j - 1));
    const W = ph.w;
    const H = ph.h;
    type Ev = { t: number; k: number; fn: () => void };
    const evs: Ev[] = [];
    const tries: { j: number; long: boolean }[] = [];
    let id1 = 0;
    struck.forEach((_, j) => {
      const left = j % 2 === 0;
      const x = left ? U(0.06, 0.18) * W : W - U(0.06, 0.18) * W;
      const base = { side: sideOf(x, W), x, w: W, h: H } as const;
      const id = ++id1;
      const nextRest = j + 1 < struck.length ? restS(j + 1) : Infinity;
      const lift = j + 1 < struck.length && nextRest < 0.05 ? t(j + 1) + U(0.005, 0.03) : Math.max(t(j) + 0.06, end(j) - 0.05);
      const target = drawn(j);
      const path: [number, number][] = [];
      let tl: number;
      if (restS(j) >= 0.4) {
        tries.push({ j, long: restS(j) > 1 });
        const sign = from === "above" ? -1 : 1;
        const y0 = Math.max(4, Math.min(H - 4, target + sign * U(1.5, 3) * row));
        const restStart = j === 0 ? 0.2 : end(j - 1) + 0.03;
        tl = Math.max(restStart, t(j) - U(0.3, 0.8));
        let arrive = t(j) + N(0, 0.012);
        if (timing === "early") arrive = t(j) - U(0.12, 0.3);
        if (timing === "late") arrive = t(j) + U(0.04, 0.14);
        const dur = U(0.1, 0.25);
        const start = Math.max(tl + 0.06, arrive - dur);
        arrive = Math.max(arrive, start + 0.05);
        const yEnd = target + N(0, 1.5);
        path.push([tl, y0], [start, y0]);
        if (timing === "still") (path.length = 0), path.push([tl, y0], [Math.max(lift, t(j) + 0.4), y0]);
        else {
        for (let k = 1; k <= 6; k++) path.push([start + (k / 6) * (arrive - start), y0 + (yEnd - y0) * (0.5 - 0.5 * Math.cos((Math.PI * k) / 6))]);
        path.push([Math.max(lift, arrive + 0.03), yEnd]);
        }
      } else {
        tl = t(j) + N(0, 0.012);
        const y = N(target, 2.5);
        path.push([tl, y], [Math.max(lift, tl + 0.05), y]);
      }
      const y0 = path[0][1];
      evs.push({ t: tl, k: 1, fn: () => g.down(id, { ...base, y: y0 }, perf.now()) });
      let py = Math.round(y0 * 2) / 2;
      for (let q = 1; q < path.length; q++) {
        const [ta, ya] = path[q - 1];
        const [tb, yb] = path[q];
        for (let tt = ta + 0.016; tt < tb - 1e-6; tt += 0.016) {
          const yy = Math.round((ya + (yb - ya) * ((tt - ta) / Math.max(1e-6, tb - ta)) + N(0, 0.6)) * 2) / 2;
          if (yy === py) continue;
          py = yy;
          evs.push({ t: tt, k: 2, fn: () => g.move(id, { ...base, y: Math.max(1, Math.min(H - 1, yy)) }, perf.now()) });
        }
      }
      const tu = path[path.length - 1][0];
      evs.push({ t: tu, k: 0, fn: () => g.up(id, perf.now()) });
    });
    evs.sort((a, b) => a.t - b.t || a.k - b.k);
    for (const e of evs) {
      while (clock.t < e.t - 0.016) (clock.t += 0.016), g.step();
      clock.t = Math.max(clock.t, e.t);
      g.step();
      e.fn();
    }
    while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), g.step();
    const r = g.results();
    const out: SlideInTally = { attempts: tries.length, ok: 0, right: 0, short: { attempts: 0, ok: 0 }, long: { attempts: 0, ok: 0 }, strays: r.stray, wrong: r.wrong, struck: 0, struckRight: 0, why };
    const tried = new Set(tries.map((x) => x.j));
    for (const { j, long } of tries) {
      const n = struck[j].n;
      const ok = n.state === "hit" && !n.wrong && n.via === "slide";
      const b = long ? out.long : out.short;
      b.attempts++;
      if (ok) (out.ok++, b.ok++);
      else o.log?.(`${id} #${j} rest ${restS(j).toFixed(2)} s: ${n.state}${n.wrong ? " wrong" : ""} via ${n.via ?? "-"} at ${n.at === undefined ? "-" : Math.round(g.timeAt(n.at) * 1000 - t(j) * 1000)} ms`);
      if (n.state === "hit" && !n.wrong) out.right++;
    }
    struck.forEach(({ n }, j) => {
      if (tried.has(j)) return;
      out.struck++;
      if (n.state === "hit" && !n.wrong) out.struckRight++;
    });
    return out;
  } finally {
    Object.defineProperty(perf, "now", { value: realNow, configurable: true, writable: true });
  }
}

export function sumSlideIns(ts: SlideInTally[]): SlideInTally {
  const out: SlideInTally = { attempts: 0, ok: 0, right: 0, short: { attempts: 0, ok: 0 }, long: { attempts: 0, ok: 0 }, strays: 0, wrong: 0, struck: 0, struckRight: 0, why: {} };
  for (const x of ts) {
    for (const k of ["attempts", "ok", "right", "strays", "wrong", "struck", "struckRight"] as const) out[k] += x[k];
    for (const k of ["short", "long"] as const) (out[k].attempts += x[k].attempts), (out[k].ok += x[k].ok);
    for (const [k, v] of Object.entries(x.why)) out.why[k] = (out.why[k] ?? 0) + v;
  }
  return out;
}
