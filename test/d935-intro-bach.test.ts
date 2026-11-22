/**
 * D935 (was D507's piano test, and D500's cadence test before it): the intro is Bach's own bars, every voice of the
 * data from the tenor's B♭3 in Contrapunctus XIV's bar 193 to bar 197's downbeat (the tenor's D under the alto's
 * F♯), at his pitch, nothing added (no D–A–D); played on the recorded grand with rubato, loudness by the phrase and
 * the metre, the subject over the alto, legato, a little pedal, the close left to ring; the picture on its notes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** A chip that logs what the intro asks of it. */
function fakeChip() {
  type Ev = [string, number, number?];
  const param = () => {
    const evs: Ev[] = [];
    return { evs, value: 1, setValueAtTime: (v: number, t: number) => void evs.push(["set", v, t]), linearRampToValueAtTime: (v: number, t: number) => void evs.push(["ramp", v, t]), cancelScheduledValues: (t: number) => void evs.push(["cancel", t]), cancelAndHoldAtTime: (t: number) => void evs.push(["hold", t]) };
  };
  const played: { midi: number; at: number; dur: number; patch: unknown; p: Record<string, unknown>; trims: number[][] }[] = [];
  const ctx = { currentTime: 1, createGain: () => ({ gain: param(), connect: (x: unknown) => x }) };
  const chip = {
    ctx,
    input: {},
    note: (midi: number, at: number, dur: number, v: { patch: unknown }, p: Record<string, unknown> = {}) => {
      const n = { midi, at, dur, patch: v.patch, p, trims: [] as number[][] };
      played.push(n);
      return { stop() {}, bend() {}, trim: (l: number, a: number, u: number) => void n.trims.push([l, a, u]) };
    },
  };
  return { chip, played };
}

test("D935: exactly the data's notes, every voice, from the tenor's B♭ in bar 193 to bar 197's downbeat, at Bach's pitch; no D–A–D", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const f = fugueById(m.BACH_SOURCE.piece);
  const b193 = f.bars.find((b) => b.n === m.BACH_SOURCE.bar)!;
  const b197 = f.bars.find((b) => b.n === m.INTRO_TO_BAR)!;
  const s = f.voices[m.BACH_SOURCE.voice].find(([on, , p]) => on >= b193.on && p === 58)![0];
  assert.equal(s, b193.on + 2 * f.tpq, "the subject enters on bar 193's third beat");
  // Nothing else sounds as the subject enters (the cadence's chord is over): the tenor alone.
  assert.ok(f.voices.every((vs) => vs.every(([on, d]) => !(on < s && on + d > s))));
  const want = f.voices.flatMap((vs, v) => vs.filter(([on]) => on >= s && on <= b197.on).map(([, , p]) => `${v}:${p}`)).sort();
  const notes = m.introNotes();
  assert.deepEqual(notes.map((x) => `${x.voice}:${x.midi}`).sort(), want, "Bach's notes, no more, no fewer");
  assert.equal(m.INTRO_OCTAVE, 0);
  assert.deepEqual(notes.filter((x) => x.voice === m.BACH_SOURCE.voice).map((x) => x.midi), [58, 57, 60, 59, 61, 62, 61, 59, 61, 62], "the tenor's whole statement");
  assert.deepEqual(notes.filter((x) => x.last).map((x) => x.midi).sort(), [62, 66], "the close: the tenor's D4 under the alto's F♯4");
  assert.ok(!notes.some((x) => x.midi === 50), "no added D3 (D507's chord gone)");
  assert.ok(!("chordNotes" in m) && !("INTRO_CHORD" in m));
});

test("D935: a pianist's time: the onsets off the metronome (settled into, the C♯ lingered on, the close slowed), never by much", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const beat = 60 / m.INTRO_BPM;
  const t = m.introNotes().filter((x) => x.voice === m.BACH_SOURCE.voice).map((x) => x.at);
  const gaps = t.slice(1).map((x, i) => x - t[i]);
  // B♭ → A (2 beats) broader than A → C: the first note settled into.
  assert.ok(gaps[0] > gaps[1] + 0.02);
  // The C♯ (half a beat) lingered on, a breath more than written.
  assert.ok(gaps[4] > 0.5 * beat * 1.1);
  // The last two beats (C♯ → D) slower than the first statement's.
  assert.ok(gaps[8] > gaps[1] * 1.08);
  for (const [i, g] of gaps.entries()) assert.ok(g > 0, `note ${i} in order`);
  assert.ok(m.INTRO_RESOLVE_S > 14 * beat && m.INTRO_RESOLVE_S < 14 * beat * 1.12, "about the written length, a little broader");
});

test("D935: the phrase's loudness: varied by the phrase and the metre (not flat), the subject over the alto, soft; legato and a little pedal", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { PALETTES } = await import("../src/touch/whole-reading.ts");
  const notes = m.introNotes();
  const subj = notes.filter((x) => x.voice === m.BACH_SOURCE.voice);
  const alto = notes.filter((x) => x.voice !== m.BACH_SOURCE.voice);
  assert.ok(new Set(subj.map((x) => x.db.toFixed(2))).size >= 6, "no two levels alike, mostly");
  assert.ok(Math.max(...subj.map((x) => x.db)) - Math.min(...subj.map((x) => x.db)) >= 3, "a shaped line");
  // The arch: the ends under the middle.
  const mid = subj.find((x) => x.midi === 59)!.db;
  assert.ok(subj[0].db < mid - 2 && subj.at(-1)!.db < mid - 2);
  // Voicing: at each shared onset the subject over the alto.
  for (const a of alto) {
    const t = subj.find((x) => Math.abs(x.at - a.at) < 0.02);
    if (t) assert.ok(t.db > a.db + 1.5, `the subject over the alto at ${a.at.toFixed(2)}`);
  }
  // Legato: each note held a moment into its voice's next.
  for (const v of [subj, alto]) for (let i = 1; i < v.length; i++) {
    const over = v[i - 1].at + v[i - 1].len - v[i].at;
    assert.ok(over > 0.02 && over < 0.15, `held ${over.toFixed(3)} s into the next`);
  }
  const { setPreset, PATCHES } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  m.playIntro(chip as any, 0.12);
  assert.equal(played.length, notes.length, "nothing else (no band)");
  for (const n of played) {
    assert.equal(n.patch, PATCHES.pianoSampled, "the recorded grand");
    assert.equal(n.p.layer, "soft");
    assert.ok((n.p.level as number) < 1.1, "soft");
    assert.equal(n.p.dampMul, PALETTES.dolce.dampMul, "the dampers slow: dolce's half pedal");
    for (const k of ["legato", "slur", "accent", "give", "bowChange"]) assert.equal(n.p[k], undefined, `${n.midi}: no ${k}`);
  }
  // The colour follows the level (a softer note darker).
  assert.ok(played.every((n, i) => Math.abs((n.p.vel as number) - notes[i].db) < 1e-9));
  setPreset("chip");
});

test("D935: the close lingers: the D–F♯ held to the end and faded to nothing there; the page gone while it rings", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { setPreset } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  const p = m.playIntro(chip as any, 0.12);
  assert.equal(p.t0, 1.12);
  const end = 1.12 + m.INTRO_RESOLVE_S + m.INTRO_TAIL_S;
  const faded = played.filter((n) => n.trims.length);
  assert.deepEqual(faded.map((n) => n.midi).sort(), [62, 66]);
  assert.ok(faded.every((n) => n.trims.at(-1)![0] < 0.01 && Math.abs(n.trims.at(-1)![2] - end) < 1e-9));
  assert.ok(faded.every((n) => Math.abs(n.at + n.dur - end) < 0.02), "held to the end");
  assert.ok(m.INTRO_TAIL_S >= 3.5, "it lingers");
  assert.ok(m.INTRO_CROSS_S >= 1.5 && m.INTRO_CROSS_S <= m.INTRO_TAIL_S - m.INTRO_FADE_S + 0.5);
  assert.ok(m.INTRO_S >= 12 && m.INTRO_S <= 15, "about fourteen seconds to the selection");
  // The breath before the first note (the default lead).
  // deno-lint-ignore no-explicit-any
  assert.ok(Math.abs(m.playIntro(fakeChip().chip as any).t0 - 1 - m.INTRO_BREATH_S) < 1e-9 && m.INTRO_BREATH_S >= 0.3);
  setPreset("chip");
});

test("D935: the picture on the notes as heard: each image on B, A, C, H (not a fixed beat), the cross-fade from the close", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const t = m.introNotes().filter((x) => x.voice === m.BACH_SOURCE.voice).slice(0, 4).map((x) => x.at);
  assert.deepEqual([...m.INTRO_ONSETS_S], t);
  assert.equal(m.INTRO_RESOLVE_S, Math.min(...m.introNotes().filter((x) => x.last).map((x) => x.at)));
  const intro = src("src/bench/Intro.tsx");
  for (const k of [2, 3, 4]) assert.match(intro, new RegExp(`\\["--n${k}" as string\\]: \`\\$\\{INTRO_ONSETS_S\\[${k - 1}\\]\\}s\``));
  const css = src("src/bench/selection.css");
  for (const k of [2, 3, 4]) assert.match(css, new RegExp(`\\.tb-intro-n${k} \\{ animation-delay: var\\(--n${k}`));
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /return introPlaying\.current\.t0 - ch\.ctx\.currentTime \+ \(ch\.lag \?\? 0\);/, "the picture waits for the first note, the breath included");
});
