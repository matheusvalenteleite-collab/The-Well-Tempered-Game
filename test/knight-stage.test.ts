// PROTOTYPE (THE LAB): I/16's stage, THE KNIGHT (src/bench/lab/knight-stage.ts): its events come from the data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fugueById } from "../src/touch/fugue.ts";
import { knightStage, stageEvents } from "../src/bench/lab/knight-stage.ts";

const f = fugueById("wtc1f16");
const bar = (t: number) => Math.round((t / f.barTicks + 1) * 100) / 100;

test("each voice is set on the board at its first entry: alto, soprano, bass (heavily), tenor (softly)", () => {
  const places = stageEvents(f).filter((e) => e.kind === "place");
  assert.deepEqual(places.map((e) => [e.voice, bar(e.on), e.style]), [[1, 1.13, "plain"], [0, 2.63, "plain"], [3, 5.13, "heavy"], [2, 6.63, "soft"]]);
});

test("the two strettos (17, 28) make two knights leap at once; nowhere else", () => {
  const leaps = stageEvents(f).filter((e) => e.kind === "leap");
  assert.deepEqual([...new Set(leaps.map((e) => Math.floor(bar(e.on))))], [17, 28]);
  assert.equal(leaps.length, 4);
});

test("only the tenor steps off the board (its ten bars, 18⅝ to 28⅝) and comes back", () => {
  const off = stageEvents(f).filter((e) => e.kind === "exit" || e.kind === "return");
  assert.deepEqual(off.map((e) => [e.kind, e.voice, Math.floor(bar(e.on))]), [["exit", 2, 18], ["return", 2, 28]]);
});

test("the quiet section's entries are half-moves; every knight stays on its own board, one per square", () => {
  const ev = stageEvents(f);
  for (const e of ev.filter((x) => x.kind === "move")) assert.equal(!!e.half, bar(e.on) >= 20 && bar(e.on) < 28, `bar ${bar(e.on)}`);
  for (const e of ev) if (e.to) assert.ok(e.to[0] >= 0 && e.to[0] < 4 && e.to[1] >= 0 && e.to[1] < 6);
});

test("the stage exists for I/16 only; the opponent's hand comes on every third run, at the bar 24 cadence", () => {
  assert.equal(knightStage(fugueById("wtc1f01"), 3), null);
  assert.equal(knightStage(f, 1)!.visitor, null);
  assert.equal(bar(knightStage(f, 3)!.visitor!), 24.5);
});
