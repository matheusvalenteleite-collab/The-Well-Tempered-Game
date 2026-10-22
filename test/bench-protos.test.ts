import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { laneNotes } from "../src/touch/lanes.ts";
import type { Chip } from "../src/touch/chip.ts";
import type { Side } from "../src/touch/thumbs.ts";
import { ProtoGame, type Contact } from "../src/bench/proto-game.ts";
import { moves, protoById, PROTOS, zone, type Gesture, type Move, type Options } from "../src/bench/protos.ts";
import { startTick, voicesFrom } from "../src/touch/voice-mode.ts";

const C_MINOR = fugueById("wtc1f02");
const beat = beatOf(C_MINOR).ticks;
const [W, H] = [390, 400];
const tap = (side: Side, y = 200, x = side === "left" ? 90 : 300): Gesture => ({ kind: "tap", side, x, y, w: W, h: H, dy: 0 });

test("the subject's moves: C B C G A flat is free, down a step, up a step, down a leap, up a step", () => {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1), beat);
  assert.deepEqual(ms.slice(0, 5).map((m) => [m.dir, m.size, m.ref]), [[0, -1, 0], [-1, 1, 0], [1, 1, -1], [-1, 3, 1], [1, 1, -1]]);
});

/** Whether a run of thumbs plays the first five notes right, under a rule. */
function plays(id: string, sides: Side[], o: Options, ys: number[] = [200, 200, 200, 200, 200]): boolean {
  const ms = moves(laneNotes(C_MINOR.voices[1], beat, 1), beat);
  let last: Gesture | null = null;
  return sides.every((s, i) => {
    const g = tap(s, ys[i]);
    const ok = protoById(id).fits(ms[i], g, last, o);
    last = g;
    return ok;
  });
}

test("THUMBS: right = up takes R L R L R, not its mirror; relative takes both, and the leap free", () => {
  const abs = { relative: false };
  const rel = { relative: true };
  const R = "right";
  const L = "left";
  assert.ok(plays("thumbs", [R, L, R, L, R], abs));
  assert.ok(!plays("thumbs", [L, R, L, R, L], abs));
  for (const run of [[R, L, R, L, R], [L, R, L, R, L], [R, L, R, R, L], [L, R, L, L, R]] as Side[][]) assert.ok(plays("thumbs", run, rel), run.join(" "));
  assert.ok(!plays("thumbs", [R, R, R, R, R], rel));
  // G then A flat on the same (left) thumb, landing higher: allowed.
  assert.ok(plays("thumbs", [R, L, R, L, L], rel, [200, 200, 200, 260, 220]));
});

/** A thumb that gives each move as the prototype wants it. */
function player(id: string, o: Options) {
  let last: { side: Side; y: number } | null = null;
  return (m: Move): { c: Contact; dy: number } => {
    let side: Side = last?.side === "left" ? "right" : "left";
    let y = 200;
    let x = side === "left" ? 90 : 300;
    let dy = 0;
    const ref = last?.y ?? 200;
    // LADDER and TRACE: the middle of the band the rule wants (a leap in LADDER: back to the middle).
    if ((id === "ladder" || id === "trace") && last) {
      const z = zone(id, m, id === "trace" && m.fresh ? H / 2 : ref, H);
      y = z ? (z[0] + z[1]) / 2 : H / 2;
    }
    if (id === "thumbs" && m.size > 0) {
      if (!o.relative && m.size < 3 && m.dir) side = m.dir > 0 ? "right" : "left";
      if (o.relative && m.size < 3 && m.dir && m.ref && last) side = m.dir === m.ref ? last.side : last.side === "left" ? "right" : "left";
      x = side === "left" ? 90 : 300;
    }
    if (id === "line" && m.size >= 0) x = W / 2 + m.dir * [0, 0.28, 0.58, 0.85][m.size] * (W / 2);
    if (id === "flick" && m.size >= 0) dy = -m.dir * [0, 35, 70, 110][m.size];
    last = { side, y };
    return { c: { side, x, y, w: W, h: H }, dy };
  };
}

function playThrough(id: string, piece: string, voice: number, o: Options, share = 0) {
  const f = fugueById(piece);
  const clock = { t: 0 };
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {} }),
    tick: () => {},
  } as unknown as Chip;
  const g = new ProtoGame(f, voice, startTick(f, share), protoById(id), { ...o, bpm: 54 }, chip);
  const at = (tick: number) => 0.15 + (tick - g.start) / g.tps;
  const give = player(id, o);
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
  };
  let id0 = 0;
  g.notes.forEach((n, i) => {
    if (i > 0 && g.notes[i - 1].on === n.on) return;
    runTo(at(n.on));
    g.step();
    const { c, dy } = give(g.moves[i]);
    id0++;
    g.down(id0, c, performance.now());
    if (dy) g.move(id0, { ...c, y: c.y + dy }, performance.now());
    g.up(id0, performance.now());
  });
  runTo(at(g.end + 1));
  g.step();
  return g.results();
}

test("every prototype can be played right through, on both pieces, every voice", () => {
  for (const p of PROTOS)
    for (const relative of p.id === "thumbs" ? [false, true] : [false])
      for (const piece of ["wtc1f02", "bwv1080-14"]) {
        const f = fugueById(piece);
        for (const v of voicesFrom(f, 0)) {
          const r = playThrough(p.id, piece, v, { relative });
          assert.ok(r.right === r.of, `${p.id}${relative ? " rel" : ""} ${piece} v${v}: ${r.right}/${r.of} (wrong ${r.wrong}, missed ${r.missed})`);
        }
      }
});

test("a wrong gesture still plays the note, muffled, and does not count", () => {
  const r = playThrough("line", "wtc1f02", 1, { relative: false }, 0);
  assert.equal(r.right, r.of);
  const clock = { t: 0 };
  let muffled = 0;
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => muffled++ }),
    tick: () => {},
  } as unknown as Chip;
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("thumbs"), { relative: false, bpm: 54 }, chip);
  const n = g.notes[1];
  clock.t = 0.15 + (n.on - g.start) / g.tps;
  g.step();
  g.down(1, { side: "right", x: 300, y: 200, w: W, h: H }, performance.now());
  assert.equal(muffled, 1);
  assert.equal(n.state, "miss");
  assert.equal(n.wrong, true);
});
