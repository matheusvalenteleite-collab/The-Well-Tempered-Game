/**
 * D728: THE CHORALES' WORDS from Alberda and Hentschel's 389 Chorale Settings (CC BY-NC-SA 4.0, as the notes:
 * data/sources/chorale-lyrics/SOURCE.md): laid on the soprano of 367 of the 370 (and on the voices the edition gives
 * words), each syllable on a note of its voice, held to its melisma's end; credited; the stanza labels taken off.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unpackLyrics } from "../src/touch/lyrics.ts";
import { layWords } from "../tools/touch/chorales.ts";

type C = { id: string; voices: number[][][]; length: number; credit: string; lyrics?: (number | string)[][]; lyricsSecond?: (number | string)[][]; words?: { setting: string; match: string } };
const ALL: C[] = JSON.parse(readFileSync(new URL("../data/touch/chorales.json", import.meta.url), "utf8"));

test("D728: 367 of the 370 carry words on the soprano, credited; nos. 82, 337 and 368 none", () => {
  const worded = ALL.filter((c) => c.lyrics?.[0]?.length);
  assert.equal(worded.length, 367);
  for (const id of ["chor082", "chor337", "chor368"]) assert.ok(!ALL.find((c) => c.id === id)!.lyrics, id);
  for (const c of worded) assert.match(c.credit, /ALBERDA AND JOHANNES HENTSCHEL.*CC BY-NC-SA 4\.0/, c.id);
  assert.ok(ALL.filter((c) => c.lyrics?.slice(1).some((v) => v.length)).length >= 40, "the lower voices the edition gives words");
});

test("D728: every syllable on a note of its voice, inside the piece, in order; no stanza label sung", () => {
  for (const c of ALL)
    for (const lines of [c.lyrics, c.lyricsSecond])
      lines?.forEach((packed, v) => {
        const syls = unpackLyrics(packed);
        let last = -1;
        for (const s of syls) {
          assert.ok(c.voices[v].some((n) => n[0] === s.on), `${c.id} v${v}: "${s.text}" on a note`);
          assert.ok(s.on > last && s.end > s.on && s.end <= c.length, `${c.id} v${v}: "${s.text}" in order, inside`);
          assert.doesNotMatch(s.text, /^(Text\s*\d+:|\d+\*?\.)/, `${c.id}: a stanza label`);
          last = s.on;
        }
      });
});

test("D728: the first chorale reads as the edition sets it", () => {
  const c = ALL.find((x) => x.id === "chor001")!;
  const words = unpackLyrics(c.lyrics![0]).map((s) => (s.joined ? s.text : `${s.text} `)).join("");
  assert.match(words, /^Aus meines Herzens Grunde sag' ich dir Lob und Dank,/);
  assert.match(unpackLyrics(c.lyricsSecond![0]).map((s) => (s.joined ? s.text : `${s.text} `)).join(""), /^in dieser Morgenstunde/);
  assert.equal(c.words?.match, "exact");
});

test("D728: laying the words: the longest common sequence by pitch, at the best transposition; a melisma held", () => {
  // Our notes C D E F G (one tick each); the setting a tone higher, its words on its 1st, 2nd and 4th notes.
  const notes = [0, 1, 2, 3, 4].map((i) => [i, 1, [60, 62, 64, 65, 67][i], 0]) as [number, number, number, number][];
  const r = layWords(notes, [[62, { 0: ["Al", "begin"] }], [64, { 0: ["le", "end"] }], [66], [67, { 0: ["Gott", "single"] }], [69]]);
  assert.equal(r.shift, -2);
  assert.deepEqual(unpackLyrics(r.verses[0]).map((s) => [s.on, s.end, s.text, s.joined]), [
    [0, 1, "Al", true],
    [1, 3, "le", false],
    [3, 5, "Gott", false],
  ]);
});
