import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { WtcPiece } from "../src/wtc/corpus.ts";
import { fugueOf } from "../src/wtc/library.ts";
import { settled } from "../src/wtc/settled.ts";

const all = [...(JSON.parse(readFileSync("data/wtc/fugues.json", "utf8")) as WtcPiece[]), ...(JSON.parse(readFileSync("data/wtc/more.json", "utf8")) as WtcPiece[])];
const piece = (id: string) => all.find((p) => p.id === id)!;
const barOf = (f: ReturnType<typeof fugueOf>, q: number) => Math.floor(q / f.barQuarters + 1e-6) + 1 - f.pickup;

test("D160: 63 fugues, each with a subject settled from the score", () => {
  assert.equal(all.length, 63);
  for (const p of all) assert.ok(settled(p.id), p.id);
});

test("D160: augmentation and diminution found in a changed rhythm too (Art of Fugue VI), the 48's kept", () => {
  const vi = fugueOf(piece("aof06"));
  assert.ok(vi.transformed.filter((e) => e.scale === 0.5).length >= 10, String(vi.transformed.length));
  const i8 = fugueOf(piece("wtc1f08"));
  assert.ok(i8.transformed.some((e) => e.scale === 2 && barOf(i8, e.at) === 62));
  const ii9 = fugueOf(piece("wtc2f09"));
  assert.ok(ii9.transformed.filter((e) => e.scale === 0.5).length >= 8);
});

test("D160: the unfinished fugue: its three subjects tracked, B-A-C-H first in the tenor at b. 193", () => {
  const f = fugueOf(piece("aof14"));
  const s3 = f.later.filter((e) => e.subject === 3);
  assert.ok(s3.length >= 6);
  assert.equal(barOf(f, s3[0].at), 193);
  assert.deepEqual(s3[0].notes.slice(0, 4).map((i) => f.spelled[i]), ["Bb3", "A3", "C4", "B3"]);
  assert.ok(f.later.some((e) => e.subject === 2 && barOf(f, e.at) <= 115));
});
