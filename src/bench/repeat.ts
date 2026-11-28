/**
 * D1081, REPEAT (developer-only, OFF by default; the design is docs/research/TEMPO-AND-REPEAT-DESIGN.md, the owner's rulings D1078/D1079).
 *
 * A section of a piece may be repeated once: the player presses REPEAT in the section's second-last bar (not after one beat before its
 * end, nor sooner than the scheduler's look-ahead needs); pressed again before then it cancels. Pressed, the game clock jumps back to
 * the section's start at its end, exactly once (ProtoGame.repeatSeam / repeatLand); the second pass is played for its own sake and never
 * counts toward the grade (first pass only, D1079).
 *
 * This file holds the flag, the sections a piece has (the test table) and the pure window arithmetic; the jump is in proto-game.ts.
 */
import { barAt, barStart, type TouchFugue } from "../touch/fugue.ts";
import { lockMech, MECH } from "./mechanics.ts";
import { unlocked } from "./unlock.ts";

/** A section that may be repeated: ticks, from its first bar's start to the start of the bar after its last (the repeat sign). */
export interface RepeatSection {
  from: number;
  to: number;
}

/**
 * Made-up sections for trying the button (no piece has a printed repeat in play yet; French Suite 5 is not imported): the first bars
 * of one short WTC fugue. Bars as the print numbers them, `toBar` the last bar inside the section.
 */
export const TEST_REPEATS: Readonly<Record<string, { fromBar: number; toBar: number }>> = {
  wtc1f02: { fromBar: 2, toBar: 5 },
};

/** The section this piece repeats, or undefined: none unless the developer flag is on (MECH.repeat). */
export function repeatSectionOf(f: TouchFugue): RepeatSection | undefined {
  if (!MECH.repeat) return undefined;
  const r = TEST_REPEATS[f.id];
  if (!r) return undefined;
  const from = barStart(f, r.fromBar);
  const to = barStart(f, r.toBar + 1);
  return to > from && to < f.length ? { from, to } : undefined;
}

/** The tick at which the REPEAT button appears: the start of the section's second-last bar (its first bar, in a one-bar section). */
export function repeatOpensAt(f: TouchFugue, s: RepeatSection): number {
  const last = barStart(f, barAt(f, s.to - 1));
  const before = barStart(f, barAt(f, Math.max(s.from, last - 1)));
  return Math.max(s.from, before);
}

/** What the button should show (read by the page each frame). */
export type RepeatView = "none" | "offered" | "latched" | "second";

// ---- the developer switch (play.html's SETTINGS, unlocked devices only; default OFF) -------------------------------------------

export const REPEAT_KEY = "tg-repeat-dev-v1";
export function repeatStored(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(REPEAT_KEY) === "on";
  } catch {
    return false;
  }
}
export function saveRepeat(on: boolean) {
  try {
    if (on) localStorage.setItem(REPEAT_KEY, "on");
    else localStorage.removeItem(REPEAT_KEY);
  } catch {
    /* this visit only */
  }
}
/** At the page's start: MECH.repeat on only on an unlocked device whose switch is on. Returns whether it is. */
export function applyRepeat(): boolean {
  const on = unlocked() && repeatStored();
  if (on) lockMech({ repeat: true });
  return on;
}
