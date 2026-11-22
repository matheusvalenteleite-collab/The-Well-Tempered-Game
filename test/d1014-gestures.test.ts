/**
 * D1014-D1017, EACH INSTRUMENT ITS OWN HOLD (and PSYCH's synthesizer and Moog their own slide). D1014 the guitarist's finger
 * vibrato, D1015 GAME BOY's duty step, D1016 the bow's contact point in place of the strings' messa, D1017 PSYCH's slide.
 *   - the rendered measurements (tools/touch/gesture: render.cjs on the code before and this code, the phone path, the
 *     player's line scripted; collect.py into fixtures/d1014-gestures.json): the gesture's loudness on the player's voice
 *     within ±0.5 LU of the thumb still, each note's mean pitch within a few cents, a still thumb's render as before;
 *   - the engine (the fake context): what a held note does when swayed and when not;
 *   - the families: every offered sound's patch holds and slides as before (fixtures/d1014-families-before.json, from the
 *     code before), but the four items' own.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeAudioContext, FakeNode, FakeParam, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing, type Play, type Sounding } from "../src/touch/chip.ts";
import { PATCHES, PRESETS, setPreset, type Patch } from "../src/touch/sound.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { SETTLE_CENTS, SETTLE_SHARE, settleTau, slideFamily, slideGesture } from "../src/bench/slide-sound.ts";
import { BOW_DB, BOW_TONE_DB, BOWED_SAMPLES, DUTY_TRIM_DB, dutyGain, dutyWaveAt, fingerVib, GUITAR_SAMPLES, GUITAR_VIB, holdMode, pulseRms, touchKind } from "../src/touch/touch-expr.ts";

const MEASURED: Record<string, { sound: string; gesture: string; gesture_lu: { before: number; after: number }; timbre_db: { before: number; after: number }; pitch: { per_note_mean_max_abs: number } | null; still_max_diff?: number; slides?: { scripted: number; played: number; slid_note_mean_max_abs_cents: number } }> = JSON.parse(
  readFileSync(new URL("./fixtures/d1014-gestures.json", import.meta.url), "utf8"),
);
const FAST: Record<string, { semiquavers: number; reach_share_median: number; over_third: number; mean_cents_abs_median: number }> = JSON.parse(readFileSync(new URL("./fixtures/d1018-fast-glide.json", import.meta.url), "utf8"));
const BEFORE: Record<string, string> = JSON.parse(readFileSync(new URL("./fixtures/d1014-families-before.json", import.meta.url), "utf8"));

const ctxOf = installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const DOWN = 1;
interface Struck {
  sd: Sounding;
  made: FakeNode[];
  ctx: FakeAudioContext;
  waves: string[];
}
/** The player's note struck on a preset's voice (`count` voices), landed at the bar's middle; its nodes and the waves asked for after it. */
async function strike(presetId: string, voice: number, count: number, midi: number, play: Play = {}): Promise<Struck> {
  setPreset(presetId);
  const chip = new Chip();
  const waves: string[] = [];
  const c = chip as unknown as { wave: (t: string) => unknown };
  const wave0 = c.wave.bind(chip);
  c.wave = (t: string) => (waves.push(t), wave0(t));
  await chip.prepare([midi, midi - 12, midi + 12], [midi]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(voice, count, true));
  const before = new Set(ctx.nodes);
  const sd = chip.note(midi, DOWN, 2, voicing(voice, count, true), { lead: true, legato: false, touch: 0.5, ...play });
  waves.length = 0;
  return { sd, made: [...ctx.nodes].filter((x) => !before.has(x)), ctx, waves };
}
/** Every automation event on the note's params (a count: unchanged means nothing moved). */
const events = (s: Struck, only?: (k: string) => boolean) => s.made.reduce((n, x) => n + Object.entries(x).filter(([k, v]) => v instanceof FakeParam && (!only || only(k))).reduce((m, [, v]) => m + (v as FakeParam).events.length, 0), 0);
const pitchEvents = (s: Struck) => events(s, (k) => k === "detune" || k === "frequency" || k === "playbackRate");

// ---- The rendered measurements ----

test("D1014-D1017: the gestures rendered: the player's loudness within ±0.5 LU of the thumb still, each note's pitch its own, a still thumb as before", () => {
  const items = { finger: ["finger-psych", "finger-bossa"], duty: ["duty-gb-lead", "duty-gb-thin"], bow: ["bow-consort-violin", "bow-consort-cello", "bow-baroque-violin"], slide: ["slide-psych-moog", "slide-psych-synth"] };
  for (const names of Object.values(items)) for (const k of names) assert.ok(MEASURED[k], k);
  for (const [k, m] of Object.entries(MEASURED)) {
    assert.ok(Math.abs(m.gesture_lu.after) <= 0.5, `${k}: the gesture ${m.gesture_lu.after} LU`);
    if (m.slides) {
      // D1017: every scripted slide played; the slid note on its written pitch once the glide is done (within 6 cents: the synth's own drift is ±3).
      assert.equal(m.slides.played, m.slides.scripted, k);
      assert.ok(m.slides.slid_note_mean_max_abs_cents <= 6, `${k}: ${m.slides.slid_note_mean_max_abs_cents} cents`);
      continue;
    }
    // The swayed notes' mean pitch, after against before, within 3 cents on every note (the vibrato symmetric; the duty and the bow no pitch).
    assert.ok(m.pitch && m.pitch.per_note_mean_max_abs <= 3, `${k}: ${m.pitch?.per_note_mean_max_abs} cents`);
    // The thumb still: the render as the code before made it (within two 16-bit steps: the idle vibrato's nodes' rounding).
    assert.ok(m.still_max_diff !== undefined && m.still_max_diff <= 2, `${k}: still ${m.still_max_diff}`);
    // And the gesture is heard: its timbre moves more than the code before's under the same gesture.
    assert.ok(m.timbre_db.after > m.timbre_db.before + 0.3, `${k}: timbre ${m.timbre_db.before} → ${m.timbre_db.after} dB`);
  }
  // D1016: the strings' messa was a level on the player's voice; the bow's contact point is not.
  for (const k of items.bow) assert.ok(MEASURED[k].gesture_lu.before >= 0.8 && Math.abs(MEASURED[k].gesture_lu.after) <= 0.5, k);
});

// ---- The families: nothing else changed ----

test("D1014-D1017: every offered sound's patches hold and slide as before, but the four items' own", () => {
  const changed: Record<string, string> = {
    // D1014: the fretted, plucked strings.
    "abbeyRoad:a2Guitar": "finger/bass",
    "bossaNova:b2Guitar": "finger/plucked",
    "chorinho:c27": "finger/plucked",
    "chorinho:c2Bandolim": "finger/piano",
    "chorinho:c2Cavaco": "finger/plucked",
    "krautrock:k2Clean": "finger/bass",
    "krautrock:k2Fuzz": "finger/bass",
    "salsa:s2Tres": "finger/plucked",
    // D1015: GAME BOY's pulses (its wave and saw channels keep the vibrato).
    "gameboy:gbHarm": "duty/slide8",
    "gameboy:gbLead": "duty/slide8",
    "gameboy:gbThin": "duty/slide8",
    // D1016: the bowed strings that swelled (the messa); BAROQUE BAND's oboe keeps it.
    "baroqueBand:bandCello": "bow/bowed",
    "baroqueBand:bandViola": "bow/bowed",
    "baroqueBand:bandViolin": "bow/bowed",
    "orchestraOrgan:orCello": "bow/bowed",
    "orchestraOrgan:orViola": "bow/bowed",
    "orchestraOrgan:orViolin1": "bow/bowed",
    "orchestraOrgan:orViolin2": "bow/bowed",
    "stringConsort:consCello": "bow/bowed",
    "stringConsort:consViola": "bow/bowed",
    "stringConsort:consViolin": "bow/bowed",
    // D1017: PSYCH's synthesizer a synthesizer's slide, its Moog the bassist's.
    "krautrock:k2Moog": "breath/bass",
    "krautrock:k2Synth": "breath/synth",
  };
  const now: Record<string, string> = {};
  for (const p of PRESETS) {
    const k = touchKind(p.id);
    const names = new Set<string>([...(p.slots ?? []), ...Object.values(p.by ?? {}).flat().map((x) => (x as unknown as readonly [string])[0])]);
    for (const n of names) {
      const pt = (PATCHES as Record<string, Patch | undefined>)[n];
      if (!pt) continue;
      const inst = pt.sample ? SAMPLED[pt.sample] : null;
      const plucked = inst ? inst.plucked : pt.amp.s === 0;
      now[`${p.id}:${n}`] = `${k ? holdMode(k, pt, plucked, p.id) : "-"}/${slideFamily(p.id, pt)}`;
    }
  }
  assert.deepEqual(Object.keys(now).sort(), Object.keys(BEFORE).sort(), "the same line-ups as the snapshot");
  for (const [key, was] of Object.entries(BEFORE)) assert.equal(now[key], changed[key] ?? was, key);
  for (const key of Object.keys(changed)) assert.notEqual(BEFORE[key], changed[key], `${key} changed`);
  // The scopes by recording: the guitars' and the bowed strings', no other.
  for (const s of GUITAR_SAMPLES) assert.ok(SAMPLED[s as keyof typeof SAMPLED]?.plucked, s);
  for (const s of BOWED_SAMPLES) assert.ok(SAMPLED[s as keyof typeof SAMPLED] && !SAMPLED[s as keyof typeof SAMPLED].plucked, s);
  // The other chips, the classic CHIP's pulse voices (no patch) among them, keep the vibrato.
  assert.equal(holdMode("chip", PATCHES.gbLead, false, "sid64"), "vibrato");
  assert.equal(holdMode("chip", null, false, "chip"), "vibrato");
});

// ---- D1014: the finger vibrato ----

test("D1014: a held guitar note: no vibrato still; swayed either way, up to GUITAR_VIB.cents, symmetric about its pitch", async () => {
  assert.equal(fingerVib(0), 0);
  assert.equal(fingerVib(1), GUITAR_VIB.cents);
  assert.equal(fingerVib(-1), GUITAR_VIB.cents);
  assert.equal(fingerVib(-0.5), fingerVib(0.5));
  // PSYCH's clean guitar (five voices: the third).
  const s = await strike("krautrock", 2, 5, 64);
  const lfo = s.made.find((n) => n.kind === "oscillator" && Math.abs((n.frequency as FakeParam).value - GUITAR_VIB.rate) < 1e-9);
  assert.ok(lfo, "the finger's LFO");
  const depth = lfo.targets[0] as FakeNode;
  const d = depth.gain as FakeParam;
  for (let t = DOWN; t < DOWN + 2; t += 0.05) assert.equal(d.valueAt(t), 0, "still: none");
  const gains = () => s.made.filter((x) => x.kind === "gain" && x !== depth).map((x) => (x.gain as FakeParam).events.length);
  const g0 = gains();
  s.ctx.advance(DOWN + 0.2);
  s.sd.shape?.(0.8);
  // The note's mean pitch while swayed: the depth times the LFO's sine, averaged over the note (cents).
  let sum = 0, n = 0;
  for (let t = DOWN; t < DOWN + 2; t += 0.0005) (sum += d.valueAt(t) * Math.sin(2 * Math.PI * GUITAR_VIB.rate * (t - DOWN))), n++;
  assert.ok(d.valueAt(DOWN + 1) > 0.9 * fingerVib(0.8), "the vibrato's depth the sway's");
  assert.ok(Math.abs(sum / n) < 1.5, `mean ${(sum / n).toFixed(2)} cents`);
  // Back still: the vibrato goes.
  s.ctx.advance(DOWN + 1.2);
  s.sd.shape?.(0);
  assert.ok(d.valueAt(DOWN + 1.9) < 0.5);
  // No level: no gain but the depth's moves.
  assert.deepEqual(gains(), g0);
});

// ---- D1015: the duty step ----

test("D1015: GAME BOY's held pulse steps its duty a third at a time, the RMS kept and each width's loudness trimmed; still, nothing", async () => {
  // From the 25% pulse: a third toward the strong side the 12.5%, toward the soft side the square; from a reading's own step, likewise.
  assert.equal(dutyWaveAt("pulse25", 0.5, 0), "pulse25");
  assert.equal(dutyWaveAt("pulse25", 0.5, 1), "pulse12");
  assert.equal(dutyWaveAt("pulse25", 0.5, -1), "pulse50");
  assert.equal(dutyWaveAt("pulse50", 0.5, 1), "pulse25");
  assert.equal(dutyWaveAt("pulse12", 0.5, 1), "pulse12");
  assert.equal(dutyWaveAt("pulse25", 0.5, 0.2), "pulse25", "within its third: no step");
  // The gain: the landing's RMS rule and the measured trims (the thin pulse 3.1 LU louder at equal RMS, the square 1.9 quieter).
  assert.equal(dutyGain(0.25, "pulse25", "pulse25"), 1);
  assert.ok(Math.abs(dutyGain(0.25, "pulse12", "pulse25") - (pulseRms(0.25) / pulseRms(0.125)) * 10 ** (DUTY_TRIM_DB.pulse12 / 20)) < 1e-12);
  assert.ok(DUTY_TRIM_DB.pulse12 < 0 && DUTY_TRIM_DB.pulse50 > 0 && DUTY_TRIM_DB.pulse25 === 0);
  const s = await strike("gameboy", 0, 4, 72);
  const p0 = pitchEvents(s);
  const g0 = events(s);
  s.ctx.advance(DOWN + 0.2);
  s.sd.shape?.(0);
  s.sd.shape?.(0.2);
  assert.deepEqual(s.waves, [], "no step within the landing's third");
  s.sd.shape?.(1);
  s.sd.shape?.(-1);
  assert.deepEqual(s.waves, ["pulse12", "pulse50"]);
  assert.ok(events(s) > g0, "the gain follows the width");
  // The vibrato: the patch's own, whatever the sway (the depth set as a still thumb's, once).
  const vib = s.made.find((n) => n.kind === "oscillator" && Math.abs((n.frequency as FakeParam).value - (PATCHES.gbLead.vib?.rate ?? 0)) < 1e-9);
  const depth = (vib?.targets[0] as FakeNode | undefined)?.gain as FakeParam | undefined;
  if (depth) assert.ok(Math.abs(depth.valueAt(DOWN + 1.5) - (PATCHES.gbLead.vib?.depth ?? 0)) < 0.5);
  // No pitch moved by the sway but the vibrato's own depth.
  assert.ok(pitchEvents(s) - p0 <= 1);
  // GAME BOY's wave channel keeps the vibrato.
  assert.equal(holdMode("chip", PATCHES.gbWave, false, "gameboy"), "vibrato");
});

// ---- D1016: the bow's contact point ----

test("D1016: a held bowed note swayed moves the bow: brighter toward the bridge, its level against it (no messa); still, nothing", async () => {
  const s = await strike("stringConsort", 0, 3, 76);
  const shelf = s.made.find((n) => n.kind === "filter" && (n as unknown as { type: string }).type === "highshelf" && (n.gain as FakeParam).value === 0 && (n.gain as FakeParam).events.length === 0);
  assert.ok(shelf, "the bow's shelf");
  const gain = s.made.find((n) => n.kind === "gain" && n.targets.includes(shelf));
  assert.ok(gain, "the bow's level, before the shelf");
  const g = gain.gain as FakeParam, sh = shelf.gain as FakeParam;
  const p0 = pitchEvents(s);
  for (let t = DOWN; t < DOWN + 2; t += 0.1) assert.ok(g.valueAt(t) === 1 && sh.valueAt(t) === 0, "still: as it was");
  s.ctx.advance(DOWN + 0.3);
  s.sd.shape?.(1);
  assert.ok(Math.abs(sh.valueAt(DOWN + 1) - BOW_TONE_DB) < 0.01, "toward the bridge: brighter");
  assert.ok(Math.abs(20 * Math.log10(g.valueAt(DOWN + 1)) - BOW_DB) < 0.01, "its loudness taken back");
  s.ctx.advance(DOWN + 1.1);
  s.sd.shape?.(-1);
  assert.ok(Math.abs(sh.valueAt(DOWN + 1.9) + BOW_TONE_DB) < 0.01, "toward the fingerboard: darker");
  assert.ok(BOW_DB < 0 && Math.abs(BOW_DB) <= 2, "the level only against the shelf's own loudness (D508)");
  assert.equal(pitchEvents(s), p0, "no pitch");
});

// ---- D1017: PSYCH's slide ----

test("D1017: PSYCH's synthesizer slides as a synthesizer, its Moog as a bassist; no grace notes, the guitars and Mellotron as before", () => {
  const key = new Set([0, 2, 4, 5, 7, 9, 11]);
  assert.equal(slideFamily("krautrock", PATCHES.k2Synth), "synth");
  assert.equal(slideFamily("krautrock", PATCHES.k2Moog), "bass");
  assert.equal(slideFamily("krautrock", PATCHES.k2Organ), "organ");
  for (const [from, to] of [[60, 62], [60, 64], [60, 67], [67, 60]]) {
    const syn = slideGesture("krautrock", from, to, 600, key, "schleifer", PATCHES.k2Synth);
    assert.equal(syn.kind, "glide", `synth ${from}->${to}`);
    const moog = slideGesture("krautrock", from - 24, to - 24, 600, key, "schleifer", PATCHES.k2Moog);
    // A step glided; wider, struck afresh (no grace notes: an empty pluck).
    if (Math.abs(to - from) <= 2) assert.equal(moog.kind, "glide");
    else assert.deepEqual(moog, { kind: "notes", name: "pluck", notes: [], eachS: 0 });
  }
  assert.equal(slideFamily("krautrock", PATCHES.k2Clean), "bass");
  assert.equal(slideFamily("krautrock", PATCHES.k2Tron), "bass");
});

// ---- D1018: the glide settled within a third of the note ----

test("D1018: PSYCH's glides settle on the written pitch within a third of the note, however quick; the other sounds' as they were", () => {
  const key = new Set([0, 2, 4, 5, 7, 9, 11]);
  // The cap: from the note slid from to within SETTLE_CENTS by SETTLE_SHARE of the note (an exponential approach).
  for (const [from, to, ms] of [[60, 62, 188], [60, 64, 188], [60, 62, 500], [48, 50, 120]]) {
    const tau = settleTau(from, to, ms);
    assert.ok(Math.abs((to - from) * 100 * Math.exp(-(SETTLE_SHARE * ms) / 1000 / tau) - SETTLE_CENTS) < 1e-6);
    const g = slideGesture("krautrock", from, to, ms, key, "schleifer", PATCHES.k2Synth);
    assert.ok(g.kind === "glide" && g.tau <= Math.max(0.008, tau) + 1e-12, `${from}->${to} ${ms} ms`);
  }
  // A long note keeps D486's 40 ms; SWITCHED-ON (the same family) is not capped.
  const long = slideGesture("krautrock", 60, 62, 1200, key, "schleifer", PATCHES.k2Synth);
  assert.ok(long.kind === "glide" && Math.abs(long.tau - 0.04) < 1e-9);
  const sw = slideGesture("analog", 60, 62, 188, key);
  assert.ok(sw.kind === "glide" && Math.abs(sw.tau - 0.04) < 1e-9);
  // Rendered (BWV 789 b. 16, the synthesizer's semiquavers, every one slid): the uncapped glide smeared every note past a third.
  assert.equal(FAST.uncapped.over_third, FAST.uncapped.semiquavers);
  assert.ok(FAST.after.over_third <= 2 && FAST.after.reach_share_median <= 1 / 3, JSON.stringify(FAST.after));
  assert.ok(FAST.after.mean_cents_abs_median < FAST.uncapped.mean_cents_abs_median / 2);
});
