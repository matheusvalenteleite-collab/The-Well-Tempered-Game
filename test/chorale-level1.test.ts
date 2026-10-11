import { test } from "node:test";
import assert from "node:assert/strict";
import { CHORALES, compare, parseChord, soundingMelody, voiceChord } from "../src/chorale/level1.ts";

test("the level-1 data holds Kittel's 24 melodies with a phrase per fermata", () => {
  assert.equal(CHORALES.length, 24);
  for (const c of CHORALES) {
    const fermatas = c.melody.filter((n) => n.fermata && n.pitch).length;
    assert.equal(c.phrases.length, fermatas, `No. ${c.number}`);
    for (const p of c.phrases) {
      assert.ok(p.kittel.length === 8 || p.kittel.length === 9, `No. ${c.number}: ${p.kittel.length} basses`);
      assert.ok(p.choices.length >= 7);
    }
  }
});

test("Roman numerals are read in the chorale's key", () => {
  assert.deepEqual(parseChord("V", "G"), { root: 2, quality: "major" });
  assert.deepEqual(parseChord("vi", "G"), { root: 4, quality: "minor" });
  assert.deepEqual(parseChord("bVII", "A"), { root: 7, quality: "major" });
  assert.deepEqual(parseChord("vii°", "C"), { root: 11, quality: "diminished" });
  assert.equal(parseChord("?", "C"), null);
});

test("a cadence chord is voiced under the melody, root in the bass", () => {
  const v = voiceChord("I", "G", "G4");
  assert.equal(v[0], "G2");
  assert.equal(v.length, 3);
});

test("a small note in the melody takes the second half of the note before it", () => {
  const m = soundingMelody([
    { pitch: "B4", offset: "0/1", duration: "1/2", measure: 1 },
    { pitch: "C5", offset: "1/2", duration: "0/1", measure: 1, grace: true },
    { pitch: "D5", offset: "1/2", duration: "1/2", measure: 1 },
  ]);
  assert.deepEqual(m.map((n) => [n.pitch, n.at, n.length]), [["B4", 0, 0.25], ["C5", 0.25, 0.25], ["D5", 0.5, 0.5]]);
});

test("the comparison names Kittel's basses and Bach's settings that agree", () => {
  const c = CHORALES.find((x) => x.number === 1)!;
  const v = compare(c, ["V", "I", "V", "I"]);
  assert.ok(v[0].kittel.length >= 7);
  assert.ok(v[0].bach.every((b) => b.same));
  assert.ok((v[0].habitShare ?? 0) > 0.5);
});
