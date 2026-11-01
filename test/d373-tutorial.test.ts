/**
 * D373, THE TUTORIAL REBUILT (Luigi and Mario's report, the owner's "assume yes"): Parts 1–3, fifteen
 * lessons on Inventions 1, 4, 8 and 12, each WATCH → TRY → PLAY on the real play screen (1.1 a tour of
 * it). Held here: the curriculum's shape; every excerpt's notes against data/touch/; the lessons played
 * by exactly the game's mechanics (only the windows widened in Parts 1–2, one thumb's hints, four beats
 * counted in, the metronome); a simulated player passes every lesson and a random tapper fails every
 * PLAY; the older parts kept after the new; the record carried over from before the rebuild; the
 * selection screen's three columns.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { BUILT, isCourse, lastPlay, lessonById, lessonPassed, lessonReading, MANUAL, midiOf, PARTS, runOf, shownId, spanOf, stagePassed, STEP_WORD, TOUR, type ManualLesson, type Material, type Stage } from "../src/bench/manual/lessons.ts";
import { carry, CARRY, finishStep, MANUAL_KEY, migrate, nextLesson, readManual, recordTake, resumeAt, stepsDone } from "../src/bench/manual/store.ts";
import { demoRun, gameFor, tapperRun } from "./d342-sim.ts";
import { playerRun, type PlayerStyle } from "./d359-players.ts";

await loadExtras();
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// D379: Parts 1–3 (4–6 rebuilt and the fugue track are held by d379-tutorial.test.ts).
const COURSE = MANUAL.filter((l) => isCourse(l) && ["1", "2", "3"].includes(l.part));
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const nameOf = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1);

/** A memory for the store (node has no localStorage). */
const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), clear: () => mem.clear() };

test("D373: Parts 1–3, fifteen lessons on Inventions 1, 4, 8 and 12; WATCH → TRY → PLAY; the older III–V after them as 4–6", () => {
  assert.deepEqual(
    COURSE.map((l) => l.id),
    ["1.1", "1.2", "1.3", "1.4", "1.5", "2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6"],
  );
  // D379: the older III–V retired (Parts 4–6 rebuilt), the fugue track after them.
  assert.deepEqual(BUILT.map((p) => p.id), ["1", "2", "3", "4", "5", "6", "F"]);
  assert.deepEqual(MANUAL.map((l) => l.part).filter((p, i, a) => a.indexOf(p) === i), ["1", "2", "3", "4", "5", "6", "F"]);
  assert.equal(shownId("4.2"), "4.2");
  assert.equal(shownId("2.3"), "2.3");
  for (const l of COURSE) {
    // Only the Inventions (no Book I material in the tutorial).
    for (const st of l.stages) assert.ok(["inv01", "bwv775", "bwv779", "bwv783"].includes(st.m.piece), `${l.id}: ${st.m.piece}`);
    assert.ok(l.aim && l.music, `${l.id}: You'll learn, and its music named`);
    assert.ok(l.stages.every((s) => s.say), `${l.id}: every step says what to watch or do`);
    if (l.id === "1.1") continue;
    // WATCH first, PLAY last (TRY between where there is one); the last PLAY decides.
    assert.equal(l.stages[0].kind, "watch", l.id);
    assert.equal(l.stages.at(-1)!.kind, "play", l.id);
    assert.equal(lastPlay(l), l.stages.length - 1);
    assert.ok(l.checks, `${l.id}: a pass mark`);
  }
  assert.deepEqual(lessonById("1.1")!.stages.map((s) => s.kind), ["tour"]);
  assert.equal(TOUR.length, 6, "1.1: six bubbles");
  assert.deepEqual(TOUR.map((t) => t.focus), ["all", "strips", "box", "notes", "line", "height"]);
  // 1.5 and 2.4 (no TRY: the report's), the rest WATCH · TRY · PLAY.
  assert.deepEqual(lessonById("1.5")!.stages.map((s) => s.kind), ["watch", "play"]);
  assert.deepEqual(lessonById("1.4")!.stages.map((s) => s.kind), ["watch", "try", "play", "play"]);
  // Each part's checkpoint seals it.
  for (const p of PARTS.filter((q) => ["1", "2", "3"].includes(q.id))) assert.ok(p.seal && MANUAL.some((l) => l.part === p.id && l.checkpoint), p.id);
  // Sounds: Parts 1–2 the piano; 3.1 HELD on the pipe organ (the one exception, and he says so).
  for (const l of COURSE) assert.equal(l.sound, l.id === "3.1" ? "organ" : "piano", l.id);
  assert.match(lessonById("3.1")!.before.join(" "), /pipe organ/);
  // Part 3's signs, one at a time, each on its card before the lesson (D370's vocabulary).
  assert.deepEqual(COURSE.filter((l) => l.sign).map((l) => [l.id, l.sign]), [["3.1", "held"], ["3.2", "short"], ["3.3", "joined"], ["3.5", "accent"]]);
  // No jargon in his words (the report's word list).
  const words = COURSE.flatMap((l) => [l.aim, ...l.before, ...l.after, ...l.again, ...l.stages.map((s) => s.say ?? "")]).join(" ");
  assert.doesNotMatch(words, /quaver|semiquaver|staccato|articulation|stretto|mordent|appoggiatura|cadence|onset|pulse|lens|\bD3\d\d/i);
  // D480: LEGATO is the play screen's word (D419), allowed in his words, glossed in the lesson that uses it.
  const glossed = (l: { aim: string; before: string[]; after: string[]; again: string[]; stages: { say?: string }[] }) => [l.aim, ...l.before, ...l.after, ...l.again, ...l.stages.map((s) => s.say ?? "")].join(" ");
  for (const l of COURSE) if (/legato/i.test(glossed(l))) assert.match(glossed(l), /no gap|as (this one|the other) lifts/i, l.id);
  assert.equal(STEP_WORD.watch, "WATCH");
});

test("D373: every excerpt's notes, read from data/touch/ (Invention 1 is tutorial.json's inv01; 4, 8, 12 MORE BACH's)", () => {
  for (const l of COURSE)
    for (const st of l.stages) {
      const f = fugueById(st.m.piece);
      assert.equal(f.id, st.m.piece, `${l.id}: the piece loaded`);
      const { from, until } = spanOf(st.m);
      const got = f.voices[st.m.voice].filter((n) => n[0] >= from && n[0] < until).map((n) => nameOf(n[2]));
      assert.deepEqual(got, st.m.notes, `${l.id} ${st.kind}: ${st.m.label}`);
      assert.deepEqual(st.m.notes!.map(midiOf), f.voices[st.m.voice].filter((n) => n[0] >= from && n[0] < until).map((n) => n[2]));
    }
  // The report's excerpts, by name.
  const n = (id: string, k = 0) => lessonById(id)!.stages[k].m.notes!.join(" ");
  assert.equal(n("1.2"), "C4 D4 E4 F4 D4 E4 C4 G4", "Invention 1's first idea: seven quick notes, then a longer one");
  assert.equal(n("1.5"), "C3 D3 E3 F3 D3 E3 C3 G3 G2 G3 A3 B3 C4 A3 B3 G3 C4", "the lower voice's answer, an octave lower, half a bar later");
  assert.equal(n("2.1").slice(0, 17), "F4 A4 F4 C5 F4 F5");
  assert.equal(n("2.2"), "A4 A4 A4 A4 B4");
  assert.equal(n("2.3"), "D4 E4 F4 G4 A4 B♭4");
  assert.equal(n("2.3", 3), "D4 E4 F4 G4 A4 B♭4 C♯4 B♭4 A4 G4 F4 E4 F4");
  assert.equal(n("3.1"), "G4 C5 B4 C5 D5", "the four longer notes after the quick ones (and the note they lead to)");
  // 1.5's lower voice enters half a bar after the upper (Bach begins, the player answers).
  const lower = fugueById("inv01").voices[1][0][0];
  assert.equal(lower, fugueById("inv01").barTicks / 2 + 480);
});

test("D373: the same mechanics as the game: only the windows widened (twice, Parts 1–2), one thumb's hints, four beats counted in, the metronome", () => {
  const m = lessonById("1.2")!.stages[2].m;
  const r = runOf(m);
  assert.equal(r.proto, "ladder");
  assert.equal(r.easy, "direction");
  assert.deepEqual(r.tut, { side: "left", widen: 2, countBeats: 4, thumbsA: true });
  assert.ok(r.click, "the metronome in the take");
  // His demonstration (WATCH): no metronome, no four-beat count-in.
  const w = runOf(lessonById("1.2")!.stages[0].m, "plain", undefined, false, false);
  assert.equal(w.click, undefined);
  assert.equal(w.tut!.countBeats, undefined);
  // TRY waits at each note (WAIT FOR ME), nothing counted in.
  const t = runOf(lessonById("1.2")!.stages[1].m);
  assert.equal(t.wait, true);
  assert.equal(t.tut!.countBeats, undefined);
  // The windows: twice the game's (its own play, the same passage).
  const clock = { t: 0 };
  const wide = gameFor(m, clock).g;
  const plain = gameFor({ ...m, widen: undefined, notes: undefined }, { t: 0 }).g;
  assert.ok(Math.abs(wide.opt.early - 2 * plain.opt.early) < 1e-6 && Math.abs(wide.opt.late - 2 * plain.opt.late) < 1e-6);
  // Four beats counted in.
  assert.equal(wide.entry - wide.start, 4 * wide.beat);
  // Part 3: the game's own windows.
  assert.equal(runOf(lessonById("3.3")!.stages[2].m).tut!.widen, undefined);
  // One thumb (1.2 the left, 1.3 the right): every touch of his plan that side; 1.4 by the fingering planner, both thumbs.
  assert.ok(gameFor(m, { t: 0 }).g.plan.every((p) => p.side === "left"));
  assert.ok(gameFor(lessonById("1.3")!.stages[2].m, { t: 0 }).g.plan.every((p) => p.side === "right"));
  const turns = gameFor(lessonById("1.4")!.stages[2].m, { t: 0 }).g.plan.map((p) => p.side);
  assert.ok(turns.includes("left") && turns.includes("right"), turns.join(" "));
  // No riders, no autoplayed notes: every note of the passage is the player's to strike (a take with no touches plays none of them).
  const c = { t: 0 };
  const quiet = gameFor(m, c);
  let done = false;
  while (!done && c.t < 120) (c.t += 1 / 60), (done = quiet.g.step());
  assert.ok(done);
  const res = quiet.g.results();
  assert.equal(res.right, 0);
  assert.equal(res.of, 8);
  // The tutorial's thumbs are the aid's (model A), not the demonstration's own.
  assert.match(src("src/bench/paint-proto.ts"), /&& !g\.o\.thumbsA\) thumbsShown/);
});

test("D373: Part 3's signs are the lesson's own marks, placed on the passage's notes, drawn and judged as a reading's", () => {
  const m = lessonById("3.2")!.stages[2].m;
  const { from, until } = spanOf(m);
  const lr = lessonReading(m, from, until)!;
  assert.equal(lr.reading.notes.filter((n) => n.short).length, 6);
  assert.equal(lr.at.length, 7);
  assert.deepEqual(lr.at, fugueById("bwv779").voices[0].slice(0, 7).map((n) => n[0]));
  const x = demoRun(m).lens!;
  assert.equal(x.marks.short.of, 6, "six SHORT asks judged");
  const j = demoRun(lessonById("3.3")!.stages[2].m).lens!;
  assert.ok(j.marks.joined.of >= 5 && j.marks.apart.of >= 4, JSON.stringify(j.marks));
  assert.equal(demoRun(lessonById("3.5")!.stages[0].m, "accent").lens!.marks.accent.of, 2);
});

/** The simulated player for each lesson: careful, and doing what the lesson asks. */
const player: Record<string, PlayerStyle> = {
  "3.2": { jitterMs: 15, hold: 0.35 },
  "3.3": { jitterMs: 10, holdOf: (k) => (k < 6 ? 1.05 : 0.5) },
  // D378: joined by ear (25 ms, Glenn's): the player who joins holds into the next strike (care's 10% gap is heard).
  "3.4": { jitterMs: 15, hold: 1.05 },
  // D385: the accent is weight on time: the two top notes landed by the box (the strong zone), on the beat.
  "3.5": { jitterMs: 20, hold: 0.9, acrossOf: (k) => (k === 5 || k === 20 ? 0.1 : 0.5) },
};

test("D373: a simulated player passes every lesson (every PLAY, and the lesson), his demonstration every WATCH, every TRY played through", () => {
  for (const l of COURSE) {
    l.stages.forEach((st: Stage, k) => {
      if (st.kind === "tour") return;
      if (st.kind === "play") {
        const x = playerRun(st.m, player[l.id] ?? { jitterMs: 20, hold: 0.9 }).lens!;
        assert.ok(stagePassed(l, "play", x, k), `${l.id} PLAY ${k}: ${(l.checks!(x, st) ?? []).map((c) => `${c.ok ? "✓" : "✗"} ${c.text} ${JSON.stringify(c.vars)}`).join(" · ")}`);
        if (k === lastPlay(l)) assert.ok(lessonPassed(l, x), l.id);
      } else {
        const r = demoRun(st.m, st.style ?? "plain");
        assert.equal(r.right, r.of, `${l.id} ${st.kind}: every note of his demonstration right`);
      }
    });
  }
});

test("D373: a random tapper fails every PLAY of the new lessons (six seeds)", () => {
  for (const l of COURSE)
    l.stages.forEach((st, k) => {
      if (st.kind !== "play") return;
      for (const seed of [1, 3, 7, 11, 19, 23]) {
        const x = tapperRun(st.m, seed).lens!;
        assert.ok(!stagePassed(l, "play", x, k), `${l.id} PLAY ${k}, seed ${seed}: the tapper passed`);
      }
    });
});

test("D373: the record carried over once from before the rebuild (v: 2): nobody who passed the old lessons redoes them", () => {
  store.clear();
  // A player who passed Part I (sealed), II.1 and III.2, and stopped in IV.1.
  const old = { v: 2, answer: "no", allOpen: false, lessons: { "0.1": { seen: true }, "I.1": { passed: { tries: 1, best: 0.9, ms: 1 } }, "I.5": { passed: { tries: 2, best: 0.88, ms: 2 } }, "II.1": { passed: { tries: 1, best: 0.95, ms: 3 } }, "III.2": { passed: { tries: 1, best: 0.9, ms: 4 } }, "IV.1": { reached: 1 } }, parts: { I: "passed" }, opened: [] };
  store.setItem(MANUAL_KEY, JSON.stringify(old));
  const s = readManual(store);
  assert.equal(s.v, 3);
  assert.equal(s.carried, true);
  for (const id of ["1.1", "1.2", "1.3", "1.4", "1.5", "3.2"]) assert.ok(s.lessons[id]?.passed && s.lessons[id].carried, id);
  assert.equal(s.parts["1"], "passed", "Part 1 sealed (1.5 carried)");
  assert.ok(s.lessons["III.2"].passed && s.lessons["IV.1"].reached === 1, "the older lessons' records kept as they were");
  assert.ok(!s.lessons["2.1"], "what was not taught before is not given");
  assert.equal(nextLesson(s), "2.1");
  // Once: read again, the same.
  assert.deepEqual(readManual(store), s);
  // The map covers every withdrawn lesson of 0–II (and three of III's).
  for (const id of ["0.1", "I.1", "I.2", "I.3", "I.4", "I.5", "II.1", "II.3", "II.4", "II.5", "II.6", "II.7"]) assert.ok(CARRY[id]?.length, id);
  // From the oldest record (tb-tutorial-v1's phone track) through to v: 3.
  store.clear();
  store.setItem("tb-tutorial-v1", JSON.stringify({ mobile: { answered: true, passed: { "t-beat": { tries: 1, best: 1, ms: 5 }, "t-thumbs": { tries: 1, best: 1, ms: 6 } } } }));
  const v1 = readManual(store);
  assert.ok(v1.migrated && v1.lessons["1.2"]?.passed && v1.lessons["1.4"]?.passed);
  assert.deepEqual(migrate(null), null);
  // A new player: 1.1 first.
  store.clear();
  assert.equal(nextLesson(readManual(store)), "1.1");
  assert.deepEqual(carry({}).lessons, {});
  store.clear();
});

test("D373: each step finished is kept (the tile's chips); CONTINUE takes the lesson up at its first step not finished", () => {
  store.clear();
  assert.equal(resumeAt(readManual(store), "1.4"), 0);
  finishStep("1.4", 0, store);
  finishStep("1.4", 1, store);
  assert.deepEqual(stepsDone(readManual(store), "1.4"), [0, 1]);
  assert.equal(resumeAt(readManual(store), "1.4"), 2);
  recordTake("1.4", 0.9, true, store);
  assert.deepEqual(stepsDone(readManual(store), "1.4"), [0, 1, 2, 3], "passed: every chip open");
  assert.equal(resumeAt(readManual(store), "1.4"), 0, "passed: AGAIN from the beginning");
  store.clear();
});

test("D373: the selection screen: three columns (parts, the part's lessons as tiles with their steps, the chosen lesson and CONTINUE); nothing scrolls", async () => {
  register("./tsx-hooks.mjs", import.meta.url);
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { TutorialSelect } = await import("../src/bench/manual/ManualMap.tsx");
  const html = renderToStaticMarkup(createElement(TutorialSelect, { begin: () => {}, close: () => {}, focus: "2.3" }));
  for (const c of ["tb-tut-left", "tb-tut-centre", "tb-tut-right"]) assert.match(html, new RegExp(`class="${c}"`));
  assert.equal(html.match(/id="tut-part-/g)?.length, 7, "D379: six parts and the fugue track");
  assert.equal(html.match(/class="tb-tut-tile[ "]/g)?.length, 4, "Part 2's four lessons");
  assert.match(html, /id="chip-2\.3-0" class="tb-tut-chip watch"/);
  assert.match(html, /You&#x27;ll learn: In a quick run/);
  assert.match(html, /id="tutorial-continue"/);
  assert.match(html, /INVENTION 4, BARS 1–2/);
  const css = src("src/bench/bench.css");
  assert.match(css, /\.tb-tut \{[^}]*height: 100dvh; overflow: hidden;/);
  assert.match(css, /grid-template-columns: calc\(var\(--tg-sal\) \+ var\(--tb-tut-side\)\) 1fr/);
  // The first visit goes straight into 1.1 (no map, no card); the sound's delay lives in SETTINGS.
  const app = src("src/bench/BenchApp.tsx");
  assert.match(app, /if \(!Object\.keys\(s\.lessons\)\.length\) return beginManual\("1\.1"\);/);
  assert.match(app, /<StepBanner kind=/);
  assert.match(app, /<Caption text=/);
  assert.match(app, /<TourBubble /);
});

void (null as unknown as ManualLesson | Material);
