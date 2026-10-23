// D244: the journey (Prelude 1, Fugue 1): the script's course, and the echo's lanes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { barStart, fugueById, PRELUDES } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { journeyAt, hasJourney, echoShown, builds } = await import("../src/bench/journey.ts");

const chip = { ctx: { currentTime: 0 }, heard: () => 0, note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }), swoosh() {}, tick() {}, groove: () => false } as unknown as Chip;
const P1 = fugueById("wtc1p01");
const at = (bar: number) => journeyAt(P1, barStart(P1, Math.floor(bar)) + (bar % 1) * P1.barTicks);

test("Prelude 1's course: shadow at the diminished sevenths, the climb on the G pedal, the summit on the C pedal", () => {
  assert.ok(hasJourney(P1) && echoShown(P1) && builds(fugueById("wtc1f01")));
  assert.deepEqual(at(3), { shadow: 0, climb: 0, summit: 0 });
  for (const b of [12.5, 14.5, 22.5, 23.5]) assert.equal(at(b).shadow, 1, `b. ${b}`);
  assert.equal(at(19).shadow, 0);
  assert.ok(at(26).climb > 0.2 && at(30).climb > at(26).climb, "the climb rises through the pedal");
  assert.equal(at(32.25).summit, 1);
  assert.ok(at(34.5).summit > 0.5 && at(34.5).climb === 0, "the summit's light stays");
  assert.deepEqual(journeyAt(fugueById("wtc1p02"), 0), { shadow: 0, climb: 0, summit: 0 }, "no script, no journey");
});

test("the echo: a figure stated twice in a bar keeps its lanes (Prelude 1, both hands, phone and computer)", () => {
  for (const mode of ["highway", "keys"]) {
    const g = new ProtoGame(P1, 0, 0, protoById(mode), { bpm: 66, legato: false, easy: "leaps" }, chip);
    const lanes = g.lanesOf(0);
    const echo = g.echoOf(0);
    assert.ok(echo.size >= 90, `${mode}: ${echo.size}`);
    const notes = g.tracks[0].notes;
    for (const i of echo) {
      const n = notes[i];
      const first = notes.findIndex((x, j) => !x.ride && x.midi === n.midi && x.on === n.on - P1.barTicks / 2 && j < i);
      assert.ok(first >= 0 && lanes[first] === lanes[i], `${mode}: the note at ${n.on} in its first statement's lane`);
    }
  }
});

test("the echo's lanes are checked: every prelude's echoes keep the moves' directions", () => {
  for (const f of PRELUDES.slice(0, 6)) {
    const g = new ProtoGame(f, 0, 0, protoById("highway"), { bpm: 66, legato: false, easy: "leaps" }, chip);
    const lanes = g.lanesOf(0);
    const mv = g.tracks[0].moves;
    const heads = g.tracks[0].notes.map((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
    let last = -1;
    heads.forEach((h, i) => {
      if (!h) return;
      if (last >= 0 && g.echoOf(0).has(i) && mv[i].dir !== 0 && mv[i].steps !== 0) assert.equal(Math.sign(lanes[i] - lanes[last]) || (lanes[i] === 0 || lanes[i] === 4 ? mv[i].dir : 0), mv[i].dir, `${f.id} note ${i}`);
      last = i;
    });
  }
});
