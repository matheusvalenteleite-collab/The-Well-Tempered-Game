/** D698 (design studio): the ornament hint (and any line over the box) fits between the side bars: two lines when one will not. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { textWidth } from "../src/touch/box-fx.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { bannerLines } = await import("../src/touch/MusicBox.tsx");

const EN = "A SIGN OVER A NOTE: TOUCH IT, THEN SHAKE YOUR THUMB";

test("the hint breaks at its colon into two lines that fit where one does not (en, pt, es)", () => {
  for (const t of [EN, PT[EN], ES[EN]]) {
    const one = textWidth(t);
    // 667×375's box between the bars is about 375 CSS px, 187 box px; the margins 12.
    const room = 175;
    const lines = bannerLines(t, room);
    if (one <= room) assert.deepEqual(lines, [t]);
    else {
      assert.equal(lines.length, 2, t);
      for (const l of lines) assert.ok(textWidth(l) <= room, `${l}: ${textWidth(l)}`);
      assert.match(lines[0], /:$/, t);
    }
  }
  assert.deepEqual(bannerLines("HALF CADENCE", 400), ["HALF CADENCE"]);
});
