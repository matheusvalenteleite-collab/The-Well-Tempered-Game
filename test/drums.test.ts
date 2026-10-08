import { test } from "node:test";
import assert from "node:assert/strict";
import { DRUM_PATTERNS, hitsForBar, LOOP_LENGTHS } from "../src/audio/drums.ts";

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
  assert.deepEqual(LOOP_LENGTHS, [0.25, 0.5, 1, 2, 4]);
});

test("openings, fills and endings", () => {
  const at = (bar: number) => hitsForBar({ pattern: "timpani", length: 1, level: 1 }, bar, 8).map(([v]) => v);
  assert.deepEqual(at(7), ["timpTonic", "cymbals"]);
  assert.ok(at(6).every((v) => v === "timpFifth"));
  assert.ok(hitsForBar({ pattern: "rock", length: 1, level: 1 }, 0, 8).some(([v]) => v === "crash"));
});
