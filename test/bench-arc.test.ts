// D250: Prelude 1's arc: more of the figure section by section, the tempo rising, the pedal held, the final chord.
import { test } from "node:test";
import assert from "node:assert/strict";
import { barStart, fugueById } from "../src/touch/fugue.ts";
import type { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { arcOf } from "../src/bench/arc.ts";

const P1 = fugueById("wtc1p01");
function game(mode: "highway" | "keys", voice = 0) {
  const clock = { t: 0 };
  const played: { midi: number; at: number }[] = [];
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, at: number) => (played.push({ midi, at }), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }),
    swoosh() {}, tick() {}, groove: () => false, chime() {},
  } as unknown as Chip;
  const g = new ProtoGame(P1, voice, 0, protoById(mode), { bpm: 55, legato: false, easy: "leaps" }, chip);
  return { g, clock, played };
}

test("D261: Prelude 1: the right thumb taps the top of each figure (beats 2 and 4), the left holds the bass (beats 1 and 3); the rest is heard, not played", () => {
  const { g } = game("highway");
  const [rh, lh] = g.tracks;
  const half = P1.barTicks / 2;
  assert.ok(rh.notes.every((n) => !n.ride) && lh.notes.every((n) => !n.ride), "no riding notes (no dots)");
  for (const n of rh.notes.filter((n) => n.on < barStart(P1, 33))) {
    assert.equal((n.on - barStart(P1, Math.floor(n.on / P1.barTicks) + 1)) % half, P1.tpq, "beat 2 or 4");
    const same = P1.voices[0].filter(([on]) => Math.floor(on / half) === Math.floor(n.on / half));
    assert.equal(n.midi, Math.max(...same.map((x) => x[2])), "the half bar's top note");
    assert.ok(!g.tailed(n), "a sixteenth: a tap, no tail");
  }
  assert.equal(rh.notes.filter((n) => n.on >= barStart(P1, 5) && n.on < barStart(P1, 6)).length, 2);
  for (const n of lh.notes) {
    assert.equal(n.on % half, 0, "beat 1 or 3");
    assert.ok(g.tailed(n), "the bass held: a tail");
  }
  assert.equal(lh.notes.filter((n) => n.on >= barStart(P1, 7) && n.on < barStart(P1, 8)).length, 2);
  assert.ok(g.others.some((o) => o.voice === 0 && o.on === barStart(P1, 5) + P1.tpq / 2), "the figure's other notes are the others'");
  assert.ok(g.others.some((o) => o.voice === 1 && o.on === barStart(P1, 5) + P1.tpq / 4), "the tenor too");
  assert.equal(arcOf(P1)!.rows, undefined, "no rows");
});

test("D260: a stable tempo: no arc changes it (bar 2 lasts as long as bar 26, in Prelude 1 and Prelude 4)", () => {
  for (const id of ["wtc1p01", "wtc1p04"]) {
    const f = fugueById(id);
    assert.equal(arcOf(f)!.tempo, undefined);
    const { g } = id === "wtc1p01" ? game("highway") : game4();
    const t = (b: number) => (g as unknown as { timeAt: (x: number) => number }).timeAt(barStart(f, b));
    assert.ok(Math.abs((t(3) - t(2)) / (t(27) - t(26)) - 1) < 1e-6, id);
  }
});

test("D252: both hands: the left thumb's lanes and pedals, the right thumb's figure in its own lanes", () => {
  for (const mode of ["highway", "keys"] as const) {
    const { g } = game(mode);
    assert.ok(g.hands && g.tracks.length === 2 && g.tracks[1].voice === 1);
    const left = g.laneRegion(1);
    const right = g.laneRegion(0);
    assert.deepEqual(g.pedals.map((p) => p.name), ["G", "C"]);
    for (const p of g.pedals) assert.ok(p.lane >= left.from && p.lane < left.from + left.count, `${mode}: pedal ${p.name} in the left hand's lanes`);
    g.lanesOf(0).forEach((l, i) => assert.ok(g.notes[i].ride || (l >= right.from && l < right.from + right.count), `${mode}: right hand note ${i} in lane ${l}`));
    g.lanesOf(1).forEach((l, i) => assert.ok(g.tracks[1].notes[i].ride || (l >= left.from && l < left.from + left.count), `${mode}: left hand note ${i} in lane ${l}`));
    for (const n of g.tracks[1].notes) for (const p of g.pedals) assert.ok(n.on < p.on || n.on >= p.end, "under a pedal the left hand plays itself");
    assert.ok(!g.tracks[1].notes.some((n) => n.on < barStart(P1, 5)), "the left hand joins at b. 5");
  }
  assert.equal(game("highway", 1).g.bassPedal, null, "the left hand's game: no pedal challenge");
});

test("D261: a held thumb still on the bass when it comes again has played it (tied), no miss", () => {
  const { g, clock } = game("highway");
  const lh = g.tracks[1].notes;
  const W = 390;
  const i = lh.findIndex((n) => n.on >= barStart(P1, 7));
  while (clock.t < g.timeAt(lh[i].on)) (clock.t += 0.01), g.step();
  g.down(5, { side: "left", x: ((g.lanesOf(1)[i] + 0.5) / 5) * W, y: 700, w: W, h: 844 }, performance.now());
  g.step();
  while (clock.t < g.timeAt(lh[i + 1].on + P1.tpq)) (clock.t += 0.01), g.step();
  assert.equal(lh[i].midi, lh[i + 1].midi);
  assert.equal(lh[i + 1].state, "hit");
  assert.equal(g.results().missed, g.results().missed - 0);
  assert.ok(!lh.slice(i, i + 2).some((n) => n.state === "miss"));
});

test("D250: held, the pedal sounds and scores; let go, the bass falls silent", () => {
  for (const hold of [true, false]) {
    const { g, clock, played } = game("keys");
    const p = g.bassPedal!;
    let n = 0;
    while (g.now < p.on - g.beat / 4 && n++ < 100000) (clock.t += 0.02), g.step();
    if (hold) g.keyDown(77, { code: "KeyS", side: "left" } as never, clock.t);
    const before = g.score;
    while (g.now < p.end + g.beat && n++ < 200000) (clock.t += 0.02), g.step();
    const tm = (x: number) => (g as unknown as { timeAt: (t: number) => number }).timeAt(x);
    const bass = played.filter((x) => x.midi === p.midi && x.at >= tm(p.on) - 0.01 && x.at < tm(p.end)).length;
    if (hold) {
      assert.ok(p.share > 0.9, `share ${p.share}`);
      assert.ok(g.score > before, "the pedal's bonus");
      assert.ok(bass >= 14, `the bass G sounds (${bass})`);
    } else {
      assert.equal(p.share, 0);
      assert.equal(bass, 0, "the bass silent");
    }
  }
});

test("D254: under the pedal the right thumb a little over the line still plays the right hand (no stray ✕)", () => {
  const { g, clock } = game("highway");
  const W = 390, H = 844;
  const runTo = (t: number) => { while (clock.t < t - 0.02) (clock.t += 0.02), g.step(); };
  const p = g.pedals[0];
  runTo(g.timeAt(p.on) - 0.2);
  g.down(1, { side: "left", x: 1.5 * W / 5, y: H - 160, w: W, h: H }, performance.now());
  assert.equal(g.pedals[0].id, 1, "the pedal taken");
  const t = g.tracks[0];
  const heads = t.notes.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && t.notes[i - 1].on === n.on) && n.on >= p.on && n.on < p.on + 2 * P1.barTicks);
  const stray0 = g.stray;
  let id = 10, over = 0;
  for (const { n, i } of heads) {
    runTo(g.timeAt(n.on));
    const lane = g.lanesOf(0)[i];
    // lane 2's notes struck just left of the line, in the left hand's lane 1.
    const x = lane === 2 ? (2 * W) / 5 - 6 : ((lane + 0.5) / 5) * W;
    if (lane === 2) over++;
    g.down(++id, { side: "right", x, y: g.rowOf(i, 0) ? H - 60 : H - 160, w: W, h: H }, performance.now());
    g.step();
    assert.notEqual(g.grade?.text, "✕", `bar note at ${n.on}`);
    g.up(id, performance.now());
  }
  assert.ok(over > 0);
  assert.equal(g.stray, stray0);
  assert.equal(g.pedals[0].id, 1, "the pedal still held");
});

test("D257: the phone's two rows of pads meet where touches are split between them", async () => {
  const { PAD_SPLIT, PHONE_LINE } = await import("../src/bench/proto-game.ts");
  // paint-proto.ts padRows (TIER): the strike line, less the upper row (8 px above it, 84 px tall) and half the 8 px gap.
  assert.equal(PHONE_LINE + 8 - 84 - 4, PAD_SPLIT);
});

const P4 = fugueById("wtc1p04");
function game4() {
  const clock = { t: 0 };
  const chip = {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: () => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} }),
    swoosh() {}, tick() {}, groove: () => false, chime() {},
  } as unknown as Chip;
  return { g: new ProtoGame(P4, 0, 0, protoById("highway"), { bpm: 88, legato: false, easy: "leaps" }, chip), clock };
}

test("D258: Prelude 4's chords under the line spread (SWEEP), from bar 1; their inner notes no longer the others'", () => {
  const { g } = game4();
  const sw = g.tracks[0].sweeps!;
  assert.ok(sw.has(barStart(P4, 1) + 3 * P4.tpq), "bar 1, beat 4: C♯5 over G♯4 and E4");
  assert.ok(sw.size >= 10);
  for (const on of sw) {
    const chord = g.tracks[0].notes.filter((n) => n.on === on);
    assert.ok(chord.length >= 2 && chord[0].voice === 0 && chord.slice(1).every((n) => n.voice === 1 && n.midi < chord[0].midi));
    for (const n of chord.slice(1)) assert.ok(!g.others.some((o) => o.voice === 1 && o.on === on && o.midi === n.midi), "not doubled");
  }
});

test("D258: a sweep slid across the lanes sounds the chord upward and scores SWEEP; a tap spreads it by itself", () => {
  for (const slide of [true, false]) {
    const { g, clock } = game4();
    const played: number[] = [];
    (g as unknown as { chip: { note: (m: number) => unknown } }).chip.note = (m: number) => (played.push(m), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} });
    const on = barStart(P4, 1) + 3 * P4.tpq;
    const i = g.tracks[0].notes.findIndex((n) => n.on === on);
    while (clock.t < g.timeAt(on)) (clock.t += 0.01), g.step();
    played.length = 0;
    const W = 390, x = ((g.lanesOf(0)[i] + 0.5) / 5) * W;
    g.down(7, { side: "right", x, y: 700, w: W, h: 844 }, performance.now());
    if (slide) for (let s = 1; s <= 3; s++) g.move(7, { side: "right", x: x + (s * 0.45 * W) / 5 * (x > W / 2 ? -1 : 1), y: 700, w: W, h: 844 }, performance.now());
    else for (let s = 0; s < 30; s++) (clock.t += 0.01), g.step();
    const chord = g.tracks[0].notes.filter((n) => n.on === on).map((n) => n.midi).sort((a, b) => a - b);
    assert.deepEqual(played.filter((m) => chord.includes(m)).slice(0, chord.length), chord, "lowest first, upward");
    assert.equal(g.flash?.text === "SWEEP", slide);
  }
});

test("D258: at the climax (bb. 29–31) the right hand plays the bass's line, laid from the top lane to the bottom", () => {
  const { g } = game4();
  const take = g.take!;
  assert.equal(take.on, barStart(P4, 29));
  const t = g.tracks[0];
  const span = t.notes.map((n, i) => ({ n, i })).filter(({ n }) => n.on >= take.on && n.on < take.end && !n.ride);
  assert.ok(span.length > 6 && span.every(({ n }) => n.voice === 3));
  const lanes = span.map(({ i }) => g.lanesOf(0)[i]);
  assert.equal(lanes[0], 4);
  assert.equal(Math.min(...lanes), 0);
  assert.ok(!g.others.some((o) => o.voice === 3 && o.on >= take.on && o.on < take.end), "the bass not doubled");
  assert.ok(g.others.some((o) => o.voice === 0 && o.on >= take.on && o.on < take.end), "the melody plays itself meanwhile");
});

const W1 = 390, H1 = 844;
const touch = (g: ProtoGame, id: number, lane: number, row: 0 | 1, side: "left" | "right" = "right") => g.down(id, { side, x: ((lane + 0.5) / 5) * W1, y: row ? H1 - 60 : H1 - 180, w: W1, h: H1 }, performance.now());

test("D262: the echo (the top note again in its bar) asks for the lower row; played there it sounds on the quieter keyboard and scores ECHO", () => {
  const { g, clock, played } = game("highway");
  const notes = g.tracks[0].notes;
  const echoes = notes.map((_, i) => i).filter((i) => g.rowOf(i, 0) === 1);
  assert.ok(echoes.length >= 30);
  for (const i of echoes) assert.equal(notes[i].midi, notes[i - 1].midi);
  const i = echoes[0];
  const levels: number[] = [];
  (g as unknown as { chip: { note: (m: number, at: number, d: number, v: unknown, p: { level?: number }) => unknown } }).chip.note = (_m, _a, _d, _v, p) => (levels.push(p?.level ?? 1), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} });
  while (clock.t < g.timeAt(notes[i - 1].on)) (clock.t += 0.01), g.step();
  levels.length = 0;
  touch(g, 1, g.lanesOf(0)[i - 1], 0);
  const call = levels[0];
  g.up(1, performance.now());
  while (clock.t < g.timeAt(notes[i].on)) (clock.t += 0.01), g.step();
  levels.length = 0;
  const before = g.score;
  touch(g, 2, g.lanesOf(0)[i], 1);
  assert.ok(levels[0] < call * 0.7, `the echo softer: ${levels[0]} < ${call}`);
  assert.equal(g.flash?.text, "ECHO");
  assert.ok(g.score > before);
  void played;
});

test("D262: the pedal's charge rises while it is held and stands still while let go; the C pressed is the arrival (HOME)", () => {
  const { g, clock } = game("highway");
  const [G, C] = g.pedals;
  const run = (tick: number) => { while (g.now < tick) (clock.t += 0.01), g.step(); };
  run(G.on - g.beat / 2);
  touch(g, 1, 0, 0, "left");
  run(G.on + 2 * P1.barTicks);
  const c1 = g.charge;
  assert.ok(Math.abs(c1 - 0.25) < 0.03, String(c1));
  g.up(1, performance.now());
  run(G.on + 4 * P1.barTicks);
  assert.ok(Math.abs(g.charge - c1) < 0.01, "let go: it stands still");
  touch(g, 2, 0, 0, "left");
  run(G.end - g.beat / 4);
  assert.ok(g.charge > 0.7 && g.charge < 0.8, String(g.charge));
  g.up(2, performance.now());
  run(C.on + g.beat / 8);
  assert.equal(g.arrivedAt, null, "not carried on: the C must be pressed");
  touch(g, 3, 0, 0, "left");
  assert.ok(g.arrivedAt !== null);
  assert.ok(g.pops.some((p) => p.text.startsWith("HOME")));
  assert.equal(g.pedals[1].id, 3);
});

test("D262: the free line (bb. 33–34): each half bar's first note struck, its other notes sounded by the slide (LINE), or by themselves on time", () => {
  for (const slide of [true, false]) {
    const { g, clock } = game("highway");
    const tr = g.tracks[0].traces!;
    assert.equal(tr.size, 4);
    const [on, q] = [...tr.entries()][0];
    const i = g.tracks[0].notes.findIndex((n) => n.on === on);
    const heard: number[] = [];
    (g as unknown as { chip: { note: (m: number) => unknown } }).chip.note = (m: number) => (heard.push(m), { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} });
    while (g.now < on) (clock.t += 0.005), g.step();
    touch(g, 1, g.lanesOf(0)[i], 0);
    let x = ((g.lanesOf(0)[i] + 0.5) / 5) * W1;
    for (const n of q) {
      while (g.now < n.on - P1.tpq / 16) (clock.t += 0.005), g.step();
      if (slide) (x += ((x > W1 / 2 ? -1 : 1) * 0.5 * W1) / 5), g.move(1, { side: "right", x, y: H1 - 180, w: W1, h: H1 }, performance.now());
    }
    while (g.now < q[q.length - 1].on + P1.tpq / 4) (clock.t += 0.005), g.step();
    for (const n of q) assert.ok(heard.includes(n.midi), `${slide}: ${n.midi} heard`);
    assert.equal(g.flash?.text === "LINE", slide);
  }
});
