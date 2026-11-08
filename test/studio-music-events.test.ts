/**
 * The design studio (D476): one stream of the run's musical events for the sound and the picture (music-events.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { emitMusic, liveEvents, resetLive, scoreBetween, scoreEvents } from "../src/touch/music-events.ts";

const FUGUES = Array.from({ length: 2 }, (_, b) => Array.from({ length: 24 }, (_, i) => `wtc${b + 1}f${String(i + 1).padStart(2, "0")}`)).flat();

test("D476: every fugue's score events: sorted, inside the piece, levels 0..1, the form's entries, the peak and the last chord", () => {
  for (const id of FUGUES) {
    const f = fugueById(id);
    const ev = scoreEvents(f);
    for (let i = 1; i < ev.length; i++) assert.ok(ev[i].tick >= ev[i - 1].tick, `${id} unsorted`);
    for (const e of ev) assert.ok(e.tick >= 0 && e.tick <= f.length && e.level >= 0 && e.level <= 1, `${id} ${e.kind}@${e.tick} ${e.level}`);
    for (const k of ["entry", "peak", "resolve", "climax"]) assert.ok(ev.some((e) => e.kind === k), `${id} has no ${k}`);
    assert.equal(scoreEvents(f), ev, "memoised");
  }
});

test("D476: Busoni's marks as played: II/22's fp's and the ff's rise; I/12's p after f at bar 47 a hush", () => {
  const f = fugueById("wtc2f22");
  const bar = (b: number) => (b - 1) * f.barTicks;
  const ev = scoreEvents(f);
  assert.ok(ev.filter((e) => e.kind === "fp").length >= 6);
  assert.ok(ev.some((e) => e.kind === "cresc"));
  const g = fugueById("wtc1f12");
  const gb = (b: number) => (b - 1) * g.barTicks;
  assert.ok(scoreBetween(g, gb(46.5), gb(47.5)).some((e) => e.kind === "subito-p"), "the hush at bar 47");
  assert.ok(scoreBetween(f, bar(1), bar(2)).every((e) => e.tick < bar(2)));
});

test("D476: the live layer: what the sound reports is read back by tick; a new run empties it; nothing judged", () => {
  resetLive();
  emitMusic({ tick: 100, kind: "roll", level: 0.6, dur: 480 });
  emitMusic({ tick: 580, kind: "crash", level: 0.9 });
  assert.deepEqual(liveEvents(0, 600).map((e) => e.kind), ["roll", "crash"]);
  assert.equal(liveEvents(600, 1000).length, 0);
  for (let i = 0; i < 300; i++) emitMusic({ tick: 1000 + i, kind: "kick", level: 0.5 });
  assert.equal(liveEvents(0, 2000).length, 256, "a ring of 256");
  resetLive();
  assert.equal(liveEvents(0, 1e9).length, 0);
  const s = readFileSync(new URL("../src/touch/music-events.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/"hit"|"miss"|score\(|streak/.test(s));
});
