/**
 * D726, BACH PLAYS WITH YOU: a take beside Kimiko Ishizaka (Book I), bar by bar: a player ahead where she
 * moves on and behind where she holds back is "with her"; the other way, "against her"; on the beat, neither.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { barAt, fugueById } from "../src/touch/fugue.ts";
import { herMap } from "../src/bench/her-clock.ts";
import { besideHer, offsets } from "../src/bench/takes/beside.ts";
import type { Take, TakeNote } from "../src/bench/takes/take.ts";

const PIECE = "wtc1f01";
const f = fugueById(PIECE);
const bpm = 60;
const tps = (f.tpq * bpm) / 60;
function take(msOf: (bar: number) => number): Take {
  const notes: TakeNote[] = f.voices[0].map((n, i) => [i, n[0] + (msOf(barAt(f, n[0])) / 1000) * tps, n[2], n[1], { pan: 0, gain: 1 }, { lead: true }]);
  return { v: 1, id: "t", piece: PIECE, voice: 0, voices: f.voices.length, at: "2026-11-12T10:00:00.000Z", grade: "A", score: 0, failedBar: null, sound: "busoni", reading: null, bpm, tempoPct: 100, lag: 0, app: "test", from: 0, until: f.length, notes, calls: [], out: [] };
}

test("D726: Book I only (her recording); a take on the beat leans neither way", () => {
  assert.ok(herMap(PIECE));
  assert.equal(herMap("wtc2f01"), null);
  const b = besideHer(take(() => 0))!;
  assert.ok(b.bars.length > 20);
  assert.equal(b.withHer + b.againstHer, 0);
  assert.ok(offsets(take(() => -30)).every((o) => Math.abs(o.ms + 30) < 0.5), "the offsets as played");
});

test("D726: ahead where she moves on and behind where she holds back is with her; the other way, against", () => {
  const her = new Map(besideHer(take(() => 0))!.bars.map((x) => [x.bar, x.her]));
  const withHer = besideHer(take((bar) => -Math.sign(her.get(bar) ?? 0) * 40))!;
  const against = besideHer(take((bar) => Math.sign(her.get(bar) ?? 0) * 40))!;
  assert.ok(withHer.withHer > 0 && withHer.againstHer === 0, `${withHer.withHer} with`);
  assert.ok(against.againstHer > 0 && against.withHer === 0, `${against.againstHer} against`);
  assert.equal(withHer.withHer, against.againstHer);
  assert.ok(withHer.herSlowest.every((x) => x.her <= 0), "her slowest bars are her broadenings");
});
