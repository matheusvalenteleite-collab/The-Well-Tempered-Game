import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { KEY_ROWS, protoById } from "../src/bench/protos.ts";
import { CANDIDATES, EXAM, LESSONS, MOBILE_LESSONS, passed, TRACKS, type Lesson } from "../src/bench/lessons.ts";
import { answer, askFirst, nextLesson, OLD_LESSONS_KEY, readTutorial, recordLesson, trackState, TUTORIAL_KEY } from "../src/bench/tutorial.ts";
import { CARDS, TESTBENCH } from "../src/bench/cards.ts";

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

function gameOf(l: Lesson, clock: { t: number }) {
  const r = l.run();
  const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById(r.proto), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: r.fail }, fakeChip(clock));
  return { r, g };
}

const [W, H] = [800, 400];
/** LADDER's box: rows 16 px apart. */
const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };

/** A computer lesson played as taught: the line followed along the home row. */
function playKeys(l: Lesson) {
  const clock = { t: 0 };
  const { r, g } = gameOf(l, clock);
  const row = KEY_ROWS[2].codes;
  let col = 5;
  let id = 0;
  for (let i = 0; i < g.notes.length; i++) {
    if (i > 0 && g.notes[i - 1].on === g.notes[i].on) continue;
    const m = g.moves[i];
    if (g.isFree(i)) col = 5;
    else if (m.dir !== 0 && m.steps !== 0) col = Math.max(0, Math.min(row.length - 1, col + m.dir * (r.easy === "leaps" && m.size >= 3 ? 2 : 1)));
    const until = g.timeAt(g.notes[i].on);
    while (clock.t < until - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, until);
    g.step();
    g.keyDown(++id, { velocity: 0.5, code: m.dir === 0 && !g.isFree(i) ? "Space" : row[col] }, performance.now());
    g.keyUp(id, performance.now());
  }
  return { r, g, res: g.results() };
}

/** A phone lesson played as taught: LADDER at each note's height; SUBJECT each note's lane (D217: the lower row for a stretto's older entry). */
function playTouch(l: Lesson) {
  const clock = { t: 0 };
  const { r, g } = gameOf(l, clock);
  if (r.proto === "ladder") g.rows = ROWS;
  const runTo = (t: number) => {
    while (clock.t < t - 0.05) (clock.t += 0.05), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  const struck = g.tracks
    .flatMap((t, k) => t.notes.map((n, i) => ({ k, i, n })).filter(({ n, i }) => !n.ride && !(i > 0 && t.notes[i - 1].on === n.on)))
    .sort((a, b) => a.n.on - b.n.on || a.k - b.k);
  let id = 0;
  for (const { k, i, n } of struck) {
    runTo(g.timeAt(n.on));
    let c;
    if (r.proto === "ladder") {
      const top = Math.max(...g.tracks[k].notes.filter((x) => x.on === n.on).map((x) => x.step));
      c = { side: "left" as const, x: W * 0.1, y: ROWS.yOf(top), w: W, h: H };
    } else {
      const x = ((g.lanesOf(k)[i] + 0.5) / g.laneCount) * 400;
      c = { side: (x < 200 ? "left" : "right") as "left" | "right", x, y: k ? 800 - 70 : 800 - 150, w: 400, h: 800 };
    }
    g.down(++id, c, performance.now());
    g.up(id, performance.now());
  }
  runTo(g.timeAt(g.end + 1));
  return { r, g, res: g.results() };
}

test("D225: each lesson's passage is pinned (a change to the data or the search cannot move a lesson silently)", () => {
  const pins: Record<string, [string, string, number, number, number, boolean, boolean]> = {
    // track/id: proto, piece, voice, from, until, wait, fail
    "computer/beat": ["keys", "wtc1f01", 0, 17280, 23520, false, false],
    "computer/line": ["keys", "wtc1f03", 0, 30720, 50880, true, false],
    "computer/same": ["keys", "wtc1f12", 2, 89280, 99360, false, false],
    "computer/subject": ["keys", "wtc1f02", 1, 0, 16320, false, true],
    "computer/answer": ["keys", "wtc1f02", 0, 0, 47040, false, true],
    "computer/exposition": ["keys", "wtc1f02", 1, 0, 77760, false, true],
    "computer/leap": ["keys", "wtc1f04", 0, 339840, 359040, false, true],
    "computer/exam": ["keys", "wtc1f08", 0, 0, 668160, false, true],
    "mobile/ladder": ["ladder", "wtc1f01", 0, 20160, 25920, true, false],
  };
  const seen: string[] = [];
  for (const [pl, track] of Object.entries(TRACKS))
    for (const l of track) {
      const r = l.run();
      seen.push(`${pl}/${l.id}`);
      assert.deepEqual([r.proto, r.piece, r.voice, r.from, r.until, r.wait, r.fail], pins[`${pl}/${l.id}`], `${pl}/${l.id}`);
      assert.equal(r.proto, l.mode, `${l.id}: played in the mode it teaches`);
    }
  assert.deepEqual(seen.sort(), Object.keys(pins).sort());
  // The search runs over Book I only, in Bach's order.
  assert.deepEqual(CANDIDATES, Array.from({ length: 24 }, (_, i) => `wtc1f${String(i + 1).padStart(2, "0")}`));
  // The exam: a Book I fugue of the testbench, one or two stars (D222).
  const card = CARDS.find((c) => c.id === EXAM)!;
  assert.ok(TESTBENCH.includes(EXAM) && card.book === 1 && card.stars <= 2, `${EXAM}: ${card.stars} stars`);
});

test("D225: the tracks: the computer's eight HIGHWAY lessons, the phone's LADDER (D229: SUBJECT withdrawn); ids unique; Bach brief (≤ 2 lines before, 1 after, ≤ 20 words)", () => {
  assert.deepEqual(LESSONS.map((l) => l.id), ["beat", "line", "same", "subject", "answer", "exposition", "leap", "exam"]);
  assert.deepEqual(MOBILE_LESSONS.map((l) => [l.id, l.mode]), [["ladder", "ladder"]]);
  assert.ok(MOBILE_LESSONS[0].run().wait, "LADDER waits at each note");
  for (const track of Object.values(TRACKS)) {
    assert.equal(new Set(track.map((l) => l.id)).size, track.length);
    for (const l of track) {
      assert.ok(l.intro.length >= 1 && l.intro.length <= 2, `${l.id}: ${l.intro.length} lines before`);
      assert.equal(l.praise.length, 1, l.id);
      assert.equal(l.again.length, 1, l.id);
      for (const line of [...l.intro, ...l.praise, ...l.again]) assert.ok(line.text.split(/\s+/).length <= 20, `${l.id}: "${line.text}"`);
      assert.ok(protoById(l.mode).platform === (track === LESSONS ? "computer" : "mobile"), `${l.id} on its platform`);
    }
  }
});

test("the computer's lessons: each finds its passage in a fugue, the first ones each their own, and each can be played right through and passed", () => {
  const pieces = LESSONS.slice(0, 3).map((l) => l.run().piece);
  assert.equal(new Set(pieces).size, 3, pieces.join(" "));
  for (const l of LESSONS) {
    const { r, g, res } = playKeys(l);
    assert.equal(fugueById(r.piece).kind, "fugue", l.title);
    assert.ok(g.notes.length >= 6, `${l.title}: ${g.notes.length} notes`);
    assert.equal(res.right, res.of, `${l.title}: ${res.right}/${res.of}`);
    assert.equal(res.failedBar, null, l.title);
    assert.ok(passed(l, res), l.title);
  }
});

test("D225: the phone's lesson (LADDER, waiting) can be played right through and passed", () => {
  for (const l of MOBILE_LESSONS) {
    const { g, res } = playTouch(l);
    assert.ok(g.notes.length >= 6, `${l.id}: ${g.notes.length} notes`);
    assert.equal(res.right, res.of, `${l.id}: ${res.right}/${res.of} (wrong ${res.wrong}, missed ${res.missed})`);
    assert.ok(passed(l, res), l.id);
  }
});

test("D225: from the fourth lesson on the crowd can leave (a player mashing one key fails, and is not passed); the first three cannot fail", () => {
  LESSONS.forEach((l, n) => {
    const r = l.run();
    assert.equal(r.fail, n >= 3, `${l.id}: fail ${r.fail}`);
    if (r.wait) return;
    const clock = { t: 0 };
    const { g } = gameOf(l, clock);
    let done = false;
    let id = 0;
    while (!done && clock.t < 2000) {
      clock.t += 0.05;
      done = g.step();
      // One key, struck five times a second, whatever the music.
      if (!done && ++id % 4 === 0) (g.keyDown(id, { velocity: 0.5, code: "KeyA" }, performance.now()), g.keyUp(id, performance.now()));
    }
    const res = g.results();
    if (n >= 3) {
      assert.notEqual(g.failedAt, null, `${l.id}: the crowd left`);
      assert.ok(!passed(l, res), l.id);
    } else assert.equal(g.failedAt, null, `${l.id}: played to the end`);
  });
  for (const l of MOBILE_LESSONS) assert.equal(l.run().fail, false, l.id);
});

test("D225: a lesson's own pass rule (the articulation, say) over the share right", () => {
  const { res } = playKeys(LESSONS[0]);
  assert.ok(passed(LESSONS[0], res));
  assert.ok(!passed({ ...LESSONS[0], pass: (r) => r.art.legato > 1000 }, res));
  assert.ok(!passed(LESSONS[0], { ...res, failedBar: 3 }), "a lost run is never passed");
});

test("a waiting lesson holds the clock at each note: struck late, it is still right", () => {
  const l = LESSONS.find((x) => x.run().wait)!;
  const clock = { t: 0 };
  const { g } = gameOf(l, clock);
  const heads = g.notes.map((x, i) => (i > 0 && g.notes[i - 1].on === x.on ? -1 : i)).filter((i) => i >= 0);
  const row = KEY_ROWS[2].codes;
  let col = 5;
  for (const i of heads) {
    // Two seconds after the note was due; the key the line asks for.
    const until = clock.t + 2;
    while (clock.t < until) (clock.t += 0.05), g.step();
    const m = g.moves[i];
    if (g.isFree(i)) col = 5;
    else if (m.dir !== 0 && m.steps !== 0) col = Math.max(0, Math.min(row.length - 1, col + m.dir));
    g.keyDown(10 + i, { velocity: 0.5, code: m.dir === 0 && !g.isFree(i) ? "Space" : row[col] }, performance.now());
    g.keyUp(10 + i, performance.now());
  }
  const r = g.results();
  assert.equal(r.right, r.of, `${r.right}/${r.of}`);
});

/** A browser's storage, for the tutorial's memory. */
function withStorage(seed: Record<string, string>, body: (m: Map<string, string>) => void | Promise<void>) {
  const m = new Map(Object.entries(seed));
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
  const done = () => delete (globalThis as { localStorage?: unknown }).localStorage;
  try {
    const p = body(m);
    if (p) return p.finally(done);
  } catch (e) {
    done();
    throw e;
  }
  done();
}

test("D225: HAVE YOU PLAYED BEFORE? is asked once per platform; the answer kept; YES skips, NO teaches", () =>
  withStorage({}, (m) => {
    assert.equal(askFirst("computer"), true);
    assert.equal(askFirst("mobile"), true);
    answer("computer", true);
    assert.equal(askFirst("computer"), false, "answered: not asked again");
    assert.equal(askFirst("mobile"), true, "the other platform still asks");
    assert.deepEqual(trackState("computer"), { answered: true, skipped: true, passed: {} });
    answer("mobile", false);
    assert.equal(trackState("mobile").skipped, false);
    assert.equal(nextLesson("mobile"), 0, "NO: the track from its first lesson");
    assert.deepEqual(Object.keys(JSON.parse(m.get(TUTORIAL_KEY)!)).sort(), ["computer", "mobile"]);
  }));

test("D225: lessons kept per platform (tries, best, when); the next suggested; the old count carried over", () =>
  withStorage({ [OLD_LESSONS_KEY]: "3" }, (m) => {
    const c = readTutorial().computer!;
    assert.deepEqual(Object.keys(c.passed), ["beat", "line", "same"]);
    assert.equal(c.answered, true, "lessons taken: played before");
    assert.equal(m.has(OLD_LESSONS_KEY), false, "the old key dropped");
    assert.equal(nextLesson("computer"), 3);
    recordLesson("computer", "subject", 0.5, false);
    recordLesson("computer", "subject", 0.9, true);
    const s = trackState("computer").passed.subject;
    assert.equal(s.tries, 2);
    assert.equal(s.best, 0.9);
    assert.ok(s.ms > 0);
    recordLesson("computer", "subject", 0.95, false);
    assert.equal(trackState("computer").passed.subject.best, 0.95, "replayed: the best kept, still passed");
    assert.equal(nextLesson("computer"), 4);
    assert.equal(nextLesson("mobile"), 0);
  }));

test("D225: the LESSON MAP lists each track's lessons, ✓ when passed, the next marked; the question's two buttons", () =>
  withStorage({}, async () => {
    register("./tsx-hooks.mjs", import.meta.url);
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { LessonMap, PlayedBefore } = await import("../src/bench/LessonMap.tsx");
    recordLesson("computer", "beat", 0.92, true);
    const html = renderToStaticMarkup(createElement(LessonMap, { platform: "computer", play: () => {}, close: () => {} }));
    assert.equal(html.match(/data-lesson=/g)?.length, LESSONS.length);
    assert.equal(html.match(/tb-map-row earned/g)?.length, 1);
    assert.match(html, /id="map-computer-beat"[^>]*>.*?✓.*?92%/);
    assert.match(html, /id="map-computer-line" class="tb-ach-row tb-map-row next"/);
    assert.match(html, /COMPUTER 1\/8/);
    assert.match(html, /MOBILE 0\/1/);
    const phone = renderToStaticMarkup(createElement(LessonMap, { platform: "mobile", focus: "ladder", play: () => {}, close: () => {} }));
    assert.equal(phone.match(/data-lesson=/g)?.length, MOBILE_LESSONS.length);
    assert.match(phone, /<h2>LADDER<\/h2>/);
    assert.doesNotMatch(phone, /SUBJECT/);
    const q = renderToStaticMarkup(createElement(PlayedBefore, { answer: () => {} }));
    assert.match(q, /id="played-yes"[^>]*>YES<small>SKIP/);
    assert.match(q, /id="played-no"[^>]*>NO<small>TEACH ME/);
    assert.match(q, /tb-bach-face/, "Herr Bach's portrait");
  }));
