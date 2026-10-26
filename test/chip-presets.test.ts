import { test } from "node:test";
import assert from "node:assert/strict";
import { grooveHits, harmonicsOf, PATCHES, patchFor, playerSound, presetById, PRESETS, RETIRED, setPreset, SHAPES, slotOf, TRAVERSO } from "../src/touch/sound.ts";
import { PIECE_SOUND, soundFor } from "../src/touch/piece-sound.ts";

test("D292: the players' sounds are exactly five, in order; every piece opens on one of them", () => {
  assert.deepEqual(PRESETS.map((p) => p.id), ["chip", "chipRound", "harpsichordSampled", "pianoSampled", "pianoFm"]);
  assert.deepEqual(PRESETS.map((p) => p.name), ["CLASSIC CHIP", "ROUND CHIP", "HARPSICHORD (SAMPLED)", "PIANO (SAMPLED)", "PIANO (FM)"]);
  const ids = PRESETS.map((p) => p.id);
  for (const [piece, id] of Object.entries(PIECE_SOUND)) assert.ok(ids.includes(id), `${piece}: ${id}`);
  // Every withdrawn sound (and the ensembles of D288) opens as one of the five; TRAVERSO only for WITH KIMIKO.
  for (const gone of ["strings", "baroque", "winds", "consort", "bossa", "carlos", "chipPocket", "chipGold", "chipPlumber", "chipHyrule", "chipBomber", "chipVampire", "chipDino", "chipLight", "chipBlur", "stringsReal", "chip3"]) {
    assert.equal(presetById(gone).id, "chip", gone);
    assert.equal(playerSound(gone), "chip", gone);
  }
  for (const id of Object.values(RETIRED)) assert.ok(ids.includes(id), id);
  assert.equal(presetById("organSampled").id, "harpsichordSampled");
  assert.equal(presetById("traverso"), TRAVERSO, "WITH KIMIKO's voice kept");
  assert.equal(playerSound("traverso"), "chip", "but no player's choice");
  assert.equal(soundFor("wtc1p04", { wtc1p04: "traverso" }, "chip"), "chip");
  assert.equal(soundFor("wtc1p04", { wtc1p04: "pianoFm" }, "chip"), "pianoFm");
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

test("D292: ROUND CHIP: softer than the classic (each wave lowpassed, a gentler attack), every voice its own wave, a bass a phone can hear", () => {
  const p = presetById("chipRound");
  const slots = p.slots!;
  for (const n of [2, 3, 4, 5]) {
    const waves = Array.from({ length: n }, (_, v) => PATCHES[slots[slotOf(v, n)]].osc[0].wave);
    assert.equal(new Set(waves).size, n, `${n} voices, ${waves}`);
  }
  for (const s of slots) {
    const pt = PATCHES[s];
    assert.ok(pt.filter && pt.filter.type === undefined, `${s}: lowpassed`);
    assert.ok(pt.amp.a >= 0.005, `${s}: a softer attack than the classic's 2 ms`);
    assert.ok(pt.amp.s > 0, `${s}: held, as the classic`);
    assert.ok(pt.osc.length <= 2, `${s}: light on the CPU`);
    assert.equal(pt.sample, undefined);
  }
  // The bass: a pulse in it, its overtones let through above 1 kHz (a phone's speaker gives almost nothing below 500 Hz, D291).
  const bass = PATCHES[slots[4]];
  assert.ok(bass.osc.some((o) => o.wave.startsWith("pulse") && (o.gain ?? 1) >= 0.4));
  assert.ok(bass.filter!.hz && bass.filter!.freq >= 1000);
});

test("D292: the pianos: struck (dying away, never held), the bass with more overtones, the FM waves' partials", () => {
  for (const id of ["pianoFm", "pianoSampled"]) {
    const p = presetById(id);
    assert.equal(p.id, id);
    for (const s of p.slots!) {
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
