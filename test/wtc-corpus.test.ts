import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { kernPitch, kernDuration, parseKern, TPQ } from "../src/wtc/kern.ts";
import { findEntries, names, predictAnswer, subjectAndAnswer, transpose } from "../src/wtc/fugue.ts";
import type { WtcPiece } from "../src/wtc/corpus.ts";
import { frequency } from "../src/wtc/tunings.ts";

const fugues: WtcPiece[] = JSON.parse(readFileSync(new URL("../data/wtc/fugues.json", import.meta.url), "utf8"));

test("kern: pitches and durations", () => {
  assert.equal(kernPitch("8cc#"), "C#5");
  assert.equal(kernPitch("4B-"), "Bb3");
  assert.equal(kernPitch("16f##"), "F##4");
  assert.equal(kernPitch("4r"), null);
  assert.equal(kernDuration("8."), (3 * TPQ) / 4);
  assert.equal(kernDuration("12a"), TPQ / 3);
  const k = parseKern("**kern\t**kern\n*k[]\t*k[]\n*C:\t*C:\n=1\t=1\n2C\t[2c\n2D\t2c]\n*-\t*-\n");
  assert.equal(k.voices.length, 2);
  assert.deepEqual(k.voices[0].map((n) => [n.pitch, n.dur]), [["C4", 4 * TPQ]]); // the tie merged; top voice first
  assert.deepEqual(k.voices[1].map((n) => n.pitch), ["C3", "D3"]);
});

test("the 48 fugues are all there, in their keys", () => {
  assert.equal(fugues.length, 48);
  const f1 = fugues.find((f) => f.id === "wtc1f01")!;
  assert.equal(f1.key, "C");
  assert.equal(f1.voices.length, 4);
  assert.equal(fugues.find((f) => f.id === "wtc1f04")!.voices.length, 5);
  assert.equal(fugues.find((f) => f.id === "wtc1f10")!.voices.length, 2);
});

test("subjects, answers and entries: C major (real), C minor (tonal)", () => {
  const f1 = fugues.find((f) => f.id === "wtc1f01")!;
  const a1 = subjectAndAnswer(f1);
  assert.deepEqual(names(a1.subject.map((n) => n.pitch)).slice(0, 8), ["C", "D", "E", "F", "G", "F", "E", "A"]);
  assert.deepEqual(names(predictAnswer(a1.subject, "C", "major", "bach")), names(a1.answer.map((n) => n.pitch)));
  assert.ok(findEntries(f1, a1.subject).length >= 20);
  const f2 = fugues.find((f) => f.id === "wtc1f02")!;
  const a2 = subjectAndAnswer(f2);
  // C B C G answered G F# G C: the leap from ^1 to ^5 answered by ^5 to ^1.
  assert.deepEqual(names(a2.answer.map((n) => n.pitch)).slice(0, 4), ["G", "F#", "G", "C"]);
  assert.deepEqual(names(predictAnswer(a2.subject, "C", "minor", "real")).slice(0, 4), ["G", "F#", "G", "D"]);
  assert.deepEqual(names(predictAnswer(a2.subject, "C", "minor", "bach")).slice(0, 4), ["G", "F#", "G", "C"]);
});

test("transposition keeps spelling; tunings differ where they should", () => {
  assert.equal(transpose("B3", 4, 7), "F#4");
  assert.equal(transpose("Eb4", 3, 5), "Ab4");
  assert.ok(Math.abs(frequency("A4", "equal") - 440) < 1e-9);
  // Meantone: G# and Ab differ; equal temperament: they do not.
  assert.ok(Math.abs(frequency("G#4", "meantone") - frequency("Ab4", "meantone")) > 1);
  assert.ok(Math.abs(frequency("G#4", "equal") - frequency("Ab4", "equal")) < 1e-9);
  assert.ok(frequency("E4", "kirnberger3") < frequency("E4", "equal"));
});

import { entryKey } from "../src/wtc/keyplan.ts";
test("key plan: the exposition of Book I's C major fugue is I V V I; its middle entries reach vi", () => {
  const f1 = fugues.find((f) => f.id === "wtc1f01")!;
  const { subject } = subjectAndAnswer(f1);
  const keys = findEntries(f1, subject).filter((e) => e.form === "subject").map((e) => entryKey(f1, e, subject).roman);
  assert.deepEqual(keys.slice(0, 4), ["I", "V", "V", "I"]);
  assert.ok(keys.includes("vi"));
  const f2 = fugues.find((f) => f.id === "wtc1f02")!;
  const s2 = subjectAndAnswer(f2).subject;
  assert.deepEqual(findEntries(f2, s2).slice(0, 2).map((e) => entryKey(f2, e, s2).roman), ["i", "v"]);
});

import { chordLabel, reduce } from "../src/wtc/reduction.ts";
test("harmonic reduction: Book I's C major prelude opens I, ii4/2, V6/5, I", () => {
  const pre: WtcPiece[] = JSON.parse(readFileSync(new URL("../data/wtc/preludes.json", import.meta.url), "utf8"));
  const p1 = pre.find((p) => p.id === "wtc1p01")!;
  assert.deepEqual(reduce(p1).slice(0, 4).map((s) => s.roman), ["I", "ii4/2", "V6/5", "I"]);
  assert.equal(chordLabel(["G2", "D3", "B3", "F4"], "C", "major").roman, "V7");
  assert.equal(chordLabel(["F#2", "C3", "A3", "Eb4"], "C", "major").roman, "♯iv°7");
});

import { episodes, strettos } from "../src/wtc/structure.ts";
test("structure: Book I's C major fugue is all strettos and almost no episodes", () => {
  const f1 = fugues.find((f) => f.id === "wtc1f01")!;
  const { subject } = subjectAndAnswer(f1);
  const e = findEntries(f1, subject);
  assert.ok(strettos(f1, e).length >= 8);
  const ep = episodes(f1, e, subject);
  assert.ok(ep.reduce((a, g) => a + g.end - g.on, 0) < 0.2 * f1.length);
});

test("exposition and entries: Book I's C minor fugue", async () => {
  const { findEntriesByHead } = await import("../src/wtc/fugue.ts");
  const { exposition } = await import("../src/wtc/exposition.ts");
  const p = fugues.find((f) => f.id === "wtc1f02")!;
  const { subject, answer } = subjectAndAnswer(p);
  const { entries } = findEntriesByHead(p, subject);
  // Bach's eight entries (bars 1, 3, 7, 11, 15, 20, 26, 29); the episodes' sequences on the head are not entries.
  const bar = 4 * TPQ;
  assert.deepEqual(entries.map((e) => Math.floor(e.on / bar) + 1), [1, 3, 7, 11, 15, 20, 26, 29]);
  const ex = exposition(p, subject, answer, entries);
  assert.deepEqual(ex.map((e) => [e.voice, e.role]), [[1, "subject"], [0, "answer"], [2, "subject"]]);
  assert.ok(ex[2].link >= 2 * bar - TPQ); // the two-bar episode before the bass enters
  // Book I's C major: alto, soprano, tenor, bass, the tenor with the answer (I V V I).
  const c = fugues.find((f) => f.id === "wtc1f01")!;
  const sc = subjectAndAnswer(c);
  assert.deepEqual(exposition(c, sc.subject, sc.answer, findEntriesByHead(c, sc.subject).entries).map((e) => e.roman), ["I", "V", "V", "I"]);
});
