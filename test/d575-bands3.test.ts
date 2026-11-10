/**
 * D575-D581 (the listening verdicts after 2.50, the bands): KRAUTROCK's guitar echo a colour and its Minimoog-style lead;
 * BACH BRASS's low mids cleared, its entries doubled in unison (entrySpans) and its colour growing with the form (phaseAt);
 * JAZZ QUARTET's I/6 without the piano (a piece's own line-up); PET SOUNDS on the record's colours, with its sleigh bells
 * and its timpani at the arrivals. Nothing tied to the player's notes, right or wrong; no note added.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, fugueById } from "../src/touch/fugue.ts";
import { PATCHES, PRESETS, pieceLineUp, presetById, sampledNow, setPieceLayout, setPreset, type PatchId } from "../src/touch/sound.ts";
import { BAND_CHAINS, BRASS_CLEAR, KRAUT_ECHO } from "../src/touch/band-fx.ts";
import { BAND_GROWTH, BRASS_UNISON, growthAt, unisonSpans } from "../src/touch/band-growth.ts";
import { entrySpans } from "../src/touch/voice-mode.ts";
import { formOf, phaseAt } from "../src/touch/form-points.ts";
import { petBeat, petPlan } from "../src/touch/pet-drums.ts";
import { arrivals, homeTimpani } from "../src/touch/score-drums.ts";
import { presetBudget, PRESET_MB } from "../src/touch/budget.ts";

test("D575: KRAUTROCK: the guitar's echo a colour (its repeats well under the line), the Minimoog-style lead in the organ's place, no glide", () => {
  const g = BAND_CHAINS.krautrock.lanes.guitar.find((s) => s.kind === "echo")!;
  assert.ok(g.kind === "echo" && g.mix <= 0.25 && g.feedback <= 0.3, "the echo lowered (was mix 0.5, feedback 0.38)");
  assert.equal(KRAUT_ECHO.mix, g.mix);
  const p = presetById("krautrock");
  for (let n = 1; n <= 5; n++) assert.ok(p.by![n]!.some(([id]) => id === "k2Synth"), `${n}: the synth plays`);
  assert.ok(!Object.values(p.by!).some((vs) => vs!.some(([id]) => id === "k2Organ")), "the combo organ out of the line-up (kept as a patch)");
  const s = PATCHES.k2Synth;
  assert.equal(s.slide, undefined, "no glide: every pitch Bach's");
  assert.ok(!s.sample, "synthesised: 0 MB");
  assert.equal(s.filter?.poles, 4);
  assert.ok((s.filter?.env ?? 0) > 1 && (s.drift?.cents ?? 0) > 0 && (s.drift?.cents ?? 0) <= 4, "a filter envelope and a little drift");
  assert.ok(BAND_CHAINS.krautrock.lanes.synth, "its lane in the chain");
  assert.ok(PATCHES.k2Organ, "the organ kept (the A/B)");
});

test("D576: BACH BRASS: each entry doubled in unison by a second brass instrument, its span only, within the partner's compass", () => {
  for (const id of ["wtc1f05", "wtc2f05"]) {
    const f = fugueById(id);
    setPreset("bachBrass");
    const p = presetById("bachBrass");
    const row = p.by![f.voices.length]!;
    const ids = f.voices.map((_, v) => row[v][0] as PatchId);
    const spans = unisonSpans(f, ids);
    const ents = entrySpans(f).filter((e) => e.form !== "counter");
    assert.ok(spans.length >= ents.length * 0.8, `${id}: ${spans.length} of ${ents.length} entries doubled`);
    for (const s of spans) {
      const e = ents.find((x) => x.voice === s.voice && x.on === s.on)!;
      assert.ok(e && s.end === e.end, "the entry's span only");
      assert.notEqual(s.patch, undefined);
      assert.ok(BRASS_UNISON.with[ids[s.voice]]!.includes(s.patch), "one of the voice's partners");
      const c = BRASS_UNISON.compass[s.patch]!;
      for (const n of f.voices[s.voice].filter((n) => n[0] >= s.on && n[0] < s.end)) assert.ok(n[2] >= c[0] && n[2] <= c[1], `${id}: ${n[2]} in ${s.patch}'s compass`);
    }
  }
  assert.ok(BRASS_UNISON.level < 1 && BRASS_UNISON.late > 0 && BRASS_UNISON.late < 0.03, "a second player, a moment late, softer than the first");
  assert.equal(BAND_GROWTH.bachBrass.unison, BRASS_UNISON);
});

test("D577: BACH BRASS's colour by the form: veiled in the episodes, brighter by act, the brightest and the largest room at the climax", () => {
  for (const id of ["wtc1f05", "wtc2f05"]) {
    const f = fugueById(id);
    const form = formOf(f);
    let ep: number[] = [];
    let sub: number[] = [];
    let top = -Infinity;
    let topRoom = 0;
    for (const b of f.bars) {
      const g = growthAt(f, b.on);
      const ph = phaseAt(form, b.on);
      if (ph.climax >= 1) ((top = Math.max(top, g.colour.tone ?? 0)), (topRoom = Math.max(topRoom, g.roomMul)));
      else if (ph.phase === "episode" && ph.climax === 0) (ep.push(g.colour.tone ?? 0), assert.ok(g.colour.lp, `${id} b${b.n}: veiled`));
      else if (ph.climax === 0) sub.push(g.colour.tone ?? 0);
    }
    assert.ok(ep.length && sub.length, id);
    assert.ok(Math.max(...ep) < Math.min(...sub), `${id}: the episodes darker than the entries`);
    assert.ok(top > Math.max(...sub) && topRoom > 1.3, `${id}: the climax the brightest, the room the largest`);
  }
});

test("D579: BACH BRASS's low mids cleared: the bus cut at 300 Hz, the church's return out of the low mids, the tenor on the trombone", () => {
  const bus = BAND_CHAINS.bachBrass.bus;
  assert.ok(bus.some((s) => s.kind === "eq" && "bands" in s && s.bands === BRASS_CLEAR));
  assert.ok(BRASS_CLEAR.some((b) => b.type === "peaking" && b.hz >= 250 && b.hz <= 400 && (b.db ?? 0) < -2));
  assert.ok(BAND_CHAINS.bachBrass.reverb.hp >= 250);
  assert.equal(presetById("bachBrass").by![4]![2][0], "bachTrombone");
});

test("D578: JAZZ QUARTET's I/6 without the piano (its own line-up, its recordings alone); every other piece as it was", () => {
  const f = fugueById("wtc1f06");
  const l = pieceLineUp("jazzQuartet", f)!;
  assert.ok(l && l.only && l.count === 3);
  assert.deepEqual(l.slots.map(([id]) => id), ["jqVibes", "jqSax", "jqBass"]);
  setPreset("jazzQuartet");
  setPieceLayout(l);
  assert.ok(!sampledNow().includes("piano") && sampledNow().includes("bossaSax"));
  setPieceLayout(null);
  assert.ok(sampledNow().includes("piano") && !sampledNow().includes("bossaSax"));
  assert.equal(pieceLineUp("jazzQuartet", fugueById("wtc1f19")), null);
  assert.equal(pieceLineUp("jazzQuartet", fugueById("wtc2f12")), null);
  // Only JAZZ QUARTET (I/6), SID 64 (II/6's alto on the triangle, D603) and BACH BRASS (I/24's and II/17's altos on the second trumpet, D613) have a piece's own line-up.
  assert.deepEqual(PRESETS.filter((p) => p.pieces).map((p) => p.id).sort(), ["bachBrass", "jazzQuartet", "sid64"]);
  const b = presetBudget("jazzQuartet", ["wtc1f06"]);
  assert.ok(b.mb < PRESET_MB, `${b.mb}`);
  assert.ok(PATCHES.jqGuitar.sample === "rockGuitar", "the guitar kept (the A/B)");
});

function petHits(id: string) {
  const f = fugueById(id);
  const { ticks: beat, perBar: per } = beatOf(f);
  const compound = beat !== f.tpq * (4 / Number(f.meter.split("/")[1]));
  const plan = petPlan(f, beat, per);
  const out: { tick: number; piece: string; vel: number; midi?: number }[] = [];
  for (let t = f.bars[0].on; t < f.length; t += beat) {
    const b = Math.round((t - f.bars[0].on) / beat) % per;
    for (const h of petBeat(b, per, compound, t, beat, plan, 0)) out.push({ tick: t + h.at * beat, piece: h.piece, vel: h.vel, midi: h.midi });
  }
  return { f, beat, plan, out };
}

test("D581: PET SOUNDS' sleigh bells in the middle and final groups only (never the exposition or an episode); the timpani at the arrivals, tonic or dominant", () => {
  for (const id of ["wtc1f17", "wtc1f21", "wtc2f17"]) {
    const { f, beat, plan, out } = petHits(id);
    const form = formOf(f);
    const sl = out.filter((h) => h.piece === "sleigh");
    assert.ok(sl.length > 0, id);
    const expoEnd = form.seams[0].end;
    for (const h of sl) {
      assert.ok(h.tick >= expoEnd - beat, `${id}: sleigh bells in the exposition at ${h.tick}`);
      assert.ok(!plan.quiet.some(([a, z]) => h.tick >= a && h.tick < z), `${id}: sleigh bells in an episode`);
    }
    // Not a machine gun: the backbeat firmer than the beat.
    assert.ok(new Set(sl.map((h) => h.vel.toFixed(2))).size >= 2, id);
    const home = homeTimpani(f.key);
    const arr = arrivals(f);
    for (const h of out.filter((x) => x.piece === "timp")) assert.ok(h.midi === home.tonic || h.midi === home.dominant, `${id}: ${h.midi}`);
    assert.ok(arr.length > 0);
  }
});

test("D580: PET SOUNDS on the record's colours, within the budget: the tack piano, the twelve-string, the accordion, the horn, the bass and its harmonica", () => {
  const p = presetById("petSounds");
  assert.deepEqual(p.by![4]!.map(([id]) => id), ["p3Tack", "p3Twelve", "psHorn", "p3Bass"]);
  assert.ok(PATCHES.p3Tack.one?.courses && PATCHES.p3Tack.one.courses.unison.cents >= 8, "the tack's jangle: a second string out of true");
  assert.ok(PATCHES.p3Twelve.one?.courses && PATCHES.p3Twelve.one.courses.octave.gain > 0, "the twelve-string's octave courses");
  assert.ok(PATCHES.p3Bass.double, "the bass harmonica in unison");
  for (const id of ["p3Tack", "p3Twelve", "p3Bass", "p2Accordion"] as const) assert.equal(PATCHES[id].lane, "wall", id);
  const b = presetBudget("petSounds");
  assert.ok(b.mb <= PRESET_MB, `${b.mb}`);
});
