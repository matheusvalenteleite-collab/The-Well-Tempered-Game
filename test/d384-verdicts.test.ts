/**
 * D384 (Mario 1, the mechanics report's §5.3): a reading's verdict is never hidden. Its word (DETACHED ✓,
 * ACCENT ✓, STACCATO ✓) has a slot of its own (ProtoGame.readingWord), drawn after the articulation's word
 * (HELD, LEGATO, CLEAN …) and a line above it; in the box the strikes' points and bursts are drawn before
 * the reading's marks, so they never cover them. Nothing louder or brighter by right or wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fugueById } from "../src/touch/fugue.ts";
import { Chip } from "../src/touch/chip.ts";
import { ProtoGame } from "../src/bench/proto-game.ts";
import { protoById } from "../src/bench/protos.ts";

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

test("D384: a reading's verdict keeps its own slot: HELD at the same moment leaves ACCENT ✓ standing", () => {
  const g = new ProtoGame(fugueById("wtc1f02"), 1, 0, protoById("ladder"), { bpm: 70, legato: false }, silentChip());
  const styled = (g as unknown as { styled(met: boolean, at: number, word?: string): void }).styled.bind(g);
  const at = performance.now();
  styled(true, at, "ACCENT ✓");
  assert.equal(g.readingWord?.text, "ACCENT ✓");
  assert.equal(g.flash, null, "the articulation's slot untouched");
  // The note's end calls HELD in the same moment (judgeEnd): its own slot.
  g.flash = { text: "HELD", at, good: true, kind: "held" };
  assert.equal(g.readingWord?.text, "ACCENT ✓", "not overwritten");
  // A verdict not met is not called (as before): the last met one stands, nothing marked wrong louder.
  styled(false, at + 10, "DETACHED ✓");
  assert.equal(g.readingWord?.text, "ACCENT ✓");
  styled(true, at + 20, "STACCATO ✓");
  assert.equal(g.readingWord?.text, "STACCATO ✓");
});

test("D384: draw order: the verdict over the articulation's word; the box's sparks under the reading's marks", () => {
  const pp = readFileSync(new URL("../src/bench/paint-proto.ts", import.meta.url), "utf8");
  assert.ok(Number(/export const VERDICT_LIFT = (\d+);/.exec(pp)?.[1]) > 0, "a line above the word");
  const word = pp.indexOf("if (g.flash) articulationWord(");
  const verdict = pp.indexOf("if (g.readingWord) articulationWord(");
  assert.ok(word > 0 && verdict > word, "the verdict drawn last, on top");
  const box = readFileSync(new URL("../src/touch/MusicBox.tsx", import.meta.url), "utf8");
  const sparks = box.indexOf("sparks(fx, fr.pops");
  const marks = box.indexOf("if (fr.readingMarks?.size)\n");
  assert.ok(sparks > 0 && marks > sparks, "points and bursts drawn before the reading's marks");
  assert.equal(box.split("sparks(fx, fr.pops").length, 2, "drawn once");
});
