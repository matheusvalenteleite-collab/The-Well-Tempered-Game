/**
 * D384 (Luigi 2, the mechanics report's §7): the broadening grace (D325b) only toward a close: the piece's
 * end, or a perfect or imperfect cadence (a fermata) in the run's last bar, in a run of three bars or
 * more. A lesson's or practice's short excerpt that merely stops judges its timing plainly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";
import { BROADEN_MIN_BARS, broadenClose, graceMs } from "../src/bench/intention.ts";

const BAR = 1000;
const base = { length: 40 * BAR, barTicks: BAR };

test("D384: broadenClose: the piece's end, a closing cadence or fermata; never a bare excerpt's end; never a short run", () => {
  assert.equal(BROADEN_MIN_BARS, 3);
  // The whole piece, or its last three bars: toward the end.
  assert.equal(broadenClose({ ...base, from: 0, until: 40 * BAR }), 40 * BAR);
  assert.equal(broadenClose({ ...base, from: 37 * BAR, until: 40 * BAR }), 40 * BAR);
  // The piece's last two bars alone: too short (the grace would cover it all).
  assert.equal(broadenClose({ ...base, from: 38 * BAR, until: 40 * BAR }), null);
  // An excerpt in the middle that merely stops: no close.
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR }), null);
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 12 * BAR }), null);
  // Ending on a perfect or imperfect cadence: toward its arrival; a half or deceptive cadence is no close.
  const cad = (kind: string, on: number) => [{ kind, on }];
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR, cadences: cad("perfect", 15 * BAR) }), 15 * BAR);
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR, cadences: cad("imperfect", 16 * BAR) }), 16 * BAR);
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR, cadences: cad("half", 15.5 * BAR) }), null);
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR, cadences: cad("deceptive", 15.5 * BAR) }), null);
  // A cadence earlier in the excerpt does not close it.
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR, cadences: cad("perfect", 13 * BAR) }), null);
  // A fermata in the last bar (a chorale's line) closes it; a short run still never broadens.
  assert.equal(broadenClose({ ...base, from: 10 * BAR, until: 16 * BAR, fermatas: [15.5 * BAR] }), 15.5 * BAR);
  assert.equal(broadenClose({ ...base, from: 14 * BAR, until: 16 * BAR, cadences: cad("perfect", 15 * BAR) }), null);
  // No close: the grace gives nothing however near the excerpt's end.
  assert.deepEqual(graceMs({ beatMs: 800, strong: false, dissonant: false, breath: false, toEndBars: Infinity }), { ms: 0, why: null });
});

function silentChip(): Chip {
  return {
    ctx: { currentTime: 0 },
    heard: () => 0,
    note: () => ({ stop: () => {}, bend: () => {}, glide: () => {}, muffle: () => {}, dyn: () => {} }),
    swoosh: () => {},
    tick: () => {},
    groove: () => true,
  } as unknown as Chip;
}

/** How many struck notes of I/2's alto, bar `a` to the end of bar `b` (absent: the piece's end), the broadening graces. */
function broadened(a: number, b?: number): number {
  const f = fugueById("wtc1f02");
  const g = new ProtoGame(f, 1, (a - 1) * f.barTicks, protoById("ladder"), { bpm: 70, legato: false, ...(b !== undefined ? { until: b * f.barTicks } : {}) }, silentChip());
  const grace = g as unknown as { graceFor(k: number, i: number): { why: string | null } };
  let n = 0;
  g.notes.forEach((x, i) => {
    if (!x.ride && grace.graceFor(0, i).why === "broaden") n++;
  });
  return n;
}

test("D384: in the game, a lesson's or practice's excerpt broadens only where the music closes", () => {
  // I/2: perfect cadences arrive at bars 17 and 29; the piece ends with bar 31.
  assert.equal(broadened(5, 6), 0, "two bars in the middle: none (it was the notes of both bars)");
  assert.equal(broadened(5, 8), 0, "four bars that merely stop: none");
  assert.equal(broadened(30), 0, "the last two bars alone: too short");
  assert.ok(broadened(29) > 0, "the last three bars, the piece's end (THE MANUAL's IV.5): broadened");
  assert.ok(broadened(14, 17) > 0, "bars 14-17, closing on bar 17's perfect cadence: broadened toward it");
  assert.ok(broadened(1) > 0, "the whole piece: its close broadened");
});
