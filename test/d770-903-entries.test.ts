/**
 * D770: THE CHROMATIC FUGUE'S ENTRIES, FROM ITS TABLE (data/touch/903-entries.txt): the subject eleven times and its
 * countersubject ten (two of them inverted, the episode of 27-35), each on a note of its voice. The text untouched: the
 * climaxes' and the close's chords stay D363's band voices as written (53 notes with the alto's, 3 with the bass's).
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";

before(async () => {
  await loadExtras();
});

test("D770: BWV 903-2's entries by the table: 11 subject, 10 countersubject (2 inverted), each on a note; the chords as written", () => {
  const f = fugueById("bwv903-2");
  assert.equal(f.id, "bwv903-2");
  const E = f.entries;
  assert.deepEqual([E.length, E.filter((e) => (e.theme ?? 1) === 1).length, E.filter((e) => e.theme === 2).length, E.filter((e) => e.inverted).length], [21, 11, 10, 2]);
  for (const e of E) {
    assert.ok(f.voices[e.voice].some((n) => n[0] === e.on), `b. ${e.bar} on a note`);
    assert.ok(e.notes.length >= 10, `b. ${e.bar} has the theme's notes`);
  }
  assert.deepEqual(E.filter((e) => (e.theme ?? 1) === 1).map((e) => [e.bar, e.voice]), [[1, 0], [9, 1], [19, 2], [41, 1], [60, 1], [76, 2], [90, 0], [107, 1], [131, 1], [140, 2], [154, 0]]);
  assert.deepEqual(f.voices.map((v) => v.length), [961, 693, 875]);
  assert.deepEqual((f.bandVoices ?? []).map((b) => [b.of, b.notes.length]), [[1, 50], [2, 3]]);
});
