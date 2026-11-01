/**
 * D426, THE KEYBOARDS' AND THE LUTE'S SLIDES (the rest of D424's touches): the piano's HAIRPIN (each slid
 * note's level continuous across the strip, about the line), the harpsichord's and the organ's COULÉ (a
 * slide over a third or more fills in the steps between, just before the arrival, the arrival on time),
 * the lute's LEFT-HAND SLUR (no new pluck: the course retuned, about 3 dB under; over a fourth a
 * glissando), and Herr Bach's slide a gradual move. The judge unchanged whatever the sound.
 */
import { withSlideSound } from "../src/bench/slide-sound.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { COULE_MIN_S, couleFill, couleTiming, keyboardSlide, LUTE_SLUR, luteSlur, SLIDE_TRACK_TAU } from "../src/bench/glenn.ts";
import { MECH } from "../src/bench/mechanics.ts";
import { replay } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { setPreset } from "../src/touch/sound.ts";
import { PIANO_ZONE_DB, pianoDb, pianoHairpinDb, pianoZone } from "../src/touch/touch-expr.ts";
import { lessonById } from "../src/bench/manual/lessons.ts";
import { gameFor } from "./d342-sim.ts";
import { synthEvents, type SynthEvent, type SynthNote } from "../tools/lab/lab-synth.ts";

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const ON = { glenn: true };

test("D426: what a slide does, by sound", () => {
  assert.equal(keyboardSlide("pianoSampled"), "hairpin");
  assert.equal(keyboardSlide("harpsichordSampled"), "coule");
  assert.equal(keyboardSlide("chamberOrgan"), "coule");
  assert.equal(keyboardSlide("organSampled"), "coule");
  assert.equal(keyboardSlide("lute"), "slur");
  for (const id of ["stringConsort", "vocalSynth", "chip", "traverso"]) assert.equal(keyboardSlide(id), null, id);
});

test("D426: the piano's hairpin: continuous across the strip over the zones' span, about the line's level", () => {
  assert.equal(pianoHairpinDb(0), PIANO_ZONE_DB[0]);
  assert.equal(pianoHairpinDb(1), PIANO_ZONE_DB[2]);
  assert.equal(pianoHairpinDb(0.5), 0);
  assert.equal(pianoHairpinDb(-1), PIANO_ZONE_DB[0], "clamped");
  assert.equal(pianoHairpinDb(2), PIANO_ZONE_DB[2], "clamped");
  // Continuous: no step at the zones' edges (where the landing jumps 3 dB), monotone.
  for (const edge of [1 / 3, 2 / 3]) {
    assert.ok(Math.abs(pianoHairpinDb(edge + 1e-6) - pianoHairpinDb(edge - 1e-6)) < 1e-3, `smooth at ${edge}`);
    assert.ok(pianoDb(edge + 1e-6) - pianoDb(edge - 1e-6) >= 2.9, "the landing's zones jump there");
  }
  const xs = Array.from({ length: 101 }, (_, k) => k / 100);
  assert.ok(xs.every((x, k) => k === 0 || pianoHairpinDb(x) > pianoHairpinDb(xs[k - 1])), "monotone");
  assert.ok(xs.every((x, k) => k === 0 || pianoHairpinDb(x) - pianoHairpinDb(xs[k - 1]) < 0.07), "no jumps");
  // About the line's level, no accent's weight on a slid note; a landing keeps its zone.
  assert.equal(pianoDb(0.8, { lineDb: -2, hairpin: true }), -2 + pianoHairpinDb(0.8));
  assert.equal(pianoDb(0.8, { lineDb: -2, accentDb: 6, hairpin: true }), -2 + pianoHairpinDb(0.8));
  assert.equal(pianoDb(0.2, { lineDb: -2 }), -2 + PIANO_ZONE_DB[pianoZone(0.2)]);
});

test("D426: the coulé's fill: the scale steps between, by letter, the accidentals in force; a step none", () => {
  const nat = () => 0;
  // C4 is step 28 in protos.ts's numbering (and any other numbering a whole octave off).
  const C4 = { step: 28, midi: 60 };
  assert.deepEqual(couleFill(C4, { step: 30, midi: 64 }, nat), [62], "a third: the passing note");
  assert.deepEqual(couleFill(C4, { step: 32, midi: 67 }, nat), [62, 64, 65], "a fifth up");
  assert.deepEqual(couleFill({ step: 32, midi: 67 }, C4, nat), [65, 64, 62], "a fifth down, in the slide's order");
  assert.deepEqual(couleFill({ step: 4, midi: 67 }, { step: 0, midi: 60 }, nat), [65, 64, 62], "another numbering");
  assert.deepEqual(couleFill(C4, { step: 29, midi: 62 }, nat), [], "a step: the plain join");
  assert.deepEqual(couleFill(C4, C4, nat), []);
  // G major (F sharp): D4 to A4 through E and F sharp; C minor (E flat, A flat, B flat): C to G through D, E flat, F.
  const sharpF = (l: number) => (l === 3 ? 1 : 0);
  assert.deepEqual(couleFill({ step: 29, midi: 62 }, { step: 33, midi: 69 }, sharpF), [64, 66, 67]);
  const cMinor = (l: number) => (l === 2 || l === 5 || l === 6 ? -1 : 0);
  assert.deepEqual(couleFill(C4, { step: 32, midi: 67 }, cMinor), [62, 63, 65]);
  // A raised leading note in force (B natural in C minor): A flat up to C through B natural.
  assert.deepEqual(couleFill({ step: 26, midi: 56 }, C4, (l) => (l === 6 ? 0 : cMinor(l))), [59]);
});

test("D426: the coulé's timing: the travel shared out, at most the ornament unit each, after the departure's half, ending at the arrival", () => {
  const unit = 0.09;
  // Plenty of time: each a unit, the last ending on the arrival (the arrival on time).
  const a = couleTiming(2, { now: 0.2, departOn: 0, arriveOn: 1, unit })!;
  assert.deepEqual(a.map((x) => +x.toFixed(4)), [0.82, 0.91]);
  // A quick slide (seen 60 ms before the arrival): its travel shared out, quicker than the unit.
  const b = couleTiming(2, { now: 0.94, departOn: 0, arriveOn: 1, unit })!;
  assert.deepEqual(b.map((x) => +x.toFixed(4)), [0.94, 0.97]);
  assert.ok(b[1] - b[0] < unit);
  // Never before the departure note's half: a short departure note shares its second half.
  const c = couleTiming(3, { now: 0, departOn: 0, arriveOn: 0.2, unit })!;
  assert.ok(Math.abs(c[0] - 0.1) < 1e-9 && c.every((x) => x >= 0.1));
  assert.ok(Math.abs(0.2 - c[2] - (c[1] - c[0])) < 1e-9, "the last ends at the arrival");
  // No time, no fill; nothing to fill, nothing.
  assert.equal(couleTiming(2, { now: 0.97, departOn: 0, arriveOn: 1, unit }), null);
  assert.equal(couleTiming(1, { now: 1.01, departOn: 0, arriveOn: 1, unit }), null, "the slide seen after the arrival's time");
  assert.equal(couleTiming(0, { now: 0, departOn: 0, arriveOn: 1, unit }), null);
  assert.ok(COULE_MIN_S > 0.02 && COULE_MIN_S < 0.04);
});

test("D426: the lute's left-hand slur: never a pluck; about 3 dB under; a 10 ms hammer; a glissando from a fourth", () => {
  const s = luteSlur(60, 63);
  assert.equal(s.pluck, false);
  assert.equal(s.gliss, false);
  assert.ok(Math.abs(20 * Math.log10(s.level) - LUTE_SLUR.db) < 1e-9 && LUTE_SLUR.db === -3);
  assert.ok(s.tau * 3 <= 0.0101 && s.tau > 0, "95% there in about 10 ms");
  assert.equal(luteSlur(60, 64).gliss, false);
  assert.equal(luteSlur(60, 65).gliss, true, "a fourth");
  assert.equal(luteSlur(67, 60).gliss, true, "a fifth down");
  assert.equal(luteSlur(60, 65).pluck, false);
});

// ---- The engine, driven by synthetic thumbs (tools/lab/lab-synth.ts), the player's sounds recorded. ----

interface Heard {
  midi: number;
  at: number;
  p: Play;
  stop?: number;
  glides: { to: number; tau?: number }[];
  dyn: number[];
}
type Plan = (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }) => SynthEvent[];
function run(sound: string, plan: Plan) {
  setPreset(sound);
  const log = synthEvents(II18, 3, (notes, t, _r, rows) => plan(notes, t, rows));
  const heard: Heard[] = [];
  let timeAt: (tick: number) => number = () => 0;
  let ons: number[] = [];
  const r = replay(log, ON, (g, chip: Chip) => {
    const now = () => chip.ctx.currentTime;
    timeAt = (tk) => g.timeAt(tk);
    ons = g.tracks[0].notes.map((n) => n.on);
    (chip as { note: unknown }).note = (midi: number, at: number, _dur: number, _v: unknown, p: Play = {}) => {
      const h: Heard = { midi, at, p, glides: [], dyn: [] };
      // The player's sounds (lead), struck now (the band's are scheduled ahead).
      if (p.lead && at <= now() + 1e-6) heard.push(h);
      return {
        stop: (when?: number) => void (h.stop ??= when ?? now()),
        bend() {},
        glide: (to: number, tau?: number) => void h.glides.push({ to, tau }),
        muffle() {},
        dyn: (l: number) => void h.dyn.push(l),
      };
    };
  });
  setPreset("chip");
  return { heard, events: r.events, timeAt, ons };
}
const notesOf = (ev: LabEvent[]) => ev.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note");
const verdicts = (ev: LabEvent[]) =>
  notesOf(ev)
    .map((e) => `${e.i}:${e.ok}:${Math.round(e.offMs)}:${e.legato?.ok}:${!!e.slide}`)
    .join(" ");
/** The first note a whose next is `ok(a, a+1)` away (and joined in time), and the one after differs. */
/** The plan's notes carry their pitch at run time (the game's lane notes). */
type M = SynthNote & { midi: number };
function pairWhere(all: SynthNote[], ok: (a: M, b: M) => boolean): number {
  const notes = all as M[];
  for (let i = 0; i + 2 < notes.length; i++) if (ok(notes[i], notes[i + 1]) && notes[i + 1].step !== notes[i + 2].step && notes[i + 1].on - notes[i].on <= notes[i].dur) return i;
  throw new Error("no pair");
}
const third = (a: M, b: M) => Math.abs(a.step - b.step) === 2 && Math.abs(a.midi - b.midi) < 5;
const stepOnly = (a: M, b: M) => Math.abs(a.step - b.step) === 1;
const fourthUp = (a: M, b: M) => Math.abs(a.midi - b.midi) >= 5;
/** SLIDE: the left strikes a and travels to a+1's height in eight moves over `dur` s, arriving on its time; across from `x0` to `x1`. */
const slide = (pick: (a: M, b: M) => boolean, dur: number, x0 = 40, x1 = x0): Plan => (notes, t, rows) => {
  const a = pairWhere(notes, pick);
  const y0 = rows.yOf(notes[a].step);
  const y1 = rows.yOf(notes[a + 1].step);
  const arrive = t(notes[a + 1].on);
  const ev: SynthEvent[] = [{ t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: x0, y: y0 }];
  for (let k = 1; k <= 8; k++) ev.push({ t: arrive - dur + (dur * k) / 8, k: 2, kind: "m", id: 1, x: x0 + ((x1 - x0) * k) / 8, y: y0 + ((y1 - y0) * k) / 8 });
  ev.push({ t: arrive + 0.5, k: 0, kind: "u", id: 1 });
  return ev;
};

test("D426: the piano's slid note takes its level from where the thumb is across as it sounds (continuous); the landing its zone", () => {
  assert.equal(MECH.glenn, true);
  const at = (x1: number) => {
    const r = run("pianoSampled", slide(third, 0.2, 40, x1));
    const [a, b] = r.heard;
    assert.ok(b && b.midi !== a.midi, "the next note struck (no bend)");
    assert.equal(a.p.hairpin, undefined, "the landing: its zone");
    assert.equal(b.p.hairpin, true, "the slid note: the hairpin");
    assert.equal(b.p.group, 1);
    return { touch: b.p.touch!, db: pianoDb(b.p.touch!, { lineDb: b.p.lineDb, hairpin: true }), ev: r.events };
  };
  const xs = [10, 40, 70, 100, 130];
  const got = xs.map(at);
  // The thumb drifting across the bar: the level moves smoothly with it, one way, more than three values.
  const dbs = got.map((g) => g.db);
  const dir = Math.sign(dbs.at(-1)! - dbs[0]);
  assert.ok(dir !== 0, `the level follows the thumb across: ${dbs.map((d) => d.toFixed(2))}`);
  assert.ok(dbs.every((d, k) => k === 0 || dir * (d - dbs[k - 1]) > 0), `monotone: ${dbs.map((d) => d.toFixed(2))}`);
  assert.ok(new Set(dbs.map((d) => d.toFixed(3))).size === xs.length, "continuous, not three zones");
  assert.ok(dbs.every((d) => d >= PIANO_ZONE_DB[0] - 1e-9 && d <= PIANO_ZONE_DB[2] + 1e-9), "within the zones' span");
  // Never by verdict: the judge the same wherever the thumb is across.
  assert.ok(got.every((g) => verdicts(g.ev) === verdicts(got[0].ev)));
});

test("D426: the coulé on the harpsichord and the organ: the step between, just before the arrival, the arrival on time; a step plain", () =>
  // D438: the instruments session's slide sounds, under SLIDE_SOUND "instruments" (the default "d486": d486-slides.test.ts).
  withSlideSound("instruments", () => {
  const plainOff = notesOf(run("chip", slide(third, 0.3)).events).find((e) => e.slide)!.offMs;
  for (const sound of ["harpsichordSampled", "chamberOrgan"]) {
    const r = run(sound, slide(third, 0.3));
    const ev = notesOf(r.events);
    const slid = ev.find((e) => e.slide);
    assert.ok(slid?.ok, `${sound}: the slide arrived, judged`);
    const [a, fill, b] = r.heard;
    assert.ok(a && fill && b, `${sound}: the departure, the fill, the arrival: ${r.heard.map((h) => h.midi)}`);
    assert.ok((fill.midi - a.midi) * (b.midi - fill.midi) > 0, `${sound}: the fill between (${a.midi} ${fill.midi} ${b.midi})`);
    assert.equal(fill.p.lead, true);
    assert.ok(fill.at < b.at, "before the arrival");
    // The arrival on its time (as a plain slide sounds); the fill within an ornament unit of it (91 ms here) and after the departure's half.
    assert.equal(Math.round(slid!.offMs), Math.round(plainOff), `${sound}: the arrival's time as a plain slide's`);
    const arriveOn = r.timeAt(r.ons[slid!.i]);
    assert.ok(arriveOn - fill.at <= 0.092 + 0.02 && arriveOn - fill.at > 0, `${sound}: quick, just before the arrival's time: ${((arriveOn - fill.at) * 1000).toFixed(0)} ms`);
    assert.ok(a.stop !== undefined && a.stop > fill.at - 1e-6, "the departure rings into the fill");
    assert.equal(r.heard.length, 3);
  }
  // A step: a plain join, struck on arrival.
  const step = run("harpsichordSampled", slide(stepOnly, 0.3));
  assert.ok(step.heard.length <= 2, `a step: no fill: ${step.heard.map((h) => h.midi)}`);
  assert.ok(!step.events.some((e) => e.kind === "drag"), "no coulé read");
  // A slide begun too late for any fill (20 ms of travel): no fill, the arrival as before.
  const late = run("harpsichordSampled", slide(third, 0.02));
  assert.ok(late.heard.length <= 3);
  assert.ok(notesOf(late.events).find((e) => e.slide)?.ok);
}));

test("D426: the lute's slide plucks nothing: the course retuned with a quick hammer, 3 dB under; over a fourth a glissando", () =>
  // D438: the instruments session's slide sounds, under SLIDE_SOUND "instruments" (the default "d486": d486-slides.test.ts).
  withSlideSound("instruments", () => {
  const r = run("lute", slide(third, 0.2));
  assert.ok(notesOf(r.events).find((e) => e.slide)?.ok, "the slide judged as before");
  assert.equal(r.heard.length, 1, `no new pluck: ${r.heard.map((h) => h.midi)}`);
  const [a] = r.heard;
  assert.equal(a.glides.length, 1, "no glissando under a fourth: the hammer only");
  assert.ok(Math.abs(a.glides[0].tau! - LUTE_SLUR.hammerS / 3) < 1e-9);
  assert.notEqual(a.glides[0].to, a.midi);
  assert.ok(a.dyn.length === 1 && Math.abs(20 * Math.log10(a.dyn[0]) - LUTE_SLUR.db) < 0.01, `about 3 dB under: ${a.dyn}`);
  const g = run("lute", slide(fourthUp, 0.3));
  assert.ok(notesOf(g.events).find((e) => e.slide)?.ok);
  assert.equal(g.heard.length, 1, "a glissando: no pluck");
  const gs = g.heard[0].glides;
  assert.ok(gs.length >= 3 && gs.every((x) => x.tau === SLIDE_TRACK_TAU), `the pitch follows the thumb: ${JSON.stringify(gs)}`);
  assert.ok(gs.some((x) => !Number.isInteger(x.to)), "between the notes");
  assert.ok(Number.isInteger(gs.at(-1)!.to) && gs.at(-1)!.to !== g.heard[0].midi, "landed on the note");
  // Two thumbs stay plucked.
  const two = run("lute", (notes, t, rows) => {
    const a = pairWhere(notes, third);
    return [
      { t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
      { t: t(notes[a + 1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 1].step) },
      { t: t(notes[a + 1].on) + 0.01, k: 0, kind: "u", id: 1 },
      { t: t(notes[a + 1].on) + 0.6, k: 0, kind: "u", id: 2 },
    ];
  });
  assert.equal(two.heard.length, 2, "a join plucks the next");
  assert.equal(two.heard[0].glides.length, 0);
}));

test("D426: the judge unchanged: the same slides, the same verdicts and times on every sound", () => {
  for (const [pick, dur] of [
    [third, 0.3],
    [third, 0.05],
    [stepOnly, 0.2],
    [fourthUp, 0.3],
  ] as const) {
    const ref = verdicts(run("chip", slide(pick, dur)).events);
    for (const sound of ["pianoSampled", "harpsichordSampled", "chamberOrgan", "lute", "stringConsort"]) assert.equal(verdicts(run(sound, slide(pick, dur)).events), ref, `${sound} ${dur}`);
  }
});

test("D426: no Schleifer is read: a landing two steps below its note is judged as before, on every sound", () => {
  // Built: COULÉ only (see D426): the ladder judges a landing by the thumb's own moves (D296), so a landing a
  // third low can already be the right note, struck on landing; a Schleifer would have to hold it back.
  const plan: Plan = (notes, t, rows) => {
    const a = pairWhere(notes, stepOnly);
    const yb = rows.yOf(notes[a + 1].step - 2);
    return [
      { t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
      { t: t(notes[a + 1].on) - 0.05, k: 1, kind: "d", id: 2, side: "right", x: 804, y: yb },
      { t: t(notes[a + 1].on) - 0.04, k: 0, kind: "u", id: 1 },
      { t: t(notes[a + 1].on) + 0.6, k: 0, kind: "u", id: 2 },
    ];
  };
  const ref = verdicts(run("chip", plan).events);
  for (const sound of ["harpsichordSampled", "chamberOrgan", "pianoSampled"]) assert.equal(verdicts(run(sound, plan).events), ref, sound);
});

test("D426: Herr Bach's slide (6.6) a gradual move from the departure row to the arrival: the portamento heard along the way", () =>
  // D438: the instruments session's slide sounds, under SLIDE_SOUND "instruments" (the default "d486": d486-slides.test.ts).
  withSlideSound("instruments", () => {
  const demo = (sound: string) => {
    setPreset(sound);
    const st = lessonById("6.6")!.stages[0];
    const clock = { t: 0 };
    const { g } = gameFor(st.m, clock, st.style ?? "plain");
    const heard: { midi: number; p: Play; glides: number[] }[] = [];
    (g as unknown as { chip: { note: unknown } }).chip.note = (midi: number, _at: number, _d: number, _v: unknown, p: Play = {}) => {
      const h = { midi, p, glides: [] as number[] };
      if (p.lead) heard.push(h);
      return { stop() {}, bend() {}, glide: (to: number) => void h.glides.push(to), muffle() {}, dyn() {} };
    };
    let done = false;
    while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
    setPreset("chip");
    return { heard, g };
  };
  const { heard, g } = demo("stringConsort");
  const slid = heard.filter((h) => h.glides.length > 0);
  assert.ok(slid.length >= 1, "the slide's portamento");
  // Gradual: several steps between the notes (the old single jump gave one glide to the note).
  assert.ok(slid.some((h) => h.glides.length >= 3 && h.glides.some((m) => !Number.isInteger(m))), `followed along the way: ${JSON.stringify(slid.map((h) => h.glides.map((m) => +m.toFixed(2))))}`);
  assert.ok((g as unknown as { slides: number }).slides >= 1, "his slides arrive as slides");
}));
