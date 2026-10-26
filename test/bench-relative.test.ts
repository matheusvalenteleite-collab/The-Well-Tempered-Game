/** D286: on a phone, relative moves count, not where the thumbs rest: two thumbs held at different heights still play right; the wrong way does not. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
const fakeChip = (clock: { t: number }) => ({ ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }), swoosh() {}, tick() {} }) as unknown as Chip;
const RH = 9; // a drawn row on an iPhone: a ~270 px box over ~30 staff steps
const ROWS: Rows = { yOf: (s) => 300 - s * RH, stepAt: (y) => Math.round((300 - y) / RH), rowH: RH, xOf: () => 400 };
type Model = (p: { step: number; side: "left" | "right"; i: number; prevOwn?: { y: number; step: number }; first: number }) => number;
function play(id: string, voice: number, model: Model) {
  const clock = { t: 0 };
  const f = fugueById(id);
  const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until: f.length, wait: false, solo: false, fail: false }, fakeChip(clock));
  g.rows = ROWS;
  const run = (t: number) => { while (clock.t < t - 0.05) (clock.t += 0.05), g.step(); clock.t = Math.max(clock.t, t); g.step(); };
  const notes = g.tracks[0].notes.map((n, i) => ({ n, i })).filter(({ n, i }, _, a) => !n.ride && !(i > 0 && g.tracks[0].notes[i - 1].on === n.on));
  let id2 = 0; let side: "left" | "right" = "left";
  const own: Record<string, { y: number; step: number } | undefined> = {};
  const first = notes[0]?.n.step ?? 0;
  notes.forEach(({ n }, i) => {
    run(g.timeAt(n.on));
    const y = model({ step: n.step, side, i, prevOwn: own[side], first });
    g.down(++id2, { side, x: side === "left" ? 40 : 800, y, w: 844, h: 390 }, performance.now());
    g.up(id2, performance.now());
    own[side] = { y, step: n.step };
    side = side === "left" ? "right" : "left";
  });
  run(g.timeAt(g.end + 1));
  const r = g.results();
  return Math.round((100 * r.right) / r.of);
}
const MODELS: Record<string, Model> = {
  exact: ({ step }) => ROWS.yOf(step),
  "thumbs 30px apart": ({ step, side }) => ROWS.yOf(step) + (side === "left" ? 15 : -15),
  "thumbs 60px apart": ({ step, side }) => ROWS.yOf(step) + (side === "left" ? 30 : -30),
  "thumbs 90px apart": ({ step, side }) => ROWS.yOf(step) + (side === "left" ? 45 : -45),
  "scale ×0.6 (small gestures)": ({ step, first }) => ROWS.yOf(first) - (step - first) * RH * 0.6,
  "scale ×0.4": ({ step, first }) => ROWS.yOf(first) - (step - first) * RH * 0.4,
  "jitter ±0.5 row": ({ step, i }) => ROWS.yOf(step) + (((i * 7919) % 101) / 101 - 0.5) * RH,
  "60px apart + jitter": ({ step, side, i }) => ROWS.yOf(step) + (side === "left" ? 30 : -30) + (((i * 7919) % 101) / 101 - 0.5) * RH,
  "INVERTED contour": ({ step, first }) => ROWS.yOf(first) + (step - first) * RH,
  "INVERTED, thumbs 60px apart": ({ step, first, side }) => ROWS.yOf(first) + (step - first) * RH + (side === "left" ? 30 : -30),
  "RANDOM in box": ({ i }) => 60 + ((i * 7919) % 97) / 97 * 220,
  "SAME spot": () => 200,
};
test("D286: the ladder judges each thumb's moves, not the two thumbs' level", () => {
  for (const [id, v] of [["wtc1f02", 0], ["wtc2f13", 1], ["wtc1f07", 0], ["inv01", 0]] as const) {
    for (const k of ["exact", "thumbs 60px apart", "thumbs 90px apart", "scale ×0.4", "60px apart + jitter"]) assert.ok(play(id, v, MODELS[k]) >= 98, `${id}/${v} ${k}: ${play(id, v, MODELS[k])}%`);
    // D289: a row's leeway for a step (the owner's choice): a step's direction is no longer judged at a
    // drawn row of 8-9 px (finer than a thumb lands), only leaps; an inverted contour keeps up to about 3/4.
    for (const k of ["INVERTED contour", "INVERTED, thumbs 60px apart"]) assert.ok(play(id, v, MODELS[k]) <= 75, `${id}/${v} ${k}: ${play(id, v, MODELS[k])}%`);
    // D296: with no window round the drawn note, tapping anywhere scores only where the tune allows it.
    for (const k of ["RANDOM in box", "SAME spot"]) assert.ok(play(id, v, MODELS[k]) <= 50, `${id}/${v} ${k}: ${play(id, v, MODELS[k])}%`);
  }
});

// D296: players moving each thumb from its own last touch, at their own scale, anywhere on the bar.
const H = 390;
function relModel(scale: number, start: Record<string, number>, jitter = 0): Model {
  const pos: Record<string, { y: number; step: number } | undefined> = {};
  return ({ step, side, i }) => {
    const p = pos[side];
    let y = (p ? p.y - (step - p.step) * scale : start[side]) + (jitter ? (((i * 7919) % 101) / 101 - 0.5) * 2 * jitter : 0);
    y = Math.max(4, Math.min(H - 30, y));
    pos[side] = { y, step };
    return y;
  };
}
test("D296: the whole bar is playable: only each thumb's own moves count, not where the note is drawn", () => {
  for (const [id, v] of [["wtc1f02", 0], ["wtc2f13", 1], ["inv01", 0], ["wtc2f22", 1]] as const) {
    const honest: Record<string, Model> = {
      "the whole hand 120 px off the notes": ({ step, side }) => ROWS.yOf(step) - 120 + (side === "left" ? 0 : 10),
      "own scale 15 px a step, from the top and the bottom": relModel(15, { left: 40, right: 300 }),
      "own scale 15 px a step, ±8 px scatter": relModel(15, { left: 40, right: 300 }, 8),
      "big moves, 25 px a step, against the ends": relModel(25, { left: 180, right: 180 }),
    };
    for (const [k, m] of Object.entries(honest)) assert.ok(play(id, v, m) >= 97, `${id}/${v} ${k}: ${play(id, v, m)}%`);
    // Parked at an end from the start: no further to come from, so no more than tapping anywhere in one spot.
    assert.ok(play(id, v, () => 10) <= play(id, v, () => 200) + 2, `${id}/${v} tapping at the top: ${play(id, v, () => 10)}%`);
    assert.ok(play(id, v, () => 200) <= 70, `${id}/${v} tapping in one spot: ${play(id, v, () => 200)}%`);
  }
});
