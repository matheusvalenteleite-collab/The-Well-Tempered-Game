/**
 * D722, D723: MY FUGUE shared: the MP3's length and rate as the game times the set; the MIDI file a track a
 * voice, the takes' notes as played (their wrong pitches, places and strengths), the others the score's.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replay, silentChip } from "../src/bench/lab/replay.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { parseLog } from "../src/bench/lab/log.ts";
import { outcomesOf, type Take } from "../src/bench/takes/take.ts";
import { lengthOf, rateFor } from "../src/bench/takes/render.ts";
import { midiOf, MIDI_PPQ, takeNotes, velocityOf } from "../src/bench/takes/midi.ts";
import { fugueById } from "../src/touch/fugue.ts";

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

test("D722: the MP3's length is the set's as the game times it, its rate lower for long pieces", () => {
  const take = takeOf();
  const f = fugueById(take.piece);
  const s = lengthOf({ piece: take.piece, takes: [take], bpm: take.bpm, mix: [1, 1, 1] });
  // Six bars of II/12 at its tempo, plus the count-in and the tail.
  const bars = (6 * f.barTicks) / ((f.tpq * take.bpm) / 60);
  assert.ok(s > bars && s < bars + 12, `${s.toFixed(1)} s for six bars (${bars.toFixed(1)} s)`);
  assert.equal(rateFor(240), 32000);
  assert.equal(rateFor(420), 24000);
});

test("D723: the MIDI file: a header, a tempo track and a track a voice; the take's notes as played", () => {
  const take = takeOf();
  const f = fugueById(take.piece);
  const bytes = midiOf(take.piece, new Map([[0, take]]), f.voiceNames, take.bpm);
  const s = String.fromCharCode(...bytes.slice(0, 4));
  assert.equal(s, "MThd");
  assert.equal((bytes[10] << 8) | bytes[11], f.voices.length + 1, "a track a voice and the tempo's");
  assert.equal((bytes[12] << 8) | bytes[13], MIDI_PPQ);
  // Every MTrk chunk is where its length says.
  let at = 14;
  let n = 0;
  let ons = 0;
  while (at < bytes.length) {
    assert.equal(String.fromCharCode(...bytes.slice(at, at + 4)), "MTrk");
    const len = (bytes[at + 4] << 24) | (bytes[at + 5] << 16) | (bytes[at + 6] << 8) | bytes[at + 7];
    const body = bytes.slice(at + 8, at + 8 + len);
    if (n === 1) for (let i = 0; i < body.length - 2; i++) if ((body[i] & 0xf0) === 0x90 && body[i + 2] > 0 && body[i + 1] < 128) ons++;
    at += 8 + len;
    n++;
  }
  assert.equal(n, f.voices.length + 1);
  assert.ok(ons >= take.notes.length * 0.9, `the take's notes (${ons} of ${take.notes.length})`);
  const tn = takeNotes(take);
  assert.ok(tn.every(([on, off]) => off > on), "every note ends after it begins");
  assert.equal(velocityOf({ touch: 0 }), 44);
  assert.equal(velocityOf({ touch: 1 }), 116);
  assert.equal(velocityOf({}), 80);
});
