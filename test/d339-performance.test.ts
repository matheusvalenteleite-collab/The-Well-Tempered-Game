/**
 * D339 (WTC 1.53): the band played as a performance (the shaped time within ±20 ms of the written beat,
 * every voice together; the piano's wider dynamics, the subject never louder; its colour by its level;
 * its dampers by register), the player's piano slurs from the thumbs (SLUR_DB, the slur's end set
 * down softly, a staccato crisp), and the music room of the piano and the harpsichord.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeAudioContext, FakeNode, FakeParam, FakeSource, installFakeAudio } from "./fake-audio.ts";
import { Chip, UNDAMPED_TAU, voicing, type Play } from "../src/touch/chip.ts";
import { presetById, setPreset } from "../src/touch/sound.ts";
import { beatOf, fugueById, inBar } from "../src/touch/fugue.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { joins, phrase, phraseContext, RUBATO, rubato } from "../src/touch/phrasing.ts";
import { phraseBounds } from "../src/touch/practice.ts";
import { accompaniment, subjectMarks } from "../src/touch/voice-mode.ts";
import { SAMPLED } from "../src/touch/sampled.ts";
import { SLUR_DB } from "../src/bench/proto-game.ts";

const ctxOf = installFakeAudio(0, true);
FakeAudioContext.prototype.decodeAudioData = function (this: FakeAudioContext) {
  const b = this.createBuffer(1, 6 * this.sampleRate, this.sampleRate);
  b.getChannelData(0)[100] = 0.5;
  return Promise.resolve(b);
} as never;

/** A note's level at t (d308-release.test.ts's way): the product of the gains from its sources to `bus`. */
function envelope(made: FakeNode[], bus: unknown, t: number): number {
  const path = (n: FakeNode, depth: number): number => {
    if (n === bus) return 1;
    if (depth > 24) return 0;
    let best = 0;
    for (const to of n.targets) {
      if (!(to instanceof FakeNode)) continue;
      const g = to.kind === "gain" ? Math.abs((to.gain as FakeParam).valueAt(t)) : 1;
      if (g > 0) best = Math.max(best, g * path(to, depth + 1));
    }
    return best;
  };
  let sum = 0;
  for (const n of made) if (n instanceof FakeSource && n.startAt !== null && n.startAt <= t && t < (n.kind === "buffer" && n.stopCall < Infinity ? n.stopCall : n.stopAt)) sum += path(n, 0);
  return sum;
}

const DOWN = 1;

/** The sampled piano's note struck at DOWN as the player's, let go after `held` s (a lift, or a handover set 30 ms ahead); its level `after` s past the release, against its peak. */
async function release(play: Play, held: number, after: number, midi = 64, handover = false) {
  setPreset("pianoSampled");
  const chip = new Chip();
  await chip.prepare([midi, midi - 12, midi + 12], [midi]);
  const ctx = ctxOf();
  chip.note(60, 0, 0.05, voicing(0, 3, true));
  const before = new Set(ctx.nodes);
  const sd = chip.note(midi, DOWN, 8, voicing(0, 3, true), { lead: true, ...play });
  const made = [...ctx.nodes].filter((x) => !before.has(x));
  const up = DOWN + held;
  ctx.advance(handover ? up - 0.03 : up);
  sd.stop(handover ? up : undefined);
  let peak = 0;
  for (let t = DOWN; t < up; t += 0.002) peak = Math.max(peak, envelope(made, ctx.destination, t));
  return envelope(made, ctx.destination, up + after) / peak;
}

test("D339: the band's shaped time: every note within 20 ms of its beat, a chord's notes together, the cadences' arrivals late, the phrases' middles early", () => {
  for (const id of ["wtc1f02", "wtc2f05", "wtc1f22"]) {
    const f = fugueById(id);
    const b = beatOf(f).ticks;
    const notes = accompaniment(f, 0, -1);
    const ctx = phraseContext(f, tempoOf(id));
    for (const style of ["piano", "harpsichord", "organ", "plain"] as const) {
      const sh = phrase(notes, b, (t) => inBar(f, t), subjectMarks(f).subject, style, ctx);
      assert.ok(sh.every((s) => Math.abs(s.nudge) <= 0.02 + 1e-12), `${id} ${style}: within 20 ms`);
    }
    const ons = notes.map((n) => n.on);
    const r = rubato({ first: Math.min(...ons), lastOn: Math.max(...ons), cadences: ctx.cadences, bar: f.barTicks, beat: b });
    const bounds = phraseBounds(Math.min(...ons), Math.max(...ons), ctx.cadences, f.barTicks);
    for (let t = 0; t < f.length; t += b / 4) assert.ok(Math.abs(r(t)) <= RUBATO.cap + 1e-12);
    // Each cadence (not the last: the final ritard's) reached late, the middle of the phrase before it early.
    for (let k = 1; k < bounds.length - 1; k++) {
      assert.ok(r(bounds[k]) > 0.012, `${id}: the arrival at ${bounds[k]} ${(r(bounds[k]) * 1000).toFixed(1)} ms late`);
      assert.ok(r((bounds[k - 1] + bounds[k]) / 2) < 0, `${id}: the phrase's middle early`);
    }
  }
});

test("D339: the piano's dynamics wider (a note's spread nearer the pianists'), its colour carried to the sound (Play.vel), the harpsichord and the organ none", () => {
  const f = fugueById("wtc1f02");
  const notes = accompaniment(f, 0, -1);
  const sh = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", phraseContext(f, tempoOf(f.id)));
  const db = sh.map((s) => s.db!);
  const m = db.reduce((a, c) => a + c, 0) / db.length;
  const sd = Math.sqrt(db.reduce((a, c) => a + (c - m) ** 2, 0) / db.length);
  assert.ok(sd > 1.5, `a note's spread ${sd.toFixed(2)} dB (D309: 1.2)`);
  assert.ok(sh.every((s) => joins(s).vel === s.db));
  const hp = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "harpsichord", phraseContext(f, tempoOf(f.id)));
  assert.ok(hp.every((s) => joins(s).vel === undefined && s.level === 1));
});

test("D339: a piano note struck harder is brighter: one high shelf, its gain with the level, none on the harpsichord", async () => {
  setPreset("pianoSampled");
  const chip = new Chip();
  await chip.prepare([60]);
  const ctx = ctxOf();
  const shelfOf = (p: Play) => {
    const before = new Set(ctx.nodes);
    chip.note(60, ctx.currentTime + 0.1, 0.5, voicing(1, 3, false), p);
    const f = [...ctx.nodes].filter((x) => !before.has(x) && x.kind === "filter" && x.type === "highshelf");
    return f.length ? (f[0].gain as FakeParam).value : 0;
  };
  const vt = SAMPLED.piano.velTone!;
  assert.ok(Math.abs(shelfOf({ vel: 2 }) - 2 * vt.perDb) < 1e-9);
  assert.ok(Math.abs(shelfOf({ vel: -3 }) + 3 * vt.perDb) < 1e-9);
  assert.equal(shelfOf({ vel: -20 }), vt.min);
  assert.equal(SAMPLED.harpsichord.velTone, undefined);
});

test("D339: the piano's dampers: the player's staccato crisp (D308 kept), a slur's end set down more softly than a plain lift, a handover the register's damper, an undamped string ringing", async () => {
  // A staccato (0.1 s): 40 dB down within 120 ms, as D308 asks.
  assert.ok((await release({}, 0.1, 0.12)) < 0.01);
  // Held 0.4 s: the slur's end (the second of its group) falls more slowly than the group's first let go.
  const plain = await release({ group: 0 }, 0.4, 0.05);
  const slur = await release({ group: 1 }, 0.4, 0.05);
  assert.ok(slur > plain * 1.2, `slur ${(20 * Math.log10(slur)).toFixed(1)} dB, plain ${(20 * Math.log10(plain)).toFixed(1)} dB 50 ms on`);
  // Lifted alone or handed over, the note is gone (-40 dB) within 0.25 s.
  assert.ok((await release({ group: 1 }, 0.4, 0.25)) < 0.01);
  assert.ok((await release({}, 0.4, 0.25, 64, true)) < 0.01);
  // The bass's damper slower than the treble's.
  assert.ok((await release({}, 0.4, 0.05, 40)) > (await release({}, 0.4, 0.05, 80)));
  // Above the dampers a string rings on.
  assert.ok((await release({}, 0.4, 0.1, 96)) > Math.exp(-0.1 / UNDAMPED_TAU) * 0.9);
});

test("D339: the player's slurs: a group's first a shade firmer, its second lighter by 2.5 dB or more against it, later notes between", () => {
  assert.equal(SLUR_DB.length, 3);
  assert.ok(SLUR_DB[0] > 0 && SLUR_DB[1] < SLUR_DB[2] && SLUR_DB[2] < 0);
  assert.ok(SLUR_DB[0] - SLUR_DB[1] >= 2.5);
});

test("D339: the piano and the harpsichord in their music room (salon) in place of the shared room; a note's own room send goes there", async () => {
  for (const id of ["pianoSampled", "harpsichordSampled"]) {
    const p = presetById(id);
    assert.equal(p.fx, "salon");
    assert.equal(p.room, 0);
  }
  setPreset("pianoSampled");
  const chip = new Chip();
  await chip.prepare([60]);
  const ctx = ctxOf();
  chip.note(60, ctx.currentTime + 0.05, 0.4, voicing(0, 3, false), { room: 0.3 });
  assert.equal(ctx.made.get("convolver"), 2, "the shared room's and the salon's");
  const conv = [...ctx.nodes].filter((n) => n.kind === "convolver");
  // The salon's convolver is fed (through its pre-delay and high-pass) by the note's sends.
  assert.ok(conv.length === 2);
});
