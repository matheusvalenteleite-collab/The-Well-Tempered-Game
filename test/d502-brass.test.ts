/**
 * D502, BACH BRASS: the preset (a brass choir: trumpets, horn, trombones, one church, narrow seats), its recordings
 * (University of Iowa MIS, two dynamic layers, every minor third), the folds where a voice leaves an instrument's
 * compass, the player's freedom (the landing as brassiness, a held sway as a swell, the join re-tongued, the slur, the
 * lip slur), Busoni's levels as brassiness, the bass clean and tight (its release, its room, a phone's high-pass and
 * lift), the allocation (I/5, II/5).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { FakeAudioContext, FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing } from "../src/touch/chip.ts";
import { BRASS_BASS_PHONE_HP, BRASS_BASS_PHONE_LIFT, BRASS_BASS_R, BRASS_BASS_SEND, BRASS_CREDIT, BRASS_SEND, BRASS_TONGUE, DYNAMIC_SOUNDS, PATCHES, PRESETS, bowEntry, creditFor, offered, presetById, sampledNow, setPreset } from "../src/touch/sound.ts";
import { BRASS_FOLDERS, PERIOD, SAMPLED, foldInto, folderOf, sampledMidis } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { BRASS_DB_SPAN, BRASS_EDGE, BRASS_LEVEL_DB, BRASS_SWELL_DB, BRASS_SWELL_MOVE, TOUCH_KINDS, brassEdgeDb, brassLevelDb, brassMix, brassOf, holdMode, landing, swellBrass, swellGain } from "../src/touch/touch-expr.ts";
import { exprFamily, joinedSound, touchFamily } from "../src/bench/glenn.ts";
import { slideFamily, slideGesture } from "../src/bench/slide-sound.ts";
import { instrumentTuning } from "../src/touch/instrument-tuning.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { fugueById } from "../src/touch/fugue.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4.3 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;
const setPhone = (on: boolean) => Object.defineProperty(globalThis, "navigator", { value: { maxTouchPoints: on ? 5 : 0, userAgent: on ? "iPhone" : "node" }, configurable: true, writable: true });

const LAYOUT = {
  1: ["bachTrumpet"],
  2: ["bachTrumpet", "bachBass"],
  3: ["bachTrumpet", "bachHorn", "bachBass"],
  4: ["bachTrumpet", "bachTrumpet", "bachHorn", "bachBass"],
  5: ["bachTrumpet", "bachTrumpet", "bachHorn", "bachTrombone", "bachBass"],
} as const;

test("D502: BACH BRASS offered: an ensemble, named in three languages, credited (Iowa MIS), the trial's id opens on it", () => {
  assert.ok(offered("bachBrass"));
  const p = presetById("bachBrass");
  assert.equal(p.name, "BACH BRASS");
  // (D503: JAZZ QUARTET, D523: ABBEY ROAD and D525: KRAUTROCK after it.)
  assert.equal(PRESETS.at(-4)!.id, "bachBrass");
  assert.ok(POP_SOUNDS.some(([s, n]) => s === "bachBrass" && n === "BACH BRASS"));
  assert.ok(SOUND_GROUPS.find(([g]) => g === "ENSEMBLES")![1].includes("bachBrass"));
  assert.equal(PT["BACH BRASS"], "METAIS DE BACH");
  assert.equal(ES["BACH BRASS"], "METALES DE BACH");
  assert.equal(creditFor("bachBrass"), BRASS_CREDIT);
  assert.match(BRASS_CREDIT, /UNIVERSITY OF IOWA/);
  assert.equal(presetById("trialBrass").id, "bachBrass");
  assert.ok(DYNAMIC_SOUNDS.has("bachBrass"), "Busoni's dynamics reach it (EXPRESSIVE_ALL)");
  assert.deepEqual(instrumentTuning("bachBrass"), { id: "vallotti", a: 415 });
});

test("D502: the layouts (2 trumpet and bass; 3 the horn between; 4 a second trumpet; 5 the trombone), seated within ±0.2, one church", () => {
  const p = presetById("bachBrass");
  assert.equal(p.fx, "cathedral");
  for (const [n, ids] of Object.entries(LAYOUT)) {
    const vs = p.by![Number(n) as 1]!;
    assert.deepEqual(vs.map(([id]) => id), ids, n);
    for (const [id, pan] of vs) assert.ok(Math.abs(pan) <= 0.2, `${n} ${id} ${pan}`);
    // The trumpets left of the bass (the choir's seats: trumpets left, low brass right of centre).
    if (vs.length > 1) assert.ok(vs[0][1] < vs.at(-1)![1], n);
  }
  // One room: every upper player the same send, the bass less (the owner: "taking up a lot of air").
  for (const id of ["bachTrumpet", "bachHorn", "bachTrombone"] as const) assert.equal(PATCHES[id].send, BRASS_SEND, id);
  assert.equal(PATCHES.bachBass.send, BRASS_BASS_SEND);
  assert.ok(BRASS_BASS_SEND < BRASS_SEND && BRASS_SEND <= 0.15, "a modest send, the bass drier");
  // One envelope for the family; the bass let go sooner.
  for (const id of ["bachTrumpet", "bachHorn", "bachTrombone"] as const) assert.deepEqual(PATCHES[id].rec, PATCHES.bachTrumpet.rec, id);
  assert.equal(PATCHES.bachBass.rec!.r, BRASS_BASS_R);
  assert.ok(BRASS_BASS_R < PATCHES.bachTrumpet.rec!.r);
  for (const id of ["bachTrumpet", "bachHorn", "bachTrombone", "bachBass"] as const) assert.ok(PATCHES[id].one, `${id}: the player's line the band's`);
});

test("D502: the recordings: two layers per instrument at the same pitches, every minor third, looped, 16 bits, about 4 MB", () => {
  setPreset("bachBrass");
  assert.deepEqual(sampledNow().sort(), ["brassBass", "brassHorn", "brassTrombone", "brassTrumpet"]);
  for (const s of sampledNow()) {
    const inst = SAMPLED[s];
    assert.ok(inst.blend, s);
    const f = sampledMidis(inst.set);
    assert.deepEqual(sampledMidis(inst.blend!.set), f, `${s}: the layers' pitches`);
    for (let i = 1; i < f.length; i++) assert.ok(f[i] - f[i - 1] <= 4, `${s}: a gap ${f[i - 1]}-${f[i]}`);
    for (const set of [inst.set, inst.blend!.set]) {
      assert.ok(PERIOD[set].loop && PERIOD[set].bits === 16 && PERIOD[set].rate === 32000, set);
      assert.equal(folderOf(set), set);
    }
  }
  let bytes = 0;
  for (const f of BRASS_FOLDERS) bytes += Object.values(SAMPLE_MANIFEST[f].pack).reduce((a, [, n]) => a + n, 0);
  assert.ok(bytes < 6e6, `${bytes}`);
  setPreset("chip");
});

test("D502: the compass and the folds (an octave nearer only past 3 semitones of the recordings); I/5 and II/5 unfolded", () => {
  const inst = (id: keyof typeof PATCHES) => SAMPLED[PATCHES[id].sample!];
  const fold = (id: keyof typeof PATCHES, m: number) => foldInto(inst(id).set, m, inst(id).maxShift!);
  // The trumpet E3-C#6 recorded: C#3 to E6 kept, past them an octave nearer.
  assert.equal(fold("bachTrumpet", 49), 49);
  assert.equal(fold("bachTrumpet", 48), 60);
  assert.equal(fold("bachTrumpet", 88), 88);
  assert.equal(fold("bachTrumpet", 89), 77);
  // The horn F2-F5: D2 to G#5.
  assert.equal(fold("bachHorn", 38), 38);
  assert.equal(fold("bachHorn", 37), 49);
  assert.equal(fold("bachHorn", 81), 69);
  // The bass Bb1-G4 (the bass trombone throughout): G1 to A#4.
  assert.equal(fold("bachBass", 31), 31);
  assert.equal(fold("bachBass", 30), 42);
  assert.equal(fold("bachBass", 70), 70);
  assert.equal(fold("bachBass", 71), 59);
  // The two pieces that open on it: every note in its instrument's compass.
  const p = presetById("bachBrass");
  for (const id of ["wtc1f05", "wtc2f05"]) {
    const f = fugueById(id);
    const lay = p.by![f.voices.length as 4]!;
    f.voices.forEach((vs, v) => {
      const pid = lay[v][0] as keyof typeof PATCHES;
      for (const n of vs) assert.equal(fold(pid, n[2]), n[2], `${id} voice ${v} ${n[2]}`);
    });
  }
});

test("D502: the landing across the strip is brassiness: mellow (the piano layer, darker) to blazing (the forte, a presence shelf), continuous", () => {
  assert.equal(TOUCH_KINDS.bachBrass, "brass");
  const at = (x: number, lineDb?: number) => landing("brass", x, 72, PATCHES.bachTrumpet, false, lineDb === undefined ? {} : { lineDb });
  assert.equal(at(0).brass, 0);
  assert.equal(at(1).brass, 1);
  assert.equal(at(0.5).brass, 0.5);
  let last = -1;
  for (let x = 0; x <= 1.0001; x += 0.05) {
    const b = at(x).brass!;
    assert.ok(b > last, `monotone at ${x}`);
    last = b;
  }
  // Equal power: the two layers' powers sum to one everywhere; the soft side the piano layer alone, the strong the forte.
  for (let b = 0; b <= 1.0001; b += 0.1) {
    const m = brassMix(b);
    assert.ok(Math.abs(m.forte ** 2 + m.piano ** 2 - 1) < 1e-9);
  }
  assert.deepEqual(brassMix(0), { forte: 0, piano: 1 });
  assert.ok(brassMix(1).forte === 1 && brassMix(1).piano < 1e-9);
  // The presence shelf: darker toward the soft side, the edge toward the strong; nothing at the middle; gentle.
  assert.equal(brassEdgeDb(0), BRASS_EDGE.soft);
  assert.equal(brassEdgeDb(0.5), 0);
  assert.equal(brassEdgeDb(1), BRASS_EDGE.strong);
  assert.ok(BRASS_EDGE.soft < 0 && BRASS_EDGE.strong > 0 && BRASS_EDGE.strong <= 4);
  // A little level with it (a brass player blows harder for the edge), small: at most 2 dB either way.
  assert.ok(Math.abs(20 * Math.log10(at(0).level!) - BRASS_LEVEL_DB[0]) < 1e-9);
  assert.ok(Math.abs(20 * Math.log10(at(1).level!) - BRASS_LEVEL_DB[1]) < 1e-9);
  assert.ok(Math.abs(BRASS_LEVEL_DB[0]) <= 2 && Math.abs(BRASS_LEVEL_DB[1]) <= 2);
  assert.equal(brassLevelDb(0.5), (BRASS_LEVEL_DB[0] + BRASS_LEVEL_DB[1]) / 2);
  // Busoni's printed level moves it too: an f brighter, a p mellower (the band's and the player's alike).
  assert.equal(at(0.5, BRASS_DB_SPAN / 4).brass, 0.75);
  assert.equal(at(0.5, -BRASS_DB_SPAN / 4).brass, 0.25);
  assert.equal(brassOf(0.5, 6), 1);
  assert.equal(brassOf(0.5, -60), 0);
});

test("D502: the sway while holding is a swell (±4 dB), the brightness following", () => {
  assert.equal(holdMode("brass", PATCHES.bachTrumpet, false), "swell");
  assert.equal(BRASS_SWELL_DB, 4);
  assert.ok(Math.abs(20 * Math.log10(swellGain(1)) - 4) < 1e-9);
  assert.ok(Math.abs(20 * Math.log10(swellGain(-1)) + 4) < 1e-9);
  assert.equal(swellGain(0), 1);
  assert.ok(Math.abs(20 * Math.log10(swellGain(5)) - 4) < 1e-9, "bounded");
  assert.equal(swellBrass(0.5, 1), 0.5 + BRASS_SWELL_MOVE);
  assert.equal(swellBrass(0.5, -1), 0.5 - BRASS_SWELL_MOVE);
  assert.equal(swellBrass(0.9, 1), 1);
  assert.equal(swellBrass(0.4, 0), 0.4);
});

test("D502: through the chip: the layers crossfaded by the landing and by the band's level; the swell moves them; the shelf", async () => {
  setPhone(false);
  setPreset("bachBrass");
  const chip = new Chip();
  await chip.prepare([55, 60, 64, 67, 72, 76], [72]);
  const fresh = (f: () => unknown) => {
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    const r = f();
    return { r, nodes: [...ctx.nodes].filter((x) => !before.has(x)) };
  };
  const layerGains = (nodes: unknown[]) =>
    nodes.filter((x) => x instanceof FakeSource && (x as FakeSource).kind === "buffer" && (x as FakeSource).startAt !== null).map((s) => (((s as FakeNode).targets[0] as FakeNode).gain as FakeParam).value);
  const shelves = (nodes: unknown[]) => nodes.filter((x) => (x as FakeNode).kind === "filter" && (x as FakeNode).type === "highshelf").map((x) => [((x as FakeNode).frequency as FakeParam).value, ((x as FakeNode).gain as FakeParam).value]);
  // The band's note: its brassiness from its reading's level (Play.vel): ff the forte alone, pp the piano layer.
  let g = layerGains(fresh(() => chip.note(72, 1, 1, voicing(0, 4), { vel: 6 })).nodes);
  assert.equal(g.length, 2, "two layers");
  assert.ok(Math.abs(g[0] - 1) < 1e-9 && g[1] < 1e-9, `${g}`);
  g = layerGains(fresh(() => chip.note(72, 2, 1, voicing(0, 4), { vel: -6 })).nodes);
  assert.ok(g[0] < 1e-9 && Math.abs(g[1] - 1) < 1e-9, `${g}`);
  g = layerGains(fresh(() => chip.note(72, 3, 1, voicing(0, 4), {})).nodes);
  assert.ok(Math.abs(g[0] - Math.SQRT1_2) < 1e-9 && Math.abs(g[1] - Math.SQRT1_2) < 1e-9, `${g}`);
  // The player's landing: the soft side the piano layer and the darker shelf; the strong the forte and the edge.
  const soft = fresh(() => chip.note(72, 4, 1, voicing(0, 4), { lead: true, touch: 0 }));
  g = layerGains(soft.nodes);
  assert.ok(g[0] < 1e-9 && Math.abs(g[1] - 1) < 1e-9, `${g}`);
  assert.ok(shelves(soft.nodes).some(([hz, db]) => hz === BRASS_EDGE.hz && db === BRASS_EDGE.soft));
  const strong = fresh(() => chip.note(72, 5, 1, voicing(0, 4), { lead: true, touch: 1 }));
  assert.ok(shelves(strong.nodes).some(([hz, db]) => hz === BRASS_EDGE.hz && db === BRASS_EDGE.strong));
  // The swell: the held note swayed toward the strong side: the crossfade moves toward the forte.
  const mid = fresh(() => chip.note(72, 6, 2, voicing(0, 4), { lead: true, touch: 0.5 }));
  const sd = mid.r as { shape?: (s: number) => void };
  assert.ok(sd.shape, "the held note answers the sway");
  const srcs = mid.nodes.filter((x) => x instanceof FakeSource && (x as FakeSource).kind === "buffer" && (x as FakeSource).startAt !== null);
  const [fg, pg] = srcs.map((s) => ((s as FakeNode).targets[0] as FakeNode).gain as FakeParam);
  sd.shape!(1);
  const last = (p: FakeParam) => p.events.filter((e) => e.type === "target").at(-1)!.v;
  const want = brassMix(swellBrass(0.5, 1));
  assert.ok(Math.abs(last(fg) - want.forte) < 1e-9 && Math.abs(last(pg) - want.piano) < 1e-9);
  // Not the brass: no second layer.
  setPreset("stringConsort");
  const one = new Chip();
  await one.prepare([72], [72]);
  assert.equal(layerGains(fresh(() => one.note(72, 1, 1, voicing(0, 4), {})).nodes).length, 1);
  setPreset("chip");
});

test("D502: the bass on a phone: high-passed under its fundamental's useful range, its upper partials lifted; a computer neither", async () => {
  assert.ok(BRASS_BASS_PHONE_HP >= 120 && BRASS_BASS_PHONE_HP <= 250);
  assert.ok(BRASS_BASS_PHONE_LIFT.hz >= 500 && BRASS_BASS_PHONE_LIFT.db > 0 && BRASS_BASS_PHONE_LIFT.db <= 8);
  const filters = async (phone: boolean, voice: number) => {
    setPhone(phone);
    setPreset("bachBrass");
    const chip = new Chip();
    await chip.prepare([43, 48, 72], [48]);
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(voice === 3 ? 43 : 72, 1, 1, voicing(voice, 4), {});
    return [...ctx.nodes].filter((x) => !before.has(x) && (x as FakeNode).kind === "filter").map((x) => `${(x as FakeNode).type}@${((x as FakeNode).frequency as FakeParam).value}${(x as FakeNode).type === "highshelf" ? `:${((x as FakeNode).gain as FakeParam).value}` : ""}`);
  };
  const bassPhone = await filters(true, 3);
  assert.ok(bassPhone.includes(`highpass@${BRASS_BASS_PHONE_HP}`), `${bassPhone}`);
  assert.ok(bassPhone.includes(`highshelf@${BRASS_BASS_PHONE_LIFT.hz}:${BRASS_BASS_PHONE_LIFT.db}`), `${bassPhone}`);
  const bassPc = await filters(false, 3);
  assert.ok(!bassPc.includes(`highpass@${BRASS_BASS_PHONE_HP}`), `${bassPc}`);
  assert.ok(!bassPc.includes(`highshelf@${BRASS_BASS_PHONE_LIFT.hz}:${BRASS_BASS_PHONE_LIFT.db}`));
  const topPhone = await filters(true, 0);
  assert.ok(!topPhone.includes(`highpass@${BRASS_BASS_PHONE_HP}`), "the trumpet untouched");
  setPhone(false);
  setPreset("chip");
});

test("D502: articulation: a JOIN re-tongued, SET-AND-RELEASE slurred, the SLIDE a lip slur (a rising leap a rip)", () => {
  assert.equal(touchFamily("bachBrass"), "strings");
  assert.equal(exprFamily("bachBrass"), "bowed");
  for (const id of ["bachTrumpet", "bachHorn", "bachTrombone", "bachBass"] as const) assert.equal(PATCHES[id].bow, BRASS_TONGUE, id);
  assert.deepEqual(joinedSound("strings", true, "join"), { legato: true, slur: false });
  assert.deepEqual(joinedSound("strings", true, "set-release"), { legato: true, slur: true });
  // The player's join: the brass's own re-tongue (the air stopped about 10 ms, the attack kept: entered near the onset).
  const join = bowEntry(BRASS_TONGUE, { legato: true, lead: true })!;
  assert.deepEqual(join, BRASS_TONGUE.join);
  assert.ok(join.skip <= 0.01 && join.still > 0 && join.still <= 0.015);
  // The slur: past the attack, no new tongue.
  assert.equal(bowEntry(BRASS_TONGUE, { legato: true, slur: true, lead: true })!.skip, 0.25);
  // The slide: a lip slur, quicker than a string's shift; a rising leap a rip, a few tens of ms.
  assert.equal(slideFamily("bachBrass"), "brass");
  const scale = new Set([0, 2, 4, 5, 7, 9, 11]);
  const step = slideGesture("bachBrass", 72, 74, 600, scale);
  assert.equal(step.kind, "glide");
  assert.equal(step.name, "lip slur");
  const rip = slideGesture("bachBrass", 67, 76, 600, scale);
  assert.equal(rip.name, "rip");
  assert.ok(rip.kind === "glide" && rip.tau >= 0.02 && rip.tau <= 0.06, JSON.stringify(rip));
  const shift = slideGesture("stringConsort", 72, 74, 600, scale);
  assert.ok(step.kind === "glide" && shift.kind === "glide" && step.tau < shift.tau);
});

test("D502: the allocation: The Coronation (I/5) and The Bell Tower (II/5) open on BACH BRASS, with its colour plans", () => {
  for (const id of ["wtc1f05", "wtc2f05"]) {
    assert.equal(PIECE_SOUND[id], "bachBrass", id);
    assert.equal(COLOURS[id].sound, "bachBrass", id);
    assert.match(COLOURS[id].soundWhy, /BACH BRASS/);
    assert.ok(COLOURS[id].plans.bachBrass?.length, id);
  }
});
