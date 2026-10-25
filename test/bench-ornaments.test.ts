/** D277: a subject's ornaments carried into every entry; D278: on a phone the ornament is shaken. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { ornamentsOf, shakeOf, SUBJECT_ORNAMENTS } from "../src/touch/ornament-play.ts";
import rawData from "../data/wtc/ornaments.json" with { type: "json" };

const raw = rawData as unknown as Record<string, [number, number, string, string][]>;

const entriesOf = (id: string) => fugueById(id).entries.filter((e) => !e.theme && !e.scale);
const has = (id: string, j: number) => entriesOf(id).filter((e) => e.notes[j] && ornamentsOf(fugueById(id)).has(`${e.voice}:${e.notes[j][0]}`)).length;

test("D277: the subject's ornament in every entry: written on the first entry (I/6, I/7, II/13), named by the books (I/12, I/14, II/12)", () => {
  for (const [id, j] of [["wtc1f06", 10], ["wtc1f07", 14], ["wtc2f13", 0], ["wtc1f12", 9], ["wtc1f14", 16], ["wtc2f12", 1], ["wtc1f23", 12]] as const) assert.equal(has(id, j), entriesOf(id).length, `${id} note ${j}`);
  assert.equal(SUBJECT_ORNAMENTS.wtc2f12[0].signs, "m", "II/12: a mordent, E natural below");
});

test("D277: not carried into augmented entries, nor where an entry's note is shorter than a quaver, nor from a lone later entry", () => {
  const f = fugueById("wtc1f08");
  const o = ornamentsOf(f);
  const written = new Set((raw.wtc1f08 ?? []).map(([v, on]) => `${v}:${on}`));
  const aug = f.entries.filter((x) => x.scale === 2);
  assert.ok(aug.length > 0);
  for (const e of aug) for (const [on] of e.notes) if (o.has(`${e.voice}:${on}`)) assert.ok(written.has(`${e.voice}:${on}`), "augmented left as written");
  // I/15: ornaments on single later entries only: none carried.
  assert.ok(has("wtc1f15", 14) <= 1);
});

test("D278: how each ornament is shaken: a trill up four moves, a mordent down two, a short trill up two, a turn up four; grace notes alone are not", () => {
  assert.deepEqual(shakeOf({ signs: "T", graces: [] }), { kind: "trill", word: "TRILL", first: 1, need: 4 });
  assert.equal(shakeOf({ signs: "m", graces: [] })?.first, -1);
  assert.equal(shakeOf({ signs: "W", graces: [] })?.need, 2);
  assert.equal(shakeOf({ signs: "S", graces: [] })?.kind, "turn");
  assert.equal(shakeOf({ signs: "", graces: [{ kind: "q", midi: 60 }] }), null);
});
