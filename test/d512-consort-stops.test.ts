/**
 * D512, STRING CONSORT'S ARTICULATION STOPS (consort-stops.ts; chip.ts Chip.noteNow; sampled.ts's spiccato and
 * pizzicato sets): the list and its labels, the state per piece (set, get, told, kept), what each stop makes of a
 * consort note (the player's voice; every voice under TUTTI; ARCO and other sounds untouched), the recordings
 * hooked up (every file's tuning and length measured, the louder layer played) and loaded with the consort, and
 * a note under a stop playing that stop's recording, from the next note.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, voicing } from "../src/touch/chip.ts";
import { PATCHES, sampledNow, setPreset } from "../src/touch/sound.ts";
import { fileOf, noteInfo, sampledMidis, sampleHz, SAMPLED, PERIOD } from "../src/touch/sampled.ts";
import { SAMPLE_MANIFEST } from "../src/audio/sample-manifest.ts";
import { holdMode } from "../src/touch/touch-expr.ts";
import {
  chooseConsortStop,
  consortNote,
  consortStop,
  consortStopLabel,
  CONSORT_HOME,
  CONSORT_KEY,
  CONSORT_STOPS,
  CONSORT_STOP_LABEL,
  DEFAULT_CONSORT,
  hasConsortStops,
  loadConsortStop,
  onConsortStop,
  openConsortPiece,
  saveConsortStop,
  setConsortStop,
  SORDINO,
  stopNote,
  TREMOLO,
} from "../src/touch/consort-stops.ts";

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const C = "stringConsort";
type Id = keyof typeof PATCHES;

test("D512: five stops, ARCO first and home, each labelled in English, Portuguese and Spanish", () => {
  assert.deepEqual([...CONSORT_STOPS], ["arco", "spicc", "pizz", "sord", "trem"]);
  assert.equal(CONSORT_HOME, "arco");
  for (const s of CONSORT_STOPS) {
    const l = CONSORT_STOP_LABEL[s];
    for (const k of ["en", "pt", "es", "short"] as const) assert.ok(l[k].length > 0 && l[k] === l[k].toUpperCase(), `${s} ${k}`);
    assert.equal(consortStopLabel(s, "pt"), l.pt);
    assert.equal(consortStopLabel(s, "es"), l.es);
    assert.equal(consortStopLabel(s, "fr"), l.en);
    assert.ok(l.short.length <= 6, s);
  }
  assert.ok(hasConsortStops(C));
  for (const id of ["baroqueBand", "pianoSampled", "chamberOrgan", "harpsichordSampled"]) assert.ok(!hasConsortStops(id), id);
});

test("D512: what each stop makes of a consort note: its own patch (spiccato, pizzicato, tremolo), the mute, ARCO as it was", () => {
  const pairs: [Id, Id, Id][] = [
    ["consViolin", "consViolinSpicc", "consViolinPizz"],
    ["consViola", "consViolaSpicc", "consViolaPizz"],
    ["consCello", "consCelloSpicc", "consCelloPizz"],
  ];
  for (const [a, s, p] of pairs) {
    const pt = PATCHES[a];
    assert.equal(stopNote("arco", pt), null);
    assert.equal(stopNote("spicc", pt)?.patch, PATCHES[s]);
    assert.equal(stopNote("pizz", pt)?.patch, PATCHES[p]);
    const t = stopNote("trem", pt)!.patch!;
    assert.deepEqual(t.trem, { depth: TREMOLO.depth, rate: TREMOLO.rate });
    assert.equal(t.sample, pt.sample);
    // The tremolo's mean level given back (chip.ts takes depth/2 off it).
    assert.ok(Math.abs(t.level * (1 - TREMOLO.depth / 2) - pt.level * TREMOLO.trim) < 1e-9);
    assert.equal(stopNote("trem", pt)!.patch, t, "one tremolo patch per voice");
    assert.deepEqual(stopNote("sord", pt), { lp: SORDINO.lp, level: SORDINO.gain });
    // The recorded stops die away by themselves (no sway to answer: holdMode none); their room and place the arco's.
    for (const v of [PATCHES[s], PATCHES[p]]) {
      assert.ok(v.sample && SAMPLED[v.sample].plucked, s);
      assert.equal(v.send, pt.send);
      assert.deepEqual(v.one, pt.one);
      assert.equal(holdMode("singers", v, true), "none");
    }
    assert.equal(holdMode("singers", pt, false), "messa");
  }
  // A mute is softer and darker, never louder.
  assert.ok(SORDINO.gain < 1 && SORDINO.gain > 0.5 && SORDINO.lp >= 2000 && SORDINO.lp <= 3500);
  // Not the consort's patches: untouched (the baroque band's own strings, another sound's).
  assert.equal(stopNote("pizz", PATCHES.bandViolin), null);
  assert.equal(stopNote("pizz", null), null);
});

test("D512: the player's voice alone, every consort voice under TUTTI, nothing on another sound", () => {
  const st = { stop: "pizz" as const, tutti: false };
  assert.equal(consortNote(C, st, PATCHES.consViolin, true)?.patch, PATCHES.consViolinPizz);
  assert.equal(consortNote(C, st, PATCHES.consViolin, false), null);
  assert.equal(consortNote(C, { ...st, tutti: true }, PATCHES.consCello, false)?.patch, PATCHES.consCelloPizz);
  assert.equal(consortNote("baroqueBand", { ...st, tutti: true }, PATCHES.consViolin, true), null);
  assert.equal(consortNote(C, DEFAULT_CONSORT, PATCHES.consViolin, true), null);
});

test("D512: the state: set, get, told, kept per piece (an unknown record reads as ARCO)", () => {
  store.clear();
  const seen: string[] = [];
  const off = onConsortStop((id, s) => seen.push(`${id}:${s.stop}:${s.tutti}`));
  assert.deepEqual(consortStop(C), DEFAULT_CONSORT);
  setConsortStop(C, { stop: "spicc", tutti: true });
  assert.deepEqual(consortStop(C), { stop: "spicc", tutti: true });
  assert.deepEqual(consortStop("pianoSampled"), DEFAULT_CONSORT);
  setConsortStop(C, { stop: "nonsense" as never, tutti: false });
  assert.equal(consortStop(C).stop, "arco");
  chooseConsortStop("wtc1f2", C, "trem", true);
  assert.deepEqual(loadConsortStop("wtc1f2"), { stop: "trem", tutti: true });
  assert.deepEqual(loadConsortStop("wtc1f3"), DEFAULT_CONSORT);
  off();
  assert.deepEqual(seen, [`${C}:spicc:true`, `${C}:arco:false`, `${C}:trem:true`]);
  // ARCO without TUTTI kept as nothing; a broken record as ARCO.
  saveConsortStop("wtc1f2", DEFAULT_CONSORT);
  assert.equal(JSON.parse(store.get(CONSORT_KEY)!).wtc1f2, undefined);
  store.set(CONSORT_KEY, JSON.stringify({ wtc1f4: { stop: 7, tutti: "yes" } }));
  assert.deepEqual(loadConsortStop("wtc1f4"), DEFAULT_CONSORT);
  store.set(CONSORT_KEY, "{not json");
  assert.deepEqual(loadConsortStop("wtc1f4"), DEFAULT_CONSORT);
  saveConsortStop("wtc2f9", { stop: "sord", tutti: false });
  openConsortPiece("wtc2f9");
  assert.deepEqual(consortStop(C), { stop: "sord", tutti: false });
  setConsortStop(C, DEFAULT_CONSORT);
});

test("D512: the recordings hooked up: every file's tuning and length measured, the louder layer, loaded with the consort", () => {
  const sets = ["consortViolinSpicc", "consortViolaSpicc", "consortCelloSpicc", "consortViolinPizz", "consortViolaPizz", "consortCelloPizz"] as const;
  for (const id of sets) {
    const inst = SAMPLED[id];
    const folder = PERIOD[inst.set].folder;
    assert.deepEqual(SAMPLE_MANIFEST[folder].layers, [1, 2], folder);
    assert.equal(inst.layer, 2);
    assert.ok(inst.plucked && inst.maxShift !== undefined && inst.maxShift <= 3);
    const ms = sampledMidis(inst.set);
    assert.equal(ms.length, SAMPLE_MANIFEST[folder].notes.length);
    for (const m of ms) {
      const n = noteInfo(inst.set, m)!;
      assert.ok(n, `${id} ${m}`);
      assert.ok(Math.abs(n.cents) < 30, `${id} ${m} ${n.cents}`);
      assert.ok(n.len > 0.4 && n.len <= 1.5, `${id} ${m} ${n.len}`);
      assert.equal(n.loop, undefined);
      assert.match(fileOf(inst.set, m), /-v2\.mp3$/);
    }
    assert.ok(inst.gain > 0.5 && inst.gain < 12, `${id} ${inst.gain}`);
  }
  setPreset(C);
  const now = sampledNow();
  for (const id of sets) assert.ok(now.includes(id), id);
  setPreset("pianoSampled");
  assert.ok(!sampledNow().includes("consortViolinPizz"));
});

installFakeAudio(5, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

test("D512: a note under a stop plays that stop's recording, from the next note; ARCO's own for the band without TUTTI", async () => {
  setPreset(C);
  const chip = new Chip();
  await chip.prepare([60, 62, 64, 65, 67, 69, 72], [64, 67, 72]);
  // The recording a note plays told by its playback rate (each set's own measured tuning: sampled.ts sampleHz).
  const rates = (lead: boolean) => {
    const c = chip as unknown as { ctx: FakeAudioContext };
    const before = new Set(c.ctx.nodes);
    chip.note(67, c.ctx.currentTime + 0.5, 1, voicing(0, 4, true), lead ? { lead: true, touch: 0.5 } : {});
    return [...c.ctx.nodes]
      .filter((n): n is FakeSource => !before.has(n) && n instanceof FakeSource && n.kind === "buffer")
      .map((s) => (s as unknown as { playbackRate: FakeParam }).playbackRate.value);
  };
  setConsortStop(C, { stop: "arco", tutti: false });
  const [arco] = rates(true);
  const [band0] = rates(false);
  assert.ok(Math.abs(arco - band0) < 1e-9);
  setConsortStop(C, { stop: "pizz", tutti: false });
  const [pizz] = rates(true);
  const [band] = rates(false);
  const want = sampleHz("consortViolin", 67) / sampleHz("consortViolinPizz", 67);
  assert.ok(Math.abs(pizz / arco - want) < 1e-6, `${pizz / arco} ${want}`);
  assert.ok(Math.abs(band - arco) < 1e-9, "the band's note its arco without TUTTI");
  setConsortStop(C, { stop: "spicc", tutti: true });
  const [bandSpicc] = rates(false);
  assert.ok(Math.abs(bandSpicc / arco - sampleHz("consortViolin", 67) / sampleHz("consortViolinSpicc", 67)) < 1e-6, "under TUTTI the band follows");
  setConsortStop(C, DEFAULT_CONSORT);
});
