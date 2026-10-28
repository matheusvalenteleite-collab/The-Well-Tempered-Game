/**
 * D323, THE LAB's BREATH (src/bench/lab/breath-dsp.ts): the envelope follower, the blow-ness measures
 * (noise against a tone, a voice-like buzz, a hum, the recorder's own sound), the gate's hysteresis, the
 * tongue, the speaker's leak taken off, calibration; breath-voice.ts's loudness and pitch curves; the
 * voice's notes for THE VOICE'S NOTES. Synthetic signals at 48 kHz, a seeded noise.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BREATH_DEFAULTS, BreathAnalyser, CAL_DEFAULT, Gate, NoiseMeter, Tongue, dbOf, fadeOf, follow, leakOf, noisinessOf, openDbOf, poleOf, pressureOf, solveCal, type BreathLook } from "../src/bench/lab/breath-dsp.ts";
import { WINDS, ampOf, riseOf, PITCH_RISE } from "../src/bench/lab/breath-voice.ts";
import { voiceNotes } from "../src/bench/lab/breath.ts";
import { fugueById } from "../src/touch/fugue.ts";

const SR = 48000;
function rng(seed = 7) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
}
/** Wind-like noise: white through a one-pole low-pass at `fc` (blowing's weight is low), scaled to RMS `rms`. */
function wind(n: number, rms: number, fc = 300, seed = 7): Float32Array {
  const r = rng(seed);
  const a = Math.exp((-2 * Math.PI * fc) / SR);
  let lp = 0;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = lp = a * lp + (1 - a) * r();
  let s = 0;
  for (const v of x) s += v * v;
  const k = rms / Math.sqrt(s / n);
  for (let i = 0; i < n; i++) x[i] *= k;
  return x;
}
const tone = (n: number, f: number, amp: number, harm: number[] = [1]) =>
  Float32Array.from({ length: n }, (_, i) => harm.reduce((s, a, k) => s + amp * a * Math.sin((2 * Math.PI * f * (k + 1) * i) / SR), 0));
/** A voice-like buzz: a sawtooth-ish 150 Hz with vibrato. */
const voice = (n: number, amp: number) =>
  Float32Array.from({ length: n }, (_, i) => {
    const t = i / SR;
    const ph = 150 * t + 0.5 * Math.sin(2 * Math.PI * 5.5 * t);
    let s = 0;
    for (let k = 1; k < 25; k++) s += Math.sin(2 * Math.PI * k * ph) / k;
    return amp * s;
  });
/** Multiply by a gain curve (dB) given at each sample's time (s). */
function shape(x: Float32Array, db: (t: number) => number): Float32Array {
  return x.map((v, i) => v * 10 ** (db(i / SR) / 20));
}
function run(x: Float32Array, a = new BreathAnalyser(SR), outMs = 0): BreathLook[] {
  const out: BreathLook[] = [];
  for (let i = 0; i < x.length; i += 256) out.push(...a.push(x.subarray(i, Math.min(x.length, i + 256)), outMs));
  return out;
}
const events = (looks: BreathLook[], kind: string) => looks.flatMap((l) => l.events.filter((e) => e.kind === kind).map(() => l.t));

test("the follower: rises in about its attack, falls in about its release (one-pole, Ocarina's leaky integrator)", () => {
  assert.ok(Math.abs(poleOf(10, 10) - Math.exp(-1)) < 1e-12);
  let up = 0;
  let steps = 0;
  while (up < 1 - Math.exp(-1)) (up = follow(up, 1, 1, 6, 60)), steps++;
  assert.ok(steps >= 5 && steps <= 7, `rise to 63% in ${steps} ms`);
  let down = 1;
  steps = 0;
  while (down > Math.exp(-1)) (down = follow(down, 0, 1, 6, 60)), steps++;
  assert.ok(steps >= 58 && steps <= 62, `fall to 37% in ${steps} ms`);
});

test("the envelope of a blow: within 3 dB 20 ms after it starts, 15 dB down 100 ms after it stops; the fade at once", () => {
  const n = SR;
  const x = shape(wind(n, 0.1), (t) => (t >= 0.3 && t < 0.7 ? 0 : -80));
  const looks = run(x);
  const at = (ms: number) => looks.find((l) => l.t >= ms)!;
  assert.ok(at(320).envDb > dbOf(0.01) - 3, `at 20 ms: ${at(320).envDb.toFixed(1)} dB`);
  assert.ok(at(800).envDb < dbOf(0.01) - 15, `100 ms after: ${at(800).envDb.toFixed(1)} dB`);
  assert.ok(at(320).fade === 1 && at(760).fade === 0, "the fade: full while blowing, none 60 ms after");
});

test("blow-ness: wind-like noise is noisy; a tone, a voice-like buzz, a hum and the recorder's own sound are not", () => {
  const m = new NoiseMeter(SR, 1024);
  const n = 1024;
  const noisy = (x: Float32Array) => m.measure(x).noisy;
  for (const fc of [80, 300, 2000]) assert.ok(noisy(wind(n, 0.2, fc)) >= 0.8, `wind at ${fc} Hz`);
  // Clipped wind (blowing straight into the mic): still noise.
  assert.ok(noisy(wind(n, 0.5, 80).map((v) => Math.max(-0.3, Math.min(0.3, v)))) >= 0.8, "clipped wind");
  assert.ok(noisy(tone(n, 440, 0.5)) < 0.1, "sine 440");
  assert.ok(noisy(tone(n, 262, 0.5)) < 0.1, "sine 262");
  assert.ok(noisy(voice(n, 0.2)) < 0.1, "voice-like buzz");
  assert.ok(noisy(tone(n, 120, 0.3, [1, 0.25, 0.11, 0.06])) < 0.1, "a hum");
  const recorder = tone(n, 587, 0.4, WINDS.recorder.harmonics);
  const r = rng(3);
  assert.ok(noisy(recorder.map((v) => v + 0.02 * r())) < 0.1, "the recorder voice with its breath noise (the speaker's leak)");
  // Blowing while the speaker leaks the instrument at the same RMS: still noise.
  const mix = wind(n, 0.2).map((v, i) => v + recorder[i] * 0.5);
  assert.ok(noisy(mix) >= 0.5, `blowing over the leak: ${noisy(mix).toFixed(2)}`);
  assert.equal(noisinessOf(0.5, 0.1), 1);
  assert.equal(noisinessOf(0.01, 0.95), 0);
});

test("the gate: opens above the threshold when noisy for its looks (two here), holds between the lines (hysteresis), closes after closeMs below", () => {
  const tune = { ...BREATH_DEFAULTS, openLooks: 2 };
  const g = new Gate(-40, tune);
  assert.equal(g.closeDb, -46);
  assert.equal(g.step(-30, 0.2, 0), null, "loud but a tone: shut");
  assert.equal(g.step(-30, 0.2, 10), null);
  assert.equal(g.step(-30, 1, 20), null, "one noisy look is not enough");
  assert.equal(g.step(-30, 1, 30), "on");
  assert.equal(g.step(-43, 1, 40), null, "between the lines: stays open");
  assert.equal(g.step(-45.9, 1, 100), null);
  assert.equal(g.step(-50, 1, 110), null, "under the close line: waits closeMs");
  assert.equal(g.step(-50, 1, 140), null);
  assert.equal(g.step(-50, 1, 160), "off");
  assert.equal(g.step(-43, 1, 170), null, "between the lines when shut: stays shut");
  assert.equal(g.step(-43, 1, 180), null);
  // The speaker's own sound holding the level up: not noisy any more, it closes.
  assert.equal(g.step(-30, 1, 200), null);
  assert.equal(g.step(-30, 1, 210), "on");
  assert.equal(g.step(-30, 0.1, 220), null);
  assert.equal(g.step(-30, 0.1, 280), "off");
});

test("the tongue: a dip of the fast envelope under the slow and back is one tongue; none without a dip, none too soon", () => {
  const t = new Tongue({ ...BREATH_DEFAULTS });
  t.onset(0);
  assert.equal(t.step(-20, -20, 100), null);
  assert.equal(t.step(-40, -22, 110), null, "dipping");
  const d = t.step(-21, -22, 130);
  assert.ok(d !== null && d >= 18, `a tongue, depth ${d}`);
  assert.equal(t.step(-40, -22, 150), null);
  assert.equal(t.step(-22, -22, 160), null, "30 ms after the last: too soon (tongueGapMs 60)");
  assert.equal(t.step(-40, -22, 300), null);
  assert.equal(t.step(-22, -22, 500), null, "back 200 ms after the dip: a stop, not a tongue (tongueWithinMs 140)");
});

/** A breath: 0.3 s silence, 1.5 s blowing with a tongue (a 30 ms stop, 25 dB down) at each of `tongues` (s), 0.4 s silence. */
function phrase(tongues: number[], stopMs = 30, stopDb = -25, seed = 7): Float32Array {
  const n = Math.round(2.2 * SR);
  return shape(wind(n, 0.08, 300, seed), (t) => {
    if (t < 0.3 || t >= 1.8) return -70;
    for (const at of tongues) if (t >= at && t < at + stopMs / 1000) return stopDb;
    return 0;
  });
}

test("a whole breath: BREATH on once, each tongue found, BREATH off once", () => {
  const looks = run(phrase([0.7, 1.0, 1.3]));
  assert.equal(events(looks, "on").length, 1);
  assert.equal(events(looks, "off").length, 1);
  const tg = events(looks, "tongue");
  assert.equal(tg.length, 3, `tongues at ${tg.map((t) => t.toFixed(0)).join(", ")} ms`);
  for (const [i, at] of [0.7, 1.0, 1.3].entries()) assert.ok(tg[i] > at * 1000 && tg[i] < at * 1000 + 70, `tongue ${i} at ${tg[i].toFixed(0)} ms (stop at ${at * 1000})`);
  const on = events(looks, "on")[0];
  assert.ok(on > 300 && on < 330, `on ${on.toFixed(0)} ms after a 300 ms start`);
  const off = events(looks, "off")[0];
  assert.ok(off > 1800 && off < 1900, `off ${off.toFixed(0)} ms after a 1800 ms end`);
  // Each tongue's stop heard: the fade falls during it.
  assert.ok(looks.some((l) => l.t > 700 && l.t < 740 && l.fade < 0.5), "the sound stops for the tongue");
  // Pressure while blowing (the default calibration: the envelope ≈ −22 dB).
  const mid = looks.find((l) => l.t > 500)!;
  assert.ok(mid.open && mid.pressure > 0.3 && mid.pressure <= 1, `pressure ${mid.pressure.toFixed(2)}`);
});

test("double tonguing at 8 notes a second (shallower 20 ms stops): every articulation found", () => {
  const at = Array.from({ length: 9 }, (_, k) => 0.5 + k * 0.125);
  const looks = run(phrase(at, 20, -15, 11));
  const tg = events(looks, "tongue");
  assert.equal(tg.length, at.length, `found ${tg.length} of ${at.length}`);
});

test("no false tongues: a steady blow, a crescendo and a diminuendo", () => {
  const n = Math.round(2 * SR);
  for (const [name, db] of [
    ["steady", () => 0],
    ["crescendo", (t: number) => -20 + 20 * Math.min(1, t / 1.6)],
    ["diminuendo", (t: number) => -20 * Math.min(1, t / 1.6)],
  ] as const) {
    const looks = run(shape(wind(n, 0.08, 300, 5), (t) => (t < 0.2 ? -70 : db(t))));
    assert.equal(events(looks, "tongue").length, 0, name);
    assert.equal(events(looks, "on").length, 1, `${name}: one onset`);
  }
});

test("speech-like sounds and humming as loud as a blow do not open the gate", () => {
  const n = SR;
  for (const [name, x] of [
    ["voice-like buzz", voice(n, 0.04)],
    ["hum", tone(n, 120, 0.1, [1, 0.25, 0.11, 0.06])],
    ["whistle", tone(n, 1500, 0.1)],
  ] as const) {
    const looks = run(x);
    assert.equal(events(looks, "on").length, 0, name);
    assert.ok(looks.at(-1)!.envDb > openDbOf(CAL_DEFAULT), `${name} is loud enough (${looks.at(-1)!.envDb.toFixed(0)} dB)`);
  }
  // A hum cut in and out abruptly over the room's (noisy) quiet: its edges do not open it either.
  const room = wind(2 * SR, 0.0003, 300, 9);
  const hum = tone(2 * SR, 150, 0.08, [1, 0.25, 0.11, 0.06]);
  const edged = room.map((v, i) => (i >= 0.5 * SR && i < 1.5 * SR ? hum[i] : v));
  assert.equal(events(run(edged), "on").length, 0, "a hum's abrupt edges");
});

test("the speaker's leak: the instrument heard by the mic is taken off; blowing still opens", () => {
  const n = SR;
  // The voice's output RMS 0.3 and the mic hearing it at 0.1 RMS (a factor 1/3): loud, and the speaker's own sound.
  const out = 0.3 * 0.3;
  const leakTone = tone(n, 587, 0.1 * Math.SQRT2, [1]);
  const withLeak = new BreathAnalyser(SR, { ...BREATH_DEFAULTS }, { ...CAL_DEFAULT, leak: 1 / 3 });
  assert.equal(events(run(leakTone, withLeak, out), "on").length, 0, "the leak alone stays shut");
  const blowing = wind(n, 0.08).map((v, i) => v + leakTone[i]);
  const a2 = new BreathAnalyser(SR, { ...BREATH_DEFAULTS }, { ...CAL_DEFAULT, leak: 1 / 3 });
  assert.equal(events(run(blowing, a2, out), "on").length, 1, "blowing over the leak opens");
  assert.ok(Math.abs(leakOf([0.01, 0.01], [0.09, 0.09]) - 1 / 3) < 1e-9);
});

test("calibration: the floor is breathing's 95th percentile, soft the loud half's median, strong the 90th percentile; problems said", () => {
  const rest = Array.from({ length: 100 }, (_, i) => -70 + (i % 10));
  const soft = [...Array(50).fill(-65), ...Array(50).fill(-35)];
  const strong = Array.from({ length: 100 }, (_, i) => -30 + i * 0.2);
  const { cal, problems } = solveCal(rest, soft, strong, 0.05);
  assert.equal(cal.floorDb, -61);
  assert.equal(cal.softDb, -35);
  assert.ok(Math.abs(cal.strongDb - -12.2) < 0.21);
  assert.equal(cal.leak, 0.05);
  assert.deepEqual(problems, []);
  assert.equal(openDbOf(cal), -48);
  assert.equal(pressureOf(-48, cal), 0);
  assert.equal(pressureOf(-12, cal), 1);
  const bad = solveCal(rest, Array(20).fill(-60), Array(20).fill(-59));
  assert.equal(bad.problems.length, 2);
  assert.ok(bad.cal.softDb >= bad.cal.floorDb + 6 && bad.cal.strongDb >= bad.cal.softDb + 4);
});

test("the voices: the recorder's narrow range and rising pitch, the traverso's wide range and steady pitch; silence without breath", () => {
  const r = WINDS.recorder;
  const tr = WINDS.traverso;
  assert.equal(ampOf(r, 1, false), 0);
  const range = (s: typeof r) => 20 * Math.log10(ampOf(s, 1, true) / ampOf(s, 0, true));
  assert.ok(range(r) <= 14 && range(tr) >= 24, `${range(r)} dB, ${range(tr)} dB`);
  assert.equal(riseOf(r, 0, true), -PITCH_RISE);
  assert.equal(riseOf(r, 1, true), PITCH_RISE);
  assert.equal(riseOf(r, 1, false), 0);
  assert.equal(riseOf(tr, 1, true), 0);
});

test("the fade: full while the fast envelope is near the slow one, none in a tongue's stop or at the close line", () => {
  assert.equal(fadeOf(-20, -20, -54, 6), 1);
  assert.equal(fadeOf(-23, -20, -54, 6), 1);
  assert.equal(fadeOf(-35, -20, -54, 6), 0);
  assert.equal(fadeOf(-54, -54, -54, 6), 0);
  assert.equal(fadeOf(-51, -51, -54, 6), 0.5);
});

test("cost: ten seconds of microphone analysed in well under a second", () => {
  const x = wind(10 * SR, 0.05);
  // D361: the analysis's own CPU time (this process's user + system, process.cpuUsage), not the wall
  // clock: what the work costs, not how long the machine (the suite's other files, a build) let it run.
  // A cold run, as before (about 200 ms here; the wall clock read 400 ms alone and over 1000 under load).
  const cpuMs = () => {
    const u = process.cpuUsage();
    return (u.user + u.system) / 1000;
  };
  const t0 = cpuMs();
  run(x);
  const ms = cpuMs() - t0;
  assert.ok(ms < 1000, `${ms.toFixed(0)} ms of CPU`);
});

test("THE VOICE'S NOTES: the passage's notes of the voice, in order", () => {
  const f = fugueById("wtc1f02");
  const all = voiceNotes(f, 1, 0, f.length);
  assert.equal(all.length, f.voices[1].length);
  const first = voiceNotes(f, 1, 0, f.barTicks * 2);
  assert.ok(first.length > 4 && first.length < all.length);
  assert.deepEqual(first.slice(0, 3), f.voices[1].slice(0, 3).map((n) => n[2]));
});
