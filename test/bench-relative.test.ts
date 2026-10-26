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
    for (const k of ["RANDOM in box", "SAME spot"]) assert.ok(play(id, v, MODELS[k]) <= 20, `${id}/${v} ${k}: ${play(id, v, MODELS[k])}%`);
  }
});
