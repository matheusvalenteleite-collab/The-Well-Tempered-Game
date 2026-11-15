/**
 * D743: THE FOUR DUETS' OPENING TEMPO WITHIN THE RECORDINGS'. data/tempi/duet-recordings.csv: track durations on Apple
 * Music's store pages (19 recordings, each URL in the file), each turned into the average quarter-note tempo over the piece
 * as the game has it (the beat units compared in crotchets: 802's 3/8, 804's 12/8, 805's alla breve). Every Duet opens
 * inside its range, on DEFAULT (none lay under every recording, so none opens on FAST); no tempo change but the closing ritard.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { MORE_TEMPO, OPENING_STEP, tempoOf } from "../src/touch/tempi.ts";

before(async () => {
  await loadExtras();
});
const rows = readFileSync(new URL("../data/tempi/duet-recordings.csv", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((l) => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1]).slice(0, 8));

test("D743: every Duet opens at a tempo inside its recordings' range (at least 15 each, each with its store page), on DEFAULT", () => {
  assert.ok(rows.every((r) => /^https:\/\/classical\.music\.apple\.com\/\w\w\/album\/\d+$/.test(r[5]) && /^\d+:\d\d$/.test(r[4])));
  for (const id of ["bwv802", "bwv803", "bwv804", "bwv805"]) {
    const f = fugueById(id);
    const q = f.length / f.tpq;
    const t = rows.filter((r) => r[0] === id && r[6] === "yes").map((r) => { const [m, s] = r[4].split(":").map(Number); return q / ((m * 60 + s) / 60); }).sort((a, b) => a - b);
    assert.ok(t.length >= 15, `${id}: ${t.length}`);
    const bpm = tempoOf(id);
    assert.ok(bpm >= t[0] && bpm <= t.at(-1)!, `${id}: ${bpm} outside ${t[0].toFixed(1)}-${t.at(-1)!.toFixed(1)}`);
    assert.equal(OPENING_STEP[id], undefined);
    assert.equal(bpm, MORE_TEMPO[id].normal);
  }
});
