import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { laneNotes, type LaneNote } from "../src/touch/lanes.ts";
import type { Chip } from "../src/touch/chip.ts";
import type { Side } from "../src/touch/thumbs.ts";
import { ProtoGame, type Contact } from "../src/bench/proto-game.ts";
import { ladderSteps, LADDER_PX, moves, protoById, PROTOS, stepPitch, type Gesture, type Move } from "../src/bench/protos.ts";
import { columnAt, columnX, KEYS_SHARE, LINE } from "../src/bench/placed.ts";
import { isBlack, keySpan } from "../src/touch/piano.ts";
import { grooveHits, patchFor, PRESETS, setPreset, slotOf } from "../src/touch/sound.ts";
import { startTick, voicesFrom } from "../src/touch/voice-mode.ts";

const C_MINOR = fugueById("wtc1f02");
const beat = beatOf(C_MINOR).ticks;
const [W, H] = [390, 400];
const O = { bowLeftUp: true };
const tap = (side: Side, y = 200, x = side === "left" ? 90 : 300): Gesture => ({ kind: "tap", side, x, y, w: W, h: H, dy: 0 });

test("the subject's moves: C B C G A flat, in staff steps", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1));
  assert.deepEqual(ms.slice(0, 5).map((m) => [m.size, m.steps]), [[-1, 0], [1, -1], [1, 1], [3, -3], [1, 1]]);
});

test("THUMBS: right for up, left for down; the wrong thumb asks for the mirror of the move", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1));
  const th = protoById("thumbsV");
  assert.deepEqual(th.judge!(ms[1], tap("left"), null, O), { ok: true, steps: -1 });
  assert.deepEqual(th.judge!(ms[1], tap("right"), null, O), { ok: false, steps: 1 });
  assert.equal(th.judge!(ms[3], tap("right"), null, O).ok, true, "a leap: either thumb");
});

test("LADDER: the travel is the interval, a finger's width a step; a leap wants a long way; at the edge a run goes on", () => {
  const ld = protoById("ladder");
  const m = (steps: number): Move => ({ dir: Math.sign(steps), size: Math.min(3, Math.abs(steps)), steps });
  const last = tap("left", 200);
  assert.equal(ld.judge!(m(1), tap("left", 200 - LADDER_PX), last, O).ok, true);
  assert.equal(ld.judge!(m(1), tap("left", 200 + LADDER_PX), last, O).ok, false);
  assert.equal(ld.judge!(m(4), tap("left", 200 - LADDER_PX), last, O).ok, false, "a step's travel is not a fifth");
  assert.equal(ld.judge!(m(4), tap("left", 200 - 4 * LADDER_PX), last, O).ok, true);
  assert.equal(ld.judge!(m(0), tap("left", 203), last, O).ok, true);
  assert.equal(ladderSteps(tap("left", 8), tap("left", 15), 2), 2, "no room above: the top counts");
});

test("wrong notes are heard as asked: a staff step's pitch keeps the reference's inflection", () => {
  // From B4 (step 34, MIDI 71) a step down asked for: A4.
  assert.equal(stepPitch(33, { step: 34, midi: 71 }), 69);
  // From A flat 4 (step 33, MIDI 68): G flat-ish.
  assert.equal(stepPitch(32, { step: 33, midi: 68 }), 66);
});

/** SIDEWAYS: how often a note's column is off the screen when it comes (the window lagging behind a leap). */
const offscreen = { n: 0, off: 0 };

/** Where a thumb plays a note right, per prototype. */
function rightTouch(g: ProtoGame, i: number, last: { y: number } | null): Contact {
  const n = g.notes[i];
  const m = g.moves[i];
  const c = (x: number, y: number): Contact => ({ side: x < W / 2 ? "left" : "right", x, y, w: W, h: H });
  switch (g.proto.id) {
    case "ladder": {
      if (!last || m.size < 0) return c(100, H / 2);
      const y = last.y - m.steps * LADDER_PX;
      return c(100, y < 22 ? 10 : y > H - 22 ? H - 10 : y);
    }
    case "thumbsV":
    case "thumbsH":
      return c(m.dir < 0 && m.size > 0 && m.size < 3 ? 40 : 350, H / 2);
    case "sideways": {
      const x = columnX(n.step, g.pan, W);
      offscreen.n++;
      if (x < 0 || x > W) offscreen.off++;
      return c(x, H * LINE);
    }
    case "piano": {
      const [a, b] = keySpan(g.kb, n.midi);
      return c(((a + b) / 2) * W, isBlack(n.midi) ? H * (1 - KEYS_SHARE) + 5 : H - 4);
    }
    default:
      return c(100, H / 2);
  }
}

function fakeChip(clock: { t: number }, log: { midi: number; muffled: boolean }[] = []) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number) => {
      const e = { midi, muffled: false };
      log.push(e);
      return { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => (e.muffled = true) };
    },
    tick: () => {},
  } as unknown as Chip;
}

function playThrough(id: string, piece: string, voice: number) {
  const f = fugueById(piece);
  const clock = { t: 0 };
  const g = new ProtoGame(f, voice, startTick(f, 0), protoById(id), { ...O, bpm: 54 }, fakeChip(clock));
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  let last: { y: number } | null = null;
  g.notes.forEach((n, i) => {
    if (i > 0 && g.notes[i - 1].on === n.on) return;
    runTo(at(n.on));
    g.step();
    const c = rightTouch(g, i, last);
    g.down(i + 1, c, performance.now());
    g.up(i + 1, performance.now());
    last = c;
  });
  runTo(at(g.end + 1));
  g.step();
  return g.results();
}

test("every prototype can be played right through, on both pieces, every voice", () => {
  for (const p of PROTOS)
    for (const piece of ["wtc1f02", "bwv1080-14"]) {
      const f = fugueById(piece);
      for (const v of voicesFrom(f, 0)) {
        const r = playThrough(p.id, piece, v);
        assert.ok(r.right === r.of, `${p.id} ${piece} v${v}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
      }
    }
  assert.equal(offscreen.off, 0, `SIDEWAYS: ${offscreen.off} of ${offscreen.n} notes came off the screen`);
});

/** One touch on note i of the alto, at its time; what sounded. */
function touchNote(id: string, i: number, place: (g: ProtoGame, n: LaneNote) => Contact) {
  const clock = { t: 0 };
  const log: { midi: number; muffled: boolean }[] = [];
  const g = new ProtoGame(C_MINOR, 1, 0, protoById(id), { ...O, bpm: 54 }, fakeChip(clock, log));
  const n = g.notes[i];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  g.down(1, place(g, n), performance.now());
  return { n, heard: log.at(-1)! };
}

test("a wrong gesture sounds what it asked for, muffled, and does not count", () => {
  // THUMBS: B4 after C5 wants the left thumb; the right asks for C sharp-ish (a step up).
  {
    const { n, heard } = touchNote("thumbsV", 1, () => ({ side: "right", x: 350, y: 200, w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, true);
    assert.equal(heard.midi > 72, true, `a step up from C5, heard ${heard.midi}`);
  }
  // SIDEWAYS: two columns off: that column's pitch.
  {
    const { n, heard } = touchNote("sideways", 3, (g, n) => ({ side: "left", x: columnX(n.step + 3, g.pan, W), y: H * LINE, w: W, h: H }));
    assert.equal(n.wrong, true);
    assert.equal(heard.muffled, true);
    assert.notEqual(heard.midi, n.midi);
  }
  // PIANO: the key struck, plain.
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

test("SIDEWAYS: a column's middle is that column; the window follows the passage", () => {
  for (const pan of [30, 33.4, 36.8]) for (const s of [28, 31, 35]) assert.equal(columnAt(columnX(s, pan, W), pan, W), s);
});

test("the ensembles: every preset gives each voice an instrument; the bands keep a beat", () => {
  assert.ok(PRESETS.length >= 19);
  assert.deepEqual([3, 4, 5].map((n) => Array.from({ length: n }, (_, v) => slotOf(v, n))), [[0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]]);
  setPreset("chip");
  assert.equal(patchFor(0, 3), null);
  setPreset("baroque");
  assert.ok(patchFor(2, 3));
  setPreset("chip");
  for (const g of ["rock", "jazz", "bossa", "brushes"] as const) {
    const bar = [0, 1, 2, 3].flatMap((b) => grooveHits(g, b, 0, 4, false));
    assert.ok(bar.length >= 4, g);
  }
});
