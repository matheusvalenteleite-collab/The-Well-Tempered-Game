/**
 * D779: THE ALBINONI FUGUE (BWV 951). Its entries from its table (data/touch/951-entries.txt): the subject fifteen times,
 * the countersubject six; the notes untouched (the alto's descent to B2 in bars 93-96 in its written octave; the soprano's
 * closing chord, bar 112, as written). Its tempo inside its 16 recordings (data/tempi/951-recordings.csv: the BWV 951 Fugue's
 * own track on Apple Music's store pages; BWV 951a, the earlier version, not used), on DEFAULT; no Busoni reading encoded.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { OPENING_STEP, tempoOf } from "../src/touch/tempi.ts";

before(async () => {
  await loadExtras();
});

test("D779: BWV 951's entries by the table: 15 subject, 6 countersubject, each on a note; the alto to B2 in its octave", () => {
  const f = fugueById("bwv951");
  assert.equal(f.id, "bwv951");
  const E = f.entries;
  assert.deepEqual([E.length, E.filter((e) => (e.theme ?? 1) === 1).length, E.filter((e) => e.theme === 2).length], [21, 15, 6]);
  for (const e of E) assert.ok(f.voices[e.voice].some((n) => n[0] === e.on) && e.notes.length >= 10, `b. ${e.bar}`);
  assert.ok(new Set(E.filter((e) => e.theme === 2).map((e) => e.voice)).size >= 2, "the countersubject changes hands");
  assert.deepEqual(f.voices.map((v) => v.length), [909, 920, 1000]);
  const b94 = f.bars.find((b) => b.n === 94)!.on;
  assert.ok(f.voices[1].some((n) => n[0] === b94 && n[2] === 47), "the alto's B2 at bar 94 as written");
});

test("D779: BWV 951 opens inside its 16 recordings' range, on DEFAULT; no Busoni reading encoded", () => {
  const rows = readFileSync(new URL("../data/tempi/951-recordings.csv", import.meta.url), "utf8").trim().split("\n").slice(1).map((l) => [...l.matchAll(/("([^"]*)"|[^,]*)(,|$)/g)].map((m) => m[2] ?? m[1]));
  assert.ok(rows.every((r) => r[0] === "bwv951" && /^https:\/\/classical\.music\.apple\.com\/us\/album\/\d+$/.test(r[5]) && /^\d+:\d\d$/.test(r[4]) && /951(?!a)/.test(r[7])));
  const f = fugueById("bwv951");
  const q = f.length / f.tpq;
  const t = rows.map((r) => { const [m, s] = r[4].split(":").map(Number); return q / ((m * 60 + s) / 60); }).sort((a, b) => a - b);
  assert.equal(t.length, 16);
  assert.ok(tempoOf("bwv951") >= t[0] && tempoOf("bwv951") <= t.at(-1)!);
  assert.equal(OPENING_STEP.bwv951, undefined);
  assert.ok(!("bwv951" in JSON.parse(readFileSync(new URL("../data/touch/readings.json", import.meta.url), "utf8"))));
});
