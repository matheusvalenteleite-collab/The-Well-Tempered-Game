/**
 * D332 (WTC 1.49): (1) chromatic neighbours drawn apart in the music box (the signature's alteration,
 * the shift, the signs); (2) THE LAB's RUNS "lenient": fast stepwise runs judged from either thumb's last
 * touch, the run's trend told at its end (no score); on in presets B, C, D and E, the game (A) strict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MECH, MECH_DEFAULTS, MECH_SPEC, type Mech } from "../src/bench/mechanics.ts";
import { CONFIGS, configById, configMech } from "../src/bench/lab/presets.ts";
import { findRuns, runTrend, slope } from "../src/bench/runs.ts";
import { replay, tally } from "../src/bench/lab/replay.ts";
import { describe } from "../src/bench/lab/describe.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { LaneNote } from "../src/touch/lanes.ts";
import { alterAgainst, chromaShift, signOf, signatureOf, SIGN_PIXELS } from "../src/touch/chroma.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";

const note = (on: number, step: number, midi = 60): LaneNote => ({ on, dur: 1, midi, step, long: false, state: "pending" });
const ms = (a: number, b: number) => (b - a) * 100;

test("D332: RUNS strict is the game's default; LENIENT on in B, C, D and E (B otherwise unchanged), A strict", () => {
  assert.equal(MECH_DEFAULTS.runs, "strict");
  assert.equal(MECH_DEFAULTS.runMinNotes, 4);
  assert.equal(MECH_DEFAULTS.runIoiMs, 200);
  assert.equal(MECH_DEFAULTS.runTravelRows, 0.5);
  assert.equal(MECH_DEFAULTS.runTravelMaxRows, 2);
  assert.deepEqual(MECH, MECH_DEFAULTS);
  for (const k of ["runs", "runMinNotes", "runIoiMs", "runTravelRows", "runTravelMaxRows"]) assert.equal(MECH_SPEC.find((s) => s.key === k)?.group, "LADDER", k);
  assert.equal(configMech(configById("A")!).runs, "strict");
  for (const id of ["B", "C", "D", "E"]) assert.equal(configMech(configById(id)!).runs, "lenient", id);
  assert.deepEqual(configById("B")!.values, { timing: "relative", slurNext: false, doubleSameThumb: true, doubleMs: 40, runs: "lenient" });
  assert.equal(CONFIGS.length, 5);
});

test("D332: findRuns: four or more stepwise notes one way, closer than the IOI; chords, leaps, turns and slow notes break them", () => {
  // Up C D E F G (100 ms apart), then down F E D (a turn: the run down starts on G), then a leap.
  const ns = [0, 1, 2, 3, 4, 3, 2, 1, 5].map((st, i) => note(i, st));
  const r = findRuns(ns, ms, 4, 200);
  const up = r.get(1)!;
  assert.equal(up.dir, 1);
  assert.deepEqual(up.notes, [0, 1, 2, 3, 4]);
  assert.equal(r.has(0), false, "the run's first note is judged as before");
  const down = r.get(5)!;
  assert.equal(down.dir, -1);
  assert.deepEqual(down.notes, [4, 5, 6, 7]);
  assert.equal(r.has(8), false);
  // Too slow: no run.
  assert.equal(findRuns(ns, (a, b) => (b - a) * 250, 4, 200).size, 0);
  // Three notes only: no run.
  assert.equal(findRuns([0, 1, 2].map((st, i) => note(i, st)), ms, 4, 200).size, 0);
  // A chord in the middle breaks it.
  const ch = [note(0, 0), note(1, 1), note(2, 2), note(2, 4), note(3, 3), note(4, 4)];
  assert.equal(findRuns(ch, ms, 4, 200).size, 0);
  // A repeated pitch breaks it (no step).
  assert.equal(findRuns([0, 1, 1, 2, 3].map((st, i) => note(i, st)), ms, 4, 200).size, 0);
});

test("D332: the run's trend: the fitted travel (least squares × time span) the run's way, at least the travel needed; three landings", () => {
  assert.equal(slope([{ t: 0, y: 0 }, { t: 1, y: 2 }]), 2);
  assert.ok(runTrend([{ t: 0, y: 100 }, { t: 0.1, y: 95 }, { t: 0.2, y: 99 }, { t: 0.3, y: 80 }], 1).ok, "up: y falls on the whole");
  assert.equal(runTrend([{ t: 0, y: 100 }, { t: 0.1, y: 95 }, { t: 0.2, y: 99 }, { t: 0.3, y: 80 }], -1).ok, false);
  assert.equal(runTrend([{ t: 0, y: 100 }, { t: 0.1, y: 90 }], 1).ok, false, "two landings: too few");
  // A level-ish run: the right sign but too little travel for a run of three steps over 9 px rows at half a row a step.
  const flat = [{ t: 0, y: 100 }, { t: 0.1, y: 101 }, { t: 0.2, y: 97 }, { t: 0.3, y: 98 }];
  assert.ok(runTrend(flat, 1).ok, "sign only");
  assert.equal(runTrend(flat, 1, 0.5 * 3 * 9).ok, false);
  const real = [{ t: 0, y: 100 }, { t: 0.1, y: 92 }, { t: 0.2, y: 80 }, { t: 0.3, y: 75 }];
  assert.ok(runTrend(real, 1, 0.5 * 3 * 9).ok);
  // Flung far beyond the run's drawn distance (3 steps of 9 px, at most twice): no run played.
  const flung = [{ t: 0, y: 200 }, { t: 0.1, y: 150 }, { t: 0.2, y: 60 }, { t: 0.3, y: 20 }];
  assert.ok(runTrend(flung, 1, 13.5).ok);
  assert.equal(runTrend(flung, 1, 13.5, 2 * 3 * 9).ok, false);
  assert.ok(Math.abs(runTrend(real, 1).travelPx - 26.1) < 0.1, String(runTrend(real, 1).travelPx));
});

const II10: LabPassage = { piece: "wtc2f10", voice: 0, fromBar: 1, toBar: 12, bpm: 110, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };

test("D332: LENIENT judges run notes from either thumb, tells RUN ✓/✗, and changes nothing outside runs", () => {
  const log = synthRun(II10, { gap: -0.02, jitter: 0.03, scatterPx: 18, seed: 2 });
  const strict = replay(log, { ...MECH_DEFAULTS } as Mech).events;
  const lenient = replay(log, { ...MECH_DEFAULTS, runs: "lenient" } as Mech).events;
  const key = (e: { track: number; i: number }) => `${e.track}:${e.i}`;
  const ruled = new Set(lenient.filter((e) => e.kind === "note" && e.ladder?.run).map((e) => key(e as { track: number; i: number })));
  assert.ok(ruled.size > 20, `run notes ${ruled.size}`);
  // Strict: no run rule, no run lines.
  assert.equal(strict.some((e) => e.kind === "run" || (e.kind === "note" && e.ladder?.run)), false);
  // Outside runs every verdict is the same; inside, lenient never refuses what strict accepted.
  const verdict = (evs: typeof strict) => new Map(evs.filter((e) => e.kind === "note").map((e) => [key(e as { track: number; i: number }), (e as { ok: boolean }).ok]));
  const s = verdict(strict);
  const l = verdict(lenient);
  let gained = 0;
  for (const [k, ok] of s) {
    if (!ruled.has(k)) assert.equal(l.get(k), ok, k);
    else if (ok) assert.equal(l.get(k), true, k);
    else if (l.get(k)) gained++;
  }
  assert.ok(gained > 0, "the honest player gains in runs");
  const runs = lenient.filter((e) => e.kind === "run");
  assert.ok(runs.length >= 3, `runs ${runs.length}`);
  assert.ok(runs.filter((e) => e.kind === "run" && e.ok).length >= runs.length - 2, "an honest player's runs mostly travel their way");
  // The log says so.
  const lines = lenient.flatMap((e) => describe("wtc2f10", e));
  assert.ok(lines.some((x) => x.includes("RUN RULE")));
  assert.ok(lines.some((x) => x.includes("RUN ✓")));
});

test("D332: RUN ✗ re-judges the notes right only by the run rule: WRONG, told, the score and the tallies taken back", () => {
  const log = synthRun(II10, { gap: -0.02, jitter: 0.03, randomY: true, seed: 2 });
  const B = configMech(configById("B")!);
  const r = replay(log, B);
  const runs = r.events.filter((e) => e.kind === "run");
  const revoked = r.events.filter((e) => e.kind === "revoked");
  assert.ok(runs.some((e) => e.kind === "run" && !e.ok));
  assert.ok(revoked.length > 0, "a random tapper's run-rule notes are taken back");
  // Each revoked note was right by the RUN RULE (not the strict rule) in a run that failed.
  for (const e of revoked) {
    const n = r.events.find((x) => x.kind === "note" && x.track === e.track && x.i === e.i);
    assert.ok(n && n.kind === "note" && n.ok && n.ladder?.run && n.ladder.run.from !== "strict");
  }
  // The tallies and the game's own count say WRONG; the score is lower than without the take-back.
  const t = tally(r.events);
  assert.equal(t.right, r.summary.right);
  assert.equal(t.wrong, r.summary.wrong);
  const rightNotes = new Set(r.events.filter((e) => e.kind === "note" && e.ok).map((e) => `${(e as { track: number }).track}:${(e as { i: number }).i}`));
  assert.equal(r.summary.right, rightNotes.size - revoked.length, "the game's count follows the take-back");
  assert.ok(revoked.every((e) => e.kind === "revoked" && e.pts > 0), "each takes its points back");
  // The articulation counts never go below nothing, nor the joins above those judged.
  assert.ok(r.summary.legato >= 0 && r.summary.legato <= r.summary.legatoOf);
  // The log says so.
  const lines = r.events.flatMap((e) => describe("wtc2f10", e));
  assert.ok(lines.some((x) => x.includes("RE-JUDGED WRONG")));
  assert.ok(lines.some((x) => x.includes("RUN ✗")));
  // Strict B (as before D332) is never kinder than lenient to a random tapper by more than the run rule's due:
  // its right notes on runs stay within the strict rule's plus those of runs that held.
  const strictB = replay(log, { ...B, runs: "strict" } as Mech);
  assert.ok(r.summary.right >= strictB.summary.right);
});

test("D332: the key signature and a note's alteration against it (drawing only)", () => {
  const C4 = 28; // staff step of C4 (C0 = 0)
  assert.deepEqual(signatureOf("Eb"), [0, 0, -1, 0, 0, -1, -1]);
  assert.deepEqual(signatureOf("c"), [0, 0, -1, 0, 0, -1, -1]);
  assert.deepEqual(signatureOf("e"), [0, 0, 0, 1, 0, 0, 0]);
  assert.deepEqual(signatureOf("C#"), [1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(signatureOf("f"), [0, -1, -1, 0, 0, -1, -1]);
  const eb = signatureOf("Eb");
  // E♭ as the key has it; E♮ raised (drawn up, a natural sign); D as the key; D♭ lowered.
  assert.equal(alterAgainst(C4 + 2, 63, eb), 0);
  assert.equal(alterAgainst(C4 + 2, 64, eb), 1);
  assert.equal(signOf(C4 + 2, 64), "natural");
  assert.equal(alterAgainst(C4 + 1, 62, eb), 0);
  assert.equal(alterAgainst(C4 + 1, 61, eb), -1);
  assert.equal(signOf(C4 + 1, 61), "flat");
  // e minor: F♯ as the key has it, F♮ lowered, D♯ raised.
  const em = signatureOf("e");
  assert.equal(alterAgainst(C4 + 3, 66, em), 0);
  assert.equal(alterAgainst(C4 + 3, 65, em), -1);
  assert.equal(alterAgainst(C4 + 1, 63, em), 1);
  assert.equal(signOf(C4 + 1, 63), "sharp");
  // The shift: a fraction of a row (about a third), none on rows too thin.
  assert.equal(chromaShift(5), 2);
  assert.equal(chromaShift(10), 4);
  assert.equal(chromaShift(2), 0);
  for (const g of Object.values(SIGN_PIXELS)) assert.ok(g.length === 4 && g.every((r) => r.length === 3));
});
