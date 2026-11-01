/**
 * D229, preludes as stage 1 (the owner's design): Book I's pieces come in pairs, the prelude stage 1
 * and its fugue stage 2. The prelude must be BEATEN (played to its end without the crowd leaving; not
 * perfectly) to unlock its fugue; a prelude beaten stays beaten. Book II and Contrapunctus XIV stay
 * fugues alone, unlocked, for now. Kept on this device (`tb-stages-v1`): per prelude, the date it was
 * first beaten and its best grade.
 *
 * D232, the progression: the pairs in four tiers by the fugue's stars (tiers.ts): EASY open from the
 * start, INTERMEDIATE after five EASY fugues beaten, HARD after four INTERMEDIATE, the BOSS (I/24)
 * after all the other 23. A closed tier locks prelude and fugue; the fugues beaten are kept here too.
 *
 * The modes: on a phone a prelude is played on HIGHWAY (the five-lane road with two rows of pads,
 * HIGHWAY_LANES: one hand, D251: the prelude's own, not chosen), its fugue on LADDER (SUBJECT withdrawn);
 * on a computer both on the computer's HIGHWAY (keys).
 */
import { APP } from "./config.ts";
import type { TouchFugue } from "../touch/fugue.ts";
import { betterGrade } from "./cards.ts";
import { type Platform, type ProtoId } from "./protos.ts";
import { readFeats } from "./feats.ts";
import { openTiers, tierOf, TIER_ORDER, type Tier } from "./tiers.ts";

export const STAGES_KEY = "tb-stages-v1";

export interface StageRecord {
  /** The day it was first beaten (YYYY-MM-DD). D232: Book I's fugues kept too, each under its own id. */
  beaten: string;
  /** The best grade a run that beat it earned. */
  best: string;
}
export type Stages = Record<string, StageRecord>;

/** Whether a piece is one of the pairs (Book I for now). */
export const paired = (id: string) => /^wtc1[pf]\d\d$/.test(id);
/** "wtc1f05" → "wtc1p05"; "wtc1p05" → itself. */
export const preludeOf = (id: string) => id.replace(/^wtc1f/, "wtc1p");
/** "wtc1p05" → "wtc1f05". */
export const fugueOf = (id: string) => id.replace(/^wtc1p/, "wtc1f");
export const isPrelude = (f: TouchFugue | string) => (typeof f === "string" ? /^wtc\dp\d\d$/.test(f) : f.kind === "prelude");

export function readStages(): Stages {
  try {
    const v = localStorage.getItem(STAGES_KEY);
    const o = v ? (JSON.parse(v) as unknown) : {};
    return o && typeof o === "object" ? (o as Stages) : {};
  } catch {
    return {};
  }
}

/** Whether a prelude has been beaten. */
export const beaten = (prelude: string, s: Stages = readStages()) => !!s[prelude]?.beaten;

/**
 * D232, the hidden way to test it all: `?unlock=all` in the address opens every tier and every fugue
 * for that visit (nothing kept; load the page without it to see the real progress).
 */
export function unlockAll(): boolean {
  try {
    return typeof location !== "undefined" && new URLSearchParams(location.search).get("unlock") === "all";
  } catch {
    return false;
  }
}

/**
 * D232: the Book I fugues beaten (played whole, from the first bar to the end, without the crowd
 * leaving): those kept here, and those the feats remember played whole (`tb-feats-v1`, the same rule,
 * so a player's past counts).
 */
export function beatenFugues(s: Stages = readStages(), done: readonly string[] = readFeats().done): Set<string> {
  const out = new Set<string>();
  for (const id of [...Object.keys(s).filter((k) => s[k]?.beaten), ...done]) if (/^wtc1f\d\d$/.test(id)) out.add(id);
  return out;
}

/** D232: the tiers open (all of them with `?unlock=all`). */
export const tiersOpen = (won: ReadonlySet<string> = beatenFugues()): Tier[] => (unlockAll() ? [...TIER_ORDER] : openTiers(won));

/** D232: whether a Book I piece's tier (its fugue's) is still closed: prelude and fugue alike. */
export function tierLocked(id: string, won: ReadonlySet<string> = beatenFugues()): boolean {
  // D275: Book II has difficulty tiers now (play.html's colours) but is never locked.
  const t = /^wtc1/.test(id) ? tierOf(id) : null;
  return !!t && !tiersOpen(won).includes(t);
}

/**
 * Whether a piece is locked: a Book I piece whose tier is closed (D232), or a Book I fugue whose
 * prelude is not yet beaten (D229). Book II and XIV never.
 */
export function locked(id: string, s: Stages = readStages(), done: readonly string[] = readFeats().done): boolean {
  if (!paired(id) || unlockAll()) return false;
  if (tierLocked(id, beatenFugues(s, done))) return true;
  return /^wtc1f/.test(id) && !beaten(preludeOf(id), s);
}

/**
 * A prelude's run ended: beaten when it reached the end (`failed` false). A failed run changes
 * nothing; a beaten prelude stays beaten, its first date kept and its best grade raised. Returns
 * whether this run beat it.
 */
export function recordPrelude(prelude: string, grade: string, failed: boolean, today = new Date().toISOString().slice(0, 10)): boolean {
  if (failed || !paired(prelude) || !/^wtc1p/.test(prelude)) return false;
  return keep(prelude, grade, today);
}

/**
 * D232: a Book I fugue's run ended: beaten when played whole (from its first bar) to its end without
 * the crowd leaving. Kept as a prelude is. Returns the tiers this run opened (for the result's toast).
 * Called before the feats are earned (they remember the fugues played whole too).
 */
export function recordFugue(fugue: string, grade: string, failed: boolean, whole: boolean, today = new Date().toISOString().slice(0, 10)): Tier[] {
  if (failed || !whole || !/^wtc1f\d\d$/.test(fugue)) return [];
  const before = openTiers(beatenFugues());
  keep(fugue, grade, today);
  return openTiers(beatenFugues()).filter((t) => !before.includes(t));
}

/** A piece beaten: kept with the first date and the best grade. True (beaten, this run at least). */
function keep(id: string, grade: string, today: string): boolean {
  try {
    const s = readStages();
    const was = s[id];
    s[id] = { beaten: was?.beaten || today, best: betterGrade(was?.best, grade) };
    localStorage.setItem(STAGES_KEY, JSON.stringify(s));
  } catch {
    /* no storage: beaten for this run only */
  }
  return true;
}

/**
 * The mode a piece is played in: a prelude on a phone on HIGHWAY (the five lanes), on a computer on
 * HIGHWAY (keys); a fugue on a phone on LADDER (SUBJECT withdrawn, the owner), on a computer in the
 * mode chosen (HIGHWAY first).
 */
export function stageMode(f: TouchFugue, platform: Platform, chosen: ProtoId): ProtoId {
  // D442: the Glenn pilot's preludes on a phone on LADDER, the fugues' screen (THE REVEAL, reveal.ts).
  if (f.kind === "prelude") return platform === "computer" ? "keys" : APP.glennPilot ? "ladder" : "highway";
  if (platform === "mobile") return "ladder";
  return chosen;
}

/**
 * D233: WITH KIMIKO ISHIZAKA, an unlockable: the feat KIMIKO ISHIZAKA earned (all 24 Book I fugues
 * beaten), or those 24 beaten already (`?unlock=all` too).
 */
export function herUnlocked(s: Stages = readStages(), feats: { earned: Partial<Record<string, string>>; done: readonly string[] } = readFeats()): boolean {
  return unlockAll() || !!feats.earned.ishizaka || beatenFugues(s, feats.done).size >= 24;
}

/**
 * D251, no hand chosen for a prelude (the owner: "By default they can only be played with what the
 * game gives"): the part each prelude gives its player, by id. The right hand (voice 0) for every
 * prelude unless named here (room to give one its left hand, or another part, later).
 */
export const PRELUDE_PART: Readonly<Record<string, number>> = {};

/** D251: the part a prelude gives (the right hand, voice 0, unless `PRELUDE_PART` names another). */
export const preludePart = (id: string): number => PRELUDE_PART[id] ?? 0;
