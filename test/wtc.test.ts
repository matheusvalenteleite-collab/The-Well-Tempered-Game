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
