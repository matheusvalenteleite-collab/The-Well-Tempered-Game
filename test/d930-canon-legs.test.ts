/**
 * D930 (canons session; batches 1 and 2): every Goldberg canon and the Inventions' two canons drawn by the echo lane, as
 * legs (the leader changes voice) matched by staff step (a third, a sixth, a seventh, a ninth change size in semitones).
 * Each count checked against the game's own notes: how many of the follower's notes in the leg are answers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { CANONS, echoPairs } from "../src/touch/canon-echo.ts";

/** [id, leg, answers at least, out of the follower's notes in the leg's span]. */
const COUNTS: [string, number, number][] = [
  ["bwv988-03", 0, 129],
  ["bwv988-06", 0, 85],
  ["bwv988-09", 0, 93],
  ["bwv988-12", 0, 109],
  ["bwv988-12", 1, 93],
  ["bwv988-15", 0, 153],
  ["bwv988-18", 0, 74],
  ["bwv988-21", 0, 142],
  ["bwv988-24", 0, 56],
  ["bwv988-24", 1, 80],
  ["bwv988-24", 2, 43],
  ["bwv988-27", 0, 113],
  ["bwv988-27", 1, 125],
  ["bwv773", 0, 99],
  ["bwv773", 1, 101],
  ["bwv773", 2, 23],
  ["bwv779", 0, 60],
  ["bwv779", 1, 38],
];

test("every Goldberg canon is tagged, and the Inventions 2 and 8", () => {
  for (const v of [3, 6, 9, 12, 15, 18, 21, 24, 27]) assert.ok(CANONS[`bwv988-${String(v).padStart(2, "0")}`], String(v));
  assert.ok(CANONS.bwv773 && CANONS.bwv779);
});

test("each leg pairs the leader's notes with the follower's, by its delay and interval (or mirror), as many as the score has", async () => {
  await loadExtras();
  for (const [id, li, least] of COUNTS) {
    const f = fugueById(id);
    const L = CANONS[id].legs[li];
    const pairs = echoPairs(f).filter((p) => p.leg === li);
    assert.ok(pairs.length >= least, `${id} leg ${li}: ${pairs.length} < ${least}`);
    for (const { a, b } of pairs) {
      assert.equal(b.on, a.on + L.delay);
      assert.ok(L.dux.includes(a.voice) && L.comes.includes(b.voice));
      assert.equal(L.contrary ? a.step + b.step : b.step - a.step, L.steps);
      assert.ok(a.on >= (L.from - 1) * f.barTicks && a.on < (L.to - 1) * f.barTicks);
    }
    // No answer claimed twice.
    assert.equal(new Set(pairs.map((p) => `${p.b.voice}:${p.b.on}`)).size, pairs.length);
  }
});

test("Variation 12 after the double bar: the soprano answers the lower voices (the pilot paired 11 of its 95 notes)", async () => {
  await loadExtras();
  const f = fugueById("bwv988-12");
  const half = 16 * f.barTicks;
  const sop = f.voices[0].filter((n) => n[0] >= half + f.barTicks);
  const answered = echoPairs(f).filter((p) => p.leg === 1 && p.b.voice === 0).length;
  assert.ok(answered / sop.length > 0.95, `${answered}/${sop.length}`);
});

test("diatonic: Variation 9's third is three or four semitones, all one leg", async () => {
  await loadExtras();
  const sizes = new Set(echoPairs(fugueById("bwv988-09")).map((p) => p.a.midi - p.b.midi));
  assert.deepEqual([...sizes].sort(), [3, 4]);
});

test("the leader changes: Var. 24 at bars 9 and 25, Var. 27 at bar 17, each named once; drawing only", () => {
  assert.deepEqual(CANONS["bwv988-24"].legs.map((l) => l.from), [1, 9, 25]);
  assert.deepEqual(CANONS["bwv988-27"].legs.map((l) => [l.dux[0], l.comes[0]]), [[1, 0], [0, 1]]);
  // D970: each change of leader opens with a big morph (canon-ribbon.ts), named by its leg's label
  const e = readFileSync(new URL("../src/touch/canon-ribbon.ts", import.meta.url), "utf8");
  assert.match(e, /const structural = li === 0 \|\| L\.label !== spec\.legs\[li - 1\]\.label;/);
  assert.ok(!/score|grade|"hit"|"miss"/.test(e.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
});

test("at most one token in flight a beat in each leg (Var. 24's two-bar delay: no column of tokens at the playhead)", async () => {
  await loadExtras();
  const { beatOf } = await import("../src/touch/fugue.ts");
  for (const id of Object.keys(CANONS)) {
    const f = fugueById(id);
    const beat = beatOf(f).ticks;
    const pairs = echoPairs(f);
    const flying = pairs.filter((p) => p.flies);
    assert.equal(new Set(flying.map((p) => `${p.leg}:${Math.floor(p.a.on / beat)}`)).size, flying.length, id);
    // at any moment, no more tokens in flight than beats in the delay (+1)
    const L = CANONS[id].legs;
    for (const p of flying) {
      const now = p.a.on;
      const n = flying.filter((q) => q.leg === p.leg && now >= q.a.on && now < q.b.on).length;
      assert.ok(n <= Math.ceil(L[p.leg].delay / beat) + 1, `${id} ${n}`);
    }
  }
});
