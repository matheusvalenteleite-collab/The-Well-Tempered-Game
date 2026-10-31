/**
 * D400, THE REAL PLAY SCREEN IN THE TUTORIAL (docs/design/STUDIO-REAL-SCREEN.md): the screen dressed lesson
 * by lesson (each element on from the lesson that first needs it, then on for good); each introduced once
 * (the record's `dressed`, the same tb-tutorial-v2, still v: 3); 6.8 THE REAL THING before the fugue track,
 * its eleven-bubble tour, then Fugue I/2's subject on the organ, passed by a careful player and failed by a
 * random tapper; the fugue track on the full screen; every new line translated.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { checkpointOf, decider, lessonById, lessonPassed, MANUAL, midiOf, spanOf, stagePassed } from "../src/bench/manual/lessons.ts";
import { DRESS, REAL_TOUR } from "../src/bench/manual/dress.ts";
import { dressOf, introFor, introIds } from "../src/bench/manual/dress-of.ts";
import { dressedOf, MANUAL_KEY, markDressed, readManual } from "../src/bench/manual/store.ts";
import { demoRun, tapperRun } from "./d342-sim.ts";
import { playerRun } from "./d359-players.ts";

await loadExtras();
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };

test("D400: each element comes on in the lesson that first needs it, and stays on", () => {
  assert.deepEqual(dressOf("1.1"), []);
  assert.deepEqual(dressOf("1.4"), []);
  assert.deepEqual(dressOf("1.5"), ["voices"]);
  assert.deepEqual(dressOf("2.1"), ["voices", "score", "verdicts", "bar"]);
  assert.ok(!dressOf("3.1").includes("marks"), "3.1's HELD has no sign");
  assert.ok(dressOf("3.2").includes("marks"));
  assert.deepEqual(dressOf("3.6").slice(-3), ["accuracy", "crowd", "hint"]);
  assert.ok(!dressOf("6.7").includes("subjects"));
  assert.deepEqual(dressOf("6.8"), DRESS.map((d) => d.id), "THE REAL THING: the full screen");
  for (const l of MANUAL.filter((x) => x.part === "F")) assert.deepEqual(dressOf(l.id), DRESS.map((d) => d.id), `${l.id}: never a simplified screen after THE REAL THING`);
  // Monotone: never taken away again.
  for (let k = 1; k < MANUAL.length; k++) for (const d of dressOf(MANUAL[k - 1].id)) assert.ok(dressOf(MANUAL[k].id).includes(d), `${MANUAL[k].id} keeps ${d}`);
});

test("D400: introduced once per player; a later starter meets what is new to them; the record kept (v: 3)", () => {
  mem.clear();
  mem.set(MANUAL_KEY, JSON.stringify({ v: 3, lessons: { "1.2": { passed: { tries: 1, best: 1, ms: 1 } } }, parts: {}, carried4: true }));
  const s = readManual(store);
  assert.deepEqual(dressedOf(s), []);
  assert.equal(s.lessons["1.2"].passed?.tries, 1, "the old record kept");
  assert.deepEqual(introIds("2.1", dressedOf(s)), ["voices", "score", "verdicts", "bar"], "began at Part 2: the voices too");
  markDressed(introIds("2.1", []), store);
  const t = readManual(store);
  assert.equal(t.v, 3);
  assert.deepEqual(introFor("2.4", dressedOf(t)), []);
  assert.equal(introFor("3.6", dressedOf(t)).length, 4, "marks, accuracy, crowd, hint");
  assert.equal(t.lessons["1.2"].passed?.tries, 1);
});

test("D400: 6.8 THE REAL THING, before the fugue track: its tour, then Fugue I/2's subject on the organ", () => {
  const l = lessonById("6.8")!;
  const k = MANUAL.indexOf(l);
  assert.equal(MANUAL[k + 1].id, "F.1", "the last lesson before the fugue track");
  assert.equal(checkpointOf("6")!.id, "6.8", "it seals Part 6");
  assert.deepEqual(l.stages.map((s) => s.kind), ["tour", "watch", "play"]);
  assert.equal(l.stages[0].tour!.length, 11);
  assert.deepEqual(REAL_TOUR.map((t) => t.focus), ["all", "score", "bar", "accSubjects", "crowd", "verdicts", "hint", "box", "marks", "stops", "voicesPause"]);
  const m = l.stages[decider(l)].m;
  assert.equal(m.piece, "wtc1f02");
  assert.equal(l.sound, "organ");
  assert.ok(m.flags, "the SUBJECT flag and effect");
  assert.equal(m.widen, undefined, "the game's own windows");
  // The notes as written.
  const f = fugueById(m.piece);
  const { from, until } = spanOf(m);
  const ns = f.voices[m.voice].filter((n) => n[0] >= from && n[0] < until);
  assert.deepEqual(ns.map((n) => n[2]), m.notes!.map(midiOf));
  // A careful player passes it; his demonstration plays it right; a random tapper fails it.
  const x = playerRun(m, { jitterMs: 20, hold: 0.9 }).lens!;
  assert.ok(stagePassed(l, "play", x, decider(l)) && lessonPassed(l, x), JSON.stringify({ right: x.right, of: x.of }));
  const r = demoRun(l.stages[1].m);
  assert.equal(r.right, r.of);
  for (const seed of [1, 3, 7, 11, 19, 23]) assert.ok(!stagePassed(l, "play", tapperRun(m, seed).lens!, decider(l)), `seed ${seed}`);
});

test("D400: the screen drawn by its dressing; the round paused under his bubbles; the stops and pause at THE REAL THING", () => {
  const paint = src("src/bench/paint-proto.ts");
  assert.match(paint, /g\.o\.dress\.includes\("verdicts"\)/);
  assert.match(paint, /g\.o\.dress\?\.includes\("score"\)/);
  assert.match(paint, /g\.o\.dress && !g\.o\.dress\.includes\("bar"\)/);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /dress: dressNow/);
  assert.match(app, /dressRef\.current && !g\.paused\) g\.pause\(\)/);
  assert.match(app, /dressNow\?\.includes\("stops"\)/);
  assert.match(app, /dressNow\?\.includes\("pause"\)/);
});
