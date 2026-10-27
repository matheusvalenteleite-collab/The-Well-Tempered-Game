/**
 * D308, PAUSE: while paused the clock holds, nothing is judged (no note goes by missed), nothing sounds
 * or stays on the schedule (the band's notes, BLUETOOTH MODE's); RESUME clicks a bar of count-in and the
 * music takes up again from the beat where it stopped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
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

for (const bt of [false, true])
  test(`D308: paused${bt ? " in BLUETOOTH MODE" : ""}: the clock holds, no note missed, nothing sounding or scheduled; resumed after a bar of count-in from the beat it stopped in`, () => {
    const clock = { t: 0 };
    const fc = fakeChip(clock);
    const g = new ProtoGame(fugueById("wtc1f02"), 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing", bt }, fc.chip);
    const run = (until: number) => {
      for (; clock.t < until; clock.t += 1 / 60) g.step();
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
    // RESUME: a bar of count-in (its clicks), then on from the beat the pause fell in.
    g.resume();
    assert.equal(g.paused, false);
    const beat = g.beat;
    const grid = g.start + Math.floor((tick - g.start) / beat) * beat;
    assert.ok(g.countIn() > 0, "counting in");
    const back = clock.t;
    run(back + 0.15 + (g.timeAt(grid) - g.timeAt(grid - beat * g.beatsPerBar)) - 0.05);
    assert.ok(fc.ticks.length - clicks >= g.beatsPerBar - 1, `the bar of count-in clicked (${fc.ticks.length - clicks})`);
    assert.ok(Math.abs(g.now - grid) < beat * 0.2, `back at the beat it stopped in (${g.now} vs ${grid})`);
    assert.equal(g.countIn(), g.now < grid ? 1 : 0);
    // On again: the band plays, notes after the pause are judged again (missed, unplayed).
    run(clock.t + 4);
    assert.ok(fc.notes.length > made, "the band on again");
    assert.ok(g.notes.filter((n) => n.state === "miss").length > missedBefore, "time goes on");
  });
