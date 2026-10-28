/**
 * D321: DRAG MEANINGS (drag.ts; proto-game.ts dragConnect/glideStep; lab/free.ts) and the SENSOR test's
 * pure functions (lab/sensor.ts). The game's default ("join") unchanged; "connect": a glide whose
 * length follows the drag (capped by the note), a keyboard's coulé or Schleifer on the right pitches,
 * the drag counted as joined for the legato credit with the chain kept and nothing earned; the tap's
 * peak, the separation of soft and hard, the posture, the calibration, the contact size.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { between, dragFamily, dragFill, fillNoteMs, glideAt, glideMs, glideTau, keyScale, passingNote, pitchAtRow, scaleOfKey, snappedRow, stepBelow, dragLine, GLIDE_MIN_MS } from "../src/bench/drag.ts";
import { MECH, MECH_DEFAULTS, resetMech, withMech } from "../src/bench/mechanics.ts";
import { hz, setTuning } from "../src/touch/tuning.ts";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { setPreset } from "../src/touch/sound.ts";
import { FreePlay, SLIDE_DWELL_MS } from "../src/bench/lab/free.ts";
import { auc, calibrate, median, posture, pressureKind, recentCalibration, separability, sizeOf, stats, strengthFrom, tapPeak, medianInterval, type MotionSample } from "../src/bench/lab/sensor.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import { describe as lines } from "../src/bench/lab/describe.ts";

const C_MAJOR = keyScale(0, false);

test("D321: the defaults: a drag joins (the game's D218), and every new parameter is the lab's alone", () => {
  assert.equal(MECH_DEFAULTS.dragMeaning, "join");
  assert.equal(MECH.dragMeaning, "join");
  assert.deepEqual([MECH_DEFAULTS.glideMaxShare, MECH_DEFAULTS.upThird, MECH_DEFAULTS.fillTiming, MECH_DEFAULTS.tapDelayMs, MECH_DEFAULTS.tapWindowMs], [0.5, "schleifer", "trill", 0, 30]);
  assert.equal(dragFamily("pianoSampled"), "fill");
  assert.equal(dragFamily("harpsichordSampled"), "fill");
  assert.equal(dragFamily("chamberOrgan"), "fill");
  for (const id of ["soloVoices", "vocalSynth", "analog", "tomita", "chip", "gameboy", "sid64", "megaFm", "tracker", "super16", "nocturne32", "modular"]) assert.equal(dragFamily(id), "glide", id);
});

test("D321: the glide: as long as the drag, capped by a share of the note; an exponential approach arriving on time", () => {
  resetMech();
  assert.equal(glideMs(380), 380);
  assert.equal(glideMs(380, 2000), 380);
  assert.equal(glideMs(380, 400), 200, "capped at half the note");
  assert.equal(glideMs(5), GLIDE_MIN_MS);
  assert.equal(glideMs(5000), 800);
  assert.equal(glideTau(300), 100);
  assert.equal(glideAt(60, 67, 0, 300), 60);
  assert.equal(glideAt(60, 67, 300, 300), 67);
  const mid = glideAt(60, 67, 100, 300);
  assert.ok(mid > 63.5 && mid < 67, `fast at first (one time constant: ${mid.toFixed(2)})`);
  let last = 60;
  for (let t = 0; t <= 300; t += 10) {
    const m = glideAt(60, 67, t, 300);
    assert.ok(m >= last - 1e-9);
    last = m;
  }
  MECH.glideMaxShare = 0.25;
  assert.equal(glideMs(380, 400), 100);
  resetMech();
});

test("D321: between rows the pitch moves continuously (no temperament jump halfway); each row in tune near its place", () => {
  setTuning("werckmeister", 415);
  let prev = Math.log2(hz(60));
  for (let k = 1; k <= 40; k++) {
    const l = Math.log2(hz(between(60, 62, k / 40)));
    assert.ok(l > prev && l - prev < 0.01, `step ${k}`);
    prev = l;
  }
  assert.ok(Math.abs(Math.log2(hz(between(60, 62, 0.5))) - (Math.log2(hz(60)) + Math.log2(hz(62))) / 2) < 1e-6);
  setTuning("equal", 440);
  const rows = [60, 62, 64, 65];
  assert.equal(pitchAtRow(rows, 1), 62);
  assert.equal(pitchAtRow(rows, 1.25), 62);
  assert.equal(pitchAtRow(rows, 1.75), 64);
  assert.ok(Math.abs(pitchAtRow(rows, 1.5) - 63) < 1e-6);
  assert.equal(pitchAtRow(rows, 9), 65);
  assert.equal(snappedRow(rows, 2.2), 2);
  assert.equal(snappedRow(rows, 1.5), null);
});

test("D321: a keyboard's fill: the coulé's passing note, the Schleifer from a third below, a step plain", () => {
  resetMech();
  assert.deepEqual(dragFill(64, 60, C_MAJOR), { kind: "coule", notes: [62] }, "E down to C: passing D");
  assert.deepEqual(dragFill(67, 64, C_MAJOR), { kind: "coule", notes: [65] }, "G down to E: passing F");
  assert.deepEqual(dragFill(60, 64, C_MAJOR), { kind: "schleifer", notes: [60, 62] }, "C up to E: the Schleifer C D → E (the held C struck again)");
  assert.deepEqual(dragFill(60, 64, C_MAJOR, "coule"), { kind: "coule", notes: [62] }, "or the coulé ascending");
  assert.deepEqual(dragFill(55, 64, C_MAJOR), { kind: "schleifer", notes: [60, 62] }, "G up to E: C D → E");
  assert.deepEqual(dragFill(57, 65, C_MAJOR), { kind: "schleifer", notes: [62, 64] }, "A up to F: D E → F");
  assert.deepEqual(dragFill(60, 62, C_MAJOR), { kind: "join", notes: [] }, "a step");
  assert.deepEqual(dragFill(72, 64, C_MAJOR), { kind: "join", notes: [] }, "a fall of a sixth");
  const cMinor = scaleOfKey("c");
  assert.deepEqual(dragFill(63, 60, cMinor), { kind: "coule", notes: [62] }, "Eb down to C: passing D");
  assert.equal(passingNote(67, 63, cMinor), 65, "G down to Eb: passing F");
  assert.equal(stepBelow(60, C_MAJOR), 59);
  assert.equal(stepBelow(64, C_MAJOR), 62);
  const name = (m: number) => ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][m % 12];
  assert.equal(dragLine(name, 60, 64, { fill: dragFill(60, 64, C_MAJOR) }), "DRAG: Schleifer (C D → E)");
  assert.equal(dragLine(name, 64, 60, { fill: dragFill(64, 60, C_MAJOR) }), "DRAG: coulé (passing D) E → C");
  assert.equal(dragLine(name, 67, 74, { glideMs: 380 }), "DRAG: glide 380 ms (G → D)");
  // Timing: the trill's speed (10 a second: 100 ms), never more than half the note between them; or the drag's time.
  assert.equal(fillNoteMs(2, 50), 100);
  assert.equal(fillNoteMs(2, 50, 240), 60);
  MECH.fillTiming = "drag";
  assert.equal(fillNoteMs(2, 300), 150);
  assert.equal(fillNoteMs(2, 40), 50, "no faster than twice the trill");
  resetMech();
});

// ---- In a passage (HIGHWAY: its slides change lane) ----

const C_MINOR = fugueById("wtc1f02");
type Rec = { midi: number; at: number; legato?: boolean; glided: number[] };
function fakeChip(clock: { t: number }, rec: Rec[]) {
  return {
    ctx: {
      get currentTime() {
        return clock.t;
      },
    },
    heard: () => clock.t,
    note: (midi: number, at: number, _d: number, _v: unknown, p: { legato?: boolean }) => {
      const r: Rec = { midi, at, legato: p.legato, glided: [] };
      rec.push(r);
      return { stop: () => {}, bend: () => {}, glide: (m: number) => void r.glided.push(m), muffle: () => {}, dyn: () => {} };
    },
    swoosh: () => {},
    tick: () => {},
    chime: () => {},
  } as unknown as Chip;
}

/** Three joined notes on the alto: the first thumb on a, the second lands on b while a holds (legato), then slides on to c. */
function slurAndDrag(meaning: "join" | "connect", presetId = "chip") {
  resetMech();
  // D378: the drag's meanings are MECHANICS: CLASSIC's (Glenn's slide makes a slur).
  MECH.glenn = false;
  MECH.dragMeaning = meaning;
  setPreset(presetId);
  const clock = { t: 0 };
  const rec: Rec[] = [];
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("highway"), { bpm: 54, legato: false, easy: "timing" }, fakeChip(clock, rec));
  const taps: LabEvent[] = [];
  g.tap = (e) => void taps.push(e);
  const hs = g.notes.map((_, i) => i).filter((i) => !g.notes[i].ride && !(i > 0 && g.notes[i - 1].on === g.notes[i].on));
  let run: number[] = [];
  for (let s = 0; s + 3 <= hs.length; s++) {
    const xs = hs.slice(s, s + 3);
    if (xs.slice(1).every((i) => g.joinedAt(i))) {
      run = xs;
      break;
    }
  }
  const [a, b, c] = run;
  const [W, H] = [500, 800];
  const go = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  const now = () => performance.now();
  go(g.timeAt(g.notes[a].on));
  g.down(1, { side: "left", x: W * 0.1, y: H - 100, w: W, h: H }, now());
  go(g.timeAt(g.notes[b].on));
  g.down(2, { side: "right", x: W * 0.9, y: H - 100, w: W, h: H }, now());
  g.up(1, now());
  const tc = g.timeAt(g.notes[c].on);
  go(tc - 0.15);
  g.move(2, { side: "right", x: W * 0.88, y: H - 100, w: W, h: H }, now() - 150);
  go(tc);
  g.move(2, { side: "right", x: W * 0.4, y: H - 100, w: W, h: H }, now());
  const before = rec.length;
  for (let k = 0; k < 40; k++) (clock.t += 0.02), g.step();
  setPreset("chip");
  return { g, a, b, c, taps, rec, before };
}

test("D321: in a passage, 'join' as before: the drag breaks the chain, no legato credit (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  const { g, c, taps } = slurAndDrag("join");
  assert.equal(g.notes[c].state, "hit");
  assert.equal(g.notes[c].via, "slide");
  assert.equal(g.chain, 0);
  assert.equal(g.art.legato, 1, "only the handover");
  assert.equal(taps.filter((e) => e.kind === "drag").length, 0);
  resetMech();
  }));

test("D321: in a passage, 'connect': the drag counts as joined (the chain kept, not lengthened), nothing more earned; a glide as long as the drag (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  const j = slurAndDrag("join");
  const k = slurAndDrag("connect");
  assert.equal(k.g.notes[k.c].state, "hit");
  assert.equal(k.g.chain, 1, "the chain the handover began, kept");
  assert.equal(k.g.art.legato, 2, "credited as joined");
  assert.equal(k.g.art.legatoOf, j.g.art.legatoOf);
  assert.equal(k.g.score, j.g.score, "no bonus for the drag");
  const d = k.taps.find((e) => e.kind === "drag");
  assert.ok(d && d.kind === "drag" && d.how === "glide");
  if (d?.kind === "drag") {
    assert.ok(d.dragMs! >= 150 && d.dragMs! < 220, `from the last moment the thumb was still to the slide: ${d.dragMs}`);
    const nc = k.g.notes[k.c];
    assert.ok(Math.abs(d.ms! - glideMs(d.dragMs!, (k.g.timeAt(nc.on + nc.dur) - k.g.timeAt(nc.on)) * 1000)) < 1);
    // The sound glided step by step from the note held to the new one, and ended on it.
    const sd = k.rec.find((r) => r.glided.length > 2);
    assert.ok(sd, "a glide carried over frames");
    assert.equal(sd!.glided.at(-1), d.to);
    assert.ok(sd!.glided.length >= 3);
    const ln = lines(C_MINOR.id, d)[0];
    assert.match(ln, /↝ DRAG: glide \d+ ms \(/);
  }
  const note = k.taps.find((e) => e.kind === "note" && e.i === k.c);
  assert.ok(note?.kind === "note" && note.legato?.drag && note.legato.ok);
  if (note?.kind === "note") assert.match(lines(C_MINOR.id, note).join("\n"), /JOINED by the drag/);
  resetMech();
  }));

test("D321: in a passage, 'connect' on a keyboard: its fill (coulé, Schleifer, or a plain joined note), then the note (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  const k = slurAndDrag("connect", "harpsichordSampled");
  const d = k.taps.find((e) => e.kind === "drag");
  assert.ok(d?.kind === "drag");
  if (d?.kind !== "drag") return;
  const exp = dragFill(d.from, d.to, scaleOfKey(C_MINOR.key));
  assert.equal(d.how, exp.kind);
  assert.deepEqual(d.fill, exp.notes);
  const sounded = k.rec.slice(k.before - exp.notes.length - 1, k.before).map((r) => r.midi);
  assert.deepEqual(sounded, [...exp.notes, d.to], "the fill's notes then the note");
  assert.equal(k.g.chain, 1);
  resetMech();
  }));

// ---- In free play ----

function fakeFree() {
  const notes: { midi: number; at: number; dur: number; glided: number[]; stopped?: number }[] = [];
  const ctx = { currentTime: 10 };
  const chip = {
    ctx,
    note(midi: number, at: number, dur: number) {
      const n = { midi, at, dur, glided: [] as number[] } as (typeof notes)[number];
      notes.push(n);
      return { stop: (t?: number) => void (n.stopped = t ?? ctx.currentTime), bend() {}, glide: (m: number) => void n.glided.push(m), shape() {} };
    },
    tick() {},
  };
  return { chip: chip as unknown as Chip, notes, ctx };
}
const I2 = fugueById("wtc1f02");
const W = 750;
const H = 342;

test("D321: free play, 'connect' on a sound that bends: the pitch follows the thumb between the rows; arrived, a DRAG line", () => {
  resetMech();
  MECH.dragMeaning = "connect";
  setPreset("chip");
  const { chip, notes } = fakeFree();
  const out: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => out.push(l));
  const rh = fp.rowH(H);
  const y0 = fp.yOf(5, H);
  fp.down(1, "left", 75, y0, W, H, 0);
  for (let k = 1; k <= 20; k++) fp.move(1, 75, y0 - (2 * rh * k) / 20, W, H, 10 * k);
  const g = notes[0].glided;
  assert.ok(g.length >= 10, `followed: ${g.length}`);
  for (let i = 1; i < g.length; i++) assert.ok(g[i] >= g[i - 1] - 1e-9, "upward, continuous");
  assert.ok(g.some((m) => !Number.isInteger(m)), "between the rows");
  assert.equal(g.at(-1), fp.rows[7]);
  fp.move(1, 75, y0 - 2 * rh, W, H, 200 + SLIDE_DWELL_MS + 1);
  assert.ok(out.some((l) => /↝ DRAG: glide \d+ ms/.test(l)), out.join("\n"));
  assert.equal(notes.length, 1, "no new note: one glide");
  resetMech();
});

test("D321: free play, 'connect' on a keyboard: a third down a coulé, a third up the Schleifer; 'join': a plain slide", () => {
  resetMech();
  MECH.dragMeaning = "connect";
  setPreset("pianoSampled");
  const { chip, notes } = fakeFree();
  const out: string[] = [];
  const fp = new FreePlay(I2, 0, chip, { scale: "key", octaves: 2, bpm: 80, click: false }, (l) => out.push(l));
  const rh = fp.rowH(H);
  const y0 = fp.yOf(7, H);
  fp.down(1, "left", 75, y0, W, H, 0);
  fp.move(1, 75, y0 + 2 * rh, W, H, 50);
  fp.move(1, 75, y0 + 2 * rh, W, H, 50 + SLIDE_DWELL_MS + 1);
  const exp = dragFill(fp.rows[7], fp.rows[5], scaleOfKey(I2.key));
  assert.equal(exp.kind, "coule");
  assert.deepEqual(notes.slice(1).map((n) => n.midi), [...exp.notes, fp.rows[5]]);
  assert.ok(notes[2].at > notes[1].at, "the passing note first");
  assert.ok(out.some((l) => /DRAG: coulé \(passing/.test(l)), out.join("\n"));
  fp.up(1, 400, false);
  const n0 = notes.length;
  fp.down(2, "left", 75, fp.yOf(3, H), W, H, 1000);
  fp.move(2, 75, fp.yOf(5, H), W, H, 1050);
  fp.move(2, 75, fp.yOf(5, H), W, H, 1050 + SLIDE_DWELL_MS + 1);
  assert.equal(notes.length - n0, 4, "struck, then the Schleifer's two notes and the note");
  assert.ok(out.some((l) => /DRAG: Schleifer \(.+ → /.test(l)), out.join("\n"));
  fp.up(2, 1400, false);
  MECH.dragMeaning = "join";
  const n1 = notes.length;
  fp.down(3, "left", 75, fp.yOf(3, H), W, H, 2000);
  fp.move(3, 75, fp.yOf(5, H), W, H, 2050);
  fp.move(3, 75, fp.yOf(5, H), W, H, 2050 + SLIDE_DWELL_MS + 1);
  assert.equal(notes.length - n1, 1, "join: the slide glides the one note (as D320)");
  assert.equal(notes.at(-1)!.glided.at(-1), fp.rows[5]);
  setPreset("chip");
  resetMech();
});

// ---- The sensor's pure functions ----

/** Motion at 60 Hz, at rest (gravity on z, a little noise), with a spike of `amp` m/s² at `spikeAt` ms. */
function motion(spikeAt: number, amp: number, from = -400, to = 200, every = 16.7): MotionSample[] {
  const out: MotionSample[] = [];
  let seed = 7;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.02;
  for (let t = from; t <= to; t += every) {
    const s = Math.abs(t - spikeAt) < every / 2 ? amp : 0;
    out.push({ t, rt: t + 4, gx: noise(), gy: noise() + s * 0.6, gz: 9.81 + noise() + s * 0.8 });
  }
  return out;
}

test("D321 SENSOR: a tap's peak in the window round the touch, when it was there, the interval, the posture", () => {
  const s = motion(17, 2);
  const p = tapPeak(s, 0);
  assert.ok(p.peak !== null && Math.abs(p.peak - 2) < 0.1, `peak ${p.peak}`);
  assert.ok(Math.abs(p.peakAt! - 16.7) < 1);
  assert.ok(Math.abs(p.availMs! - 20.7) < 1, "the page had it 4 ms later");
  assert.ok(p.n >= 2 && p.n <= 4);
  assert.ok(Math.abs(medianInterval(s)! - 16.7) < 0.01);
  assert.equal(tapPeak(motion(120, 2), 0).peak! < 0.1, true, "a spike outside the window is not this tap's");
  assert.equal(tapPeak([], 0).peak, null);
  assert.equal(posture(s, -20), "table");
  const held = s.map((x, i) => ({ ...x, gx: 3 + Math.sin(i) * 0.3, gz: 8.5 }));
  assert.equal(posture(held, -20), "held");
  assert.equal(posture([], 0), "unknown");
});

test("D321 SENSOR: separability (AUC, d′), calibration and strength", () => {
  assert.equal(auc([1, 2, 3], [4, 5, 6]), 1);
  assert.equal(auc([4, 5, 6], [1, 2, 3]), 0);
  assert.equal(auc([1, 2], [1, 2]), 0.5);
  const st = stats([1, 2, 3, 4]);
  assert.equal(st.mean, 2.5);
  assert.ok(Math.abs(st.sd - 1.291) < 0.001);
  assert.equal(median([3, 1, 2]), 2);
  const sep = separability([0.2, 0.3, 0.25, 0.4], [0.9, 1.1, 0.8, 1.4]);
  assert.equal(sep.auc, 1);
  assert.equal(sep.verdict, "clear");
  assert.ok(sep.d > 3);
  assert.equal(separability([1, 2], [3, 4]).verdict, "too few");
  assert.equal(separability([1, 2, 3, 4, 5], [1.5, 2.5, 3.5, 4.5, 2]).verdict, "none");
  const cal = calibrate([0.2, 0.3, 0.25], [0.9, 1.1, 0.8])!;
  assert.deepEqual(cal, { soft: 0.25, hard: 0.9, from: "session" });
  assert.equal(strengthFrom(0.25, cal), 0.25);
  assert.equal(strengthFrom(0.9, cal), 0.75);
  assert.equal(strengthFrom(5, cal), 1);
  assert.equal(strengthFrom(0, cal), 0.25 - (0.5 * 0.25) / 0.65);
  assert.equal(calibrate([1, 1, 1], [0.5, 0.5, 0.5]), null);
  assert.equal(recentCalibration([1, 2, 3]), null);
  assert.ok(recentCalibration([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])!.hard > 7);
});

test("D321 SENSOR: the contact's size (2 × the touch radius, or the pointer's width and height) and what the pressure reads", () => {
  assert.equal(sizeOf({ radiusX: 20, radiusY: 22 }), 44);
  assert.equal(sizeOf({ width: 40, height: 44 }), 42);
  assert.equal(sizeOf({ width: 1, height: 1 }), null, "a mouse");
  assert.equal(sizeOf({}), null);
  assert.equal(pressureKind([0, 0, 0]), "always 0");
  assert.equal(pressureKind([0.5, 0.5]), "always 0.5");
  assert.equal(pressureKind([0.2, 0.6]), "varies");
  assert.equal(pressureKind([]), "none");
});
