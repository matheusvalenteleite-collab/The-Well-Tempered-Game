/**
 * D376, THE EXPRESSION LAB (Glenn's "More Expression from Two Thumbs"): his mechanics behind MECH.glenn;
 * D378 (WTC 1.83): the game's own, the old ones (OFF here) MECHANICS: CLASSIC, in the Lab only. Each rule with the flag on, and
 * the same gesture with it off as the game plays it today: over-legato's ring, a keyboard slide's slur
 * (its start and end), a shake told from a slide (the pause no longer a trill), joins judged by ear and
 * the accent without its hold, a new bow or syllable against a slide's glide.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MECH, MECH_DEFAULTS, MECH_SPEC, withMech } from "../src/bench/mechanics.ts";
import { exprFamily, GLENN, glennParam, labPlayParam, isKeyboard, joinedByEar, nextStrongBeat, overHoldS, RingList, slideGlideTau, slidePhase, SlideSlur, slurRingS, slurTaperDb } from "../src/bench/glenn.ts";
import { ShakeReader, shakeThresholds } from "../src/touch/free-ornament.ts";
import { accentHeld, accentVerdict } from "../src/bench/accent.ts";
import { replay } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { setPreset } from "../src/touch/sound.ts";
import { synthEvents, type SynthEvent, type SynthNote } from "../tools/lab/lab-synth.ts";

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const ON = { glenn: true };
/** D378: MECHANICS: CLASSIC (the game before WTC 1.83). */
const OFF = { glenn: false };

test("D376/D378: the flag a Lab parameter; on in the game (D378); lab.html?glenn=1 the game's, ?glenn=0 MECHANICS: CLASSIC", () => {
  assert.equal(MECH_DEFAULTS.glenn, true);
  assert.equal(MECH.glenn, true);
  assert.ok(MECH_SPEC.some((s) => s.key === "glenn" && s.kind === "bool"));
  assert.equal(glennParam("?glenn=1"), true);
  assert.equal(glennParam("?glenn=1&lab=1"), true);
  assert.equal(glennParam(""), false);
  assert.equal(glennParam("?glenn=0"), false);
  assert.equal(labPlayParam("?glenn=1"), "glenn");
  assert.equal(labPlayParam("?glenn=0"), "classic");
  assert.equal(labPlayParam("?glenn=off"), "classic");
  assert.equal(labPlayParam(""), null);
  // play.html's entry sets nothing: the defaults are Glenn's. The Lab's reads the page's address.
  const lite = readFileSync(new URL("../src/bench/lite-main.tsx", import.meta.url), "utf8");
  assert.ok(!/glenn/i.test(lite));
  const lab = readFileSync(new URL("../src/bench/lab/lab-main.tsx", import.meta.url), "utf8");
  assert.ok(lab.includes("labPlayParam(location.search)"));
});

test("D376: the families and their numbers", () => {
  assert.equal(exprFamily("harpsichordSampled"), "plucked");
  assert.equal(exprFamily("lute"), "plucked");
  assert.equal(exprFamily("pianoSampled"), "piano");
  assert.equal(exprFamily("chamberOrgan"), "organ");
  assert.equal(exprFamily("stringConsort"), "bowed");
  assert.equal(exprFamily("vocalSynth"), "sung");
  assert.equal(exprFamily("chip"), "synth");
  assert.ok(isKeyboard("lute") && isKeyboard("pianoSampled") && !isKeyboard("stringConsort"));
  assert.equal(overHoldS("harpsichordSampled"), 0.4);
  assert.equal(overHoldS("lute"), 0.4);
  assert.equal(overHoldS("pianoSampled"), 0.25);
  assert.equal(overHoldS("chamberOrgan"), 0);
  assert.equal(overHoldS("vocalSynth"), 0);
  assert.equal(slurRingS("harpsichordSampled"), 0.11);
  assert.deepEqual([0, 1, 2, 3, 4, 7].map(slurTaperDb), [0, -1.5, -2.5, -3.5, -4, -4]);
  assert.ok([1, 2, 3, 4, 5].every((p) => slurTaperDb(p) <= 0), "only lower: the subject never louder");
  // The glide: a quarter of the slide's time, 10–90 ms.
  assert.equal(slideGlideTau(200), 0.05);
  assert.equal(slideGlideTau(10), 0.01);
  assert.equal(slideGlideTau(2000), 0.09);
});

test("D376: over-legato's ring list: until the lift, at least its least, at most its cap, never past the next strike but one", () => {
  const stops: number[] = [];
  const sd = { stop: (at?: number) => void stops.push(at ?? -1) };
  const rl = new RingList();
  const holder = {};
  rl.add({ k: 0, holder, stops: [sd], min: 1.03, max: 1.4 });
  rl.frame(1.2);
  assert.deepEqual(stops, []);
  rl.lifted(holder, 1.25);
  assert.deepEqual(stops, [1.25]);
  rl.add({ k: 0, holder, stops: [sd], min: 2.03, max: 2.4 });
  rl.lifted(holder, 2.01);
  assert.equal(stops.at(-1), 2.03, "at least the old join");
  rl.add({ k: 0, holder: {}, stops: [sd], min: 3.03, max: 3.4 });
  rl.frame(3.5);
  assert.equal(stops.at(-1), 3.4, "at most the cap");
  rl.add({ k: 0, holder: {}, stops: [sd], min: 4.03, max: 4.4 });
  rl.strike(0, 4.2);
  assert.equal(stops.at(-1), 4.2, "the next strike but one");
  assert.equal(rl.items.length, 0);
});

test("D376: a slide's slur: opened at the note slid from, carried by joins, ended by a detach, the next strong beat (included) or eight notes", () => {
  // 4/4, a crotchet 4 ticks: bars every 16 ticks, strong beats at 0, 8, 16, 24…
  const f = { bars: [0, 1, 2, 3].map((n) => ({ n: n + 1, on: n * 16 })), barTicks: 16, meter: "4/4", length: 64 };
  assert.equal(nextStrongBeat(f, 0), 8);
  assert.equal(nextStrongBeat(f, 9), 16);
  assert.equal(nextStrongBeat({ ...f, meter: "3/4", barTicks: 12, bars: [0, 1, 2].map((n) => ({ n: n + 1, on: n * 12 })) }, 1), 12);
  const ss = new SlideSlur((t) => nextStrongBeat(f, t));
  // C (0) slid to D (2), E (4), F (6) joined, G (8) on the half-bar joined: its last; A (10) plain.
  assert.equal(ss.slide(0, 2), 1);
  assert.deepEqual([4, 6, 8].map((on) => ss.next(on, true)), [2, 3, 4]);
  assert.equal(ss.open, false);
  assert.equal(ss.next(10, true), 0);
  // Broken at F: a detach ends it; G is plain.
  ss.slide(0, 2);
  assert.equal(ss.next(4, true), 2);
  assert.equal(ss.next(6, false), 0);
  assert.equal(ss.next(8, true), 0);
  // Eight notes at most (semiquavers in a long bar).
  const long = new SlideSlur(() => 1000);
  long.slide(0, 1);
  const pos = [2, 3, 4, 5, 6, 7, 8, 9].map((on) => long.next(on, true));
  assert.deepEqual(pos, [2, 3, 4, 5, 6, 7, 0, 0]);
});

test("D376: joined by ear (25 ms; a touch iOS took back keeps the old window); an accent needs no hold", () => {
  assert.equal(joinedByEar(25, false, 90), true);
  assert.equal(joinedByEar(26, false, 90), false);
  assert.equal(joinedByEar(62, false, 90), false);
  assert.equal(joinedByEar(62, true, 90), true);
  assert.equal(GLENN.joinGapMs, 25);
  assert.equal(accentHeld(100, 500, {}, { ...MECH_DEFAULTS, glenn: false }), "short");
  assert.equal(accentHeld(100, 500, {}, { ...MECH_DEFAULTS, glenn: true }), null);
  const v = { offMs: 10, onTimeMs: 70, beatMs: 700, gapMs: 40, heldMs: 200, lenMs: 500 };
  assert.deepEqual(accentVerdict(v, { ...MECH_DEFAULTS, glenn: false }), { met: false, why: "short" });
  assert.deepEqual(accentVerdict(v, { ...MECH_DEFAULTS, glenn: true }), { met: true, why: null });
  assert.equal(accentVerdict({ ...v, gapMs: 5 }, { ...MECH_DEFAULTS, glenn: true }).why, "joined");
});

test("D376: shake against slide: the slide phase; a slow one-way slide that pauses is no trill; legs alternate", () => {
  // The slide phase: after 35% of the way to the next note, or within 250 ms of it.
  assert.equal(slidePhase(100, 0, 1000), false);
  assert.equal(slidePhase(400, 0, 1000), true);
  assert.equal(slidePhase(120, 0, 360), true);
  assert.equal(slidePhase(20, 0, 600), false);
  const slow = (mech: typeof MECH_DEFAULTS) => {
    const th = shakeThresholds(0.7, 9, mech);
    const r = new ShakeReader({ x: 400, y: 200, t: 0 }, th);
    // Three moves of 7 px up, 40 ms each, 60 ms apart (Glenn's bug clip).
    let t = 0;
    let y = 200;
    for (let m = 0; m < 3; m++) {
      for (let k = 1; k <= 4; k++) r.feed(400, (y -= 1.75), (t += 10));
      t += 60;
      r.tick(t);
    }
    return r.kind;
  };
  assert.notEqual(slow({ ...MECH_DEFAULTS, glenn: false }), null, "CLASSIC: read as an ornament (the bug)");
  assert.equal(slow({ ...MECH_DEFAULTS, glenn: true }), null, "Glenn's: no ornament");
  // A quick mordent (down, back up) is still one with the flag on.
  const mordent = (mech: typeof MECH_DEFAULTS) => {
    const r = new ShakeReader({ x: 400, y: 200, t: 0 }, shakeThresholds(0.7, 9, mech));
    for (let k = 1; k <= 4; k++) r.feed(400, 200 + 2 * k, 10 * k);
    for (let k = 1; k <= 4; k++) r.feed(400, 208 - 2 * k, 40 + 10 * k);
    r.tick(200);
    return r.kind;
  };
  assert.equal(mordent({ ...MECH_DEFAULTS, glenn: false }), "down");
  assert.equal(mordent({ ...MECH_DEFAULTS, glenn: true }), "down");
  assert.equal(shakeThresholds(0.7, 9, { ...MECH_DEFAULTS, glenn: false }).alternate, undefined, "CLASSIC: the old reader");
  assert.equal(shakeThresholds(0.7, 9, MECH_DEFAULTS).alternate, true);
  // D378: no cap on a leg's length (D376's 1.5 rows lost the owner's shakes, 30–136 px).
  assert.equal("maxLeg" in shakeThresholds(0.7, 9, MECH_DEFAULTS), false);
});

// ---- The engine, driven by synthetic thumbs (tools/lab/lab-synth.ts), sounds recorded. ----

interface Heard {
  midi: number;
  at: number;
  p: Play;
  stop?: number;
  glides: { to: number; tau?: number; at: number }[];
}
function run(sound: string, plan: (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }) => SynthEvent[], mech: Record<string, unknown>) {
  setPreset(sound);
  const log = synthEvents(II18, 3, (notes, t, _r, rows) => plan(notes, t, rows));
  const heard: Heard[] = [];
  const r = replay(log, mech, (g, chip: Chip) => {
    const now = () => chip.ctx.currentTime;
    // The player's sounds only: a pitch of the voice played, near its written time (the other voices' are not kept).
    const mine = (midi: number, at: number) => g.tracks[0].notes.some((n) => n.midi === midi && Math.abs(g.timeAt(n.on) - at) < 0.35);
    (chip as { note: unknown }).note = (midi: number, at: number, _dur: number, _v: unknown, p: Play = {}) => {
      const h: Heard = { midi, at, p, glides: [] };
      if (at <= now() + 1e-6 && mine(midi, at)) heard.push(h);
      return {
        stop: (when?: number) => void (h.stop ??= when ?? now()),
        bend() {},
        glide: (to: number, tau?: number) => void h.glides.push({ to, tau, at: now() }),
        muffle() {},
        dyn() {},
      };
    };
  });
  setPreset("chip");
  return { heard, events: r.events, summary: r.summary };
}
const notesOf = (ev: LabEvent[]) => ev.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note");
/** The first two notes two rows or more apart (a slide's way: past the slide threshold), and the one after. */
function stepPair(notes: SynthNote[]): number {
  for (let i = 0; i + 2 < notes.length; i++) if (Math.abs(notes[i].step - notes[i + 1].step) >= 2 && notes[i + 1].step !== notes[i + 2].step && notes[i + 1].on - notes[i].on <= notes[i].dur) return i;
  throw new Error("no pair");
}

/** A two-thumb join: the left strikes note a, the right note a+1 on time, the left lifts `liftS` after. */
const handover = (liftS: number) => (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  return [
    { t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
    { t: t(notes[a + 1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 1].step) },
    { t: t(notes[a + 1].on) + liftS, k: 0, kind: "u", id: 1 },
    { t: t(notes[a + 1].on) + 0.6, k: 0, kind: "u", id: 2 },
  ];
};

test("D376: over-legato: on the harpsichord the note given way to rings until its thumb lifts (≤ 400 ms); the piano ≤ 250 ms; off: 30 ms", () => {
  const given = (sound: string, liftS: number, mech: Record<string, unknown>) => {
    const { heard } = run(sound, handover(liftS), mech);
    const [a, b] = heard;
    assert.ok(a && b, "two notes");
    return Math.round(((a.stop ?? Infinity) - b.at) * 1000);
  };
  assert.equal(given("harpsichordSampled", 0.2, OFF), 30);
  const on = given("harpsichordSampled", 0.2, ON);
  assert.ok(on >= 195 && on <= 220, `rings to the lift: ${on} ms`);
  const capped = given("harpsichordSampled", 0.55, ON);
  assert.ok(capped >= 400 && capped <= 420, `at most 400 ms: ${capped}`);
  const piano = given("pianoSampled", 0.4, ON);
  assert.ok(piano >= 250 && piano <= 270, `the piano at most 250 ms: ${piano}`);
  assert.equal(given("pianoSampled", 0.4, OFF), 30);
  // The organ and the single lines keep the clean join.
  assert.equal(given("chamberOrgan", 0.2, ON), 30);
  assert.equal(given("stringConsort", 0.2, ON), 30);
});

/** A slide: the left strikes note a and slides to a+1's height, arriving on its time; then the right joins a+2 (or lands after a gap). */
const slidePlan = (o: { gapS?: number; slideS?: number }) => (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  const y0 = rows.yOf(notes[a].step);
  const y1 = rows.yOf(notes[a + 1].step);
  const arrive = t(notes[a + 1].on);
  const dur = o.slideS ?? 0.08;
  const ev: SynthEvent[] = [{ t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: y0 }];
  for (let k = 1; k <= 4; k++) ev.push({ t: arrive - dur + (dur * k) / 4, k: 2, kind: "m", id: 1, x: 40, y: y0 + ((y1 - y0) * k) / 4 });
  const third = t(notes[a + 2].on);
  if (o.gapS !== undefined) ev.push({ t: third - o.gapS, k: 0, kind: "u", id: 1 });
  ev.push({ t: third, k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 2].step) });
  if (o.gapS === undefined) ev.push({ t: third + 0.02, k: 0, kind: "u", id: 1 });
  ev.push({ t: third + 0.5, k: 0, kind: "u", id: 2 });
  return ev;
};

test("D376: a slide on a keyboard strikes the next note (no bend), rings 110 ms into it, counts as joined; off: today's bend", () => {
  const off = run("harpsichordSampled", slidePlan({}), OFF);
  assert.ok(off.heard[0].glides.length === 1, "today: the harpsichord's string bent (the bug)");
  const on = run("harpsichordSampled", slidePlan({}), ON);
  const [a, b] = on.heard;
  assert.equal(a.glides.length, 0, "no bend");
  assert.ok(b && b.midi !== a.midi, "the next note struck");
  const ring = Math.round(((a.stop ?? 0) - b.at) * 1000);
  assert.ok(ring >= 105 && ring <= 115, `rings 110 ms: ${ring}`);
  const slid = notesOf(on.events).find((e) => e.slide);
  assert.ok(slid?.ok && slid.legato?.ok, "a slide's slur counts as joined");
  assert.ok(on.summary.legato > off.summary.legato, `${on.summary.legato} joined, today ${off.summary.legato}`);
  // The sound at arrival: the slide is judged where it sounds.
  assert.ok(Math.abs(slid!.offMs) < 40, `on time: ${slid!.offMs}`);
});

test("D376: the piano's slide-slur tapers the joins after it; a detach ends it", () => {
  const joined = run("pianoSampled", slidePlan({}), ON);
  const third = joined.heard[2];
  assert.equal(third.p.group, 2, "the third note in the slur");
  assert.ok((third.p.level ?? 1) < (joined.heard[0].p.level ?? 1), "lighter than the first (−2.5 dB)");
  const detached = run("pianoSampled", slidePlan({ gapS: 0.1 }), ON);
  assert.equal(detached.heard[2].p.group, undefined, "a detach: plain");
  // Off: the piano's slide bends nothing here either way: no group without a reading.
  assert.equal(run("pianoSampled", slidePlan({}), OFF).heard[2]?.p.group, undefined);
});

test("D376: a real gap is not joined and re-attacks on a sustaining sound; off: joined within 90 ms", () => {
  const gap = (mech: Record<string, unknown>) => {
    const r = run("vocalSynth", (notes, t, rows) => {
      const a = stepPair(notes);
      return [
        { t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
        { t: t(notes[a + 1].on) - 0.06, k: 0, kind: "u", id: 1 },
        { t: t(notes[a + 1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 1].step) },
        { t: t(notes[a + 1].on) + 0.3, k: 0, kind: "u", id: 2 },
      ];
    }, mech);
    return { legato: r.summary.legato, attack: r.heard[1].p.legato };
  };
  assert.deepEqual(gap(OFF), { legato: 1, attack: true });
  assert.deepEqual(gap(ON), { legato: 0, attack: false });
});

test("D376: strings re-bow and voices re-sing on two thumbs; a slide glides, timed by the slide", () => {
  // Two thumbs: the string's new bow stroke (legato: its bow change), the voice a soft new syllable.
  const strings = run("stringConsort", handover(0.02), ON).heard[1].p;
  assert.equal(strings.legato, true);
  const voice = run("vocalSynth", handover(0.02), ON).heard[1].p;
  assert.equal(voice.legato, false);
  assert.ok((voice.soft ?? 0) >= GLENN.rearticSoft);
  assert.equal(run("vocalSynth", handover(0.02), OFF).heard[1].p.legato, true, "off: today's joined voice");
  // A slide: one sound glides; its time constant from the slide (a quarter of its measured travel, 150–200 ms here: 38–50 ms; off: the sound's own).
  const slow = run("stringConsort", slidePlan({ slideS: 0.2 }), ON).heard[0].glides[0];
  assert.ok(slow && slow.tau !== undefined && slow.tau >= 0.03 && slow.tau <= 0.06, JSON.stringify(slow));
  const quick = run("chip", slidePlan({ slideS: 0.04 }), ON).heard[0].glides[0];
  assert.ok(quick && quick.tau !== undefined && quick.tau <= 0.015, JSON.stringify(quick));
  assert.equal(run("stringConsort", slidePlan({ slideS: 0.2 }), OFF).heard[0].glides[0]?.tau, undefined);
});

test("D376: MECH.glenn restored after a replay (the game's parameters untouched)", () => {
  withMech(OFF, () => assert.equal(MECH.glenn, false));
  assert.equal(MECH.glenn, true);
});
