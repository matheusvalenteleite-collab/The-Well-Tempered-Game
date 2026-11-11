/**
 * The design studio (D651–D653, the owner's verdicts on the play-screen previews): the building map in the box's foot,
 * a light filling each sounding note, every voice full height; the play line stays where it was; no preview flags left.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D652: a light fills each sounding note, every voice (the player's at full strength, the others' at half); rectangles", () => {
  const mb = src("src/touch/MusicBox.tsx");
  assert.match(mb, /if \(sounding\) innerAnim\(g, x1, y, bw, th, o\.on, o\.dur, fr\.now, 0\.5\);/);
  assert.match(mb, /innerAnim\(g, x1, y, fw, bh - 1, n\.on, n\.dur, fr\.now, 1\);/);
  const fn = mb.slice(mb.indexOf("function innerAnim"));
  assert.ok(!/beginPath|arc\(|stroke/.test(fn.slice(0, fn.indexOf("\n}\n"))));
});

test("D653: every voice's note full height, clearly lit; the shadow at a third; the play line where it was; no flags", () => {
  const mb = src("src/touch/MusicBox.tsx");
  assert.match(mb, /const th = full \? bh - 1 : oh;/);
  assert.match(mb, /g\.globalAlpha = sounding \? 1 : 0\.85;/);
  assert.match(mb, /const LIGHT = \{ dim: 0\.06, shadow: 0\.14,/);
  assert.match(mb, /const PLAYHEAD = 0\.25;/);
  assert.ok(!existsSync(new URL("../src/touch/preview-flags.ts", import.meta.url)));
});
