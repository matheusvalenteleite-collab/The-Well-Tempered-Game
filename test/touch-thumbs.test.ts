import { test } from "node:test";
import assert from "node:assert/strict";
import { onSide, sideOf, touchDown, touchMove, touchUp, type Touches } from "../src/touch/thumbs.ts";
import { FUGUE, pitchRange } from "../src/touch/fugue.ts";

test("a touch takes the half where it lands", () => {
  assert.equal(sideOf(10, 390), "left");
  assert.equal(sideOf(194, 390), "left");
  assert.equal(sideOf(195, 390), "right");
});

test("a thumb keeps its half when it slides across the midline", () => {
  let s: Touches = new Map();
  s = touchDown(s, 1, 100, 50, 390, 0);
  s = touchMove(s, 1, 300, 60);
  assert.equal(s.get(1)!.side, "left");
  assert.deepEqual([s.get(1)!.x, s.get(1)!.y], [300, 60]);
});

test("two thumbs at once, one per half", () => {
  let s: Touches = new Map();
  s = touchDown(s, 1, 60, 200, 390, 0);
  s = touchDown(s, 2, 330, 210, 390, 5);
  assert.equal(onSide(s, "left").length, 1);
  assert.equal(onSide(s, "right").length, 1);
  s = touchUp(s, 1);
  assert.equal(onSide(s, "left").length, 0);
  assert.equal(onSide(s, "right").length, 1);
});

test("the C minor fugue is in three voices, 31 bars", () => {
  assert.equal(FUGUE.voices.length, 3);
  assert.equal(FUGUE.bars.length, 31);
  const { lo, hi } = pitchRange(FUGUE);
  assert.ok(lo >= 36 && hi <= 84, `range ${lo}-${hi}`);
});

import { markRides, options, points, release, strike, sweep } from "../src/touch/lanes.ts";
import { level, duoOpen, recordKey, sectionNotes } from "../src/touch/voice-mode.ts";
import { Game, prepare } from "../src/touch/engine.ts";
import { place, reaches, REACH } from "../src/touch/targets.ts";
import { lagFrom } from "../src/touch/sync.ts";
import type { Chip } from "../src/touch/chip.ts";

const opt = options(FUGUE.tpq, 60, "normal");

/** A chip with a clock the test moves by hand, and a log of the notes it sounds. */
function fakeChip() {
  const clock = { t: 0 };
  const sounded: { midi: number; voice: number }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; }, outputLatency: 0, baseLatency: 0, state: "running" },
    heard: () => clock.t,
    note: (midi: number, _at: number, _dur: number, voice = 1) => (sounded.push({ midi, voice }), { stop: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  return { chip, clock, sounded };
}

test("the eight entries of the subject: alto, soprano, bass in the exposition", () => {
  assert.equal(FUGUE.entries.length, 8);
  assert.deepEqual(FUGUE.entries.slice(0, 3).map((e) => [e.voice, e.bar, e.form, e.key]), [
    [1, 1, "subject", "c"],
    [0, 3, "answer", "g"],
    [2, 7, "subject", "c"],
  ]);
  assert.equal(FUGUE.entries[3].key, "Eb");
});

test("the exposition, voice by voice: the alto from bar 1, the soprano from 3, the bass from 7", () => {
  const [s, a, b] = [0, 1, 2].map((v) => level(FUGUE, 0, v));
  assert.equal(a.notes[0].midi, 72); // C5, the subject's first note
  assert.ok(s.first === FUGUE.bars[2].on + FUGUE.tpq / 2);
  assert.ok(b.first === FUGUE.bars[6].on + FUGUE.tpq / 2);
});

test("six sections cover the fugue, every voice sounding in each", () => {
  assert.equal(FUGUE.sections.length, 6);
  assert.equal(FUGUE.sections[0].toBar, 9);
  assert.equal(FUGUE.sections.at(-1)!.to, FUGUE.length);
  for (let s = 0; s < 6; s++) for (let v = 0; v < 3; v++) assert.ok(sectionNotes(FUGUE, s, v).length > 0, `section ${s} voice ${v}`);
});

test("EASY: the first note is tapped, the sixteenths after a tapped note ride along", () => {
  const lv = level(FUGUE, 0, 1);
  markRides(lv.notes, FUGUE.tpq);
  // C5 (first, tapped) B4 (rides on it) C5 G4 Ab4 (eighths, tapped) C5 B4 (ride on the A flat).
  assert.deepEqual(lv.notes.slice(0, 7).map((n) => !!n.ride), [false, true, false, false, false, true, true]);
});

test("EASY targets alternate thumbs square by square; the riding notes lie on the path between", () => {
  const lv = level(FUGUE, 0, 1);
  prepare(FUGUE, [lv], "easy");
  const squares = lv.notes.filter((n) => !n.ride);
  for (let i = 0; i + 1 < squares.length; i++) if (squares[i].on !== squares[i + 1].on) assert.notEqual(squares[i].x! < 0.5, squares[i + 1].x! < 0.5);
  const [c, b, c2] = lv.notes;
  assert.ok(b.ride && Math.min(c.x!, c2.x!) <= b.x! && b.x! <= Math.max(c.x!, c2.x!));
});

test("targets: one voice alternates the halves; higher notes stand higher within a bar", () => {
  const lv = level(FUGUE, 0, 1);
  place(lv.notes, "both", FUGUE.tpq * 4);
  assert.ok(lv.notes[0].x! < 0.5 && lv.notes[1].x! > 0.5 && lv.notes[2].x! < 0.5);
  // C5 then B4 then C5 then G4: the B and the G below the Cs (smaller y is higher).
  const [c, b, c2, g] = lv.notes.slice(0, 4).map((n) => n.y!);
  assert.ok(b > c && c2 === c && g > b);
  for (const n of lv.notes) assert.ok(n.y! >= 0.14 && n.y! <= 0.86);
});

test("NORMAL: a tap reaches a square within REACH pixels", () => {
  const lv = level(FUGUE, 0, 1);
  place(lv.notes, "both", FUGUE.tpq * 4);
  const n = lv.notes[0];
  const [w, h] = [390, 400];
  assert.ok(reaches(n, n.x! * w + REACH - 5, n.y! * h, w, h));
  assert.ok(!reaches(n, n.x! * w + REACH + 5, n.y! * h, w, h));
});

test("a tap on time plays the note once; a long note let go at once scores half; untapped notes miss", () => {
  const lv = level(FUGUE, 0, 1);
  assert.equal(strike(lv.notes, lv.notes[0].on + 10, opt), 0);
  assert.equal(lv.notes[0].state, "hit");
  const i = lv.notes.findIndex((n) => n.long);
  strike(lv.notes, lv.notes[i].on, opt, (j) => j === i);
  release(lv.notes, i, lv.notes[i].on + 50);
  sweep(lv.notes, lv.end, opt);
  assert.equal(points(lv.notes, opt).got, 1.5);
});

test("a chord within a voice is struck whole by one tap (the bass's octave C at bar 29)", () => {
  const lv = level(FUGUE, 5, 2);
  const i = lv.notes.findIndex((n, j) => j > 0 && lv.notes[j - 1].on === n.on) - 1;
  assert.ok(i >= 0);
  strike(lv.notes, lv.notes[i].on, opt);
  assert.equal(lv.notes[i].state, "hit");
  assert.equal(lv.notes[i + 1].state, "hit");
});

test("two voices open once each is earned alone, at that level, in that section", () => {
  const best = { [recordKey(0, [1], "easy")]: 85, [recordKey(0, [0], "easy")]: 79 };
  assert.equal(duoOpen(best, 0, [0, 1], "easy"), false);
  best[recordKey(0, [0], "easy")] = 80;
  assert.equal(duoOpen(best, 0, [1, 0], "easy"), true);
  assert.equal(duoOpen(best, 0, [0, 1], "normal"), false);
  assert.equal(duoOpen(best, 1, [0, 1], "easy"), false);
});

test("the sync: the median lag of the taps, outliers left out", () => {
  const clicks = [0, 0.667, 1.333, 2, 2.667, 3.333, 4];
  assert.equal(lagFrom(clicks, clicks.map((c) => c + 0.04)), 40);
  assert.equal(lagFrom(clicks, [...clicks.slice(1).map((c) => c - 0.02), 1.0]), -20);
  assert.equal(lagFrom(clicks, [0.01, 0.7]), null);
});

/** Plays a level through the engine: every note to tap, tapped on time on its square (or not at all). */
function playThrough(g: Game, tap: boolean) {
  const [w, h] = [390, 400];
  const all = g.tracks.flatMap((t, k) => t.lv.notes.map((n, i) => ({ n, i, k, side: t.sides[0] })));
  const taps = all.filter(({ n, i, k }) => !n.ride && (i === 0 || g.tracks[k].lv.notes[i - 1].on !== n.on)).sort((a, b) => a.n.on - b.n.on);
  return { taps, w, h };
}

test("EASY, a full section: every main note tapped on time scores everything, and the rides sound", () => {
  const { chip, clock, sounded } = fakeChip();
  const lv = level(FUGUE, 0, 1);
  const g = new Game(FUGUE, [lv], "easy", 60, chip);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  const { taps } = playThrough(g, true);
  let id = 0;
  for (const { n } of taps) {
    clock.t = at(n.on);
    g.step();
    g.down(++id, id % 2 ? "left" : "right", 0, 0, 390, 400, performance.now());
    if (n.long) clock.t = at(n.on + n.dur * 0.9);
    g.up(id, performance.now());
  }
  clock.t = at(g.end + 1);
  assert.equal(g.step(), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
  assert.ok(r.of < lv.notes.length, "fewer notes to tap than notes");
  assert.equal(sounded.length, lv.notes.length, "every note sounded, the rides too");
});

test("NORMAL: a tap far from the square plays nothing", () => {
  const { chip, clock, sounded } = fakeChip();
  const lv = level(FUGUE, 0, 1);
  const g = new Game(FUGUE, [lv], "normal", 60, chip);
  const n = lv.notes[0];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  const far = n.x! < 0.5 ? 380 : 10;
  g.down(1, "right", far, 395, 390, 400, performance.now());
  assert.equal(sounded.length, 0);
  g.down(2, "left", n.x! * 390, n.y! * 400, 390, 400, performance.now());
  assert.deepEqual(sounded, [{ midi: n.midi, voice: 1 }]);
});

test("two voices: the left thumb plays the lower voice, the right the higher, each sounding its own", () => {
  const { chip, clock, sounded } = fakeChip();
  const lvA = level(FUGUE, 0, 1);
  const lvS = level(FUGUE, 0, 0);
  const g = new Game(FUGUE, [lvS, lvA], "easy", 60, chip);
  assert.deepEqual(g.tracks.map((t) => [t.lv.voice, t.sides.join()]), [
    [1, "left"],
    [0, "right"],
  ]);
  for (const n of lvA.notes) assert.ok(n.x! < 0.5);
  for (const n of lvS.notes) assert.ok(n.x! > 0.5);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  clock.t = at(lvA.notes[0].on);
  g.step();
  g.down(1, "left", 50, 200, 390, 400, performance.now());
  g.up(1, performance.now());
  clock.t = at(lvS.notes[0].on);
  g.step();
  g.down(2, "right", 300, 200, 390, 400, performance.now());
  assert.deepEqual(sounded.filter((x) => x.voice === 0), [{ midi: lvS.notes[0].midi, voice: 0 }]);
  assert.equal(sounded[0].voice, 1);
  assert.equal(g.grade?.text, "PERFECT");
});

test("prepare marks no rides in NORMAL", () => {
  const lv = level(FUGUE, 0, 1);
  prepare(FUGUE, [lv], "normal");
  assert.ok(lv.notes.every((n) => !n.ride));
});
