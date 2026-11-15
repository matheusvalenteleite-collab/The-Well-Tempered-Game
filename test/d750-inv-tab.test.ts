/**
 * D750: THE INVENTIONS AND SINFONIAS' own tab on play.html: the 15 Inventions then the 15 Sinfonias (BWV
 * 772–801), out of MORE BACH, NEXT within them; standard titles; behind INV_FOR_ALL until dressed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { INV_FOR_ALL, INV_IDS, liteNextOrder, liteTabOf, liteTabs, MORE_SECTIONS, OWN_TAB_SECTIONS } from "../src/bench/lite.ts";
import { invOf } from "../src/bench/aof-label.ts";

test("D750: thirty pieces, Inventions 1–15 then Sinfonias 1–15; their own tab; NEXT among them; not in MORE BACH", () => {
  assert.equal(INV_IDS.length, 30);
  assert.deepEqual([INV_IDS[0], INV_IDS[14], INV_IDS[15], INV_IDS[29]], ["bwv772", "bwv786", "bwv787", "bwv801"]);
  for (const id of INV_IDS) assert.equal(liteTabOf(id), "INV", id);
  assert.deepEqual(liteNextOrder("bwv790"), [...INV_IDS]);
  const more = liteNextOrder("bwv1079-ric3");
  assert.ok(!more.some((id) => INV_IDS.includes(id)), "MORE BACH's NEXT leaves them out");
  assert.ok(OWN_TAB_SECTIONS.includes("inv") && OWN_TAB_SECTIONS.includes("sin"));
  assert.ok(MORE_SECTIONS.some((s) => s.id === "mo"));
});

test("D750: each tile's number and kind from its BWV (standard titles)", () => {
  assert.deepEqual(invOf("bwv772"), { n: 1, kind: "INVENTION" });
  assert.deepEqual(invOf("bwv786"), { n: 15, kind: "INVENTION" });
  assert.deepEqual(invOf("bwv787"), { n: 1, kind: "SINFONIA" });
  assert.deepEqual(invOf("bwv801"), { n: 15, kind: "SINFONIA" });
  assert.equal(invOf("wtc1f01"), null);
  assert.equal(invOf("bwv1079-ric3"), null);
});

test("D750: for the friends the tab waits for its setting and sounds (INV_FOR_ALL)", () => {
  assert.equal(liteTabs().some(([t]) => t === "INV"), INV_FOR_ALL);
});
