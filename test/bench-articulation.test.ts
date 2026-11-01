/**
 * D218: articulation scored: legato on joined notes (a chain), notes held their length (HELD, SHORT),
 * rests respected (CLEAN, REST!); the riders (D191) not judged at their end.
 */
import { test } from "node:test";
import { CLASSIC_VALUES, withMech } from "../src/bench/mechanics.ts";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { artLine, holdBonus, legatoBonus, releaseVerdict } from "../src/bench/articulation.ts";

const C_MINOR = fugueById("wtc1f02");

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

type Ev = { t: number; down: boolean; id: number };
/** A computer HIGHWAY (keys, TIMING) on the C minor fugue's alto, driven by key events at times (s). */
function run(evs: Ev[], bpm = 54, after?: (g: ProtoGame, e: Ev) => void) {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("keys"), { bpm, legato: false, easy: "timing" }, fakeChip(clock));
  // D361: the keys stamped on the fake audio clock, so they are judged by it alone, never by how long the machine took.
  g.wall = () => clock.t * 1000;
  const sorted = [...evs].sort((a, b) => a.t - b.t || Number(a.down) - Number(b.down));
  for (const e of sorted) {
    while (clock.t < e.t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, e.t);
    g.step();
    if (e.down) g.keyDown(e.id, { velocity: 0.5 }, g.wall());
    else g.keyUp(e.id, g.wall());
    after?.(g, e);
  }
  return g;
}
const heads = (g: ProtoGame) => g.notes.map((n, i) => i).filter((i) => !g.notes[i].ride && !(i > 0 && g.notes[i - 1].on === g.notes[i].on));
/** The game's notes, for timing (a probe never played). */
const probe = (bpm = 54) => run([], bpm);

/** Notes i in order: each struck on time; LEGATO lets the last go just after the next is struck, else at 78% of its length. */
function phrase(g0: ProtoGame, idx: number[], legato: boolean): Ev[] {
  const evs: Ev[] = [];
  idx.forEach((i, k) => {
    const n = g0.notes[i];
    const t0 = g0.timeAt(n.on);
    const next = idx[k + 1];
    const t1 = legato && next !== undefined ? g0.timeAt(g0.notes[next].on) + 0.03 : t0 + (g0.timeAt(n.on + n.dur) - t0) * 0.55; // D289: detached, a gap of 45% (beyond the 35% a smooth handover may leave)
    evs.push({ t: t0, down: true, id: 100 + k }, { t: t1, down: false, id: 100 + k });
  });
  return evs;
}

/** The first run of n struck notes, each joined to the one before. */
function joinedRun(g: ProtoGame, n: number): number[] {
  const hs = heads(g);
  for (let s = 0; s + n <= hs.length; s++) {
    const xs = hs.slice(s, s + n);
    if (xs.slice(1).every((i) => g.joinedAt(i))) return xs;
  }
  throw new Error("no joined run");
}

test("D218: the pure rules: the legato bonus grows along a chain (capped); HELD, SHORT, REST", () => {
  assert.deepEqual([1, 2, 3, 4, 9].map((c) => legatoBonus(4, c)), [2, 4, 6, 8, 8]);
  assert.equal(holdBonus(0.5), 1);
  assert.equal(holdBonus(2), 4);
  assert.equal(holdBonus(10), 8);
  assert.equal(releaseVerdict(500, 480, 0).hold, "held");
  assert.equal(releaseVerdict(500, 380, 0).hold, "held", "75% of its length");
  assert.equal(releaseVerdict(500, 300, 0).hold, "off");
  assert.equal(releaseVerdict(500, 200, 0).hold, "short");
  assert.equal(releaseVerdict(200, 20, 0).hold, "none", "too short to judge");
  assert.equal(releaseVerdict(500, 560, 400).rest, "clean");
  assert.equal(releaseVerdict(500, 620, 400).rest, "over", "past 100 ms (a quarter of the rest)");
  assert.equal(artLine({ legato: 3, legatoOf: 4, chain: 3, held: 1, heldOf: 2, clean: 0, cleanOf: 0 }), "LEGATO 75% (CHAIN 3) · HELD 50%");
});

test("D218: an overlapped legato run scores more than the same run played detached; the chain grows and resets", () => {
  const g0 = probe();
  const idx = joinedRun(g0, 6);
  const leg = run(phrase(g0, idx, true));
  const det = run(phrase(g0, idx, false));
  for (const g of [leg, det]) assert.ok(idx.every((i) => g.notes[i].state === "hit"), "all right");
  assert.equal(leg.art.legato, 5);
  assert.equal(leg.art.chain, 5);
  assert.equal(det.art.legato, 0);
  assert.equal(det.art.legatoOf, 5);
  assert.ok(leg.score > det.score, `legato ${leg.score} > detached ${det.score}`);
  // The chain counted strike by strike; a detached strike on a joined note breaks it (no slip).
  const evs = phrase(g0, idx, true);
  // The fourth note's strike comes after the third is let go (detached).
  const third = evs.find((e) => !e.down && e.id === 102)!;
  // D289: a gap of 60% of the third's length (a smooth handover may leave up to 35%).
  const n3 = g0.notes[idx[2]];
  third.t = g0.timeAt(g0.notes[idx[3]].on) - 0.6 * (g0.timeAt(n3.on + n3.dur) - g0.timeAt(n3.on));
  const chains: number[] = [];
  const broken = run(evs, 54, (g, e) => e.down && chains.push(g.chain));
  assert.deepEqual(chains, [0, 1, 2, 0, 1, 2]);
  assert.equal(broken.slips, leg.slips, "no slip (only the notes before the run, unplayed)");
  assert.equal(broken.combo, 6, "the combo goes on");
});

test("D218: HELD and SHORT judged on release; SHORT no slip (D337: A · CLASSIC's fixed windows)", () =>
  withMech(CLASSIC_VALUES, () => {
  const g0 = probe();
  // A note of 250 ms or more (an eighth at 54 is 556 ms) with no rest after it.
  const i = heads(g0).find((j) => g0.timeAt(g0.notes[j].on + g0.notes[j].dur) - g0.timeAt(g0.notes[j].on) >= 0.4 && g0.joinedAt(heads(g0)[heads(g0).indexOf(j) + 1]))!;
  const n = g0.notes[i];
  const t0 = g0.timeAt(n.on);
  const len = g0.timeAt(n.on + n.dur) - t0;
  const held = run([{ t: t0, down: true, id: 1 }, { t: t0 + len * 0.95, down: false, id: 1 }]);
  assert.equal(held.flash?.text, "HELD");
  assert.deepEqual([held.art.held, held.art.heldOf], [1, 1]);
  const short = run([{ t: t0, down: true, id: 1 }, { t: t0 + len * 0.2, down: false, id: 1 }]);
  assert.equal(short.flash?.text, "TOO SOON");
  assert.deepEqual([short.art.held, short.art.heldOf], [0, 1]);
  assert.ok(short.crowd < held.crowd, "the crowd a little cooler");
  assert.ok(short.score < held.score, "no HELD bonus");
  assert.equal(short.slips, held.slips);
  assert.equal(short.combo, held.combo, "no combo break");
  }));

test("D218: holding a note into the rest after it is penalised; letting go in time is CLEAN", () => {
  const g0 = probe();
  const hs = heads(g0);
  // A note with a rest of a quarter beat or more before the next.
  const k = hs.findIndex((j, x) => x + 1 < hs.length && g0.notes[hs[x + 1]].on - (g0.notes[j].on + g0.notes[j].dur) >= g0.beat / 4);
  assert.ok(k >= 0, "a rest in the alto");
  const i = hs[k];
  const n = g0.notes[i];
  const t0 = g0.timeAt(n.on);
  const end = g0.timeAt(n.on + n.dur);
  const nextOn = g0.timeAt(g0.notes[hs[k + 1]].on);
  const over = run([{ t: t0, down: true, id: 1 }, { t: nextOn - 0.01, down: false, id: 1 }]);
  assert.equal(over.flash?.text, "REST!");
  assert.deepEqual([over.art.clean, over.art.cleanOf], [0, 1]);
  const clean = run([{ t: t0, down: true, id: 1 }, { t: end - 0.02, down: false, id: 1 }]);
  assert.match(clean.flash?.text ?? "", /CLEAN/);
  assert.deepEqual([clean.art.clean, clean.art.cleanOf], [1, 1]);
  assert.ok(clean.score > over.score && clean.crowd > over.crowd);
  assert.equal(over.slips, clean.slips, "no slip: the note was right");
  // A rest broken mid-chain: the chain is reset.
  assert.equal(over.chain, 0);
});

test("D218: a note followed by riders (D191) is not judged at its end", () => {
  const g0 = probe(150);
  const hs = heads(g0);
  const i = hs.find((j) => g0.notes[j + 1]?.ride && g0.notes[j + 1].on !== g0.notes[j].on);
  assert.ok(i !== undefined, "a note with riders at 150");
  const n = g0.notes[i];
  const t0 = g0.timeAt(n.on);
  for (const off of [0.01, 1.5]) {
    const g = run([{ t: t0, down: true, id: 1 }, { t: t0 + off, down: false, id: 1 }], 150);
    assert.equal(g.notes[i].state, "hit");
    assert.deepEqual([g.art.heldOf, g.art.cleanOf], [0, 0]);
    assert.ok(g.flash === null, `no call: ${g.flash?.text}`);
  }
});

test("D218: a slide is not legato (cheap): joined in sound, no bonus, and it breaks the chain (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  const clock = { t: 0 };
  const g = new ProtoGame(C_MINOR, 1, 0, protoById("highway"), { bpm: 54, legato: false, easy: "timing" }, fakeChip(clock));
  const [a, b] = joinedRun(g, 2);
  const [W, H] = [500, 800];
  const go = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  go(g.timeAt(g.notes[a].on));
  g.down(1, { side: "left", x: W * 0.1, y: H - 100, w: W, h: H }, performance.now());
  go(g.timeAt(g.notes[b].on));
  g.move(1, { side: "left", x: W * 0.5, y: H - 100, w: W, h: H }, performance.now());
  assert.equal(g.notes[b].state, "hit");
  assert.equal(g.art.legato, 0);
  assert.equal(g.art.legatoOf, 1);
  assert.equal(g.chain, 0);
  assert.equal(g.ties.length, 0);
  assert.notEqual(g.flash?.text, "LEGATO");
  }));
