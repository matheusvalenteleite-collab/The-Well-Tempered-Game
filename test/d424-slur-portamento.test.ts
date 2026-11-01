/**
 * D424, THE OWNER'S TOUCHES, EACH ITS OWN SOUND: on strings, voices and synths a SET-AND-RELEASE (the
 * pull-off, D334; a hold-over's resolution, D364) is the slur (the same bow, one vowel, the mono-synth
 * legato), a JOIN a new bow, a soft new syllable, a retrigger; a SLIDE a portamento that follows the
 * thumb (glenn.ts slidePitch) and lands on the note. Keyboards and the lute unchanged; the judge unchanged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLENN, joinedSound, SLIDE_TRACK_TAU, slidePitch, touchFamily } from "../src/bench/glenn.ts";
import { MECH } from "../src/bench/mechanics.ts";
import { replay } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { PRESETS, setPreset } from "../src/touch/sound.ts";
import { TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { lessonById } from "../src/bench/manual/lessons.ts";
import { gameFor } from "./d342-sim.ts";
import { synthEvents, type SynthEvent, type SynthNote } from "../tools/lab/lab-synth.ts";

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const ON = { glenn: true };

test("D424: the families: strings, voices, the chips and synths; keyboards and the lute none", () => {
  assert.equal(touchFamily("stringConsort"), "strings");
  assert.equal(touchFamily("soloVoices"), "voices");
  assert.equal(touchFamily("vocalSynth"), "voices");
  for (const id of ["chip", "gameboy", "super16", "nocturne32", "megaFm", "sid64", "tracker", "analog", "modular", "tomita"]) assert.equal(touchFamily(id), "synths", id);
  for (const id of ["pianoSampled", "harpsichordSampled", "chamberOrgan", "organSampled", "lute", "traverso"]) assert.equal(touchFamily(id), null, id);
  // Every offered preset with a touch family is placed: the sustaining ones in a family, the keyboards and the lute not.
  for (const p of PRESETS) {
    const kind = TOUCH_KINDS[p.id];
    if (!kind) continue;
    const keyboard = kind === "piano" || kind === "harpsichord" || kind === "organ";
    assert.equal(touchFamily(p.id) === null, keyboard, `${p.id} (${kind})`);
  }
});

test("D424: the sound by touch: set-and-release and slide the slur; a join a new bow, syllable or retrigger; a tap apart", () => {
  assert.deepEqual(joinedSound("strings", true, "set-release"), { legato: true, slur: true });
  assert.deepEqual(joinedSound("strings", true, "slide"), { legato: true, slur: true });
  assert.deepEqual(joinedSound("strings", true, "join"), { legato: true, slur: false }, "a new bow (Patch.bow)");
  assert.deepEqual(joinedSound("voices", true, "set-release"), { legato: true, slur: true });
  assert.deepEqual(joinedSound("synths", true, "set-release"), { legato: true, slur: true });
  assert.deepEqual(joinedSound("synths", true, "join"), { legato: false, slur: false }, "retriggered");
  for (const f of ["strings", "voices", "synths", null] as const) assert.deepEqual(joinedSound(f, false, "join"), { legato: false, slur: false });
  // Keyboards: the old rule (joined is legato).
  assert.deepEqual(joinedSound(null, true, "set-release"), { legato: true, slur: false });
  assert.deepEqual(joinedSound(null, true, "join"), { legato: true, slur: false });
});

test("D424: the slide's pitch from the thumb's height: dead near the departure, linear in semitones, the whole step at arrival", () => {
  // From 60 at y 200 to 62 at y 160 (up the screen): a 4 px dead zone, arrival within 3 px.
  const at = (y: number) => slidePitch(60, 62, 200, 160, y, 4, 3);
  assert.equal(at(200), 60);
  assert.equal(at(197), 60, "within the dead zone");
  assert.equal(at(210), 60, "the other way: nothing");
  assert.ok(Math.abs(at(179.5) - 61) < 1e-9, `half way (4 + 33 / 2 px on): ${at(179.5)}`);
  assert.equal(at(163), 62, "arrived (within the reach)");
  assert.equal(at(100), 62, "never past it");
  const ys = [196, 190, 184, 178, 172, 166];
  const ms = ys.map(at);
  assert.ok(ms.every((m, k) => k === 0 || m >= ms[k - 1]), "follows the thumb, monotone");
  // Downward and falling.
  assert.equal(slidePitch(67, 64, 100, 160, 160, 4, 3), 64);
  assert.ok(slidePitch(67, 64, 100, 160, 130, 4, 3) < 67 && slidePitch(67, 64, 100, 160, 130, 4, 3) > 64);
  assert.equal(slidePitch(60, 60, 0, 10, 5, 0, 0), 60);
  assert.ok(SLIDE_TRACK_TAU >= 0.015 && SLIDE_TRACK_TAU <= 0.025);
});

interface Heard {
  midi: number;
  at: number;
  p: Play;
  glides: { to: number; tau?: number }[];
}
function run(sound: string, plan: (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }) => SynthEvent[]) {
  setPreset(sound);
  const log = synthEvents(II18, 3, (notes, t, _r, rows) => plan(notes, t, rows));
  const heard: Heard[] = [];
  const r = replay(log, ON, (g, chip: Chip) => {
    const now = () => chip.ctx.currentTime;
    const mine = (midi: number, at: number) => g.tracks[0].notes.some((n) => n.midi === midi && Math.abs(g.timeAt(n.on) - at) < 0.35);
    (chip as { note: unknown }).note = (midi: number, at: number, _dur: number, _v: unknown, p: Play = {}) => {
      const h: Heard = { midi, at, p, glides: [] };
      if (at <= now() + 1e-6 && mine(midi, at)) heard.push(h);
      return { stop() {}, bend() {}, glide: (to: number, tau?: number) => void h.glides.push({ to, tau }), muffle() {}, dyn() {} };
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
/** JOIN: the left strikes note a, the right strikes a+1 on time, the left lifts 10 ms after. */
const join = (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  return [
    { t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[a].step) },
    { t: t(notes[a + 1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[a + 1].step) },
    { t: t(notes[a + 1].on) + 0.01, k: 0, kind: "u", id: 1 },
    { t: t(notes[a + 1].on) + 0.6, k: 0, kind: "u", id: 2 },
  ];
};
/** SET-AND-RELEASE: the right rests on a+1 a moment after a is struck (prepared), the left lifts on a+1's time: the pull-off. */
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
/** SLIDE: the left strikes a and travels to a+1's height in eight moves over `dur` s, arriving on its time. */
const slide = (dur: number) => (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  const y0 = rows.yOf(notes[a].step);
  const y1 = rows.yOf(notes[a + 1].step);
  const arrive = t(notes[a + 1].on);
  const ev: SynthEvent[] = [{ t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: y0 }];
  for (let k = 1; k <= 8; k++) ev.push({ t: arrive - dur + (dur * k) / 8, k: 2, kind: "m", id: 1, x: 40, y: y0 + ((y1 - y0) * k) / 8 });
  ev.push({ t: arrive + 0.5, k: 0, kind: "u", id: 1 });
  return ev;
};

test("D424: a pull-off is the slur on strings, voices and synths; a join is not", () => {
  assert.equal(MECH.glenn, true);
  const second = (sound: string, plan: typeof join) => {
    const r = run(sound, plan);
    const ev = notesOf(r.events);
    assert.ok(ev[1]?.ok, `${sound}: the second note right`);
    return { p: r.heard[1].p, ev };
  };
  // STRINGS: the pull-off the same bow (legato, a slur: no Patch.bow stroke); the join a new bow (legato, no slur).
  const sPull = second("stringConsort", setRelease);
  assert.equal(sPull.ev[1].gesture, "pull-off");
  assert.deepEqual([sPull.p.legato, sPull.p.slur], [true, true]);
  const sJoin = second("stringConsort", join).p;
  assert.deepEqual([sJoin.legato, sJoin.slur], [true, undefined]);
  // VOICES: the pull-off on one vowel (legato, no new syllable); the join a soft new syllable.
  for (const v of ["vocalSynth", "soloVoices"]) {
    const pull = second(v, setRelease).p;
    assert.deepEqual([pull.legato, pull.slur], [true, true], v);
    assert.ok((pull.soft ?? 0) < GLENN.rearticSoft, `${v}: no new onset`);
    const j = second(v, join).p;
    assert.equal(j.legato, false, v);
    assert.ok((j.soft ?? 0) >= GLENN.rearticSoft, `${v}: a soft new syllable`);
  }
  // SYNTHS: the pull-off the mono-synth legato (no retrigger); the join retriggered.
  for (const c of ["chip", "megaFm", "super16", "tomita"]) {
    const pull = second(c, setRelease).p;
    assert.deepEqual([pull.legato, pull.slur], [true, true], c);
    assert.equal(second(c, join).p.legato, false, `${c}: retriggered`);
  }
  // The judge unchanged: the same verdicts and times whatever the sound.
  const key = (ev: Extract<LabEvent, { kind: "note" }>[]) => ev.map((e) => `${e.i}:${e.ok}:${Math.round(e.offMs)}:${e.legato?.ok}`).join(" ");
  assert.equal(key(second("chip", setRelease).ev), key(sPull.ev));
  assert.equal(key(second("pianoSampled", setRelease).ev), key(sPull.ev));
});

test("D424: keyboards and the lute unchanged: a pull-off and a join sound alike (joined, no slur)", () => {
  for (const k of ["harpsichordSampled", "lute", "chamberOrgan"]) {
    const pull = run(k, setRelease).heard[1].p;
    const j = run(k, join).heard[1].p;
    assert.equal(pull.slur, undefined, k);
    assert.equal(pull.legato, j.legato, k);
    assert.equal(pull.legato, true, k);
  }
});

test("D424: a slide's portamento follows the thumb on strings, voices and synths, landing on the note; keyboards strike", () => {
  for (const sound of ["stringConsort", "vocalSynth", "chip"]) {
    for (const dur of [0.08, 0.3]) {
      const r = run(sound, slide(dur));
      const [a] = r.heard;
      const ev = notesOf(r.events);
      assert.ok(ev[1]?.ok && ev[1].slide, `${sound}: the slide arrived, judged`);
      const to = r.heard.length > 1 ? r.heard[1].midi : undefined;
      assert.equal(to, undefined, `${sound}: no new note struck`);
      const gs = a.glides;
      assert.ok(gs.length >= 3, `${sound} ${dur}: followed (${gs.length} steps)`);
      assert.ok(gs.every((g) => g.tau === SLIDE_TRACK_TAU));
      const dir = Math.sign(gs.at(-1)!.to - a.midi);
      assert.ok(gs.every((g, k) => k === 0 || dir * (g.to - gs[k - 1].to) >= -1e-9), `${sound}: monotone`);
      assert.ok(gs.some((g) => !Number.isInteger(g.to)), `${sound}: between the notes`);
      assert.ok(Number.isInteger(gs.at(-1)!.to) && gs.at(-1)!.to !== a.midi, `${sound}: landed on the note`);
    }
  }
  // A keyboard: no bend (D376), the next note struck.
  const kb = run("harpsichordSampled", slide(0.3));
  assert.equal(kb.heard[0].glides.length, 0);
  assert.ok(kb.heard[1] && kb.heard[1].midi !== kb.heard[0].midi);
});

test("D424: Herr Bach's demonstrations drive it: \"prepared\" (3.4) sounds its pull-offs slurred, coach \"slide\" (6.6) follows on the strings", () => {
  const demo = (sound: string, lesson: string) => {
    setPreset(sound);
    const st = lessonById(lesson)!.stages[0];
    const clock = { t: 0 };
    const { g } = gameFor(st.m, clock, st.style ?? "plain");
    const heard: { p: Play; glides: number[] }[] = [];
    (g as unknown as { chip: { note: unknown } }).chip.note = (_m: number, _at: number, _d: number, _v: unknown, p: Play = {}) => {
      const h = { p, glides: [] as number[] };
      if (p.lead) heard.push(h);
      return { stop() {}, bend() {}, glide: (to: number) => void h.glides.push(to), muffle() {}, dyn() {} };
    };
    let done = false;
    while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
    setPreset("chip");
    return heard;
  };
  const prepared = demo("stringConsort", "3.4");
  assert.ok(prepared.filter((h) => h.p.slur && h.p.legato).length >= 1, "the pull-off slurred");
  assert.equal(demo("pianoSampled", "3.4").filter((h) => h.p.slur).length, 0, "the piano unchanged");
  const slid = demo("stringConsort", "6.6");
  assert.ok(slid.some((h) => h.glides.length > 0), "the slide's portamento");
});
