/**
 * D686–D690 (design studio): BASICS v2. Its exercises are real pieces to the game; the music waits at an idea's
 * first note and then flows; a simulated WEAK player (late and early by up to 90 ms, the wrong way one move in
 * eight, notes held short, one in ten missed) passes every stage of Acts I–IV, DO and PROVE, within a few takes
 * with the tutorial's own help (a notch slower after four misses); a random tapper does not pass the direction
 * stages (the rules mean something).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { LensTally } from "../src/bench/basics/lens.ts";
import { ACTS, helpFor, stagePassed, type Stage } from "../src/bench/basics/plan.ts";
import { basicsRun, type Phase } from "../src/bench/basics/runner.ts";
import { EXERCISES } from "../src/bench/basics/exercises.ts";
import { BASICS_PT } from "../src/i18n/basics-pt.ts";
import { BASICS_ES } from "../src/i18n/basics-es.ts";
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

/** A player as a person plays: each note touched near its time (or, waiting, soon after it arrives), at a height moved the tune's way from the same thumb's last touch. */
function play(st: Stage, phase: Phase, notches: number, p: { jitterMs: number; wrongShare: number; missShare: number; holdShare: number; seed: number; random?: boolean }) {
  const clock = { t: 0 };
  const g = gameOf(st, phase, notches, clock);
  let seed = p.seed;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
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
    // When to touch: at the note's time, with the player's scatter (waiting music: once it has arrived).
    const due = g.timeAt(n.on) + (rnd() * 2 - 1) * p.jitterMs / 1000;
    const waiting = st.wait === "all" || (phase === "do" && st.wait === "first" && k === 0);
    if (waiting ? g.now < n.on - 1 : clock.t < due) continue;
    k++;
    if (rnd() < p.missShare && k > 1) continue;
    const side: "left" | "right" = st.side ?? (st.aids.includes("sides") ? (k % 2 ? "left" : "right") : k % 2 ? "left" : "right");
    const prevStep = lastStep[side];
    const way = Number.isNaN(prevStep) ? 0 : Math.sign(n.step - prevStep);
    const wrong = rnd() < p.wrongShare;
    let y: number;
    if (p.random) y = 300 + rnd() * 600;
    else if (Number.isNaN(prevStep)) y = ROWS.yOf(n.step);
    else y = lastY[side] - (wrong ? -way || 1 : way) * ROWS.rowH * (way === 0 && !wrong ? 0 : 3);
    lastY[side] = y;
    lastStep[side] = n.step;
    const x = side === "left" ? 120 : 680;
    g.down(k, { side, x, y, w: 800, h: 1000 }, 0);
    const len = g.timeAt(n.on + n.dur) - g.timeAt(n.on);
    down = { id: k, upAt: clock.t + Math.max(0.05, len * p.holdShare) };
  }
  return g.results();
}

const WEAK = { jitterMs: 90, wrongShare: 0.12, missShare: 0.1, holdShare: 0.92 };

test("the exercises are pieces of the game: one voice, in C, each note a beat or more", () => {
  for (const f of EXERCISES) {
    assert.equal(fugueById(f.id).id, f.id);
    assert.equal(f.voices.length, 1);
    for (const [on, dur] of f.voices[0]) assert.ok(dur >= 480 && on % 240 === 0, f.id);
  }
});

test("DO waits at the idea's first note (the clock held there until it is struck), then the music flows", () => {
  const st = ACTS[1].stages[0];
  const clock = { t: 0 };
  const g = gameOf(st, "do", 0, clock);
  const first = g.tracks[0].notes[0].on;
  for (let i = 0; i < 2400; i++) (clock.t += 1 / 240), g.step();
  assert.ok(Math.abs(g.now - first) < 5, `held at ${g.now} (first note ${first})`);
});

test("a weak player passes every stage of Acts I–IV, DO and PROVE, within a few takes and the tutorial's help", () => {
  for (const act of ACTS.slice(0, 4))
    for (const st of act.stages)
      for (const phase of ["do", "prove"] as const) {
        let notches = 0;
        let misses = 0;
        let passed = false;
        for (let take = 0; take < 8 && !passed; take++) {
          const r = play(st, phase, notches, { ...WEAK, seed: 11 + take * 7 + st.id.charCodeAt(2) });
          passed = stagePassed(st, r);
          const before = misses;
          misses += r.missed + r.wrong;
          if ([4, 8, 12].some((k) => before < k && misses >= k)) notches++;
        }
        assert.ok(passed, `${st.id} ${phase}`);
      }
});

test("a random tapper does not pass the direction stages", () => {
  for (const st of ACTS[1].stages.slice(3)) {
    const r = play(st, "do", 0, { jitterMs: 60, wrongShare: 0, missShare: 0, holdShare: 0.5, seed: 3, random: true });
    assert.ok(!stagePassed(st, r), st.id);
  }
});

test("the help comes in steps: nothing, the hint, the clip, a notch slower", () => {
  assert.deepEqual([1, 2, 3, 4].map(helpFor), ["none", "hint", "clip", "slower"]);
});

test("every line and label in Portuguese and Spanish; the developer view only; no D680 leftovers", () => {
  for (const a of ACTS) {
    for (const s of [a.title, a.glenn, ...a.stages.map((x) => x.hint), ...a.stages.flatMap((x) => (x.cue ? [x.cue.text] : []))]) assert.ok(BASICS_PT[s] && BASICS_ES[s], s);
  }
  for (const w of ["CONTINUE", "I KNOW THIS", "TO THE GAME", "LIFT"]) assert.ok(BASICS_PT[w] && BASICS_ES[w], w);
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /basics=\{\{ beginner: beginner\(lite\.best\), start: \(\) => basicsAct\(0\), soon: unlocked\(\) \}\}/); // D1004: for every player
  assert.doesNotMatch(app, /GlennPiano|BASICS_FLOOR|SURPRISE_SOUNDS/);
});

test("D691: the review's fixes: no verdict words, YOU alone in the legend, exactly two labelled arrows after a miss", () => {
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /const BASICS_DRESS: readonly string\[\] = \["voices", "bar", "marks", "subjects"\];/);
  assert.match(app, /names\[i\]\) \? tr\("YOU · \{voice\}"/);
  for (const f of EXERCISES) assert.deepEqual(f.voiceNames, [""]);
  const aids = src("src/bench/basics/aids2.ts");
  assert.match(aids, /if \(has\("arrow"\) && next && !missing\)/);
  assert.match(aids, /trCanvas\("YOU DID"\)/);
  assert.match(aids, /trCanvas\("NEEDED"\)/);
  for (const w of ["YOU DID", "NEEDED"]) assert.ok(BASICS_PT[w] && BASICS_ES[w], w);
});
