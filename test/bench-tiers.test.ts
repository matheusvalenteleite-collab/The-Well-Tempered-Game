/**
 * D232, the progression: Book I's pairs in tiers by their fugue's stars (EASY, INTERMEDIATE, HARD, the
 * BOSS I/24), the unlock counts, what is kept, the boss's gate, the wheel's order, and each prelude's
 * riding threshold tuned to its tier (never harder than its fugue).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, PRELUDES } from "../src/touch/fugue.ts";
import { PRELUDE_RIDE_MS } from "../src/touch/lanes.ts";
import { difficultyOf } from "../src/bench/difficulty.ts";
import { BOSS, openTiers, PRELUDE_FIT, preludeRideMs, struckLoad, tierCards, tierFugues, tierOf, tierToGo, TIER_RIDE_MS, unlockLine } from "../src/bench/tiers.ts";
import { beatenFugues, locked, readStages, recordFugue, recordPrelude, STAGES_KEY, tierLocked, unlockAll } from "../src/bench/stages.ts";
import { FEATS_KEY } from "../src/bench/feats.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const id = (n: number, k = "f") => `wtc1${k}${String(n).padStart(2, "0")}`;
const ids = (ns: number[]) => ns.map((n) => id(n));
const EASY = [1, 4, 6, 8, 12, 14, 16, 18, 22, 23];
const INTERMEDIATE = [2, 5, 11, 13, 17, 20];
const HARD = [3, 7, 9, 10, 15, 19, 21];

test("D232: the tiers, from the fugues' stars (I/24 the boss)", () => {
  assert.deepEqual(tierFugues("EASY"), ids(EASY));
  assert.deepEqual(tierFugues("INTERMEDIATE"), ids(INTERMEDIATE));
  assert.deepEqual(tierFugues("HARD"), ids(HARD));
  assert.deepEqual(tierFugues("BOSS"), [BOSS]);
  assert.equal(tierOf("wtc1p24"), "BOSS");
  assert.equal(tierOf("wtc1p02"), "INTERMEDIATE", "a prelude's tier is its fugue's");
  // D275: Book II's fugues by their stars too (play.html's colours), never the boss.
  assert.equal(tierOf("wtc2f01"), "HARD");
  assert.equal(tierOf("wtc2f08"), "EASY");
  assert.equal(tierOf("bwv1080-14"), null);
  // The wheel: by tier, Bach's order within.
  assert.deepEqual(tierCards().map((c) => c.number), [...EASY, ...INTERMEDIATE, ...HARD, 24]);
});

test("D232: the unlock counts: 5 EASY open INTERMEDIATE, 4 INTERMEDIATE open HARD, the other 23 the BOSS", () => {
  const won = new Set<string>();
  assert.deepEqual(openTiers(won), ["EASY"]);
  assert.equal(tierToGo("INTERMEDIATE", won), 5);
  assert.equal(unlockLine("INTERMEDIATE", won), "BEAT 5 MORE EASY FUGUES TO UNLOCK");
  for (const n of EASY.slice(0, 4)) won.add(id(n));
  assert.equal(unlockLine("INTERMEDIATE", won), "BEAT 1 MORE EASY FUGUE TO UNLOCK");
  won.add(id(INTERMEDIATE[0])); // not an EASY one: does not count
  assert.deepEqual(openTiers(won), ["EASY"]);
  won.add(id(EASY[4]));
  assert.deepEqual(openTiers(won), ["EASY", "INTERMEDIATE"]);
  assert.equal(unlockLine("HARD", won), "BEAT 3 MORE INTERMEDIATE FUGUES TO UNLOCK");
  for (const n of INTERMEDIATE.slice(1, 4)) won.add(id(n));
  assert.deepEqual(openTiers(won), ["EASY", "INTERMEDIATE", "HARD"]);
});

test("D232: the boss opens only when all the other 23 fugues are beaten", () => {
  const all = [...EASY, ...INTERMEDIATE, ...HARD].map((n) => id(n));
  assert.equal(all.length, 23);
  const won = new Set(all.slice(0, 22));
  assert.ok(!openTiers(won).includes("BOSS"));
  assert.equal(unlockLine("BOSS", won), "BEAT 1 MORE FUGUE TO UNLOCK");
  won.add(BOSS); // the boss itself does not count
  assert.ok(!openTiers(won).includes("BOSS"));
  won.add(all[22]);
  assert.deepEqual(openTiers(won), ["EASY", "INTERMEDIATE", "HARD", "BOSS"]);
});

test("D232: a new player: only EASY preludes playable; their fugues locked until each prelude is beaten; Book II and XIV open", () => {
  store.clear();
  for (let n = 1; n <= 24; n++) {
    assert.equal(locked(id(n, "p")), !EASY.includes(n), `prelude ${n}`);
    assert.ok(locked(id(n)), `fugue ${n}`);
  }
  assert.ok(!locked("wtc2f05") && !locked("wtc2f01") && !locked("bwv1080-14"));
  recordPrelude("wtc1p02", "A", false); // a closed tier's prelude (cannot be chosen; even if kept) does not open its fugue
  assert.ok(locked("wtc1f02") && tierLocked("wtc1f02"));
  assert.ok(!unlockAll(), "no ?unlock=all outside a browser");
});

test("D232: fugues beaten are kept (whole, not failed); the run that opens a tier says so; the feats' fugues played whole count", () => {
  store.clear();
  assert.deepEqual(recordFugue("wtc1f01", "B", true, true), [], "failed");
  assert.deepEqual(recordFugue("wtc1f01", "B", false, false), [], "not from the start");
  assert.deepEqual(recordFugue("wtc2f01", "B", false, true), [], "Book II not kept");
  assert.equal(beatenFugues().size, 0);
  for (const n of [1, 4, 6, 8]) assert.deepEqual(recordFugue(id(n), "C", false, true, "2026-10-23"), []);
  assert.deepEqual(recordFugue("wtc1f12", "A", false, true, "2026-10-24"), ["INTERMEDIATE"]);
  assert.deepEqual(recordFugue("wtc1f12", "S", false, true, "2026-10-25"), [], "opened once");
  assert.deepEqual(readStages().wtc1f12, { beaten: "2026-10-24", best: "S" });
  assert.ok(JSON.parse(store.get(STAGES_KEY)!).wtc1f01);
  // INTERMEDIATE preludes now playable, their fugues still behind the prelude.
  assert.ok(!locked("wtc1p02") && locked("wtc1f02") && locked("wtc1p03"));
  // A player's past: the fugues the feats remember played whole.
  store.clear();
  store.set(FEATS_KEY, JSON.stringify({ earned: {}, done: ids([1, 4, 6, 8, 12]).concat("wtc2f01") }));
  assert.deepEqual([...beatenFugues()].sort(), ids([1, 4, 6, 8, 12]));
  assert.ok(!locked("wtc1p05"));
});

test("D232: each prelude's riding threshold by its tier, and its struck notes no quicker than its fugue's busiest voice", () => {
  assert.deepEqual(TIER_RIDE_MS, { EASY: 250, INTERMEDIATE: 200, HARD: PRELUDE_RIDE_MS, BOSS: PRELUDE_RIDE_MS });
  const rows: string[] = [];
  for (const p of PRELUDES.filter((x) => x.book === 1)) {
    const t = tierOf(p.id)!;
    const ms = preludeRideMs(p.id);
    assert.ok(ms >= TIER_RIDE_MS[t], p.id);
    const load = struckLoad(p);
    const busiest = difficultyOf(fugueById(p.id.replace("wtc1p", "wtc1f"))).busiest;
    assert.ok(load <= busiest + 1e-9, `${p.id}: ${load}/s struck > its fugue's ${busiest}/s`);
    // A fit is the least (by 10 ms) that does it.
    if (PRELUDE_FIT[p.id]) assert.ok(struckLoad(p, ms - 10) > busiest, `${p.id}: ${ms - 10} ms would do`);
    rows.push(`${p.number}\t${t}\t${ms}\t${load.toFixed(2)}\t${busiest.toFixed(2)}`);
  }
  assert.equal(preludeRideMs("wtc2p01"), PRELUDE_RIDE_MS, "Book II: as before");
  if (process.env.D232_TABLE) console.log(`no\ttier\tms\tstruck/s\tfugue busiest/s\n${rows.join("\n")}`);
});
