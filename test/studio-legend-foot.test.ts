/**
 * The design studio (D473): the voice legend a small translucent strip over the roll's foot, at the very bottom of the
 * screen, on every sound; the roll running to the glass; the ladder's rows kept clear of what lies over its foot.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ladderHeight, ladderRows } from "../src/touch/box-zoom.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D473: the legend overlays the roll's foot, one line, taking no touch; the roll keeps no foot padding", () => {
  const css = src("src/bench/bench.css");
  assert.match(css, /\.tb-bars \.tg-box-wide \{ grid-template-rows: auto 1fr; padding-bottom: 0; border-bottom: 0; \}/);
  assert.match(css, /\.tb-bars \.tg-box-wide > \.tg-legend \{ position: absolute;[^}]*bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 2px\);[^}]*height: 16px;[^}]*flex-wrap: nowrap;[^}]*pointer-events: none; \}/);
  // D496: OBBLIGATO retired, its button and its invisible slot with it.
  assert.doesNotMatch(css, /\.tb-obbligato/);
});

test("D473: MusicBox measures what lies over the foot; the drawing and the touch rows share the floor", () => {
  const mb = src("src/touch/MusicBox.tsx");
  assert.match(mb, /const FOOT_OVER = "\.tg-legend, \.tb-stops-side";/);
  assert.match(mb, /ladderHeight\(cssH, floorOf\(cssH, fr\.floor \?\? 0, fr\.foot \?\? 0\)\)/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /const fl = floorOf\(r\.height, boxFloor\);/);
  assert.match(app, /ladderGeometry\(zv\.lo, zv\.hi, r\.height, fl, zv\.from, zv\.mix\)/);
  assert.doesNotMatch(app, /tb-obbligato-slot/);
});

test("D473: with the foot kept, the lowest row a note can ask for ends above what covers it", () => {
  // 844 × 390 and 667 × 375: the roll 354 / 339 px; the foot 32 px with stops, 20 px without (D496: OBBLIGATO's slot gone; it was 54 / 23 live).
  for (const [cssH, foot] of [[354, 32], [354, 20], [339, 32], [339, 20], [354, 54], [339, 54]]) {
    for (const [lo, hi] of [[-20, 20], [-14, 12], [-6, 6], [0, 3]]) {
      const h = ladderHeight(cssH, foot / cssH);
      const L = ladderRows(h, lo, hi);
      const lowestFoot = (L.a - (lo - 1) * L.rowH + L.rowH) * 2;
      assert.ok(lowestFoot <= cssH - foot + 1, `${cssH}/${foot} ${lo}..${hi}: ${lowestFoot} > ${cssH - foot}`);
    }
  }
});
