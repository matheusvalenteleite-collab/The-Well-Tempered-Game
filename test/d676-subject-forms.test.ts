/**
 * D676 (design studio; the owner: "when a fugue has multiple subjects, and variations of a subject (eg inversion
 * augmentation), these should be illustrated in the fugue card where we can hear the subject"): the card lists each
 * subject and each transformation the fugue uses, read from the tagged entries, with its first bar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadExtras } from "../src/touch/fugue.ts";
import { formLabel, subjectForms } from "../src/bench/subject-forms.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const labels = (id: string) => {
  const fs = subjectForms(id);
  return fs.map((x) => `${formLabel(id, x, fs)} @${x.bar}`);
};

test("a fugue with one subject in one form has one form (the card unchanged)", () => {
  assert.equal(subjectForms("wtc1f01").length, 1);
  assert.equal(subjectForms("wtc1f02").length, 1);
});

test("multiple subjects and their transformations, in order, each with its first bar", async () => {
  await loadExtras();
  // WTC I/4, the triple fugue: three subjects, the second also inverted.
  assert.deepEqual(labels("wtc1f04"), ["SUBJECT 1 @1", "SUBJECT 2 @35", "SUBJECT 2 · INVERTED @40", "SUBJECT 3 @49"]);
  // I/8: inversion and augmentation; II/2: augmentation and inversion; II/9: diminution.
  assert.deepEqual(labels("wtc1f08"), ["SUBJECT @1", "INVERTED @30", "AUGMENTED @62"]);
  assert.ok(labels("wtc2f02").includes("AUGMENTED @14"));
  assert.ok(labels("wtc2f09").some((l) => l.startsWith("DIMINISHED")));
  // Contrapunctus 7, per augmentationem et diminutionem: six forms.
  assert.equal(subjectForms("bwv1080-07").length, 6);
  assert.ok(labels("bwv1080-07").includes("INVERTED · AUGMENTED @5"));
  // Contrapunctus 11: three subjects, each also inverted.
  assert.equal(new Set(subjectForms("bwv1080-11").map((x) => x.theme)).size, 3);
  // The Inventions' second line is a countersubject, not a subject.
  assert.ok(labels("bwv777").some((l) => l.startsWith("COUNTERSUBJECT")));
});

test("the card shows the forms: a button each (▶, contour, name, bar); only the subject carries the reading", () => {
  const s = src("src/bench/HearSubject.tsx");
  assert.match(s, /className="tb-hear-forms" id="hear-forms" role="radiogroup"/);
  assert.match(s, /<FormContour notes=\{x\.entry\.notes\} \/>/);
  assert.match(s, /tr\("BAR \{n\}", \{ n: x\.bar \}\)/);
  assert.match(s, /const shown = fi > 0 \? null : reading;/);
  // A fugue on one transformed form shows it (Contrapunctus 3 on the inverted subject).
  assert.match(s, /forms\.length === 1 && \(forms\[0\]\.inverted \|\| forms\[0\]\.scale !== 1\)/);
});
