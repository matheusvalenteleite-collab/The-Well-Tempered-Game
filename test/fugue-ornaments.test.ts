// D206: the ornaments of the 48 fugues and Contrapunctus XIV, audited against the Bach-Gesellschaft
// edition (vol. 14 and 25), Mutopia and ASAP: per-fugue counts pinned, and a few landmarks.
import { test } from "node:test";
import assert from "node:assert/strict";
import ornaments from "../data/wtc/ornaments.json" with { type: "json" };
import pieces from "../data/touch/pieces.json" with { type: "json" };
import { ADDED, CONTRAPUNCTUS, fugueSign } from "../tools/wtc/ornaments.ts";

type Row = [number, number, string, string, string[]?];
const ORN = ornaments as unknown as Record<string, Row[]>;
const FUGUES = [
  ...Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 24 }, (_, i) => `wtc2f${String(i + 1).padStart(2, "0")}`),
  "bwv1080-14",
];
const signed = (id: string) => (ORN[id] ?? []).filter((r) => r[3]);

// Ornamented notes per fugue after D206 (fugues not listed: none).
const COUNTS: Record<string, number> = {
  wtc1f01: 3, wtc1f03: 1, wtc1f05: 2, wtc1f06: 16, wtc1f07: 6, wtc1f08: 2, wtc1f11: 10, wtc1f12: 4,
  wtc1f13: 5, wtc1f14: 1, wtc1f15: 6, wtc1f19: 2, wtc1f20: 2, wtc1f22: 1, wtc1f23: 1, wtc1f24: 1,
  wtc2f01: 5, wtc2f02: 1, wtc2f03: 1, wtc2f04: 3, wtc2f06: 2, wtc2f10: 6, wtc2f13: 24, wtc2f14: 6,
  wtc2f15: 6, wtc2f16: 1, wtc2f17: 1, wtc2f18: 4, wtc2f19: 1, wtc2f20: 18, wtc2f22: 1, wtc2f24: 9,
  "bwv1080-14": 2,
};

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (p: string) => {
  const m = /^([A-G])(#*|b*)(-?\d+)$/.exec(p)!;
  return 12 * (Number(m[3]) + 1) + STEP[m[1]] + (m[2].startsWith("#") ? 1 : -1) * m[2].length;
};

test("D206: pins the count of each fugue's ornamented notes", () => {
  const got = Object.fromEntries(FUGUES.filter((id) => signed(id).length).map((id) => [id, signed(id).length]));
  assert.deepEqual(got, COUNTS);
  assert.equal(Object.values(got).reduce((a, b) => a + b, 0), 154);
});

test("D206: puts every row on a note of the game's pieces", () => {
  const byId = new Map((pieces as unknown as { id: string; voices: number[][][] }[]).map((p) => [p.id, p]));
  for (const id of FUGUES)
    for (const [v, on, pitch] of ORN[id] ?? []) {
      const notes = byId.get(id)!.voices[v];
      assert.ok(notes.some((n) => n[0] === on && n[2] === midi(pitch)), `${id} ${v} ${on} ${pitch}`);
    }
});

test("D206: reads the encoding's M in a fugue as the short wavy sign", () => {
  assert.equal(fugueSign("wtc2f13", "M"), "W");
  assert.equal(fugueSign("wtc1p04", "m"), "m");
  // I/13's subject: the short wavy line over its dotted C#5 (BGA p. 48).
  assert.deepEqual(signed("wtc1f13")[0], [0, 5760, "C#5", "W"]);
  // the remaining mordents of the fugues are the three added to II/1
  const mordents = FUGUES.flatMap((id) => signed(id).filter((r) => /[Mm]/.test(r[3])).map((r) => `${id} ${r[2]}`));
  assert.deepEqual(mordents.sort(), ["wtc2f01 A3", "wtc2f01 A4", "wtc2f01 E5"]);
});

test("D206: keeps the landmarks", () => {
  // I/2 and I/16 have none; I/6's subject trills (bar 2, G4); II/13's 24.
  assert.deepEqual(signed("wtc1f02"), []);
  assert.deepEqual(signed("wtc1f16"), []);
  assert.deepEqual(signed("wtc1f06")[0], [0, 9600, "G4", "T"]);
  assert.equal(signed("wtc2f13").length, 24);
  // II/1: the BGA's mordents in bars 2, 6, 10 and the trill in bar 28, added.
  assert.equal(ADDED.wtc2f01.length, 4);
  assert.ok(signed("wtc2f01").some((r) => JSON.stringify(r) === JSON.stringify([1, 105600, "G#4", "T"])));
  assert.ok(signed("wtc2f01").some((r) => JSON.stringify(r) === JSON.stringify([0, 19200, "E5", "M"])));
  // Contrapunctus XIV: the Pralltriller in bar 196, the turn in bar 220.
  assert.deepEqual(ORN["bwv1080-14"], CONTRAPUNCTUS);
});
