/**
 * D233, the HOME screen's logic (pure): the platform guessed from the pointer (no PLAY ON question),
 * the CONTINUE button's piece, the progress line, and the MIDI inputs that offer MIDI CONTROLLER.
 */
import type { Platform } from "./protos.ts";
import { fugueOf, isPrelude, paired, preludeOf, type Stages } from "./stages.ts";
import { openTiers, tierCards, tierFugues, TIER_ORDER, type Tier } from "./tiers.ts";

/**
 * The phone's modes or the computer's. D263: a phone or tablet says so first (the browser's own
 * `userAgentData.mobile`, else its user agent: Android, iPhone, iPad, iPod, a "Mobile" browser, an iPad
 * passing as a Mac with a touch screen), since Samsung's phones (the owner's friend's Galaxy S22) report
 * hover (the S Pen's Air View), and the pointer alone sent them to the computer's modes; otherwise a
 * coarse pointer with no hover (a finger on glass) is a phone, anything else a computer.
 */
export const detectPlatform = (m: { coarse: boolean; hover: boolean; ua?: string; uaMobile?: boolean; touchPoints?: number }): Platform => {
  if (m.uaMobile) return "mobile";
  const ua = m.ua ?? "";
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile|Windows Phone/i.test(ua)) return "mobile";
  if (/Macintosh/.test(ua) && (m.touchPoints ?? 0) > 1) return "mobile";
  return m.coarse && !m.hover ? "mobile" : "computer";
};

/**
 * D343: play.html is for phones and tablets only. A device is turned away ("MOBILE ONLY") only when it is
 * surely a computer: no touch points at all, no coarse pointer anywhere, and nothing in the browser's own
 * answer or its user agent saying phone or tablet. Any doubt lets it in: an iPhone or iPad asking for the
 * desktop site (a Mac's user agent, but touch points), Android's desktop mode (touch points), a touch-screen
 * laptop (touch points: it can be played with fingers) all play.
 */
export const surelyComputer = (m: { anyCoarse: boolean; ua?: string; uaMobile?: boolean; touchPoints?: number }): boolean => {
  if (m.uaMobile) return false;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile|Windows Phone|CrOS/i.test(m.ua ?? "")) return false;
  if ((m.touchPoints ?? 0) > 0) return false;
  return !m.anyCoarse;
};

/** The browser's answer to D343 (in try/catch: if the browser can't say, never turn it away). */
export function isSurelyComputer(): boolean {
  try {
    const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
    if (typeof nav.maxTouchPoints !== "number") return false;
    const coarse = matchMedia("(any-pointer: coarse)").matches || matchMedia("(pointer: coarse)").matches;
    return surelyComputer({ anyCoarse: coarse, ua: nav.userAgent, uaMobile: nav.userAgentData?.mobile, touchPoints: nav.maxTouchPoints });
  } catch {
    return false;
  }
}

/** The ⚙ override: AUTO (detected), or a platform chosen. */
export type PlatformPref = "auto" | Platform;
export const platformOf = (pref: PlatformPref, detected: Platform): Platform => (pref === "auto" ? detected : pref);

/** The browser's answer (in try/catch: no matchMedia, a computer). */
export function detectedPlatform(): Platform {
  try {
    const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
    return detectPlatform({ coarse: matchMedia("(pointer: coarse)").matches, hover: matchMedia("(hover: hover)").matches, ua: nav.userAgent, uaMobile: nav.userAgentData?.mobile, touchPoints: nav.maxTouchPoints });
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
