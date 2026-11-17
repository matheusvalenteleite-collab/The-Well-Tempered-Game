/**
 * D678 (design studio): the chorales' words in the box (D728's data): the second line stacked under the first, as a
 * hymnal prints them; the stanza the edition prints before a line's first syllable; a lower voice the edition gives
 * no words takes the soprano's, drawn a shade fainter under its own notes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { lyricsOf, wordsFor } from "../src/touch/lyrics.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("a chorale's soprano has its words; the alto without its own takes the soprano's, borrowed", async () => {
  await loadExtras();
  const f = fugueById("chor001");
  const sop = wordsFor(f, 0)!;
  assert.ok(sop.first.length > 10 && !sop.borrowed);
  const alto = wordsFor(f, 1)!;
  assert.ok(alto.borrowed && alto.first === sop.first);
  // Not a chorale: no borrowing (BWV 228's voices have their own or none).
  assert.equal(wordsFor(fugueById("wtc1f01"), 1), null);
});

test("the stanza printed before a line's first syllable, the second line its own", async () => {
  await loadExtras();
  const withStanza = ["chor001", "chor002", "chor003", "chor004", "chor005", "chor006", "chor007", "chor008", "chor009", "chor010", "chor011", "chor012"].map(fugueById).find((f) => f.words?.stanzas?.length && f.lyricsSecond?.[0]?.length);
  if (!withStanza) return;
  const st = withStanza.words!.stanzas!;
  assert.ok(lyricsOf(withStanza, 0)![0].shown.startsWith(`${st[0]}. `));
  if (st[1]) assert.ok(lyricsOf(withStanza, 0, true)![0].shown.startsWith(`${st[1]}. `));
});

test("the box stacks the second line and fades a borrowed one", () => {
  const s = src("src/touch/MusicBox.tsx");
  assert.match(s, /const words = fr\.piece \? wordsFor\(fugueById\(fr\.piece\), fr\.voice\) : null;/);
  assert.match(s, /if \(words\.second\) paintLyrics\(g, words\.second, fr, \{ \.\.\.geo, drop: 7 \* \(bh >= 16 \? 2 : 1\) \+ 1 \}\);/);
  assert.match(s, /alpha: words\.borrowed \? 0\.7 : 1/);
});
