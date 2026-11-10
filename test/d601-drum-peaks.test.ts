/**
 * D600-D601: NO DRUM STROKE OVER THE BAND. The owner, on II/5: an episode's drum "sounds like a click track and it's way
 * too loud (louder than the music)". The rule for every fugue on its own sound and its drums (its HOME and its FUGUE_PICKS):
 * no stroke's momentary loudness on the phone model (the 400 ms after it) over the band's without drums over the same
 * window. The band's side measured (src/touch/drum-peak-data.ts BAND: the band alone through the real engine offline,
 * tools/touch/drum-peak/render.cjs and fit.py); the drums' side the engine's every stroke over the whole fugue, as
 * scheduled (Chip.groove through Chip.scheduleKitHit, no audio), each piece's loudness at velocity 1 fitted to the same
 * renders (PIECE_DB, by style and sound); the window's strokes summed as energy (a stroke struck up to TAIL_S before
 * counted at TAIL_W); every stroke at least MARGIN_DB under the band by the model (D607: none over, the fit's error
 * taken against the drums).
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { strokesOf } from "./drum-strokes.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { FUGUE_PICKS, homeFor, SOUND_FUGUE_HOME } from "../src/touch/drum-library.ts";
import { pieceLevel } from "../src/touch/sound.ts";
import { BAND, PIECE_DB, TAIL_S, TAIL_W } from "../src/touch/drum-peak-data.ts";
import { STREET_MIN_BAR_S, STREET_VEL } from "../src/touch/score-layers.ts";
import { scorePlan } from "../src/touch/score-drums.ts";
import { sfxOf } from "./sfx-events.ts";
import { BAND_FX, FX_DB } from "../src/touch/world-sfx-data.ts";
import { PILOT_SFX, SFX_MAX_Q, SFX_SOUND, SWEEP_TRIAL, setSfxOn, sfxPlan, swellEnv } from "../src/touch/world-sfx.ts";
import { formOf } from "../src/touch/form-points.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { textureGain } from "../src/touch/chip.ts";
import { saveStageMode } from "../src/touch/stage-bg.ts";

const WTC = Array.from({ length: 48 }, (_, i) => `wtc${i < 24 ? 1 : 2}f${String((i % 24) + 1).padStart(2, "0")}`);
/** The window (s) a stroke's loudness is read over (render.cjs: 19 steps of 512 samples at 24 kHz). */
const WINDOW_S = (19 * 512) / 24000;

/**
 * D607: strict: no stroke over the band, and the model's own error (PIECE_DB's header: about 1 dB a style) taken on the
 * drums' side: each stroke at least MARGIN_DB under the band by the model.
 */
const MARGIN_DB = 1;
/** The band's measured loudness (dB) over the window from the half beat at or around a tick (`id`: a fugue, or D618's "<fugue>@<sound>"). */
function bandAt(id: string, tick: number): number {
  const b = BAND[id];
  const at = (i: number) => b.db[Math.max(0, Math.min(b.db.length - 1, i))];
  // the half beats either side (the band's window from just before the stroke, or from just after it)
  return Math.max(at(Math.floor(tick / b.beat)), at(Math.ceil(tick / b.beat)));
}

/** Every stroke of `style` on `sound` over a fugue, against the band measured under `key`: the strokes counted and those not MARGIN_DB under. */
async function overBand(id: string, sound: string, style: string, key: string, bad: string[]): Promise<number> {
  const f = fugueById(id);
  const lv = 20 * Math.log10(pieceLevel(sound, id, true));
  const db = PIECE_DB[`${style}@${sound}`];
  assert.ok(db, `${style} on ${sound}: fitted`);
  assert.ok(BAND[key], `${key}: measured`);
  let n = 0;
  const s = (await strokesOf(f, sound, style)).sort((a, b) => a.t - b.t);
  let lo = 0;
  for (let i = 0; i < s.length; i++) {
    const x = s[i];
    while (s[lo].t < x.t - TAIL_S) lo++;
    let e = 0;
    for (let k = lo; k < s.length && s[k].t < x.t + WINDOW_S; k++) e += 10 ** ((db[s[k].piece] ?? -99) / 10) * s[k].vel ** 2 * (s[k].t < x.t - 1e-4 ? TAIL_W : 1);
    const drum = -0.691 + 10 * Math.log10(Math.max(e, 1e-14)) + lv;
    const band = bandAt(key, x.tick);
    n++;
    if (drum + MARGIN_DB > band) bad.push(`${key} ${style} ${x.piece}/${x.role ?? "-"} v${x.vel.toFixed(2)} at tick ${Math.round(x.tick)}: drums ${drum.toFixed(1)}, the band ${band.toFixed(1)}`);
  }
  return n;
}

test("D601: every fugue's drums (HOME and its picks) under the band at every stroke, on the phone model", async () => {
  const bad: string[] = [];
  let n = 0;
  for (const id of WTC) {
    const sound = PIECE_SOUND[id];
    for (const style of new Set([homeFor(id, sound), ...(FUGUE_PICKS[id] ?? [])])) n += await overBand(id, sound, style, id, bad);
  }
  assert.ok(n > 30000, `${n} strokes`);
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} strokes not ${MARGIN_DB} dB under the band`);
});

test("D618: a sound's HOME by fugue (BACH BRASS's calm fugues on TIMPANI and FIELD DRUM) under that sound's band at every stroke", async () => {
  const bad: string[] = [];
  let n = 0;
  for (const [sound, homes] of Object.entries(SOUND_FUGUE_HOME))
    for (const id of Object.keys(homes)) {
      assert.equal(homeFor(id, sound), homes[id], `${id} on ${sound}: its HOME`);
      n += await overBand(id, sound, homes[id], `${id}@${sound}`, bad);
    }
  assert.ok(n > 2000, `${n} strokes`);
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} strokes not ${MARGIN_DB} dB under the band`);
});

test("D600: II/5's street beat a tap on the bar, not every beat; the stick no phone harmonics", () => {
  const f = fugueById("wtc2f05");
  const plan = scorePlan(f, "march");
  const sticks = plan.strokes.filter((x) => x.piece === "drumStick");
  assert.ok(sticks.length > 0);
  // one a bar at most, on the bar's first beat
  const bars = new Set(sticks.map((x) => Math.floor(x.tick / f.barTicks)));
  assert.equal(bars.size, sticks.length);
  for (const x of sticks) assert.equal(x.tick % f.barTicks, f.bars[0].on % f.barTicks);
  assert.ok(Math.max(...sticks.map((x) => x.vel)) <= STREET_VEL[0] * 1.2, "soft");
  assert.ok(STREET_MIN_BAR_S > 1);
});

/**
 * D628, THE PILOT WORLDS' EFFECTS UNDER THE BAND (world-sfx.ts; strict, as D607): every effect a pilot world schedules
 * (Chip.groove through Chip.scheduleSfx, no audio: test/sfx-events.ts) at least FX_MIN_GAP under the band over the 400 ms
 * from it, and each effect's median at least FX_MEDIAN_GAP under, on the phone model AND on a desktop; the band's side
 * measured (world-sfx-data.ts BAND_FX: the band alone, no effects, no drummer, the quietest step in the window), the
 * effects' their loudness at velocity 1 (FX_DB) at the velocity the choke point gives them, every effect starting in the
 * window counted whole (the thud and the rumble on II/6's peak together); MARGIN_DB taken against the effects.
 */
describe("D628: the pilot worlds' effects under the band", () => {
  const FX_MIN_GAP = 6;
  const FX_MEDIAN_GAP = 12;
  const PILOTS = ["wtc2f01", "wtc2f02", "wtc2f03", "wtc2f04", "wtc2f05", "wtc2f06"];

  test("D628: every effect >= 6 LU under the band, each effect's median >= 12 LU, phone and desktop (the model's 1 dB taken against them)", async () => {
    const bad: string[] = [];
    let n = 0;
    for (const id of PILOTS) {
      const f = fugueById(id);
      const sound = PIECE_SOUND[id];
      const ev = (await sfxOf(f, sound)).sort((a, b) => a.t - b.t);
      if (!(PILOT_SFX[id] ?? []).length) {
        assert.equal(ev.length, 0, `${id}: no sound, deliberately`);
        continue;
      }
      assert.ok(ev.length > 0, `${id}: its effects scheduled`);
      const tps = (f.tpq * tempoOf(id)) / 60;
      for (const m of ["p", "d"] as const) {
        const B = BAND_FX[id];
        assert.ok(B, `${id}: measured`);
        const gaps = new Map<string, number[]>();
        for (const x of ev) {
          let e = 0;
          for (const o of ev) {
            if (o.t < x.t - 0.3 || o.t >= x.t + WINDOW_S) continue;
            const v = o.kind === "swell" ? Math.max(o.vel, o.vel1) : o.vel;
            e += 10 ** (FX_DB[id][o.kind][m] / 10) * v * v;
          }
          const fx = 10 * Math.log10(Math.max(e, 1e-14));
          const span = Math.max(x.end, x.tick + WINDOW_S * tps);
          let band = Infinity;
          for (let i = Math.floor(x.tick / B.step); i <= Math.ceil(span / B.step) && i < B[m].length; i++) band = Math.min(band, B[m][i]);
          const gap = band - fx - MARGIN_DB;
          n++;
          (gaps.get(x.kind) ?? gaps.set(x.kind, []).get(x.kind)!).push(gap);
          if (gap < FX_MIN_GAP) bad.push(`${id} ${m} ${x.kind} at tick ${Math.round(x.tick)} v${x.vel.toFixed(2)}: ${gap.toFixed(1)} LU under the band (${band.toFixed(1)})`);
        }
        for (const [k, g] of gaps) {
          const s = [...g].sort((a, b) => a - b);
          const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
          if (med < FX_MEDIAN_GAP) bad.push(`${id} ${m} ${k}: median ${med.toFixed(1)} LU under the band`);
        }
      }
    }
    assert.ok(n > 100, `${n} effects`);
    assert.deepEqual(bad, []);
  });

  test("D623: II/2, II/4 and II/5 silent; nothing before the first note, in a general rest, or past the last chord; the swell gone before it", async () => {
    for (const id of ["wtc2f02", "wtc2f04", "wtc2f05"]) assert.deepEqual(PILOT_SFX[id], []);
    assert.deepEqual(SWEEP_TRIAL.wtc2f04, ["sweep"], "II/4's sweep: the Sound Lab's A/B only");
    for (const id of ["wtc2f01", "wtc2f03", "wtc2f06"]) {
      const f = fugueById(id);
      const F = formOf(f);
      let first = Infinity;
      for (const v of f.voices) for (const nn of v) first = Math.min(first, nn[0]);
      for (const x of await sfxOf(f, PIECE_SOUND[id])) {
        assert.ok(x.tick >= first - 1 && x.tick <= F.last, `${id} ${x.kind} at ${x.tick}: inside the music`);
        assert.ok(textureGain(f, x.tick) > 0, `${id} ${x.kind} at ${x.tick}: not in a rest`);
        if (x.kind === "swell") assert.ok(x.end < F.last, "the swell gone before the last chord");
      }
    }
    // the events are the score's: the entries' onsets, the climax's rise to its peak, the peak
    const f6 = fugueById("wtc2f06");
    const plan = sfxPlan(f6);
    assert.deepEqual(plan.filter((e) => e.kind === "thud").map((e) => e.tick), [...new Set(f6.entries.map((e) => e.on))].sort((a, b) => a - b));
    assert.deepEqual(plan.filter((e) => e.kind === "rumble").map((e) => e.tick), [formOf(f6).climax.peak]);
    const f1 = fugueById("wtc2f01");
    const sw = sfxPlan(f1).find((e) => e.kind === "swell")!;
    assert.equal(sw.tick, formOf(f1).climax.rise);
    assert.ok(swellEnv(f1, formOf(f1).climax.peak) === 1 && swellEnv(f1, sw.end) === 0);
  });

  test("D623: no pitch (noise through low-Q filters only); the rumble under 1 s and high-passed; off by WORLD SOUNDS, STAGE QUIET/OFF, the world not shown", async () => {
    for (const [k, s] of Object.entries(SFX_SOUND)) for (const L of s.layers) for (const [, hz, q] of L.filters) assert.ok(q <= SFX_MAX_Q && hz > 0, `${k}: Q ${q}`);
    const r = SFX_SOUND.rumble.layers;
    assert.ok(Math.max(...r.map((L) => L.len)) < 1, "the rumble under 1 s");
    assert.ok(r.every((L) => L.filters.filter(([t, hz]) => t === "highpass" && hz >= 300).length >= 2), "the rumble high-passed twice over the bass's fundamentals");
    const f = fugueById("wtc2f03");
    assert.equal((await sfxOf(f, PIECE_SOUND.wtc2f03, false)).length, 0, "the world not shown (the tutorial's box)");
    for (const mode of ["quiet", "off"] as const) {
      saveStageMode(mode);
      assert.equal((await sfxOf(f, PIECE_SOUND.wtc2f03)).length, 0, `STAGE ${mode}: silent`);
    }
    saveStageMode("full");
    setSfxOn(false);
    assert.equal((await sfxOf(f, PIECE_SOUND.wtc2f03)).length, 0, "WORLD SOUNDS off");
    setSfxOn(true);
    const a = await sfxOf(f, PIECE_SOUND.wtc2f03);
    assert.ok(a.length > 30);
    assert.deepEqual(await sfxOf(f, PIECE_SOUND.wtc2f03), a, "the same every run (nothing of the player's)");
  });
});
