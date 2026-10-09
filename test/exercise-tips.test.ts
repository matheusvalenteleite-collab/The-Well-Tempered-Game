import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { FUX_FIRST_SPECIES_CURRICULUM } from "../src/counterpoint/curriculum/fux-first-species.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { exerciseTips, searchFirstSpecies } from "../src/game/exercise-tips.ts";

const repo = loadFuxRepository();

test("D103: the first-species search counts Fux's own lines among the correct ones, and finds a tight bar", () => {
  for (const s of FUX_FIRST_SPECIES_CURRICULUM) {
    const v = exerciseView(repo, s);
    const r = searchFirstSpecies(v.cantus, v.cantusVoice);
    assert.ok(r.lines > 0, s.id);
    if (v.fux) v.fux.forEach((p, k) => assert.ok(r.usable[k].includes(p as string), `${s.id} bar ${k + 1}: ${p}`));
    const tips = exerciseTips(v.cantus, v.cantusVoice, "first");
    assert.ok(tips.some((t) => t.kind === "tight" || t.kind === "forced"), s.id);
    const open = tips.find((t) => t.kind === "openings");
    assert.ok(open && open.kind === "openings" && open.notes.length >= 1);
  }
});

test("D107: the second-species search counts Fux's lines too (every downbeat of his on a counted line)", async () => {
  const { FUX_SECOND_SPECIES_CURRICULUM } = await import("../src/counterpoint/curriculum/fux-second-species.ts");
  const { searchSecondSpecies } = await import("../src/game/exercise-tips.ts");
  for (const s of FUX_SECOND_SPECIES_CURRICULUM) {
    const v = exerciseView(repo, s);
    const r = searchSecondSpecies(v.cantus, v.cantusVoice);
    assert.ok(r.lines > 0, s.id);
    if (v.fux)
      v.layout.forEach((sl, k) => {
        const note = v.fux![k];
        if (sl.beat === 0 && note && note.toLowerCase() !== "r") assert.ok(r.usable[sl.bar].includes(note), `${s.id} bar ${sl.bar + 1}: ${note}`);
      });
    assert.ok(exerciseTips(v.cantus, v.cantusVoice, "second").some((t) => t.kind === "freedom"));
  }
});
