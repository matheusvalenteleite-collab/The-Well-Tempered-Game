/**
 * The design studio (D499): the fugue pictures on the selection screen whole, never cropped, scaled cleanly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fitOf, INTEGER_MIN } from "../src/bench/emblem-fit.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D499: the picture fits whole: a whole multiple of device pixels where it fills enough, else an exact fit", () => {
  // iPhone 844 card (76 × 49 at 3×): 3 device px a pixel, 64 × 40 CSS px.
  assert.deepEqual(fitOf(76, 49, 3), { w: 64, h: 40, whole: true });
  // the 667 card at 3× (59 × 51): 2× would fill 72%, so an exact fit.
  const s = fitOf(59, 51, 3);
  assert.equal(s.whole, false);
  assert.ok(Math.abs(s.w - 59) < 1e-9 && Math.abs(s.h - 36.875) < 1e-9);
  for (const [w, h, d] of [[76, 49, 2], [59, 51, 2], [110, 166, 2], [153, 150, 3], [220, 348, 2], [30, 20, 1]] as const) {
    const f = fitOf(w, h, d);
    assert.ok(f.w <= w + 1e-9 && f.h <= h + 1e-9, "never larger than the slot: never cropped");
    assert.ok(Math.abs(f.w / f.h - 64 / 40) < 1e-9, "its own 64:40");
    if (f.whole) assert.ok(Number.isInteger(Math.round((f.w * d) / 64 * 1e6) / 1e6) && f.w * d >= 64);
    const exact = Math.min((w * d) / 64, (h * d) / 40);
    if (f.whole) assert.ok((f.w * d) / 64 >= INTEGER_MIN * exact - 1e-9);
  }
});

test("D499: the cards and the panel use the whole picture (no fixed crop position); the words under the picture; D499b: the panel's frame in the picture's own shape", () => {
  const sel = src("src/bench/Selection.tsx");
  assert.match(sel, /<FitEmblem id=\{id\} className="sel-emblem" \/>/);
  assert.match(sel, /<FitEmblem id=\{piece\} className="sel-piece-emblem" cover \/>/);
  const css = src("src/bench/selection.css");
  const tail = css.slice(css.indexOf("D499 (design studio"));
  assert.ok(!/object-fit: cover|object-position/.test(tail));
  assert.match(tail, /\.sel-right \.sel-piece-pic \{ flex: none; width: 100%; height: auto; aspect-ratio: 64 \/ 40;/);
  assert.match(tail, /\.sel-tile \.sel-tile-words \{ position: static; flex: none;/);
});
