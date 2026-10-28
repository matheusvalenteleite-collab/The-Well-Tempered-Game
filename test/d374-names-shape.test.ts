/**
 * D374: the fugues' names (all 24 of Book I in three languages) and the played shape's data (the tick a
 * thumb let go, kept even after the note's end; drawing only).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUE_NAMES, fugueName } from "../src/touch/fugue-names.ts";
import { release, type LaneNote } from "../src/touch/lanes.ts";

test("Mario's names: all 24 of Book I, in English, Portuguese and Spanish, a short form for the tiles", () => {
  for (let i = 1; i <= 24; i++) {
    const id = `wtc1f${String(i).padStart(2, "0")}`;
    for (const l of ["en", "pt", "es"] as const) {
      assert.ok(fugueName(id, l), `${id} ${l}`);
      const s = fugueName(id, l, "short")!;
      assert.ok(s && s.length <= 13, `${id} ${l} short`);
    }
  }
  assert.equal(fugueName("wtc1f01", "en"), "The Bell-Ringer");
  assert.equal(fugueName("wtc1f13", "en"), "The Heron");
  assert.equal(fugueName("wtc2f01", "en"), null);
  assert.equal(Object.keys(FUGUE_NAMES).length, 24);
});

test("the played shape: release keeps the first lift (before or after the end); off only before the end", () => {
  const n = (): LaneNote => ({ on: 0, dur: 100, midi: 60, step: 0, long: false, state: "hit", at: 0 });
  const a = [n()];
  release(a, 0, 60);
  release(a, 0, 80);
  assert.equal(a[0].off, 60);
  assert.equal(a[0].up, 60);
  const b = [n()];
  release(b, 0, 130);
  assert.equal(b[0].off, undefined);
  assert.equal(b[0].up, 130);
  const c = [{ ...n(), state: "pending" as const }];
  release(c, 0, 50);
  assert.equal(c[0].up, undefined);
});
