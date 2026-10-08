import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { ALL_STEPS, rulesForStep } from "../src/counterpoint/curriculum/index.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { evaluate } from "../src/counterpoint/engine.ts";
import { slotLayout, sounding, timeline, tiedToNext } from "../src/counterpoint/layout.ts";

const repo = loadFuxRepository();
const steps = ALL_STEPS.filter((s) => s.species === "third" || s.species === "fourth");
const judge = (stepId: string, notes: (string | null)[]) => {
  const s = ALL_STEPS.find((x) => x.id === stepId)!;
  const v = exerciseView(repo, s);
  return evaluate({ species: v.species, modalFinal: v.modalFinal, cantusVoice: v.cantusVoice, cantus: v.cantus.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: notes.map((p, k) => ({ pitch: sounding(p) ? p : null, duration: v.layout[k].duration })) }, rulesForStep(s.id));
};
const ids = (ev: ReturnType<typeof judge>) => ev.violations.map((x) => x.ruleId);

test("third and fourth species: twelve steps each, Fux's six solutions per species clear every rule (D39)", () => {
  assert.equal(steps.filter((s) => s.species === "third").length, 12);
  assert.equal(steps.filter((s) => s.species === "fourth").length, 12);
  let n = 0;
  for (const s of steps) {
    const v = exerciseView(repo, s);
    if (!v.fux) continue;
    assert.deepEqual(ids(judge(s.id, v.fux)), [], s.id);
    n++;
  }
  assert.equal(n, 12);
});

test("third species layout: four quarters a bar, a whole note at the end", () => {
  const l = slotLayout("third", 4);
  assert.equal(l.length, 13);
  assert.deepEqual(l.slice(0, 4).map((s) => [s.bar, s.beat, s.duration]), [[0, 0, "1/4"], [0, 1, "1/4"], [0, 2, "1/4"], [0, 3, "1/4"]]);
  assert.equal(l[12].duration, "1/1");
});

test("third species rules catch a dissonant downbeat and a dissonance left by leap, and accept the cambiata", () => {
  const v = exerciseView(repo, steps.find((s) => s.id === "fux-mode.s3.01")!);
  const fux = [...v.fux!];
  // Bar 2 downbeat (slot 4) moved a step: a dissonance on the first quarter.
  const bad = [...fux];
  const up = (p: string) => p.replace(/^([A-G])/, (m) => "CDEFGAB"[("CDEFGAB".indexOf(m) + 1) % 7]);
  bad[4] = up(fux[4]);
  assert.ok(ids(judge("fux-mode.s3.01", bad)).includes("ts.downbeat-consonance"));
  // The cambiata (cantus D4, counterpoint above): D5 C5 A4 B4 — 8, 7 (by step down), skip of a third down to 5, then up.
  const cf = ["D4", "F4", "E4", "D4"];
  const c = evaluate(
    { species: "third", modalFinal: "D", cantusVoice: "lower", cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: ["D5", "C5", "A4", "B4", "A4", "G4", "F4", "A4", "G4", "F4", "E4", "C#5", "D5"].map((p, k) => ({ pitch: p, duration: k === 12 ? "1/1" : "1/4" })) },
    rulesForStep("fux-mode.s3.01"),
  );
  assert.ok(!c.violations.some((x) => x.ruleId === "ts.dissonance" && x.positions.includes(1)), JSON.stringify(c.violations));
  // A dissonant second quarter left by a skip upward: not a cambiata.
  const d = evaluate(
    { species: "third", modalFinal: "D", cantusVoice: "lower", cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: ["D5", "C5", "E5", "D5", "A4", "G4", "F4", "A4", "G4", "F4", "E4", "C#5", "D5"].map((p, k) => ({ pitch: p, duration: k === 12 ? "1/1" : "1/4" })) },
    rulesForStep("fux-mode.s3.01"),
  );
  assert.ok(d.violations.some((x) => x.ruleId === "ts.dissonance" && x.positions.includes(1)));
});

test("fourth species: ties are the same note over the bar line; rules catch an unresolved suspension and the 7-8 above", () => {
  const v = exerciseView(repo, steps.find((s) => s.id === "fux-mode.s4.01")!);
  const fux = v.fux!;
  assert.ok(tiedToNext(v.layout, fux, 1)); // the first upbeat is tied into bar 2
  // Playback: a tied note sounds once, for both halves.
  const ev = timeline(v.cantus, v.layout, fux, undefined, undefined, undefined, undefined, { ties: true });
  assert.equal(ev[1].lengths?.counterpoint, 1);
  assert.equal(ev[2].counterpoint, null);
  // Find a dissonant downbeat (a suspension) and make it resolve upward.
  const res = judge("fux-mode.s4.01", fux);
  assert.deepEqual(ids(res), []);
  const k = v.layout.findIndex((sl, i) => sl.beat === 0 && i > 0 && fux[i] === fux[i - 1] && i + 1 < fux.length && fux[i + 1] !== fux[i] && v.layout[i + 1].beat === 1);
  const wrong = [...fux];
  const upStep = (p: string) => p.replace(/^([A-G])(#?)(\d)$/, (_, l: string, a: string, o: string) => { const i = "CDEFGAB".indexOf(l); return `${"CDEFGAB"[(i + 1) % 7]}${i === 6 ? Number(o) + 1 : o}`; });
  wrong[k + 1] = upStep(fux[k]);
  const out = ids(judge("fux-mode.s4.01", wrong));
  assert.ok(out.length > 0, "an altered resolution must be caught");
  // Cantus above, 7-8: counterpoint a seventh below, tied, rising... (resolves to the octave by step down from the 7th above? no:)
  // a seventh below the cantus resolving down a step makes an octave below: forbidden.
  const cf = ["D4", "E4", "F4", "E4", "D4"];
  const seven = evaluate(
    { species: "fourth", modalFinal: "D", cantusVoice: "upper", cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: [null, "F3", "F3", "E3", "D3", "D3", "D3", "C#3", "D3"].map((p, k) => ({ pitch: p, duration: k === 8 ? "1/1" : "1/2" })) },
    rulesForStep("fux-mode.s4.02"),
  );
  assert.ok(seven.violations.some((x) => x.ruleId === "fos.ligature-kinds"), JSON.stringify(seven.violations.map((x) => x.ruleId)));
});
