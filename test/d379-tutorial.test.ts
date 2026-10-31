/**
 * D379, THE TUTORIAL'S PARTS 4–6 REBUILT AND THE FUGUE TRACK: the curriculum's shape (voices, time and
 * breath, the graces, the colour; SO YOU WANT TO PLAY A FUGUE?); every excerpt's notes against data/touch/;
 * a simulated player passes every lesson's PLAY (doing what it asks: breathing, lingering, landing by the
 * box and the edge, sliding, letting ring) and a random tapper fails every one; SPOT found by a listener
 * and failed by a random tapper; every QUIZ has one right answer; the older III–V's records carried once
 * (CARRY4), nothing wiped; the thumbs' path kept; the rules (loudness never the verdict's).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById, loadExtras } from "../src/touch/fugue.ts";
import { BUILT, decider, isCourse, isJudged, lessonById, lessonPassed, MANUAL, midiOf, PARTS, runOf, shownId, spanOf, spotEntries, spotJudge, spotPassed, stagePassed, type Material } from "../src/bench/manual/lessons.ts";
import { RETIRED } from "../src/bench/manual/retired.ts";
import { CARRY4, MANUAL_KEY, nextLesson, readManual } from "../src/bench/manual/store.ts";
import { demoRun, gameFor, tapperRun } from "./d342-sim.ts";
import { playerRun, type PlayerStyle } from "./d359-players.ts";

await loadExtras();
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const NEW = MANUAL.filter((l) => ["4", "5", "6", "F"].includes(l.part));
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const nameOf = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), clear: () => mem.clear() };

test("D379: Parts 4–6 rebuilt in the new format, then the fugue track; the older III–V retired (data only)", () => {
  assert.deepEqual(BUILT.map((p) => p.id), ["1", "2", "3", "4", "5", "6", "F"]);
  assert.deepEqual(
    NEW.map((l) => l.id),
    ["4.1", "4.2", "4.3", "4.4", "4.5", "5.1", "5.2", "5.3", "5.4", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "F.1", "F.2", "F.3", "F.4", "F.5", "F.6", "F.7"],
  );
  assert.equal(shownId("F.3"), "F.3");
  assert.equal(shownId("6.4"), "6.4");
  assert.ok(PARTS.find((p) => p.id === "F")!.track, "the fugue track a track of its own");
  assert.match(PARTS.find((p) => p.id === "F")!.english, /SO YOU WANT TO PLAY A FUGUE\?/);
  assert.ok(MANUAL.every((l) => isCourse(l)), "every lesson in the new format");
  assert.ok(!MANUAL.some((l) => ["III", "IV", "V"].includes(l.part)), "III–V no longer offered");
  assert.equal(RETIRED.length, 16, "kept as data for their tests");
  for (const l of NEW) {
    assert.ok(l.aim && l.learn && l.music && l.before.length && l.after.length, `${l.id}: You'll learn, its music, his lines`);
    assert.ok(l.stages.every((s) => s.say), `${l.id}: every step says what to do`);
    assert.ok(decider(l) >= 0 && isJudged(l.stages[decider(l)].kind), `${l.id}: a judged step decides`);
    assert.equal(decider(l), l.stages.length - 1, `${l.id}: the last step decides`);
    for (const s of l.stages) {
      if (s.kind === "quiz") assert.equal(s.quiz!.answers.filter((a) => a.right).length, 1, `${l.id}: one right answer`);
      if (s.kind === "spot") assert.ok(s.spot && s.spot.need >= 1, l.id);
    }
  }
  // Inventions and Sinfonias in Parts 4–6; Book I's fugues and preludes only in the fugue track.
  // D400: 6.8 THE REAL THING plays Fugue I/2's subject (the game's own screen, before the fugue track).
  for (const l of NEW.filter((x) => x.part !== "F" && x.id !== "6.8")) for (const s of l.stages) assert.match(s.m.piece, /^(inv01|bwv7(7[2-9]|8\d|9\d|80[01]))$/, `${l.id}: ${s.m.piece}`);
  for (const l of NEW.filter((x) => x.part === "F")) for (const s of l.stages) assert.match(s.m.piece, /^(inv01|wtc1[fp]0[1-3])$/, l.id);
  // Each part sealed by a checkpoint.
  for (const p of ["4", "5", "6", "F"]) assert.ok(MANUAL.some((l) => l.part === p && l.checkpoint), p);
  // The appoggiatura split (Glenn): held over (a suspension) against struck; the colour, the slide-slur, over-legato.
  assert.equal(lessonById("6.3")!.stages[0].style, "appoggiatura");
  assert.match(lessonById("6.3")!.before.join(" "), /suspension/);
  assert.match(lessonById("6.5")!.before.join(" "), /appoggiatura/);
  assert.equal(lessonById("6.4")!.stages[0].m.coach, "colour");
  assert.equal(lessonById("6.6")!.stages[0].m.coach, "slide");
  assert.equal(lessonById("6.7")!.sound, "harpsichord");
  // No jargon without its gloss in Parts 4–6 (the report's word list): no quaver, legato, staccato, cadence…
  const words = NEW.filter((l) => l.part !== "F").flatMap((l) => [l.english, l.aim, ...l.before, ...l.after, ...l.again, ...l.stages.map((s) => s.say ?? "")]).join(" ");
  assert.doesNotMatch(words, /quaver|semiquaver|legato|staccato|articulation|stretto|mordent|cadence|onset|pulse|\bD3\d\d/i);
});

test("D379: every excerpt's notes, read from data/touch/", () => {
  for (const l of NEW)
    for (const st of l.stages) {
      const f = fugueById(st.m.piece);
      assert.equal(f.id, st.m.piece, `${l.id}: loaded`);
      const { from, until } = spanOf(st.m);
      const got = f.voices[st.m.voice].filter((n) => n[0] >= from && n[0] < until);
      assert.deepEqual(got.map((n) => nameOf(n[2])), st.m.notes, `${l.id} ${st.kind}: ${st.m.label}`);
      assert.deepEqual(st.m.notes!.map(midiOf), got.map((n) => n[2]));
    }
  // The signs the graces lessons point at, in the edition's data (ornament-play.ts): the quick shakes on B and F, the long one on D♯.
  const g1 = gameFor(lessonById("6.1")!.stages[2].m, { t: 0 }).g;
  assert.deepEqual(g1.tracks[0].notes.filter((_, i) => g1.ornamentAt(0, i)).map((n) => nameOf(n.midi)), ["B4", "F5"]);
  const g2 = gameFor(lessonById("6.2")!.stages[2].m, { t: 0 }).g;
  assert.deepEqual(g2.tracks[0].notes.filter((_, i) => g2.ornamentAt(0, i)).map((n) => nameOf(n.midi)), ["E♭5"]);
  // The held-over sighs: three places in Sinfonia 9's alto (D364's holdOverAt).
  const g3 = gameFor(lessonById("6.3")!.stages[2].m, { t: 0 }).g;
  assert.equal(g3.tracks[0].notes.filter((_, i) => g3.holdOverAt(0, i)).length, 3);
  // The fugue track's entries: I/2's exposition (alto, soprano, bass), I/1's (alto, soprano, tenor, bass), the episode's one.
  const at = (id: string, k: number) => spotEntries(lessonById(id)!.stages[k].m);
  assert.deepEqual(at("F.4", 3).map((on) => fugueById("wtc1f02").entries.find((e) => e.on === on)!.voice), [1, 0, 2]);
  assert.deepEqual(at("F.7", 2).map((on) => fugueById("wtc1f01").entries.find((e) => e.on === on)!.voice), [1, 0, 2, 3]);
  assert.equal(at("F.5", 1).length, 1);
  assert.equal(at("4.1", 1).length, 6);
});

/** The players: careful, and doing what each lesson asks. */
function styleFor(id: string, m: Material): PlayerStyle {
  const f = fugueById(m.piece);
  const { from, until } = spanOf(m);
  const hs = f.voices[m.voice].filter((n, i, a) => n[0] >= from && n[0] < until && !(i > 0 && a[i - 1][0] === n[0]));
  const fall = (a: number, b: number) => !!hs[a] && !!hs[b] && hs[a][2] - hs[b][2] >= 1 && hs[a][2] - hs[b][2] <= 2;
  switch (id) {
    case "5.1": {
      // A breath: after the rest, a hair late.
      const after = new Set(hs.filter((n, k) => k > 0 && hs[k - 1][0] + hs[k - 1][1] < n[0]).map((n) => n[0]));
      return { jitterMs: 15, hold: 0.85, lean: { ms: 90, at: (t) => after.has(t) } };
    }
    case "5.3":
      return { jitterMs: 10, hold: 0.9, lean: { ms: 170, at: (t) => (t - f.bars[0].on) % f.barTicks === 0 } };
    case "6.4":
      return { jitterMs: 15, hold: 0.9, acrossOf: (k) => (hs[k][0] < from + f.barTicks ? 0.05 : 0.95) };
    case "6.5":
      return { jitterMs: 15, hold: 0.9, acrossOf: (k) => (fall(k, k + 1) ? 0.05 : fall(k - 1, k) ? 0.95 : 0.5) };
    case "6.6":
      return { jitterMs: 10, hold: 0.9, slideAt: (k) => k > 0 && hs[k][2] > hs[k - 1][2] && hs[k][2] - hs[k - 1][2] <= 2 };
    case "6.7":
      return { jitterMs: 10, hold: 1.4 };
  }
  return { jitterMs: 20, hold: 0.9 };
}

test("D379: a simulated player passes every PLAY of the new lessons (and the lesson); his demonstration plays every WATCH right", () => {
  for (const l of NEW)
    l.stages.forEach((st, k) => {
      if (st.kind === "play") {
        const x = playerRun(st.m, styleFor(l.id, st.m)).lens!;
        assert.ok(stagePassed(l, "play", x, k), `${l.id} PLAY ${k}: ${(l.checks!(x, st) ?? []).map((c) => `${c.ok ? "✓" : "✗"} ${c.text} ${JSON.stringify(c.vars)}`).join(" · ")}`);
        if (k === decider(l)) assert.ok(lessonPassed(l, x), l.id);
      } else if (st.kind === "watch" || st.kind === "listen" || st.kind === "spot") {
        const r = demoRun(st.m, st.style ?? "plain");
        assert.equal(r.right, r.of, `${l.id} ${st.kind}: his demonstration right`);
      }
    });
  // His demonstrations show what they teach: the colour, the slides, the ring, the struck sighs, the breath, the lean, the held-over sighs.
  const demo = (id: string) => demoRun(lessonById(id)!.stages[0].m, lessonById(id)!.stages[0].style ?? "plain").lens!;
  assert.ok(demo("6.4").colour.firm >= 6 && demo("6.4").colour.soft >= 6, JSON.stringify(demo("6.4").colour));
  assert.ok(demo("6.6").slides >= 2);
  assert.ok(demo("6.7").rings.ok >= 3);
  assert.ok(demo("6.5").sighs.ok >= 2);
  assert.ok(demo("5.1").graces.breath >= 1);
  assert.ok(demo("5.3").graces.agogic >= 2);
  assert.equal(demo("6.3").appo.made, 3);
  // A careful player who does not do what is asked is told so (the ring, the slide, the colour, the breath).
  for (const id of ["5.1", "5.3", "6.4", "6.5", "6.6", "6.7"]) {
    const l = lessonById(id)!;
    const x = playerRun(l.stages[decider(l)].m, { jitterMs: 15, hold: 0.9 }).lens!;
    assert.ok(!lessonPassed(l, x), `${id}: the plain player is asked for what the lesson teaches`);
  }
});

test("D379: a random tapper fails every PLAY of the new lessons (six seeds)", () => {
  for (const l of NEW)
    l.stages.forEach((st, k) => {
      if (st.kind !== "play") return;
      for (const seed of [1, 3, 7, 11, 19, 23]) assert.ok(!stagePassed(l, "play", tapperRun(st.m, seed).lens!, k), `${l.id} PLAY ${k}, seed ${seed}`);
    });
});

test("D379, SPOT: a listener who taps as each entry is heard passes; a random tapper fails; loudness plays no part", () => {
  for (const l of NEW)
    l.stages.forEach((st) => {
      if (st.kind !== "spot") return;
      const f = fugueById(st.m.piece);
      const es = spotEntries(st.m);
      const beat = f.tpq;
      const ticksPerMs = (f.tpq * runOf(st.m).bpm) / 60000;
      // The listener: 450 ms after each entry, and one stray tap.
      const taps = [...es.map((e) => e + 450 * ticksPerMs), es[0] + 2.6 * beat];
      const r = spotJudge(es, taps, beat);
      assert.ok(spotPassed(st, r), `${l.id}: ${JSON.stringify(r)}`);
      // Random tappers: one tap about every second over the passage.
      const { from, until } = spanOf(st.m);
      for (const seed of [1, 3, 7, 11, 19, 23]) {
        let s = seed;
        const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const ts: number[] = [];
        for (let t = from + rand() * 1000 * ticksPerMs; t < until; t += (600 + 900 * rand()) * ticksPerMs) ts.push(t);
        assert.ok(!spotPassed(st, spotJudge(es, ts, beat)), `${l.id} seed ${seed}: the tapper passed (${ts.length} taps)`);
      }
    });
  // A tap counts once: a second tap for the same entry is stray.
  assert.deepEqual(spotJudge([1000], [1100, 1200], 1920), { spotted: 1, of: 1, strays: 1, found: [1000] });
});

test("D379: the fugue track's facts said plainly, the disputed said to be disputed", () => {
  const all = (id: string) => {
    const l = lessonById(id)!;
    return [...l.before, ...l.after, ...l.stages.flatMap((s) => [s.say ?? "", s.quiz?.ask ?? "", ...(s.quiz?.answers.flatMap((a) => [a.text, a.why]) ?? [])])].join(" ");
  };
  assert.match(all("F.1"), /1685/);
  assert.match(all("F.1"), /1750/);
  assert.match(all("F.1"), /Leipzig/);
  assert.match(all("F.3"), /nobody knows for sure/);
  assert.match(all("F.2"), /players still discuss/);
  assert.match(all("F.7"), /Glenn Gould/);
  // The temperaments compared by ear: meantone's C major, then its C♯ major, then well-tempered.
  assert.deepEqual(lessonById("F.3")!.stages.filter((s) => s.kind === "listen").map((s) => [s.m.piece, s.m.tuning]), [["wtc1p01", "meantone"], ["wtc1p03", "meantone"], ["wtc1p03", "werckmeister"]]);
  assert.match(src("src/bench/BenchApp.tsx"), /run\?\.tuning \? \{ id: run\.tuning, a: 415 \}/);
  // The instruments by ear.
  assert.deepEqual(lessonById("F.2")!.stages.filter((s) => s.kind === "listen").map((s) => s.m.sound), ["harpsichord", "organ", "piano"]);
});

test("D379: the older III–V's records carried once to 4–6 (CARRY4); nothing wiped; a new player begins at 1.1", () => {
  store.clear();
  const v3 = { v: 3, carried: true, lessons: { "1.1": { passed: { tries: 1, best: 1, ms: 1 } }, "IV.1": { passed: { tries: 2, best: 0.9, ms: 2 } }, "V.5": { passed: { tries: 1, best: 0.8, ms: 3 } }, "IV.6": { passed: { tries: 1, best: 0.9, ms: 4 } }, "III.2": { reached: 1 } }, parts: { IV: "passed" } };
  store.setItem(MANUAL_KEY, JSON.stringify(v3));
  const s = readManual(store);
  assert.equal(s.v, 3);
  assert.equal(s.carried4, true);
  for (const id of ["5.1", "6.3", "5.4"]) assert.ok(s.lessons[id]?.passed && s.lessons[id].carried, id);
  assert.ok(s.lessons["IV.1"].passed && s.lessons["III.2"].reached === 1 && s.lessons["1.1"].passed, "the old records kept");
  assert.equal(s.parts["5"], "passed", "Part 5 sealed by its carried checkpoint");
  assert.ok(!s.lessons["4.1"] && !s.lessons["6.4"], "what was never taught is offered");
  assert.equal(nextLesson(s), "1.2");
  assert.deepEqual(readManual(store), s, "once");
  for (const [o, ids] of Object.entries(CARRY4)) {
    assert.ok(RETIRED.some((l) => l.id === o), o);
    for (const id of ids) assert.ok(lessonById(id), id);
  }
  store.clear();
  const fresh = readManual(store);
  assert.equal(nextLesson(fresh), "1.1");
  assert.equal(fresh.carried4, true);
  store.clear();
});

test("D379: the thumbs' path kept (each touch's marker in place, older fainter, per thumb, numbered while few) and held a moment after the step", () => {
  const aids = src("src/bench/manual/aids.ts");
  assert.match(aids, /export function thumbPath/);
  assert.match(aids, /PATH_INK: Record<Side, string> = \{ left: "#f3d78a", right: "#8cc4ff" \}/);
  assert.match(aids, /const alphaOf = \(j: number\) => 0\.18 \+ \(0\.67 \* \(j \+ 1\)\) \/ n/);
  assert.match(src("src/bench/BenchApp.tsx"), /const PATH_HOLD_MS = 1800/);
  // Colour never the verdict's: the lens reads where a thumb landed; the sound is the engine's (D311), the same right or wrong.
  assert.match(src("src/bench/proto-game.ts"), /this\.landNow\[c\.side\] = h\.land;/);
});
