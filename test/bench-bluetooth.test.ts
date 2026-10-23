/**
 * D223: headphones. BLUETOOTH MODE sounds the player's notes ahead at their written times (armed,
 * soft, through a gate), confirms them by a right touch in the window, fades them when no touch comes
 * and when a touch is wrong; the late side 20 ms wider. The delay kept per listening setup; AUTO's
 * threshold; the quick calibration; the screen's delay drawn ahead; the default path untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { ARM_LEVEL, ARM_WAIT_MS, BT_LATE_MS, ProtoGame } from "../src/bench/proto-game.ts";
import { protoById, type ProtoId } from "../src/bench/protos.ts";
import { BT_AUTO_S, btOn, lagFor, OutputWatch, quickLag, setupKey, verdictOf, withLag } from "../src/touch/headphones.ts";

const C_MINOR = fugueById("wtc1f02");

interface NoteRec {
  midi: number;
  at: number;
  dur: number;
  p: Play;
  stopAt?: number;
}
interface GateRec {
  level: number;
  node: object;
  state: "armed" | "confirmed" | "faded";
  closed: boolean;
}

/** A chip that records its notes and gates; the clock as heard `lag` behind the audio clock. */
function fakeChip(clock: { t: number }, lag: number, gates = true) {
  const notes: NoteRec[] = [];
  const gs: GateRec[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t - lag,
    visual: 0,
    note: (midi: number, at: number, dur: number, _v: unknown, p: Play = {}) => {
      const rec: NoteRec = { midi, at, dur, p };
      notes.push(rec);
      return { stop: (w?: number) => void (rec.stopAt ??= w ?? clock.t), bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} };
    },
    swoosh: () => {},
    tick: () => {},
    ...(gates
      ? {
          gate: (level: number) => {
            const g: GateRec = { level, node: {}, state: "armed", closed: false };
            gs.push(g);
            return { node: g.node, confirm: () => void (g.state = "confirmed"), fade: () => void (g.state = "faded"), close: () => void (g.closed = true) };
          },
        }
      : {}),
  };
  return { chip: chip as unknown as Chip, notes, gates: gs };
}

function game(lag: number, bt: boolean, proto: ProtoId = "keys") {
  const clock = { t: 0 };
  const fc = fakeChip(clock, lag, bt);
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
/** The note sounded ahead for note i: through a gate, at its written time. */
function armedFor(r: ReturnType<typeof game>, i: number) {
  const n = r.g.notes[i];
  const rec = r.notes.find((x) => x.p.into && x.midi === n.midi && Math.abs(x.at - r.g.timeAt(n.on)) < 1e-9);
  const gate = rec && r.gates.find((x) => x.node === rec.p.into);
  return { rec, gate };
}

test("D223: armed notes are sounded at their written times (soft, through a gate) and fade when untouched", () => {
  const lag = 0.16;
  const r = game(lag, true);
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  // Scheduled ahead, as the band is: well before the note's time on the audio clock.
  r.until(at - 0.2);
  const { rec, gate } = armedFor(r, i);
  assert.ok(rec, "the note is sounded ahead");
  assert.equal(rec.at, at, "at its written time on the audio clock (heard on time through the delay)");
  assert.ok(rec.p.lead, "as the player's own");
  assert.equal(gate?.level, ARM_LEVEL);
  assert.equal(gate?.state, "armed");
  // No touch: still armed through the wait (as heard), faded just after it.
  r.until(at + lag + (ARM_WAIT_MS - 20) / 1000);
  assert.equal(gate?.state, "armed");
  r.until(at + lag + (ARM_WAIT_MS + 20) / 1000);
  assert.equal(gate?.state, "faded");
  assert.ok(rec.stopAt !== undefined && rec.stopAt <= r.clock.t + 0.07, "stopped fast");
  // The window closes: a miss, as without the mode; the gate closed once its sound is done.
  r.until(at + lag + 0.8);
  assert.equal(n.state, "miss");
  assert.ok(gate?.closed);
});

test("D223: a touch in the window confirms the armed note (no second note), held while the touch lasts", () => {
  const lag = 0.16;
  const r = game(lag, true);
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  // The touch heard on time: lag after the note's audio time; 40 ms late of that, to be sure.
  r.until(at + lag + 0.04);
  const before = r.notes.length;
  r.g.keyDown(1, { velocity: 0.5 }, performance.now());
  const { rec, gate } = armedFor(r, i);
  assert.equal(gate?.state, "confirmed", "raised by the touch");
  assert.equal(n.state, "hit");
  assert.equal(r.notes.slice(before).filter((x) => x.midi === n.midi && !x.p.into).length, 0, "not struck again late");
  const len = r.g.timeAt(n.on + n.dur) - at;
  assert.ok(len > 0.15, "a note long enough to hold");
  r.until(at + lag + Math.min(0.3, 0.8 * len));
  assert.equal(gate?.state, "confirmed", "not faded once confirmed");
  assert.equal(rec?.stopAt, undefined, "sounding while held");
  r.g.keyUp(1, performance.now());
  assert.equal(rec?.stopAt, r.clock.t, "let go: stopped");
  // D218: the release judged from the touch (as heard), not from the sound.
  assert.ok(n.off !== undefined && Math.abs(r.g.timeAt(n.off) - (r.clock.t - lag)) < 1e-3, `off ${n.off}`);
});

test("D223: a wrong key never confirms the armed note: it fades, the wrong one sounds", () => {
  const lag = 0.16;
  const r = game(lag, true, "piano");
  const i = firstHead(r.g);
  const n = r.g.notes[i];
  const at = r.g.timeAt(n.on);
  r.until(at + lag);
  r.g.keyDown(1, { midi: n.midi + 1, velocity: 0.5 }, performance.now());
  const { gate } = armedFor(r, i);
  assert.equal(gate?.state, "faded");
  assert.equal(n.state, "miss");
  assert.ok(r.notes.some((x) => x.midi === n.midi + 1 && !x.p.into && x.at === r.clock.t), "the wrong key heard");
});

test("D223: BLUETOOTH MODE's window is 20 ms wider on its late side; off, nothing is armed (the default path)", () => {
  const on = game(0.16, true).g;
  const off = game(0, false).g;
  assert.ok(Math.abs(on.opt.late - off.opt.late - (BT_LATE_MS / 1000) * off.tps) < 1e-9);
  assert.equal(on.opt.early, off.opt.early);
  // Off (no gate on this chip: calling one would throw): the touch strikes its note at once.
  const r = game(0, false);
  const i = firstHead(r.g);
  const at = r.g.timeAt(r.g.notes[i].on);
  r.until(at);
  r.g.keyDown(1, { velocity: 0.5 }, performance.now());
  assert.equal(r.g.notes[i].state, "hit");
  assert.ok(r.notes.some((x) => x.midi === r.g.notes[i].midi && x.at === r.clock.t && !x.p.into));
  assert.equal(r.g.viewNow, r.g.now, "no screen delay: drawn as heard");
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
