/**
 * D317, THE LAB's mechanics: every judging and gesture parameter of the game in one mutable object,
 * read by the engine (proto-game.ts, articulation.ts, free-ornament.ts) where it used to read module
 * constants. Its defaults are the game's: D337 (WTC 1.52) made them the lab's B+ · PREPARED (RELATIVE timing,
 * no waiting slur, the same thumb's 40 ms double, lenient runs, prepared notes and the pull-off); the
 * WTC 1.51 game is MECH_CLASSIC (the lab's preset A, test/lab-mechanics.test.ts holding it equal to the
 * constants the engine read before). The lab (lab.html) changes them live, and a run's log replays
 * through the engine with any of them changed (src/bench/lab/replay.ts, tools/lab/replay.ts).
 *
 * To add a parameter: a field in MECH_DEFAULTS, a row in MECH_SPEC (the lab draws its control from the
 * row: a number's slider, a switch, a choice), and the engine reading `MECH.<key>`. A choice's options
 * are listed in its row, so a new option (e.g. another direction reference) appears in the lab as soon
 * as the row names it.
 */

export const MECH_DEFAULTS = {
  // TIMING UNITS (D329, WTC 1.46: the owner, "relative timing units"; D337, WTC 1.52: the game's "relative").
  /**
   * "absolute" (WTC 1.51's): every window in ms as set, whatever the tempo. "relative": the musical
   * windows (PERFECT, early and late, the split floor, the legato gap, the slur's early reach, the
   * slide and waiting-note takeovers, the last touch's memory) scale with the time between the notes
   * (relMs), each as set at REFERENCE IOI and never under RELATIVE FLOOR; the double contact and the
   * other motor and hardware quantities stay in ms.
   */
  timing: "relative" as "absolute" | "relative",
  /** RELATIVE: the time between notes (ms) at which every window is as set (II/18's quaver at 83 bpm, 361 ms). */
  refIoiMs: 360,
  /** RELATIVE: under this time between notes (ms) the windows stop shrinking (Weber-like above about 250 ms, constant below: Friberg and Sundberg 1995). */
  kneeIoiMs: 250,
  /** RELATIVE: no window narrower than this (ms: touch frames of 16 ms, the audio's jitter), unless set narrower. */
  relFloorMs: 30,
  /** RELATIVE: a thumb's last touch counts for this many beats (instead of OWN_FRESH_S)... */
  ownFreshBeats: 3,
  /** ...and at least this long (s). */
  ownFreshMinS: 1.5,
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
  doubleMs: 40,
  /** D329: the double contact only for the thumb that struck the note (the same side; D337 the game's); off (WTC 1.51's): any thumb. */
  doubleSameThumb: true,
  /** D299 BT_EARLY_MS, BT_LATE_MS: BLUETOOTH MODE widens the window by these (ms). */
  btEarlyMs: 20,
  btLateMs: 25,
  // LADDER: relative judging (D286, D289, D296).
  /** LADDER_ROW_MIN: the smallest row (px) a touch is judged by. */
  ladderRowMin: 18,
  /** D377: the music box's zoom (box-zoom.ts): AUTO, its width per round and its range eased where it would be needlessly empty; OFF, D247's whole piece over three bars. */
  boxZoom: "auto" as "auto" | "off",
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
  /**
   * D332 (WTC 1.49): fast stepwise runs. "strict" (WTC 1.51's): as everywhere. "lenient" (D337, the game's): inside a run
   * (RUN NOTES or more in a row, each a step the same way, less than RUN IOI apart; runs.ts) a landing is
   * right if it goes the run's way, or level within the step leeway, from EITHER thumb's last touch, and the
   * line's travel is replaced by the run's trend at its last note (RUN ✓ / RUN ✗ in the log; on RUN ✗ the notes
   * right only by the run rule are re-judged wrong, their points taken back).
   */
  runs: "lenient" as "strict" | "lenient",
  /** D332: a run has at least this many notes. */
  runMinNotes: 4,
  /** D332: a run's notes follow each other by less than this (ms, at the written tempo). */
  runIoiMs: 200,
  /** D332: RUN ✓ needs the landings' fitted travel the run's way at least this many drawn rows per step of its span (RUN ✗ re-judges the run rule's notes wrong). */
  runTravelRows: 0.5,
  /** D332: ...and at most this many (a random tapper's fitted travel is large either way; an honest run's about the drawn distance). */
  runTravelMaxRows: 2,
  /**
   * D369 (the owner: fast passages "a little bit more difficult … without simply reverting"), measured on
   * his logs of 27 October (107 takes, 467 run notes): D332 judged 8.3% of them wrong, the strict rule
   * 16.7%; with these two, 12.8%. RUN ✓ also needs at least this share of the run's struck notes right by
   * the ladder's own rule (each thumb from its own last touch), not by the run's leniency alone (0: off).
   */
  runOwnShare: 0.85,
  /** D369: inside a run a landing may also be judged from the OTHER thumb's last touch (D332: on; the game's from 1.77: off). */
  runOtherThumb: false,
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
  // ORNAMENTS (D278, D314; D353: the contour reader, free-ornament.ts ShakeReader, its thresholds by the tempo).
  /** D353: the thumb's shake is read for ornaments (written and free). Off: a written ornament plays itself (as on a computer's keys), no free ones. */
  ornGestures: true,
  /** D314: a shake on a plain held note plays a free ornament. */
  freeOrnaments: true,
  /** D353: a leg's least travel: this many rows... (D314/D289: 0.4) */
  shakeReachRows: 0.15,
  /** ...and at least this many px (the owner's "very subtle": 3 px, about half a millimetre; D314: 6). */
  shakeReachMinPx: 3,
  /** A leg's travel along the bar at least this many times its travel across (free-ornament.ts). */
  shakeSteep: 1.5,
  /** D353: steepness over the whole leg (off: where the reach is first passed, D314's). */
  shakeWholeLeg: true,
  /** D353: a mordent's or Pralltriller's leg at most this share of a beat... */
  ornLegBeats: 0.3,
  /** ...clamped to at least this (ms)... */
  ornLegMinMs: 90,
  /** ...and at most this (ms: keeps a slow wobble out at slow tempi). */
  ornLegMaxMs: 220,
  /** D353: a trill's legs on average at most this share of a beat... */
  trillLegBeats: 0.2,
  /** ...clamped to at least this (ms)... */
  trillLegMinMs: 70,
  /** ...and at most this (ms). */
  trillLegMaxMs: 160,
  /** D353: the first leg begun within this share of a beat of the landing (on the beat; later, a two-leg shake is late: the turn after the note)... */
  ornStartBeats: 0.6,
  /** ...clamped to at least this (ms)... */
  ornStartMinMs: 180,
  /** ...and at most this (ms). */
  ornStartMaxMs: 500,
  /** D353: a late two-leg shake is the turn after the note when it starts past this share of a note... */
  turnAfterShare: 0.4,
  /** ...of at least a beat and this long (ms). */
  turnAfterMinMs: 600,
  /** D353: a trill's ending: "rule" (C. P. E. Bach, I.2.3 §§13, 16: the Nachschlag on a note of a beat or more, after a leap, or before a cadence; none in a falling series or on a short note; else settled) or "settle" (the Explication's: settled on the note). */
  trillEnding: "rule" as "rule" | "settle",
  /** D353: a slide while the thumb may be shaking is confirmed after this long without turning back (ms). */
  slideConfirmMs: 60,
  /**
   * D364, THE HOLD-OVER APPOGGIATURA (the ornament report's Layer 2, "Appoggiatura by hold-over"): a thumb
   * resting PREPARED on a note while the other still holds the note before, a diatonic step away, past the
   * note's time (its PERFECT window): the held note sounds on over the beat as the appoggiatura and the
   * lift sounds the note (the pull-off), unjudged for time. Only where C. P. E. Bach's long appoggiatura
   * goes (I.2.2 §9): a strong beat, a note of a beat or more, the note before joined to it a step away.
   */
  holdOver: true,
  /** ...lifted before this share of the note (later: missed, as without it)... */
  holdOverShare: 0.75,
  /** ...this share on a fermata (or the last note). */
  holdOverFermataShare: 0.9,
  /** A lift within this long of the note's PERFECT window is the short appoggiatura (I.2.2 §13): the note at its full level. */
  holdOverShortMs: 80,
  /** The held note "tied" over the beat (a suspension: no new attack) or "struck" again as the grace is armed (necessarily about 70 ms late). */
  holdOverSound: "tied" as "tied" | "struck",
  /** The note after a long appoggiatura this much softer (a factor), where the instrument has dynamics (the Abzug, I.2.2 §7). */
  holdOverSoft: 0.7,
  /** D319 TRILL_PER_SECOND: a trill's speed, notes a second (taken to the nearest subdivision of the beat). */
  trillPerSecond: 10,
  /** D319 TRILL_SETTLE: a long trill's main note settles for this share of the note at its end. */
  trillSettle: 0.15,
  /** D319: the player's trill goes on while the thumb shakes and settles on the main note when it stops (off: the first shake plays the whole trill). */
  trillFollowsShake: true,
  /** D319: the thumb has stopped shaking when no leg came for this long (ms). */
  trillStopMs: 250,
  // THE READING'S ACCENT (D338: judged by time, not loudness; accent.ts).
  /** An accent may be struck this share of a beat late (an agogic lean) and still be ACCENT ✓. */
  accentLateBeats: 0.15,
  /** The note before an accent let go at least this long before it (ms): not joined. */
  accentGapMs: 15,
  /** An accent held at least this share of its written length. */
  accentHoldShare: 0.85,
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
  /** While the other thumb holds the note before, a landing (not that thumb's own roll) is for the next note: struck early, or waiting for it (WTC 1.51's; D337 off: B+ prepares instead). */
  slurNext: false,
  /** ...struck up to this share of the time between the two onsets early... */
  slurEarlyShare: 0.5,
  /** ...and at most this early (ms); landed earlier it waits, down, and strikes then. */
  slurEarlyMaxMs: 250,
  /** Two thumbs landing closer than this (ms) are a chord pressed, not a slur. */
  slurRollMinMs: 0,
  /** A contact this close (px) to a thumb still down is that thumb's own (a roll: D290's double contact), not the other thumb. */
  sameThumbPx: 24,
  /** A thumb landing on the note the other thumb's drift has just slid onto takes it over, joined. */
  slideTakeover: true,
  /** ...within this long of the slide (ms). */
  slideTakeMs: 120,
  /** D329: a waiting thumb's note (slurNext) struck on its time may be taken over by a touch landing for it within this long after (ms; D318 read doubleMs). */
  waitTakeMs: 120,
  /**
   * D329: a thumb landed early and waiting while the other thumb holds the note before sounds its note
   * "time" (D318, the default: at its time, or once the other lets go from the slur's early reach on) or
   * "lift" (the other thumb's release sounds it, from the note's own early window on, judged at that
   * moment; held past its time, at its time): organ and wind legato, the connection made by the release.
   */
  waitSounds: "time" as "time" | "lift",
  /** A note joined within the legato gap (a handover, a touch taken back) sounds joined: no fresh attack. */
  joinedSound: true,
  /** A touch taken back with no other thumb down still ends its note for the join (a slur's second thumb a moment later). */
  cancelJoins: true,
  // PREPARED (D334, WTC 1.49: the lab's B+; D337, WTC 1.52: the game's). A guitarist's hammer-on and pull-off on two thumbs.
  /**
   * A thumb landing on the next note before that note's window, while the other thumb holds the note
   * before (a landing B would call a stray), rests PREPARED: no sound, no strike. It sounds only by a
   * gesture: the other thumb's lift (a PULL-OFF, timed at the lift, from the note's own early window on)
   * or (prepPress) a press of the resting thumb; never by itself at its time.
   */
  prepare: true,
  /** ...from this share of the time between the two notes early (1: from the note before's onset; from the other thumb's strike in any case, whichever is earlier). */
  prepShare: 1,
  /** Neither by the end of the note's late window: "miss" (it is missed) or "lift" (the other thumb's lift still sounds it whenever it comes, judged late). */
  prepLate: "miss" as "miss" | "lift",
  /**
   * A PRESS by the resting thumb sounds it too (over-legato: the other thumb still down, both sound), read
   * as a small move down or inward. Off: the owner's SENSOR log (iOS 18.7) shows the contact's size
   * useless for it (steps of ~24 px, almost never changing while a thumb rests still).
   */
  prepPress: false,
  /** PRESS: the thumb moved down or inward by more than this from where it settled (px)... */
  pressMovePx: 4,
  /** ...settled this long after landing (ms). */
  pressSettleMs: 60,
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
  // DYNAMICS (D335: FREE PLAY's DYNAMICS on the sampled piano; the lab only, dynamics.ts).
  /** B · PEDAL: the landings' places averaged over this long (ms): the running phrase level. */
  dynPedalMs: 1000,
  /** The strike read after the onset: the note's level corrected by a linear ramp this long (ms). */
  dynRampMs: 12,
  /** Wait for the strike: the attack held back until the motion peak is read (at most dynWaitMs) and struck at the whole level. Off: at once, corrected. */
  dynWait: false,
  /** dynWait on: the longest the attack waits (ms). */
  dynWaitMs: 35,
  // BAND TIME (D328: a prototype, the lab only; band-time.ts). The game's band keeps the written time.
  /** "fixed" (the game's), "waits" (at cadences, the final chord and a breath, until the player's note), "follows" (waits, and its tempo follows the player's onsets, bounded). */
  bandTime: "fixed" as "fixed" | "waits" | "follows",
  /** The longest the band waits for the player (ms). */
  bandWaitMaxMs: 400,
  /** FOLLOWS: the newest onset's weight in the smoothed lateness (exponential; 0.3 ≈ the last few notes). */
  bandSmooth: 0.3,
  /** FOLLOWS: the band's tempo at most this far from the written (± %). */
  bandBoundPct: 4,
  /** FOLLOWS: the band's drift from the written time by tempo (not by waits) is pulled back, so that at this much it gives way no further (ms). */
  bandDriftMaxMs: 250,
  // EXPRESSION LAB (D376: Glenn's "More Expression from Two Thumbs"; glenn.ts). D378 (WTC 1.83): the game's; off only in
  // the Lab (MECHANICS: CLASSIC: lab.html?glenn=0, preset A); a recorded set that does not name it meant off (CLASSIC_VALUES).
  /** Glenn's mechanics: real over-legato, a keyboard slide begins a slur, slides and shakes told apart, joins judged by ear, a new bow against a slur. */
  glenn: true,
};

export type Mech = { -readonly [K in keyof typeof MECH_DEFAULTS]: (typeof MECH_DEFAULTS)[K] };
export type MechKey = keyof Mech;

/**
 * D337 (WTC 1.52): the parameters in which the game before 1.52 differed from today's defaults (B+ ·
 * PREPARED became the game): WTC 1.51's judging, the lab's preset A · CLASSIC. Also what a log or a lab
 * setting stored before 1.52 meant by a parameter it does not name (replay.ts, presets.ts).
 */
export const CLASSIC_VALUES = {
  timing: "absolute",
  slurNext: true,
  doubleSameThumb: false,
  doubleMs: 120,
  runs: "strict",
  prepare: false,
  prepShare: 1,
  slurRollMinMs: 40,
  // D378: before WTC 1.83 Glenn's mechanics were off (a set that does not name them meant off).
  glenn: false,
} as const satisfies Partial<Mech>;

/** D337: the whole of WTC 1.51's parameters (the game before B+ became its base). */
export const MECH_CLASSIC: Mech = { ...MECH_DEFAULTS, ...CLASSIC_VALUES };

/**
 * D337: what a recorded set of parameters (a lab log's, a study's, a lab setting kept on the phone) meant:
 * a parameter it does not name had, when it was made, WTC 1.51's value if B+ changed it (CLASSIC_VALUES:
 * every log made since WTC 1.52 names every parameter, so only older ones lack them); D329: a log from
 * before WTC 1.46 took the waiting note's takeover window from the double contact's.
 */
export function asRecorded<T extends Partial<Record<string, unknown>>>(m: T | undefined): Partial<Record<string, unknown>> {
  const was = m?.waitTakeMs === undefined && m?.doubleMs !== undefined ? { waitTakeMs: m.doubleMs } : {};
  // D369: a set made before RUN OWN SHARE had none (D332's run rule alone).
  const runs = { ...(m && m.runOwnShare === undefined ? { runOwnShare: 0 } : {}), ...(m && m.runOtherThumb === undefined ? { runOtherThumb: true } : {}) };
  return { ...CLASSIC_VALUES, ...was, ...runs, ...(m ?? {}) };
}

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

/** D329: the windows RELATIVE scales (each help says by what); the rest stay as set. */
export const REL_KEYS: readonly MechKey[] = ["earlyMs", "lateMs", "splitFloorMs", "perfectMs", "legatoGapMs", "slurEarlyMaxMs", "slideTakeMs", "waitTakeMs", "ownFreshS"];

/** D329: RELATIVE's ceiling: the windows grow with the time between notes up to this many times the reference, no further. */
export const REL_CEIL = 2;

/**
 * D329: a window (ms, as set at the reference) for notes `ioiMs` apart. ABSOLUTE: as set. RELATIVE:
 * ms × clamp(ioi, KNEE, 2 × REF) / REF, at least RELATIVE FLOOR (or the value set, if narrower):
 * proportional to the time between notes above the knee (timing discrimination roughly Weber-like, a
 * few per cent of the interval, above about 250 ms: Friberg and Sundberg 1995; tapping variability
 * grows with the interval: Repp 2005), constant below it.
 */
export function relMs(ms: number, ioiMs: number, m: Mech = MECH): number {
  if (m.timing !== "relative") return ms;
  const at = Number.isFinite(ioiMs) && ioiMs > 0 ? ioiMs : m.refIoiMs;
  const ioi = Math.min(Math.max(at, m.kneeIoiMs), REL_CEIL * m.refIoiMs);
  return Math.max(Math.min(ms, m.relFloorMs), (ms * ioi) / Math.max(1, m.refIoiMs));
}

/** D329: how long a thumb's last touch counts (s): OWN_FRESH_S, or (RELATIVE) so many beats of `beatS` seconds, at least the floor. */
export function ownFreshSeconds(beatS: number, m: Mech = MECH): number {
  return m.timing === "relative" ? Math.max(m.ownFreshMinS, m.ownFreshBeats * beatS) : m.ownFreshS;
}

/** One control of the lab's MECHANICS panel. */
export type MechSpec =
  | { key: MechKey; group: string; label: string; help: string; kind: "number"; min: number; max: number; step: number; unit?: string }
  | { key: MechKey; group: string; label: string; help: string; kind: "bool" }
  | { key: MechKey; group: string; label: string; help: string; kind: "choice"; options: readonly (readonly [value: string, label: string])[] };

export const MECH_SPEC: readonly MechSpec[] = [
  { key: "timing", group: "TIMING UNITS", label: "Timing units", help: "D329. ABSOLUTE (WTC 1.51's, preset A): every window in ms as set, at any tempo. RELATIVE: each window marked RELATIVE ↔ is as set when the notes are REFERENCE IOI apart and scales with the time between them: set × clamp(IOI, KNEE, 2 × REFERENCE) / REFERENCE, never under RELATIVE FLOOR. The double contact stays in ms (a thumb's own motion).", kind: "choice", options: [["absolute", "ABSOLUTE (WTC 1.51's)"], ["relative", "RELATIVE to the time between notes (the game's)"]] },
  { key: "refIoiMs", group: "TIMING UNITS", label: "Reference IOI", help: "RELATIVE: the time between notes at which every window is as set (II/18's quaver at 83 bpm: 361 ms, so RELATIVE equals today's values there).", kind: "number", min: 150, max: 1000, step: 10, unit: "ms" },
  { key: "kneeIoiMs", group: "TIMING UNITS", label: "Knee", help: "RELATIVE: faster than this the windows stop shrinking (timing is judged roughly in proportion above about 250 ms between notes and in fixed ms below: Friberg and Sundberg 1995).", kind: "number", min: 0, max: 500, step: 10, unit: "ms" },
  { key: "relFloorMs", group: "TIMING UNITS", label: "Relative floor", help: "RELATIVE: no window narrower than this (touches arrive in 16 ms frames; the sound's own jitter), unless set narrower.", kind: "number", min: 0, max: 80, step: 5, unit: "ms" },
  { key: "ownFreshBeats", group: "TIMING UNITS", label: "Last touch counts for (beats)", help: "RELATIVE: a thumb's last touch is its reference for this many beats (ABSOLUTE: LADDER › Last touch counts for, in seconds)…", kind: "number", min: 0.5, max: 8, step: 0.5, unit: "beats" },
  { key: "ownFreshMinS", group: "TIMING UNITS", label: "…at least", help: "…and never less than this.", kind: "number", min: 0.5, max: 5, step: 0.5, unit: "s" },
  { key: "earlyMs", group: "TIMING", label: "Early window", help: "How early a touch may take a note. RELATIVE: × the passage's usual time between notes (its median) / REFERENCE.", kind: "number", min: 40, max: 400, step: 5, unit: "ms" },
  { key: "lateMs", group: "TIMING", label: "Late window", help: "How late a touch may take a note. RELATIVE: × the passage's median time between notes / REFERENCE.", kind: "number", min: 40, max: 400, step: 5, unit: "ms" },
  { key: "splitHalfway", group: "TIMING", label: "Split windows halfway", help: "A note's window stops halfway to its neighbours (D290), so one touch never takes the next note.", kind: "bool" },
  { key: "splitFloorMs", group: "TIMING", label: "Split floor", help: "The narrowest a split window gets on either side. RELATIVE: × the passage's median time between notes / REFERENCE.", kind: "number", min: 20, max: 200, step: 5, unit: "ms" },
  { key: "perfectMs", group: "TIMING", label: "PERFECT within", help: "A right note this near its time scores PERFECT, else GOOD. RELATIVE: × the note's own time to its nearer neighbour / REFERENCE (70 ms at 361 ms: 19%; 49 ms at 250 ms and faster).", kind: "number", min: 20, max: 200, step: 5, unit: "ms" },
  { key: "doubleMs", group: "TIMING", label: "Double contact", help: "A second contact this soon after a strike is ignored (a rolling thumb). Always in ms.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "doubleSameThumb", group: "TIMING", label: "Double: the same thumb only", help: "D329: only the thumb that struck the note, landing again within the double contact, is a double; the other thumb's landing is judged for itself (on, the game's since WTC 1.52; off, WTC 1.51's: any thumb).", kind: "bool" },
  { key: "btEarlyMs", group: "TIMING", label: "Bluetooth: extra early", help: "BLUETOOTH MODE widens the window early by this.", kind: "number", min: 0, max: 100, step: 5, unit: "ms" },
  { key: "btLateMs", group: "TIMING", label: "Bluetooth: extra late", help: "BLUETOOTH MODE widens the window late by this.", kind: "number", min: 0, max: 100, step: 5, unit: "ms" },
  { key: "boxZoom", group: "LADDER", label: "Box zoom", help: "D377. AUTO (the game's): the bars shown chosen once per round so the voice's typical note is about 1/18 of the box (1.5 to 4 bars, at least 3 s ahead); the rows narrowed, rarely and eased over 1.3 s while the thumbs are still, where the next 4 bars use under 70% of the range (never under 60% of the piece's, never clipping). OFF: the whole piece over three bars (D247). Applies from the next round.", kind: "choice", options: [["auto", "AUTO (the game's)"], ["off", "OFF (D247: the whole piece, 3 bars)"]] },
  { key: "directionRef", group: "LADDER", label: "Direction measured from", help: "Where a thumb's move is measured from.", kind: "choice", options: [["own", "Its own last touch"], ["either", "Or the note the other thumb holds (D318)"]] },
  { key: "ladderRowMin", group: "LADDER", label: "Smallest row", help: "Rows are the box's step height, never smaller than this; the other LADDER sizes are in rows.", kind: "number", min: 8, max: 40, step: 1, unit: "px" },
  { key: "ownFreshS", group: "LADDER", label: "Last touch counts for", help: "After this long (or after a slide) a thumb's next touch is free. RELATIVE: TIMING UNITS › Last touch counts for (beats) instead.", kind: "number", min: 0.5, max: 10, step: 0.5, unit: "s" },
  { key: "repeatRows", group: "LADDER", label: "Repeat band", help: "A repeated note: within this many rows of the last touch.", kind: "number", min: 0.5, max: 6, step: 0.25, unit: "rows" },
  { key: "stepLeewayRows", group: "LADDER", label: "Step leeway", help: "A step or third may land this many rows the wrong way.", kind: "number", min: 0, max: 3, step: 0.25, unit: "rows" },
  { key: "leapRows", group: "LADDER", label: "Leap needs", help: "A fourth or more: at least this many rows the right way.", kind: "number", min: 0, max: 3, step: 0.05, unit: "rows" },
  { key: "travelMin", group: "LADDER", label: "Line travel (TRAVEL_MIN)", help: "Over a fourth or more of the line, the thumb must have moved this many rows the right way.", kind: "number", min: 0, max: 2, step: 0.05, unit: "rows" },
  { key: "runs", group: "LADDER", label: "Fast runs", help: "D332. STRICT (WTC 1.51's): each landing judged from its own thumb's last touch, and the line's travel. LENIENT: inside a run (RUN NOTES or more stepwise one way, each less than RUN IOI after the one before) a landing is right if it goes the run's way, or level within the step leeway, from EITHER thumb's last touch; no line travel; at the run's last note the landings' fitted travel must go the run's way by RUN TRAVEL: RUN ✓, or RUN ✗ and the notes right only by the run rule re-judged WRONG (points taken back).", kind: "choice", options: [["strict", "STRICT (WTC 1.51's)"], ["lenient", "LENIENT inside fast runs (the game's)"]] },
  { key: "runMinNotes", group: "LADDER", label: "Run: at least", help: "D332: a run is this many notes or more, each a step the same way.", kind: "number", min: 3, max: 12, step: 1, unit: "notes" },
  { key: "runIoiMs", group: "LADDER", label: "Run: notes closer than", help: "D332: each note of a run follows the one before by less than this (at the written tempo).", kind: "number", min: 80, max: 400, step: 10, unit: "ms" },
  { key: "runTravelRows", group: "LADDER", label: "Run: travel at least", help: "D332, LENIENT: at a run's last note the thumbs' landings over it, fitted by a straight line (height against time), must travel the run's way at least this many drawn rows per step it spans (a row is a staff step as drawn); else RUN ✗ and every note right only by the run rule is re-judged WRONG (its points taken back, a slip).", kind: "number", min: 0, max: 1.5, step: 0.05, unit: "rows/step" },
  { key: "runOtherThumb", group: "LADDER", label: "Run: either thumb", help: "D332's leniency inside a run: a landing right if it goes the run's way from EITHER thumb's last touch (on, D332), or from its own thumb's only (off: the game's since D369, fast passages a little stricter).", kind: "bool" },
  { key: "runOwnShare", group: "LADDER", label: "Run: own rule at least", help: "D369 (the owner: fast passages \"a little bit more difficult … without simply reverting\"): RUN ✓ also needs at least this share of the run's struck notes right by the ladder's own rule (each thumb judged from its own last touch, with the line's travel), not by the run's leniency alone; else RUN ✗ and the notes right only by leniency are re-judged WRONG. 0: D332's rule. The owner's logs: D332 8.3% of run notes wrong, strict 16.7%, the game's (0.85, either thumb off) 12.8%.", kind: "number", min: 0, max: 1, step: 0.05 },
  { key: "runTravelMaxRows", group: "LADDER", label: "Run: travel at most", help: "D332, LENIENT: …and at most this many drawn rows per step it spans: landings flung far beyond the run's drawn distance are no run played (random taps fit large travels either way): RUN ✗.", kind: "number", min: 1, max: 6, step: 0.25, unit: "rows/step" },
  { key: "edgeShare", group: "LADDER", label: "Bar end (EDGE_SHARE)", help: "A thumb that travelled into the bar's end (this share of its height) may stay there.", kind: "number", min: 0, max: 0.4, step: 0.01 },
  { key: "touchTolerance", group: "INTENTION", label: "Touch tolerance", help: "D325: a note's hold within this share of the player's recent holds (same note value) is consistent: ARTICULATION credited, whatever the touch.", kind: "number", min: 0, max: 0.6, step: 0.05 },
  { key: "artCap", group: "INTENTION", label: "Articulation cap", help: "D325: articulation's points at most this share of the run's.", kind: "number", min: 0.05, max: 1, step: 0.05 },
  { key: "agogicShare", group: "INTENTION", label: "Agogic delay", help: "D325b: a strong beat or a dissonance this share of a beat late is still PERFECT, if the next note is back on the pulse.", kind: "number", min: 0, max: 0.4, step: 0.01 },
  { key: "breathLateMs", group: "INTENTION", label: "Breath re-entry", help: "D325b: a note after a rest or a cadence this late is still PERFECT.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "broadenShare", group: "INTENTION", label: "Final broadening", help: "D325b: in the last two bars, late by up to this share of a beat (growing to the end) is still PERFECT.", kind: "number", min: 0, max: 0.5, step: 0.05 },
  { key: "legatoGapMs", group: "LEGATO", label: "Legato gap", help: "A note let go at most this long before the next is struck still joins it… RELATIVE: × the note's length / REFERENCE.", kind: "number", min: 0, max: 300, step: 5, unit: "ms" },
  { key: "legatoGapShare", group: "LEGATO", label: "…or share of the note", help: "…or this share of the note's length, whichever is longer.", kind: "number", min: 0, max: 1, step: 0.05 },
  { key: "slides", group: "SLIDES", label: "Slides", help: "A held thumb moved on to the next note plays it.", kind: "bool" },
  { key: "slideMinPx", group: "SLIDES", label: "Slide threshold", help: "The least travel of a held thumb that slides.", kind: "number", min: 2, max: 60, step: 1, unit: "px" },
  { key: "slideReachRows", group: "SLIDES", label: "Slide reach", help: "The thumb must come within this many rows of the next note's height.", kind: "number", min: 0, max: 3, step: 0.1, unit: "rows" },
  { key: "ornGestures", group: "ORNAMENTS", label: "Ornament gestures", help: "D353: the thumb's shake is read for ornaments, written and free (the contour reader: the gesture mirrors the ornament, as small as you like, as quick as the tempo asks). Off: a written ornament plays itself, as on a computer's keys; no free ones. Never changes a note's verdict.", kind: "bool" },
  { key: "freeOrnaments", group: "ORNAMENTS", label: "Free ornaments", help: "A shake on a plain held note plays your own ornament (D314): down and back a mordent; up and back a Pralltriller, Schneller or short trill (named by the music); three legs or more a trill.", kind: "bool" },
  { key: "shakeReachRows", group: "ORNAMENTS", label: "Reach (least leg)", help: "D353: each leg of a shake travels at least this many rows… (D314's: 0.4)", kind: "number", min: 0, max: 2, step: 0.05, unit: "rows" },
  { key: "shakeReachMinPx", group: "ORNAMENTS", label: "…at least", help: "…and at least this many px (the owner's: 3 px, about half a millimetre; a still thumb's jitter stays under about 2.3 px).", kind: "number", min: 1, max: 30, step: 0.5, unit: "px" },
  { key: "shakeSteep", group: "ORNAMENTS", label: "Shake steepness", help: "A leg along the bar: its up-down travel at least this many times its sideways travel (D311's sideways shaping is not a shake).", kind: "number", min: 0.5, max: 4, step: 0.1, unit: "×" },
  { key: "shakeWholeLeg", group: "ORNAMENTS", label: "Steepness over the whole leg", help: "D353: judged from turning point to turning point (an elliptical thumb's large shakes recovered); off: where the reach is first passed (D314's).", kind: "bool" },
  { key: "ornLegBeats", group: "ORNAMENTS", label: "Mordent leg at most", help: "D353: each leg of a two-leg shake (and every leg of any) at most this share of a beat at the tempo played…", kind: "number", min: 0.05, max: 1, step: 0.05, unit: "beat" },
  { key: "ornLegMinMs", group: "ORNAMENTS", label: "…never under", help: "…but at least this long in ms (fast tempi)…", kind: "number", min: 30, max: 300, step: 10, unit: "ms" },
  { key: "ornLegMaxMs", group: "ORNAMENTS", label: "…never over", help: "…and at most this long (slow tempi: keeps a slow wobble out).", kind: "number", min: 60, max: 600, step: 10, unit: "ms" },
  { key: "trillLegBeats", group: "ORNAMENTS", label: "Trill leg at most", help: "D353: a trill's legs (three or more) on average at most this share of a beat, even quicker…", kind: "number", min: 0.05, max: 1, step: 0.05, unit: "beat" },
  { key: "trillLegMinMs", group: "ORNAMENTS", label: "…never under", help: "…but at least this long in ms…", kind: "number", min: 30, max: 300, step: 10, unit: "ms" },
  { key: "trillLegMaxMs", group: "ORNAMENTS", label: "…never over", help: "…and at most this long.", kind: "number", min: 50, max: 500, step: 10, unit: "ms" },
  { key: "ornStartBeats", group: "ORNAMENTS", label: "Begun within", help: "D353: a two-leg shake's first leg begun within this share of a beat of the landing (on the beat); later it is LATE: on a long note, the turn after the note…", kind: "number", min: 0.1, max: 2, step: 0.05, unit: "beat" },
  { key: "ornStartMinMs", group: "ORNAMENTS", label: "…never under", help: "…but at least this long in ms…", kind: "number", min: 50, max: 600, step: 10, unit: "ms" },
  { key: "ornStartMaxMs", group: "ORNAMENTS", label: "…never over", help: "…and at most this long.", kind: "number", min: 100, max: 1500, step: 10, unit: "ms" },
  { key: "turnAfterShare", group: "ORNAMENTS", label: "Turn after the note: from", help: "D353: a late two-leg shake begun past this share of its note sounds the turn after the note (C. P. E. Bach I.2.4 §21)…", kind: "number", min: 0, max: 0.9, step: 0.05 },
  { key: "turnAfterMinMs", group: "ORNAMENTS", label: "…on a note of at least", help: "…on a note of a beat or more and at least this long; not before a falling second (§22: there the shake keeps its own meaning).", kind: "number", min: 0, max: 2000, step: 50, unit: "ms" },
  { key: "trillEnding", group: "ORNAMENTS", label: "Trill ending", help: "D353. RULE (C. P. E. Bach, Versuch I.2.3 §§13, 16): the Nachschlag (the step below, then the note) on a note of a beat or more, after a leap, or before a cadence; none in a falling series or on a short note; else settled on the note. SETTLE (the Explication's): every trill settles on its note. The band's trills and yours.", kind: "choice", options: [["rule", "RULE (C. P. E. Bach)"], ["settle", "SETTLE (the Explication)"]] },
  { key: "holdOver", group: "ORNAMENTS", label: "Hold-over appoggiatura", help: "D364: one thumb rests PREPARED on the note while the other holds the note before, a step away, past the beat: the held note sounds over the beat as the appoggiatura, and your lift sounds the note (the pull-off), unjudged for time. Only on a strong beat, a note of a beat or more, the note before joined (C. P. E. Bach, Versuch I.2.2 §9). Lifted past the share below, the note is missed, as without it.", kind: "bool" },
  { key: "holdOverShare", group: "ORNAMENTS", label: "…lift before", help: "The lift sounds the note before this share of it (later: missed).", kind: "number", min: 0.3, max: 0.95, step: 0.05 },
  { key: "holdOverFermataShare", group: "ORNAMENTS", label: "…on a fermata", help: "The same on a fermata or the last note.", kind: "number", min: 0.3, max: 0.98, step: 0.02 },
  { key: "holdOverShortMs", group: "ORNAMENTS", label: "…short within", help: "A lift this soon after the note's PERFECT window is the short appoggiatura (I.2.2 §13): the note at its full level.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "holdOverSound", group: "ORNAMENTS", label: "…the held note", help: "Tied over the beat, like a suspension (the default), or struck again as the grace is armed (necessarily about 70 ms late): compare.", kind: "choice", options: [["tied", "TIED (a suspension)"], ["struck", "STRUCK AGAIN"]] },
  { key: "holdOverSoft", group: "ORNAMENTS", label: "…the note after it", help: "The note after a long appoggiatura at this level (C. P. E. Bach's Abzug, I.2.2 §7), where the instrument has dynamics (not the harpsichord or the organ).", kind: "number", min: 0.3, max: 1, step: 0.05 },
  { key: "slideConfirmMs", group: "ORNAMENTS", label: "Slide confirmed after", help: "D353: a slide is confirmed only once the thumb has not turned back for this long and no fast leg is under way (a large shake's first leg is no slide); judged at the moment it reached the note. 0: at once (D289's).", kind: "number", min: 0, max: 200, step: 10, unit: "ms" },
  { key: "trillPerSecond", group: "ORNAMENTS", label: "Trill speed", help: "A trill's notes a second, the band's and the player's (to the nearest subdivision of the beat).", kind: "number", min: 4, max: 20, step: 1, unit: "/s" },
  { key: "trillSettle", group: "ORNAMENTS", label: "Trill settle", help: "A long trill ends on its main note for this share of the note.", kind: "number", min: 0, max: 0.5, step: 0.05 },
  { key: "trillFollowsShake", group: "ORNAMENTS", label: "Trill follows the shake", help: "The player's trill goes on while the thumb shakes and settles when it stops (off: the first shake plays the whole trill).", kind: "bool" },
  { key: "trillStopMs", group: "ORNAMENTS", label: "Shaking stopped after", help: "No leg for this long: the trill settles on its main note.", kind: "number", min: 100, max: 800, step: 10, unit: "ms" },
  { key: "accentLateBeats", group: "READING ACCENTS", label: "Accent: lean at most", help: "D338, under MECHANICS: CLASSIC only (D387: otherwise an accent is the strong zone on time): struck on time or up to this share of a beat late (an agogic lean), the note before let go, the accent held.", kind: "number", min: 0, max: 0.5, step: 0.01, unit: "beat" },
  { key: "accentGapMs", group: "READING ACCENTS", label: "Accent: gap before", help: "D338, CLASSIC only: the note before an accent let go at least this long before it (a small silence of articulation).", kind: "number", min: 0, max: 150, step: 5, unit: "ms" },
  { key: "accentHoldShare", group: "READING ACCENTS", label: "Accent: held at least", help: "D338, CLASSIC only: an accent held at least this share of its written length (from its written onset).", kind: "number", min: 0.3, max: 1, step: 0.05 },
  { key: "expression", group: "EXPRESSION", label: "Expression (D311)", help: "Where a thumb lands across its bar shapes the attack; sideways while held, the sustain.", kind: "bool" },
  { key: "thumbCross", group: "SLURS", label: "Thumbs cross", help: "A touch on the half where the other thumb is down (the other half free) is the other thumb (D318).", kind: "bool" },
  { key: "slurNext", group: "SLURS", label: "Slur's second thumb", help: "While the other thumb holds the note before, a landing is for the next note: struck a little early, or waiting for it (D318; D290's double contact only for the same thumb).", kind: "bool" },
  { key: "slurEarlyShare", group: "SLURS", label: "…early by up to", help: "This share of the time between the two notes. Landed earlier (while the other thumb holds), the thumb waits for its note.", kind: "number", min: 0, max: 0.9, step: 0.05 },
  { key: "slurEarlyMaxMs", group: "SLURS", label: "…and at most", help: "Landed earlier, the thumb waits and strikes its note then. RELATIVE: no cap in ms (the share alone).", kind: "number", min: 0, max: 400, step: 10, unit: "ms" },
  { key: "waitSounds", group: "SLURS", label: "Waiting note sounds", help: "D329. A thumb landed early, resting on its note while the other holds the note before: AT ITS TIME (D318, the default: or, once the other lets go, from the early reach above on), or WHEN THE OTHER THUMB LIFTS (the release sounds it, from the note's own early window on, judged then; held past its time, it sounds at its time): organ and wind legato.", kind: "choice", options: [["time", "AT ITS TIME (D318)"], ["lift", "WHEN THE OTHER THUMB LIFTS"]] },
  { key: "waitTakeMs", group: "SLURS", label: "Waiting note: taken over within", help: "D329: a waiting thumb's note struck on its time is taken over by a touch landing for it this soon after (D318 used the double contact's time). RELATIVE: × the note's own time to its nearer neighbour / REFERENCE.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "slurRollMinMs", group: "SLURS", label: "Thumbs together", help: "Two thumbs landing closer than this are a chord pressed, not a slur (0: a thumb put down on its next note in the same moment the other strikes may wait for it, D329).", kind: "number", min: 0, max: 150, step: 5, unit: "ms" },
  { key: "sameThumbPx", group: "SLURS", label: "Same thumb within", help: "A contact this close to a thumb still down is that thumb rolling (a double contact).", kind: "number", min: 0, max: 80, step: 2, unit: "px" },
  { key: "slideTakeover", group: "SLURS", label: "Landing takes a drift's slide", help: "The other thumb landing on the note a drifting thumb just slid onto takes it over, joined.", kind: "bool" },
  { key: "slideTakeMs", group: "SLURS", label: "…within", help: "How soon after the slide. RELATIVE: × the note's own time to its nearer neighbour / REFERENCE.", kind: "number", min: 0, max: 300, step: 10, unit: "ms" },
  { key: "joinedSound", group: "SLURS", label: "Joined sound in the gap", help: "A note joined within the legato gap sounds joined (no fresh attack).", kind: "bool" },
  { key: "cancelJoins", group: "SLURS", label: "Cancel still joins", help: "A touch iOS takes back with no other thumb down ends its note for the join.", kind: "bool" },
  { key: "prepare", group: "PREPARED", label: "Prepared notes (B+)", help: "D334; the game's since WTC 1.52 (D337). A thumb landing on the next note before its window while the other holds the note before rests PREPARED (no sound). It sounds when the other thumb lifts (PULL-OFF, timed at the lift) or, with PRESS on, when you press it (over-legato); never by itself. A landing in the note's window while the other holds is a HAMMER-ON (B's strike). Both sound slurred (no fresh attack).", kind: "bool" },
  { key: "prepShare", group: "PREPARED", label: "…from", help: "This share of the time between the two notes early (1: a whole note early; from the other thumb's strike in any case).", kind: "number", min: 0.2, max: 1, step: 0.05 },
  { key: "prepLate", group: "PREPARED", label: "Not sounded by its late window", help: "MISSED, or the other thumb's lift still sounds it whenever it comes (judged late).", kind: "choice", options: [["miss", "MISSED"], ["lift", "The lift sounds it, late"]] },
  { key: "prepPress", group: "PREPARED", label: "PRESS sounds it", help: "An optional third gesture: pressing the resting thumb (a small move down or inward) sounds the prepared note, the other still down: over-legato, both sound. Off: on the owner's iPhone the contact's size cannot show a press (SENSOR log, D334).", kind: "bool" },
  { key: "pressMovePx", group: "PREPARED", label: "Press: moves by", help: "The resting thumb moved down or inward by more than this from where it settled.", kind: "number", min: 1, max: 15, step: 0.5, unit: "px" },
  { key: "pressSettleMs", group: "PREPARED", label: "Press: settles over", help: "Where the thumb is this long after landing is where a press is measured from.", kind: "number", min: 0, max: 200, step: 10, unit: "ms" },
  { key: "dragMeaning", group: "DRAG", label: "A drag means", help: "A held thumb slid on to the next note (free play: another row). Connect: a glide on a sound that bends; on a keyboard a coulé across a third, a Schleifer into a note from below (D321). Counts as joined for the legato chain, earns nothing more.", kind: "choice", options: [["join", "Joined, earns nothing, breaks the chain (D218)"], ["connect", "Connect: glide, coulé, Schleifer (D321)"]] },
  { key: "glideMaxShare", group: "DRAG", label: "Glide at most", help: "In a passage the glide lasts the drag's time, at most this share of the note it arrives on.", kind: "number", min: 0.1, max: 1, step: 0.05 },
  { key: "upThird", group: "DRAG", label: "Keyboard, up a third", help: "Dragged up a third on a keyboard: the Schleifer (the held note struck again, the step, the note) or the passing note (coulé).", kind: "choice", options: [["schleifer", "Schleifer"], ["coule", "Coulé (passing note)"]] },
  { key: "fillTiming", group: "DRAG", label: "Fill notes' speed", help: "A keyboard's coulé or Schleifer: at the trill's speed, or the drag's own time shared out.", kind: "choice", options: [["trill", "The trill's speed"], ["drag", "The drag's time"]] },
  { key: "tapDelayMs", group: "SENSOR", label: "Tap strength: delay the attack", help: "SENSOR's PLAY WITH IT: 0 starts the note at once and adjusts it when the tap's spike is read; more waits up to this long to strike it at that strength.", kind: "number", min: 0, max: 40, step: 5, unit: "ms" },
  { key: "tapWindowMs", group: "SENSOR", label: "Tap strength: read over", help: "SENSOR's PLAY WITH IT: the spike is read over this long after the touch.", kind: "number", min: 10, max: 60, step: 5, unit: "ms" },
  { key: "dynPedalMs", group: "DYNAMICS", label: "Pedal: averaged over", help: "D335, FREE PLAY's DYNAMICS B · PEDAL + STRIKE: the places across of the thumbs' landings over this long set the running level (±6 dB).", kind: "number", min: 200, max: 3000, step: 100, unit: "ms" },
  { key: "dynRampMs", group: "DYNAMICS", label: "Strike: correction ramp", help: "D335: the note starts at once at the place's or the pedal's level; when the motion peak is read (≤ ~40 ms) its level moves to include the strike over this long (no click).", kind: "number", min: 2, max: 40, step: 1, unit: "ms" },
  { key: "dynWait", group: "DYNAMICS", label: "Strike: wait for it", help: "D335: hold every attack back until the motion peak is read (at most the wait below) and strike it at the whole level, the piano's layer included. Off (default): at once, corrected.", kind: "bool" },
  { key: "dynWaitMs", group: "DYNAMICS", label: "Strike: wait at most", help: "D335, wait for it on: the longest the attack waits for the peak.", kind: "number", min: 5, max: 60, step: 5, unit: "ms" },
  { key: "bandTime", group: "BAND TIME", label: "The band's time", help: "A prototype (D328): FIXED is the game's. WAITS: the pulse fixed, but at a cadence, the final chord and after your breath (a lift at a rest) the band holds what it sounds until your next note, at most the wait below. FOLLOWS: that, and its tempo follows your onsets, smoothed and bounded; you are judged against where the band is.", kind: "choice", options: [["fixed", "FIXED (the game's)"], ["waits", "WAITS at cadences and breaths"], ["follows", "FOLLOWS (and waits)"]] },
  { key: "bandWaitMaxMs", group: "BAND TIME", label: "Waits at most", help: "The longest the band holds for your note; then it goes on.", kind: "number", min: 0, max: 1000, step: 20, unit: "ms" },
  { key: "bandSmooth", group: "BAND TIME", label: "Following: smoothing", help: "FOLLOWS: each new note's weight in the band's estimate of your lateness (lower: smoother, slower to follow).", kind: "number", min: 0.05, max: 1, step: 0.05 },
  { key: "bandBoundPct", group: "BAND TIME", label: "Following: at most", help: "FOLLOWS: the band's tempo stays within this of the written (set at each beat, never within one).", kind: "number", min: 0, max: 10, step: 0.5, unit: "%" },
  { key: "bandDriftMaxMs", group: "BAND TIME", label: "Following: drift cap", help: "FOLLOWS: how far the band may fall behind (or run ahead of) the written time by its tempo; it is pulled back toward it and gives way no further.", kind: "number", min: 50, max: 1000, step: 25, unit: "ms" },
  { key: "glenn", group: "MECHANICS", label: "Glenn's mechanics (off: CLASSIC)", help: "D378: the game's since WTC 1.83; off, MECHANICS: CLASSIC, the game before it (lab.html?glenn=0). D376: on harpsichord, lute and piano the note left rings until its thumb lifts (at most 400 ms, the piano 250); a slide on a keyboard strikes the next note and begins a slur to the next detach or strong beat; a slide arrives within 0.15 row, a shake's legs alternate; joined means a gap of 25 ms or less; an accent needs no hold; on strings, winds and voices two thumbs re-articulate and a slide glides, timed by the thumb.", kind: "bool" },
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
