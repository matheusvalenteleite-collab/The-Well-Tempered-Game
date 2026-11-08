/**
 * D540, BANDS v2's infrastructure: the shared per-band chains (band-fx.ts), the v2 presets beside the originals (sound.ts
 * V2_PRESETS), the chain built once a band and taken down on a switch (chip.ts Chip.period), the slimmed recordings
 * (sampled.ts Slim) and the plans' release of every other sound's sets (chip.ts soundPlans).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { BAND_CHAINS, CHAIN_CAP, ERA_EQ, baseSound, buildChain, chainCost, fuzzCurve, reverbImpulse, tapeCurve, V2_BANDS, v2Id, type ChainSpec } from "../src/touch/band-fx.ts";
import { PRESETS, V2_PRESETS, presetById, setPreset, creditFor, expressiveAll } from "../src/touch/sound.ts";
import { Chip, soundPlans, voicing } from "../src/touch/chip.ts";
import { decodedBytes, sampledMidis, slimData, zonesOf, setZones } from "../src/touch/sampled.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";

const ctxOf = installFakeAudio(0, false);

test("D540: every band's chain builds on one context, its nodes as chainCost counts them, within CHAIN_CAP, one convolver at most", () => {
  for (const [band, spec] of Object.entries(BAND_CHAINS) as [string, ChainSpec][]) {
    new Chip();
    const ctx = ctxOf();
    const before = ctx.nodes.size;
    const c = buildChain(ctx as unknown as BaseAudioContext, spec);
    const cost = chainCost(spec);
    assert.equal(c.nodes.length, cost.nodes, `${band}: ${c.nodes.length} nodes built, ${cost.nodes} counted`);
    assert.equal(ctx.nodes.size - before, cost.nodes, `${band}: every node made is the chain's`);
    assert.ok(cost.nodes <= CHAIN_CAP.nodes && cost.convolvers <= CHAIN_CAP.convolvers && cost.oscillators <= CHAIN_CAP.oscillators, `${band}: ${JSON.stringify(cost)}`);
    assert.equal(c.sources.length, cost.oscillators);
    assert.equal(spec.band, band);
    for (const name of Object.keys(spec.lanes ?? {})) assert.ok(c.lane(name), `${band}: lane ${name}`);
    assert.equal(c.lane("nothing"), null);
    assert.equal(!!c.send, !!spec.reverb);
    c.dispose();
    assert.equal(ctx.nodes.size, before, `${band}: disposed, nothing left wired`);
  }
});

test("D540: the building blocks' curves and impulses: tape soft and bounded, fuzz harder, the impulses decaying, seeded", () => {
  const t = tapeCurve(2, 0.1);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] >= t[i - 1], "tape: monotonic");
  assert.ok(Math.abs(t[t.length - 1]) <= 1.2 && Math.abs(t[0]) <= 1.2);
  assert.ok(Math.abs(t[1024]) < 0.01, "tape: silence stays silence");
  const f = fuzzCurve(8);
  assert.ok(Math.max(...f) <= 1 && Math.min(...f) >= -0.7, "fuzz: clipped, asymmetric");
  // The fuzz flattens sooner: at a quarter of full scale it is near its ceiling, the tape well under.
  assert.ok(f[Math.round(0.625 * 2047)] > 0.85 && tapeCurve(1.2)[Math.round(0.625 * 2047)] < 0.5);
  for (const ir of ["plate", "spring", "chamber"] as const) {
    const [l, r] = reverbImpulse(48000, { ir, seconds: 1.2, rt60: 1 });
    const e = (d: Float32Array, a: number, b: number) => d.subarray(Math.floor(a * d.length), Math.floor(b * d.length)).reduce((s, x) => s + x * x, 0);
    assert.ok(e(l, 0, 0.1) > 100 * e(l, 0.8, 0.9), `${ir}: decays`);
    assert.notDeepEqual(l.subarray(2000, 2100), r.subarray(2000, 2100), `${ir}: the sides decorrelated`);
    assert.deepEqual(reverbImpulse(48000, { ir, seconds: 1.2, rt60: 1 })[0].subarray(0, 500), l.subarray(0, 500), `${ir}: seeded`);
  }
  for (const era of Object.keys(ERA_EQ)) assert.ok(ERA_EQ[era as keyof typeof ERA_EQ].length >= 2);
});

test("D540: each band has its v2 beside it, in no default and offered nowhere but the Sound Lab; it plays as its original elsewhere", () => {
  assert.equal(V2_PRESETS.length, V2_BANDS.length);
  for (const band of V2_BANDS) {
    const v = presetById(v2Id(band));
    const o = presetById(band);
    assert.equal(v.id, v2Id(band));
    assert.equal(v.name, `${o.name} v2`);
    assert.equal(v.v2Of, band);
    assert.equal(v.chain, BAND_CHAINS[band]);
    assert.ok(!PRESETS.includes(v), `${band}: the v2 not among the players' sounds`);
    assert.ok(!o.chain && !o.slim, `${band}: the original unchanged`);
    assert.equal(baseSound(v.id), band);
    // D546-D548: a rebuilt v2 credits its own recordings (SALSA, BOSSA NOVA, CHORINHO: no piano, other instruments).
    if (["salsa", "bossaNova", "chorinho"].includes(band)) assert.ok(creditFor(v.id) && creditFor(v.id) !== creditFor(band));
    else assert.equal(creditFor(v.id), creditFor(band));
    assert.equal(expressiveAll(v.id), expressiveAll(band));
  }
  assert.equal(baseSound("pianoSampled"), "pianoSampled");
  for (const s of Object.values(PIECE_SOUND)) assert.ok(!String(s).endsWith("V2"), `no fugue's default is a v2 (${s})`);
});

test("D540: a v2's notes pass through its one chain, built at its first note and taken down when another sound plays", () => {
  const chip = new Chip();
  const ctx = ctxOf();
  const count = (k: string) => [...ctx.nodes].filter((n) => n.kind === k).length;
  setPreset(v2Id("krautrock"));
  for (let i = 0; i < 6; i++) chip.note(60 + i, 0.1 + 0.2 * i, 0.3, voicing(i % 4, 4));
  const conv = count("convolver");
  const shapers = count("shaper");
  for (let i = 0; i < 6; i++) chip.note(60 + i, 1.5 + 0.2 * i, 0.3, voicing(i % 4, 4));
  assert.equal(count("convolver"), conv, "one chain for every note (no convolver per note)");
  assert.equal(count("shaper"), shapers, "nor a waveshaper per note");
  assert.ok(conv >= 1);
  const chain = (chip as unknown as { chain: { spec: ChainSpec } | null }).chain;
  assert.equal(chain?.spec, BAND_CHAINS.krautrock);
  setPreset("krautrock");
  chip.note(60, 3, 0.3, voicing(0, 4));
  assert.equal((chip as unknown as { chain: unknown }).chain, null, "the original plays without it");
});

test("D540: a slimmed recording is one channel at its rate, a plucked one cut with a fade; the plans hold a third of a 48 kHz stereo set", () => {
  const sr = 48000;
  const l = new Float32Array(sr * 6).map((_, i) => Math.sin(i / 10));
  const r = new Float32Array(sr * 6).map((_, i) => Math.sin(i / 10 + 0.3));
  const out = slimData([l, r], sr, { rate: 32000, maxS: 4 });
  assert.equal(out.length, 4 * 32000);
  assert.ok(Math.abs(out[out.length - 1]) < 1e-3, "faded at the cut");
  const rms = (d: Float32Array) => Math.sqrt(d.subarray(1000, 20000).reduce((s, x) => s + x * x, 0) / 19000);
  assert.ok(Math.abs(rms(out) - Math.SQRT2 * rms(l)) < 0.07, "the fold keeps the power, and the middle seat's 3 dB");
  const plan = [{ set: "grand", notes: [60, 63, 66] }];
  const full = decodedBytes(plan, 48000);
  const slim = decodedBytes([{ ...plan[0], slim: { rate: 32000, maxS: 4 } }], 48000);
  assert.ok(slim < full / 4, `${slim} of ${full}`);
  assert.deepEqual(zonesOf([60, 61, 62, 63, 64, 65, 66], 3), [60, 63, 66]);
  assert.deepEqual(zonesOf([60, 63, 66], 3), [60, 63, 66]);
  setZones("jazzVibes", 3);
  assert.ok(sampledMidis("jazzVibes").every((m, i, a) => i === 0 || m - a[i - 1] >= 3));
  setZones("jazzVibes", null);
  assert.ok(sampledMidis("jazzVibes").some((m, i, a) => i > 0 && m - a[i - 1] === 1));
});

test("D540: the plans let go of every other sound's sets, never a set the sound now plays (BAROQUE BAND's oboe is ZELENKA's oboe II's set)", () => {
  setPreset("baroqueBand");
  const plans = soundPlans([60, 62, 64, 67, 72], [60], null).flat();
  const oboe = plans.filter((e) => e.set === "trialOboe");
  assert.ok(oboe.length >= 1 && oboe.every((e) => e.notes.length > 0), "the oboe's set loaded, never emptied by oboe II's");
  assert.ok(plans.some((e) => e.set === "jazzVibes" && e.notes.length === 0), "the vibraphone's let go");
  setPreset(v2Id("jazzQuartet"));
  const v2 = soundPlans([60, 62, 64, 67, 72], [60], null).flat();
  assert.ok(v2.filter((e) => e.set === "jazzVibes").every((e) => e.slim?.rate === 24000 && e.slim.maxS === 3));
  assert.ok(!v2.some((e) => e.set === "grandSoft" && e.notes.length), "one layer: the soft grand held off");
  // (D549: JAZZ v2 keeps its vibraphone's soft and hard mallets: Slim.keep.)
  assert.ok(v2.some((e) => e.set === "jazzVibesSoft" && e.notes.length), "the soft vibraphone kept");
  setPreset("jazzQuartet");
  soundPlans([], [], null);
  assert.ok(sampledMidis("jazzVibes").length > 30, "the zones undone under the original");
});

test("D540: a slimmed band lets go of the layers it holds off (the soft grand loaded under the piano before it)", () => {
  setPreset(v2Id("krautrock"));
  const plans = soundPlans([60, 64, 67], [60], null).flat();
  assert.ok(plans.some((e) => e.set === "grandSoft" && e.notes.length === 0), "the soft grand emptied");
  setPreset("pianoSampled");
});
