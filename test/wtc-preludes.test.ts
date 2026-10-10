import { test } from "node:test";
import assert from "node:assert/strict";
import { PIECES, figuredBars, pieceEvents } from "../src/wtc/preludes.ts";

test("prelude plans: 1/2, 1/5, 1/6, Bach's bar once among each figured bar's choices", () => {
  assert.deepEqual(PIECES.map((p) => p.id), ["wtc1p02", "wtc1p05", "wtc1p06"]);
  for (const p of PIECES) {
    const fig = figuredBars(p);
    assert.ok(fig.length >= 10, p.id);
    for (const b of fig) {
      assert.equal(b.choices!.filter((c) => c.bach).length, 1);
      assert.ok(b.choices!.length >= 2 && b.choices!.length <= 4);
      for (const c of b.choices!) {
        assert.equal(c.pitches.length, p.pattern.length);
        // the left hand is always Bach's
        const bach = b.choices!.find((x) => x.bach)!;
        c.pitches.forEach((x, i) => p.pattern[i].hand === "lower" && assert.equal(x, bach.pitches[i]));
      }
    }
  }
});

test("prelude plans: Bach's plan sounds every note of the Mutopia text", () => {
  for (const p of PIECES) {
    const fig = figuredBars(p);
    const ev = pieceEvents(p, fig.map((b) => b.choices!.findIndex((c) => c.bach)));
    const free = p.bars.filter((b) => !b.figured).reduce((a, b) => a + b.notes!.length, 0);
    assert.equal(ev.length, fig.length * p.pattern.length + free);
  }
});
