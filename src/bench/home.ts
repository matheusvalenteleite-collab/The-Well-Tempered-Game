/**
 * D233, the HOME screen's logic (pure): the platform guessed from the pointer (no PLAY ON question),
 * the CONTINUE button's piece, the progress line, and the MIDI inputs that offer MIDI CONTROLLER.
 */
import type { Platform } from "./protos.ts";
import { fugueOf, isPrelude, paired, preludeOf, type Stages } from "./stages.ts";
import { openTiers, tierCards, tierFugues, TIER_ORDER, type Tier } from "./tiers.ts";

/** A coarse pointer with no hover (a finger on glass): the phone's modes; anything else a computer's. */
export const detectPlatform = (m: { coarse: boolean; hover: boolean }): Platform => (m.coarse && !m.hover ? "mobile" : "computer");

/** The ⚙ override: AUTO (detected), or a platform chosen. */
export type PlatformPref = "auto" | Platform;
export const platformOf = (pref: PlatformPref, detected: Platform): Platform => (pref === "auto" ? detected : pref);

/** The browser's answer (in try/catch: no matchMedia, a computer). */
export function detectedPlatform(): Platform {
  try {
    return detectPlatform({ coarse: matchMedia("(pointer: coarse)").matches, hover: matchMedia("(hover: hover)").matches });
  } catch {
    return "computer";
  }
}

/** CONTINUE's target: the piece, and whether the player is new (START). */
export interface Continue {
  piece: string;
  fresh: boolean;
}

/**
 * The current pair's next unbeaten stage (its prelude, then its fugue); the pair done, the next pair in
 * the wheel's order (by tier, Bach's order within) with an unbeaten stage and its tier open. A new
 * player (nothing beaten): START on the first EASY prelude. A piece outside the pairs (Book II, XIV)
 * continues as it is.
 */
export function continueTarget(current: string, stages: Stages, beatenFugues: ReadonlySet<string>): Continue {
  const won = (id: string) => (isPrelude(id) ? !!stages[id]?.beaten : beatenFugues.has(id));
  const order = tierCards().map((c) => c.id);
  const fresh = !Object.values(stages).some((s) => s?.beaten) && beatenFugues.size === 0;
  if (fresh) return { piece: preludeOf(order[0]), fresh };
  if (!paired(current)) return { piece: current, fresh };
  const open = openTiers(beatenFugues);
  const tierOpen = (f: string) => open.some((t) => tierFugues(t).includes(f));
  const next = (f: string) => (!won(preludeOf(f)) ? preludeOf(f) : !won(f) ? f : null);
  const at = order.indexOf(fugueOf(current));
  for (let k = 0; k < order.length; k++) {
    const f = order[(Math.max(0, at) + k) % order.length];
    const n = tierOpen(f) ? next(f) : null;
    if (n) return { piece: n, fresh };
  }
  return { piece: fugueOf(current), fresh };
}

/** "EASY · 3/10 FUGUES BEATEN": the highest tier open, and its fugues beaten. */
export function progressLine(beatenFugues: ReadonlySet<string>): string {
  const open = openTiers(beatenFugues);
  const t: Tier = [...TIER_ORDER].reverse().find((x) => open.includes(x)) ?? "EASY";
  const ids = tierFugues(t);
  return `${t} · ${ids.filter((id) => beatenFugues.has(id)).length}/${ids.length} FUGUE${ids.length === 1 ? "" : "S"} BEATEN`;
}

/** What Web MIDI's access object offers here (a fake in the tests): its inputs. */
export interface MidiLike {
  inputs: { forEach(cb: (input: { name?: string | null; state?: string }) => void): void };
}

/** The MIDI inputs connected (by name); none without Web MIDI (Safari) or access. MIDI CONTROLLER is offered while one is. */
export function midiInputNames(access: MidiLike | null | undefined): string[] {
  const names: string[] = [];
  access?.inputs.forEach((i) => {
    if (i.state !== "disconnected") names.push(i.name || "MIDI");
  });
  return names;
}
