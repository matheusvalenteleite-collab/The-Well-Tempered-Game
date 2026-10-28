/**
 * D299, BLUETOOTH MODE: the same touches, heard through a 200 ms delay, are judged exactly as without
 * it; a whole run schedules every one of the player's notes at its written time, touched or not, and no
 * touch makes a sound; the smoothed clock; the retune after a run; the sounds suggested with Bluetooth.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { PATCHES, PRESETS } from "../src/touch/sound.ts";
import { BT_SOUNDS, CLOCK_SNAP_S, driftOf, DRIFT_STEP_MS, SmoothClock } from "../src/touch/headphones.ts";

interface Rec {
  midi: number;
  at: number;
  asked: number;
  p: Play;
  stopAt?: number;
}
function fakeChip(clock: { t: number }, lag: number) {
  const notes: Rec[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t - lag,
    visual: 0,
    note: (midi: number, at: number, _d: number, _v: unknown, p: Play = {}) => {
      const r: Rec = { midi, at, asked: clock.t, p };
      notes.push(r);
      return { stop: (w?: number) => void (r.stopAt ??= w ?? clock.t), bend() {}, glide() {}, muffle() {}, dyn() {} };
    },
    swoosh() {},
    tick() {},
  };
  return { chip: chip as unknown as Chip, notes };
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A run of I/2's soprano on the computer's keys (TIMING: any key is right), one key per struck note at
 * its written time as heard plus a human's error (sd 45 ms, one note in six skipped), 60 frames a second.
 */
function run(lag: number, bt: boolean, seed = 7) {
  const clock = { t: 0 };
  const fc = fakeChip(clock, lag);
  const g = new ProtoGame(fugueById("wtc1f02"), 0, 0, protoById("keys"), { bpm: 54, legato: false, easy: "timing", bt }, fc.chip);
  // D361: the keys stamped on the fake audio clock, so they are judged by it alone, never by how long the machine took.
  g.wall = () => clock.t * 1000;
  const R = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R());
  const heads = g.notes.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && g.notes[i - 1].on === n.on));
  // When each key goes down and up (audio clock): what is heard is `lag` behind, so the player is too.
  const evs: { t: number; down: boolean; id: number }[] = [];
  heads.forEach(({ n }, q) => {
    if (R() < 1 / 6) return;
    const t = g.timeAt(n.on) + lag + (gauss() * 45) / 1000;
    evs.push({ t, down: true, id: q + 1 }, { t: t + 0.09, down: false, id: q + 1 });
  });
  evs.sort((a, b) => a.t - b.t);
  const touchSounds: Rec[] = [];
  let k = 0;
  const end = g.timeAt(g.end) + lag + 1;
  for (let t = 0; t < end; t += 1 / 60) {
    while (k < evs.length && evs[k].t <= t) {
      const e = evs[k++];
      clock.t = e.t;
      const before = fc.notes.length;
      if (e.down) g.keyDown(e.id, { velocity: 0.5 }, g.wall());
      else g.keyUp(e.id, g.wall());
      touchSounds.push(...fc.notes.slice(before));
    }
    clock.t = t;
    if (g.step()) break;
  }
  return { g, notes: fc.notes, touchSounds, heads };
}

test("D299: the same touches through a 200 ms Bluetooth delay are judged exactly as wired", () => {
  const wired = run(0, false);
  const bt = run(0.2, true);
  const states = (r: ReturnType<typeof run>) => r.g.notes.map((n) => n.state).join("");
  assert.equal(states(bt), states(wired), "every note judged alike");
  // The windows a little wider in BLUETOOTH MODE: the same or more right, never fewer.
  assert.ok(bt.g.results().right >= wired.g.results().right);
  assert.ok(wired.g.results().right > 0.6 * wired.heads.length, `${wired.g.results().right} of ${wired.heads.length}`);
});

test("D299, D306: BLUETOOTH MODE: a live voice's notes on the schedule at their written times; a miss silences the voice; the next right touch sounds itself; a touched note cut as it is let go", () => {
  const r = run(0.2, true);
  const mine = r.notes.filter((x) => x.p.lead);
  const scheduled = (n: { on: number; midi: number }) => mine.find((x) => x.midi === n.midi && Math.abs(x.at - r.g.timeAt(n.on)) < 1e-9 && x.asked < x.at);
  let onTime = 0;
  let fromTouch = 0;
  for (const { n } of r.heads) {
    const s = scheduled(n);
    if (s) {
      onTime++;
      // A note touched is cut at its release, never before it has sounded a moment.
      // (Or, silenced by a miss just before, it was cut and the touch sounded it itself.)
      if (n.state !== "miss" && s.stopAt !== undefined && s.stopAt < r.g.timeAt(n.on) + 0.05 - 1e-9) assert.ok(r.touchSounds.some((x) => x.midi === n.midi && x.p.lead && x.at >= r.g.timeAt(n.on)), `note at ${n.on} cut at its release, or sounded by its touch`);
    }
  }
  fromTouch = r.touchSounds.filter((x) => x.p.lead).length;
  assert.ok(onTime > 0.5 * r.heads.length, `most notes of a mostly right run on the schedule (${onTime} of ${r.heads.length})`);
  assert.ok(fromTouch > 0, "after a miss, the touch that brings the voice back sounds itself");
  for (const x of r.touchSounds) assert.equal(x.at, x.asked, "a touch's sound is at the touch");
  // Every missed note scheduled was cut (it does not play on by itself).
  for (const { n } of r.heads) {
    const s = scheduled(n);
    if (s && n.state === "miss") assert.notEqual(s.stopAt, undefined, `missed note at ${n.on} cut`);
  }
  // Wired: the player's notes come only from the touches, at the touch.
  const w = run(0, false);
  assert.ok(w.touchSounds.length > 0 && w.touchSounds.every((x) => x.at === x.asked));
  assert.equal(w.notes.filter((x) => x.p.lead).length, w.touchSounds.filter((x) => x.p.lead).length);
});

test("D306: BLUETOOTH MODE, a player who touches nothing: the voice does not play by itself", () => {
  const clock = { t: 0 };
  const fc = fakeChip(clock, 0.2);
  const g = new ProtoGame(fugueById("wtc1f02"), 0, 0, protoById("keys"), { bpm: 54, legato: false, easy: "timing", bt: true }, fc.chip);
  const end = g.timeAt(g.end) + 1;
  for (let t = 0; t < end; t += 1 / 60) {
    clock.t = t;
    if (g.step()) break;
  }
  const mine = fc.notes.filter((x) => x.p.lead);
  const heard = mine.filter((x) => x.stopAt === undefined || x.stopAt > x.at + 0.06);
  assert.ok(heard.length <= 2, `at most the first note or two sound (${heard.length} of ${g.notes.length})`);
});

test("D299: the retune after a run: half the steady lateness, at most 30 ms, only when steady and clear", () => {
  assert.equal(driftOf([40, 40, 40]), 0, "too few notes");
  const late = Array.from({ length: 30 }, (_, i) => 40 + ((i * 7) % 21) - 10);
  assert.ok(Math.abs(driftOf(late) - 0.02) < 0.003, `${driftOf(late)}`);
  assert.equal(driftOf(late.map((x) => x - 35)), 0, "within the dead zone: left alone");
  assert.equal(driftOf(late.map((x) => x + 200)), DRIFT_STEP_MS / 1000, "at most a step");
  assert.equal(driftOf(late.map((x) => -x - 100)), -DRIFT_STEP_MS / 1000, "early too");
  const wild = Array.from({ length: 30 }, (_, i) => (i % 2 ? 150 : -150));
  assert.equal(driftOf(wild), 0, "too uneven: no change");
  // A run gathers enough notes for it; a player on time (as heard) leaves the delay alone.
  const r = run(0.2, true);
  assert.ok(r.g.btOffsets.length > 16);
  assert.equal(driftOf(r.g.btOffsets), 0);
});

test("D299: the smoothed clock follows the audio clock's blocks without their steps, and never goes back", () => {
  const c = new SmoothClock();
  // An audio clock that moves in 21.3 ms blocks (1024 frames at 48 kHz), read every 16.7 ms.
  const block = 1024 / 48000;
  let prev = -Infinity;
  let worst = 0;
  const steps: number[] = [];
  for (let f = 0; f < 600; f++) {
    const ms = 1000 + f * (1000 / 60);
    const audio = Math.floor((ms / 1000 - 0.5) / block) * block + 0.3;
    const t = c.read(audio, ms);
    assert.ok(t >= prev, "never back");
    if (f > 120) {
      worst = Math.max(worst, Math.abs(t - (ms / 1000 - 0.5 + 0.3 - block / 2)));
      steps.push(t - prev);
    }
    prev = t;
  }
  assert.ok(worst < 0.006, `within 6 ms of the true time: ${worst}`);
  const frame = 1 / 60;
  assert.ok(steps.every((d) => Math.abs(d - frame) < 0.002), "every frame the same step (no judder)");
  // A stall (the audio clock stops): snapped once they part by more than CLOCK_SNAP_S.
  const c2 = new SmoothClock();
  c2.read(1, 1000);
  const t2 = c2.read(1, 1000 + (CLOCK_SNAP_S + 0.02) * 1000);
  assert.equal(t2, 1, "held where the audio clock stands");
});

test("D299: the sounds suggested with Bluetooth: quick attacks (5 ms or less) and no echo or reverb of their own", () => {
  const P = PATCHES as Record<string, { amp?: { a: number }; rec?: { a: number }; send?: number }>;
  for (const id of BT_SOUNDS) {
    const p = PRESETS.find((x) => x.id === id);
    assert.ok(p, id);
    // D339: the sampled harpsichord's music room (salon, RT60 1.5 s) only takes the shared room's place: no echo, no hall.
    assert.ok(p.fx === undefined || p.fx === "salon", `${id}: no echo or hall`);
    for (const s of p.slots ?? []) {
      const q = P[s];
      assert.ok((q.rec?.a ?? q.amp?.a ?? 0) <= 0.005, `${id} ${s}: attack`);
      assert.ok(!q.send || p.fx === "salon", `${id} ${s}: no send of its own`);
    }
  }
  // And the slowest (for the report): TOMITA's choir, 120 ms (D302: AGENT 64 retired).
  const slow = PRESETS.filter((p) => (p.slots ?? []).some((s) => (P[s].rec?.a ?? P[s].amp?.a ?? 0) >= 0.1)).map((p) => p.id);
  assert.deepEqual(slow.sort(), ["tomita"]);
});
