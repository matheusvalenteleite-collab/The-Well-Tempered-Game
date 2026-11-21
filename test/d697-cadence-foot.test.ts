/** D697 (design studio): a cadence's mark and name are drawn above what lies over the roll's foot (the voice legend), never under it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cadenceMarks } from "../src/touch/box-fx.ts";

function ctx() {
  const texts: { y: number }[] = [];
  const rects: number[] = [];
  const g = { globalAlpha: 1, fillStyle: "", fillRect: (_x: number, y: number) => rects.push(y), fillText: () => {}, measureText: () => ({ width: 10 }), drawImage: () => {} } as unknown as CanvasRenderingContext2D;
  return { c: { g, w: 300, h: 120, left: 0, play: 50, xOf: (t: number) => 50 + t / 10, yOf: () => 0, hOf: () => 4, bh: 4, now: 500, tps: 480, gold: "#fc0", miss: "#f00", fg: "#fff", ink: () => "#fff" } as never, rects, texts };
}

test("the cadence mark sits above the foot", () => {
  const a = ctx();
  cadenceMarks(a.c, [{ on: 500, text: "HALF CADENCE" }], 0);
  const b = ctx();
  cadenceMarks(b.c, [{ on: 500, text: "HALF CADENCE" }], 20);
  assert.ok(a.rects.length > 0);
  assert.ok(Math.max(...b.rects) <= 120 - 20, `${b.rects}`);
  assert.deepEqual(b.rects.map((y) => y + 20), a.rects);
});

test("two cadences close together: one name at a time (the later's mark only)", () => {
  const two = ctx();
  cadenceMarks(two.c, [{ on: 500, text: "IMPERFECT CADENCE · A MINOR" }, { on: 600, text: "FULL CADENCE · A MINOR" }], 20);
  const one = ctx();
  cadenceMarks(one.c, [{ on: 500, text: "IMPERFECT CADENCE · A MINOR" }], 20);
  // The second adds its mark (a few rects), not a name (dozens of pixel rects).
  assert.ok(two.rects.length - one.rects.length <= 4, `${two.rects.length} vs ${one.rects.length}`);
  const apart = ctx();
  cadenceMarks(apart.c, [{ on: 500, text: "IMPERFECT CADENCE · A MINOR" }, { on: 2400, text: "FULL" }], 20);
  assert.ok(apart.rects.length - one.rects.length > 4, "far apart: both named");
});
