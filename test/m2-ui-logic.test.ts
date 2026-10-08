import { test } from "node:test";
import assert from "node:assert/strict";
import { pitchAtPosition, positionOfPitch } from "../src/ui/notation/clefs.ts";
import { applyAccidental, clear, initialState, letterNote, place, stepNote, toPlayerSolution } from "../src/game/session.ts";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";

test("clef geometry: bottom lines and round trip", () => {
  assert.equal(pitchAtPosition("treble", 0), "E4");
  assert.equal(pitchAtPosition("treble", 8), "F5");
  assert.equal(pitchAtPosition("bass", 8), "A3");
  assert.equal(pitchAtPosition("alto", 4), "C4"); // middle line of the alto clef
  assert.equal(pitchAtPosition("soprano", 0), "C4"); // C1 clef: middle C on the bottom line
  assert.equal(pitchAtPosition("tenor", 6), "C4"); // C4 clef: middle C on the fourth line
  assert.equal(pitchAtPosition("treble", -2), "C4");
  for (const clef of ["treble", "bass", "alto", "soprano", "tenor"] as const) {
    for (let p = -6; p < 14; p++) assert.equal(positionOfPitch(clef, pitchAtPosition(clef, p)), p);
  }
});

test("session: place, replace, accidentals, keyboard stepping", () => {
  let s = initialState(11);
  s = place(s, 0, "A4");
  s = place(s, 0, "B4"); // replace
  assert.equal(s.notes[0], "B4");
  s = applyAccidental(s, 1);
  assert.equal(s.notes[0], "B#4");
  s = applyAccidental(s, 1); // toggles back
  assert.equal(s.notes[0], "B4");
  s = { ...s, selected: 9 };
  s = applyAccidental(s, 1); // arms the next placement
  s = place(s, 9, "C5");
  assert.equal(s.notes[9], "C#5");
  assert.equal(s.accidental, 0);
  s = stepNote(s, 1, "D4");
  assert.equal(s.notes[9], "D5");
  s = { ...s, selected: 3 };
  s = letterNote(s, "G", "A4");
  assert.equal(s.notes[3], "G4");
  s = clear(s, 3);
  assert.equal(s.notes[3], null);
  s = stepNote(s, 1, "F5"); // first arrow on an empty bar repeats the note written last
  assert.equal(s.notes[3], "G4");
  let fresh = initialState(4);
  fresh = stepNote(fresh, 1, "F5"); // nothing written yet: the starting pitch
  assert.equal(fresh.notes[0], "F5");
});

test("session converts to the shared player_solution representation", () => {
  const repo = loadFuxRepository();
  const ex = repo.getExercise("fux_2v_fig_005")!;
  let s = initialState(ex.measures);
  s = place(s, 0, "A4");
  s = place(s, 2, "G4");
  const sol = toPlayerSolution(s, ex, new Date(0));
  assert.equal(sol.kind, "player_solution");
  assert.deepEqual(sol.notes.map((n) => [n.pitch, n.offset, n.duration, n.midi]), [["A4", "0/1", "1/1", 69], ["G4", "2/1", "1/1", 67]]);
});

test("hint: the computed cadence note equals Fux's own penultimate note in all ten first-species exercises", async () => {
  const { cadenceNote } = await import("../src/counterpoint/cadence.ts");
  const repo = loadFuxRepository();
  for (const ex of repo.listExercises({ species: "first" })) {
    const sol = repo.getSolution(ex.id)!;
    const cp = sol.counterpoint.pitch_sequence;
    assert.equal(cadenceNote(sol.cantus_firmus.pitch_sequence, ex.cantus_voice), cp[cp.length - 2], ex.figure);
  }
});

test("overlay: every fux-strict rule has a drawing; parallel fifths become a link between bars", async () => {
  const { buildOverlay } = await import("../src/ui/notation/overlay.ts");
  const { FIRST_SPECIES_FUX_STRICT } = await import("../src/counterpoint/rules/first-species.ts");
  const { evaluate } = await import("../src/counterpoint/engine.ts");
  const cf = ["D4", "F4", "E4", "D4", "G4", "F4", "A4", "G4", "F4", "E4", "D4"];
  const cp = ["D5", "D5", "C5", "A4", "D5", "D5", "C5", "D5", "F5", "C5", "D5"];
  for (const r of FIRST_SPECIES_FUX_STRICT) {
    assert.doesNotThrow(() => buildOverlay([{ ruleId: r.id, positions: [3, 4], severity: r.severity, messageKey: r.messageKey }], cf, cp), r.id);
  }
  const ev = evaluate({ species: "first", modalFinal: "D", cantusVoice: "lower", cantus: cf.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: cp.map((p) => ({ pitch: p, duration: "1/1" })) });
  const o = buildOverlay(ev.violations, cf, cp);
  assert.equal(o.intervals.length, 11);
  assert.deepEqual(o.intervals.map((i) => i.text), ["P8", "M6", "m6", "P5", "P5", "M6", "m3", "P5", "P8", "m6", "P8"]);
  assert.ok(o.links.some((l) => l.from === 3 && l.to === 4 && l.text === "parallel P5→P5" && l.severity === "error"));
  assert.ok(o.links.some((l) => l.from === 2 && l.to === 3 && l.text === "similar m6→P5"));
  assert.equal(o.intervals[9].status, "error"); // cadence m6
  assert.equal(o.intervals[10].status, "ok"); // the final octave itself is right
  assert.equal(o.intervals[3].status, "error"); // fifth reached by similar motion
  assert.equal(o.intervals[4].status, "error"); // parallel fifth
  assert.deepEqual(o.links.filter((l) => l.kind === "motion").map((l) => l.row), [0, 1]); // staggered
  // excerpt of bars 4-5 only
  const ex = buildOverlay(ev.violations, cf, cp, 3, 4);
  assert.deepEqual(ex.links.map((l) => [l.from, l.to]), [[0, 1]]);
});
