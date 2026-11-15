/**
 * D707: THE ART OF FUGUE'S ENTRIES, FROM ITS TABLE (data/touch/aof-entries.txt, placed by tools/touch/expert.ts, built
 * by tools/touch/more-bach.ts and, for Contrapunctus 14, tools/touch/extract.ts). The counts per piece exact; the
 * canons' dux and comes; the multi-subject fugues' themes; the forms told against the cycle's own (Contrapunctus 1's
 * subject; Contrapunctus 8's two): 3, 4 and 12 inversus all inverted, the mirror fugues' forms complementary,
 * 6 and 7 in diminution (7 in augmentation too); every statement starting on a note of its voice.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras, type TouchFugue } from "../src/touch/fugue.ts";

before(async () => {
  await loadExtras();
});

const ID = (k: string) => `bwv1080-${k}`;
/** Entries per piece: [all, theme 2, theme 3, inverted, augmented, diminished]. */
const COUNTS: Record<string, [number, number, number, number, number, number]> = {
  "01": [11, 0, 0, 0, 0, 0],
  "02": [13, 0, 0, 0, 0, 0],
  "03": [12, 0, 0, 12, 0, 0],
  "04": [16, 0, 0, 16, 0, 0],
  "05": [22, 0, 0, 11, 0, 0],
  "06": [28, 0, 0, 13, 0, 18],
  "07": [26, 0, 0, 10, 4, 19],
  "08": [43, 18, 8, 8, 0, 0],
  "09": [18, 7, 0, 0, 0, 0],
  "10": [27, 12, 0, 14, 0, 0],
  "11": [57, 11, 28, 22, 0, 0],
  "12r": [9, 0, 0, 0, 0, 0],
  "12i": [9, 0, 0, 9, 0, 0],
  "13r": [11, 0, 0, 6, 0, 0],
  "13i": [11, 0, 0, 5, 0, 0],
  c14: [5, 0, 0, 2, 2, 0],
  c15: [10, 0, 0, 4, 0, 0],
  c16: [8, 0, 0, 0, 0, 0],
  c17: [7, 0, 0, 0, 0, 0],
  "14": [44, 9, 9, 5, 0, 0],
};
const tally = (f: TouchFugue): number[] => [
  f.entries.length,
  f.entries.filter((e) => e.theme === 2).length,
  f.entries.filter((e) => e.theme === 3).length,
  f.entries.filter((e) => e.inverted).length,
  f.entries.filter((e) => e.scale === 2).length,
  f.entries.filter((e) => e.scale === 0.5).length,
];

test("D707: every piece's entries as the table places them, counted by theme and form", () => {
  for (const [k, want] of Object.entries(COUNTS)) {
    const f = fugueById(ID(k));
    assert.equal(f.id, ID(k));
    assert.deepEqual(tally(f), want, ID(k));
    for (const e of f.entries) {
      assert.ok(f.voices[e.voice].some((n) => n[0] === e.on), `${f.id}: b. ${e.bar} starts on a note`);
      assert.ok(e.end > e.on && e.notes.length >= 3, `${f.id}: b. ${e.bar} has notes`);
    }
  }
});

test("D707: the canons' statements are dux or comes; the dux leads each pair; Canon 14's comes inverted in augmentation", () => {
  for (const k of ["c14", "c15", "c16", "c17"]) {
    const f = fugueById(ID(k));
    assert.ok(f.entries.every((e) => e.canon === "dux" || e.canon === "comes"), ID(k));
    assert.equal(f.entries[0].canon, "dux", ID(k));
    assert.ok(f.entries.filter((e) => e.canon === "comes").length >= 2, ID(k));
  }
  const c14 = fugueById(ID("c14"));
  for (const e of c14.entries) assert.equal(e.canon === "comes", !!e.inverted && e.scale === 2, `c14 b. ${e.bar}`);
  for (const k of ["01", "05", "08", "11", "14"]) assert.ok(fugueById(ID(k)).entries.every((e) => !e.canon), ID(k));
});

test("D707: the mirror fugues: the inversus states each entry of the rectus in the other form", () => {
  for (const n of ["12", "13"]) {
    const r = fugueById(ID(`${n}r`)), i = fugueById(ID(`${n}i`));
    assert.deepEqual(i.entries.map((e) => e.bar), r.entries.map((e) => e.bar));
    i.entries.forEach((e, k) => assert.notEqual(!!e.inverted, !!r.entries[k].inverted, `${n} b. ${e.bar}`));
  }
});

test("D707: the later subjects enter where the table reads them", () => {
  const first = (k: string, t: 2 | 3) => fugueById(ID(k)).entries.find((e) => e.theme === t)!.bar;
  assert.deepEqual([first("08", 2), first("08", 3), first("09", 2), first("10", 2), first("11", 2), first("11", 3), first("14", 2), first("14", 3)], [39, 94, 35, 23, 27, 97, 114, 193]);
});
