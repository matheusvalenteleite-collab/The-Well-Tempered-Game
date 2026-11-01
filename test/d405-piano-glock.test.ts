/**
 * D405: the owner, on the piano: "What's that weird glockenspiel sound on piano that sounds sometimes stuck,
 * in C minor Book I (Fugue I/2)?" It was D213's subject effect for I/2, GLASS SPARK: a synthesized FM bell
 * an octave over the subject's eighths (to A6), struck over the recorded piano (the harpsichord's own highs
 * hide it; the piano's do not). On the recorded piano no synthesized layer sounds (ping, brass, shimmer);
 * the echo and the second choir (the piano itself) and the room stay. And two guards on the piano's
 * recordings found sound on the way (not the cause): no recording read more than SampledInstrument.maxShift
 * semitones off (a pitch past the compass an octave nearer), no damper slowed past ×1.8 (×1.3 from C6) nor
 * a damped string left sounding past RELEASE_MAX_S.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, DAMP_MUL_HIGH, DAMP_MUL_MAX, dampMulFor, RELEASE_MAX_S, voicing, type Play, type Voicing } from "../src/touch/chip.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { setPreset } from "../src/touch/sound.ts";
import { foldInto, nearestSample, sampledMidis, SAMPLED } from "../src/touch/sampled.ts";
import { GENERIC, playFx, setLab, SubjectCues, SYNTH_LAYERS, TAILORED, type SubjectFx } from "../src/touch/subject-fx.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { playReading } from "../src/touch/readings.ts";

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 7 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => 400 };
const sn = { voice: 1, on: 0, dur: 480, midi: 72, theme: 1, inverted: false, scale: 1, head: true, leap: true, long: true, weight: 1 } as const;

/** The voicings chip.note was asked for by an effect's layers on a voice of `preset`. */
function layerCalls(preset: string, fx: SubjectFx) {
  setPreset(preset);
  const vs: Voicing[] = [];
  const chip = { note: (_m: number, _a: number, _d: number, v: Voicing) => (vs.push(v), { stop() {}, bend() {} }) } as unknown as Chip;
  const v = voicing(1, 3);
  playFx(chip, fx, sn, 72, 0, 0.5, v);
  return { v, vs };
}

test("D405: the cause: I/2's glass spark (an FM bell an octave up) sounds over the harpsichord, never over the recorded piano", () => {
  const glass = TAILORED.wtc1f02[1];
  assert.equal(glass.layers[0].kind, "ping");
  assert.ok(layerCalls("harpsichordSampled", glass).vs.length > 0, "the harpsichord keeps it");
  assert.equal(layerCalls("pianoSampled", glass).vs.length, 0, "not on the piano");
});

test("D405: on the recorded piano no effect of any fugue sounds a synthesized patch; its echo and second choir are the piano's own", () => {
  const all: SubjectFx[] = [GENERIC, ...Object.values(TAILORED).flatMap((t) => [t[1], t[2], t[3], t.inverted, t.augmented].filter((x): x is SubjectFx => !!x))];
  let own = 0;
  for (const fx of all) {
    const { v, vs } = layerCalls("pianoSampled", fx);
    for (const x of vs) assert.equal(x.patch, v.patch, `${fx.name}: a layer on the piano's own patch`);
    own += vs.length;
    for (const l of fx.layers) if (!SYNTH_LAYERS.has(l.kind)) assert.ok(vs.length > 0, `${fx.name}: its ${l.kind} kept`);
  }
  assert.ok(own > 0, "I/10's echo and I/4's second choir still sound");
});

test("D405 regression, I/2 on the piano with BUSONI: every note the band and the player make is the piano's recording, none synthesized; on the harpsichord the spark stays", () => {
  setLab({});
  const f = fugueById("wtc1f02");
  const run = (preset: string) => {
    setPreset(preset);
    const clock = { t: 0 };
    const log: { midi: number; v: Voicing; p: Play }[] = [];
    const chip = {
      ctx: { get currentTime() { return clock.t; } },
      heard: () => clock.t,
      note: (midi: number, _at: number, _dur: number, v: Voicing, p: Play = {}) => (log.push({ midi, v, p }), { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
      swoosh: () => {},
      tick: () => {},
    } as unknown as Chip;
    const g = new ProtoGame(f, 2, 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false, solo: false, easy: "direction", fail: false, reading: playReading(f.id), until: 8 * f.barTicks }, chip);
    g.rows = ROWS;
    g.wall = () => clock.t * 1000;
    const t1 = g.timeAt(8 * f.barTicks);
    while (clock.t < t1) (clock.t += 0.02), g.step();
    return log;
  };
  const piano = run("pianoSampled");
  assert.ok(piano.length > 100, `${piano.length} notes`);
  assert.ok(new SubjectCues(f).notes.size > 20, "the subject's notes are there to be belled");
  const bad = piano.filter((x) => x.v.patch?.sample !== "piano");
  assert.equal(bad.length, 0, `synthesized on the piano: ${bad.slice(0, 5).map((x) => x.midi).join(", ")}`);
  assert.ok(Math.max(...piano.map((x) => x.midi)) <= 84, "nothing an octave over the soprano's C6");
  const harp = run("harpsichordSampled");
  assert.ok(harp.some((x) => x.v.patch?.sample !== "harpsichord"), "the harpsichord's glass spark");
  setPreset("pianoSampled");
});

test("D405: the piano's recordings never read more than maxShift semitones off: past the compass an octave nearer", () => {
  const ms = SAMPLED.piano.maxShift!;
  assert.ok(ms >= 2 && ms <= 4);
  const grand = sampledMidis("grand");
  for (let m = 12; m <= 120; m++) {
    const p = foldInto("grand", m, ms);
    assert.equal(((p - m) % 12 + 12) % 12, 0, `${m}: its pitch class`);
    assert.ok(Math.abs(p - nearestSample("grand", p)!) <= ms, `${m} played at ${p}: ${p - nearestSample("grand", p)!} semitones off`);
    if (m >= grand[0] - ms && m <= grand[grand.length - 1] + ms) assert.equal(p, m, `${m}: within the compass, as written`);
  }
  // Every pitch of the 48 fugues within reach as written (the fold a guard only).
  for (const f of FUGUES.filter((x) => /^wtc[12]f/.test(x.id))) for (const v of f.voices) for (const n of v) assert.equal(foldInto("grand", n[2], ms), n[2], `${f.id}: ${n[2]}`);
});

/** The rates the note's recordings are started at, and the note's sources' last stop. */
async function struck(midi: number, play: Play, dur = 0.3) {
  setPreset("pianoSampled");
  const chip = new Chip();
  await chip.prepare([midi, foldInto("grand", midi, SAMPLED.piano.maxShift!)], [midi]);
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  chip.note(midi, 1, dur, voicing(1, 3), play);
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  const srcs = made.filter((x): x is FakeSource => x instanceof FakeSource && x.kind === "buffer");
  const taus = made.filter((x) => x.kind === "gain").flatMap((x) => (x.gain as FakeParam).events.filter((e) => e.type === "target" && e.v === 0 && e.t >= 1 + dur - 0.02).map((e) => e.tau ?? 0));
  return { rates: srcs.map((s) => (s.playbackRate as FakeParam).value), stop: Math.max(...srcs.map((s) => s.stopCall)), end: 1 + dur, taus };
}

test("D405: a note above the top recording is never a glockenspiel: its recording read within maxShift", async () => {
  const lim = 2 ** (SAMPLED.piano.maxShift! / 12) * 1.01;
  for (const m of [96, 99, 102, 105, 108]) {
    const r = await struck(m, {});
    assert.ok(r.rates.length > 0, `${m}: a recording`);
    for (const x of r.rates) assert.ok(x <= lim && x >= 1 / lim, `${m}: rate ${x.toFixed(3)}`);
  }
});

test("D405: the dampers capped: a palette or a trill never slows them past ×1.8 (×1.3 from C6), no damped string sounds past RELEASE_MAX_S", async () => {
  assert.equal(DAMP_MUL_MAX, 1.8);
  assert.equal(dampMulFor(60, 5), DAMP_MUL_MAX);
  assert.equal(dampMulFor(86, 1.8), DAMP_MUL_HIGH);
  assert.equal(dampMulFor(60, 1.3), 1.3);
  assert.equal(dampMulFor(60, 0.8), 0.8);
  const dm = SAMPLED.piano.damper!;
  for (const m of [40, 60, 79, 86]) {
    const plain = await struck(m, {});
    const wild = await struck(m, { dampMul: 10 });
    const cap = m >= 84 ? DAMP_MUL_HIGH : DAMP_MUL_MAX;
    assert.ok(Math.max(...wild.taus) <= Math.max(...plain.taus) * cap * 1.0001, `${m}: ${Math.max(...wild.taus).toFixed(3)} against ${Math.max(...plain.taus).toFixed(3)}`);
    assert.ok(wild.stop - wild.end <= RELEASE_MAX_S + 0.03, `${m}: halted ${(wild.stop - wild.end).toFixed(2)} s after its release`);
  }
  assert.ok(dm.undamped > 84, "the top's undamped strings untouched");
});
