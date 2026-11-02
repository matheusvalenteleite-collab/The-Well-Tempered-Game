/**
 * D501, THE INSTRUMENTS FINISHED (the owner: "Just implement it all"): OBBLIGATO's sound by the player's
 * instrument ("auto": an effect on a keyboard or plucked sound, a merged layer on every other); the slide's
 * sound by family ("auto": the strings, the voices and the lute the instruments session's, the keyboards,
 * chips, consoles and synths D486's gestures); CLAVICHORD offered, and its two fugues (I/6, II/18).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { EFFECT_SOUNDS, OBBLIGATO_MODE, effectFor, mainKind, obbligatoModeFor, obbligatoParam, setObbligatoMode, LAYERS, LOUDNESS } from "../src/bench/obbligato.ts";
import { SLIDE_SOUND, slideFamily, slideSoundFor, slideSoundParam, withSlideSound } from "../src/bench/slide-sound.ts";
import { exprFamily, keyboardSlide } from "../src/bench/glenn.ts";
import { CLAVI_GAIN, CLAVI_PHONE_GAIN, CLAVI_PHONE_LIFT, PATCHES, PRESETS, TRIALS, busoniReaches, expressiveAll, offered, presetById, setPreset } from "../src/touch/sound.ts";
import { styleOf } from "../src/touch/phrasing.ts";
import { TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { busoniLeads } from "../src/touch/colour.ts";
import { wholeReadingOf } from "../src/touch/readings.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";
import { MECH } from "../src/bench/mechanics.ts";
import { replay } from "../src/bench/lab/replay.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";
import type { Chip, Play } from "../src/touch/chip.ts";
import { synthEvents, type SynthEvent, type SynthNote } from "../tools/lab/lab-synth.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

// ---------- OBBLIGATO by the player's sound ----------

test("D501: OBBLIGATO \"auto\" by default: an effect on the keyboards and the plucked, a merged layer on every other sound", () => {
  assert.equal(OBBLIGATO_MODE, "auto");
  assert.equal(obbligatoParam(""), "auto");
  for (const m of ["layer", "effect", "legacy"] as const) assert.equal(obbligatoParam(`?obbligato=${m}`), m);
  assert.equal(obbligatoParam("?obbligato=nonsense"), "auto");
  const effect = ["pianoSampled", "harpsichordSampled", "chamberOrgan", "lute", "clavichord"];
  assert.deepEqual([...EFFECT_SOUNDS].filter((id) => offered(id)).sort(), [...effect].sort());
  for (const id of effect) assert.equal(obbligatoModeFor(id), "effect", id);
  for (const p of PRESETS.filter((p) => !effect.includes(p.id))) assert.equal(obbligatoModeFor(p.id), "layer", p.id);
  // The clavichord's effect the harpsichord's echo (a struck string dying away), never the synths' flanger.
  assert.equal(mainKind("clavichord", PATCHES.clavichord), "harpsichord");
  assert.equal(effectFor("clavichord").fx, "echo");
});

test("D501: the global switch overrides every sound (\"layer\", \"effect\", \"legacy\")", () => {
  const was = OBBLIGATO_MODE;
  try {
    for (const m of ["layer", "effect", "legacy"] as const) {
      setObbligatoMode(m);
      for (const id of ["harpsichordSampled", "pianoSampled", "stringConsort", "chip"]) assert.equal(obbligatoModeFor(id), m, `${m} ${id}`);
    }
  } finally {
    setObbligatoMode(was);
  }
});

// ---------- The slide's sound by family ----------

test("D501: SLIDE_SOUND \"auto\" by default: the strings, the voices, the lute the instruments session's; the keyboards, chips, consoles and synths D486's", () => {
  assert.equal(SLIDE_SOUND, "auto");
  assert.equal(slideSoundParam(""), "auto");
  assert.equal(slideSoundParam("?slide=instruments"), "instruments");
  assert.equal(slideSoundParam("?slide=d486"), "d486");
  const instruments = ["stringConsort", "baroqueBand", "soloVoices", "vocalSynth", "lute"];
  for (const id of instruments) assert.equal(slideSoundFor(id), "instruments", id);
  for (const p of PRESETS.filter((p) => !instruments.includes(p.id))) assert.equal(slideSoundFor(p.id), "d486", p.id);
  // Forced: one sound for every family.
  for (const m of ["d486", "instruments"] as const) withSlideSound(m, () => {
    for (const p of PRESETS) assert.equal(slideSoundFor(p.id), m, `${m} ${p.id}`);
  });
  assert.equal(slideFamily("clavichord"), "plucked", "the clavichord's slide the harpsichord's ornaments");
});

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
interface Heard {
  midi: number;
  lead: boolean;
  glides: { to: number; tau?: number }[];
}
function stepPair(notes: SynthNote[]): number {
  for (let i = 0; i + 2 < notes.length; i++) if (Math.abs(notes[i].step - notes[i + 1].step) >= 2 && notes[i + 1].step !== notes[i + 2].step && notes[i + 1].on - notes[i].on <= notes[i].dur) return i;
  throw new Error("no pair");
}
/** A slide over a third: the left strikes a and travels to a+1's height in eight moves over 0.3 s, arriving on its time. */
const slide = (notes: SynthNote[], t: (tick: number) => number, rows: { yOf(s: number): number }): SynthEvent[] => {
  const a = stepPair(notes);
  const y0 = rows.yOf(notes[a].step);
  const y1 = rows.yOf(notes[a + 1].step);
  const arrive = t(notes[a + 1].on);
  const ev: SynthEvent[] = [{ t: t(notes[a].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: y0 }];
  for (let k = 1; k <= 8; k++) ev.push({ t: arrive - 0.3 + (0.3 * k) / 8, k: 2, kind: "m", id: 1, x: 40, y: y0 + ((y1 - y0) * k) / 8 });
  ev.push({ t: arrive + 0.5, k: 0, kind: "u", id: 1 });
  return ev;
};
/** What the slide sounds on `sound` (every note the player's touch starts, its glides). */
function heard(sound: string): string {
  setPreset(sound);
  const log = synthEvents(II18, 3, (notes, t, _r, rows) => slide(notes, t, rows));
  const out: Heard[] = [];
  replay(log, { glenn: true }, (g, chip: Chip) => {
    const now = () => chip.ctx.currentTime;
    const mine = (midi: number, at: number) => g.tracks[0].notes.some((n) => Math.abs(g.timeAt(n.on) - at) < 0.6) && midi > 0;
    (chip as { note: unknown }).note = (midi: number, at: number, _dur: number, _v: unknown, p: Play = {}) => {
      const h: Heard = { midi, lead: !!p.lead, glides: [] };
      if (at <= now() + 0.2 && mine(midi, at) && p.lead) out.push(h);
      return { stop() {}, bend() {}, glide: (to: number, tau?: number) => void h.glides.push({ to: Math.round(to * 1000) / 1000, tau }), muffle() {}, dyn() {} };
    };
  });
  setPreset("chip");
  return JSON.stringify(out);
}

test("D501: in the engine, each family's slide under \"auto\" is its forced mode's: the strings, voices and lute the instruments', the rest D486's", () => {
  assert.equal(MECH.glenn, true);
  const families: [string, "instruments" | "d486"][] = [
    ["stringConsort", "instruments"],
    ["baroqueBand", "instruments"],
    ["vocalSynth", "instruments"],
    ["soloVoices", "instruments"],
    ["lute", "instruments"],
    ["harpsichordSampled", "d486"],
    ["clavichord", "d486"],
    ["chamberOrgan", "d486"],
    ["pianoSampled", "d486"],
    ["chip", "d486"],
    ["gameboy", "d486"],
    ["megaFm", "d486"],
    ["analog", "d486"],
  ];
  let differs = 0;
  for (const [sound, mode] of families) {
    const auto = heard(sound);
    const forced = withSlideSound(mode, () => heard(sound));
    const other = withSlideSound(mode === "d486" ? "instruments" : "d486", () => heard(sound));
    assert.equal(auto, forced, `${sound}: "auto" sounds as "${mode}"`);
    if (auto !== other) differs++;
  }
  // The two designs are heard apart (the strings' and voices' thumb-following portamento against D486's shift; the lute's slur against a pluck).
  assert.ok(differs >= 5, `the modes differ on ${differs} sounds`);
});

// ---------- CLAVICHORD offered ----------

test("D501: CLAVICHORD offered: among the instruments, named in three languages, the piano's touch, Busoni's dynamics, matched on a phone", () => {
  assert.ok(offered("clavichord"));
  assert.equal(presetById("clavichord").name, "CLAVICHORD");
  assert.ok(POP_SOUNDS.some(([s, n]) => s === "clavichord" && n === "CLAVICHORD"));
  assert.ok(SOUND_GROUPS.find(([g]) => g === "INSTRUMENTS")![1].includes("clavichord"));
  assert.equal(PT.CLAVICHORD, "CLAVICÓRDIO");
  assert.equal(ES.CLAVICHORD, "CLAVICORDIO");
  assert.ok(!TRIALS.some((p) => p.id === "clavichord" || p.id === "trialClavichord"));
  assert.equal(presetById("trialClavichord").id, "clavichord", "a stored trial id opens on it");
  assert.equal(TOUCH_KINDS.clavichord, "piano", "the touch's three zones");
  assert.equal(styleOf("clavichord"), "harpsichord");
  assert.equal(exprFamily("clavichord"), "plucked");
  assert.equal(keyboardSlide("clavichord"), "coule");
  assert.ok(expressiveAll("clavichord") && busoniReaches("clavichord"), "Busoni's dynamics reach it");
  assert.ok(busoniLeads(wholeReadingOf("wtc1f06")?.whole, busoniReaches("clavichord")), "I/6: Busoni leads");
  // Lifted (measured 1.4 dB under the median on a computer, 2.3 under through the phone model), more on a phone.
  const p = presetById("clavichord");
  assert.ok(p.gain === CLAVI_GAIN && CLAVI_GAIN > 1 && CLAVI_GAIN < 1.2);
  assert.ok(p.phoneGain === CLAVI_PHONE_GAIN && CLAVI_PHONE_GAIN > 1);
  const phoneDb = 20 * Math.log10(CLAVI_GAIN * CLAVI_PHONE_GAIN);
  assert.ok(phoneDb > 2 && phoneDb < 2.6, `+${phoneDb.toFixed(1)} dB on a phone`);
  assert.deepEqual(PATCHES.clavichord.phoneLift, CLAVI_PHONE_LIFT);
  // OBBLIGATO's pool has it, measured.
  assert.ok(LAYERS.some((l) => l.id === "clavichord"));
  assert.ok(LOUDNESS.clavichord < -20 && LOUDNESS.clavichord > -36);
});

test("D501: the allocation's two clavichord fugues: I/6 and II/18 open on the clavichord, with their reasons", () => {
  for (const id of ["wtc1f06", "wtc2f18"]) {
    assert.equal(PIECE_SOUND[id], "clavichord", id);
    assert.equal(COLOURS[id].sound, "clavichord", id);
  }
  assert.match(COLOURS.wtc1f06.soundWhy, /Bodky's clavichord fugue/);
  assert.match(COLOURS.wtc2f18.soundWhy, /C\. P\. E\. Bach's instrument/);
});
