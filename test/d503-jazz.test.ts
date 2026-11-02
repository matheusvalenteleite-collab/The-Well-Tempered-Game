/**
 * D503: JAZZ QUARTET, ONE OF THE GAME'S SOUNDS (the trials' MODERN JAZZ QUARTET remade): the vibraphone on top (the Iowa
 * recordings at pp, mf and ff, the motor added), the grand on the middle voices, the double bass pizzicato on the bass,
 * one club; the player's touch each instrument's own; and THE BRUSHES: a pattern per metre on the game's clock, Busoni's
 * dynamics in it, the scripted fills at the assigned fugues' structure and a generic rule for any other; never the
 * score, never a tempo change, never with another sound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { FakeAudioContext, installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, type GrooveContext } from "../src/touch/chip.ts";
import { DYNAMIC_SOUNDS, JAZZ_MOTOR, JAZZ_QUARTET_CREDIT, JAZZ_SEND, PATCHES, PRESETS, busoniReaches, creditFor, grooveNow, offered, presetById, setBacking, setDrums, setPreset } from "../src/touch/sound.ts";
import { BRUSH_FILES, BRUSH_MIDIS, BRUSH_SET, foldInto, planFor, SAMPLED, sampledMidis } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { TOUCH_KINDS, holdMode, landing, tremRate } from "../src/touch/touch-expr.ts";
import { DRUM_SCRIPTS, MIN_GAP_BARS, SWING, backbeats, brushBeat, fillsFor, genericMoments, momentsOf, type Fill } from "../src/touch/jazz-drums.ts";
import { FUGUES, beatOf, fugueById } from "../src/touch/fugue.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { styleOf } from "../src/touch/phrasing.ts";
import { slideGesture } from "../src/bench/slide-sound.ts";
import { exprFamily } from "../src/bench/glenn.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const JAZZ = presetById("jazzQuartet");

test("D503: JAZZ QUARTET offered: in the lists, an ensemble, named in three languages, credited, Busoni's dynamics reach it", () => {
  assert.ok(offered("jazzQuartet"));
  assert.equal(JAZZ.name, "JAZZ QUARTET");
  assert.ok(PRESETS.some((p) => p.id === "jazzQuartet"));
  assert.ok(POP_SOUNDS.some(([s, n]) => s === "jazzQuartet" && n === "JAZZ QUARTET"));
  assert.ok(SOUND_GROUPS.find(([g]) => g === "ENSEMBLES")![1].includes("jazzQuartet"));
  assert.equal((PT as Record<string, string>)["JAZZ QUARTET"], "QUARTETO DE JAZZ");
  assert.equal((ES as Record<string, string>)["JAZZ QUARTET"], "CUARTETO DE JAZZ");
  assert.equal(creditFor("jazzQuartet"), JAZZ_QUARTET_CREDIT);
  assert.match(JAZZ_QUARTET_CREDIT, /UNIVERSITY OF IOWA/);
  assert.match(JAZZ_QUARTET_CREDIT, /SALAMANDER/);
  assert.match(JAZZ_QUARTET_CREDIT, /SWIRLY DRUMS.*CC0/);
  assert.ok(DYNAMIC_SOUNDS.has("jazzQuartet") && busoniReaches("jazzQuartet"));
  assert.equal(TOUCH_KINDS.jazzQuartet, "jazz");
  assert.equal(exprFamily("jazzQuartet"), "plucked", "struck and plucked: one player's over-legato");
});

test("D503: the band: vibraphone on top, the grand inside, the bass on the bass; one club at one send; seated as the MJQ sat", () => {
  assert.deepEqual(JAZZ.slots, ["jqVibes", "jqPiano", "jqPiano", "jqPiano", "jqBass"]);
  for (let n = 1; n <= 5; n++) {
    const vs = JAZZ.by![n]!;
    assert.equal(vs.length, n);
    assert.equal(vs[0][0], "jqVibes", `${n}: the top voice`);
    if (n >= 2) assert.equal(vs[n - 1][0], "jqBass", `${n}: the bass voice`);
    for (const [id, pan] of vs.slice(1, -1)) assert.ok(id === "jqPiano" && pan > 0, `${n}: the middle on the piano, right`);
    for (const [, pan] of vs) assert.ok(Math.abs(pan) <= 0.22, `${n}: ${pan}`);
    if (n >= 2) assert.ok(vs[0][1] < 0, "the vibraphone left");
  }
  for (const id of ["jqVibes", "jqPiano", "jqBass"] as const) {
    assert.equal(PATCHES[id].send, JAZZ_SEND, id);
    assert.ok(PATCHES[id].one, `${id}: the player's line the band's`);
  }
  assert.equal(JAZZ.fx, "club");
  assert.equal(JAZZ.room, 0);
  const c = REVERBS.club;
  assert.ok(c.rt60 < REVERBS.salon.rt60 && c.rt60 < REVERBS.band.rt60, "short");
  assert.ok(c.lp <= REVERBS.salon.lp && c.hp <= 150, "warm, the bass's line in it");
  assert.ok((c.phoneRt60 ?? c.rt60) < c.rt60 && c.phoneSeconds < c.seconds);
  // The instruments: the vibraphone's recordings and its motor; the piano lighter, a little brighter; the bass lifted on a phone.
  assert.equal(PATCHES.jqVibes.sample, "jazzVibes");
  assert.deepEqual(PATCHES.jqVibes.motor, JAZZ_MOTOR);
  assert.ok(JAZZ_MOTOR.rate >= 2 && JAZZ_MOTOR.rate <= 6 && JAZZ_MOTOR.depth > 0.1 && JAZZ_MOTOR.depth < 0.6);
  assert.equal(PATCHES.jqPiano.sample, "piano");
  assert.ok(PATCHES.jqPiano.level < PATCHES.pianoSampled.level && PATCHES.jqPiano.shelf!.db > 0);
  assert.equal(PATCHES.jqBass.sample, "jazzBass");
  assert.ok(PATCHES.jqBass.phoneLift && PATCHES.jqBass.phoneLift.hz >= 400, "the bass's upper partials on a phone, never its fundamental");
  assert.equal(styleOf("jazzQuartet"), "plain", "the band's notes not swung (no style that moves them)");
});

test("D503: the recordings: the vibraphone C3-F6 (mf every semitone, pp and ff every whole tone), the bass E1-G4, the brushes; small", () => {
  const notes = (set: string) => SAMPLE_MANIFEST[set].notes;
  assert.equal(notes("jazzVibes").length, 42);
  assert.deepEqual([sampledMidis("jazzVibes")[0], sampledMidis("jazzVibes").at(-1)], [48, 89]);
  assert.ok(notes("jazzVibesSoft").length >= 19 && notes("jazzVibesHard").length >= 20);
  assert.equal(notes("jazzBass").length, 40);
  assert.deepEqual([sampledMidis("jazzBass")[0], sampledMidis("jazzBass").at(-1)], [28, 67]);
  assert.ok(notes("jazzBassHard").length >= 18);
  for (const m of BRUSH_MIDIS) assert.ok(sampledMidis(BRUSH_SET).includes(m), `brush ${m}`);
  assert.equal(BRUSH_FILES.tap.length, 4, "four dynamics of the brushed snare");
  let bytes = 0;
  for (const d of ["jazzVibes", "jazzVibesSoft", "jazzVibesHard", "jazzBass", "jazzBassHard", "jazzBrushes"])
    for (const f of readdirSync(new URL(`../public/samples/${d}/`, import.meta.url))) if (f !== "pack.mp3") bytes += statSync(new URL(`../public/samples/${d}/${f}`, import.meta.url)).size;
  assert.ok(bytes < 8e6, `${(bytes / 1e6).toFixed(2)} MB`);
  const lic = readFileSync(new URL("../public/samples/LICENSES.txt", import.meta.url), "utf8");
  for (const d of ["jazzVibes/", "jazzBass/", "jazzBrushes/"]) assert.ok(lic.includes(d), d);
  // The layers by level (the band's: Busoni's p and f) and their own notes in the plan.
  const v = SAMPLED.jazzVibes;
  assert.ok(v.soft && v.hard && v.soft.below < 1 && v.hard.above > 1 && v.plucked && v.pedal);
  const plan = planFor(v, [60, 64, 67, 72]);
  assert.deepEqual(plan.map((p) => p.set), ["jazzVibes", "jazzVibesSoft", "jazzVibesHard"]);
  for (const p of plan) for (const m of p.notes) assert.ok(sampledMidis(p.set).includes(m), `${p.set} ${m}`);
  // The bass folded an octave only where it leaves the compass by more than three semitones; the vibraphone likewise.
  assert.equal(foldInto("jazzBass", 26, SAMPLED.jazzBass.maxShift!), 26);
  assert.equal(foldInto("jazzBass", 22, SAMPLED.jazzBass.maxShift!), 34);
  assert.equal(foldInto("jazzBass", 70, SAMPLED.jazzBass.maxShift!), 70);
  assert.equal(foldInto("jazzVibes", 95, SAMPLED.jazzVibes.maxShift!), 83);
});

test("D503: the player's touch: LANDING the mallet, the weight, the pluck (three zones); SWAY the motor's speed; the slide the instrument's own", () => {
  const vib = PATCHES.jqVibes;
  const soft = landing("jazz", 0.1, 72, vib, false);
  const mid = landing("jazz", 0.5, 72, vib, false);
  const hard = landing("jazz", 0.9, 72, vib, false);
  assert.deepEqual([soft.layer, mid.layer, hard.layer], ["soft", "firm", "hard"]);
  assert.ok(soft.level! < mid.level! && mid.level! < hard.level! && soft.vel! < hard.vel!);
  // Busoni's line reaches it (pianoDb: the line's level about the zone).
  assert.ok(Math.abs(20 * Math.log10(landing("jazz", 0.5, 72, vib, false, { lineDb: -6 }).level!) + 6) < 1e-9);
  const pluck = landing("jazz", 0.9, 40, PATCHES.jqBass, false);
  assert.equal(pluck.layer, "hard");
  assert.deepEqual(landing("jazz", 0.2, 64, PATCHES.jqPiano, false), landing("piano", 0.2, 64, PATCHES.jqPiano, false), "the grand as the piano");
  assert.equal(holdMode("jazz", vib, true), "trem");
  assert.equal(holdMode("jazz", PATCHES.jqBass, true), "none");
  assert.equal(holdMode("jazz", PATCHES.jqPiano, true), "none");
  assert.ok(tremRate(JAZZ_MOTOR.rate, 1) > JAZZ_MOTOR.rate && tremRate(JAZZ_MOTOR.rate, -1) < JAZZ_MOTOR.rate);
  const scale = new Set([0, 2, 4, 5, 7, 9, 11]);
  const g = slideGesture("jazzQuartet", 60, 64, 600, scale, "schleifer", vib);
  assert.ok(g.kind === "notes" && g.name === "grace" && g.notes.length === 1 && g.notes[0] === 63, "the vibist's crushed grace from below");
  const b = slideGesture("jazzQuartet", 40, 43, 600, scale, "schleifer", PATCHES.jqBass);
  assert.ok(b.kind === "glide" && b.name === "slide", "the bassist's slide");
  assert.deepEqual(slideGesture("jazzQuartet", 60, 62, 600, scale, "schleifer", PATCHES.jqPiano), slideGesture("pianoSampled", 60, 62, 600, scale));
});

/** The metres of the game: name, beats a bar, the beat in threes. */
const METRES: [string, number, boolean][] = [["4/4", 4, false], ["2/2", 2, false], ["2/4", 2, false], ["3/4", 3, false], ["3/8", 3, false], ["6/8", 2, true], ["9/8", 3, true], ["12/16", 4, true], ["6/16", 2, true], ["12/8", 4, true]];

test("D503: a pattern per metre: the stir on every beat, the taps and the foot on the backbeat, the ride with its skip", () => {
  assert.deepEqual(backbeats(4), [1, 3]);
  assert.deepEqual(backbeats(3), [1, 2], "3/4: beats 2 and 3");
  assert.deepEqual(backbeats(2), [1]);
  assert.deepEqual(backbeats(1), []);
  for (const [name, per, compound] of METRES) {
    for (let b = 0; b < per; b++) {
      const bb = brushBeat(b, per, compound, 0, 960, []);
      const at = (piece: string) => bb.hits.filter((h) => h.piece === piece).map((h) => h.at);
      assert.ok(bb.sweeps.some((s) => s.piece === "stir" && s.at === 0 && s.len === 1), `${name} ${b}: the stir`);
      assert.ok(at("ride").includes(0), `${name} ${b}: the ride on the beat`);
      const back = backbeats(per).includes(b);
      assert.equal(at("tap").includes(0), back, `${name} ${b}: the tap`);
      assert.equal(at("foot").includes(0), back, `${name} ${b}: the foot`);
      // The skip: before the backbeat's next beat, swung a little in simple time, on the beat's last third in compound.
      if (back) assert.ok(at("ride").includes(compound ? 2 / 3 : SWING), `${name} ${b}: the skip`);
      for (const h of bb.hits) assert.ok(h.at >= 0 && h.at < 1 && h.vel > 0 && h.vel <= 1, `${name} ${b}: within the beat`);
      for (const s of bb.sweeps) assert.ok(s.at >= 0 && s.at + s.len <= 1, `${name} ${b}: the sweep within the beat`);
    }
  }
  assert.ok(SWING > 0.5 && SWING < 2 / 3, "the drums' own swing, subtle");
  // Every metre of the 48 fugues has its pattern.
  for (const f of FUGUES.filter((x) => /^wtc[12]f/.test(x.id))) {
    const { perBar } = beatOf(f);
    assert.ok(perBar >= 1 && perBar <= 4, `${f.id} ${f.meter}`);
  }
});

test("D503: Busoni's dynamics: quieter in his p (no skip notes), a little busier in his f (the skip on every beat, ghost taps)", () => {
  const sum = (bb: ReturnType<typeof brushBeat>) => bb.hits.reduce((a, h) => a + h.vel, 0) + bb.sweeps.reduce((a, s) => a + s.peak, 0);
  const p = brushBeat(0, 4, false, 0, 960, [], -8);
  const mf = brushBeat(0, 4, false, 0, 960, [], 0);
  const f = brushBeat(0, 4, false, 0, 960, [], 8);
  assert.ok(sum(p) < sum(mf) && sum(mf) < sum(f));
  assert.ok(!brushBeat(1, 4, false, 0, 960, [], -8).hits.some((h) => h.piece === "ride" && h.at > 0), "p: no skip");
  assert.ok(f.hits.some((h) => h.piece === "ride" && h.at > 0), "f: the skip on the downbeat too");
  assert.ok(f.hits.some((h) => h.piece === "tap" && h.at > 0 && h.vel < 0.3), "f: a ghost tap");
  assert.ok(f.sweeps[0].firm && !mf.sweeps[0].firm, "f: the firmer stir");
});

const ctxOf = (c: Chip) => c.ctx as unknown as FakeAudioContext;
test("D503: the brushes on the game's clock: each beat's hits at their place in it, exactly; only with JAZZ QUARTET", async () => {
  setPreset("jazzQuartet");
  const chip = new Chip();
  await chip.prepare([48, 60, 72], [72]);
  assert.equal(grooveNow()?.kit, "brushes");
  const cx: GrooveContext = { tick: 960 * 5, beat: 960, fills: [], end: 960 * 64 };
  const t0 = ctxOf(chip).currentTime + 1;
  const n0 = chip.brushLog.length;
  assert.equal(chip.groove(t0, 0.6, 1, 1, 4, false, cx), true);
  const log = chip.brushLog.slice(n0);
  const want = brushBeat(1, 4, false, cx.tick, cx.beat, [], 0, cx.end);
  assert.equal(log.length, want.hits.length + want.sweeps.length);
  for (const h of want.hits) assert.ok(log.some((l) => l.piece === h.piece && Math.abs(l.at - (t0 + h.at * 0.6)) < 1e-9), `${h.piece} at ${h.at}`);
  assert.ok(log.every((l) => l.at >= t0 && l.at < t0 + 0.6));
  // A slower beat (the final ritard): the same places, stretched with the clock.
  const n1 = chip.brushLog.length;
  chip.groove(t0 + 1, 0.9, 1, 1, 4, false, cx);
  const skip = chip.brushLog.slice(n1).find((l) => l.piece === "ride" && l.at > t0 + 1);
  assert.ok(skip && Math.abs(skip.at - (t0 + 1 + SWING * 0.9)) < 1e-9);
  // Another sound: no brushes (the piano has none; the chip's DRUMS are its own march, synthesized).
  for (const id of ["pianoSampled", "baroqueBand", "chip"]) {
    setPreset(id);
    setDrums(true);
    const n = chip.brushLog.length;
    chip.groove(t0 + 2, 0.6, 1, 1, 4, false, cx);
    assert.equal(chip.brushLog.length, n, id);
    assert.notEqual(grooveNow()?.kit, "brushes", id);
    setBacking(true);
    chip.groove(t0 + 3, 0.6, 1, 1, 4, false, cx);
    assert.equal(chip.brushLog.length, n, `${id} with the friends' backing`);
    setBacking(false);
  }
  setDrums(true);
  setPreset("chip");
  // Never with another sound, and always with this one (not tied to the score or a switch).
  for (const p of PRESETS) assert.equal(p.groove === "brushJazz", p.id === "jazzQuartet", p.id);
  setDrums(false);
  setPreset("jazzQuartet");
  assert.equal(grooveNow()?.kit, "brushes", "DRUMS off: still the quartet's drummer");
  setDrums(true);
  setPreset("chip");
});

/** The beats of a fugue (ticks), from its first downbeat to its end, with each beat's place in the bar. */
function beats(id: string): { f: ReturnType<typeof fugueById>; beat: number; per: number; compound: boolean; ticks: [number, number][] } {
  const f = fugueById(id);
  const { ticks: beat, perBar: per } = beatOf(f);
  const compound = beat !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const out: [number, number][] = [];
  for (let t = f.bars[0].on; t < f.length; t += beat) out.push([t, Math.round((t - f.bars[0].on) / beat) % per]);
  return { f, beat, per, compound, ticks: out };
}
const barOf = (f: ReturnType<typeof fugueById>, n: number) => f.bars.find((b) => b.n === n)!.on;

test("D503: the fills at the scripted bars: a flutter rising over the beats before, a tap and a fuller ride on the downbeat; a soft final flutter", () => {
  assert.deepEqual(DRUM_SCRIPTS.wtc1f19.map((m) => m.bar), [4, 9, 13, 20, 23, 33, 36, 42, 44, 49, 54]);
  assert.deepEqual(DRUM_SCRIPTS.wtc2f12.map((m) => m.bar), [11, 15, 24, 33, 40, 50, 54, 71, 78, 85]);
  for (const id of ["wtc1f19", "wtc2f12"]) {
    const { f, beat, per, compound, ticks } = beats(id);
    for (const m of DRUM_SCRIPTS[id]) assert.ok(m.why.length > 15, `${id} ${m.bar}: a reason`);
    // Each scripted bar at the piece's structure: a section (Ledbetter's or the game's), a cadence, an entry, the end.
    for (const m of DRUM_SCRIPTS[id]) {
      const near = (b: number) => Math.abs(b - m.bar) <= 1;
      const at = f.sections.some((s) => near(s.fromBar)) || f.cadences.some((c) => near(c.bar)) || f.entries.some((e) => near(e.bar)) || m.bar === f.bars.at(-1)!.n || /episode/.test(m.why);
      assert.ok(at, `${id} ${m.bar}`);
    }
    const fills = fillsFor(f, beat, per);
    assert.equal(fills.length, DRUM_SCRIPTS[id].length);
    for (const x of fills) {
      if (x.kind === "final") {
        assert.equal(x.at, barOf(f, f.bars.at(-1)!.n));
        const fin = ticks.filter(([t]) => t >= x.at).map(([t, b]) => brushBeat(b, per, compound, t, beat, fills, 0, f.length));
        assert.ok(fin.length >= 1 && fin.every((bb) => bb.sweeps.length === 1 && bb.sweeps[0].piece === "flutter" && !bb.hits.some((h) => h.piece === "tap")), `${id}: the final flutter`);
        assert.ok(fin.every((bb, k) => k === 0 || bb.sweeps[0].from <= fin[k - 1].sweeps[0].from), "fading");
        assert.ok(fin[0].sweeps[0].peak < 0.5, "soft");
        continue;
      }
      const roll = ticks.filter(([t]) => t >= x.from && t < x.at);
      assert.equal(roll.length, Math.round((x.at - x.from) / beat), `${id} ${x.at}: the roll's beats`);
      assert.ok(roll.length >= 1 && roll.length <= per);
      let last = 0;
      for (const [t, b] of roll) {
        const bb = brushBeat(b, per, compound, t, beat, fills, 0, f.length);
        const fl = bb.sweeps.find((s) => s.piece === "flutter");
        assert.ok(fl && !bb.sweeps.some((s) => s.piece === "stir"), `${id} ${t}: the flutter, not the stir`);
        assert.ok(fl.to > fl.from && fl.from >= last - 1e-9, `${id} ${t}: rising`);
        last = fl.to;
      }
      const [lt, lb] = ticks.find(([t]) => t === x.at) ?? [x.at, 0];
      const land = brushBeat(lb, per, compound, lt, beat, fills, 0, f.length);
      assert.ok(land.hits.some((h) => h.piece === "tap" && h.at === 0 && h.vel >= 0.55), `${id} ${x.at}: the downbeat's tap`);
      assert.ok(land.hits.some((h) => h.piece === "ride" && h.at === 0 && h.vel >= 0.55), `${id} ${x.at}: the fuller ride`);
    }
  }
  // II/12's fill into bar 15 (the first episode): its roll the whole of bar 14 (2/4: two beats), into bar 15's downbeat.
  const ii12 = fillsFor(fugueById("wtc2f12"), 1920, 2).find((x) => x.at === barOf(fugueById("wtc2f12"), 15))!;
  assert.equal(ii12.from, barOf(fugueById("wtc2f12"), 14));
  // I/19's lift into the bass's first entry (bar 4): one dotted beat of flutter.
  const i19 = fillsFor(fugueById("wtc1f19"), 2880, 3).find((x) => x.kind === "lift")!;
  assert.deepEqual([i19.at, i19.at - i19.from], [barOf(fugueById("wtc1f19"), 4), 2880]);
});

test("D503: any other fugue: the generic rule (sections, cadences, the bass's entries, the final), spaced", () => {
  for (const f of FUGUES.filter((x) => /^wtc[12]f/.test(x.id) && !DRUM_SCRIPTS[x.id])) {
    const { ticks: beat, perBar } = beatOf(f);
    const ms = momentsOf(f, beat);
    assert.deepEqual(ms, genericMoments(f, beat), f.id);
    const last = f.bars.at(-1)!.n;
    assert.equal(ms.filter((m) => m.kind === "final").length, 1, f.id);
    assert.equal(ms.find((m) => m.kind === "final")!.bar, last, f.id);
    for (let i = 1; i < ms.length; i++) assert.ok(ms[i].bar - ms[i - 1].bar >= MIN_GAP_BARS, `${f.id}: ${ms[i - 1].bar} ${ms[i].bar}`);
    for (const m of ms) assert.ok(m.why.length > 10 && m.bar >= 2 && m.bar <= last, `${f.id} ${m.bar}`);
    const fills: Fill[] = fillsFor(f, beat, perBar);
    for (const x of fills) assert.ok(x.from <= x.at && x.at <= f.length && x.from >= 0, f.id);
  }
  // A bass entering after the first bar is lifted in (I/2: the bass's entry at bar 7).
  const i2 = fugueById("wtc1f02");
  assert.ok(genericMoments(i2, beatOf(i2).ticks).some((m) => m.kind === "lift" && /bass/.test(m.why)));
});

test("D503: no tempo change: the pieces keep their tempo, the band's notes their place; the drums fit inside each beat", () => {
  for (const id of ["wtc1f19", "wtc2f12"]) {
    assert.equal(PIECE_SOUND[id], "jazzQuartet", id);
    assert.ok(tempoOf(id) > 0);
    const { f, beat, per, compound, ticks } = beats(id);
    const fills = fillsFor(f, beat, per);
    for (const [t, b] of ticks) {
      const bb = brushBeat(b, per, compound, t, beat, fills, 0, f.length);
      for (const h of bb.hits) assert.ok(h.at >= 0 && h.at < 1, `${id} ${t}`);
      for (const s of bb.sweeps) assert.ok(s.at >= 0 && s.at + s.len <= 1, `${id} ${t}`);
    }
  }
  // The preset carries no tempo, no swing of the written notes, no step of its own.
  assert.deepEqual(Object.keys(JAZZ).sort(), ["by", "fx", "groove", "id", "kit", "name", "phoneGain", "room", "slots"]);
});

test("D503: the allocation: I/19 and II/12 open on JAZZ QUARTET, with their reasons", () => {
  assert.equal(PIECE_SOUND.wtc1f19, "jazzQuartet");
  assert.equal(PIECE_SOUND.wtc2f12, "jazzQuartet");
  assert.match(COLOURS.wtc1f19.soundWhy, /^Delicate 9\/8 scherzo: the Modern Jazz Quartet played Bach/);
  assert.match(COLOURS.wtc2f12.soundWhy, /^Caprice and humour, swung by the vibes/);
});
