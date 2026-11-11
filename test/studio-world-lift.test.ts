/**
 * The design studio (D650): the dark worlds lifted (the world, never the note band's veil); II/6's siege in the open box.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D650: a soft light screened over each dark world before the veil, at most 0.13; the world's shade 0.06", () => {
  const s = src("src/touch/stage-bg.ts");
  const table = /const WORLD_LIFT: Readonly<Record<string, number>> = \{([^}]*)\}/.exec(s)?.[1] ?? "";
  const lifts = [...table.matchAll(/(wtc[12]f\d\d): ([\d.]+)/g)].map((m) => Number(m[2]));
  assert.ok(lifts.length >= 20 && lifts.every((v) => v > 0 && v <= 0.13));
  assert.ok(s.indexOf('g.globalCompositeOperation = "screen";') < s.indexOf("// The veil: the world kept under the music"), "before the veil");
  assert.match(src("src/touch/MusicBox.tsx"), /const LIGHT = \{ dim: 0\.06,/);
});

test("D650: II/6's catapult and castle in the open box between the bars (22–78%)", () => {
  const s = src("src/touch/stage-bg.ts");
  const body = s.slice(s.indexOf("  wtc2f06: (k) => {"), s.indexOf("  wtc2f07: (k) => {"));
  assert.match(body, /const cxl = k\.w \* 0\.52;/);
  assert.match(body, /const fx = k\.w \* 0\.31;/);
});
