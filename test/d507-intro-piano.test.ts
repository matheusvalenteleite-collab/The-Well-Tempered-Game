/**
 * D507 (was D500's cadence test): the intro's B-A-C-H on the recorded piano alone, at the alto's and the
 * soprano's height, four equal half notes (no H held longer), the C♯ a short step, legato (each key held a moment
 * into the next), soft; under the D the left hand's open D–A–D at tenor height, gently spread, ringing on as the
 * title page gives way. No band, no cello, no cadence.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

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

test("D507: B♭4 A4 C5 B4 C♯5 D5 at the alto's and soprano's height, the four of B-A-C-H equal (no H lengthening), the C♯ short, the D on the resolve", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const notes = m.bachNotes();
  assert.deepEqual(notes.map((x) => x.midi), [70, 69, 72, 71, 73, 74]);
  assert.ok(notes.every((x) => x.midi >= 67 && x.midi <= 79), "the alto's and the soprano's height (G4–G5)");
  const step = (i: number) => notes[i + 1].at - notes[i].at;
  for (const i of [1, 2, 3]) assert.ok(Math.abs(step(i) - step(0)) < 1e-9, `B-A-C-H equal: note ${i}`);
  assert.equal(m.INTRO_H_S, m.INTRO_HALF_S, "the H not held longer");
  assert.ok(step(4) < step(0) / 2, "the C♯ a short step into the D");
  assert.equal(notes[5].at, m.INTRO_RESOLVE_S);
});

test("D507: legato with no other articulation: each note held a moment into the next (the next key's own strike its new attack)", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const notes = m.bachNotes();
  for (let i = 1; i < notes.length; i++) {
    const over = notes[i - 1].at + notes[i - 1].len - notes[i].at;
    assert.ok(over > 0.02 && over < 0.12, `note ${i - 1} held ${over.toFixed(3)} s into note ${i}`);
  }
  const { setPreset, PATCHES } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  m.playIntro(chip as any, 0.12);
  for (const n of played) {
    assert.equal(n.patch, PATCHES.pianoSampled, "the recorded grand");
    for (const k of ["legato", "slur", "staccato", "accent", "tie", "give", "bowChange"]) assert.equal(n.p[k], undefined, `${n.midi}: no ${k}`);
  }
  setPreset("chip");
});

test("D507: under the final D the left hand's open D3–A3–D4, gently spread from the bottom, tenor height (not rumbly), ringing to the tail's end", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const ch = m.chordNotes();
  assert.deepEqual(ch.map((x) => x.midi), [50, 57, 62], "D3 A3 D4");
  assert.ok(ch.every((x) => x.midi >= 48 && x.midi < 64), "bass-tenor height, nothing under C3");
  assert.equal(ch[0].at, m.INTRO_RESOLVE_S, "with the D");
  for (let i = 1; i < ch.length; i++) assert.ok(ch[i].at > ch[i - 1].at && ch[i].at - ch[i - 1].at <= 0.12, "spread gently upwards");
  for (const x of ch) assert.ok(Math.abs(x.at + x.len - (m.INTRO_RESOLVE_S + m.INTRO_TAIL_S)) < 1e-9);
  const d = m.bachNotes()[5];
  assert.ok(Math.abs(d.at + d.len - (m.INTRO_RESOLVE_S + m.INTRO_TAIL_S)) < 1e-9, "the D rings with it");
  // The pitch classes: D and A only (an open fifth: no third, no cadence).
  assert.deepEqual([...new Set(ch.map((x) => x.midi % 12))].sort(), [2, 9]);
});

test("D507: soft from start to end: the soft layer, levels under the piano's own, the chord under the line; the last notes faded to nothing at the tail's end", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { setPreset } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  const { chip, played } = fakeChip();
  // deno-lint-ignore no-explicit-any
  m.playIntro(chip as any, 0.12);
  assert.equal(played.length, 9, "six notes and the chord, nothing else (no band)");
  for (const n of played) {
    assert.equal(n.p.layer, "soft");
    assert.ok((n.p.level as number) <= 1, `${n.midi}: soft (the soft layer, at the piano's own level at most)`);
  }
  const line = played.slice(0, 6).map((n) => n.p.level as number);
  assert.ok(line.every((x) => x === line[0]), "one level through the line (no accent, no swell)");
  assert.ok(played.slice(6).every((n) => (n.p.level as number) < line[0]), "the left hand under the line");
  const end = 1.12 + m.INTRO_RESOLVE_S + m.INTRO_TAIL_S;
  const faded = played.filter((n) => n.trims.length);
  assert.equal(faded.length, 4, "the D and its chord");
  assert.ok(faded.every((n) => n.trims.at(-1)![0] < 0.01 && Math.abs(n.trims.at(-1)![2] - end) < 1e-9));
  setPreset("chip");
});

test("D507: in step with the title page: it gives way after the D, while the chord rings on, about nine seconds in all", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  assert.equal(m.INTRO_S, m.INTRO_RESOLVE_S + m.INTRO_CROSS_S);
  assert.ok(m.INTRO_CROSS_S >= 1.5 && m.INTRO_CROSS_S <= m.INTRO_TAIL_S - m.INTRO_FADE_S, "the page gone before the fade begins");
  assert.ok(m.INTRO_TAIL_S - m.INTRO_CROSS_S >= 2.5, "the chord rings on over the selection");
  assert.ok(m.INTRO_S >= 8 && m.INTRO_S <= 10);
  assert.equal(m.INTRO_PRESET.slots?.[0], "pianoSampled");
  assert.ok(!("INTRO_BAND" in m), "no band");
});
