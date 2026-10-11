// P22: the commentators' notes: every one on a chorale of the study, inside it, with its citation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { commentaryFor } from "../src/ui/chorale-commentary.ts";

const study = JSON.parse(readFileSync("data/chorales/study.json", "utf8")) as { chorales: { n: number; meter: string; pickup: number; length: number; voices: [number, number, string][][] }[] };
const data = JSON.parse(readFileSync("data/playback/chorale-commentary.json", "utf8")) as { notes: { n: number }[] };

test("P22: each written note lies inside its chorale and cites its source", () => {
  for (const n of new Set(data.notes.map((x) => x.n))) {
    const c = study.chorales.find((x) => x.n === n);
    assert.ok(c, `chorale ${n}`);
    const [num, den] = c.meter.split("/").map(Number);
    for (const g of commentaryFor(n, (32 * num) / den, c.pickup)) {
      assert.ok(g.at >= 0 && g.at < c.length, `${n} at ${g.at}`);
      assert.match(g.cite ?? "", /, p\. \d/);
    }
  }
});

test("P22: Es ist genug's last line falls on the bass's chromatic descent (Pirro, p. 137)", () => {
  const c = study.chorales.find((x) => x.n === 216)!;
  const last = commentaryFor(216, 32, c.pickup).find((g) => g.text.includes("Jammer"))!;
  const bass = c.voices[3].filter((x) => x[0] >= last.at && x[0] < last.at + 64).map((x) => x[2]);
  assert.deepEqual(bass.slice(0, 7), ["A3", "G#3", "G3", "F#3", "F3", "E3", "D#3"]);
});
