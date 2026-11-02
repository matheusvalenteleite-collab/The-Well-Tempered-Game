/**
 * D223, D299: headphones. BLUETOOTH MODE: the window 20 ms wider early and 25 ms late, the clock smoothed;
 * D494: nothing of the player's on the schedule, every note of it sounded by a touch (D299's scheduled
 * notes and silent touches withdrawn). The delay kept per
 * listening setup; AUTO's threshold; the quick calibration; the screen's delay drawn ahead; the default
 * path untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { BT_EARLY_MS, BT_LATE_MS, ProtoGame } from "../src/bench/proto-game.ts";
import { protoById, type ProtoId } from "../src/bench/protos.ts";
import { BT_AUTO_S, btOn, lagFor, OutputWatch, quickLag, setupKey, verdictOf, withLag } from "../src/touch/headphones.ts";

const C_MINOR = fugueById("wtc1f02");

interface NoteRec {
  midi: number;
  at: number;
  dur: number;
  p: Play;
  stopAt?: number;
  /** When (audio clock) the note was asked for. */
  asked: number;
}

/** A chip that records its notes; the clock as heard `lag` behind the audio clock. No gates: none may be asked for. */
function fakeChip(clock: { t: number }, lag: number) {
  const notes: NoteRec[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t - lag,
    visual: 0,
    smooth: false,
    note: (midi: number, at: number, dur: number, _v: unknown, p: Play = {}) => {
      const rec: NoteRec = { midi, at, dur, p, asked: clock.t };
      notes.push(rec);
      return { stop: (w?: number) => void (rec.stopAt ??= w ?? clock.t), bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} };
    },
    swoosh: () => {},
    tick: () => {},
  };
  return { chip: chip as unknown as Chip, notes };
}

function game(lag: number, bt: boolean, proto: ProtoId = "keys") {
  const clock = { t: 0 };
  const fc = fakeChip(clock, lag);
  const g = new ProtoGame(C_MINOR, 1, 0, protoById(proto), { bpm: 54, legato: false, easy: "timing", bt }, fc.chip);
  // The game's wall on the fake audio clock (D317's hook, as D361 made the timing tests): a touch stamped
  // with g.wall() is read at that moment however busy the machine (the real clock made "40 ms late" flaky).
  g.wall = () => clock.t * 1000;
  /** Runs the frames up to time t (s, audio clock). */
  const until = (t: number) => {
    while (clock.t < t - 0.016) (clock.t += 0.016), g.step();
    clock.t = t;
    g.step();
  };
  return { g, clock, until, ...fc };
}
/** The first struck note (not riding, the head of its chord). */
const firstHead = (g: ProtoGame) => g.notes.findIndex((n, i) => !n.ride && !(i > 0 && g.notes[i - 1].on === n.on));
/** The player's note scheduled for note i: at its written time on the audio clock. */
function scheduled(r: ReturnType<typeof game>, i: number) {
  const n = r.g.notes[i];
  return r.notes.find((x) => x.p.lead && x.midi === n.midi && Math.abs(x.at - r.g.timeAt(n.on)) < 1e-9);
}

test("D494: BLUETOOTH MODE puts nothing of the player's on the schedule; untouched, a note is missed and never sounds", () => {
  const lag = 0.16;
  const r = game(lag, true);
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  r.until(at - 0.1);
  assert.equal(scheduled(r, i), undefined, "not on the schedule");
  assert.equal(r.g.armedAt(0, n.on), undefined);
  r.until(at + lag + 0.8);
  assert.equal(n.state, "miss");
  assert.equal(r.notes.filter((x) => x.p.lead).length, 0, "no note of the player's voice without a touch");
});

test("D494: in BLUETOOTH MODE a touch in the window scores the note and sounds it at the touch; letting go cuts it", () => {
  const lag = 0.16;
  const r = game(lag, true);
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  // The touch heard on time: lag after the note's audio time; 40 ms late of that, to be sure.
  r.until(at + lag + 0.04);
  r.g.keyDown(1, { velocity: 0.9 }, r.g.wall());
  assert.equal(n.state, "hit");
  const rec = r.notes.find((x) => x.p.lead && x.midi === n.midi && x.asked === r.clock.t);
  assert.ok(rec, "struck at the touch");
  r.until(at + lag + 0.1);
  r.g.keyUp(1, r.g.wall());
  assert.ok(rec.stopAt !== undefined && Math.abs(rec.stopAt - r.clock.t) < 1e-9, "let go, the note is cut");
  // D218: the release judged from the touch (as heard), not from the sound.
  assert.ok(n.off !== undefined && Math.abs(r.g.timeAt(n.off) - (r.clock.t - lag)) < 0.01, `off ${n.off}`);
  assert.equal(r.g.btOffsets.length, 1);
  assert.ok(Math.abs(r.g.btOffsets[0] - 40) < 1, `${r.g.btOffsets[0]}`);
});

test("D494: a whole run untouched sounds no note of the player's voice, in BLUETOOTH MODE or not, on every layout", () => {
  for (const proto of ["keys", "piano", "ladder"] as ProtoId[])
    for (const bt of [true, false]) {
      const r = game(bt ? 0.2 : 0, bt, proto);
      r.until(r.g.timeAt(r.g.end) + 1);
      assert.equal(r.notes.filter((x) => x.p.lead).length, 0, `${proto} bt=${bt}`);
      assert.ok(r.g.notes.every((n) => n.state !== "pending" && n.state !== "hit"), `${proto} bt=${bt}: all missed`);
    }
});

test("D299: BLUETOOTH MODE's window 20 ms wider early, 25 ms late; off, nothing is scheduled (the default path)", () => {
  const on = game(0.16, true).g;
  const off = game(0, false).g;
  assert.ok(Math.abs(on.opt.late - off.opt.late - (BT_LATE_MS / 1000) * off.tps) < 1e-9);
  assert.ok(Math.abs(on.opt.early - off.opt.early - (BT_EARLY_MS / 1000) * off.tps) < 1e-9);
  // Off: the touch strikes its note at once, and nothing is put on the schedule for the player.
  const r = game(0, false);
  const i = firstHead(r.g);
  const at = r.g.timeAt(r.g.notes[i].on);
  r.until(at - 0.1);
  assert.equal(r.notes.filter((x) => x.p.lead).length, 0, "the player's notes wait for the touch");
  assert.equal(r.g.armedAt(0, r.g.notes[i].on), undefined);
  r.until(at);
  r.g.keyDown(1, { velocity: 0.5 }, r.g.wall());
  assert.equal(r.g.notes[i].state, "hit");
  assert.ok(r.notes.some((x) => x.midi === r.g.notes[i].midi && x.at === r.clock.t && x.asked === r.clock.t), "struck at the touch");
  r.g.keyUp(1, r.g.wall());
  assert.ok(r.notes.some((x) => x.midi === r.g.notes[i].midi && x.stopAt === r.clock.t), "and let go with it");
  assert.equal(r.g.viewNow, r.g.now, "no screen delay: drawn as heard");
  assert.equal((r.chip as unknown as { smooth: boolean }).smooth, false, "the clock as it was");
  assert.equal(r.g.btOffsets.length, 0);
});
test("D223: the screen's delay draws ahead of the clock as heard", () => {
  const r = game(0.1, false);
  (r.chip as unknown as { visual: number }).visual = 0.05;
  r.until(1);
  assert.ok(Math.abs(r.g.viewNow - r.g.tickAtTime(r.chip.heard() + 0.05)) < 1e-9);
  assert.ok(r.g.viewNow > r.g.now);
  // Painting with it keeps the game's own clock.
  const now = r.g.now;
  assert.equal(r.g.view(() => r.g.now), r.g.viewNow);
  assert.equal(r.g.now, now);
});

test("D223: the delay kept per setup and restored; a change noticed; AUTO's threshold; the quick calibration", () => {
  // Setups: by device name where given, else by the reported latency in 50 ms buckets.
  assert.equal(setupKey(0.16, "AirPods Pro"), "dev:AirPods Pro");
  assert.equal(setupKey(0.16), "lat:3");
  assert.equal(setupKey(undefined), "default");
  let book = withLag({}, setupKey(0.16), 0.172);
  book = withLag(book, setupKey(0.012), 0.03);
  assert.equal(lagFor(book, setupKey(0.16)), 0.172, "AirPods back: their delay");
  assert.equal(lagFor(book, setupKey(0.01)), 0.03, "the speaker back: its delay");
  assert.equal(lagFor(book, setupKey(0.19)), 0.172, "a neighbouring bucket (the estimate drifts)");
  assert.equal(lagFor(book, setupKey(0.4)), undefined);
  assert.equal(lagFor(withLag(book, "lat:3", null), "lat:3"), undefined, "reset: forgotten");
  // The output watched: the first reading settles, a jump over 50 ms is a change, small drift is not.
  const w = new OutputWatch();
  assert.equal(w.sample(0.012), false);
  assert.equal(w.sample(0.04), false);
  assert.equal(w.sample(0.17), true);
  assert.equal(w.sample(0.2), false);
  assert.equal(w.sample(undefined), false, "unsupported: nothing");
  assert.equal(w.sample(0.02), true);
  // AUTO: on over 80 ms (the tapped delay first, else the reported one).
  assert.equal(BT_AUTO_S, 0.08);
  assert.equal(btOn("auto", 0.08), false);
  assert.equal(btOn("auto", 0.081), true);
  assert.equal(btOn("auto", null, 0.15), false, "D494: a reported latency alone never turns it on");
  assert.equal(btOn("auto", 0.03, 0.15), false, "the tap beats the estimate");
  assert.equal(btOn("on", 0), true);
  assert.equal(btOn("off", 0.3), false);
  // Eight taps, one wild: the median of the rest; the verdict.
  const r = quickLag([0.15, 0.16, 0.17, 0.155, 0.165, 0.16, 0.42, 0.158])!;
  assert.equal(r.kept, 7);
  assert.ok(Math.abs(r.lag - 0.16) < 0.006);
  assert.equal(verdictOf(r.lag), "BLUETOOTH");
  assert.equal(verdictOf(0.03), "WIRED-LIKE");
  assert.equal(quickLag([0.1, 0.12, 0.11]), null, "too few");
  assert.equal(quickLag([0, 0.1, 0.2, 0.3, 0.05, 0.25, 0.15, 0.35]), null, "too uneven");
});
