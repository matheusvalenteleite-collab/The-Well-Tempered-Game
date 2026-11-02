/**
 * D494: wired, 0 ms, by default; nothing compensates for Bluetooth by itself; a warning on PLAY (a fugue,
 * the TUTORIAL) when the route reads Bluetooth, once per app session (again after a route read as not
 * Bluetooth), never when the detection is unsure. And the owner's report: Bluetooth detected, then
 * calibrated to wired 0 ms: the game still played the player's first note by itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFakeAudio } from "./fake-audio.ts";
import { Chip, type Play } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { btAuto, btOn, btSeen, btWarnGate, latencyOf } from "../src/touch/headphones.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const AIRPODS = 0.18;
const SPEAKER = 0.012;

test("D494: the default is wired, 0 ms: a reported Bluetooth latency is never taken off the clock by itself", () => {
  const ctx = installFakeAudio(5);
  const ch = new Chip();
  const c = ctx();
  c.currentTime = 3;
  c.outputLatency = AIRPODS;
  c.baseLatency = 0.01;
  assert.equal(ch.lag, null, "no delay set");
  assert.equal(ch.heard(), 3, "heard = the audio clock (0 ms)");
  // The player's own calibration applies as set.
  ch.lag = 0.15;
  assert.ok(Math.abs(ch.heard() - 2.85) < 1e-9);
  ch.lag = 0;
  assert.equal(ch.heard(), 3);
  // BLUETOOTH MODE: never on by a reported latency alone.
  assert.equal(btOn("auto", null, AIRPODS), false);
  assert.equal(btAuto(null, AIRPODS, { fresh: false }), false);
  assert.equal(btAuto(0, AIRPODS, { fresh: true }), false);
  // ...only by a delay the player tapped.
  assert.equal(btAuto(0.2, undefined, { fresh: true }), true);
});

test("D494: the detection: Bluetooth over 80 ms reported; nothing reported is unsure (no)", () => {
  assert.equal(btSeen(AIRPODS), true);
  assert.equal(btSeen(0.081), true);
  assert.equal(btSeen(0.08), false);
  assert.equal(btSeen(SPEAKER), false);
  assert.equal(btSeen(undefined), false);
  assert.equal(latencyOf({ outputLatency: 0 }), undefined, "0 (not started, or not known) reads as nothing");
  assert.equal(latencyOf({}), undefined);
});

test("D494: the warning at PLAY: once while Bluetooth, again after the route reads not Bluetooth; never when unsure", () => {
  let w = false;
  const play = (r: number | undefined) => {
    const g = btWarnGate(w, r);
    w = g.warned;
    return g.show;
  };
  assert.equal(play(SPEAKER), false, "the speaker: no");
  assert.equal(play(undefined), false, "unsure: no");
  assert.equal(play(AIRPODS), true, "Bluetooth: shown");
  assert.equal(play(AIRPODS), false, "not again on the next PLAY");
  assert.equal(play(0.25), false, "nor with its latency drifting");
  assert.equal(play(undefined), false, "unsure in between: no, and nothing forgotten");
  assert.equal(play(AIRPODS), false);
  // The headphones off (a reading of the speaker: RouteWatch's poll, or a PLAY), then on again: shown again.
  w = btWarnGate(w, SPEAKER).warned;
  assert.equal(play(AIRPODS), true, "Bluetooth again mid-session: shown again");
});

test("D494 (the owner's report): Bluetooth detected, then calibrated to wired 0 ms: the next run is wired, no note of the player's sounds by itself", () => {
  const ctx = installFakeAudio(5);
  const ch = new Chip();
  const c = ctx();
  // Opened with Bluetooth headphones on: the route reads Bluetooth (and a running context may keep
  // reporting it after they are turned off: the reading is stale on some browsers).
  c.outputLatency = 0.2;
  // SETTINGS: calibrated to wired 0 ms.
  ch.lag = 0;
  const bt = btAuto(ch.lag, latencyOf(c as unknown as AudioContext), { setup: undefined, fresh: true });
  assert.equal(bt, false, "BLUETOOTH MODE off: wired");
  // A run, untouched: the player's notes recorded as asked of the chip.
  const lead: Play[] = [];
  const note = ch.note.bind(ch);
  ch.note = ((midi: number, at: number, dur: number, v: never, p: Play = {}) => {
    if (p.lead) lead.push(p);
    return note(midi, at, dur, v, p);
  }) as Chip["note"];
  const f = fugueById("wtc1f02");
  const g = new ProtoGame(f, 1, 0, protoById("ladder"), { bpm: 54, legato: false, easy: "timing", bt }, ch);
  g.wall = () => c.currentTime * 1000;
  assert.equal(g.bt, false);
  const first = g.timeAt(g.notes[0].on);
  while (c.currentTime < first + 2) (c.currentTime += 0.016), g.step();
  assert.equal(ch.heard(), c.currentTime, "the clock as heard: 0 ms");
  assert.equal(lead.length, 0, "no note of the player's voice without a touch");
  assert.equal(g.notes[0].state, "miss");
});

test("D494: play.html wires the warning before PLAY and the TUTORIAL; nothing is restored or retuned by itself", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /if \(!warned && warnFirst\(\(\) => start\(true, true\)\)\) return;/, "PLAY, CONTINUE, NEXT");
  assert.match(app, /if \(!warned && warnFirst\(\(\) => startManual\(true\)\)\) return;/, "the TUTORIAL");
  assert.match(app, /<BtWarn/);
  assert.match(app, /settings=\{\(\) => \(setBtWarn\(null\), setPhase\(\{ kind: "settings" \}\), setCalib\(true\)\)\}/, "SETTINGS opens the calibration");
  assert.doesNotMatch(app, /driftOf|setRetuned|rememberRoute/, "no retune, nothing kept to give back");
  const warn = src("src/bench/BtWarn.tsx");
  for (const id of ["bt-warn-play", "bt-warn-settings"]) assert.ok(warn.includes(`id="${id}"`), id);
  assert.match(warn, /btWarnGate/);
  assert.doesNotMatch(src("src/touch/chip.ts"), /this\.lag \?\? \(this\.ctx\.outputLatency/, "no outputLatency taken off by itself");
  const watch = src("src/bench/RouteWatch.tsx");
  assert.doesNotMatch(watch, /kind === "drop"|kind === "restore"/);
  assert.match(watch, /noteRoute\(reported\)/);
  const text = /export const BT_WARN_TEXT =\s*"([^"]+)"/.exec(warn)![1];
  for (const d of ["pt", "es"]) {
    const dict = src(`src/i18n/${d}.ts`);
    for (const k of [text, "PLAY ANYWAY", "BLUETOOTH?", "WIRED · 0 MS", "SETTINGS"]) assert.ok(dict.includes(`"${k}":`) || dict.includes(`  ${k}:`), `${d}: ${k}`);
  }
});
