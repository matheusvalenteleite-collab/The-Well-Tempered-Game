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

test("D356, D434: the sounds: every step the fugue's own (the owner: \"keep each fugue own sound at every tempo\"); SLOW and FAST no longer change it", () => {
  assert.equal((steps as Record<string, unknown>).stepSound, undefined);
  assert.equal((steps as Record<string, unknown>).WTC_SOUND_ELSE, undefined);
  for (const id of FUGUES) assert.ok(PRESETS.some((x) => x.id === PIECE_SOUND[id]), `${id}: ${PIECE_SOUND[id]} a player's sound`);
  const app = src("src/bench/BenchApp.tsx");
  // D438: D434's one sound at every step, with D463's friends' choice once the fugue is unlocked (soundUnlocked).
  assert.match(app, /const mine = full \? chosen : Object\.fromEntries\(Object\.entries\(chosen\)\.filter\(\(\[p\]\) => soundUnlocked\(p, lite\)\)\);\s*return soundFor\(id, mine, DEFAULT_SOUND\);/);
});

test("D863: no tempo lock: every piece with tempi offers them from the start, a friend's too; a prelude has none", () => {
  store.clear();
  const open = (id: string, full = false) => steps.tempoOpen(id, full, lite.tempoEarned(id, lite.readLite()));
  assert.equal(open("wtc1f01"), true);
  assert.equal(open("wtc2f24"), true);
  assert.equal(open("bwv772"), true);
  assert.equal(open("bwv772", true), true);
  assert.equal(open("wtc1p01", true), false);
});

test("D863: a piece's tempo step forgotten when another piece is chosen", () => {
  store.clear();
  steps.saveStep("wtc1f01", "slow");
  steps.saveStep("wtc1f02", "fast");
  const left = steps.forgetStep("wtc1f01");
  assert.equal(left.wtc1f01, undefined);
  assert.equal(steps.readSteps().wtc1f01, undefined);
  assert.equal(steps.readSteps().wtc1f02, "fast");
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
