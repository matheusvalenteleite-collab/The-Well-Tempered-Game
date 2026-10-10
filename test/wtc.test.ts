import { test } from "node:test";
import assert from "node:assert/strict";
import { FUGUES, KEY_ORDER, keySignature, realAnswer } from "../src/wtc/fugues.ts";
import { degree, evaluateAnswer } from "../src/wtc/answer.ts";
import { beatOf, evaluateCounterpoint, type CpInput } from "../src/wtc/counterpoint.ts";
import type { WtcFugue } from "../src/wtc/fugues.ts";

const fugue = (id: string) => FUGUES.find((f) => f.id === id)!;
/** The dux from the answer's entry (the subject's tail and the countersubject), and the notes judged. */
const cpInput = (f: WtcFugue, line = [...f.subject.map((n) => ({ ...n, at: n.at - f.answerAt })), ...f.countersubject].sort((a, b) => a.at - b.at)): CpInput => ({
  line,
  given: f.answer,
  bar: f.barQuarters,
  beat: beatOf(f.time),
  phase: (f.phase + f.answerAt) % f.barQuarters,
  judged: new Set(line.map((_, i) => i).filter((i) => line[i].at >= -1e-6)),
});

test("D119: 29 fugue expositions, 21 of the 24 keys, each answer the subject at the fifth but for its mutations", () => {
  assert.equal(FUGUES.length, 29);
  assert.equal(new Set(FUGUES.map((f) => f.key)).size, 21);
  for (const f of FUGUES) {
    assert.ok(KEY_ORDER.includes(f.key), f.id);
    assert.equal(f.subject.length, f.answer.length, f.id);
    const real = realAnswer(f);
    const off = f.answer.map((n, i) => (n.pitch === real[i] ? -1 : i)).filter((i) => i >= 0);
    assert.deepEqual(off, f.mutations, f.id);
    assert.ok(f.mutations.every((i) => i <= 4), `${f.id}: mutations at the head only`);
  }
});

test("D119: key signatures and degrees", () => {
  assert.deepEqual(keySignature("c#"), { C: 1, D: 1, E: 0, F: 1, G: 1, A: 0, B: 0 });
  assert.deepEqual(keySignature("bb"), { C: 0, D: -1, E: -1, F: 0, G: -1, A: -1, B: -1 });
  assert.equal(degree("C4", "f"), "5");
  assert.equal(degree("E4", "f"), "♯7");
  assert.equal(degree("F#4", "C"), "♯4");
});

test("D119: Bach's answers are right; the real answer where his is tonal is named as such", () => {
  for (const f of FUGUES) assert.ok(evaluateAnswer(f, f.answer.map((n) => n.pitch)).passed, f.id);
  // F minor, Book I: the subject's C (the dominant) is answered by F, not by G.
  const f = fugue("wtc1.12");
  const written = realAnswer(f);
  const ev = evaluateAnswer(f, written);
  assert.equal(ev.notes[0].verdict, "real-not-tonal");
  assert.equal(ev.notes[0].detail.subjectDegree, "5");
  assert.equal(ev.notes[0].detail.bachDegree, "1");
  assert.ok(ev.notes.slice(1).every((n) => n.verdict === "bach"));
  // The whole answer an octave away is not a fault; a wrong note is.
  const up = f.answer.map((n) => n.pitch.replace(/(\d+)$/, (o) => String(Number(o) + 1)));
  assert.ok(evaluateAnswer(f, up).passed);
  const bad = f.answer.map((n) => n.pitch);
  bad[3] = "A4";
  assert.equal(evaluateAnswer(f, bad).notes[3].verdict, "wrong");
});

test("D119: Bach's countersubjects pass the two-voice rules (Bach is the last word, as Fux in D39)", () => {
  for (const f of FUGUES) assert.deepEqual(evaluateCounterpoint(cpInput(f)).errors, [], f.id);
});

test("D119: a dissonance leapt into and out of on the beat is a fault", () => {
  // C major, Book I: against the answer's B4 (beat 1 of bar 4), the countersubject's G4 made a C5,
  // a second, from E4 by leap and away to A3 by leap.
  const f = fugue("wtc1.01");
  const inp = cpInput(f);
  const i = inp.line.findIndex((n) => n.at >= 0 && n.pitch === "G4" && n.dur === 1.5);
  assert.ok(i > 0);
  const line = inp.line.map((n, j) => (j === i ? { ...n, pitch: "C5" } : n));
  const ev = evaluateCounterpoint({ ...inp, line });
  assert.ok(ev.errors.some((v) => v.note === i), JSON.stringify(ev.errors));
});

test("D119: two fifths in a row are a fault", () => {
  const given = [
    { pitch: "C4", at: 0, dur: 1 },
    { pitch: "D4", at: 1, dur: 1 },
    { pitch: "E4", at: 2, dur: 1 },
  ];
  const line = [
    { pitch: "E5", at: 0, dur: 1 },
    { pitch: "A4", at: 1, dur: 1 },
    { pitch: "B4", at: 2, dur: 1 },
  ];
  const ev = evaluateCounterpoint({ line, given, bar: 4, beat: 1, phase: 0, judged: new Set([0, 1, 2]) });
  assert.deepEqual(ev.errors.map((v) => v.ruleId), ["wtc.cp.parallel"]);
});

test("D119: the countersubject hint allows each of Bach's notes (within a seventh of the note before)", async () => {
  const { counterHint } = await import("../src/wtc/hints.ts");
  const { parsePitch } = await import("../src/music/pitch.ts");
  for (const f of FUGUES) {
    const line = f.countersubject.map((n) => n.pitch);
    line.forEach((p, i) => {
      const before = i > 0 ? line[i - 1] : f.subject[f.subject.length - 1].pitch;
      if (Math.abs(parsePitch(p).diatonic - parsePitch(before).diatonic) > 6) return;
      const h = counterHint(f, line, i);
      assert.ok(h.allowed.some((a) => parsePitch(a).midi === parsePitch(p).midi), `${f.id} note ${i + 1} ${p}: ${h.allowed.join(" ")}`);
    });
  }
});

test("D121: the whole fugue: the subject's first two entries are found where the exposition puts them", async () => {
  const full = (await import("../data/bach/wtc/fugues-full.json", { with: { type: "json" } })).default as unknown as { notes: Record<string, number[][]> };
  const { findEntries } = await import("../src/wtc/entries.ts");
  const { parsePitch } = await import("../src/music/pitch.ts");
  for (const f of FUGUES) {
    const all = full.notes[f.id].map(([m, o, d]) => ({ midi: m, at: o / 96, dur: d / 96 }));
    const es = findEntries(all, f.subject.map((n) => ({ midi: parsePitch(n.pitch).midi, at: n.at, dur: n.dur })));
    const t0 = es.find((e) => e.shift === 0 && !e.inverted);
    assert.ok(t0, `${f.id}: the subject itself`);
    assert.ok(es.some((e) => Math.abs(e.at - (t0!.at + f.answerAt)) < 1e-6 && !e.inverted), `${f.id}: the answer at ${f.answerAt}`);
  }
});

test("D123: the voices: nearly every entry in one voice (two entries in stretto may share a note), almost no voice sounding two notes at once; an exposition in each fugue", async () => {
  const full = (await import("../data/bach/wtc/fugues-full.json", { with: { type: "json" } })).default as unknown as { notes: Record<string, number[][]> };
  const { findEntries } = await import("../src/wtc/entries.ts");
  const { separateVoices } = await import("../src/wtc/voices.ts");
  const { studyMoments } = await import("../src/wtc/study.ts");
  const { parsePitch } = await import("../src/music/pitch.ts");
  const { isMinor } = await import("../src/wtc/fugues.ts");
  let overlaps = 0;
  let total = 0;
  let entriesOne = 0;
  let entriesTotal = 0;
  for (const f of FUGUES) {
    const all = full.notes[f.id].map(([m, o, d]) => ({ midi: m, at: o / 96, dur: d / 96 }));
    const es = findEntries(all, f.subject.map((n) => ({ midi: parsePitch(n.pitch).midi, at: n.at, dur: n.dur })));
    const { voice, count } = separateVoices(all, es.map((e) => e.notes));
    assert.ok(count >= 2 && count <= 6, `${f.id}: ${count} voices`);
    for (const e of es) {
      entriesTotal++;
      if (new Set(e.notes.map((i) => voice[i])).size === 1) entriesOne++;
    }
    for (let v = 0; v < count; v++) {
      const xs = all.filter((_, i) => voice[i] === v).sort((a, b) => a.at - b.at);
      for (let k = 1; k < xs.length; k++) if (xs[k].at < xs[k - 1].at + xs[k - 1].dur - 1e-6) overlaps++;
    }
    total += all.length;
    const { sections } = studyMoments(all, voice, count, es, f.barQuarters, isMinor(f.key));
    assert.equal(sections[0].kind, "exposition", f.id);
  }
  assert.ok(overlaps / total < 0.005, `${overlaps} of ${total}`);
  assert.ok(entriesOne / entriesTotal > 0.97, `${entriesOne} of ${entriesTotal} entries in one voice`);
});

test("D125: the preludes: one for each fugue, every note from the first full bar", async () => {
  const pre = (await import("../data/bach/wtc/preludes-full.json", { with: { type: "json" } })).default as unknown as { preludes: Record<string, { time: string; barQuarters: number; notes: number[][] }> };
  for (const f of FUGUES) {
    const p = pre.preludes[f.id];
    assert.ok(p && p.notes.length > 300, f.id);
    assert.ok(p.notes.every(([m, o, d]) => m >= 21 && m <= 108 && o >= 0 && d > 0), f.id);
  }
  // C major, Book I: 35 bars of 4/4, the first bar's figure C E G C E G C E over the held C and E.
  const c = pre.preludes["wtc1.01"];
  assert.equal(Math.max(...c.notes.map(([, o, d]) => o + d)) / 96 / c.barQuarters, 35);
  assert.deepEqual(c.notes.slice(0, 5).map(([m]) => m), [60, 64, 67, 72, 76]);
});

test("D125: the harmonic reading of the C major prelude, Book I, as the textbooks give it; its keys: G (bar 11), C (bar 19)", async () => {
  const pre = (await import("../data/bach/wtc/preludes-full.json", { with: { type: "json" } })).default as unknown as { preludes: Record<string, { barQuarters: number; notes: number[][] }> };
  const { readHarmony, romanOf, chordName, findCadences, keyPlan } = await import("../src/wtc/harmony.ts");
  const p = pre.preludes["wtc1.01"];
  const notes = p.notes.map(([m, o, d]) => ({ midi: m, at: o / 96, dur: d / 96 }));
  const ch = readHarmony(notes, p.barQuarters, 1);
  const bar = (b: number) => ch.find((c) => Math.abs(c.from - (b - 1) * 4) < 1e-6)!;
  const romans = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((b) => romanOf(bar(b), 0, false));
  assert.deepEqual(romans, ["I", "ii⁴₂", "V⁶₅", "I", "vi⁶", "V⁴₂/V", "V⁶", "I⁴₂", "vi7", "V7/V", "V", "vii°⁴₃/ii", "ii⁶", "vii°⁴₃", "I⁶"]);
  assert.equal(chordName(bar(2), false), "Dm7/C");
  assert.equal(chordName(bar(22), false), "F♯°7");
  assert.equal(romanOf(bar(22), 0, false), "vii°7/V");
  assert.deepEqual(keyPlan(findCadences(ch)).map((c) => [c.tonic, Math.floor(c.at / 4) + 1]), [[7, 11], [0, 19]]);
});

test("D125: Roman numerals in minor: the leading-tone chord plain, the Picardy third only at the end", async () => {
  const { romanOf } = await import("../src/wtc/harmony.ts");
  const c = (root: number, bass: number, quality: "maj" | "min" | "°7" | "7") => ({ from: 0, to: 1, root, bass, quality, fit: 1, bassMidi: 48 + bass });
  // F minor (tonic 5).
  assert.equal(romanOf(c(4, 4, "°7"), 5, true), "vii°7");
  assert.equal(romanOf(c(0, 0, "7"), 5, true), "V7");
  assert.equal(romanOf(c(5, 5, "7"), 5, true), "V7/iv");
  assert.equal(romanOf(c(5, 5, "maj"), 5, true), "V/iv");
  assert.equal(romanOf(c(5, 5, "maj"), 5, true, true), "I");
  assert.equal(romanOf(c(8, 0, "maj"), 5, true), "III⁶");
});

test("D126: the library: all 48 from the corpus, each fugue with its voices as encoded, its subject and entries (the first at the start, the answer next in another voice)", async () => {
  const { LIBRARY } = await import("../src/wtc/library.ts");
  assert.equal(LIBRARY.length, 48);
  assert.equal(new Set(LIBRARY.map((l) => l.key)).size, 24);
  for (const l of LIBRARY) {
    const f = l.fugue();
    assert.ok(f.count >= 2 && f.count <= 5, l.id);
    assert.ok(f.entries.length >= 3, `${l.id}: ${f.entries.length} entries`);
    const [a, b] = f.entries;
    assert.notEqual(f.voice[a.notes[0]], f.voice[b.notes[0]], `${l.id}: the answer in another voice`);
    assert.ok(f.entries.every((e) => e.notes.length >= 3 && new Set(e.notes.map((i) => f.voice[i])).size === 1), l.id);
    const p = l.prelude();
    assert.ok(p.notes.length > 200 && p.count >= 1, l.id);
  }
  // Book I no. 8: the prelude in E flat minor, the fugue in D sharp minor.
  const eight = LIBRARY.find((l) => l.id === "wtc1.08")!;
  assert.deepEqual([eight.preludeKey, eight.key], ["eb", "d#"]);
});
