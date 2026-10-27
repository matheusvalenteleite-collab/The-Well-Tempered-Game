/**
 * D328, THE LAB's BAND TIME: FIXED is the game's clock (no band time at all); WAITS holds the band at
 * cadences and breaths until the player's note, bounded, and nowhere else; FOLLOWS follows the
 * player's tempo within its bound, only at beats, and its drift stays capped even for a player who
 * sits behind the band whatever it does (the feedback loop).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MECH, MECH_DEFAULTS, withMech } from "../src/bench/mechanics.ts";
import { waitPoints } from "../src/bench/band-time.ts";
import { describe as lines } from "../src/bench/lab/describe.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { silentChip } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import { bandRun, PLAYERS, type TimePlayer } from "../tools/lab/band-sim.ts";

const II = (piece: string, voice: number, fromBar: number, toBar: number, bpm: number): LabPassage => ({ piece, voice, fromBar, toBar, bpm, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null });
// I/2's soprano round its cadence in bar 17 (rests in the episode after it); I/1's soprano to the end (cadences 24 and 27).
const I2 = II("wtc1f02", 0, 14, 21, 70);
const I1 = II("wtc1f01", 0, 22, 27, 60);
const P = (name: string) => PLAYERS.find((p) => p.name === name)!;

test("D328: the game's band keeps the written time (FIXED, no band time)", () => {
  assert.equal(MECH_DEFAULTS.bandTime, "fixed");
  assert.equal(MECH.bandTime, "fixed");
  assert.equal(labGame(I2, silentChip({ t: 0 })).bandT, null);
  withMech({ bandTime: "waits" }, () => assert.notEqual(labGame(I2, silentChip({ t: 0 })).bandT, null));
  // Not with WAIT FOR ME or BLUETOOTH MODE.
  withMech({ bandTime: "follows" }, () => {
    assert.equal(labGame({ ...I2, wait: true }, silentChip({ t: 0 })).bandT, null);
    assert.equal(labGame({ ...I2, bt: true }, silentChip({ t: 0 })).bandT, null);
  });
  const r = bandRun(I2, P("breather"), { bandTime: "fixed" });
  assert.equal(r.events.filter((e) => e.kind === "band").length, 0);
});

test("D328: wait points: the note at or after a cadence, after a rest, the last of the piece", () => {
  const q = 480;
  const notes = [
    { on: 0, dur: q },
    { on: q, dur: q },
    { on: 3 * q, dur: q }, // after a rest of a beat
    { on: 4 * q, dur: q / 4 }, // after a cadence on 4q
    { on: 4 * q + q / 4, dur: q / 4 }, // a gap of 0: nothing
    { on: 6 * q, dur: q }, // the last
  ];
  const w = waitPoints(notes, [{ on: 4 * q }], { from: 0, until: 8 * q, beat: q, barTicks: 4 * q, endsPiece: true });
  assert.deepEqual(
    w.map((p) => [p.tick / q, p.kind]),
    [
      [3, "breath"],
      [4, "cadence"],
      [6, "final"],
    ],
  );
  // The passage's first note only after a beat or more of rests.
  assert.deepEqual(waitPoints([{ on: 2 * q, dur: q }], [], { from: 0, until: 4 * q, beat: q, barTicks: 4 * q, endsPiece: false }).map((p) => p.kind), ["breath"]);
});

test("D328: WAITS holds the band for a breathing player at the cadence and the rests, bounded, and judges against it", () => {
  const fixed = bandRun(I2, P("breather"), { bandTime: "fixed" });
  const waits = bandRun(I2, P("breather"), { bandTime: "waits" });
  assert.ok(waits.points.cadence >= 1 && waits.points.breath >= 1, JSON.stringify(waits.points));
  const told = waits.events.filter((e) => e.kind === "band");
  assert.ok(told.length >= 3, `waits ${told.length}`);
  assert.ok(told.every((e) => e.what === "wait"), "no tempo change in WAITS");
  assert.ok(waits.waits.some((x) => x.kind === "cadence"), "a wait at the cadence");
  assert.ok(waits.waits.every((x) => x.ms <= MECH_DEFAULTS.bandWaitMaxMs + 1), JSON.stringify(waits.waits));
  // The breaths no longer cost the player: more right, closer to the band.
  assert.ok(waits.right >= fixed.right, `${waits.right} vs ${fixed.right}`);
  assert.ok(waits.meanOff < fixed.meanOff, `${waits.meanOff} vs ${fixed.meanOff}`);
  // Every sound held over a wait point was stopped where it ends.
  assert.ok(waits.held.scheduled > 0);
  assert.equal(waits.held.stopped, waits.held.scheduled);
  // Told in WHAT HAPPENED.
  const l = lines("wtc1f02", told.find((e) => e.kind === "band" && e.what === "wait" && e.at === "cadence")!)[0];
  assert.match(l, /^b17\.\d ⏸ BAND WAITED \d+ ms at the cadence$/);
});

test("D328: a wait ends at its longest and the band goes on without the player", () => {
  const late: TimePlayer = { ...P("breather"), name: "very late", breath: [700, 800] };
  const r = bandRun(I2, late, { bandTime: "waits", bandWaitMaxMs: 300 });
  assert.ok(r.waits.length >= 2);
  for (const x of r.waits) assert.ok(x.expired && Math.abs(x.ms - 300) < 1, JSON.stringify(x));
  const e = r.events.find((x) => x.kind === "band");
  assert.match(lines("wtc1f02", e!)[0], /BAND WAITED 300 ms .*went on without you/);
});

test("D328: the final chord waits too", () => {
  const r = bandRun(I1, { ...P("steady"), name: "late at the end", bias: 0, sd: 5, breath: [200, 250] }, { bandTime: "waits" });
  assert.ok(r.waits.some((x) => x.tick === Math.max(...r.waits.map((w) => w.tick)) && x.ms > 150), JSON.stringify(r.waits));
});

test("D328: FOLLOWS stays within its bound, changes only at beats, and its drift stays capped (the feedback loop)", () => {
  for (const [who, cap, bound] of [
    ["dragger", 250, 4],
    ["behind", 250, 4],
    ["rusher", 150, 3],
    ["dragger", 500, 5],
  ] as const) {
    const r = bandRun(I2, P(who), { bandTime: "follows", bandDriftMaxMs: cap, bandBoundPct: bound });
    assert.ok(r.minPct >= 100 - bound - 1e-6 && r.maxPct <= 100 + bound + 1e-6, `${who}: ${r.minPct}–${r.maxPct}`);
    // A beat's tempo is set before the drift is checked again: at most one beat's bound beyond the cap.
    const beatMs = 60000 / 70;
    assert.ok(r.maxDriftMs <= cap + (beatMs * bound) / 100 + 1, `${who}: drift ${r.maxDriftMs} cap ${cap}`);
    const tempi = r.events.filter((e) => e.kind === "band" && e.what === "tempo");
    for (const e of tempi) assert.equal((e.tick - 13 * 4 * 480) % 480, 0, `${who}: a tempo change off the beat at ${e.tick}`);
  }
  // The dragger is followed (the band slower somewhere), the steady player hardly at all.
  const d = bandRun(I2, P("dragger"), { bandTime: "follows" });
  assert.ok(d.minPct < 99, `dragger ${d.minPct}`);
  const s = bandRun(I2, P("steady"), { bandTime: "follows" });
  assert.ok(s.minPct > 98 && s.maxPct < 102 && s.maxDriftMs < 60, `steady ${s.minPct}–${s.maxPct} drift ${s.maxDriftMs}`);
  const t = d.events.find((e) => e.kind === "band" && e.what === "tempo");
  assert.match(lines("wtc1f02", t!)[0], /♩ BAND TEMPO \d+%/);
});

test("D328: pause and resume with the band following", () => {
  withMech({ bandTime: "follows" }, () => {
    const clock = { t: 0 };
    const g = labGame(I2, silentChip(clock));
    for (; clock.t < 3; clock.t += 1 / 60) g.step();
    g.pause();
    clock.t += 2;
    g.resume();
    const at = g.now;
    for (let n = 0; n < 60; n++) (clock.t += 1 / 60), g.step();
    assert.ok(g.now > at, "the clock goes on after a pause");
  });
});
