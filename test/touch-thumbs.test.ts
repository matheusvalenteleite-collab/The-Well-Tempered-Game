import { test } from "node:test";
import assert from "node:assert/strict";
import { onSide, sideOf, touchDown, touchMove, touchUp, type Touches } from "../src/touch/thumbs.ts";
import { FUGUES, PIECES, PRELUDES, beatOf, fugueById, keyAt, stepName } from "../src/touch/fugue.ts";
import { markRides, options, points, release, strike, sweep } from "../src/touch/lanes.ts";
import { accompaniment, level, startTick, stepRange, voicesFrom } from "../src/touch/voice-mode.ts";
import { Game, KEYS_SHARE, prepare, type Contact, type GameOptions } from "../src/touch/engine.ts";
import { isBlack, keyAt as keyUnder, keyboard, keySpan } from "../src/touch/piano.ts";
import { bandOf, fits, markShapes, sideFor } from "../src/touch/shape.ts";
import { lagOf, offsetOf } from "../src/touch/lag.ts";
import type { LaneNote } from "../src/touch/lanes.ts";
import type { Chip } from "../src/touch/chip.ts";

const C_MINOR = fugueById("wtc1f02");
const beat = beatOf(C_MINOR).ticks;
const opt = options(beat, 60, "normal");

/** A chip with a clock the test moves by hand, and a log of the notes it sounds. */
function fakeChip() {
  const clock = { t: 0 };
  const sounded: { midi: number; gain: number; at: number }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; }, outputLatency: 0, baseLatency: 0, state: "running" },
    heard: () => clock.t,
    note: (midi: number, at: number, _dur: number, v: { gain: number }) => (sounded.push({ midi, gain: v.gain, at }), { stop: () => {}, bend: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  return { chip, clock, sounded };
}
const gameOptions = (o: Partial<GameOptions> = {}): GameOptions => ({ difficulty: "easy", bpm: 60, ...o });

test("a touch takes the half where it lands and keeps it when it slides", () => {
  assert.equal(sideOf(10, 390), "left");
  assert.equal(sideOf(195, 390), "right");
  let s: Touches = new Map();
  s = touchDown(s, 1, 100, 50, 390, 0);
  s = touchMove(s, 1, 300, 60);
  assert.equal(s.get(1)!.side, "left");
  s = touchDown(s, 2, 330, 210, 390, 5);
  assert.equal(onSide(s, "right").length, 1);
  s = touchUp(s, 1);
  assert.equal(onSide(s, "left").length, 0);
});

test("the pieces: the 48 preludes and 48 fugues in the book's order, then Contrapunctus XIV", () => {
  assert.equal(PIECES.length, 97);
  assert.equal(FUGUES.length, 49);
  assert.equal(PRELUDES.length, 48);
  assert.deepEqual(PIECES.slice(0, 4).map((p) => p.id), ["wtc1p01", "wtc1f01", "wtc1p02", "wtc1f02"]);
  const cp = PIECES.at(-1)!;
  assert.equal(cp.id, "bwv1080-14");
  assert.equal(cp.book, 0);
  assert.deepEqual(cp.voiceNames, ["Soprano", "Alto", "Tenor", "Bass"]);
  assert.equal(cp.bars.length, 239);
  const mean = (v: number[][]) => v.reduce((t, n) => t + n[2], 0) / v.length;
  for (let i = 0; i + 1 < cp.voices.length; i++) assert.ok(mean(cp.voices[i]) > mean(cp.voices[i + 1]), "the voices from the top down");
  // The first subject enters in the bass (D3, bar 1).
  assert.equal(cp.voices[3][0][2], 50);
});

test("the C minor fugue keeps its hand-read keys", () => {
  assert.deepEqual(C_MINOR.entries.map((e) => e.key), ["c", "g", "c", "Eb", "g", "c", "c", "c"]);
  assert.equal(C_MINOR.voiceNames.join(), "Soprano,Alto,Bass");
});

test("the beat: a quarter in 4/4, a dotted quarter in 6/8, a dotted eighth in 12/16", () => {
  const by = (m: string) => PIECES.find((f) => f.meter === m);
  assert.deepEqual(beatOf(C_MINOR), { ticks: C_MINOR.tpq, perBar: 4 });
  const six8 = by("6/8");
  if (six8) assert.deepEqual(beatOf(six8), { ticks: six8.tpq * 1.5, perBar: 2 });
  const twelve16 = by("12/16");
  if (twelve16) assert.deepEqual(beatOf(twelve16), { ticks: twelve16.tpq * 0.75, perBar: 4 });
});

test("staff steps: the alto's C5 is step 35", () => {
  const lv = level(C_MINOR, 1, 0);
  assert.equal(lv.notes[0].midi, 72);
  assert.equal(lv.notes[0].step, 35);
  assert.equal(stepName(35), "C5");
});

test("the Synth's shapes: the subject's C B C G A♭ is free, down a step, up a step, down a leap, up a step", () => {
  const lv = level(C_MINOR, 1, 0);
  prepare(C_MINOR, [lv], "normal");
  assert.deepEqual(lv.notes.slice(0, 5).map((n) => [n.dir, n.size]), [[0, -1], [-1, 1], [1, 1], [-1, 3], [1, 1]]);
  assert.equal(sideFor(lv.notes[1]), "left");
  assert.equal(sideFor(lv.notes[2]), "right");
  assert.equal(bandOf(0, 1), 1, "C to C sharp is a step");
  // NORMAL: the band, or near it; EASY: the side only.
  const n = lv.notes[3];
  assert.ok(fits(n, "left", 0.1, true) && !fits(n, "left", 0.9, true) && fits(n, "left", 0.9, false) && !fits(n, "right", 0.1, false));
});

test("EASY's shape is that of the notes tapped: a riding note is passed over", () => {
  const notes: LaneNote[] = [60, 62, 64, 59].map((midi, i) => ({ on: i * 100, dur: 100, midi, step: [35, 36, 37, 34][i], long: false, state: "pending", ride: i === 1 || i === 2 }));
  markShapes(notes);
  assert.deepEqual([notes[3].dir, notes[3].size], [-1, 1]);
});

test("the Piano's keys: the voice's range, white keys at the ends, a black key above its whites", () => {
  const kb = keyboard([60, 72]);
  assert.deepEqual(kb, { lo: 59, hi: 76, whites: 11 });
  for (const m of [59, 60, 61, 63, 66, 72, 73, 76]) {
    const [a, b] = keySpan(kb, m);
    assert.equal(keyUnder(kb, (a + b) / 2, false), m);
  }
  const [a, b] = keySpan(kb, 61);
  assert.equal(keyUnder(kb, (a + b) / 2, true), 62, "below the black keys, the white key");
});

test("the sound's delay by tapping along: the median of the taps' lateness, early taps allowed", () => {
  const o = offsetOf(10 + 3 * 0.75 + 0.2, 10)!;
  assert.ok(o.click === 3 && Math.abs(o.off - 0.2) < 1e-9);
  assert.equal(offsetOf(10 + 3 * 0.75 - 0.05, 10)!.click, 3);
  assert.equal(lagOf([0.2, 0.21, 0.19, 0.22, 0.2]), null);
  assert.ok(Math.abs(lagOf([0.2, 0.21, 0.19, 0.22, 0.2, 0.18, 0.25])!.lag - 0.2) < 0.011);
});

test("where to start: a share of the piece, back to its bar; the voices still singing from there", () => {
  assert.equal(startTick(C_MINOR, 0), 0);
  const mid = startTick(C_MINOR, 0.5);
  assert.ok(C_MINOR.bars.some((b) => b.on === mid) && mid <= C_MINOR.length / 2);
  assert.deepEqual(voicesFrom(C_MINOR, 0), [0, 1, 2]);
  const lv = level(C_MINOR, 0, mid);
  assert.equal(lv.start, mid - 4 * beat);
  assert.equal(lv.end, C_MINOR.length + beat);
  assert.ok(lv.notes.every((n) => n.on >= mid));
});

test("the music box's ladder: the piece's whole range, the voices in their places", () => {
  const r = stepRange(C_MINOR);
  assert.ok(r.lo <= Math.min(...C_MINOR.voices[2].map((n) => n[3])) && r.hi >= Math.max(...C_MINOR.voices[0].map((n) => n[3])));
});

test("EASY: the first note is tapped, the sixteenths after a tapped note ride along", () => {
  const lv = level(C_MINOR, 1, 0);
  markRides(lv.notes, beat);
  // C5 (first, tapped) B4 (rides on it) C5 G4 Ab4 (eighths, tapped) C5 B4 (ride on the A flat).
  assert.deepEqual(lv.notes.slice(0, 7).map((n) => !!n.ride), [false, true, false, false, false, true, true]);
});

test("a tap on time plays the note once; a long note let go at once scores half; untapped notes miss", () => {
  const lv = level(C_MINOR, 1, 0);
  assert.equal(strike(lv.notes, lv.notes[0].on + 10, opt), 0);
  assert.equal(lv.notes[0].state, "hit");
  const i = lv.notes.findIndex((n) => n.long);
  strike(lv.notes, lv.notes[i].on, opt, (j) => j === i);
  release(lv.notes, i, lv.notes[i].on + 50);
  sweep(lv.notes, lv.end, opt);
  assert.equal(points(lv.notes, opt).got, 1.5);
});

/** Where a thumb plays a note: the Synth's side and band, the Piano's key. */
function contact(g: Game, n: LaneNote): Contact {
  const [w, h] = [390, 400];
  if (g.instrument === "piano") {
    const [a, b] = keySpan(g.kb, n.midi);
    return { side: "left", x: ((a + b) / 2) * w, y: isBlack(n.midi) ? h * (1 - KEYS_SHARE) + 5 : h - 4, w, h };
  }
  const side = sideFor(n) ?? "left";
  const band = n.size !== undefined && n.size >= 0 ? n.size : 0;
  return { side, x: side === "left" ? 50 : 300, y: h - (band + 0.5) * (h / 4), w, h };
}

/** Plays every note to tap of a game, on time, as the instrument wants, each held as long as it needs; returns the game's end. */
function playAll(g: Game, clock: { t: number }) {
  const at = (tick: number) => g.timeAt(tick);
  type Ev = { t: number; down: boolean; id: number; n: LaneNote };
  const evs: Ev[] = [];
  let id = 0;
  g.tracks.forEach((t) =>
    t.lv.notes.forEach((n, i) => {
      if (n.ride || (i > 0 && t.lv.notes[i - 1].on === n.on)) return;
      id++;
      evs.push({ t: at(n.on), down: true, id, n });
      evs.push({ t: n.long ? at(n.on + n.dur * 0.9) : at(n.on) + 0.04, down: false, id, n });
    }),
  );
  evs.sort((a, b) => a.t - b.t || Number(a.down) - Number(b.down));
  // The clock runs on in small steps, as frames do.
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = t;
  };
  for (const e of evs) {
    runTo(e.t);
    g.step();
    if (!e.down) g.up(e.id, performance.now());
    else g.down(e.id, contact(g, e.n), performance.now());
  }
  runTo(at(g.end + 1));
  return g.step();
}

test("EASY, the whole fugue: every note tapped on time scores everything; the others sound", () => {
  const { chip, clock, sounded } = fakeChip();
  const lv = level(C_MINOR, 1, 0);
  const g = new Game(C_MINOR, [lv], gameOptions(), chip);
  assert.equal(playAll(g, clock), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
  assert.ok(lv.notes.every((n) => !n.ride), "no note rides along (D175)");
  const others = accompaniment(C_MINOR, 0, 1);
  assert.equal(sounded.length, lv.notes.length + others.length);
  assert.ok(sounded.every((s) => s.gain === 1), "the voice played no louder than the others");
});

for (const instrument of ["synth", "piano"] as const)
  test(`NORMAL, the ${instrument}: each note played as it wants scores everything; played wrong, nothing`, () => {
    {
      const { chip, clock } = fakeChip();
      const g = new Game(C_MINOR, [level(C_MINOR, 1, 0)], gameOptions({ difficulty: "normal", instrument }), chip);
      playAll(g, clock);
      const [r] = g.results();
      assert.equal(r.got, r.of);
    }
    {
      const { chip, clock, sounded } = fakeChip();
      const lv = level(C_MINOR, 1, 0);
      const g = new Game(C_MINOR, [lv], gameOptions({ difficulty: "normal", instrument }), chip);
      const n = lv.notes[1];
      clock.t = 0.15 + (n.on - g.start) / g.tps;
      g.step();
      const c = contact(g, n);
      // The B after the C falls: the right thumb is wrong; on the piano, the key beside is wrong and heard.
      if (instrument === "synth") g.down(1, { ...c, side: "right", x: 300 }, performance.now());
      else g.down(1, { ...c, x: c.x + 390 / g.kb.whites }, performance.now());
      assert.equal(n.state, "pending");
      if (instrument === "piano") assert.notEqual(sounded.at(-1)!.midi, n.midi);
    }
  });

test("the Synth: a held thumb slid up plays the next rising note, joined", () => {
  const { chip, clock, sounded } = fakeChip();
  const lv = level(C_MINOR, 1, 0);
  const g = new Game(C_MINOR, [lv], gameOptions({ difficulty: "normal" }), chip);
  const [, b, c] = lv.notes;
  clock.t = 0.15 + (b.on - g.start) / g.tps;
  g.step();
  g.down(1, contact(g, b), performance.now());
  clock.t = 0.15 + (c.on - g.start) / g.tps;
  g.step();
  const at = contact(g, b);
  g.move(1, { ...at, y: at.y - 40 }, performance.now());
  assert.equal(c.state, "hit");
  assert.equal(sounded.at(-1)!.midi, c.midi);
});

test("from the middle of the piece: the count-in before the starting bar, the others from there", () => {
  const { chip, clock } = fakeChip();
  const from = startTick(C_MINOR, 0.4);
  const g = new Game(C_MINOR, [level(C_MINOR, 2, from)], gameOptions(), chip);
  assert.equal(g.start, from - 4 * beat);
  assert.ok(g.others.every((o) => o.on >= from && o.voice !== 2));
  assert.equal(playAll(g, clock), true);
});

test("WAIT: the music stands at a note until it is played, and nothing is missed", () => {
  const { chip, clock } = fakeChip();
  const lv = level(C_MINOR, 1, 0);
  const g = new Game(C_MINOR, [lv], gameOptions({ wait: true }), chip);
  const n = lv.notes[0];
  clock.t = 0.15 + (n.on - g.start) / g.tps + 5; // five seconds late
  g.step();
  assert.equal(g.waiting, true);
  assert.equal(g.now, n.on);
  g.down(1, { side: "left", x: 50, y: 200, w: 390, h: 400 }, performance.now());
  assert.equal(lv.notes[0].state, "hit");
  g.up(1, performance.now());
  g.step();
  assert.equal(g.waiting, false);
});

test("prepare marks no rides, at any level", () => {
  const lv = level(C_MINOR, 1, 0);
  markRides(lv.notes, beat);
  prepare(C_MINOR, [lv], "easy");
  assert.ok(lv.notes.every((n) => !n.ride));
});

test("the preludes, played by hands: the right hand above the left", () => {
  for (const p of PRELUDES) {
    assert.ok(p.voices.length === 2 || p.id === "wtc1p04", `${p.id}: ${p.voices.length} parts`);
    if (p.voices.length === 2) {
      assert.deepEqual(p.voiceNames, ["Right hand", "Left hand"]);
      const mean = (v: number[][]) => v.reduce((t, n) => t + n[2], 0) / v.length;
      assert.ok(mean(p.voices[0]) > mean(p.voices[1]), `${p.id}: the right hand above the left`);
    }
  }
});

test("the C major prelude: the right hand's G4 C5 E5, the left hand's C4 held under E4; cadences colour the box", () => {
  const p = fugueById("wtc1p01");
  assert.deepEqual(p.voices[0].slice(0, 3).map((n) => n[2]), [67, 72, 76]);
  assert.deepEqual(p.voices[1].slice(0, 2).map((n) => [n[0], n[2]]), [[0, 60], [480, 64]]);
  assert.equal(keyAt(p, 0), "C");
  assert.equal(keyAt(p, 10 * p.barTicks + p.barTicks / 2), "G");
});

test("the C major prelude's left hand, one thumb: lifting from C4 to tap E4, C4 sounds on, held in full", () => {
  const { chip, clock } = fakeChip();
  const p = fugueById("wtc1p01");
  const g = new Game(p, [level(p, 1, 0)], gameOptions(), chip);
  assert.equal(playAll(g, clock), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
});

test("Contrapunctus XIV: the alto, played through, scores everything", () => {
  const { chip, clock } = fakeChip();
  const cp = fugueById("bwv1080-14");
  const g = new Game(cp, [level(cp, 1, startTick(cp, 0.9))], gameOptions({ difficulty: "normal" }), chip);
  assert.equal(playAll(g, clock), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
});
