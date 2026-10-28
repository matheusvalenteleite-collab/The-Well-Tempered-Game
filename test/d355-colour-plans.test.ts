/**
 * D355, COLOUR PLANS: each piece's own sound and its sounds' colour plans (tools/touch/colour-plans/,
 * data/touch/colour-plans.json, src/touch/colour.ts, chip.ts Chip.note, proto-game.ts): the data as
 * written; the owner's rules (the band only, the player's stops win, never a louder subject, never a
 * level, the bass kept on a phone); each move only where its sound can make it; the moments in the piece.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeAudioContext, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play } from "../src/touch/chip.ts";
import { PRESETS, setPreset } from "../src/touch/sound.ts";
import { DEFAULT_REG, setLiveRegistration, type Registration, type StopId } from "../src/touch/registration.ts";
import { bandColour, bandRegistration, ColourPlan, coloured, hasColours, setColours, tickOfBar, TONE_RANGE, ROOM_MAX, type Colour, type ColourPlans } from "../src/touch/colour.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { packColours } from "../tools/touch/colour-plans.ts";
import { piece } from "../tools/touch/colour-plans/kit.ts";

const DATA = JSON.parse(readFileSync(new URL("../data/touch/colour-plans.json", import.meta.url), "utf8")) as ColourPlans;
const OFFERED = new Set(PRESETS.map((p) => p.id));

test("D355: the game's data is the plans as written (node tools/touch/colour-plans.ts)", () => {
  assert.deepEqual(DATA, JSON.parse(JSON.stringify(packColours())));
  // Small enough to load on opening a piece.
  assert.ok(readFileSync(new URL("../data/touch/colour-plans.json", import.meta.url)).length < 120_000);
});

test("D355: every piece planned opens on its own sound (PIECE_SOUND as written, with its reason), one the players have", () => {
  for (const [id, p] of Object.entries(COLOURS)) {
    assert.equal(PIECE_SOUND[id], p.sound, id);
    assert.ok(OFFERED.has(p.sound), `${id}: ${p.sound}`);
    assert.ok(p.soundWhy.length > 40 && p.character.length > 20, id);
  }
  // Every Book I fugue has a sound of its own (no longer CLASSIC CHIP for all, D288), and the organ and harpsichord plans.
  for (let n = 1; n <= 48; n++) {
    const id = `wtc${n > 24 ? 2 : 1}f${String(((n - 1) % 24) + 1).padStart(2, "0")}`;
    assert.ok(COLOURS[id], id);
    assert.ok(COLOURS[id].plans.harpsichordSampled?.length && COLOURS[id].plans.chamberOrgan?.length, `${id}: harpsichord and organ`);
  }
  assert.ok(new Set(Object.values(COLOURS).map((p) => p.sound)).size >= 10, "a variety of sounds");
});

/** Where each move can sound. */
const ONLY: Record<keyof Colour, (preset: string) => boolean> = {
  reg: (s) => s === "harpsichordSampled" || s === "chamberOrgan",
  pw: (s) => s === "chip" || s === "gameboy" || s === "sid64",
  fm: (s) => s === "megaFm",
  open: (s) => s === "vocalSynth",
  layer: (s) => s === "pianoSampled",
  strike: (s) => s === "modular",
  // A send needs somewhere to go: the shared room or the sound's own effect (SID 64 and TRACKER have neither).
  room: (s) => s !== "sid64" && s !== "tracker",
  tone: () => true,
  lp: () => true,
  vib: () => true,
  voices: () => true,
};
const HARPSI_STOPS: StopId[] = ["unison", "four", "lute"];
const ORGAN_STOPS: StopId[] = ["flute", "principal", "reed", "mixture", "trem"];

test("D355: each move where its sound can make it, within bounds, never a level; the organ at most two ranks", () => {
  for (const [id, p] of Object.entries(COLOURS))
    for (const [sound, ms] of Object.entries(p.plans)) {
      assert.ok(OFFERED.has(sound), `${id}: ${sound}`);
      for (const m of ms) {
        const where = `${id} ${sound} bar ${m.bar}`;
        assert.ok(m.why.length > 5, where);
        for (const k of Object.keys(m.c)) {
          assert.ok(k in ONLY, `${where}: ${k} (no level, ever)`);
          assert.ok(ONLY[k as keyof Colour](sound), `${where}: ${k} on ${sound}`);
        }
        const c = m.c;
        if (c.reg) assert.ok(c.reg.every((s) => (sound === "chamberOrgan" ? ORGAN_STOPS : HARPSI_STOPS).includes(s)), where);
        if (c.reg && sound === "chamberOrgan") assert.ok(c.reg.filter((s) => s !== "trem").length <= 2, `${where}: two ranks at most`);
        if (c.tone !== undefined) assert.ok(c.tone >= TONE_RANGE[0] && c.tone <= TONE_RANGE[1], where);
        if (c.room !== undefined) assert.ok(c.room > 0 && c.room <= ROOM_MAX, where);
        if (c.pw !== undefined) assert.ok(c.pw >= 0.1 && c.pw <= 0.5, where);
        if (c.fm !== undefined) assert.ok(c.fm >= 0.5 && c.fm <= 1.3, where);
        if (c.strike !== undefined) assert.ok(c.strike >= 0.5 && c.strike <= 1.5, where);
        if (c.lp !== undefined) assert.ok(c.lp >= 1500, `${where}: a veil, not a muffle`);
      }
    }
});

/** How loud a registration is, in order (more stops, louder). */
const weight = (sound: string, reg: StopId[] | undefined) => {
  const r = reg ?? [];
  if (sound === "chamberOrgan") return (r.includes("mixture") ? 3 : 0) + r.filter((s) => s === "principal" || s === "reed").length * 2 + (r.includes("flute") ? 1 : 0) + (r.length ? 0 : 2);
  return (r.includes("unison") ? 2 : 0) + (r.includes("four") ? 1 : 0) - (r.includes("lute") ? 1 : 0);
};

test("D355: never a louder subject: a moment for some voices only may only soften or veil them against the rest", () => {
  for (const [id, p] of Object.entries(COLOURS))
    for (const [sound, ms] of Object.entries(p.plans)) {
      let all: Colour = {};
      for (const m of [...ms].sort((a, b) => a.bar - b.bar)) {
        if (!m.c.voices) {
          all = m.c;
          continue;
        }
        const where = `${id} ${sound} bar ${m.bar}`;
        assert.ok(weight(sound, m.c.reg) <= weight(sound, all.reg), `${where}: softer stops only`);
        assert.ok((m.c.tone ?? 0) <= 0 && (m.c.fm ?? 1) <= 1 && (m.c.strike ?? 1) <= 1, where);
        assert.ok(m.c.layer !== "firm", where);
      }
    }
});

test("D355: the moments fall in the piece (its bars), in time, the first plan moments never before bar 1", () => {
  for (const [id, p] of Object.entries(COLOURS)) {
    const f = piece(id);
    const first = f.bars[0].n;
    const last = f.bars.at(-1)!.n;
    for (const [sound, ms] of Object.entries(p.plans))
      for (const m of ms) {
        assert.ok(m.bar >= first && m.bar < last + 1, `${id} ${sound}: bar ${m.bar} of ${first}-${last}`);
        assert.ok(m.c.voices?.every((v) => v >= 0 && v < (f as unknown as { voiceNames: string[] }).voiceNames.length) ?? true, `${id} ${sound} bar ${m.bar}: voices`);
      }
  }
});

const F = { bars: [{ n: 1, on: 0 }, { n: 2, on: 960 }, { n: 3, on: 1920 }, { n: 4, on: 2880 }], barTicks: 960, length: 3840, voices: [[], [], []] };

test("D355: a plan in time: each voice's colour from its moment, a moment for some voices only, a fraction of a bar", () => {
  assert.equal(tickOfBar(F, 2.5), 1440);
  const plan = new ColourPlan(F, [
    [2, { reg: ["four"] }],
    [2.5, { reg: [], voices: [0] }],
    [3, {}],
  ]);
  assert.equal(plan.at(0, 0), null);
  assert.deepEqual(plan.at(960, 0), { reg: ["four"] });
  assert.deepEqual(plan.at(1440, 0), { reg: [] });
  assert.deepEqual(plan.at(1440, 1), { reg: ["four"] }, "the other voices keep theirs");
  assert.equal(plan.at(1920, 1), null, "back to the sound's own");
  // A note begun before the moment keeps its colour (it is read where the note starts).
  assert.deepEqual(plan.at(959, 0), null);
});

test("D355: the bass on a phone: no lowpass, no lute, no darker shelf, no other pulse width; elsewhere the bounds", () => {
  const c: Colour = { reg: ["lute", "four"], lp: 2000, tone: -4, pw: 0.125, room: 0.9 };
  assert.deepEqual(bandColour(c, 2, 3, true), { reg: ["four"], room: ROOM_MAX });
  assert.deepEqual(bandColour(c, 1, 3, true), { reg: ["lute", "four"], lp: 2000, tone: -4, pw: 0.125, room: ROOM_MAX });
  assert.deepEqual(bandColour(c, 2, 3, false), { reg: ["lute", "four"], lp: 2000, tone: -4, pw: 0.125, room: ROOM_MAX });
  assert.deepEqual(bandColour({ tone: 9 }, 0, 3, false), { tone: TONE_RANGE[1] });
});

test("D355: the band only: the player's note never coloured; the player's TUTTI wins; never a level", () => {
  const reg = (stops: StopId[] | null, tutti = false): Registration => ({ stops, tutti });
  const c: Colour = { reg: ["four"], tone: -2, room: 0.1, layer: "soft", fm: 0.7 };
  assert.deepEqual(bandRegistration(reg(null), { colour: c }), { stops: ["four"], tutti: true });
  assert.deepEqual(bandRegistration(reg(["lute"]), { colour: c }), { stops: ["four"], tutti: true }, "the player's stops on the player's voice alone: the band its plan");
  assert.deepEqual(bandRegistration(reg(["lute"], true), { colour: c }), reg(["lute"], true), "TUTTI: the player registers everything");
  assert.deepEqual(bandRegistration(reg(null), { colour: c, lead: true }), reg(null), "the player's note");
  const v = voicing(0, 3, false);
  const [, p] = coloured("megaFm", c, v, { level: 0.8 });
  assert.equal(p.level, 0.8, "the level untouched");
  assert.equal(p.fmScale, 0.7);
  const [, mine] = coloured("megaFm", c, v, { lead: true, level: 0.8 });
  assert.deepEqual(mine, { lead: true, level: 0.8 });
  // CLASSIC CHIP's pulses: the voicing's width; the triangle bass untouched.
  assert.equal(coloured("chip", { pw: 0.5 }, { ...v, patch: null, timbre: "pulse12" }, {})[0].timbre, "pulse50");
  assert.equal(coloured("chip", { pw: 0.5 }, { ...v, patch: null, timbre: "triangle" }, {})[0].timbre, "triangle");
});

const ctxOf = installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

async function plucks(play: Play, live: Registration = DEFAULT_REG) {
  setPreset("harpsichordSampled");
  setLiveRegistration("harpsichordSampled", live);
  const chip = new Chip();
  await chip.prepare([51, 52, 53, 63, 64, 65, 76], [64]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(1, 3, false));
  const before = new Set(ctx.nodes);
  chip.note(64, 1, 2, voicing(1, 3, false), play);
  setLiveRegistration("harpsichordSampled", DEFAULT_REG);
  return [...ctx.nodes].filter((x) => !before.has(x) && x instanceof FakeSource && (x as FakeSource).kind === "buffer" && (x as FakeSource).startAt !== null && (x as FakeSource).startAt! >= 1 && (x as FakeSource).startAt! < 1.1).length;
}

test("D355: through the chip: a band note takes its plan's stops (the coupled manuals: three plucks); the player's note does not", async () => {
  assert.equal(await plucks({}), 1);
  assert.equal(await plucks({ colour: { reg: ["unison", "four"] } }), 3);
  assert.equal(await plucks({ colour: { reg: ["unison", "four"] }, lead: true }), 1, "the player's note: the player's registration");
  assert.equal(await plucks({ colour: { reg: ["unison"] } }, { stops: ["lute"], tutti: true }), 1, "the player's TUTTI (the buff on everything) wins");
});

test("D355: the pop-up's hint knows which sounds have colours in a piece", () => {
  setColours(DATA);
  assert.ok(hasColours("wtc1f16", "harpsichordSampled"));
  assert.ok(!hasColours("wtc1f16", "vocalSynth"));
  assert.ok(!hasColours("chor001", "chamberOrgan"), "no chorale has a plan");
  setColours(null);
});

test("D355 on D349's organ: the plan's plenum is the recorded plenum (the pedal follows), the flutes the second manual's", async () => {
  const { registeredNote } = await import("../src/touch/registration.ts");
  const { PATCHES } = await import("../src/touch/sound.ts");
  const band = (stops: StopId[]) => bandRegistration({ stops: null, tutti: false }, { colour: { reg: stops } });
  assert.equal(registeredNote("chamberOrgan", band(["principal", "mixture"]), PATCHES.orgPrincipal, false, 64)?.patch, PATCHES.orgPleno);
  assert.equal(registeredNote("chamberOrgan", band(["principal", "mixture"]), PATCHES.orgPedal, false, 40)?.patch, PATCHES.orgPedalPleno);
  assert.equal(registeredNote("chamberOrgan", band(["flute"]), PATCHES.orgPrincipal, false, 64)?.patch, PATCHES.orgFlute);
  assert.equal(registeredNote("chamberOrgan", band(["flute"]), PATCHES.orgPedal, false, 40)?.patch, PATCHES.orgPedalSoft);
  assert.equal(registeredNote("chamberOrgan", band(["principal"]), PATCHES.orgPrincipal, false, 64), null, "the principals: the organ's own");
});
