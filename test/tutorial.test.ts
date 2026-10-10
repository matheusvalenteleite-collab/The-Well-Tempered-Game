/**
 * The tutorial (D98) teaches nothing the game would reject: every answer it gives passes the
 * game's own rules, every wrong option breaks the rule its text names, every quiz answer is what
 * the notes make, and every lesson has its words.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/fux/three-voice/fux-three-voice.json" with { type: "json" };
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { trioSteps } from "../src/game/trio.ts";
import { buildCourse, lessonsOf, STEP_IDS } from "../src/tutorial/course.ts";
import { classOf, coach, freeScene, intervalWords, judge, judgeTrio, quizNumber, sceneEvents, type Lesson, type Scene } from "../src/tutorial/model.ts";
import { chapterText, lessonIds, lessonText, tourText, tt } from "../src/tutorial/text.ts";
import { TOUR_STOPS } from "../src/tutorial/tour.ts";
import { harmonic } from "../src/counterpoint/interval.ts";
import { stepStudy } from "../src/ui/study.ts";

const repo = loadFuxRepository();
const TRIO = trioSteps(data as never);
const CHAPTERS = buildCourse({ repo, trio: TRIO });
const LESSONS = lessonsOf(CHAPTERS).map((x) => x.lesson);
const lesson = (id: string): Lesson => {
  const l = LESSONS.find((x) => x.id === id);
  assert.ok(l, id);
  return l;
};

test("every lesson and chapter has its words, and no words are left without a lesson", () => {
  for (const c of CHAPTERS) assert.ok(chapterText(c.id).title, c.id);
  for (const l of LESSONS) {
    const text = lessonText(l.id);
    assert.ok(text.title && text.text.length > 0, l.id);
    if (l.task.kind !== "read") assert.ok(text.prompt, `${l.id}: a task needs a prompt`);
    if (l.task.kind === "listen") for (const c of l.task.clips) assert.ok(text.clips?.[c.id], `${l.id}: label for clip ${c.id}`);
    for (const c of l.clips ?? []) assert.ok(text.clips?.[c.id], `${l.id}: label for clip ${c.id}`);
    if (l.task.kind === "choice") for (const o of l.task.options) assert.ok(text.options?.[o.id]?.label && text.options[o.id].why, `${l.id}: option ${o.id}`);
    if (l.task.kind === "quiz" && l.task.quiz === "chord") for (const c of l.task.choices) assert.ok(text.choices?.[c], `${l.id}: choice ${c}`);
    if (l.task.kind === "quiz" && (l.task.quiz === "class" || l.task.quiz === "motion")) for (const c of l.task.choices) assert.ok(tt(`quiz.choice.${c}`), c);
    if (l.task.kind === "judge" || l.task.kind === "trio") assert.ok(text.hint, `${l.id}: a writing task needs a hint`);
    // Aloysius's lines are the verified ones of the game.
    for (const p of text.text) {
      const q = /^@quote:(.+)$/.exec(p);
      if (q) assert.ok(stepStudy(q[1]).intro.en, `${l.id}: quote ${q[1]}`);
    }
  }
  assert.deepEqual(new Set(lessonIds()), new Set(LESSONS.map((l) => l.id)));
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, "lesson ids are unique");
  for (const s of TOUR_STOPS) assert.ok(tourText(s.id).title, s.id);
});

test("writing tasks: Fux's answer passes the rules of the exercise, and only the open places are blank", () => {
  let n = 0;
  for (const l of LESSONS) {
    if (l.task.kind !== "judge") continue;
    const s = l.scene!;
    assert.ok(s.answer && s.rules && s.rules.length > 0, l.id);
    assert.ok(s.open.length > 0, `${l.id}: something to write`);
    const ev = judge(s, s.answer);
    assert.deepEqual(ev.violations.map((v) => v.ruleId), [], `${l.id}: Fux's answer clean (no rule, no advice)`);
    s.start.forEach((note, k) => assert.equal(note, s.open.includes(k) ? null : s.answer![k], `${l.id} slot ${k}`));
    // The window, when there is one, shows every open place.
    if (s.window) for (const k of s.open) assert.ok(s.layout[k].bar >= s.window[0] && s.layout[k].bar <= s.window[1], `${l.id}: slot ${k} in view`);
    n++;
  }
  assert.ok(n >= 15);
});

test("writing tasks: the rules are those of the game's exercise", async () => {
  const { rulesForStep } = await import("../src/counterpoint/curriculum/index.ts");
  for (const l of LESSONS) {
    const s = l.scene;
    if (l.task.kind !== "judge" || !s?.stepId) continue;
    assert.deepEqual(s.rules!.map((r) => r.id), rulesForStep(s.stepId).map((r) => r.id), l.id);
  }
});

test("the hints' alternatives are accepted too (B natural where Fux writes B flat)", () => {
  const chain = lesson("fourth.chain").scene!;
  assert.deepEqual(judge(chain, chain.answer!.map((n, k) => (k === 7 || k === 8 ? "B4" : n))).errors, []);
  const bar = lesson("third.bar").scene!;
  assert.deepEqual(judge(bar, bar.answer!.map((n, k) => (k === 16 ? "B4" : n))).errors, []);
});

test("the great rule's lesson rejects parallel fifths and accepts a third", () => {
  const s = lesson("motion.rule").scene!;
  assert.deepEqual(judge(s, ["A4", "G4"]).errors, []);
  assert.deepEqual(judge(s, ["A4", "C5"]).errors, []);
  assert.deepEqual(judge(s, ["A4", "B4"]).errors.map((e) => e.ruleId), ["fs.perfect-approach"]);
  assert.deepEqual(judge(s, ["A4", "F4"]).errors.map((e) => e.ruleId), ["fs.vertical-consonance"]);
});

test("a wrong answer in a writing task is caught: the cadence without its sharp", () => {
  const s = lesson("first.end").scene!;
  const plain = s.answer!.map((n, k) => (k === 9 ? "C5" : n));
  assert.ok(judge(s, plain).errors.some((e) => e.ruleId === "fs.cadence"));
});

test("three voices: Fux's answer passes, the open cells are blank", () => {
  for (const l of LESSONS) {
    if (l.task.kind !== "trio") continue;
    const s = l.trio!;
    assert.deepEqual(judgeTrio(s, s.answer).violations, [], l.id);
    for (const [staff, bar] of s.open) assert.equal(s.start[staff][bar], null, `${l.id} ${staff}/${bar}`);
    assert.ok(s.open.every(([staff]) => staff !== s.cantusIndex), `${l.id}: the cantus is never open`);
  }
  // The cadence lesson: a plain C in the middle voice loses the semitone into the final.
  const cad = lesson("three.cadence").trio!;
  const plain = cad.answer.map((line, i) => line.map((n, b) => (i === 1 && b === 9 ? "C4" : n)));
  assert.ok(judgeTrio(cad, plain).errors.some((e) => e.ruleId === "t1.cadence"));
});

test("the fifth-species choice: the engine agrees with the right answer and with each reason given", () => {
  const t = lesson("fifth.choose").task;
  assert.equal(t.kind, "choice");
  if (t.kind !== "choice") return;
  assert.equal(t.options.filter((o) => o.correct).length, 1);
  const broken: Record<string, string[]> = {};
  for (const o of t.options) {
    const ev = judge(t.scene!, o.notes!);
    assert.equal(ev.errors.length === 0, o.correct, o.id);
    broken[o.id] = [...new Set(ev.errors.map((e) => e.ruleId))];
  }
  assert.deepEqual(broken, { quavers: ["fis.quavers"], fux: [], struck: ["fis.downbeat-consonance"] });
});

test("quiz answers are what the notes make, checked by hand", () => {
  const answers = (id: string) => {
    const t = lesson(id).task;
    assert.equal(t.kind, "quiz");
    return t.kind === "quiz" ? t.items.map((i) => i.answer) : [];
  };
  assert.deepEqual(answers("intervals.count"), ["3", "5", "6", "8", "2", "4", "6", "3"]);
  assert.deepEqual(answers("intervals.classes"), ["perfect", "imperfect", "dissonant", "imperfect", "perfect", "dissonant", "dissonant", "imperfect", "perfect", "dissonant"]);
  assert.deepEqual(answers("motion.quiz"), ["contrary", "parallel", "oblique", "contrary", "similar", "contrary"]);
  // Fig. 101: bare first and last bars (third and octave only); full triads between, and one six-three (bar 4: A3 and D4 over the bass F3).
  assert.deepEqual(answers("three.chords"), ["incomplete", "53", "63", "53", "53", "incomplete"]);
  for (const l of LESSONS) if (l.task.kind === "quiz") for (const i of l.task.items) assert.ok(l.task.choices.includes(i.answer), `${l.id}: ${i.answer} offered`);
});

test("the first lessons' checks: the expected writing passes, the mistakes are named", () => {
  const check = (id: string, notes: (string | null)[]) => {
    const t = lesson(id).task;
    assert.equal(t.kind, "write");
    return t.kind === "write" ? t.check(notes, lesson(id).scene!) : null;
  };
  assert.equal(check("notes.staff", ["D4", "F4", "A4", "C5"])?.done, true);
  assert.equal(check("notes.staff", ["D4", "C4", null, null])?.key, "notHigher");
  assert.equal(check("notes.staff", ["D4", null, null, null])?.key, "fillAll");
  assert.equal(check("notes.letters", ["C4", "D4", "E4", "F4"])?.done, true);
  assert.equal(check("notes.letters", ["C5", "D5", "E5", "F5"])?.done, true);
  assert.equal(check("notes.letters", ["C4", "E4", null, null])?.key, "wrongLetter");
  assert.equal(check("notes.letters", ["C4", "D5", null, null])?.key, "notStep");
  assert.equal(check("notes.sharp", ["C#4", null])?.done, true);
  assert.equal(check("notes.sharp", ["C4", null])?.key, "sharpNow");
  assert.equal(check("notes.sharp", [null, null])?.key, "sharpStart");
});

test("the coach names the interval and flags the great rule", () => {
  const s: Scene = freeScene(["D4", "E4"], { start: ["A4", null] });
  const lines = (n: string) => coach(s, ["A4", n], 1).map((l) => `${l.tone}:${l.key}`);
  assert.deepEqual(lines("B4"), ["ok:coach.perfect", "bad:coach.motionBad.parallel"]);
  assert.deepEqual(lines("G4"), ["ok:coach.imperfect", "info:coach.motion.contrary"]);
  assert.deepEqual(lines("F4"), ["bad:coach.dissonantFirst", "info:coach.motion.contrary"]);
  // Every coach key exists.
  for (const m of ["contrary", "oblique", "similar", "parallel"]) assert.ok(tt(`coach.motion.${m}`) && (m === "contrary" || m === "oblique" || tt(`coach.motionBad.${m}`)));
  assert.equal(intervalWords(harmonic("E4", "C#5")), "major sixth");
  assert.equal(intervalWords(harmonic("D3", "F4")), "minor third (a tenth, counted as a third)");
  assert.equal(intervalWords(harmonic("F4", "B4")), "augmented fourth — the tritone");
  assert.equal(intervalWords(harmonic("D3", "B5")), "major sixth (more than two octaves apart, counted as a sixth)");
  assert.equal(classOf(harmonic("D4", "G4")), "dissonant");
  assert.equal(quizNumber(harmonic("D3", "D5")), "8");
});

test("listening: every scene clip has notes to play", () => {
  for (const l of LESSONS) {
    const clips = [...(l.task.kind === "listen" ? l.task.clips : []), ...(l.clips ?? [])];
    for (const c of clips) if (c.kind === "scene") assert.ok(sceneEvents(c.scene, c.scene.answer!).some((e) => e.counterpoint), `${l.id}/${c.id}`);
  }
});

test("the tutorial leans on the first exercise of each species, all on the D cantus", () => {
  for (const id of [STEP_IDS.first, STEP_IDS.second, STEP_IDS.third, STEP_IDS.fourth, STEP_IDS.fifth]) {
    const s = LESSONS.find((l) => l.scene?.stepId === id)?.scene;
    assert.ok(s, id);
    assert.deepEqual(s.cantus, ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"], id);
  }
  assert.deepEqual(TRIO.find((x) => x.id === STEP_IDS.trio)!.cantus, ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"]);
});

test("every rule of the game leads to the lesson that teaches it", async () => {
  const { lessonForRule } = await import("../src/tutorial/links.ts");
  const { ALL_STEPS, rulesForStep } = await import("../src/counterpoint/curriculum/index.ts");
  const { TRIO_FIRST_SPECIES } = await import("../src/counterpoint/three-voice.ts");
  const ids = new Set([...ALL_STEPS.flatMap((s) => rulesForStep(s.id).map((r) => r.id)), ...TRIO_FIRST_SPECIES.map((r) => r.id)]);
  assert.ok(ids.size > 60);
  for (const id of ids) {
    const l = lessonForRule(id);
    assert.ok(l && LESSONS.some((x) => x.id === l), `${id} -> ${l}`);
  }
});

test("the melodic-leaps choice: the engine forbids the tritone and the major sixth, allows the fifth", () => {
  const t = lesson("first.melody").task;
  assert.equal(t.kind, "choice");
  if (t.kind !== "choice") return;
  const broken: Record<string, string[]> = Object.fromEntries(t.options.map((o) => [o.id, judge(t.scene!, o.notes!).errors.map((e) => e.ruleId)]));
  assert.deepEqual({ ...broken }, { tritone: ["fs.melodic-tritone"], sixth: ["fs.melodic-major-sixth"], fifth: [] });
  for (const o of t.options) assert.equal(broken[o.id].length === 0, o.correct, o.id);
});

test("a fifth-species excerpt that opens on a held note sounds it (the A held into bar 2 of Fig. 82)", () => {
  const t = lesson("fifth.choose").task;
  if (t.kind !== "choice" || !t.scene) return assert.fail("choice with a scene");
  const s = t.scene;
  const ev = sceneEvents(s, s.answer!, s.window![0], s.window![1]);
  assert.equal(ev[0].counterpoint, "A4");
  assert.equal(ev[0].lengths?.counterpoint, 0.25);
});
