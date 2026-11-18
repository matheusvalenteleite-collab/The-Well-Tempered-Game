/**
 * D871: THE ART OF FUGUE'S PRINTED ARTICULATION (tools/touch/aof-print.ts): the marks and slurs the Mutopia text and
 * Sapp's encoding of BG 25.1 agree on, as a whole reading "print", played where a piece has no BUSONI reading.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readingsOf, wholeReadingOf } from "../src/touch/readings.ts";

type P = { id: string; collection?: string; voices: [number, number, number, number][][] };
const MORE: P[] = JSON.parse(readFileSync(new URL("../data/touch/more-bach.json", import.meta.url), "utf8"));
const AOF = MORE.filter((p) => p.collection === "aof" && readingsOf(p.id).some((r) => r.id === "print"));

test("D871: the Art of Fugue's pieces carry the print's reading; the WTC keeps BUSONI's", () => {
  assert.ok(AOF.length >= 19, `${AOF.length}`);
  for (const p of AOF) assert.equal(wholeReadingOf(p.id)?.id, "print", p.id);
  assert.equal(wholeReadingOf("wtc1f01")?.id, "busoni");
});

test("D871: every printed mark on a note of its voice; every slur inside one voice, forward", () => {
  for (const p of AOF) {
    const w = wholeReadingOf(p.id)!.whole!;
    for (const m of w.marks) {
      assert.ok(["staccato", "fermata"].includes(m.art), `${p.id}: ${m.art}`);
      assert.ok(p.voices[m.v].some((n) => n[0] === m.on), `${p.id} v${m.v} ${m.on}`);
    }
    for (const s of w.slurs) {
      assert.ok(s.to > s.from, `${p.id} slur ${s.from}`);
      assert.ok(p.voices[s.v].some((n) => n[0] === s.from) && p.voices[s.v].some((n) => n[0] === s.to), `${p.id} slur v${s.v} ${s.from}-${s.to}`);
    }
  }
  const total = AOF.reduce((a, p) => a + wholeReadingOf(p.id)!.whole!.slurs.length, 0);
  assert.ok(total >= 150, `${total} slurs`);
});
