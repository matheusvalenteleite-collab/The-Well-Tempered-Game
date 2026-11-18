/**
 * D727: THE ART OF FUGUE's own tab on play.html: its twenty pieces in the edition's order, out of MORE BACH,
 * NEXT within them; shown to everyone once dressed (AOF_FOR_ALL), until then behind the unlock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { AOF_FOR_ALL, AOF_IDS, LITE_TABS, liteNextOrder, liteTabOf, liteTabs } from "../src/bench/lite.ts";
import { aofLabel } from "../src/bench/aof-label.ts";

test("D727: twenty pieces in the edition's order, the unfinished 14 last; their own tab; NEXT among them", () => {
  assert.equal(AOF_IDS.length, 20);
  assert.equal(AOF_IDS[0], "bwv1080-01");
  assert.equal(AOF_IDS.at(-1), "bwv1080-14");
  assert.deepEqual(AOF_IDS.slice(11, 15), ["bwv1080-12r", "bwv1080-12i", "bwv1080-13r", "bwv1080-13i"]);
  for (const id of AOF_IDS) assert.equal(liteTabOf(id), "AOF", id);
  assert.deepEqual(liteNextOrder("bwv1080-03"), [...AOF_IDS]);
  assert.deepEqual(LITE_TABS.map(([t]) => t), ["I", "II", "AOF", "INV", "GOLD", "MORE", "CHORALES"]);
});

test("D727: for the friends the tab waits for its dressing (AOF_FOR_ALL)", () => {
  const tabs = liteTabs().map(([t]) => t);
  assert.equal(tabs.includes("AOF"), AOF_FOR_ALL);
  assert.ok(tabs.includes("I") && tabs.includes("II"));
});

test("D727: a tile says its number and kind", () => {
  assert.equal(aofLabel("bwv1080-07").n, "7");
  assert.equal(aofLabel("bwv1080-12i").sub, "INVERSUS");
  assert.equal(aofLabel("bwv1080-c15").n, "CANON");
  assert.equal(aofLabel("bwv1080-14").sub, "UNFINISHED");
});
