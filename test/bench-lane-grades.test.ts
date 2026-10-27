/**
 * D239: two grades of a right note on the HIGHWAYs: in its planned lane (full points, a chime) or only
 * the right way from the last (half the points, duller, no chime; the streak and multiplier kept).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { laneLine, ProtoGame, ptsText } from "../src/bench/proto-game.ts";
import { KEY_ROWS, protoById } from "../src/bench/protos.ts";

const C_MINOR = fugueById("wtc1f02");
const HOME = KEY_ROWS.find((r) => r.codes.includes("KeyA"))!.codes;
const W = 400;
const H = 800;

function fakeChip(clock: { t: number }, log: { chimes: number; bright: number[] }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (_m: number, _a: number, _d: number, _v: unknown, p: Play = {}) => (log.bright.push(p.bright ?? 0), { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    chime: () => void log.chimes++,
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

/**
 * Plays the first notes of I/2's alto in their planned lanes, but note `rel` in another lane the right
 * way; returns the points, chimes and the brightness of the note at `rel`, and the game.
 */
function play(proto: "keys" | "highway", rel: (g: ProtoGame) => number, lane: (g: ProtoGame, i: number) => number) {
  const clock = { t: 0 };
  const log = { chimes: 0, bright: [] as number[] };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById(proto), { bpm: 54, legato: false, easy: proto === "keys" ? "leaps" : "direction" }, fakeChip(clock, log));
  const target = rel(g);
  let id = 0;
  let at: { pts: number; chimes: number; bright: number } | null = null;
  for (let i = 0; i <= target; i++) {
    const n = g.notes[i];
    if ((i > 0 && g.notes[i - 1].on === n.on) || n.ride) continue;
    const t = g.timeAt(n.on);
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
    const l = i === target ? lane(g, i) : g.lanes[i];
    // D325: the note's own points (its articulation's credit, the same for either lane, apart).
    const s0 = g.earned.notes;
    const c0 = log.chimes;
    if (proto === "keys") {
      const code = g.moves[i].dir === 0 && !g.isFree(i) && i !== target ? "Space" : HOME[l];
      g.keyDown(++id, { velocity: 0.5, code }, performance.now());
      g.keyUp(id, performance.now());
    } else {
      const x = ((l + 0.5) / 5) * W;
      g.down(++id, { side: x < W / 2 ? "left" : "right", x, y: H * 0.8, w: W, h: H }, performance.now());
      g.up(id, performance.now());
    }
    if (i === target) at = { pts: g.earned.notes - s0, chimes: log.chimes - c0, bright: log.bright.at(-1)! };
  }
  return { g, at: at!, chimes: log.chimes };
}

/** A note moving clearly one way, its planned lane with room beside it further that way (for a leap, two). */
function sideNote(count: number) {
  return (g: ProtoGame) =>
    g.moves.findIndex((m, i) => {
      if (i < 4 || g.isFree(i) || m.dir === 0 || m.steps === 0 || g.notes[i].ride || g.notes[i - 1].on === g.notes[i].on) return false;
      const L = g.lanes[i];
      return L + m.dir >= 0 && L + m.dir < count;
    });
}
const beside = (g: ProtoGame, i: number) => g.lanes[i] + g.moves[i].dir;

for (const [proto, count] of [["keys", 9], ["highway", 5]] as const) {
  test(`D239, ${proto}: the planned lane scores in full with a chime; the right way in another lane half, no chime (D293: not duller)`, () => {
    const exact = play(proto, sideNote(count), (g, i) => g.lanes[i]);
    const rel = play(proto, sideNote(count), beside);
    const i = sideNote(count)(exact.g);
    assert.ok(i > 0, "a note to try");
    assert.equal(rel.g.notes[i].state, "hit", "the right direction is still right");
    assert.equal(exact.at.chimes, 1, "the chime on the exact lane");
    assert.equal(rel.at.chimes, 0, "no chime on the relative");
    assert.ok(exact.at.pts > 0);
    assert.equal(rel.at.pts, exact.at.pts / 2, "half the points");
    assert.equal(exact.at.bright, rel.at.bright, "D293: sounds alike");
    assert.equal(rel.g.streak, exact.g.streak, "the streak kept");
    assert.equal(rel.g.mult, exact.g.mult, "the multiplier kept");
    const flame = rel.g.flames.at(-1)!;
    assert.equal(flame.grade, "relative");
    assert.equal(flame.lane, beside(rel.g, i), "flashed where it was struck");
    const r = rel.g.results();
    assert.equal(r.lanes.relative, 1);
    assert.equal(r.lanes.exact, exact.g.results().lanes.exact - 1);
    assert.equal(r.right, exact.g.results().right);
    assert.ok(Number.isInteger(r.score), "the score shown whole");
  });
}

test("D239: the results' line and the half points' text", () => {
  assert.equal(laneLine({ exact: 18, relative: 7 }), "LANE 72% · DIRECTION 28%");
  assert.equal(laneLine({ exact: 3, relative: 0 }), "LANE 100% · DIRECTION 0%");
  assert.equal(laneLine({ exact: 0, relative: 0 }), "", "TIMING: no line");
  assert.deepEqual([0.5, 1, 1.5, 4].map(ptsText), ["½", "1", "1½", "4"]);
});

test("D239: TIMING grades no lane (no chime, full points)", () => {
  const clock = { t: 0 };
  const log = { chimes: 0, bright: [] as number[] };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm: 54, legato: false, easy: "timing" }, fakeChip(clock, log));
  clock.t = g.timeAt(g.notes[0].on);
  g.step();
  g.keyDown(1, { velocity: 0.5, code: "KeyA" }, performance.now());
  assert.equal(log.chimes, 0);
  assert.equal(g.results().lanes.exact + g.results().lanes.relative, 0);
});

test("D239: the rules (? HOW TO PLAY, the first game's line, the mode's diagram) name both grades", async () => {
  const { LITE_HINT, RULES } = await import("../src/bench/lite.ts");
  const { PROTOS } = await import("../src/bench/protos.ts");
  for (const id of ["keys", "highway"]) {
    assert.ok(/full points/.test(LITE_HINT[id]) && /half/.test(LITE_HINT[id]), id);
    assert.ok(RULES[id].some((l) => /full points/.test(l)) && RULES[id].some((l) => /half the points/.test(l)), id);
  }
  assert.ok(RULES.ladder.some((l) => /sideways/.test(l)));
  assert.ok(PROTOS.filter((p) => p.id === "keys").every((p) => p.how.some((l) => /half/.test(l))));
});
