/**
 * D881-D885: the Book I preludes 1-12 for the main game: re-voiced where the plan takes real voices (no note changed),
 * each planned prelude offering only the voices the plan names.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRELUDE_PLAN, DULL_EXCEPTIONS } from "../src/touch/prelude-plan.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { voicesFrom } from "../src/touch/voice-mode.ts";

const W = JSON.parse(readFileSync(new URL("../data/wtc/preludes.json", import.meta.url), "utf8")) as { id: string; voices: unknown[][] }[];

test("D881: the re-voiced preludes have their voices (I/7 and I/12 four, I/8, I/9 and I/10 three), as the game holds them", () => {
  // D888: and batch 2's (I/16, I/18, I/19, I/22, I/23, I/24 three each).
  for (const [id, n] of [["wtc1p07", 4], ["wtc1p08", 3], ["wtc1p09", 3], ["wtc1p10", 3], ["wtc1p12", 4], ["wtc1p16", 3], ["wtc1p18", 3], ["wtc1p19", 3], ["wtc1p22", 3], ["wtc1p23", 3], ["wtc1p24", 3], ["wtc2p01", 3], ["wtc2p03", 3], ["wtc2p04", 3], ["wtc2p05", 3], ["wtc2p09", 3], ["wtc2p11", 4]] as const) {
    assert.equal(W.find((p) => p.id === id)!.voices.length, n, id);
    assert.equal(fugueById(id).voices.length, n, `${id} in the game`);
  }
});

test("D881-D885: a planned prelude offers only its plan's voices; I/2 none; I/1's right hand the one named exception", () => {
  for (const [id, p] of Object.entries(PRELUDE_PLAN)) {
    const f = fugueById(id);
    for (const v of p.offer) assert.ok(v < f.voices.length, `${id}: voice ${v}`);
    assert.deepEqual(voicesFrom(f, 0), [...p.offer].sort(), id);
  }
  // D950: I/2 offered after all, its left hand.
  assert.deepEqual(voicesFrom(fugueById("wtc1p02"), 0), [1]);
  assert.ok(!PRELUDE_PLAN.wtc1p02.held && !PRELUDE_PLAN.wtc1p02.tempo);
  assert.deepEqual(voicesFrom(fugueById("wtc1p04"), 0), [0, 3]);
  assert.equal(PRELUDE_PLAN.wtc1p05.tempo, "slow");
  assert.equal(PRELUDE_PLAN.wtc1p21.tempo, "slow");
  assert.equal(Object.keys(PRELUDE_PLAN).filter((id) => /^wtc1p/.test(id)).length, 24, "Book I planned");
  // D953-D956: Book II 1-12 too.
  assert.equal(Object.keys(PRELUDE_PLAN).filter((id) => /^wtc2p(0\d|1[0-2])$/.test(id)).length, 12, "Book II 1-12 planned");
  for (const id of ["wtc2p05", "wtc2p06", "wtc2p08", "wtc2p10"]) assert.equal(PRELUDE_PLAN[id].tempo, "slow", id);
  assert.deepEqual(Object.keys(DULL_EXCEPTIONS), ["wtc1p01", "wtc1p02"]);
});

test("D886: I/9 bar 16, the B3 a dotted minim to the bar's end, as the Bach-Gesellschaft prints it", () => {
  const f = fugueById("wtc1p09");
  const bar16 = f.bars.find((b) => b.n === 16)!.on;
  const b3 = f.voices.flat().find((n) => n[0] === bar16 + 3 * f.tpq && n[2] === 59)!;
  assert.equal(b3[1], 3 * f.tpq);
});
