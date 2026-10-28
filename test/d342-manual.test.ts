/**
 * D342 (WTC 1.53), THE MANUAL, Phase A (Parts 0–II): the drill format and the drills' claims; every
 * excerpt held to its feature (from the encoded scores, as test/d333-study.test.ts does for the study);
 * Herr Bach's demonstration (the careful player) passes every stage and a random tapper fails every
 * lesson's PLAY; the lens adds figures and never changes the score; the store's migration from
 * tb-tutorial-v1, its gating and test-out; the map's markup. (D369: the placement, 0.2, withdrawn.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { barStart, beatOf, fugueById, inBar } from "../src/touch/fugue.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { compileDrill, movesOf, parseLine, pitchOf } from "../src/bench/manual/drill.ts";
import { DRILL_TEXTS, DRILLS } from "../src/bench/manual/drills.ts";
import { bpmOf, lessonById, lessonPassed, MANUAL, PLAYED, runOf, SOUND_PRESET, spanOf, stagePassed, type DemoStyle, type ManualLesson, type Material } from "../src/bench/manual/lessons.ts";
import { lessonDone, lessonOpen, MANUAL_KEY, manualBehind, migrate, nextLesson, OLD_TUTORIAL_KEY, partOpen, readManual, recordTake, setAnswer, setAside, testOut } from "../src/bench/manual/store.ts";
import { tutorialDone } from "../src/bench/tutorial.ts";
import { LESSONS, TRACKS } from "../src/bench/lessons.ts";
import { demoRun, gameFor, tapperRun } from "./d342-sim.ts";

const style = (l: ManualLesson): DemoStyle => (l.hear?.styles.includes("prepared") ? "prepared" : l.hear?.styles.includes("held") ? "held" : "plain");
/** D360: Parts III and IV are held by test/d360-manual.test.ts; these tests hold Phase A's (Parts 0–II). */
const PHASE_A = PLAYED.filter((l) => l.part === "I" || l.part === "II");
const playOf = (l: ManualLesson) => l.stages.find((s) => s.kind === "play")!.m;

/** The notes struck in a material (not riding, one per onset) with their times (s). */
function struck(m: Material) {
  const { g } = gameFor(m, { t: 0 });
  const ns = g.tracks[0].notes.filter((n, i, a) => !n.ride && !(i > 0 && a[i - 1].on === n.on));
  return ns.map((n) => ({ on: n.on, dur: n.dur, midi: n.midi, step: n.step, t: g.timeAt(n.on) }));
}

test("D342: the drill format: pitches and steps, full bars, the band (drone, click fading, a written voice)", () => {
  assert.deepEqual(pitchOf("C4"), { midi: 60, step: 28 });
  assert.deepEqual(pitchOf("F#4"), { midi: 66, step: 31 });
  assert.deepEqual(pitchOf("Bb3"), { midi: 58, step: 27 });
  assert.throws(() => parseLine("C4 q D4 q | E4 q", 4 * 1920), /bar of 2 crotchets/);
  const d = compileDrill(`drill "Test" key G meter 3/4 tempo 90 wait\nvoice G4 q A4 q B4 q | G4 h. \nband voice G3 h. | D3 h.`);
  assert.equal(d.id, "drill-test");
  assert.equal(d.wait, true);
  assert.equal(d.piece.barTicks, 3 * 1920);
  assert.deepEqual(d.piece.voiceNames, ["Drill", "Band"]);
  assert.equal(d.voice, 0);
  assert.equal(d.piece.voices[1].length, 2);
  const c = compileDrill(`drill "Klick" meter 4/4 tempo 60\nvoice C4 w | C4 w\nband click fade 4 6`);
  assert.deepEqual(c.click, { full: 4 * 1920, gone: 6 * 1920 });
  assert.equal(c.piece.voices.length, 1);
  assert.equal(fugueById(DRILLS.treppe.id).id, DRILLS.treppe.id, "the drills are found by id");
});

test("D342: each drill does what it claims (its steps, leaps and repeats)", () => {
  for (const [k, def] of Object.entries(DRILL_TEXTS)) {
    const d = DRILLS[k];
    const mv = movesOf(d.piece.voices[d.voice]);
    for (const [kind, n] of Object.entries(def.claims)) {
      const got = mv[kind as keyof typeof mv];
      if (n === 0) assert.equal(got, 0, `${k}: no ${kind}`);
      else assert.ok(got >= n, `${k}: ${kind} ${got} < ${n}`);
    }
  }
  // Schläge: sixteen strikes on one pitch, the click full for eight beats and gone by twelve.
  assert.equal(DRILLS.schlaege.piece.voices[0].length, 16);
  assert.deepEqual(DRILLS.schlaege.click, { full: 8 * 1920, gone: 12 * 1920 });
  // Tonleiter: semiquavers under 200 ms (a run to D332).
  assert.ok((60 / DRILLS.tonleiter.tempo) * 250 < 200);
});

test("D342: the cards: Parts 0–II, 13 lessons (D369: 0.2 withdrawn), each its sound, its lens, its stages ending on a PLAY; checkpoints I.5 and II.7", () => {
  assert.deepEqual(MANUAL.filter((l) => ["0", "I", "II"].includes(l.part)).map((l) => l.id), ["0.1", "I.1", "I.2", "I.3", "I.4", "I.5", "II.1", "II.2", "II.3", "II.4", "II.5", "II.6", "II.7"]);
  for (const l of PHASE_A) {
    assert.ok(l.stages.length >= 1 && l.stages.at(-1)!.kind === "play", `${l.id}: ends on its play`);
    assert.equal(l.stages.filter((s) => s.kind === "play").length, 1);
    assert.ok(l.sound && SOUND_PRESET[l.sound], l.id);
    assert.ok(l.lens.counts.length && l.lens.never.length, l.id);
    assert.ok(l.before.length <= 2 && l.after.length <= 1, `${l.id}: at most two lines before, one after (D225)`);
    for (const st of l.stages) {
      const f = fugueById(st.m.piece);
      assert.equal(f.id, st.m.piece, `${l.id}: ${st.m.piece} found`);
      assert.ok(st.m.voice < f.voices.length);
      const { from, until } = spanOf(st.m);
      assert.ok(until > from);
    }
  }
  assert.deepEqual(PHASE_A.filter((l) => l.checkpoint).map((l) => l.id), ["I.5", "II.7"]);
  // D359: the organ lessons on the PIPE ORGAN (D349), not the retired sampled organ (which opens as the harpsichord).
  assert.equal(SOUND_PRESET.organ, "chamberOrgan");
  // Decision 4: each lesson's own instrument. D369: Parts 0–II all on the piano (the owner: "more pleasant").
  assert.ok(PHASE_A.every((l) => l.sound === "piano" && l.stages.every((st) => !st.m.sound || st.m.sound === "piano")), "Parts I–II on the piano");
  assert.equal(lessonById("0.1")!.sound, "piano");
});

test("D342 (decision 1): Part I opens with Invention 1, not a chorale; I.5 is its right hand to the cadence in G at bar 7", () => {
  const i1 = lessonById("I.1")!;
  assert.equal(playOf(i1).piece, "inv01");
  assert.equal(playOf(i1).voice, 0);
  assert.ok(!MANUAL.some((l) => l.stages.some((s) => /bach_|chorale/.test(s.m.piece))), "no chorale in Phase A");
  const i5 = playOf(lessonById("I.5")!);
  assert.equal(i5.piece, "inv01");
  // D369: Invention 1 at 75% of the game's tempo in Parts 0–II.
  assert.equal(bpmOf(i5), Math.round(tempoOf("inv01") * 75) / 100);
  const ns = struck(i5);
  const f = fugueById("inv01");
  const last = ns.at(-1)!;
  assert.equal(last.on, barStart(f, 7), "ends on bar 7's downbeat");
  assert.equal(f.spell[String(last.midi)], "G4", "the cadence in G");
  assert.ok(!f.voices[0].some((n) => n[0] > last.on && n[0] < last.on + 2 * 1920 * 1), "a rest after it");
  assert.equal(ns[0].midi, 60, "from the subject's C4");
});

test("D342: each excerpt has the feature its lesson teaches", () => {
  // I.2: the Invention's subject by steps, then G4 C5 (a fourth); I/20's alto F4 falling to G♯3 and E3.
  const inv = struck(lessonById("I.2")!.stages[2].m);
  assert.deepEqual(inv.slice(0, 7).map((n) => n.midi), [60, 62, 64, 65, 62, 64, 60]);
  assert.ok(inv.slice(1).some((n, i) => Math.abs(n.step - inv[i].step) >= 3), "a leap");
  const a20 = struck(playOf(lessonById("I.2")!));
  assert.ok(a20.some((n, i) => i > 0 && a20[i - 1].midi === 65 && n.midi === 56), "F4 to G♯3");
  // I.3: II/5's three repeated Ds; II/12's F F F and E E E.
  const r5 = struck(playOf(lessonById("I.3")!));
  assert.ok(r5[0].midi === 62 && r5[1].midi === 62 && r5[2].midi === 62);
  const r12 = struck(lessonById("I.3")!.stages[1].m);
  assert.deepEqual(r12.slice(0, 3).map((n) => n.midi), [65, 65, 65]);
  // I.4: II/9's bass from a whole note through halves to crotchets; I/2's soprano figures each after a quaver rest.
  const b9 = struck(lessonById("I.4")!.stages[0].m);
  const f9 = fugueById("wtc2f09");
  assert.equal(b9[0].dur, 4 * f9.tpq);
  assert.ok(b9.filter((n) => n.dur === 2 * f9.tpq).length >= 4);
  const s2 = struck(playOf(lessonById("I.4")!));
  const rests = s2.slice(1).filter((n, i) => n.on - (s2[i].on + s2[i].dur) >= fugueById("wtc1f02").tpq / 2).length;
  assert.ok(rests >= 5, `rests ${rests}`);
  // II.1: II/18's running quavers (at 361 ms) twenty in a row.
  const q18 = struck(playOf(lessonById("II.1")!));
  let run = 0;
  let best = 0;
  for (let i = 1; i < q18.length; i++) (run = Math.abs((q18[i].t - q18[i - 1].t) * 1000 - 361) < 6 ? run + 1 : 0), (best = Math.max(best, run));
  assert.ok(best >= 20, `quavers in a row ${best}`);
  // II.2: I/2's alto C5 B4 C5; II/7's X X Y X three times.
  assert.deepEqual(struck(lessonById("II.2")!.stages[0].m).slice(0, 3).map((n) => n.midi), [72, 71, 72]);
  const x7 = struck(playOf(lessonById("II.2")!));
  let fig = 0;
  for (let i = 0; i + 3 < x7.length; i++) if (x7[i].midi === x7[i + 1].midi && x7[i + 2].step === x7[i].step - 1 && x7[i + 3].midi === x7[i].midi) fig++;
  assert.equal(fig, 3);
  // II.3: the Invention's bar 3: sixteen semiquavers (and the note they lead to).
  const b3 = struck(playOf(lessonById("II.3")!));
  assert.equal(b3.filter((n) => n.dur === 480 && n.on < barStart(fugueById("inv01"), 4)).length, 16);
  // II.4: I/22's soprano I bars 4–6: the G5 held across the bar line (joined handovers to prepare).
  const s22 = struck(lessonById("II.4")!.stages[1].m);
  const f22 = fugueById("wtc1f22");
  assert.ok(s22.some((n) => n.on < barStart(f22, 5) && n.on + n.dur > barStart(f22, 5) && f22.spell[String(n.midi)] === "G5"));
  // II.5: II/24's octave leaps both ways; the Invention's A3–A2 in bar 15.
  const l24 = struck(playOf(lessonById("II.5")!));
  assert.ok(l24.slice(1).filter((n, i) => Math.abs(n.step - l24[i].step) === 7).length >= 4);
  const l15 = struck(lessonById("II.5")!.stages[0].m);
  assert.ok(l15.some((n, i) => i > 0 && l15[i - 1].midi === 57 && n.midi === 45), "A3 to A2");
  // II.6: II/12 bars 2–6: thirty or more semiquavers by step under 200 ms; II/10's triplets at 182 ms.
  const r = struck(playOf(lessonById("II.6")!));
  const fast = r.slice(1).filter((n, i) => (n.t - r[i].t) * 1000 < 200 && Math.abs(n.step - r[i].step) === 1).length;
  assert.ok(fast >= 30, `stepwise semiquavers ${fast}`);
  const t10 = struck(lessonById("II.6")!.stages[1].m);
  assert.ok(Math.min(...t10.slice(1).map((n, i) => (n.t - t10[i].t) * 1000)) < 190);
  // The tempi as the game's (the percentage of tempi.ts), so a tempo change fails here first.
  assert.equal(bpmOf(lessonById("I.3")!.stages[0].m), Math.round(tempoOf("wtc2f05") * 85) / 100);
  void inBar;
  void beatOf;
});

test("D342 (design 4.10): Herr Bach's demonstration passes every stage; a random tapper fails every lesson's PLAY", () => {
  for (const l of PHASE_A) {
    for (const st of l.stages) {
      const r = demoRun(st.m, style(l));
      assert.ok(r.lens, `${l.id}: the lens's figures in the results`);
      assert.ok(stagePassed(l, st.kind, r.lens!), `${l.id} ${st.m.label}: the demonstration passes (${l.checks?.(r.lens!).map((c) => `${c.text} ${JSON.stringify(c.vars)} ${c.ok}`).join("; ")})`);
    }
    for (const seed of [7, 11, 13, 29]) {
      const t = tapperRun(playOf(l), seed);
      assert.ok(!lessonPassed(l, t.lens!), `${l.id}: a random tapper (seed ${seed}) passed`);
    }
  }
});

test("D342: the demonstrations' manners: one thumb takes every note; prepared notes sound by pull-offs; held notes reach their bound", () => {
  const one = demoRun(playOf(lessonById("I.3")!), "one-thumb");
  assert.equal(one.thumbs.alt, 0, "one thumb");
  assert.ok(one.right >= one.of - 1);
  const prep = demoRun(playOf(lessonById("II.4")!), "prepared");
  assert.ok(prep.lens!.prep.pullOffs >= 20 && prep.lens!.prep.rests >= 20, `pull-offs ${prep.lens!.prep.pullOffs}`);
  const plain = demoRun(playOf(lessonById("I.4")!), "plain");
  const held = demoRun(playOf(lessonById("I.4")!), "held");
  assert.ok(held.lens!.held.ok > plain.lens!.held.ok && held.lens!.held.ok === held.lens!.held.of);
});

test("D342: the lens adds figures and never changes the score (the same run, watched or not)", () => {
  for (const id of ["I.2", "II.4", "II.6"]) {
    const l = lessonById(id)!;
    const m = playOf(l);
    const watched = demoRun(m, style(l));
    // Unwatched: the same game without the lens.
    const clock = { t: 0 };
    const { g } = gameFor(m, clock, style(l));
    g.tap = null;
    g.lens = null;
    let done = false;
    while (!done && clock.t < 900) (clock.t += 1 / 120), (done = g.step());
    const bare = g.results();
    assert.equal(bare.lens, undefined);
    assert.equal(watched.score, bare.score, id);
    assert.equal(watched.right, bare.right, id);
    assert.deepEqual(watched.sheet, bare.sheet, id);
  }
  // I.1's timing lens: height never judged there (EASY "timing" on LADDER, the lesson's only).
  assert.equal(runOf(playOf(lessonById("I.1")!)).easy, "timing");
  assert.ok(PLAYED.filter((l) => l.id !== "I.1").every((l) => l.stages.every((s) => runOf(s.m).easy === "direction" || s.m.piece === DRILLS.schlaege.id)));
});

/** A browser's storage. */
function withStorage<T>(seed: Record<string, string>, body: (m: Map<string, string>) => T): T {
  const m = new Map(Object.entries(seed));
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  try {
    return body(m);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test("D342: tb-tutorial-v1's phone track carried into tb-tutorial-v2 once (the old store left as it was)", () => {
  const old = { mobile: { answered: true, skipped: false, passed: { "t-beat": { tries: 2, best: 0.9, ms: 5 }, "t-ladder": { tries: 1, best: 1, ms: 4 }, "t-hold": { tries: 1, best: 0.8, ms: 6 }, "t-legato": { tries: 3, best: 0.85, ms: 7 }, "t-whole": { tries: 1, best: 0.9, ms: 8 }, "t-dynamics": { tries: 1, best: 1, ms: 9 } } }, computer: { answered: true, skipped: true, passed: { beat: { tries: 1, best: 1, ms: 1 } } } };
  withStorage({ [OLD_TUTORIAL_KEY]: JSON.stringify(old) }, (m) => {
    const s = readManual();
    assert.equal(s.migrated, true);
    assert.deepEqual(Object.keys(s.lessons).sort(), ["I.1", "I.2", "I.3", "I.4", "II.3", "II.7", "VIII.1"]);
    assert.equal(s.lessons["I.1"].passed!.best, 0.9);
    assert.equal(s.parts.II, "passed", "t-whole: II.7, Part II's checkpoint");
    assert.equal(s.answer, "no");
    assert.equal(s.allOpen, false);
    assert.ok(m.has(MANUAL_KEY));
    assert.equal(m.get(OLD_TUTORIAL_KEY), JSON.stringify(old), "the old store untouched (the computer's track lives there)");
    // Once only: a later change to v1 is not carried again.
    m.set(OLD_TUTORIAL_KEY, JSON.stringify({ mobile: { answered: true, skipped: true, passed: {} } }));
    assert.equal(readManual().allOpen, false);
  });
  // The old "played before: YES": every part open; t-dynamics (loudness) has no successor.
  const yes = migrate({ mobile: { answered: true, skipped: true, passed: { "t-dynamics": { tries: 1 } } } })!;
  assert.equal(yes.allOpen, true);
  assert.deepEqual(yes.lessons, {});
  assert.equal(migrate({ computer: {} }), null);
  // Only all three of t-ladder, t-beat, t-hold mark I.3 too.
  assert.deepEqual(Object.keys(migrate({ mobile: { passed: { "t-ladder": {}, "t-beat": {} } } })!.lessons).sort(), ["I.1", "I.2"]);
});

test("D342: gating: Parts 0 and I open; II after I's checkpoint, or tested out of; the game never locked; the computer's track untouched", () =>
  withStorage({}, () => {
    let s = readManual();
    assert.ok(partOpen(s, "0") && partOpen(s, "I"));
    assert.ok(!partOpen(s, "II"));
    assert.ok(lessonOpen(s, "I.4") && !lessonOpen(s, "II.1"), "inside an open part every lesson is open");
    assert.equal(nextLesson(s), "0.1");
    recordTake("0.1", 1, true);
    setAnswer("no", false);
    assert.equal(nextLesson(readManual()), "I.1");
    recordTake("I.5", 0.5, false);
    assert.ok(!partOpen(readManual(), "II"));
    s = recordTake("I.5", 0.9, true);
    assert.equal(s.parts.I, "passed");
    assert.ok(partOpen(s, "II") && lessonOpen(s, "II.6"));
    assert.equal(s.lessons["I.5"].passed!.tries, 2);
    assert.ok(!partOpen(s, "III"));
    // ICH KANN DAS SCHON: Part II tested out of.
    s = testOut("II");
    assert.equal(s.parts.II, "tested");
    assert.ok(lessonDone(s, "II.1") && !s.lessons["II.1"].passed && s.lessons["II.1"].tested);
    assert.ok(partOpen(s, "III") && partOpen(s, "V") && partOpen(s, "VI"));
    assert.ok(manualBehind(s));
    assert.equal(tutorialDone("mobile"), true, "D327's display default follows the manual on a phone");
    // SKIP FOR NOW after three tries.
    for (let k = 0; k < 3; k++) recordTake("I.2", 0.2, false);
    assert.equal(readManual().lessons["I.2"].tries, 3);
    setAside("I.2");
    assert.notEqual(nextLesson(readManual()), "I.2");
    assert.equal(TRACKS.computer, LESSONS, "the computer's HIGHWAY track kept");
  }));

test("D342: YES without the test opens every part", () =>
  withStorage({}, () => {
    const s = setAnswer("keyboard", true);
    assert.ok(["II", "III", "VIII"].every((p) => partOpen(s, p as "II")));
  }));

test("D342: the map: parts as chapters, the next lesson marked, locked parts offer the test-out; no old tutorial steps", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ManualMap } = await import("../src/bench/manual/ManualMap.tsx");
  await withStorage({}, async () => {
    const html = renderToStaticMarkup(createElement(ManualMap, { begin: () => {}, testOut: () => {}, close: () => {} }));
    assert.equal(html.match(/data-lesson=/g)?.length, 29);
    assert.match(html, /id="lesson-0\.1" data-lesson="0\.1" class="tb-step next"/);
    assert.match(html, /id="lesson-II\.1"[^>]*disabled/);
    assert.match(html, /LOCKED · HOLD TO TEST OUT/);
    assert.match(html, /0 OF 28 LESSONS/);
    assert.match(html, /IN A LATER VERSION/);
  });
});
