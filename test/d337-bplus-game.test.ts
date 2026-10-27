/**
 * D337 (WTC 1.52): THE LAB's B+ · PREPARED is the game's base configuration (MECH_DEFAULTS): a landing is
 * the strike; a thumb resting early on its note while the other holds is PREPARED and sounds when the
 * other lifts (a pull-off); nothing sounds by itself; fast runs judged leniently. WTC 1.51's game is the
 * lab's A · CLASSIC (MECH_CLASSIC). The game (built as play.html builds it) prepares; the tutorial's
 * demonstrations and the EASY lessons still pass; old lab logs replay as they were played; the bests
 * from before 1.52 are kept apart.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Chip } from "../src/touch/chip.ts";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { easyOf, KEY_ROWS, protoById } from "../src/bench/protos.ts";
import { readingsOf } from "../src/touch/readings.ts";
import { CLASSIC_VALUES, MECH, MECH_CLASSIC, MECH_DEFAULTS, asRecorded, withMech } from "../src/bench/mechanics.ts";
import { CONFIGS, DEFAULT_CONFIG, configById, configMech, storedSetting } from "../src/bench/lab/presets.ts";
import { diff, replay, tally } from "../src/bench/lab/replay.ts";
import { parseLog, logText, type LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import { LESSONS, TUTORIAL_LESSONS, passed } from "../src/bench/lessons.ts";
import { RULES } from "../src/bench/lite.ts";
import { synthPreparer, synthRun } from "../tools/lab/lab-synth.ts";

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    chime: () => {},
  } as unknown as Chip;
}

const [W, H] = [844, 390];
const ROWS: Rows = { yOf: (s) => 330 - s * 9, stepAt: (y) => Math.round((330 - y) / 9), rowH: 9, xOf: () => 0 };

test("D337: the game's defaults are B+ · PREPARED; WTC 1.51's are A · CLASSIC; the lab starts on B+", () => {
  assert.deepEqual(
    { timing: MECH_DEFAULTS.timing, slurNext: MECH_DEFAULTS.slurNext, doubleSameThumb: MECH_DEFAULTS.doubleSameThumb, doubleMs: MECH_DEFAULTS.doubleMs, runs: MECH_DEFAULTS.runs, prepare: MECH_DEFAULTS.prepare, prepShare: MECH_DEFAULTS.prepShare, slurRollMinMs: MECH_DEFAULTS.slurRollMinMs },
    { timing: "relative", slurNext: false, doubleSameThumb: true, doubleMs: 40, runs: "lenient", prepare: true, prepShare: 1, slurRollMinMs: 0 },
  );
  assert.deepEqual(MECH, MECH_DEFAULTS);
  assert.deepEqual(configMech(configById("B+")!), MECH_DEFAULTS);
  assert.equal(DEFAULT_CONFIG, "B+");
  // A reproduces WTC 1.51's game exactly; B is B+ without preparing (and its own "thumbs together").
  const a = configById("A")!;
  assert.equal(a.name, "A · CLASSIC (WTC 1.51)");
  assert.deepEqual(configMech(a), MECH_CLASSIC);
  assert.deepEqual(MECH_CLASSIC, { ...MECH_DEFAULTS, timing: "absolute", slurNext: true, doubleSameThumb: false, doubleMs: 120, runs: "strict", prepare: false, prepShare: 1, slurRollMinMs: 40 });
  assert.deepEqual(configMech(configById("B")!), { ...MECH_CLASSIC, timing: "relative", slurNext: false, doubleSameThumb: true, doubleMs: 40, runs: "lenient" });
  // C, D and E keep their meaning: WTC 1.51's values under their own, no preparing.
  for (const id of ["C", "D", "E"]) {
    const m = configMech(configById(id)!);
    assert.equal(m.prepare, false, id);
    assert.equal(m.slurNext, true, id);
    assert.deepEqual(m, { ...MECH_CLASSIC, ...configById(id)!.values }, id);
  }
  assert.equal(new Set(CONFIGS.map((c) => JSON.stringify(configMech(c)))).size, CONFIGS.length);
});

/**
 * A passage played on LADDER in a game built as play.html builds it (BenchApp: easy by the mode, the crowd
 * on, no lab), by a preparer: from the third note on, each thumb comes down on its next note just after
 * the other's note sounds, rests there, and the other thumb lifts on the note's time (a pull-off).
 * `holdOn`: the holding thumb lifts this long after the note's time instead (a large value: it never lifts in time).
 */
function preparer(o: { holdOn?: number; strike?: boolean } = {}) {
  const f = fugueById("wtc2f18");
  const clock = { t: 0 };
  const proto = protoById("ladder");
  const g = new ProtoGame(f, [0], 0, proto, { bpm: 83, legato: false, easy: easyOf(proto.id), fail: true, scale: false, until: barStart(f, 5) }, fakeChip(clock));
  g.rows = ROWS;
  const events: LabEvent[] = [];
  g.tap = (e) => events.push(e);
  const notes = g.tracks[0].notes.map((n, i) => ({ n, i })).filter(({ n, i }, _, a) => !n.ride && !(i > 0 && a[i - 1]?.n.on === n.on));
  type E = { t: number; k: number; fn: () => void };
  const evs: E[] = [];
  const t = (tick: number) => g.timeAt(tick);
  // As tools/lab/lab-synth.ts synthPreparer: note j sounds as the thumb on j−1 lifts (plain strikes: on its time).
  const land: number[] = [];
  const sound: number[] = [];
  notes.forEach(({ n }, j) => {
    land[j] = o.strike || j < 2 ? t(n.on) : sound[j - 1] + 0.006;
    if (o.strike || j < 2) sound[j] = land[j];
    const next = notes[j + 1];
    if (next && !o.strike && j + 1 >= 2) sound[j + 1] = Math.max(t(next.n.on) + (o.holdOn ?? 0), land[j] + 0.05);
  });
  notes.forEach(({ n }, j) => {
    const side = j % 2 ? "right" : "left";
    const x = side === "left" ? 40 : W - 40;
    const y = ROWS.yOf(n.step);
    const next = notes[j + 1];
    const lift = o.strike ? (next ? t(next.n.on) + 0.03 : t(n.on + n.dur) - 0.02) : j === 0 ? land[1] + 0.001 : next ? sound[j + 1] : t(n.on + n.dur) - 0.02;
    evs.push({ t: land[j], k: 1, fn: () => g.down(j + 1, { side, x, y, w: W, h: H }, performance.now()) });
    evs.push({ t: Math.max(lift, land[j] + 0.03), k: 0, fn: () => g.up(j + 1, performance.now()) });
  });
  evs.sort((a, b) => a.t - b.t || a.k - b.k);
  let done = false;
  for (const e of evs) {
    while (!done && clock.t < e.t - 1 / 60) (clock.t += 1 / 60), (done = g.step());
    clock.t = Math.max(clock.t, e.t);
    done = g.step() || done;
    e.fn();
  }
  while (!done && clock.t < 120) (clock.t += 1 / 60), (done = g.step());
  const notesOf = events.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note");
  return { res: g.results(), events, notes: notesOf, of: notes.length };
}

test("D337: the game (play.html's options, the defaults) prepares: a thumb resting early sounds on the other's lift, a pull-off; plain strikes still right", () => {
  const p = preparer();
  assert.ok(p.of >= 12, `notes ${p.of}`);
  assert.equal(p.res.right, p.res.of, `right ${p.res.right}/${p.res.of}, missed ${p.res.missed}, stray ${p.res.stray}`);
  const pulls = p.notes.filter((e) => e.gesture === "pull-off");
  assert.ok(pulls.length >= p.of - 3, `pull-offs ${pulls.length} of ${p.of}`);
  assert.ok(p.events.some((e) => e.kind === "prep" && e.what === "rest"));
  // Plain strikes (each thumb lands on its note's time): right, hammer-ons where the other still holds.
  const s = preparer({ strike: true });
  assert.equal(s.res.right, s.res.of, `strikes: right ${s.res.right}/${s.res.of}`);
  assert.ok(s.notes.some((e) => e.gesture === "hammer-on"));
});

test("D337: nothing sounds by itself: a resting thumb whose partner never lifts in time is missed (in A · CLASSIC it waited and sounded at its time)", () => {
  // The left thumb strikes the second note and holds it on, past the third's time; the right comes down on
  // the third soon after (before its window) and rests there, both thumbs down until long after.
  const rest = () => {
    const f = fugueById("wtc2f18");
    const clock = { t: 0 };
    const proto = protoById("ladder");
    const g = new ProtoGame(f, [0], 0, proto, { bpm: 83, legato: false, easy: easyOf(proto.id), fail: true, scale: false, until: barStart(f, 3) }, fakeChip(clock));
    g.rows = ROWS;
    const events: LabEvent[] = [];
    g.tap = (e) => events.push(e);
    const heads = g.notes.map((n, i) => i).filter((i) => !g.notes[i].ride && !(i > 0 && g.notes[i - 1].on === g.notes[i].on));
    const [a, b, c] = heads;
    const t = (i: number) => g.timeAt(g.notes[i].on);
    const runTo = (s: number) => {
      while (clock.t < s - 1 / 60) (clock.t += 1 / 60), g.step();
      clock.t = Math.max(clock.t, s);
      g.step();
    };
    const at = (i: number, side: "left" | "right") => ({ side, x: side === "left" ? 40 : W - 40, y: ROWS.yOf(g.notes[i].step), w: W, h: H });
    runTo(t(a));
    g.down(1, at(a, "right"), performance.now());
    runTo(t(b));
    g.down(2, at(b, "left"), performance.now());
    g.up(1, performance.now());
    runTo(t(b) + 0.2 * (t(c) - t(b)));
    g.down(3, at(c, "right"), performance.now());
    runTo(t(c) + 0.8);
    g.up(2, performance.now());
    g.up(3, performance.now());
    return events.find((e) => (e.kind === "note" || e.kind === "miss") && e.i === c);
  };
  const bp = rest();
  assert.equal(bp?.kind, "miss", JSON.stringify(bp));
  const classic = withMech(CLASSIC_VALUES, rest);
  assert.ok(classic?.kind === "note" && classic.ok, JSON.stringify(classic));
});

test("D337: the tutorial's demonstrations and the steps played as taught pass with B+ (and with A)", () => {
  for (const values of [undefined, CLASSIC_VALUES]) {
    withMech(values, () => {
      for (const l of TUTORIAL_LESSONS.filter((x) => x.id !== "t-whole")) {
        const clock = { t: 0 };
        const r = l.run();
        const reading = r.reading ? readingsOf(r.piece).find((x) => x.id === r.reading) : undefined;
        const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById(r.proto), { bpm: r.bpm, legato: false, until: r.until, wait: false, solo: r.solo, easy: r.easy, fail: r.fail, coach: r.coach, demo: true, reading }, fakeChip(clock));
        g.rows = ROWS;
        let done = false;
        while (!done && clock.t < 600) (clock.t += 0.01), (done = g.step());
        const res = g.results();
        assert.ok(passed(l, res), `${values ? "A" : "B+"} ${l.id}: the demonstration passes (${res.right}/${res.of})`);
      }
    });
  }
});

test("D337: JOINED (t-legato) passes played by pull-offs as by plain overlapping strikes", () => {
  const l = TUTORIAL_LESSONS.find((x) => x.id === "t-legato")!;
  for (const pull of [false, true]) {
    const clock = { t: 0 };
    const r = l.run();
    const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById(r.proto), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: r.fail, coach: r.coach }, fakeChip(clock));
    g.rows = ROWS;
    const runTo = (t: number) => {
      while (clock.t < t - 0.01) (clock.t += 0.01), g.step();
      clock.t = Math.max(clock.t, t);
      g.step();
    };
    const heads = g.notes.map((n, i) => i).filter((i) => !g.notes[i].ride && !(i > 0 && g.notes[i - 1].on === g.notes[i].on));
    type E = { t: number; k: number; fn: () => void };
    const evs: E[] = [];
    heads.forEach((i, j) => {
      const n = g.notes[i];
      const side = j % 2 ? "right" : "left";
      const x = side === "left" ? 40 : W - 40;
      const prevOn = j > 0 ? g.timeAt(g.notes[heads[j - 1]].on) : 0;
      // Pull-off: down 40 % of the way from the note before (after it sounded), resting; else on time.
      const land = pull && j > 0 ? prevOn + 0.4 * (g.timeAt(n.on) - prevOn) : g.timeAt(n.on);
      const next = heads[j + 1];
      const lift = next !== undefined ? g.timeAt(g.notes[next].on) + (pull ? 0 : 0.03) : g.timeAt(n.on + n.dur) - 0.02;
      evs.push({ t: land, k: 1, fn: () => g.down(j + 1, { side, x, y: ROWS.yOf(n.step), w: W, h: H }, performance.now()) });
      evs.push({ t: lift, k: 0, fn: () => g.up(j + 1, performance.now()) });
    });
    evs.sort((a, b) => a.t - b.t || a.k - b.k);
    for (const e of evs) (runTo(e.t), e.fn());
    runTo(g.timeAt(g.end + 1));
    const res = g.results();
    assert.ok(passed(l, res), `${pull ? "pull-offs" : "strikes"}: ${res.right}/${res.of}, legato ${res.art.legato}/${res.art.legatoOf}`);
  }
});

test("D337: the computer's EASY lessons (HIGHWAY, its levels) played as taught still pass", () => {
  for (const l of LESSONS) {
    const clock = { t: 0 };
    const r = l.run();
    const g = new ProtoGame(fugueById(r.piece), r.voice, r.from, protoById(r.proto), { bpm: r.bpm, legato: false, until: r.until, wait: r.wait, solo: r.solo, easy: r.easy, fail: r.fail }, fakeChip(clock));
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
    const res = g.results();
    assert.equal(res.right, res.of, `${l.id} (${r.easy}): ${res.right}/${res.of}`);
    assert.ok(passed(l, res), l.id);
  }
});

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };

test("D337: old lab logs (made before 1.52, their parameters WTC 1.51's) replay identically", () => {
  // The fixture (made before the RELATIVE, run and prepared parameters existed).
  const fixture = parseLog(readFileSync(new URL("./fixtures/lab-run.json", import.meta.url), "utf8"));
  assert.equal(fixture.mech.prepare, undefined);
  const r = replay(fixture);
  assert.ok(diff(fixture, fixture.verdicts, r.events, r.mech).same);
  assert.equal(r.mech.timing, "absolute");
  assert.equal(r.mech.prepare, false);
  // A log played with WTC 1.51's game (every parameter named, as the lab records them): the same.
  const made = withMech(CLASSIC_VALUES, () => synthPreparer(II18, { seed: 3 }));
  const old = parseLog(logText(made));
  const again = replay(old);
  assert.ok(diff(old, old.verdicts, again.events, again.mech).same, diff(old, old.verdicts, again.events, again.mech).line);
  // The same log with the parameters added since 1.49 dropped (as an older lab wrote them): the same too.
  const trimmed = { ...old, mech: Object.fromEntries(Object.entries(old.mech).filter(([k]) => !["timing", "runs", "prepare", "prepShare", "slurRollMinMs", "doubleSameThumb", "waitTakeMs"].includes(k))) as typeof old.mech };
  const t = replay(trimmed);
  assert.deepEqual(tally(t.events), tally(again.events));
  // A log made today replays as made (it names every parameter).
  const now = parseLog(logText(synthRun(II18, { gap: 0.03, seed: 4 })));
  const n = replay(now);
  assert.ok(diff(now, now.verdicts, n.events, n.mech).same);
  assert.deepEqual(asRecorded(now.mech), { ...now.mech });
});

test("D337: a lab setting kept before 1.52 keeps its meaning (A with its changes); an untouched lab starts on B+", () => {
  // Before 1.52: changes from WTC 1.51's defaults, no `mechBase`.
  const old = storedSetting({ mech: { legatoGapMs: 120 } }, null);
  assert.equal(old.config, "A");
  assert.deepEqual(withMech(old.mech, () => ({ ...MECH })), { ...MECH_CLASSIC, legatoGapMs: 120 });
  const ob = storedSetting({ mech: { timing: "relative", slurNext: false, doubleSameThumb: true, doubleMs: 40, runs: "lenient", prepare: true, slurRollMinMs: 0 } }, "B+");
  assert.equal(ob.config, "B+");
  assert.deepEqual(withMech(ob.mech, () => ({ ...MECH })), MECH_DEFAULTS);
  assert.deepEqual(storedSetting({ mech: {} }, null), { mech: {}, config: "B+" });
  assert.deepEqual(storedSetting(null, null), { mech: {}, config: "B+" });
  // Kept since 1.52: as kept.
  assert.deepEqual(storedSetting({ mech: { legatoGapMs: 120 }, mechBase: "1.52" }, "C"), { mech: { legatoGapMs: 120 }, config: "C" });
});

test("D337: HOW TO PLAY says how notes join (strike on time, or rest and lift: a pull-off) and how runs are judged", () => {
  const ladder = RULES.ladder.join(" ");
  assert.match(ladder, /strike the next on time while the other thumb holds/);
  assert.match(ladder, /pull-off/);
  assert.match(ladder, /Nothing sounds by itself/);
  assert.match(ladder, /fast runs/);
  for (const l of TUTORIAL_LESSONS) for (const line of [...l.intro, ...l.praise, ...l.again]) assert.doesNotMatch(line.text, /wait at the far note|takes over as the other lifts/, l.id);
});
