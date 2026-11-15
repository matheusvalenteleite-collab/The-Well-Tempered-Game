/**
 * D720, MY FUGUE: the mixer's levels (MUTE, SOLO), the set (a starred take a voice), and a take played as
 * another voice under a run: its notes asked for as recorded, routed as the band's, at the mixer's level;
 * silent when muted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replay, silentChip } from "../src/bench/lab/replay.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { parseLog } from "../src/bench/lab/log.ts";
import { backingFor, clampLevel, flatMix, gains, starred } from "../src/bench/takes/myfugue.ts";
import { outcomesOf, TakePlayer, type Take } from "../src/bench/takes/take.ts";
import type { Play } from "../src/touch/chip.ts";

const fixture = parseLog(readFileSync(new URL("./fixtures/lab-run.json", import.meta.url), "utf8"));

function takeOf(): Take {
  let rec: ReturnType<ReturnType<typeof labGame>["takeRecorder"]> | null = null;
  const r = replay(fixture, undefined, (g) => {
    rec = g.takeRecorder();
    g.takeRec = rec;
  });
  const f = labGame(fixture.passage, silentChip({ t: 0 }));
  return { v: 1, id: "a", piece: fixture.passage.piece, voice: 0, voices: f.f.voices.length, at: "2026-11-12T08:00:00.000Z", grade: "A", score: r.summary.score, failedBar: null, sound: "busoni", reading: null, bpm: fixture.passage.bpm, tempoPct: 100, lag: 0, app: "test", from: 0, until: f.end, notes: rec!.notes, calls: rec!.calls, out: outcomesOf(r.events, f.tracks.map((t) => t.notes.length)) };
}

test("D720: the mixer: MUTE silences a voice, SOLO silences the others, levels kept in steps", () => {
  const m = flatMix(4);
  assert.deepEqual(gains(m), [1, 1, 1, 1]);
  m[1] = { level: 0.75, mute: false, solo: false };
  m[2] = { level: 1, mute: true, solo: false };
  assert.deepEqual(gains(m), [1, 0.75, 0, 1]);
  m[3] = { level: 1.25, mute: false, solo: true };
  assert.deepEqual(gains(m), [0, 0, 0, 1.25]);
  assert.equal(clampLevel(2), 1.5);
  assert.equal(clampLevel(-1), 0);
  assert.equal(clampLevel(0.6), 0.5);
});

test("D720: the set: one starred take a voice; LISTEN puts one first and the rest behind, RECORD the others behind", () => {
  const t = (id: string, voice: number, star: boolean) => ({ ...takeOf(), id, voice, star });
  const set = starred([t("a", 0, true), t("b", 0, false), t("c", 2, true), t("d", 1, false)]);
  assert.deepEqual([...set.keys()].sort(), [0, 2]);
  const l = backingFor(set, null);
  assert.equal(l.main?.voice, 0);
  assert.deepEqual(l.backing.map((x) => x.voice), [2]);
  const r = backingFor(set, 2);
  assert.equal(r.main, null);
  assert.deepEqual(r.backing.map((x) => x.voice), [0]);
});

test("D720: a take behind a run plays its notes as recorded, as the band's, at the mixer's level; muted, nothing", () => {
  const take = takeOf();
  for (const level of [1, 0.5, 0]) {
    const clock = { t: 0 };
    const chip = silentChip(clock);
    const asked: { midi: number; gain: number; play: Play }[] = [];
    const note = chip.note;
    chip.note = (midi, at, dur, v, p = {}) => (p.asBand ? asked.push({ midi, gain: v.gain, play: p }) : 0, note(midi, at, dur, v, p));
    // The player plays the alto; the soprano is the take.
    const g = labGame({ ...fixture.passage, voice: 1 }, chip);
    g.backing = [new TakePlayer(take)];
    g.mix = [level, 1, 1];
    for (let n = 0; n < 60 * 120 && !g.step(); n++) clock.t += 1 / 60;
    if (level === 0) assert.equal(asked.length, 0, "muted: nothing asked for");
    else {
      assert.deepEqual(asked.map((a) => a.midi), take.notes.map((n) => n[2]), `level ${level}: every note as recorded`);
      assert.ok(asked.every((a, i) => Math.abs(a.gain - take.notes[i][4].gain * level) < 1e-9), "at the mixer's level");
      assert.ok(asked.every((a) => a.play.lead && a.play.asBand), "the lead's sound, routed as the band's");
    }
  }
});
