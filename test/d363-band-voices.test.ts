/**
 * D363: DIVISI TO THE BAND. Where an edition writes two notes at once in one voice (the kern encodings'
 * split spines in 14 of the 48; Mutopia's extra voices on a staff in Contrapunctus 5, 6 and 7), the
 * voice keeps one line (the one that carries on, the subject where an entry runs through, the top of
 * an upper voice's last chord, the bottom of the bass's) and the rest is a band-only voice
 * (TouchFugue.bandVoices): played by the band always, sounding as its parent, and no voice anywhere else.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { barAt, bandNotes, everyNote, fugueById, loadExtras, MORE_BACH, PIECES, writtenNotes, type TouchNote } from "../src/touch/fugue.ts";
import { accompaniment, stepRange, voicesFrom } from "../src/touch/voice-mode.ts";
import { parsePitch } from "../src/music/pitch.ts";
import { splitDivisi } from "../tools/touch/divisi.ts";
import { labGame } from "../src/bench/lab/game.ts";
import { silentChip } from "../src/bench/lab/replay.ts";
import { kindsOf } from "../src/touch/practice.ts";
import { voicing, type Chip } from "../src/touch/chip.ts";
import type { LabPassage } from "../src/bench/lab/log.ts";

await loadExtras();

const WITH_BAND: Record<string, number[]> = {
  wtc1f01: [0],
  wtc1f06: [0],
  wtc1f07: [0],
  wtc1f15: [0, 2],
  wtc1f20: [0, 3],
  wtc1f24: [1],
  wtc2f02: [0, 1],
  wtc2f03: [0, 1, 2],
  wtc2f06: [0, 1],
  wtc2f08: [0, 1],
  wtc2f10: [1, 2],
  wtc2f16: [0],
  wtc2f17: [0, 2],
  wtc2f20: [1],
  "bwv1080-05": [0, 1, 3],
  "bwv1080-06": [0],
  "bwv1080-07": [0],
};
const ALL = [...PIECES, ...MORE_BACH];
const overlaps = (ns: TouchNote[]) => ns.some((n, i) => ns.some((m, j) => i !== j && m[0] < n[0] && n[0] < m[0] + m[1]));

test("D363: the band-only voices are D361's divisi exactly: 23 voices of 14 of the 48, Contrapunctus 5 (three voices), 6 and 7", () => {
  const found: Record<string, number[]> = {};
  for (const f of ALL) if (f.bandVoices) found[f.id] = f.bandVoices.map((b) => b.of);
  assert.deepEqual(found, WITH_BAND);
  assert.equal(Object.entries(found).filter(([id]) => id.startsWith("wtc")).reduce((a, [, v]) => a + v.length, 0), 23);
  for (const f of ALL)
    for (const b of f.bandVoices ?? []) {
      assert.ok(b.of >= 0 && b.of < f.voices.length && b.notes.length > 0, `${f.id} band voice of ${b.of}`);
      assert.ok(!f.playable || f.playable.includes(b.of), `${f.id}: its parent a voice the player may take`);
    }
});

test("D363: a band-only voice is no voice: not named, not offered, not counted (N VOICES, the ensemble's layout by count, the inks)", () => {
  for (const id of Object.keys(WITH_BAND)) {
    const f = fugueById(id);
    assert.equal(f.voiceNames.length, f.voices.length, `${id}: a name a voice, none for the band's`);
    // The voices offered from the start (the pop-up's choice): the voices, never the band's.
    assert.deepEqual(voicesFrom(f, 0), f.voices.map((_, v) => v));
    // The ensemble's layout and each slot's sound go by the voices' count: the band's notes take their parent's.
    const kinds = kindsOf("organ", f.voices.length);
    assert.equal(kinds.length, f.voices.length);
    for (const n of accompaniment(f, 0, -1).filter((x) => x.band)) assert.ok(n.voice < f.voices.length);
  }
  // The counts the cards and the pop-up show: as before D363 (the 48's voice counts from their names).
  assert.equal(fugueById("wtc1f20").voices.length, 4);
  assert.equal(fugueById("wtc2f03").voices.length, 3);
  assert.equal(fugueById("bwv1080-05").voices.length, 4);
});

test("D363: nothing lost: each of the 48's voices, its line and its band-only voice together, is the encoding's voice (an exact unison of two sub-lines one key)", () => {
  const corpus: { id: string; voices: [number, number, string, number][][] }[] = JSON.parse(readFileSync(new URL("../data/wtc/fugues.json", import.meta.url), "utf8"));
  let dropped = 0;
  for (const p of corpus) {
    const f = fugueById(p.id);
    p.voices.forEach((v, vi) => {
      const key = (on: number, dur: number, midi: number) => `${on}:${dur}:${midi}`;
      const raw = v.filter(([, d]) => d > 0).map(([on, dur, pitch]) => key(on, dur, parsePitch(pitch).midi)).sort();
      const got = writtenNotes(f, vi).map(([on, dur, midi]) => key(on, dur, midi)).sort();
      // Every note kept; one left out only where it doubles another exactly.
      if (!f.bandVoices?.some((b) => b.of === vi)) assert.deepEqual(got, raw, `${p.id} voice ${vi} untouched`);
      else {
        assert.deepEqual([...new Set(got)].sort(), [...new Set(raw)].sort(), `${p.id} voice ${vi}`);
        dropped += raw.length - got.length;
      }
      assert.ok(!overlaps(f.voices[vi]), `${p.id} voice ${vi} one line`);
    });
  }
  // II/3's doubled sub-lines (16 in the soprano, 6 in the alto), II/6's alto (2), II/20's alto (1).
  assert.equal(dropped, 25);
});

test("D363: the line kept: the one that carries on, the subject where an entry runs through, the last chord's top (an upper voice) or bottom (the bass)", () => {
  const at = (id: string, v: number, bar: number) => {
    const f = fugueById(id);
    return f.voices[v].filter((n) => barAt(f, n[0]) === bar);
  };
  const name = (m: number) => `${"C C# D Eb E F F# G Ab A Bb B".split(" ")[m % 12]}${Math.floor(m / 12) - 1}`;
  const last = (id: string, v: number) => name(fugueById(id).voices[v].at(-1)![2]);
  // Upper voices' last notes the top, the bass's the bottom.
  // I/20's soprano: its last entry (b. 85) runs to the end in the lower sub-line, ending on the C#5
  // of the last chord, the A5 held above it the band's (the subject before the top).
  assert.equal(last("wtc1f20", 0), "C#5");
  assert.equal(last("wtc1f20", 3), "A2");
  assert.equal(last("wtc1f06", 0), "D5");
  assert.equal(last("wtc1f15", 0), "G5");
  assert.equal(last("wtc1f15", 2), "G2");
  assert.equal(last("wtc2f03", 2), "C#2");
  assert.equal(last("bwv1080-05", 0), "D5");
  assert.equal(last("bwv1080-05", 3), "D3");
  // I/15's bass holds its pedal G2 (bar 84), the moving line above it the band's.
  assert.deepEqual(at("wtc1f15", 2, 84).map((n) => [name(n[2]), n[1]]), [["G2", 16320]]);
  // I/20's soprano in bar 80 is the subject (A G# A B C), the held A5 above it the band's; every entry's notes are its voice's.
  assert.deepEqual(at("wtc1f20", 0, 80).filter((n) => n[0] >= 610560).map((n) => name(n[2])), ["A4", "Ab4", "A4", "B4"]);
  for (const f of ALL)
    for (const e of f.entries) {
      const line = new Set(f.voices[e.voice].map((n) => `${n[0]}:${n[2]}`));
      assert.ok(e.notes.every((n) => line.has(`${n[0]}:${n[2]}`)), `${f.id} entry b. ${e.bar}`);
      assert.ok(line.has(`${e.notes[0]?.[0]}:${e.notes[0]?.[2]}`) || !e.notes.length, `${f.id} entry b. ${e.bar}: its head in the line`);
    }
  // II/17's tenor (bar 48) keeps its entry's moving line; the chromatic minims under it are the band's.
  assert.deepEqual(bandNotes(fugueById("wtc2f17"), 2).filter((n) => barAt(fugueById("wtc2f17"), n[0]) === 48).map((n) => name(n[2])), ["Ab3"]);
});

test("D363: the splitter: a chord alone stays a chord; a divisi and the music joined to it become one line; the subject first", () => {
  const n = (on: number, dur: number, midi: number, sub = 0) => ({ n: [on, dur, midi, 0] as [number, number, number, number], sub });
  // A chord struck and released together, a rest before and after: left alone.
  assert.deepEqual(splitDivisi([n(0, 480, 60), n(960, 480, 64), n(960, 480, 67), n(1920, 480, 65)], false).band, []);
  // A held note under a moving one: the higher kept in an upper voice, the lower in the bass.
  const div = [n(0, 480, 72), n(480, 960, 67, 1), n(480, 480, 71), n(960, 480, 69)];
  assert.deepEqual(splitDivisi(div, false).band.map((x) => x[2]), [67]);
  assert.deepEqual(splitDivisi(div, true).band.map((x) => x[2]), [71, 69]);
  // The subject's notes kept wherever they are.
  assert.deepEqual(splitDivisi([...div, n(1440, 480, 72)], false, new Set(["480:67"])).band.map((x) => x[2]), [71, 69]);
  // An exact unison of two sub-lines: one key, dropped.
  const s = splitDivisi([n(0, 480, 60), n(0, 480, 60, 1), n(480, 240, 62), n(480, 480, 62, 1), n(720, 240, 64)], false);
  assert.deepEqual([s.main.map((x) => x[2]), s.band.map((x) => [x[1], x[2]]), s.unisons], [[60, 62, 64], [[480, 62]], 1]);
});

const passage = (piece: string, voice: number, fromBar: number, toBar: number): LabPassage => ({ piece, voice, fromBar, toBar, bpm: 60, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null });

test("D363: in the game the band plays the divisi as its parent, the player's voice or not; the player's lane is one line", () => {
  type Sent = { midi: number; at: number; v: unknown };
  const run = (p: LabPassage) => {
    const clock = { t: 0 };
    const sent: Sent[] = [];
    const chip = { ...silentChip(clock), note: (midi: number, at: number, _d: number, v: unknown) => (sent.push({ midi, at, v }), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} }) } as unknown as Chip;
    Object.defineProperty(chip, "ctx", { value: { get currentTime() { return clock.t; } } });
    const g = labGame(p, chip);
    return { g, sent, clock };
  };
  const f = fugueById("wtc1f20");
  // The player on the soprano, bars 80-87: a line; the band has the soprano's divisi (as the soprano) and the other three voices.
  const { g } = run(passage("wtc1f20", 0, 80, 87));
  const lane = g.tracks[0].notes;
  // (Bar 80's first chord, E5 G#5 struck and released together, before a rest: a chord, one touch.)
  assert.ok(lane.every((x) => lane.every((y) => !(y.on < x.on && x.on < y.on + y.dur)) && lane.every((y) => y.on !== x.on || y.dur === x.dur)), "the soprano one note at a time");
  const band = g.others.filter((x) => x.band);
  assert.ok(band.length >= 40 && band.every((x) => x.voice === 0 || x.voice === 3));
  assert.ok(g.others.filter((x) => !x.band).every((x) => x.voice !== 0), "the soprano's line the player's");
  // The player on the alto: the soprano's line and its divisi both the band's, as the soprano.
  const alto = run(passage("wtc1f20", 1, 80, 87)).g;
  const sop = alto.others.filter((x) => x.voice === 0);
  assert.equal(sop.filter((x) => x.band).length, band.filter((x) => x.voice === 0).length);
  assert.ok(sop.some((x) => !x.band));
  // Sounding as its parent: the same voicing (instrument, register, slot) as the parent's notes.
  assert.deepEqual(voicing(0, f.voices.length, false), voicing(band[0].voice, f.voices.length, false));
  // The box's range takes them in; the score sheet writes them with their voice.
  const r = stepRange(f);
  assert.ok(everyNote(f).every((x) => x[3] >= r.lo && x[3] <= r.hi));
  assert.equal(writtenNotes(f, 0).length, f.voices[0].length + bandNotes(f, 0).length);
});
