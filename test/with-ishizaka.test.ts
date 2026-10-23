/**
 * D215, experiment E3, WITH ISHIZAKA: her timing (tick ↔ seconds, monotone, round trip), the game's
 * clock on it (a mid-piece start, the count-in at her tempo), her track started where the game is, the
 * fade (up with a perfect run, out at a slip and for two bars), and the game unchanged without her.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio, type FakeAudioContext, type FakeSource } from "./fake-audio.ts";
import { Chip } from "../src/touch/chip.ts";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { startTick } from "../src/touch/voice-mode.ts";
import { protoById } from "../src/bench/protos.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { FADE, HerFade, herClock, herKey, herLevel, herMap, othersLevel, secAt, tickAtSec } from "../src/bench/her-clock.ts";
import { Her } from "../src/bench/with-her.ts";
import { ritard } from "../src/touch/phrasing.ts";
import { TESTBENCH } from "../src/bench/cards.ts";
import { hz, setTuning, tuningNow } from "../src/touch/tuning.ts";

const ctxOf = installFakeAudio(0, false);
const BOOK1 = TESTBENCH.filter((id) => id.startsWith("wtc1"));

test("D215: her timing for the seven Book I fugues of the testbench: rising, every beat, round trip", () => {
  assert.equal(BOOK1.length, 7);
  for (const id of BOOK1) {
    const m = herMap(id);
    assert.ok(m, id);
    const f = fugueById(id);
    assert.equal(m.ticks.length, m.secs.length);
    for (let i = 1; i < m.ticks.length; i++) {
      assert.ok(m.ticks[i] > m.ticks[i - 1], `${id} ticks rise at ${i}`);
      assert.ok(m.secs[i] > m.secs[i - 1], `${id} seconds rise at ${i}`);
    }
    // At least one anchor a beat, from the first bar line to the end.
    const beat = beatOf(f).ticks;
    for (let i = 1; i < m.ticks.length; i++) assert.ok(m.ticks[i] - m.ticks[i - 1] <= beat, `${id}: a beat without an anchor at ${m.ticks[i]}`);
    assert.ok(m.ticks[0] <= (f.bars[0]?.on ?? 0) && m.ticks.at(-1)! >= f.length);
    // Her A: about 443, equal temperament.
    assert.ok(m.a > 438 && m.a < 448, `${id} A ${m.a}`);
    // The anchors themselves, and between and beyond them, there and back.
    m.ticks.forEach((t, i) => assert.ok(Math.abs(secAt(m, t) - m.secs[i]) < 1e-9));
    for (let k = 0; k <= 200; k++) {
      const t = -f.barTicks + (k / 200) * (f.length + 2 * f.barTicks);
      assert.ok(Math.abs(tickAtSec(m, secAt(m, t)) - t) < 1e-6, `${id} round trip at ${t}`);
      if (k) assert.ok(secAt(m, t) > secAt(m, t - (f.length + 2 * f.barTicks) / 200));
    }
    // Her tempo is a pianist's: within a third of the game's.
    const c = herClock(m, f, 0);
    assert.ok(c.bpm > 30 && c.bpm < 200, `${id} ${c.bpm}`);
  }
  assert.equal(herMap("wtc1f03"), null);
  assert.equal(herMap("wtc2f01"), null);
  assert.equal(herKey("wtc1f11"), "wtc1-11f");
});

test("D215: the clock on her time: monotone, there and back; a span lasts as she plays it; the count-in at her tempo", () => {
  const f = fugueById("wtc1f02");
  const m = herMap(f.id)!;
  for (const share of [0, 0.37, 0.8]) {
    const from = startTick(f, share);
    const c = herClock(m, f, from);
    let last = -Infinity;
    for (let t = from - 2 * f.barTicks; t < f.length + f.barTicks; t += 97) {
      const w = c.warp(t);
      assert.ok(w > last);
      last = w;
      assert.ok(Math.abs(c.unwarp(w) - t) < 1e-6, `share ${share} tick ${t}`);
    }
    const chip = new Chip();
    const g = new ProtoGame(f, [0], from, protoById("keys"), { bpm: 80, legato: false, clock: c }, chip);
    // The game's clock: from the passage's first tick on, her seconds exactly.
    for (const [a, b] of [[from, from + 1920], [from, from + 3 * f.barTicks], [from + 500, f.length - 10]]) assert.ok(Math.abs(g.timeAt(b) - g.timeAt(a) - (secAt(m, b) - secAt(m, a))) < 1e-9);
    // The count-in: the beats before the start as long as hers over the first bar played.
    const beat = beatOf(f).ticks;
    const lead = (secAt(m, from + f.barTicks) - secAt(m, from)) / f.barTicks;
    assert.ok(g.start < from);
    assert.ok(Math.abs(g.timeAt(from) - g.timeAt(from - beat) - lead * beat) < 1e-9);
    assert.ok(Math.abs(g.timeAt(g.start + beat) - g.timeAt(g.start) - lead * beat) < 1e-9);
    // The windows in ticks at her mean tempo.
    assert.ok(Math.abs(g.bpm - c.bpm) < 1e-9);
  }
});

/** The voice's notes struck on time (computer keys, TIMING), skipping those in `miss`; her frame after each step. */
function run(g: ProtoGame, ctx: FakeAudioContext, her: Her | null, buf: AudioBuffer | null, until: number, miss = new Set<number>(), seen: (g: ProtoGame, her: Her | null) => void = () => {}) {
  let i = 0;
  const notes = g.notes;
  for (let t = ctx.currentTime; ; t += 1 / 120) {
    ctx.advance(t);
    g.step();
    her?.frame(g, buf);
    while (i < notes.length && (notes[i].ride || (i > 0 && notes[i - 1].on === notes[i].on))) i++;
    if (i < notes.length && g.now >= notes[i].on) {
      if (!miss.has(i)) {
        g.keyDown(1, { code: "KeyA" }, performance.now());
        g.keyUp(1, performance.now());
      }
      i++;
    }
    seen(g, her);
    if (g.now >= until || i >= notes.length) break;
  }
}

function fakeBuffer(ctx: FakeAudioContext, seconds: number): AudioBuffer {
  return { duration: seconds, length: seconds * ctx.sampleRate, sampleRate: ctx.sampleRate, numberOfChannels: 2 } as unknown as AudioBuffer;
}

test("D215: her track starts at the passage's first tick, at her time for it (a mid-piece start too), or where the game is when decoded late", () => {
  const f = fugueById("wtc1f01");
  const m = herMap(f.id)!;
  for (const share of [0, 0.5]) {
    const from = startTick(f, share);
    const chip = new Chip();
    const ctx = ctxOf();
    const g = new ProtoGame(f, [1], from, protoById("keys"), { bpm: 80, legato: false, clock: herClock(m, f, from) }, chip);
    const her = new Her(chip, m);
    ctx.advance(ctx.currentTime + 0.01);
    g.step();
    her.frame(g, fakeBuffer(ctx, 300));
    assert.ok(her.startedAt);
    assert.ok(Math.abs(her.startedAt.when - g.timeAt(from)) < 1e-9);
    assert.ok(Math.abs(her.startedAt.offset - secAt(m, from)) < 1e-9);
    const src = [...ctx.sources].find((s) => s.kind === "buffer" && (s as FakeSource).startAt === her.startedAt!.when);
    assert.ok(src, "her source started on the audio clock");
    // Later on, her track's place is the game's tick's.
    const t = g.timeAt(from + 4 * f.barTicks);
    ctx.advance(t);
    assert.ok(Math.abs(her.position()! - secAt(m, from + 4 * f.barTicks)) < 1e-9);
    her.stop();
  }
  // Decoded late (two bars in): she starts a moment on, where the game will be then.
  const chip = new Chip();
  const ctx = ctxOf();
  const g = new ProtoGame(f, [1], 0, protoById("keys"), { bpm: 80, legato: false, clock: herClock(m, f, 0) }, chip);
  const her = new Her(chip, m);
  ctx.advance(g.timeAt(2 * f.barTicks));
  g.step();
  her.frame(g, fakeBuffer(ctx, 300));
  const s = her.startedAt!;
  assert.ok(s.when > ctx.currentTime);
  assert.ok(Math.abs(s.offset - secAt(m, g.tickAtTime(s.when))) < 1e-9);
  assert.ok(Math.abs(s.offset - secAt(m, 2 * f.barTicks) - (s.when - g.timeAt(2 * f.barTicks))) < 1e-6);
  her.stop();
});

test("D215: the fade: silent below a run of 8, up with a perfect run to its peak by 32, the others giving way; a slip: out at once, and two bars at least", () => {
  // The curve.
  assert.equal(herLevel(0, 1), 0);
  assert.equal(herLevel(FADE.from, 1), 0);
  assert.ok(herLevel(20, 1) > 0.3 && herLevel(20, 1) < 0.6);
  assert.equal(herLevel(FADE.full, 1), FADE.peak);
  assert.equal(herLevel(100, 1), FADE.peak);
  assert.ok(herLevel(32, 0.75) < herLevel(32, 1));
  for (let c = 1; c < 40; c++) assert.ok(herLevel(c, 1) >= herLevel(c - 1, 1));
  assert.equal(othersLevel(0), 1);
  assert.ok(Math.abs(othersLevel(FADE.peak) - FADE.othersMin) < 1e-9);

  // A game: a perfect run, then a note missed.
  const f = fugueById("wtc1f02");
  const m = herMap(f.id)!;
  const chip = new Chip();
  const ctx = ctxOf();
  const g = new ProtoGame(f, [1], 0, protoById("keys"), { bpm: 80, legato: false, easy: "timing", clock: herClock(m, f, 0) }, chip);
  const her = new Her(chip, m);
  const gainCalls: { v: number; tc: number }[] = [];
  const levels: { combo: number; level: number; now: number }[] = [];
  run(g, ctx, her, fakeBuffer(ctx, 400), 9 * f.barTicks, new Set([40]), (g, h) => {
    levels.push({ combo: g.combo, level: h!.fade.level, now: g.now });
    const gn = (h as unknown as { gain: { gain: { setTargetAtTime: unknown } } | null }).gain;
    if (gn && !(gn.gain as { spied?: boolean }).spied) {
      const p = gn.gain as unknown as { spied: boolean; setTargetAtTime: (v: number, t: number, tc: number) => unknown };
      p.spied = true;
      p.setTargetAtTime = (v, _t, tc) => (gainCalls.push({ v, tc }), p);
    }
  });
  const atCombo = (c: number) => levels.find((l) => l.combo === c)?.level ?? NaN;
  assert.equal(atCombo(5), 0);
  assert.ok(atCombo(20) > 0.2, `combo 20: ${atCombo(20)}`);
  assert.ok(atCombo(32) > 0.8, `combo 32: ${atCombo(32)}`);
  // Rising through the run.
  const before = levels.slice(0, levels.findIndex((l, i) => i > 0 && l.combo < levels[i - 1].combo));
  for (let i = 1; i < before.length; i++) assert.ok(before[i].level >= before[i - 1].level - 1e-12);
  // The slip: out at once (a drop on the short time constant), and held off two bars.
  const k = levels.findIndex((l, i) => i > 0 && l.combo < levels[i - 1].combo);
  assert.ok(k > 0, "a slip");
  assert.equal(levels[k].level, 0);
  assert.ok(gainCalls.some((c) => c.v === 0 && c.tc === FADE.dropTc));
  assert.ok(FADE.dropTc * 3 <= 0.15, "within 150 ms");
  const slipAt = levels[k].now;
  assert.ok(levels.filter((l) => l.now >= slipAt && l.now < slipAt + 2 * f.barTicks).every((l) => l.level === 0), "out for two bars");
  assert.ok(levels.some((l) => l.now > slipAt + 2 * f.barTicks), "the run went on past them");

  // The two bars' hold, alone: a run long enough comes back only after them.
  const fade = new HerFade();
  const bar = 7680;
  fade.update({ now: 0, combo: 40, slips: 0, hits: 40, barTicks: bar });
  assert.ok(fade.level > 0.8);
  fade.update({ now: 1000, combo: 0, slips: 1, hits: 40, barTicks: bar });
  assert.equal(fade.level, 0);
  fade.update({ now: 1000 + 2 * bar - 1, combo: 40, slips: 1, hits: 80, barTicks: bar });
  assert.equal(fade.level, 0, "not within two bars");
  fade.update({ now: 1000 + 2 * bar + 1, combo: 40, slips: 1, hits: 80, barTicks: bar });
  assert.ok(fade.level > 0.5, "back after two bars");
  her.stop();
});

test("D215: without her the game is as it was: the steady tempo and its final ritard; her tuning comes and goes", () => {
  const f = fugueById("wtc1f01");
  const chip = new Chip();
  const g = new ProtoGame(f, [0], 0, protoById("ladder"), { bpm: 80, legato: false }, chip);
  const rit = ritard(f.length, f.barTicks);
  const tps = (f.tpq * 80) / 60;
  assert.equal(g.clock, null);
  assert.equal(g.bpm, 80);
  for (const t of [0, 5000, f.length - f.barTicks, f.length - 100]) assert.ok(Math.abs(g.timeAt(t) - g.timeAt(0) - (rit.warp(t) - rit.warp(0)) / tps) < 1e-9);
  // The others' level is the chip's own, at 1, until she plays.
  assert.equal(chip.others.gain.value, 1);
  // Her pitch, then back.
  const was = tuningNow();
  setTuning("equal", herMap(f.id)!.a);
  assert.ok(Math.abs(hz(69) - herMap(f.id)!.a) < 1e-9);
  setTuning(was.id, was.a);
  assert.equal(hz(69), 440);
});
