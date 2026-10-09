import { test } from "node:test";
import assert from "node:assert/strict";
import { DRUM_CUES, DRUM_KITS, DRUM_PATTERNS, hitsForBar, hitsForBreath, hitsForCue, LOOP_STEPS, loopFraction, padsFor, patternById, stepLoop, validLoopLength, variationB } from "../src/audio/drums.ts";

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

test("loop lengths (D99): the arrows step through plausible lengths; a 2/3-bar loop is a triplet feel", () => {
  // D102: 1, 2, 4, 8 together; then 3, 5, 6; no 8/3.
  assert.equal(stepLoop(1, 1), 2);
  assert.equal(stepLoop(2, 1), 4);
  assert.equal(stepLoop(4, 1), 8);
  assert.equal(stepLoop(8, 1), 3);
  assert.equal(stepLoop(5, 1), 6);
  assert.equal(stepLoop(6, 1), null);
  assert.equal(stepLoop(1, -1), 3 / 2);
  assert.equal(stepLoop(1 / 4, -1), null);
  assert.ok(!LOOP_STEPS.includes(8 / 3));
  assert.ok(LOOP_STEPS.every(validLoopLength));
  assert.ok(validLoopLength(2 / 3) && !validLoopLength(0.1) && !validLoopLength("1"));
  // Kicks of "rock" (steps 0 and 8 of 16) over a loop of 2/3 bar: every third of a bar.
  const kicks = hitsForBar({ pattern: "rock", length: 2 / 3, level: 1 }, 1, 4).filter(([v]) => v === "kick").map(([, , at]) => Math.round(at * 1000) / 1000);
  assert.deepEqual(kicks, [0, 0.333, 0.667]);
  assert.equal(patternById("funk").bars, 2);
});

test("feel (D99): swing delays the off sixteenths, accent widens the dynamics, mutes silence, B varies", () => {
  const rock = { pattern: "rock", length: 1, level: 1 };
  const hats = (s: object) => hitsForBar({ ...rock, ...s }, 2, 8).filter(([v]) => v === "hat").map(([, , at]) => Math.round(at * 1000) / 1000);
  // Rock's hats are on even steps: swing leaves them; funk's sixteenth hats move.
  assert.deepEqual(hats({ swing: 0.66 }), hats({}));
  const funkHat = (swing: number) => hitsForBar({ pattern: "funk", length: 1, level: 1, swing }, 2, 8).filter(([v]) => v === "hat").map(([, , at]) => at);
  assert.ok(Math.abs(funkHat(0.66)[1] - (1 / 16) * 1.32) < 1e-9 && Math.abs(funkHat(0.5)[1] - 1 / 16) < 1e-9);
  // The shuffle, written in twelve steps, is not swung further.
  const sh = (swing: number) => hitsForBar({ pattern: "shuffle", length: 1, level: 1, swing }, 2, 8);
  assert.deepEqual(sh(0.66), sh(0.5));
  const vel = (s: object) => hitsForBar({ ...rock, ...s }, 2, 8).filter(([v]) => v === "kick").map(([, w]) => w);
  assert.ok(vel({ accent: true })[0] > vel({})[0] && vel({ accent: true })[1] < vel({})[1]);
  assert.ok(!hitsForBar({ ...rock, mutes: ["hat", "openhat"] }, 2, 8).some(([v]) => v === "hat" || v === "openhat"));
  // A/B: rock has its own B; a pattern without one gets a derived, busier B.
  const n = (s: object, bar: number) => hitsForBar({ ...rock, ...s }, bar, 8).length;
  assert.notEqual(n({ variation: "B" }, 2), n({ variation: "A" }, 2));
  assert.equal(n({ variation: "AB" }, 2), n({ variation: "A" }, 2));
  assert.equal(n({ variation: "AB" }, 3), n({ variation: "B" }, 3));
  const conga = patternById("conga");
  assert.notDeepEqual(variationB(conga), conga.loop);
  for (const p of DRUM_PATTERNS) for (const line of Object.values(variationB(p))) assert.equal(line!.length, p.steps, p.id);
});

test("auto fill off (D99): no fill before the last bar, and the breath keeps the groove", () => {
  const rock = { pattern: "rock", length: 1, level: 1 };
  assert.ok(hitsForBar(rock, 6, 8).some(([v]) => v.startsWith("tom")));
  assert.ok(!hitsForBar({ ...rock, autoFill: false }, 6, 8).some(([v]) => v.startsWith("tom")));
  assert.ok(!hitsForBreath({ ...rock, autoFill: false }, 0.5).some(([v]) => v.startsWith("tom")));
});

test("cues (D99): fills and the break are whole bars; pads: nine per kit", () => {
  for (const c of DRUM_CUES) {
    const hits = hitsForCue({ pattern: "rock", length: 1, level: 1 }, c);
    assert.ok(hits.length > 0 && hits.every(([, , at]) => at >= 0 && at < 1), c);
  }
  assert.ok(hitsForCue({ pattern: "rock", length: 1, level: 1 }, "break").every(([, , at]) => at === 0));
  // break2 holds two bars: its first is the one-bar break's.
  assert.deepEqual(hitsForCue({ pattern: "rock", length: 1, level: 1 }, "break2"), hitsForCue({ pattern: "rock", length: 1, level: 1 }, "break"));
  for (const p of DRUM_PATTERNS) {
    const pads = padsFor({ pattern: p.id, length: 1, level: 1 });
    assert.equal(pads.length, 9, p.id);
    // Every voice the loop plays sits on some pad (so it lights, and can be muted).
    for (const v of Object.keys(p.loop)) assert.ok(pads.some((x) => x.group.includes(v as never)), `${p.id}: ${v}`);
  }
});

test("openings, fills and endings", () => {
  const at = (bar: number) => hitsForBar({ pattern: "timpani", length: 1, level: 1 }, bar, 8).map(([v]) => v);
  assert.deepEqual(at(7), ["timpTonic", "cymbals"]);
  assert.ok(at(6).every((v) => v === "timpFifth"));
  assert.ok(hitsForBar({ pattern: "rock", length: 1, level: 1 }, 0, 8).some(([v]) => v === "crash"));
});

test("looping (D72): the drums never stop; the last bar keeps the groove, the breath rolls into bar 1", async () => {
  const { hitsForBar, hitsForBreath } = await import("../src/audio/drums.ts");
  const rock = { pattern: "rock", length: 1, level: 1 };
  const groove = hitsForBar(rock, 2, 8, true);
  assert.deepEqual(hitsForBar(rock, 7, 8, true), groove);
  assert.deepEqual(hitsForBar(rock, 6, 8, true), groove);
  // The breath: rock's fill from its middle (toms), spread over half a bar.
  const breath = hitsForBreath(rock, 0.5);
  assert.ok(breath.some(([v]) => v.startsWith("tom")) && breath.every(([, , at]) => at >= 0 && at < 0.5));
  // Bossa's breath is its own fill (rim and shaker), not a snare roll (D102).
  const bossa = hitsForBreath({ pattern: "bossa", length: 1, level: 1 });
  assert.ok(bossa.some(([v]) => v === "rim") && !bossa.some(([v]) => v === "snare"));
  // Not looping: the ending as before.
  assert.deepEqual(hitsForBar(rock, 7, 8).map(([v]) => v), ["kick", "crash"]);
});

test("kits (D100): every kit has presets, its paradigm first; a pattern brings its kit; fresh settings reset the feel", async () => {
  const { kitOf, presetsOf, freshDrums, DRUM_KITS, DRUM_PATTERNS } = await import("../src/audio/drums.ts");
  assert.equal(kitOf({ pattern: "house", length: 1, level: 1 }), "tr909");
  assert.equal(kitOf({ pattern: "beat60s", length: 1, level: 1 }), "sixties");
  for (const k of DRUM_KITS) assert.ok(presetsOf(k).length >= 2, k);
  for (const p of DRUM_PATTERNS) assert.ok(DRUM_KITS.includes(p.kit), p.id);
  assert.equal(presetsOf("studio")[0].id, "rock");
  assert.equal(presetsOf("sixties")[0].id, "beat60s");
  assert.ok(presetsOf("sixties").length >= 4);
  assert.deepEqual(freshDrums("funk", 0.4), { pattern: "funk", length: 2, level: 0.4 });
  assert.equal(freshDrums("halftime", 0.4).length, 1);
  assert.equal(freshDrums("techno", 0.4).length, 2);
});

test("fills (D102): every preset has its own; a fill keeps the groove's tempo and ends on the bar line", () => {
  for (const p of DRUM_PATTERNS) assert.ok(p.fill, `${p.id} has a fill`);
  // Rock at 2 bars: the fill before the last bar is the second half of the fill, at half speed.
  const s = { pattern: "rock", length: 2, level: 1 };
  const before = hitsForBar(s, 6, 8);
  assert.ok(before.every(([, , at]) => at >= 0 && at < 1));
  // Fill toms of rock sit at steps 10..15 of 16: over two bars, in the second bar at (step*2/16 - 1).
  const toms = before.filter(([v]) => v.startsWith("tom")).map(([, , at]) => at);
  assert.ok(toms.length && toms.every((at) => Math.abs(at * 8 - Math.round(at * 8)) < 1e-9), "toms on the eighth-of-bar grid of a two-bar loop");
  // The breath at 2 bars: only the last quarter of the fill, in time.
  const breath = hitsForBreath(s, 0.5);
  assert.ok(breath.every(([, , at]) => at >= 0 && at < 0.5));
  // A kit without snare plays the generic fills on its own drums.
  const bossaFill = hitsForCue({ pattern: "bossa", length: 2, level: 1 }, "fill2").map(([v]) => v);
  assert.ok(!bossaFill.includes("snare") && bossaFill.includes("congaHigh"));
});
