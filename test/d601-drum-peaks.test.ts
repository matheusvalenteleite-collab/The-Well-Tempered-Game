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
import { test } from "node:test";
import assert from "node:assert/strict";
import { strokesOf } from "./drum-strokes.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { FUGUE_PICKS, homeFor } from "../src/touch/drum-library.ts";
import { pieceLevel } from "../src/touch/sound.ts";
import { BAND, PIECE_DB, TAIL_S, TAIL_W } from "../src/touch/drum-peak-data.ts";
import { STREET_MIN_BAR_S, STREET_VEL } from "../src/touch/score-layers.ts";
import { scorePlan } from "../src/touch/score-drums.ts";

const WTC = Array.from({ length: 48 }, (_, i) => `wtc${i < 24 ? 1 : 2}f${String((i % 24) + 1).padStart(2, "0")}`);
/** The window (s) a stroke's loudness is read over (render.cjs: 19 steps of 512 samples at 24 kHz). */
const WINDOW_S = (19 * 512) / 24000;

/**
 * D607: strict: no stroke over the band, and the model's own error (PIECE_DB's header: about 1 dB a style) taken on the
 * drums' side: each stroke at least MARGIN_DB under the band by the model.
 */
const MARGIN_DB = 1;
/** The band's measured loudness (dB) over the window from the half beat at or around a tick. */
function bandAt(id: string, tick: number): number {
  const b = BAND[id];
  const at = (i: number) => b.db[Math.max(0, Math.min(b.db.length - 1, i))];
  // the half beats either side (the band's window from just before the stroke, or from just after it)
  return Math.max(at(Math.floor(tick / b.beat)), at(Math.ceil(tick / b.beat)));
}

test("D601: every fugue's drums (HOME and its picks) under the band at every stroke, on the phone model", async () => {
  const bad: string[] = [];
  let n = 0;
  for (const id of WTC) {
    const f = fugueById(id);
    const sound = PIECE_SOUND[id];
    const lv = 20 * Math.log10(pieceLevel(sound, id, true));
    for (const style of new Set([homeFor(id, sound), ...(FUGUE_PICKS[id] ?? [])])) {
      const db = PIECE_DB[`${style}@${sound}`];
      assert.ok(db, `${style} on ${sound}: fitted`);
      assert.ok(BAND[id], `${id}: measured`);
      const s = (await strokesOf(f, sound, style)).sort((a, b) => a.t - b.t);
      let lo = 0;
      for (let i = 0; i < s.length; i++) {
        const x = s[i];
        while (s[lo].t < x.t - TAIL_S) lo++;
        let e = 0;
        for (let k = lo; k < s.length && s[k].t < x.t + WINDOW_S; k++) e += 10 ** ((db[s[k].piece] ?? -99) / 10) * s[k].vel ** 2 * (s[k].t < x.t - 1e-4 ? TAIL_W : 1);
        const drum = -0.691 + 10 * Math.log10(Math.max(e, 1e-14)) + lv;
        const band = bandAt(id, x.tick);
        n++;
        if (drum + MARGIN_DB > band) bad.push(`${id} ${style} ${x.piece}/${x.role ?? "-"} v${x.vel.toFixed(2)} at tick ${Math.round(x.tick)}: drums ${drum.toFixed(1)}, the band ${band.toFixed(1)}`);
      }
    }
  }
  assert.ok(n > 30000, `${n} strokes`);
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
