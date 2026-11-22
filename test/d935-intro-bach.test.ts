/**
 * D935 (was D507's piano test, and D500's cadence test before it): the intro is Bach's own line, the tenor alone,
 * its first six notes from its B♭3 in Contrapunctus XIV's bar 193 (B♭ A C B♮ C♯ D, ending on the D), at his pitch,
 * nothing added (no D–A–D, no alto), every note through the game's ornament data (none printed on these six); a careful pianist at
 * ♩ = 80: light rubato, a narrow soft shape, darkened attack, full legato, slow dampers, no quickly-dying recording;
 * the picture on its notes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** The written notes as played: the first sounding part of each (an ornament's parts share their written note). */
const heads = <T extends { written: number }>(xs: T[]) => xs.filter((x, i) => xs.findIndex((y) => y.written === x.written) === i);

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

test("D935: the tenor alone, its first six notes from its B♭ in bar 193 (B♭ A C B♮ C♯ D), ending on the D; nothing after, nothing under", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const f = fugueById(m.BACH_SOURCE.piece);
  const b193 = f.bars.find((b) => b.n === m.BACH_SOURCE.bar)!;
  const tenor = f.voices[m.BACH_SOURCE.voice];
  const s = tenor.find(([on, , p]) => on >= b193.on && p === 58)![0];
  assert.equal(s, b193.on + 2 * f.tpq, "the subject enters on bar 193's third beat");
  assert.ok(f.voices.every((vs) => vs.every(([on, d]) => !(on < s && on + d > s))), "nothing else sounds as it enters");
  const six = tenor.filter(([on]) => on >= s).slice(0, 6);
  assert.deepEqual(six.map((n) => n[2]), [58, 57, 60, 59, 61, 62]);
  const b195 = f.bars.find((b) => b.n === 195)!;
  assert.equal(six[5][0], b195.on + 2 * f.tpq, "the D on bar 195's third beat");
  assert.equal(m.INTRO_NOTES, 6);
  const notes = m.introNotes();
  assert.deepEqual(notes.map((x) => x.midi), [58, 57, 60, 59, 61, 62], "Bach's six, nothing added");
  assert.equal(m.INTRO_OCTAVE, 0);
  assert.equal(notes.filter((x) => x.last).length, 1);
  assert.ok(notes.at(-1)!.last && notes.at(-1)!.midi === 62, "the D the last, held to the end");
  assert.ok(!notes.some((x) => x.double), "one instrument, no accompaniment");
});

test("D935: the slower pianist (♩ = 80), light rubato: a small breath at the start, an easing through the H and the C♯ into the D", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  assert.equal(m.INTRO_A.bpm, 80);
  const beat = 60 / m.INTRO_A.bpm;
  const t = m.introNotes().map((x) => x.at);
  const gaps = t.slice(1).map((x, i) => x - t[i]);
  assert.ok(gaps[0] > gaps[1] + 0.01 && gaps[0] < gaps[1] * 1.08, "the first note settled into, a little");
  assert.ok(Math.abs(gaps[1] - 2 * beat) < 0.02, "in tempo between");
  assert.ok(gaps[3] > 1.5 * beat * 1.03 && gaps[4] > 0.5 * beat * 1.1, "the H and the C♯ eased into the D");
  assert.ok(gaps[4] < 0.5 * beat * 1.3, "gently");
  assert.ok(m.INTRO_RESOLVE_S > 8 * beat && m.INTRO_RESOLVE_S < 8 * beat * 1.06);
});

test("D935, the rule: the intro's notes go through the game's ornament data; the data marks none on these six (its W is on bar 196's C♯, after the cut)", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const { ornamentsOf, realiseHeld } = await import("../src/touch/ornament-play.ts");
  const f = fugueById(m.BACH_SOURCE.piece);
  const b193 = f.bars.find((b) => b.n === m.BACH_SOURCE.bar)!;
  const tenor = f.voices[m.BACH_SOURCE.voice];
  const s = tenor.find(([on, , p]) => on >= b193.on && p === 58)![0];
  const six = tenor.filter(([on]) => on >= s).slice(0, m.INTRO_NOTES);
  const orns = ornamentsOf(f);
  const key = (on: number) => `${m.BACH_SOURCE.voice}:${on}`;
  assert.deepEqual(six.filter(([on]) => orns.has(key(on))).map(([on]) => on), [], "no sign on notes 1–6");
  // The data's one sign in these bars, the short wavy line on the C♯ of bar 196 (beat 3), lies after the D.
  const b196 = f.bars.find((b) => b.n === 196)!;
  assert.equal(orns.get(key(b196.on + 2 * f.tpq))?.signs, "W");
  assert.ok(b196.on + 2 * f.tpq > six[5][0]);
  // Every note played is the data's written note or, where the data marks an ornament, its realisation (realiseHeld).
  const notes = m.introNotes();
  six.forEach(([on, d, p], i) => {
    const o = orns.get(key(on));
    const want = o ? realiseHeld(f, o, on, d, 1, p, six[i - 1]?.[2], m.INTRO_A.bpm).map((x) => x[2]) : [p];
    assert.deepEqual(notes.filter((y) => y.written === i).map((y) => y.midi), want, `note ${i + 1}`);
  });
  assert.ok(!notes.some((x) => x.orn), "no ornament sounded: none printed here");
  for (const [name, v] of Object.entries(m.INTRO_VARIANTS)) assert.deepEqual(m.introNotes(v).filter((x) => !x.double).map((x) => x.midi - v.octave), [58, 57, 60, 59, 61, 62], name);
});

test("D935: the careful touch: the soft layer, a narrow shape, una corda colour, a lowpass on these notes, full legato, slow dampers, a warm room", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const notes = m.introNotes();
  // The written notes' levels (a trill's upper notes lighter still: tested with the ornament).
  const dbs = notes.filter((x) => x.orn !== "aux").map((x) => x.db);
  assert.ok(Math.max(...dbs) - Math.min(...dbs) <= 2.2 && Math.max(...dbs) - Math.min(...dbs) >= 1, "shaped, narrowly");
  assert.ok(new Set(dbs.map((x) => x.toFixed(2))).size >= 4, "not flat");
  for (let i = 1; i < notes.length; i++) {
    const over = notes[i - 1].at + notes[i - 1].len - notes[i].at;
    assert.ok(over > 0.09 && over < 0.15, `held ${over.toFixed(3)} s into the next`);
  }
  const { setPreset, PATCHES } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  m.playIntro(chip as any, 0.12);
  assert.equal(played.length, notes.length, "nothing else");
  for (const [i, n] of played.entries()) {
    assert.equal(n.patch, PATCHES.pianoSampled, "the recorded grand");
    assert.equal(n.p.layer, "soft");
    assert.equal(n.p.lp, 4500);
    assert.equal(n.p.hold, "none");
    assert.ok((n.p.vel as number) <= -2 && Math.abs((n.p.vel as number) - (-3 + 0.5 * notes[i].db)) < 1e-9, "darker, following the level by half");
    assert.ok((n.p.dampMul as number) >= 1.6 && (n.p.roomMul as number) > 1.2);
    for (const k of ["legato", "slur", "accent", "give", "bowChange"]) assert.equal(n.p[k], undefined, `${n.midi}: no ${k}`);
  }
  setPreset("chip");
});

test("D935: no note from a recording that dies away quickly: B3 and C4 from A3, C♯4 and D4 from D♯4, all within the piano's guard", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { nearestSample, SAMPLED } = await import("../src/touch/sampled.ts");
  const { setPreset } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  m.playIntro(chip as any, 0.12);
  const set = SAMPLED.piano.soft!.set;
  const notes_ = m.introNotes();
  for (const n of played) {
    const from = n.p.fromSample as number;
    const aux = notes_[played.indexOf(n)].orn === "aux";
    assert.ok(from === 57 || from === 63 || (aux && from === 60), `${n.midi} from A3 or D♯4 (${from}); a trill's brief upper note may take C4`);
    assert.equal(nearestSample(set, from), from, "a recording of the soft layer");
    assert.ok(Math.abs(from - n.midi) <= (SAMPLED.piano.maxShift ?? 3));
  }
  // C4's own (the nearest for B3, C4, C♯4 left alone) never read for a held note.
  assert.ok(played.every((n, i) => n.p.fromSample !== 60 || notes_[i].orn === "aux"));
  assert.ok(m.introPitches().includes(57) && m.introPitches().includes(63), "loaded first");
  // The engine reads Play.fromSample where it picks the recording.
  const src2 = src("src/touch/chip.ts");
  assert.match(src2, /if \(p\.fromSample !== undefined && nearestSample\(main, p\.fromSample\) === p\.fromSample && Math\.abs\(p\.fromSample - midi\) <= \(inst\.maxShift \?\? MAX_SHIFT_ANY\)\) near = p\.fromSample;/);
  setPreset("chip");
});

test("D935: the D lingers: held to the end and faded to nothing there; the page gone while it rings; the breath before the first note", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { setPreset } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  const p = m.playIntro(chip as any, 0.12);
  assert.equal(p.t0, 1.12);
  const end = 1.12 + m.INTRO_RESOLVE_S + m.INTRO_TAIL_S;
  const faded = played.filter((n) => n.trims.length);
  assert.deepEqual(faded.map((n) => n.midi), [62]);
  assert.ok(faded.every((n) => n.trims.at(-1)![0] < 0.01 && Math.abs(n.trims.at(-1)![2] - end) < 1e-9 && Math.abs(n.at + n.dur - end) < 0.02));
  assert.ok(m.INTRO_TAIL_S >= 3.5, "it lingers");
  assert.ok(m.INTRO_CROSS_S >= 2.5 && m.INTRO_CROSS_S < m.INTRO_TAIL_S, "the page clears after the D has rung, before it is gone");
  assert.ok(m.INTRO_S >= 8.5 && m.INTRO_S <= 10, "about nine seconds to the selection");
  // deno-lint-ignore no-explicit-any
  assert.ok(Math.abs(m.playIntro(fakeChip().chip as any).t0 - 1 - m.INTRO_BREATH_S) < 1e-9 && m.INTRO_BREATH_S >= 0.3);
  setPreset("chip");
});

test("D935: the alternatives are Bach's same line (render-only), each a different performance; the game plays INTRO_A", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { PATCHES } = await import("../src/touch/sound.ts");
  const want = m.introNotes().map((x) => x.midi);
  for (const [name, v] of Object.entries(m.INTRO_VARIANTS)) {
    assert.ok(v.patch in PATCHES && (!v.double || v.double.patch in PATCHES), name);
    const line = m.introNotes(v).filter((x) => !x.double).map((x) => x.midi - v.octave);
    assert.deepEqual(line, want, `${name}: the same notes`);
    const dbl = m.introNotes(v).filter((x) => x.double);
    if (v.double) assert.deepEqual(dbl.map((x) => x.midi - v.double!.octave), want, `${name}: its doubling the same line`);
  }
  assert.ok(!src("src/bench/BenchApp.tsx").includes("INTRO_VARIANTS"));
});

test("D935: the picture on the notes as heard: each image on B, A, C, H (not a fixed beat), the cross-fade from the D", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const t = heads(m.introNotes()).slice(0, 4).map((x) => x.at);
  assert.deepEqual([...m.INTRO_ONSETS_S], t);
  assert.equal(m.INTRO_RESOLVE_S, m.introNotes().at(-1)!.at);
  const intro = src("src/bench/Intro.tsx");
  for (const k of [2, 3, 4]) assert.match(intro, new RegExp(`\\["--n${k}" as string\\]: \`\\$\\{INTRO_ONSETS_S\\[${k - 1}\\]\\}s\``));
  const css = src("src/bench/selection.css");
  for (const k of [2, 3, 4]) assert.match(css, new RegExp(`\\.tb-intro-n${k} \\{ animation-delay: var\\(--n${k}`));
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /return introPlaying\.current\.t0 - ch\.ctx\.currentTime \+ \(ch\.lag \?\? 0\);/, "the picture waits for the first note, the breath included");
});
