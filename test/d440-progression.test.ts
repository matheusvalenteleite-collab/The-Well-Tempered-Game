/**
 * D440, PROGRESSION MODE (the Lab): the 16 stages over Book I's 24 fugues; stages 1–4 built, each tutorial's
 * excerpts read from data/touch/; a careful player passes each tutorial's last step at the game's tempo, a
 * random tapper fails it; the stages open one by one; the finer grades A+ to E; the SLOW valve; the profile.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { lessonById, midiOf, spanOf, stagePassed } from "../src/bench/manual/lessons.ts";
import { dressOf } from "../src/bench/manual/dress-of.ts";
import { STAGE_LESSONS, STAGE_PASS } from "../src/bench/manual/stage-lessons.ts";
import { BUILT_STAGES, fineGrade, isOpen, openStage, progNext, STAGES } from "../src/bench/progression.ts";
import { playerRun } from "./d359-players.ts";
import { tapperRun } from "./d342-sim.ts";

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const nameOf = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1);

test("D440: 16 stages cover Book I's 24 fugues once each; 1–4 built; I/24 last", () => {
  const all = STAGES.flatMap((s) => s.fugues);
  assert.equal(STAGES.length, 16);
  assert.equal(new Set(all).size, 24);
  assert.equal(all.length, 24);
  assert.deepEqual(STAGES.slice(0, 4).map((s) => s.fugues[0]), ["wtc1f01", "wtc1f23", "wtc1f22", "wtc1f18"]);
  assert.deepEqual(STAGES.at(-1)!.fugues, ["wtc1f24"]);
  assert.equal(BUILT_STAGES, 4);
  for (const s of STAGES.slice(0, 4)) for (const id of s.lessons) assert.ok(lessonById(id), id);
});

test("D440: every stage lesson's excerpt as in data/touch/; the last step at the game's tempo; full dress", () => {
  for (const l of STAGE_LESSONS) {
    for (const st of l.stages) {
      const f = fugueById(st.m.piece);
      const { from, until } = spanOf(st.m);
      const got = f.voices[st.m.voice].filter((n) => n[0] >= from && n[0] < until);
      assert.deepEqual(got.map((n) => nameOf(n[2])), st.m.notes, `${l.id} ${st.kind}`);
      assert.deepEqual(st.m.notes!.map(midiOf), got.map((n) => n[2]));
    }
    const last = l.stages.at(-1)!;
    assert.equal(last.kind, "play");
    assert.deepEqual(last.m.tempo, { pct: 100 }, `${l.id}: the game's own tempo`);
    assert.ok(!last.m.widen && !last.m.solo, `${l.id}: the game's windows, with the band`);
    assert.ok(dressOf(l.id).includes("crowd") && dressOf(l.id).includes("pause"), `${l.id}: the full screen`);
  }
  assert.equal(STAGE_PASS, 0.75);
});

test("D440: a careful player passes each tutorial's last step, a random tapper fails it", () => {
  for (const l of STAGE_LESSONS) {
    const k = l.stages.length - 1;
    const careful = playerRun(l.stages[k].m, { jitterMs: 30, hold: l.id === "P.3" ? "written" : 0.75 });
    assert.ok(stagePassed(l, "play", careful.lens!, k), `${l.id}: careful passes`);
    for (const seed of [1, 2, 3]) assert.ok(!stagePassed(l, "play", tapperRun(l.stages[k].m, seed).lens!, k), `${l.id}: tapper ${seed} fails`);
  }
});

test("D440: the stages open one by one, never past those built; NEXT the new stage's fugue", () => {
  assert.equal(openStage([]), 1);
  assert.ok(isOpen("wtc1f01", []) && !isOpen("wtc1f23", []) && !isOpen("wtc1f02", []));
  assert.equal(openStage(["wtc1f01"]), 2);
  assert.equal(progNext("wtc1f01", ["wtc1f01"]), "wtc1f23");
  assert.equal(openStage(["wtc1f01", "wtc1f23", "wtc1f22", "wtc1f18"]), 4, "stage 5 not built");
  assert.equal(progNext("wtc1f18", ["wtc1f01", "wtc1f23", "wtc1f22", "wtc1f18"]), null);
  assert.equal(openStage(["wtc1f23"]), 1, "in order");
});

test("D440: the finer grades", () => {
  const g = (acc: number, all = true) => fineGrade({ right: acc, of: 100 }, all);
  assert.deepEqual([g(96), g(96, false), g(90), g(80), g(70), g(60), g(59)], ["A+", "A", "A", "B", "C", "D", "E"]);
});
