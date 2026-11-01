import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { laneNotes } from "../src/touch/lanes.ts";
import { cardById } from "../src/bench/cards.ts";
import { judgeSeal, type RunFacts } from "../src/bench/seals.ts";

/** A run of one voice: every note right (or the ones listed wrong), every entry captured (or lost where a note is wrong). */
function run(id: string, voice: number, o: { wrong?: number[]; grade?: string; tuning?: string; whole?: boolean } = {}): RunFacts {
  const f = fugueById(id);
  const beat = beatOf(f).ticks;
  const notes = laneNotes(f.voices[voice], beat, voice).map((n, i) => ({ ...n, state: o.wrong?.includes(i) ? ("miss" as const) : ("hit" as const) }));
  const bad = new Set(notes.filter((n) => n.state === "miss").map((n) => n.on));
  const entries = f.entries.filter((e) => e.voice === voice).map((e) => ({ voice, on: e.on, end: e.end, state: e.notes.some(([on]) => bad.has(on)) ? ("lost" as const) : ("captured" as const) }));
  return { f, tracks: [{ voice, notes }], entries, beat, grade: o.grade ?? "S", tuning: o.tuning ?? "equal", whole: o.whole ?? true };
}

test("seals: a clean whole run earns them; a slip, a part run, the wrong tuning do not", () => {
  const i1 = cardById("wtc1f01")!;
  assert.equal(judgeSeal(i1, run("wtc1f01", 0)).earned, true, "STRETTO, all captured");
  const f1 = fugueById("wtc1f01");
  const firstStretto = f1.entries.find((a) => a.voice === 0 && f1.entries.some((b) => b !== a && b.on < a.end && a.on < b.end))!;
  const idx = laneNotes(f1.voices[0], beatOf(f1).ticks, 0).findIndex((n) => n.on === firstStretto.notes[1][0]);
  assert.equal(judgeSeal(i1, run("wtc1f01", 0, { wrong: [idx] })).earned, false, "a stretto entry lost");
  assert.equal(judgeSeal(i1, run("wtc1f01", 0, { whole: false })).earned, false, "not from the first bar");
  const i3 = cardById("wtc1f03")!;
  assert.equal(judgeSeal(i3, run("wtc1f03", 0)).earned, false, "TEMPERAMENT in equal");
  assert.equal(judgeSeal(i3, run("wtc1f03", 0, { tuning: "werckmeister" })).earned, true);
  assert.equal(judgeSeal(i3, run("wtc1f03", 0, { tuning: "werckmeister", grade: "C" })).earned, false);
  const i8 = cardById("wtc1f08")!;
  const giants = fugueById("wtc1f08").entries.filter((e) => e.scale === 2);
  assert.ok(giants.length);
  assert.equal(judgeSeal(i8, run("wtc1f08", giants[0].voice)).earned, true, "SLOW GIANT");
  const i10 = cardById("wtc1f10")!;
  // D219: DUET needed TWO VOICES (withdrawn): not offered, never earned.
  assert.equal(i10.ready, false);
  assert.equal(judgeSeal(i10, run("wtc1f10", 0)).earned, false, "DUET not offered");
  const i2 = cardById("wtc1f02")!;
  assert.equal(judgeSeal(i2, run("wtc1f02", 1)).earned, true, "NO SLIP");
  assert.equal(judgeSeal(i2, run("wtc1f02", 1, { wrong: [3] })).earned, false);
  // SUBJECTS (D197): Book I no. 4's first soprano has all three subjects; losing its first
  // statement of the third (b. 52) loses the seal.
  const i4 = cardById("wtc1f04")!;
  assert.equal(judgeSeal(i4, run("wtc1f04", 0)).earned, true, "SUBJECTS, all three captured");
  const f4 = fugueById("wtc1f04");
  const third = f4.entries.filter((e) => e.voice === 0 && e.theme === 3);
  assert.equal(third.length, 1);
  const lost = laneNotes(f4.voices[0], beatOf(f4).ticks, 0).findIndex((n) => n.on === third[0].notes[0][0]);
  assert.equal(judgeSeal(i4, run("wtc1f04", 0, { wrong: [lost] })).earned, false, "the third subject lost");
});
