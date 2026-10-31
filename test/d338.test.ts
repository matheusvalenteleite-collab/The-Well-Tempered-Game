/** D338 (WTC 1.52): written ornaments unscored; the reading's accent judged by time; the Lab's rush readout; the count-in by time. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beatOf, countInBeats, countInStart, fugueById, FUGUES, type TouchFugue } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { markLegend, type Reading } from "../src/touch/readings.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { accentHeld, accentSeparated, accentTimely, accentVerdict } from "../src/bench/accent.ts";
import { MECH, MECH_DEFAULTS, withMech } from "../src/bench/mechanics.ts";
import { rushLine, rushWord, timingThirds } from "../src/bench/lab/rush.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// ---- 1. Written ornaments unscored ----

test("D338: HOW TO PLAY no longer promises points for a written ornament (en, pt, es)", () => {
  const lite = src("src/bench/lite.ts");
  assert.ok(!/TRILL ✓ and points/.test(lite));
  assert.match(lite, /TRILL ✓; done or not, it never scores or costs/);
  assert.ok(!/TRINADO ✓ e pontos/.test(src("src/i18n/pt.ts")));
  assert.ok(!/TRINO ✓ y puntos/.test(src("src/i18n/es.ts")));
  // The engine: a written ornament shaken earns nothing (test/d314-ornaments.test.ts plays it).
  assert.ok(!/this\.shakes\.hit\+\+;\s*this\.earn\(/.test(src("src/bench/proto-game.ts")));
});

// ---- 2. The accent by time ----

test("D338: the accent's verdict: on time or leaned up to 15% of a beat, the note before let go, held; never loudness (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  assert.equal(MECH_DEFAULTS.accentLateBeats, 0.15);
  const beat = 600;
  // On time, a little early within PERFECT, a lean of 80 ms (13% of the beat): all met.
  assert.equal(accentTimely(0, 70, beat), null);
  assert.equal(accentTimely(-60, 70, beat), null);
  assert.equal(accentTimely(80, 70, beat), null);
  assert.equal(accentTimely(90, 70, beat), null, "15% of 600 ms");
  assert.equal(accentTimely(-90, 70, beat), "early");
  assert.equal(accentTimely(120, 70, beat), "late");
  // A quick beat: the PERFECT window where it is wider than the lean.
  assert.equal(accentTimely(60, 70, 300), null);
  // The note before: let go (a gap of at least accentGapMs), nothing to separate from, still down.
  assert.equal(accentSeparated(40), null);
  assert.equal(accentSeparated(null), null);
  assert.equal(accentSeparated("held"), "joined");
  assert.equal(accentSeparated(5), "joined");
  assert.equal(accentSeparated(-30), "joined");
  // Held: at least 85% of its length; riders or a reading's dot: not asked.
  assert.equal(accentHeld(500, 500), null);
  assert.equal(accentHeld(300, 500), "short");
  assert.equal(accentHeld(300, 500, { short: true }), null);
  assert.equal(accentHeld(100, 500, { riders: true }), null);
  assert.deepEqual(accentVerdict({ offMs: 40, onTimeMs: 70, beatMs: 600, gapMs: 50, heldMs: 480, lenMs: 500 }), { met: true, why: null });
  assert.deepEqual(accentVerdict({ offMs: 40, onTimeMs: 70, beatMs: 600, gapMs: "held", heldMs: 480, lenMs: 500 }), { met: false, why: "joined" });
  // MECH-adjustable.
  withMech({ accentLateBeats: 0.3 }, () => assert.equal(accentTimely(150, 70, 600), null));
  assert.equal(MECH.accentLateBeats, 0.15);
  // The legend says what is asked, by time.
  const l = markLegend("outer").find((x) => x.kind === "strong")!;
  assert.match(l.text, /ACCENT: LIFT THE NOTE BEFORE A LITTLE EARLY, LEAN IN A HAIR LATE/);
  assert.equal(markLegend("inner").find((x) => x.kind === "strong")!.text, l.text);
  }));

function fakeChip(clock: { t: number }) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
  } as unknown as Chip;
}

const firstEntry = (id: string) => [...fugueById(id).entries].filter((e) => !e.theme).sort((a, b) => a.on - b.on || a.voice - b.voice)[0];

/** I/2's first entry played with every note accented: struck `lean` beats late, held `hold` of the note, joined over the next or let go before it, at `x` across. */
function playAccents(o: { lean?: number; hold?: number; overlap?: boolean; x?: number; level?: string; accent?: boolean }) {
  const f = fugueById("wtc1f02");
  const e = firstEntry("wtc1f02");
  const reading = { id: "t", notes: e.notes.map(() => ({ join: null, short: null, accent: o.accent ?? true })), level: o.level ?? null, plan: [], tempo: 60 } as unknown as Reading;
  const W = 800;
  const H = 400;
  const ROWS: Rows = { yOf: (s) => 900 - s * 16, stepAt: (y) => Math.round((900 - y) / 16), rowH: 16, xOf: () => W / 2 };
  const clock = { t: 0 };
  const g = new ProtoGame(f, e.voice, 0, protoById("ladder"), { bpm: 60, legato: false, until: e.end, solo: true, easy: "direction", fail: false, reading }, fakeChip(clock));
  // D361: the touches stamped on the fake audio clock, so they are judged by it alone, never by how long the machine took.
  g.wall = () => clock.t * 1000;
  g.rows = ROWS;
  const to = (t: number) => {
    while (clock.t < t - 0.02) (clock.t += 0.02), g.step();
    clock.t = Math.max(clock.t, t);
    g.step();
  };
  let id = 0;
  let held = 0;
  let side: "left" | "right" = "left";
  const lean = o.lean ?? 0;
  for (const n of g.notes) {
    to(g.timeAt(n.on + lean * g.beat));
    side = side === "left" ? "right" : "left";
    const nid = ++id;
    const x = o.x ?? 40;
    g.down(nid, { side, x: side === "left" ? x : W - x, y: ROWS.yOf(n.step), w: W, h: H }, g.wall());
    if (held && o.overlap) g.up(held, g.wall() + 1);
    held = nid;
    if (!o.overlap) (to(g.timeAt(n.on + n.dur * (o.hold ?? 0.92))), g.up(nid, g.wall()), (held = 0));
  }
  if (held) g.up(held, g.wall());
  to(g.timeAt(g.end + 1));
  return g;
}

test("D338: in play, ACCENT ✓ for notes on time (or leaned), the one before let go, held; not when joined, rushed past, or cut short (D378: CLASSIC)", () =>
  withMech({ glenn: false }, () => {
  const good = playAccents({});
  assert.ok(good.style.of > 5, `${good.style.of} judged`);
  assert.ok(good.style.hit / good.style.of > 0.9, `on time, apart, held: ${good.style.hit}/${good.style.of}`);
  const leaned = playAccents({ lean: 0.1 });
  assert.ok(leaned.style.hit / leaned.style.of > 0.9, `leaned 10% of a beat: ${leaned.style.hit}/${leaned.style.of}`);
  const late = playAccents({ lean: 0.2 });
  for (const g of [late, playAccents({ overlap: true }), playAccents({ hold: 0.5 })]) assert.ok(g.style.of > 5, "judged, the notes right");
  assert.ok(late.style.hit / Math.max(1, late.style.of) < 0.2, `20% late: ${late.style.hit}/${late.style.of}`);
  const joined = playAccents({ overlap: true });
  assert.ok(joined.style.hit / Math.max(1, joined.style.of) < 0.2, `joined: ${joined.style.hit}/${joined.style.of}`);
  const cut = playAccents({ hold: 0.5 });
  assert.ok(cut.style.hit / Math.max(1, cut.style.of) < 0.2, `cut short: ${cut.style.hit}/${cut.style.of}`);
  }));

test("D338: loudness never counts: the same touches by the box or by the edge judge the same, and a reading's level asks nothing", () => {
  const edge = playAccents({ x: 5 });
  const box = playAccents({ x: 395 });
  assert.equal(edge.style.hit, box.style.hit);
  assert.equal(edge.style.of, box.style.of);
  // A level (ff) with no marks: nothing judged.
  const lv = playAccents({ accent: false, level: "ff", x: 395 });
  assert.equal(lv.style.of, 0);
});

// ---- 5. The Lab's rush readout ----

const note = (tick: number, offMs: number, ok = true): LabEvent => ({ kind: "note", tick, track: 0, i: tick, midi: 60, side: "left", ok, offMs, perfect: true, slide: false }) as LabEvent;

test("D338: the rush readout: thirds of the right notes by time, rushing or dragging past 25 ms", () => {
  const rushing = [...[10, 20, 15], ...[30, 40, 44], ...[70, 72, 74]].map((m, j) => note(j * 100, -m));
  // Out of order in the log: sorted by time.
  const t = timingThirds([...rushing].reverse());
  assert.deepEqual(t!.map(Math.round), [-15, -38, -72]);
  assert.equal(rushWord(t!), "rushing");
  assert.equal(rushLine(rushing), "early 15 → 38 → 72 ms (rushing)");
  assert.equal(rushLine(rushing, true), "early 15→38→72 rushing");
  const dragging = [5, 5, 5, 20, 20, 20, 40, 40, 40].map((m, j) => note(j, m));
  assert.equal(rushLine(dragging), "late 5 → 20 → 40 ms (dragging)");
  const steady = [-10, -12, -11, -14, -9, -20, -15, -16, -18].map((m, j) => note(j, m));
  assert.equal(rushWord(timingThirds(steady)!), "");
  assert.equal(rushLine(steady), "early 11 → 14 → 16 ms");
  const mixed = [-30, -30, -30, 0, 0, 0, 20, 20, 20].map((m, j) => note(j, m));
  assert.equal(rushLine(mixed), "thirds −30 → 0 → +20 ms (dragging)");
  // Wrong notes left out; under three right notes nothing.
  assert.equal(rushLine([note(0, -10), note(1, -20), note(2, 500, false)]), "");
  // Shown in the Lab's run line and the RUNS list (timingLine).
  assert.match(src("src/bench/lab/LabApp.tsx"), /const rush = rushLine\(verdicts, short\)/);
});

// ---- 6. The count-in by time ----

const fake = (meter: string): TouchFugue => ({ ...fugueById("wtc1f02"), meter }) as TouchFugue;
const tpsAt = (f: TouchFugue, bpm: number) => (f.tpq * bpm) / 60;

test("D338: the count-in: the fewest beats of the metre (at least two) lasting 2.5 s, at most a bar and 4 s", () => {
  const f44 = fake("4/4");
  const secs = (f: TouchFugue, bpm: number) => (countInBeats(f, tpsAt(f, bpm)) * beatOf(f).ticks) / tpsAt(f, bpm);
  // 4/4: crotchet 60 → 3 beats (3 s); 80 → 4 (3 s); 40 → 2 (3 s); 30 → 2 (4 s); 120 → a bar is 2 s: one bar (4 beats, as before).
  assert.equal(countInBeats(f44, tpsAt(f44, 60)), 3);
  assert.equal(countInBeats(f44, tpsAt(f44, 80)), 4);
  assert.equal(countInBeats(f44, tpsAt(f44, 40)), 2);
  assert.equal(countInBeats(f44, tpsAt(f44, 30)), 2);
  assert.equal(countInBeats(f44, tpsAt(f44, 20)), 2, "two beats however slow");
  assert.equal(countInBeats(f44, tpsAt(f44, 120)), 4);
  // 2/2: minims (the bpm counts crotchets): at crotchet 80 a minim is 1.5 s → 2 minims.
  const f22 = fake("2/2");
  assert.equal(beatOf(f22).perBar, 2);
  assert.equal(countInBeats(f22, tpsAt(f22, 80)), 2);
  // 12/8: dotted crotchets; at crotchet 60 one is 1.5 s → 2.
  const f128 = fake("12/8");
  assert.equal(countInBeats(f128, tpsAt(f128, 60)), 2);
  // 3/4 at 120 (a bar 1.5 s): two bars, as before; at 60: one bar (3 s).
  const f34 = fake("3/4");
  assert.equal(countInBeats(f34, tpsAt(f34, 120)), 6);
  assert.equal(countInBeats(f34, tpsAt(f34, 60)), 3);
  // Never longer than before, never over 4 s unless two beats are; never under two beats.
  for (const meter of ["4/4", "2/2", "3/4", "3/8", "6/8", "9/8", "12/8", "2/4", "12/16", "24/16"])
    for (const bpm of [20, 30, 40, 50, 60, 72, 90, 110, 140, 180, 220]) {
      const f = fake(meter);
      const { ticks, perBar } = beatOf(f);
      const n = countInBeats(f, tpsAt(f, bpm));
      const s = secs(f, bpm);
      assert.ok(n >= 2, `${meter} ${bpm}: ${n}`);
      assert.ok(n <= perBar * Math.ceil(4 / perBar), `${meter} ${bpm}: no longer than before`);
      assert.ok(s <= 4 + 1e-6 || n === 2, `${meter} ${bpm}: ${s.toFixed(2)} s`);
      assert.ok(ticks > 0);
    }
});

test("D338: the game counts in by time, on the beat grid; an upbeat still falls between the beats as written", () => {
  const f = fugueById("wtc1f02");
  const clock = { t: 0 };
  const g = new ProtoGame(f, 0, 0, protoById("keys"), { bpm: 60, legato: false, easy: "timing" }, fakeChip(clock));
  const from = g.entry;
  assert.equal(countInStart(f, from, g.tps), g.start);
  assert.ok((g.timeAt(from) - g.timeAt(g.start)) <= 4 + 1e-6, "at most 4 s before the first note");
  // A piece starting off the beat (an upbeat): the count-in starts on the grid of bar 1, its beats whole.
  const up = FUGUES.find((x) => {
    const first = x.bars[0]?.on ?? 0;
    const on = Math.min(...x.voices.flatMap((v) => v.map((n) => n[0])));
    return (on - first) % beatOf(x).ticks !== 0;
  });
  assert.ok(up, "a piece with an upbeat off the beat");
  const u = up!;
  const on = Math.min(...u.voices.flatMap((v) => v.map((n) => n[0])));
  const tps = tpsAt(u, 60);
  const s = countInStart(u, on, tps);
  const { ticks } = beatOf(u);
  const first = u.bars[0]?.on ?? 0;
  assert.equal(((s - first) % ticks + ticks) % ticks, 0, "on the beat grid");
  assert.ok(s < on && on - s < (countInBeats(u, tps) + 1) * ticks);
  // Without a tempo (touch.html's own game): whole bars as before.
  const { perBar } = beatOf(u);
  assert.equal(countInStart(u, first, undefined), first - perBar * Math.ceil(4 / perBar) * ticks);
});
