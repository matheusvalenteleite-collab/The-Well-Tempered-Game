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
  /**
   * Where a thumb's moves are measured from: its own last touch (D286), or (D318 "either") also from the
   * note the other thumb still holds, plainly the right way (a slur placed "from the note I'm holding").
   */
  directionRef: "own" as "own" | "either",
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
  /** D319 TRILL_PER_SECOND: a trill's speed, notes a second (taken to the nearest subdivision of the beat). */
  trillPerSecond: 10,
  /** D319 TRILL_SETTLE: a long trill's main note settles for this share of the note at its end. */
  trillSettle: 0.15,
  /** D319: the player's trill goes on while the thumb shakes and settles on the main note when it stops (off: the first shake plays the whole trill). */
  trillFollowsShake: true,
  /** D319: the thumb has stopped shaking when no leg came for this long (ms). */
  trillStopMs: 250,
  // EXPRESSION AND CANCELS.
  /** D311: where a thumb lands across its bar shapes the attack; moving sideways the sustain. */
  expression: true,
  /**
   * A touch the system takes back (pointercancel): D308 "overlap" (the note rings to its end only while
   * another thumb is down, else it stops there), D293 "always" (it always rings to its end), or "lift"
   * (judged as a plain lift).
   */
  cancel: "overlap" as "overlap" | "always" | "lift",
  // SLURS (D318: the owner, "more accepting of slurs"; proto-game.ts thumbSide, slurNext, slideTaken).
  /** A touch landing on the half of the screen where the other thumb is down (the other half free) is the other thumb. */
  thumbCross: true,
  /** While the other thumb holds the note before, a landing (not that thumb's own roll) is for the next note: struck early, or waiting for it. */
  slurNext: true,
  /** ...struck up to this share of the time between the two onsets early... */
  slurEarlyShare: 0.5,
  /** ...and at most this early (ms); landed earlier it waits, down, and strikes then. */
  slurEarlyMaxMs: 250,
  /** Two thumbs landing closer than this (ms) are a chord pressed, not a slur. */
  slurRollMinMs: 40,
  /** A contact this close (px) to a thumb still down is that thumb's own (a roll: D290's double contact), not the other thumb. */
  sameThumbPx: 24,
  /** A thumb landing on the note the other thumb's drift has just slid onto takes it over, joined. */
  slideTakeover: true,
  /** ...within this long of the slide (ms). */
  slideTakeMs: 120,
  /** A note joined within the legato gap (a handover, a touch taken back) sounds joined: no fresh attack. */
  joinedSound: true,
  /** A touch taken back with no other thumb down still ends its note for the join (a slur's second thumb a moment later). */
  cancelJoins: true,
  // DRAG (D321: the owner's Decision 13, "the drag: one connection per instrument … try it in the Lab first").
  /**
   * What a drag (a held thumb slid on to the next note) means: "join" (D218: sounds joined, earns nothing,
   * breaks the chain) or "connect" (drag.ts: a glide on a sound that bends, a coulé or a Schleifer on a
   * keyboard; counts as joined for the legato credit, earns nothing more).
   */
  dragMeaning: "join" as "join" | "connect",
  /** "connect", a passage: the glide lasts the drag's time, at most this share of the arriving note. */
  glideMaxShare: 0.5,
  /** "connect", a keyboard dragged up a third: the passing note (coulé) or the Schleifer (from a third below, the held note struck again). */
  upThird: "schleifer" as "coule" | "schleifer",
  /** "connect", a keyboard's fill notes: at the trill's speed, or the drag's time shared out. */
  fillTiming: "trill" as "trill" | "drag",
  // INTENTION (D325: the musicians' panel; intention.ts).
  /** A hold within this share of the player's recent median (same kind of note) is a consistent touch. */
  touchTolerance: 0.15,
  /** Articulation's points: at most this share of the run's. */
  artCap: 0.3,
  /** D325b: a strong beat or a dissonance may come this share of a beat late and be PERFECT (the next note back on the pulse). */
  agogicShare: 0.15,
  /** D325b: a re-entry after a rest or a cadence may come this late and be PERFECT (ms). */
  breathLateMs: 120,
  /** D325b: the last two bars may broaden: late up to this share of a beat by the end. */
  broadenShare: 0.2,
  // SENSOR (D321: the owner's Decision 13, "Accelerometer test first, nothing else yet"; the lab's SENSOR tab only).
  /** PLAY WITH IT: 0 starts the note at once, neutral, and sets its strength when the tap's spike is read; more delays the attack up to this long (ms) to strike it at that strength. */
  tapDelayMs: 0,
  /** PLAY WITH IT: the spike is read over this long after the touch (ms). */
  tapWindowMs: 30,
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
  { key: "directionRef", group: "LADDER", label: "Direction measured from", help: "Where a thumb's move is measured from.", kind: "choice", options: [["own", "Its own last touch"], ["either", "Or the note the other thumb holds (D318)"]] },
  { key: "ladderRowMin", group: "LADDER", label: "Smallest row", help: "Rows are the box's step height, never smaller than this; the other LADDER sizes are in rows.", kind: "number", min: 8, max: 40, step: 1, unit: "px" },
  { key: "ownFreshS", group: "LADDER", label: "Last touch counts for", help: "After this long (or after a slide) a thumb's next touch is free.", kind: "number", min: 0.5, max: 10, step: 0.5, unit: "s" },
  { key: "repeatRows", group: "LADDER", label: "Repeat band", help: "A repeated note: within this many rows of the last touch.", kind: "number", min: 0.5, max: 6, step: 0.25, unit: "rows" },
  { key: "stepLeewayRows", group: "LADDER", label: "Step leeway", help: "A step or third may land this many rows the wrong way.", kind: "number", min: 0, max: 3, step: 0.25, unit: "rows" },
  { key: "leapRows", group: "LADDER", label: "Leap needs", help: "A fourth or more: at least this many rows the right way.", kind: "number", min: 0, max: 3, step: 0.05, unit: "rows" },
  { key: "travelMin", group: "LADDER", label: "Line travel (TRAVEL_MIN)", help: "Over a fourth or more of the line, the thumb must have moved this many rows the right way.", kind: "number", min: 0, max: 2, step: 0.05, unit: "rows" },
  { key: "edgeShare", group: "LADDER", label: "Bar end (EDGE_SHARE)", help: "A thumb that travelled into the bar's end (this share of its height) may stay there.", kind: "number", min: 0, max: 0.4, step: 0.01 },
  { key: "touchTolerance", group: "INTENTION", label: "Touch tolerance", help: "D325: a note's hold within this share of the player's recent holds (same note value) is consistent: ARTICULATION credited, whatever the touch.", kind: "number", min: 0, max: 0.6, step: 0.05 },
  { key: "artCap", group: "INTENTION", label: "Articulation cap", help: "D325: articulation's points at most this share of the run's.", kind: "number", min: 0.05, max: 1, step: 0.05 },
  { key: "agogicShare", group: "INTENTION", label: "Agogic delay", help: "D325b: a strong beat or a dissonance this share of a beat late is still PERFECT, if the next note is back on the pulse.", kind: "number", min: 0, max: 0.4, step: 0.01 },
  { key: "breathLateMs", group: "INTENTION", label: "Breath re-entry", help: "D325b: a note after a rest or a cadence this late is still PERFECT.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "broadenShare", group: "INTENTION", label: "Final broadening", help: "D325b: in the last two bars, late by up to this share of a beat (growing to the end) is still PERFECT.", kind: "number", min: 0, max: 0.5, step: 0.05 },
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
  { key: "trillPerSecond", group: "ORNAMENTS", label: "Trill speed", help: "A trill's notes a second, the band's and the player's (to the nearest subdivision of the beat).", kind: "number", min: 4, max: 20, step: 1, unit: "/s" },
  { key: "trillSettle", group: "ORNAMENTS", label: "Trill settle", help: "A long trill ends on its main note for this share of the note.", kind: "number", min: 0, max: 0.5, step: 0.05 },
  { key: "trillFollowsShake", group: "ORNAMENTS", label: "Trill follows the shake", help: "The player's trill goes on while the thumb shakes and settles when it stops (off: the first shake plays the whole trill).", kind: "bool" },
  { key: "trillStopMs", group: "ORNAMENTS", label: "Shaking stopped after", help: "No leg for this long: the trill settles on its main note.", kind: "number", min: 100, max: 800, step: 10, unit: "ms" },
  { key: "expression", group: "EXPRESSION", label: "Expression (D311)", help: "Where a thumb lands across its bar shapes the attack; sideways while held, the sustain.", kind: "bool" },
  { key: "thumbCross", group: "SLURS", label: "Thumbs cross", help: "A touch on the half where the other thumb is down (the other half free) is the other thumb (D318).", kind: "bool" },
  { key: "slurNext", group: "SLURS", label: "Slur's second thumb", help: "While the other thumb holds the note before, a landing is for the next note: struck a little early, or waiting for it (D318; D290's double contact only for the same thumb).", kind: "bool" },
  { key: "slurEarlyShare", group: "SLURS", label: "…early by up to", help: "This share of the time between the two notes.", kind: "number", min: 0, max: 0.9, step: 0.05 },
  { key: "slurEarlyMaxMs", group: "SLURS", label: "…and at most", help: "Landed earlier, the thumb waits and strikes its note then.", kind: "number", min: 0, max: 400, step: 10, unit: "ms" },
  { key: "slurRollMinMs", group: "SLURS", label: "Thumbs together", help: "Two thumbs landing closer than this are a chord pressed, not a slur.", kind: "number", min: 0, max: 150, step: 5, unit: "ms" },
  { key: "sameThumbPx", group: "SLURS", label: "Same thumb within", help: "A contact this close to a thumb still down is that thumb rolling (a double contact).", kind: "number", min: 0, max: 80, step: 2, unit: "px" },
  { key: "slideTakeover", group: "SLURS", label: "Landing takes a drift's slide", help: "The other thumb landing on the note a drifting thumb just slid onto takes it over, joined.", kind: "bool" },
  { key: "slideTakeMs", group: "SLURS", label: "…within", help: "How soon after the slide.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "joinedSound", group: "SLURS", label: "Joined sound in the gap", help: "A note joined within the legato gap sounds joined (no fresh attack).", kind: "bool" },
  { key: "cancelJoins", group: "SLURS", label: "Cancel still joins", help: "A touch iOS takes back with no other thumb down ends its note for the join.", kind: "bool" },
  { key: "dragMeaning", group: "DRAG", label: "A drag means", help: "A held thumb slid on to the next note (free play: another row). Connect: a glide on a sound that bends; on a keyboard a coulé across a third, a Schleifer into a note from below (D321). Counts as joined for the legato chain, earns nothing more.", kind: "choice", options: [["join", "Joined, earns nothing, breaks the chain (D218)"], ["connect", "Connect: glide, coulé, Schleifer (D321)"]] },
  { key: "glideMaxShare", group: "DRAG", label: "Glide at most", help: "In a passage the glide lasts the drag's time, at most this share of the note it arrives on.", kind: "number", min: 0.1, max: 1, step: 0.05 },
  { key: "upThird", group: "DRAG", label: "Keyboard, up a third", help: "Dragged up a third on a keyboard: the Schleifer (the held note struck again, the step, the note) or the passing note (coulé).", kind: "choice", options: [["schleifer", "Schleifer"], ["coule", "Coulé (passing note)"]] },
  { key: "fillTiming", group: "DRAG", label: "Fill notes' speed", help: "A keyboard's coulé or Schleifer: at the trill's speed, or the drag's own time shared out.", kind: "choice", options: [["trill", "The trill's speed"], ["drag", "The drag's time"]] },
  { key: "tapDelayMs", group: "SENSOR", label: "Tap strength: delay the attack", help: "SENSOR's PLAY WITH IT: 0 starts the note at once and adjusts it when the tap's spike is read; more waits up to this long to strike it at that strength.", kind: "number", min: 0, max: 40, step: 5, unit: "ms" },
  { key: "tapWindowMs", group: "SENSOR", label: "Tap strength: read over", help: "SENSOR's PLAY WITH IT: the spike is read over this long after the touch.", kind: "number", min: 10, max: 60, step: 5, unit: "ms" },
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
