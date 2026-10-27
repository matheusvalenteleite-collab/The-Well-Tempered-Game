/**
 * D237, the minimal published page (play.html): Book I's pairs as a grid of cards, prelude and fugue
 * both open from the start. The tiers by the fugue's stars (tiers.ts) appear one after another as
 * pieces are FINISHED (played to the end without the crowd leaving; preludes and fugues both count):
 * INTERMEDIATE after 5 EASY pieces, HARD after 5 INTERMEDIATE, the BOSS (I/24) after all the others.
 * Kept on the device under its own key (`tb-lite-v1`), apart from the bench's progress: the pieces
 * finished, the modes whose one-line instruction has been seen, and the volume.
 */
import { tierFugues, tierOf, TIER_ORDER, type Tier } from "./tiers.ts";
import { detectedPlatform, platformOf, type PlatformPref } from "./home.ts";
import type { Platform } from "./protos.ts";
import { STRONG_SIDE } from "../touch/touch-expr.ts";

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
  /** D265: the best grade each piece was finished with. */
  best: Record<string, string>;
  /** D268: the best final score each piece was finished with. */
  scores: Record<string, number>;
}

/** D265: a piece's sound can be changed once it is finished with a high grade (A or S); before, its own. */
export const SOUND_UNLOCK_GRADES = ["S", "A"];
export const soundUnlocked = (id: string, st: LiteState = readLite()): boolean => SOUND_UNLOCK_GRADES.includes(st.best[id] ?? "");
const RANK = ["D", "C", "B", "A", "S"];

export function readLite(): LiteState {
  try {
    const v = localStorage.getItem(LITE_KEY);
    const o = v ? (JSON.parse(v) as Partial<LiteState>) : {};
    return {
      beaten: Array.isArray(o.beaten) ? o.beaten.filter((x) => typeof x === "string") : [],
      seen: Array.isArray(o.seen) ? o.seen.filter((x) => typeof x === "string") : [],
      volume: typeof o.volume === "number" && o.volume >= 0 && o.volume <= 1 ? o.volume : 1,
      best: o.best && typeof o.best === "object" ? Object.fromEntries(Object.entries(o.best).filter(([, g]) => typeof g === "string")) : {},
      scores: o.scores && typeof o.scores === "object" ? Object.fromEntries(Object.entries(o.scores).filter(([, n]) => typeof n === "number" && Number.isFinite(n))) : {},
    };
  } catch {
    return { beaten: [], seen: [], volume: 1, best: {}, scores: {} };
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

/**
 * D264: every piece open from the start (the owner: "All fugues unlocked from the start, but each card
 * has the color of its difficulty, and also says EASY in green, or NORMAL yellow, HARD in red"): Book I
 * in Bach's order, each pair's prelude then its fugue (on a phone the fugues only).
 */
export const liteAll = (fuguesOnly = false): string[] =>
  [
    ...Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, "0")).flatMap((n) => (fuguesOnly ? [`wtc1f${n}`] : [`wtc1p${n}`, `wtc1f${n}`])),
    // D275: then Book II's fugues.
    ...Array.from({ length: 24 }, (_, i) => `wtc2f${String(i + 1).padStart(2, "0")}`),
  ];
/** D264: a piece's difficulty as its card shows it (its fugue's tier): EASY green, NORMAL yellow, HARD red (the BOSS among the hard). */
export const LITE_LEVELS = { EASY: { label: "EASY", ink: "#5fdc6a" }, NORMAL: { label: "NORMAL", ink: "#e8c94a" }, HARD: { label: "HARD", ink: "#ec5a4a" } } as const;
export function liteLevel(id: string): { label: string; ink: string } {
  const t = tierOf(id);
  return t === "EASY" ? LITE_LEVELS.EASY : t === "INTERMEDIATE" ? LITE_LEVELS.NORMAL : LITE_LEVELS.HARD;
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
export function recordLite(piece: string, failed: boolean, fuguesOnly = false, grade?: string): Tier[] {
  const st = readLite();
  // D265: the best grade kept (a finished run's).
  if (!failed && grade && RANK.indexOf(grade) > RANK.indexOf(st.best[piece] ?? "")) writeLite({ best: { ...st.best, [piece]: grade } });
  if (failed || st.beaten.includes(piece) || !/^wtc1[pf]\d\d$|^wtc2f\d\d$/.test(piece)) return [];
  const before = liteTiers(new Set(st.beaten), fuguesOnly);
  const beaten = [...st.beaten, piece];
  writeLite({ beaten });
  return liteTiers(new Set(beaten), fuguesOnly).filter((t) => !before.includes(t));
}

/** D268: a finished run's final score against the piece's best: the best before it, and whether it is a new one (kept). */
export function recordLiteBest(piece: string, final: number): { before: number | null; fresh: boolean } {
  const st = readLite();
  const before = st.scores[piece] ?? null;
  const fresh = before === null || final > before;
  if (fresh) writeLite({ scores: { ...st.scores, [piece]: final } });
  return { before, fresh };
}

/** The one-line instruction shown at the start of the first game in each mode (D239: the two grades of a right note). */
export const LITE_HINT: Record<string, string> = {
  ladder: "touch either bar at the note's height · hand over from thumb to thumb with no gap",
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
    "Touch either bar, anywhere along it, as the note reaches the line: higher as the tune rises, lower as it falls.",
    // D311: the across axis, the player's (shapes the sound, never the score). D314: its strong side by STRONG_SIDE.
    STRONG_SIDE === "outer"
      ? "Across the bar is yours: by the box softer and darker, by the edge firmer and brighter; move a held thumb sideways to shape the note. It never costs or earns points."
      : "Across the bar is yours: by the edge softer and darker, by the box firmer and brighter; move a held thumb sideways to shape the note. It never costs or earns points.",
    "Hand each note to the other thumb with no gap: LEGATO scores more. Miss too many and the crowd leaves.",
    // D314: the ornaments, as THE ORNAMENT lesson teaches them; the free ones.
    "A sign over a note (TR, ~|) is an ornament: touch the note, then shake your thumb up and down along the bar (a mordent: down and back). Done before the note ends: TRILL ✓ and points; not done: nothing lost.",
    "Any other note you hold may take your own ornament: shake quickly along the bar (down and back: a mordent; on and on: a trill). It sounds, and never scores or costs.",
  ],
};

/** The piece every new player starts on: Prelude 1 in C major. */
export const START_HERE = "wtc1p01";
