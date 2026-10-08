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
  s = stepNote(s, 1, "F5"); // first arrow on an empty bar places the starting pitch itself
  assert.equal(s.notes[3], "F5");
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
