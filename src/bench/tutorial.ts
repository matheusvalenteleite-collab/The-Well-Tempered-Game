/**
 * D225, the tutorial's memory: per platform, whether Herr Bach's "HAVE YOU PLAYED BEFORE?" has been
 * answered (and how), and each lesson passed (tries until passed, the best share right, when passed).
 * Kept in the browser as `tb-tutorial-v1`; the old count of D188 (`tb-lessons-easy`, the computer's
 * lessons passed in order) is carried over once and dropped.
 */
import { LESSONS, TRACKS, type Lesson } from "./lessons.ts";
import type { Platform } from "./protos.ts";

export const TUTORIAL_KEY = "tb-tutorial-v1";
export const OLD_LESSONS_KEY = "tb-lessons-easy";

export interface LessonRecord {
  /** The attempts it took (the passing one included). */
  tries: number;
  /** The best share right (0-1). */
  best: number;
  /** When first passed (ms since 1970; 0: carried over from the old count). */
  ms: number;
}
export interface TrackState {
  answered: boolean;
  /** Answered YES (played before): the tutorial skipped. */
  skipped: boolean;
  passed: Record<string, LessonRecord>;
  /** Attempts at a lesson not yet passed. */
  tries?: Record<string, number>;
  /** D289: steps set aside after three tries ("skip for now"): open, not passed, come back any time. */
  later?: Record<string, true>;
}
export type TutorialStore = Partial<Record<Platform, TrackState>>;

const fresh = (): TrackState => ({ answered: false, skipped: false, passed: {} });
const storage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/** What is kept (the old count carried over into the computer's track). */
export function readTutorial(): TutorialStore {
  const ls = storage();
  let store: TutorialStore = {};
  try {
    const raw = ls?.getItem(TUTORIAL_KEY);
    if (raw) store = JSON.parse(raw) as TutorialStore;
  } catch {
    store = {};
  }
  try {
    const old = ls?.getItem(OLD_LESSONS_KEY);
    if (old !== null && old !== undefined) {
      const n = Math.max(0, Math.min(LESSONS.length, Number(old) || 0));
      const c = { ...fresh(), ...store.computer };
      for (const l of LESSONS.slice(0, n)) c.passed[l.id] ??= { tries: 1, best: l.passAt, ms: 0 };
      // Someone who took lessons has played before: not asked again.
      if (n) c.answered = true;
      store = { ...store, computer: c };
      ls?.setItem(TUTORIAL_KEY, JSON.stringify(store));
      ls?.removeItem(OLD_LESSONS_KEY);
    }
  } catch {
    /* not kept */
  }
  return store;
}

function write(store: TutorialStore) {
  try {
    storage()?.setItem(TUTORIAL_KEY, JSON.stringify(store));
  } catch {
    /* not kept */
  }
}

export function trackState(pl: Platform): TrackState {
  const t = readTutorial()[pl];
  return { ...fresh(), ...t, passed: { ...t?.passed } };
}

/** Herr Bach asks HAVE YOU PLAYED BEFORE? on this platform (until it is answered there). */
export const askFirst = (pl: Platform) => !trackState(pl).answered;

/** The answer: YES (played before) skips the tutorial; NO starts it. */
export function answer(pl: Platform, playedBefore: boolean) {
  const store = readTutorial();
  store[pl] = { ...trackState(pl), answered: true, skipped: playedBefore };
  write(store);
}

/** A lesson tried: counted; passed, kept with its best share right. */
export function recordLesson(pl: Platform, id: string, share: number, ok: boolean) {
  const store = readTutorial();
  const t = trackState(pl);
  const tries = (t.tries?.[id] ?? 0) + 1;
  const was = t.passed[id];
  if (was) t.passed[id] = { ...was, best: Math.max(was.best, share) };
  else if (ok) t.passed[id] = { tries, best: share, ms: Date.now() };
  const rest = { ...t.tries };
  if (ok || was) delete rest[id];
  else rest[id] = tries;
  store[pl] = { ...t, tries: rest };
  write(store);
}

export const isPassed = (pl: Platform, l: Lesson) => !!trackState(pl).passed[l.id];

/** The lesson suggested next: the first not passed (all passed: the last). */
export function nextLesson(pl: Platform): number {
  const t = trackState(pl);
  const i = TRACKS[pl].findIndex((l) => !t.passed[l.id] && !t.later?.[l.id]);
  return i < 0 ? TRACKS[pl].length - 1 : i;
}

/** D289: a step set aside after three tries: the next one opens; this one stays open to come back to. */
export function skipLesson(pl: Platform, id: string) {
  const store = readTutorial();
  const t = trackState(pl);
  store[pl] = { ...t, later: { ...t.later, [id]: true } };
  write(store);
}

/** D289: the tries at a step not yet passed. */
export const triesAt = (pl: Platform, id: string) => trackState(pl).tries?.[id] ?? 0;

/** D327: the tutorial behind the player on this platform: every step passed, or skipped (HAVE YOU PLAYED BEFORE? YES). */
export function tutorialDone(pl: Platform): boolean {
  const t = trackState(pl);
  return t.skipped || TRACKS[pl].every((l) => !!t.passed[l.id]);
}
