/**
 * D485, OBBLIGATO (the subject boost): playing well in the stretch just before one of the player's own
 * subject entries offers a boost for that entry and for the later entries overlapping it; the player takes
 * it with the button or it lapses at the entry. D509: the boost one of three effects on the player's own
 * voice (the octave here; the tape echo and the chorus in d509-obbligato-effects.test.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { boostedSpans, compassOf, drawEffect, effectOf, FX_NAMES, LAYERS, LAYER_FLOOR, OBB_FX, obbligatoLabel, octaveShift, OCTAVE_DB, OCTAVE_LEVEL, offerWindow, OBBLIGATO, playedWell, presetPatchIds, vibratoCents, VIBRATO_CENTS, VIBRATO_HZ, WELL, type GradedNote } from "../src/bench/obbligato.ts";
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
  // Never taken: each lapsed at its entry; no octave ever sounded, no boost.
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

// ---------- D509: the octave, the main instrument untouched ----------

const args = (c: string) => JSON.parse(c.slice(c.indexOf("(") + 1, c.lastIndexOf(") -> "))) as unknown[];
const isOctave = (c: string) => c.startsWith("note(") && c.includes('"couple":false');

/** The calls with the octave's (and every call on an octave's sound) and the effect's taken out, the sounds renumbered. */
function withoutOctaves(calls: string[]): string[] {
  const tags = new Set(calls.filter(isOctave).map((c) => c.split(" -> ")[1]));
  const kept = calls.filter((c) => !isOctave(c) && !tags.has(c.split(".")[0]) && !c.startsWith("voiceFx("));
  const ren = new Map<string, string>();
  const tag = (t: string) => (ren.has(t) ? ren.get(t)! : (ren.set(t, `s${ren.size}`), ren.get(t)!));
  return kept.map((c) => c.replace(/\bs\d+\b/g, (t) => tag(t)));
}

test("D485, D509: in the game, a boost covers the later entry in stretto (the bars' tinge), its octave sounds only on the player's own entry", () => {
  // Fugue I/16, the bass's entry at bar 13: the alto's (bar 12) began before it, the soprano's (bar 15) after.
  // An rng low enough to draw the octave (the first of the three).
  const run = obbRun(synthRun(passage("wtc1f16", 3, 17), { gap: 0.03, jitter: 0.03, seed: 3 }), { on: true, take: true, rng: () => 0.05 });
  const f = run.g.f;
  const P = f.entries.find((e) => e.voice === 3 && e.bar === 13)!;
  const offer = run.offers.find((o) => o.entryOn === P.on);
  assert.ok(offer, "the bass's entry offered");
  assert.equal(offer.fx, "octave");
  assert.equal(offer.shift, 1, "a bass entry doubled an octave up");
  const earlier = f.entries.find((e) => e.voice === 1 && e.bar === 12)!;
  const later = f.entries.find((e) => e.voice === 0 && e.bar === 15)!;
  assert.deepEqual(offer.spans.map((s) => s.voice), [3, 0]);
  assert.ok(run.layered.some((x) => x.voice === 0 && x.on >= later.on && x.on < later.end), "the soprano's later entry inside the boost");
  assert.ok(!run.layered.some((x) => x.voice === 1 && x.on >= earlier.on && x.on < earlier.end), "the alto's earlier entry never");
  assert.ok(earlier.end > P.on && later.on < P.end, "a stretto both ways");
  // The octave's notes: only while one of the player's own boosted entries sounds (never the soprano's after the bass's ends).
  const g = run.g as unknown as { tickAt: (t: number) => number };
  const oct = run.calls.filter(isOctave);
  assert.ok(oct.length > 5, `octave notes ${oct.length}`);
  const own = run.offers.map((o) => o.spans[0]);
  assert.ok(own.every((s) => s.voice === 3));
  for (const c of oct) {
    const tick = g.tickAt(args(c)[1] as number);
    assert.ok(own.some((s) => tick >= s.on - run.g.beat && tick < s.end + run.g.beat), `octave at tick ${tick}`);
  }
  assert.ok(oct.some((c) => Math.abs(g.tickAt(args(c)[1] as number) - P.on) < run.g.beat), "the bass's entry doubled from its first note");
});

test("D509: the octave adds the player's own notes an octave away at OCTAVE_LEVEL, on the same patch and Play, and changes nothing else", () => {
  const log = synthRun(passage("wtc1f02", 0, 31), { gap: 0.03, jitter: 0.03, seed: 3 });
  const plain = obbRun(log, { on: true, take: false, rng: () => 0.05 });
  const boosted = obbRun(log, { on: true, take: true, rng: () => 0.05 });
  assert.ok(boosted.offers.length >= 2 && boosted.offers.every((o) => o.fx === "octave" && Math.abs(o.shift) === 1));
  const oct = boosted.calls.filter(isOctave);
  assert.ok(oct.length > 5, `octave notes ${oct.length}`);
  assert.deepEqual(withoutOctaves(boosted.calls), plain.calls);
  // Each touch's octave straight after its note: the pitch an octave away, the voicing the same, the level OCTAVE_LEVEL of the note's.
  let pairs = 0;
  boosted.calls.forEach((c, i) => {
    const prev = boosted.calls[i - 1];
    if (!isOctave(c) || !prev?.startsWith("note(") || isOctave(prev)) return;
    const [m, , , v, p] = args(c) as [number, number, number, unknown, { level?: number; recordedOnly?: boolean }];
    const [m0, , , v0, p0] = args(prev) as [number, number, number, unknown, { level?: number }];
    assert.equal(Math.abs(m - m0), 12);
    assert.deepEqual(v, v0, "the player's own instrument, at its place");
    assert.ok(Math.abs((p.level ?? 1) / (p0.level ?? 1) - OCTAVE_LEVEL) < 1e-3, `${p.level} / ${p0.level}`);
    assert.equal(p.recordedOnly, true);
    pairs++;
  });
  assert.ok(pairs > 3, `pairs ${pairs}`);
  // The dry trimmed with it over the entry (one voiceFx a boost), the scores alike.
  assert.equal(boosted.calls.filter((c) => c.startsWith('voiceFx(["octave"')).length, boosted.offers.length);
  assert.equal(boosted.g.score, plain.g.score);
  assert.equal(boosted.g.slips, plain.g.slips);
  assert.ok(OCTAVE_DB <= -8 && OCTAVE_DB >= -10);
});

test("D509: the octave's direction: up for a low voice, down for a high one, the other way at the compass's edge, none where both leave it; never under LAYER_FLOOR", () => {
  assert.equal(octaveShift("pianoSampled", [40, 43, 45, 47, 48, 50]), 1, "bass: up");
  assert.equal(octaveShift("pianoSampled", [52, 53, 55, 57, 58, 60]), 1, "tenor: up");
  assert.equal(octaveShift("pianoSampled", [60, 62, 63, 65, 67, 68]), -1, "alto: down");
  assert.equal(octaveShift("pianoSampled", [67, 69, 71, 72, 74, 76, 77]), -1, "soprano: down");
  // The jazz quartet's vibraphone (C3-F6 recorded): a soprano entry down where it fits, else up; a low one up.
  const [vlo, vhi] = compassOf("jqVibes");
  assert.ok(vlo >= 46 && vhi <= 91);
  assert.equal(octaveShift("jqVibes", [52, 55, 57, 60]), 1);
  assert.equal(octaveShift("jqVibes", [55, 60, 64, 67]), 1, "an alto with no room below goes up");
  // The jazz bass's pizzicato (E1-G4): a bass entry up; the floor keeps an octave down from the bass clear.
  assert.equal(octaveShift("jqBass", [36, 40, 43, 45]), 1);
  assert.equal(octaveShift("jqVibes", [50, 60, 79, 86]), null, "nowhere to go: no octave");
  for (const l of LAYERS)
    for (const ms of [[40, 47, 52], [55, 60, 64], [64, 69, 76], [72, 79, 84]]) {
      const k = octaveShift(l.id === "chip" ? null : l.id, ms);
      if (k === null) continue;
      const [lo, hi] = compassOf(l.id === "chip" ? null : l.id);
      assert.ok(Math.min(...ms) + 12 * k >= Math.max(lo, LAYER_FLOOR) && Math.max(...ms) + 12 * k <= hi, `${l.id} ${ms} ${k}`);
    }
});

test("D509: the draw: the three effects about evenly; the octave's share to the others where it has no room; the chorus's vibrato by the instrument", () => {
  const r = rng(99);
  const n = 30000;
  const by = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const e = drawEffect({ main: "pianoSampled", midis: [60, 62, 64, 65, 67], rng: r });
    by.set(e.fx, (by.get(e.fx) ?? 0) + 1);
    assert.equal(e.shift, e.fx === "octave" ? -1 : 0);
    assert.equal(e.vib, e.fx === "chorus" ? VIBRATO_CENTS.struck : 0);
  }
  for (const fx of OBB_FX) assert.ok(Math.abs((by.get(fx) ?? 0) / n - 1 / 3) < 0.02, `${fx} ${by.get(fx)}`);
  // No room for the octave: tape and chorus half and half.
  const by2 = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const e = drawEffect({ main: "jqVibes", midis: [50, 60, 79, 86], rng: r });
    by2.set(e.fx, (by2.get(e.fx) ?? 0) + 1);
  }
  assert.equal(by2.get("octave") ?? 0, 0);
  assert.ok(Math.abs((by2.get("tape") ?? 0) / n - 0.5) < 0.02);
  assert.equal(effectOf("octave", "jqVibes", [50, 60, 79, 86]), null);
  // The vibrato: a sustaining sound's gentle one, a plucked or struck sound's only a faint wobble.
  for (const id of ["consViolin", "singA", "orgPrincipal", "bachHorn", "gbLead", null] as const) assert.equal(vibratoCents(id), VIBRATO_CENTS.sustained, String(id));
  for (const id of ["pianoSampled", "harpsiSampled", "jqVibes", "jqBass", "jqPiano"] as const) assert.equal(vibratoCents(id), VIBRATO_CENTS.struck, id);
  assert.ok(VIBRATO_CENTS.sustained <= 15 && VIBRATO_CENTS.struck <= 4 && VIBRATO_HZ > 4.5 && VIBRATO_HZ < 6);
});

test("D485: every instrument the sounds play has its compass (LAYERS: the octave's room)", () => {
  const ids = new Set(LAYERS.map((l) => l.id as string));
  for (const id of presetPatchIds()) assert.ok(ids.has(id) || ["orgPleno", "orgPedalPleno"].includes(id), `${id} missing from LAYERS`);
  for (const l of LAYERS) assert.ok(l.lo < l.hi && l.lo >= 20 && l.hi <= 110, l.id);
});

test("D485, D509: OBBLIGATO and the effects' names have Portuguese and Spanish (obbligatoLabel)", () => {
  for (const k of [OBBLIGATO, ...Object.values(FX_NAMES)]) {
    assert.ok(PT[k], `pt lacks ${k}`);
    assert.ok(ES[k], `es lacks ${k}`);
  }
  assert.equal(obbligatoLabel({ fx: "tape" }), "TAPE ECHO");
  assert.equal(obbligatoLabel(null), "");
  assert.deepEqual(Object.values(FX_NAMES), ["OCTAVE", "TAPE ECHO", "CHORUS"]);
});
