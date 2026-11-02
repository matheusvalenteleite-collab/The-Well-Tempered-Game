/**
 * D308, PAUSE: while paused the clock holds, nothing is judged (no note goes by missed), nothing sounds
 * or stays on the schedule (the band's notes, BLUETOOTH MODE's). D491: RESUME counts 3-2-1 with the box
 * still at the pause point (nothing scrolls, no rewind), then the music goes on from exactly there; the
 * first note's window is whole (a touch just before the "go" is early for it; a note already due at the
 * pause keeps a whole late window from the pause point).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, RESUME_COUNTS } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

interface Rec {
  midi: number;
  at: number;
  asked: number;
  stopAt?: number;
}
function fakeChip(clock: { t: number }) {
  const notes: Rec[] = [];
  const ticks: { at: number; asked: number }[] = [];
  const chip = {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    visual: 0,
    note: (midi: number, at: number) => {
      const r: Rec = { midi, at, asked: clock.t };
      notes.push(r);
      return { stop: (w?: number) => void (r.stopAt ??= w ?? clock.t), bend() {}, glide() {}, muffle() {}, dyn() {} };
    },
    swoosh() {},
    tick: (at: number) => void ticks.push({ at, asked: clock.t }),
  };
  return { chip: chip as unknown as Chip, notes, ticks };
}

const I2 = () => fugueById("wtc1f02");

for (const bt of [false, true])
  test(`D308, D491: paused${bt ? " in BLUETOOTH MODE" : ""}: the clock holds, no note missed, nothing sounding or scheduled; resumed after a still 3-2-1 from exactly the pause point`, () => {
    const clock = { t: 0 };
    const fc = fakeChip(clock);
    const g = new ProtoGame(I2(), 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing", bt }, fc.chip);
    const run = (until: number, each?: () => void) => {
      for (; clock.t < until; clock.t += 1 / 60) (g.step(), each?.());
    };
    // Into the music (a few notes gone by unplayed: missed), then PAUSE.
    const first = g.notes[0];
    run(g.timeAt(first.on) + 3.3);
    const missedBefore = g.notes.filter((n) => n.state === "miss").length;
    assert.ok(missedBefore > 0);
    g.pause();
    assert.equal(g.paused, true);
    const tick = g.pausedTick!;
    const at = clock.t;
    // Every sound stopped by now (the band's notes ahead included).
    for (const r of fc.notes) if (r.at >= at) assert.ok(r.stopAt !== undefined, `a note scheduled for ${r.at} cut`);
    const made = fc.notes.length;
    const clicks = fc.ticks.length;
    const states = g.notes.map((n) => n.state).join();
    // Ten seconds paused: nothing moves, nothing is made, nothing is judged; touches are not taken.
    run(at + 10);
    g.keyDown(1, { velocity: 0.5 }, performance.now());
    g.keyUp(1, performance.now());
    assert.equal(g.now, tick, "the clock held");
    assert.equal(fc.notes.length, made, "nothing scheduled while paused");
    assert.equal(fc.ticks.length, clicks, "no click while paused");
    assert.equal(g.notes.map((n) => n.state).join(), states, "no note judged (none missed) while paused");
    // RESUME: 3-2-1 with the box still at the pause point (no rewind, nothing scrolls), each count clicked.
    g.resume();
    assert.equal(g.paused, false);
    assert.equal(g.countIn(), RESUME_COUNTS, "the count starts at 3");
    const go = g.timeAt(tick);
    assert.ok(go > clock.t + 1, "the count takes time");
    const seen: number[] = [];
    run(go - 0.01, () => {
      assert.equal(g.now, tick, "the clock still at the pause point during the count");
      assert.equal(g.viewNow, tick, "the box still during the count");
      const c = g.countIn();
      if (seen.at(-1) !== c) seen.push(c);
    });
    assert.deepEqual(seen, [3, 2, 1], "counted 3-2-1");
    assert.ok(fc.ticks.length - clicks >= RESUME_COUNTS, `the count clicked (${fc.ticks.length - clicks})`);
    assert.equal(g.notes.map((n) => n.state).join(), states, "nothing judged during the count");
    // Then on from exactly the pause point: never behind it, and moving.
    run(go + 0.05);
    assert.ok(g.now > tick && g.now - tick < g.beat * 0.2, `on from the pause point (${g.now} vs ${tick})`);
    assert.equal(g.countIn(), 0);
    // On again: the band plays, notes after the pause are judged again (missed, unplayed).
    run(clock.t + 4);
    assert.ok(fc.notes.length > made, "the band on again");
    assert.ok(g.notes.filter((n) => n.state === "miss").length > missedBefore, "time goes on");
  });

test("D491: the first note after a pause is fair: a touch just before the go is early for it", () => {
  const clock = { t: 0 };
  const fc = fakeChip(clock);
  const g = new ProtoGame(I2(), 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing" }, fc.chip);
  g.wall = () => 0;
  const run = (until: number) => {
    for (; clock.t < until; clock.t += 1 / 240) g.step();
  };
  const k = g.notes.findIndex((n, i) => i > 3 && n.on > g.notes[i - 1].on);
  const n = g.notes[k];
  // Paused 20 ms before note k.
  run(g.timeAt(n.on) - 0.02);
  g.pause();
  clock.t += 3;
  g.resume();
  const go = g.timeAt(g.now);
  run(go - 0.06);
  assert.equal(g.countIn(), 1);
  g.keyDown(1, { velocity: 0.5 }, 0);
  assert.equal(n.state, "hit", "struck during the count's last moment: early for the first note, not lost");
  assert.ok(g.timeAt(n.at!) - g.timeAt(n.on) < 0, "judged early");
});

test("D491: a note already due when the game was paused keeps a whole late window from the pause point", () => {
  const clock = { t: 0 };
  const fc = fakeChip(clock);
  const g = new ProtoGame(I2(), 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing" }, fc.chip);
  g.wall = () => 0;
  const run = (until: number) => {
    for (; clock.t < until; clock.t += 1 / 240) g.step();
  };
  const k = g.notes.findIndex((n, i) => i > 3 && n.on > g.notes[i - 1].on);
  const n = g.notes[k];
  // Paused 40 ms after note k came due, before it was struck.
  run(g.timeAt(n.on) + 0.04);
  assert.equal(n.state, "pending");
  g.pause();
  clock.t += 3;
  g.resume();
  const go = g.timeAt(g.pausedTick ?? g.now);
  run(go + 0.06);
  assert.equal(n.state, "pending", "not swept as missed on the go");
  g.keyDown(1, { velocity: 0.5 }, 0);
  assert.equal(n.state, "hit");
  const off = (g.timeAt(n.at!) - g.timeAt(n.on)) * 1000;
  assert.ok(off > 0 && off < 120, `judged as if it had come at the pause point (${off.toFixed(0)} ms late)`);
});

