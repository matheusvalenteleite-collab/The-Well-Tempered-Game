import { test } from "node:test";
import assert from "node:assert/strict";
import { canon, deriveVersion, heardLines, retrograde, tonalMirror, validVersions, DEFAULT_VERSIONS } from "../src/game/versions.ts";
import { trioReading } from "../src/game/trio-eval.ts";
import { REST, slotLayout } from "../src/counterpoint/layout.ts";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { FUX_FIRST_SPECIES_CURRICULUM } from "../src/counterpoint/curriculum/fux-first-species.ts";
import { FUX_SECOND_SPECIES_CURRICULUM } from "../src/counterpoint/curriculum/fux-second-species.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { parsePitch } from "../src/music/pitch.ts";

test("tonal mirror: final and fifth trade places, the third stays, ficta keeps its semitone (D: C# -> Bb)", () => {
  // D E F G A C# D, mirrored: A G F E D Bb A, in the original's register.
  const out = tonalMirror(["D4", "E4", "F4", "G4", "A4", "C#4", "D4"], "D");
  assert.deepEqual(out.map((p) => p!.replace(/\d/g, "")), ["A", "G", "F", "E", "D", "Bb", "A"]);
  // Intervals are mirrored: the line's contour is reversed step for step.
  const d = (xs: (string | null)[]) => xs.map((p) => parsePitch(p!).diatonic);
  const a = d(["D4", "E4", "F4", "G4", "A4", "C#4", "D4"]);
  const b = d(out);
  for (let i = 1; i < a.length; i++) assert.equal(b[i] - b[i - 1], -(a[i] - a[i - 1]));
  // Other modes: G mixolydian G<->D, A<->C, B<->B; F# (leading tone) -> Eb.
  assert.deepEqual(tonalMirror(["G4", "A4", "B4", "F#4"], "G").map((p) => p!.replace(/\d/g, "")), ["D", "C", "B", "Eb"]);
  assert.deepEqual(tonalMirror([REST, null, "E4"], "E").slice(0, 2), [REST, null]);
});

test("retrograde keeps rests in place; canon rotates by slots and x = 0 duplicates", () => {
  assert.deepEqual(retrograde([REST, "A4", "B4", null, "C5"]), [REST, "C5", "B4", null, "A4"]);
  assert.deepEqual(canon(["A", "B", "C", "D"], 1), ["D", "A", "B", "C"]);
  assert.deepEqual(canon(["A", "B", "C", "D"], 0), ["A", "B", "C", "D"]);
  assert.deepEqual(canon(["A", "B", "C", "D"], 5), ["D", "A", "B", "C"]);
  assert.deepEqual(deriveVersion("retroInversion", ["D4", "E4", "F4"], "D", 0), retrograde(tonalMirror(["D4", "E4", "F4"], "D")));
});

test("versions validator and heard lines", () => {
  assert.deepEqual(validVersions(null), DEFAULT_VERSIONS);
  assert.equal(validVersions({ original: false }).original, false); // an activator may silence every line (D88)
  assert.equal(validVersions({ original: false, inversion: true }).original, false);
  assert.equal(validVersions({ canonShift: -2 }).canonShift, DEFAULT_VERSIONS.canonShift);
  const lines = heardLines({ ...DEFAULT_VERSIONS, original: false, inversion: true, canon: true, canonShift: 2 }, ["D4", "E4", "F4"], "D");
  assert.deepEqual(lines.map((l) => l.id), ["inversion", "canon"]);
  assert.deepEqual(lines[1].notes, ["E4", "F4", "D4"]);
});

test("three-voice reading: Fux's own line against itself is all unisons; a crafted clash and parallels are found", () => {
  const cf = ["D4", "F4", "E4", "D4"];
  const layout = slotLayout("first", 4);
  const f = trioReading(cf, ["A4", "A4", "C5", "D5"], ["F4", "D5", "G4", "A4"], layout);
  // bar 1: D4 F4 A4 = complete triad; bar 2: F4 A4 D5 = 6/3 complete; bar 3: E4 G4 C5 = 6/3; bar 4: D4 A4 D5.
  assert.ok(f.some((x) => x.kind === "completeTriad" && x.slots.includes(0)));
  const g = trioReading(cf, ["A3", "C4", "C4", "D4"], ["A4", "C5", "G4", "F4"], layout); // A3-A4 then C4-C5: parallel octaves
  assert.ok(g.some((x) => x.kind === "parallelPerfect" && x.tone === "fault"), JSON.stringify(g));
  const h = trioReading(cf, ["A4", "A4", "B4", "A4"], ["G4", "A4", "C5", "A4"], layout);
  assert.ok(h.some((x) => x.kind === "dissonanceBetweenUppers" && x.slots[0] === 0), JSON.stringify(h)); // A4 against G4: a second
});

test("three-voice reading runs on every Fux exercise with the player's line = Fux's own (unisons only, no crash)", () => {
  const repo = loadFuxRepository();
  for (const s of [...FUX_FIRST_SPECIES_CURRICULUM, ...FUX_SECOND_SPECIES_CURRICULUM]) {
    const v = exerciseView(repo, s);
    if (!v.fux) continue;
    const f = trioReading(v.cantus, v.fux, v.fux, v.layout);
    assert.ok(f.every((x) => x.kind === "unison" || x.kind === "contrary" || x.tone !== "fault" || x.kind === "parallelPerfect"));
  }
});
