/** D319: a trill lasts its note (the band's, the computer's keys'), and the player's lasts as long as the thumb shakes. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById, PIECES } from "../src/touch/fugue.ts";
import { protoById } from "../src/bench/protos.ts";
import { tempoOf } from "../src/touch/tempi.ts";
import { ProtoGame, type Rows } from "../src/bench/proto-game.ts";
import { ornamentsOf, realiseHeld, realiseNote, shakeOf } from "../src/touch/ornament-play.ts";
import { realise, trillPitches, trillUnit, TRILL_PER_SECOND, TRILL_SETTLE, keySteps } from "../src/music/ornaments.ts";
import { MECH, MECH_DEFAULTS, MECH_SPEC, resetMech, withMech } from "../src/bench/mechanics.ts";
import type { Chip, Play } from "../src/touch/chip.ts";

// ---- The realisation ----

test("D319: the trill's speed is a subdivision of the beat near ten notes a second", () => {
  // II/24 at 77 a quarter: 32nds (10.3 a second); I/6 at 57: sextuplet 16ths (11.4); II/13 at 124: 16ths (8.3).
  assert.equal(trillUnit(60 / 77), 1 / 8);
  assert.equal(trillUnit(60 / 57), 1 / 12);
  assert.equal(trillUnit(60 / 124), 1 / 4);
  for (const bpm of [30, 46, 60, 80, 100, 130]) {
    const perS = 1 / trillUnit(60 / bpm) / (60 / bpm);
    assert.ok(perS >= 7 && perS <= 14, `${bpm}: ${perS.toFixed(1)} a second`);
  }
});

test("D319: a trill fills its note: from above, alternating to the end, a short settle on a long note; C. P. E. Bach's to the end", () => {
  // Six notes' room (a dotted quaver, II/24): U N U N U, then N.
  assert.deepEqual(trillPitches(62, 64, 60, 0.75, 1 / 8, false), [64, 62, 64, 62, 64, 62]);
  // Twelve (a crotchet in sextuplets): the alternation to the eleventh, the main note the last.
  assert.deepEqual(trillPitches(62, 64, 60, 1, 1 / 12, false).length, 12);
  // Twenty-four (a minim at ten a second, I/12): the main note settles for three (12.5%).
  const long = trillPitches(62, 64, 60, 2, 1 / 12, false);
  assert.equal(long.length, 22);
  assert.equal(long.at(-2), 64);
  // The written closing turn: … U N L N.
  assert.deepEqual(trillPitches(62, 64, 60, 1, 1 / 8, true).slice(-4), [64, 62, 60, 62]);
  // Too short for four: U N U N in the note (the short Trillo), as before.
  assert.deepEqual(trillPitches(62, 64, 60, 0.25, 1 / 8, false), [64, 62, 64, 62]);
  const C = keySteps({});
  const r = realise({ midi: 62, at: 0, dur: 2 }, "T", [], { unit: 1 / 8, trillUnit: 1 / 12, ...C });
  const lastU = r.filter((x) => x.midi === 64).at(-1)!;
  assert.ok(lastU.at + lastU.dur >= 2 * (1 - TRILL_SETTLE) - 1 / 12 && lastU.at + lastU.dur < 2, "alternation to about 85%");
  const cpe = realise({ midi: 62, at: 0, dur: 2 }, "T", [], { unit: 1 / 8, trillUnit: 1 / 12, ...C, style: "cpe" });
  assert.ok(cpe.at(-1)!.dur <= 1 / 12 + 1e-9, "C. P. E. Bach: beaten to the end");
});

test("D319: mordents, turns and short trills unchanged", () => {
  const C = keySteps({});
  const ctx = { unit: 0.125, trillUnit: 1 / 12, ...C };
  assert.deepEqual(realise({ midi: 64, at: 0, dur: 1 }, "M", [], ctx).map((x) => [x.midi, x.dur]), [[64, 0.125], [62, 0.125], [64, 0.75]]);
  assert.deepEqual(realise({ midi: 64, at: 0, dur: 1 }, "W", [], { ...ctx, prevMidi: 60 }).map((x) => x.midi), [66, 64, 66, 64]);
  assert.deepEqual(realise({ midi: 64, at: 0, dur: 0.5 }, "S", [], ctx).map((x) => x.midi), [65, 64, 62, 64]);
  assert.deepEqual(shakeOf({ signs: "M", graces: [] }), { kind: "mordent", word: "MORDENT", first: -1, need: 2 });
});

/** A trill's measures at the game's tempo: notes a second, and how far into the note its alternation goes. */
function measure(id: string, parts: [number, number, number][], on: number, dur: number) {
  const f = fugueById(id);
  const msq = 60000 / tempoOf(id);
  const main = parts.at(-1)![2];
  const ups = parts.filter((p) => p[2] > main);
  const lastUp = ups.at(-1)!;
  return { notes: parts.length, reach: (lastUp[0] + lastUp[1] - on) / dur, perS: 1000 / ((parts[1][1] / f.tpq) * msq) };
}

// D353: these hold D319's SETTLE ending (the Explication's); C. P. E. Bach's rule, the game's default since, in d353-ornaments.test.ts.
test("D319: every trill of the fugues lasts its note at the game's tempo (II/24, I/6, I/12, I/14, II/13 …)", () => withMech({ trillEnding: "settle" }, () => {
  // II/24's dotted quavers: six notes, the alternation to 83% (before D319 four, to 62%).
  const f = fugueById("wtc2f24");
  for (const [key, o] of ornamentsOf(f)) {
    const [v, on] = key.split(":").map(Number);
    const n = f.voices[v].find((x) => x[0] === on)!;
    const m = measure(f.id, realiseNote(f, o, on, n[1], n[2], undefined, tempoOf(f.id)), on, n[1]);
    assert.ok(m.notes >= 6 && m.reach >= 0.8, `${key}: ${JSON.stringify(m)}`);
    // The band's, detached (held 0.87): the same notes, the gap from the settling main note.
    const held = realiseHeld(f, o, on, n[1], 0.87, n[2], undefined, tempoOf(f.id));
    assert.equal(held.length, m.notes);
  }
  let n = 0;
  for (const p of PIECES.filter((x) => x.kind === "fugue")) {
    const bpm = tempoOf(p.id);
    for (const [key, o] of ornamentsOf(p)) {
      if (!/[TtO]/.test(o.signs)) continue;
      const [v, on] = key.split(":").map(Number);
      const note = p.voices[v].find((x) => x[0] === on)!;
      const parts = realiseNote(p, o, on, note[1], note[2], undefined, bpm);
      const m = measure(p.id, parts, on, note[1]);
      assert.ok(m.reach >= 0.75, `${p.id} ${key}: the alternation to ${Math.round(m.reach * 100)}%`);
      if (parts.length > 4) assert.ok(m.perS >= 7 && m.perS <= 14, `${p.id} ${key}: ${m.perS.toFixed(1)} a second`);
      n++;
    }
  }
  assert.ok(n > 100, `${n} trills`);
}));

// ---- The player's trill ----

const RH = 18;
const ROWS: Rows = { yOf: (s) => 600 - s * RH, stepAt: (y) => Math.round((600 - y) / RH), rowH: RH, xOf: () => 400 };
const W = 844;
type Heard = { midi: number; at: number };
function fakeChip(clock: { t: number }, heard: Heard[]) {
  return {
    ctx: { get currentTime() { return clock.t; } },
    heard: () => clock.t,
    visual: 0,
    smooth: false,
    note: (midi: number, at: number, _d: number, _v: unknown, p: Play = {}) => {
      if (p.lead) heard.push({ midi, at });
      return { stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {}, shape() {} };
    },
    swoosh() {},
    tick() {},
  } as unknown as Chip;
}

/**
 * Plays track 0 right on LADDER, a fresh thumb each note; on note `target` the thumb shakes (legs of
 * 12 px every 50 ms) for `shakeMs`, then holds still to the note's end; frames every 20 ms throughout.
 * Returns what sounded during that note (the player's), relative to its onset (s), and the game.
 */
function playShaking(id: string, voice: number, target: (g: ProtoGame, i: number) => boolean, shakeMs: number) {
  const clock = { t: 0 };
  const heard: Heard[] = [];
  const realNow = performance.now.bind(performance);
  Object.defineProperty(performance, "now", { value: () => clock.t * 1000, configurable: true, writable: true });
  try {
    const f = fugueById(id);
    const g = new ProtoGame(f, voice, 0, protoById("ladder"), { bpm: tempoOf(id), legato: false, until: f.length, wait: false, solo: true, fail: false }, fakeChip(clock, heard));
    g.rows = ROWS;
    const notes = g.tracks[0].notes;
    let at: { t0: number; t1: number; midi: number } | null = null;
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.ride || (i > 0 && notes[i - 1].on === n.on)) continue;
      const t0 = g.timeAt(n.on);
      if (clock.t > t0) continue;
      while (clock.t < t0 - 0.02) (clock.t += 0.02), g.step();
      clock.t = t0;
      g.step();
      const side = i % 2 ? "right" : "left";
      const c = { side, x: side === "left" ? 60 : W - 60, y: ROWS.yOf(n.step), w: W, h: 390 } as const;
      g.down(i + 1, c, performance.now());
      const end = g.timeAt(n.on + n.dur);
      if (!at && target(g, i)) {
        at = { t0, t1: end, midi: n.midi };
        let y = c.y;
        let k = 0;
        const stopAt = clock.t + shakeMs / 1000;
        while (clock.t < Math.min(stopAt, end - 0.03)) {
          // One leg: up first (a trill), 12 px in two moves, a frame between.
          const up = k++ % 2 === 0 ? 1 : -1;
          for (let h = 0; h < 2; h++) {
            clock.t += 0.025;
            y -= up * 6;
            g.move(i + 1, { ...c, y }, performance.now());
            g.step();
          }
        }
        while (clock.t < end - 0.03) (clock.t += 0.02), g.step();
      }
      clock.t = Math.max(clock.t, end - 0.03);
      g.step();
      g.up(i + 1, performance.now());
    }
    const a = at!;
    const during = heard.filter((x) => x.at >= a.t0 - 0.005 && x.at < a.t1 - 0.005).map((x) => ({ midi: x.midi, at: x.at - a.t0 }));
    return { g, during, len: a.t1 - a.t0, main: a.midi };
  } finally {
    Object.defineProperty(performance, "now", { value: realNow, configurable: true, writable: true });
  }
}

/** The upper notes of the trill heard, and the last one's time (s from the note's onset). */
const uppers = (r: { during: Heard[]; main: number }) => r.during.filter((x) => x.midi > r.main);
/** Where the trill settled (its last note, the main note, after an upper one), as a share of the note. */
const settled = (r: { during: Heard[]; main: number; len: number }) => {
  const d = r.during;
  assert.equal(d.at(-1)!.midi, r.main, "it ends on the main note");
  assert.ok(d.at(-2)!.midi > r.main, "after the upper note");
  return d.at(-1)!.at / r.len;
};

test("D319: the player's written trill lasts as long as the thumb shakes: through the note, the whole note; stopped, it settles", () => {
  resetMech();
  MECH.trillEnding = "settle";
  const f = fugueById("wtc1f06");
  const orn = ornamentsOf(f);
  const voice = [0, 1, 2].find((v) => f.voices[v].some((n) => orn.has(`${v}:${n[0]}`) && n[1] >= f.tpq))!;
  // A trill on a crotchet or longer.
  const target = (g: ProtoGame, i: number) => g.ornamentAt(0, i) === "TR" && g.tracks[0].notes[i].dur >= f.tpq;
  const through = playShaking("wtc1f06", voice, target, 99999);
  const brief = playShaking("wtc1f06", voice, target, 260);
  const tu = uppers(through);
  const bu = uppers(brief);
  // Through: the alternation to past four fifths of the note (it settles only at its end).
  assert.ok(settled(through) >= 0.75, `shaken through: settled at ${settled(through).toFixed(2)} of the note, ${tu.length} uppers`);
  // Brief (five legs in 250 ms): the trill stops about a quarter second after the last leg, on the main note.
  assert.ok(bu.length < tu.length, `brief ${bu.length} uppers, through ${tu.length}`);
  assert.ok(bu.at(-1)!.at <= 0.26 + 0.25 + 0.15, `brief: last upper at ${bu.at(-1)!.at.toFixed(3)} s`);
  assert.equal(brief.during.at(-1)!.midi, brief.main, "settled on the main note");
  // Judged the same: a shake of four moves is the ornament done.
  assert.equal(through.g.shakes.hit, 1);
  assert.equal(brief.g.shakes.hit, 1);
  // The trill at its speed, not the finger's: notes about every 88 ms (sextuplet 16ths at 57), legs every 50 ms.
  const gaps = tu.slice(1).map((x, k) => x.at - tu[k].at);
  assert.ok(gaps.every((d) => Math.abs(d - 2 * (60 / 57 / 12)) < 0.01), `upper to upper ${gaps.map((d) => d.toFixed(3)).join(" ")}`);
  // Option off: the first shake plays the whole trill.
  MECH.trillFollowsShake = false;
  MECH.trillEnding = "settle";
  try {
    const whole = playShaking("wtc1f06", voice, target, 260);
    assert.ok(settled(whole) >= 0.75, "the whole trill though the shaking stopped");
  } finally {
    resetMech();
  }
});

test("D319: a free trill goes on while the thumb shakes and settles when it stops", () => {
  resetMech();
  MECH.trillEnding = "settle";
  // A plain held note of I/2 a crotchet or longer.
  const target = (g: ProtoGame, i: number) => !g.ornamentAt(0, i) && g.tracks[0].notes[i].dur >= g.f.tpq && g.timeAt(g.tracks[0].notes[i].on) > 1;
  const through = playShaking("wtc1f02", 0, target, 99999);
  const brief = playShaking("wtc1f02", 0, target, 160);
  assert.equal(through.g.freeOrns.trills, 1);
  assert.equal(brief.g.freeOrns.trills, 1);
  const tu = uppers(through);
  const bu = uppers(brief);
  assert.ok(settled(through) >= 0.75, `through: settled at ${settled(through).toFixed(2)} of the note`);
  assert.ok(bu.length < tu.length && bu.at(-1)!.at <= 0.16 + 0.25 + 0.15, `brief: ${bu.length} uppers, the last at ${bu.at(-1)?.at.toFixed(3)} s`);
  assert.equal(brief.during.at(-1)!.midi, brief.main);
  resetMech();
});

test("D319: the trill's speed and its following the shake are the lab's parameters", () => {
  assert.equal(MECH_DEFAULTS.trillPerSecond, TRILL_PER_SECOND);
  assert.equal(MECH_DEFAULTS.trillSettle, TRILL_SETTLE);
  assert.equal(MECH_DEFAULTS.trillFollowsShake, true);
  assert.equal(MECH_DEFAULTS.trillStopMs, 250);
  for (const k of ["trillPerSecond", "trillSettle", "trillFollowsShake", "trillStopMs"]) assert.ok(MECH_SPEC.some((s) => s.key === k), k);
  // Faster in the lab: more notes in the same note.
  const f = fugueById("wtc2f24");
  const [key, o] = [...ornamentsOf(f)][0];
  const [v, on] = key.split(":").map(Number);
  const n = f.voices[v].find((x) => x[0] === on)!;
  const at10 = realiseNote(f, o, on, n[1], n[2], undefined, 77).length;
  MECH.trillPerSecond = 16;
  try {
    assert.ok(realiseNote(f, o, on, n[1], n[2], undefined, 77).length > at10);
  } finally {
    resetMech();
  }
});
