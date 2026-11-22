/**
 * D971 (canons session; the owner on 3.14: "The morph color could gradually shift from home color to target color, in
 * sync with movement"): a shape's colour is a function of its flight's progress, the same eased progress as its
 * position: exactly the leader's ink at lift-off, exactly the follower's at landing, and in between as far along as the
 * shape itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { ribbonShapes, phase, colourOf } from "../src/touch/canon-ribbon.ts";
import type { EchoGeo } from "../src/touch/canon-echo.ts";

const INK = ["#5cb2ff", "#ff8c4a", "#5fe08a"];
const k = { ink: (v: number) => INK[v] } as unknown as EchoGeo;
const rgb = (c: string) => (c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g)!.map(Number));

test("Var. 12: the colour moves with the shape, leader's ink at lift-off, follower's at landing", async () => {
  await loadExtras();
  const f = fugueById("bwv988-12");
  const s = ribbonShapes(f).find((x) => x.shown && x.A[0].voice !== x.T[0].voice)!;
  const from = rgb(INK[s.A[0].voice]), to = rgb(INK[s.T[0].voice]);
  assert.deepEqual(rgb(colourOf(s, phase(s, s.start), k)), from);
  assert.deepEqual(rgb(colourOf(s, phase(s, s.fly), k)), from);
  assert.deepEqual(rgb(colourOf(s, phase(s, s.landed), k)), to);
  for (const f2 of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const t = s.fly + (s.landed - s.fly) * f2, ph = phase(s, t), c = rgb(colourOf(s, ph, k));
    // as far from the leader's ink as the shape is along its flight (to the rounding of a channel)
    for (let ch = 0; ch < 3; ch++) assert.ok(Math.abs(c[ch] - (from[ch] + (to[ch] - from[ch]) * ph.u)) <= 1, `${f2} ${ch}`);
  }
});
