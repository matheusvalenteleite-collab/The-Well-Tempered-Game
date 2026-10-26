/**
 * D297: ten new presets after the five sounds: three after the research report "Polyphony on Game
 * Hardware" (§6.1-6.3: SUPER 16-BIT, NOCTURNE 32-BIT, MEGA FM), SID 64, TRACKER, CHAMBER ORGAN,
 * TEMPLE 64, AGENT 64, and the niche picks MODULAR and TOMITA; ANALOG SYNTH remade as SWITCHED-ON.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeAudio } from "./fake-audio.ts";
import { PATCHES, patchFor, placeFor, presetById, PRESETS, sampledNow, setPreset, type PatchId } from "../src/touch/sound.ts";
import { BAKE_RATE, bake, BUDGET, decodedBytes, folderOf, noteInfo, PERIOD, planFor, SAMPLED, setFor, WIND_LOOP } from "../src/touch/sampled.ts";
import { Chip, HALL, SPC_ECHO, stairCurve, voicing } from "../src/touch/chip.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { styleOf } from "../src/touch/phrasing.ts";
import { fugueById, PIECES } from "../src/touch/fugue.ts";

const ctxOf = installFakeAudio(0, true);
const NEW = ["super16", "nocturne32", "megaFm", "sid64", "tracker", "chamberOrgan", "temple64", "agent64", "modular", "tomita"];
/** The presets judged by the clarity rules here (every one but the niche picks bends none of them). */
const ALL = [...NEW, "analog"];

test("D297: the ten new presets follow the five; no piece opens on them; phrased plainly; SWITCHED-ON keeps ANALOG SYNTH's id", () => {
  assert.equal(presetById("analog").name, "SWITCHED-ON");
  assert.equal(presetById("carlos").id, "analog");
  assert.deepEqual(PRESETS.slice(5).map((p) => p.id), NEW);
  assert.deepEqual(PRESETS.slice(5).map((p) => p.name), ["SUPER 16-BIT", "NOCTURNE 32-BIT", "MEGA FM", "SID 64", "TRACKER", "CHAMBER ORGAN", "TEMPLE 64", "AGENT 64", "MODULAR", "TOMITA"]);
  for (const id of NEW) {
    assert.ok(!Object.values(PIECE_SOUND).includes(id), id);
    assert.equal(styleOf(id), "plain");
    // No trademarks in the names.
    assert.ok(!/SNES|NINTENDO|SEGA|PLAYSTATION|MEGA DRIVE|GENESIS|ZELDA|GOLDENEYE|BOMBERMAN|MOOG|COMMODORE|AMIGA/.test(presetById(id).name), id);
  }
  assert.equal(presetById("super16").fx, "spc");
  assert.equal(presetById("nocturne32").fx, "hall");
  assert.equal(presetById("megaFm").fx, undefined, "MEGA FM: no reverb");
});

test("D297: every voice its own instrument, pans within ±0.35, vibrato only on held upper voices, late, rates apart", () => {
  for (const id of ALL) {
    setPreset(id);
    for (const n of [2, 3, 4, 5]) {
      const ids: PatchId[] = presetById(id).by![n]!.map(([p]) => p);
      assert.equal(new Set(ids).size, n, `${id} ${n}: ${ids}`);
      const rates: number[] = [];
      for (let v = 0; v < n; v++) {
        const pt = patchFor(v, n)!;
        assert.equal(pt, PATCHES[ids[v]]);
        const pl = placeFor(v, n)!;
        assert.ok(Math.abs(pl.pan) <= 0.35, `${id} ${n} ${v}: pan ${pl.pan}`);
        assert.equal(voicing(v, n).pan, pl.pan);
        assert.ok(pl.level <= 1 && pl.level >= 0.8, "only a shade lighter (R9)");
        if (pt.vib) {
          assert.ok(v < n - 1, `${id}: no vibrato on the bass`);
          assert.ok(pt.amp.s > 0, `${id}: vibrato only on a sustained voice`);
          assert.ok(pt.vib.delay >= 0.2 && pt.vib.delay <= 0.5 && pt.vib.depth >= 4 && pt.vib.depth <= 22, ids[v]);
          rates.push(pt.vib.rate);
        }
      }
      rates.sort((a, b) => a - b);
      for (let i = 1; i < rates.length; i++) assert.ok(rates[i] - rates[i - 1] >= 0.6 - 1e-9, `${id} ${n}: rates ${rates}`);
    }
    // The slots are the five-voice layout (the list's tests read them).
    assert.deepEqual(presetById(id).slots, presetById(id).by![5]!.map(([p]) => p));
  }
  setPreset("chip");
});

test("D297: SUPER 16-BIT's echo from the sustained voices only, the harpsichord dry; the hall's sends; MEGA FM all FM", () => {
  for (const p of presetById("super16").slots!) {
    const pt = PATCHES[p];
    assert.equal(!!pt.send, pt.amp.s > 0, p);
    assert.ok(!pt.send || (pt.send >= 0.1 && pt.send <= 0.22), p);
  }
  for (const p of presetById("nocturne32").slots!) assert.ok(PATCHES[p].send! >= 0.1 && PATCHES[p].send! <= 0.18, p);
  assert.deepEqual(SPC_ECHO, { delay: 0.08, feedback: 0.35, lp: 2800, hp: 300 });
  assert.equal(HALL.predelay, 0.025);
  for (const p of presetById("megaFm").slots!) {
    const pt = PATCHES[p];
    assert.ok(pt.fm && !pt.sample && !pt.send, p);
    assert.equal(pt.bits, 9);
    assert.deepEqual(pt.osc, [{ wave: "sine" }]);
  }
  // The index falls on every note (bright onset, mellow body), but for the brass, which rises first.
  for (const p of ["fmReed", "fmHarpsi", "fmFlute", "fmBass"] as const) assert.ok(PATCHES[p].fm!.to < PATCHES[p].fm!.index, p);
  assert.ok(PATCHES.fmBrass.fm!.rise!.to > PATCHES.fmBrass.fm!.index);
  // The ratios as far apart as two operators go: 1:1 reed and bass, 1:3 harpsichord, 1:2 organ-flute.
  assert.deepEqual(["fmReed", "fmHarpsi", "fmFlute", "fmBass"].map((p) => PATCHES[p as PatchId].fm!.ratio), [1, 3, 2, 1]);
});

test("D297: the period sets: their folders, mono, baked loops for the loopless recordings, the organ's manual above its pedal", () => {
  assert.equal(folderOf("oboe16"), "oboe");
  assert.equal(folderOf("manual32"), "pipeOrgan");
  setPreset("super16");
  assert.deepEqual(sampledNow().sort(), ["bassoon16", "clarinet16", "harpsi16", "oboe16", "violin16"]);
  setPreset("nocturne32");
  assert.deepEqual(sampledNow().sort(), ["harpsi32", "oboe32", "organ32", "viola32", "violin32"]);
  setPreset("megaFm");
  assert.deepEqual(sampledNow(), []);
  setPreset("chip");
  for (const [set, b] of Object.entries(PERIOD)) {
    // Crush 11 bits or more on the console samples (§8); 10 for the N64 ADPCM's grain; TRACKER's 8 (the Amiga's, asked for).
    assert.ok(b.hold ? b.bits === 8 : b.bits >= 10, set);
    assert.ok(b.lp < b.rate / 2, set);
  }
  assert.deepEqual(noteInfo("oboe16", 62)!.loop, WIND_LOOP);
  assert.ok(noteInfo("pedal32", 36)!.loop, "the organ keeps its own loops");
  // One note: a quarter of the stereo harpsichord's bytes (mono, at half the rate).
  assert.ok(Math.abs(decodedBytes([{ set: "harpsi16", notes: [60] }]) * 4 - decodedBytes([{ set: "harpsichord", notes: [60] }])) <= 16);
  const organ = SAMPLED.organ32;
  assert.equal(setFor(organ, 54), "pedal32");
  assert.equal(setFor(organ, 55), "manual32");
  const plan = planFor(organ, [40, 50, 60, 64]);
  assert.deepEqual(plan.map((p) => p.set), ["pedal32", "manual32"]);
  assert.ok(plan[0].notes.every((m) => m <= 54) && plan[1].notes.every((m) => m >= 54));
});

test("D297: every piece's recordings for a period preset fit a phone's budget (all its instruments together)", () => {
  for (const id of ["super16", "nocturne32", "tracker", "temple64", "agent64"]) {
    setPreset(id);
    let worst = 0;
    for (const p of PIECES) {
      const f = fugueById(p.id);
      const pitches = f.voices.flat().map((n) => n[2]);
      const total = sampledNow().reduce((s, i) => s + decodedBytes(planFor(SAMPLED[i], pitches, f.voices[0].map((n) => n[2]))), 0);
      worst = Math.max(worst, total);
    }
    assert.ok(worst < BUDGET.phone, `${id}: ${worst / 1e6} MB`);
  }
  setPreset("chip");
});

test("D297: the bake: band-limited to its rate, softened, a 120 Hz floor, quantised, the made loop joined", () => {
  const sr = 48000;
  const sine = (f: number, a = 0.5) => Float32Array.from({ length: sr * 5 }, (_, i) => a * Math.sin((2 * Math.PI * f * i) / sr));
  // The bake keeps its notes at half the rate (BAKE_RATE): seconds 1-4 of either.
  const rms = (x: Float32Array) => {
    const r = x.length === sr * 5 ? sr : sr * BAKE_RATE;
    return Math.sqrt(x.slice(r, 4 * r).reduce((s, v) => s + v * v, 0) / (3 * r));
  };
  const b = PERIOD.oboe16;
  const pass = rms(bake([sine(1000)], sr, { ...b, loop: false })) / rms(sine(1000));
  const top = rms(bake([sine(9000)], sr, { ...b, loop: false })) / rms(sine(9000));
  const low = rms(bake([sine(50)], sr, { ...b, loop: false })) / rms(sine(50));
  assert.ok(pass > 0.85 && pass < 1.1, `1 kHz ${pass}`);
  assert.ok(top < 0.1, `9 kHz (above 8 kHz, half of 16 kHz: at least 20 dB down) ${top}`);
  assert.ok(low < 0.25, `50 Hz under the 120 Hz floor ${low}`);
  // 11 bits against the peak: the values on a grid of peak/1024.
  const x = bake([sine(440)], sr, { ...b, loop: false });
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const q = peak / 1024;
  for (let i = 0; i < x.length; i += 997) assert.ok(Math.abs(x[i] / q - Math.round(x[i] / q)) < 1e-3);
  // Stereo folded to one channel.
  assert.equal(bake([sine(440), sine(440)], sr, b).length, sr * 5 * BAKE_RATE);
  // The loop: just before its end the sound is what it was just before its start.
  const y = bake([sine(440)], sr, b);
  const plain = bake([sine(440)], sr, { ...b, loop: false });
  const l0 = Math.round(WIND_LOOP[0] * sr * BAKE_RATE);
  const l1 = Math.round(WIND_LOOP[1] * sr * BAKE_RATE);
  assert.ok(Math.abs(y[l1 - 1] - plain[l0 - 1]) < 0.01, `${y[l1 - 1]} vs ${plain[l0 - 1]}`);
  // The DAC's staircase: 2^bits levels, within ±1.
  const c = stairCurve(9);
  assert.equal(new Set(c).size, 513);
  assert.ok(c.every((v) => v >= -1 && v <= 1));
});

test("D297: on the sound: the shared room off for the period presets and back after; each effect built once, taken down after; FM's modulators", () => {
  setPreset("super16");
  const chip = new Chip();
  const ctx = ctxOf();
  const v = voicing(0, 3);
  chip.note(72, 0.1, 0.5, v);
  const rooms = [...ctx.nodes].filter((n) => n.kind === "convolver");
  const master = [...ctx.nodes].find((n) => n.kind === "gain" && n.targets.some((t) => (t as { kind?: string }).kind === "filter"));
  assert.ok(master, "the master");
  assert.ok(!master!.targets.includes(rooms[0]), "the room unwired");
  const delays = () => [...ctx.nodes].filter((n) => n.kind === "delay").length;
  assert.equal(delays(), 1, "the echo's delay");
  chip.note(74, 0.6, 0.5, voicing(0, 3));
  assert.equal(delays(), 1, "built once");
  setPreset("nocturne32");
  chip.note(72, 1.1, 0.5, voicing(0, 3));
  assert.equal(delays(), 1, "the echo taken down, the hall's pre-delay up");
  assert.equal([...ctx.nodes].filter((n) => n.kind === "convolver").length, 2, "the room and the hall");
  setPreset("megaFm");
  const before = ctx.made.get("oscillator") ?? 0;
  chip.note(72, 1.6, 0.2, voicing(0, 3));
  // The carrier and two modulators (the reed's second at 3).
  assert.equal((ctx.made.get("oscillator") ?? 0) - before, 3);
  assert.equal(delays(), 0, "no effect for MEGA FM");
  setPreset("gameboy");
  chip.note(72, 2, 0.2, voicing(0, 3));
  assert.ok(master!.targets.includes(rooms[0]), "the room wired again");
  setPreset("chip");
});

test("D297: a whole fugue on each period preset leaves nothing wired but the preset's effect", async () => {
  for (const id of NEW) {
    setPreset(id);
    const chip = new Chip();
    const ctx = ctxOf();
    const f = fugueById("wtc1f02");
    await chip.prepare(f.voices.flat().map((n) => n[2]));
    // One note first: the effect is built (it stays while the preset plays).
    chip.note(60, 0, 0.1, voicing(0, 3));
    ctx.advance(1);
    const fixed = ctx.nodes.size;
    let t = 1;
    for (const [v, notes] of f.voices.entries()) for (const [on, dur, m] of notes.slice(0, 40)) chip.note(m, 1 + on / 1920 / 2, dur / 1920 / 2, voicing(v, 3));
    for (; t < 200; t += 0.25) ctx.advance(t);
    assert.equal(ctx.nodes.size - fixed, 0, id);
    if (sampledNow().length) assert.ok((ctx.made.get("buffer") ?? 0) > 50, `${id}: played from the recordings`);
  }
  setPreset("chip");
});

test("D297: SID 64: each voice its own waveform and motion; vibrato on the top only; no arpeggios", () => {
  const slots = presetById("sid64").slots!;
  const kinds = slots.map((s) => {
    const pt = PATCHES[s];
    return `${pt.osc.map((o) => o.wave).join("+")}/${pt.pwm ? `${pt.pwm.width}~${pt.pwm.depth}@${pt.pwm.rate}` : "-"}`;
  });
  assert.equal(new Set(kinds).size, 5, `${kinds}`);
  const lead = PATCHES.sidLead.pwm!;
  assert.ok(lead.width - lead.depth >= 0.25 - 1e-9 && lead.width + lead.depth <= 0.45 + 1e-9 && lead.rate === 0.7);
  assert.deepEqual(slots.filter((s) => PATCHES[s].vib), ["sidLead"]);
  for (const s of slots) assert.ok(PATCHES[s].amp.a >= 0.002 && PATCHES[s].amp.a <= 0.005, s);
  const bass = PATCHES.sidBass;
  assert.ok(bass.filter!.hz && bass.filter!.freq >= 1200 && bass.filter!.q! >= 2, "a resonant filter, its body kept for phones");
});

test("D297: CHAMBER ORGAN: a stop per voice, a chiff at each onset, no tremulant, a small church; the pedal a reed", () => {
  const slots = presetById("chamberOrgan").slots!;
  assert.equal(new Set(slots.map((s) => PATCHES[s].osc[0].wave)).size, 5);
  for (const s of slots) {
    const pt = PATCHES[s];
    assert.ok(pt.chiff && pt.chiff.time >= 0.015 && pt.chiff.time <= 0.03, s);
    assert.equal(pt.vib, undefined, `${s}: no tremulant`);
    assert.ok(pt.amp.r >= 0.06 && pt.amp.r <= 0.09 && pt.amp.s === 1, s);
    assert.ok(pt.send! <= 0.15, `${s}: wet within 0.15`);
  }
  assert.equal(PATCHES.orgPosaune.osc[0].wave, "stopPosaune");
  assert.equal(presetById("chamberOrgan").fx, "church");
});

test("D297: TRACKER: 8-bit samples held without smoothing, short loops, alternating left and right; TEMPLE 64 and AGENT 64: soft 22 kHz samples in their rooms", () => {
  for (const id of ["violinMod", "fluteMod", "harpsiMod", "clarinetMod", "bassoonMod"]) {
    assert.equal(PERIOD[id].hold, true, id);
    assert.ok(PERIOD[id].rate >= 8000 && PERIOD[id].rate <= 16000, id);
  }
  const pans = presetById("tracker").by![4]!.map(([, pan]) => pan);
  for (let i = 1; i < pans.length; i++) assert.ok(pans[i] * pans[i - 1] < 0, `${pans}`);
  assert.equal(presetById("tracker").fx, undefined, "no reverb");
  assert.equal(presetById("temple64").fx, "cave");
  assert.equal(presetById("agent64").fx, "studio");
  for (const id of ["flute64", "harp64", "viola64", "xylo64", "bass64"]) assert.ok(PERIOD[id].rate >= 16000 && PERIOD[id].rate <= 22050 && PERIOD[id].bits === 10, id);
});

test("D297: SWITCHED-ON and MODULAR drift; TOMITA's wash only from the inner voices; the niche picks' sends capped", () => {
  for (const s of presetById("analog").slots!) assert.ok(PATCHES[s].drift && PATCHES[s].drift!.cents <= 3, s);
  const rates = presetById("analog").slots!.map((s) => PATCHES[s].drift!.rate);
  assert.equal(new Set(rates).size, 5, "each voice wanders on its own");
  for (const s of presetById("modular").slots!) assert.ok(PATCHES[s].drift, s);
  const t = presetById("tomita");
  assert.equal(t.fx, "space");
  const [top, , , , bass] = t.slots!.map((s) => PATCHES[s].send!);
  const inner = t.slots!.slice(1, 4).map((s) => PATCHES[s].send!);
  for (const x of inner) assert.ok(x > top && x > bass && x <= 0.3, `${inner}`);
  // A note's tuning drifts with the clock: two notes far apart differ, the same moment is the same.
  setPreset("analog");
  const chip = new Chip();
  const ctx = ctxOf();
  chip.note(60, 1, 0.3, voicing(0, 4));
  chip.note(60, 6, 0.3, voicing(0, 4));
  const det = [...ctx.nodes].filter((n) => n.kind === "oscillator").map((n) => (n.detune as { value: number }).value);
  assert.ok(det.some((d) => Math.abs(d) > 0.5) && det.every((d) => Math.abs(d) <= 3), `${det}`);
  setPreset("tomita");
  chip.note(60, 7, 0.3, voicing(1, 4));
  assert.equal([...ctx.nodes].filter((n) => n.kind === "delay").length, 2, "the space echo and the reverb's pre-delay");
  setPreset("chip");
});
