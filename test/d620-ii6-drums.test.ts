/**
 * D620-D622: II/6's drum candidates after the owner's "That didn't fit. Try another drum." on HOUSE 909: BREAKBEAT
 * tailored to II/6's score (drum-tailor.ts GRID_TAILORS.wtc2f06), a candidate the owner chooses from, not its HOME.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { strokesOf } from "./drum-strokes.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { homeFor } from "../src/touch/drum-library.ts";
import { GRIDS } from "../src/touch/drum-grids.ts";
import { tailoredGrid } from "../src/touch/drum-tailor.ts";

test("D622: II/6's HOME on SID 64 still HOUSE (the owner chooses first); the tailored break II/6's only", () => {
  assert.equal(homeFor("wtc2f06", "sid64"), "house");
  assert.notEqual(tailoredGrid("wtc2f06", "breakbeat", GRIDS.breakbeat), GRIDS.breakbeat);
  assert.equal(tailoredGrid("wtc2f04", "breakbeat", GRIDS.breakbeat), GRIDS.breakbeat);
  assert.equal(tailoredGrid("wtc2f06", "house", GRIDS.house), GRIDS.house);
});

test("D621: II/6's BREAKBEAT on the score: the pattern on its semiquavers and triplets, the hats on the runs, the release", async () => {
  const f = fugueById("wtc2f06");
  const tps = (f.tpq * tempoOf(f.id)) / 60;
  const st = await strokesOf(f, "sid64", "breakbeat");
  assert.ok(st.length > 500);
  const ons = new Set(f.voices.flat().map((n) => n[0]));
  const onsets = [...ons].sort((a, b) => a - b);
  const near = (t: number) => onsets.some((o) => Math.abs(o - t) <= 0.03 * tps);
  // every pattern stroke on the score's grid (twelfths of the beat: the semiquavers and the triplet semiquavers)
  const grid = new Set([0, 2, 3, 4, 6, 8, 9, 10]);
  const pat = st.filter((x) => x.role === null);
  const off = pat.filter((x) => {
    const p = ((x.tick % f.tpq) / f.tpq) * 12;
    return Math.abs(p - Math.round(p)) > 0.12 || !grid.has(Math.round(p) % 12);
  });
  assert.ok(off.length <= 0.01 * pat.length, `${off.length} of ${pat.length} pattern strokes off the score's grid`);
  // nine in ten of all its strokes on the score's own onsets (as written: 40 %)
  const on = st.filter((x) => near(x.tick)).length / st.length;
  assert.ok(on >= 0.9, `${(100 * on).toFixed(0)} % on the onsets`);
  // the subject's winding run (bar 1, its first two beats, triplet semiquavers): a hat on each of its attacks
  const run = f.voices[f.entries[0].voice].filter((n) => n[0] < 2 * f.tpq).map((n) => n[0]);
  assert.equal(run.length, 12);
  for (const t of run) assert.ok(st.some((x) => x.piece === "hat" && Math.abs(x.tick - t) < 0.02 * f.tpq), `a hat at the run's ${t}`);
  // the release: the leap of the first entry (beat 3's and) the snare with an open hat
  const leap = 2.5 * f.tpq;
  assert.ok(st.some((x) => x.piece === "openhat" && Math.abs(x.tick - leap) < 0.02 * f.tpq));
  assert.ok(st.some((x) => x.piece === "snare" && Math.abs(x.tick - leap) < 0.02 * f.tpq));
});
