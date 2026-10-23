/**
 * D229, preludes as stage 1 (the owner's design): Book I's pieces come in pairs, the prelude stage 1
 * and its fugue stage 2. The prelude must be BEATEN (played to its end without the crowd leaving; not
 * perfectly) to unlock its fugue; a prelude beaten stays beaten. Book II and Contrapunctus XIV stay
 * fugues alone, unlocked, for now. Kept on this device (`tb-stages-v1`): per prelude, the date it was
 * first beaten and its best grade.
 *
 * The modes: on a phone a prelude is played on HIGHWAY (the five-lane road with two rows of pads,
 * HIGHWAY_LANES: one hand, chosen as a voice is), its fugue on LADDER (SUBJECT withdrawn);
 * on a computer both on the computer's HIGHWAY (keys).
 */
import type { TouchFugue } from "../touch/fugue.ts";
import { betterGrade } from "./cards.ts";
import { type Platform, type ProtoId } from "./protos.ts";

export const STAGES_KEY = "tb-stages-v1";

export interface StageRecord {
  /** The day it was first beaten (YYYY-MM-DD). */
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

/** Whether a fugue is locked: a Book I fugue whose prelude is not yet beaten. */
export function locked(id: string, s: Stages = readStages()): boolean {
  return paired(id) && /^wtc1f/.test(id) && !beaten(preludeOf(id), s);
}

/**
 * A prelude's run ended: beaten when it reached the end (`failed` false). A failed run changes
 * nothing; a beaten prelude stays beaten, its first date kept and its best grade raised. Returns
 * whether this run beat it.
 */
export function recordPrelude(prelude: string, grade: string, failed: boolean, today = new Date().toISOString().slice(0, 10)): boolean {
  if (failed || !paired(prelude) || !/^wtc1p/.test(prelude)) return false;
  try {
    const s = readStages();
    const was = s[prelude];
    s[prelude] = { beaten: was?.beaten || today, best: betterGrade(was?.best, grade) };
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
  if (f.kind === "prelude") return platform === "computer" ? "keys" : "highway";
  if (platform === "mobile") return "ladder";
  return chosen;
}
