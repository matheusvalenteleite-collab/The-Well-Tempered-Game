/**
 * D730: THE INVENTIONS' AND SINFONIAS' ENTRIES, FROM THEIR TABLE (data/touch/inv-entries.txt, placed by
 * tools/touch/expert.ts, built by tools/touch/more-bach.ts). An Invention's subject (its motive in 1, 7, 13; the canon's
 * subject in 2, dux and comes), and the countersubject it opens with in double counterpoint (theme 2: 5, 6, 9, 11, 12,
 * 14); a Sinfonia's subject, and its returning countersubject (theme 2: 9, 13). The counts exact; every statement on a
 * note of its voice; the first statement in bar 1 (or the upbeat) in the voice the piece opens with.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras, type TouchFugue } from "../src/touch/fugue.ts";

before(async () => {
  await loadExtras();
});

/** Entries per piece: [all, theme 2, inverted, augmented]. */
const COUNTS: Record<string, [number, number, number, number]> = {
  bwv772: [37, 0, 19, 0],
  bwv773: [6, 0, 0, 0],
  bwv774: [10, 0, 0, 0],
  bwv775: [20, 0, 3, 0],
  bwv776: [15, 8, 0, 0],
  bwv777: [14, 8, 2, 0],
  bwv778: [35, 0, 2, 0],
  bwv779: [6, 0, 0, 0],
  bwv780: [10, 5, 1, 0],
  bwv781: [10, 0, 0, 0],
  bwv782: [12, 5, 2, 0],
  bwv783: [24, 18, 7, 0],
  bwv784: [11, 0, 0, 0],
  bwv785: [13, 4, 0, 0],
  bwv786: [7, 0, 0, 0],
  bwv787: [17, 0, 6, 0],
  bwv788: [13, 0, 0, 0],
  bwv789: [7, 0, 0, 0],
  bwv790: [13, 0, 0, 0],
  bwv791: [8, 0, 0, 0],
  bwv792: [31, 0, 9, 0],
  bwv793: [11, 0, 0, 0],
  bwv794: [21, 0, 0, 0],
  bwv795: [24, 16, 6, 0],
  bwv796: [11, 0, 0, 0],
  bwv797: [13, 0, 0, 0],
  bwv798: [7, 0, 0, 0],
  bwv799: [9, 3, 0, 0],
  bwv800: [14, 0, 0, 0],
  bwv801: [10, 0, 0, 0],
};
const tally = (f: TouchFugue): number[] => [
  f.entries.length,
  f.entries.filter((e) => e.theme === 2).length,
  f.entries.filter((e) => e.inverted).length,
  f.entries.filter((e) => e.scale === 2).length,
];

test("D730: all 30 from the table, counted by theme and form; each statement on a note of its voice", () => {
  const table = readFileSync(new URL("../data/touch/inv-entries.txt", import.meta.url), "utf8");
  for (const [id, want] of Object.entries(COUNTS)) {
    assert.ok(table.includes(`== ${id} |`), `${id} in the table`);
    const f = fugueById(id);
    assert.equal(f.id, id);
    assert.deepEqual(tally(f), want, id);
    for (const e of f.entries) {
      assert.ok(f.voices[e.voice].some((n) => n[0] === e.on), `${id}: b. ${e.bar} starts on a note`);
      assert.ok(e.end > e.on && e.notes.length >= 3, `${id}: b. ${e.bar} has notes`);
    }
    const first = f.entries[0];
    assert.ok(first.bar <= 1, `${id}: the first statement in bar ${first.bar}`);
    const opening = Math.min(...f.voices.map((v) => v[0]?.[0] ?? Infinity));
    assert.ok(first.on - opening < f.barTicks, `${id}: the first statement in the opening bar`);
  }
});

test("D730: Invention 2 a canon (dux leading each pair, three pairs), no other piece marked", () => {
  const f = fugueById("bwv773");
  assert.deepEqual(f.entries.map((e) => e.canon), ["dux", "comes", "dux", "comes", "dux", "comes"]);
  assert.deepEqual(f.entries.map((e) => e.voice), [0, 1, 1, 0, 0, 1]);
  for (const id of Object.keys(COUNTS)) if (id !== "bwv773") assert.ok(fugueById(id).entries.every((e) => !e.canon), id);
});

test("D730: a countersubject (theme 2) only where it opens with the subject or returns with it", () => {
  for (const [id, [, t2]] of Object.entries(COUNTS)) {
    const f = fugueById(id);
    if (!t2) continue;
    const cs = f.entries.filter((e) => e.theme === 2);
    assert.ok(cs.length >= 3, `${id}: the countersubject restated`);
    assert.ok(new Set(cs.map((e) => e.voice)).size >= 2, `${id}: the countersubject changes hands`);
  }
});
