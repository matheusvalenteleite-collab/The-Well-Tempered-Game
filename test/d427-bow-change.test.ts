/**
 * D427, THE BOW CHANGE AGAINST THE SLUR (STRING CONSORT; the bowed strings with Patch.bow): a two-thumb
 * JOIN, HANDOFF or OVERLAP a bow change (the note given way to stops quickly at the change, the new
 * stroke bites after a still moment, with a small accent: a short dip between the notes); a
 * SET-AND-RELEASE (and a hold-over's release) a slur (the note given way to held to the onset and
 * crossed into the next, near equal power). TAP, voices, synths, keyboards and the lute unchanged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { bowEntry, giveWayFall, setPreset, STRING_BOW, STRING_BOW_CHANGE, STRING_SLUR, PATCHES, type BowEntry, type GiveWay } from "../src/touch/sound.ts";
import { MECH } from "../src/bench/mechanics.ts";
import { replay } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { synthEvents, type SynthEvent, type SynthNote } from "../tools/lab/lab-synth.ts";

test("D427: the entry by join: the player's bow change bites, the band's as D358, a slur past the attack; else none", () => {
  const bow = STRING_BOW;
  const c = STRING_BOW_CHANGE;
  assert.deepEqual(bowEntry(bow, { legato: true, lead: true }), { skip: c.skip, still: c.still, floor: c.floor, a: c.a, accentDb: c.accentDb, accentS: c.accentS });
  assert.deepEqual(bowEntry(bow, { legato: true }), { skip: bow.skip, still: 0, floor: 0, a: bow.a, accentDb: 0, accentS: 0 }, "the band's joined note: D358 unchanged");
  const slur = bowEntry(bow, { legato: true, slur: true, lead: true })!;
  assert.equal(slur.skip, 0.25, "past the attack (D424)");
  assert.equal(slur.a, STRING_SLUR.a);
  assert.equal(slur.still + slur.accentDb, 0, "no still moment, no accent");
  // A TAP, a pluck, a patch with no bow: none (as before).
  assert.equal(bowEntry(bow, { legato: false, lead: true }), null);
  assert.equal(bowEntry(bow, { legato: true, lead: true }, true), null);
  assert.equal(bowEntry(undefined, { legato: true, lead: true }), null);
  // The consort's patches carry the bow.
  for (const k of ["consViolin", "consViola", "consCello"] as const) assert.equal(PATCHES[k].bow, STRING_BOW, k);
});

test("D427: the constants in the owner's ranges", () => {
  const c = STRING_BOW_CHANGE;
  assert.ok(c.skip >= 0.015 && c.skip <= 0.025, "entered 15-25 ms after the onset");
  assert.ok(c.a >= 0.01 && c.a <= 0.015, "a fast rise");
  assert.ok(c.accentDb >= 1 && c.accentDb <= 1.5 && c.accentS >= 0.08 && c.accentS <= 0.12, "a small accent, over ~100 ms");
  assert.ok(c.out >= 0.025 && c.out <= 0.035, "the note given way to out in 25-35 ms");
  const s = STRING_SLUR;
  assert.ok(s.out >= 0.04 && s.out <= 0.06 && s.a >= 0.04 && s.a <= 0.05);
  const bowFall = giveWayFall("bow");
  assert.ok(Math.abs(Math.exp(-c.out / bowFall.tau) - 0.01) < 0.002, "-40 dB by `out`");
  const slurFall = giveWayFall("slur");
  assert.equal(slurFall.tau, 0);
  assert.deepEqual(slurFall.points.at(-1), [s.out, 0], "silent by `out`");
  assert.ok(slurFall.points.every(([dt]) => dt > 0), "held to the onset, then falling");
});

/** The level (dB) of the two notes' sum (uncorrelated: powers add), the envelopes as chip.ts schedules them. */
function sumDb(how: GiveWay, e: BowEntry, x: number): number {
  const f = giveWayFall(how);
  let old: number;
  if (f.tau) old = Math.exp(-x / f.tau);
  else {
    let [t0, v0] = [0, 1];
    old = 0;
    for (const [t1, v1] of f.points) {
      if (x <= t1) {
        old = v0 + ((v1 - v0) * (x - t0)) / (t1 - t0);
        break;
      }
      [t0, v0] = [t1, v1];
    }
  }
  const acc = 10 ** (e.accentDb / 20);
  const nu = e.still ? (x < 0.003 ? (e.floor * x) / 0.003 : x < e.still ? e.floor : x < e.still + e.a ? e.floor + ((acc - e.floor) * (x - e.still)) / e.a : 1 + (acc - 1) * Math.exp(-(x - e.still - e.a) / (e.accentS / 3))) : Math.min(1, x / e.a);
  return 10 * Math.log10(old * old + nu * nu);
}
test("D427: modelled, the bow change dips 6 dB or more for 10-40 ms, the slur 2 dB at most", () => {
  const xs = Array.from({ length: 120 }, (_, k) => k * 0.0005);
  const bow = xs.map((x) => sumDb("bow", bowEntry(STRING_BOW, { legato: true, lead: true })!, x));
  const slur = xs.map((x) => sumDb("slur", bowEntry(STRING_BOW, { legato: true, slur: true, lead: true })!, x));
  assert.ok(Math.min(...bow) <= -6, `bow change: ${Math.min(...bow).toFixed(1)} dB`);
  const under = bow.filter((d) => d < -6).length * 0.5;
  assert.ok(under >= 10 && under <= 40, `bow change under -6 dB for ${under} ms`);
  assert.ok(Math.max(...bow.slice(-20)) <= 1.6, "the accent small");
  assert.ok(Math.min(...slur) >= -2, `slur: ${Math.min(...slur).toFixed(1)} dB`);
  assert.ok(Math.max(...slur) <= 2, `slur, no bump: ${Math.max(...slur).toFixed(1)} dB`);
});

// ---- The game: which stop each touch gives the note it gives way to. ----
const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
interface Heard {
  midi: number;
  at: number;
  p: Play;
  stops: { at?: number; how?: GiveWay; now: number }[];
}
function run(sound: string, plan: (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }) => SynthEvent[]) {
  setPreset(sound);
  const log = synthEvents(II18, 3, (notes, t, _r, rows) => plan(notes, t, rows));
  const heard: Heard[] = [];
  const r = replay(log, { glenn: true }, (g, chip: Chip) => {
    const now = () => chip.ctx.currentTime;
    const mine = (midi: number, at: number) => g.tracks[0].notes.some((n) => n.midi === midi && Math.abs(g.timeAt(n.on) - at) < 0.35);
    (chip as { note: unknown }).note = (midi: number, at: number, _dur: number, _v: unknown, p: Play = {}) => {
      const h: Heard = { midi, at, p, stops: [] };
      if (at <= now() + 1e-6 && mine(midi, at)) heard.push(h);
      return { stop: (when?: number, how?: GiveWay) => void h.stops.push({ at: when, how, now: now() }), bend() {}, glide() {}, muffle() {}, dyn() {} };
    };
  });
  setPreset("chip");
  return { heard, events: r.events };
}
const notesOf = (ev: LabEvent[]) => ev.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note");
function stepPair(notes: SynthNote[]): number {
  for (let i = 0; i + 2 < notes.length; i++) if (Math.abs(notes[i].step - notes[i + 1].step) >= 2 && notes[i + 1].step !== notes[i + 2].step && notes[i + 1].on - notes[i].on <= notes[i].dur) return i;
  throw new Error("no pair");
}
const join = (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  return [
    { t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
    { t: t(notes[a + 1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 1].step) },
    { t: t(notes[a + 1].on) + 0.01, k: 0, kind: "u", id: 1 },
    { t: t(notes[a + 1].on) + 0.6, k: 0, kind: "u", id: 2 },
  ];
};
const setRelease = (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  const on0 = t(notes[a].on);
  const on1 = t(notes[a + 1].on);
  return [
    { t: on0, k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
    { t: on0 + (on1 - on0) / 20, k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 1].step) },
    { t: on1, k: 0, kind: "u", id: 1 },
    { t: on1 + 0.6, k: 0, kind: "u", id: 2 },
  ];
};

test("D427: on STRING CONSORT a join gives way as a bow change at the onset, a pull-off as a slur; the judge unchanged", () => {
  assert.equal(MECH.glenn, true);
  const j = run("stringConsort", join);
  const first = j.heard[0].stops[0];
  assert.equal(first.how, "bow");
  assert.ok(Math.abs((first.at ?? first.now) - j.heard[1].at) < 0.005, "stopped at the new note's onset, not 30 ms on");
  assert.deepEqual([j.heard[1].p.legato, j.heard[1].p.slur], [true, undefined], "a new bow");
  const s = run("stringConsort", setRelease);
  assert.equal(notesOf(s.events)[1].gesture, "pull-off");
  assert.equal(s.heard[0].stops[0].how, "slur");
  assert.equal(s.heard[1].p.slur, true);
  // The verdicts alike whatever the sound (loudness never tied to right or wrong).
  const key = (ev: LabEvent[]) => notesOf(ev).map((e) => `${e.i}:${e.ok}:${Math.round(e.offMs)}`).join(" ");
  assert.equal(key(run("chip", join).events), key(j.events));
  assert.equal(key(run("chip", setRelease).events), key(s.events));
});

test("D427: keyboards and the lute give way as before (no bow change, no slur)", () => {
  for (const k of ["harpsichordSampled", "lute", "pianoSampled"]) {
    for (const plan of [join, setRelease]) {
      const r = run(k, plan);
      assert.ok(r.heard[0].stops.every((x) => x.how === undefined), `${k}`);
    }
  }
});
