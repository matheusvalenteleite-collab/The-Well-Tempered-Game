/**
 * D325, the musicians' panel's #1, #2 and #4: articulation scored by intention (the player's own touch,
 * kept consistent; the reading's marks where one is chosen), legato's share of the points capped;
 * expressive time legal within bounds (an agogic delay on a strong beat or a dissonance, a breath, the
 * final broadening); the readings optional (NONE the default: test/bench-readings.test.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, type TouchFugue } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { releaseVerdict } from "../src/bench/articulation.ts";
import { afterCadence, artBonus, artRoom, dissonantAt, graceMs, heldBounds, holdOf, JOIN_HAIR_MS, strongBeat, TouchSense, touchStyle, valueClass } from "../src/bench/intention.ts";
import { windowOf, type LaneNote } from "../src/touch/lanes.ts";
import { RULES } from "../src/bench/lite.ts";
import { MECH_DEFAULTS } from "../src/bench/mechanics.ts";

const C_MINOR = fugueById("wtc1f02");

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

type Ev = { t: number; down: boolean; id: number };
/** A computer's keys on the C minor fugue's alto (any key: TIMING), driven by key events at times (s). */
function run(evs: Ev[], bpm = 54) {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm, legato: false, easy: "timing" }, fakeChip(clock));
  for (const e of [...evs].sort((a, b) => a.t - b.t || Number(a.down) - Number(b.down))) {
    while (clock.t < e.t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, e.t);
    g.step();
    if (e.down) g.keyDown(e.id, { velocity: 0.5 }, performance.now());
    else g.keyUp(e.id, performance.now());
  }
  return g;
}
const probe = (bpm = 54) => run([], bpm);
const heads = (g: ProtoGame) => g.notes.map((_, i) => i).filter((i) => !g.notes[i].ride && !(i > 0 && g.notes[i - 1].on === g.notes[i].on));

/** The first n struck notes in a row, each joined to the one before and none after a breath. */
function joinedRun(g: ProtoGame, n: number): number[] {
  const hs = heads(g);
  for (let s = 0; s + n <= hs.length; s++) {
    const xs = hs.slice(s, s + n);
    if (xs.slice(1).every((i) => g.joinedAt(i) && !g.breathAt(i))) return xs;
  }
  throw new Error("no joined run");
}

/** Notes idx played on time, each let go at `hold` of the time to the next strike (1: overlapping the next by 30 ms). */
function played(g0: ProtoGame, idx: number[], hold: (k: number) => number, late: (k: number) => number = () => 0): Ev[] {
  const evs: Ev[] = [];
  const at = idx.map((i, k) => g0.timeAt(g0.notes[i].on) + late(k) / 1000);
  idx.forEach((i, k) => {
    const n = g0.notes[i];
    const next = at[k + 1] ?? at[k] + (g0.timeAt(n.on + n.dur) - g0.timeAt(n.on));
    const h = hold(k);
    const off = h >= 1 ? next + 0.03 : at[k] + h * (next - at[k]);
    evs.push({ t: at[k], down: true, id: 100 + k }, { t: off, down: false, id: 100 + k });
  });
  return evs;
}

test("D325: the touch's pure rules: three touches by the hold, a hair's gap joined, consistency by note value", () => {
  assert.deepEqual([1, 0.9, 0.8, 0.62, 0.55, 0.2].map(touchStyle), ["LEGATO", "LEGATO", "ORDINARY", "ORDINARY", "DETACHED", "DETACHED"]);
  assert.equal(holdOf(110, 200, 90), 0.55, "C. P. E. Bach's half value");
  assert.equal(holdOf(110, 200, 90, true), 0.55, "a gap past a hair's is not joined (D289's window would have been)");
  assert.equal(holdOf(170, 200, JOIN_HAIR_MS - 20, true), 0.9, "a hair's gap: joined");
  assert.equal(holdOf(250, 200, 0), 1, "still down at the next strike");
  assert.deepEqual([valueClass(120, 480), valueClass(240, 480), valueClass(480, 480), valueClass(960, 480)], [0, 1, 2, 3]);
  // A steady half-value touch is as consistent as a steady legato.
  for (const h of [0.55, 1]) {
    const s = new TouchSense();
    const oks = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => s.judge(1, h + (k % 2 ? 0.05 : -0.05) * (h < 1 ? 1 : 0)));
    assert.ok(oks.every(Boolean), `steady ${h}`);
    assert.equal(s.touch, h < 1 ? "DETACHED" : "LEGATO");
  }
  // Each note value its own touch: semiquavers slurred, quavers detached, interleaved, all consistent.
  const mixed = new TouchSense();
  assert.ok([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((k) => (k % 2 ? mixed.judge(0, 1) : mixed.judge(1, 0.5))));
  assert.equal(mixed.touchFor(0), "LEGATO");
  assert.equal(mixed.touchFor(1), "DETACHED");
  // A careless touch, all over the place, is not.
  const careless = new TouchSense();
  const holds = [1, 0.4, 0.95, 0.3, 0.8, 0.35, 1, 0.45, 0.75, 0.3];
  const ok = holds.map((h) => careless.judge(1, h)).filter(Boolean).length;
  assert.ok(ok <= 5, `careless: ${ok} of ${holds.length} consistent`);
});

test("D325: articulation's bonus is the same for every touch, grows along a run, and is capped", () => {
  assert.deepEqual([1, 2, 3, 4, 9].map((c) => artBonus(4, c)), [1, 2, 3, 4, 4], "×0.25 a note, at most ×1 (D218's legato: ×0.5, at most ×2)");
  assert.equal(artRoom(10, 1000, 100), 10);
  assert.equal(artRoom(10, 300, 90), 0, "at the cap already (30%)");
  assert.equal(artRoom(10, 1000, 300, 1), 10, "no cap");
  // HELD by the touch: a half-value note is held for a detached player, not for a legato one.
  assert.equal(releaseVerdict(1000, 520, 0, heldBounds("DETACHED")).hold, "held");
  assert.equal(releaseVerdict(1000, 520, 0, heldBounds("LEGATO")).hold, "off");
  assert.equal(releaseVerdict(1000, 520, 0).hold, "off", "no touch yet: D218's bounds");
  assert.equal(releaseVerdict(1000, 250, 0, heldBounds("DETACHED")).hold, "short");
});

test("D325: in play, a consistently detached touch scores as a legato one; LEGATO no longer scores more", () => {
  const g0 = probe();
  const idx = joinedRun(g0, 10);
  const legato = run(played(g0, idx, () => 1));
  const detached = run(played(g0, idx, () => 0.5));
  for (const g of [legato, detached]) assert.ok(idx.every((i) => g.notes[i].state === "hit"), "all right");
  assert.deepEqual([legato.art.touchOk, legato.art.touchOf], [9, 9]);
  assert.deepEqual([detached.art.touchOk, detached.art.touchOf], [9, 9]);
  assert.equal(legato.sense.touch, "LEGATO");
  assert.equal(detached.sense.touch, "DETACHED");
  assert.equal(detached.art.legato, 0, "the legato count (the lessons') as before");
  assert.equal(legato.art.legato, 9);
  const ls = legato.results().sheet;
  const ds = detached.results().sheet;
  assert.ok(Math.abs(ls.final - ds.final) <= 0.1 * ls.final, `legato ${ls.final} ≈ detached ${ds.final}`);
  assert.match(ds.qualities.find((q) => q.key === "touch")!.detail, /DETACHED TOUCH 9\/9/);
  assert.match(ls.qualities.find((q) => q.key === "touch")!.detail, /LEGATO TOUCH 9\/9/);
  // A careless touch scores less than either.
  const careless = run(played(g0, idx, (k) => [1, 0.3, 0.9, 0.35, 1, 0.4, 0.85, 0.3, 1, 0.5][k]));
  assert.ok((careless.art.touchOk ?? 0) < 7, `careless ${careless.art.touchOk}/${careless.art.touchOf}`);
  assert.ok(careless.score < Math.min(legato.score, detached.score));
  // Legato's share of the points is capped.
  assert.ok(legato.earned.articulation <= 0.3 * legato.score + 1, `${legato.earned.articulation} of ${legato.score}`);
});

test("D325b: the pure rules of expressive time: strong beats, dissonances, breaths, the broadening", () => {
  assert.equal(strongBeat(C_MINOR, 0), true);
  assert.equal(strongBeat(C_MINOR, 2 * C_MINOR.tpq), true, "a 4/4's third beat");
  assert.equal(strongBeat(C_MINOR, C_MINOR.tpq), false);
  const f = { voices: [[[0, 480, 72, 0]], [[0, 960, 71, 0]], [[0, 960, 60, 0]]] } as unknown as TouchFugue;
  assert.equal(dissonantAt(f, 0, 0, 72), true, "C against B: a second");
  assert.equal(dissonantAt(f, 1, 0, 71), true);
  assert.equal(dissonantAt({ voices: [[[0, 480, 67, 0]], [[0, 480, 60, 0]]] } as unknown as TouchFugue, 0, 0, 67), false, "a fifth");
  assert.equal(dissonantAt({ voices: [[[0, 480, 65, 0]], [[0, 480, 60, 0]]] } as unknown as TouchFugue, 0, 0, 65), true, "a fourth over the bass");
  assert.equal(afterCadence({ cadences: [{ on: 960 }] } as unknown as TouchFugue, 960, 1440), true);
  assert.equal(afterCadence({ cadences: [{ on: 960 }] } as unknown as TouchFugue, 1440, 1920), false);
  const none = { beatMs: 800, strong: false, dissonant: false, breath: false, toEndBars: 10 };
  assert.deepEqual(graceMs(none), { ms: 0, why: null });
  assert.deepEqual(graceMs({ ...none, strong: true }), { ms: 120, why: "agogic" }, "15% of a beat");
  assert.deepEqual(graceMs({ ...none, breath: true }), { ms: 120, why: "breath" });
  assert.deepEqual(graceMs({ ...none, toEndBars: 0 }), { ms: 160, why: "broaden" }, "20% of a beat at the very end");
  assert.equal(graceMs({ ...none, toEndBars: 1 }).ms, 80, "half of it a bar before");
  assert.deepEqual([MECH_DEFAULTS.agogicShare, MECH_DEFAULTS.breathLateMs, MECH_DEFAULTS.broadenShare], [0.15, 120, 0.2]);
});

test("D325b: a strong beat's window leans late (split windows): the next note's early side gives way", () => {
  const ns = [0, 480, 960].map((on) => ({ on, dur: 480, midi: 60, step: 0, long: false, state: "pending" }) as LaneNote);
  const o = { early: 1000, late: 1000, hold: 0.6, split: true, floor: 100 };
  assert.deepEqual(windowOf(ns, ns[0], o), { early: 1000, late: 240 }, "halfway, as D290");
  assert.deepEqual(windowOf(ns, ns[1], o), { early: 240, late: 240 });
  const lean = { ...o, lean: (on: number) => (on === 0 ? 300 : 0) };
  assert.deepEqual(windowOf(ns, ns[0], lean), { early: 1000, late: 300 });
  assert.deepEqual(windowOf(ns, ns[1], lean), { early: 180, late: 240 }, "the next gives way, no overlap");
  const far = { ...o, lean: (on: number) => (on === 0 ? 450 : 0) };
  assert.deepEqual(windowOf(ns, ns[0], far), { early: 1000, late: 380 }, "the next keeps its floor");
  assert.deepEqual(windowOf(ns, ns[1], far), { early: 100, late: 240 });
});

test("D325b: in play, a strong beat delayed and the pulse regained is PERFECT; not regained, GOOD after all", () => {
  const g0 = probe();
  const hs = heads(g0);
  const quiet = (i: number) => !g0.breathAt(i) && !strongBeat(C_MINOR, g0.notes[i].on) && !dissonantAt(C_MINOR, 1, g0.notes[i].on, g0.notes[i].midi);
  const k = hs.findIndex((i, x) => x > 0 && x + 1 < hs.length && strongBeat(C_MINOR, g0.notes[i].on) && !g0.breathAt(i) && quiet(hs[x + 1]) && quiet(hs[x - 1]));
  assert.ok(k > 0, "a strong beat between two plain notes");
  const idx = hs.slice(k - 1, k + 2);
  // At ♩ = 54 a beat is 1111 ms: 15% is 167 ms; 120 ms late is past PERFECT's 70.
  const back = run(played(g0, idx, () => 1, (x) => (x === 1 ? 120 : 0)));
  assert.equal(back.graces.agogic, 1);
  assert.deepEqual([back.perfects, back.goods], [3, 0]);
  const dragging = run(played(g0, idx, () => 1, (x) => (x >= 1 ? 120 : 0)));
  assert.deepEqual([dragging.graces.agogic, dragging.graces.revoked], [0, 1]);
  assert.deepEqual([dragging.perfects, dragging.goods], [1, 2]);
  assert.ok(dragging.score < back.score);
  // Bounded: past 15% of a beat it is GOOD.
  const tooLate = run(played(g0, idx, () => 1, (x) => (x === 1 ? 200 : 0)));
  assert.deepEqual([tooLate.perfects, tooLate.goods], [2, 1]);
  // Never early.
  const early = run(played(g0, idx, () => 1, (x) => (x === 1 ? -120 : 0)));
  assert.equal(early.goods, 1);
});

test("D325b: a breath: the lift before a re-entry is never NOT JOINED, and the re-entry up to 120 ms late is PERFECT", () => {
  const g0 = probe();
  const hs = heads(g0);
  const k = hs.findIndex((i, x) => x > 0 && g0.breathAt(i) && !strongBeat(C_MINOR, g0.notes[i].on) && !dissonantAt(C_MINOR, 1, g0.notes[i].on, g0.notes[i].midi));
  assert.ok(k > 0, "a re-entry after a rest or a cadence, on no strong beat or dissonance");
  const idx = hs.slice(k - 1, k + 1);
  const g = run(played(g0, idx, (x) => (x === 0 ? 0.5 : 1), (x) => (x === 1 ? 110 : 0)));
  assert.equal(g.graces.breath, 1);
  assert.deepEqual([g.perfects, g.goods], [2, 0]);
  // The lift there not judged (the first note's own join, from a note not played, as before).
  const first = run(played(g0, idx.slice(0, 1), () => 0.5));
  assert.deepEqual([g.art.legatoOf - first.art.legatoOf, g.art.touchOf ?? 0], [0, 0], "the lift there not judged");
  const late = run(played(g0, idx, (x) => (x === 0 ? 0.5 : 1), (x) => (x === 1 ? 160 : 0)));
  assert.deepEqual([late.perfects, late.goods], [1, 1], "bounded");
});

test("D325: HOW TO PLAY no longer says LEGATO scores more; it names the touch and expressive time", () => {
  const ladder = RULES.ladder.join(" ");
  assert.doesNotMatch(ladder, /LEGATO scores more/);
  assert.match(ladder, /ARTICULATION scores a touch kept even/);
  assert.match(ladder, /still PERFECT if you come back to the beat/);
});
