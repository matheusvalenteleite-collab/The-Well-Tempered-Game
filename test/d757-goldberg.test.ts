/**
 * D757: THE GOLDBERG VARIATIONS, BWV 988, a section of MORE BACH (the owner: "Put it in MORE BACH first. If I like it,
 * it'll be promoted"): the Aria and thirty variations in Bach's order, NEXT among them and from Variation 30 back to the
 * Aria (no Aria da capo tile, the file's copy being the Aria's notes); only the lines worth playing offered (the owner:
 * no boring lines); their ornaments kept as signs (none written out), Variation 26 transcribed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GOLD_IDS, LITE_TABS, liteNextOrder, liteTabOf, MORE_SECTIONS, OWN_TAB_SECTIONS } from "../src/bench/lite.ts";
import { nextIn } from "../src/bench/flow.ts";

type Piece = { id: string; collection?: string; voices: number[][][]; voiceNames: string[]; playable?: number[]; ornaments?: [number, number, string, null, string[]?][]; meter: string; bars: { n: number }[] };
const MORE: Piece[] = JSON.parse(readFileSync(new URL("../data/touch/more-bach.json", import.meta.url), "utf8"));
const gold = MORE.filter((p) => p.collection === "goldberg");

test("D757: the Aria and thirty variations, a MORE BACH section, NEXT among them and from Variation 30 to the Aria", () => {
  assert.deepEqual(GOLD_IDS, Array.from({ length: 31 }, (_, n) => `bwv988-${String(n).padStart(2, "0")}`));
  assert.ok(!GOLD_IDS.includes("bwv988-31"), "no Aria da capo tile");
  assert.ok(MORE_SECTIONS.some((s) => s.id === "goldberg" && s.title === "GOLDBERG VARIATIONS"));
  assert.ok(!OWN_TAB_SECTIONS.includes("goldberg") && !LITE_TABS.some(([, t]) => /GOLDBERG/.test(t)), "no tab of its own (yet)");
  for (const id of GOLD_IDS) assert.equal(liteTabOf(id), "MORE", id);
  assert.deepEqual(liteNextOrder("bwv988-12"), [...GOLD_IDS]);
  assert.equal(nextIn(liteNextOrder("bwv988-30"), "bwv988-30"), "bwv988-00");
});

test("D757: only the lines worth playing offered (the Aria's ground, the accompaniments, the slow basses the band's)", () => {
  const by = (id: string) => gold.find((p) => p.id === id)!;
  assert.deepEqual(by("bwv988-00").playable, [0], "the Aria: its melody");
  assert.deepEqual(by("bwv988-13").playable, [0]);
  assert.deepEqual(by("bwv988-25").playable, [0]);
  assert.deepEqual(by("bwv988-26").playable, [0, 2], "Variation 26: the hands, not the sarabande's lower voice");
  assert.equal(by("bwv988-01").playable, undefined, "both hands of a two-part variation");
  for (const p of gold) for (const v of p.playable ?? []) assert.ok(v < p.voices.length && p.voices[v].length > 40, `${p.id} v${v}`);
});

test("D757: the ornaments kept as signs on their notes, the appoggiaturas with them; no ornament written out", () => {
  let signs = 0;
  let graces = 0;
  for (const p of gold) {
    for (const [v, on, s, written, g] of p.ornaments ?? []) {
      assert.ok(p.voices[v].some((n) => n[0] === on), `${p.id}: an ornament at ${on} on a note of voice ${v}`);
      assert.equal(written, null, `${p.id}: nothing written out`);
      assert.match(s, /^[TMWS$]*$/, `${p.id}: kern's signs`);
      if (s) signs++;
      for (const x of g ?? []) assert.match(x, /^[qQ][A-G][#b]?\d$/, `${p.id}: an appoggiatura as "Q" + pitch`);
      if (g?.length) graces++;
    }
  }
  assert.ok(signs > 150 && graces > 70, `${signs} signs, ${graces} notes with appoggiaturas`);
  // The Aria: the hooked trills from below as trills (SOURCE.md).
  const aria = gold.find((p) => p.id === "bwv988-00")!;
  assert.ok((aria.ornaments ?? []).filter(([, , s]) => s === "T").length >= 4);
});

test("D757: each piece's metre, voices and bars; Variation 26 transcribed (three voices, in 3/4)", () => {
  assert.equal(gold.length, 31);
  const v26 = gold.find((p) => p.id === "bwv988-26")!;
  assert.equal(v26.meter, "3/4");
  assert.deepEqual(v26.voiceNames, ["Upper", "Middle", "Lower"]);
  assert.equal(v26.bars.length, 32);
  // Each half once: Variation 2's first endings (bars 16, 33) left out.
  const v2 = gold.find((p) => p.id === "bwv988-02")!;
  assert.ok(!v2.bars.some((b) => b.n === 16 || b.n === 33) && v2.bars.some((b) => b.n === 17));
  for (const p of gold) assert.ok(p.voices.length >= 2 && p.voices.length <= 4 && p.voices.length === p.voiceNames.length, p.id);
});
