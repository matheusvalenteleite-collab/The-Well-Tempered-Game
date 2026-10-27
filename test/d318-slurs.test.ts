/**
 * D318: slurs as a player makes them on a phone are accepted (the owner: "I was playing now and had a lot
 * of errors when I actually felt like I was doing what I needed to get a slur between two notes"), and
 * the game stays honest: random heights, wrong ways, a thumb alone, two thumbs pressed together, a
 * thumb's own roll are judged as before.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, sum, SLURRING, CAREFUL, W, H, phoneRows, type Player } from "./slur-sim.ts";
import type { Chip } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { ProtoGame, SAME_THUMB_PX, SLIDE_TAKE_MS, SLUR_EARLY_MAX_MS, SLUR_EARLY_SHARE, SLUR_ROLL_MIN_MS } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { MECH_DEFAULTS, withMech } from "../src/bench/mechanics.ts";

const pc = (a: number, b: number) => (100 * a) / Math.max(1, b);
const run = (id: string, v: number, p: Player, o: { bars?: number; bpm?: number } = { bars: 24 }) => sum([1, 2].map((s) => simulate(id, v, p, s, o)));

test("D318: the slurring player (overlaps, drift, wiggles, iOS cancels, thumbs crossing, early landings): notes right, joined, no fresh attack", () => {
  for (const [id, v] of [["wtc1f02", 0], ["wtc2f12", 0], ["wtc2f22", 1]] as const) {
    const t = run(id, v, SLURRING);
    assert.ok(pc(t.right, t.notes) >= 98, `${id}: right ${t.right}/${t.notes}`);
    assert.ok(pc(t.legato, t.slurred) >= 97, `${id}: legato ${t.legato}/${t.slurred}`);
    assert.ok(pc(t.attacked, t.slurred) <= 2, `${id}: a fresh attack on ${t.attacked}/${t.slurred} slurred notes`);
    assert.ok(t.slid <= 2, `${id}: ${t.slid} notes taken by a drifting thumb's slide`);
  }
});

test("D318: each way a slur failed, alone", () => {
  // Landing early in fast notes (II/12's semiquavers): was 86% right.
  const early = run("wtc2f12", 0, { ...CAREFUL, earlyP: 1, earlyMs: [20, 120] });
  assert.ok(pc(early.right, early.notes) >= 98, `early: ${early.right}/${early.notes}`);
  // The second thumb on the first one's bar: was 87% right over the fugues.
  const same = run("wtc1f02", 0, { ...CAREFUL, sameBarP: 0.5 });
  assert.ok(same.wrong <= 2, `same bar: ${same.wrong} wrong`);
  // iOS taking the first touch back as the second lands: legato was 74%, a fresh attack on a quarter.
  const cancel = run("wtc1f02", 0, { ...CAREFUL, cancelP: 0.5 });
  assert.ok(pc(cancel.legato, cancel.slurred) >= 99 && cancel.attacked === 0, `cancel: legato ${cancel.legato}/${cancel.slurred}, attacked ${cancel.attacked}`);
  // A hair's gap (0-60 ms): credited before, but every note a fresh attack.
  const gap = run("wtc1f02", 0, { ...CAREFUL, overlapP: 0 });
  assert.equal(gap.attacked, 0, "a handover within the legato window sounds joined");
  // The first thumb drifting toward the next note: its slide took the note (no legato), the landing ignored.
  const drift = run("wtc2f12", 0, { ...CAREFUL, driftY: 30, driftX: 20, driftLead: 80, overlapP: 0.5, cancelP: 0.3 });
  assert.ok(drift.slid <= 1 && pc(drift.legato, drift.slurred) >= 95, `drift: slid ${drift.slid}, legato ${drift.legato}/${drift.slurred}`);
});

test("D318: the owner's II/18 run (83 bpm, slurred pairs, the second thumb rolling in early): was about 401/494 right", () => {
  const roll: Player = { ...SLURRING, earlyP: 0.3, earlyMs: [60, 200], rollP: 0.15, rollMs: [40, 160] };
  const t = run("wtc2f18", 0, roll, { bars: 50, bpm: 83 });
  assert.ok(pc(t.right, t.notes) >= 97, `II/18: right ${t.right}/${t.notes}, missed ${t.missed}, doubles ${t.doubles}, strays ${t.stray}`);
});

test("D318: careless playing is judged as before", () => {
  for (const [id, v] of [["wtc1f02", 0], ["wtc2f12", 0]] as const) {
    // Anywhere on the bar: no better than before D318 (I/2 35%, II/12 34% over the whole fugue).
    const rnd = run(id, v, { ...CAREFUL, wrongP: 1, wrongFrom: "random" });
    assert.ok(pc(rnd.right, rnd.notes) <= 50, `${id} random: ${rnd.right}/${rnd.notes}`);
    // The wrong way from the thumb it takes over from, a third of the time: still caught.
    const wrong = run(id, v, { ...CAREFUL, ref: "held", wrongP: 0.3, wrongFrom: "held" });
    assert.ok(pc(wrong.right, wrong.notes) <= 85, `${id} wrong way: ${wrong.right}/${wrong.notes}`);
    // One thumb, detached: nothing joined, nothing waits.
    const one = run(id, v, { ...CAREFUL, oneThumb: true, slur: false, wrongP: 0.3 });
    assert.ok(pc(one.right, one.notes) <= 85, `${id} one thumb: ${one.right}/${one.notes}`);
    assert.equal(one.diag?.WAIT ?? 0, 0);
  }
});

/** A bare game on II/12 for single touches. */
function bare() {
  const clock = { t: 0 };
  const perf = globalThis.performance;
  const real = perf.now.bind(perf);
  Object.defineProperty(perf, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  const quiet = { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
  const chip = { ctx: { get currentTime() { return clock.t; } }, heard: () => clock.t, note: () => quiet, swoosh() {}, tick() {}, chime() {} } as unknown as Chip;
  const f = fugueById("wtc2f12");
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: tempoOf("wtc2f12"), legato: false, until: f.length, wait: false, solo: false, fail: false }, chip);
  const notes = g.tracks[0].notes;
  g.rows = phoneRows(Math.min(...notes.map((n) => n.step)), Math.max(...notes.map((n) => n.step)));
  // Two struck notes a semiquaver apart, the second joined.
  const j = notes.findIndex((n, i) => i > 0 && !n.ride && !notes[i - 1].ride && n.on - notes[i - 1].on <= f.tpq / 4 && g.joinedAt(i) && n.on > 4 * f.barTicks);
  const to = (t: number) => {
    while (clock.t < t - 0.016) (clock.t += 0.016), g.step();
    clock.t = t;
    g.step();
  };
  const at = (side: "left" | "right", x: number, step: number) => ({ side, x, y: g.rows!.yOf(step), w: W, h: H });
  return { g, notes, i: j - 1, j, to, at, done: () => Object.defineProperty(perf, "now", { value: real, configurable: true, writable: true }) };
}

test("D318: a thumb's own roll and two thumbs pressed together are no slur; a roll into the next note is", () => {
  // The thumb holding the note rolls (a second contact where it is): no strike of the next note (D290's DOUBLE).
  {
    const b = bare();
    const [p, n] = [b.notes[b.i], b.notes[b.j]];
    b.to(b.g.timeAt(p.on));
    b.g.down(1, b.at("left", 60, p.step), performance.now());
    b.to(b.g.timeAt(p.on) + 0.05);
    b.g.down(2, { ...b.at("left", 70, p.step), y: b.at("left", 70, p.step).y - 8 }, performance.now());
    b.to(b.g.timeAt(n.on) + 0.01);
    assert.notEqual(n.via, "touch", "a rolling thumb's second contact took the next note");
    b.done();
  }
  // Both thumbs together (10 ms apart): a chord pressed, not a slur.
  {
    const b = bare();
    const [p, n] = [b.notes[b.i], b.notes[b.j]];
    b.to(b.g.timeAt(p.on));
    b.g.down(1, b.at("left", 60, p.step), performance.now());
    b.to(b.g.timeAt(p.on) + 0.01);
    b.g.down(2, b.at("right", W - 60, n.step), performance.now());
    b.to(b.g.timeAt(n.on) + 0.01);
    assert.notEqual(n.state, "hit", "two thumbs pressed together played the next note");
    b.done();
  }
  // The second thumb rolling in 80 ms after the first (the II/18 report): it waits and strikes the next note, joined.
  {
    const b = bare();
    const [p, n] = [b.notes[b.i], b.notes[b.j]];
    b.to(b.g.timeAt(p.on));
    b.g.down(1, b.at("left", 60, p.step), performance.now());
    b.to(b.g.timeAt(p.on) + 0.08);
    const legato = b.g.art.legato;
    b.g.down(2, b.at("right", W - 60, n.step), performance.now());
    assert.equal(n.state, "pending", "not before its time");
    b.to(b.g.timeAt(n.on) + 0.01);
    assert.equal(n.state, "hit");
    assert.equal(b.g.art.legato, legato + 1, "joined");
    b.done();
  }
});

test("D318: the slur mechanics are THE LAB's parameters: on by default, and off they give back the old judging", () => {
  assert.deepEqual([MECH_DEFAULTS.slurEarlyShare, MECH_DEFAULTS.slurEarlyMaxMs, MECH_DEFAULTS.slurRollMinMs, MECH_DEFAULTS.sameThumbPx, MECH_DEFAULTS.slideTakeMs], [SLUR_EARLY_SHARE, SLUR_EARLY_MAX_MS, SLUR_ROLL_MIN_MS, SAME_THUMB_PX, SLIDE_TAKE_MS]);
  assert.deepEqual([MECH_DEFAULTS.thumbCross, MECH_DEFAULTS.slurNext, MECH_DEFAULTS.slideTakeover, MECH_DEFAULTS.joinedSound, MECH_DEFAULTS.cancelJoins, MECH_DEFAULTS.directionRef], [true, true, true, true, true, "own"]);
  const early: Player = { ...CAREFUL, earlyP: 1, earlyMs: [20, 120] };
  const on = run("wtc2f12", 0, early);
  const off = withMech({ slurNext: false }, () => run("wtc2f12", 0, early));
  assert.ok(off.right < on.right - 5, "slurNext off: " + off.right + " vs " + on.right);
  const same: Player = { ...CAREFUL, sameBarP: 0.5 };
  assert.ok(withMech({ thumbCross: false }, () => run("wtc1f02", 0, same)).wrong > run("wtc1f02", 0, same).wrong + 5);
  const gap: Player = { ...CAREFUL, overlapP: 0 };
  assert.ok(withMech({ joinedSound: false }, () => run("wtc1f02", 0, gap)).attacked > 0);
});
