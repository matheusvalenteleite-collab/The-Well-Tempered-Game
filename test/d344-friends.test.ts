/** D344 (WTC 1.57): one reading a fugue for the friends, HOW TO PLAY in three levels, DRUMS as a backing track. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BEST_READING, bestReading, NO_READING, readingsOf } from "../src/touch/readings.ts";
import { FUGUES, fugueById, beatOf } from "../src/touch/fugue.ts";
import { RULE_LEVELS, RULES } from "../src/bench/lite.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { BACKING_GROOVE, BACKING_LEVEL, BACKING_HIGHPASS_HZ, grooveHits, grooveNow, PRESETS, setBacking, setDrums, setPreset } from "../src/touch/sound.ts";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";

const book1 = FUGUES.filter((f) => f.book === 1).map((f) => f.id);

test("D344: every Book I fugue has one chosen reading, among those the data hold for it (or none)", () => {
  assert.equal(book1.length, 24);
  for (const id of book1) {
    const want = BEST_READING[id];
    assert.ok(want, id);
    if (want === NO_READING) assert.equal(bestReading(id), null, id);
    else assert.equal(bestReading(id)?.id, want, `${id}: ${want} is one of ${readingsOf(id).map((r) => r.id)}`);
  }
});

test("D344: the table of reasons names every Book I fugue and its reading", () => {
  const md = readFileSync("docs/wtc/READINGS-CHOSEN.md", "utf8");
  for (const id of book1) {
    const n = Number(id.slice(-2));
    const row = md.split("\n").find((l) => l.startsWith(`| I/${n} `));
    assert.ok(row, `row for I/${n}`);
    const want = BEST_READING[id];
    assert.match(row!, new RegExp(want === NO_READING ? "NONE" : want.toUpperCase()), row);
  }
});

test("D344: HOW TO PLAY in three levels; every line translated; the earlier lines all kept", () => {
  const l = RULE_LEVELS.ladder;
  assert.ok(l.basics.length && l.intermediate.length && l.advanced.length);
  assert.deepEqual(RULES.ladder, [...l.basics, ...l.intermediate, ...l.advanced]);
  for (const r of [...l.basics, ...l.intermediate, ...l.advanced]) {
    assert.ok(PT[r], `pt: ${r}`);
    assert.ok(ES[r], `es: ${r}`);
  }
  for (const k of ["BASICS", "INTERMEDIATE", "ADVANCED"]) assert.ok(PT[k] && ES[k], k);
  assert.equal(PT.INTERMEDIATE, "INTERMEDIÁRIO");
  assert.equal(ES.INTERMEDIATE, "INTERMEDIO");
  assert.match(l.basics.join(" "), /DRUMS ON/);
  assert.match(l.intermediate.join(" "), /pull-off/);
  assert.match(l.advanced.join(" "), /fast runs/);
});

test("D344: DRUMS (the friends' backing) plays under every Book I fugue's sound, on the metre's beats; off by default", () => {
  setDrums(false);
  setBacking(false);
  for (const id of book1) {
    setPreset(soundFor(id, {}, "chip"));
    assert.equal(grooveNow(), null, `${id}: silent while off`);
  }
  setBacking(true);
  try {
    for (const id of book1) {
      setPreset(soundFor(id, {}, "chip"));
      const g = grooveNow();
      assert.ok(g, id);
      const f = fugueById(id);
      const { perBar, ticks } = beatOf(f);
      const compound = ticks !== f.tpq * (4 / Number(f.meter.split("/")[1]));
      for (let b = 0; b < perBar; b++) assert.ok(grooveHits(g!.groove, b, 0, perBar, compound).every((h) => h.at >= 0 && h.at < 1 && h.vel <= 1), `${id} beat ${b}`);
      assert.ok(grooveHits(g!.groove, 0, 0, perBar, compound).length > 0, `${id}: the downbeat sounds`);
    }
    // Any sound the unlocked page offers too.
    for (const p of PRESETS) {
      setPreset(p.id);
      assert.ok(grooveNow(), p.id);
    }
    assert.ok(BACKING_LEVEL < 1 && BACKING_HIGHPASS_HZ >= 150, "below and behind the music, the bass's room left");
    assert.ok(typeof BACKING_GROOVE === "string" && PIECE_SOUND.wtc1f01);
  } finally {
    setBacking(false);
    setPreset("chip");
  }
});

test("D344: the game's judging never reads the drums", () => {
  const src = readFileSync("src/bench/proto-game.ts", "utf8");
  assert.doesNotMatch(src, /backingOn|grooveNow|setBacking/);
});
