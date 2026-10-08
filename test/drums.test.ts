import { test } from "node:test";
import assert from "node:assert/strict";
import { DRUM_PATTERNS, hitsForBar, loopFraction, scaleLoop, validLoopLength } from "../src/audio/drums.ts";

test("every pattern line has exactly `steps` characters of the step alphabet", () => {
  for (const p of DRUM_PATTERNS) {
    for (const lines of [p.loop, p.fill ?? {}]) for (const [v, line] of Object.entries(lines)) assert.match(line, new RegExp(`^[Xxg.]{${p.steps}}$`), `${p.id}.${v}`);
    assert.ok(p.end.length > 0, p.id);
  }
  assert.equal(new Set(DRUM_PATTERNS.map((p) => p.id)).size, DRUM_PATTERNS.length);
});

test("loop length: x2 spreads one loop over two bars, /2 plays it twice in a bar", () => {
  const kicks = (length: number, bar: number) => hitsForBar({ pattern: "rock", length, level: 1 }, bar, 10).filter(([v]) => v === "kick").map(([, , at]) => at);
  assert.deepEqual(kicks(1, 3), [0, 0.5]);
  assert.deepEqual(kicks(2, 3), [0]); // second half of a two-bar loop: the kick at step 8 lands on bar 3's downbeat
  assert.deepEqual(kicks(2, 2), [0]);
  assert.deepEqual(kicks(0.5, 3), [0, 0.25, 0.5, 0.75]);
});

test("loop factors 2 and 1.5 (D70): exact fractions, range 1/8..8, a 2/3-bar loop is a triplet feel", () => {
  assert.equal(scaleLoop(1, 1.5), 1.5);
  assert.deepEqual(loopFraction(scaleLoop(1, 1 / 1.5)!), [2, 3]);
  let l = 1;
  for (let i = 0; i < 3; i++) l = scaleLoop(l, 1 / 1.5)!;
  assert.deepEqual(loopFraction(l), [8, 27]);
  assert.equal(scaleLoop(8, 1.5), null);
  assert.equal(scaleLoop(1 / 8, 1 / 2), null);
  assert.ok(validLoopLength(2 / 3) && !validLoopLength(0.1) && !validLoopLength("1"));
  // Kicks of "rock" (steps 0 and 8 of 16) over a loop of 2/3 bar: every third of a bar.
  const kicks = hitsForBar({ pattern: "rock", length: 2 / 3, level: 1 }, 1, 4).filter(([v]) => v === "kick").map(([, , at]) => Math.round(at * 1000) / 1000);
  assert.deepEqual(kicks, [0, 0.333, 0.667]);
});

test("openings, fills and endings", () => {
  const at = (bar: number) => hitsForBar({ pattern: "timpani", length: 1, level: 1 }, bar, 8).map(([v]) => v);
  assert.deepEqual(at(7), ["timpTonic", "cymbals"]);
  assert.ok(at(6).every((v) => v === "timpFifth"));
  assert.ok(hitsForBar({ pattern: "rock", length: 1, level: 1 }, 0, 8).some(([v]) => v === "crash"));
});

test("looping (D72): no final crash; the last bar rolls back into bar 1", async () => {
  const { hitsForBar } = await import("../src/audio/drums.ts");
  const last = hitsForBar({ pattern: "rock", length: 1, level: 1 }, 7, 8, true);
  assert.ok(last.length > 4 && !last.some(([v]) => v === "crash"));
  assert.ok(last.some(([v, , at]) => v.startsWith("tom") && at > 0.5));
  // A pattern without a fill gets the snare roll; the bar before keeps the groove.
  const bossa = hitsForBar({ pattern: "bossa", length: 1, level: 1 }, 7, 8, true);
  assert.ok(bossa.filter(([v]) => v === "snare").length >= 6);
  assert.deepEqual(hitsForBar({ pattern: "rock", length: 1, level: 1 }, 6, 8, true), hitsForBar({ pattern: "rock", length: 1, level: 1 }, 2, 8, true));
  // Not looping: the ending as before.
  assert.deepEqual(hitsForBar({ pattern: "rock", length: 1, level: 1 }, 7, 8).map(([v]) => v), ["kick", "crash"]);
});

test("kits (D71): machine patterns bring their machine; any kit can be chosen", async () => {
  const { kitOf, DRUM_KITS, DRUM_PATTERNS } = await import("../src/audio/drums.ts");
  assert.equal(kitOf({ pattern: "house", length: 1, level: 1 }), "tr909");
  assert.equal(kitOf({ pattern: "rock", length: 1, level: 1 }), "studio");
  assert.equal(kitOf({ pattern: "rock", length: 1, level: 1, kit: "tr808" }), "tr808");
  for (const p of DRUM_PATTERNS) if (p.kit) assert.ok(DRUM_KITS.includes(p.kit), p.id);
  assert.equal(DRUM_PATTERNS.filter((p) => p.family === "machines").length, 7);
});
