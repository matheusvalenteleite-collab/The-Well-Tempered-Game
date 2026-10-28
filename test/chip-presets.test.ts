import { test } from "node:test";
import assert from "node:assert/strict";
import { grooveHits, harmonicsOf, PATCHES, patchFor, playerSound, presetById, PRESETS, RETIRED, setPreset, SHAPES, slotOf, TRAVERSO } from "../src/touch/sound.ts";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";

test("D292, D294, D297, D302, D304: the players' sounds are the five (ANALOG SYNTH now SWITCHED-ON), then the ten new presets, in order; every piece opens on one of the five", () => {
  assert.deepEqual(PRESETS.map((p) => p.id), ["chip", "gameboy", "harpsichordSampled", "pianoSampled", "analog", "super16", "nocturne32", "megaFm", "sid64", "tracker", "chamberOrgan", "vocalSynth", "soloVoices", "modular", "tomita"]);
  assert.deepEqual(PRESETS.map((p) => p.name), ["CLASSIC CHIP", "GAME BOY", "HARPSICHORD (SAMPLED)", "PIANO (SAMPLED)", "SWITCHED-ON", "SUPER 16-BIT", "NOCTURNE 32-BIT", "MEGA FM", "SID 64", "TRACKER", "PIPE ORGAN", "VOCAL SYNTH", "SOLO VOICES", "BLEEPS AND BLOOPS", "TOMITA"]);
  // D302: TEMPLE 64 and AGENT 64 remade; D304: their successors withdrawn too: a stored choice of any opens on NOCTURNE 32-BIT.
  for (const gone of ["temple64", "agent64", "forest64", "party64"]) assert.equal(playerSound(gone), "nocturne32", gone);
  const ids = PRESETS.map((p) => p.id);
  // D340: the MORE BACH and CHORALES tabs' exceptions, asked for: the chorales and the Ricercar a 6 on PIPE ORGAN, BWV 1043 on SUPER 16-BIT's strings. D348: and the harpsichord concertos on its harpsichord and strings.
  const D340 = /^(chor\d{3}|bwv1043-\d|bwv1079-ric6|bwv228-\d|bwv54-\d|bwv10(5[2-9]|6[0-5])-\d)$/;
  for (const [piece, id] of Object.entries(PIECE_SOUND).filter(([p]) => !D340.test(p))) assert.ok(ids.slice(0, 5).includes(id), `${piece}: ${id} (D297: never a period preset)`);
  // D294: the two sounds replaced (and the withdrawn ones they grew from) open on their successors.
  for (const [old, now] of [["chipRound", "gameboy"], ["chipPocket", "gameboy"], ["chipGold", "gameboy"], ["pianoFm", "analog"], ["carlos", "analog"]]) {
    assert.equal(presetById(old).id, now, old);
    assert.equal(playerSound(old), now, old);
  }
  // Every withdrawn sound (and the ensembles of D288) opens as one of the five; TRAVERSO only for WITH KIMIKO.
  for (const gone of ["strings", "baroque", "winds", "consort", "bossa", "chipPlumber", "chipHyrule", "chipBomber", "chipVampire", "chipDino", "chipLight", "chipBlur", "stringsReal", "chip3"]) {
    assert.equal(presetById(gone).id, "chip", gone);
    assert.equal(playerSound(gone), "chip", gone);
  }
  for (const id of Object.values(RETIRED)) assert.ok(ids.includes(id), id);
  assert.equal(presetById("organSampled").id, "harpsichordSampled");
  assert.equal(presetById("traverso"), TRAVERSO, "WITH KIMIKO's voice kept");
  assert.equal(playerSound("traverso"), "chip", "but no player's choice");
  assert.equal(soundFor("wtc1p04", { wtc1p04: "traverso" }, "chip"), "chip");
  assert.equal(soundFor("wtc1p04", { wtc1p04: "pianoFm" }, "chip"), "analog");
  assert.equal(soundFor("wtc1p04", { wtc1p04: "gameboy" }, "chip"), "gameboy");
  for (const id of ids) assert.equal(playerSound(id), id);
  // Every slot an existing patch; no drums but the classic chip's.
  for (const p of PRESETS) {
    if (p.slots) for (const s of p.slots) assert.ok(PATCHES[s], `${p.id}: ${s}`);
    assert.equal(!!p.drums, p.id === "chip", p.id);
    assert.equal(p.groove, undefined, p.id);
  }
  setPreset("chip");
  assert.equal(patchFor(0, 3), null, "the classic sound is chip.ts's own");
});

test("D294: GAME BOY: the DMG's kinds of sound, every voice its own wave, the pulses' stepped envelopes, a sawtooth wave bass", () => {
  const slots = presetById("gameboy").slots!;
  for (const n of [2, 3, 4, 5]) {
    const waves = Array.from({ length: n }, (_, v) => PATCHES[slots[slotOf(v, n)]].osc[0].wave);
    assert.equal(new Set(waves).size, n, `${n} voices, ${waves}`);
  }
  // Three voices: a pulse and the wave channel's two samples (the hollow one, the sawtooth bass).
  assert.deepEqual([0, 1, 2].map((v) => PATCHES[slots[slotOf(v, 3)]].osc[0].wave), ["pulse25", "gbHollow", "gbSaw"]);
  for (const s of slots) {
    const pt = PATCHES[s];
    assert.equal(pt.osc.length, 1, `${s}: one channel, one wave`);
    assert.equal(pt.filter, undefined, `${s}: unfiltered, as the hardware (forward, not mellow)`);
    assert.ok(pt.amp.a <= 0.002, `${s}: the hardware's instant attack`);
    const pulse = pt.osc[0].wave.startsWith("pulse");
    // The pulses step down in 1/15ths to a floor (amp.s its share); the wave channel has no envelope.
    assert.equal(!!pt.steps, pulse, s);
    if (pt.steps) {
      assert.ok(pt.steps.from <= 15 && pt.steps.to > 0 && pt.steps.to < pt.steps.from && pt.steps.period >= 1 && pt.steps.period <= 7, s);
      assert.ok(Math.abs(pt.amp.s - pt.steps.to / pt.steps.from) < 1e-9, s);
    } else assert.equal(pt.amp.s, 1, s);
  }
  // Vibrato on the lead only, late.
  assert.ok(PATCHES.gbLead.vib && PATCHES.gbLead.vib.delay >= 0.2);
  assert.equal(PATCHES.gbBass.vib, undefined);
  // The wave samples: 32 steps of 4 bits.
  for (const w of ["gbSaw", "gbHollow"] as const) {
    const levels = Array.from({ length: 32 }, (_, k) => (SHAPES[w]((k + 0.5) / 32) + 1) * 7.5);
    for (const l of levels) assert.ok(Math.abs(l - Math.round(l)) < 1e-9 && l >= 0 && l <= 15, `${w}: ${l}`);
  }
  // The bass sample: a sawtooth (every harmonic, 1/n), so a phone's speaker follows its pitch (D291).
  const { real, imag } = harmonicsOf(SHAPES.gbSaw, 8);
  const a = (k: number) => Math.hypot(real[k], imag[k]);
  assert.ok(a(2) / a(1) > 0.4 && a(3) / a(1) > 0.25 && a(4) / a(1) > 0.18);
});

test("D294, D297: ANALOG SYNTH (SWITCHED-ON): every line its own patch through a 24 dB lowpass, no detuned unisons, a bass a phone can hear", () => {
  const slots = presetById("analog").slots!;
  assert.equal(new Set(slots).size, 5, "five patches");
  for (const s of slots) {
    const pt = PATCHES[s];
    assert.equal(pt.filter?.poles, 4, `${s}: 24 dB`);
    // D305: a slow chorus on the bloop (a second sawtooth 7 cents up) and the bass layered (two sawtooths 8 cents apart); no other.
    assert.ok(pt.osc.every((o) => !o.detune || (["solBloop", "solBass"].includes(s) && Math.abs(o.detune) <= 8)), `${s}: no chorus`);
    assert.equal(pt.scoop, undefined, `${s}: no pitch scoop`);
    assert.equal(pt.sample, undefined);
  }
  // The bass's filter never below 1.4 kHz (its overtones on a phone's speaker, D291).
  const bass = PATCHES[slots[4]];
  assert.ok(bass.filter!.hz && bass.filter!.freq >= 1400);
  assert.ok(bass.osc.some((o) => o.wave === "saw"));
  // Vibratos apart in rate, none on the bass.
  const rates = slots.map((s) => PATCHES[s].vib?.rate).filter((r): r is number => r !== undefined);
  for (let i = 0; i < rates.length; i++) for (let j = i + 1; j < rates.length; j++) assert.ok(Math.abs(rates[i] - rates[j]) >= 0.6, `${rates}`);
  assert.equal(bass.vib, undefined);
});

test("D292: the pianos: struck (dying away, never held), the bass with more overtones, the FM waves' partials", () => {
  for (const id of ["pianoSampled"]) {
    const p = presetById(id);
    assert.equal(p.id, id);
    // D358: one piano: every voice on the one patch (D294's lighter inner voices withdrawn: the balance is the touch's, practice.ts pianoLevels).
    assert.equal(new Set(p.slots!).size, 1);
    for (const s of [...p.slots!, "pianoFm", "pianoFmBass"] as const) {
      const pt = PATCHES[s];
      assert.equal(pt.amp.s, 0, `${s}: a struck note dies away`);
      assert.ok(pt.amp.a <= 0.003 && pt.amp.d >= 1, `${s}`);
      assert.ok((pt.filter?.env ?? 1) > 1.5, `${s}: brighter at the hammer, darkening`);
    }
  }
  const amps = (f: (x: number) => number) => {
    const { real, imag } = harmonicsOf(f, 16);
    return Array.from({ length: 16 }, (_, k) => Math.hypot(real[k], imag[k]));
  };
  // The string: its fundamental strongest, harmonics 2 to 4 present.
  const s = amps(SHAPES.fmPiano);
  assert.ok(s[1] > s[2] && s[2] > 0.1 && s[3] > 0.05 && s[4] > 0.02);
  // The bass string: more of its sound above the fundamental (what a phone's speaker plays, D291).
  const b = amps(SHAPES.fmPianoBass);
  const upper = (a: number[]) => a.slice(3).reduce((x, y) => x + y * y, 0) / a.reduce((x, y) => x + y * y, 0);
  assert.ok(upper(b) > 2 * upper(s), `${upper(b)} against ${upper(s)}`);
});

test("D209: the consoles' wave shapes: one cycle each, within -1..1, and their harmonics", () => {
  for (const [name, f] of Object.entries(SHAPES)) {
    for (let j = 0; j < 64; j++) {
      const y = f(j / 64);
      assert.ok(y >= -1.0001 && y <= 1.0001, `${name} at ${j}`);
    }
  }
  // The NES triangle: 32 four-bit steps, top at the start, bottom at the middle.
  assert.equal(SHAPES.tri4(0), 1);
  assert.equal(SHAPES.tri4(15.5 / 32), -1);
  assert.equal(new Set(Array.from({ length: 32 }, (_, k) => SHAPES.tri4((k + 0.5) / 32))).size, 16);
  // The VRC6 saw: seven steps.
  assert.equal(new Set(Array.from({ length: 70 }, (_, k) => SHAPES.saw7((k + 0.5) / 70))).size, 7);
  // A sine's harmonics: the first alone.
  const { real, imag } = harmonicsOf((x) => Math.sin(2 * Math.PI * x), 8);
  assert.ok(Math.abs(imag[1] - 1) < 1e-6 && Math.abs(real[1]) < 1e-6);
  for (let k = 2; k < 8; k++) assert.ok(Math.abs(imag[k]) < 1e-6 && Math.abs(real[k]) < 1e-6);
  // The FM bell's partials: 1, 6, 8 (a 1:7 modulator), nothing at 2.
  const bell = harmonicsOf(SHAPES.fmBell, 16);
  const amp = (k: number) => Math.hypot(bell.real[k], bell.imag[k]);
  assert.ok(amp(6) > 0.2 && amp(8) > 0.2 && amp(2) < 1e-6);
});

test("D209: the two new chip loops keep a beat in 4/4, 3/4 and compound time", () => {
  for (const g of ["chipBounce", "chipFunk"] as const)
    for (const [per, compound] of [[4, false], [3, false], [4, true]] as const) {
      const hits = Array.from({ length: per }, (_, b) => grooveHits(g, b, 0, per, compound)).flat();
      assert.ok(hits.some((h) => h.drum === "kick") && hits.length >= per * 2, `${g} ${per} ${compound}`);
      for (const h of hits) assert.ok(h.at >= 0 && h.at < 1 && h.vel > 0 && h.vel <= 1);
    }
});
