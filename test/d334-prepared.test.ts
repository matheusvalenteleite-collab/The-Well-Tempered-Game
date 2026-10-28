/**
 * D334 (WTC 1.49), THE LAB's B+ · PREPARED: a thumb resting early on its next note while the other holds
 * is PREPARED (silent); it sounds by the other thumb's lift (PULL-OFF) or, MECH.prepPress, a press; a
 * landing while the other holds is a HAMMER-ON (B's strike). Nothing sounds by itself. The game unchanged.
 * D337 (WTC 1.52): B+ became the game's defaults; WTC 1.51's (no preparing) are A · CLASSIC's (MECH_CLASSIC).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MECH_CLASSIC, MECH_DEFAULTS, MECH_SPEC, type Mech } from "../src/bench/mechanics.ts";
import { CONFIGS, configById, configMech } from "../src/bench/lab/presets.ts";
import { presetRow } from "../src/bench/lab/preset-table.ts";
import { replay } from "../src/bench/lab/replay.ts";
import { describe } from "../src/bench/lab/describe.ts";
import { parseLog, logText, type LabPassage } from "../src/bench/lab/log.ts";
import type { LabEvent } from "../src/bench/lab/events.ts";
import { synthEvents, synthPreparer, synthTapper, type SynthEvent } from "../tools/lab/lab-synth.ts";

const II18: LabPassage = { piece: "wtc2f18", voice: 0, fromBar: 1, toBar: 8, bpm: 83, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const II12: LabPassage = { piece: "wtc2f12", voice: 0, fromBar: 1, toBar: 6, bpm: 79, tempoPct: 100, proto: "ladder", wait: false, bt: false, reading: null };
const BP = () => configMech(configById("B+")!);
const notesOf = (ev: LabEvent[]) => ev.filter((e): e is Extract<LabEvent, { kind: "note" }> => e.kind === "note");

test("D334: WTC 1.51's game (A) without preparing, D337's (B+) with; no press either way; B+ is B with preparing, after B", () => {
  assert.equal(MECH_CLASSIC.prepare, false);
  assert.equal(MECH_DEFAULTS.prepare, true);
  assert.equal(MECH_DEFAULTS.prepPress, false);
  assert.equal(MECH_DEFAULTS.prepShare, 1);
  assert.equal(MECH_DEFAULTS.prepLate, "miss");
  for (const k of ["prepare", "prepShare", "prepLate", "prepPress", "pressMovePx", "pressSettleMs"] as const) assert.ok(MECH_SPEC.some((s) => s.key === k && s.group === "PREPARED"), k);
  const ids = CONFIGS.map((c) => c.id);
  assert.equal(ids.indexOf("B+"), ids.indexOf("B") + 1);
  const bp = configById("B+")!;
  assert.equal(bp.name, "B+ · PREPARED");
  // D378: since WTC 1.83 with Glenn's mechanics (B+ is the game's; the others keep CLASSIC's).
  assert.equal(bp.feel, "The game since WTC 1.52 (since WTC 1.83 with Glenn's mechanics: over-legato, a slide's slur, joins judged by ear). Like B, but every note is sounded by a gesture: landing on it (hammer-on) or, for a thumb resting early on its note, the other thumb lifting (pull-off); nothing sounds by itself.");
  assert.deepEqual({ ...configById("B")!.values, prepare: true, prepShare: 1, slurRollMinMs: 0, glenn: true }, bp.values);
  assert.deepEqual(BP(), MECH_DEFAULTS);
  assert.equal(BP().slurNext, false);
  assert.equal(BP().prepPress, false);
});

test("D334: the preparer (rests on the next-next note as the other strikes): a stray in B, a pull-off in B+", () => {
  const log = parseLog(logText(synthPreparer(II18, { seed: 3 })));
  const b = presetRow(log, configMech(configById("B")!));
  const bp = presetRow(log, BP());
  const n = bp.right + bp.wrong + bp.missed;
  assert.equal(bp.right, n, JSON.stringify(bp));
  assert.equal(bp.stray, 0);
  assert.ok(b.right < n - 5 && b.stray + b.doubles > 0, JSON.stringify(b));
  const ev = replay(log, BP()).events;
  const pulls = notesOf(ev).filter((e) => e.gesture === "pull-off");
  assert.ok(pulls.length >= n / 2, `pull-offs ${pulls.length} of ${n}`);
  assert.ok(pulls.every((e) => e.legato?.ok), "a pull-off joins");
  assert.ok(notesOf(ev).some((e) => e.gesture === "hammer-on"));
  assert.ok(ev.some((e) => e.kind === "prep" && e.what === "rest"));
  const lines = ev.flatMap((e) => describe(II18.piece, e));
  assert.ok(lines.some((l) => l.includes("PREPARED") && l.includes("rests")));
  assert.ok(lines.some((l) => l.includes("PULL-OFF")));
  assert.ok(lines.some((l) => l.includes("HAMMER-ON")));
});

test("D334: a pull-off is timed at the lift (the player's), never at the note's time", () => {
  // The other thumb lifting 80 ms late, on every prepared note: judged 80 ms late.
  const log = synthPreparer(II18, { seed: 3, jitter: 0.001 });
  const late = synthPreparer(II18, { seed: 3, jitter: 0.001, holdOn: 0.08 });
  const off = (l: typeof log) => notesOf(replay(l, BP()).events).filter((e) => e.gesture === "pull-off").map((e) => e.offMs);
  const a = off(log);
  const b = off(late);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  assert.ok(Math.abs(mean(a)) < 10, `on time ${mean(a)}`);
  assert.ok(mean(b) > 60, `late ${mean(b)}`);
});

/** Two notes: the left thumb strikes the first and holds `holdS`; the right lands on the second 5 ms after, resting. */
function restAndHold(holdS: number) {
  return synthEvents(II18, 3, (notes, t, _r, rows): SynthEvent[] => [
    { t: t(notes[0].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[0].step) },
    { t: t(notes[1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[1].step) },
    { t: t(notes[1].on) + 0.005, k: 0, kind: "u", id: 1 },
    { t: t(notes[1].on) + 0.01, k: 1, kind: "d", id: 3, side: "left", x: 40, y: rows.yOf(notes[2].step) },
    { t: t(notes[2].on) + holdS, k: 0, kind: "u", id: 2 },
    { t: t(notes[2].on) + holdS + 0.3, k: 0, kind: "u", id: 3 },
  ]);
}

test("D334: nothing sounds by itself: held past the late window, the prepared note is missed (or, prepLate lift, sounds late at the lift)", () => {
  const ontime = notesOf(replay(restAndHold(0), BP()).events).find((e) => e.i === 2);
  assert.ok(ontime?.ok && ontime.gesture === "pull-off", JSON.stringify(ontime));
  const ev = replay(restAndHold(0.6), BP()).events;
  assert.ok(!notesOf(ev).some((e) => e.i === 2), "never sounded");
  assert.ok(ev.some((e) => e.kind === "miss" && e.i === 2));
  const late = notesOf(replay(restAndHold(0.6), { ...BP(), prepLate: "lift" }).events).find((e) => e.i === 2);
  assert.ok(late && late.gesture === "pull-off" && late.offMs > 500 && !late.perfect, JSON.stringify(late));
  // The resting thumb let go unsounded: said so.
  const gone = synthEvents(II18, 3, (notes, t, _r, rows): SynthEvent[] => [
    { t: t(notes[0].on), k: 1, kind: "d", id: 1, side: "left", x: 40, y: rows.yOf(notes[0].step) },
    { t: t(notes[1].on), k: 1, kind: "d", id: 2, side: "right", x: 804, y: rows.yOf(notes[1].step) },
    { t: t(notes[1].on) + 0.005, k: 0, kind: "u", id: 1 },
    { t: t(notes[1].on) + 0.01, k: 1, kind: "d", id: 3, side: "left", x: 40, y: rows.yOf(notes[2].step) },
    { t: t(notes[1].on) + 0.1, k: 0, kind: "u", id: 3 },
    { t: t(notes[2].on), k: 0, kind: "u", id: 2 },
  ]);
  assert.ok(replay(gone, BP()).events.some((e) => e.kind === "prep" && e.what === "let-go"));
});

test("D334: PRESS (prepPress, off by default): a small move down sounds it, the other still down (over-legato)", () => {
  const log = synthPreparer(II12, { seed: 5, press: true });
  const off = replay(log, BP()).events;
  assert.ok(!notesOf(off).some((e) => e.gesture === "press"));
  const on = replay(log, { ...BP(), prepPress: true }).events;
  const presses = notesOf(on).filter((e) => e.gesture === "press");
  assert.ok(presses.length > 10 && presses.every((e) => e.ok), `${presses.length}`);
  const overlaps = on.filter((e): e is Extract<LabEvent, { kind: "prep" }> => e.kind === "prep" && e.what === "overlap");
  assert.ok(overlaps.length > 10 && overlaps.every((e) => (e.ms ?? 0) >= 0 && (e.ms ?? 0) <= 100), JSON.stringify(overlaps.slice(0, 3)));
  const lines = on.flatMap((e) => describe(II12.piece, e));
  assert.ok(lines.some((l) => /PRESS .* moved \d+ px down\/in: sounded now, the other still down \(over-legato\)/.test(l)));
  assert.ok(lines.some((l) => /OVER-LEGATO \d+ ms/.test(l)));
});

test("D334: a random tapper gets no more through B+ than B (within 1%)", () => {
  let b = 0;
  let bp = 0;
  let of = 0;
  for (const seed of [1, 2, 3, 4]) {
    const log = synthTapper(II18, { seed });
    const rb = presetRow(log, configMech(configById("B")!));
    const rp = presetRow(log, BP() as Mech);
    b += rb.right;
    bp += rp.right;
    of += rb.right + rb.wrong + rb.missed;
  }
  assert.ok(bp <= b + of * 0.01, `B ${b}, B+ ${bp} of ${of}`);
});
