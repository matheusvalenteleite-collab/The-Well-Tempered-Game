/**
 * D349 (WTC 1.59+): PIPE ORGAN as one organ (the owner: "too much like four different instruments instead
 * of a single organ"): the manual voices one rank, the player's pipes the band's (never louder, never
 * brighter), a joined note's pipe speaking anew, each note placed by its key in the case, ORGANO PLENO
 * drawing the mixture, the band's ensemble an organist's (no note's own scatter, half the shaped time).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeNode, FakeParam, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play } from "../src/touch/chip.ts";
import { ORGAN_SEND, PATCHES, presetById, sampledNow, setPreset } from "../src/touch/sound.ts";
import { crowned, DEFAULT_REG, pedalPatch, setLiveRegistration } from "../src/touch/registration.ts";
import { beatOf, fugueById, inBar } from "../src/touch/fugue.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { ORGAN_ENSEMBLE, phrase, phraseContext } from "../src/touch/phrasing.ts";
import { accompaniment, subjectMarks } from "../src/touch/voice-mode.ts";

const ctxOf = installFakeAudio(0, false);
const O = "chamberOrgan";

/** One note on the organ: the nodes it made and the waves asked for. */
async function strike(voice: number, count: number, play: Play, midi = 64) {
  setPreset(O);
  const chip = new Chip();
  const waves: string[] = [];
  const c = chip as unknown as { osc: (w: string) => unknown };
  const osc0 = c.osc.bind(chip);
  c.osc = (w: string) => (waves.push(w), osc0(w));
  const ctx = ctxOf();
  const before = new Set(ctx.nodes);
  chip.note(midi, 1, 1, voicing(voice, count, !!play.lead), play);
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  return { chip, made, waves, ctx };
}
const of = (made: FakeNode[], kind: string) => made.filter((n) => n.kind === kind);

test("D349: one organ: every manual voice the same rank and place in the room, the pedal its division; nothing per voice", () => {
  const pr = presetById(O);
  for (const n of [2, 3, 4, 5]) {
    const by = pr.by![n]!;
    assert.ok(by.slice(0, -1).every(([p]) => p === "orgPrincipal") && by[n - 1][0] === "orgPedal", `${n}`);
    // Close together: the case's C and C♯ sides spread the notes, not the voices.
    assert.ok(by.every(([, pan]) => Math.abs(pan) <= 0.05), `${n}: pans`);
    assert.ok(by.every(([, , level]) => level === undefined), "no voice lighter");
  }
  const manual = ["orgPrincipal", "orgFlute", "orgTrompete", "orgPleno"] as const;
  // One envelope's release, one send, one level (loudness matched by the ranks' gains).
  for (const id of manual) {
    const pt = PATCHES[id];
    assert.equal(pt.amp.r, 0.06, id);
    assert.equal(pt.send, ORGAN_SEND, id);
    assert.ok(Math.abs(pt.level - 0.3) <= 0.03, id);
    assert.equal(pt.pipe?.case, 0.12, id);
  }
  // The plenum's recordings load with the organ.
  setPreset(O);
  assert.deepEqual(sampledNow().sort(), ["organPedal", "organPleno"]);
});

test("D349: the player's pipes are the band's: neither louder nor brighter, the same release", async () => {
  const band = await strike(1, 3, {});
  const mine = await strike(1, 3, { lead: true });
  assert.deepEqual(mine.waves, band.waves);
  const shelves = (made: FakeNode[]) => of(made, "filter").filter((f) => (f as unknown as { type: string }).type === "highshelf").map((f) => (f.gain as FakeParam).value);
  assert.ok(shelves(mine.made).every((g) => g === 0) && shelves(band.made).every((g) => g === 0), "no lift of the player's tone");
  const peak = (made: FakeNode[]) => Math.max(...of(made, "gain").map((g) => Math.max(...(g.gain as FakeParam).events.map((e) => Math.abs(e.v ?? 0)), 0)));
  assert.ok(Math.abs(peak(mine.made) - peak(band.made)) < 1e-9, `${peak(mine.made)} against ${peak(band.made)}`);
});

test("D349: a joined note's pipe speaks anew (its chiff), placed by its key in the case (C side left, C♯ side right)", async () => {
  // The chiff's band-passed noise even when joined (another pipe: the organist joins by the release).
  const joined = await strike(0, 3, { legato: true, from: 62 });
  assert.ok(of(joined.made, "filter").some((f) => (f as unknown as { type: string }).type === "bandpass"), "the chiff");
  const pans = await Promise.all([60, 61, 62, 63].map(async (m) => (of((await strike(1, 3, {}, m)).made, "panner")[0].pan as FakeParam).value));
  const base = voicing(1, 3).pan;
  assert.ok(pans[0] < base && pans[2] < base && pans[1] > base && pans[3] > base, `${pans}`);
  assert.ok(pans.every((p) => Math.abs(p - base) <= 0.12 + 1e-9));
  // Each key's pipe its own fixed fraction of a cent (the same whoever plays it).
  const det = async (v: number) => (of((await strike(v, 3, {}, 64)).made, "oscillator")[0].detune as FakeParam).value;
  assert.equal(await det(0), await det(1));
  assert.ok(Math.abs(await det(0)) <= 0.6);
});

test("D349: the pedal follows the manual's registration; ORGANO PLENO draws the mixture on the whole organ", () => {
  assert.equal(pedalPatch(null), PATCHES.orgPedal);
  assert.equal(pedalPatch(["flute"]), PATCHES.orgPedalSoft);
  assert.equal(pedalPatch(["principal", "mixture"]), PATCHES.orgPedalPleno);
  assert.equal(pedalPatch(["principal"], false), PATCHES.orgPedal8);
  assert.equal(crowned(PATCHES.orgPrincipal, false, null, 64), PATCHES.orgPleno);
  assert.equal(crowned(PATCHES.orgPedal, true, null, 40), PATCHES.orgPedalPleno);
  assert.equal(crowned(PATCHES.orgPleno, false, ["principal", "mixture"], 64), null);
  assert.ok(crowned(PATCHES.orgTrompete, false, ["reed"], 64)?.osc.some((o) => (o.octave ?? 0) >= 2), "a reed's note with the mixture's ranks");
  assert.equal(crowned(PATCHES.harpsiSampled, false, null, 64), null, "only the organ");
});

test("D349: the zone ORGANO PLENO sounds the plenum from the next note; out of it, the registration as it was", async () => {
  setLiveRegistration(O, DEFAULT_REG);
  setPreset(O);
  const chip = new Chip();
  const asked: string[] = [];
  const c = chip as unknown as { voiceNote: (m: number, a: number, d: number, v: { patch?: unknown }) => unknown };
  const vn = c.voiceNote.bind(chip);
  c.voiceNote = ((m: number, a: number, d: number, v: { patch?: unknown }, ...rest: unknown[]) => (asked.push(v.patch === PATCHES.orgPleno ? "pleno" : v.patch === PATCHES.orgPrincipal ? "principal" : "?"), (vn as (...x: unknown[]) => unknown)(m, a, d, v, ...rest))) as never;
  chip.note(64, 1, 0.5, voicing(0, 3));
  chip.zone("pleno");
  chip.note(64, 2, 0.5, voicing(0, 3));
  chip.zone(null);
  chip.note(64, 3, 0.5, voicing(0, 3));
  assert.deepEqual(asked, ["principal", "pleno", "principal"]);
});

test("D349: the organist's ensemble: a manual's voices struck together, the shaped time half the others', the releases even", () => {
  const f = fugueById("wtc1f02");
  const bpm = tempoOf(f.id);
  const b = beatOf(f);
  const all = accompaniment(f, 0, -1);
  const ctx = phraseContext(f, bpm);
  const organ = phrase(all, b.ticks, (t) => inBar(f, t), subjectMarks(f).subject, "organ", ctx);
  const plain = phrase(all, b.ticks, (t) => inBar(f, t), subjectMarks(f).subject, "plain", ctx);
  // Every note at one onset shares one offset (the shaped time alone), half the plain style's shaped part at most.
  const byOn = new Map<number, Set<number>>();
  all.forEach((n, i) => byOn.set(n.on, (byOn.get(n.on) ?? new Set()).add(Math.round(organ[i].nudge * 1e6))));
  assert.ok([...byOn.values()].every((s) => s.size === 1), "one manual, one moment");
  const maxOrgan = Math.max(...organ.map((s) => Math.abs(s.nudge)));
  const maxPlain = Math.max(...plain.map((s) => Math.abs(s.nudge)));
  assert.ok(maxOrgan > 0 && maxOrgan <= 0.012 && maxOrgan < maxPlain, `${maxOrgan} against ${maxPlain}`);
  assert.equal(ORGAN_ENSEMBLE.rubato, 0.5);
  assert.ok(ORGAN_ENSEMBLE.spread <= 0.05);
  setPreset("chip");
  void FakeAudioContext;
});
