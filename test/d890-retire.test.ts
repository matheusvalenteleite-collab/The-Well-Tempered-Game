/**
 * D890-D894: PET SOUNDS, TRACKER and MEGA FM withdrawn; the TIMPANI, the TABOR and the FIELD DRUM withdrawn; CLASSIC CHIP
 * without its drum. Gone from every list and table; a stored choice of any falls back to the piece's own (its default
 * sound, its HOME drums); MEGA FM's lead kept as a donor no offered sound seats.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";
import { PATCHES, PRESETS, WITHDRAWN_D890, playerSound } from "../src/touch/sound.ts";
import { FUGUE_PICKS, FUGUE_STYLES, NO_DRUMS, SOUND_FUGUE_HOME, SOUND_STYLES, STORED_PRESET_KEY, STYLES, WITHDRAWN_STYLES, chosenStyle, drumMenuFor, drumStyleFor, homeFor, homeStyleFor, setDrumStyle, styleIds } from "../src/touch/drum-library.ts";
import { OCTAVE_SEATS } from "../src/touch/octave-seats.ts";
import { OWN_LOUD, SOUND_LOUD } from "../src/touch/player-lift-data.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { loadExtras } from "../src/touch/fugue.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const GONE = ["petSounds", "tracker", "megaFm"];
const KITS = ["timpani", "tabor", "fieldDrums"];

test("D890: the three sounds in no list, no table, no piece's default; MEGA FM's lead a donor", async () => {
  await loadExtras();
  for (const id of GONE) {
    assert.ok(WITHDRAWN_D890.has(id));
    assert.ok(!PRESETS.some((p) => p.id === id), id);
    assert.ok(!POP_SOUNDS.some(([s]) => s === id), `${id}: POP_SOUNDS`);
    assert.ok(!SOUND_GROUPS.some(([, ids]) => ids.includes(id)), `${id}: the menu`);
    assert.ok(!Object.values(PIECE_SOUND).includes(id), `${id}: a default`);
    assert.ok(!(id in OCTAVE_SEATS) && !(id in SOUND_LOUD) && !(id in SOUND_STYLES), `${id}: seats, lift, drums`);
    assert.ok(!Object.values(OWN_LOUD).some((r) => r.s === id), `${id}: a lift row`);
    for (const [p, c] of Object.entries(COLOURS)) assert.ok(c.sound !== id && !(id in c.plans), `${p}: ${id} in its colour plan`);
    assert.equal(playerSound(id), "chip");
  }
  assert.ok(PATCHES.fmLead.fm, "the donor kept");
  for (const p of PRESETS) for (const ls of Object.values(p.by ?? {})) assert.ok(!(ls ?? []).some(([s]) => s === "fmLead"), p.id);
});

test("D890: a stored choice of a withdrawn sound opens the piece on its own sound", () => {
  for (const id of ["wtc1f15", "wtc1f17", "bwv1080-14", "bwv784", "wtc2f01"]) {
    for (const gone of [...GONE, "petSoundsV2"]) assert.equal(soundFor(id, { [id]: gone }, "chip"), PIECE_SOUND[id], `${id} chose ${gone}`);
    assert.equal(soundFor(id, { [id]: "gameboy" }, "chip"), "gameboy", "a kept choice kept");
  }
});

test("D891: the three kits in no list, no default, no pick; a stored choice of one plays the piece's HOME", () => {
  for (const k of KITS) {
    assert.ok(WITHDRAWN_STYLES.has(k));
    assert.ok(!STYLES.some((s) => s.id === k) && !styleIds.includes(k), k);
    assert.ok(!Object.values(FUGUE_STYLES).includes(k), `${k}: a fugue's own`);
    assert.ok(!Object.values(FUGUE_PICKS).some((p) => p.includes(k)), `${k}: a pick`);
    assert.ok(!Object.values(SOUND_STYLES).some((f) => f.includes(k)), `${k}: a family`);
    assert.ok(!Object.values(SOUND_FUGUE_HOME).some((h) => Object.values(h).includes(k)), `${k}: a sound's HOME by fugue`);
  }
  for (const [id, sound] of Object.entries(PIECE_SOUND)) assert.ok(!KITS.includes(homeFor(id, sound)), `${id}: its HOME`);
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }, configurable: true, writable: true });
  for (const [id, kit] of [["bwv774", "tabor"], ["wtc1f09", "timpani"], ["bwv951", "fieldDrums"], ["wtc1f22", "fieldDrums"]] as const) {
    store.set(STORED_PRESET_KEY(id), kit);
    assert.equal(chosenStyle(id), null, `${id}: ${kit} stored`);
    assert.equal(drumStyleFor(id, PIECE_SOUND[id]), homeFor(id, PIECE_SOUND[id]), `${id}: its HOME`);
    setDrumStyle(id, kit);
    assert.equal(drumStyleFor(id, PIECE_SOUND[id]), homeFor(id, PIECE_SOUND[id]), `${id}: ${kit} chosen this visit`);
  }
});

test("D892: CLASSIC CHIP without its drum: NO DRUMS its HOME, first on the menu; the chip kit GAME BOY's and SID 64's", () => {
  assert.equal(homeStyleFor("chip"), NO_DRUMS);
  assert.ok(!SOUND_STYLES.chip.includes("chip"));
  assert.equal(homeStyleFor("gameboy"), "chip");
  assert.equal(homeStyleFor("sid64"), "chip");
  for (const id of ["wtc1p02", "wtc2f17", "bwv1080-13r", "bwv797", "bwv799"]) assert.equal(homeFor(id, "chip"), NO_DRUMS, id);
  assert.equal(homeFor("wtc2f11", "chip"), "breakbeat", "II/11's break, a kit that fits it clearly");
  const m = drumMenuFor("wtc2f17", "chip");
  assert.equal(m[0].style, NO_DRUMS);
  assert.equal(m[0].name, "NO DRUMS");
  assert.equal(new Set(m.map((x) => x.style)).size, m.length);
});
