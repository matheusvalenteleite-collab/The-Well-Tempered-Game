/**
 * D429, THE BAND'S BOW CHANGES AND SLURS (the owner: "yes, do the band's bow changes and slurs too"): a
 * bowed band note (Patch.bow) joined from the one before is a slur inside one of the reading's slurs, else a
 * new bow (Play.bowChange: D427's bite and accent); it gives way to the next likewise (Play.give). Other
 * sounds' band notes carry neither.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import type { Chip, Play, Voicing } from "../src/touch/chip.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { bowEntry, setPreset, STRING_BOW, STRING_BOW_CHANGE } from "../src/touch/sound.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { playReading } from "../src/touch/readings.ts";

installFakeAudio(0, true);
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => 400 };

function bandNotes(preset: string, id = "wtc1f02", bars = 12): { midi: number; v: Voicing; p: Play }[] {
  setPreset(preset);
  const f = fugueById(id);
  const clock = { t: 0 };
  const log: { midi: number; v: Voicing; p: Play }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, _at: number, _dur: number, v: Voicing, p: Play = {}) => (log.push({ midi, v, p }), { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
  // The player's voice the soprano, never touched: the band is the alto and bass.
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false, solo: false, easy: "direction", fail: false, reading: playReading(f.id), until: bars * f.barTicks }, chip);
  g.rows = ROWS;
  g.wall = () => clock.t * 1000;
  const t1 = g.timeAt(bars * f.barTicks);
  while (clock.t < t1) (clock.t += 0.02), g.step();
  setPreset("chip");
  return log;
}

test("D429: the band's bow change bites as the player's; without the flag, D358's stroke", () => {
  const c = STRING_BOW_CHANGE;
  assert.equal(bowEntry(STRING_BOW, { legato: true, bowChange: true })?.accentDb, c.accentDb);
  assert.equal(bowEntry(STRING_BOW, { legato: true, bowChange: true })?.still, c.still);
  assert.equal(bowEntry(STRING_BOW, { legato: true })?.accentDb, 0);
});

test("D429: STRING CONSORT's band joins as string players: slurs inside Busoni's slurs, bow changes elsewhere", () => {
  const log = bandNotes("stringConsort");
  const joined = log.filter((x) => x.p.legato && x.v.patch?.bow);
  assert.ok(joined.length > 10, `${joined.length} joined bowed notes`);
  const slurs = joined.filter((x) => x.p.slur).length;
  const bows = joined.filter((x) => x.p.bowChange).length;
  assert.equal(slurs + bows, joined.length, "every joined bowed note one or the other");
  assert.ok(slurs > 0 && bows > 0, `${slurs} slurred, ${bows} bow changes (I/2's slurred sixteenths and its detached eighths)`);
  const gives = log.filter((x) => x.p.give);
  assert.ok(gives.some((x) => x.p.give === "slur") && gives.some((x) => x.p.give === "bow"), "the notes given way to, both ways");
});

test("D429: other sounds' band notes carry neither", () => {
  for (const s of ["pianoSampled", "harpsichordSampled", "soloVoices", "megaFm"]) {
    const log = bandNotes(s, "wtc1f02", 6);
    assert.equal(log.filter((x) => x.p.slur || x.p.bowChange || x.p.give).length, 0, s);
  }
});
