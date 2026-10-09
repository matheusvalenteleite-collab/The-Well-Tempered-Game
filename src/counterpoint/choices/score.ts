/**
 * The score of a choice, as a vector compared tier by tier (lexicographically), never summed:
 *
 *   errors   — Fux's precepts broken (a legal choice has none);
 *   warnings — Fux's recommendations not followed (contrary motion, ...);
 *   counsel  — Fux's stated counsel, counted locally: similar or parallel motion into or out of a
 *              downbeat (p. 45), a perfect consonance on an inner downbeat (p. 46), a repeated
 *              note (variety, p. 74), leaps (everything easy to sing, p. 53: one point for a leap,
 *              two beyond a fourth);
 *   habit    — what Fux usually does (bits of surprisal under his own frequencies, habits.ts).
 *
 * Ewing (2009) weighted rules by powers of ten; comparing tiers in order does the same job
 * without pretending the tiers share a unit. Nothing here affects stars (D25).
 */
import { harmonic, isPerfectConsonance, motion } from "../interval.ts";
import { parsePitch } from "../../music/pitch.ts";
import type { Slot } from "../layout.ts";
import { onsets } from "./corpus.ts";
import { bits, melodicKey, melodicProb, roleOf, samePerfect, successionBits, verticalKey, verticalProb, type HabitTables } from "./habits.ts";
import type { Staff } from "../../music/fux/index.ts";

export type TierName = "errors" | "warnings" | "counsel" | "habit";
export const TIER_NAMES: TierName[] = ["errors", "warnings", "counsel", "habit"];

export interface Tiers {
  errors: number;
  warnings: number;
  counsel: number;
  habit: number;
}

export interface CounselParts {
  motion: number;
  perfect: number;
  repeat: number;
  leap: number;
}

export interface HabitParts {
  melodic: number;
  vertical: number;
}

const EPS = 1e-9;

/** Negative when a is better than b under the given tier order. */
export function compareTiers(a: Tiers, b: Tiers, order: TierName[] = TIER_NAMES): number {
  for (const t of order) {
    const d = a[t] - b[t];
    if (Math.abs(d) > EPS) return d;
  }
  return 0;
}

interface Neighbourhood {
  pitch: string;
  first: number;
  last: number;
  prev: [number, string] | null;
  next: [number, string] | null;
}

function around(layout: Slot[], line: (string | null)[], unit: number[]): Neighbourhood {
  const first = unit[0];
  const last = unit[unit.length - 1];
  const on = onsets(layout, line);
  const i = on.findIndex(([s]) => s === first);
  return { pitch: line[first]!, first, last, prev: i > 0 ? on[i - 1] : null, next: i >= 0 && i + 1 < on.length ? on[i + 1] : null };
}

const semis = (a: string, b: string) => Math.abs(parsePitch(b).midi - parsePitch(a).midi);

export function counselOf(layout: Slot[], cantus: string[], line: (string | null)[], unit: number[]): CounselParts {
  const n = around(layout, line, unit);
  const cf = (s: number) => cantus[layout[s].bar];
  const bars = cantus.length;
  const parts: CounselParts = { motion: 0, perfect: 0, repeat: 0, leap: 0 };
  const bad = (m: string) => m === "similar" || m === "parallel";
  if (n.prev && layout[n.first].beat === 0 && bad(motion(cf(n.prev[0]), n.prev[1], cf(n.first), n.pitch))) parts.motion++;
  if (n.next && layout[n.next[0]].beat === 0 && bad(motion(cf(n.last), n.pitch, cf(n.next[0]), n.next[1]))) parts.motion++;
  for (const s of unit) {
    const sl = layout[s];
    if (sl.beat === 0 && sl.bar > 0 && sl.bar < bars - 1 && isPerfectConsonance(harmonic(cf(s), n.pitch))) parts.perfect++;
  }
  for (const nb of [n.prev, n.next]) {
    if (!nb) continue;
    if (nb[1] === n.pitch) parts.repeat++;
    const d = semis(nb[1], n.pitch);
    if (d > 2) parts.leap++;
    if (d > 5) parts.leap++;
  }
  return parts;
}

export function habitOf(t: HabitTables, cantusVoice: Staff, layout: Slot[], cantus: string[], line: (string | null)[], unit: number[]): HabitParts {
  const role = roleOf(cantusVoice);
  const n = around(layout, line, unit);
  let melodic = 0;
  if (n.prev) melodic += bits(melodicProb(t, role, melodicKey(n.prev[1], n.pitch)));
  if (n.next) melodic += bits(melodicProb(t, role, melodicKey(n.pitch, n.next[1])));
  let vertical = 0;
  for (const s of unit) {
    vertical += bits(verticalProb(t, layout[s].beat === 0, verticalKey(cantus[layout[s].bar], n.pitch, cantusVoice)));
    if (layout[s].beat === 0) vertical += downbeatSuccession(t, layout, cantus, line, s, cantusVoice);
  }
  return { melodic, vertical };
}

/** The downbeat at slot s against the downbeats before and after it: the same fifth or octave again is rare in Fux. */
function downbeatSuccession(t: HabitTables, layout: Slot[], cantus: string[], line: (string | null)[], s: number, cantusVoice: Staff): number {
  const key = (k: number) => (line[k] && /^[A-G]/.test(line[k]!) ? verticalKey(cantus[layout[k].bar], line[k]!, cantusVoice) : null);
  const here = key(s);
  if (!here) return 0;
  let h = 0;
  for (const dir of [-1, 1]) {
    let j = s + dir;
    while (j >= 0 && j < layout.length && layout[j].beat !== 0) j += dir;
    const there = j >= 0 && j < layout.length ? key(j) : null;
    if (there) h += successionBits(t, samePerfect(dir < 0 ? there : here, dir < 0 ? here : there));
  }
  return h;
}

export const counselTotal = (c: CounselParts) => c.motion + c.perfect + c.repeat + c.leap;
