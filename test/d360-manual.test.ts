/**
 * D360 (and D359), THE MANUAL, Parts III (touch and articulation) and IV (time and breath): every excerpt
 * held to the feature its lesson teaches (from the encoded scores and readings); Herr Bach's new manners
 * of playing (the three touches at set holds, accents by time, leans, breaths, broadening) do what they
 * show; his demonstration passes every stage; a careful player passes where the lesson asks nothing of
 * them but care, and is told exactly what the lesson asks where it asks more; a random tapper fails every
 * PLAY; the practice room (Options.quiet) is on in every lesson; the coach names the bar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import { readingsOf } from "../src/touch/readings.ts";
import { anyLessonById as lessonById, BUILT, fixFor, lastPlay, MANUAL, PARTS, runOf, SOUND_PRESET, stagePassed, type DemoStyle, type ManualLesson, type Material, type PartId, type Stage } from "../src/bench/manual/lessons.ts";
import { RETIRED } from "../src/bench/manual/retired.ts";

/** D379: the older III–V retired from the tutorial (retired.ts), kept as data for these checks. */
const PLAYED = RETIRED;
const checkpointOf = (p: PartId) => RETIRED.find((l) => l.part === p && l.checkpoint);
const lessonsOf = (p: PartId) => RETIRED.filter((l) => l.part === p);
import { fixDirection, fixRests } from "../src/bench/manual/coach.ts";
import { demoRun, gameFor, tapperRun } from "./d342-sim.ts";
import { playerRun } from "./d359-players.ts";

const style = (l: ManualLesson, st: Stage): DemoStyle => (st.ask ? (st.ask.toLowerCase() as DemoStyle) : (l.hear?.styles.at(-1) ?? "plain"));
const PARTS_B = PLAYED.filter((l) => l.part === "III" || l.part === "IV");
const careful = { jitterMs: 15, hold: 0.8 } as const;

function struck(st: Stage) {
  const { g } = gameFor(st.m, { t: 0 });
  return g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on)).map((n) => ({ on: n.on, dur: n.dur, midi: n.midi }));
}

test("D360: Parts III and IV: eleven lessons, each its sound, lens and stages; checkpoints III.5 and IV.6; D373: shown after the new Parts 1–3", () => {
  assert.deepEqual(PARTS_B.map((l) => l.id), ["III.1", "III.2", "III.3", "III.4", "III.5", "IV.1", "IV.2", "IV.3", "IV.4", "IV.5", "IV.6"]);
  // D379: retired from the tutorial (Parts 4–6 rebuilt, the fugue track after them).
  assert.deepEqual(BUILT.map((p) => p.id), ["1", "2", "3", "4", "5", "6", "F"]);
  assert.equal(checkpointOf("III")!.id, "III.5");
  assert.equal(checkpointOf("IV")!.id, "IV.6");
  for (const l of PARTS_B) {
    assert.ok(l.stages.at(-1)!.kind === "play", l.id);
    assert.ok(l.sound && SOUND_PRESET[l.sound], l.id);
    assert.ok(l.before.length <= 2 && l.after.length <= 1, `${l.id}: D225`);
    assert.ok(l.stages.every((s) => s.say), `${l.id}: each stage introduced in his words (D359)`);
    assert.ok(l.checks, `${l.id}: a pass mark (each teaches a scored skill or keeps its own check)`);
  }
  // Each lesson's instrument (decision 4): the harpsichord for articulation, the organ for breath and ties, the piano for the close.
  assert.deepEqual(Object.fromEntries(PARTS_B.map((l) => [l.id, l.sound])), { "III.1": "harpsichord", "III.2": "harpsichord", "III.3": "harpsichord", "III.4": "harpsichord", "III.5": "harpsichord", "IV.1": "organ", "IV.2": "harpsichord", "IV.3": "harpsichord", "IV.4": "organ", "IV.5": "piano", "IV.6": "organ" });
  assert.equal(lessonById("III.2")!.stages[0].m.sound, "chip", "III.2: the chip, then the harpsichord");
  // Every part built but Part 0 ends in a sealed checkpoint.
  // Parts 1–3 and III–IV each end in a sealed checkpoint; Part V has none (design section 3: nothing waits on it).
  for (const p of ["III", "IV"] as const) assert.ok(checkpointOf(p), p);
  assert.equal(checkpointOf("V"), undefined);
  assert.ok(!PARTS.some((q) => ["III", "IV", "V"].includes(q.id)), "D379: no longer shown");
  assert.equal(MANUAL.length, 39, "D379: the fifteen of Parts 1–3, sixteen of 4–6, seven of the fugue track; D400: and 6.8 THE REAL THING");
});

test("D360: each excerpt has the feature its lesson teaches", () => {
  // III.1: II/18's running quavers, all of one value (a touch can be read and kept).
  const q = struck(lessonById("III.1")!.stages[0]);
  assert.ok(q.length >= 18 && q.slice(0, -1).every((n) => n.dur === q[0].dur));
  // III.2: I/9's alto, Bodky's reading: the first quaver dotted (staccato), the semiquavers apart.
  const bodky = readingsOf("wtc1f09").find((r) => r.id === "bodky")!;
  assert.equal(bodky.notes[0].short, true);
  assert.ok(bodky.notes.filter((n) => n.join === false).length >= 15);
  // III.3–III.4: I/2's alto, Keller's reading: linked sixteenths, quavers apart and accented.
  const keller = readingsOf("wtc1f02").find((r) => r.id === "keller")!;
  assert.deepEqual(keller.notes.slice(0, 5).map((n) => [n.join, !!n.accent]), [[true, false], [true, false], [false, true], [false, true], [false, true]]);
  // IV.1: I/2's soprano 17–20: three-note figures after quaver rests (breaths in the score).
  const s17 = struck(lessonById("IV.1")!.stages[1]);
  const tpq = fugueById("wtc1f02").tpq;
  assert.ok(s17.slice(1).filter((n, i) => n.on - (s17[i].on + s17[i].dur) >= tpq / 2).length >= 5);
  // IV.3: I/5's soprano 5–7: dotted pairs (a note three times the next), nine or more.
  const d5 = struck(lessonById("IV.3")!.stages[1]);
  assert.ok(d5.slice(1).filter((n, i) => d5[i].dur >= 3 * n.dur && d5[i].on + d5[i].dur === n.on).length >= 9);
  // IV.4: I/22's soprano I 4–8: notes tied over the bar line (G5 into bar 5).
  const f22 = fugueById("wtc1f22");
  const t22 = struck(lessonById("IV.4")!.stages[1]);
  assert.ok(t22.filter((n) => [5, 6, 7, 8, 9].some((b) => n.on < barStart(f22, b) && n.on + n.dur > barStart(f22, b))).length >= 3);
  // IV.5: Invention 1 to its end: the last note the long C5.
  const e1 = struck(lessonById("IV.5")!.stages[1]);
  assert.equal(e1.at(-1)!.midi, 72);
  assert.ok(e1.at(-1)!.dur >= 4 * fugueById("inv01").tpq);
  // IV.6: I/22's soprano I 1–13, to the cadence in B♭ minor at bar 12.
  const c22 = struck(lessonById("IV.6")!.stages[0]);
  assert.ok(c22.at(-1)!.on >= barStart(f22, 12));
});

test("D359/D360: Herr Bach's manners: three touches found as asked; accents made; leans kept; breaths taken; the close broadened", () => {
  const m = lessonById("III.1")!.stages[0].m;
  for (const [s, want] of [["legato", "LEGATO"], ["ordinary", "ORDINARY"], ["detached", "DETACHED"]] as const) assert.equal(demoRun(m, s).lens!.touch.style, want, s);
  const acc = demoRun(lessonById("III.4")!.stages[1].m, "accent").lens!;
  assert.equal(acc.marks.accent.ok, acc.marks.accent.of);
  // D385: an accent is weight on time (the strong zone), not a silence: joined into, it is an accent all the same.
  const leg = demoRun(lessonById("III.4")!.stages[1].m, "legato").lens!;
  assert.equal(leg.marks.accent.ok, leg.marks.accent.of, "joined: still accents, landed by the box");
  assert.ok(demoRun(lessonById("IV.2")!.stages[1].m, "lean").lens!.graces.agogic >= 2);
  assert.ok(demoRun(lessonById("IV.1")!.stages[1].m, "breath").lens!.graces.breath >= 2);
  assert.ok(demoRun(lessonById("IV.5")!.stages[1].m, "broaden").lens!.graces.broaden >= 1);
  assert.equal(demoRun(lessonById("IV.2")!.stages[1].m, "lean").lens!.graces.revoked, 0, "every lean comes back to the pulse");
});

test("D360 (design 4.10): his demonstration passes every stage; a random tapper fails every PLAY; a careful player is told what the lesson asks", () => {
  for (const l of PARTS_B) {
    l.stages.forEach((st, k) => {
      const r = demoRun(st.m, style(l, st));
      assert.ok(stagePassed(l, st.kind, r.lens!, k), `${l.id} ${st.m.label}: ${l.checks?.(r.lens!, st).map((c) => `${c.text} ${JSON.stringify(c.vars)} ${c.ok}`).join("; ")}`);
      if (st.kind !== "play") return;
      for (const seed of [7, 11, 13, 29]) assert.ok(!stagePassed(l, "play", tapperRun(st.m, seed).lens!, k), `${l.id} stage ${k}: a random tapper (seed ${seed}) passed`);
    });
  }
  // Care alone passes where the lesson asks only care (the last take of III.1, III.5, IV.3–IV.6) ...
  for (const id of ["III.1", "III.5", "IV.3", "IV.4", "IV.5", "IV.6"]) {
    const l = lessonById(id)!;
    assert.ok(stagePassed(l, "play", playerRun(l.stages[lastPlay(l)].m, careful).lens!, lastPlay(l)), id);
  }
  // ... and where it asks more, he says exactly what.
  const told = (id: string, k?: number, style: { jitterMs: number; hold: number } = careful) => {
    const l = lessonById(id)!;
    const kk = k ?? lastPlay(l);
    const x = playerRun(l.stages[kk].m, style).lens!;
    assert.ok(!stagePassed(l, "play", x, kk), `${id}: plain care does not pass`);
    return fixFor(l, x, kk)!.text;
  };
  assert.match(told("III.1", 0), /I asked for \{want\}/);
  // D378: joined by ear (25 ms), care's 20% gap is a detached touch, the strokes' own: plain care for the readings is joined throughout.
  assert.match(told("III.2", undefined, { jitterMs: 5, hold: 0.97 }), /the dot: lift before three fifths/);
  assert.match(told("III.3", undefined, { jitterMs: 5, hold: 0.97 }), /Join inside the slur/);
  // D387: the accent is weight on time.
  assert.match(told("III.4", undefined, { jitterMs: 5, hold: 0.97 }), /Weight on time/);
  assert.match(told("IV.1"), /Breathe: enter a hair late/);
  assert.match(told("IV.2"), /No lean yet/);
});

test("D359: every lesson in the practice room (Options.quiet), with only the words it is about", () => {
  for (const l of [...MANUAL, ...PLAYED]) for (const st of l.stages) assert.deepEqual(runOf(st.m, undefined, l.words, l.ornaments).quiet, { words: l.words ?? [], ...(l.ornaments ? { ornaments: true } : {}) });
  assert.deepEqual(lessonById("3.1")!.words, ["held", "short"]);
  assert.equal(runOf(lessonById("III.3")!.stages[1].m).reading, "keller");
});

test("D360, Part V (on D353's contour gestures): the graces; no pass mark (decision 3); his shakes read on every written sign", () => {
  const V = PLAYED.filter((l) => l.part === "V");
  // D364: V.5, the appoggiatura held over, after the four.
  assert.deepEqual(V.map((l) => l.id), ["V.1", "V.2", "V.3", "V.4", "V.5"]);
  for (const l of V) {
    assert.equal(l.checks, undefined, `${l.id}: passed by being played through`);
    assert.ok(l.ornaments && l.stages.every((s) => s.say), l.id);
    for (const st of l.stages) {
      const r = runOf(st.m, undefined, l.words, l.ornaments);
      assert.deepEqual(r.quiet, { words: [], ornaments: true }, `${l.id}: the SHAKE prompts kept in the practice room`);
      assert.equal(r.ornHint, true);
      assert.ok(stagePassed(l, st.kind, tapperRun(st.m, 7).lens!), `${l.id}: anyone passes (no pass mark)`);
    }
  }
  // Each excerpt carries the written signs its lesson teaches, and his demonstration's shakes read every one.
  const want: Record<string, number[]> = { "V.1": [1, 2], "V.2": [1, 3], "V.3": [1, 1, 1] };
  for (const [id, counts] of Object.entries(want)) {
    const l = lessonById(id)!;
    l.stages.forEach((st, k) => {
      const x = demoRun(st.m, "plain").lens!;
      assert.equal(x.orn.of, counts[k], `${id} stage ${k}: written signs`);
      assert.equal(x.orn.read, x.orn.of, `${id} stage ${k}: every sign read from his shake`);
    });
  }
  assert.equal(lessonById("V.3")!.stages[2].m.sound, "organ", "V.3: the trill in the bass on the organ");
  const v4 = lessonById("V.4")!;
  assert.equal(v4.told!({ ...demoRun(v4.stages[1].m, "plain").lens!, orn: { read: 0, of: 0, free: 0, kinds: [] } })!.text, "None added. That too is a choice.");
  assert.equal(v4.told!({ ...demoRun(v4.stages[1].m, "plain").lens!, orn: { read: 0, of: 0, free: 6, kinds: [] } })!.text, "Sparingly.");
});

test("D359: the coach names the bar and the way", () => {
  // (D373: Part I's materials, now given here: I/2's soprano 17–19 and I/20's alto 1–2.)
  const m: Material = { piece: "wtc1f02", voice: 0, fromBar: 17, toBar: 19, tempo: { pct: 100 }, label: "", badge: "IN GAME" };
  const x = playerRun(m, { jitterMs: 10, hold: 1.0 }).lens!;
  const f = fixRests(x)!;
  assert.equal(f.text, "Bar {b}: you held into the rest. Lift as the note ends.");
  assert.ok(Number(f.vars!.b) >= 17 && Number(f.vars!.b) <= 19);
  const w = playerRun({ piece: "wtc1f20", voice: 1, fromBar: 1, toBar: 2, tempo: { pct: 80 }, label: "", badge: "IN GAME" }, { jitterMs: 10, wrongEvery: 4 }).lens!;
  assert.match(fixDirection(w)!.text, /^Bar \{b\}: (the line|a leap|the same note)/);
  assert.ok(lessonsOf("IV").every((q) => q.part === "IV"));
});
