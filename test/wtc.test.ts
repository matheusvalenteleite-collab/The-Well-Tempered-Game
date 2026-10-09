import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUES, KEY_ORDER, keySignature, realAnswer } from "../src/wtc/fugues.ts";
import { degree, evaluateAnswer } from "../src/wtc/answer.ts";
import { beatOf, evaluateCounterpoint, type CpInput } from "../src/wtc/counterpoint.ts";
import type { WtcFugue } from "../src/wtc/fugues.ts";

const fugue = (id: string) => FUGUES.find((f) => f.id === id)!;
/** The dux from the answer's entry (the subject's tail and the countersubject), and the notes judged. */
const cpInput = (f: WtcFugue, line = [...f.subject.map((n) => ({ ...n, at: n.at - f.answerAt })), ...f.countersubject].sort((a, b) => a.at - b.at)): CpInput => ({
  line,
  given: f.answer,
  bar: f.barQuarters,
  beat: beatOf(f.time),
  phase: (f.phase + f.answerAt) % f.barQuarters,
  judged: new Set(line.map((_, i) => i).filter((i) => line[i].at >= -1e-6)),
});

test("D119: 29 fugue expositions, 21 of the 24 keys, each answer the subject at the fifth but for its mutations", () => {
  assert.equal(FUGUES.length, 29);
  assert.equal(new Set(FUGUES.map((f) => f.key)).size, 21);
  for (const f of FUGUES) {
    assert.ok(KEY_ORDER.includes(f.key), f.id);
    assert.equal(f.subject.length, f.answer.length, f.id);
    const real = realAnswer(f);
    const off = f.answer.map((n, i) => (n.pitch === real[i] ? -1 : i)).filter((i) => i >= 0);
    assert.deepEqual(off, f.mutations, f.id);
    assert.ok(f.mutations.every((i) => i <= 4), `${f.id}: mutations at the head only`);
  }
});

test("D119: key signatures and degrees", () => {
  assert.deepEqual(keySignature("c#"), { C: 1, D: 1, E: 0, F: 1, G: 1, A: 0, B: 0 });
  assert.deepEqual(keySignature("bb"), { C: 0, D: -1, E: -1, F: 0, G: -1, A: -1, B: -1 });
  assert.equal(degree("C4", "f"), "5");
  assert.equal(degree("E4", "f"), "♯7");
  assert.equal(degree("F#4", "C"), "♯4");
});

test("D119: Bach's answers are right; the real answer where his is tonal is named as such", () => {
  for (const f of FUGUES) assert.ok(evaluateAnswer(f, f.answer.map((n) => n.pitch)).passed, f.id);
  // F minor, Book I: the subject's C (the dominant) is answered by F, not by G.
  const f = fugue("wtc1.12");
  const written = realAnswer(f);
  const ev = evaluateAnswer(f, written);
  assert.equal(ev.notes[0].verdict, "real-not-tonal");
  assert.equal(ev.notes[0].detail.subjectDegree, "5");
  assert.equal(ev.notes[0].detail.bachDegree, "1");
  assert.ok(ev.notes.slice(1).every((n) => n.verdict === "bach"));
  // The whole answer an octave away is not a fault; a wrong note is.
  const up = f.answer.map((n) => n.pitch.replace(/(\d+)$/, (o) => String(Number(o) + 1)));
  assert.ok(evaluateAnswer(f, up).passed);
  const bad = f.answer.map((n) => n.pitch);
  bad[3] = "A4";
  assert.equal(evaluateAnswer(f, bad).notes[3].verdict, "wrong");
});

test("D119: Bach's countersubjects pass the two-voice rules (Bach is the last word, as Fux in D39)", () => {
  for (const f of FUGUES) assert.deepEqual(evaluateCounterpoint(cpInput(f)).errors, [], f.id);
});

test("D119: a dissonance leapt into and out of on the beat is a fault", () => {
  // C major, Book I: against the answer's B4 (beat 1 of bar 4), the countersubject's G4 made a C5,
  // a second, from E4 by leap and away to A3 by leap.
  const f = fugue("wtc1.01");
  const inp = cpInput(f);
  const i = inp.line.findIndex((n) => n.at >= 0 && n.pitch === "G4" && n.dur === 1.5);
  assert.ok(i > 0);
  const line = inp.line.map((n, j) => (j === i ? { ...n, pitch: "C5" } : n));
  const ev = evaluateCounterpoint({ ...inp, line });
  assert.ok(ev.errors.some((v) => v.note === i), JSON.stringify(ev.errors));
});

test("D119: two fifths in a row are a fault", () => {
  const given = [
    { pitch: "C4", at: 0, dur: 1 },
    { pitch: "D4", at: 1, dur: 1 },
    { pitch: "E4", at: 2, dur: 1 },
  ];
  const line = [
    { pitch: "E5", at: 0, dur: 1 },
    { pitch: "A4", at: 1, dur: 1 },
    { pitch: "B4", at: 2, dur: 1 },
  ];
  const ev = evaluateCounterpoint({ line, given, bar: 4, beat: 1, phase: 0, judged: new Set([0, 1, 2]) });
  assert.deepEqual(ev.errors.map((v) => v.ruleId), ["wtc.cp.parallel"]);
});
