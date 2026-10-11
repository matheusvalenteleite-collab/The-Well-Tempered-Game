import { test } from "node:test";
import assert from "node:assert/strict";
import { CHORALES, comparePoints, frac } from "../src/chorale/level1.ts";
import { LEVEL2 } from "../src/chorale/level2.ts";
import { LEVEL5 } from "../src/chorale/level5.ts";

test("level 2: every Kittel melody has its notes, each on a note of the workbench's melody (C27)", () => {
  for (const ch of CHORALES) {
    const l2 = LEVEL2[ch.number];
    assert.ok(l2, `chorale ${ch.number}`);
    assert.ok(l2.notes.length > 10);
    // The workbench draws every stage on the level-5 grid (32nds): each level-2 note starts a melody note there.
    const starts = new Set(LEVEL5[ch.number].melody.map(([at]) => at));
    for (const n of l2.notes) assert.ok(starts.has(Math.round(frac(n.offset) * 32)), `chorale ${ch.number}: ${n.offset}`);
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

import { LEVEL3, bassPitch } from "../src/chorale/level3.ts";

test("level 3: Bach's and Kittel's bass degrees are among the options; degrees spell in the key", () => {
  for (const ch of CHORALES) {
    for (const n of LEVEL3[ch.number].notes) {
      for (const b of n.bach) assert.ok(n.options.includes(b.chord));
      for (const k of n.kittel) if (k.chord !== "?") assert.ok(n.options.includes(k.chord));
    }
  }
  assert.equal(bassPitch("1", "G", 43), "G2");
  assert.equal(bassPitch("5", "G", 43), "D3");
  assert.equal(bassPitch("#4", "G", 48), "C#3");
  assert.equal(bassPitch("b7", "F", 48), "Eb3");
  assert.equal(bassPitch("3", "Bb", 50), "D3");
});

import { LEVEL4, POSITIONS, realise } from "../src/chorale/level4.ts";

test("level 4: Kittel's basses in time order, the same basses as level 5 (the workbench's stages 4-6); figures realised in the key", () => {
  for (const ch of CHORALES) {
    const l4 = LEVEL4[ch.number];
    assert.ok(l4.basses.length >= 8);
    assert.deepEqual(l4.basses.map((b) => b.label), LEVEL5[ch.number].basses.map((b) => b.label), `chorale ${ch.number}`);
    for (const b of l4.basses) {
      // In time order; a small note stands at the onset of the note it leads to (the workbench sounds it before).
      for (let i = 1; i < b.notes.length; i++) assert.ok(frac(b.notes[i].offset) >= frac(b.notes[i - 1].offset));
      for (let i = 1; i + 1 < b.notes.length; i++) assert.ok(!(b.notes[i].offset === b.notes[i - 1].offset && b.notes[i].offset === b.notes[i + 1].offset));
      for (const n of b.notes) if (n.kittel) assert.ok(POSITIONS.includes(n.kittel));
    }
  }
  assert.deepEqual(realise("5/3", "G2", "G", "major"), ["B3", "D4"]);
  assert.deepEqual(realise("6", "F#2", "G", "major"), ["A3", "D4"]);
  assert.deepEqual(realise("4/2", "C3", "G", "major"), ["D4", "F#4", "A4"]);
  assert.deepEqual(realise("6/5", "C#3", "D", "minor"), ["E4", "G4", "A4"]);
});
