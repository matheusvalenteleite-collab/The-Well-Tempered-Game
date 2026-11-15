/**
 * D645: THE BASS AUDIBLE ON A PHONE (the owner's standing rule). On the phone model (mono, two 2nd-order 600 Hz high-passes,
 * ebur128), every one of the 48 fugues on its own sound: the bass alone within BASS_GAP_DB of the loudest other voice
 * alone, the bass in the band (the player on the top voice) and as the player's voice. Measured (src/touch/bass-phone-data.ts:
 * the real engine offline, every voice alone, tools/touch/bass-phone/render.cjs, measure.py, fit.ts), each voice read with
 * the balance's gain now (D508's player level and band trims, against those it was measured with) and the bass at its
 * exciter's mix now (the fit); a fugue whose sound or bass patch has changed since it was measured is re-measured.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { bandTrimDb, liftDb } from "../src/touch/player-lift.ts";
import { playerSound } from "../src/touch/sound.ts";
import { BASS_GAP_DB, bassPatchOf, bassSig, type BassRun } from "../src/touch/bass-phone.ts";
import { BASS_PHONE } from "../src/touch/bass-phone-data.ts";
import { FakeAudioContext, type FakeNode, installFakeAudio } from "./fake-audio.ts";
import { Chip, PHONE_BASS_GAIN, voicing } from "../src/touch/chip.ts";
import { KRAUT2_MOOG_PHONE_LIFT, placeFor, presetById, setPreset } from "../src/touch/sound.ts";

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 2 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;
const setPhone = (on: boolean) => Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: on ? 5 : 0, userAgent: on ? "iPhone" : "node" }, configurable: true, writable: true });

const WTC = Array.from({ length: 48 }, (_, i) => `wtc${i < 24 ? 1 : 2}f${String((i % 24) + 1).padStart(2, "0")}`);
const dB = (x: number) => 10 * Math.log10(x);
const e = (db: number) => 10 ** (db / 10);

/** The bass's gap under the loudest other voice (LU) in one run, by the measurement and the engine's gains now. */
function gapOf(id: string, s: string, run: BassRun, pv: number, dbThen: number | null, dbNow: number | null): number {
  const nv = run.lu.length, b = nv - 1;
  // D703: the phone's balance (each path its own)
  const now = (u: number) => (u === pv ? liftDb(id, s, u, nv, true) : bandTrimDb(id, s, u, nv, true));
  const lv = run.lu.map((x, u) => x + now(u) - run.at[u]);
  if (dbNow !== dbThen) {
    assert.ok(run.x && dbNow !== null, `${id}: the bass's exciter changed (${dbThen} → ${dbNow}) and no fit: re-measure`);
    lv[b] = dB(e(run.x[0]) + e(run.x[1]) * e(dbNow)) + now(b) - run.at[b];
  }
  return Math.max(...lv.slice(0, b)) - lv[b];
}

test("D645: every fugue measured on its own sound, its bass patch as measured", () => {
  for (const id of WTC) {
    const m = BASS_PHONE[id];
    assert.ok(m, `${id}: measured`);
    const s = playerSound(PIECE_SOUND[id]);
    assert.equal(m.s, s, `${id}: measured on ${m.s}, its sound now ${s}: re-measure`);
    assert.equal(m.sig, bassSig(bassPatchOf(s, fugueById(id))), `${id}: its bass's patch changed since measured: re-measure`);
    assert.equal(m.band.lu.length, fugueById(id).voices.length);
  }
});

test(`D645: on a phone every fugue's bass within ${BASS_GAP_DB} LU of its loudest voice, in the band and as the player's`, () => {
  const bad: string[] = [];
  for (const id of WTC) {
    const m = BASS_PHONE[id];
    const f = fugueById(id);
    const b = f.voices.length - 1;
    const dbNow = bassPatchOf(m.s, f)?.phoneExcite?.db ?? null;
    for (const [k, pv] of [["band", 0], ["player", b]] as const) {
      const g = gapOf(id, m.s, m[k], pv, m.db, dbNow);
      if (g > BASS_GAP_DB) bad.push(`${id} ${k} ${g.toFixed(1)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("D645: the bass's exciter on a phone only, the bass's notes only (the band's and the player's alike)", async () => {
  const shapers = async (phone: boolean, sound: string, voice: number, midi: number, lead = false) => {
    setPhone(phone);
    setPreset(sound);
    const chip = new Chip();
    await chip.prepare([40, 45, 72], [lead ? midi : 72]);
    // a first note builds what the sound builds once (its band chain): the second is the note's own
    chip.note(midi, 0.5, 0.2, voicing(voice, 4), { lead });
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(midi, 1, 1, voicing(voice, 4), { lead });
    return [...ctx.nodes].filter((x) => !before.has(x) && (x as FakeNode).kind === "shaper").length;
  };
  for (const sound of ["jazzQuartet", "bossaNova", "salsa", "abbeyRoad"]) {
    assert.equal(await shapers(true, sound, 3, 40), 1, `${sound}: the bass on a phone`);
    assert.equal(await shapers(true, sound, 3, 40, true), 1, `${sound}: the player's bass on a phone`);
    assert.equal(await shapers(false, sound, 3, 40), 0, `${sound}: a computer's bass as before`);
    assert.equal(await shapers(true, sound, 0, 72), 0, `${sound}: the top voice untouched`);
  }
  setPhone(false);
  setPreset("chip");
});

test("D645: KRAUTROCK's Moog lifted on a phone only (a synthesized patch's Patch.phoneLift); CLASSIC CHIP's pulse bass a little louder there", async () => {
  const shelves = async (phone: boolean, voice: number, midi: number) => {
    setPhone(phone);
    setPreset("krautrock");
    const chip = new Chip();
    await chip.prepare([40, 72], [72]);
    chip.note(midi, 0.5, 0.2, voicing(voice, 4), {});
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(midi, 1, 1, voicing(voice, 4), {});
    return [...ctx.nodes].filter((x) => !before.has(x) && (x as FakeNode).kind === "filter" && (x as FakeNode).type === "highshelf").map((x) => `${((x as FakeNode).frequency as { value: number }).value}:${((x as FakeNode).gain as { value: number }).value}`);
  };
  const lift = `${KRAUT2_MOOG_PHONE_LIFT.hz}:${KRAUT2_MOOG_PHONE_LIFT.db}`;
  assert.ok((await shelves(true, 3, 40)).includes(lift), "the Moog on a phone");
  assert.ok(!(await shelves(false, 3, 40)).includes(lift), "a computer's Moog as before");
  setPhone(true);
  setPreset("chip");
  assert.ok(Math.abs(voicing(2, 3).gain - PHONE_BASS_GAIN * (presetById("chip").phoneBass ?? 1)) < 1e-9 && (presetById("chip").phoneBass ?? 1) > 1);
  setPreset("pianoSampled");
  assert.ok(Math.abs(voicing(2, 3).gain / (placeFor(2, 3)?.level ?? 1) - PHONE_BASS_GAIN) < 1e-9, "another sound's bass as before");
  setPhone(false);
  setPreset("chip");
  assert.equal(voicing(2, 3).gain, 1, "a computer's chip bass as before");
});

test("D645: the exciter's fit within 1 LU of the render at the measured mix", () => {
  for (const id of WTC) {
    const m = BASS_PHONE[id];
    for (const k of ["band", "player"] as const) {
      const r = m[k];
      if (!r.x || m.db === null) continue;
      const b = r.lu.length - 1;
      assert.ok(Math.abs(dB(e(r.x[0]) + e(r.x[1]) * e(m.db)) - r.lu[b]) <= 1, `${id} ${k}: the fit at the measured mix`);
    }
  }
});
