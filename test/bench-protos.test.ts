import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { laneNotes, type LaneNote } from "../src/touch/lanes.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Contact, type Rows } from "../src/bench/proto-game.ts";
import { barDynamic, BAR, moves, protoById, PROTOS, stepPitch, thumbsVerdict } from "../src/bench/protos.ts";
import { columnAt, columnX, KEYS_SHARE, LINE } from "../src/bench/placed.ts";
import { isBlack, keySpan } from "../src/touch/piano.ts";
import { grooveHits, patchFor, PRESETS, setPreset, slotOf } from "../src/touch/sound.ts";
import { hz, setTuning } from "../src/touch/tuning.ts";
import { phrase } from "../src/touch/phrasing.ts";
import { accompaniment, startTick, subjectMarks, voicesFrom } from "../src/touch/voice-mode.ts";

const C_MINOR = fugueById("wtc1f02");
const beat = beatOf(C_MINOR).ticks;
const [W, H] = [800, 400];
/** A box whose rows are 16 px apart (as the app sets them from the screen). */
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };

test("the subject's moves: C B C G A flat, in staff steps, joined", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1), beat);
  assert.deepEqual(ms.slice(0, 5).map((m) => [m.size, m.steps]), [[-1, 0], [1, -1], [1, 1], [3, -3], [1, 1]]);
  assert.deepEqual(ms.slice(0, 3).map((m) => m.joined), [false, true, true]);
});

test("THUMBS: right for up, left for down; the wrong thumb asks for the mirror", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1), beat);
  assert.deepEqual(thumbsVerdict(ms[1], "left"), { ok: true, steps: -1 });
  assert.deepEqual(thumbsVerdict(ms[1], "right"), { ok: false, steps: 1 });
  assert.equal(thumbsVerdict(ms[3], "right").ok, true, "a leap: either thumb");
});

test("the bars' dynamic: pp by the box, ff by the phone's edge, on both sides", () => {
  const bw = W * BAR;
  assert.equal(barDynamic(bw, W), 0);
  assert.equal(barDynamic(0, W), 1);
  assert.equal(barDynamic(W - bw, W), 0);
  assert.equal(barDynamic(W, W), 1);
});

test("wrong notes are heard as asked: a staff step's pitch keeps the reference's inflection", () => {
  assert.equal(stepPitch(33, { step: 34, midi: 71 }), 69);
  assert.equal(stepPitch(32, { step: 33, midi: 68 }), 66);
});

/** Where a thumb plays note i of voice k right, per prototype. */
function rightTouch(g: ProtoGame, k: number, i: number): Contact {
  const n = g.tracks[k].notes[i];
  const m = g.tracks[k].moves[i];
  const c = (x: number, y: number): Contact => ({ side: x < W / 2 ? "left" : "right", x, y, w: W, h: H });
  switch (g.proto.id) {
    case "ladder":
      return c(W * 0.1, ROWS.yOf(n.step));
    case "thumbs":
      return c(m.dir < 0 && m.size > 0 && m.size < 3 ? W * 0.1 : W * 0.9, H / 2);
    case "duo":
      return c(k ? W * 0.9 : W * 0.1, H / 2);
    case "sideways":
      return c(columnX(n.step, g.pan, W), H * LINE);
    default: {
      const [a, b] = keySpan(g.kb, n.midi);
      return c(((a + b) / 2) * W, isBlack(n.midi) ? H * (1 - KEYS_SHARE) + 5 : H - 4);
    }
  }
}

function fakeChip(clock: { t: number }, log: { midi: number; muffled: boolean; dyn?: number }[] = [], swooshes: number[] = []) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number) => {
      const e: { midi: number; muffled: boolean; dyn?: number } = { midi, muffled: false };
      log.push(e);
      return { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => (e.muffled = true), dyn: (d: number) => (e.dyn = d) };
    },
    swoosh: (midi: number) => swooshes.push(midi),
    tick: () => {},
  } as unknown as Chip;
}

/** Plays a piece through: each note on time, in its place; LEGATO holds each note until the next has begun. */
function playThrough(id: string, piece: string, voices: number[], legato = false) {
  const f = fugueById(piece);
  const clock = { t: 0 };
  const g = new ProtoGame(f, voices, startTick(f, 0), protoById(id), { bpm: 54, legato }, fakeChip(clock));
  g.rows = ROWS;
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  const evs: { t: number; k: number; i: number; n: LaneNote }[] = [];
  g.tracks.forEach((tr, k) => tr.notes.forEach((n, i) => (i > 0 && tr.notes[i - 1].on === n.on ? null : evs.push({ t: at(n.on), k, i, n }))));
  evs.sort((a, b) => a.t - b.t);
  const lastId = new Map<number, number>();
  evs.forEach((e, idx) => {
    runTo(e.t);
    g.step();
    const id = idx + 1;
    g.down(id, rightTouch(g, e.k, e.i), performance.now());
    const before = lastId.get(e.k);
    // Legato: the note before is let go only now; otherwise it was let go at once.
    if (before !== undefined && legato) g.up(before, performance.now());
    if (!legato) g.up(id, performance.now());
    lastId.set(e.k, id);
  });
  runTo(at(g.end + 1));
  g.step();
  return g.results();
}

test("every prototype can be played right through, on both pieces, every voice (TWO VOICES: pairs; SIDEWAYS also LEGATO)", () => {
  for (const p of PROTOS)
    for (const piece of ["wtc1f02", "bwv1080-14"]) {
      const f = fugueById(piece);
      const vs = voicesFrom(f, 0);
      const runs = p.id === "duo" ? vs.slice(1).map((v) => [vs[0], v]) : vs.map((v) => [v]);
      for (const voices of runs)
        for (const legato of p.id === "sideways" ? [false, true] : [false]) {
          const r = playThrough(p.id, piece, voices, legato);
          assert.ok(r.right === r.of, `${p.id}${legato ? " legato" : ""} ${piece} v${voices}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
        }
    }
});

/** One touch on note i of the alto, at its time; what sounded. */
function touchNote(id: string, i: number, place: (g: ProtoGame, n: LaneNote) => Contact, legato = false) {
  const clock = { t: 0 };
  const log: { midi: number; muffled: boolean; dyn?: number }[] = [];
  const g = new ProtoGame(C_MINOR, 1, 0, protoById(id), { bpm: 54, legato }, fakeChip(clock, log));
  g.rows = ROWS;
  const n = g.notes[i];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  g.down(1, place(g, n), performance.now());
  return { g, n, heard: log.at(-1)!, log };
}

test("a wrong place sounds what it asked for, muffled (the PIANO's key plain), and does not count", () => {
  {
    const { n, heard } = touchNote("ladder", 1, (_, n) => ({ side: "left", x: W * 0.1, y: ROWS.yOf(n.step + 3), w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, true);
    assert.ok(heard.midi > n.midi, `three steps up, heard ${heard.midi}`);
  }
  {
    const { n, heard } = touchNote("thumbs", 1, () => ({ side: "right", x: W * 0.9, y: 200, w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.ok(heard.midi > 72, `a step up from C5, heard ${heard.midi}`);
  }
  {
    const { n, heard } = touchNote("sideways", 3, (g, n) => ({ side: "left", x: columnX(n.step + 3, g.pan, W), y: H * LINE, w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, true);
  }
  {
    const { n, heard } = touchNote("piano", 1, (g, n) => {
      const [a, b] = keySpan(g.kb, n.midi + 2);
      return { side: "left", x: ((a + b) / 2) * W, y: isBlack(n.midi + 2) ? H * (1 - KEYS_SHARE) + 5 : H - 4, w: W, h: H };
    });
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, false);
    assert.equal(heard.midi, n.midi + 2);
  }
});

test("SIDEWAYS LEGATO: a joined note struck after the one before was let go does not count", () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("sideways"), { bpm: 54, legato: true }, fakeChip(clock));
  const play = (i: number, id: number) => {
    clock.t = 0.15 + (g.notes[i].on - g.start) / g.tps;
    g.step();
    g.down(id, { side: "left", x: columnX(g.notes[i].step, g.pan, W), y: 300, w: W, h: H }, performance.now());
  };
  play(0, 1);
  g.up(1, performance.now());
  play(1, 2);
  assert.equal(g.notes[1].wrong, true);
  assert.equal(g.grade?.why, "legato");
});

test("a held note swells as the thumb moves out across its bar; a flick upwards on letting go: a swoosh", () => {
  const clock = { t: 0 };
  const log: { midi: number; muffled: boolean; dyn?: number }[] = [];
  const swooshes: number[] = [];
  const g = new ProtoGame(C_MINOR, [1, 0], 0, protoById("duo"), { bpm: 54, legato: false }, fakeChip(clock, log, swooshes));
  const n = g.notes[0];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  const t0 = performance.now();
  g.down(1, { side: "left", x: W * BAR * 0.9, y: 300, w: W, h: H }, t0);
  g.move(1, { side: "left", x: 2, y: 300, w: W, h: H }, t0 + 20);
  assert.ok((log.at(-1)!.dyn ?? 1) > 1.3, "out to the edge: louder");
  g.move(1, { side: "left", x: 2, y: 240, w: W, h: H }, t0 + 60);
  g.up(1, t0 + 80);
  assert.deepEqual(swooshes, [n.midi]);
});

test("keys: a MIDI key plays its pitch (the PIANO exactly); the computer's moves on LADDER", () => {
  {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("piano"), { bpm: 54, legato: false }, fakeChip(clock));
    const n = g.notes[0];
    clock.t = 0.15 + (n.on - g.start) / g.tps;
    g.step();
    g.keyDown(1, { midi: n.midi, velocity: 0.8 }, performance.now());
    assert.equal(n.state, "hit");
  }
  {
    const clock = { t: 0 };
    const g = new ProtoGame(C_MINOR, 1, 0, protoById("ladder"), { bpm: 54, legato: false }, fakeChip(clock));
    for (const [i, mv] of [[0, { dir: 0, big: false }], [1, { dir: -1, big: false }], [2, { dir: 1, big: false }], [3, { dir: -1, big: true }]] as const) {
      clock.t = 0.15 + (g.notes[i].on - g.start) / g.tps;
      g.step();
      g.keyDown(10 + i, { move: mv }, performance.now());
      g.keyUp(10 + i, performance.now());
      assert.equal(g.notes[i].state, "hit", `note ${i}`);
    }
  }
});

test("SIDEWAYS: a column's middle is that column", () => {
  for (const pan of [30, 33.4, 36.8]) for (const s of [28, 31, 35]) assert.equal(columnAt(columnX(s, pan, W), pan, W), s);
});

test("the ensembles: every preset gives each voice an instrument; the bands keep a beat; bossa nova by default", () => {
  assert.ok(PRESETS.length >= 19);
  assert.deepEqual([3, 4, 5].map((n) => Array.from({ length: n }, (_, v) => slotOf(v, n))), [[0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]]);
  assert.ok(patchFor(0, 3), "bossa nova");
  setPreset("chip");
  assert.equal(patchFor(0, 3), null);
  setPreset("bossa");
  for (const gr of ["rock", "jazz", "bossa", "brushes"] as const) assert.ok([0, 1, 2, 3].flatMap((b) => grooveHits(gr, b, 0, 4, false)).length >= 4, gr);
});

test("the tunings: A stays put; a well temperament moves the others a few cents", () => {
  setTuning("equal", 440);
  assert.equal(hz(69), 440);
  assert.ok(Math.abs(hz(60) - 261.626) < 0.01);
  setTuning("werckmeister", 440);
  assert.equal(hz(69), 440);
  assert.ok(Math.abs(1200 * Math.log2(hz(60) / 261.626) - 11.7) < 0.1, "C 11.7 cents above A's equal-tempered C");
  setTuning("equal", 415);
  assert.equal(hz(69), 415);
  setTuning("equal", 440);
});

test("the others are phrased: the subject brought forward, repeated notes detached, timing within a few ms", () => {
  const others = accompaniment(C_MINOR, 0, 1);
  const sh = phrase(others, beat, C_MINOR.barTicks, subjectMarks(C_MINOR).subject);
  assert.equal(sh.length, others.length);
  assert.ok(sh.every((s) => Math.abs(s.nudge) <= 0.006 && s.hold > 0.7 && s.hold <= 1 && s.level > 0.8 && s.level < 1.5));
  const subj = subjectMarks(C_MINOR).subject;
  const i = others.findIndex((o) => subj.has(`${o.voice}:${o.on}`));
  const j = others.findIndex((o) => !subj.has(`${o.voice}:${o.on}`));
  assert.ok(i >= 0 && j >= 0);
});
