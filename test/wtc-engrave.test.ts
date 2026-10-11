import { test } from "node:test";
import assert from "node:assert/strict";
import { engrave, spell, units } from "../src/wtc/engrave.ts";
import { LIBRARY } from "../src/wtc/library.ts";

const written = (p: number, len: number, time: string, rest = false) => spell(p, len, time, rest).map((v) => `${v.dur}${".".repeat(v.dots)}${v.triplet ? "t" : ""}`).join(" ");

test("engraving: the metre's units", () => {
  const u = (t: string) => {
    const { beat, beam, bar } = units(t);
    return { beat, beam, bar };
  };
  assert.deepEqual(u("4/4"), { beat: 1, beam: 1, bar: 4 });
  assert.deepEqual(u("6/8"), { beat: 1.5, beam: 1.5, bar: 3 });
  assert.deepEqual(u("12/16"), { beat: 0.75, beam: 0.75, bar: 3 });
  assert.deepEqual(u("3/8"), { beat: 0.5, beam: 1.5, bar: 1.5 });
  assert.deepEqual(u("2/2"), { beat: 2, beam: 2, bar: 4 });
});

test("engraving: lengths written to show the metre", () => {
  // Book I no. 1, bar 3, alto: a quarter on beat 2 tied to an eighth (Bach's [4g 8g]), not a dotted quarter over the middle.
  assert.equal(written(1, 1.5, "4/4"), "q 8");
  // Bar 2: an eighth on the off-beat tied to a sixteenth (Bach's [8g 16g]), not a dotted eighth over the beat.
  assert.equal(written(0.5, 0.75, "4/4"), "8 16");
  assert.equal(written(0, 1.5, "4/4"), "q.");
  assert.equal(written(0.5, 1, "4/4"), "q"); // the syncopation Bach writes
  assert.equal(written(1, 2, "4/4"), "h"); // 4 2 4
  assert.equal(written(1, 3, "4/4"), "h q"); // a dotted half does not hide the middle
  assert.equal(written(0, 3, "6/8"), "h.");
  assert.equal(written(0, 1 / 3, "4/4"), "8t");
  // Rests: on their own grid.
  assert.equal(written(0.5, 1.5, "4/4", true), "8 q");
  assert.equal(written(0, 1.5, "6/8", true), "q.");
  // Compound time (the audit of D147): dotted rests on the beats, long notes in whole beats.
  assert.equal(written(1.5, 1.5, "6/8", true), "q.");
  assert.equal(written(0, 1.5, "12/16", true), "8. 8.");
  assert.equal(written(0.75, 1.5, "12/16"), "8. 8.");
  assert.equal(written(2, 3, "3/2"), "h.");
  // A rest ending on a triplet: plain values, then the triplet.
  assert.equal(written(0, 10 / 3, "2/2", true), "h q 8t");
});

test("engraving: Book I no. 1, bar 1 (the subject alone, in the alto)", () => {
  const P = LIBRARY.find((x) => x.id === "wtc1.01")!.fugue();
  const e = engrave(P);
  const bar = e.bars[0];
  assert.equal(bar.staves[1].length, 0);
  assert.equal(bar.staves[0].length, 1);
  const l = bar.staves[0][0];
  assert.equal(l.stem, 0);
  assert.deepEqual(
    l.items.map((it) => `${it.rest ? "r" : it.keys[0].pitch}:${it.dur}${".".repeat(it.dots)}`),
    ["r:8", "C4:8", "D4:8", "E4:8", "F4:8.", "G4:32", "F4:32", "E4:8", "A4:8"],
  );
  // Beams by the beat: D-E, F-G-F, E-A.
  assert.deepEqual(l.items.map((it) => it.beam ?? 0), [0, 0, 1, 1, 2, 2, 2, 3, 3]);
});

test("engraving: every bar of the 48 adds up, every note is written once", () => {
  for (const L of LIBRARY)
    for (const P of [L.fugue(), L.prelude()]) {
      const e = engrave(P);
      const starts = new Map<number, number>();
      for (const b of e.bars)
        for (const layers of b.staves)
          for (const l of layers) {
            const sum = l.items.reduce((a, it) => a + it.len, 0);
            assert.ok(Math.abs(sum - (b.to - b.from)) < 1e-6, `${L.id} bar ${b.index + 1}: ${sum}`);
            for (const it of l.items) if (!it.tieIn) for (const k of it.keys) starts.set(k.i, (starts.get(k.i) ?? 0) + 1);
          }
      // Each note struck once; left out only: a note doubling another of its voice (an ossia encoded
      // beside the main line), or sharing a step with another of its chord.
      const step = (i: number) => P.spelled[i].replace(/[#b]+/, "");
      const doubled = (i: number) => P.notes.some((n, j) => j !== i && starts.has(j) && P.voice[j] === P.voice[i] && Math.abs(n.at - P.notes[i].at) < 1e-6 && step(j) === step(i));
      const missing = P.notes.map((_, i) => i).filter((i) => !starts.has(i) && !doubled(i));
      assert.ok(missing.length <= P.notes.length * 0.01, `${L.id}: ${missing.length} notes not written`);
      assert.ok([...starts.values()].every((n) => n === 1), `${L.id}: a note written twice`);
    }
});
