/**
 * D485, OBBLIGATO (the subject boost): playing well in the stretch just before one of the player's own
 * subject entries offers a layer (another instrument, on top of the player's own) for that entry and for
 * the later entries overlapping it; the player takes it with the button or it lapses at the entry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { boostedSpans, drawLayer, familyOf, LAYERS, LAYER_FLOOR, octavesFor, offerWindow, OBBLIGATO, OCTAVE_ODDS, playedWell, presetPatchIds, registerOf, tierOf, TIER_ODDS, WACKIEST, WELL, type Family, type GradedNote, type Register } from "../src/bench/obbligato.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";
import { obbRun } from "./d485-sim.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { silentChip } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";

/** A seeded generator (the tests' draws repeatable). */
function rng(seed = 12345) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const passage = (piece: string, voice: number, toBar: number, bpm = 80): LabPassage => ({ piece, voice, fromBar: 1, toBar, bpm, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null });

// ---------- the window ----------

test("D485: the window: from the end of the previous entry, 2 to 4 bars, closing a bar before the entry", () => {
  const bar = 100;
  const P = { voice: 1, on: 1000, end: 1500 };
  // The previous entry ended long before: the window is the last 4 bars before the close.
  assert.deepEqual(offerWindow(P, [{ voice: 0, on: 0, end: 200 }, P], bar, 0), { from: 500, close: 900 });
  // It ended at 650: the window from there would be 2.5 bars.
  assert.deepEqual(offerWindow(P, [{ voice: 0, on: 0, end: 650 }, P], bar, 0), { from: 650, close: 900 });
  // It ended at 800: never under 2 bars (back to 700).
  assert.deepEqual(offerWindow(P, [{ voice: 0, on: 300, end: 800 }, P], bar, 0), { from: 700, close: 900 });
  // The passage began at 750: no 2 bars to judge, no offer.
  assert.equal(offerWindow(P, [P], bar, 750), null);
});

test("D485: a good stretch long ago followed by a bad one gives no offer; only the stretch before the entry counts", () => {
  const bar = 100;
  const P = { voice: 1, on: 1000, end: 1500 };
  const w = offerWindow(P, [{ voice: 0, on: 0, end: 200 }, P], bar, 0)!;
  const notes = (grade: (on: number) => GradedNote["grade"]): GradedNote[] => Array.from({ length: 36 }, (_, k) => ({ on: k * 25, grade: grade(k * 25) }));
  // Perfect for 6 bars, then two misses in the last 2 bars before the close.
  assert.equal(playedWell(notes((on) => (on === 750 || on === 825 ? "miss" : "perfect")), w), false);
  // Perfect for 6 bars, then only GOOD (late or early) in the window.
  assert.equal(playedWell(notes((on) => (on >= 500 ? "good" : "perfect")), w), false);
  // Badly long ago (outside the window), well just before: the offer.
  assert.equal(playedWell(notes((on) => (on < 500 ? "miss" : "perfect")), w), true);
  // Most notes PERFECT, a few GOOD, none missed: the offer.
  assert.equal(playedWell(notes((on) => (on % 250 === 0 ? "good" : "perfect")), w), true);
  // Too few notes (the voice resting before its entry): no offer.
  assert.equal(playedWell(notes((on) => "perfect").filter((n) => n.on < 500 || n.on >= 850), w), false);
  assert.equal(WELL.maxMisses, 0);
});

test("D485: the simulated players: a careful player is offered the entry about a bar ahead, a sloppy or wrong one is not", () => {
  const p = passage("wtc1f02", 0, 31);
  const clean = obbRun(synthRun(p, { gap: 0.03, jitter: 0.03, seed: 3 }), { on: true, take: false });
  assert.ok(clean.offers.length >= 2, `offers ${clean.offers.length}`);
  const bar = clean.g.f.barTicks;
  for (const o of clean.offers) assert.ok(o.entryOn - o.at >= 0.95 * bar && o.entryOn - o.at <= 1.1 * bar, `shown ${(o.entryOn - o.at) / bar} bars ahead`);
  // Never taken: each lapsed at its entry; no layer ever sounded, no boost.
  assert.equal(clean.g.offer, null);
  assert.equal(clean.calls.filter((c) => c.includes('"couple":false')).length, 0);
  // A wrong note every 8: no offer. A scatter of ±120 ms (GOOD rather than PERFECT): hardly ever.
  assert.equal(obbRun(synthRun(p, { gap: 0.03, jitter: 0.03, wrongEvery: 8, seed: 3 }), { on: true, take: false }).offers.length, 0);
  let loose = 0;
  for (const seed of [3, 5, 7]) loose += obbRun(synthRun(p, { gap: 0.03, jitter: 0.12, seed }), { on: true, take: false }).offers.length;
  assert.ok(loose <= 1, `loose offers ${loose}`);
  // Off (the lab, any game not asking for it): never an offer.
  assert.equal(obbRun(synthRun(p, { gap: 0.03, jitter: 0.03, seed: 3 }), { on: false, take: true }).offers.length, 0);
});

test("D485: never in a lesson, the tutorial, a demonstration, WITH KIMIKO or BLUETOOTH MODE", () => {
  const g = labGame(passage("wtc1f02", 0, 31), silentChip({ t: 0 }));
  const o = g.o as unknown as Record<string, unknown>;
  o.obbligato = true;
  assert.equal(g.obbligatoOn, true);
  for (const k of ["wait", "demo", "solo", "coach", "guide", "quiet", "side", "widen", "countBeats", "readingAt", "dress", "click", "her", "bt"]) {
    o[k] = k === "coach" ? "thumbs" : k === "quiet" ? {} : k === "readingAt" || k === "dress" ? [] : k === "widen" || k === "countBeats" ? 2 : k === "click" ? { full: 0, gone: 1 } : true;
    assert.equal(g.obbligatoOn, false, k);
    delete o[k];
  }
});

// ---------- the stretto rule ----------

test("D485: the stretto rule: the player's entry and the later entries overlapping it are boosted; earlier ones are not", () => {
  const P = { voice: 1, on: 1000, end: 1500 };
  const all = [
    { voice: 0, on: 800, end: 1300 }, // began before the player's: not boosted, even in stretto
    P,
    { voice: 2, on: 1200, end: 1700 }, // begins after, overlaps: boosted
    { voice: 3, on: 1500, end: 2000 }, // begins as the player's ends: not boosted
    { voice: 0, on: 1000, end: 1500 }, // begins with it: not after it
  ];
  assert.deepEqual(boostedSpans(P, all), [P, { voice: 2, on: 1200, end: 1700 }]);
});

test("D485: in the game, a boost taken sounds its layer on the later entry in stretto, never on the earlier one", () => {
  // Fugue I/16, the bass's entry at bar 13: the alto's (bar 12) began before it, the soprano's (bar 15) after.
  const run = obbRun(synthRun(passage("wtc1f16", 3, 17), { gap: 0.03, jitter: 0.03, seed: 3 }), { on: true, take: true, rng: rng(7) });
  const f = run.g.f;
  const P = f.entries.find((e) => e.voice === 3 && e.bar === 13)!;
  const offer = run.offers.find((o) => o.entryOn === P.on);
  assert.ok(offer, "the bass's entry offered");
  const earlier = f.entries.find((e) => e.voice === 1 && e.bar === 12)!;
  const later = f.entries.find((e) => e.voice === 0 && e.bar === 15)!;
  assert.deepEqual(offer.spans.map((s) => s.voice), [3, 0]);
  assert.ok(run.layered.some((x) => x.voice === 0 && x.on >= later.on && x.on < later.end), "the soprano's later entry layered");
  assert.ok(!run.layered.some((x) => x.voice === 1 && x.on >= earlier.on && x.on < earlier.end), "the alto's earlier entry never layered");
  const spans = run.offers.flatMap((o) => o.spans);
  assert.ok(run.layered.every((x) => spans.some((s) => s.voice === x.voice && x.on >= s.on && x.on < s.end)), "only inside the boosted entries");
  assert.ok(earlier.end > P.on && later.on < P.end, "a stretto both ways");
});

// ---------- the level: a layer added, the main instrument untouched ----------

/** The calls with the layer's (and every call on a layer's sound) taken out, the sounds renumbered. */
function withoutLayers(calls: string[]): string[] {
  const layerTags = new Set(calls.filter((c) => c.startsWith("note(") && c.includes('"couple":false')).map((c) => c.split(" -> ")[1]));
  const kept = calls.filter((c) => !(c.startsWith("note(") && c.includes('"couple":false')) && !layerTags.has(c.split(".")[0]));
  const ren = new Map<string, string>();
  const tag = (t: string) => (ren.has(t) ? ren.get(t)! : (ren.set(t, `s${ren.size}`), ren.get(t)!));
  return kept.map((c) => c.replace(/\bs\d+\b/g, (t) => tag(t)));
}

test("D485: the boost adds a layer and changes nothing else: the main instrument's every call (its level included) as without it", () => {
  const log = synthRun(passage("wtc1f02", 0, 31), { gap: 0.03, jitter: 0.03, seed: 3 });
  const plain = obbRun(log, { on: true, take: false, rng: rng(1) });
  const boosted = obbRun(log, { on: true, take: true, rng: rng(1) });
  const layers = boosted.calls.filter((c) => c.startsWith("note(") && c.includes('"couple":false'));
  assert.ok(layers.length > 5, `layer notes ${layers.length}`);
  assert.deepEqual(withoutLayers(boosted.calls), plain.calls);
  // The layer in unison or whole octaves, at LAYER_LEVEL of its note's level, its own patch.
  const notes = plain.calls.filter((c) => c.startsWith("note("));
  assert.ok(notes.length > 100);
  // Only during the boosted entries: every layer note starts inside one (audio time of its onset).
  const g = boosted.g;
  const spans = boosted.offers.flatMap((o) => o.spans);
  for (const c of layers) {
    const at = JSON.parse(c.slice(5, c.lastIndexOf(") -> ")))[1] as number;
    const tick = (g as unknown as { tickAt: (t: number) => number }).tickAt(at);
    assert.ok(spans.some((s) => tick >= s.on - g.beat && tick < s.end + g.beat), `layer at tick ${tick}`);
  }
  // The scores alike: judging and scoring take nothing from the boost.
  assert.equal(boosted.g.score, plain.g.score);
  assert.equal(boosted.g.slips, plain.g.slips);
});

test("D485: the bass stays clear: no layer under LAYER_FLOOR; downward octaves only where the instrument and the floor allow", () => {
  for (const l of LAYERS) for (const k of octavesFor(l, 40, 55)) assert.ok(40 + 12 * k >= Math.max(l.lo, LAYER_FLOOR) && 55 + 12 * k <= l.hi, `${l.id} ${k}`);
  assert.ok(LAYER_FLOOR >= 36);
});

// ---------- the weighted draw ----------

const FAMILIES: [Family, string | null][] = [
  ["keys", "pianoSampled"],
  ["strings", "consCello"],
  ["voice", "singA"],
  ["console", "s16Violin"],
  ["chip", null],
  ["synth", "fmLead"],
];
const REGISTERS: [Register, number[]][] = [
  ["soprano", [67, 69, 71, 72, 74, 76, 77]],
  ["alto", [60, 62, 63, 65, 67, 68]],
  ["tenor", [52, 53, 55, 57, 58, 60]],
  ["bass", [40, 43, 45, 47, 48, 50]],
];

test("D485: the draw's tiers: the musical most often, the wackier less, the wackiest about one offer in sixteen (never more than one in six)", () => {
  for (const [fam, main] of FAMILIES)
    for (const [reg, midis] of REGISTERS) {
      assert.equal(familyOf(main as never), fam);
      assert.equal(registerOf(midis), reg);
      const r = rng(99);
      const n = 20000;
      const count = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        const d = drawLayer({ main: main as never, midis, rng: r })!;
        count[d.tier]++;
        assert.notEqual(d.layer.id, main ?? "chip", "never the main instrument");
        assert.equal(tierOf(d.layer, fam, reg), d.tier);
      }
      const share = count.map((c) => c / n);
      assert.ok(share[0] > share[1] && share[1] > share[2], `${fam} ${reg} ${share}`);
      assert.ok(share[2] <= 1 / 6 && share[2] >= 0.03, `${fam} ${reg} wackiest ${share[2]}`);
      for (const t of [0, 1, 2]) assert.ok(Math.abs(share[t] - TIER_ODDS[t]) < 0.03, `${fam} ${reg} tier ${t}: ${share[t]}`);
    }
});

test("D485: the musical tier is the obvious mix: a cello on a piano's bass, a tenor on its tenor, never a synthesizer", () => {
  const t0 = (fam: Family, reg: Register) => LAYERS.filter((l) => tierOf(l, fam, reg) === 0).map((l) => l.id);
  assert.ok(t0("keys", "bass").includes("consCello"));
  assert.ok(t0("keys", "tenor").includes("singT"));
  assert.ok(!t0("keys", "bass").includes("pianoSampled"));
  for (const [fam] of FAMILIES) for (const [reg] of REGISTERS) for (const id of t0(fam, reg)) assert.ok(["keys", "strings", "voice"].includes(LAYERS.find((l) => l.id === id)!.family), id);
  for (const id of WACKIEST) assert.ok(LAYERS.some((l) => l.id === id), id);
});

test("D485: the draw's pool filter (later: only the instruments met), and every instrument the sounds play is in the pool", () => {
  const met = new Set(["consCello", "singB", "s16Bassoon", "gbWave"]);
  const r = rng(3);
  for (let i = 0; i < 2000; i++) assert.ok(met.has(drawLayer({ main: "pianoSampled", midis: [40, 45, 50], pool: (l) => met.has(l.id), rng: r })!.layer.id));
  assert.equal(drawLayer({ main: "pianoSampled", midis: [40, 45, 50], pool: () => false, rng: r }), null);
  const ids = new Set(LAYERS.map((l) => l.id as string));
  for (const id of presetPatchIds()) assert.ok(ids.has(id) || ["orgPleno", "orgPedalPleno"].includes(id), `${id} missing from LAYERS`);
});

test("D485: the octave: the same most of the time, one octave either way rarer, two rarest, always within the instrument's compass", () => {
  // An alto entry on wide instruments (every octave open).
  const midis = [60, 62, 64, 65, 67];
  const wide = (l: { id: string }) => ["pianoSampled", "fmPiano", "chip", "orgPrincipal", "sidSaw", "modOrgan", "tomStrings", "solNasal", "fmClav"].includes(l.id);
  const r = rng(5);
  const n = 30000;
  const by = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const d = drawLayer({ main: "consCello", midis, pool: (l) => wide(l) && octavesFor(l, 60, 67).length === 5, rng: r })!;
    by.set(d.octave, (by.get(d.octave) ?? 0) + 1);
  }
  const s = (k: number) => (by.get(k) ?? 0) / n;
  assert.ok(Math.abs(s(0) - OCTAVE_ODDS[0]) < 0.02, `unison ${s(0)}`);
  assert.ok(Math.abs(s(1) + s(-1) - 0.15) < 0.02 && Math.abs(s(2) + s(-2) - 0.05) < 0.01, `±1 ${s(1) + s(-1)}, ±2 ${s(2) + s(-2)}`);
  assert.ok(s(0) > s(1) + s(-1) && s(1) + s(-1) > s(2) + s(-2) && s(2) > 0 && s(-2) > 0);
  // Every draw within its instrument's compass (and over the floor), whatever the register.
  const r2 = rng(11);
  for (const [, ms] of REGISTERS)
    for (let i = 0; i < 3000; i++) {
      const d = drawLayer({ main: "pianoSampled", midis: ms, rng: r2 })!;
      const lo = Math.min(...ms) + 12 * d.octave;
      const hi = Math.max(...ms) + 12 * d.octave;
      assert.ok(lo >= d.layer.lo && hi <= d.layer.hi && lo >= LAYER_FLOOR, `${d.layer.id} ${d.octave}`);
    }
});

test("D485: OBBLIGATO and every instrument's name have Portuguese and Spanish", () => {
  for (const k of [OBBLIGATO, ...LAYERS.map((l) => l.name)]) {
    assert.ok(PT[k], `pt lacks ${k}`);
    assert.ok(ES[k], `es lacks ${k}`);
  }
});
