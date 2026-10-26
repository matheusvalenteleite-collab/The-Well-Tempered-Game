// D199: each fugue's NORMAL (median of recordings) and SLOW tempo (the data keeps SLOW; D208 plays NORMAL only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FUGUES, PIECES } from "../src/touch/fugue.ts";
import { TEMPO, tempoOf } from "../src/touch/tempi.ts";

const fugues = PIECES.filter((f) => f.kind === "fugue" || f.id.startsWith("bwv1080"));

test("every fugue and Contrapunctus XIV has a normal and a slow tempo", () => {
  assert.equal(fugues.length, 49);
  assert.ok(FUGUES.every((f) => TEMPO[f.id]));
  for (const f of fugues) {
    const t = TEMPO[f.id];
    assert.ok(t, f.id);
    assert.ok(Number.isInteger(t.normal) && Number.isInteger(t.slow), f.id);
    assert.ok(t.slow < t.normal, `${f.id}: slow ${t.slow} < normal ${t.normal}`);
    assert.ok(t.slow >= 30 && t.slow >= 0.45 * t.normal - 1, `${f.id}: slow ${t.slow}`);
    assert.ok(t.normal >= 30 && t.normal <= 220, `${f.id}: normal ${t.normal}`);
    assert.ok(t.iqr[0] <= t.median && t.median <= t.iqr[1], `${f.id}: median inside its IQR`);
    // D285: on the slow side: at most the lower quartile, never under the slowest recording; the busiest
    // voice at most 4.5 notes a second unless that is slower than every recording.
    assert.ok(t.normal <= t.iqr[0] && t.normal >= t.range[0], `${f.id}: normal ${t.normal} in ${t.range[0]}..${t.iqr[0]}`);
    assert.ok(t.busiest <= 4.55 || t.normal === t.range[0], `${f.id}: ${t.busiest} notes a second`);
    assert.ok(t.n >= 1 && (t.n >= 5) === !t.flag, `${f.id}: flagged iff fewer than 5`);
    assert.equal(tempoOf(f.id), t.normal);
  }
  assert.equal(Object.keys(TEMPO).length, 49);
});

test("the display unit matches the meter, and its tempo is the same speed", () => {
  const per: Record<string, [string, number]> = {
    "2/4": ["♩", 1], "3/4": ["♩", 1], "4/4": ["♩", 1], "6/4": ["𝅗𝅥.", 1 / 3],
    "2/2": ["𝅗𝅥", 0.5], "3/2": ["𝅗𝅥", 0.5], "4/2": ["𝅗𝅥", 0.5],
    "3/8": ["♩.", 2 / 3], "6/8": ["♩.", 2 / 3], "9/8": ["♩.", 2 / 3],
    "6/16": ["♪.", 4 / 3], "12/16": ["♪.", 4 / 3],
  };
  for (const f of fugues) {
    const t = TEMPO[f.id];
    const [unit, k] = per[f.meter] ?? assert.fail(`${f.id}: meter ${f.meter}`);
    assert.equal(t.unit, unit, f.id);
    assert.ok(Math.abs(t.unitBpm.normal - t.normal * k) <= 0.5, f.id);
    assert.ok(Math.abs(t.unitBpm.slow - t.slow * k) <= 0.5, f.id);
  }
});

test("every fugue's tempo rests on sourced recordings", () => {
  const rows = readFileSync(new URL("../data/tempi/recordings.csv", import.meta.url), "utf8").trim().split("\n");
  const head = rows[0].split(",");
  assert.deepEqual(head.slice(0, 6), ["piece", "performer", "instrument", "year", "duration", "source"]);
  const count: Record<string, number> = {};
  for (const r of rows.slice(1)) {
    const id = r.split(",")[0];
    count[id] = (count[id] ?? 0) + 1;
    assert.match(r, /https?:\/\//, "a source URL on every row");
  }
  for (const f of fugues) assert.equal(count[f.id], TEMPO[f.id].n, f.id);
});

test("D229: Book I's preludes at Ishizaka's median bar; Book II's keep their default; unknown pieces get 46", () => {
  assert.equal(tempoOf("wtc1p01"), 55);
  assert.equal(tempoOf("wtc1p02"), 100);
  assert.equal(tempoOf("wtc2p01"), 42);
  assert.equal(tempoOf("nope"), 46);
});
