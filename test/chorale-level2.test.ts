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

import { LEVEL4, POSITIONS, bassChorale, realise } from "../src/chorale/level4.ts";

test("level 4: Kittel's basses as scores; figures realised in the key", () => {
  for (const ch of CHORALES) {
    const l4 = LEVEL4[ch.number];
    assert.ok(l4.basses.length >= 8);
    for (const b of l4.basses) {
      const sc = bassChorale(ch, b.notes);
      assert.equal(sc.melody.length, b.notes.length);
      for (const n of b.notes) if (n.kittel) assert.ok(POSITIONS.includes(n.kittel));
    }
  }
  assert.deepEqual(realise("5/3", "G2", "G", "major"), ["B3", "D4"]);
  assert.deepEqual(realise("6", "F#2", "G", "major"), ["A3", "D4"]);
  assert.deepEqual(realise("4/2", "C3", "G", "major"), ["D4", "F#4", "A4"]);
  assert.deepEqual(realise("6/5", "C#3", "D", "minor"), ["E4", "G4", "A4"]);
});
