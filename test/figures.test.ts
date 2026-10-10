import { test } from "node:test";
import assert from "node:assert/strict";
import { conventionalFigure as f } from "../src/continuo/figures.ts";

test("D101: figures as written in thorough bass — abbreviated, accidentals alone for the third, a stroke for a raised 6", () => {
  assert.deepEqual(f("5/3"), []);
  assert.deepEqual(f("8/5/3"), []);
  assert.deepEqual(f("8"), []);
  assert.deepEqual(f("5/♯3"), ["♯"]);
  assert.deepEqual(f("5/♭3"), ["♭"]);
  assert.deepEqual(f("6/3"), ["6"]);
  assert.deepEqual(f("♯6/3"), ["6\\"]);
  assert.deepEqual(f("6/♯3"), ["6", "♯"]);
  assert.deepEqual(f("♭6/3"), ["♭6"]);
  assert.deepEqual(f("6/4"), ["6", "4"]);
  assert.deepEqual(f("6/♯4"), ["6", "4\\"]);
  assert.deepEqual(f("7/5/♯3"), ["7", "♯"]);
  assert.deepEqual(f("6/5/3"), ["6", "5"]);
  assert.deepEqual(f("6/4/3"), ["4", "3"]);
  assert.deepEqual(f("♭5/3"), ["♭5"]);
  assert.deepEqual(f("c.p."), ["c.p."]);
});

test("D101: a suspension keeps its resolution (9 8 shows the 8); the common chord is left unfigured", async () => {
  const { cueFigures } = await import("../src/ui/notation/continuo-staff.ts");
  const bar = (figure: string, extra = {}) => ({ bar: 0, figure, chordPcs: [], chord: [], fallback: false, notes: [], bass: "", rh: [], cost: 0, ...extra });
  const r = { bars: [bar("9 8", { device: "98" }), bar("5/3", { bar: 1 }), bar("♯6/3", { bar: 2 })] } as never;
  const figs = cueFigures(r).map((x) => `${x.bar}${x.half}:${x.stack.join("/")}`);
  assert.deepEqual(figs, ["00:9", "01:8", "20:6\\"]);
});
