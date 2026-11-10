/**
 * The design studio (D472 addendum): the play area declares itself tappable, so a phone browser's touch adjustment never
 * moves a thumb on the lowest row onto a stop just below it (STRING CONSORT's left-thumb dead zone). The live check is
 * tools/touch/thumb-reach.cjs (on the built game).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("D472 addendum: the play area carries its own click listener (tappable to the browser), removed on unmount", () => {
  const s = src("src/touch/PlayArea.tsx");
  assert.match(s, /el\.addEventListener\("click", tappable\);\s*return \(\) => el\.removeEventListener\("click", tappable\);/);
  assert.ok(existsSync(new URL("../tools/touch/thumb-reach.cjs", import.meta.url)), "the live check");
  // The stops still take their own presses on pointerdown, and the strips none between their buttons.
  assert.match(src("src/bench/bench.css"), /\.tb-stops-side \{ pointer-events: none; \}/);
});
