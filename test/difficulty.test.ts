import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { difficultyOf } from "../src/bench/difficulty.ts";
import { CARDS } from "../src/bench/cards.ts";

test("D222: every card's stars are the measured difficulty at the standard tempo; the busy toccatas hardest, the stile antico easiest", () => {
  for (const f of FUGUES) assert.equal(CARDS.find((c) => c.id === f.id)?.stars, difficultyOf(f).stars, f.id);
  assert.ok(difficultyOf(fugueById("wtc1f10")).stars > difficultyOf(fugueById("wtc1f22")).stars);
  const book1 = FUGUES.filter((f) => f.id.startsWith("wtc1")).map((f) => difficultyOf(f).stars);
  for (let s = 1; s <= 5; s++) assert.ok(book1.includes(s), `Book I has ${s}-star fugues`);
});
