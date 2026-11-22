/**
 * D935 (was D507's piano test, and D500's cadence test before it): the intro is Bach's own line, the tenor alone
 * from its B♭3 in Contrapunctus XIV's bar 193 to bar 197's downbeat (the subject's nine notes and the D its C♯
 * rises to), at his pitch, nothing added (no D–A–D, no alto), its printed ornament played (the short wavy sign on
 * the last C♯ of the subject, bar 196); a careful pianist at ♩ = 80: light rubato, a narrow soft shape, darkened
 * attack, full legato, slow dampers, no quickly-dying recording; the picture on its notes.
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

test("D935: the tenor alone, the data's notes from its B♭ in bar 193 to bar 197's downbeat; the subject's fourteen beats and its D; no alto, no chord", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const f = fugueById(m.BACH_SOURCE.piece);
  const b193 = f.bars.find((b) => b.n === m.BACH_SOURCE.bar)!;
  const b197 = f.bars.find((b) => b.n === m.INTRO_TO_BAR)!;
  const tenor = f.voices[m.BACH_SOURCE.voice];
  const s = tenor.find(([on, , p]) => on >= b193.on && p === 58)![0];
  assert.equal(s, b193.on + 2 * f.tpq, "the subject enters on bar 193's third beat");
  assert.ok(f.voices.every((vs) => vs.every(([on, d]) => !(on < s && on + d > s))), "nothing else sounds as it enters");
  // The subject's length as the piece states it: every B-A-C-H entry fourteen beats (fugue.ts entries, theme 3).
  const ents = f.entries.filter((e) => e.theme === 3);
  assert.ok(ents.length >= 5 && ents.every((e) => e.end - e.on === 14 * f.tpq));
  const first = ents.find((e) => e.on === s)!;
  assert.deepEqual(first.notes.map((n) => n[2]), [58, 57, 60, 59, 61, 62, 61, 59, 61]);
  const notes = m.introNotes();
  assert.deepEqual(heads(notes).map((x) => notes.filter((y) => y.written === x.written).at(-1)!.midi), [...first.notes.map((n) => n[2]), 62], "the subject, then the D its C♯ rises to (the tenor's next note)");
  const d = tenor.find(([on]) => on === b197.on)!;
  assert.equal(d[2], 62);
  assert.ok(!tenor.some(([on]) => on > b197.on && on < b197.on + d[1] + f.tpq / 2), "the D a half note, then the tenor rests");
  assert.equal(m.INTRO_OCTAVE, 0);
  assert.equal(notes.filter((x) => x.last).length, 1);
  assert.ok(notes.at(-1)!.last);
  assert.ok(!notes.some((x) => x.double), "one instrument");
});

test("D935: the slower pianist (♩ = 80, round 3), light rubato: a small breath at the start, a gentle easing into the D", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  assert.equal(m.INTRO_A.bpm, 80);
  const beat = 60 / m.INTRO_A.bpm;
  const t = heads(m.introNotes()).map((x) => x.at);
  const gaps = t.slice(1).map((x, i) => x - t[i]);
  assert.ok(gaps[0] > gaps[1] + 0.01 && gaps[0] < gaps[1] * 1.08, "the first note settled into, a little");
  assert.ok(gaps[8] > gaps[1] * 1.03 && gaps[8] < gaps[1] * 1.15, "the C♯ → D eased, gently");
  assert.ok(Math.abs(gaps[2] - 2 * beat) < 0.02, "in tempo between");
  assert.ok(m.INTRO_RESOLVE_S > 14 * beat && m.INTRO_RESOLVE_S < 14 * beat * 1.06);
});

test("D935: the printed ornament: the data's short wavy sign (W) on the subject's last C♯, bar 196 beat 3, played as the game realises it", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const { ornamentsOf, realiseHeld } = await import("../src/touch/ornament-play.ts");
  const f = fugueById(m.BACH_SOURCE.piece);
  const b193 = f.bars.find((b) => b.n === m.BACH_SOURCE.bar)!;
  const b197 = f.bars.find((b) => b.n === m.INTRO_TO_BAR)!;
  const tenor = f.voices[m.BACH_SOURCE.voice];
  const s = tenor.find(([on, , p]) => on >= b193.on && p === 58)![0];
  const line = tenor.filter(([on]) => on >= s && on <= b197.on);
  const orns = ornamentsOf(f);
  const marked = line.map((n, i) => ({ n, i, o: orns.get(`${m.BACH_SOURCE.voice}:${n[0]}`) })).filter((x) => x.o);
  // What the data has there: one sign, W on the C♯4 half note of bar 196, beat 3.
  assert.equal(marked.length, 1);
  const [{ n, i, o }] = marked;
  assert.equal(o!.signs, "W");
  assert.equal(n[2], 61);
  assert.equal(n[1], 2 * f.tpq);
  const b196 = f.bars.find((b) => b.n === 196)!;
  assert.equal(n[0], b196.on + 2 * f.tpq);
  // Every printed ornament on the line is played, as realiseHeld gives it (here Bach's short Trillo: D C♯ D C♯, from the note above).
  const parts = realiseHeld(f, o!, n[0], n[1], 1, n[2], line[i - 1][2], m.INTRO_A.bpm);
  assert.deepEqual(parts.map((p) => p[2]), [62, 61, 62, 61]);
  for (const x of marked) {
    const want = realiseHeld(f, x.o!, x.n[0], x.n[1], 1, x.n[2], line[x.i - 1]?.[2], m.INTRO_A.bpm).map((p) => p[2]);
    const got = m.introNotes().filter((y) => y.written === x.i);
    assert.deepEqual(got.map((y) => y.midi), want, "the intro plays the data's ornament");
    // Soft and even: the upper notes lighter, the parts evenly spaced, each overlapping the next a little.
    const gaps = got.slice(1).map((y, k) => y.at - got[k].at);
    assert.ok(Math.max(...gaps) - Math.min(...gaps) < 0.005, "even");
    assert.ok(got.filter((y) => y.orn === "aux").every((y) => y.db < got.find((z) => z.orn === "main")!.db - 2), "the upper notes lighter");
    assert.ok(got.slice(0, -1).every((y, k) => y.at + y.len > got[k + 1].at), "legato");
    // The upper note and the main note from two recordings (no shared hammer).
    assert.ok(got.filter((y) => y.orn === "aux").every((y) => y.sample !== got.find((z) => z.orn === "main")!.sample));
  }
});

test("D935, the rule: every rendered Bach excerpt carries the data's ornaments: each alternative plays the same ornament", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const want = m.introNotes().filter((x) => x.orn).map((x) => x.midi);
  assert.ok(want.length >= 4);
  for (const [name, v] of Object.entries(m.INTRO_VARIANTS)) assert.deepEqual(m.introNotes(v).filter((x) => x.orn && !x.double).map((x) => x.midi - v.octave), want, name);
});

test("D935: the careful touch: the soft layer, a narrow shape, una corda colour, a lowpass on these notes, full legato, slow dampers, a warm room", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const notes = m.introNotes();
  // The written notes' levels (a trill's upper notes lighter still: tested with the ornament).
  const dbs = notes.filter((x) => x.orn !== "aux").map((x) => x.db);
  assert.ok(Math.max(...dbs) - Math.min(...dbs) <= 2.2 && Math.max(...dbs) - Math.min(...dbs) >= 1, "shaped, narrowly");
  assert.ok(new Set(dbs.map((x) => x.toFixed(2))).size >= 6, "not flat");
  for (let i = 1; i < notes.length; i++) {
    const over = notes[i - 1].at + notes[i - 1].len - notes[i].at;
    const inOrn = notes[i - 1].written === notes[i].written;
    assert.ok(inOrn ? over > 0.01 && over < 0.03 : over > 0.09 && over < 0.15, `held ${over.toFixed(3)} s into the next`);
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
  assert.ok(m.INTRO_CROSS_S >= 1.5 && m.INTRO_CROSS_S <= m.INTRO_TAIL_S - m.INTRO_FADE_S + 0.5);
  assert.ok(m.INTRO_S >= 12 && m.INTRO_S <= 14, "about thirteen seconds to the selection");
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
