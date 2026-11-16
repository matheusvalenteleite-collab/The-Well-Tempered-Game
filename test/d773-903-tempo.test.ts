/**
 * D773: THE CHROMATIC FUGUE'S TEMPO WITHIN ITS RECORDINGS'. data/tempi/903-recordings.csv: the Fugue's own track on 15
 * Apple Music store pages (each URL in the file), turned into the average crotchet over its 161 bars: 70-116. DEFAULT 76 lies
 * inside (near the slow end: the busiest line's 5.1 notes a second there), so it stays, on DEFAULT. No Busoni reading of BWV
 * 903 is encoded (data/touch/readings.json): the default reading, the closing ritard only.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { OPENING_STEP, tempoOf } from "../src/touch/tempi.ts";

before(async () => {
  await loadExtras();
});

test("D773: BWV 903-2 opens inside its 15 recordings' range, on DEFAULT; no Busoni reading encoded", () => {
  const rows = readFileSync(new URL("../data/tempi/903-recordings.csv", import.meta.url), "utf8").trim().split("\n").slice(1).map((l) => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1]));
  assert.ok(rows.every((r) => r[0] === "bwv903-2" && /^https:\/\/classical\.music\.apple\.com\/us\/album\/\d+$/.test(r[5]) && /^\d+:\d\d$/.test(r[4]) && /fug/i.test(r[7])));
  const f = fugueById("bwv903-2");
  const q = f.length / f.tpq;
  const t = rows.map((r) => { const [m, s] = r[4].split(":").map(Number); return q / ((m * 60 + s) / 60); }).sort((a, b) => a - b);
  assert.equal(t.length, 15);
  assert.ok(tempoOf("bwv903-2") >= t[0] && tempoOf("bwv903-2") <= t.at(-1)!, `${tempoOf("bwv903-2")} outside ${t[0].toFixed(1)}-${t.at(-1)!.toFixed(1)}`);
  assert.equal(OPENING_STEP["bwv903-2"], undefined);
  const readings = JSON.parse(readFileSync(new URL("../data/touch/readings.json", import.meta.url), "utf8"));
  assert.ok(!("bwv903-2" in readings));
});
