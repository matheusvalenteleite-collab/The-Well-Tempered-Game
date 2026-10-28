/**
 * D345: the owner's iPhone "jittering at a long concerto piece, by the end" (BWV 1043, SUPER 16-BIT's six
 * voices). What grew with the time played, and stays flat now over a 15-minute run:
 * - the sound's nodes were let go only on the browser's `ended` report (D210's Bag); where it comes late
 *   or never (D211, the phone), every note stayed wired and was pulled by the audio thread: 36,000 nodes
 *   by the end of BWV 1043 III on this fake context. Now let go by their own schedule too (Bag.sweep);
 * - the room's level asked again every beat (an automation event a beat, never let go where the room
 *   idles under a period preset);
 * - the frame's walks over the notes from the piece's first note (the box's painter, the next note, the
 *   rest after a held note): now from the first note that can still matter, with the same answers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio, FakeSource, type FakeAudioContext, type FakeParam } from "./fake-audio.ts";
import { Bag, Chip, SWEEP_GRACE_S, voicing } from "../src/touch/chip.ts";
import { CHORALES, fugueById, loadExtras, MORE_BACH, PIECES } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { restAfter } from "../src/bench/articulation.ts";
import { firstSounding } from "../src/touch/visible.ts";
import type { LaneNote } from "../src/touch/lanes.ts";

const ctxOf = installFakeAudio(5, true);
await loadExtras();

/** Every source's end report silenced (the failure D211 saw on the phone), for the length of `f`. */
function silenced<T>(f: () => T): T {
  const proto = FakeSource.prototype as unknown as { end: () => void };
  const real = proto.end;
  proto.end = function (this: { ended: boolean; ctx: FakeAudioContext }) {
    this.ended = true;
    this.ctx.sources.delete(this as unknown as FakeSource);
  };
  try {
    return f();
  } finally {
    proto.end = real;
  }
}

/** BWV 1043 III played `times` over on one chip (SUPER 16-BIT, the band at its tempo), as a long session. */
function concerto(times: number, chip: Chip, ctx: FakeAudioContext, each?: (g: ProtoGame) => void) {
  setPreset("super16");
  const f = fugueById("bwv1043-3");
  const fixed = ctx.nodes.size;
  const peak = { wired: 0, open: 0, voices: 0 };
  for (let k = 0; k < times; k++) {
    const g = new ProtoGame(f, [0], startTick(f, 0), protoById("ladder"), { bpm: 90, legato: false, fail: false }, chip);
    for (let t = ctx.currentTime; ; t += 1 / 60) {
      ctx.advance(t);
      const done = g.step();
      each?.(g);
      peak.wired = Math.max(peak.wired, ctx.nodes.size - fixed);
      peak.open = Math.max(peak.open, Bag.open(chip.ctx));
      peak.voices = Math.max(peak.voices, (chip as unknown as { voices: unknown[] }).voices.length);
      if (done) break;
    }
  }
  return { peak, minutes: ctx.currentTime / 60, left: ctx.nodes.size - fixed };
}

test("D345: with the end reports silenced, a 15-minute run of BWV 1043 III keeps the sound's graph flat", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  const r = silenced(() => concerto(3, chip, ctx));
  assert.ok(r.minutes > 15, `${r.minutes.toFixed(1)} minutes played`);
  // Before D345: every node ever made stayed wired (36,700 by the end of one run, 110,000 by the third).
  assert.ok(r.peak.wired < 1200, `at most ${r.peak.wired} nodes wired at once`);
  assert.ok(r.peak.open < 150, `at most ${r.peak.open} sounds not yet let go`);
  assert.ok(r.peak.voices <= 4 * chip.cap, `the cap's list ${r.peak.voices}`);
  // And once the music is over, everything goes.
  ctx.advance(ctx.currentTime + SWEEP_GRACE_S + 1);
  chip.sweep();
  assert.equal(Bag.open(chip.ctx), 0);
});

test("D345: where the browser reports each end, nothing changes: a whole run leaves nothing wired, the sweep never first", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  // Count the sounds the sweep would let go before their report: none (it waits past the schedule's end).
  let early = 0;
  const sweep = Bag.sweep;
  Bag.sweep = (c: BaseAudioContext) => {
    const before = Bag.open(c);
    sweep(c);
    early += before - Bag.open(c);
  };
  try {
    const r = concerto(1, chip, ctx);
    ctx.advance(ctx.currentTime + 10);
    assert.ok(r.peak.wired < 600, `at most ${r.peak.wired} nodes wired`);
    assert.equal(Bag.open(chip.ctx), 0, "every sound let go on its report");
    assert.equal(early, 0, `${early} sounds let go by the sweep before their end was reported`);
  } finally {
    Bag.sweep = sweep;
  }
});

test("D345: a note still held (no stop yet) is never let go by the sweep; stopped, it is, past its release", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  setPreset("super16");
  silenced(() => {
    const sd = chip.note(67, 0, 600, voicing(0, 6), { lead: true });
    const wired = ctx.nodes.size;
    for (let t = 0; t < 30; t += 0.25) {
      ctx.advance(t);
      chip.sweep();
    }
    assert.equal(ctx.nodes.size, wired, "held: all its nodes still wired");
    sd.stop(30);
    for (let t = 30; t < 30 + SWEEP_GRACE_S + 2; t += 0.25) {
      ctx.advance(t);
      chip.sweep();
    }
    assert.ok(ctx.nodes.size < wired, "stopped: let go");
  });
});

test("D345: the room's level is asked only when it changes (one automation event, not one a beat)", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  concerto(1, chip, ctx);
  const wet = (chip as unknown as { wet: { gain: FakeParam } }).wet.gain;
  assert.ok(wet.events.length <= 4, `${wet.events.length} events on the room's level (it was 462 over the piece)`);
});

test("D345: the next note and the rest after a held note answer as before, from the first note that can matter", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  let checked = 0;
  const oldNext = (g: ProtoGame, k: number) => {
    const notes = g.tracks[k].notes;
    return notes.findIndex((n, i) => n.state === "pending" && !n.ride && n.on >= g.now - g.opt.late && !(i > 0 && notes[i - 1].on === n.on));
  };
  concerto(1, chip, ctx, (g) => {
    if (Math.random() < 0.2) {
      assert.equal(g.next(0), oldNext(g, 0));
      checked++;
    }
  });
  assert.ok(checked > 1000);
  const oldRest = (notes: readonly LaneNote[], i: number) => {
    let end = -Infinity;
    for (let j = i; j >= 0 && notes[j].on === notes[i].on; j--) end = Math.max(end, notes[j].on + notes[j].dur);
    for (let j = i + 1; j < notes.length && notes[j].on === notes[i].on; j++) end = Math.max(end, notes[j].on + notes[j].dur);
    const next = notes.find((n) => n.on > notes[i].on);
    return next ? Math.max(0, next.on - end) : 0;
  };
  for (const id of ["bwv1043-3", "wtc1f01", "wtc1f04", "wtc2f09"]) {
    const f = fugueById(id);
    for (let v = 0; v < f.voices.length; v++) {
      const g = new ProtoGame(f, [v], startTick(f, v), protoById("ladder"), { bpm: 90, legato: false }, chip);
      const notes = g.tracks[0].notes;
      for (let i = 0; i < notes.length; i++) assert.equal(restAfter(notes, i), oldRest(notes, i), `${id} voice ${v} note ${i}`);
    }
  }
});

test("D345: every piece's notes are in time order (the walks from the first note that can matter rely on it)", () => {
  for (const f of [...PIECES, ...MORE_BACH, ...CHORALES])
    for (const [v, notes] of f.voices.entries())
      for (let i = 1; i < notes.length; i++) assert.ok(notes[i][0] >= notes[i - 1][0], `${f.id} voice ${v} note ${i}`);
});

test("D345: the box's painter starts from a note such that none before it can show", () => {
  const f = fugueById("bwv1043-3");
  const chip = new Chip();
  const g = new ProtoGame(f, [0], startTick(f, 0), protoById("ladder"), { bpm: 90, legato: false }, chip);
  for (const list of [g.others, g.notes] as { on: number; dur: number }[][]) {
    for (let k = 0; k < 400; k++) {
      const tick = Math.random() * f.length;
      const margin = Math.random() * f.barTicks * 4;
      const i = firstSounding(list, tick, margin);
      for (let j = 0; j < i; j++) assert.ok(list[j].on + list[j].dur < tick - margin, `note ${j} before ${i} still sounds`);
      // And it is near: the walk no longer grows with the time played.
      const walked = list.slice(i).filter((n) => n.on < tick).length;
      assert.ok(walked < list.length / 8, `${walked} of ${list.length} notes walked before the tick`);
    }
  }
});
