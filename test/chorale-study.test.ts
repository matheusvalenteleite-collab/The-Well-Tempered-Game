import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../data/chorales/study.json" with { type: "json" };
import { parsePitch } from "../src/music/pitch.ts";

type Note = [number, number, string, 1?];
const D = data as unknown as { kinds: string[]; chorales: { n: number; length: number; pickup: number; meter: string; voices: Note[][]; harmony: [number, string, string, string, [number, number][]?][]; cadences: [number, string, string][]; kittel?: number[] }[] };

// C15: Bach's 370 settings, each voice filling the chorale without overlaps, every reading on an onset of the music.
test("Bach's settings: 370 chorales, four voices each, readings on the music's onsets", () => {
  assert.equal(D.chorales.length, 370);
  let kittel = 0;
  for (const c of D.chorales) {
    assert.equal(c.voices.length, 4, `no. ${c.n}`);
    const onsets = new Set<number>();
    for (const [v, notes] of c.voices.entries()) {
      for (let i = 0; i < notes.length; i++) {
        const [at, dur, pitch] = notes[i];
        assert.ok(dur > 0 && Number.isInteger(at) && Number.isInteger(dur), `no. ${c.n} voice ${v}`);
        assert.ok(Number.isFinite(parsePitch(pitch).midi), `no. ${c.n}: ${pitch}`);
        if (i > 0) assert.ok(at >= notes[i - 1][0] + notes[i - 1][1], `no. ${c.n} voice ${v}: overlap at ${at}`);
        onsets.add(at);
      }
      assert.ok(notes[notes.length - 1][0] + notes[notes.length - 1][1] <= c.length, `no. ${c.n} voice ${v} ends inside the chorale`);
    }
    for (const h of c.harmony) {
      assert.ok(onsets.has(h[0]), `no. ${c.n}: reading at ${h[0]} on no onset`);
      for (const [v, k] of h[4] ?? []) assert.ok(v >= 0 && v < 4 && k >= 0 && k < D.kinds.length);
    }
    assert.ok(c.cadences.length > 0, `no. ${c.n} has cadences`);
    // The soprano holds a fermata at the end of the chorale.
    assert.equal(c.voices[0][c.voices[0].length - 1][3], 1, `no. ${c.n}: the last soprano note has its fermata`);
    if (c.kittel) kittel++;
  }
  assert.equal(kittel, 77, "Bach's settings of Kittel's tunes (CONCORDANCE.md)");
});
