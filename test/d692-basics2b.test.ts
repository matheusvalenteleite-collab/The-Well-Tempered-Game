/**
 * D692–D695 (design studio): BASICS v2, PR B. Act V (Contrapunctus 1's alto at ♩=44, bars 1–5, then 1–9 with the
 * other voices played by the game) passed by the same simulated weak player as Acts I–IV, DO and PROVE; Act VI's
 * stations light (no PROVE; passed when the idea is heard, or after three takes), PSYCH last; 6.4 is
 * Contrapunctus 4's tenor, bars 50–53, its printed trill; the selection names BASICS.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { LensTally } from "../src/bench/manual/lens.ts";
import { ACTS, ACTS_READY, stagePassed, type Stage } from "../src/bench/basics/plan.ts";
import { basicsRun, nextAt, type Phase } from "../src/bench/basics/runner.ts";
import { BASICS_PT } from "../src/i18n/basics-pt.ts";
import { BASICS_ES } from "../src/i18n/basics-es.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { fakeChip, ROWS } from "./d342-sim.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function gameOf(st: Stage, phase: Phase, notches: number, clock: { t: number }) {
  const r = basicsRun(st, phase, notches);
  const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById("ladder"), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: false, ...(r.tut ?? {}) }, fakeChip(clock));
  g.rows = ROWS;
  const lens = new LensTally(g, () => clock.t * 1000);
  g.tap = lens.feed;
  g.lens = lens;
  g.wall = () => 0;
  return g;
}

/** The weak player of d686 (late and early by up to 90 ms, the wrong way one move in eight, one note in ten missed). */
function play(st: Stage, phase: Phase, notches: number, seed: number) {
  const clock = { t: 0 };
  const g = gameOf(st, phase, notches, clock);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const heads = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  const lastY = { left: 0, right: 0 } as Record<"left" | "right", number>;
  const lastStep = { left: NaN, right: NaN } as Record<"left" | "right", number>;
  let k = 0;
  let done = false;
  let down: { id: number; upAt: number } | null = null;
  while (!done && clock.t < 400) {
    clock.t += 1 / 240;
    done = g.step();
    if (down && clock.t >= down.upAt) (g.up(down.id, 0), (down = null));
    const n = heads[k];
    if (!n || down) continue;
    const due = g.timeAt(n.on) + (rnd() * 2 - 1) * 0.09;
    const waiting = phase === "do" && st.wait === "first" && k === 0;
    if (waiting ? g.now < n.on - 1 : clock.t < due) continue;
    k++;
    if (rnd() < 0.1 && k > 1) continue;
    const side: "left" | "right" = k % 2 ? "left" : "right";
    const prev = lastStep[side];
    const way = Number.isNaN(prev) ? 0 : Math.sign(n.step - prev);
    const wrong = rnd() < 0.12;
    const y = Number.isNaN(prev) ? ROWS.yOf(n.step) : lastY[side] - (wrong ? -way || 1 : way) * ROWS.rowH * (way === 0 && !wrong ? 0 : 3);
    lastY[side] = y;
    lastStep[side] = n.step;
    g.down(k, { side, x: side === "left" ? 120 : 680, y, w: 800, h: 1000 }, 0);
    const len = g.timeAt(n.on + n.dur) - g.timeAt(n.on);
    down = { id: k, upAt: clock.t + Math.max(0.05, len * 0.92) };
  }
  return { r: g.results(), g };
}

test("all six acts open; Act V is Contrapunctus 1's alto at ♩=44, bars 1–5, then 1–9 with the others played", async () => {
  await loadExtras();
  assert.equal(ACTS_READY, 6);
  const [a, b] = ACTS[4].stages;
  for (const st of [a, b]) assert.deepEqual([st.piece, st.voice, st.bpm, st.fromBar], ["bwv1080-01", 1, 44, 1]);
  assert.equal(a.solo, true);
  assert.equal(b.solo, false);
  assert.equal(b.cue?.bar, 5);
  // 5.1 ends on bar 5's downbeat (the subject alone); 5.2 at bar 9's half cadence.
  const ra = basicsRun(a, "do", 0);
  const rb = basicsRun(b, "do", 0);
  const f = fugueById("bwv1080-01");
  assert.ok(ra.until <= f.bars[4].on + f.tpq && ra.until >= f.bars[4].on, `5.1 until ${ra.until}`);
  assert.ok(rb.until <= f.bars[8].on + 2 * f.tpq && rb.until >= f.bars[8].on, `5.2 until ${rb.until}`);
});

test("a weak player passes Act V, DO and PROVE, within a few takes and the help", async () => {
  await loadExtras();
  for (const st of ACTS[4].stages)
    for (const phase of ["do", "prove"] as const) {
      let notches = 0;
      let misses = 0;
      let passed = false;
      for (let take = 0; take < 8 && !passed; take++) {
        const { r } = play(st, phase, notches, 17 + take * 7 + st.id.charCodeAt(2));
        // The whole passage played (5.1 the subject, 12 notes; 5.2 about 30), not a stub.
        assert.ok(r.of >= (st.id === "5.1" ? 10 : 22), `${st.id}: ${r.of} notes`);
        passed = stagePassed(st, r);
        const before = misses;
        misses += r.missed + r.wrong;
        if ([4, 8, 12].some((k) => before < k && misses >= k)) notches++;
      }
      assert.ok(passed, `${st.id} ${phase}`);
    }
});

test("Act VI: seven light stations (piano three, harpsichord, voices, GAME BOY, PSYCH last), no PROVE, passed after three takes", () => {
  const six = ACTS[5].stages;
  assert.equal(six.length, 7);
  assert.ok(six.every((s) => s.light));
  assert.deepEqual(six.map((s) => s.sound), ["pianoSampled", "pianoSampled", "pianoSampled", "harpsichordSampled", "soloVoices", "gameboy", "krautrock"]);
  assert.deepEqual(six.slice(0, 5).map((s) => s.clip), ["strong", "legato", "short", "shake", "slide"]);
  assert.ok(six[1].aids.includes("join"));
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /basicsPassed\(st, r\) \|\| \(st\.light && takes >= 3\)/);
  assert.match(app, /at\.phase === "do" && !st\.light/);
  // After the last station, the finale.
  assert.equal(nextAt({ act: 5, stage: 6, phase: "do", misses: 0, notches: 0 }, ACTS_READY), null);
});

test("6.4 is Contrapunctus 4's tenor, bar 50 beat 3 to bar 53, its printed cadence trill heard", async () => {
  await loadExtras();
  const st = ACTS[5].stages[3];
  const r = basicsRun(st, "do", 0);
  assert.equal(r.piece, "bwv1080-04");
  const clock = { t: 0 };
  const g = gameOf(st, "do", 0, clock);
  const ns = g.tracks[0].notes.filter((n) => !n.ride);
  assert.equal(ns.length, 13);
  assert.equal(ns[ns.length - 1].midi, 57);
  assert.ok(ns.some((_, i) => !!g.ornamentAt(0, i)), "a trill on the way");
});

test("the cue, NO GAP and the new selection line in Portuguese and Spanish; the selection names BASICS", () => {
  for (const s of [...ACTS[5].stages.map((x) => x.hint), "NO GAP"]) assert.ok(BASICS_PT[s] && BASICS_ES[s], s);
  const line = "Pick a fugue in the middle, or learn first with BASICS on the left.";
  assert.ok(PT[line] && ES[line]);
  assert.match(src("src/bench/Selection.tsx"), /p\.basics \? tr\("Pick a fugue in the middle, or learn first with BASICS on the left\."\)/);
});

test("D696: BASICS shows no registration stops (the harpsichord's I · II · III), the main game keeps them", () => {
  assert.match(src("src/bench/BenchApp.tsx"), /const stopsOn = hasStops\(presetById\(soundNow\)\.id\) && !lesson && !bStage && /);
});
