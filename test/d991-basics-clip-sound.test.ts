/**
 * D991–D992 (design studio): the owner's second BASICS playtest. The SHOW clip heard (its own notes and beat, on one
 * clock with the video, no drift over its loops), left on a touch only; the thumbs' ● ○ not drawn in BASICS until
 * introduced.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Chip } from "../src/touch/chip.ts";
import { loadExtras } from "../src/touch/fugue.ts";
import { ACTS, type Stage } from "../src/bench/basics/plan.ts";
import { basicsRun } from "../src/bench/basics/runner.ts";
import { ClipSound, clipScore, CLIP_LEAD } from "../src/bench/basics/clip-sound.ts";
import { BASICS_PT } from "../src/i18n/basics-pt.ts";
import { BASICS_ES } from "../src/i18n/basics-es.ts";

const stage = (id: string): Stage => ACTS.flatMap((a) => a.stages).find((s) => s.id === id)!;

test("a clip's music is its stage's first version: the notes the clip was drawn from (the hand renderer's), the beat at its tempo", async () => {
  await loadExtras();
  const s21 = clipScore(stage("2.1"));
  assert.equal(s21.notes.length, 8);
  assert.equal(s21.notes[0].t, CLIP_LEAD);
  // The renderer's 2.1 at 1.75x 72: pairs 0.476 s apart, a pair every 1.905 s.
  assert.ok(Math.abs(s21.notes[1].t - s21.notes[0].t - 0.476) < 0.002);
  assert.ok(Math.abs(s21.notes[2].t - s21.notes[0].t - 1.905) < 0.002);
  assert.ok(s21.beats.length >= 12 && s21.beats[0].accent, `${s21.beats.length} beats`);
  for (const id of ["1.1", "3.2", "4.1", "6.4"]) assert.ok(clipScore(stage(id)).notes.length >= 5, id);
});

test("one clock: loop k laid at T0 + k·L, however many loops; the video set going with the sound, set back only where it strays", () => {
  const clock = { t: 10 };
  const notes: number[] = [];
  const ticks: number[] = [];
  const ch = { ctx: { currentTime: 0 }, heard: () => clock.t, note: (_m: number, at: number) => (notes.push(at), { stop() {} }), tick: (at: number) => ticks.push(at), groove: () => true } as unknown as Chip;
  Object.defineProperty(ch.ctx, "currentTime", { get: () => clock.t });
  let seeks = 0;
  let vt = 0;
  let playing = false;
  const video = { duration: 7.92, loop: false, seeking: false, pause() { playing = false; }, play() { playing = true; return Promise.resolve(); }, get currentTime() { return vt; }, set currentTime(v: number) { seeks++; vt = v; } } as unknown as HTMLVideoElement;
  const timers: (() => void)[] = [];
  (globalThis as unknown as { window: unknown }).window = { setInterval: (f: () => void) => (timers.push(f), 1), clearInterval: () => {} };
  const sc = clipScore(stage("2.1"));
  const p = new ClipSound(ch, video, sc, { kind: "click", gain: 0.07 });
  p.start();
  const t0 = 10.15;
  for (let i = 0; i < 4 * 160; i++) {
    clock.t += 0.05;
    if (playing) vt = (vt + 0.05) % 7.92;
    timers[0]();
  }
  p.stop();
  const L = 7.92;
  for (let k = 0; k < 3; k++) for (const n of sc.notes) assert.ok(notes.some((x) => Math.abs(x - (t0 + k * L + n.t)) < 1e-9), `loop ${k} note ${n.t}`);
  assert.equal(notes.length, new Set(notes.map((x) => x.toFixed(6))).size, "no note laid twice");
  assert.ok(ticks.length >= 3 * sc.beats.length);
  assert.equal(seeks, 1, "only the start's reset: the video ran on the sound's clock");
});

test("the clip is left on a touch only (no timer, no end), signalled TOUCH TO PLAY, breathing no faster than once a second", () => {
  const host = readFileSync(new URL("../src/bench/basics/BasicsHost.tsx", import.meta.url), "utf8");
  const clip = host.slice(host.indexOf('if (view.kind === "clip")'), host.indexOf('className="basics2-layer basics2-hintlayer"'));
  assert.doesNotMatch(clip, /onEnded|onError/);
  assert.match(clip, /loop muted/);
  assert.match(clip, /onClick=\{view\.done\}/);
  assert.match(clip, /tr\("TOUCH TO PLAY"\)/);
  assert.ok(BASICS_PT["TOUCH TO PLAY"] && BASICS_ES["TOUCH TO PLAY"]);
  const css = readFileSync(new URL("../src/bench/bench.css", import.meta.url), "utf8");
  const m = /\.basics2-touch \{[^}]*animation: basics2-breathe ([\d.]+)s/.exec(css);
  assert.ok(m && Number(m[1]) >= 1, "the breath at least a second");
  const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  assert.equal((app.match(/kind: "clip", stage: st\.id, done: [^}]*sound: clipSoundFor\(st\)/g) ?? []).length, 2);
});

test("D992: the thumbs' ● ○ not drawn in BASICS until a stage introduces them (aid \"signs\")", () => {
  for (const st of ACTS.flatMap((a) => a.stages)) assert.equal(basicsRun(st, "do", 0).tut?.thumbSigns, st.aids.includes("signs"), st.id);
  const paint = readFileSync(new URL("../src/bench/paint-proto.ts", import.meta.url), "utf8");
  assert.match(paint, /g\.o\.quiet && g\.o\.thumbSigns !== false\) thumbSigns\(/);
});

test("D994: the ● ○ introduced at 3.2 by Glenn's line (translated), on from there; D995: no PROVE in Acts I-II nor 5.2", () => {
  const all = ACTS.flatMap((a) => a.stages);
  const at = all.findIndex((s) => s.id === "3.2");
  all.forEach((s, i) => assert.equal(s.aids.includes("signs"), i >= at, s.id));
  const s32 = stage("3.2");
  assert.ok(s32.intro && BASICS_PT[s32.intro] && BASICS_ES[s32.intro]);
  assert.deepEqual(all.filter((s) => s.intro).map((s) => s.id), ["3.2"]);
  assert.deepEqual(all.filter((s) => s.noProve).map((s) => s.id), ["1.1", "1.2", "2.1", "2.2", "2.3", "2.4", "2.5", "5.2"]);
  const app = readFileSync(new URL("../src/bench/BenchApp.tsx", import.meta.url), "utf8");
  assert.match(app, /at\.phase === "do" && !st\.light && !st\.noProve\) return basicsTake\(\{ \.\.\.at, phase: "prove"/);
  assert.match(app, /if \(st\.intro\) setHostView\(\{ kind: "note", line: st\.intro, done: show \}\)/);
});

test("D996: each clip says what its idea is for (en, pt, es), over the clip's top, plain, TOUCH TO PLAY below it", () => {
  for (const st of ACTS.flatMap((a) => a.stages).filter((s) => s.clip)) {
    assert.ok(st.why && st.why.length <= 100, st.id);
    assert.ok(BASICS_PT[st.why!] && BASICS_ES[st.why!], st.id);
    assert.notEqual(st.why, st.hint, st.id);
  }
  const host = readFileSync(new URL("../src/bench/basics/BasicsHost.tsx", import.meta.url), "utf8");
  assert.match(host, /view\.why && \(\s*<p className="basics2-why"/);
  const css = readFileSync(new URL("../src/bench/bench.css", import.meta.url), "utf8");
  const why = /\.basics2-why \{[^}]*\}/.exec(css)![0];
  assert.match(why, /top: 4%/);
  assert.doesNotMatch(why, /background/);
  assert.match(/\.basics2-touch \{[^}]*\}/.exec(css)![0], /bottom: 6%/);
});
