/**
 * D237, the minimal published page (play.html): Book I's pairs as a grid of cards, prelude and fugue
 * both open from the start. The tiers by the fugue's stars (tiers.ts) appear one after another as
 * pieces are FINISHED (played to the end without the crowd leaving; preludes and fugues both count):
 * INTERMEDIATE after 5 EASY pieces, HARD after 5 INTERMEDIATE, the BOSS (I/24) after all the others.
 * Kept on the device under its own key (`tb-lite-v1`), apart from the bench's progress: the pieces
 * finished, the modes whose one-line instruction has been seen, and the volume.
 */
import { tierFugues, TIER_ORDER, type Tier } from "./tiers.ts";

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
export const litePieces = (t: Tier): string[] => tierFugues(t).flatMap((f) => [f.replace(/^wtc1f/, "wtc1p"), f]);

/** Pieces finished in a tier that show the next one (the BOSS: every other piece). */
export const LITE_STEP = 5;

/** How many more pieces must be finished to show a tier (0: its condition met). */
export function liteToGo(t: Tier, beaten: ReadonlySet<string>): number {
  const i = TIER_ORDER.indexOf(t);
  if (i <= 0) return 0;
  const left = (ids: string[]) => ids.filter((id) => !beaten.has(id)).length;
  if (t === "BOSS") return left(TIER_ORDER.filter((x) => x !== "BOSS").flatMap(litePieces));
  const before = litePieces(TIER_ORDER[i - 1]);
  return Math.max(0, LITE_STEP - (before.length - left(before)));
}

/** The tiers shown, in order (each needs the one before it shown). */
export function liteTiers(beaten: ReadonlySet<string>): Tier[] {
  const out: Tier[] = [];
  for (const t of TIER_ORDER) {
    if (liteToGo(t, beaten) > 0) break;
    out.push(t);
  }
  return out;
}

/** The cards shown, in the grid's order. */
export const liteOrder = (beaten: ReadonlySet<string>): string[] => liteTiers(beaten).flatMap(litePieces);

/** "5 MORE TO UNLOCK INTERMEDIATE"; empty once every tier is shown. */
export function liteLine(beaten: ReadonlySet<string>): string {
  const shown = liteTiers(beaten);
  const t = TIER_ORDER.find((x) => !shown.includes(x));
  return t ? `${liteToGo(t, beaten)} MORE TO UNLOCK ${t}` : "";
}

/**
 * A run ended: a piece finished (to its end, `failed` false) is kept. Returns the tiers this run
 * showed (for the result's line).
 */
export function recordLite(piece: string, failed: boolean): Tier[] {
  const st = readLite();
  if (failed || st.beaten.includes(piece) || !/^wtc1[pf]\d\d$/.test(piece)) return [];
  const before = liteTiers(new Set(st.beaten));
  const beaten = [...st.beaten, piece];
  writeLite({ beaten });
  return liteTiers(new Set(beaten)).filter((t) => !before.includes(t));
}

/** The one-line instruction shown at the start of the first game in each mode. */
export const LITE_HINT: Record<string, string> = {
  ladder: "touch either bar at the note's height · land the next before you lift the last",
  highway: "tap the lane as the note lands · right when the tune rises, left when it falls",
  keys: "press the lane's key as the note lands · SPACE repeats",
};

/** The piece every new player starts on: Prelude 1 in C major. */
export const START_HERE = "wtc1p01";
