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
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { FUGUE_PICKS, homeFor, SOUND_FUGUE_HOME } from "../src/touch/drum-library.ts";
import { pieceLevel } from "../src/touch/sound.ts";
import { BAND, PIECE_DB, TAIL_S, TAIL_W } from "../src/touch/drum-peak-data.ts";
import { STREET_MIN_BAR_S, STREET_VEL } from "../src/touch/score-layers.ts";
import { scorePlan } from "../src/touch/score-drums.ts";
import { sfxOf } from "./sfx-events.ts";
import { BAND_FX, FX_DB } from "../src/touch/world-sfx-data.ts";
import { CURVE_SOUND, PILOT_SFX, SFX_MAX_Q, SFX_SOUND, SILENT_SFX, SWEEP_TRIAL, bedEnv, bedEnd, figureOf, flowEnv, isFlow, modAt, setSfxLab, setSfxOn, sfxKindsNow, sfxPlan, swellEnd, swellEnv, tpsOf, type SfxKind } from "../src/touch/world-sfx.ts";
import { formOf } from "../src/touch/form-points.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { sfxShare, textureGain } from "../src/touch/chip.ts";
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
 * D628, D644: THE WORLDS' EFFECTS UNDER THE BAND (world-sfx.ts; strict, as D607): every effect a world schedules
 * (Chip.groove through Chip.scheduleSfx, no audio: test/sfx-events.ts) at least FX_MIN_GAP under the band over the 400 ms
 * from it, and each effect's median at least FX_MEDIAN_GAP under, on the phone model AND on a desktop; the band's side
 * measured (world-sfx-data.ts BAND_FX: the band alone, no effects, no drummer (the drums only add to the band: the band's
 * side conservative), the quietest step in the window), the effects' their loudness at velocity 1 (FX_DB) at the velocity
 * the choke point gives them; every effect of the fugue in the window together: the one-shots starting in it summed (a
 * figure's strokes, the thud and the rumble on II/6's peak) against the quietest band step in the window; D644's flowing
 * effects (beds, climax shapes: one sound cut into beats) at every band step they sound in, their envelope as the choke
 * point plays it (world-sfx.ts flowEnv times chip.ts sfxShare; each beat's piece checked to begin at it) over the window,
 * against the band's same window, with the one-shots there; MARGIN_DB against the effects.
 */
describe("D628, D644: the worlds' effects under the band", () => {
  const FX_MIN_GAP = 6;
  const FX_MEDIAN_GAP = 12;
  const WORLDS = Object.keys(PILOT_SFX).sort();
  /** D640: the studio's and the owner's list (the pilots, D623; the second batch, D640). */
  const LIST: Record<string, readonly SfxKind[]> = {
    wtc1f01: ["murmur"], wtc1f02: ["crackle"], wtc1f03: ["plop"], wtc1f05: ["hush", "murmur"], wtc1f06: ["rustle"], wtc1f07: ["whirr"], wtc1f08: ["gravel"],
    wtc1f09: ["flutter"], wtc1f10: ["hoof"], wtc1f11: ["grass"], wtc1f13: ["bubble"], wtc1f15: ["flipper"], wtc1f16: ["clack"], wtc1f17: ["page"], wtc1f19: ["clatter"],
    wtc1f20: ["rail"], wtc1f21: ["clack"], wtc1f22: ["steps"], wtc1f23: ["vinyl"], wtc1f24: ["lowwind"],
    wtc2f01: ["swell"], wtc2f03: ["click"], wtc2f06: ["thud", "rumble"],
    wtc2f08: ["rain"], wtc2f10: ["fair"], wtc2f11: ["grass"], wtc2f12: ["ballroom"], wtc2f13: ["rotary"], wtc2f14: ["leaves"], wtc2f15: ["hop"], wtc2f16: ["court"],
    wtc2f18: ["stamp"], wtc2f19: ["wind"], wtc2f20: ["quake"], wtc2f22: ["harbour"], wtc2f24: ["ballroom"],
  };
  const flowing = (k: string) => k === "swell" || isFlow(k);

  test("D640: the list: every world its effects, the silent ones silent by design", () => {
    for (const [id, k] of Object.entries(LIST)) assert.deepEqual(PILOT_SFX[id], k, id);
    for (const id of [...SILENT_SFX, "wtc2f02", "wtc2f04", "wtc2f05"]) assert.deepEqual(PILOT_SFX[id], [], `${id}: silent by design`);
    assert.equal(SILENT_SFX.length, 9);
    for (const id of WTC.filter((x) => !LIST[x])) assert.equal((PILOT_SFX[id] ?? []).length, 0, `${id}: none`);
  });

  test("D628, D644: every effect >= 6 LU under the band, each effect's median >= 12 LU, phone and desktop, every world (the model's 1 dB taken against them)", async () => {
    const bad: string[] = [];
    let n = 0;
    const median = (g: number[]) => {
      const s = [...g].sort((a, b) => a - b);
      return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    };
    for (const id of WORLDS) {
      const f = fugueById(id);
      const sound = PIECE_SOUND[id];
      const ev = (await sfxOf(f, sound)).sort((a, b) => a.t - b.t);
      if (!(PILOT_SFX[id] ?? []).length) {
        assert.equal(ev.length, 0, `${id}: no sound, deliberately`);
        continue;
      }
      assert.ok(ev.length > 0, `${id}: its effects scheduled`);
      const tps = (f.tpq * tempoOf(id)) / 60;
      const flowK = PILOT_SFX[id].find((k) => isFlow(k));
      // D644: a flowing effect's envelope as the choke point plays it (each beat's piece begins at it), its mean square over the 400 ms from a tick
      const envMs = (tick: number) => {
        if (!flowK) return 0;
        let e = 0;
        for (let j = 0; j < 20; j++) {
          const t = tick + ((j + 0.5) / 20) * WINDOW_S * tps;
          e += (flowEnv(f, flowK, t) * sfxShare(f, t)) ** 2;
        }
        return e / 20;
      };
      for (const x of ev.filter((o) => o.kind === flowK)) assert.ok(Math.abs(x.vel - flowEnv(f, flowK!, x.tick) * sfxShare(f, x.tick)) < 1e-6, `${id}: the beat's piece at its envelope`);
      for (const m of ["p", "d"] as const) {
        const B = BAND_FX[id];
        assert.ok(B, `${id}: measured`);
        const db = (k: string) => {
          const v = FX_DB[id]?.[k]?.[m];
          assert.ok(v !== undefined, `${id} ${k} ${m}: fitted`);
          return v!;
        };
        const shots = ev.filter((o) => !flowing(o.kind) || o.kind === "swell");
        const gaps = new Map<string, number[]>();
        const push = (k: string, g: number) => (gaps.get(k) ?? gaps.set(k, []).get(k)!).push(g);
        const shotsIn = (t: number) => {
          let e = 0;
          for (const o of shots) {
            if (o.kind === "swell") {
              if (o.t < t - 0.3 || o.t >= t + WINDOW_S) continue;
              const v = Math.max(o.vel, o.vel1);
              e += 10 ** (db(o.kind) / 10) * v * v;
            } else if (o.t >= t - 0.3 && o.t < t + WINDOW_S) e += 10 ** (db(o.kind) / 10) * o.vel * o.vel;
          }
          return e;
        };
        // the one-shots (and II/1's swell, D628's way): each against the quietest band step in its window, with every effect there
        for (const x of shots) {
          const fxE = shotsIn(x.t) + (flowK ? 10 ** (db(flowK) / 10) * envMs(x.tick) : 0);
          const fx = 10 * Math.log10(Math.max(fxE, 1e-14));
          const span = Math.max(x.end, x.tick + WINDOW_S * tps);
          let band = Infinity;
          for (let i = Math.floor(x.tick / B.step); i <= Math.ceil(span / B.step) && i < B[m].length; i++) band = Math.min(band, B[m][i]);
          const gap = band - fx - MARGIN_DB;
          n++;
          push(x.kind, gap);
          if (gap < FX_MIN_GAP) bad.push(`${id} ${m} ${x.kind} at tick ${Math.round(x.tick)} v${x.vel.toFixed(2)}: ${gap.toFixed(1)} LU under the band (${band.toFixed(1)})`);
        }
        // D644: a flowing effect at every band step it sounds in: its envelope's window against the band's same window, with the one-shots there
        if (flowK) {
          const ms: number[] = [];
          for (let i = 0; i < B[m].length; i++) ms.push(envMs(i * B.step));
          const top = Math.max(...ms);
          for (let i = 0; i < B[m].length; i++) {
            if (ms[i] < top * 10 ** -1.5) continue;
            const t = (i * B.step) / tps;
            const fx = 10 * Math.log10(10 ** (db(flowK) / 10) * ms[i] + shotsIn(t));
            const gap = B[m][i] - fx - MARGIN_DB;
            n++;
            push(flowK, gap);
            if (gap < FX_MIN_GAP) bad.push(`${id} ${m} ${flowK} at tick ${i * B.step}: ${gap.toFixed(1)} LU under the band (${B[m][i].toFixed(1)})`);
          }
        }
        for (const [k, g] of gaps) if (median(g) < FX_MEDIAN_GAP) bad.push(`${id} ${m} ${k}: median ${median(g).toFixed(1)} LU under the band`);
      }
    }
    assert.ok(n > 5000, `${n} effects and windows`);
    assert.deepEqual(bad, []);
  });

  test("D623, D640: nothing before the first note, in a general rest, or past the last chord; the climaxes gone before it; the events the score's", async () => {
    for (const id of ["wtc2f02", "wtc2f04", "wtc2f05"]) assert.deepEqual(PILOT_SFX[id], []);
    assert.deepEqual(SWEEP_TRIAL.wtc2f04, ["sweep"], "II/4's sweep: the Sound Lab's A/B only");
    for (const id of WORLDS.filter((x) => PILOT_SFX[x].length)) {
      const f = fugueById(id);
      const F = formOf(f);
      let first = Infinity;
      for (const v of f.voices) for (const nn of v) first = Math.min(first, nn[0]);
      const ons = [...new Set(f.entries.map((e) => e.on))].sort((a, b) => a - b);
      for (const x of await sfxOf(f, PIECE_SOUND[id])) {
        assert.ok(x.tick >= first - 1 && x.tick <= F.last && x.end <= F.last, `${id} ${x.kind} at ${x.tick}: inside the music`);
        assert.ok(textureGain(f, x.tick) > 0 || flowing(x.kind), `${id} ${x.kind} at ${x.tick}: not in a rest`);
        if (flowing(x.kind) && textureGain(f, x.tick) === 0) assert.ok(x.vel === 0, `${id} ${x.kind} at ${x.tick}: silent in a rest`);
      }
      for (const e of sfxPlan(f)) {
        const C = CURVE_SOUND[e.kind];
        if (!C) continue;
        if (C.event === "entry" && !C.figure) assert.ok(ons.includes(e.tick), `${id} ${e.kind}: on an entry's onset`);
        if (C.event === "entry" && C.figure) {
          const on = Math.max(...ons.filter((t) => t <= e.tick));
          const v = f.entries.find((x) => x.on === on)!.voice;
          assert.ok(e.tick === on || f.voices[v].some((nn) => nn[0] === e.tick), `${id} ${e.kind} at ${e.tick}: a note of the entering voice`);
        }
        if (C.event === "climax") assert.equal(e.tick, F.climax.rise, `${id} ${e.kind}: from the climax's rise`);
        if (C.event === "climax" && !C.shot) assert.ok(e.end === swellEnd(f) && e.end < F.last, `${id} ${e.kind}: gone before the last chord`);
        if (C.event === "bed") assert.ok(e.tick === ons[0] && e.end === bedEnd(f, e.kind), `${id} ${e.kind}: the bed from the first entry to its end`);
      }
      if (!PILOT_SFX[id].some((k) => CURVE_SOUND[k]?.figure)) {
        const plan = sfxPlan(f).filter((e) => CURVE_SOUND[e.kind]?.event === "entry");
        if (plan.length) assert.deepEqual(plan.map((e) => e.tick), ons, `${id}: one on each distinct entry onset`);
      }
    }
    const f6 = fugueById("wtc2f06");
    const plan = sfxPlan(f6);
    assert.deepEqual(plan.filter((e) => e.kind === "thud").map((e) => e.tick), [...new Set(f6.entries.map((e) => e.on))].sort((a, b) => a - b));
    assert.deepEqual(plan.filter((e) => e.kind === "rumble").map((e) => e.tick), [formOf(f6).climax.peak]);
    const f1 = fugueById("wtc2f01");
    const sw = sfxPlan(f1).find((e) => e.kind === "swell")!;
    assert.equal(sw.tick, formOf(f1).climax.rise);
    assert.ok(swellEnv(f1, formOf(f1).climax.peak) === 1 && swellEnv(f1, sw.end) === 0);
  });

  test("D642: the beds step with the entries (II/24 falling), fade over about 1 s before the last chord; II/8's rain stops at the peak", () => {
    for (const id of WORLDS) {
      for (const k of PILOT_SFX[id]) {
        if (CURVE_SOUND[k]?.event !== "bed") continue;
        const f = fugueById(id);
        const F = formOf(f);
        const tps = tpsOf(f);
        const ons = [...new Set(f.entries.map((e) => e.on))].sort((a, b) => a - b);
        const beat = beatOf(f).ticks;
        // the level a beat after each entry (once faded in), till the end's fade
        const lv = ons.slice(1).map((t) => bedEnv(f, k, t + beat)).filter((_, i) => ons[i + 1] + beat < bedEnd(f, k) - 1.5 * tps);
        for (let i = 1; i < lv.length; i++) {
          if (id === "wtc2f24") assert.ok(lv[i] <= lv[i - 1] + 1e-9, `${id}: falling with the entries`);
          else assert.ok(lv[i] >= lv[i - 1] - 1e-9, `${id} ${k}: rising with the entries`);
        }
        assert.ok(Math.abs(20 * Math.log10(lv[lv.length - 1] / lv[0])) > 4, `${id}: the steps heard`);
        const end = bedEnd(f, k);
        assert.equal(bedEnv(f, k, end), 0, `${id}: gone by its end`);
        if (id === "wtc2f08") assert.equal(end, F.climax.peak, "the rain stops at the climax's peak");
        else {
          assert.equal(end, F.last);
          const before = bedEnv(f, k, end - 1.2 * tps);
          assert.ok(bedEnv(f, k, end - 0.5 * tps) < 0.6 * before && before > 0, `${id}: fading over about 1 s`);
        }
      }
    }
  });

  test("D642: the pulses on the score's beat (the drums' pulse) or fitted to the entry's notes; the rest irregular", () => {
    for (const id of WORLDS) {
      const f = fugueById(id);
      const beat = beatOf(f).ticks;
      const tps = tpsOf(f);
      const base = f.bars[0]?.on ?? 0;
      for (const k of PILOT_SFX[id]) {
        const C = CURVE_SOUND[k];
        if (!C) continue;
        for (const L of C.layers)
          for (const m of L.mods) {
            if (m.t === "pulse") {
              const per = m.span === "bar" ? f.barTicks : beat * m.span;
              // each stroke's top just after its beat (or bar), and its low just before
              for (let j = 4; j < 12; j++) {
                const t = base + j * per;
                assert.ok(modAt(f, m, t + m.attack * tps, 0) > modAt(f, m, t - 0.01 * tps, 0), `${id} ${k}: a stroke on the beat at ${t}`);
              }
              assert.ok(per % beat === 0 || per === f.barTicks, `${id} ${k}: on the beat's grid`);
            }
            if (m.t === "wheel") for (let j = 4; j < 12; j++) assert.ok(Math.abs(modAt(f, m, base + (j * beat) / m.per, 0) - 1) < 1e-9, `${id} ${k}: the turn on the beat`);
            if (m.t === "grains") assert.ok(m.jit >= 0.25, `${id} ${k}: grains jittered (no regular train)`);
          }
        if (C.figure) {
          for (const on of [...new Set(f.entries.map((e) => e.on))]) {
            const h = figureOf(f, on, C.figure);
            assert.ok(h.length >= 1 && h.length <= C.figure.n && h[0] === on);
            for (let i = 1; i < h.length; i++) assert.ok((h[i] - h[i - 1]) / tps >= C.figure.minGap - 1e-9);
          }
        }
      }
    }
  });

  test("D623, D640: no pitch (noise through low-Q filters only; murmurs band-passed with a slow flutter); the rumbles under 1 s and high-passed; off by WORLD SOUNDS, STAGE QUIET/OFF, the world not shown", async () => {
    for (const [k, s] of Object.entries(SFX_SOUND)) for (const L of s!.layers) for (const [, hz, q] of L.filters) assert.ok(q <= SFX_MAX_Q && hz > 0, `${k}: Q ${q}`);
    for (const [k, s] of Object.entries(CURVE_SOUND)) {
      assert.ok(!(k in SFX_SOUND), `${k}: one engine`);
      for (const L of s!.layers) {
        for (const [, hz, q] of L.filters) assert.ok(q <= SFX_MAX_Q && hz > 0, `${k}: Q ${q}`);
        for (const m of L.mods) if (m.t === "flutter" || m.t === "gate") assert.ok(m.hz <= 5, `${k}: a slow flutter (${m.hz} Hz)`);
      }
    }
    for (const k of ["murmur", "ballroom", "court", "fair"] as const) {
      const ls = CURVE_SOUND[k]!.layers;
      assert.ok(ls.filter((L) => L.mods.some((m) => m.t === "flutter" && m.hz >= 2)).length >= 2, `${k}: syllabic flutter in two bands`);
      for (const L of ls) for (const [, , q] of L.filters) assert.ok(q <= 0.5, `${k}: band-passed, no formant`);
    }
    const r = SFX_SOUND.rumble!.layers;
    assert.ok(Math.max(...r.map((L) => L.len)) < 1, "the rumble under 1 s");
    assert.ok(r.every((L) => L.filters.filter(([t, hz]) => t === "highpass" && hz >= 300).length >= 2), "the rumble high-passed twice over the bass's fundamentals");
    const q = CURVE_SOUND.quake!.layers;
    assert.ok(Math.max(...q.map((L) => L.len ?? 1)) < 1 && q.every((L) => L.filters.filter(([t, hz]) => t === "highpass" && hz >= 250).length >= 2), "II/20's quake under 1 s, high-passed twice");
    for (const id of ["wtc2f03", "wtc1f08"]) {
      const f = fugueById(id);
      assert.equal((await sfxOf(f, PIECE_SOUND[id], false)).length, 0, "the world not shown (the tutorial's box)");
      for (const mode of ["quiet", "off"] as const) {
        saveStageMode(mode);
        assert.equal((await sfxOf(f, PIECE_SOUND[id])).length, 0, `STAGE ${mode}: silent`);
      }
      saveStageMode("full");
      setSfxOn(false);
      assert.equal((await sfxOf(f, PIECE_SOUND[id])).length, 0, "WORLD SOUNDS off");
      setSfxOn(true);
      const a = await sfxOf(f, PIECE_SOUND[id]);
      assert.ok(a.length > 30);
      assert.deepEqual(await sfxOf(f, PIECE_SOUND[id]), a, "the same every run (nothing of the player's)");
    }
    // the Sound Lab offers every world's effects (its own switch; it draws no stage)
    setSfxLab({ on: true });
    for (const id of WORLDS) assert.deepEqual(sfxKindsNow(fugueById(id), false), PILOT_SFX[id]);
    setSfxLab({ on: false });
    assert.deepEqual(sfxKindsNow(fugueById("wtc1f08"), true), []);
    setSfxLab(null);
  });
});
