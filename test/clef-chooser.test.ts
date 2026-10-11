// P6: the open score's clefs, chosen per staff and per passage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseClefs, ledgerCost } from "../src/ui/notation/clef-chooser.ts";

test("ledger lines: none inside the staff, more for far notes", () => {
  assert.equal(ledgerCost("treble", "E4"), 0);
  assert.equal(ledgerCost("treble", "F5"), 0);
  assert.equal(ledgerCost("treble", "C4"), 1); // middle C, one ledger line
  assert.equal(ledgerCost("treble", "A3"), 3); // two ledger lines
  assert.equal(ledgerCost("bass", "C4"), 1);
  assert.equal(ledgerCost("treble_8vb", "C3"), 1);
});

test("a soprano stays in G, a bass in F, without changes", () => {
  const soprano = Array.from({ length: 8 }, () => ["D5", "G4", "B4"]);
  const bass = Array.from({ length: 8 }, () => ["G2", "D3", "B2"]);
  const [s, b] = chooseClefs([soprano, bass]);
  assert.deepEqual(new Set(s), new Set(["treble"]));
  assert.deepEqual(new Set(b), new Set(["bass"]));
});

test("a tenor takes the G clef where it lies high for a passage, and goes back", () => {
  const low = ["D3", "F3", "A3", "E3"];
  const high = ["E4", "G4", "A4", "F4"];
  const tenor = [low, low, low, high, high, high, high, low, low, low];
  const [t] = chooseClefs([tenor]);
  assert.deepEqual(t.slice(0, 3), ["bass", "bass", "bass"]);
  assert.deepEqual(t.slice(3, 7), ["treble", "treble", "treble", "treble"]);
  assert.deepEqual(t.slice(7), ["bass", "bass", "bass"]);
});

test("no flicker: one high note does not change the clef", () => {
  const low = ["D3", "F3", "A3"];
  const [t] = chooseClefs([[low, low, ["C4", "E4"], low, low]]);
  assert.deepEqual(new Set(t), new Set(["bass"]));
});

test("an octave clef only where it saves much more than changes would", () => {
  // A tenor around middle C throughout: G with an 8 below reads it without ledger lines.
  const mid = ["C4", "E4", "G3", "D4", "F4", "A3"];
  const [t] = chooseClefs([Array.from({ length: 12 }, () => mid)]);
  assert.deepEqual(new Set(t), new Set(["treble_8vb"]));
  // Allowed only G and F: the same tenor stays in one of them.
  const [u] = chooseClefs([Array.from({ length: 12 }, () => mid)], { clefs: ["treble", "bass"] });
  assert.equal(new Set(u).size, 1);
});

test("empty bars keep the clef around them", () => {
  const low = ["D3", "F3"];
  const [t] = chooseClefs([[low, [], [], low]]);
  assert.deepEqual(new Set(t), new Set(["bass"]));
});

test("an unwritten staff keeps the clef of its register", () => {
  const [t] = chooseClefs([[[], [], [], []]], { prefer: ["bass"] });
  assert.deepEqual(new Set(t), new Set(["bass"]));
});
