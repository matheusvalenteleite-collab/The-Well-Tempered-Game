import { test } from "node:test";
import assert from "node:assert/strict";
import { onSide, sideOf, touchDown, touchMove, touchUp, type Touches } from "../src/touch/thumbs.ts";
import { FUGUES, PIECES, PRELUDES, beatOf, fugueById, keyAt, stepName } from "../src/touch/fugue.ts";
import { markRides, options, points, release, strike, sweep } from "../src/touch/lanes.ts";
import { accompaniment, level, startTick, stepRange, voicesFrom } from "../src/touch/voice-mode.ts";
import { Game, prepare, type GameOptions } from "../src/touch/engine.ts";
import { MAX_ROWS, rowAt, windowAt } from "../src/touch/rows.ts";
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

test("the keys are staff steps: the alto's C5 is step 35; rows run from the bottom", () => {
  const lv = level(C_MINOR, 1, 0);
  assert.equal(lv.notes[0].midi, 72);
  assert.equal(lv.notes[0].step, 35);
  assert.equal(stepName(35), "C5");
  assert.equal(rowAt(0.99, 10), 0);
  assert.equal(rowAt(0, 10), 9);
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

test("rows: no window wider than the keys can hold; few notes beyond them (played on the edge row)", () => {
  for (const kind of ["fugue", "prelude"] as const) {
    let all = 0;
    let off = 0;
    for (const f of PIECES.filter((p) => p.kind === kind))
      for (const v of voicesFrom(f, 0)) {
        const lv = level(f, v, 0);
        for (const w of lv.windows) assert.ok(w.rows <= MAX_ROWS + 2 && w.rows >= 7, `${f.id} v${v}: ${w.rows} rows`);
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

test("EASY, the whole fugue: every main note tapped on time scores everything; the rides and the others sound", () => {
  const { chip, clock, sounded } = fakeChip();
  const lv = level(C_MINOR, 1, 0);
  const g = new Game(C_MINOR, [lv], gameOptions(), chip);
  assert.equal(playAll(g, clock), true);
  const [r] = g.results();
  assert.equal(r.got, r.of);
  assert.ok(r.of < lv.notes.length);
  const others = accompaniment(C_MINOR, 0, 1);
  assert.equal(sounded.length, lv.notes.length + others.length);
  assert.ok(sounded.every((s) => s.gain === 1), "the voice played no louder than the others");
});

test("NORMAL: each note tapped on its row scores everything; tapped two rows off, nothing", () => {
  {
    const { chip, clock } = fakeChip();
    const g = new Game(C_MINOR, [level(C_MINOR, 1, 0)], gameOptions({ difficulty: "normal" }), chip);
    playAll(g, clock);
    const [r] = g.results();
    assert.equal(r.got, r.of);
  }
  {
    const { chip, clock, sounded } = fakeChip();
    const lv = level(C_MINOR, 1, 0);
    const g = new Game(C_MINOR, [lv], gameOptions({ difficulty: "normal" }), chip);
    const n = lv.notes[0];
    clock.t = 0.15 + (n.on - g.start) / g.tps;
    g.step();
    const before = sounded.length;
    const win = g.keys(0);
    const wrongRow = n.step - win.lo + (n.step - win.lo + 2 < win.rows ? 2 : -2);
    g.down(1, "left", 50, 400 - (wrongRow + 0.5) * (400 / win.rows), 390, 400, performance.now());
    assert.equal(sounded.length, before);
  }
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
  g.down(1, "left", 50, 200, 390, 400, performance.now());
  assert.equal(lv.notes[0].state, "hit");
  g.up(1, performance.now());
  g.step();
  assert.equal(g.waiting, false);
});

test("prepare marks no rides in NORMAL", () => {
  const lv = level(C_MINOR, 1, 0);
  prepare(C_MINOR, [lv], "normal");
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
