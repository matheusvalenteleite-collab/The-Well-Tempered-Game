/**
 * D440, PROGRESSION MODE (the owner's brief of 1 Nov 2026; docs/progression/PROGRESSION-PROPOSAL.html, all
 * five choices approved; the Lab only: lab.html?progression=1). Book I as a path of 16 stages: stages 1–7
 * one fugue each, 8–15 two (either opens the next), 16 the boss. Only stages 1–4 are built (their
 * tutorials: manual/stage-lessons.ts); the rest are shown locked with their numbers.
 *
 * On a stage's first PLAY its tutorial runs (stage 1: the BASICS first), then the fugue; once the tutorial
 * is through, PLAY goes straight to the fugue and REDO TUTORIAL appears. Finishing the fugue (the crowd
 * kept to the end, any grade, any tempo) opens the next stage. After two runs the crowd ended, SLOW is
 * offered (the tempo choice D356 otherwise opens with an A). Grades A+ · A · B · C · D · E (fineGrade).
 *
 * The mode plays on a profile of its own (lab-main.tsx: every stored key under PROFILE), so a test from
 * a fresh start never touches the device's play.html progress, and RESET wipes only it.
 */
import { APP } from "./config.ts";

export interface Stage {
  n: number;
  fugues: string[];
  /** The tutorial's lessons (stage-lessons.ts; stage 1 the BASICS first); none: not built yet. */
  lessons: string[];
  teaches: string;
}

const f = (n: number) => `wtc1f${String(n).padStart(2, "0")}`;

export const STAGES: Stage[] = [
  { n: 1, fugues: [f(1)], lessons: ["1.1", "1.2", "1.3", "1.4", "P.1"], teaches: "Two thumbs, one voice; what a fugue is" },
  { n: 2, fugues: [f(23)], lessons: ["P.2"], teaches: "Listen first, then answer" },
  { n: 3, fugues: [f(22)], lessons: ["P.3"], teaches: "Long notes, five voices" },
  { n: 4, fugues: [f(18)], lessons: ["P.4"], teaches: "Busoni's first sign: short" },
  { n: 5, fugues: [f(14)], lessons: [], teaches: "Joined and detached" },
  { n: 6, fugues: [f(6)], lessons: [], teaches: "The first ornaments" },
  { n: 7, fugues: [f(16)], lessons: [], teaches: "Slurs" },
  { n: 8, fugues: [f(12), f(8)], lessons: [], teaches: "Stamina" },
  { n: 9, fugues: [f(4), f(20)], lessons: [], teaches: "The big fugues" },
  { n: 10, fugues: [f(5), f(17)], lessons: [], teaches: "New rhythm; the bass" },
  { n: 11, fugues: [f(13), f(11)], lessons: [], teaches: "Ornaments; a dance" },
  { n: 12, fugues: [f(2), f(21)], lessons: [], teaches: "All the signs" },
  { n: 13, fugues: [f(7), f(15)], lessons: [], teaches: "Speed" },
  { n: 14, fugues: [f(3), f(19)], lessons: [], teaches: "Fast, compound time" },
  { n: 15, fugues: [f(9), f(10)], lessons: [], teaches: "The fastest" },
  { n: 16, fugues: [f(24)], lessons: [], teaches: "The boss" },
];

/** The stages built (their tutorials written). */
export const BUILT_STAGES = STAGES.filter((s) => s.lessons.length).length;

export const stageOf = (id: string): Stage | undefined => STAGES.find((s) => s.fugues.includes(id));

/** The highest stage open: 1, then one more for each stage with a fugue finished, never past the stages built. */
export function openStage(beaten: readonly string[]): number {
  const won = new Set(beaten);
  let n = 1;
  while (n < STAGES.length && STAGES[n - 1].fugues.some((id) => won.has(id)) && STAGES[n].lessons.length) n++;
  return n;
}

export const isOpen = (id: string, beaten: readonly string[]): boolean => {
  const s = stageOf(id);
  return !!s && s.n <= openStage(beaten);
};

/** Every stage built finished: what the Lab's mode can offer is done. */
export const builtDone = (beaten: readonly string[]): boolean => {
  const won = new Set(beaten);
  return STAGES.filter((s) => s.lessons.length).every((s) => s.fugues.some((id) => won.has(id)));
};

/** The mode's own record (in its profile): each fugue's tutorial through, and the runs the crowd ended. */
export const PROG_KEY = "tb-progression-v1";
export interface ProgState {
  taught: string[];
  fails: Record<string, number>;
}
export function readProg(): ProgState {
  try {
    const o = JSON.parse(localStorage.getItem(PROG_KEY) ?? "{}") as Partial<ProgState>;
    return { taught: Array.isArray(o.taught) ? o.taught.filter((x) => typeof x === "string") : [], fails: o.fails && typeof o.fails === "object" ? o.fails : {} };
  } catch {
    return { taught: [], fails: {} };
  }
}
function writeProg(p: ProgState): ProgState {
  try {
    localStorage.setItem(PROG_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
  return p;
}
export const markTaught = (id: string) => {
  const p = readProg();
  return p.taught.includes(id) ? p : writeProg({ ...p, taught: [...p.taught, id] });
};
export const noteRun = (id: string, failed: boolean) => {
  const p = readProg();
  return failed ? writeProg({ ...p, fails: { ...p.fails, [id]: (p.fails[id] ?? 0) + 1 } }) : p;
};
/** The SLOW valve: offered after two runs of a fugue the crowd ended. */
export const SLOW_AFTER_FAILS = 2;
export const slowOffered = (id: string): boolean => APP.progression && (readProg().fails[id] ?? 0) >= SLOW_AFTER_FAILS;

/**
 * The finer grades (the owner's A+ to E): A+ 95% and every entry captured (today's S), A 90%, B 80%,
 * C 70%, D 60%, E finished under 60%. The share as gradeOf's (a stray strike half a note).
 */
export function fineGrade(r: { right: number; of: number; stray?: number }, allEntries: boolean): string {
  const acc = r.right / Math.max(1, r.of + (r.stray ?? 0) / 2);
  return acc >= 0.95 && allEntries ? "A+" : acc >= 0.9 ? "A" : acc >= 0.8 ? "B" : acc >= 0.7 ? "C" : acc >= 0.6 ? "D" : "E";
}
/** today's grade (S..D) in the finer scale's name, where the run's share is not at hand. */
export const fineName = (g: string) => (g === "S" ? "A+" : g);

/** The profile the mode's stored keys live under (lab-main.tsx). */
export const PROFILE = "tb-prog:";

/** The sentinel a stage's tutorial queue ends on: its fugue (BenchApp's beginManual). */
export const PLAY_FUGUE = "§fugue";

/** The result's NEXT in the mode: the open stage's first unfinished fugue, other than the one just played. */
export function progNext(id: string, beaten: readonly string[]): string | null {
  const won = new Set(beaten);
  const open = openStage(beaten);
  const s = STAGES[open - 1];
  if (!s || !s.lessons.length) return null;
  return s.fugues.find((x) => x !== id && !won.has(x)) ?? null;
}

/**
 * The mode's own profile: every key the page stores in localStorage kept under PROFILE (the Storage
 * methods wrapped once, before the first render), so the page starts as a new player's would and leaves
 * the device's play.html progress as it was. `resetProfile` wipes the profile alone.
 */
let raw: { get: Storage["getItem"]; set: Storage["setItem"]; del: Storage["removeItem"]; key: Storage["key"] } | null = null;
export function installProfile(): void {
  if (raw || typeof Storage === "undefined") return;
  const P = Storage.prototype;
  raw = { get: P.getItem, set: P.setItem, del: P.removeItem, key: P.key };
  const r = raw;
  const k = (key: string) => (key.startsWith(PROFILE) ? key : PROFILE + key);
  P.getItem = function (key: string) {
    return r.get.call(this, k(key));
  };
  P.setItem = function (key: string, v: string) {
    return r.set.call(this, k(key), v);
  };
  P.removeItem = function (key: string) {
    return r.del.call(this, k(key));
  };
}
export function resetProfile(): void {
  if (!raw) return;
  const s = localStorage;
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = raw.key.call(s, i);
    if (key?.startsWith(PROFILE)) keys.push(key);
  }
  for (const key of keys) raw.del.call(s, key);
}
