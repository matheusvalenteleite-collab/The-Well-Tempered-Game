/**
 * D342, THE MANUAL's memory: `tb-tutorial-v2`, the phone's tutorial: each lesson passed (tries, best,
 * when), tried, set aside (D289's SKIP FOR NOW), its last takes' figures; each part sealed. Carried over
 * once from the old tutorial's memory (`tb-tutorial-v1`, the phone's track), which stays as it was.
 *
 * D373 (the tutorial rebuilt: Parts 1–3 on the Inventions, the older III–V after them): the same key, the
 * record now `v: 3`. Each lesson also keeps the steps finished (WATCH, TRY, PLAY: `steps`, by index) and
 * the furthest begun (`reached`, D369): its tile's chips resume any finished one, CONTINUE where it
 * stopped. Every part is open (the order a suggestion; the game itself never locked). A `v: 2` record is
 * carried once: its own lessons kept as they were (III–V unchanged), and the new lessons that teach what
 * a passed old one taught marked passed, `carried` (CARRY: I.1 → 1.2 and 1.3, II.1 → 1.4, I.2 → 2.1 …;
 * an old part sealed carries its whole new part). Nobody who passed the old lessons redoes them; what the
 * old ones never taught (1.1's tour of the screen is the only one) is offered as NEXT.
 */
import { checkpointOf, lessonsOf, MANUAL, PARTS, PLAYED, type PartId } from "./lessons.ts";

export const MANUAL_KEY = "tb-tutorial-v2";
export const OLD_TUTORIAL_KEY = "tb-tutorial-v1";

export interface LessonRec {
  passed?: { tries: number; best: number; ms: number };
  /** D342's TESTED (a part tested out of): kept from older records, counted as done. */
  tested?: true;
  tries?: number;
  later?: true;
  /** Begun at least once. */
  seen?: true;
  /** The last three takes of its PLAY: when, the share right, passed. */
  takes?: { ms: number; right: number; ok: boolean }[];
  /** D369: the furthest stage begun (its index): the lesson may be taken up again from any stage up to it. */
  reached?: number;
  /** D373: the steps finished (their indices): a WATCH watched, a TRY tried, a PLAY passed. */
  steps?: number[];
  /** D373: passed by an old lesson that taught the same (CARRY), not played here. */
  carried?: true;
}

export interface ManualStore {
  v: 3;
  lessons: Record<string, LessonRec>;
  parts: Partial<Record<PartId | "0" | "I" | "II", "passed" | "tested">>;
  /** Carried over from tb-tutorial-v1 (once). */
  migrated?: true;
  /** D373: carried over from the record before the rebuild (v: 2), once. */
  carried?: true;
  /** D379: the older Parts III–V's records carried to the rebuilt Parts 4–6 (CARRY4), once. */
  carried4?: true;
  /** D402: the play screen's elements already introduced by his bubbles (dress.ts DressId), each once. */
  dressed?: string[];
}

const fresh = (): ManualStore => ({ v: 3, lessons: {}, parts: {} });
type Store = Pick<Storage, "getItem" | "setItem">;
const storage = (): Store | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * D342: the old tutorial's steps (TUTORIAL_LESSONS, the phone's track) and the old lessons they marked.
 * D373: carried on from there by CARRY.
 */
export const MIGRATION: Record<string, string[]> = {
  "t-beat": ["I.1"],
  "t-ladder": ["I.2"],
  "t-hold": ["I.4"],
  "t-thumbs": ["II.1"],
  "t-legato": ["II.3"],
  "t-leaps": ["II.5"],
  "t-ornament": ["V.1"],
  "t-reading": ["III.3"],
  "t-whole": ["II.7"],
};

/**
 * D373: an old lesson passed (or tested) and the new lessons that teach what it taught. The old Parts 0–II
 * are withdrawn; III–V stay (their records unchanged), and three of III's carry Part 3's signs.
 */
export const CARRY: Record<string, string[]> = {
  "0.1": ["1.1"],
  "I.1": ["1.2", "1.3"],
  "I.2": ["2.1"],
  "I.3": ["2.2"],
  "I.4": ["3.1"],
  "I.5": ["1.2", "1.3", "1.5"],
  "II.1": ["1.4"],
  "II.3": ["3.3"],
  "II.4": ["3.4"],
  "II.5": ["2.1"],
  "II.6": ["2.3"],
  "II.7": ["2.4"],
  "III.1": ["3.6"],
  "III.2": ["3.2"],
  "III.4": ["3.5"],
  "III.5": ["3.6"],
};
/**
 * D379: the older Parts III–V (retired.ts) and the rebuilt lessons that teach what each taught: a lesson
 * of theirs passed (or tested) marks these passed, `carried`, once (the same v: 3 record; nothing wiped:
 * the old records stay as they were). The new parts' other lessons (4.x, the colour, the slide, the ring,
 * the struck sigh) taught nothing before, so they are offered.
 */
export const CARRY4: Record<string, string[]> = {
  "IV.1": ["5.1"],
  "IV.2": ["5.3"],
  "IV.5": ["5.2"],
  "IV.6": ["5.4"],
  "V.1": ["6.1"],
  "V.2": ["6.1"],
  "V.3": ["6.2"],
  "V.5": ["6.3"],
};
/** D379: the records of III–V carried to 4–6 (see CARRY4); a part whose checkpoint is now passed, sealed. */
export function carry4(s: ManualStore): ManualStore {
  const out: ManualStore = { ...s, lessons: { ...s.lessons }, parts: { ...s.parts }, carried4: true };
  const done = (id: string) => !!(s.lessons[id]?.passed || s.lessons[id]?.tested);
  for (const [o, ids] of Object.entries(CARRY4))
    if (done(o))
      for (const id of ids) {
        if (out.lessons[id]?.passed) continue;
        const p = s.lessons[o]?.passed;
        out.lessons[id] = { ...out.lessons[id], passed: { tries: p?.tries ?? 1, best: p?.best ?? 1, ms: p?.ms ?? 0 }, carried: true };
      }
  for (const p of PARTS) {
    const cp = checkpointOf(p.id);
    if (cp && out.lessons[cp.id]?.passed && !out.parts[p.id]) out.parts[p.id] = "passed";
  }
  return out;
}
/** D373: an old part sealed (its checkpoint passed, or tested out of) carries a whole new part. */
export const CARRY_PART: Record<string, PartId[]> = { I: ["1"], II: ["1", "2"], III: ["3"] };

/** The old store (v: 2's shape) made from the old tutorial's phone track (null: nothing to carry over). */
export function migrate(old: unknown): { lessons: Record<string, LessonRec>; parts: Record<string, "passed"> } | null {
  const m = (old as { mobile?: { passed?: Record<string, { tries?: number; best?: number; ms?: number }> } } | null)?.mobile;
  if (!m) return null;
  const lessons: Record<string, LessonRec> = {};
  const passed = m.passed ?? {};
  const mark = (id: string, from: { tries?: number; best?: number; ms?: number }) => (lessons[id] = { passed: { tries: from.tries ?? 1, best: from.best ?? 0, ms: from.ms ?? 0 } });
  for (const [o, ids] of Object.entries(MIGRATION)) if (passed[o]) for (const id of ids) mark(id, passed[o]);
  if (passed["t-beat"] && passed["t-ladder"] && passed["t-hold"]) mark("I.3", passed["t-hold"]);
  const parts: Record<string, "passed"> = {};
  if (lessons["II.7"]) parts.II = "passed";
  return { lessons, parts };
}

/** D373: a record of before the rebuild (v: 2, or v1's carried) as v: 3, the new lessons it covers passed. */
export function carry(old: { lessons?: Record<string, LessonRec>; parts?: Record<string, string> }): ManualStore {
  const s = fresh();
  s.carried = true;
  s.lessons = { ...(old.lessons ?? {}) };
  for (const [p, v] of Object.entries(old.parts ?? {})) if (v === "passed" || v === "tested") s.parts[p as PartId] = v;
  const done = (id: string) => !!(old.lessons?.[id]?.passed || old.lessons?.[id]?.tested);
  const give = (id: string, from?: LessonRec) => {
    if (s.lessons[id]?.passed) return;
    const p = from?.passed;
    s.lessons[id] = { ...s.lessons[id], passed: { tries: p?.tries ?? 1, best: p?.best ?? 1, ms: p?.ms ?? 0 }, carried: true };
  };
  for (const [o, ids] of Object.entries(CARRY)) if (done(o) || (o === "0.1" && old.lessons?.["0.1"]?.seen)) for (const id of ids) give(id, old.lessons?.[o]);
  for (const [o, ps] of Object.entries(CARRY_PART)) if (old.parts?.[o] === "passed" || old.parts?.[o] === "tested") for (const p of ps) for (const l of lessonsOf(p)) give(l.id);
  for (const p of PARTS) {
    const cp = checkpointOf(p.id);
    if (cp && s.lessons[cp.id]?.passed && !s.parts[p.id]) s.parts[p.id] = "passed";
  }
  return s;
}

export function readManual(st: Store | null = storage()): ManualStore {
  if (!st) return fresh();
  try {
    const raw = st.getItem(MANUAL_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { v?: number } & Partial<ManualStore>;
      if (s && s.v === 3) {
        const r: ManualStore = { ...fresh(), ...s, v: 3, lessons: { ...s.lessons }, parts: { ...s.parts } };
        if (r.carried4) return r;
        // D379: once, the older III–V carried to the rebuilt 4–6 (kept as they were besides).
        const c = carry4(r);
        st.setItem(MANUAL_KEY, JSON.stringify(c));
        return c;
      }
      // D373: the record before the rebuild, carried once.
      if (s && (s.v as number) === 2) {
        const c = carry4(carry(s as never));
        st.setItem(MANUAL_KEY, JSON.stringify(c));
        return c;
      }
    }
    // Once: the old tutorial's phone track carried over (it is left as it was).
    const old = st.getItem(OLD_TUTORIAL_KEY);
    const made = old ? migrate(JSON.parse(old)) : null;
    const s = made ? { ...carry4(carry(made)), migrated: true as const } : { ...fresh(), carried4: true as const };
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

/** D373: every built part is open (the order a suggestion; the owner's friends free to go where they like). */
export const partOpen = (_s: ManualStore, p: PartId): boolean => PARTS.some((x) => x.id === p && x.phase !== "later");
export const lessonOpen = (s: ManualStore, id: string) => {
  const l = MANUAL.find((x) => x.id === id);
  return !!l && partOpen(s, l.part);
};
export const lessonDone = (s: ManualStore, id: string) => !!(s.lessons[id]?.passed || s.lessons[id]?.tested);

/** The lesson suggested next: the first, in order, neither passed nor set aside (null: none left). */
export function nextLesson(s: ManualStore): string | null {
  for (const l of MANUAL) {
    if (!partOpen(s, l.part) || lessonDone(s, l.id) || s.lessons[l.id]?.later) continue;
    return l.id;
  }
  return null;
}

/** A take of a lesson's last PLAY: counted; passed, kept with its best share right (a checkpoint seals its part). */
export function recordTake(id: string, right: number, ok: boolean, st: Store | null = storage(), now = Date.now()): ManualStore {
  return update((s) => {
    const r: LessonRec = { ...s.lessons[id] };
    const tries = (r.tries ?? 0) + 1;
    if (r.passed) r.passed = { ...r.passed, best: Math.max(r.passed.best, right) };
    else if (ok) r.passed = { tries, best: right, ms: now };
    r.tries = r.passed ? undefined : tries;
    if (ok) delete r.later, delete r.carried;
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
/**
 * D369 (the owner: "If I quit a lesson midway … I have to restart from beginning. BAD"): a stage begun is
 * kept as the furthest reached; choosing the lesson again offers every stage up to it.
 */
export const reachStage = (id: string, k: number, st: Store | null = storage()) => update((s) => void (s.lessons[id] = { ...s.lessons[id], reached: Math.max(k, s.lessons[id]?.reached ?? 0) }), st);
export const reachedOf = (s: ManualStore, id: string) => s.lessons[id]?.reached ?? 0;
/** D373: a step finished (a WATCH watched, a TRY tried, a PLAY passed). */
export const finishStep = (id: string, k: number, st: Store | null = storage()) =>
  update((s) => {
    const r = s.lessons[id] ?? {};
    s.lessons[id] = { ...r, steps: [...new Set([...(r.steps ?? []), k])].sort((a, b) => a - b) };
  }, st);
/** D402: the screen's elements introduced so far (none in an older record: each is introduced once, where it first shows). */
export const dressedOf = (s: ManualStore): string[] => s.dressed ?? [];
/** D402: elements introduced (his bubbles seen), kept. */
export const markDressed = (ids: readonly string[], st: Store | null = storage()) => update((s) => void (s.dressed = [...new Set([...(s.dressed ?? []), ...ids])]), st);
/** D373: the steps finished; a lesson passed has all of them. */
export function stepsDone(s: ManualStore, id: string): number[] {
  const l = MANUAL.find((x) => x.id === id);
  if (!l) return [];
  if (lessonDone(s, id)) return l.stages.map((_, k) => k);
  return s.lessons[id]?.steps ?? [];
}
/** D373: where CONTINUE takes a lesson up: its first step not finished (from the beginning once passed). */
export function resumeAt(s: ManualStore, id: string): number {
  const l = MANUAL.find((x) => x.id === id);
  if (!l || lessonDone(s, id)) return 0;
  const done = new Set(s.lessons[id]?.steps ?? []);
  const k = l.stages.findIndex((_, i) => !done.has(i));
  return k < 0 ? Math.max(0, l.stages.length - 1) : k;
}

/** The manual's progress on the phone: lessons passed, of all of them. */
export function progress(s: ManualStore): { done: number; of: number } {
  return { done: PLAYED.filter((l) => lessonDone(s, l.id)).length, of: PLAYED.length };
}

/** D327's "the tutorial behind the player" on the phone: D373: Part 2 (high and low) sealed, or an older part carried. */
export const manualBehind = (s: ManualStore) => !!s.parts["2"] || !!s.parts.II || !!s.parts["3"];
