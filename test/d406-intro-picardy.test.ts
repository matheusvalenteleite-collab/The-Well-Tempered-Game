/**
 * D406 (WTC 1.99): the intro's B-A-C-H on a soft traverso, the H longer, then the third subject's own
 * continuation C♯–D, the D under the string consort's D major (the Picardy third), on the cross-fade
 * from the title page into the selection screen; a skip fades the sound out instead of cutting it.
 * D500: the cello's line and BAROQUE BAND's cadence; D507: the piano alone, B-A-C-H equal, the left hand's D–A–D;
 * D935: Bach's bars 193-197 at his pitch, every voice, no chord (test/d935-intro-bach.test.ts); updated deliberately.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
register("./tsx-hooks.mjs", import.meta.url);

test("D406: the data's tenor goes on B♭ A C B♮ C♯ D; the intro plays them (D935: at Bach's pitch, the C♯ short, the close after)", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { fugueById } = await import("../src/touch/fugue.ts");
  const f = fugueById(m.BACH_SOURCE.piece);
  const bar = f.bars.find((b) => b.n === m.BACH_SOURCE.bar)!;
  const line = f.voices[m.BACH_SOURCE.voice].filter(([on]) => on >= bar.on);
  const k = line.findIndex(([, , p]) => p === 58);
  assert.deepEqual(line.slice(k, k + 6).map(([, , p]) => p), [58, 57, 60, 59, 61, 62], "the continuation is C♯–D in the data");
  // D935: the tenor at its own pitch (deliberately: D507 played it an octave up).
  const notes = m.introNotes().filter((n) => n.voice === m.BACH_SOURCE.voice);
  assert.deepEqual(notes.slice(0, 6).map((n) => n.midi), [58, 57, 60, 59, 61, 62]);
  const len = (i: number) => notes[i + 1].at - notes[i].at;
  assert.ok(len(4) < len(0) / 2, "the C♯ a short step into the D");
  assert.ok(notes.at(-1)!.at === m.INTRO_RESOLVE_S && notes.at(-1)!.last);
  assert.equal(m.INTRO_S, m.INTRO_RESOLVE_S + m.INTRO_CROSS_S);
  assert.ok(m.INTRO_TAIL_S > m.INTRO_CROSS_S + 1, "the close outlasts the cross-fade, dying over the selection");
  assert.equal(m.INTRO_PRESET.slots?.[0], "pianoSampled");
});

test("D406, D935: playIntro: every note scheduled at once, a skip fading the sound out", async () => {
  const m = await import("../src/bench/intro-sound.ts");
  const { setPreset, PATCHES } = await import("../src/touch/sound.ts");
  setPreset(m.INTRO_PRESET);
  type Ev = [string, number, number?];
  const param = () => {
    const evs: Ev[] = [];
    return { evs, value: 1, setValueAtTime: (v: number, t: number) => void evs.push(["set", v, t]), linearRampToValueAtTime: (v: number, t: number) => void evs.push(["ramp", v, t]), cancelScheduledValues: (t: number) => void evs.push(["cancel", t]), cancelAndHoldAtTime: (t: number) => void evs.push(["hold", t]) };
  };
  const gains: ReturnType<typeof param>[] = [];
  const played: { midi: number; at: number; patch: unknown; stop?: number; trims: number[][] }[] = [];
  const ctx = { currentTime: 1, createGain: () => { const gain = param(); gains.push(gain); return { gain, connect: (x: unknown) => x }; } };
  const chip = {
    ctx,
    input: {},
    note: (midi: number, at: number, _d: number, v: { patch: unknown }) => {
      const n = { midi, at, patch: v.patch, trims: [] as number[][] } as (typeof played)[number];
      played.push(n);
      return { stop: (t: number) => void (n.stop = t), bend() {}, trim: (l: number, a: number, u: number) => void n.trims.push([l, a, u]) };
    },
  };
  // deno-lint-ignore no-explicit-any
  const p = m.playIntro(chip as any, 0.12);
  assert.equal(p.t0, 1.12);
  assert.deepEqual(played.map((n) => n.midi), m.introNotes().map((n) => n.midi));
  assert.ok(played.every((n) => n.patch === PATCHES.pianoSampled));
  ctx.currentTime = 3;
  p.fadeOut();
  const out = gains[0].evs;
  assert.deepEqual(out.at(-1), ["ramp", 0.0001, 3 + m.INTRO_SKIP_FADE_S], "a skip ramps the intro's gain down");
  assert.ok(played.every((n) => n.stop !== undefined && n.stop > 3 + m.INTRO_SKIP_FADE_S - 1e-9), "stopped only once faded");
  setPreset("chip");
});

test("D406: the title page cross-fades on the D; BenchApp plays the intro on its own ensemble and fades it on a skip", () => {
  const css = src("src/bench/selection.css");
  assert.match(css, /\.tb-intro-at-show \{ animation: tb-intro-out var\(--cross[^)]*\) ease-in-out var\(--resolve/);
  const intro = src("src/bench/Intro.tsx");
  assert.match(intro, /\["--resolve" as string\]: `\$\{INTRO_RESOLVE_S\}s`/);
  assert.match(intro, /if \(stage !== "touch"\) return finish\(true\);/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /setPreset\(INTRO_PRESET\)/);
  assert.match(app, /if \(skipped\) introPlaying\.current\?\.fadeOut\(\);/);
});
