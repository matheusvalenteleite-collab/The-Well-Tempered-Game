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
import { PATCHES, PRESETS, TRIALS, busoniReaches, expressiveAll, offered, presetById, setPreset } from "../src/touch/sound.ts";
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
  // D510: the lute and the clavichord withdrawn.
  const effect = ["pianoSampled", "harpsichordSampled", "chamberOrgan"];
  assert.deepEqual([...EFFECT_SOUNDS].filter((id) => offered(id)).sort(), [...effect].sort());
  for (const id of effect) assert.equal(obbligatoModeFor(id), "effect", id);
  for (const p of PRESETS.filter((p) => !effect.includes(p.id))) assert.equal(obbligatoModeFor(p.id), "layer", p.id);
  // The harpsichord's effect its echo (a struck string dying away), never the synths' flanger.
  assert.equal(mainKind("harpsiSampled", PATCHES.harpsiSampled), "harpsichord");
  assert.equal(effectFor("harpsiSampled").fx, "echo");
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
  const instruments = ["stringConsort", "baroqueBand", "soloVoices", "vocalSynth"];
  for (const id of instruments) assert.equal(slideSoundFor(id), "instruments", id);
  for (const p of PRESETS.filter((p) => !instruments.includes(p.id))) assert.equal(slideSoundFor(p.id), "d486", p.id);
  // Forced: one sound for every family.
  for (const m of ["d486", "instruments"] as const) withSlideSound(m, () => {
    for (const p of PRESETS) assert.equal(slideSoundFor(p.id), m, `${m} ${p.id}`);
  });
  assert.equal(slideFamily("harpsichordSampled"), "plucked");
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
    ["harpsichordSampled", "d486"],
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

// ---------- CLAVICHORD offered (D501), withdrawn (D510) ----------

test("D510: CLAVICHORD withdrawn (the owner: \"an uninteresting synth with no distinctive features\"): a stored choice on the piano; its fugues reassigned", () => {
  assert.ok(!offered("clavichord") && !POP_SOUNDS.some(([s]) => s === "clavichord"));
  assert.ok(!SOUND_GROUPS.some(([, ids]) => ids.includes("clavichord")));
  assert.equal(presetById("clavichord").id, "pianoSampled");
  assert.equal(presetById("trialClavichord").id, "pianoSampled", "a stored trial id too");
  assert.ok(!TRIALS.some((p) => p.id === "clavichord" || p.id === "trialClavichord"));
  assert.equal(TOUCH_KINDS.clavichord, undefined);
  assert.ok(!expressiveAll("clavichord") || busoniReaches("pianoSampled"));
  assert.ok(!LAYERS.some((l) => (l.id as string) === "clavichord") && (LOUDNESS as Record<string, number>).clavichord === undefined, "out of OBBLIGATO's pool");
  assert.equal(exprFamily("pianoSampled"), "piano");
  assert.equal(keyboardSlide("harpsichordSampled"), "coule");
  assert.equal(styleOf("harpsichordSampled"), "harpsichord");
  assert.ok(busoniLeads(wholeReadingOf("wtc1f06")?.whole, busoniReaches(PIECE_SOUND.wtc1f06)), "I/6: Busoni leads on its new sound");
  for (const id of ["wtc1f06", "wtc2f18"]) {
    assert.equal(PIECE_SOUND[id], "jazzQuartet", id);
    assert.equal(COLOURS[id].sound, "jazzQuartet", id);
  }
  assert.match(COLOURS.wtc1f06.soundWhy, /Bodky's clavichord fugue/);
  assert.equal(PT.CLAVICHORD, "CLAVICÓRDIO");
  assert.equal(ES.CLAVICHORD, "CLAVICORDIO");
});
