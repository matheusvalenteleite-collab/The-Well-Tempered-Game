/**
 * D223, D299: headphones. BLUETOOTH MODE (D299) puts the player's notes on the schedule at their written
 * times and lengths, at their usual level, touched or not; a touch scores and makes no sound; nothing
 * is armed, confirmed or faded; the window 20 ms wider early and 25 ms late. The delay kept per
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

test("D299: the player's notes are scheduled ahead at their written times and lengths, at full level, and sound out untouched", () => {
  const lag = 0.16;
  const r = game(lag, true);
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  // Scheduled ahead, as the band is: well before the note's time on the audio clock.
  r.until(at - 0.2);
  const rec = scheduled(r, i);
  assert.ok(rec, "the note is on the schedule");
  assert.ok(rec.asked < at, "asked for ahead of its time");
  assert.equal(rec.at, at, "at its written time on the audio clock (heard on time through the delay)");
  assert.ok(rec.p.lead, "as the player's own");
  assert.equal(rec.p.into, undefined, "no gate");
  assert.ok(Math.abs(rec.dur - (r.g.timeAt(n.on + n.dur) - at)) < 1e-6 || rec.dur < r.g.timeAt(n.on + n.dur) - at, "its written length (or up to its first rider)");
  assert.equal(r.g.armedAt(0, n.on)?.state, "sounding");
  // No touch: nothing fades or stops it; the window closes: a miss, as without the mode.
  r.until(at + lag + 0.8);
  assert.equal(rec.stopAt, undefined, "never cut");
  assert.equal(n.state, "miss");
});

test("D299: a touch in the window scores the note and sounds nothing; letting go does not cut it", () => {
  const lag = 0.16;
  const r = game(lag, true);
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  // The touch heard on time: lag after the note's audio time; 40 ms late of that, to be sure.
  r.until(at + lag + 0.04);
  const before = r.notes.length;
  r.g.keyDown(1, { velocity: 0.9 }, performance.now());
  assert.equal(n.state, "hit");
  assert.equal(r.g.armedAt(0, n.on)?.state, "hit");
  assert.equal(r.notes.length, before, "no sound made by the touch");
  r.until(at + lag + 0.1);
  r.g.keyUp(1, performance.now());
  const rec = scheduled(r, i)!;
  assert.equal(rec.stopAt, undefined, "let go: the note sounds on to its written end");
  // D218: the release judged from the touch (as heard), not from the sound.
  assert.ok(n.off !== undefined && Math.abs(r.g.timeAt(n.off) - (r.clock.t - lag)) < 0.01, `off ${n.off}`);
  // D299: how late it was, as heard, kept for the retune.
  assert.equal(r.g.btOffsets.length, 1);
  // The touch time is read from the real clock (performance.now), so a busy test machine adds a few ms.
  assert.ok(Math.abs(r.g.btOffsets[0] - 40) < 10, `${r.g.btOffsets[0]}`);
});

test("D299: a wrong key sounds nothing and stops nothing: the note scheduled sounds as written", () => {
  const lag = 0.16;
  const r = game(lag, true, "piano");
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  r.until(at + lag);
  const before = r.notes.length;
  r.g.keyDown(1, { midi: n.midi + 1, velocity: 0.5 }, performance.now());
  assert.equal(n.state, "miss");
  assert.equal(r.notes.length, before, "the wrong key not heard (it would be a delay late)");
  assert.equal(scheduled(r, i)?.stopAt, undefined);
  assert.equal(r.g.armedAt(0, n.on)?.state, "sounding");
});

test("D299: the level never follows the touch; every scheduled note at the same expression", () => {
  const r = game(0.2, true);
  r.until(r.g.timeAt(r.g.notes[firstHead(r.g)].on) + 0.25);
  r.g.keyDown(1, { velocity: 0.1 }, performance.now());
  r.until(r.g.timeAt(r.g.end) + 1);
  const mine = r.notes.filter((x) => x.p.lead && x.p.level !== undefined);
  assert.ok(mine.length > 10);
  const lv = new Set(mine.map((x) => x.p.level!.toFixed(4)));
  // The subject's shape may differ by note; the touches never: soft and missed notes alike.
  const missed = r.g.notes.filter((n) => n.state === "miss").length;
  assert.ok(missed > 5, "most notes missed");
  assert.ok(lv.size <= 3, `levels ${[...lv]}`);
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
  r.g.keyDown(1, { velocity: 0.5 }, performance.now());
  assert.equal(r.g.notes[i].state, "hit");
  assert.ok(r.notes.some((x) => x.midi === r.g.notes[i].midi && x.at === r.clock.t && x.asked === r.clock.t), "struck at the touch");
  r.g.keyUp(1, performance.now());
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
  assert.equal(btOn("auto", null, 0.15), true);
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
