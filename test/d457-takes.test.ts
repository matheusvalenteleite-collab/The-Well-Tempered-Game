/**
 * D457, RECORD YOUR FUGUE (phase 1): a take keeps the player's voice exactly as it was played, wrong notes
 * and timing included; judged again from its log it gives the run's own score; played back it asks the
 * engine for the very notes the run asked for, at the same places in the score.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replay, silentChip } from "../src/bench/lab/replay.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { parseLog, type LabLog, type LabPassage } from "../src/bench/lab/log.ts";
import { synthRun } from "../tools/lab/lab-synth.ts";
import { outcomesOf, plainPlay, takeName, TakePlayer, takeBytes, type Take, type TakeNote } from "../src/bench/takes/take.ts";
import type { Chip, Play, Sounding } from "../src/touch/chip.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";

const II12: LabPassage = { piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, bpm: 79, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };

/** A run played again with a recorder on it: its take, its verdicts, its summary. */
function recorded(log: LabLog) {
  let rec: ReturnType<ReturnType<typeof labGame>["takeRecorder"]> | null = null;
  const r = replay(log, undefined, (g) => {
    rec = g.takeRecorder();
    g.takeRec = rec;
  });
  return { notes: rec!.notes, calls: rec!.calls, r };
}

function takeOf(log: LabLog): Take {
  const { notes, calls, r } = recorded(log);
  const f = labGame(log.passage, silentChip({ t: 0 }));
  return {
    v: 1,
    id: "t",
    piece: log.passage.piece,
    voice: log.passage.voice,
    voices: f.f.voices.length,
    at: "2026-05-23T17:30:00.000Z",
    grade: "A",
    score: r.summary.score,
    failedBar: null,
    sound: "busoni",
    reading: log.passage.reading,
    bpm: log.passage.bpm,
    tempoPct: log.passage.tempoPct,
    lag: 0,
    app: "test",
    from: 0,
    until: f.end,
    notes,
    calls,
    out: outcomesOf(r.events, f.tracks.map((t) => t.notes.length)),
    log,
  };
}

const fixture = parseLog(readFileSync(new URL("./fixtures/lab-run.json", import.meta.url), "utf8"));

test("D457: a take is deterministic: the same run recorded twice gives the identical take", () => {
  const a = recorded(fixture);
  const b = recorded(fixture);
  assert.ok(a.notes.length > 0, "the run's notes are recorded");
  assert.deepEqual(a.notes, b.notes);
  assert.deepEqual(a.calls, b.calls);
});

test("D457: a saved take judged again from its log gives the run's own score (the fixture and synthetic runs)", () => {
  const runs = [fixture, synthRun(II12, { gap: 0.06, wrongEvery: 9, strayEvery: 13, jitter: 0.03 }), synthRun(II12, { gap: 0.15, wrongEvery: 4, jitter: 0.02, seed: 7 })];
  for (const log of runs) {
    const take = takeOf(log);
    const again = replay(take.log!);
    assert.equal(again.summary.score, take.score, "re-scored identically");
    // (The fixture's own score, 298, was the judging of its day: judged again by today's code it differs, as
    // THE LAB's replays do; so a take keeps its score as played, and is judged again only by the same version.)
  }
});

test("D457: wrong notes are kept as sounded, their pitch the one the thumb landed on", () => {
  const log = synthRun(II12, { gap: 0.06, wrongEvery: 4, jitter: 0.01 });
  const { notes, r } = recorded(log);
  const wrongs = r.events.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note" && !e.ok && e.wrongMidi !== undefined);
  assert.ok(wrongs.length > 0, "the synthetic run has wrong notes");
  const sounded = new Set(notes.map((n) => n[2]));
  for (const w of wrongs) assert.ok(sounded.has(w.wrongMidi!), `wrong pitch ${w.wrongMidi} kept`);
  const take = takeOf(log);
  assert.ok(take.out[0].includes("w"), "the outcomes keep the wrong notes");
  assert.ok(take.out[0].includes("r"), "and the right ones");
});

test("D457: played back, a take asks for the same notes at the same places (ticks), with its touch", () => {
  const take = takeOf(fixture);
  const asked: { midi: number; tick: number; play: Play }[] = [];
  const stops: number[] = [];
  const p = new TakePlayer(take);
  // A clock of 1 tick = 1 ms, the schedule a whole bar ahead.
  const timeAt = (t: number) => t / 1000;
  const sd = (): Sounding => ({ stop: (at) => void stops.push(at ?? -1), bend() {} });
  for (let live = 0; live < take.until + 20000; live += 400) p.step(live + 4000, live, timeAt, (n: TakeNote, at) => (asked.push({ midi: n[2], tick: at * 1000, play: n[5] as Play }), sd()));
  assert.ok(p.done);
  assert.deepEqual(
    asked.map((a) => [a.midi, Math.round(a.tick * 10) / 10]),
    take.notes.map((n) => [n[2], n[1]]),
  );
  assert.equal(stops.length, take.calls.filter((c) => c[2] === "stop").length, "every release done again");
  assert.ok(asked.every((a) => a.play.lead === true), "the player's own voice (its bus)");
});

test("D457: the touch is kept plain (no sound nodes), and a take is small", () => {
  const node = { connect() {} };
  assert.deepEqual(plainPlay({ level: 0.123456789, lead: true, into: node as unknown as AudioNode }), { level: 0.12346, lead: true });
  const take = takeOf(fixture);
  const noLog = { ...take, log: undefined };
  assert.ok(takeBytes(noLog) < 20000, `six bars' take ${takeBytes(noLog)} bytes`);
});

test("D457: a take's name: ALTO · A · 17:30 23/05/2026 (the owner's example)", () => {
  const voiceWord = (v: number, n: number) => (n === 3 ? ["SOPRANO", "ALTO", "BASS"][v] : "VOICE");
  const at = new Date(2026, 4, 23, 17, 30).toISOString();
  assert.equal(takeName({ voice: 1, voices: 3, grade: "A", at }, voiceWord), "ALTO · A · 17:30 23/05/2026");
  assert.equal(takeName({ voice: 1, voices: 3, grade: "A", at, name: "Sunday's" }, voiceWord), "Sunday's");
});

// The chip type is used only for its shape here.
export type _Chip = Chip;
