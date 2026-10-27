/**
 * D342, THE MANUAL's memory (design 4.8, section 3): `tb-tutorial-v2`, the phone's manual: the answer to
 * HAVE YOU PLAYED BEFORE?, each lesson passed (tries, best, when), TESTED (placed past, or tested out of),
 * tried, set aside (D289's SKIP FOR NOW), its last takes' figures; each part's checkpoint passed or
 * tested; the parts the placement opened; the placement's results. Carried over once from the old
 * tutorial's memory (`tb-tutorial-v1`, the phone's track), which stays as it was (the computer's
 * HIGHWAY lessons still live there).
 *
 * Gating (section 3): the game is never locked by the manual. Part 0 and Part I are open from the
 * start; a part opens when the part before it is passed (its checkpoint) or TESTED, or when it is tested
 * out of itself (ICH KANN DAS SCHON: its checkpoint played once and passed). Inside an open part every
 * lesson is open; the order is a suggestion. Answering YES without the test opens every part.
 */
import { checkpointOf, MANUAL, PARTS, PLAYED, type PartId } from "./lessons.ts";

export const MANUAL_KEY = "tb-tutorial-v2";
export const OLD_TUTORIAL_KEY = "tb-tutorial-v1";

export interface LessonRec {
  passed?: { tries: number; best: number; ms: number };
  tested?: true;
  tries?: number;
  later?: true;
  /** Begun at least once (its steps may be skipped after). */
  seen?: true;
  /** The last three takes of its PLAY: when, the share right, passed. */
  takes?: { ms: number; right: number; ok: boolean }[];
}

export type Answer = "no" | "other" | "keyboard";

export interface ManualStore {
  v: 2;
  /** HAVE YOU PLAYED BEFORE? (null: not answered yet). */
  answer: Answer | null;
  /** YES without the test: every part open (the old "played before: YES"). */
  allOpen: boolean;
  lessons: Record<string, LessonRec>;
  parts: Partial<Record<PartId, "passed" | "tested">>;
  /** Parts opened by the placement (III and IV: their own lessons come in later phases). */
  opened: PartId[];
  placement?: { ms: number; results: { id: string; right: number; ok: boolean }[] };
  /** Carried over from tb-tutorial-v1 (once). */
  migrated?: true;
}

const fresh = (): ManualStore => ({ v: 2, answer: null, allOpen: false, lessons: {}, parts: {}, opened: [] });
type Store = Pick<Storage, "getItem" | "setItem">;
const storage = (): Store | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * The old tutorial's steps (TUTORIAL_LESSONS, the phone's track) and the lessons they mark (design 3,
 * "Migration"). t-ladder, t-beat and t-hold together mark I.1–I.4: each its own (the beat I.1, the
 * ladder I.2, the hold I.4) and, all three passed, I.3 too. t-dynamics (it judged loudness) has none.
 */
export const MIGRATION: Record<string, string[]> = {
  "t-beat": ["I.1"],
  "t-ladder": ["I.2"],
  "t-hold": ["I.4"],
  "t-thumbs": ["II.1"],
  "t-legato": ["II.3"],
  "t-leaps": ["II.5"],
  "t-ornament": ["V.1"],
  "t-subject": ["VI.1"],
  "t-reading": ["III.3"],
  "t-whole": ["II.7", "VIII.1"],
};

/** The new store made from the old one's phone track (null: nothing to carry over). */
export function migrate(old: unknown): ManualStore | null {
  const m = (old as { mobile?: { answered?: boolean; skipped?: boolean; passed?: Record<string, { tries?: number; best?: number; ms?: number }> } } | null)?.mobile;
  if (!m) return null;
  const s = fresh();
  s.migrated = true;
  if (m.answered) s.answer = m.skipped ? "other" : "no";
  if (m.answered && m.skipped) s.allOpen = true;
  const passed = m.passed ?? {};
  const mark = (id: string, from: { tries?: number; best?: number; ms?: number }) => {
    s.lessons[id] = { ...s.lessons[id], passed: { tries: from.tries ?? 1, best: from.best ?? 0, ms: from.ms ?? 0 } };
  };
  for (const [old, ids] of Object.entries(MIGRATION)) if (passed[old]) for (const id of ids) mark(id, passed[old]);
  if (passed["t-beat"] && passed["t-ladder"] && passed["t-hold"]) mark("I.3", passed["t-hold"]);
  // A checkpoint carried over passes its part.
  for (const p of PARTS) {
    const cp = checkpointOf(p.id);
    if (cp && s.lessons[cp.id]?.passed) s.parts[p.id] = "passed";
  }
  return s;
}

export function readManual(st: Store | null = storage()): ManualStore {
  if (!st) return fresh();
  try {
    const raw = st.getItem(MANUAL_KEY);
    if (raw) {
      const s = JSON.parse(raw) as ManualStore;
      if (s && s.v === 2) return { ...fresh(), ...s, lessons: { ...s.lessons }, parts: { ...s.parts }, opened: [...(s.opened ?? [])] };
    }
    // Once: the old tutorial's phone track carried over (it is left as it was).
    const old = st.getItem(OLD_TUTORIAL_KEY);
    const made = old ? migrate(JSON.parse(old)) : null;
    const s = made ?? fresh();
    st.setItem(MANUAL_KEY, JSON.stringify(s));
    return s;
  } catch {
    return fresh();
  }
}

export function writeManual(s: ManualStore, st: Store | null = storage()) {
  try {
    st?.setItem(MANUAL_KEY, JSON.stringify(s));
  } catch {
    /* this visit only */
  }
}

const update = (f: (s: ManualStore) => void, st: Store | null = storage()): ManualStore => {
  const s = readManual(st);
  f(s);
  writeManual(s, st);
  return s;
};

const ORDER: PartId[] = PARTS.map((p) => p.id);
/** The part a part follows (design 3: II after I, III after II, IV after III, V and VI after II, VII after IV). */
export const AFTER: Partial<Record<PartId, PartId>> = { II: "I", III: "II", IV: "III", V: "II", VI: "II", VII: "IV", VIII: "VII" };

const done = (s: ManualStore, p: PartId) => !!s.parts[p];

/** A part open: 0 and I always; else its predecessor passed or tested, itself tested or passed, a later part's checkpoint passed, opened by the placement, or every part open. */
export function partOpen(s: ManualStore, p: PartId): boolean {
  if (p === "0" || p === "I" || s.allOpen || s.opened.includes(p) || done(s, p)) return true;
  const before = AFTER[p];
  if (before && done(s, before)) return true;
  // A later part's checkpoint passed (carried over, or tested out of) opens what leads to it.
  return ORDER.slice(ORDER.indexOf(p) + 1).some((q) => AFTER[q] === p && done(s, q));
}

export const lessonOpen = (s: ManualStore, id: string) => {
  const l = MANUAL.find((x) => x.id === id);
  return !!l && partOpen(s, l.part);
};
export const lessonDone = (s: ManualStore, id: string) => !!(s.lessons[id]?.passed || s.lessons[id]?.tested);

/** The lesson suggested next: the first open one, in order, neither passed, tested nor set aside (null: none left). */
export function nextLesson(s: ManualStore): string | null {
  for (const l of MANUAL) {
    if (!partOpen(s, l.part) || lessonDone(s, l.id) || s.lessons[l.id]?.later) continue;
    if (l.part === "0" && (l.id === "0.1" ? s.lessons["0.1"]?.seen : s.answer !== null)) continue;
    return l.id;
  }
  return null;
}

/** A take of a lesson's PLAY: counted; passed, kept with its best share right (a checkpoint passes its part). */
export function recordTake(id: string, right: number, ok: boolean, st: Store | null = storage(), now = Date.now()): ManualStore {
  return update((s) => {
    const r: LessonRec = { ...s.lessons[id] };
    const tries = (r.tries ?? 0) + 1;
    if (r.passed) r.passed = { ...r.passed, best: Math.max(r.passed.best, right) };
    else if (ok) r.passed = { tries, best: right, ms: now };
    r.tries = r.passed ? undefined : tries;
    if (ok) delete r.later;
    r.takes = [...(r.takes ?? []), { ms: now, right: Math.round(right * 1000) / 1000, ok }].slice(-3);
    s.lessons[id] = clean(r);
    const l = MANUAL.find((x) => x.id === id);
    if (ok && l?.checkpoint) s.parts[l.part] = "passed";
  }, st);
}
const clean = (r: LessonRec): LessonRec => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as LessonRec;

export const markSeen = (id: string, st: Store | null = storage()) => update((s) => void (s.lessons[id] = { ...s.lessons[id], seen: true }), st);
/** D289: set aside after three tries (open, not passed). */
export const setAside = (id: string, st: Store | null = storage()) => update((s) => void (s.lessons[id] = { ...s.lessons[id], later: true }), st);
export const triesOf = (s: ManualStore, id: string) => s.lessons[id]?.tries ?? 0;

/** HAVE YOU PLAYED BEFORE? answered; YES without the test (`allOpen`) opens every part. */
export const setAnswer = (a: Answer, allOpen: boolean, st: Store | null = storage()) =>
  update((s) => {
    s.answer = a;
    if (allOpen) s.allOpen = true;
    s.lessons["0.2"] = { ...s.lessons["0.2"], passed: s.lessons["0.2"]?.passed ?? { tries: 1, best: 1, ms: Date.now() } };
  }, st);

/** ICH KANN DAS SCHON: a part's checkpoint played once and passed: the part TESTED (its successors open). */
export const testOut = (p: PartId, st: Store | null = storage()) =>
  update((s) => {
    if (!s.parts[p]) s.parts[p] = "tested";
    for (const l of MANUAL) if (l.part === p && !s.lessons[l.id]?.passed) s.lessons[l.id] = { ...s.lessons[l.id], tested: true };
  }, st);

/** The placement's verdict applied: lessons placed past marked TESTED, their parts TESTED where the whole part is, parts opened. */
export function applyPlacement(lessons: string[], opened: PartId[], results: { id: string; right: number; ok: boolean }[], st: Store | null = storage()): ManualStore {
  return update((s) => {
    for (const id of lessons) if (!s.lessons[id]?.passed) s.lessons[id] = { ...s.lessons[id], tested: true };
    for (const p of PARTS) {
      const cp = checkpointOf(p.id);
      if (cp && lessons.includes(cp.id) && !s.parts[p.id]) s.parts[p.id] = "tested";
    }
    s.opened = [...new Set([...s.opened, ...opened])];
    s.placement = { ms: Date.now(), results };
  }, st);
}

/** The manual's progress on the phone: lessons passed or tested, of those played in Phase A. */
export function progress(s: ManualStore): { done: number; of: number } {
  return { done: PLAYED.filter((l) => lessonDone(s, l.id)).length, of: PLAYED.length };
}

/** D327's "the tutorial behind the player" on the phone: every part open by the answer, or Part II (the last of Phase A) passed or tested. */
export const manualBehind = (s: ManualStore) => s.allOpen || !!s.parts.II;
