/**
 * D780-D789: BWV 906 (the Fantasia and the unfinished Fugue in C minor) and BWV 998 (the Prelude, Fugue and Allegro in
 * E-flat), given the instruments session's treatment. Their entries from a reviewed table (data/touch/906-998-entries.txt:
 * only a real returning subject or motive), the notes untouched (the Fantasia's second lines the band's as D755 imported
 * them; the Fugue ending on bar 48's first beat); each on its own sound (piece-sound.ts), on which nothing is read past
 * STRETCH_MAX or past its set's reach (the Fantasia's left hand seated on its own, D781); the tempi inside their recordings
 * (data/tempi/906-recordings.csv, 998-recordings.csv: Apple Music's store pages), no Busoni reading encoded.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { OPENING_STEP, tempoOf } from "../src/touch/tempi.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { pieceLineUp } from "../src/touch/sound.ts";
import { FUGUE_STYLES } from "../src/touch/drum-library.ts";
import { COLLECTIONS, auditCollection } from "../tools/touch/stretch/collections.ts";
import { LOW_LINE_FREE } from "../tools/touch/octaves/seats.ts";

const IDS = ["bwv906-1", "bwv906-2", "bwv998-1", "bwv998-2", "bwv998-3"] as const;

before(async () => {
  await loadExtras();
});

test("D780: the entries by the table; the notes as imported", () => {
  const want: Record<string, [number, number[], [number, number][]]> = {
    "bwv906-1": [15, [707, 496], [[0, 50], [1, 11]]],
    "bwv906-2": [8, [348, 178, 333], []],
    "bwv998-1": [5, [548, 101], [[0, 19]]],
    "bwv998-2": [17, [827, 540, 377], [[2, 50]]],
    "bwv998-3": [4, [535, 213], []],
  };
  for (const id of IDS) {
    const f = fugueById(id);
    const [n, voices, band] = want[id];
    assert.equal(f.entries.length, n, id);
    for (const e of f.entries) assert.ok(f.voices[e.voice].some((x) => x[0] === e.on), `${id} b. ${e.bar}`);
    assert.deepEqual(f.voices.map((v) => v.length), voices, id);
    assert.deepEqual((f.bandVoices ?? []).map((b) => [b.of, b.notes.length]), band, id);
  }
  // The Fantasia's motive in the left hand too (its inversion as the hands change parts, 5-6, 19-20).
  assert.ok(fugueById("bwv906-1").entries.some((e) => e.voice === 1 && e.inverted));
  // The unfinished Fugue: it stops on bar 48's first beat, nothing added.
  const g = fugueById("bwv906-2");
  assert.equal(g.length, g.bars.find((b) => b.n === 48)!.on + g.tpq);
});

test("D781, D782, D789: each on its sound, nothing past STRETCH_MAX or its set's reach; the Fantasia's left hand on the piano", () => {
  assert.deepEqual(IDS.map((id) => PIECE_SOUND[id]), ["jazzQuartet", "abbeyRoad", "chorinho", "salsa", "gameboy"]);
  const more = COLLECTIONS.find(([n]) => n === "more bach")![1];
  for (const id of IDS) {
    const r = auditCollection("more bach", [more.find((p) => p.id === id)!], [PIECE_SOUND[id]]);
    assert.deepEqual([r.moves, r.stretched.length, r.undeclared.length], [0, 0, 0], id);
  }
  assert.ok(LOW_LINE_FREE.has("bwv906-1"));
  const lu = pieceLineUp("jazzQuartet", fugueById("bwv906-1"));
  assert.deepEqual(lu?.slots.map((s) => s[0]), ["jqVibes", "jqPiano"]);
  // D891, D894: the tabor withdrawn: the Prelude (calm) none, the Allegro none (no remaining kit under the band in its thin bars).
  assert.deepEqual(IDS.map((id) => FUGUE_STYLES[id]), ["brushes", "abbey", "none", "bossa", "none"]);
});

test("D783: the tempi inside their recordings (both halves repeated where the print repeats them); no Busoni reading", () => {
  const rows = ["906", "998"].flatMap((w) =>
    readFileSync(new URL(`../data/tempi/${w}-recordings.csv`, import.meta.url), "utf8").trim().split("\n").slice(1).map((l) => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1])),
  );
  assert.ok(rows.every((r) => (IDS as readonly string[]).includes(r[0]) && /^https:\/\/classical\.music\.apple\.com\/us\/album\/\d+$/.test(r[5]) && /^\d+:\d\d$/.test(r[4])));
  const readings = JSON.parse(readFileSync(new URL("../data/touch/readings.json", import.meta.url), "utf8"));
  const counts: number[] = [];
  for (const id of IDS) {
    const f = fugueById(id);
    const q = (f.length / f.tpq) * (id === "bwv906-1" || id === "bwv998-3" ? 2 : 1);
    const t = rows.filter((r) => r[0] === id).map((r) => { const [m, s] = r[4].split(":").map(Number); return q / ((m * 60 + s) / 60); }).sort((a, b) => a - b);
    counts.push(t.length);
    assert.ok(tempoOf(id) >= t[0] && tempoOf(id) <= t.at(-1)!, `${id}: ${tempoOf(id)} outside ${t[0].toFixed(1)}-${t.at(-1)!.toFixed(1)}`);
    assert.equal(OPENING_STEP[id], undefined);
    assert.ok(!(id in readings), id);
  }
  assert.deepEqual(counts, [30, 5, 63, 15, 65]);
  // The Fugue in E-flat brought down to its fastest recording, floored (78.98; the reference 80).
  assert.equal(tempoOf("bwv998-2"), 78);
});
