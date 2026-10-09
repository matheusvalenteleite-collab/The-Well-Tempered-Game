import { test } from "node:test";
import assert from "node:assert/strict";
import { harmonic, interval, isConsonant, motion } from "../src/counterpoint/interval.ts";
import { evaluate, MalformedInputError, presetRules } from "../src/counterpoint/engine.ts";
import type { CounterpointInput } from "../src/counterpoint/rules/types.ts";

test("interval quality comes from diatonic size + semitones", () => {
  const cases: [string, string, string][] = [
    ["C4", "E4", "M3"], ["C4", "Fb4", "d4"], ["B#3", "E4", "d4"], ["C4", "D#4", "A2"], ["C4", "Eb4", "m3"],
    ["F4", "B4", "A4"], ["B3", "F4", "d5"], ["C4", "C4", "P1"], ["F4", "F#4", "A1"], ["C4", "C5", "P8"],
    ["D4", "A5", "P12"], ["E3", "G4", "m10"], ["C4", "B4", "M7"], ["E4", "C5", "m6"], ["C#4", "Bb4", "d7"],
  ];
  for (const [a, b, name] of cases) {
    assert.equal(interval(a, b).name, name, `${a}-${b}`);
    assert.equal(interval(b, a).name, name, `${b}-${a}`);
  }
  assert.equal(interval("E4", "C4").direction, "down");
  // Same semitone count, different intervals.
  assert.notEqual(harmonic("C4", "F#4").name, harmonic("C4", "Gb4").name);
});

test("simple-form display names", async () => {
  const { simpleName } = await import("../src/counterpoint/interval.ts");
  const cases: [string, string, string][] = [["C4", "Eb5", "m3"], ["C4", "G5", "5"], ["C4", "C6", "8"], ["C4", "C5", "8"], ["C4", "C4", "1"], ["C4", "D5", "M2"], ["C4", "F5", "4"], ["C4", "F#4", "A4"], ["C3", "A5", "M6"], ["C4", "E4", "M3"]];
  for (const [a, b, n] of cases) assert.equal(simpleName(interval(a, b)), n, `${a}-${b}`);
});

test("consonance classification (P4 dissonant; compounds follow their simple forms)", () => {
  const ok = ["P1", "m3", "M3", "P5", "m6", "M6", "P8", "m10", "P12", "M13", "P15"];
  const bad = ["P4", "A4", "d5", "m2", "M2", "m7", "M7", "P11", "M9"];
  const pairs: Record<string, [string, string]> = {
    P1: ["C4", "C4"], m3: ["C4", "Eb4"], M3: ["C4", "E4"], P5: ["C4", "G4"], m6: ["C4", "Ab4"], M6: ["C4", "A4"], P8: ["C4", "C5"],
    m10: ["C4", "Eb5"], P12: ["C4", "G5"], M13: ["C4", "A5"], P15: ["C4", "C6"], P4: ["C4", "F4"], A4: ["C4", "F#4"], d5: ["C4", "Gb4"],
    m2: ["C4", "Db4"], M2: ["C4", "D4"], m7: ["C4", "Bb4"], M7: ["C4", "B4"], P11: ["C4", "F5"], M9: ["C4", "D5"],
  };
  for (const n of ok) assert.ok(isConsonant(harmonic(...pairs[n])), n);
  for (const n of bad) assert.ok(!isConsonant(harmonic(...pairs[n])), n);
});

test("motion types", () => {
  assert.equal(motion("C4", "G4", "D4", "A4"), "parallel");
  assert.equal(motion("C4", "E4", "D4", "A4"), "similar");
  assert.equal(motion("C4", "G4", "D4", "F4"), "contrary");
  assert.equal(motion("C4", "G4", "C4", "A4"), "oblique");
});

const CF = ["C4", "E4", "F4", "G4", "E4", "A4", "G4", "E4", "F4", "E4", "D4", "C4"]; // fux_cf_c_01
const input = (cp: string[], cf = CF): CounterpointInput => ({
  species: "first",
  modalFinal: "C",
  cantusVoice: "lower",
  cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })),
  counterpoint: cp.map((p) => ({ pitch: p, duration: "1/1" })),
});
// A test counterpoint written for these tests (not Fux's, not offered as a solution).
const GOOD = ["G4", "G4", "A4", "B4", "C5", "C5", "B4", "C5", "A4", "G4", "B4", "C5"];
const ids = (cp: string[]) => evaluate(input(cp)).errors.map((e) => e.ruleId);

test("a clean counterpoint passes all hard rules", () => {
  assert.deepEqual(ids(GOOD), []);
});

test("each hard rule fires on a targeted defect", () => {
  const with_ = (k: number, p: string) => GOOD.map((x, i) => (i === k ? p : x));
  assert.ok(ids(with_(2, "B4")).includes("fs.vertical-consonance")); // F4-B4 = A4
  assert.ok(ids(with_(0, "E4")).includes("fs.opening-perfect"));
  assert.ok(ids(with_(11, "E5")).includes("fs.final-octave-or-unison"));
  assert.ok(ids(with_(10, "F4")).includes("fs.cadence"));
  assert.ok(ids(["G4", "B4", "C5", "D5", "B4", "C5", "B4", "C5", "A4", "G4", "B4", "C5"]).includes("fs.perfect-approach")); // E4-B4 -> F4-C5 parallel fifths
  assert.ok(ids(with_(4, "E4")).includes("fs.unison-only-at-ends"));
  assert.ok(ids(["G4", "G4", "A4", "B4", "G4", "E5", "B4", "C5", "A4", "G4", "B4", "C5"]).includes("fs.melodic-major-sixth")); // G4-E5 = M6 up
  // F4/C6 (P12) -> G4/G5 (P8): converging, the counterpoint leaping a fourth
  assert.ok(ids(["G4", "G4", "C6", "G5", "C5", "C5", "B4", "C5", "A4", "G4", "B4", "C5"]).includes("fs.converging-leap-into-octave"));
  assert.ok(ids(["C4", "G4", "A4", "B4", "C5", "C5", "B4", "C5", "A4", "G4", "B4", "C5"]).includes("fs.unison-leap")); // C4 unison, leap to G4
  assert.ok(!evaluate(input(with_(6, "F4"))).violations.some((w) => w.ruleId.includes("crossing"))); // crossing is free (D39)
});

test("cantus above: opening only P1/P8, cadence m3 -> P8/P1 (1725, pp. 48-49)", () => {
  const above = (cp: string[]): CounterpointInput => ({ ...input(cp), cantusVoice: "upper" });
  const CP = ["C3", "A3", "D3", "B2", "C3", "F3", "E3", "C3", "D3", "C3", "B3", "C4"];
  assert.deepEqual(evaluate(above(CP)).errors.filter((e) => ["fs.opening-perfect", "fs.cadence"].includes(e.ruleId)), []);
  assert.ok(evaluate(above(["F3", ...CP.slice(1)])).errors.some((e) => e.ruleId === "fs.opening-perfect")); // fifth below
  assert.ok(evaluate(above([...CP.slice(0, 10), "G3", "C4"])).errors.some((e) => e.ruleId === "fs.cadence")); // M6 below instead of m3
});

test("melodic interval rules as Fux states them (tritone, major sixth); others are unchecked", () => {
  const melodic = (a: string, b: string) => {
    const cp = [...GOOD];
    cp[4] = a;
    cp[5] = b;
    return evaluate(input(cp)).violations.filter((v) => v.ruleId.startsWith("fs.melodic") && v.positions[0] === 4).map((v) => v.ruleId);
  };
  assert.deepEqual(melodic("C5", "A5"), ["fs.melodic-major-sixth"]);
  assert.deepEqual(melodic("A5", "C5"), ["fs.melodic-major-sixth"]);
  assert.deepEqual(melodic("F4", "B4"), ["fs.melodic-tritone"]);
  for (const [a, b] of [["C6", "E5"], ["E4", "C5"], ["C5", "B5"], ["C5", "D6"], ["B4", "F5"]]) assert.deepEqual(melodic(a, b), [], `${a}-${b}`);
});

test("malformed input fails loudly", () => {
  assert.throws(() => evaluate(input(GOOD.slice(1))), MalformedInputError);
  assert.throws(() => evaluate({ ...input(GOOD), counterpoint: GOOD.map((p, k) => ({ pitch: k ? p : null, duration: "1/1" })) }), MalformedInputError);
  assert.throws(() => evaluate({ ...input(GOOD), counterpoint: GOOD.map((p) => ({ pitch: p, duration: "1/2" })) }), MalformedInputError);
  assert.throws(() => evaluate(input(GOOD.map((p, k) => (k ? p : "H4")))), /invalid pitch/);
});

test("modern-additions never run under the default configuration", () => {
  const rules = presetRules();
  assert.ok(rules.every((r) => r.source === "fux"));
  const withFlag = presetRules("fux-strict", { enableModernAdditions: true, modernVoiceDistanceLimit: 10 });
  assert.ok(withFlag.some((r) => r.source === "modern"));
  // A counterpoint with a repeated climax and a twelfth: no modern violation by default.
  const cp = ["G4", "G4", "A4", "D5", "C5", "C5", "D5", "C5", "A4", "G4", "B4", "C5"];
  assert.ok(evaluate(input(cp)).violations.every((v) => !v.ruleId.startsWith("modern.")));
});

test("every rule carries source, severity and attribution metadata", () => {
  for (const r of presetRules("fux-strict", { enableModernAdditions: true, modernVoiceDistanceLimit: 10 })) {
    assert.ok(["fux", "modern"].includes(r.source) && ["error", "warning"].includes(r.severity), r.id);
    assert.ok(["verified", "unverified", "contradicted"].includes(r.attribution.status), r.id);
    assert.match(r.messageKey, /^rule\./);
  }
});

test("fs.prefer-imperfect-consonances (1725 p. 46): an all-perfect counterpoint is not cleared", async () => {
  const { FUX_FIRST_SPECIES_CURRICULUM } = await import("../src/counterpoint/curriculum/fux-first-species.ts");
  const { rulesForStep } = await import("../src/counterpoint/curriculum/index.ts");
  const cf = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];
  // octaves and unisons only, every perfect consonance reached by contrary motion; bar 10 keeps the cadence
  const cp = ["D5", "F3", "E5", "D3", "G4", "F5", "A3", "G5", "F4", "C#5", "D5"];
  const ev = evaluate(
    { species: "first", modalFinal: "D", cantusVoice: "lower", cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: cp.map((p) => ({ pitch: p, duration: "1/1" })) },
    rulesForStep(FUX_FIRST_SPECIES_CURRICULUM[0].id),
  );
  assert.ok(ev.errors.some((w) => w.ruleId === "fs.prefer-imperfect-consonances"));
});
