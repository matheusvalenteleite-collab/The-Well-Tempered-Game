import { test } from "node:test";
import assert from "node:assert/strict";
import { CHORALES, comparePoints } from "../src/chorale/level1.ts";
import { LEVEL2, noteIndices } from "../src/chorale/level2.ts";

test("level 2: every Kittel melody has its notes, each placed on a written note of the melody", () => {
  for (const ch of CHORALES) {
    const l2 = LEVEL2[ch.number];
    assert.ok(l2, `chorale ${ch.number}`);
    assert.ok(l2.notes.length > 10);
    const idx = noteIndices(ch, l2);
    assert.ok(idx.every((i) => i >= 0), `chorale ${ch.number}: a level-2 note not found in the melody`);
  }
});

test("level 2: the options include every chord Bach and Kittel use, and choosing Bach's agrees with Bach", () => {
  for (const ch of CHORALES) {
    for (const n of LEVEL2[ch.number].notes) {
      for (const b of n.bach) assert.ok(n.options.includes(b.chord), `${ch.number} bar ${n.measure}: ${b.chord}`);
      for (const k of n.kittel) if (k.chord !== "?") assert.ok(n.options.includes(k.chord));
    }
    const notes = LEVEL2[ch.number].notes;
    const picks = notes.map((n) => n.bach[0]?.chord ?? null);
    const v = comparePoints(notes, picks);
    assert.ok(v.every((x, i) => !notes[i].bach.length || x.bach.some((b) => b.same)));
  }
});
