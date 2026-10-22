/**
 * D191: notes too quick to strike ride; FINGERING's articulation and thumbs after the music audit;
 * the engine audit's low items.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, FUGUES, fugueById } from "../src/touch/fugue.ts";
import { laneNotes, quickRides, RIDE_MS, type LaneNote } from "../src/touch/lanes.ts";
import { Chip } from "../src/touch/chip.ts";
import { ProtoGame, PERFECT_MS } from "../src/bench/proto-game.ts";
import { keyId, midiId, moves, protoById } from "../src/bench/protos.ts";
import { fingering, type VoiceNotes } from "../src/bench/fingering.ts";
import { phrase } from "../src/touch/phrasing.ts";
import { cancelled } from "../src/touch/thumbs.ts";
import { startTick } from "../src/touch/voice-mode.ts";

const B = 480;
/** Notes from [on, dur, midi, step] at a beat of B ticks. */
const lane = (xs: [number, number, number, number][]) => laneNotes(xs, B, 0);
/** ms between two ticks at a tempo (quarter = B ticks). */
const at = (bpm: number) => (a: number, b: number) => ((b - a) / B) * (60000 / bpm);
const rides = (ns: LaneNote[]) => ns.map((n) => !!n.ride);

function fakeChip(clock: { t: number }, log: { midi: number; at: number }[] = [], grooves: { at: number; beatS: number }[] = []) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    note: (midi: number, t: number) => {
      log.push({ midi, at: t });
      return { stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} };
    },
    swoosh: () => {},
    tick: () => {},
    groove: (t: number, beatS: number) => (grooves.push({ at: t, beatS }), true),
  } as unknown as Chip;
}

test("quick notes ride: under RIDE_MS after the note before, at the tempo played; the first never", () => {
  // A quarter, four 64ths (B/16), a quarter: at 60 the 64ths are 62 ms apart; at 20, 188 ms.
  const xs: [number, number, number, number][] = [[0, B, 60, 35], [B, 30, 62, 36], [B + 30, 30, 64, 37], [B + 60, 30, 65, 38], [B + 90, 30, 64, 37], [B + 120, B, 62, 36]];
  const ns = lane(xs);
  assert.ok(quickRides(ns, B, at(60)) > 0);
  // An ornament: the four 64ths ride after the quarter; the quarter after them is struck.
  assert.deepEqual(rides(ns), [false, true, true, true, true, false]);
  // Plain quick notes (not an ornament: as long as the note before), the first struck, the rest riding.
  const run = lane([[0, 30, 60, 35], [30, 30, 62, 36], [60, 30, 64, 37], [90, B, 65, 38]]);
  quickRides(run, B, at(60));
  assert.deepEqual(rides(run), [false, true, true, false]);
  const slow = lane(xs);
  assert.equal(quickRides(slow, B, at(20)), 0, "slow enough: every note struck");
  assert.ok(RIDE_MS >= 100 && RIDE_MS <= 120);
  // A note under RIDE_MS from the very first: the first is struck, the second rides.
  const two = lane([[0, 20, 60, 35], [20, B, 62, 36]]);
  quickRides(two, B, at(120));
  assert.deepEqual(rides(two), [false, true]);
});

test("of two notes too close the shorter rides: a snap's quick note rides, the long note after it is struck", () => {
  // A quarter, a dotted eighth, a 32nd (B/8), a half: at 120 the 32nd is 62 ms before the half.
  const ns = lane([[0, B, 60, 35], [B, 360, 62, 36], [B + 360, 60, 64, 37], [B + 420, 2 * B, 65, 38]]);
  quickRides(ns, B, at(120));
  assert.deepEqual(rides(ns), [false, false, true, false]);
});

test("ornament-like figures ride (two or more tiny notes after a long one) only when quick; a single 32nd of a dotted figure does not", () => {
  // A dotted eighth then two 32nds (the I/8 alto's figure), then an eighth.
  const fig: [number, number, number, number][] = [[0, 360, 60, 35], [360, 60, 62, 36], [420, 60, 60, 35], [480, 240, 59, 34]];
  // At 76 the 32nds last 99 ms: the figure rides after the dotted note.
  const quick = lane(fig);
  quickRides(quick, B, at(76));
  assert.deepEqual(rides(quick), [false, true, true, false]);
  // At 60 they last 125 ms: under 1.25 × RIDE_MS, still an ornament.
  const mid = lane(fig);
  quickRides(mid, B, at(60));
  assert.deepEqual(rides(mid), [false, true, true, false]);
  // At 40 (188 ms) every note is struck.
  const slow = lane(fig);
  quickRides(slow, B, at(40));
  assert.deepEqual(rides(slow), [false, false, false, false]);
  // One 32nd after a dotted eighth (a dotted rhythm, not an ornament) at 60: struck.
  const dot = lane([[0, 420, 60, 35], [420, 60, 62, 36], [480, 480, 64, 37]]);
  quickRides(dot, B, at(60));
  assert.deepEqual(rides(dot), [false, false, false]);
});

test("the corpus: the riders are the ornaments the playability audit found unplayable, and few", () => {
  let heads = 0;
  let riding = 0;
  for (const f of FUGUES) {
    const beat = beatOf(f).ticks;
    const ms = (a: number, b: number) => ((b - a) / f.tpq) * (60000 / 54);
    for (const [v, raw] of f.voices.entries()) {
      const ns = laneNotes(raw, beat, v);
      quickRides(ns, beat, ms);
      ns.forEach((n, i) => {
        if (i > 0 && ns[i - 1].on === n.on) return;
        heads++;
        if (n.ride) riding++;
      });
    }
  }
  assert.ok(riding > 0 && riding / heads < 0.01, `${riding} of ${heads} ride at ♩54`);
});

/** I/8's alto at ♩76: two 32nds after a dotted eighth ride (99 ms each). */
const E_FLAT = fugueById("wtc1f08");
function aGame(bpm = 76, log: { midi: number; at: number }[] = []) {
  const clock = { t: 0 };
  const g = new ProtoGame(E_FLAT, 1, startTick(E_FLAT, 0), protoById("keys"), { bpm, legato: false }, fakeChip(clock, log));
  return { g, clock };
}
const headsOf = (ns: LaneNote[]) => ns.map((n, i) => (i > 0 && ns[i - 1].on === n.on ? -1 : i)).filter((i) => i >= 0);

function play(g: ProtoGame, clock: { t: number }, strike: (i: number) => boolean, extra: (i: number) => boolean = () => false) {
  for (const i of headsOf(g.notes)) {
    const n = g.notes[i];
    while (clock.t < g.timeAt(n.on) - 0.02) (clock.t += 0.02), g.step();
    clock.t = g.timeAt(n.on);
    g.step();
    if (n.ride ? extra(i) : strike(i)) {
      g.keyDown(100 + i, { velocity: 0.5 }, performance.now());
      g.keyUp(100 + i, performance.now());
    }
  }
  while (clock.t < g.timeAt(g.end) + 0.5) (clock.t += 0.02), g.step();
}

test("riders in the game: played for the player after the note before, drawn as hit, never counted, never a slip", () => {
  const log: { midi: number; at: number }[] = [];
  const { g, clock } = aGame(76, log);
  const riders = g.notes.map((n, i) => (n.ride ? i : -1)).filter((i) => i >= 0);
  assert.ok(riders.length >= 2, "I/8's alto has riders at ♩76");
  assert.equal(aGame(40).g.notes.filter((n) => n.ride).length, 0, "none at ♩40: the threshold follows the tempo");
  // The player strikes every other note, and strikes the riders too (as one might): no stray, no slip.
  play(g, clock, () => true, () => true);
  const r = g.results();
  assert.equal(r.right, r.of, `${r.right}/${r.of}`);
  assert.equal(r.stray, 0);
  assert.equal(r.missed, 0);
  assert.equal(r.of, headsOf(g.notes).filter((i) => !g.notes[i].ride).length, "the riders are not counted");
  assert.equal(g.maxStreak, r.of, "the streak unbroken");
  for (const i of riders) {
    assert.equal(g.notes[i].state, "hit");
    // Sounded at its time.
    assert.ok(log.some((l) => l.midi === g.notes[i].midi && Math.abs(l.at - g.timeAt(g.notes[i].on)) < 0.03));
  }
  assert.ok(g.entries.every((e) => e.state === "captured"), "every entry captured");
});

test("a rider's note missed: the rider stays silent and unjudged; only the note struck counts as missed", () => {
  const { g, clock } = aGame();
  const first = g.notes.findIndex((n) => n.ride);
  let anchor = first - 1;
  while (g.notes[anchor].ride || (anchor > 0 && g.notes[anchor - 1].on === g.notes[anchor].on)) anchor--;
  play(g, clock, (i) => i !== anchor);
  const r = g.results();
  assert.equal(r.missed, 1);
  assert.equal(r.right, r.of - 1);
  assert.notEqual(g.notes[first].state, "miss");
  assert.notEqual(g.notes[first].state, "hit");
});

test("FINGERING thumbs: any joined note quicker than half a beat changes thumb, a broken chord too", () => {
  // G C E G C E in sixteenths (B/4), rising leaps and a falling one.
  const ns = lane([[0, 120, 55, 32], [120, 120, 60, 35], [240, 120, 64, 37], [360, 120, 67, 39], [480, 120, 60, 35], [600, 120, 64, 37]]);
  const f = fingering(ns, moves(ns, B), [], B);
  for (let i = 1; i < f.length; i++) assert.notEqual(f[i].hand, f[i - 1].hand, `note ${i}`);
  // Quarters by leaps: the thumb follows the line (right up, left down).
  const qs = lane([[0, B, 55, 32], [B, B, 60, 35], [2 * B, B, 64, 37], [3 * B, B, 57, 33]]);
  assert.deepEqual(fingering(qs, moves(qs, B), [], B).slice(1).map((x) => x.hand), ["right", "right", "left"]);
});

test("FINGERING legato: stepwise runs of short notes only (not thirds, not eighths in a quarter beat); tenuto over legato", () => {
  const run = (len: number, midis: number[], steps: number[]) => lane(midis.map((m, i) => [i * len, len, m, steps[i]]));
  const arts = (ns: LaneNote[]) => fingering(ns, moves(ns, B), [], B).map((x) => x.art);
  // Sixteenths by step: legato after the first.
  assert.deepEqual(arts(run(120, [60, 62, 64, 65, 67], [35, 36, 37, 38, 39])).slice(1), ["legato", "legato", "legato", "legato"]);
  // Sixteenths by thirds: not legato.
  assert.ok(!arts(run(120, [60, 64, 67, 71, 74], [35, 37, 39, 41, 43])).includes("legato"));
  // Eighths by step (half a beat): a light non-legato.
  assert.ok(!arts(run(240, [60, 62, 64, 65, 67], [35, 36, 37, 38, 39])).includes("legato"));
  // A long note in a stepwise line: tenuto.
  const long = lane([[0, 120, 60, 35], [120, 120, 62, 36], [240, 2 * B, 64, 37]]);
  assert.equal(arts(long)[2], "tenuto");
});

test("FINGERING: a suspension resolving down by step is legato; the dotted note of a dotted figure is not staccato", () => {
  // C5 held a half note against a D4 in the bass that moved under it (a seventh), falling to B4.
  const sus = lane([[0, 2 * B, 72, 42], [2 * B, B, 71, 41]]);
  const bass: VoiceNotes = [[0, B, 48, 28], [B, 2 * B, 50, 29]];
  assert.equal(fingering(sus, moves(sus, B), [], B, [bass])[1].art, "legato");
  // Against a consonance (E4 under C5), free.
  const cons: VoiceNotes = [[0, B, 48, 28], [B, 2 * B, 52, 30]];
  assert.notEqual(fingering(sus, moves(sus, B), [], B, [cons])[1].art, "legato");
  // B3 dotted eighth, B3 sixteenth (I/5's figure): the dotted note held, not staccato.
  const dot = lane([[0, 360, 59, 27], [360, 120, 59, 27], [480, B, 62, 29]]);
  assert.notEqual(fingering(dot, moves(dot, B), [], B)[0].art, "staccato");
  // A short repeated note still is.
  const rep = lane([[0, 240, 59, 27], [240, 240, 59, 27], [480, B, 62, 29]]);
  assert.equal(fingering(rep, moves(rep, B), [], B)[0].art, "staccato");
});

test("FINGERING across the fugues: legato well under half the notes; no thumb strikes twice in a quick joined pair", () => {
  const tally = { legato: 0, all: 0, same: 0 };
  for (const f of FUGUES) {
    const beat = beatOf(f).ticks;
    for (const [v, raw] of f.voices.entries()) {
      const ns = laneNotes(raw, beat, v);
      const mv = moves(ns, beat);
      const fi = fingering(ns, mv, f.entries, beat, f.voices.filter((_, j) => j !== v));
      let prev = -1;
      ns.forEach((n, i) => {
        if (i > 0 && ns[i - 1].on === n.on) return;
        tally.all++;
        if (fi[i].art === "legato") tally.legato++;
        if (prev >= 0 && mv[i].joined && n.on - ns[prev].on < beat / 2 && fi[i].hand === fi[prev].hand) tally.same++;
        prev = i;
      });
    }
  }
  assert.ok(tally.legato / tally.all < 0.4, `legato ${tally.legato} of ${tally.all}`);
  assert.equal(tally.same, 0);
});

test("engine audit: the ritard in the PERFECT check and the drums' beat", () => {
  const C = fugueById("wtc1f02");
  const clock = { t: 0 };
  const grooves: { at: number; beatS: number }[] = [];
  const from = C.length - 3 * C.barTicks;
  const g = new ProtoGame(C, 1, from, protoById("keys"), { bpm: 54, legato: false }, fakeChip(clock, [], grooves));
  const last = headsOf(g.notes).filter((i) => !g.notes[i].ride).at(-1)!;
  const n = g.notes[last];
  // 65 ms late at the steady tempo: within PERFECT by the old reckoning, but heard later in the ritard.
  const d = (0.065 * g.tps);
  while (clock.t < g.timeAt(n.on + d) - 0.02) (clock.t += 0.02), g.step();
  clock.t = g.timeAt(n.on + d);
  g.step();
  g.keyDown(1, { velocity: 0.5 }, performance.now());
  assert.ok((g.timeAt(n.on + d) - g.timeAt(n.on)) * 1000 > PERFECT_MS);
  assert.equal(g.grade?.text, "GOOD");
  // The drums' beat lengthens through the ritard.
  const steady = (C.tpq * 1) / g.tps;
  const beats = grooves.map((x) => x.beatS);
  assert.ok(beats.length > 2 && Math.max(...beats) > steady * 1.1, `beats ${beats.map((b) => b.toFixed(3))}`);
});

test("engine audit: several notes missed in one frame each cost a step; a tap at the window's very end still counts", () => {
  {
    const { g, clock } = aGame(54);
    const hs = headsOf(g.notes).filter((i) => !g.notes[i].ride);
    clock.t = g.timeAt(g.notes[hs[0]].on) - 0.5;
    g.step();
    g.mult = 4;
    // Three notes go by in one frame.
    clock.t = g.timeAt(g.notes[hs[2]].on) + 0.4;
    g.step();
    assert.equal(g.notes.filter((n) => n.state === "miss").length >= 3, true);
    assert.equal(g.mult, 1);
  }
  {
    const { g, clock } = aGame(54);
    const n = g.notes[headsOf(g.notes)[0]];
    // The frame comes 10 ms after the window closed; the tap was 15 ms before the frame.
    clock.t = g.timeAt(n.on + g.opt.late) + 0.01;
    g.step();
    g.keyDown(1, { velocity: 0.5 }, performance.now() - 15);
    assert.equal(n.state, "hit");
  }
});

test("engine audit: input ids apart; a cancelled touch is no tap; the silent <audio> played again after an interruption", () => {
  const ids = new Set<number>();
  for (let n = 0; n < 128; n++) ids.add(midiId(n));
  for (let k = 0; k < 256; k++) ids.add(keyId(k));
  assert.equal(ids.size, 128 + 256);
  assert.ok([...ids].every((x) => x < 0), "touches have ids 0 and up");
  assert.equal(cancelled("pointercancel"), true);
  assert.equal(cancelled("pointerup"), false);
  let played = 0;
  const fake = { keepAlive: { paused: true, play: () => (played++, Promise.resolve()) }, ctx: { state: "running" } };
  void Chip.prototype.resume.call(fake as unknown as Chip);
  assert.equal(played, 1);
  fake.keepAlive.paused = false;
  void Chip.prototype.resume.call(fake as unknown as Chip);
  assert.equal(played, 1);
});

test("engine audit: phrasing takes the next onset as the note after (a chord's partner is not), in linear time", () => {
  const notes = [
    { on: 0, dur: B, midi: 60, step: 35, voice: 0 },
    { on: 0, dur: B, midi: 67, step: 39, voice: 0 },
    { on: B, dur: B, midi: 62, step: 36, voice: 0 },
  ];
  const sh = phrase(notes, B, (t) => t % (4 * B), new Set());
  // C to D (a step) after a quarter: held 0.95, not shortened as before a leap to its partner G.
  assert.equal(sh[0].hold, 0.95);
  // G to D, a fourth down: shortened.
  assert.equal(sh[1].hold, 0.88);
  const many = Array.from({ length: 40000 }, (_, i) => ({ on: i * 120, dur: 120, midi: 60 + (i % 5), step: 35 + (i % 5), voice: i % 4 }));
  const t0 = performance.now();
  phrase(many, B, (t) => t % (4 * B), new Set());
  assert.ok(performance.now() - t0 < 1500);
});
