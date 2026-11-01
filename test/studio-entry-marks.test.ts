/**
 * The design studio: the SUBJECT flag rethought as entry marks (box-fx.ts entryMarks; `?flagv=a|b|c`,
 * `o` the old flag): a stretto's entries each in their own lane (order), drawn only under the notes or
 * where no note is, never reading right or wrong; and the YOU label's breath (MusicBox.tsx youLabel) slow,
 * at most 1 Hz, on the wall clock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { entryLanes } from "../src/touch/box-fx.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("entry lanes: overlapping entries (I/1's strettos) never share a lane; the first of a group on lane 0", () => {
  const f = fugueById("wtc1f01");
  const spans = entrySpans(f);
  const { lane, order } = entryLanes(spans);
  assert.equal(entryLanes(spans).lane, lane, "made once per list of spans");
  assert.ok(order.length >= 20);
  for (const i of order) assert.ok(lane[i] >= 0);
  for (const i of spans.keys()) if (spans[i].form === "counter") assert.equal(lane[i], -1);
  let overlaps = 0;
  for (const p of order)
    for (const q of order) {
      if (p >= q) continue;
      const a = spans[p];
      const b = spans[q];
      if (a.on < b.end && b.on < a.end) {
        overlaps++;
        assert.notEqual(lane[p], lane[q], `entries at ${a.on} and ${b.on}`);
      }
    }
  assert.ok(overlaps > 5, "I/1 is a stretto fugue");
  // In onset order, an entry beginning with nothing sounding takes lane 0.
  let end = -Infinity;
  for (const i of order) {
    if (spans[i].on >= end) assert.equal(lane[i], 0);
    end = Math.max(end, spans[i].end);
  }
});

test("the entry marks never look at hit or miss, and the variant is a drawing choice only", () => {
  const fx = src("src/touch/box-fx.ts");
  const body = fx.slice(fx.indexOf("export function entryMarks"), fx.indexOf("const FIRE_CORE"));
  assert.ok(body.length > 500 && !/\.state\b|"hit"|"miss"/.test(body));
  const box = src("src/touch/MusicBox.tsx");
  assert.match(box, /FLAG_VARIANT: FlagVariant/);
  for (const p of ["src/bench/proto-game.ts", "src/touch/lanes.ts", "src/touch/engine.ts", "src/touch/piece-sound.ts"]) assert.ok(!/flagv|FLAG_VARIANT|entryMarks/.test(src(p)), p);
});

test("YOU breathes slowly (at most 1 Hz), on the wall clock, never on right or wrong", () => {
  const box = src("src/touch/MusicBox.tsx");
  const s = Number(/export const YOU_BREATH_S = ([\d.]+);/.exec(box)?.[1]);
  assert.ok(s >= 1, `one breath every ${s} s`);
  const at = box.indexOf("function youLabel");
  const fn = box.slice(at, box.indexOf("\n}\n", at));
  assert.ok(fn.length > 100 && !/state|hit|miss|grade|score/.test(fn));
  assert.match(box, /youLabel\(g, x, [^;]+fxClock\)/);
});
