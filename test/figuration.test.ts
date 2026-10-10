import { test } from "node:test";
import assert from "node:assert/strict";
import { figure, FIGURATIONS } from "../src/continuo/figuration.ts";

// Two bars of a three-note chord held a whole bar each, and a final bar.
const chord = (bar: number, midis: number[]) => midis.map((midi) => ({ start: 2 * bar, end: 2 * bar + 2, midi, bar, pitch: String(midi) }));
const rh = [...chord(0, [60, 64, 67]), ...chord(1, [62, 65, 69]), ...chord(2, [60, 64, 67])];

test("figuration: every pattern stays inside its chord's span and keeps the last bar held", () => {
  for (const id of FIGURATIONS) {
    const out = figure(rh, id, 2);
    assert.equal(out.filter((n) => n.bar === 2).length, 3, id);
    for (const n of out.filter((x) => x.bar < 2)) {
      assert.ok(n.start >= 2 * n.bar - 1e-9 && n.end <= 2 * n.bar + 2 + 1e-9, `${id} ${n.start}-${n.end}`);
      assert.ok(n.end > n.start, id);
    }
  }
});

test("figuration: Alberti is low, high, middle, high in eighths, from the bar line", () => {
  const out = figure(rh, "alberti", 2).filter((n) => n.bar === 0);
  assert.deepEqual(out.slice(0, 8).map((n) => n.midi), [60, 67, 64, 67, 60, 67, 64, 67]);
  assert.deepEqual(out.slice(0, 2).map((n) => n.start), [0, 0.25]);
});

test("figuration: patterns repeat the whole chord and keep each note's rank", () => {
  const out = figure(rh, "quarters", 2).filter((n) => n.bar === 1);
  assert.equal(out.length, 12);
  assert.deepEqual(out.filter((n) => n.start === 2).map((n) => n.rank).sort(), [0, 1, 2]);
  const off = figure(rh, "afterbeat", 2).filter((n) => n.bar === 0);
  assert.ok(off.every((n) => Math.abs((n.start * 4) % 2 - 1) < 1e-9), "only the off-beat eighths");
});
