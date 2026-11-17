// D199: each fugue's NORMAL (median of recordings) and SLOW tempo (the data keeps SLOW; D208 plays NORMAL only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FUGUES, PIECES } from "../src/touch/fugue.ts";
import { PRELUDE_TEMPO, TEMPO, fastTempo, OPENING_STEP, tempoOf } from "../src/touch/tempi.ts";

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
    // voice at most 5.5 notes a second (D312) unless that is slower than every recording.
    // D312: the 35th percentile (between the lower quartile and the median), never under the slowest recording.
    assert.ok(t.normal <= t.median && t.normal >= t.range[0], `${f.id}: normal ${t.normal} in ${t.range[0]}..${t.median}`);
    assert.ok(t.busiest <= 5.55 || t.normal === t.range[0], `${f.id}: ${t.busiest} notes a second`);
    assert.ok(t.n >= 1 && (t.n >= 5) === !t.flag, `${f.id}: flagged iff fewer than 5`);
    // D594: a fugue that opens on FAST (I/24, II/22) plays it; every other its NORMAL.
    assert.equal(tempoOf(f.id), OPENING_STEP[f.id] === "fast" ? fastTempo(t) : t.normal, f.id);
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

test("D861: the 48 preludes by the fugues' rule, from their own recordings; unknown pieces get 46", () => {
  const preludes = PIECES.filter((f) => f.kind === "prelude" && /^wtc[12]p\d\d$/.test(f.id));
  assert.equal(preludes.length, 48);
  assert.equal(Object.keys(PRELUDE_TEMPO).length, 48);
  const rows = readFileSync(new URL("../data/tempi/prelude-recordings.csv", import.meta.url), "utf8").trim().split("\n");
  assert.deepEqual(rows[0].split(","), ["piece", "performer", "instrument", "year", "duration", "source", "quarters", "note"]);
  const count: Record<string, number> = {};
  for (const r of rows.slice(1)) {
    const id = r.split(",")[0];
    count[id] = (count[id] ?? 0) + 1;
    assert.match(r, /https?:\/\//, "a source URL on every row");
  }
  for (const f of preludes) {
    const t = PRELUDE_TEMPO[f.id];
    assert.ok(t, f.id);
    assert.equal(count[f.id], t.n, f.id);
    assert.ok(t.n >= 20, `${f.id}: ${t.n} recordings`);
    // D312's bounds: between the slowest recording and the median, the busiest voice at most 5.5 notes a second
    // unless that is slower than every recording.
    assert.ok(t.normal <= t.median && t.normal >= t.range[0], `${f.id}: normal ${t.normal} in ${t.range[0]}..${t.median}`);
    assert.ok(t.busiest <= 5.55 || t.normal === t.range[0], `${f.id}: ${t.busiest} notes a second`);
    assert.equal(tempoOf(f.id), t.normal, f.id);
  }
  // Pinned: II/1 (was 42, D184's audit), and II/2, whose recordings mostly take both repeats (each half
  // read twice: were it read once, its tempo would be about half).
  assert.equal(tempoOf("wtc2p01"), 49);
  assert.equal(tempoOf("wtc2p02"), 79);
  assert.equal(tempoOf("wtc1p01"), 61);
  assert.equal(tempoOf("nope"), 46);
});

test("D861: a binary prelude's recordings are read over the halves they play", () => {
  const rows = readFileSync(new URL("../data/tempi/prelude-recordings.csv", import.meta.url), "utf8").trim().split("\n").slice(1);
  const len = (id: string) => { const f = PIECES.find((p) => p.id === id)!; return f.length / f.tpq; };
  const repeated = new Set<string>();
  for (const r of rows) {
    const [id] = r.split(",");
    const q = Number(r.split(",")[6]);
    if (/both repeats|first repeat|second repeat/.test(r)) {
      repeated.add(id);
      assert.ok(q > len(id) && q <= 2 * len(id) + 1e-9, `${id}: ${q} quarters played, ${len(id)} in the game`);
    } else assert.ok(Math.abs(q - len(id)) < 1e-9, `${id}: ${q}`);
  }
  assert.deepEqual([...repeated].sort(), ["wtc1p24", "wtc2p02", "wtc2p05", "wtc2p08", "wtc2p09", "wtc2p10", "wtc2p12", "wtc2p15", "wtc2p18", "wtc2p20", "wtc2p21"]);
  // Loesser's own repeats, read from his bar lines (D131): both in II/2, only the first in II/5.
  assert.match(rows.find((r) => r.startsWith("wtc2p02,Arthur Loesser"))!, /both repeats/);
  assert.match(rows.find((r) => r.startsWith("wtc2p05,Arthur Loesser"))!, /first repeat/);
});
