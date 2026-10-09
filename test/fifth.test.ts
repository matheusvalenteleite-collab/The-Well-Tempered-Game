import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { ALL_STEPS, rulesForStep } from "../src/counterpoint/curriculum/index.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { evaluate } from "../src/counterpoint/engine.ts";
import { HOLD, sounding } from "../src/counterpoint/layout.ts";

const repo = loadFuxRepository();
const steps = ALL_STEPS.filter((s) => s.species === "fifth");
export const judge = (stepId: string, notes: (string | null)[]) => {
  const s = ALL_STEPS.find((x) => x.id === stepId)!;
  const v = exerciseView(repo, s);
  return evaluate({ species: v.species, modalFinal: v.modalFinal, cantusVoice: v.cantusVoice, cantus: v.cantus.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: notes.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: v.layout[k].duration })) }, rulesForStep(s.id));
};
const ids = (ev: ReturnType<typeof judge>) => ev.violations.map((x) => `${x.ruleId}@${x.positions.join(",")}`);

test("fifth species (D82): twelve steps; Fux's twelve solutions clear every rule (D39), but for the limping crotchets he marks NB himself (Fig. 88a, bar 5)", () => {
  assert.equal(steps.length, 12);
  for (const s of steps) {
    const v = exerciseView(repo, s);
    assert.ok(v.fux, s.id);
    const got = ids(judge(s.id, v.fux!));
    if (s.exercise_id === "fux_2v_fig_088a") {
      assert.equal(got.length, 1, `${s.id}: ${got}`);
      assert.match(got[0], /^fis\.limping@/);
      // Bar 5 (index 4) of the eighth-note grid: slots 32..39.
      const slot = Number(got[0].split("@")[1].split(",")[0]);
      assert.equal(Math.floor(slot / 8), 4, got[0]);
    } else assert.deepEqual(got, [], s.id);
  }
});

test("fifth species: each rule catches its fault (D82)", () => {
  const step = steps[0]; // Fig. 82, D, cantus below: D4 F4 E4 D4 G4 F4 A4 G4 F4 E4 D4
  const v = exerciseView(repo, step);
  const fux = v.fux!;
  const fails = (notes: (string | null)[]) => ids(judge(step.id, notes)).map((x) => x.split("@")[0]);
  // Two quavers on the first crotchet (bar 3, cantus E4: C5, B4 instead of Fux's crotchet G4).
  const q = [...fux];
  q[16] = "C5";
  q[17] = "B4";
  assert.ok(fails(q).includes("fis.quavers"), fails(q).join());
  // A dissonance struck on a downbeat (bar 3, cantus E4: write F4 on the downbeat).
  const d = [...fux];
  d[16] = "F4";
  assert.ok(fails(d).includes("fis.downbeat-consonance"), fails(d).join());
  // A tie begun in the first half of the bar: hold the downbeat note of bar 4 over into bar 5.
  const t = [...fux];
  for (let k = 25; k < 32; k++) t[k] = HOLD;
  t[32] = HOLD;
  assert.ok(fails(t).includes("fis.ligature"), fails(t).join());
  // The limping crotchets of p. 80: not a fault before Aloysius gives the advice (step 11).
  const l = [...fux];
  l.splice(40, 9, "D5", HOLD, "C5", HOLD, "Bb4", HOLD, HOLD, HOLD, "A4");
  assert.ok(!fails(l).includes("fis.limping"), fails(l).join());
  assert.ok(rulesForStep("fux-mode.s5.11").some((r) => r.id === "fis.limping"));
  assert.ok(!rulesForStep("fux-mode.s5.10").some((r) => r.id === "fis.limping"));
});

test("fifth species: entry spans and holds (D82)", async () => {
  const { initialState, spanFromSelected, holdSelected, clearSpan, select, place } = await import("../src/game/session.ts");
  const { slotLayout } = await import("../src/counterpoint/layout.ts");
  const layout = slotLayout("fifth", 3);
  let s = place(initialState(layout.length), 4, "A4");
  s = spanFromSelected(s, layout, 4); // a minim on the second half of bar 1
  assert.deepEqual(s.notes.slice(0, 9), [null, null, null, null, "A4", HOLD, HOLD, HOLD, null]);
  s = holdSelected(select(s, 8), layout, 2); // tied over into bar 2 for a crotchet
  assert.deepEqual(s.notes.slice(8, 11), [HOLD, HOLD, null]);
  s = place(select(s, 6), 6, "G4"); // write over the held part: the old note shortens
  s = spanFromSelected(s, layout, 2);
  assert.deepEqual(s.notes.slice(4, 11), ["A4", HOLD, "G4", HOLD, null, null, null]);
  s = clearSpan(select(s, 7));
  assert.deepEqual(s.notes.slice(4, 8), ["A4", HOLD, null, null]);
});
