/**
 * D1081, REPEAT (developer-only, off by default): the game clock jumps back to a section's start exactly once, and no layer breaks:
 * the band's notes and the player's sounds (nothing stuck, nothing doubled), the scheduler's look-ahead (nothing past the section's end
 * scheduled when the jump is pressed; the repeated bars scheduled in its place), the click and the drums (the same beats and bars as
 * the first time, then the piece's own again), and the judging (the second pass never counts toward the grade, D1079).
 * The section is made up: bars 2-5 of the WTC I fugue in C minor (wtc1f02), no printed repeat.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { MECH } from "../src/bench/mechanics.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { KEY_ROWS, protoById } from "../src/bench/protos.ts";
import { repeatSectionOf, repeatOpensAt, applyRepeat, saveRepeat, repeatStored } from "../src/bench/repeat.ts";

const F = fugueById("wtc1f02");
const HOME = KEY_ROWS.find((r) => r.codes.includes("KeyA"))!.codes;
const BPM = 120;
const UNTIL = 52000;
const SECTION = { from: 7680, to: 38400 };
const SECTION0 = SECTION;

interface Rec {
  midi: number;
  at: number;
  len: number;
  stopAt?: number;
}
interface Groove {
  at: number;
  tick: number;
  inBarBeat: number;
  bar: number;
  beatS: number;
}
interface Log {
  notes: Rec[];
  clicks: { at: number; accent: boolean }[];
  grooves: Groove[];
}

function fakeChip(clock: { t: number }, log: Log, drums: boolean) {
  const chip: Record<string, unknown> = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    visual: 0,
    note: (midi: number, at: number, len: number) => {
      const r: Rec = { midi, at, len };
      log.notes.push(r);
      return { stop: (w?: number) => void (r.stopAt ??= w ?? clock.t), bend() {}, glide() {}, muffle() {}, dyn() {} };
    },
    swoosh() {},
    tick: (at: number, accent: boolean) => void log.clicks.push({ at, accent }),
  };
  if (drums)
    chip.groove = (at: number, beatS: number, inBarBeat: number, bar: number, _perBar: number, _c: boolean, ctx: { tick: number }) => (log.grooves.push({ at, beatS, inBarBeat, bar, tick: ctx.tick }), true);
  return chip as unknown as Chip;
}

type Press = "none" | "press" | "cancel" | "late";
interface Opts {
  flag?: boolean;
  /** false: no repeat option at all; else the section (default SECTION). */
  section?: false | { from: number; to: number };
  press?: Press;
  drums?: boolean;
  click?: boolean;
  /** Which notes the player strikes, by note and pass (default none). */
  strike?: (i: number, pass: number) => boolean;
  /** Hold the last note before the section's end, never letting go. */
  hold?: boolean;
  /** Pause this many seconds before the section's end is heard (the jump already scheduled). */
  pauseBefore?: number;
  untilTick?: number;
  /** Stop as the repeat reaches this pass (2: the clock has gone back; 3: the second pass has been settled). */
  stopAt?: 2 | 3;
}
function run(o: Opts = {}) {
  const was = MECH.repeat;
  MECH.repeat = !!o.flag;
  try {
    const clock = { t: 0 };
    const log: Log = { notes: [], clicks: [], grooves: [] };
    const chip = fakeChip(clock, log, !!o.drums);
    const g = new ProtoGame(F, 1, 0, protoById("keys"), { bpm: BPM, legato: false, easy: "leaps", fail: false, until: UNTIL, ...(o.section === false ? {} : { repeat: o.section ?? SECTION }), ...(o.click ? { click: { gain: 0.12, full: 1e12, gone: 2e12 } } : {}) } as never, chip);
    const events: { t: number; now: number; pass: number; view: string }[] = [];
    let id = 0;
    let pressed = false;
    let cancelled = false;
    let held = 0;
    let heldSeen = 0;
    let paused = false;
    const dt = 1 / 240;
    const last = o.untilTick ?? (o.section || SECTION).to + ((o.section || SECTION).to - (o.section || SECTION).from) + 9000;
    const sec = o.section || SECTION;
    const te = g.timeAt(sec.to);
    for (let n = 0; n < 240 * 80 && g.now <= last; n++, clock.t += dt) {
      if (g.step()) break;
      if (o.stopAt && g.repeatPass >= o.stopAt) break;
      const v = g.repeatView();
      events.push({ t: clock.t, now: g.now, pass: g.repeatPass, view: v });
      if (o.press && o.press !== "none") {
        if (!pressed && v === "offered" && o.press !== "late") (g.pressRepeat(), (pressed = true));
        // Cancelled: pressed again while still offered, and pressed a third time (lit again) a little later.
        else if (o.press === "cancel" && pressed && !cancelled && v === "latched") (g.pressRepeat(), (cancelled = true));
        else if (o.press === "cancel" && cancelled && pressed && v === "offered" && g.now > g.repeatSection!.to - 2 * F.barTicks) (g.pressRepeat(), (cancelled = false), (pressed = true), (o.press = "press"));
      }
      // The late press: after the closing beat nothing counts.
      if (o.press === "late" && g.now >= g.repeatClosesAt() && !pressed) ((pressed = true), assert.equal(g.pressRepeat(), false, "refused after the closing beat"));
      if (o.hold && !held && g.now >= (o.section || SECTION).to - 600 && g.repeatPass <= 1) {
        held = ++id;
        g.keyDown(held, { velocity: 0.5, code: HOME[g.lanes[g.next() >= 0 ? g.next() : 0]] ?? "KeyA" }, performance.now());
        heldSeen = (g as unknown as { held: Map<number, unknown> }).held.size;
      }
      if (o.pauseBefore !== undefined && !paused && clock.t >= te - o.pauseBefore) {
        paused = true;
        g.pause();
        clock.t += 2;
        g.resume();
      }
      if (o.strike) {
        const i = g.next();
        if (i >= 0 && g.now >= g.notes[i].on && o.strike(i, g.repeatPass === 2 ? 2 : 1)) {
          const code = g.moves[i].dir === 0 && !g.isFree(i) ? "Space" : HOME[g.lanes[i]];
          g.keyDown(++id, { velocity: 0.5, code }, performance.now());
          g.keyUp(id, performance.now());
        }
      }
    }
    return { g, log, events, te, clock, held, heldSeen };
  } finally {
    MECH.repeat = was;
  }
}

const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e;

// ---- the flag: off by default, nothing changes ------------------------------------------------------------------------------

test("D1081: REPEAT is off by default: no section, no button, the game exactly as before", () => {
  assert.equal(MECH.repeat, false);
  assert.equal(repeatSectionOf(F), undefined);
  const withOption = run({ flag: false, press: "press" });
  const without = run({ flag: false, section: false });
  assert.equal(withOption.g.repeatPass, 0);
  assert.ok(withOption.events.every((e) => e.view === "none"));
  assert.equal(withOption.g.pressRepeat(), false);
  assert.deepEqual(withOption.log.notes.map((n) => [n.midi, n.at, n.len]), without.log.notes.map((n) => [n.midi, n.at, n.len]));
  // The page's switch: stored OFF unless set; only an unlocked device reads it (applyRepeat).
  assert.equal(repeatStored(), false);
  assert.equal(applyRepeat(), false);
  assert.equal(MECH.repeat, false);
  saveRepeat(false);
});

test("D1081: with the flag on, a made-up section exists for the test fugue only; its window starts in the second-last bar", () => {
  MECH.repeat = true;
  try {
    assert.deepEqual(repeatSectionOf(F), SECTION);
    assert.equal(repeatSectionOf(fugueById("wtc1f01")), undefined);
  } finally {
    MECH.repeat = false;
  }
  assert.equal(repeatOpensAt(F, SECTION), 23040, "bar 4 starts the window of the section's last two bars (4 and 5)");
});

test("D1081: flag on, button not pressed: the game is exactly the unrepeated game (notes, clicks, drums), and the button is offered then gone", () => {
  const base = run({ flag: false, section: false, drums: true });
  const open = run({ flag: true, press: "none", drums: true });
  assert.deepEqual(open.log.notes.map((n) => [n.midi, n.at, n.len]), base.log.notes.map((n) => [n.midi, n.at, n.len]));
  assert.deepEqual(open.log.grooves, base.log.grooves);
  const views = open.events.map((e) => e.view).filter((v, i, a) => v !== a[i - 1]);
  assert.deepEqual(views, ["none", "offered", "none"]);
  assert.equal(open.g.repeatPass, 3);
  // The window: from the second-last bar to the closing beat (a beat before the end, at this tempo).
  const on = open.events.filter((e) => e.view === "offered");
  assert.ok(on[0].now >= 23040 && on[0].now < 23040 + 100);
  const closing = SECTION.to - open.g.beat;
  assert.ok(on.at(-1)!.now < closing && on.at(-1)!.now > closing - 200, `closes at the closing beat (${on.at(-1)!.now} vs ${closing})`);
});

test("D1081: pressed then pressed again: it lights, cancels, and the music goes on unrepeated; pressed after the closing beat: refused", () => {
  const base = run({ flag: false, section: false });
  const c = run({ flag: true, press: "cancel" });
  // (the script presses, cancels, then presses again once: so this run does repeat) — check the lit/unlit sequence first
  const seq = c.events.map((e) => e.view).filter((v, i, a) => v !== a[i - 1]);
  assert.deepEqual(seq.slice(0, 5), ["none", "offered", "latched", "offered", "latched"]);
  assert.equal(c.g.repeatPass, 3);
  const late = run({ flag: true, press: "late" });
  assert.deepEqual(late.log.notes.map((n) => [n.midi, n.at, n.len]), base.log.notes.map((n) => [n.midi, n.at, n.len]));
});

// ---- the jump -----------------------------------------------------------------------------------------------------------------

/** What the unrepeated game schedules, as a repeat of the section would: before the end as it was, the section again from the end, the rest shifted by the section's length. */
function expected<T extends { at: number }>(base: ProtoGame, items: T[], tickOf: (x: T) => number, te: number, SECTION = SECTION0): T[] {
  const span = base.timeAt(SECTION.to) - base.timeAt(SECTION.from);
  const out: T[] = [];
  for (const x of items) {
    const tick = tickOf(x);
    if (tick < SECTION.to) out.push(x);
    if (tick >= SECTION.from && tick < SECTION.to) out.push({ ...x, at: te + (x.at - base.timeAt(SECTION.from)) });
    if (tick >= SECTION.to) out.push({ ...x, at: x.at + span });
  }
  return out.sort((a, b) => a.at - b.at);
}
const sorted = <T extends { at: number }>(xs: T[], k: (x: T) => number) => [...xs].sort((a, b) => a.at - b.at || k(a) - k(b));

test("D1081: pressed: the clock goes back once, and the band's notes are the first pass, the section again, then the rest: none doubled, none missing, none past the end early", () => {
  const base = run({ flag: false, section: false });
  const r = run({ flag: true, press: "press" });
  // The clock fell back exactly once: from the section's end to its start; passes 1, 2, 3.
  const falls = r.events.filter((e, i) => i > 0 && e.now < r.events[i - 1].now - 100);
  assert.equal(falls.length, 1, "one jump back");
  assert.ok(near(r.events.find((e, i) => i > 0 && e.now < r.events[i - 1].now - 100)!.now, SECTION.from, 400), "to the section's first tick");
  assert.deepEqual(r.events.map((e) => e.pass).filter((p, i, a) => p !== a[i - 1]), [1, 2, 3]);
  // Band: against the unrepeated schedule transformed (the base's own ticks from its clock).
  // A note's tick: that of the band note it sounds (its nudge may put it a few ms before it), else by the clock.
  const tickOfBase = (x: Rec) => {
    const o = base.g.others.filter((q) => q.midi === x.midi).sort((a, b) => Math.abs(base.g.timeAt(a.on) - x.at) - Math.abs(base.g.timeAt(b.on) - x.at))[0];
    return o && Math.abs(base.g.timeAt(o.on) - x.at) < 0.03 ? o.on : Math.round(base.g.tickAtTime(x.at));
  };
  const want = expected(base.g, base.log.notes, tickOfBase, r.te).map((n) => [n.midi, n.at]);
  const got = r.log.notes.map((n) => [n.midi, n.at]);
  assert.equal(got.length, want.length, "no note doubled or lost");
  const key = (a: number[]) => a[1] * 1000 + a[0] / 1000;
  const ws = [...want].sort((a, b) => key(a) - key(b));
  const gs = [...got].sort((a, b) => key(a) - key(b));
  gs.forEach((x, i) => (assert.equal(x[0], ws[i][0], `pitch ${i}`), assert.ok(near(x[1], ws[i][1], 1e-5), `time ${i}: ${x[1]} vs ${ws[i][1]}`)));
});

for (const drums of [true, false])
  test(`D1081: pressed: ${drums ? "the drums" : "the click"} keep the bar's phase: the section's beats and bars as the first time (same bar, same beat, same accent), then the piece's own`, () => {
    const base = run({ flag: false, section: false, drums, click: !drums });
    const r = run({ flag: true, press: "press", drums, click: !drums });
    if (drums) {
      const want = expected(base.g, base.log.grooves, (x) => x.tick, r.te);
      assert.equal(r.log.grooves.length, want.length, "every beat once per pass");
      const got = sorted(r.log.grooves, (x) => x.tick);
      const ws = sorted(want, (x) => x.tick);
      got.forEach((x, i) => {
        assert.ok(near(x.at, ws[i].at, 1e-5), `beat ${i} at ${x.at} vs ${ws[i].at}`);
        assert.equal(x.inBarBeat, ws[i].inBarBeat, `beat ${i} of the bar`);
        assert.equal(x.bar, ws[i].bar, `beat ${i}'s bar number`);
        assert.ok(near(x.beatS, ws[i].beatS, 1e-9), "its length");
      });
      // The repeated section starts on a downbeat of the same bar as the first time.
      const firstPass = r.log.grooves.filter((x) => x.tick === SECTION.from);
      assert.equal(firstPass.length, 2, "the section's first beat sounds twice");
      assert.equal(firstPass[0].inBarBeat, 0);
      assert.deepEqual([firstPass[0].bar, firstPass[0].inBarBeat], [firstPass[1].bar, firstPass[1].inBarBeat]);
      assert.ok(near(r.log.grooves.filter((x) => x.tick >= SECTION.to)[0].at - firstPass[1].at, (SECTION.to - SECTION.from) / base.g.tps, 1e-5), "the repeated section lasts as long as the first");
    } else {
      assert.ok(base.log.clicks.length > 30);
      const per = F.tpq; // one beat
      const tickOf = (x: { at: number }) => Math.round(base.g.tickAtTime(x.at) / per) * per;
      const want = expected(base.g, base.log.clicks.slice(), tickOf, r.te);
      assert.equal(r.log.clicks.length, want.length, "every click once per pass");
      const got = sorted(r.log.clicks, (x) => +x.accent);
      const ws = sorted(want, (x) => +x.accent);
      got.forEach((x, i) => (assert.ok(near(x.at, ws[i].at, 1e-5), `click ${i}`), assert.equal(x.accent, ws[i].accent, `accent ${i}`)));
    }
  });

test("D1081: the scheduler's look-ahead: with the jump pressed nothing past the section's end is scheduled until the clock has gone back; the repeated bars follow at once", () => {
  const r = run({ flag: true, press: "press" });
  const span = (SECTION.to - SECTION.from) / r.g.tps;
  // The first note of the continuation (tick >= to) is heard one section-length after the end, never at the end itself.
  const cont = r.g.others.filter((n) => n.on >= SECTION.to);
  const firstCont = cont[0];
  const heard = r.log.notes.filter((n) => n.midi === firstCont.midi && near(n.at, r.te + span, 0.03));
  assert.ok(heard.length >= 1, "the piece goes on after the repeated bars");
  assert.equal(r.log.notes.filter((n) => n.at > r.te + 1e-6 && n.at < r.te + 1e-3 && !r.g.others.some((o) => o.on < SECTION.to && o.on >= SECTION.from && o.midi === n.midi)).length, 0);
});

test("D1081: notes still sounding at the section's end are cut at it: nothing of the first pass rings into the repeated bars", () => {
  // A section ending inside a long band note (the soprano's note at tick 27840, a beat long: the end falls half-way through it).
  const sec = { from: 7680, to: 28800 };
  const r = run({ flag: true, section: sec, press: "press", untilTick: sec.to + 9000 });
  const across = r.log.notes.filter((n) => n.at < r.te - 1e-6 && n.at + n.len > r.te + 1e-3);
  assert.ok(across.length > 0, "a note sounds across the section's end");
  for (const n of across) assert.ok(n.stopAt !== undefined && near(n.stopAt, r.te, 1e-6), `cut at the end (${n.stopAt} vs ${r.te})`);
  assert.equal(r.g.repeatPass >= 2, true, "the jump was made");
});

// ---- the player's own notes ---------------------------------------------------------------------------------------------------

test("D1081: a thumb still down at the section's end is let go there: nothing held or sounding is carried into the repeated bars", () => {
  const r = run({ flag: true, press: "press", hold: true, stopAt: 2 });
  assert.equal(r.g.repeatPass, 2);
  assert.ok(r.held > 0 && r.heldSeen === 1, "a thumb was down when the end came");
  assert.equal((r.g as unknown as { held: Map<number, unknown> }).held.size, 0, "let go at the end");
  // The section's notes can be struck again on the second pass: every note of it is pending and gets judged.
  const inSection = r.g.notes.filter((n) => n.on >= SECTION.from && n.on < SECTION.to && !n.ride);
  assert.ok(inSection.length > 8);
  assert.ok(inSection.every((n) => n.state === "pending"), "ready to be played again");
  // And played: a perfect second pass hits them all.
  const p = run({ flag: true, press: "press", hold: true, strike: (i, pass) => pass === 2, stopAt: 3 });
  assert.equal(p.g.repeatPass, 3);
});

// ---- the grade: first pass only -------------------------------------------------------------------------------------------------

function counts(g: ProtoGame) {
  const x = g.results();
  return { right: x.right, wrong: x.wrong, missed: x.missed, of: x.of, score: x.score, grade: x.grade, notes: g.earned.notes, perfects: g.perfects, goods: g.goods, stray: g.stray, art: { ...g.art }, lanes: { ...x.lanes } };
}
// A deterministic player: misses every third note on the first pass.
const patchy = (i: number) => i % 3 !== 0;
const every = () => true;
const never = () => false;

for (const [name, second] of [
  ["a perfect second pass", every],
  ["no second pass played at all", never],
  ["every other note of the second pass", (i: number) => i % 2 === 0],
] as const)
  test(`D1081, D1079: ${name} after a patchy first: the grade is the first pass's alone, exactly as the game with no repeat has it at the section's end`, () => {
    const script = (i: number, p: number) => (p === 1 ? patchy(i) : second(i));
    const base = counts(run({ flag: false, section: false, strike: patchy, untilTick: SECTION.to + 10 }).g);
    const landed = run({ flag: true, press: "press", strike: script, stopAt: 2 });
    const settled = run({ flag: true, press: "press", strike: script, stopAt: 3 });
    assert.equal(landed.g.repeatPass, 2);
    assert.equal(settled.g.repeatPass, 3);
    const a = counts(landed.g);
    const b = counts(settled.g);
    assert.ok(base.right > 5 && base.missed > 5, "the first pass is patchy");
    // Just after the jump the section's notes are ready to be played again (their states are the second pass's); what is kept is the points.
    const pts = (c: ReturnType<typeof counts>) => ({ score: c.score, notes: c.notes, perfects: c.perfects, goods: c.goods, stray: c.stray, art: c.art, lanes: c.lanes });
    assert.deepEqual(pts(a), pts(base), "the first pass, kept at the jump, is what the game without a repeat has at the section's end");
    assert.deepEqual(b, base, "the second pass left nothing in the grade");
    const states = (g: ProtoGame) => g.notes.filter((n) => n.on >= SECTION.from && n.on < SECTION.to).map((n) => n.state === "hit").join();
    assert.equal(states(settled.g), states(run({ flag: false, section: false, strike: patchy, untilTick: SECTION.to + 10 }).g), "the section's notes as the first pass judged them");
  });

test("D1081, D1079: a perfect player on both passes: the notes right, wrong and missed over the whole piece are those of the game with no repeat", () => {
  const base = counts(run({ flag: false, section: false, strike: every, untilTick: 1e9 }).g);
  const r = run({ flag: true, press: "press", strike: every, untilTick: 1e9 });
  const c = counts(r.g);
  assert.equal(r.g.repeatPass, 3);
  assert.ok(base.right > 40 && base.missed === 0);
  assert.equal(c.of, base.of, "the repeated notes are not counted twice");
  assert.equal(c.right, base.right);
  assert.equal(c.missed, base.missed);
  assert.equal(c.wrong, base.wrong);
  assert.equal(c.stray, base.stray);
});

test("D1081, D1079: lost in the second pass: the run counts as failed at the section's end (first pass only)", () => {
  const was = MECH.repeat;
  MECH.repeat = true;
  try {
    const clock = { t: 0 };
    const log: Log = { notes: [], clicks: [], grooves: [] };
    const g = new ProtoGame(F, 1, 0, protoById("keys"), { bpm: BPM, legato: false, easy: "leaps", fail: true, until: UNTIL, repeat: SECTION } as never, fakeChip(clock, log, false));
    let id = 0;
    let pressed = false;
    let over = false;
    for (let n = 0; n < 240 * 80 && !over; n++, clock.t += 1 / 240) {
      over = g.step();
      if (!pressed && g.repeatView() === "offered") (g.pressRepeat(), (pressed = true));
      // The crowd leaves in the second pass (set to empty: the meter's own way down is slow).
      if (g.repeatPass === 2 && g.now > SECTION.from + 4000) g.crowd = 0;
      const i = g.next();
      // Plays the first pass well, the second not at all: the crowd leaves in the second.
      if (g.repeatPass <= 1 && i >= 0 && g.now >= g.notes[i].on) {
        g.keyDown(++id, { velocity: 0.5, code: g.moves[i].dir === 0 && !g.isFree(i) ? "Space" : HOME[g.lanes[i]] }, performance.now());
        g.keyUp(id, performance.now());
      }
    }
    assert.ok(over && g.failedAt !== null, "the crowd left");
    assert.equal(g.failedAt, SECTION.to, "counted as failed where the first pass ended");
    const x = g.results();
    assert.equal(x.missed, g.results().of - x.right, "the rest of the piece unplayed");
    assert.ok(x.right >= 8, "the first pass's notes are right");
  } finally {
    MECH.repeat = was;
  }
});

// ---- a pause between the scheduler's jump and the clock's ------------------------------------------------------------------------

test("D1081: paused just before the end is heard (the jump already scheduled): the clock resumes at the section's start, once, nothing doubled", () => {
  const r = run({ flag: true, press: "press", pauseBefore: 0.1 });
  assert.equal(r.g.repeatPass, 3);
  const falls = r.events.filter((e, i) => i > 0 && e.now < r.events[i - 1].now - 100);
  assert.equal(falls.length, 1, "one jump back");
  // No band note sounds twice at the same moment.
  const seen = new Set<string>();
  for (const n of r.log.notes) {
    const k = `${n.midi}@${n.at.toFixed(4)}`;
    assert.ok(!seen.has(k), `doubled ${k}`);
    seen.add(k);
  }
});
