import { test } from "node:test";
import assert from "node:assert/strict";
import { linkOf, parseLink } from "../src/ui/wtc-link.ts";
import { playhead } from "../src/ui/playhead.ts";
import { barIndex } from "../src/wtc/engrave.ts";
import { LIBRARY } from "../src/wtc/library.ts";

test("study links: piece, bar, passage", () => {
  assert.deepEqual(parseLink("#wtc1.02f@12"), { id: "wtc1.02", piece: "fugue", bar: 12, to: null });
  assert.deepEqual(parseLink("#wtc2.03p@25-28"), { id: "wtc2.03", piece: "prelude", bar: 25, to: 28 });
  assert.deepEqual(parseLink("#wtc1.10f"), { id: "wtc1.10", piece: "fugue", bar: null, to: null });
  assert.equal(parseLink("#wtc3.01f"), null);
  assert.equal(parseLink("#something"), null);
  for (const h of ["#wtc1.02f@12", "#wtc2.03p@25-28", "#wtc1.10f", "#wtc2.13f@0"]) assert.equal(linkOf(parseLink(h)!), h);
});

test("playhead: clock seconds to score quarters, stretch by stretch", () => {
  let now = 10;
  playhead.start(() => now, [{ t0: 10, t1: 12, q0: 4, q1: 8 }, { t0: 12.5, t1: 13.5, q0: 20, q1: 22 }], 2);
  assert.equal(playhead.pos(), 4);
  now = 11;
  assert.equal(playhead.pos(), 6);
  now = 12.2; // the breath between two stretches
  assert.equal(playhead.pos(), null);
  now = 13;
  assert.equal(playhead.pos(), 21);
  playhead.stop();
  assert.equal(playhead.pos(), null);
  assert.equal(playhead.active, false);
});

test("bars: the encoding's bar lines (a change of metre, a pickup)", () => {
  const p = LIBRARY.find((x) => x.id === "wtc2.03")!.prelude();
  assert.equal(p.barStarts.length - 1, 50);
  assert.equal(p.meters[23], "4/4");
  assert.equal(p.meters[24], "3/8");
  assert.equal(p.barStarts[25] - p.barStarts[24], 1.5);
  assert.equal(barIndex(p.barStarts, p.barStarts[30] + 0.1), 30);
  const f = LIBRARY.find((x) => x.id === "wtc2.13")!.fugue();
  assert.equal(f.pickup, 1);
  assert.equal(f.barStarts[0], 2); // a half-bar pickup in 2/2, drawn short
});
