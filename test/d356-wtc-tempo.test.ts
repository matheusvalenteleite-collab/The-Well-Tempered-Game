/**
 * D356: the WTC fugues' tempo (SLOW · DEFAULT · FAST, D351's button), opened in the friends' view by an A
 * (or better) on the fugue, everywhere in the unlocked view; a SLOW run's grade and score kept apart.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const g0 = globalThis as unknown as Record<string, unknown>;
const store = new Map<string, string>();
g0.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const { TEMPO } = await import("../src/touch/tempi.ts");
const { PIECE_SOUND } = await import("../src/touch/piece-sound.ts");
const { PRESETS } = await import("../src/touch/sound.ts");
const steps = await import("../src/bench/tempo-steps.ts");
const lite = await import("../src/bench/lite.ts");

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const FUGUES = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));

test("D356: every WTC fugue has three tempi by D351's rules (SLOW 0.75×; FAST 1.4× within 7.5 notes/s, at least 1.3× (D481))", () => {
  for (const id of FUGUES) {
    assert.ok(steps.isWtcFugue(id) && steps.stepKind(id) === "wtc", id);
    const t = steps.stepTempi(id)!;
    const d = TEMPO[id].normal;
    assert.equal(t.default, d, id);
    assert.equal(t.slow, Math.round(d * 0.75), id);
    assert.ok(t.fast >= Math.round(d * 1.3) && t.fast <= Math.round(d * 1.4), id);
    const fastLoad = (TEMPO[id].busiest * t.fast) / d;
    assert.ok(fastLoad <= 7.5 + 0.06 || t.fast === Math.round(d * 1.3), `${id}: ${fastLoad.toFixed(2)} notes/s at FAST`);
  }
  for (const id of ["wtc1p01", "wtc2p05", "inv01"]) assert.equal(steps.stepTempi(id), null, id);
});

test("D356: the sounds: SLOW the PIPE ORGAN, FAST CLASSIC CHIP, DEFAULT the fugue's own (PIECE_SOUND, read at runtime); never a step on the fugue's own sound", () => {
  for (const id of FUGUES) {
    assert.equal(steps.stepSound(id, "default"), undefined);
    const own = PIECE_SOUND[id];
    const slow = steps.stepSound(id, "slow")!;
    const fast = steps.stepSound(id, "fast")!;
    assert.equal(slow, own === "chamberOrgan" ? "pianoSampled" : "chamberOrgan", id);
    assert.equal(fast, own === "chip" ? "harpsichordSampled" : "chip", id);
    for (const p of [slow, fast]) assert.ok(PRESETS.some((x) => x.id === p), `${id}: ${p} a player's sound`);
    assert.notEqual(slow, own);
    assert.notEqual(fast, own);
  }
  // D351's pieces keep their table.
  assert.deepEqual([steps.stepSound("bwv1080-01", "slow"), steps.stepSound("bwv1080-01", "fast")], ["chamberOrgan", "chip"]);
});

test("D356: the unlock: a friend's WTC fugue opens its tempo with a B or better (D417; today's or before 1.52), never a C; the unlocked view everywhere; MORE BACH only unlocked", () => {
  store.clear();
  const st = () => lite.readLite();
  const open = (id: string, full = false) => steps.tempoOpen(id, full, lite.tempoEarned(id, st()));
  assert.equal(open("wtc1f01"), false);
  lite.recordLite("wtc1f01", false, true, "C");
  assert.equal(open("wtc1f01"), false, "a C does not open it");
  lite.recordLite("wtc1f01", true, true, "S");
  assert.equal(open("wtc1f01"), false, "a run the crowd left does not count");
  lite.recordLite("wtc1f01", false, true, "B");
  assert.equal(open("wtc1f01"), true, "D417: a B opens it");
  assert.equal(open("wtc1f02"), false, "only that fugue's");
  lite.recordLite("wtc2f03", false, true, "S");
  assert.equal(open("wtc2f03"), true, "an S, Book II's too");
  // A grade from before 1.52 stays earned.
  store.set(lite.LITE_KEY, JSON.stringify({ ...JSON.parse(store.get(lite.LITE_KEY)!), best: { ...st().best, wtc1f05: "A" } }));
  assert.equal(st().bestOld.wtc1f05, "A");
  assert.equal(open("wtc1f05"), true);
  // The owner's unlock: every fugue, and MORE BACH and CHORALES; a prelude never; MORE BACH never for a friend, even with an A.
  assert.equal(open("wtc2f24", true), true);
  assert.equal(open("bwv772", true), true);
  assert.equal(open("wtc1p01", true), false);
  lite.recordLite("bwv772", false, true, "S");
  assert.equal(open("bwv772"), false);
});

test("D356: the tempo kept per fugue on the device (tb-lite-tempo-v1, with D351's pieces)", () => {
  store.clear();
  steps.saveStep("wtc1f01", "fast");
  steps.saveStep("bwv772", "slow");
  steps.saveStep("wtc2f10", "slow");
  assert.deepEqual(JSON.parse(store.get(steps.TEMPO_STEP_KEY)!), { wtc1f01: "fast", bwv772: "slow", wtc2f10: "slow" });
  steps.saveStep("wtc1f01", "default");
  assert.deepEqual(steps.readSteps(), { bwv772: "slow", wtc2f10: "slow" });
});

test("D356: a SLOW run is kept apart (never replaces the A nor the best score); FAST counts", () => {
  store.clear();
  lite.recordLite("wtc1f01", false, true, "A");
  lite.recordLiteBest("wtc1f01", 1000);
  // At SLOW: finished, no grade given to the best; its own best apart.
  lite.recordLite("wtc1f01", false, true, undefined);
  assert.deepEqual(lite.recordLiteSlow("wtc1f01", "S", 5000), { before: null, fresh: true, old: null });
  assert.deepEqual(lite.recordLiteSlow("wtc1f01", "B", 4000), { before: 5000, fresh: false, old: null });
  const s = lite.readLite();
  assert.equal(s.best.wtc1f01, "A");
  assert.equal(s.scores["wtc1f01@0"], 1000, "D445: per voice");
  assert.equal(s.slowBest.wtc1f01, "S");
  assert.equal(s.slowScores.wtc1f01, 5000);
  // A friend's first finish at SLOW (the owner's view) is still a finish (its ✓), without a grade.
  lite.recordLite("wtc1f02", false, true, undefined);
  assert.ok(lite.readLite().beaten.includes("wtc1f02"));
  assert.equal(lite.readLite().best.wtc1f02, undefined);
  // The page: SLOW on a WTC fugue goes apart, any other run as before; the tempo on the result; the hint, translated.
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /const apart = step === "slow" && isWtcFugue\(f\.id\);/);
  assert.match(app, /recordLite\(f\.id, r\.failedBar !== null, platform === "mobile", apart \? undefined : r\.grade\)/);
  assert.match(app, /apart \? recordLiteSlow\(f\.id, r\.grade, r\.sheet\.final\) : recordLiteBest\(f\.id, r\.sheet\.final, played\[0\] \?\? voice\)/);
  assert.match(app, /id="result-tempo"/);
  assert.match(app, /tempoOpen\(id, full, tempoEarned\(id, lite\)\)/);
  assert.match(app, /id="pop-tempo-hint"[\s\S]{0,80}tr\("A B ON THIS FUGUE UNLOCKS TEMPO"\)/);
  for (const d of ["src/i18n/pt.ts", "src/i18n/es.ts"]) for (const k of ["A B ON THIS FUGUE UNLOCKS TEMPO", "KEPT APART FROM YOUR BEST"]) assert.match(src(d), new RegExp(`"${k}": "`), `${d} ${k}`);
});
