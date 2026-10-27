/**
 * D317, THE LAB's mechanics: every judging and gesture parameter of the game in one mutable object,
 * read by the engine (proto-game.ts, articulation.ts, free-ornament.ts) where it used to read module
 * constants. Its defaults are the game's (test/lab-mechanics.test.ts holds them equal to the constants
 * they replace), so play.html behaves exactly as before; the lab (lab.html) changes them live, and a
 * run's log replays through the engine with any of them changed (src/bench/lab/replay.ts,
 * tools/lab/replay.ts).
 *
 * To add a parameter: a field in MECH_DEFAULTS, a row in MECH_SPEC (the lab draws its control from the
 * row: a number's slider, a switch, a choice), and the engine reading `MECH.<key>`. A choice's options
 * are listed in its row, so a new option (e.g. another direction reference) appears in the lab as soon
 * as the row names it.
 */

export const MECH_DEFAULTS = {
  // TIMING: the window round each note (proto-game.ts; lanes.ts options "easy": 250 ms either side).
  /** How early a touch may take a note (ms). */
  earlyMs: 250,
  /** How late a touch may take a note (ms). */
  lateMs: 250,
  /** D290: on LADDER a note's window stops halfway to its neighbours. */
  splitHalfway: true,
  /** D290 SPLIT_FLOOR_MS: the narrowest window a note keeps on either side (ms). */
  splitFloorMs: 60,
  /** PERFECT_MS: a right note this near its time is PERFECT (ms). */
  perfectMs: 70,
  /** D290 DOUBLE_MS: a contact this soon after a note was struck is the same strike doubled, ignored (ms). */
  doubleMs: 120,
  /** D299 BT_EARLY_MS, BT_LATE_MS: BLUETOOTH MODE widens the window by these (ms). */
  btEarlyMs: 20,
  btLateMs: 25,
  // LADDER: relative judging (D286, D289, D296).
  /** LADDER_ROW_MIN: the smallest row (px) a touch is judged by. */
  ladderRowMin: 18,
  /** Where a thumb's moves are measured from: its own last touch (D286). */
  directionRef: "own" as "own",
  /** OWN_FRESH_S: how long a thumb's last touch stays its reference (s). */
  ownFreshS: 3,
  /** A repeated note: the thumb within this many rows of its last touch. */
  repeatRows: 2.5,
  /** D289: a step or a third may go this many rows the wrong way (a landing's scatter). */
  stepLeewayRows: 1,
  /** A fourth or more from the last touch: at least this many rows the right way. */
  leapRows: 0.5,
  /** TRAVEL_MIN: the line's travel over a fourth or more: at least this many rows the right way. */
  travelMin: 0.25,
  /** EDGE_SHARE: the share of a bar's height at each end where a thumb that travelled there may stay. */
  edgeShare: 0.12,
  // LEGATO (articulation.ts, D289).
  /** LEGATO_GAP_MS: a note let go at most this long before the next is struck still joins it (ms)... */
  legatoGapMs: 90,
  /** LEGATO_GAP_SHARE: ...or this share of the note's length, whichever is longer. */
  legatoGapShare: 0.35,
  // SLIDES (D208, D289).
  /** A held thumb moved on to the next note plays it. */
  slides: true,
  /** SLIDE_MIN_PX: the least travel that slides (px). */
  slideMinPx: 10,
  /** The thumb within this many rows of the next note's drawn height. */
  slideReachRows: 0.5,
  // ORNAMENTS (D278, D314).
  /** D314: a shake on a plain held note plays a free mordent or trill. */
  freeOrnaments: true,
  /** A shake's leg: at least this many rows... */
  shakeReachRows: 0.4,
  /** ...and at least this many px. */
  shakeReachMinPx: 6,
  /** free-ornament.ts SHAKE_WINDOW_MS: each turn within this long of the leg before (ms). */
  shakeWindowMs: 300,
  /** free-ornament.ts SHAKE_STEEP: a leg's travel along the bar at least this many times its travel across. */
  shakeSteep: 1.5,
  // EXPRESSION AND CANCELS.
  /** D311: where a thumb lands across its bar shapes the attack; moving sideways the sustain. */
  expression: true,
  /**
   * A touch the system takes back (pointercancel): D308 "overlap" (the note rings to its end only while
   * another thumb is down, else it stops there), D293 "always" (it always rings to its end), or "lift"
   * (judged as a plain lift).
   */
  cancel: "overlap" as "overlap" | "always" | "lift",
};

export type Mech = { -readonly [K in keyof typeof MECH_DEFAULTS]: (typeof MECH_DEFAULTS)[K] };
export type MechKey = keyof Mech;

/** The parameters in force (the lab changes them; the game never does). */
export const MECH: Mech = { ...MECH_DEFAULTS };

export function resetMech() {
  Object.assign(MECH, MECH_DEFAULTS);
}

/** Sets some parameters (unknown keys ignored; values coerced to the default's type). Returns the keys set. */
export function setMech(values: Partial<Record<string, unknown>>): MechKey[] {
  const set: MechKey[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (!(k in MECH_DEFAULTS)) continue;
    const key = k as MechKey;
    const d = MECH_DEFAULTS[key];
    const val = typeof d === "number" ? Number(v) : typeof d === "boolean" ? v === true || v === "true" || v === 1 || v === "1" || v === "on" : String(v);
    if (typeof d === "number" && !Number.isFinite(val)) continue;
    (MECH as Record<string, unknown>)[key] = val;
    set.push(key);
  }
  return set;
}

/** Runs fn with some parameters set, restoring them after (the replay's). */
export function withMech<T>(values: Partial<Record<string, unknown>> | undefined, fn: () => T): T {
  const was = { ...MECH };
  try {
    resetMech();
    if (values) setMech(values);
    return fn();
  } finally {
    Object.assign(MECH, was);
  }
}

/** The parameters that differ from the defaults (for a log, a link, a diff). */
export function mechChanges(m: Partial<Mech> = MECH): Partial<Mech> {
  const out: Partial<Record<MechKey, unknown>> = {};
  for (const k of Object.keys(MECH_DEFAULTS) as MechKey[]) if (k in m && m[k] !== MECH_DEFAULTS[k]) out[k] = m[k];
  return out as Partial<Mech>;
}

/** One control of the lab's MECHANICS panel. */
export type MechSpec =
  | { key: MechKey; group: string; label: string; help: string; kind: "number"; min: number; max: number; step: number; unit?: string }
  | { key: MechKey; group: string; label: string; help: string; kind: "bool" }
  | { key: MechKey; group: string; label: string; help: string; kind: "choice"; options: readonly (readonly [value: string, label: string])[] };

export const MECH_SPEC: readonly MechSpec[] = [
  { key: "earlyMs", group: "TIMING", label: "Early window", help: "How early a touch may take a note.", kind: "number", min: 40, max: 400, step: 5, unit: "ms" },
  { key: "lateMs", group: "TIMING", label: "Late window", help: "How late a touch may take a note.", kind: "number", min: 40, max: 400, step: 5, unit: "ms" },
  { key: "splitHalfway", group: "TIMING", label: "Split windows halfway", help: "A note's window stops halfway to its neighbours (D290), so one touch never takes the next note.", kind: "bool" },
  { key: "splitFloorMs", group: "TIMING", label: "Split floor", help: "The narrowest a split window gets on either side.", kind: "number", min: 20, max: 200, step: 5, unit: "ms" },
  { key: "perfectMs", group: "TIMING", label: "PERFECT within", help: "A right note this near its time scores PERFECT, else GOOD.", kind: "number", min: 20, max: 200, step: 5, unit: "ms" },
  { key: "doubleMs", group: "TIMING", label: "Double contact", help: "A second contact this soon after a strike is ignored (a rolling thumb).", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "btEarlyMs", group: "TIMING", label: "Bluetooth: extra early", help: "BLUETOOTH MODE widens the window early by this.", kind: "number", min: 0, max: 100, step: 5, unit: "ms" },
  { key: "btLateMs", group: "TIMING", label: "Bluetooth: extra late", help: "BLUETOOTH MODE widens the window late by this.", kind: "number", min: 0, max: 100, step: 5, unit: "ms" },
  { key: "directionRef", group: "LADDER", label: "Direction measured from", help: "Where a thumb's move is measured from.", kind: "choice", options: [["own", "Its own last touch"]] },
  { key: "ladderRowMin", group: "LADDER", label: "Smallest row", help: "Rows are the box's step height, never smaller than this; the other LADDER sizes are in rows.", kind: "number", min: 8, max: 40, step: 1, unit: "px" },
  { key: "ownFreshS", group: "LADDER", label: "Last touch counts for", help: "After this long (or after a slide) a thumb's next touch is free.", kind: "number", min: 0.5, max: 10, step: 0.5, unit: "s" },
  { key: "repeatRows", group: "LADDER", label: "Repeat band", help: "A repeated note: within this many rows of the last touch.", kind: "number", min: 0.5, max: 6, step: 0.25, unit: "rows" },
  { key: "stepLeewayRows", group: "LADDER", label: "Step leeway", help: "A step or third may land this many rows the wrong way.", kind: "number", min: 0, max: 3, step: 0.25, unit: "rows" },
  { key: "leapRows", group: "LADDER", label: "Leap needs", help: "A fourth or more: at least this many rows the right way.", kind: "number", min: 0, max: 3, step: 0.05, unit: "rows" },
  { key: "travelMin", group: "LADDER", label: "Line travel (TRAVEL_MIN)", help: "Over a fourth or more of the line, the thumb must have moved this many rows the right way.", kind: "number", min: 0, max: 2, step: 0.05, unit: "rows" },
  { key: "edgeShare", group: "LADDER", label: "Bar end (EDGE_SHARE)", help: "A thumb that travelled into the bar's end (this share of its height) may stay there.", kind: "number", min: 0, max: 0.4, step: 0.01 },
  { key: "legatoGapMs", group: "LEGATO", label: "Legato gap", help: "A note let go at most this long before the next is struck still joins it…", kind: "number", min: 0, max: 300, step: 5, unit: "ms" },
  { key: "legatoGapShare", group: "LEGATO", label: "…or share of the note", help: "…or this share of the note's length, whichever is longer.", kind: "number", min: 0, max: 1, step: 0.05 },
  { key: "slides", group: "SLIDES", label: "Slides", help: "A held thumb moved on to the next note plays it.", kind: "bool" },
  { key: "slideMinPx", group: "SLIDES", label: "Slide threshold", help: "The least travel of a held thumb that slides.", kind: "number", min: 2, max: 60, step: 1, unit: "px" },
  { key: "slideReachRows", group: "SLIDES", label: "Slide reach", help: "The thumb must come within this many rows of the next note's height.", kind: "number", min: 0, max: 3, step: 0.1, unit: "rows" },
  { key: "freeOrnaments", group: "ORNAMENTS", label: "Free ornaments", help: "A shake on a plain held note plays a mordent or trill (D314).", kind: "bool" },
  { key: "shakeReachRows", group: "ORNAMENTS", label: "Shake leg", help: "Each leg of a shake travels this many rows (written and free ornaments)…", kind: "number", min: 0.1, max: 2, step: 0.05, unit: "rows" },
  { key: "shakeReachMinPx", group: "ORNAMENTS", label: "…at least", help: "…and at least this many px.", kind: "number", min: 2, max: 30, step: 1, unit: "px" },
  { key: "shakeWindowMs", group: "ORNAMENTS", label: "Shake speed", help: "A free shake's legs must follow each other within this.", kind: "number", min: 100, max: 800, step: 10, unit: "ms" },
  { key: "shakeSteep", group: "ORNAMENTS", label: "Shake steepness", help: "A leg along the bar: its up-down travel at least this many times its sideways travel.", kind: "number", min: 0.5, max: 4, step: 0.1, unit: "×" },
  { key: "expression", group: "EXPRESSION", label: "Expression (D311)", help: "Where a thumb lands across its bar shapes the attack; sideways while held, the sustain.", kind: "bool" },
  { key: "cancel", group: "CANCELS", label: "A touch the phone takes back", help: "iOS sometimes cancels a touch when the other thumb lands.", kind: "choice", options: [["overlap", "Rings on while the other thumb is down (D308)"], ["always", "Always rings to its end (D293)"], ["lift", "Counts as a lift"]] },
];

/** A parameter's label and value as a short phrase ("Legato gap 100 ms"). */
export function mechPhrase(key: MechKey, value: unknown = MECH[key]): string {
  const s = MECH_SPEC.find((x) => x.key === key);
  if (!s) return `${key} ${String(value)}`;
  if (s.kind === "bool") return `${s.label} ${value ? "on" : "off"}`;
  if (s.kind === "choice") return `${s.label}: ${s.options.find(([v]) => v === value)?.[1] ?? String(value)}`;
  return `${s.label} ${String(value)}${s.unit ? ` ${s.unit}` : ""}`;
}
