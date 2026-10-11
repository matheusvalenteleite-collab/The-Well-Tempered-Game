import { test } from "node:test";
import assert from "node:assert/strict";
import { HABITS, LEVEL5, judge, type Slot } from "../src/chorale/level5.ts";

const slot = (soprano: string, bass: string, root: string, kind: string, bassRole: string, above: [string, string][], printed = ""): Slot => ({ at: 0, dur: 16, soprano, bass, root, kind, bassRole, printed, above });
const C = slot("E5", "C3", "C", "major", "root", [["E", "third"], ["G", "fifth"]]);
const G = slot("D5", "G2", "G", "major", "root", [["B", "third"], ["D", "fifth"]]);
const F = slot("F5", "F2", "F", "major", "root", [["A", "third"], ["C", "fifth"]]);

// C17, C21: warnings of three gravities; the figure is the task; the rest is Bach's habit.
test("level 5: consecutive fifths and octaves with an inner voice (grave by similar motion, a warning by contrary), the augmented second", () => {
  // Tenor and bass a twelfth apart, both falling a fourth: fifths, C-G to G-D.
  const f = judge([C, G], ["G4", "G4"], ["G3", "D3"]);
  assert.ok(f.some((x) => x.gravity === 3 && x.key === "parallel" && x.vars.kind === "fifths" && x.vars.a === "tenor" && x.vars.b === "bass"));
  // Contrary motion into the same interval class is a warning, not grave (C21).
  const contrary = judge([C, G], ["G4", "G4"], ["G3", "D4"]).find((x) => x.vars.a === "tenor" && x.vars.b === "bass");
  assert.ok(contrary && contrary.key === "contrary" && contrary.gravity === 2);
  // Nothing in the chorale mode is an error: every finding has a gravity.
  assert.ok(judge([C, G], ["C4", "C4"], ["C4", "C4"]).every((x) => [1, 2, 3].includes(x.gravity)));
  // The soprano and bass alone are given: their consecutives are not the player's.
  assert.ok(!judge([C, F], ["G4", "A4"], ["C4", "C4"]).some((x) => x.key === "parallel" && x.vars.a === "soprano" && x.vars.b === "bass"));
  const minor = slot("E5", "A2", "A", "minor", "root", [["C", "third"], ["E", "fifth"]]);
  const dom = slot("D5", "E3", "E", "major", "root", [["G#", "third"], ["B", "fifth"]]);
  assert.ok(judge([minor, dom], ["F4", "G#4"], ["C4", "B3"]).some((x) => x.key === "augSecond" && x.gravity === 3 && x.vars.voice === "alto"));
});

test("level 5: the figure, a missing fifth only noted, notes outside the chord", () => {
  const ok = judge([C], ["G4"], ["C4"]);
  assert.ok(!ok.some((x) => x.gravity === 3), JSON.stringify(ok));
  assert.ok(judge([C], ["C4"], ["C4"]).some((x) => x.gravity === 1 && x.key === "noFifth"));
  assert.ok(judge([C], ["G4"], ["D4"]).some((x) => x.gravity === 3 && x.key === "foreign" && x.vars.voice === "tenor"));
  const D7 = slot("C5", "D3", "D", "dominant seventh", "root", [["F#", "third"], ["A", "fifth"], ["C", "seventh"]], "7");
  assert.ok(judge([D7], ["A4"], ["D4"]).some((x) => x.gravity === 3 && x.key === "missing" && x.vars.letter === "F#"));
});

test("level 5: the data, every bass with its slots, Bach's habits counted with examples", () => {
  assert.equal(Object.keys(LEVEL5).length, 24);
  let basses = 0;
  for (const c of Object.values(LEVEL5))
    for (const b of c.basses) {
      basses++;
      assert.ok(b.slots.length > 10, `no. ${c.number} ${b.label}`);
      for (const s of b.slots) assert.ok(s.dur > 0 && s.soprano && s.bass && s.root);
    }
  assert.equal(basses, 194);
  // Bach doubles the root of a root-position major triad most of the time.
  const d = HABITS.doubling["major|root"];
  assert.equal(d.options[0][0], "root");
  assert.ok(d.options[0][1] / d.n > 0.8 && d.options[0][2].length > 0);
  // A prepared seventh in the alto falls by step at the next chord, mostly.
  const s = HABITS.seventh["alto|prepared|bass moves"];
  assert.equal(s.options[0][0], "step down");
});

test("level 5 beside Bach (C18): his settings moved to Kittel's key; writing his voices agrees with him everywhere his bass is Kittel's", async () => {
  const { compareBach } = await import("../src/chorale/level5.ts");
  const settings = Object.values(LEVEL5).reduce((n, c) => n + c.bach.length, 0);
  assert.ok(settings >= 70, `${settings} settings`);
  const c = LEVEL5[1];
  const b = c.bach[0];
  const slots = c.basses[0].slots;
  const at = new Map(c.melody.map(([t], i) => [t, i]));
  const alto = slots.map((s) => (at.has(s.at) ? b.inner[at.get(s.at)!]?.[0] ?? null : null));
  const tenor = slots.map((s) => (at.has(s.at) ? b.inner[at.get(s.at)!]?.[1] ?? null : null));
  const r = compareBach(c, slots, alto, tenor, b);
  assert.ok(r.aligned > 10 && r.sameBass > 3);
  assert.equal(r.same, r.sameBass);
  assert.deepEqual(r.differ, []);
});
