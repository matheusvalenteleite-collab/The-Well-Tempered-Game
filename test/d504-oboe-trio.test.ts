/**
 * D504, ZELENKA TRIO (instruments session): two oboes of distinct characters, a bassoon, and a basso continuo (cello
 * and harpsichord) that joins the bass only where the piece's continuo script has it. Its structure (offered, named,
 * credited, one room, one send, the seats), the compasses and the folds (no note outside an instrument's compass;
 * the layout with the fewest), the continuo script's timing (only in the scripted spans, at the bass's phrase starts,
 * by the music alone), the touch (the breath's attack and swell, the soft new tongue, the slur, the reed's slide).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { FakeAudioContext, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, REVERBS, voicing, type Play } from "../src/touch/chip.ts";
import { CONTINUO_HARPSI, PATCHES, PRESETS, TRIO_COMPASS, TRIO_CONTINUO, TRIO_CREDIT, TRIO_JOIN, TRIO_SEND, TRIO_TONGUE, bowEntry, busoniReaches, creditFor, inCompass, offered, patchFor, presetById, setPieceLayout, setPreset, type PatchId } from "../src/touch/sound.ts";
import { nearestSample, rateFor, SAMPLED, TRIO_SHORT_S } from "../src/touch/sampled.ts";
import { hz } from "../src/touch/tuning.ts";
import { FUGUES, fugueById } from "../src/touch/fugue.ts";
import { ContinuoScript, TRIO_FOLD_SHARE, TRIO_ID, continuoFor, continuoMoments, continuoRule, foldsOf, phraseStarts, spansOf, trioLayout } from "../src/touch/trio.ts";
import { TRIO_CONTINUO_SCRIPTS } from "../src/touch/trio-continuo.ts";
import { tickOfBar } from "../src/touch/colour.ts";
import { BREATH_DB, BREATH_TONE_DB, breathGain, breathTone, breathVib, holdMode, landing, TOUCH_KINDS } from "../src/touch/touch-expr.ts";
import { exprFamily, touchFamily } from "../src/bench/glenn.ts";
import { slideFamily, slideGesture } from "../src/bench/slide-sound.ts";
import { PIECE_SOUND } from "../src/touch/piece-sound.ts";
import { COLOURS } from "../tools/touch/colour-plans/index.ts";
import { instrumentTuning } from "../src/touch/instrument-tuning.ts";
import { PT } from "../src/i18n/pt.ts";
import { ES } from "../src/i18n/es.ts";

register("./tsx-hooks.mjs", import.meta.url);
const { POP_SOUNDS } = await import("../src/bench/PlayPop.tsx");
const { SOUND_GROUPS } = await import("../src/bench/SoundSelect.tsx");

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 4 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

const trio = () => presetById(TRIO_ID);

test("D504: ZELENKA TRIO offered: in the list, an ensemble, named in three languages, credited, Busoni's dynamics reach it", () => {
  assert.ok(offered(TRIO_ID));
  assert.equal(trio().name, "ZELENKA TRIO");
  assert.ok(POP_SOUNDS.some(([s, n]) => s === TRIO_ID && n === "ZELENKA TRIO"));
  assert.ok(SOUND_GROUPS.find(([g]) => g === "ENSEMBLES")![1].includes(TRIO_ID));
  assert.equal((PT as Record<string, string>)["ZELENKA TRIO"], "TRIO DE OBOÉS");
  assert.equal((ES as Record<string, string>)["ZELENKA TRIO"], "TRÍO DE OBOES");
  assert.equal(creditFor(TRIO_ID), TRIO_CREDIT);
  assert.match(TRIO_CREDIT, /IOWA/);
  assert.match(TRIO_CREDIT, /OBOE II.*CC0/);
  assert.ok(busoniReaches(TRIO_ID));
  assert.equal(instrumentTuning(TRIO_ID).a, 415);
  // WIND QUINTET stays an unoffered trial.
  assert.ok(!offered("trialWinds") && presetById("trialWinds").id === "trialWinds");
});

test("D504: one intimate room, one send for every player, seated within ±0.22 (oboe I left, oboe II right)", () => {
  const p = trio();
  assert.equal(p.fx, "chamber");
  const r = REVERBS.chamber;
  assert.ok(r.rt60 < REVERBS.band.rt60 && r.rt60 < REVERBS.salon.rt60, "smaller than the band's and the salon's");
  assert.ok(r.hp <= 150, "the bassoon's and the continuo's lines in the room");
  const layouts = [...Object.values(p.by ?? {}), ...Object.values(p.alts ?? {}).flat()];
  for (const vs of layouts) {
    for (const [id, pan] of vs!) {
      assert.equal(PATCHES[id].send, TRIO_SEND, id);
      assert.ok(Math.abs(pan) <= 0.22, `${id} ${pan}`);
    }
  }
  for (const c of [...(PATCHES.trioBassoon.continuo ?? []), ...(PATCHES.trioCello.continuo ?? [])]) assert.equal(c.patch.send, TRIO_SEND, "the continuo in the same room");
  const three = p.by![3]!;
  assert.deepEqual(three.map(([id]) => id), ["trioOboe1", "trioOboe2", "trioBassoon"]);
  assert.ok(three[0][1] < 0 && three[1][1] > 0, "the two oboes either side");
  assert.deepEqual(p.by![2]!.map(([id]) => id), ["trioOboe1", "trioBassoon"]);
  assert.deepEqual(p.by![4]!.map(([id]) => id), ["trioOboe1", "trioOboe2", "trioBassoon", "trioCello"]);
  assert.deepEqual(p.by![5]!.map(([id]) => id), ["trioOboe1", "trioOboe2", "trioHarpsi", "trioBassoon", "trioCello"]);
});

test("D504: the two oboes distinct (Iowa's straight oboe I, VSCO's vibrato oboe II, each its soft layer and short notes); the bassoon two dynamics and short notes", () => {
  const o1 = SAMPLED[PATCHES.trioOboe1.sample!];
  const o2 = SAMPLED[PATCHES.trioOboe2.sample!];
  const bn = SAMPLED[PATCHES.trioBassoon.sample!];
  assert.notEqual(o1.set, o2.set);
  for (const i of [o1, o2, bn]) {
    assert.ok(i.soft && i.short && !i.plucked, i.set);
    assert.ok(i.short!.under === TRIO_SHORT_S && TRIO_SHORT_S <= 0.2);
  }
  // Oboe II's swell brings a little vibrato (Patch.vib, none at rest); oboe I none.
  assert.ok(PATCHES.trioOboe2.vib && PATCHES.trioOboe2.vib.depth === 0);
  assert.equal(PATCHES.trioOboe1.vib, undefined);
  // The recordings in the repository: the bassoon every semitone Bb1-D5 (Iowa has no fortissimo B3), the oboe Bb3-Ab6.
  const manifest = readFileSync(new URL("../src/audio/sample-manifest.ts", import.meta.url), "utf8");
  const notes = (set: string) => JSON.parse(manifest.slice(manifest.indexOf("= ") + 2, manifest.lastIndexOf(";")))[set].notes as string[];
  assert.equal(notes("trioBassoon").length, 40);
  assert.equal(notes("trioBassoonMf").length, 41);
  assert.equal(notes("trioOboe").length, 35);
  assert.equal(notes("trioOboeMf").length, 35);
});

test("D504: every instrument has a compass; a note outside it is played an octave nearer (inCompass), never out of it", () => {
  for (const id of ["trioOboe1", "trioOboe2", "trioBassoon", "trioCello", "trioHarpsi"] as PatchId[]) assert.ok(PATCHES[id].compass, id);
  assert.deepEqual(TRIO_COMPASS.oboe, { lo: 58, hi: 89 });
  assert.deepEqual(TRIO_COMPASS.bassoon, { lo: 34, hi: 75 });
  for (let m = 20; m < 110; m++) {
    for (const c of Object.values(TRIO_COMPASS)) {
      const f = inCompass(m, c);
      assert.ok(f >= c.lo && f <= c.hi && (f - m) % 12 === 0, `${m} ${f}`);
      if (m >= c.lo && m <= c.hi) assert.equal(f, m);
    }
  }
});

test("D504: the layout with the fewest folds: by's unless it folds over 1% of the notes; I/11 and I/13 none, II/23 two", () => {
  let total = 0;
  for (const f of FUGUES) {
    // (D632: the fold-share choice itself; a piece's seats by range, octave-seats.ts, come before it: below.)
    const l = trioLayout(f, false);
    const own = foldsOf(f, trio().by![f.voices.length] ?? trio().by![5]!);
    const sum = (x: number[]) => x.reduce((a, b) => a + b, 0);
    assert.ok(sum(l.folds) <= sum(own), f.id);
    if (sum(own) <= TRIO_FOLD_SHARE * f.voices.flat().length) assert.ok(!l.alt, `${f.id}: the trio's own layout`);
    total += sum(l.folds);
  }
  assert.ok(total < 400, `${total}`);
  // I/11's alto reaches Bb2: oboe I, the bassoon and the cello (no folds); I/13 (the trio's) the two oboes and the bassoon, none folded.
  // D632: a piece's own line-up (the seats by range) where it has one: II/9's alto on the bassoon.
  assert.deepEqual(trioLayout(fugueById("wtc2f09")).slots.map(([id]) => id), ["trioOboe1", "trioBassoon", "trioBassoon", "trioCello"]);
  const i11 = trioLayout(fugueById("wtc1f11"));
  assert.ok(i11.alt);
  assert.deepEqual(i11.slots.map(([id]) => id), ["trioOboe1", "trioBassoon", "trioCello"]);
  assert.deepEqual(i11.folds, [0, 0, 0]);
  const i13 = trioLayout(fugueById("wtc1f13"));
  assert.ok(!i13.alt);
  assert.deepEqual(i13.slots.map(([id]) => id), ["trioOboe1", "trioOboe2", "trioBassoon"]);
  assert.deepEqual(i13.folds, [0, 0, 0]);
  const ii23 = trioLayout(fugueById("wtc2f23"));
  assert.ok(!ii23.alt);
  assert.ok(ii23.folds.reduce((a, b) => a + b, 0) <= 2);
  // Set for a piece, the voices take it (patchFor); cleared, the preset's own.
  setPreset(TRIO_ID);
  setPieceLayout({ preset: TRIO_ID, count: 3, slots: i11.slots });
  assert.equal(patchFor(1, 3), PATCHES.trioBassoon);
  setPieceLayout(null);
  assert.equal(patchFor(1, 3), PATCHES.trioOboe2);
  setPreset("chip");
});

// D631 (the owner: "no note may sound in a different octave from the one written"): the compass fold withdrawn.
test("D504, D631: through the chip, an oboe's note under Bb3 sounds where it is written (its lowest recording read down), never an octave up", async () => {
  setPreset(TRIO_ID);
  const chip = new Chip();
  await chip.prepare([50, 62, 74], []);
  const rate = (midi: number) => {
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(midi, 1, 0.5, voicing(0, 3, false));
    const src = [...ctx.nodes].filter((x) => !before.has(x) && x instanceof FakeSource && (x as FakeSource).kind === "buffer") as FakeSource[];
    return src.map((s) => +(s as unknown as { playbackRate: FakeParam }).playbackRate.value.toFixed(5));
  };
  const set = SAMPLED[PATCHES.trioOboe1.sample!].set;
  const want = rateFor(set, nearestSample(set, 50)!, hz(50));
  for (const x of rate(50)) assert.ok(Math.abs(1200 * Math.log2(x / want)) < 1, `D3 read from ${nearestSample(set, 50)} at ${x} (written: ${want.toFixed(5)})`);
  assert.notDeepEqual(rate(50), rate(62));
  setPreset("chip");
});

const assigned = ["wtc1f13", "wtc2f23"];

test("D504: the continuo scripts: I/13 and II/23 each a script, every moment with its reason, in and out in turn", () => {
  for (const id of assigned) {
    const ms = TRIO_CONTINUO_SCRIPTS[id];
    assert.ok(ms && ms.length >= 5, id);
    const f = fugueById(id);
    const last = f.bars[f.bars.length - 1].n;
    ms.forEach(([bar, io, why], k) => {
      assert.equal(io, k % 2 === 0 ? "in" : "out", `${id} ${bar}`);
      assert.ok(bar >= 1 && bar <= last && why.length > 25, `${id} ${bar}`);
      if (k) assert.ok(bar > ms[k - 1][0], `${id}: in time`);
    });
    assert.equal(continuoMoments(f), ms);
  }
  // I/13: the bass's entry (5) brings it in; it is silent in the exposition's upper voices and the light episodes.
  const f = fugueById("wtc1f13");
  const c = new ContinuoScript(f);
  const bv = f.voices.length - 1;
  const firstIn = f.voices[bv].find((n) => c.at(n[0], bv));
  assert.ok(firstIn && firstIn[0] >= tickOfBar(f, 5) && firstIn[0] < tickOfBar(f, 6), "with the bass's entry at bar 5");
  const inEpisode = f.voices[bv].filter((n) => n[0] >= tickOfBar(f, 13) && n[0] < tickOfBar(f, 15));
  assert.ok(inEpisode.length && inEpisode.every((n) => c.at(n[0], bv) === null), "the episode 12-15: the bass alone");
  // No script for I/11 any more: its sound is TOMITA (on the trio it would take the rule).
  assert.equal(TRIO_CONTINUO_SCRIPTS.wtc1f11, undefined);
});

test("D504: the continuo only in its spans, entering and leaving at the bass's phrase starts, never mid-note", () => {
  for (const f of FUGUES) {
    const c = new ContinuoScript(f);
    const bv = f.voices.length - 1;
    const bass = f.voices[bv];
    const starts = new Set(phraseStarts(f));
    const ends = new Set(bass.map((n) => n[0] + n[1]));
    let prev = -1;
    for (const s of c.spans) {
      assert.ok(starts.has(s.from), `${f.id}: a span starts at a phrase start (${s.from})`);
      assert.ok(starts.has(s.to) || ends.has(s.to) || s.to === f.length, `${f.id}: a span ends at a phrase start or as the bass rests (${s.to})`);
      assert.ok(s.from > prev && s.to > s.from, f.id);
      prev = s.to;
    }
    // Each note reads it where it starts; never on an upper voice; somewhere in every fugue (its silences: the next test).
    for (let v = 0; v < bv; v++) for (const n of f.voices[v]) assert.equal(c.at(n[0], v), null);
    assert.ok(bass.some((n) => c.at(n[0], bv)), f.id);
    for (const n of bass) assert.equal(!!c.at(n[0], bv), c.spans.some((s) => n[0] >= s.from && n[0] < s.to));
  }
});

test("D504: the fallback from the structure: the bass's entries, the stretti and pedals, the cadences' approach, the last bars", () => {
  const f = fugueById("wtc1f02");
  const ms = continuoRule(f);
  assert.ok(ms.length >= 2 && ms[0][1] === "in");
  const spans = spansOf(f, ms);
  // The last bars always.
  assert.ok(spans.at(-1)!.to === f.length || spans.at(-1)!.to >= tickOfBar(f, f.bars.at(-1)!.n));
  // Every entry of the subject in the bass has the continuo on its first note.
  const bv = f.voices.length - 1;
  const c = new ContinuoScript(f);
  for (const e of f.entries.filter((x) => x.voice === bv)) assert.ok(c.at(f.voices[bv].find((n) => n[0] >= e.on)![0], bv), `${f.id} ${e.bar}`);
  // Silent in a good part of every fugue (the light episodes): never more than four fifths of its length.
  for (const g of FUGUES) {
    const cs = new ContinuoScript(g);
    const len = cs.spans.reduce((a, s) => a + s.to - s.from, 0);
    assert.ok(len <= 0.8 * g.length, `${g.id}: ${(len / g.length).toFixed(2)}`);
  }
  // Only the trio has one.
  assert.equal(continuoFor(f, "baroqueBand"), null);
  assert.ok(continuoFor(f, TRIO_ID));
});

test("D504: no score in it: the script reads the piece alone, and the game asks it by the note's onset and voice only", () => {
  const src = readFileSync(new URL("../src/touch/trio.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  assert.doesNotMatch(src, /score|streak|combo|multiplier|accuracy|crowd|hits|grade|verdict|judge/i);
  const game = readFileSync(new URL("../src/bench/proto-game.ts", import.meta.url), "utf8");
  const calls = [...game.matchAll(/this\.continuo\?\.at\((n\.on, voice|n\.on, n\.voice|notes\[i\]\.on, this\.voiceOf\(h\.k, i\))?/g)];
  // D494: two (the touch, the band); BLUETOOTH MODE's scheduling of the player's notes withdrawn.
  assert.equal(calls.length, 2);
  for (const m of calls) assert.ok(m[1], `asked by onset and voice only: ${m[0]}`);
  // The same question, the same answer, whatever else has happened.
  const c = new ContinuoScript(fugueById("wtc2f23"));
  const ticks = fugueById("wtc2f23").voices[3].map((n) => n[0]);
  const a = ticks.map((t) => c.at(t, 3));
  assert.deepEqual(ticks.map((t) => c.at(t, 3)), a);
});

test("D504: through the chip: a bass note with the continuo sounds its instruments a moment late, the strong beat's octave too; without it, the bass alone", async () => {
  setPreset(TRIO_ID);
  const chip = new Chip();
  await chip.prepare([36, 41, 48, 53, 60], [48]);
  const starts = (voice: number, count: number, play: Play = {}) => {
    const ctx = ctxOf();
    const before = new Set(ctx.nodes);
    chip.note(48, 1, 1, voicing(voice, count, false), play);
    // (The onsets only: the harpsichord's key-up noise at the note's end is no instrument entering.)
    return [...ctx.nodes].filter((x) => !before.has(x) && x instanceof FakeSource && (x as FakeSource).kind === "buffer" && (x as FakeSource).startAt !== null).map((x) => +((x as FakeSource).startAt! - 1).toFixed(4)).filter((t) => t < 0.5).sort((a, b) => a - b);
  };
  // Three voices: the bassoon on the bass; with the continuo the cello and the harpsichord.
  assert.equal(starts(2, 3).length, 1, "the bassoon alone");
  const on = starts(2, 3, { continuo: "on" });
  assert.equal(on.length, 3, `${on}`);
  assert.ok(on.some((t) => Math.abs(t - TRIO_CONTINUO.late) < 0.002), `the harpsichord ${TRIO_CONTINUO.late} s late: ${on}`);
  const strong = starts(2, 3, { continuo: "strong" });
  assert.equal(strong.length, 4, `the octave below on a strong beat: ${strong}`);
  assert.ok(strong.some((t) => Math.abs(t - TRIO_CONTINUO.late - TRIO_CONTINUO.spread) < 0.002), "the unison spread after the octave");
  // The player's bass note likewise.
  assert.equal(starts(2, 3, { continuo: "on", lead: true }).length, 3);
  // Four voices: the cello is the bass; the continuo adds the harpsichord.
  assert.equal(starts(3, 4).length, 1);
  assert.equal(starts(3, 4, { continuo: "on" }).length, 2);
  // An oboe has no continuo, whatever it is asked.
  assert.equal(starts(0, 3, { continuo: "on" }).length, 1);
  assert.ok(CONTINUO_HARPSI.level < 0.75 && CONTINUO_HARPSI.pan! < 0);
  setPreset("chip");
});

test("D504: the touch: the breath's attack (soft: a round start on the softer layer; strong: a firm, reedy one, brighter), the swell held", () => {
  assert.equal(TOUCH_KINDS[TRIO_ID], "winds");
  const soft = landing("winds", 0, 60, PATCHES.trioOboe1);
  const strong = landing("winds", 1, 60, PATCHES.trioOboe1);
  assert.equal(soft.layer, "soft");
  assert.ok(soft.soft! > 0.9 && soft.lp! < 8000);
  assert.equal(strong.layer, "firm");
  assert.ok(strong.tone! > 1.5 && strong.lp === undefined);
  assert.equal(soft.level, undefined, "no level from the landing: the line's own");
  assert.equal(holdMode("winds", PATCHES.trioOboe1, false), "breath");
  assert.ok(Math.abs(20 * Math.log10(breathGain(1)) - BREATH_DB) < 1e-9 && BREATH_DB === 4);
  assert.ok(Math.abs(20 * Math.log10(breathGain(-1)) + BREATH_DB) < 1e-9);
  assert.equal(breathTone(1), BREATH_TONE_DB);
  assert.ok(breathVib(0, 1) > 0 && breathVib(0, -1) === 0 && breathVib(0, 0) === 0);
});

test("D504: the joins: a two-thumb JOIN a soft new tongue, SET-AND-RELEASE the slur, the band's a soft tongue; a SLIDE a short portamento or a grace", () => {
  assert.equal(touchFamily(TRIO_ID), "strings");
  assert.equal(exprFamily(TRIO_ID), "bowed");
  for (const id of ["trioOboe1", "trioOboe2", "trioBassoon"] as PatchId[]) assert.equal(PATCHES[id].bow, TRIO_TONGUE, id);
  const join = bowEntry(TRIO_TONGUE, { legato: true, lead: true })!;
  assert.deepEqual(join, { ...TRIO_JOIN });
  assert.ok(join.floor > 0.18 && join.accentDb < 1.25, "softer than a bow change");
  assert.equal(bowEntry(TRIO_TONGUE, { legato: true, slur: true, lead: true })!.skip, 0.25);
  assert.equal(bowEntry(TRIO_TONGUE, { legato: true })!.skip, TRIO_TONGUE.skip);
  assert.equal(slideFamily(TRIO_ID), "reed");
  const step = slideGesture(TRIO_ID, 60, 62, 500, new Set([0, 2, 4, 5, 7, 9, 11]));
  assert.equal(step.kind, "glide");
  assert.ok(step.kind === "glide" && step.tau <= 0.03);
  const leap = slideGesture(TRIO_ID, 60, 67, 500, new Set([0, 2, 4, 5, 7, 9, 11]));
  assert.equal(leap.kind, "notes");
});

test("D504: the allocation: I/11 and II/23 open on the trio, with their reasons", () => {
  for (const id of assigned) {
    assert.equal(PIECE_SOUND[id], TRIO_ID, id);
    assert.equal(COLOURS[id].sound, TRIO_ID, id);
    assert.match(COLOURS[id].soundWhy, /ZELENKA TRIO/);
  }
  assert.ok(PRESETS.some((p) => p.id === TRIO_ID));
});
