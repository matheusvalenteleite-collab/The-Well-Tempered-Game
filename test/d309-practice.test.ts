/**
 * D309: the practice report's proposal (§6) per instrument: the others' holds by each instrument's
 * table (a hold fraction of the IOI, the gap clamped in ms), the precedence (marks > suspensions >
 * cadence > repeated > interval), the fugue's character, the sampled piano's dynamics from the score
 * (±4 dB, never the subject, never the player's input), the harpsichord and organ flat.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ART_SPREAD, phrase, phraseContext, styleOf, type Shape } from "../src/touch/phrasing.ts";
import { arcAt, decide, DYN, kindsOf, patchKind, pianoLevels, suspensions, TABLES, type Decision, type KeyKind } from "../src/touch/practice.ts";
import { CHARACTER, characterOf } from "../src/touch/character.ts";
import { FUGUES, PRELUDES, fugueById, inBar, beatOf } from "../src/touch/fugue.ts";
import { accompaniment, subjectMarks, type OtherNote } from "../src/touch/voice-mode.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { performSubject, readingsOf } from "../src/touch/readings.ts";
import { PATCHES } from "../src/touch/sound.ts";

const gapMs = (d: Decision) => Math.round(("gap" in d ? d.gap * 1000 : -d.join * 1000) * 1e6) / 1e6;

test("D309: the harpsichord's table: running steps joined 6 ms over, walking steps ordinarily released, leaps, octaves and repeats apart within their clamps", () => {
  const h = (interval: number, ioi: number, bass = false) => gapMs(decide("harpsichord", { interval, ioi, bass }));
  assert.equal(h(2, 0.15), -6, "a semiquaver step");
  assert.equal(h(-4, 0.15), -6, "a semiquaver third");
  assert.ok(Math.abs(h(1, 0.3) - 18) < 1e-6, "a walking step: (1 - 0.94) x 300 ms");
  assert.ok(Math.abs(h(1, 0.25) - 15) < 1e-6);
  assert.equal(h(1, 0.8), 56, "a slow step: 0.07 x 800");
  assert.equal(h(1, 1.5), 70, "clamped at 70 ms");
  assert.ok(Math.abs(h(7, 0.3) - 84) < 1e-6, "a leap: 0.28 x 300");
  assert.ok(Math.abs(h(7, 0.3, true) - 102) < 1e-6, "the bass's leap a little more apart: 0.34 x 300");
  assert.equal(h(7, 0.15), 15, "a quick leap: 0.10 x 150");
  assert.ok(Math.abs(h(12, 0.3) - 135) < 1e-6, "an octave: 0.45 x 300");
  assert.equal(h(12, 1), 180, "clamped at 180 ms");
  assert.ok(Math.abs(h(0, 0.3) - 120) < 1e-6, "a repeated quaver: 0.40 x 300");
  assert.equal(h(0, 0.1), 45, "a repeated semiquaver: at least 45 ms");
});

test("D309: the piano's and the organ's tables; their bass a little more apart on steps", () => {
  const p = (interval: number, ioi: number, bass = false) => gapMs(decide("piano", { interval, ioi, bass }));
  const o = (interval: number, ioi: number, bass = false) => gapMs(decide("organ", { interval, ioi, bass }));
  assert.equal(p(2, 0.15), -12);
  assert.equal(p(3, 0.15), -20, "a consonant third, quick: overlapped longer");
  assert.ok(Math.abs(p(1, 0.3) - 21) < 1e-6 && Math.abs(p(1, 0.3, true) - 42) < 1e-6, "top 0.93, bass 0.86");
  assert.ok(Math.abs(p(7, 0.3) - 96) < 1e-6 && Math.abs(p(7, 0.3, true) - 114) < 1e-6);
  assert.ok(Math.abs(p(12, 0.3) - 156) < 1e-6);
  assert.ok(Math.abs(p(0, 0.3) - 150) < 1e-6, "a repeated quaver: 0.50");
  assert.equal(o(2, 0.15), -0, "the organ's quick step: joined, no overlap (D302's crossfade)");
  assert.ok(Math.abs(o(1, 0.3) - 25) < 1e-6 && Math.abs(o(1, 0.3, true) - 36) < 1e-6, "0.92 (at least 25 ms), the pedal 0.88");
  assert.ok(Math.abs(o(12, 0.3, true) - 150) < 1e-6, "a pedal octave: 0.50");
  assert.ok(Math.abs(o(0, 0.3) - 150) < 1e-6, "a repeated note: 0.50");
  for (const k of ["harpsichord", "piano", "organ"] as KeyKind[]) {
    const T = TABLES[k];
    assert.ok("f" in T.leapBass && "f" in T.leap && T.leapBass.f < T.leap.f, `${k}: the bass's leaps a little more apart`);
  }
});

test("D309: the precedence: a suspension's resolution joined over a leap's or repeat's rule; a cadence arrival 0.85; the bass's arrival after a leap a little lifted", () => {
  const d = (p: Parameters<typeof decide>[1]) => gapMs(decide("harpsichord", p));
  assert.equal(d({ interval: -1, ioi: 0.6, bass: false, resolution: true }), -6);
  assert.equal(d({ interval: 0, ioi: 0.6, bass: false, cadence: true }), 90, "a cadence arrival over a repeated note: 0.15 x 600");
  assert.equal(d({ interval: 7, ioi: 1, bass: false, cadence: true }), 120, "clamped at 120 ms");
  // The bass's arrival note reached by a leap, going on by step: f - 0.05, at most 30 ms more.
  const plain = d({ interval: -2, ioi: 0.3, bass: true });
  const arrived = d({ interval: -2, ioi: 0.3, bass: true, arrival: true });
  assert.ok(arrived > plain && arrived <= plain + 30 + 1e-9, `${plain} -> ${arrived}`);
  assert.equal(d({ interval: -2, ioi: 0.3, bass: false, arrival: true }), d({ interval: -2, ioi: 0.3, bass: false }), "the upper voices: no arrival rule");
});

test("D309: a synthetic line through phrase(): the holds as the tables say, the reading's marks first", () => {
  const B = 480;
  const n = (voice: number, on: number, dur: number, midi: number): OtherNote => ({ voice, on, dur, midi, step: midi });
  // Quavers (half a beat): step, leap, octave, repeat, then a rest; spt so a quaver is 300 ms.
  const top = [60, 62, 67, 79, 79, 77].map((m, k) => n(0, k * 240, 240, m));
  const spt = 0.3 / 240;
  for (const kind of ["harpsichord", "piano", "organ"] as KeyKind[]) {
    const sh = phrase(top, B, (t) => t % (4 * B), new Set(), "plain", { spt, kinds: [kind], bass: 1 });
    const gaps = sh.slice(0, 4).map((s) => (1 - s.hold) * 300);
    const want = [[2], [7], [12], [0]].map(([iv]) => gapMs(decide(kind, { interval: iv, ioi: 0.3, bass: false })));
    // (D339: a table's gap varied by up to ART_SPREAD of itself, fixed per note; a join stays a join.)
    gaps.forEach((g, k) => assert.ok(Math.abs(g - Math.max(0, want[k])) <= ART_SPREAD * Math.abs(want[k]) + 0.6, `${kind} ${k}: ${g.toFixed(1)} against ${want[k].toFixed(1)} ms`));
    assert.equal(sh[5].art, "plain", "the last");
  }
  // A reading's detached mark beats the step's rule; its joined mark beats the octave's.
  const marks = new Map([["0:0", { join: false, short: null }], ["0:480", { join: true, short: null }]]);
  const sh = phrase(top, B, (t) => t % (4 * B), new Set(), "plain", { spt, kinds: ["harpsichord"], marks, bass: 1 });
  assert.equal(sh[0].art, "detach");
  assert.equal(sh[2].art, "join");
});

test("D309: suspensions found (held over a moving bass, a dissonance resolving down by step) and joined; the piano leans on them", () => {
  const B = 480;
  const n = (voice: number, on: number, dur: number, midi: number): OtherNote => ({ voice, on, dur, midi, step: midi });
  // The soprano's C5 tied over the bar (one note, from beat 4), the bass to D3 on the downbeat (a seventh), resolving to B4 (a sixth).
  const score = [n(0, 3 * B, 2 * B, 72), n(0, 5 * B, B, 71), n(0, 6 * B, B, 72), n(1, 3 * B, B, 48), n(1, 4 * B, 2 * B, 50), n(1, 6 * B, B, 43)];
  const h = suspensions(score, B, (t) => t % (4 * B));
  assert.ok(h.dissonance.has(`0:${3 * B}`) && h.resolution.has(`0:${5 * B}`), JSON.stringify([...h.dissonance, ...h.resolution]));
  // A consonant note falling by step is no suspension.
  const plain = [n(0, 0, B, 76), n(0, B, B, 74), n(1, 0, 2 * B, 48)];
  assert.equal(suspensions(plain, B, (t) => t % (4 * B)).dissonance.size, 0);
  const top = score.filter((x) => x.voice === 0);
  const sh = phrase(top, B, (t) => t % (4 * B), new Set(), "harpsichord", { spt: 1 / B, score, bass: 1 });
  assert.equal(sh[0].art, "join", "the suspension joined to its resolution");
  const lv = pianoLevels(score, { beat: B, inBar: (t) => t % (4 * B), bar: 4 * B, harmony: h });
  const no = pianoLevels(score, { beat: B, inBar: (t) => t % (4 * B), bar: 4 * B });
  const d = (m: Map<string, number>, k: string) => Math.atanh(m.get(k)! / DYN.limit) * DYN.limit;
  assert.ok(Math.abs(d(lv, `0:${3 * B}:72`) - d(no, `0:${3 * B}:72`) - DYN.tension.dissonance) < 1e-9);
  assert.ok(Math.abs(d(lv, `0:${5 * B}:71`) - d(no, `0:${5 * B}:71`) - DYN.tension.resolution) < 1e-9);
});

test("D309: each fugue's character, in an editable table: 48 fugues, a reason each, the report's cases", () => {
  const fugues = FUGUES.filter((f) => f.book);
  assert.equal(fugues.length, 48);
  for (const f of fugues) assert.ok(CHARACTER[f.id] && CHARACTER[f.id][1].length > 5, f.id);
  for (const id of ["wtc1f01", "wtc1f04", "wtc1f18", "wtc1f22", "wtc2f09", "wtc2f22"]) assert.equal(characterOf(id), "antico", id);
  for (const id of ["wtc1f03", "wtc1f09", "wtc1f20", "wtc2f01", "wtc2f16", "wtc2f20"]) assert.equal(characterOf(id), "lively", id);
  for (const p of PRELUDES) assert.equal(characterOf(p.id), "neutral");
});

test("D309: the character shifts quavers and slower: antico toward joined, lively a little apart; semiquavers, octaves and repeats kept", () => {
  for (const k of ["harpsichord", "piano", "organ"] as KeyKind[]) {
    const at = (c: "antico" | "neutral" | "lively", interval: number, ioi: number, quaver = true, bass = false) => gapMs(decide(k, { interval, ioi, bass, character: c, quaver }));
    for (const [iv, ioi] of [[2, 0.6], [7, 0.3], [7, 0.6]] as const) {
      assert.ok(at("antico", iv, ioi) < at("neutral", iv, ioi), `${k} antico ${iv}`);
      assert.ok(at("lively", iv, ioi) > at("neutral", iv, ioi), `${k} lively ${iv}`);
    }
    assert.equal(at("antico", 12, 0.3), at("neutral", 12, 0.3), "octaves kept");
    assert.equal(at("lively", 0, 0.3), at("neutral", 0, 0.3), "repeats kept");
    assert.equal(at("lively", 1, 0.3, false), at("neutral", 1, 0.3, false), "a semiquaver at a slow tempo: running, joined");
    assert.ok(at("neutral", 1, 0.3, false) <= 0);
  }
  // The harpsichord's antico steps joined (f 0.94 + 0.10); the piano's lively upper leaps 0.55, its bass steps 0.80 (§6.3).
  assert.ok(gapMs(decide("harpsichord", { interval: 1, ioi: 0.3, bass: false, character: "antico" })) <= 0);
  assert.ok(Math.abs(gapMs(decide("piano", { interval: 7, ioi: 0.3, bass: false, character: "lively" })) - 135) < 1e-6);
  assert.ok(Math.abs(gapMs(decide("piano", { interval: 1, ioi: 0.3, bass: true, character: "lively" })) - 60) < 1e-6);
});

test("D309: the kinds: the recorded keyboards and organ their tables, the singers theirs, a synthesized pluck the harpsichord's, a sustained patch the organ's", () => {
  assert.deepEqual(kindsOf("harpsichordSampled", 3), ["harpsichord", "harpsichord", "harpsichord"]);
  assert.deepEqual(kindsOf("pianoSampled", 4), ["piano", "piano", "piano", "piano"]);
  assert.deepEqual(kindsOf("chamberOrgan", 4), ["organ", "organ", "organ", "organ"]);
  assert.deepEqual(kindsOf("soloVoices", 3), ["solo", "solo", "solo"]);
  assert.deepEqual(kindsOf("vocalSynth", 3), ["sung", "sung", "sung"]);
  assert.deepEqual(kindsOf("chip", 4), ["harpsichord", "harpsichord", "harpsichord", "organ"], "pulses fall to 0.42; the triangle holds");
  assert.equal(patchKind(PATCHES.modVibe, false), "harpsichord");
  assert.equal(patchKind(PATCHES.modOrgan, false), "organ");
  assert.equal(styleOf("chamberOrgan"), "organ");
  assert.equal(styleOf("soloVoices"), "solo");
});

test("D309: SOLO VOICES (§6.5): joined, a repeated note on a new syllable, a breath only at a cadence arrival", () => {
  const B = 480;
  const n = (voice: number, on: number, dur: number, midi: number): OtherNote => ({ voice, on, dur, midi, step: midi });
  const top = [60, 67, 67, 72, 71, 72].map((m, k) => n(0, k * B, B, m));
  const sh = phrase(top, B, (t) => t % (4 * B), new Set(), "solo", { spt: 0.6 / B, bass: 1, cadences: [{ on: 3 * B, kind: "perfect" }] });
  assert.deepEqual(sh.map((s) => s.art), ["join", "syllable", "join", "nonlegato", "join", "plain"]);
  const breath = (1 - sh[3].hold) * 600;
  assert.ok(breath >= 120 - 1e-6 && breath <= 250, `${breath} ms`);
  assert.equal(sh[2].legato, false, "the repeated note sung anew");
  assert.equal(sh[1].legato, true);
});

test("D309, D339: the piano's dynamics: within ±6 dB, the arc's shape, the ending's rise; the harpsichord and the organ flat", () => {
  assert.equal(arcAt(0), DYN.arc.from);
  assert.ok(Math.abs(arcAt(DYN.arc.at) - DYN.arc.peak) < 1e-12);
  assert.ok(Math.abs(arcAt(1) - DYN.arc.to) < 1e-12);
  for (const id of ["wtc1f01", "wtc1f02", "wtc2f22", "wtc1f04"]) {
    const f = fugueById(id);
    const notes = accompaniment(f, 0, -1);
    const ctx = phraseContext(f, tempoOf(id));
    const pi = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", ctx);
    const dbs = pi.map((s) => s.db!);
    assert.ok(Math.max(...dbs) < DYN.limit && Math.min(...dbs) > -DYN.limit, id);
    assert.ok(Math.max(...dbs) - Math.min(...dbs) > 3, `${id}: some shape (${(Math.max(...dbs) - Math.min(...dbs)).toFixed(2)} dB)`);
    // The last two bars louder than the piece's median note.
    const sorted = [...dbs].sort((a, b) => a - b);
    const lastOn = Math.max(...notes.map((x) => x.on));
    const end = dbs.filter((_, i) => notes[i].on > lastOn - f.barTicks);
    assert.ok(end.reduce((a, b) => a + b, 0) / end.length > sorted[sorted.length >> 1], `${id}: the ending rises`);
    for (const style of ["harpsichord", "organ"] as const) assert.ok(phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, style, ctx).every((s) => s.level === 1), `${id} ${style} flat`);
  }
});

test("D309, D293: the subject never louder: on the piano its notes no louder than the others' in the same voice and octave (all 48 fugues)", () => {
  let sum = 0;
  let w = 0;
  for (const f of FUGUES.filter((x) => x.book)) {
    const notes = accompaniment(f, 0, -1);
    const subj = subjectMarks(f).subject;
    const sh = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subj, "piano", phraseContext(f, tempoOf(f.id)));
    const bins = new Map<string, { s: number[]; o: number[] }>();
    notes.forEach((n, i) => {
      const k = `${n.voice}:${Math.floor(n.midi / 12)}`;
      const b = bins.get(k) ?? { s: [], o: [] };
      (subj.has(`${n.voice}:${n.on}`) ? b.s : b.o).push(sh[i].db!);
      bins.set(k, b);
    });
    let fs = 0;
    let fw = 0;
    const mean = (x: number[]) => x.reduce((a, c) => a + c, 0) / x.length;
    for (const b of bins.values())
      if (b.s.length && b.o.length) {
        const k = Math.min(b.s.length, b.o.length);
        fs += (mean(b.s) - mean(b.o)) * k;
        fw += k;
      }
    // No fugue's subject more than half a decibel over its neighbours (no term knows it; what is left is the music's own).
    assert.ok(!fw || fs / fw < 0.5, `${f.id}: ${(fs / fw).toFixed(2)} dB`);
    sum += fs;
    w += fw;
  }
  assert.ok(sum / w <= 0, `all fugues: the subject ${(sum / w).toFixed(3)} dB against the others`);
  // And the subject's marks only ever bring its notes down (D339: where the music's own shape lifts them), never another note, never up.
  const f = fugueById("wtc1f02");
  const notes = accompaniment(f, 0, -1);
  const a = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", phraseContext(f, tempoOf(f.id)));
  const b = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), new Set(), "piano", phraseContext(f, tempoOf(f.id)));
  a.forEach((s, i) => (subjectMarks(f).subject.has(`${notes[i].voice}:${notes[i].on}`) ? assert.ok(s.level <= b[i].level + 1e-12) : assert.equal(s.level, b[i].level)));
});

test("D309, D293: the player's part changes nothing: the others' levels and holds the same whichever voice the player takes", () => {
  for (const id of ["wtc1f02", "wtc2f22"]) {
    const f = fugueById(id);
    const ctx = phraseContext(f, tempoOf(id));
    const run = (played: number) => {
      const notes = accompaniment(f, 0, played);
      const sh = phrase(notes, beatOf(f).ticks, (t) => inBar(f, t), subjectMarks(f).subject, "piano", ctx);
      return new Map(notes.map((n, i) => [`${n.voice}:${n.on}:${n.midi}`, sh[i]] as [string, Shape]));
    };
    const a = run(0);
    const b = run(1);
    let shared = 0;
    for (const [k, s] of a) {
      const t = b.get(k);
      if (!t) continue;
      shared++;
      assert.equal(s.level, t.level, `${id} ${k}`);
      assert.equal(s.hold, t.hold, `${id} ${k}`);
      assert.equal(s.art, t.art, `${id} ${k}`);
    }
    assert.ok(shared > 100);
  }
});

test("D309: HEAR THE SUBJECT plays the reading's unmarked notes by the instrument's table", () => {
  const f = fugueById("wtc1f02");
  const e = [...f.entries].filter((x) => !x.theme).sort((a, b) => a.on - b.on)[0];
  const plain = performSubject(null, e.notes, f.tpq, tempoOf(f.id));
  const harps = performSubject(null, e.notes, f.tpq, tempoOf(f.id), { kind: "harpsichord" });
  // The first two notes, semiquavers C-B: as before held 0.92; by the table running, joined.
  assert.ok(!plain[0].tie && harps[0].tie && harps[1].legato);
  // A marked note keeps the reading's way.
  const keller = readingsOf("wtc1f02").find((r) => r.id === "keller")!;
  const k = performSubject(keller, e.notes, f.tpq, tempoOf(f.id), { kind: "piano" });
  assert.ok(k[2].apart && !k[2].tie);
});
