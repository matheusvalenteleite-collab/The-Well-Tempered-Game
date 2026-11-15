/**
 * D733: THE INVENTIONS' AND SINFONIAS' OPENING TEMPO WITHIN THE RECORDINGS'. data/tempi/inv-recordings.csv: track
 * durations on Apple Music's store pages (14 complete sets, each with its URL), each turned into the average quarter-note
 * tempo over the piece's length as the game has it; Invention 6's recordings play its two repeats (the game each half
 * once), so its tempi are read over the piece twice. For all 30 the tempo the piece opens on (tempi.ts tempoOf) lies
 * between the slowest and the fastest recording used; FAST opens only where DEFAULT lay under every one of them (Invention
 * 10, Sinfonia 6); where the reference lay over every one (Invention 9, Sinfonia 4) DEFAULT is the fastest recording's, the
 * reference (difficulty, stars) unchanged. No tempo change but the closing ritard (D181): no Busoni reading of these is
 * in the game (readings.json), so none of his marked endings either.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { INV_FAST, MORE_TEMPO, OPENING_STEP, standardTempo, tempoOf } from "../src/touch/tempi.ts";

before(async () => {
  await loadExtras();
});

/** CSV rows, quotes respected. */
const rows = readFileSync(new URL("../data/tempi/inv-recordings.csv", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((l) => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1]).slice(0, 8));
const IDS = Array.from({ length: 30 }, (_, i) => `bwv${772 + i}`);
const REPEATS = new Set(["bwv777"]);

function implied(id: string): number[] {
  const f = fugueById(id);
  const q = (f.length / f.tpq) * (REPEATS.has(id) ? 2 : 1);
  return rows
    .filter((r) => r[0] === id && r[6] === "yes")
    .map((r) => {
      const [m, s] = r[4].split(":").map(Number);
      return q / ((m * 60 + s) / 60);
    })
    .sort((a, b) => a - b);
}

test("D733: every Invention and Sinfonia opens at a tempo inside its recordings' range (at least 13 recordings each, each with its store page)", () => {
  assert.ok(rows.length >= 400);
  assert.ok(rows.every((r) => /^https:\/\/classical\.music\.apple\.com\/\w\w\/album\/\d+$/.test(r[5]) && /^\d+:\d\d$/.test(r[4]) && (r[6] === "yes" || r[6] === "no")));
  for (const id of IDS) {
    const t = implied(id);
    assert.ok(t.length >= 13, `${id}: ${t.length} recordings`);
    const bpm = tempoOf(id);
    assert.ok(bpm >= t[0] && bpm <= t.at(-1)!, `${id}: ${bpm} outside ${t[0].toFixed(1)}-${t.at(-1)!.toFixed(1)}`);
    assert.equal(OPENING_STEP[id] === "fast", MORE_TEMPO[id].normal < t[0], `${id}: FAST exactly where DEFAULT is under every recording`);
  }
  assert.deepEqual([...INV_FAST], ["bwv781", "bwv792"]);
  // The reference (difficulty and stars) unchanged where DEFAULT came down to the fastest recording.
  assert.deepEqual([standardTempo("bwv780"), MORE_TEMPO.bwv780.normal, standardTempo("bwv790"), MORE_TEMPO.bwv790.normal], [72, 66, 60, 50]);
  // The one track left out: Rübsam's BWV 772a, another text.
  assert.deepEqual(rows.filter((r) => r[6] === "no").map((r) => r[0]), ["bwv772"]);
});
