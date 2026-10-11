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
  const a = diverseSettings(models, m, n, rng(3), { pool: 80 });
  const b = diverseSettings(models, m, n, rng(3), { pool: 80 });
  assert.equal(a.length, n);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((s) => s.chords.join(" "))).size, n);
  assert.deepEqual(a[0].chords, bestSetting(models, m).chords);
});

test("on an unseen Bach chorale, the best plan is mostly Bach's own", () => {
  const c = BACH.find((x) => x.no === 35)!;
  const mm = melodyOf(c);
  const plan = models.plan.best(mm);
  const bach = phraseEnds(mm).map((e) => c.notes[e.index].chord);
  assert.ok(plan.filter((p, k) => p === bach[k]).length >= bach.length / 2, `${plan} vs ${bach}`);
});
