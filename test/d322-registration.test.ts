/**
 * D322, REGISTRATION: the stops in the title bar (registration.ts; chip.ts Chip.note; RegistrationStops.tsx).
 * The player's patch and layers as each stop says; TUTTI reaching the band; the defaults bit for bit;
 * the loudness bounds; the buttons' rules (the organ never silent, the pedal's own) and what is kept.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play } from "../src/touch/chip.ts";
import { PATCHES, setPreset } from "../src/touch/sound.ts";
import {
  defaultStops,
  DEFAULT_REG,
  FOUR,
  liveRegistration,
  loadRegistration,
  LUTE_LP,
  MIXTURE_WEIGHT,
  ORGAN_SUM_DB,
  ORGAN_SUM_P,
  organPatch,
  registeredNote,
  saveRegistration,
  setLiveRegistration,
  setTutti,
  stopsShown,
  toggle,
  TREMULANT,
  UNISON,
  voicePatch,
  type Registration,
  type StopId,
} from "../src/touch/registration.ts";

const ctxOf = installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const db = (x: number) => 20 * Math.log10(x);
const H = "harpsichordSampled";
const O = "chamberOrgan";

/** A note on a preset's voice under a registration: the nodes it made, the oscillator waves asked for. */
async function strike(presetId: string, reg: Registration, voice: number, count: number, play: Play = { lead: true }, midi = 64) {
  setPreset(presetId);
  setLiveRegistration(presetId, reg);
  const chip = new Chip();
  const waves: string[] = [];
  const c = chip as unknown as { osc: (w: string) => unknown };
  const osc0 = c.osc.bind(chip);
  c.osc = (w: string) => (waves.push(w), osc0(w));
  await chip.prepare([midi - 13, midi - 12, midi - 1, midi, midi + 1, midi + 12], [midi]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(voice, count, true));
  waves.length = 0;
  const before = new Set(ctx.nodes);
  chip.note(midi, 1, 2, voicing(voice, count, true), play);
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  setLiveRegistration(presetId, DEFAULT_REG);
  const buffers = made.filter((n): n is FakeSource => n instanceof FakeSource && n.kind === "buffer");
  return { made, waves, buffers, filters: made.filter((n) => n.kind === "filter") };
}
const reg = (stops: StopId[] | null, tutti = false): Registration => ({ stops, tutti });

test("D322: the defaults: nothing registered, every voice's own patch bit for bit", () => {
  for (const presetId of [H, O])
    for (const count of [2, 3, 4, 5])
      for (let v = 0; v < count; v++) {
        const pt = voicePatch(presetId, v, count)!;
        assert.equal(registeredNote(presetId, DEFAULT_REG, pt, true, 64), null);
        // The default made explicit (TUTTI) is the voice's own sound for the player.
        assert.equal(registeredNote(presetId, reg(defaultStops(presetId, pt)), pt, true, 64)?.patch ?? null, null, `${presetId} ${v}/${count}`);
      }
  assert.deepEqual(defaultStops(O, PATCHES.orgFlute), ["flute"]);
  assert.deepEqual(defaultStops(O, PATCHES.orgPrincipal), ["principal"]);
  assert.deepEqual(defaultStops(O, PATCHES.orgTrompete), ["reed"]);
  assert.deepEqual(defaultStops(O, PATCHES.orgKrumm), ["reed"]);
  assert.deepEqual(defaultStops(O, PATCHES.orgPedal), []);
  assert.equal(organPatch(PATCHES.orgPrincipal, ["principal"], 64), PATCHES.orgPrincipal);
  // No live registration: the note as before (one recording on the harpsichord).
  assert.deepEqual(liveRegistration(H), DEFAULT_REG);
  // Other sounds: no stops yet.
  assert.deepEqual(stopsShown("pianoSampled", PATCHES.pianoSampled), []);
  assert.equal(registeredNote("pianoSampled", reg(["lute"]), PATCHES.pianoSampled, true, 64), null);
});

test("D322: HARPSICHORD: 8'+8' a second choir (another string, a few cents off, a few ms later, brighter), 4' the octave, LUTE the buff stop", async () => {
  const plain = await strike(H, DEFAULT_REG, 1, 3);
  assert.equal(plain.buffers.filter((b) => b.startAt === 1).length, 1);
  const unison = await strike(H, reg(["unison"]), 1, 3);
  const late = unison.buffers.filter((b) => b.startAt !== null && b.startAt > 1 && b.startAt < 1.1);
  assert.equal(late.length, 1, "one more choir");
  assert.ok(Math.abs(late[0].startAt! - 1 - UNISON.delay) < 1e-9 && UNISON.delay >= 0.003 && UNISON.delay <= 0.008);
  assert.ok(UNISON.cents >= 2 && UNISON.cents <= 4);
  assert.ok(unison.filters.some((f) => (f as unknown as { type: string }).type === "highshelf" && (f as unknown as { gain: FakeParam }).gain.value === UNISON.shelf), "a little brighter");
  const rate = (s: FakeSource) => (s as unknown as { playbackRate: FakeParam }).playbackRate.value;
  const four = await strike(H, reg(["four"]), 1, 3);
  const rates = four.buffers.filter((b) => b.startAt === 1).map(rate);
  assert.equal(rates.length, 2);
  // The octave above, from its own recording (E5's at its own rate, about the main's).
  assert.ok(rates.every((r) => Math.abs(r - 1) < 0.07), `rates ${rates}`);
  const lute = await strike(H, reg(["lute"]), 1, 3);
  assert.ok(lute.filters.some((f) => (f as unknown as { type: string }).type === "lowpass" && (f.frequency as FakeParam).value === LUTE_LP));
  // All three: three plucks in the one note.
  const all = await strike(H, reg(["unison", "four", "lute"]), 1, 3);
  assert.equal(all.buffers.filter((b) => b.startAt !== null && b.startAt >= 1 && b.startAt < 1.1).length, 3);
});

test("D322: PIPE ORGAN: the player's stops in one note (FLUTE, PRINCIPAL, REED, MIXTURE), the TREMULANT, the pedal's 16'", async () => {
  // Four voices: flute, principal, Trompete, pedal.
  const flute = await strike(O, DEFAULT_REG, 0, 4);
  assert.ok(flute.waves.includes("sine") && !flute.waves.includes("stopPrincipal"));
  const princ = await strike(O, reg(["flute", "principal"]), 0, 4);
  assert.ok(princ.waves.includes("stopPrincipal") && princ.waves.includes("sine"), princ.waves.join());
  const reed = await strike(O, reg(["reed"]), 0, 4);
  assert.ok(reed.waves.includes("stopTrompete") && !reed.waves.includes("stopPrincipal"));
  // The Krummhorn voice's REED is its Krummhorn.
  assert.ok(organPatch(PATCHES.orgKrumm, ["principal", "reed"], 64).osc.some((o) => o.wave === "stopKrummhorn"));
  // MIXTURE: ranks two octaves up (one above c'', broken back).
  const mix = organPatch(PATCHES.orgPrincipal, ["principal", "mixture"], 60);
  assert.ok(mix.osc.some((o) => (o.octave ?? 0) >= 2 && o.wave === "stopPrincipal"));
  assert.ok(Math.max(...organPatch(PATCHES.orgPrincipal, ["principal", "mixture"], 84).osc.map((o) => o.octave ?? 0)) <= 2.01);
  // TREMULANT: about 5-6 Hz, the level and a little pitch.
  const trem = organPatch(PATCHES.orgFlute, ["flute", "trem"], 64);
  assert.ok(trem.trem && trem.trem.rate >= 5 && trem.trem.rate <= 6 && trem.vib && trem.vib.depth <= 8);
  // The pedal: its recording kept; 16' adds a note an octave down; the tremulant on the recording.
  assert.deepEqual(stopsShown(O, PATCHES.orgPedal), ["sub16", "trem"]);
  assert.ok(!stopsShown(O, PATCHES.orgFlute).includes("sub16"));
  const r = registeredNote(O, reg(["sub16", "trem"]), PATCHES.orgPedal, true, 40)!;
  assert.ok(r.sub16 && r.patch?.sample === "organPedal" && r.patch.trem);
  const pedal = await strike(O, reg(["sub16"]), 3, 4, { lead: true }, 40);
  assert.ok(pedal.waves.includes("stopGedackt"), "the Subbass");
  const plainPedal = await strike(O, DEFAULT_REG, 3, 4, { lead: true }, 40);
  assert.ok(!plainPedal.waves.includes("stopGedackt"), "no Subbass by default");
});

test("D322: TUTTI: the band takes the player's stops; without it the band's notes are untouched", async () => {
  const band = await strike(H, reg(["unison"]), 0, 3, {});
  assert.equal(band.buffers.filter((b) => b.startAt !== null && b.startAt >= 1 && b.startAt < 1.1).length, 1, "another voice, no TUTTI: as it was");
  const tutti = await strike(H, reg(["unison"], true), 0, 3, {});
  assert.equal(tutti.buffers.filter((b) => b.startAt !== null && b.startAt >= 1 && b.startAt < 1.1).length, 2, "TUTTI: the second 8' on the band too");
  // The organ under TUTTI: every manual the player's stops; the pedal its own (and the tremulant, 16').
  const pleno = reg(["principal", "mixture"], true);
  for (const v of [0, 1, 2]) {
    const pt = voicePatch(O, v, 4)!;
    const r = registeredNote(O, pleno, pt, false, 64);
    assert.ok(r?.patch?.osc.some((o) => o.wave === "stopPrincipal" && (o.octave ?? 0) >= 2), `voice ${v}`);
  }
  assert.equal(registeredNote(O, pleno, PATCHES.orgPedal, false, 40), null);
  assert.ok(registeredNote(O, reg(["flute", "trem"], true), PATCHES.orgPedal, false, 40)?.patch?.trem);
  // A long press: the default made explicit, so the band takes it; let go of TUTTI, back to the player's default.
  const t = setTutti(O, DEFAULT_REG, PATCHES.orgTrompete, true);
  assert.deepEqual(t, { stops: ["reed"], tutti: true });
  assert.deepEqual(setTutti(O, t, PATCHES.orgTrompete, false), DEFAULT_REG);
});

test("D322: loudness: the full registration within about +4 dB of one stop; the tremulant's mean level kept", () => {
  // HARPSICHORD: the second 8' and the 4' summed by power (separate strings): +2.5 dB at most (measured +2.5 desk, +2.7 phone).
  const h = 10 * Math.log10(1 + UNISON.gain ** 2 + FOUR.gain ** 2);
  assert.ok(h > 1 && h <= 4, `${h.toFixed(2)} dB`);
  // ORGAN: each voice, every set of stops: the stops' gains (relative to the leading stop's level) within the bound.
  const sets: StopId[][] = [["flute"], ["principal"], ["reed"], ["flute", "principal"], ["principal", "mixture"], ["flute", "principal", "reed"], ["flute", "principal", "reed", "mixture"]];
  for (const own of [PATCHES.orgFlute, PATCHES.orgPrincipal, PATCHES.orgTrompete, PATCHES.orgKrumm]) {
    for (const s of sets) {
      const pt = organPatch(own, s, 64);
      if (pt === own) continue;
      const n = s.length;
      const target = 10 ** (ORGAN_SUM_DB[n] / 20);
      assert.ok(ORGAN_SUM_DB[n] <= 4);
      // The stops' weights as summed (p-norm): the target exactly.
      const w = s.map((x) => (x === "mixture" ? MIXTURE_WEIGHT : 1));
      const norm = w.reduce((a, x) => a + x ** ORGAN_SUM_P, 0) ** (1 / ORGAN_SUM_P);
      assert.ok(norm > 0 && target / norm <= 1, `${s}: each stop softer than alone`);
    }
  }
  const t = organPatch(PATCHES.orgFlute, ["flute", "trem"], 64);
  assert.ok(Math.abs(db(t.level * (1 - TREMULANT.depth / 2)) - db(PATCHES.orgFlute.level)) < 1e-9);
});

test("D322: the buttons: a manual never silent, MIXTURE draws a PRINCIPAL, the default kept as none; per piece on the device", () => {
  const pt = PATCHES.orgFlute;
  // The flute voice: pushing its only stop in does nothing.
  assert.deepEqual(toggle(O, DEFAULT_REG, pt, "flute"), DEFAULT_REG);
  const a = toggle(O, DEFAULT_REG, pt, "principal");
  assert.deepEqual(a.stops, ["flute", "principal"]);
  // Back to its own: stored as the default.
  assert.deepEqual(toggle(O, a, pt, "principal"), DEFAULT_REG);
  const onlyP = toggle(O, a, pt, "flute");
  assert.deepEqual(onlyP.stops, ["principal"]);
  assert.deepEqual(toggle(O, onlyP, pt, "principal"), onlyP, "the last foundation stays");
  assert.deepEqual(toggle(O, onlyP, pt, "mixture").stops, ["principal", "mixture"]);
  // The harpsichord's 8' always speaks: its buttons add.
  assert.deepEqual(toggle(H, DEFAULT_REG, PATCHES.harpsiSampled, "lute").stops, ["lute"]);
  assert.deepEqual(toggle(H, reg(["lute"]), PATCHES.harpsiSampled, "lute"), DEFAULT_REG);
  // Kept per piece and per sound.
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  saveRegistration("wtc1f02", H, reg(["unison", "four"], true));
  assert.deepEqual(loadRegistration("wtc1f02", H), reg(["unison", "four"], true));
  assert.deepEqual(loadRegistration("wtc1f03", H), DEFAULT_REG);
  assert.deepEqual(loadRegistration("wtc1f02", O), DEFAULT_REG);
  saveRegistration("wtc1f02", H, DEFAULT_REG);
  assert.equal(store.get("tg-registration-v1"), "{}");
  // What is kept and not understood: the default.
  store.set("tg-registration-v1", JSON.stringify({ wtc1f02: { [H]: { stops: ["bogus", "lute"], tutti: "yes" } } }));
  assert.deepEqual(loadRegistration("wtc1f02", H), reg(["lute"]));
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
