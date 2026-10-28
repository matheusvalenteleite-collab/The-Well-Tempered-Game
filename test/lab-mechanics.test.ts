/**
 * D317, THE LAB: the mechanics' defaults were the game's constants (D337, WTC 1.52: those are A · CLASSIC's,
 * MECH_CLASSIC; the game's defaults B+ · PREPARED); a recorded run
 * replays to the same verdicts; a parameter changed changes the verdicts as it should; the node replay
 * script runs on a fixture log.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { DOUBLE_MS, EDGE_SHARE, LADDER_ROW_MIN, OWN_FRESH_S, PERFECT_MS, SLIDE_MIN_PX, SPLIT_FLOOR_MS, TRAVEL_MIN, BT_EARLY_MS, BT_LATE_MS } from "../src/bench/proto-game.ts";
import { LEGATO_GAP_MS, LEGATO_GAP_SHARE, legatoGapMs } from "../src/bench/articulation.ts";
import { options } from "../src/touch/lanes.ts";
import { CLASSIC_VALUES, MECH, MECH_CLASSIC, MECH_DEFAULTS, MECH_SPEC, mechChanges, resetMech, setMech, withMech } from "../src/bench/mechanics.ts";
import { diff, replay, tally } from "../src/bench/lab/replay.ts";
import { describe as lines } from "../src/bench/lab/describe.ts";
import { parseLog, logText, type LabPassage } from "../src/bench/lab/log.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";

const II12: LabPassage = { piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, bpm: 79, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };

test("D317: MECH's defaults were the constants the engine read before (D337: WTC 1.51's, A · CLASSIC, MECH_CLASSIC)", () => {
  const easy = options(480, 60, "easy");
  // lanes.ts options: 250 ms either side at "easy" (ticks per ms 480*60/60000 = 0.48).
  assert.equal(MECH_CLASSIC.earlyMs * 0.48, easy.early);
  assert.equal(MECH_CLASSIC.lateMs * 0.48, easy.late);
  assert.equal(MECH_CLASSIC.splitHalfway, true);
  assert.equal(MECH_CLASSIC.splitFloorMs, SPLIT_FLOOR_MS);
  assert.equal(MECH_CLASSIC.perfectMs, PERFECT_MS);
  assert.equal(MECH_CLASSIC.doubleMs, DOUBLE_MS);
  assert.equal(MECH_CLASSIC.btEarlyMs, BT_EARLY_MS);
  assert.equal(MECH_CLASSIC.btLateMs, BT_LATE_MS);
  assert.equal(MECH_CLASSIC.ladderRowMin, LADDER_ROW_MIN);
  assert.equal(MECH_CLASSIC.ownFreshS, OWN_FRESH_S);
  assert.equal(MECH_CLASSIC.edgeShare, EDGE_SHARE);
  assert.equal(MECH_CLASSIC.travelMin, TRAVEL_MIN);
  assert.equal(MECH_CLASSIC.slideMinPx, SLIDE_MIN_PX);
  assert.equal(MECH_CLASSIC.legatoGapMs, LEGATO_GAP_MS);
  assert.equal(MECH_CLASSIC.legatoGapShare, LEGATO_GAP_SHARE);
  // D353: the shake's reader replaced (the contour reader, its thresholds by the tempo): D314's window
  // and fixed reach (0.4 row, 6 px) gone; the steepness kept.
  assert.equal(MECH_CLASSIC.shakeSteep, 1.5);
  // The ones that were literals in the code (D286, D289, D296): their values then.
  assert.deepEqual([MECH_CLASSIC.repeatRows, MECH_CLASSIC.stepLeewayRows, MECH_CLASSIC.leapRows, MECH_CLASSIC.slideReachRows], [2.5, 1, 0.5, 0.5]);
  assert.deepEqual([MECH_CLASSIC.slides, MECH_CLASSIC.freeOrnaments, MECH_CLASSIC.expression, MECH_CLASSIC.cancel, MECH_CLASSIC.directionRef], [true, true, true, "overlap", "own"]);
  // The game runs on the defaults, and every parameter has a control in the lab.
  assert.deepEqual(MECH, MECH_DEFAULTS);
  assert.deepEqual(mechChanges(), {});
  assert.deepEqual(new Set(MECH_SPEC.map((s) => s.key)), new Set(Object.keys(MECH_DEFAULTS)));
  // D289: the legato allowance as before (the larger of 90 ms and 35% of the note), in ABSOLUTE.
  withMech(CLASSIC_VALUES, () => {
    assert.equal(legatoGapMs(100), 90);
    assert.equal(legatoGapMs(1000), 350);
  });
});

test("D317: setMech coerces, withMech restores", () => {
  withMech({ ...CLASSIC_VALUES, legatoGapMs: "120", slides: "false", cancel: "lift", nope: 3 }, () => {
    assert.equal(MECH.legatoGapMs, 120);
    assert.equal(MECH.slides, false);
    assert.equal(MECH.cancel, "lift");
    assert.equal(legatoGapMs(100), 120);
  });
  assert.deepEqual(MECH, MECH_DEFAULTS);
  setMech({ travelMin: 0.5 });
  assert.equal(MECH.travelMin, 0.5);
  resetMech();
  assert.deepEqual(MECH, MECH_DEFAULTS);
});

test("D317: a recorded run replays to identical verdicts with the default parameters", () => {
  const log = synthRun(II12, { gap: 0.06, wrongEvery: 9, strayEvery: 13, jitter: 0.03 });
  assert.ok(log.verdicts.length > 40, `verdicts ${log.verdicts.length}`);
  const t0 = tally(log.verdicts);
  assert.ok(t0.right > 20 && t0.wrong > 0 && t0.joined > 0, JSON.stringify(t0));
  // Through text and back (what COPY LOG and the script do).
  const back = parseLog(`pasted: ${logText(log)}`);
  const r = replay(back);
  const d = diff(back, back.verdicts, r.events, r.mech);
  assert.ok(d.same, `${d.line}\n${d.notes.join("\n")}`);
  // The same events in the same order (their times within the log's 0.1 ms rounding).
  const key = (e: (typeof r.events)[number]) => `${e.kind}:${e.track}:${"i" in e ? e.i : ""}:${"ok" in e ? e.ok : ""}:${"word" in e ? e.word : ""}`;
  assert.deepEqual(r.events.map(key), log.verdicts.map(key));
  for (const [j, e] of r.events.entries()) assert.ok(Math.abs(e.tick - log.verdicts[j].tick) < 0.5, `event ${j} tick ${e.tick} vs ${log.verdicts[j].tick}`);
  assert.deepEqual(r.summary, log.result);
  // Twice: the same (nothing random, no wall clock).
  assert.deepEqual(replay(back).events, r.events);
  // Every event reads as a line.
  for (const e of r.events) assert.ok(lines(II12.piece, e).every((l) => l.length > 8));
});

test("D317: a parameter changed changes the verdicts as expected (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  // Thumbs lifting 150 ms before the next strike: semiquavers at 79 bpm (190 ms) mostly not joined at 90 ms.
  const log = synthRun(II12, { gap: 0.15, jitter: 0.01 });
  const base = tally(log.verdicts);
  const wide = replay(log, { legatoGapMs: 200 });
  const d = diff(log, log.verdicts, wide.events, wide.mech);
  assert.ok(d.after.joined > base.joined, d.line);
  assert.match(d.line, /^with Legato gap 200 ms: .*more joined/);
  assert.ok(d.notes.some((n) => /NOT JOINED → JOINED/.test(n)), d.notes.join("\n"));
  // Wrong-way touches (two rows) pass with a leeway of three rows, fail more with none.
  const wr = synthRun(II12, { gap: 0.06, wrongEvery: 4, jitter: 0.01 });
  const loose = tally(replay(wr, { stepLeewayRows: 3, leapRows: 0, travelMin: 0, repeatRows: 6 }).events);
  assert.ok(loose.wrong < tally(wr.verdicts).wrong, `${loose.wrong} vs ${tally(wr.verdicts).wrong}`);
  // Narrow windows: more strays and misses.
  const loose80 = synthRun(II12, { gap: 0.06, jitter: 0.08 });
  const narrow = tally(replay(loose80, { earlyMs: 40, lateMs: 40, splitFloorMs: 20 }).events);
  assert.ok(narrow.right < tally(loose80.verdicts).right, `${narrow.right} vs ${tally(loose80.verdicts).right}`);
  }));

test("D317: tools/lab/replay.ts runs on the fixture log", () => {
  const fixture = new URL("./fixtures/lab-run.json", import.meta.url);
  const log = parseLog(readFileSync(fixture, "utf8"));
  assert.equal(log.passage.piece, "wtc2f12");
  const script = new URL("../tools/lab/replay.ts", import.meta.url).pathname;
  const same = execFileSync(process.execPath, [script, fixture.pathname], { encoding: "utf8" });
  assert.match(same, /with the same parameters: identical verdicts/);
  const changed = execFileSync(process.execPath, [script, fixture.pathname, "--set", "legatoGapMs=300", "--verdicts"], { encoding: "utf8" });
  assert.match(changed, /with Legato gap 300 ms/);
  assert.match(changed, /♩ /);
  const json = JSON.parse(execFileSync(process.execPath, [script, fixture.pathname, "--set", "slides=false", "--json"], { encoding: "utf8" }));
  assert.equal(json.passage.piece, "wtc2f12");
  assert.ok(json.after.right >= 0);
});
