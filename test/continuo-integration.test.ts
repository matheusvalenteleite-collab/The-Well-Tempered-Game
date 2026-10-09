import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFuxRepository } from "../src/music/fux/load-node.ts";
import { FUX_FIRST_SPECIES_CURRICULUM } from "../src/counterpoint/curriculum/fux-first-species.ts";
import { FUX_SECOND_SPECIES_CURRICULUM } from "../src/counterpoint/curriculum/fux-second-species.ts";
import { exerciseView } from "../src/game/exercise-view.ts";
import { realizeContinuo, sungNotes } from "../src/continuo/index.ts";
import { frameAt, mod } from "../src/continuo/frame.ts";
import { DEFAULTS } from "../src/continuo/costs.ts";
import { parsePitch } from "../src/music/pitch.ts";
import { continuoInput, continuoKey, continuoOptions } from "../src/game/continuo-input.ts";
import { DEFAULT_CONTINUO_SETTINGS, validContinuoSettings } from "../src/game/continuo-settings.ts";
import { REST } from "../src/counterpoint/layout.ts";
import type { ContinuoInput, ContinuoRealization } from "../src/continuo/types.ts";

const repo = loadFuxRepository();
const VIEWS = [...FUX_FIRST_SPECIES_CURRICULUM, ...FUX_SECOND_SPECIES_CURRICULUM].map((s) => exerciseView(repo, s));
const WIN = { low: parsePitch(DEFAULTS.window.low).midi, high: parsePitch(DEFAULTS.window.high).midi };
const sounding = (r: ContinuoRealization, t: number, roles: string[]) => r.events.filter((e) => roles.includes(e.role) && e.startBeat <= t && t < e.startBeat + e.durationBeats).flatMap((e) => e.midi);

function checkDoubling(input: ContinuoInput, r: ContinuoRealization, label: string) {
  const { notes } = sungNotes(input);
  const sungPcs = new Set(notes.map((n) => mod(n.pitch.midi, 12)));
  for (const b of r.bars) {
    assert.equal(b.fallback, false, `${label} bar ${b.bar}`);
    assert.equal(b.texture, "doubling");
    assert.notEqual(b.figure, "c.p.");
  }
  for (const e of r.events) {
    for (const m of e.midi) assert.ok(sungPcs.has(mod(m, 12)), `${label}: ${m} is not sung`);
    if (e.role === "bass") continue;
    assert.equal(e.role, "doubling");
    for (const m of e.midi) {
      assert.ok(m >= WIN.low && m <= WIN.high, `${label} beat ${e.startBeat}: ${m} outside the window`);
      for (let t = e.startBeat; t < e.startBeat + e.durationBeats; t += 0.5) for (const bass of sounding(r, t, ["bass"])) assert.ok(m > bass, `${label} beat ${t}: ${m} not above the bass`);
      // At every moment it sounds, its pitch class is sung by some voice at that moment.
      for (let t = e.startBeat; t < e.startBeat + e.durationBeats; t += 0.5) {
        const f = frameAt(notes, t);
        assert.ok(f && f.sounding.some((n) => mod(n.pitch.midi, 12) === mod(m, 12)), `${label} beat ${t}: ${m} is not sung now`);
      }
    }
  }
}

test("continuo 'doubling' texture (trio): only sung notes, in the window, above the bass, deterministic", () => {
  let checked = 0;
  for (const v of VIEWS) {
    if (!v.fux) continue;
    for (const notes of [v.fux, v.layout.map(() => null)]) {
      const input = continuoInput(v, notes, "trio");
      const r = realizeContinuo(input, continuoOptions("trio", DEFAULT_CONTINUO_SETTINGS));
      checkDoubling(input, r, `${v.figure}`);
      assert.deepEqual(realizeContinuo(input, continuoOptions("trio", DEFAULT_CONTINUO_SETTINGS)), r);
      checked++;
    }
  }
  assert.equal(checked, 44);
});

test("doubling figures are the sung intervals over the bass, compounds reduced", () => {
  const v = VIEWS.find((x) => x.figure === "5")!;
  const r = realizeContinuo(continuoInput(v, v.fux!, "trio"), { texture: "doubling" });
  for (const b of r.bars) assert.match(b.figure, /^(\d(\/\d)*)?( · \d(\/\d)*)?$/, b.figure);
  assert.ok(r.bars.every((b) => !/1[0-9]/.test(b.figure)));
});

test("bad and incomplete counterpoints never throw; every downbeat is harmonized or colla parte", () => {
  const v1 = VIEWS.find((x) => x.figure === "5")!; // first species, cantus D below
  const v2 = VIEWS.find((x) => x.figure === "33")!; // second species
  const cases: [typeof v1, (string | null)[]][] = [
    [v1, v1.cantus.map(() => "E5")], // dissonant downbeats, repeated
    [v1, v1.cantus.map((_, k) => (k % 3 === 0 ? "F#4" : null))], // seconds and empty bars
    [v1, v1.cantus.map((_, k) => (k === 0 ? "A4" : null))], // a lone first note
    [v1, v1.cantus.map(() => null)], // nothing written
    [v2, v2.layout.map((_, k) => (k % 2 ? "Bb4" : "C#5"))], // chromatic clutter
    [v2, v2.layout.map((sl, k) => (sl.restAllowed ? REST : k < 5 ? "G4" : null))], // half-written
  ];
  for (const [v, notes] of cases) {
    for (const mode of ["player"] as const) {
      const input = continuoInput(v, notes, mode);
      for (const finals of ["organist", "strict"] as const) {
        const r = realizeContinuo(input, { finals });
        const { notes: sung } = sungNotes(input);
        for (const b of r.bars) {
          const f = frameAt(sung, 2 * b.bar);
          if (!f) continue;
          const played = sounding(r, 2 * b.bar, ["rh", "doubling", "bass"]);
          assert.ok(b.fallback || b.figure === "c.p." || played.length > 0, `bar ${b.bar} neither harmonized nor colla parte`);
          // No right-hand note clashes (second or seventh) with a sung note at a consonant downbeat.
          if (b.fallback) for (const m of sounding(r, 2 * b.bar, ["rh", "doubling"])) assert.ok(f.sounding.some((n) => mod(n.pitch.midi, 12) === mod(m, 12)) || !f.sounding.some((n) => [1, 2, 10, 11].includes(mod(m - n.pitch.midi, 12))), `bar ${b.bar}: added tone clashes`);
        }
      }
    }
  }
});

test("continuo input per play mode", () => {
  const v = VIEWS.find((x) => x.figure === "35")!;
  const notes = v.layout.map((sl, k) => (sl.restAllowed ? REST : k === 3 ? "A3" : null));
  const p = continuoInput(v, notes, "player");
  assert.ok("counterpoint" in p && p.counterpoint.length === v.layout.length);
  assert.ok("counterpoint" in p && p.counterpoint[0].pitch === null && p.counterpoint[3].pitch === "A3" && p.counterpoint[2].pitch === null);
  const f = continuoInput(v, notes, "fux");
  assert.ok("counterpoint" in f && f.counterpoint[1].pitch === v.fux![1]);
  const t = continuoInput(v, notes, "trio");
  assert.ok("voices" in t && t.voices.map((x) => x.id).join() === "cantus,counterpoint,fux");
  assert.equal(continuoOptions("trio", DEFAULT_CONTINUO_SETTINGS).texture, "doubling");
  assert.equal(continuoOptions("player", DEFAULT_CONTINUO_SETTINGS).texture, "realized");
  const first = VIEWS.find((x) => x.species === "first" && !x.fux)!;
  assert.throws(() => continuoInput(first, first.layout.map(() => null), "fux"));
});

test("continuo settings validator and memoization keys", () => {
  assert.deepEqual(validContinuoSettings(null), DEFAULT_CONTINUO_SETTINGS);
  assert.equal(DEFAULT_CONTINUO_SETTINGS.display, "figured");
  const s = validContinuoSettings({ display: "both", preset: "cembalo", finals: "strict", passingFill: false, inegal: "yes" });
  assert.deepEqual(s, { display: "both", preset: "cembalo", finals: "strict", passingFill: false, inegal: false, accidentals: true });
  assert.equal(validContinuoSettings({ display: "loud", preset: "organ" }).display, "figured");
  const o = continuoOptions("player", DEFAULT_CONTINUO_SETTINGS);
  const a = continuoKey("x", ["A4", null], "player", o);
  assert.equal(a, continuoKey("x", ["A4", null], "player", o));
  assert.equal(a, continuoKey("x", ["A4", REST], "player", o)); // a rest and an empty slot sound the same
  assert.notEqual(a, continuoKey("x", ["A4", "B4"], "player", o));
  assert.notEqual(a, continuoKey("x", ["A4", null], "fux", o));
  assert.notEqual(a, continuoKey("x", ["A4", null], "player", { ...o, finals: "strict" }));
});

test("continuo staff layout: whole notes where nothing moves, halves and ties where it does; figures per half", async () => {
  const { cueChords, cueFigures } = await import("../src/ui/notation/continuo-staff.ts");
  for (const v of VIEWS) {
    if (!v.fux) continue;
    for (const mode of ["fux", "trio"] as const) {
      const r = realizeContinuo(continuoInput(v, v.fux, mode), continuoOptions(mode, DEFAULT_CONTINUO_SETTINGS));
      for (const staff of ["bass", "rh"] as const) {
        const chords = cueChords(r, staff);
        for (let b = 0; b < r.bars.length; b++) {
          const inBar = chords.filter((c) => c.bar === b);
          assert.ok((inBar.length === 1 && inBar[0].duration === "w") || (inBar.length === 2 && inBar.every((c) => c.duration === "h")), `${v.figure} ${mode} ${staff} bar ${b}`);
        }
        for (const c of chords) for (const i of c.tiedFrom) assert.ok(i >= 0 && i < c.tones.length);
      }
      if (v.species === "first") assert.ok(cueChords(r, "bass").every((c) => c.duration === "w"), `${v.figure}: first-species bass in whole notes`);
      const figs = cueFigures(r);
      for (const f of figs) assert.ok(f.stack.length >= 1 && f.stack.every((x) => x.length > 0));
      if (mode === "trio") assert.ok(figs.every((f) => f.stack[0] !== "c.p."));
    }
  }
});
