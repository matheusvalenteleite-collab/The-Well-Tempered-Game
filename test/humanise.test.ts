import { test } from "node:test";
import assert from "node:assert/strict";
import { humanisePlan } from "../src/audio/humanise.ts";
import { slotLayout, timeline } from "../src/counterpoint/layout.ts";

const cantus = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];

test("humanise: deterministic, bounded, accents downbeats, slows only at the end, detaches repeats", () => {
  const layout = slotLayout("second", cantus.length);
  const cp = layout.map((_, k) => (k === 0 ? "rest" : ["A4", "B4", "C5", "C5", "D5", "A4"][k % 6]));
  const ev = timeline(cantus, layout, cp.map((x) => (x === "rest" ? null : x)));
  const a = humanisePlan(ev);
  assert.deepEqual(a, humanisePlan(ev));
  for (const s of a) {
    assert.ok(Math.abs(s.delay) <= 0.008 + 1e-9);
    for (const n of Object.values(s.notes)) assert.ok(n.velocity >= 0.4 && n.velocity <= 1 && n.length > 0.5 && n.length < 1.3);
  }
  const down = a.filter((_, k) => Number.isInteger(ev[k].at)).flatMap((s) => (s.notes.counterpoint ? [s.notes.counterpoint.velocity] : []));
  const up = a.filter((_, k) => !Number.isInteger(ev[k].at)).flatMap((s) => (s.notes.counterpoint ? [s.notes.counterpoint.velocity] : []));
  const avg = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
  assert.ok(avg(down) > avg(up));
  assert.ok(a.slice(0, Math.floor(a.length * 0.6)).every((s) => s.stretch === 1));
  assert.ok(a[a.length - 1].stretch > 1.2);
  // C5 C5 (slots 3 -> 4 when k % 6 = 2, 3): the first of the pair is shortened.
  const k = ev.findIndex((e, i) => e.counterpoint === "C5" && ev[i + 1]?.counterpoint === "C5");
  assert.ok(k >= 0 && a[k].notes.counterpoint.length < 0.9);
});
