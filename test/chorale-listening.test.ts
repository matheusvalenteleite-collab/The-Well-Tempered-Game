import { test } from "node:test";
import assert from "node:assert/strict";
import raw from "../data/chorales/listening.json" with { type: "json" };
import { notesFor, type ListeningData } from "../src/chorale/listening-notes.ts";

const data = raw as unknown as ListeningData;

test("the listening guide: every chorale has its notes, in time order, each with a sentence", () => {
  assert.equal(Object.keys(data.chorales).length, 370);
  for (const n of Object.keys(data.chorales)) {
    const notes = notesFor(data, Number(n));
    assert.ok(notes.some((x) => x.kind === "peak"), `chorale ${n}: no peak`);
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i].at >= notes[i - 1].at);
    for (const x of notes) {
      assert.ok(!x.text.includes("{"), `chorale ${n}: ${x.text}`);
      assert.ok(x.voices.every((v) => v >= 0 && v < 4));
    }
  }
});

test("the listening guide: a false relation is never one voice altering its own note (No. 9, bar 2: the bass D-D#)", () => {
  const notes = notesFor(data, 9);
  assert.ok(!notes.some((x) => x.kind === "crossRelation" && x.at === 64));
});
