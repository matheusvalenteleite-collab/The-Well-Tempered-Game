import { test } from "node:test";
import assert from "node:assert/strict";
import { BACH, KITTEL, kittelBasses, kittelMelody, melodyOf } from "../src/chorale/generate/corpus.ts";
import {
  bestHarmony,
  bestSetting,
  diverseSettings,
  fixedFromPlan,
  harmonyLogProb,
  phraseEnds,
  sampleHarmony,
  trainModels,
} from "../src/chorale/generate/index.ts";
import { rng } from "../src/counterpoint/choices/cantus.ts";

const k1 = KITTEL.find((c) => c.number === 1)!;
const held = new Set(k1.bachSettings);
const models = trainModels(BACH.filter((b) => !held.has(b.no)));
const m = kittelMelody(k1);
const key = { tonic: k1.tonic, mode: k1.mode };

test("generator corpus: Bach's 370 chorales as events, each ending a phrase; Kittel's 24 with their Bach settings", () => {
  assert.equal(BACH.length, 370);
  assert.ok(BACH.every((c) => c.notes.length > 5 && c.notes[c.notes.length - 1].end));
  assert.equal(KITTEL.length, 24);
  assert.deepEqual(k1.bachSettings, [35]);
});

test("phrase ends: every fermata and the last note; first, inner, last", () => {
  const ends = phraseEnds(m);
  assert.deepEqual(
    ends.map((e) => e.index),
    m.notes.flatMap((n, i) => (n.end ? [i] : [])),
  );
  assert.equal(ends[0].position, "first");
  assert.equal(ends[ends.length - 1].position, "last");
  assert.equal(ends[0].close, `${m.notes[ends[0].index - 1].deg}-${m.notes[ends[0].index].deg}`);
  // a melody without a final fermata still ends a phrase on its last note
  const open = { mode: m.mode, notes: m.notes.slice(0, 5).map((n) => ({ ...n, end: false })) };
  assert.deepEqual(
    phraseEnds(open).map((e) => [e.index, e.position]),
    [[4, "last"]],
  );
});

test("plan: only chords Bach puts at a phrase end over that melody degree; the final cadence is on the tonic", () => {
  const ends = phraseEnds(m);
  const best = models.plan.best(m);
  assert.equal(best.length, ends.length);
  assert.equal(best[best.length - 1], "I");
  for (const e of ends) {
    const opts = models.plan.options(m, e);
    assert.ok(Math.abs(opts.reduce((s, o) => s + o.p, 0) - 1) < 1e-9);
    assert.ok(opts.every((o, i) => i === 0 || opts[i - 1].p >= o.p));
  }
});

test("harmony: sampled and best chords keep the plan's cadences and use only chords Bach puts over each degree", () => {
  const plan = models.plan.best(m);
  const fixed = fixedFromPlan(m, phraseEnds(m), plan);
  const r = rng(7);
  for (let k = 0; k < 20; k++) {
    const ch = sampleHarmony(models.harmony, m, fixed, r);
    assert.equal(ch.length, m.notes.length);
    ch.forEach((c, i) => {
      if (fixed[i]) assert.equal(c, fixed[i]);
      else assert.ok(models.harmony.allowed(m.mode, m.notes[i].deg).includes(c), `${i}: ${c}`);
    });
  }
  const best = bestHarmony(models.harmony, m, fixed);
  fixed.forEach((f, i) => f && assert.equal(best[i], f));
});

test("harmony: the Viterbi sequence is at least as likely as any drawn under the same plan", () => {
  const plan = models.plan.best(m);
  const fixed = fixedFromPlan(m, phraseEnds(m), plan);
  const lp = harmonyLogProb(models.harmony, m, bestHarmony(models.harmony, m, fixed));
  const r = rng(11);
  for (let k = 0; k < 50; k++) assert.ok(harmonyLogProb(models.harmony, m, sampleHarmony(models.harmony, m, fixed, r)) <= lp + 1e-9);
});

test("diverse settings: as many as asked, all different, the first the most likely, reproducible from the seed", () => {
  const n = kittelBasses(k1);
  const a = diverseSettings(models, m, key, n, rng(3), { pool: 80 });
  const b = diverseSettings(models, m, key, n, rng(3), { pool: 80 });
  assert.equal(a.length, n);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((s) => s.chords.join(" "))).size, n);
  assert.deepEqual(a[0].chords, bestSetting(models, m, key).chords);
});

test("on an unseen Bach chorale, the best plan is mostly Bach's own", () => {
  const c = BACH.find((x) => x.no === 35)!;
  const mm = melodyOf(c);
  const plan = models.plan.best(mm);
  const bach = phraseEnds(mm).map((e) => c.notes[e.index].chord);
  assert.ok(plan.filter((p, k) => p === bach[k]).length >= bach.length / 2, `${plan} vs ${bach}`);
});

import { BassModel, parallel, placeOf, LOW, HIGH } from "../src/chorale/generate/bass.ts";
import { degreePitches, figure, figureText, midiOf, parseDegree } from "../src/chorale/generate/theory.ts";

test("theory: figures in the period's abbreviation, with the accidentals the key signature does not give", () => {
  const a = { tonic: "A", mode: "minor" as const },
    C = { tonic: "C", mode: "major" as const },
    g = { tonic: "G", mode: "minor" as const };
  const f = (p: string, b: string, c: string, k: typeof C | typeof a) => figureText(figure(p, b, c, k));
  assert.equal(f("5/3", "1", "I", C), "");
  assert.equal(f("6", "3", "I", C), "6");
  assert.equal(f("5/3", "5", "V", a), "#"); // the raised third of V in minor
  assert.equal(f("7", "5", "V", a), "7/#");
  assert.equal(f("6", "7", "V", a), "6"); // the leading tone is in the bass, not in the figure
  assert.equal(f("5/3", "2", "II", C), "#"); // V of V
  assert.equal(f("5/3", "1", "I", g), "n"); // the Picardy third in G minor: B natural
  // chords are labelled by pitch class: A#-C#-E in G major is "bIII°"; its letters come from the bass
  const G = { tonic: "G", mode: "major" as const };
  assert.equal(f("5/3", "#2", "bIII°", G), "#");
  assert.equal(f("6", "#4", "bIII°", G), "#6"); // C# in the bass: the A# above it needs its sharp

  assert.equal(f("6/5", "7", "V", C), "6/5");
  assert.equal(f("4/3", "2", "V", C), "4/3");
  assert.equal(f("4/2", "4", "V", C), "4/2");
  assert.equal(f("6/4", "2", "V", C), "6/4");
  assert.deepEqual(
    degreePitches("#4", { tonic: "F#", mode: "minor" }, 36, 50).map((x) => x.name),
    ["B#1", "B#2"],
  );
  assert.equal(midiOf("B#1"), 36);
  assert.equal(parseDegree("b7").pc, 10);
});

test("bass: consecutive fifths and octaves with the melody, both moving, are recognised", () => {
  assert.ok(parallel("5", "1", "6", "2")); // fifths
  assert.ok(parallel("1", "1", "2", "2")); // octaves
  assert.ok(!parallel("5", "1", "5", "2")); // the melody holds
  assert.ok(!parallel("3", "1", "4", "2")); // tenths
  assert.ok(!parallel("2", "5", "1", "1")); // a fifth to an octave
});

test("bass: phrase places", () => {
  const places = m.notes.map((_, i) => placeOf(m, i));
  assert.equal(places[places.length - 1], "last");
  m.notes.forEach((n, i) => n.end && i < m.notes.length - 1 && assert.equal(places[i], "end"));
});

test("settings: the bass never makes consecutive fifths or octaves with the melody; it lies below it, in range; it ends on the tonic", () => {
  const sets = diverseSettings(models, m, key, 8, rng(5), { pool: 60 });
  for (const s of sets) {
    const b = s.bass;
    assert.equal(b.degrees.length, m.notes.length);
    for (let i = 1; i < b.degrees.length; i++) assert.ok(!parallel(m.notes[i - 1].deg, b.degrees[i - 1], m.notes[i].deg, b.degrees[i]), `note ${i}`);
    b.midi.forEach((x, i) => {
      assert.ok(x >= LOW && x <= HIGH, `${b.pitches[i]}`);
      assert.ok(x < m.notes[i].midi!, `bass ${b.pitches[i]} under ${k1.notes[i].pitch}`);
      assert.equal(midiOf(b.pitches[i]), x);
    });
    // every bass pair is one Bach uses under that chord
    s.chain.forEach((x, i) => assert.ok(models.bass.allowed(m.mode, s.chords[i]).includes(x), `${s.chords[i]} ${x}`));
  }
  const best = bestSetting(models, m, key);
  assert.equal(best.chain[best.chain.length - 1], "1:5/3");
  assert.equal(best.bass.figures.length, m.notes.length);
});

test("bass model: given Bach's chords on an unseen chorale, the most likely bass is mostly Bach's", () => {
  const c = BACH.find((x) => x.no === 35)!;
  const bm = new BassModel(BACH.filter((b) => b.tune !== c.tune));
  const v = bm.best(melodyOf(c), c.notes.map((n) => n.chord)).map((x) => x.split(":")[0]);
  const hits = c.notes.filter((n, i) => n.pos && v[i] === n.bass).length;
  assert.ok(hits / c.notes.filter((n) => n.pos).length > 0.6, `${hits}`);
});
