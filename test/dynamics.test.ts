// P25: the Fux and WTC playback shaped: the arch of a short piece, the dissonances' accent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ONE_PHRASE, shapeEvents } from "../src/audio/dynamics.ts";
import type { PlayEvent } from "../src/counterpoint/layout.ts";

const ev = (at: number, cantus: string | null, counterpoint: string | null, length = 1): PlayEvent => ({ slot: at, at, length, cantus, counterpoint });

test("P25: a first-species exercise rises to its highest note and falls back", () => {
  const cp = ["A4", "C5", "E5", "G5", "E5", "D5", "C#5", "D5"];
  const cf = ["D4", "F4", "E4", "C4", "G4", "F4", "E4", "D4"];
  const out = shapeEvents(cp.map((p, i) => ev(i, cf[i], p)));
  const level = (i: number) => out[i].db?.counterpoint ?? 0;
  assert.equal(level(0), 0);
  assert.ok(level(3) > level(1)); // the crest, G5
  assert.ok(level(3) <= 2 + 1e-9);
  assert.ok(level(7) < level(3));
});

test("P25: a dissonance struck is a little louder; a consonance is not", () => {
  // Second species: C5 over C4 (an octave), then D5 passing (a ninth: a second).
  const out = shapeEvents([ev(0, "C4", "C5", 0.5), { ...ev(0.5, null, "D5", 0.5) }, ev(1, "C4", "E5", 1)].map((e) => e));
  const long = Array.from({ length: ONE_PHRASE + 1 }, (_, i) => ev(i + 2, "C4", "E5"));
  const flat = shapeEvents([...[ev(0, "C4", "C5", 0.5), ev(0.5, null, "D5", 0.5), ev(1, "C4", "E5", 1)], ...long]);
  assert.equal(flat[0].db, undefined);
  assert.equal(flat[1].db?.counterpoint, 1);
  assert.equal(flat[2].db, undefined);
  assert.ok(out.length === 3);
});

test("P25: events with their own levels (the chorales) are kept", () => {
  const own: PlayEvent[] = [{ ...ev(0, null, "C5"), db: { counterpoint: 0.5 } }, ev(1, null, "D5")];
  assert.deepEqual(shapeEvents(own), own);
});
