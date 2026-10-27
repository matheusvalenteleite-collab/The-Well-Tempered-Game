/** D314: the fugues' ornaments as the tutorial plays them; free ornaments on any held note; the strong side. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { protoById, barDynamic, barAcross, BAR } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { feedShake, shakeTracker, SHAKE_WINDOW_MS, type FreeKind } from "../src/touch/free-ornament.ts";
import { freeOrnamentParts, ornamentsOf } from "../src/touch/ornament-play.ts";
import { STRONG_SIDE, strengthOf } from "../src/touch/touch-expr.ts";
import type { Chip, Play } from "../src/touch/chip.ts";

// ---- The gesture ----

/** Feeds a path of [ms, x, y] points; returns the kinds it became, in order. */
function gesture(path: [number, number, number][], reach = 7.2): FreeKind[] {
  const s = shakeTracker(path[0][2], path[0][1], path[0][0]);
  const out: FreeKind[] = [];
  for (const [t, x, y] of path.slice(1)) {
    const k = feedShake(s, x, y, t, reach);
    if (k) out.push(k);
  }
  return out;
}
/** Back and forth along the bar: `legs` legs of `amp` px, each `ms` long, sampled every 16 ms (the first one `first`: 1 up, -1 down). */
function wobble(legs: number, amp: number, ms: number, first: 1 | -1, sideways = 0): [number, number, number][] {
  const out: [number, number, number][] = [[0, 100, 200]];
  let y = 200;
  let x = 100;
  let t = 0;
  for (let k = 0; k < legs; k++) {
    const dir = (k % 2 === 0 ? first : -first) * -1; // up is a smaller y
    const steps = Math.max(1, Math.round(ms / 16));
    for (let j = 1; j <= steps; j++) {
      t += ms / steps;
      out.push([t, x + (sideways * (k % 2 === 0 ? 1 : -1) * j) / steps, y + (dir * amp * j) / steps]);
    }
    y += dir * amp;
    x += sideways * (k % 2 === 0 ? 1 : -1);
  }
  return out;
}

test("D314: a quick shake along the bar: down and back a mordent, up and back a short trill, a third leg a trill", () => {
  assert.deepEqual(gesture(wobble(2, 12, 70, -1)), ["mordent"]);
  assert.deepEqual(gesture(wobble(2, 12, 70, 1)), ["short"]);
  assert.deepEqual(gesture(wobble(4, 12, 60, 1)), ["short", "trill"]);
  assert.deepEqual(gesture(wobble(5, 10, 50, -1)), ["mordent", "trill"]);
});

test("D314: not a shake: a slow drift, a slow back and forth, a small wander, D311's sideways expression", () => {
  // A drift up the bar, slow, 60 px over a second.
  assert.deepEqual(gesture(wobble(1, 60, 1000, 1)), []);
  // Back and forth, each leg slower than the window allows.
  assert.deepEqual(gesture(wobble(4, 14, SHAKE_WINDOW_MS, 1)), []);
  // A rolling thumb's wander (4 px) however fast.
  assert.deepEqual(gesture(wobble(6, 4, 40, 1)), []);
  // Sideways: a fast wobble across the bar (40 px) with a little height in it (10 px): expression, not a shake.
  assert.deepEqual(gesture(wobble(6, 10, 60, 1, 40)), []);
  // A slow sideways swell with nothing along the bar.
  const swell: [number, number, number][] = Array.from({ length: 60 }, (_, k) => [k * 16, 100 + Math.sin(k / 6) * 30, 200]);
  assert.deepEqual(gesture(swell), []);
});

test("D314: a free ornament realised as the written ones: the mordent the step below and back, the trill from above, ending on the note", () => {
  const f = fugueById("wtc1f02");
  const n = f.voices[0].find((x) => x[1] >= f.tpq)!; // a note of a crotchet or more
  const [on, dur, midi] = n;
  const m = freeOrnamentParts(f, "mordent", on, midi, on + 10, on + dur, 72);
  assert.equal(m.length, 2);
  assert.ok(m[0][2] < midi && midi - m[0][2] <= 2, "the step below first (the main note already sounds)");
  assert.equal(m.at(-1)![2], midi);
  const tr = freeOrnamentParts(f, "trill", on, midi, on + 10, on + dur, 72);
  assert.ok(tr.length >= 4);
  assert.ok(tr[0][2] > midi && tr[0][2] - midi <= 2, "from the note above (the Explication)");
  assert.equal(tr.at(-1)![2], midi);
  assert.ok(tr.every((p, k) => k === 0 || p[0] >= tr[k - 1][0]));
  assert.ok(tr.at(-1)![0] + tr.at(-1)![1] <= on + dur + 1, "within the note");
  assert.deepEqual(freeOrnamentParts(f, "trill", on, midi, on + dur - 2, on + dur, 72), [], "too little left: nothing");
});

// ---- In a fugue ----

const RH = 18;
const ROWS: Rows = { yOf: (s) => 600 - s * RH, stepAt: (y) => Math.round((600 - y) / RH), rowH: RH, xOf: () => 400 };
const W = 844;
type Heard = { midi: number; at: number };
function fakeChip(clock: { t: number }, heard: Heard[]) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    visual: 0,
    smooth: false,
    note: (midi: number, at: number, _d: number, _v: unknown, p: Play = {}) => {
      if (p.lead) heard.push({ midi, at });
      return { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
    },
    swoosh() {},
    tick() {},
  } as unknown as Chip;
}
/**
 * Plays track 0 of a fugue right, each note with a fresh thumb (taking turns); `hold(i, shake)` may
 * move the held thumb (shake: (dy, dx, ms) moves, at the audio clock's pace). The page's clock is the
 * fake audio clock (performance.now), so the gesture's timing is the game's.
 */
function play(id: string, voice: number, during: (g: ProtoGame, i: number, move: (dy: number, dx: number, ms: number) => void) => void, opts: Record<string, unknown> = {}) {
  const clock = { t: 0 };
  const heard: Heard[] = [];
  const realNow = performance.now.bind(performance);
  Object.defineProperty(performance, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  try {
    const f = fugueById(id);
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until: f.length, wait: false, solo: false, fail: false, ...opts }, fakeChip(clock, heard));
    g.rows = ROWS;
    const notes = g.tracks[0].notes;
    notes.forEach((n, i) => {
      if (n.ride || (i > 0 && notes[i - 1].on === n.on)) return;
      const t0 = g.timeAt(n.on);
      if (clock.t > t0) return;
      while (clock.t < t0 - 0.02) (clock.t += 0.02), g.step();
      clock.t = t0;
      g.step();
      const side = i % 2 ? "right" : "left";
      const c = { side, x: side === "left" ? 60 : W - 60, y: ROWS.yOf(n.step), w: W, h: 390 } as const;
      const id = i + 1;
      g.down(id, c, performance.now());
      let y = c.y;
      let x = c.x;
      during(g, i, (dy, dx, ms) => {
        clock.t += ms / 1000;
        y += dy;
        x += dx;
        g.move(id, { ...c, x, y }, performance.now());
      });
      const end = g.timeAt(n.on + n.dur);
      clock.t = Math.max(clock.t, end - 0.03);
      g.step();
      g.up(id, performance.now());
    });
    while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), g.step();
    return { r: g.results(), g, heard };
  } finally {
    Object.defineProperty(performance, "now", { value: realNow, configurable: true, writable: true });
  }
}
const shakeOn = (move: (dy: number, dx: number, ms: number) => void, legs: number, first: 1 | -1, amp = 12, ms = 45) => {
  for (let k = 0; k < legs; k++) {
    const up = k % 2 === 0 ? first : -first;
    move(-up * amp * 0.5, 0, ms / 2);
    move(-up * amp * 0.5, 0, ms / 2);
  }
};

test("D314: free ornaments in a fugue: they sound, the notes stay right, the score is the same", () => {
  const long = (g: ProtoGame, i: number) => {
    const n = g.tracks[0].notes[i];
    return n.dur >= g.f.tpq && !g.ornamentAt(0, i);
  };
  const plain = play("wtc1f02", 0, () => {});
  const shaken = play("wtc1f02", 0, (g, i, move) => {
    if (long(g, i)) shakeOn(move, i % 3 === 0 ? 2 : 4, i % 3 === 0 ? -1 : 1);
  });
  assert.ok(shaken.g.freeOrns.mordents > 3, `mordents ${JSON.stringify(shaken.g.freeOrns)}`);
  assert.ok(shaken.g.freeOrns.trills > 3, `trills ${JSON.stringify(shaken.g.freeOrns)}`);
  assert.equal(shaken.r.right, plain.r.right, "the notes as right as without");
  assert.equal(shaken.r.of, plain.r.of);
  assert.equal(shaken.r.score, plain.r.score, "a free ornament earns nothing and costs nothing");
  assert.ok(shaken.heard.length > plain.heard.length + 20, "the ornaments' notes sound");
});

test("D314: sideways expression and a slow drift on a held note never become an ornament", () => {
  const r = play("wtc1f02", 0, (g, i, move) => {
    if (g.tracks[0].notes[i].dur < g.f.tpq) return;
    // A fast sideways wobble (D311's sustain), then a slow drift along the bar.
    for (let k = 0; k < 6; k++) move(4 * (k % 2 ? -1 : 1), 30 * (k % 2 ? -1 : 1), 40);
    for (let k = 0; k < 6; k++) move(-3, 0, 90);
  });
  assert.deepEqual(r.g.freeOrns, { mordents: 0, shorts: 0, trills: 0 });
});

test("D314: a fugue's written ornament is shaken as in the tutorial: counted, praised, scored (and a free shake does not replace it)", () => {
  // I/6: the subject's trill in every entry (D277); the soprano carries some.
  const f = fugueById("wtc1f06");
  const orn = ornamentsOf(f);
  const voice = [0, 1, 2].find((v) => f.voices[v].some((n) => orn.has(`${v}:${n[0]}`)))!;
  const still = play("wtc1f06", voice, () => {});
  const r = play("wtc1f06", voice, (g, i, move) => {
    if (g.ornamentAt(0, i)) shakeOn(move, 4, 1, 12, 50);
  });
  assert.ok(r.r.shakes.of > 0 && r.r.shakes.of === still.r.shakes.of);
  assert.ok(r.r.shakes.hit >= r.r.shakes.of - 1, `shaken ${r.r.shakes.hit} of ${r.r.shakes.of}`);
  assert.equal(still.r.shakes.hit, 0);
  assert.ok(r.r.score > still.r.score, "points as the tutorial gives them");
  assert.equal(r.g.freeOrns.trills + r.g.freeOrns.mordents + r.g.freeOrns.shorts, 0, "a written ornament is not a free one");
});

// ---- The strong side ----

test("D314: one switch decides the strong side; the judging and the sound read it through barDynamic", () => {
  const bw = W * BAR;
  assert.ok(STRONG_SIDE === "outer" || STRONG_SIDE === "inner");
  // The left bar's outer edge is x = 0, its inner edge x = bw.
  assert.equal(barAcross(1, W) > 0.99, true);
  assert.equal(barAcross(bw - 1, W) < 0.01, true);
  assert.equal(barDynamic(1, W), strengthOf(barAcross(1, W)));
  assert.equal(barDynamic(W - 1, W), strengthOf(barAcross(W - 1, W)));
  assert.equal(strengthOf(strengthOf(0.3)), 0.3, "the flip is its own inverse (places drawn from strengths)");
  if (STRONG_SIDE === "outer") assert.ok(barDynamic(1, W) > 0.9);
  else assert.ok(barDynamic(1, W) < 0.1);
});
