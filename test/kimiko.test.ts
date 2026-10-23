/**
 * D216, KIMIKO (D215's WITH ISHIZAKA withdrawn): her timing (tick ↔ seconds, monotone, at the
 * anchors), KIMIKO's clock on it, no accompaniment but her track (started where her map puts the
 * passage), a perfect run all hits, the mono decode, and every other prototype back on the steady
 * tempo and its ritard (a clock offered to them is not taken).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio, type FakeAudioContext, type FakeSource } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById, PROTOS } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { herClock, herKey, herMap, secAt, tickAtSec } from "../src/bench/her-clock.ts";
import { Her, HER_GAIN, mono } from "../src/bench/with-her.ts";
import { ritard } from "../src/touch/phrasing.ts";
import { TESTBENCH } from "../src/bench/cards.ts";
import { LAB_DEFAULT } from "../src/touch/subject-fx.ts";
import { hz, setTuning, tuningNow } from "../src/touch/tuning.ts";

const ctxOf = installFakeAudio(0, false);
/** D221: she is timed in all 24 fugues of Book I. */
const BOOK1 = Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`);

test("D216, D221: her timing for the 24 Book I fugues: rising, every beat, round trip", () => {
  for (const id of TESTBENCH.filter((id) => id !== "bwv1080-14")) assert.ok(BOOK1.includes(id));
  for (const id of BOOK1) {
    const m = herMap(id);
    assert.ok(m, id);
    const f = fugueById(id);
    assert.equal(m.ticks.length, m.secs.length);
    for (let i = 1; i < m.ticks.length; i++) {
      assert.ok(m.ticks[i] > m.ticks[i - 1], `${id} ticks rise at ${i}`);
      assert.ok(m.secs[i] > m.secs[i - 1], `${id} seconds rise at ${i}`);
    }
    const beat = beatOf(f).ticks;
    for (let i = 1; i < m.ticks.length; i++) assert.ok(m.ticks[i] - m.ticks[i - 1] <= beat, `${id}: a beat without an anchor at ${m.ticks[i]}`);
    assert.ok(m.ticks[0] <= (f.bars[0]?.on ?? 0) && m.ticks.at(-1)! >= f.length);
    assert.ok(m.a > 438 && m.a < 448, `${id} A ${m.a}`);
    m.ticks.forEach((t, i) => assert.ok(Math.abs(secAt(m, t) - m.secs[i]) < 1e-9));
    for (let k = 0; k <= 200; k++) {
      const t = -f.barTicks + (k / 200) * (f.length + 2 * f.barTicks);
      assert.ok(Math.abs(tickAtSec(m, secAt(m, t)) - t) < 1e-6, `${id} round trip at ${t}`);
      if (k) assert.ok(secAt(m, t) > secAt(m, t - (f.length + 2 * f.barTicks) / 200));
    }
    const c = herClock(m, f, 0);
    assert.ok(c.bpm > 30 && c.bpm < 200, `${id} ${c.bpm}`);
  }
  assert.equal(herMap("wtc2f01"), null);
  assert.equal(herKey("wtc1f11"), "wtc1-11f");
});

/** A chip that only counts: the notes sounded, the band's beats, the clicks (and when). */
function countingChip(clock: { t: number }) {
  const log = { notes: 0, groove: 0, ticks: [] as { at: number; gain: number }[] };
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => (log.notes++, { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: (at: number, _accent: boolean, gain: number) => log.ticks.push({ at, gain }),
    groove: () => (log.groove++, true),
  } as unknown as Chip;
  return { chip, log };
}

test("D216: KIMIKO's clock maps ticks to her seconds, monotone, exactly at her anchors (a mid-piece start too); the count-in at her first bar's tempo", () => {
  for (const id of BOOK1) {
    const f = fugueById(id);
    const m = herMap(id)!;
    for (const share of [0, 0.37, 0.8]) {
      const from = startTick(f, share);
      const g = new ProtoGame(f, [0], from, protoById("kimiko"), { bpm: 80, legato: false, clock: herClock(m, f, from) }, countingChip({ t: 0 }).chip);
      assert.ok(g.clock);
      const t0 = g.timeAt(from);
      const s0 = secAt(m, from);
      // At every anchor from the start on: her seconds, to the nanosecond.
      for (let i = 0; i < m.ticks.length; i++) if (m.ticks[i] >= from) assert.ok(Math.abs(g.timeAt(m.ticks[i]) - t0 - (m.secs[i] - s0)) < 1e-9, `${id} anchor ${i}`);
      // Monotone, and back again.
      let last = -Infinity;
      for (let t = g.start; t < f.length + f.barTicks; t += 97) {
        const s = g.timeAt(t);
        assert.ok(s > last);
        last = s;
        assert.ok(Math.abs(g.tickAtTime(s) - t) < 1e-6, `${id} ${share} tick ${t}`);
      }
      // The count-in: each beat as long as hers over the first bar played.
      const beat = beatOf(f).ticks;
      const lead = (secAt(m, from + f.barTicks) - s0) / f.barTicks;
      assert.ok(g.start < from);
      assert.ok(Math.abs(g.timeAt(from) - g.timeAt(from - beat) - lead * beat) < 1e-9);
    }
  }
});

test("D216: KIMIKO schedules no accompaniment: no other voices, no band, no click past a quiet count-in", () => {
  const f = fugueById("wtc1f02");
  const m = herMap(f.id)!;
  const clock = { t: 0 };
  const { chip, log } = countingChip(clock);
  const g = new ProtoGame(f, [1], 0, protoById("kimiko"), { bpm: 80, legato: false, clock: herClock(m, f, 0) }, chip);
  assert.equal(g.others.length, 0);
  // Untouched to the end: nothing sounds but the count-in.
  for (; clock.t < g.timeAt(g.end) + 0.5; clock.t += 0.02) g.step();
  assert.equal(log.notes, 0, "no note scheduled");
  assert.equal(log.groove, 0, "no band");
  assert.ok(log.ticks.length > 0 && log.ticks.every((k) => k.at < g.timeAt(g.entry) - 1e-9), "clicks only before the first note");
  assert.ok(log.ticks.every((k) => k.gain <= 0.05), "a quiet count-in");
  // HIGHWAY, for comparison: the others are scheduled.
  const c2 = { t: 0 };
  const h = countingChip(c2);
  const hw = new ProtoGame(f, [1], 0, protoById("highway"), { bpm: 80, legato: false }, h.chip);
  for (; c2.t < 10; c2.t += 0.02) hw.step();
  assert.ok(hw.others.length > 0 && h.log.notes > 0);
});

test("D216: a perfect run in KIMIKO on I/2 (every voice; EXACT LANES): all hits", () => {
  const f = fugueById("wtc1f02");
  const m = herMap(f.id)!;
  const [W, H] = [400, 800];
  for (let v = 0; v < f.voices.length; v++) {
    const clock = { t: 0 };
    const g = new ProtoGame(f, [v], 0, protoById("kimiko"), { bpm: 80, legato: false, easy: "exact", fail: true, clock: herClock(m, f, 0) }, countingChip(clock).chip);
    const N = g.laneCount;
    assert.equal(N, 5);
    const runTo = (t: number) => {
      while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
      clock.t = Math.max(clock.t, t);
      g.step();
    };
    let id = 0;
    g.notes.forEach((n, i) => {
      if (n.ride || (i > 0 && g.notes[i - 1].on === n.on)) return;
      runTo(g.timeAt(n.on));
      id++;
      g.down(id, { side: id % 2 ? "left" : "right", x: ((g.lanes[i] + 0.5) * W) / N, y: H - 100, w: W, h: H }, performance.now());
      runTo(g.timeAt(n.on + n.dur) - 0.01);
      g.up(id, performance.now());
    });
    runTo(g.timeAt(g.end) + 0.1);
    const r = g.results();
    assert.equal(r.failedBar, null);
    assert.equal(r.right, r.of, `voice ${v}: ${r.right}/${r.of}`);
    assert.equal(r.wrong + r.missed, 0);
  }
});

test("D221: a perfect run in KIMIKO on every Book I fugue (one voice each; EXACT LANES): all hits on her time", () => {
  const [W, H] = [400, 800];
  BOOK1.forEach((id, n) => {
    const f = fugueById(id);
    const m = herMap(id)!;
    const v = n % f.voices.length;
    const clock = { t: 0 };
    const g = new ProtoGame(f, [v], 0, protoById("kimiko"), { bpm: 80, legato: false, easy: "exact", fail: true, clock: herClock(m, f, 0) }, countingChip(clock).chip);
    const runTo = (t: number) => {
      while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
      clock.t = Math.max(clock.t, t);
      g.step();
    };
    let k = 0;
    g.notes.forEach((x, i) => {
      if (x.ride || (i > 0 && g.notes[i - 1].on === x.on)) return;
      runTo(g.timeAt(x.on));
      k++;
      g.down(k, { side: k % 2 ? "left" : "right", x: ((g.lanes[i] + 0.5) * W) / g.laneCount, y: H - 100, w: W, h: H }, performance.now());
      // Let go at its end, or just before the next note where the voice overlaps itself (a held note under moving ones).
      const next = g.notes.find((y) => y.on > x.on && !y.ride);
      runTo(Math.max(g.timeAt(x.on) + 0.01, g.timeAt(Math.min(x.on + x.dur, next?.on ?? Infinity)) - 0.01));
      g.up(k, performance.now());
    });
    runTo(g.timeAt(g.end) + 0.1);
    const r = g.results();
    assert.equal(r.failedBar, null, id);
    assert.equal(r.right, r.of, `${id} voice ${v}: ${r.right}/${r.of}`);
    assert.equal(r.wrong + r.missed, 0, id);
  });
});

function fakeBuffer(ctx: FakeAudioContext, seconds: number): AudioBuffer {
  return { duration: seconds, length: seconds * ctx.sampleRate, sampleRate: ctx.sampleRate, numberOfChannels: 1 } as unknown as AudioBuffer;
}

test("D216: her track at full level from the count-in, where her map puts the passage's first tick (from the start, and mid-piece); faded out over a second on a lost run", () => {
  const f = fugueById("wtc1f01");
  const m = herMap(f.id)!;
  for (const share of [0, 0.5]) {
    const from = startTick(f, share);
    const chip = new Chip();
    const ctx = ctxOf();
    const g = new ProtoGame(f, [1], from, protoById("kimiko"), { bpm: 80, legato: false, clock: herClock(m, f, from) }, chip);
    const her = new Her(chip, m);
    her.begin(g, fakeBuffer(ctx, 300));
    const s = her.startedAt!;
    assert.ok(s.when >= ctx.currentTime);
    const src = [...ctx.sources].find((x) => x.kind === "buffer" && (x as FakeSource).startAt === s.when);
    assert.ok(src, "her source started on the audio clock");
    // At the passage's first tick she is at her time for it; a mid-piece start hears her lead-in.
    ctx.advance(g.timeAt(from));
    assert.ok(Math.abs(her.position()! - secAt(m, from)) < 1e-9);
    if (share > 0) assert.ok(Math.abs(s.when - g.timeAt(g.start)) < 1e-9 && s.offset > 0, "from the count-in");
    // Four bars on, still with the game.
    ctx.advance(g.timeAt(from + 4 * f.barTicks));
    assert.ok(Math.abs(her.position()! - secAt(m, from + 4 * f.barTicks)) < 1e-9);
    const gain = (her as unknown as { gain: { gain: { value: number } } }).gain;
    assert.equal(gain.gain.value, HER_GAIN);
    her.stop(1);
    assert.ok(Math.abs((src as FakeSource).stopAt - (ctx.currentTime + 1.05)) < 1e-9, "out over a second");
  }
});

test("D216: her track kept as one channel (the channels' mean)", () => {
  const ctx = ctxOf();
  const b = ctx.createBuffer(2, 4, 48000);
  b.getChannelData(0).set([1, 0, 0.5, -1]);
  b.getChannelData(1).set([0, 1, 0.5, 1]);
  const one = mono(ctx as unknown as BaseAudioContext, b as unknown as AudioBuffer);
  assert.equal(one.numberOfChannels, 1);
  assert.deepEqual([...one.getChannelData(0)], [0.5, 0.5, 0.5, 0]);
});

test("D216: every other prototype on the steady tempo and its final ritard: a clock offered is not taken; WITH ISHIZAKA gone from ⚙ LAB", () => {
  const f = fugueById("wtc1f01");
  const m = herMap(f.id)!;
  const rit = ritard(f.length, f.barTicks);
  const tps = (f.tpq * 80) / 60;
  for (const p of PROTOS.filter((p) => p.id !== "kimiko")) {
    const voices = p.id === "duo" ? [0, 1] : [1];
    const g = new ProtoGame(f, voices, 0, p, { bpm: 80, legato: false, clock: herClock(m, f, 0) }, countingChip({ t: 0 }).chip);
    assert.equal(g.clock, null, p.id);
    assert.equal(g.bpm, 80, p.id);
    for (const t of [0, 5000, f.length - f.barTicks, f.length - 100]) assert.ok(Math.abs(g.timeAt(t) - g.timeAt(0) - (rit.warp(t) - rit.warp(0)) / tps) < 1e-9, `${p.id} at ${t}`);
  }
  assert.ok(!("ishizaka" in LAB_DEFAULT));
  // Her pitch for KIMIKO's notes, then back.
  const was = tuningNow();
  setTuning("equal", m.a);
  assert.ok(Math.abs(hz(69) - m.a) < 1e-9);
  setTuning(was.id, was.a);
  assert.equal(hz(69), 440);
});
