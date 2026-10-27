/**
 * D318: a player's slurs on a phone, simulated (iPhone 13 landscape, 844 by 390 CSS px, the two bars
 * the outer fifths, the whole screen the touch area split down the middle as thumbs.ts does). The
 * player strikes each note of a voice with the thumbs in turn; where the score joins two notes the
 * second thumb lands before the first lifts (or just after), the first drifting toward the next note,
 * sideways, or wiggling as it lifts; iOS may take the first touch back as the second lands; the second
 * may land on the same bar as the first, near the inner edge, or early. Each outcome is counted.
 */
import type { Chip, Play } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { sideOf } from "../src/touch/thumbs.ts";
import { legatoGapMs } from "../src/bench/articulation.ts";

export const W = 844;
export const H = 390;
/** Drawn rows 8 px apart (D296), the voice's range centred on the screen's height. */
export function phoneRows(lo: number, hi: number): Rows {
  const RH = 8;
  const y0 = H / 2 + ((lo + hi) / 2) * RH;
  return { yOf: (s) => y0 - s * RH, stepAt: (y) => Math.round((y0 - y) / RH), rowH: RH, xOf: () => W / 2 };
}

export interface Player {
  /** How the player slurs a joined pair: P(second down before the first lifts), the overlap and the gap (ms). */
  overlapP: number;
  overlapMs: [number, number];
  gapMs: [number, number];
  /** The first thumb's drift during the overlap: along the bar toward the next note, and sideways (px, at most). */
  driftY: number;
  driftX: number;
  /** The drift begins this long (ms, at most) before the second lands. */
  driftLead: number;
  /** P(the first thumb wiggles as it lifts: two or three quick rocks). */
  wiggleP: number;
  /** P(iOS takes the first touch back as the second lands). */
  cancelP: number;
  /** P(the second lands on the first's half of the screen: same bar, or past the middle). */
  sameBarP: number;
  /** P(a thumb lands near the inner edge, by the box). */
  innerP: number;
  /** Where the player puts a thumb: from its own last touch, or from the thumb it takes over from. */
  ref: "own" | "held";
  /** Px a step, at the player's scale; the landing's scatter (px, sd). */
  scale: number;
  scatter: number;
  /** Timing: bias and sd (ms) of a landing; P(a slurred landing comes early) and how much (ms). */
  bias: number;
  sd: number;
  earlyP: number;
  earlyMs: [number, number];
  /** P(a slurred second thumb rolls in just after the first landed, this many ms after it: the II/18 report). */
  rollP?: number;
  rollMs?: [number, number];
  /** Slur the joined notes (else every note detached, lifted at 55% of its length). */
  slur: boolean;
  /** Thumbs: alternate (two), or one thumb only. */
  oneThumb?: boolean;
  /** P(a landing the wrong way: a step or more mirrored). */
  wrongP?: number;
  /** The wrong way from what: its own last touch, the thumb it takes over from, or anywhere (random). */
  wrongFrom?: "own" | "held" | "random";
}

export const SLURRING: Player = { overlapP: 0.8, overlapMs: [0, 250], gapMs: [0, 60], driftY: 30, driftX: 20, driftLead: 80, wiggleP: 0.15, cancelP: 0.15, sameBarP: 0.1, innerP: 0.3, ref: "held", scale: 10, scatter: 5, bias: -15, sd: 25, earlyP: 0.25, earlyMs: [20, 120], slur: true };
/** The same player, careful: overlapping a little, no drift, no wiggle, no cancel, on its own bar. */
export const CAREFUL: Player = { ...SLURRING, overlapP: 1, overlapMs: [20, 80], driftY: 0, driftX: 0, driftLead: 0, wiggleP: 0, cancelP: 0, sameBarP: 0, innerP: 0, ref: "own", earlyP: 0, bias: 0, sd: 20 };

export interface Tally {
  notes: number;
  right: number;
  wrong: number;
  missed: number;
  stray: number;
  /** Notes taken by a slide (the first thumb's drift taking the next note early). */
  slid: number;
  /** A landing ignored as a second contact (D290 DOUBLE). */
  doubles: number;
  /** Free ornaments sounded (D314). */
  freeOrns: number;
  /** Joined pairs the player slurred (both notes right), legato credited, and struck with a fresh attack. */
  slurred: number;
  legato: number;
  attacked: number;
  /** Wrong verdicts by kind of interval (step, third, leap, repeat). */
  wrongBy: Record<string, number>;
  /** Slips (the game's own count). */
  slips: number;
  cancels: number;
  score: number;
  /** The game's own diagnosis counts (MISS, STRAY, DOUBLE, WAIT…). */
  diag?: Record<string, number>;
  lines?: string[];
}

/** The engine's private counts, read for the tally. */
const inner = (g: ProtoGame) => g as unknown as { before(i: number, k: number): number; diagCounts: Record<string, number>; diag: string[]; cancels: number };

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Plays voice `voice` of fugue `id` (from `from` for `bars` bars) as `p` would. */
export function simulate(id: string, voice: number, p: Player, seed = 1, o: { bars?: number; bpm?: number; onTap?: (e: unknown, g: ProtoGame) => void } = {}): Tally {
  const R = rng(seed);
  const U = (a: number, b: number) => a + (b - a) * R();
  const N = (m: number, s: number) => m + s * Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
  const clock = { t: 0 };
  const perf = globalThis.performance;
  const realNow = perf.now.bind(perf);
  Object.defineProperty(perf, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  type Call = { midi: number; legato: boolean; lead: boolean };
  const calls: Call[] = [];
  const quiet = { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
  const chip = { ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: (midi: number, _a: number, _d: number, _v: unknown, q: Play = {}) => (calls.push({ midi, legato: !!q.legato, lead: !!q.lead }), quiet), swoosh() {}, tick() {}, chime() {} } as unknown as Chip;
  try {
    const f = fugueById(id);
    const until = o.bars ? Math.min(f.length, (o.bars + 1) * f.barTicks) : f.length;
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: o.bpm ?? tempoOf(id), legato: false, until, wait: false, solo: false, fail: false }, chip);
    const all = g.tracks[0].notes;
    const steps = all.map((n) => n.step);
    g.rows = phoneRows(Math.min(...steps), Math.max(...steps));
    if (o.onTap) g.tap = (e) => o.onTap!(e, g);
    const struck = all.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && all[i - 1].on === n.on) && n.on < until);
    type Ev = { t: number; k: number; fn: () => void };
    const evs: Ev[] = [];
    // The thumbs: where each is (its current height, the step it plays), down or not.
    const pos: Record<"a" | "b", { y: number; step: number; x: number } | null> = { a: null, b: null };
    const land: number[] = [];
    const lift: number[] = [];
    const ys: number[] = [];
    const xs: number[] = [];
    const slurIn: boolean[] = [];
    const rolled: boolean[] = [];
    const ms = (a: number, b: number) => (g.timeAt(b) - g.timeAt(a)) * 1000;
    // Landing times first (the lifts depend on the next landings).
    struck.forEach(({ n, i }, j) => {
      const joined = p.slur && j > 0 && g.joinedAt(i, 0) && struck[j - 1].i === inner(g).before(i, 0);
      slurIn[j] = joined;
      let t = g.timeAt(n.on) + N(p.bias, p.sd) / 1000;
      if (joined && R() < p.earlyP) t -= U(...p.earlyMs) / 1000;
      // A roll joins a pair: the note after a rolled one is not rolled into again.
      if (joined && p.rollP && !rolled[j - 1] && R() < p.rollP) (t = land[j - 1] + U(...(p.rollMs ?? [30, 120])) / 1000), (rolled[j] = true);
      // A thumb lands no earlier than just after the one before (the thumbs keep their order).
      if (j > 0) t = Math.max(t, land[j - 1] + 0.03);
      land[j] = t;
    });
    struck.forEach(({ n }, j) => {
      const next = land[j + 1];
      const own = land[j + 2];
      let t: number;
      if (next !== undefined && slurIn[j + 1]) t = R() < p.overlapP ? next + U(...p.overlapMs) / 1000 : next - U(...p.gapMs) / 1000;
      else t = land[j] + (Math.min(0.55 * ms(n.on, n.on + n.dur), ms(n.on, n.on + n.dur) - 60) / 1000);
      // The same thumb must lift before it lands again (one thumb: before the next note).
      const again = p.oneThumb ? next : own;
      if (again !== undefined) t = Math.min(t, again - 0.03);
      lift[j] = Math.max(land[j] + 0.04, t);
    });
    // Heights and places, then the events.
    const attackAt: number[] = [];
    const legatoAt: boolean[] = [];
    struck.forEach(({ n }, j) => {
      const th: "a" | "b" = p.oneThumb || j % 2 === 0 ? "a" : "b";
      const other: "a" | "b" = th === "a" ? "b" : "a";
      const homeLeft = th === "a";
      const o2 = pos[other];
      const mine = pos[th];
      const otherDown = j > 0 && !p.oneThumb && lift[j - 1] > land[j] - 0.3;
      let y: number;
      if (p.ref === "held" && o2 && otherDown) y = o2.y - (n.step - o2.step) * p.scale;
      else if (mine) y = mine.y - (n.step - mine.step) * p.scale;
      else if (o2) y = o2.y - (n.step - o2.step) * p.scale;
      else y = H / 2;
      if (p.wrongP && j > 0 && R() < p.wrongP) {
        const from = p.wrongFrom === "held" && o2 && otherDown ? o2 : (mine ?? o2);
        if (p.wrongFrom === "random") y = U(6, H - 6);
        else if (from) y = from.y + (n.step - from.step) * p.scale + (n.step === from.step ? 3 * p.scale * (R() < 0.5 ? 1 : -1) : 0);
      }
      y = Math.max(6, Math.min(H - 6, N(y, p.scatter)));
      ys[j] = y;
      // Across: the thumb's own bar (outer), near the inner edge, or over on the other's half.
      let left = homeLeft;
      let fromEdge = R() < p.innerP ? U(140, 200) : U(25, 140);
      // Over on the other thumb's half: its bar's inner part, or past it toward the middle.
      if (slurIn[j] && !p.oneThumb && R() < p.sameBarP) (left = !homeLeft), (fromEdge = U(110, W / 2 - 8));
      const x = left ? fromEdge : W - fromEdge;
      xs[j] = x;
      pos[th] = { y, step: n.step, x };
      const id = j + 1;
      const c = { side: sideOf(x, W), x, y, w: W, h: H } as const;
      evs.push({ t: land[j], k: 1, fn: () => g.down(id, c, perf.now()) });
      // The thumb settles a little after landing (a rolling contact).
      for (let t = land[j] + 0.016; t < Math.min(lift[j], land[j] + 0.08); t += 0.016) {
        const yy = y + N(0, 1);
        evs.push({ t, k: 2, fn: () => g.move(id, { ...c, y: yy }, perf.now()) });
      }
      // The next note slurred: the first thumb drifts toward it (and sideways), maybe wiggles, maybe is taken back.
      const nj = j + 1;
      if (nj < struck.length && slurIn[nj]) {
        const toward = Math.sign(struck[nj].n.step - n.step) || (R() < 0.5 ? 1 : -1);
        const dy = -toward * U(0, p.driftY);
        const dx = (R() < 0.5 ? 1 : -1) * U(0, p.driftX);
        const t0 = Math.max(land[j] + 0.08, land[nj] - U(0, p.driftLead) / 1000);
        const cancelled = R() < p.cancelP;
        const cancelAt = land[nj] + (R() < 0.5 ? -0.002 : 0.005);
        const end = cancelled ? Math.min(lift[j], cancelAt) : lift[j];
        const wig = R() < p.wiggleP;
        const amp = U(5, 9);
        for (let t = t0; t < end; t += 0.016) {
          const pr = Math.min(1, (t - t0) / Math.max(0.05, lift[j] - t0));
          let yy = y + dy * pr;
          if (wig && t > lift[j] - 0.14) yy += amp * Math.sin(((t - (lift[j] - 0.14)) / 0.08) * 2 * Math.PI);
          const xx = x + dx * pr;
          evs.push({ t, k: 2, fn: () => g.move(id, { ...c, x: xx, y: yy }, perf.now()) });
        }
        if (cancelled) evs.push({ t: cancelAt, k: 0, fn: () => g.up(id, perf.now(), true) });
        else evs.push({ t: lift[j], k: 0, fn: () => g.up(id, perf.now()) });
      } else evs.push({ t: lift[j], k: 0, fn: () => g.up(id, perf.now()) });
    });
    evs.sort((a, b) => a.t - b.t || a.k - b.k);
    // Each note as it is struck (by a touch, or later: a thumb waiting for it): legato credited, and how it sounded.
    const act = (fn: () => void) => {
      const was = struck.map(({ n }) => n.state === "hit" && n.via !== "slide");
      const a0 = calls.length;
      const l0 = g.art.legato;
      fn();
      const now = struck.map(({ n }, j) => (n.state === "hit" && n.via !== "slide" && !was[j] ? j : -1)).filter((j) => j >= 0);
      const lead = calls.slice(a0).filter((q) => q.lead);
      for (const j of now) {
        legatoAt[j] = g.art.legato > l0;
        attackAt[j] = lead.some((q) => !q.legato) ? 1 : lead.length ? 0 : -1;
      }
    };
    for (const e of evs) {
      while (clock.t < e.t - 0.016) (clock.t += 0.016), act(() => g.step());
      clock.t = Math.max(clock.t, e.t);
      act(() => g.step());
      act(e.fn);
    }
    while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), act(() => g.step());
    const r = g.results();
    const t: Tally = { notes: r.of, right: r.right, wrong: r.wrong, missed: r.missed, stray: r.stray, slid: 0, doubles: inner(g).diagCounts.DOUBLE ?? 0, freeOrns: g.freeOrns.mordents + g.freeOrns.shorts + g.freeOrns.trills, slurred: 0, legato: 0, attacked: 0, wrongBy: {}, slips: g.slips, cancels: inner(g).cancels, score: r.score, diag: { ...inner(g).diagCounts }, lines: [...inner(g).diag] };
    struck.forEach(({ n, i }, j) => {
      if (n.via === "slide") t.slid++;
      if (n.wrong) {
        const pv = j > 0 ? struck[j - 1].n.step : n.step;
        const d = Math.abs(n.step - pv);
        const kind = d === 0 ? "repeat" : d === 1 ? "step" : d === 2 ? "third" : "leap";
        t.wrongBy[kind] = (t.wrongBy[kind] ?? 0) + 1;
      }
      if (!slurIn[j] || n.state !== "hit" || struck[j - 1].n.state !== "hit" || n.via === "slide") return;
      void i;
      // Slurred as the player meant: overlapping, or lifted within the legato window.
      const gap = (land[j] - lift[j - 1]) * 1000;
      if (gap > legatoGapMs(ms(struck[j - 1].n.on, struck[j - 1].n.on + struck[j - 1].n.dur))) return;
      t.slurred++;
      if (legatoAt[j]) t.legato++;
      if (attackAt[j] === 1) t.attacked++;
    });
    return t;
  } finally {
    Object.defineProperty(perf, "now", { value: realNow, configurable: true, writable: true });
  }
}

export function sum(ts: Tally[]): Tally {
  const out = { notes: 0, right: 0, wrong: 0, missed: 0, stray: 0, slid: 0, doubles: 0, freeOrns: 0, slurred: 0, legato: 0, attacked: 0, wrongBy: {} as Record<string, number>, slips: 0, cancels: 0, score: 0 };
  for (const t of ts) {
    for (const k of Object.keys(out) as (keyof typeof out)[]) if (k !== "wrongBy") out[k] += t[k];
    for (const [k, v] of Object.entries(t.wrongBy)) out.wrongBy[k] = (out.wrongBy[k] ?? 0) + v;
  }
  return out;
}
