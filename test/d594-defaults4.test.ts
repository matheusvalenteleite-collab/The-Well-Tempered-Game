/**
 * D594-D597, THE OWNER'S TWO DEFAULT CHANGES AFTER 2.52: I/24 ("sucks right now. Too slow and boring. We definitely need to
 * make its fast tempo the default one and change its instrument") on SID 64 with SYNTH KIT's staged build, and II/22
 * ("sounds much cooler as Krautrock and fast tempo as default") on KRAUTROCK with LIEBEZEIT, both opening on FAST.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const g0 = globalThis as unknown as Record<string, unknown>;
const store = new Map<string, string>();
g0.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const { TEMPO, tempoOf, standardTempo, OPENING_STEP, openingStep } = await import("../src/touch/tempi.ts");
const steps = await import("../src/bench/tempo-steps.ts");
const { PIECE_SOUND } = await import("../src/touch/piece-sound.ts");
const { FUGUE_STYLES, FUGUE_PICKS, drumStyleFor, homeFor } = await import("../src/touch/drum-library.ts");
const { scorePlan, TWEAKS } = await import("../src/touch/score-drums.ts");
const { GRID_TAILORS } = await import("../src/touch/drum-tailor.ts");
const { fugueById, barAt } = await import("../src/touch/fugue.ts");
const { formOf } = await import("../src/touch/form-points.ts");
const lab = await import("../src/bench/soundlab/lab-state.ts");
const { bpmOf } = await import("../src/bench/soundlab/lab-engine.ts");
const { IDEAS } = await import("../src/bench/soundlab/ideas.ts");

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const FUGUES = [1, 2].flatMap((b) => Array.from({ length: 24 }, (_, i) => `wtc${b}f${String(i + 1).padStart(2, "0")}`));

test("D594: I/24 and II/22 open on their FAST step (I/24 crotchet 43 → 60, II/22 117 → 164); every other fugue on DEFAULT", () => {
  assert.deepEqual(OPENING_STEP, { wtc1f24: "fast", wtc2f22: "fast" });
  assert.deepEqual(steps.stepTempi("wtc1f24"), { slow: 32, default: 43, fast: 60 });
  assert.deepEqual(steps.stepTempi("wtc2f22"), { slow: 88, default: 117, fast: 164 });
  for (const id of FUGUES) {
    const t = steps.stepTempi(id)!;
    assert.equal(tempoOf(id), t[openingStep(id)], id);
    assert.equal(t.default, TEMPO[id].normal, `${id}: DEFAULT is still the record's`);
    // Difficulty, stars and tiers stay on the recordings' median.
    assert.equal(standardTempo(id), TEMPO[id].median, id);
  }
  assert.equal(tempoOf("wtc1f01"), TEMPO.wtc1f01.normal);
});

test("D594: the button keeps all three; a player's DEFAULT is kept on a fugue that opens on FAST, its FAST not stored", () => {
  store.clear();
  steps.saveStep("wtc1f24", "default");
  assert.deepEqual(steps.readSteps(), { wtc1f24: "default" });
  steps.saveStep("wtc1f24", "fast");
  assert.deepEqual(steps.readSteps(), {});
  steps.saveStep("wtc1f01", "default");
  assert.deepEqual(steps.readSteps(), {});
  // The game: where nothing is chosen or the button is shut, the opening step.
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /tempoSteps\[id\] \?\? openingStep\(id\)\) : openingStep\(id\)/);
  assert.match(app, /const bpm = run \? run\.bpm : tempi \? tempi\[step\] : tempoOf\(f\.id\);/);
});

test("D594: the Sound Lab opens on the piece's step; DEFAULT there is the DEFAULT step", () => {
  assert.equal(lab.defaults("wtc1f24").tempo, "fast");
  assert.equal(lab.defaults("wtc2f22").tempo, "fast");
  assert.equal(lab.defaults("wtc1f01").tempo, "default");
  assert.equal(bpmOf("wtc1f24", "default"), 43);
  assert.equal(bpmOf("wtc1f24", "fast"), 60);
  assert.ok(!lab.linkOf(lab.defaults("wtc1f24")).includes("tempo"));
  const d = { ...lab.defaults("wtc1f24"), tempo: "default" as const };
  assert.match(lab.linkOf(d), /tempo=default/);
  assert.equal(lab.parseLink(lab.linkOf(d), () => true).settings.tempo, "default");
});

test("D595: II/22 on KRAUTROCK with LIEBEZEIT, tailored (the loop's variations held six bars, the tom's call on the entries)", () => {
  assert.equal(PIECE_SOUND.wtc2f22, "krautrock");
  assert.equal(FUGUE_STYLES.wtc2f22, "liebezeit");
  assert.equal(homeFor("wtc2f22", "krautrock"), "liebezeit");
  assert.equal(drumStyleFor("wtc2f22", "krautrock"), "liebezeit");
  assert.ok(FUGUE_PICKS.wtc2f22.includes("liebezeit"));
  assert.ok(GRID_TAILORS.wtc2f22.liebezeit.why.length > 40);
  assert.ok(IDEAS.some((i) => i.piece === "wtc2f22" && i.kind === "own" && i.sound === "krautrock" && i.style === "liebezeit"));
});

test("D596: I/24 on SID 64 with SYNTH KIT, D574's staged build kept: sparse at the start, the kick and crash at the climax, no timpani", () => {
  assert.equal(PIECE_SOUND.wtc1f24, "sid64");
  assert.equal(FUGUE_STYLES.wtc1f24, "scoreSynth");
  assert.equal(drumStyleFor("wtc1f24", "sid64"), "scoreSynth");
  // ORCHESTRA & ORGAN a choice: on it the fugue's own drums are not forced; the timpani still among the picks.
  assert.ok(FUGUE_PICKS.wtc1f24.includes("timpani"));
  assert.ok(IDEAS.some((i) => i.id === "finale-orchestra" && i.sound === "orchestraOrgan" && i.kind === "tailored"));
  assert.equal(TWEAKS.wtc1f24.stage, 0.4);
  assert.equal(TWEAKS.wtc1f24.climaxKit, true);
  const f = fugueById("wtc1f24");
  const fp = formOf(f);
  const p = scorePlan(f, "scoreSynth");
  assert.ok(!p.strokes.some((s) => s.piece === "timp" || s.piece === "bassDrum" || s.piece === "cymbals"), "an electronic kit: no timpani, no orchestral drums");
  for (const t of [fp.climax.peak, fp.climax.arrival]) {
    assert.ok(p.strokes.some((s) => s.tick === t && s.piece === "kick"), `the kick at ${barAt(f, t)}`);
    assert.ok(p.strokes.some((s) => s.tick === t && s.piece === "crash"), `the crash at ${barAt(f, t)}`);
  }
  const span = (a: number, b: number) => p.strokes.filter((s) => barAt(f, s.tick) >= a && barAt(f, s.tick) < b);
  const rate = (a: number, b: number) => span(a, b).length / (b - a);
  const vel = (a: number, b: number) => span(a, b).reduce((x, s) => x + s.vel, 0) / Math.max(1, span(a, b).length);
  assert.ok(rate(1, 16) < rate(38, 63) / 2, "the exposition sparse");
  assert.ok(vel(1, 16) < vel(69, 77) / 2, "the build to the final group");
});

test("D594-D596: the colour plans name the new sounds with their reasons; the orchestral plan kept", () => {
  const b1 = src("tools/touch/colour-plans/book1.ts");
  const b2 = src("tools/touch/colour-plans/book2.ts");
  assert.match(b1, /wtc1f24: \{[\s\S]*?sound: "sid64"[\s\S]*?sid64: \[[\s\S]*?orchestraOrgan: \[/);
  assert.match(b2, /wtc2f22: \{[\s\S]*?sound: "krautrock"[\s\S]*?krautrock: \[/);
});
