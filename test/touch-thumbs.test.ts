import { test } from "node:test";
import assert from "node:assert/strict";
import { onSide, sideOf, touchDown, touchMove, touchUp, type Touches } from "../src/touch/thumbs.ts";
import { FUGUES, PIECES, PRELUDES, beatOf, fugueById, keyAt, stepName } from "../src/touch/fugue.ts";
import { markRides, options, points, release, strike, sweep } from "../src/touch/lanes.ts";
import { accompaniment, duoOpen, level, recordKey, sectionNotes, voicesIn } from "../src/touch/voice-mode.ts";
import { Game, prepare, type GameOptions } from "../src/touch/engine.ts";
import { MAX_ROWS, rowAt, windowAt } from "../src/touch/rows.ts";
import { lagFrom } from "../src/touch/sync.ts";
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
const gameOptions = (o: Partial<GameOptions> = {}): GameOptions => ({ difficulty: "easy", bpm: 60, withOthers: false, wait: false, lagMs: 0, section: 0, ...o });

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

test("all 48 fugues, each voice sounding somewhere, every section with a voice", () => {
  assert.equal(FUGUES.length, 48);
  assert.deepEqual([...new Set(FUGUES.map((f) => f.voices.length))].sort(), [2, 3, 4, 5]);
  for (const f of FUGUES) {
    assert.ok(f.sections.length >= 1 && f.entries.length >= f.voices.length, f.id);
    for (let s = 0; s < f.sections.length; s++) assert.ok(voicesIn(f, s).length > 0, `${f.id} section ${s}`);
  }
});

test("the C minor fugue keeps its hand-read sections and keys", () => {
  assert.deepEqual(C_MINOR.sections.map((s) => [s.fromBar, s.toBar]), [[1, 9], [9, 13], [13, 17], [17, 22], [22, 29], [29, 31]]);
  assert.deepEqual(C_MINOR.entries.map((e) => e.key), ["c", "g", "c", "Eb", "g", "c", "c", "c"]);
  assert.equal(C_MINOR.voiceNames.join(), "Soprano,Alto,Bass");
});

test("the beat: a quarter in 4/4, a dotted quarter in 6/8, a dotted eighth in 12/16", () => {
  const by = (m: string) => FUGUES.find((f) => f.meter === m);
  assert.deepEqual(beatOf(C_MINOR), { ticks: C_MINOR.tpq, perBar: 4 });
  const six8 = by("6/8");
  if (six8) assert.deepEqual(beatOf(six8), { ticks: six8.tpq * 1.5, perBar: 2 });
  const twelve16 = by("12/16");
  if (twelve16) assert.deepEqual(beatOf(twelve16), { ticks: twelve16.tpq * 0.75, perBar: 4 });
});

test("the keys are staff steps: the alto's C5 is step 35; rows run from the bottom", () => {
  const lv = level(C_MINOR, 0, 1);
  assert.equal(lv.notes[0].midi, 72);
  assert.equal(lv.notes[0].step, 35);
  assert.equal(stepName(35), "C5");
  assert.equal(rowAt(0.99, 10), 0);
  assert.equal(rowAt(0, 10), 9);
});

test("rows: no window wider than the keys can hold; few notes beyond them (played on the edge row)", () => {
  for (const kind of ["fugue", "prelude"] as const) {
    let all = 0;
    let off = 0;
    for (const f of PIECES.filter((p) => p.kind === kind))
      for (let s = 0; s < f.sections.length; s++)
        for (const v of voicesIn(f, s)) {
          const lv = level(f, s, v);
          for (const w of lv.windows) assert.ok(w.rows <= MAX_ROWS + 2 && w.rows >= 7, `${f.id} s${s} v${v}: ${w.rows} rows`);
          for (const n of lv.notes) {
            const w = windowAt(lv.windows, n.on);
            all++;
            if (n.step < w.lo || n.step >= w.lo + w.rows) off++;
          }
        }
    // A fugue's voice almost never leaps beyond the keys; a prelude's left hand drops to a low bass now and then.
    assert.ok(off / all < (kind === "fugue" ? 0.001 : 0.03), `${kind}: ${off} of ${all} beyond the keys`);
  }
});

test("EASY: the first note is tapped, the sixteenths after a tapped note ride along", () => {
  const lv = level(C_MINOR, 0, 1);
  markRides(lv.notes, beat);
  // C5 (first, tapped) B4 (rides on it) C5 G4 Ab4 (eighths, tapped) C5 B4 (ride on the A flat).
  assert.deepEqual(lv.notes.slice(0, 7).map((n) => !!n.ride), [false, true, false, false, false, true, true]);
});

test("a tap on time plays the note once; a long note let go at once scores half; untapped notes miss", () => {
  const lv = level(C_MINOR, 0, 1);
  assert.equal(strike(lv.notes, lv.notes[0].on + 10, opt), 0);
  assert.equal(lv.notes[0].state, "hit");
  const i = lv.notes.findIndex((n) => n.long);
  strike(lv.notes, lv.notes[i].on, opt, (j) => j === i);
  release(lv.notes, i, lv.notes[i].on + 50);
  sweep(lv.notes, lv.end, opt);
  assert.equal(points(lv.notes, opt).got, 1.5);
});

test("two voices open once each is earned alone, at that level, in that section of that fugue", () => {
  const best = { [recordKey("wtc1f02", 0, [1], "easy")]: 85, [recordKey("wtc1f02", 0, [0], "easy")]: 79 };
  assert.equal(duoOpen(best, "wtc1f02", 0, [0, 1], "easy"), false);
  best[recordKey("wtc1f02", 0, [0], "easy")] = 80;
  assert.equal(duoOpen(best, "wtc1f02", 0, [1, 0], "easy"), true);
  assert.equal(duoOpen(best, "wtc1f02", 0, [0, 1], "normal"), false);
  assert.equal(duoOpen(best, "wtc1f01", 0, [0, 1], "easy"), false);
});

test("the sync: the median lag of the taps, outliers left out", () => {
  const clicks = [0, 0.667, 1.333, 2, 2.667, 3.333, 4];
  assert.equal(lagFrom(clicks, clicks.map((c) => c + 0.04)), 40);
  assert.equal(lagFrom(clicks, [0.01, 0.7]), null);
});

/** Plays every note to tap of a game, on time, on its row, each held as long as it needs; returns the game's end. */
function playAll(g: Game, clock: { t: number }) {
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  const [w, h] = [390, 400];
  type Ev = { t: number; down: boolean; id: number; k: number; step: number };
  const evs: Ev[] = [];
  let id = 0;
  g.tracks.forEach((t, k) =>
    t.lv.notes.forEach((n, i) => {
      if (n.ride || (i > 0 && t.lv.notes[i - 1].on === n.on)) return;
      id++;
      evs.push({ t: at(n.on), down: true, id, k, step: n.step });
      evs.push({ t: n.long ? at(n.on + n.dur * 0.9) : at(n.on) + 0.04, down: false, id, k, step: n.step });
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
    if (!e.down) {
      g.up(e.id, performance.now());
      continue;
    }
    const win = g.keys(e.k);
    const row = Math.max(0, Math.min(win.rows - 1, e.step - win.lo));
    const side = g.tracks[e.k].sides[0];
    g.down(e.id, side, side === "left" ? 50 : 300, h - (row + 0.5) * (h / win.rows), w, h, performance.now());
  }
  runTo(at(g.end + 1));
  return g.step();
}

test("EASY, a full section: every main note tapped on time scores everything, the rides sound too", () => {
  const { chip, clock, sounded } = fakeChip();
  const lv = level(C_MINOR, 0, 1);
  const g = new Game(C_MINOR, [lv], gameOptions(), chip);
  assert.equal(playAll(g, clock), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
  assert.ok(r.of < lv.notes.length);
  assert.equal(sounded.length, lv.notes.length);
});

test("NORMAL: each note tapped on its row scores everything; tapped two rows off, nothing", () => {
  {
    const { chip, clock } = fakeChip();
    const g = new Game(C_MINOR, [level(C_MINOR, 0, 1)], gameOptions({ difficulty: "normal" }), chip);
    playAll(g, clock);
    const [r] = g.results();
    assert.equal(r.got, r.of);
  }
  {
    const { chip, clock, sounded } = fakeChip();
    const lv = level(C_MINOR, 0, 1);
    const g = new Game(C_MINOR, [lv], gameOptions({ difficulty: "normal" }), chip);
    const n = lv.notes[0];
    clock.t = 0.15 + (n.on - g.start) / g.tps;
    g.step();
    const win = g.keys(0);
    const wrongRow = n.step - win.lo + (n.step - win.lo + 2 < win.rows ? 2 : -2);
    g.down(1, "left", 50, 400 - (wrongRow + 0.5) * (400 / win.rows), 390, 400, performance.now());
    assert.equal(sounded.length, 0);
  }
});

test("WITH THE OTHERS: the other voices play by themselves, quieter, from the section's start", () => {
  const { chip, clock, sounded } = fakeChip();
  const lvS = level(C_MINOR, 0, 0, true);
  const g = new Game(C_MINOR, [lvS], gameOptions({ withOthers: true }), chip);
  assert.equal(g.start, C_MINOR.sections[0].from - 4 * beat, "the count-in at the section's start, before the soprano enters");
  playAll(g, clock);
  const others = accompaniment(C_MINOR, 0, [0]);
  assert.equal(sounded.filter((s) => s.gain < 1).length, others.length);
  assert.ok(sounded.some((s) => s.gain === 1));
});

test("WAIT: the music stands at a note until it is played, and nothing is missed", () => {
  const { chip, clock } = fakeChip();
  const lv = level(C_MINOR, 0, 1);
  const g = new Game(C_MINOR, [lv], gameOptions({ wait: true }), chip);
  const n = lv.notes[0];
  clock.t = 0.15 + (n.on - g.start) / g.tps + 5; // five seconds late
  g.step();
  assert.equal(g.waiting, true);
  assert.equal(g.now, n.on);
  assert.equal(lv.notes[0].state, "pending");
  g.down(1, "left", 50, 200, 390, 400, performance.now());
  assert.equal(lv.notes[0].state, "hit");
  assert.equal(g.grade?.text, "PERFECT");
  g.up(1, performance.now());
  g.step();
  assert.equal(g.waiting, false);
});

test("two voices: the left thumb plays the lower voice, the right the higher", () => {
  const { chip, clock } = fakeChip();
  const g = new Game(C_MINOR, [level(C_MINOR, 0, 0), level(C_MINOR, 0, 1)], gameOptions(), chip);
  assert.deepEqual(g.tracks.map((t) => [t.lv.voice, t.sides.join()]), [
    [1, "left"],
    [0, "right"],
  ]);
  assert.equal(playAll(g, clock), true);
  for (const r of g.results()) assert.equal(r.got, r.of);
});

test("prepare marks no rides in NORMAL", () => {
  const lv = level(C_MINOR, 0, 1);
  prepare(C_MINOR, [lv], "normal");
  assert.ok(lv.notes.every((n) => !n.ride));
  assert.ok(sectionNotes(C_MINOR, 5, 2).length > 0);
});

test("all 48 preludes, in the book's order before their fugues, played by hands", () => {
  assert.equal(PRELUDES.length, 48);
  assert.equal(PIECES.length, 96);
  assert.deepEqual(PIECES.slice(0, 4).map((p) => p.id), ["wtc1p01", "wtc1f01", "wtc1p02", "wtc1f02"]);
  for (const p of PRELUDES) {
    assert.ok(p.voices.length === 2 || p.id === "wtc1p04", `${p.id}: ${p.voices.length} parts`);
    if (p.voices.length === 2) {
      assert.deepEqual(p.voiceNames, ["Right hand", "Left hand"]);
      const mean = (v: number[][]) => v.reduce((t, n) => t + n[2], 0) / v.length;
      assert.ok(mean(p.voices[0]) > mean(p.voices[1]), `${p.id}: the right hand above the left`);
    }
    for (let s = 0; s < p.sections.length; s++) assert.ok(voicesIn(p, s).length > 0, `${p.id} section ${s}`);
  }
});

test("the C major prelude: the right hand's G4 C5 E5, the left hand's C4 held under E4; cadences colour the box", () => {
  const p = fugueById("wtc1p01");
  assert.deepEqual(p.voices[0].slice(0, 3).map((n) => n[2]), [67, 72, 76]);
  assert.deepEqual(p.voices[1].slice(0, 2).map((n) => [n[0], n[2]]), [[0, 60], [480, 64]]);
  assert.equal(keyAt(p, 0), "C");
  assert.equal(keyAt(p, p.sections[1].from + p.barTicks), "G");
});

test("both hands of the C major prelude, one thumb each: the left thumb lifts from C4 to tap E4, and C4 sounds on, held in full", () => {
  const { chip, clock } = fakeChip();
  const p = fugueById("wtc1p01");
  const g = new Game(p, [level(p, 0, 0), level(p, 0, 1)], gameOptions(), chip);
  assert.deepEqual(g.tracks.map((t) => [t.lv.voice, t.sides.join()]), [
    [1, "left"],
    [0, "right"],
  ]);
  assert.equal(playAll(g, clock), true);
  for (const r of g.results()) assert.equal(r.got, r.of, `voice ${r.voice}`);
});
