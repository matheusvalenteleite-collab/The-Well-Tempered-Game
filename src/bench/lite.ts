/**
 * D237, the minimal published page (play.html): Book I's pairs as a grid of cards, prelude and fugue
 * both open from the start. The tiers by the fugue's stars (tiers.ts) appear one after another as
 * pieces are FINISHED (played to the end without the crowd leaving; preludes and fugues both count):
 * INTERMEDIATE after 5 EASY pieces, HARD after 5 INTERMEDIATE, the BOSS (I/24) after all the others.
 * Kept on the device under its own key (`tb-lite-v1`), apart from the bench's progress: the pieces
 * finished, the modes whose one-line instruction has been seen, and the volume.
 */
import { tierFugues, TIER_ORDER, type Tier } from "./tiers.ts";
import { detectedPlatform, platformOf, type PlatformPref } from "./home.ts";
import type { Platform } from "./protos.ts";

/**
 * D263: the minimal page's platform: as detected, or as chosen in its ⚙ (MOBILE · COMPUTER, kept on the
 * device); on a phone only the fugues (the owner: "eliminate all preludes from mobile mode ... the fugues
 * are much more interesting. We should focus on LADDER mobile").
 */
export const LITE_PLATFORM_KEY = "tb-lite-platform";
export function litePlatformPref(): PlatformPref {
  try {
    const v = localStorage.getItem(LITE_PLATFORM_KEY);
    return v === "mobile" || v === "computer" ? v : "auto";
  } catch {
    return "auto";
  }
}
export function saveLitePlatform(p: PlatformPref) {
  try {
    if (p === "auto") localStorage.removeItem(LITE_PLATFORM_KEY);
    else localStorage.setItem(LITE_PLATFORM_KEY, p);
  } catch {
    /* this visit only */
  }
}
export const litePlatform = (): Platform => platformOf(litePlatformPref(), detectedPlatform());
/** D263: where a new player starts: Prelude 1 on a computer, Fugue 1 on a phone (no preludes there). */
export const startHere = (fuguesOnly: boolean): string => (fuguesOnly ? "wtc1f01" : START_HERE);

export const LITE_KEY = "tb-lite-v1";

export interface LiteState {
  /** The pieces finished (preludes and fugues, by id). */
  beaten: string[];
  /** The modes whose instruction line has been shown and played past. */
  seen: string[];
  /** The sound's volume, 0..1. */
  volume: number;
}

export function readLite(): LiteState {
  try {
    const v = localStorage.getItem(LITE_KEY);
    const o = v ? (JSON.parse(v) as Partial<LiteState>) : {};
    return {
      beaten: Array.isArray(o.beaten) ? o.beaten.filter((x) => typeof x === "string") : [],
      seen: Array.isArray(o.seen) ? o.seen.filter((x) => typeof x === "string") : [],
      volume: typeof o.volume === "number" && o.volume >= 0 && o.volume <= 1 ? o.volume : 1,
    };
  } catch {
    return { beaten: [], seen: [], volume: 1 };
  }
}
export function writeLite(patch: Partial<LiteState>): LiteState {
  const next = { ...readLite(), ...patch };
  try {
    localStorage.setItem(LITE_KEY, JSON.stringify(next));
  } catch {
    /* no storage: this visit only */
  }
  return next;
}

/** A tier's cards, in Bach's order, each pair's prelude then its fugue. */
export const litePieces = (t: Tier, fuguesOnly = false): string[] => tierFugues(t).flatMap((f) => (fuguesOnly ? [f] : [f.replace(/^wtc1f/, "wtc1p"), f]));

/** Pieces finished in a tier that show the next one (the BOSS: every other piece). */
export const LITE_STEP = 5;

/** How many more pieces must be finished to show a tier (0: its condition met). */
export function liteToGo(t: Tier, beaten: ReadonlySet<string>, fuguesOnly = false): number {
  const i = TIER_ORDER.indexOf(t);
  if (i <= 0) return 0;
  const left = (ids: string[]) => ids.filter((id) => !beaten.has(id)).length;
  if (t === "BOSS") return left(TIER_ORDER.filter((x) => x !== "BOSS").flatMap((x) => litePieces(x, fuguesOnly)));
  const before = litePieces(TIER_ORDER[i - 1], fuguesOnly);
  return Math.max(0, LITE_STEP - (before.length - left(before)));
}

/** The tiers shown, in order (each needs the one before it shown). */
export function liteTiers(beaten: ReadonlySet<string>, fuguesOnly = false): Tier[] {
  const out: Tier[] = [];
  for (const t of TIER_ORDER) {
    if (liteToGo(t, beaten, fuguesOnly) > 0) break;
    out.push(t);
  }
  return out;
}

/** The cards shown, in the grid's order. */
export const liteOrder = (beaten: ReadonlySet<string>, fuguesOnly = false): string[] => liteTiers(beaten, fuguesOnly).flatMap((t) => litePieces(t, fuguesOnly));

/** "5 MORE TO UNLOCK INTERMEDIATE"; empty once every tier is shown. */
export function liteLine(beaten: ReadonlySet<string>, fuguesOnly = false): string {
  const shown = liteTiers(beaten, fuguesOnly);
  const t = TIER_ORDER.find((x) => !shown.includes(x));
  return t ? `${liteToGo(t, beaten, fuguesOnly)} MORE TO UNLOCK ${t}` : "";
}

/**
 * A run ended: a piece finished (to its end, `failed` false) is kept. Returns the tiers this run
 * showed (for the result's line).
 */
export function recordLite(piece: string, failed: boolean, fuguesOnly = false): Tier[] {
  const st = readLite();
  if (failed || st.beaten.includes(piece) || !/^wtc1[pf]\d\d$/.test(piece)) return [];
  const before = liteTiers(new Set(st.beaten), fuguesOnly);
  const beaten = [...st.beaten, piece];
  writeLite({ beaten });
  return liteTiers(new Set(beaten), fuguesOnly).filter((t) => !before.includes(t));
}

/** The one-line instruction shown at the start of the first game in each mode (D239: the two grades of a right note). */
export const LITE_HINT: Record<string, string> = {
  ladder: "touch either bar at the note's height · land the next before you lift the last",
  highway: "tap the note's lane as it lands: full points · another lane the right way (right = up, left = down): half",
  keys: "press the lane's key as the note lands: full points · another key the right way: half · SPACE repeats",
};

/**
 * D239: how each mode is played, behind ? HOW TO PLAY on the pop-up (bench and play.html): a few
 * short lines, the two grades of a right note on the HIGHWAYs spelled out.
 */
export const RULES: Record<string, string[]> = {
  keys: [
    "Notes come down the road. Press the key of their lane (A S D F · G · H J K L) as they reach the line.",
    "THE LANE'S KEY: full points, a bright chime and LANE ✓.",
    "ANOTHER KEY THE RIGHT WAY (further right as the tune rises, left as it falls): half the points, a duller note and ~. Your streak is kept.",
    "The wrong way or off the beat: a miss. SPACE plays the same note again. Miss too many and the crowd leaves.",
  ],
  highway: [
    "Notes come down five lanes. Tap the note's lane as it reaches the line.",
    "THE NOTE'S LANE: full points, a bright chime and LANE ✓.",
    "ANOTHER LANE THE RIGHT WAY (further right as the tune rises, left as it falls): half the points, a duller note and ~. Your streak is kept.",
    "The wrong way or off the beat: a miss. Miss too many and the crowd leaves.",
  ],
  ladder: [
    "Hold the phone sideways, a thumb on each bar.",
    "Touch either bar at the note's height as it reaches the line: higher notes higher up.",
    "Land the next note before you lift the last: LEGATO scores more. Miss too many and the crowd leaves.",
  ],
};

/** The piece every new player starts on: Prelude 1 in C major. */
export const START_HERE = "wtc1p01";
