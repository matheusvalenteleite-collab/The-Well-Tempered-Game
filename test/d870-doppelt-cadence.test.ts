/**
 * D870: the Explication's compound signs, played: the Doppelt-Cadence (D: the hook from below, the step below then the
 * note, then the trill from above; U: the hook from above, the turn's four notes, then the trill), "und Mordant" (R: the
 * closing turn), and the slide (L, the Schleifer: two steps up into the note).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { realise, keySteps } from "../src/music/ornaments.ts";
import { ornamentMark } from "../src/touch/ornament-play.ts";

const C = { ...keySteps({}), unit: 1 / 8, trillUnit: 1 / 8 };
const midis = (s: string, dur = 2) => realise({ midi: 64, at: 0, dur }, s, [], C).map((x) => x.midi);

test("D870: the Doppelt-Cadence from below: D, E, then the trill from F", () => {
  const m = midis("D");
  assert.deepEqual(m.slice(0, 4), [62, 64, 65, 64]);
  assert.equal(m.at(-1), 64);
});

test("D870: the Doppelt-Cadence from above: F, E, D, E, then the trill", () => {
  assert.deepEqual(midis("U").slice(0, 6), [65, 64, 62, 64, 65, 64]);
});

test("D870: und Mordant: the trill closes on the step below and the note", () => {
  const m = midis("DR");
  assert.deepEqual(m.slice(-3).slice(1), [62, 64]);
});

test("D870: the slide: two steps up into the note, the note last and longest", () => {
  const r = realise({ midi: 64, at: 0, dur: 1 }, "L", [], C);
  assert.deepEqual(r.map((x) => x.midi), [60, 62, 64]);
  assert.ok(r[2].dur > r[0].dur);
  assert.equal(ornamentMark({ signs: "L", graces: [] }), "·");
  assert.equal(ornamentMark({ signs: "UR", graces: [] }), "TR");
});

test("D870: the time is the note's: nothing spills past it", () => {
  for (const s of ["D", "U", "DR", "UR", "L"]) {
    const r = realise({ midi: 64, at: 0, dur: 1.5 }, s, [], C);
    const end = Math.max(...r.map((x) => x.at + x.dur));
    assert.ok(Math.abs(end - 1.5) < 1e-9, `${s}: ${end}`);
  }
});

test("D878: the turn after the note: held to the dot (or a plain note's half), then U N L N; a sign before it in its own time", () => {
  // A dotted crotchet: E held for a crotchet, then F E D E in the dot.
  const r = realise({ midi: 64, at: 0, dur: 1.5 }, "J", [], C);
  assert.deepEqual(r.map((x) => x.midi), [64, 65, 64, 62, 64]);
  assert.equal(r[0].dur, 1);
  assert.equal(r[1].at, 1);
  // A mordent, then the turn on the tie (a minim: at its half).
  const m = realise({ midi: 64, at: 0, dur: 2 }, "MJ", [], C);
  assert.deepEqual(m.map((x) => x.midi), [64, 62, 64, 65, 64, 62, 64]);
  assert.ok(m.slice(0, 3).every((x) => x.at < 1) && m[3].at === 1);
  assert.ok(Math.abs(Math.max(...m.map((x) => x.at + x.dur)) - 2) < 1e-9);
  assert.equal(ornamentMark({ signs: "MJ", graces: [] }), "~|");
});
