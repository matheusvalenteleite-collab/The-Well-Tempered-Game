/**
 * D229: preludes as stage 1 (a beaten prelude unlocks its fugue, kept on the device; a failed one does
 * not), the modes they are played in (a phone's prelude on HIGHWAY, its fugue on LADDER; a computer's
 * both on HIGHWAY · keys), their riders (more generous than a fugue's), a perfect run of every Book I
 * prelude all hits, no subject features anywhere; and the computer HIGHWAY's SPACE gems.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById, inBar, PRELUDES } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { laneNotes, PRELUDE_RIDE_MS, preludeRides, quickRides } from "../src/touch/lanes.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { ProtoGame, type Contact } from "../src/bench/proto-game.ts";
import { HIGHWAY_LANES, PROTOS, protoById, isRepeat } from "../src/bench/protos.ts";
import { isBlack, keySpan } from "../src/touch/piano.ts";
import { KEYS_SHARE } from "../src/bench/placed.ts";
import { beaten, fugueOf, locked, preludeOf, readStages, recordPrelude, stageMode, STAGES_KEY } from "../src/bench/stages.ts";
import { difficultyOf, PRELUDE_STAR_CUTS } from "../src/bench/difficulty.ts";
import { CARDS } from "../src/bench/cards.ts";
import { subjectLine } from "../src/bench/subject-line.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };

const BOOK_I_P = PRELUDES.filter((p) => p.book === 1);
const [W, H] = [800, 400];

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

function rightTouch(g: ProtoGame, i: number, k = 0): Contact {
  const n = g.tracks[k].notes[i];
  const c = (x: number, y: number): Contact => ({ side: x < W / 2 ? "left" : "right", x, y, w: W, h: H });
  // D252: the planned lane, on the row the note asks for (the lower row: below the pads' split).
  if (g.road) return c(((g.lanesOf(k)[i] + 0.5) / g.laneCount) * W, g.rowOf(i, k) ? H - 60 : H - 160);
  if (g.proto.id === "ladder") return c(W * 0.1, 900 - Math.max(...g.notes.filter((x) => x.on === n.on).map((x) => x.step)) * 16);
  const [a, b] = keySpan(g.kb, n.midi);
  return c(((a + b) / 2) * W, isBlack(n.midi) ? H * (1 - KEYS_SHARE) + 5 : H - 4);
}

/** A run of one part at the piece's own tempo: each struck note on time in its place (keys: the planned lane's key, SPACE for a repeat). */
function play(piece: string, voice: number, proto: string, wrongFrom = Infinity) {
  const f = fugueById(piece);
  const clock = { t: 0 };
  const g = new ProtoGame(f, [voice], 0, protoById(proto), { bpm: tempoOf(piece), legato: false, easy: "exact", fail: true }, fakeChip(clock));
  g.rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };
  // D361: the touches stamped on the fake audio clock, so they are judged by it alone, never by how long the machine took.
  g.wall = () => clock.t * 1000;
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  // D252: both hands' struck notes (the left hand's track where the arc gives it), in time order.
  const heads = g.tracks
    .flatMap((t, k) => t.notes.map((n, i) => (n.ride || (i > 0 && t.notes[i - 1].on === n.on) ? null : { k, i, on: n.on })))
    .filter((x): x is { k: number; i: number; on: number } => !!x)
    .sort((a, b) => a.on - b.on || a.k - b.k);
  const KEYS = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"];
  let id = 0;
  for (const [h, { k, i }] of heads.entries()) {
    runTo(g.timeAt(g.tracks[k].notes[i].on));
    g.step();
    if (h >= wrongFrom) continue;
    id++;
    if (proto === "keys") {
      const code = isRepeat(g.tracks[k].moves[i]) && !g.isFree(i, k) ? "Space" : KEYS[g.lanesOf(k)[i]];
      g.keyDown(id, { velocity: 0.5, code }, g.wall());
      g.keyUp(id, g.wall());
    } else {
      g.down(id, rightTouch(g, i, k), g.wall());
      g.up(id, g.wall());
    }
  }
  runTo(g.timeAt(g.end + 1));
  g.step();
  return { g, r: g.results() };
}

test("D229: a beaten prelude unlocks its fugue and stays beaten; a failed run does not; Book II and XIV never locked", () => {
  store.clear();
  assert.ok(locked("wtc1f04") && !beaten("wtc1p04"));
  assert.equal(recordPrelude("wtc1p04", "C", true), false, "failed: not beaten");
  assert.ok(locked("wtc1f04"));
  assert.equal(recordPrelude("wtc1p04", "C", false, "2026-10-23"), true);
  assert.ok(!locked("wtc1f04") && beaten("wtc1p04"));
  // Kept on the device, under its own key; the best grade raised, the first date kept; a later failure changes nothing.
  recordPrelude("wtc1p04", "A", false, "2026-10-24");
  recordPrelude("wtc1p04", "D", false, "2026-10-25");
  recordPrelude("wtc1p04", "S", true);
  assert.deepEqual(JSON.parse(store.get(STAGES_KEY)!), { wtc1p04: { beaten: "2026-10-23", best: "A" } });
  assert.deepEqual(readStages(), { wtc1p04: { beaten: "2026-10-23", best: "A" } });
  assert.ok(locked("wtc1f06"), "another pair stays locked");
  assert.ok(!locked("wtc2f05") && !locked("bwv1080-14") && !locked("wtc1p04"));
  assert.equal(preludeOf("wtc1f12"), "wtc1p12");
  assert.equal(fugueOf("wtc1p12"), "wtc1f12");
});

test("D229: a failed prelude run (the crowd gone) does not beat it", () => {
  store.clear();
  const { r } = play("wtc1p02", 0, "highway", 10);
  assert.notEqual(r.failedBar, null, "the crowd left");
  assert.equal(recordPrelude("wtc1p02", r.grade, r.failedBar !== null), false);
  assert.ok(locked("wtc1f02"));
});

test("D229: the modes: a phone's prelude on HIGHWAY, its fugue on LADDER (SUBJECT withdrawn); a computer's both on HIGHWAY · keys", () => {
  const p = fugueById("wtc1p07");
  const f = fugueById("wtc1f07");
  assert.equal(stageMode(p, "mobile", "ladder"), "highway");
  assert.equal(stageMode(p, "mobile", "subject"), "highway");
  assert.equal(stageMode(f, "mobile", "ladder"), "ladder");
  assert.equal(stageMode(f, "mobile", "subject"), "ladder", "a stored SUBJECT falls back to LADDER");
  assert.equal(stageMode(f, "mobile", "highway"), "ladder");
  assert.equal(stageMode(p, "computer", "keys"), "keys");
  assert.equal(stageMode(p, "computer", "piano"), "keys");
  assert.equal(stageMode(f, "computer", "keys"), "keys");
  assert.equal(protoById(stageMode(p, "mobile", "ladder")), HIGHWAY_LANES);
  assert.equal(HIGHWAY_LANES.layout, "full");
  assert.ok(HIGHWAY_LANES.short && HIGHWAY_LANES.how.length > 0 && HIGHWAY_LANES.how.length <= 3);
});

test("D229: a perfect run of every Book I prelude (one hand each, the upper by default, at its own tempo) on the phone's HIGHWAY is all hits", () => {
  for (const p of BOOK_I_P) {
    const { r } = play(p.id, 0, "highway");
    assert.ok(r.of > 0 && r.right === r.of && r.failedBar === null, `${p.id}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
  }
});

test("D229: and on the computer's HIGHWAY (keys), the lower hand, SPACE for the repeats", () => {
  for (const p of BOOK_I_P) {
    const { r } = play(p.id, p.voices.length - 1, "keys");
    assert.ok(r.of > 0 && r.right === r.of, `${p.id}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
  }
});

test("D229: preludes ride more generously than fugues: the struck notes about 6 a second at most, the strong ones struck", () => {
  let all = 0;
  let rode = 0;
  let fugueRode = 0;
  for (const p of BOOK_I_P) {
    const b = beatOf(p);
    const sPerTick = 60 / (tempoOf(p.id) * p.tpq);
    const ms = (a: number, c: number) => (c - a) * sPerTick * 1000;
    for (let v = 0; v < p.voices.length; v++) {
      const ns = laneNotes(p.voices[v], b.ticks, v);
      const split = p.meter.split("/").map(Number)[0] % 3 === 0 && Number(p.meter.split("/")[0]) > 3 ? 3 : 2;
      const ons = [...new Set(ns.map((n) => n.on))];
      const r = preludeRides(ns, b.ticks, ms, (t) => inBar(p, t), split);
      const q = laneNotes(p.voices[v], b.ticks, v);
      fugueRode += quickRides(q, b.ticks, ms);
      assert.equal(ns[0].ride, false, "the first note struck");
      // Every downbeat struck.
      for (const n of ns) if (inBar(p, n.on) === 0 && n.on > 0) assert.equal(n.ride, false, `${p.id} v${v}: downbeat ${n.on}`);
      // The struck notes: none closer than PRELUDE_RIDE_MS unless both on the beat's grid.
      const struck = [...new Set(ns.filter((n) => !n.ride).map((n) => n.on))].sort((a, c) => a - c);
      let close = 0;
      for (let k = 1; k < struck.length; k++) if (ms(struck[k - 1], struck[k]) < PRELUDE_RIDE_MS - 1) close++;
      assert.ok(close / struck.length < 0.02, `${p.id} v${v}: ${close} struck notes too close of ${struck.length}`);
      all += ons.length;
      rode += r;
    }
  }
  assert.ok(rode > fugueRode && rode / all > 0.1 && rode / all < 0.6, `${rode} of ${all} onsets ride (a fugue's rule: ${fugueRode})`);
  if (process.env.D229_TABLE) console.log(`preludes: ${rode} of ${all} onsets ride; by a fugue's rule ${fugueRode}`);
});

test("D229: preludes have no subject features, and every mode runs on one without a fault", () => {
  for (const p of BOOK_I_P) {
    assert.equal(p.entries.length, 0, p.id);
    assert.equal(subjectLine(p, 0).entries.length, 0);
    assert.equal(CARDS.find((c) => c.id === p.id), undefined, "no card: no seal");
  }
  for (const proto of [...PROTOS, HIGHWAY_LANES]) {
    const { g, r } = play("wtc1p04", 0, proto.id);
    assert.equal(g.entries.length, 0, proto.id);
    assert.ok(Number.isFinite(r.score), proto.id);
  }
});

test("D229: preludes' stars on their own scale, the 24 spread over one to five; the fugues' untouched", () => {
  const stars = BOOK_I_P.map((p) => difficultyOf(p).stars);
  for (let s = 1; s <= 5; s++) assert.ok(stars.filter((x) => x === s).length >= 2, `${s} stars: ${stars.join("")}`);
  assert.equal(PRELUDE_STAR_CUTS.length, 4);
  assert.equal(difficultyOf(fugueById("wtc1f10")).stars, 5);
  assert.equal(difficultyOf(fugueById("wtc1f22")).stars, 1);
});

test("D229, computer HIGHWAY: a repeated note (SPACE) is a gem in the lane of the note before it, marked SPACE", () => {
  let reps = 0;
  for (const id of ["wtc1f02", "wtc1f05", "wtc1p01", "wtc1p12", "wtc2f08", "wtc2f21"]) {
    const f = fugueById(id);
    for (let v = 0; v < f.voices.length; v++) {
      const g = new ProtoGame(f, v, 0, protoById("keys"), { bpm: tempoOf(id), legato: false, easy: "exact" }, fakeChip({ t: 0 }));
      let prev = -1;
      g.notes.forEach((n, i) => {
        if (n.ride || (i > 0 && g.notes[i - 1].on === n.on)) return;
        const rep = isRepeat(g.moves[i]);
        assert.equal(g.spaceGem(i), rep && prev >= 0, `${id} v${v} note ${i}`);
        if (rep && prev >= 0) {
          reps++;
          assert.equal(g.lanes[i], g.lanes[prev], `${id} v${v} note ${i}: the line goes on in its lane`);
        }
        prev = i;
      });
    }
  }
  assert.ok(reps > 50, `${reps} repeats`);
});
