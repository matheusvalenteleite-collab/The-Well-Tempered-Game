/**
 * D317, THE LAB: the game a passage makes, the same in the lab and in a replay (so a log plays again
 * exactly as it was played).
 */
import { barStart, fugueById, type TouchFugue } from "../../touch/fugue.ts";
import { readingsOf } from "../../touch/readings.ts";
import type { Chip } from "../../touch/chip.ts";
import { ProtoGame } from "../proto-game.ts";
import { easyOf, protoById } from "../protos.ts";
import type { LabPassage } from "./log.ts";

/** The ticks a passage plays: from its first bar's start to the end of its last bar. */
export function passageSpan(f: TouchFugue, p: Pick<LabPassage, "fromBar" | "toBar">): { from: number; until: number } {
  const first = f.bars[0]?.n ?? 1;
  const last = f.bars.at(-1)?.n ?? 1;
  const from = p.fromBar <= first ? 0 : barStart(f, p.fromBar);
  const until = p.toBar >= last ? f.length : barStart(f, p.toBar + 1);
  return { from, until: Math.max(until, from + 1) };
}

/** The game for a passage (the lab's options: no crowd to lose, no first-time hints). */
export function labGame(p: LabPassage, chip: Chip, extra?: { demo?: boolean }): ProtoGame {
  const f = fugueById(p.piece);
  const { from, until } = passageSpan(f, p);
  const reading = p.reading ? (readingsOf(f.id).find((r) => r.id === p.reading) ?? null) : null;
  const proto = protoById(p.proto);
  // D333: `demo` (the STUDY's HEAR IT FIRST): the game plays the passage itself, as the tutorial's demonstration.
  return new ProtoGame(f, [p.voice], from, proto, { bpm: p.bpm, legato: false, easy: easyOf(proto.id), fail: false, bt: p.bt, wait: p.wait, until, reading, ornHint: false, scale: false, ...(extra?.demo ? { demo: true } : {}) }, chip);
}
