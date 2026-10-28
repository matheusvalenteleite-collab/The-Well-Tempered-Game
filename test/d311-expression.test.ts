/**
 * D311, EXPRESSION UNDER THE THUMBS: where a thumb lands across its bar shapes the attack, a sideways move
 * while it holds the sustain, one design per instrument (touch-expr.ts; chip.ts Play.touch, Sounding.shape).
 * On the fake audio graph: each family's mapping at the extremes (levels, filters, the stop, the vowel, the
 * pulse width, the FM index, the vibrato, the wah, the tremolo), the smoothing, the band untouched; in the
 * game: the verdict changes nothing, nor the score, BLUETOOTH MODE's notes and the keys.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play, type Sounding } from "../src/touch/chip.ts";
import { PATCHES, setPreset, PRESETS } from "../src/touch/sound.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { barDynamic, BAR, protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import {
  BLOOM_STILL,
  ECHO_GAIN,
  holdValue,
  landing,
  LUTE_FROM,
  MESSA_DB,
  PIANO_DB,
  PIANO_SOFT_NET_DB,
  pulseWidth,
  STRONG_SIDE,
  strengthOf,
  TOUCH_KINDS,
  TOUCH_TAU,
  VIB_CENTS,
  WAH_DB,
} from "../src/touch/touch-expr.ts";

const ctxOf = installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const db = (x: number) => 20 * Math.log10(x);
const DOWN = 1;

/** A note's level at t: over its sources, the product of the gains on the way to the output (filters pass). */
function level(made: FakeNode[], bus: unknown, t: number): number {
  const path = (n: FakeNode, depth: number): number => {
    if (n === bus) return 1;
    if (depth > 30) return 0;
    let best = 0;
    for (const to of n.targets) {
      if (!(to instanceof FakeNode)) continue;
      const g = to.kind === "gain" ? Math.abs((to.gain as FakeParam).valueAt(t)) : 1;
      if (g > 0) best = Math.max(best, g * path(to, depth + 1));
    }
    return best;
  };
  let best = 0;
  // The loudest source (the note's own; an LFO's path through a depth gain into a detune does not reach the output).
  for (const n of made) if (n instanceof FakeSource && n.kind !== "constant" && n.startAt !== null && n.startAt <= t && t < n.stopAt) best = Math.max(best, path(n, 0));
  return best;
}

interface Struck {
  sd: Sounding;
  made: FakeNode[];
  ctx: FakeAudioContext;
  waves: string[];
  peak: number;
  filters: FakeNode[];
}

/** The player's note struck (HOLD_MAX) on a preset's voice, with a touch; its nodes, its peak level over the first 0.4 s. */
async function strike(presetId: string, play: Play, voice = 0, count = 3, midi = 64): Promise<Struck> {
  setPreset(presetId);
  const chip = new Chip();
  const waves: string[] = [];
  const c = chip as unknown as { wave: (t: string) => unknown; osc: (w: string) => unknown };
  const wave0 = c.wave.bind(chip);
  const osc0 = c.osc.bind(chip);
  c.wave = (t: string) => (waves.push(t), wave0(t));
  c.osc = (w: string) => (waves.push(w), osc0(w));
  await chip.prepare([midi, midi - 12, midi + 12], [midi]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(voice, count, true));
  waves.length = 0;
  const before = new Set(ctx.nodes);
  const sd = chip.note(midi, DOWN, 8, voicing(voice, count, true), { lead: true, legato: false, ...play });
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  let peak = 0;
  for (let t = DOWN; t < DOWN + 0.4; t += 0.002) peak = Math.max(peak, level(made, ctx.destination, t));
  return { sd, made, ctx, waves, peak, filters: made.filter((n) => n.kind === "filter") };
}
const lowpasses = (s: Struck) => s.filters.filter((f) => (f as unknown as { type: string }).type === "lowpass").map((f) => (f.frequency as FakeParam).value);
const ofType = (s: Struck, type: string) => s.filters.filter((f) => (f as unknown as { type: string }).type === type);

test("D311: every preset the players choose has a family (the band's level never follows: no family moves another voice)", () => {
  for (const p of PRESETS) assert.ok(TOUCH_KINDS[p.id], p.id);
});

test("D311: the landing's numbers at the extremes, the middle the sound as it was", () => {
  // PIANO: ±4 dB, the softer recording under the middle.
  const lo = landing("piano", 0, 64, PATCHES.pianoSampled);
  const mid = landing("piano", 0.5, 64, PATCHES.pianoSampled);
  const hi = landing("piano", 1, 64, PATCHES.pianoSampled);
  assert.equal(lo.layer, "soft");
  assert.equal(mid.layer, "firm");
  assert.equal(hi.layer, "firm");
  // Net of the softer recording (about -2 dB at the same level): -4, 0, +4.
  assert.ok(Math.abs(db(lo.level!) + PIANO_SOFT_NET_DB - -PIANO_DB) < 1e-9);
  assert.ok(Math.abs(db(mid.level!)) < 1e-9);
  assert.ok(Math.abs(db(hi.level!) - PIANO_DB) < 1e-9);
  for (let x = 0; x <= 1; x += 0.05) {
    const l = landing("piano", x, 64, PATCHES.pianoSampled);
    const net = db(l.level!) + (l.layer === "soft" ? PIANO_SOFT_NET_DB : 0);
    assert.ok(net >= -PIANO_DB - 1e-9 && net <= PIANO_DB + 1e-9, `piano ${x}: ${net.toFixed(2)} dB`);
  }
  // HARPSICHORD: no loudness; the lute only at the outer edge (D315: a place, whichever side is strong;
  // landing takes strength, strengthOf the place's).
  assert.deepEqual(landing("harpsichord", strengthOf(0.6), 64, PATCHES.harpsiSampled), {});
  assert.deepEqual(landing("harpsichord", strengthOf(0), 64, PATCHES.harpsiSampled), {});
  const lute = landing("harpsichord", strengthOf(1), 64, PATCHES.harpsiSampled);
  assert.ok(lute.lute && lute.level === undefined && Math.round(lute.lp!) === 1200);
  assert.equal(Math.round(landing("harpsichord", strengthOf(LUTE_FROM), 64, PATCHES.harpsiSampled).lp!), 2000);
  // D315: with the strong side by the box, the lute is on the soft side.
  if (STRONG_SIDE === "inner") assert.ok(landing("harpsichord", 0, 64, PATCHES.harpsiSampled).lute && !landing("harpsichord", 1, 64, PATCHES.harpsiSampled).lute);
  // PIPE ORGAN: the echo manual toward the box.
  assert.equal(landing("organ", 0.1, 64, PATCHES.orgFlute).level, ECHO_GAIN);
  assert.deepEqual(landing("organ", 0.5, 64, PATCHES.orgFlute), {});
  // CHIPS: 12.5 / 25 / 50 %; the SID any width between.
  assert.deepEqual([0, 0.5, 1].map((x) => pulseWidth(x)), [0.125, 0.25, 0.5]);
  assert.deepEqual([0, 0.5, 1].map((x) => pulseWidth(x, true)), [0.125, 0.25, 0.5]);
  assert.ok(Math.abs(pulseWidth(0.25, true) - 0.125 * Math.SQRT2) < 1e-9);
  assert.equal(landing("chip", 0.5, 64, PATCHES.fmLead).fmScale, 1);
  assert.equal(landing("bleeps", 1, 64, PATCHES.modVibe).strike, 2);
  assert.equal(landing("synth", 0.5, 64, PATCHES.solLead).bright, 0);
});

test("D311: PIANO (SAMPLED): soft to firm 8 dB edge to edge on the two recordings; the middle as before", async () => {
  const soft = await strike("pianoSampled", { touch: 0 });
  const mid = await strike("pianoSampled", { touch: 0.5 });
  const firm = await strike("pianoSampled", { touch: 1 });
  const plain = await strike("pianoSampled", {});
  // The fake's recordings are alike; the real layer 7 is 5 dB under layer 12 as recorded.
  const net = db(firm.peak) - (db(soft.peak) - 5);
  assert.ok(Math.abs(net - 2 * PIANO_DB) < 0.2, `range ${net.toFixed(2)} dB`);
  assert.ok(Math.abs(db(mid.peak) - db(plain.peak)) < 0.05, "the bar's middle: as the player's note was");
  // Holding: nothing (a struck note cannot swell).
  const events = (s: Struck) => s.made.reduce((n, x) => n + Object.values(x).filter((v) => v instanceof FakeParam).reduce((m, v) => m + (v as FakeParam).events.length, 0), 0);
  const n0 = events(firm);
  firm.ctx.advance(DOWN + 0.5);
  firm.sd.shape?.(1);
  firm.sd.shape?.(-1);
  assert.equal(events(firm), n0, "nothing moves");
});

test("D311: HARPSICHORD: the lute stop at the outer edge (a lowpass 2 to 1.2 kHz, a short ring), no loudness; the inner part plain", async () => {
  // D315: touch is strength; the places (inner 0.2, the outer edge) through strengthOf, whichever side is strong.
  const plain = await strike("harpsichordSampled", { touch: strengthOf(0.2) });
  const lute = await strike("harpsichordSampled", { touch: strengthOf(1) });
  assert.ok(Math.abs(db(lute.peak) - db(plain.peak)) < 0.1, "no loudness of touch");
  assert.ok(lowpasses(lute).some((f) => Math.round(f) === 1200));
  assert.ok(!lowpasses(plain).some((f) => f < 5000), "the plain 8': no lowpass of the touch");
  const at = DOWN + 0.6;
  const ringLute = db(level(lute.made, lute.ctx.destination, at)) - db(lute.peak);
  const ringPlain = db(level(plain.made, plain.ctx.destination, at)) - db(plain.peak);
  assert.ok(ringLute < -15 && ringPlain > -3, `0.6 s on: lute ${ringLute.toFixed(1)} dB, plain ${ringPlain.toFixed(1)} dB`);
});

test("D311, D349: PIPE ORGAN: the echo manual toward the box (the second manual's soft flutes, quieter, veiled) for that note alone; steady wind held; none on the pedal", async () => {
  for (const voice of [0, 1]) {
    const main = await strike("chamberOrgan", { touch: 0.8 }, voice);
    const echo = await strike("chamberOrgan", { touch: 0.1 }, voice);
    // (The peak counts the pipe's speech: the flutes' chiff a little stronger than the Principal's.)
    const drop = db(echo.peak) - db(main.peak);
    assert.ok(drop <= db(ECHO_GAIN) + 0.5 && drop >= db(ECHO_GAIN) - 4, `voice ${voice}: ${drop.toFixed(2)} dB`);
    assert.ok(echo.waves.includes("stopGedackt") && !echo.waves.includes("stopPrincipal"), `the flutes: ${echo.waves}`);
    assert.ok(main.waves.includes("stopPrincipal") && !main.waves.includes("stopGedackt"));
    assert.ok(lowpasses(echo).some((f) => f <= 4000 && f >= 1200));
    echo.sd.shape?.(1);
    assert.equal(ofType(echo, "peaking").length, 0);
  }
  // The pedal (the bass of three): one pedalboard, no echo.
  const pedal = await strike("chamberOrgan", { touch: 0.8 }, 2);
  const soft = await strike("chamberOrgan", { touch: 0.1 }, 2);
  assert.ok(Math.abs(db(soft.peak) - db(pedal.peak)) < 0.1);
});

test("D311: VOCAL SYNTH: the vowel closed toward the box, open at the edge; a held swell of ±3 dB; a little vibrato blooms when held still", async () => {
  const bands = (s: Struck) => ofType(s, "bandpass").map((f) => (f.frequency as FakeParam).valueAt(DOWN + 0.5));
  const shut = await strike("vocalSynth", { touch: 0 });
  const mid = await strike("vocalSynth", { touch: 0.5 });
  const wide = await strike("vocalSynth", { touch: 1 });
  const [s1, s2] = bands(shut);
  const [m1, m2] = bands(mid);
  const [w1] = bands(wide);
  assert.ok(s1 < m1 * 0.75 && s2 < m2 * 0.8, `closed: F1 ${s1.toFixed(0)} F2 ${s2.toFixed(0)} against ${m1.toFixed(0)} ${m2.toFixed(0)}`);
  assert.ok(Math.abs(w1 / m1 - 1.12) < 0.02, `open: F1 ×${(w1 / m1).toFixed(3)}`);
  // The swell.
  const g = mid.made.filter((n) => n.kind === "gain");
  mid.ctx.advance(DOWN + 1);
  mid.sd.shape?.(1);
  const messa = g.find((n) => (n.gain as FakeParam).events.some((e) => e.type === "target" && Math.abs(e.v - 10 ** (MESSA_DB / 20)) < 1e-6));
  assert.ok(messa, "a swell of +3 dB");
  const ev = (messa!.gain as FakeParam).events.at(-1)!;
  assert.equal(ev.tau, TOUCH_TAU, "smoothed");
  // The bloom: no vibrato at first, a little after BLOOM_STILL; a move starts it over.
  const depth = g.find((n) => (n.gain as FakeParam).events.some((e) => e.type === "target" && e.t === DOWN + BLOOM_STILL));
  assert.ok(depth, "a vibrato blooming");
  const d = depth!.gain as FakeParam;
  assert.ok(d.valueAt(DOWN + 0.3) < 0.01 && d.valueAt(DOWN + 0.95) > 5, `bloom ${d.valueAt(DOWN + 0.3)} → ${d.valueAt(DOWN + 0.95)}`);
  assert.ok(d.valueAt(DOWN + 1.25) < 3, "moved at 1 s: straight again");
  assert.ok(d.valueAt(DOWN + 2.2) > 5, "still again: it blooms again");
});

test("D311: SOLO VOICES: closed (a lowpass to 3 kHz) toward the box, open (+3 dB of air) at the edge; the swell; no vibrato", async () => {
  const shut = await strike("soloVoices", { touch: 0 });
  const wide = await strike("soloVoices", { touch: 1 });
  const mid = await strike("soloVoices", { touch: 0.5 });
  assert.ok(lowpasses(shut).some((f) => Math.round(f) === 3000));
  const shelf = (s: Struck) => Math.max(0, ...ofType(s, "highshelf").map((f) => (f.gain as FakeParam).valueAt(DOWN + 0.3)));
  assert.ok(Math.abs(shelf(wide) - shelf(mid) - 3) < 0.01, `${shelf(wide)} vs ${shelf(mid)}`);
  mid.ctx.advance(DOWN + 0.5);
  mid.sd.shape?.(-1);
  const gains = mid.made.filter((n) => n.kind === "gain").map((n) => n.gain as FakeParam);
  assert.ok(gains.some((p) => p.events.some((e) => e.type === "target" && Math.abs(e.v - 10 ** (-MESSA_DB / 20)) < 1e-6)), "a fade of -3 dB");
  assert.ok(!mid.made.some((n) => n.kind === "oscillator"), "straight: no LFO");
});

test("D311: CLASSIC CHIP: 12.5, 25, 50 % by the landing; a held move deepens or takes away its vibrato", async () => {
  const thin = await strike("chip", { touch: 0 });
  const hollow = await strike("chip", { touch: 0.5 });
  const square = await strike("chip", { touch: 1 });
  assert.equal(thin.waves[0], "pulse12");
  assert.equal(hollow.waves[0], "pulse25");
  assert.equal(square.waves[0], "pulse50");
  hollow.ctx.advance(DOWN + 1);
  hollow.sd.shape?.(1);
  const deep = hollow.made.filter((n) => n.kind === "gain").find((n) => (n.gain as FakeParam).events.some((e) => e.type === "target" && Math.abs(e.v - (9 + VIB_CENTS)) < 1e-6));
  assert.ok(deep, "the vibrato 9 → 25 cents");
  hollow.sd.shape?.(-1);
  assert.equal((deep!.gain as FakeParam).events.at(-1)!.v, 0, "inward: none");
});

test("D311: GAME BOY, SID 64, MEGA FM: the pulse width (its loudness kept), the SID's width any between, the FM index", async () => {
  const gb0 = await strike("gameboy", { touch: 0 });
  const gb1 = await strike("gameboy", { touch: 1 });
  assert.equal(gb0.waves[0], "pulse12");
  assert.equal(gb1.waves[0], "pulse50");
  // The SID's lead: its width the delay of the sawtooth less itself.
  const width = async (x: number) => {
    const s = await strike("sid64", { touch: x });
    const dl = s.made.find((n) => n.kind === "delay")!;
    return (dl.delayTime as FakeParam).value * 329.63;
  };
  assert.ok(Math.abs((await width(0)) - 0.125) < 0.003 && Math.abs((await width(1)) - 0.5) < 0.005);
  const fmIndex = async (x: number) => {
    const s = await strike("megaFm", { touch: x });
    return Math.max(...s.made.filter((n) => n.kind === "gain").map((n) => (n.gain as FakeParam).events.find((e) => e.type === "set" && e.t === DOWN)?.v ?? 0));
  };
  const lo = await fmIndex(0);
  const hi = await fmIndex(1);
  assert.ok(Math.abs(Math.log2(hi / lo) - 1.4) < 0.05, `FM index ×${(hi / lo).toFixed(2)}`);
});

test("D311: SWITCHED-ON and TOMITA: the filter's brightness by the landing; a held move sweeps a wah (nothing at rest)", async () => {
  const cutoff = (s: Struck) => Math.min(...lowpasses(s).filter((f) => f > 0));
  const dark = await strike("analog", { touch: 0 });
  const bright = await strike("analog", { touch: 1 });
  const ratio = Math.log2(cutoff(bright) / cutoff(dark));
  assert.ok(Math.abs(ratio - 1.2 * 1.3) < 0.05, `the filter ${ratio.toFixed(2)} octaves edge to edge`);
  const t = await strike("tomita", { touch: 0.5 });
  const wah = ofType(t, "peaking");
  assert.equal(wah.length, 1);
  assert.equal((wah[0].gain as FakeParam).value, 0, "at rest: transparent");
  t.ctx.advance(DOWN + 0.5);
  t.sd.shape?.(1);
  assert.equal((wah[0].gain as FakeParam).events.at(-1)!.v, WAH_DB);
  assert.ok(Math.abs((wah[0].frequency as FakeParam).events.at(-1)!.v / ((wah[0].frequency as FakeParam).value) - 2 ** 1.2) < 1e-6, "swept up 1.2 octaves");
});

test("D311: BLEEPS AND BLOOPS: the mallet's hardness by the landing; held, the vibraphone's motor faster or slower", async () => {
  const idx = async (x: number) => {
    const s = await strike("modular", { touch: x });
    return Math.max(...s.made.filter((n) => n.kind === "gain").map((n) => (n.gain as FakeParam).events.find((e) => e.type === "set" && e.t === DOWN)?.v ?? 0));
  };
  assert.ok(Math.abs((await idx(1)) / (await idx(0)) - 4) < 0.05, "×0.5 to ×2 at the strike");
  const s = await strike("modular", { touch: 0.5 });
  const lfo = s.made.find((n) => n.kind === "oscillator" && Math.abs((n.frequency as FakeParam).value - 5.5) < 1e-9)!;
  s.ctx.advance(DOWN + 0.5);
  s.sd.shape?.(1);
  assert.ok(Math.abs((lfo.frequency as FakeParam).events.at(-1)!.v - 5.5 * 2 ** 1.2) < 1e-9);
});

test("D311: a note without a touch (the band's) is as before: no expression stage, no shape", async () => {
  for (const id of ["pianoSampled", "vocalSynth", "tomita", "chip"]) {
    const s = await strike(id, { lead: false });
    assert.equal(s.sd.shape, undefined, id);
    // (VOCAL SYNTH's own 3 kHz ring is a peak; no wah's.)
    assert.equal(ofType(s, "peaking").length, id === "vocalSynth" ? 1 : 0, id);
  }
  assert.equal(holdValue(0.25), 0.5);
  assert.equal(holdValue(-2), -1);
});

// ---- In the game ----

const RH = 9;
const ROWS: Rows = { yOf: (s) => 300 - s * RH, stepAt: (y) => Math.round((300 - y) / RH), rowH: RH, xOf: () => 400 };
const W = 844;
type Heard = { midi: number; touch?: number; level: number; shapes: number[] };
function fakeChip(clock: { t: number }, heard: Heard[]) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    visual: 0,
    smooth: false,
    note: (midi: number, _at: number, _d: number, _v: unknown, p: Play = {}) => {
      const h: Heard = { midi, touch: p.touch, level: p.level ?? 1, shapes: [] };
      heard.push(h);
      return { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape: (s: number) => h.shapes.push(s) };
    },
    swoosh() {},
    tick() {},
  } as unknown as Chip;
}
function run(xOf: (i: number, side: "left" | "right") => number, wrongEvery = 0, opts: Record<string, unknown> = {}) {
  const clock = { t: 0 };
  const heard: Heard[] = [];
  const f = fugueById("wtc1f02");
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: tempoOf("wtc1f02"), legato: false, until: f.length, wait: false, solo: false, fail: false, ...opts }, fakeChip(clock, heard));
  g.rows = ROWS;
  const notes = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  const lands: number[] = [];
  notes.forEach((n, i) => {
    const t0 = g.timeAt(n.on);
    while (clock.t < t0 - 0.02) (clock.t += 0.02), g.step();
    clock.t = t0;
    g.step();
    const side = i % 2 ? "right" : "left";
    const x = xOf(i, side);
    const c = { side, x, y: ROWS.yOf(n.step) + (wrongEvery && i % wrongEvery === wrongEvery - 1 ? 4 * RH : 0), w: W, h: 390 } as const;
    lands.push(barDynamic(x, W));
    g.down(i + 1, c, performance.now());
    // D315: 20 px toward the strong side (STRONG_SIDE): outward when it is the outer one, inward otherwise.
    const out = STRONG_SIDE === "outer" ? 20 : -20;
    g.move(i + 1, { ...c, x: side === "left" ? x - out : x + out }, performance.now());
    clock.t = t0 + Math.min(0.12, g.timeAt(n.on + n.dur) - t0);
    g.step();
    g.up(i + 1, performance.now());
  });
  while (clock.t < g.timeAt(g.end + 1)) (clock.t += 0.05), g.step();
  return { r: g.results(), heard, lands, g };
}
const bw = W * BAR;
const spread = (i: number, side: "left" | "right") => (side === "left" ? 4 + ((i * 37) % Math.floor(bw - 8)) : W - 4 - ((i * 53) % Math.floor(bw - 8)));

test("D311: the touch is where the thumb landed, right or wrong alike; a sideways move shapes the note it holds", () => {
  const { heard, lands, r } = run(spread, 5);
  const own = heard.filter((h) => h.touch !== undefined);
  assert.ok(own.length > 20);
  assert.ok(r.of > 0);
  // Each struck note's touch is one of the landings (rounded), wrong ones too (every fifth two rows the wrong way).
  const set = new Set(lands.map((x) => x.toFixed(4)));
  for (const h of own) assert.ok(set.has(h.touch!.toFixed(4)), `touch ${h.touch}`);
  // Toward the strong side by 20 px: a positive sustain value.
  assert.ok(own.some((h) => h.shapes.length && h.shapes.every((s) => s > 0)));
  // D293 kept: Play.level not the landing's.
  const levels = new Set(own.map((h) => h.level.toFixed(3)));
  const base = run(() => 40);
  assert.deepEqual([...levels].sort(), [...new Set(base.heard.filter((h) => h.touch !== undefined).map((h) => h.level.toFixed(3)))].sort());
});

test("D311: expression earns nothing: the same playing at the box's edge or the phone's scores the same", () => {
  const inner = run((_i, side) => (side === "left" ? bw - 3 : W - bw + 3));
  const outer = run((_i, side) => (side === "left" ? 3 : W - 3));
  assert.equal(inner.r.score, outer.r.score);
  assert.equal(inner.r.right, outer.r.right);
  // The touch is strength: the box's edge and the phone's at the two ends, as STRONG_SIDE puts them.
  const near = (h: Heard, s: number) => h.touch !== undefined && Math.abs(h.touch - s) < 0.05;
  assert.ok(inner.heard.some((h) => near(h, strengthOf(0))) && outer.heard.some((h) => near(h, strengthOf(1))));
});

test("D311: the dynamics lesson keeps its own loudness (no touch); elsewhere the band never follows the player", () => {
  const lesson = run(spread, 0, { coach: "dynamics" });
  assert.ok(lesson.heard.every((h) => h.touch === undefined), "the lesson: D179's dynamic, not D311's");
  const a = run((_i, side) => (side === "left" ? bw - 3 : W - bw + 3));
  const b = run((_i, side) => (side === "left" ? 3 : W - 3));
  const band = (x: Heard[]) => x.filter((h) => h.touch === undefined).map((h) => h.level.toFixed(4));
  assert.deepEqual(band(a.heard), band(b.heard), "the other voices' levels alike, however the player touches");
});

test("D311: BLUETOOTH MODE: the notes scheduled ahead take the voice's latest landing; the touch's sideways move shapes the note it scored", () => {
  const { heard, lands } = run((i, side) => (i < 4 ? (side === "left" ? 3 : W - 3) : side === "left" ? bw - 3 : W - bw + 3), 0, { bt: true });
  const own = heard.filter((h) => h.touch !== undefined);
  assert.ok(own.length > 10);
  // The first note, scheduled before any touch: the middle; later ones a landing before them.
  assert.equal(own[0].touch, 0.5);
  const set = new Set([0.5, ...lands].map((x) => x.toFixed(4)));
  for (const h of own) assert.ok(set.has(h.touch!.toFixed(4)));
  assert.ok(own.some((h) => h.shapes.length > 0), "a scored note answers the sideways move");
});

test("D311: the computer's keys strike at the bar's middle; a MIDI key's velocity is the piano's touch only", () => {
  const f = fugueById("wtc1f02");
  for (const [pid, want] of [["pianoSampled", 0.9], ["harpsichordSampled", 0.5]] as const) {
    setPreset(pid);
    for (const k of [{ velocity: 0.9, touch: 0.9 }, { velocity: 0.9 }]) {
      const clock = { t: 0 };
      const heard: Heard[] = [];
      const g = new ProtoGame(f, 0, 0, protoById("piano"), { bpm: 54, legato: false }, fakeChip(clock, heard));
      const n = g.notes[0];
      clock.t = 0.15 + (n.on - g.start) / g.tps;
      g.step();
      g.keyDown(1, { midi: n.midi, ...k }, performance.now());
      const t = heard.filter((h) => h.touch !== undefined).at(-1)?.touch;
      assert.equal(t, "touch" in k ? want : 0.5, `${pid} ${JSON.stringify(k)}`);
    }
  }
  setPreset("chip");
});
