import { test } from "node:test";
import assert from "node:assert/strict";
import { phrase, styleOf, TOUCH } from "../src/touch/phrasing.ts";
import { dbToLevel, DYN, GAP_MAX_SHARE } from "../src/touch/practice.ts";
import { fugueById, inBar, beatOf } from "../src/touch/fugue.ts";
import { accompaniment, subjectMarks } from "../src/touch/voice-mode.ts";
import { decodedBytes, fileOf, folderOf, monoFor, BUDGET, planFor, SAMPLED, sampledMidis } from "../src/touch/sampled.ts";
import { CHIP_ENV, tameAt } from "../src/touch/chip.ts";
import { setPreset } from "../src/touch/sound.ts";

const f = fugueById("wtc2f22");
const beat = beatOf(f).ticks;
const notes = accompaniment(f, 0, -1);
const marks = subjectMarks(f).subject;
const shapes = (style: "plain" | "harpsichord" | "piano") => phrase(notes, beat, (t) => inBar(f, t), marks, style);

test("D294: the playing style follows the sound chosen, never the touch; the synthesized sounds phrased as before", () => {
  assert.equal(styleOf("harpsichordSampled"), "harpsichord");
  assert.equal(styleOf("pianoSampled"), "piano");
  for (const id of ["chip", "gameboy"]) assert.equal(styleOf(id), "plain");
  // D305: SWITCHED-ON its own bass articulation.
  assert.equal(styleOf("analog"), "switched");
  // The default comes from the sound now.
  setPreset("chip");
  assert.deepEqual(phrase(notes, beat, (t) => inBar(f, t), marks), shapes("plain"));
  setPreset("harpsichordSampled");
  assert.deepEqual(phrase(notes, beat, (t) => inBar(f, t), marks), shapes("harpsichord"));
  setPreset("chip");
});

test("D294: the harpsichord: chords spread from the bass up, the bar's first beat a little late, levels nearly flat; all within 20 ms", () => {
  const h = shapes("harpsichord");
  const p = shapes("plain");
  assert.ok(h.every((s) => Math.abs(s.nudge) <= TOUCH.harpsichord.cap + 1e-12));
  // Levels: a harpsichord has no touch dynamics (D309: flat; D294 kept 30% of the plain swing).
  assert.ok(h.every((s) => s.level === 1));
  assert.ok(p.some((s) => s.level !== 1), "the synthesized sounds keep theirs");
  // In a chord the lower note is struck no later than the higher (bar the fixed 2 ms unevenness).
  const byOn = new Map<number, number[]>();
  notes.forEach((n, i) => byOn.set(n.on, [...(byOn.get(n.on) ?? []), i]));
  let chords = 0;
  let spread = 0;
  for (const idx of byOn.values()) {
    if (new Set(idx.map((i) => notes[i].voice)).size < 2) continue;
    chords++;
    const lo = idx.reduce((a, b) => (notes[a].midi <= notes[b].midi ? a : b));
    const hi = idx.reduce((a, b) => (notes[a].midi >= notes[b].midi ? a : b));
    assert.ok(h[hi].nudge - h[lo].nudge >= -2 * TOUCH.harpsichord.jitter, `chord at ${notes[lo].on}`);
    if (h[hi].nudge > h[lo].nudge) spread++;
  }
  assert.ok(chords > 50 && spread > 0.9 * chords, `${spread} of ${chords} chords spread upward`);
  // D309: leaps and repeated notes apart by the harpsichord's table (practice.ts), never more than GAP_MAX_SHARE of a note.
  assert.ok(h.some((s) => s.art === "nonlegato" && s.hold < 0.9));
  assert.ok(Math.min(...h.map((s) => s.hold)) >= 1 - GAP_MAX_SHARE - 1e-9 && Math.max(...h.map((s) => s.hold)) <= TOUCH.harpsichord.overlegato);
});

test("D294: the piano: a chord's top note a little ahead; D309: its levels its model's (they choose the velocity layer)", () => {
  const pi = shapes("piano");
  const p = pi;
  assert.ok(pi.every((s) => Math.abs(s.nudge) <= TOUCH.piano.cap + 1e-12));
  pi.forEach((s) => assert.ok(s.db !== undefined && Math.abs(s.db) <= DYN.limit && Math.abs(s.level - dbToLevel(s.db)) < 1e-12));
  const byOn = new Map<number, number[]>();
  notes.forEach((n, i) => byOn.set(n.on, [...(byOn.get(n.on) ?? []), i]));
  let led = 0;
  for (const idx of byOn.values()) {
    if (new Set(idx.map((i) => notes[i].voice)).size < 2) continue;
    const hi = idx.reduce((a, b) => (notes[a].midi >= notes[b].midi ? a : b));
    if (idx.every((i) => i === hi || pi[i].nudge > pi[hi].nudge)) led++;
  }
  assert.ok(led > 50, `${led} chords led by their top note`);
  // Both layers in use: the notes under -1.5 dB (D309) on layer 7.
  const soft = p.filter((s) => s.level < SAMPLED.piano.soft!.below).length;
  assert.ok(Math.abs(20 * Math.log10(SAMPLED.piano.soft!.below) - DYN.soft) < 0.01);
  assert.ok(soft > p.length * 0.02 && soft < p.length * 0.5, `${soft} of ${p.length}`);
});

test("D294: the grand's softer layer: its own set in the same folder, planned with the main one, the pair folded to mono on a phone", () => {
  const soft = SAMPLED.piano.soft!;
  assert.equal(soft.set, "grandSoft");
  assert.equal(folderOf("grandSoft"), "grand");
  assert.equal(folderOf("harpsichord"), "harpsichord");
  assert.equal(fileOf("grandSoft", 61), "Cs4-v7.mp3");
  assert.equal(fileOf("grand", 61), "Cs4-v12.mp3");
  assert.deepEqual(sampledMidis("grandSoft"), sampledMidis("grand"));
  const plan = planFor(SAMPLED.piano, f.voices.flat().map((n) => n[2]));
  assert.deepEqual(plan.map((p) => p.set), ["grand", "grandSoft"]);
  assert.deepEqual(plan[0].notes, plan[1].notes);
  // Both layers in stereo would pass a phone's budget: folded to mono, they hold what one layer in stereo did.
  assert.ok(monoFor(plan, 48000, BUDGET.phone));
  assert.ok(decodedBytes(plan, 48000, true) <= decodedBytes([plan[0]], 48000) * 1.001);
  assert.ok(!monoFor(plan, 48000, BUDGET.computer));
});

test("D294: the classic chip's pulse envelope falls from its peak and its top is tamed after the attack", () => {
  assert.ok(CHIP_ENV.fall < 0.72 && CHIP_ENV.floor < CHIP_ENV.fall && CHIP_ENV.lift >= 1);
  assert.ok(CHIP_ENV.fallTau < 0.2 && CHIP_ENV.floorTau > 0.5);
  assert.equal(tameAt(100), 2500);
  assert.equal(tameAt(800), 3600);
  assert.equal(tameAt(2000), 4500);
  assert.ok(CHIP_ENV.open > tameAt(2000));
});
