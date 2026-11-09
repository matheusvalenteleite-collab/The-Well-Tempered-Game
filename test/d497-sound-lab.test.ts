/**
 * D497, THE SOUND LAB: its deep links, what each switch asks of the engine, and its hooks in the game's modules (each on
 * by default, so the game is unchanged; off only from the lab).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { audible, changeKind, defaults, linkOf, parseLink, voiceGain } from "../src/bench/soundlab/lab-state.ts";
import { FUGUES, bachVoice, planOf, soundOf } from "../src/bench/soundlab/lab-engine.ts";
import { seatsOf } from "../src/bench/soundlab/facts.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { climaxLayerOn, climaxRamp, formAt, formOf, setClimaxLayer } from "../src/touch/fugue-form.ts";
import { ColourPlan, colourPlansOn, setColourPlansOn } from "../src/touch/colour.ts";
import { grooveNow, ownKitOn, setOwnKit, setPreset } from "../src/touch/sound.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { fakeChip } from "./d342-sim.ts";

test("D497: a deep link read and written back", () => {
  const l = parseLink("#wtc1f12?sound=vocalSynth&drums=2&bar=40&tempo=slow&climax=0&mute=1,3&lv=0,-3&b=pianoSampled:0", (id) => FUGUES.includes(id));
  assert.equal(l.settings.piece, "wtc1f12");
  assert.equal(l.settings.sound, "vocalSynth");
  assert.equal(l.settings.drums, 2);
  assert.equal(l.bar, 40);
  assert.equal(l.settings.tempo, "slow");
  assert.equal(l.settings.climax, false);
  assert.equal(l.settings.form, true);
  assert.deepEqual(l.settings.mute, [1, 3]);
  assert.deepEqual(l.b, { sound: "pianoSampled", drums: 0 });
  const back = parseLink(linkOf(l.settings, l.bar, l.b), (id) => FUGUES.includes(id));
  assert.deepEqual(back, l);
  // An unknown piece: the fallback; the defaults written as the piece alone.
  assert.equal(parseLink("#nope?bar=3", (id) => FUGUES.includes(id)).settings.piece, "wtc1f01");
  assert.equal(linkOf(defaults("wtc2f05")), "#wtc2f05");
  assert.equal(FUGUES.length, 48);
});

test("D497: which switches are live and which rebuild the engine; solo over mute", () => {
  const a = defaults("wtc1f12");
  assert.equal(changeKind(a, { ...a, drums: 3 }), "live");
  assert.equal(changeKind(a, { ...a, form: false, climax: false, colour: false, kit: false }), "live");
  assert.equal(changeKind(a, { ...a, mute: [1], levels: [0, -6] }), "live");
  assert.equal(changeKind(a, { ...a, sound: "pianoSampled" }), "relaunch");
  assert.equal(changeKind(a, { ...a, busoni: false }), "relaunch");
  assert.equal(changeKind(a, { ...a, tempo: "fast" }), "relaunch");
  assert.equal(changeKind(a, { ...a }), "none");
  assert.deepEqual(audible({ mute: [1], solo: null }, 3), [true, false, true]);
  assert.deepEqual(audible({ mute: [2], solo: 2 }, 3), [false, false, true]);
  assert.equal(voiceGain({ mute: [], solo: null, levels: [-6] }, 0, 3).toFixed(3), "0.501");
});

test("D497: the lab's hooks are on by default (the game unchanged) and take effect at once when turned off", () => {
  assert.ok(climaxLayerOn() && colourPlansOn() && ownKitOn());
  const f = fugueById("wtc1f24");
  const form = formOf(f);
  const top = form.peak + 1;
  assert.ok(climaxRamp(form, top) > 0.99);
  assert.equal(formAt(form, top).kind, "climax");
  setClimaxLayer(false);
  try {
    assert.equal(climaxRamp(form, top), 0);
    assert.notEqual(formAt(form, top).kind, "climax");
  } finally {
    setClimaxLayer(true);
  }
  const plan = new ColourPlan(f, [[1, { tone: -2 }]]);
  assert.deepEqual(plan.at(f.barTicks * 3, 0), { tone: -2 });
  setColourPlansOn(false);
  try {
    assert.equal(plan.at(f.barTicks * 3, 0), null);
  } finally {
    setColourPlansOn(true);
  }
  setPreset("jazzQuartet");
  assert.equal(grooveNow()?.kit, "brushes");
  setOwnKit(false);
  try {
    assert.equal(grooveNow(), null);
  } finally {
    setOwnKit(true);
    setPreset("chip");
  }
  const g = new ProtoGame(f, 0, 0, protoById("ladder"), { bpm: tempoOf(f.id), legato: false, fail: false }, fakeChip({ t: 0 }));
  assert.equal(g.labGain, null);
});

test("D497: the lab plays each fugue's own sound, its voice as play.html offers it, and loads what that sound needs", () => {
  // (D588: I/19 to VAUDEVILLE; II/12 keeps the quartet.)
  const s = defaults("wtc2f12");
  assert.equal(soundOf(s), "jazzQuartet");
  const f = fugueById("wtc2f12");
  const v = bachVoice(f, s);
  assert.ok(v >= 0 && v < f.voices.length);
  const plan = planOf("jazzQuartet", f, v, 0);
  assert.ok(plan.some((p) => p.set === "jazzBrushes" && p.notes.length), "the quartet's own brushes");
  assert.ok(planOf("chip", f, v, 0).every((p) => !p.notes.length || p.set !== "jazzBrushes"));
  // The seats: one per voice, named.
  for (const id of FUGUES) {
    const g = fugueById(id);
    const seats = seatsOf(soundOf(defaults(id)), g);
    assert.equal(seats.length, g.voices.length, id);
    assert.ok(seats.every((x) => x.name.length > 0), id);
  }
});
