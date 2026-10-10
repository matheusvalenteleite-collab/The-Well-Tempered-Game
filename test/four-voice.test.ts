import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateQuartet } from "../src/counterpoint/four-voice.ts";
import { HOLD } from "../src/counterpoint/layout.ts";
import { cantusFor, decodePart, QUARTET_ALL, quartetInput, quartetSteps, type QuartetStep } from "../src/game/quartet.ts";

const fuxSteps = Object.values(QUARTET_ALL).flat().filter((s) => s.fux);
const judge = (s: QuartetStep, lines = s.fux!) => evaluateQuartet(quartetInput(s, lines));

test("four voices: the dataset has Fux's 32 exercises in his order", () => {
  assert.equal(fuxSteps.length, 32);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map((n) => quartetSteps(n as never).filter((s) => s.fux).map((s) => s.figure).join(",")),
    ["160,163,164,165,166,167,168,169,170,171,172", "173,174,175,176", "177,180,181,182,183,184,185,186", "193,195,196,197", "200,201,202,203", "204"],
  );
});

test("four voices: the tasks of private study, four a mode (owner, D148)", () => {
  const priv = [1, 2, 3, 4, 5, 6].map((n) => quartetSteps(n as never).filter((s) => !s.fux).length);
  assert.deepEqual(priv, [12, 20, 16, 20, 20, 0]);
  for (const s of Object.values(QUARTET_ALL).flat().filter((x) => !x.fux)) assert.equal(s.cantus.length >= 10, true);
});

test("four voices: the cantus in each part's octave, as Fux places D, E and F", () => {
  for (const s of quartetSteps(1).filter((x) => x.fux)) assert.deepEqual(cantusFor(s.modalFinal, s.cantusIndex), s.fux![s.cantusIndex], `Fig. ${s.figure}`);
});

test("four voices: every one of Fux's solutions passes", () => {
  for (const s of fuxSteps) assert.deepEqual(judge(s).errors.map((x) => `${x.ruleId}@${x.positions}`), [], `Fig. ${s.figure}`);
});

test("four voices: the only notes on Fux's solutions are hidden fifths and octaves (p. 115), no unisons (p. 114)", () => {
  const warned = fuxSteps.flatMap((s) => judge(s).warnings.map((w) => `${s.figure}:${w.ruleId}`));
  assert.deepEqual([...new Set(warned.map((w) => w.split(":")[1]))], ["t1.direct-perfect"]);
  assert.deepEqual([...new Set(warned.map((w) => w.split(":")[0]))], ["167", "168", "169", "170", "173", "176"]);
});

test("four voices: faults are found", () => {
  const s160 = quartetSteps(1)[0];
  const lines = s160.fux!.map((l) => [...l]);
  lines[2][1] = "C4"; // the tenor C4 over the bass D3 in bar 2: a seventh
  assert.ok(judge(s160, lines).errors.some((e) => e.ruleId === "t1.consonance-bass"));
  // Second species: a divided semibreve is not allowed (only in the fourth and fifth, p. 133).
  const s173 = quartetSteps(2)[0];
  const div = s173.fux!.map((l) => [...l]);
  const whole = s173.kinds.indexOf("whole");
  div[whole][4] = div[whole][0];
  assert.ok(judge(s173, div).errors.some((e) => e.ruleId === "q.values"));
  // Fourth species: the same division stands (Fig. 195 divides the alto in bars 7 and 9).
  const s195 = quartetSteps(4).find((s) => s.figure === "195")!;
  assert.ok(s195.fux![1].slice(48, 56).filter((x) => x !== HOLD).length === 2);
});

test("four voices: the run-length parts decode to quaver slots", () => {
  assert.deepEqual(decodePart("D4+3 ~+3 r"), ["D4", HOLD, HOLD, HOLD, HOLD, HOLD, HOLD, HOLD, "r"]);
});
