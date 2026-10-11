import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guideNotes, MOST, type GuideChorale } from "../src/music/chorale-guide.ts";
import en from "../src/content/en.json" with { type: "json" };

const study = JSON.parse(readFileSync("data/chorales/study.json", "utf8")) as { chorales: (GuideChorale & { n: number })[] };
const byN = (n: number) => study.chorales.find((c) => c.n === n)!;

test("P17: every chorale's moments are few, in order, and each has its sentence", () => {
  const listen = (en as unknown as Record<string, Record<string, string>>).listen;
  for (const c of study.chorales) {
    const g = guideNotes(c);
    assert.ok(g.length <= MOST);
    assert.deepEqual(g.map((x) => x.at), [...g.map((x) => x.at)].sort((a, b) => a - b));
    for (const x of g) {
      const key = x.kind === "chromatic" ? `chromatic.${x.vars.way}` : x.kind;
      assert.ok(listen[key], key);
      for (const v of listen[key].match(/\{(\w+)\}/g) ?? []) assert.ok(v.slice(1, -1) in x.vars, `${key} ${v}`);
    }
  }
});

test("P17: a chromatic line, a false relation, a Picardy third, read off the notes", () => {
  // No. 2: the bass climbs C#-D-D#-E.
  assert.deepEqual(guideNotes(byN(2)).find((g) => g.kind === "chromatic")?.vars, { voice: "bass", from: "C♯", to: "E", way: "up" });
  // No. 11: F in the tenor, F# in the bass at the next chord.
  assert.equal(guideNotes(byN(11)).find((g) => g.kind === "falseRelation")?.vars.second, "F♯");
  // A chord change inside one voice (D-D# in No. 3's bass) is a line, not a false relation.
  assert.ok(!guideNotes(byN(3)).some((g) => g.kind === "falseRelation" && g.at === 300));
  const minorMajorEnd = study.chorales.filter((c) => guideNotes(c).some((g) => g.kind === "picardy"));
  assert.ok(minorMajorEnd.every((c) => ["minor", "dorian", "phrygian"].includes(c.mode)));
});
