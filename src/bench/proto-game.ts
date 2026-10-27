/**
 * The testbench's game (D175; D178; D179): one voice of a piece played against the others, judged by
 * a prototype (protos.ts). The time picks the note (the pending one nearest in time, within the
 * window); the place judges it: right, Bach's note sounds; wrong, what was asked for sounds all the same
 * (D293: no longer muffled; the PIANO's wrong key), and it does not count. A held thumb slid onto the next
 * note's place plays it; a thumb moved across the dynamic axis while its note sounds swells or fades it
 * (D293: where the run asks for dynamics); a thumb
 * flicked upwards as it lets go sends its note off with a swoosh. The player's voice sounds as the
 * others do (D208; chip.ts leadOf). It can also be played from a computer's keys or a MIDI keyboard. On the audio
 * clock as heard; the others phrased (phrasing.ts); a band's rhythm section keeps the beat. A note
 * too quick to strike at the tempo played rides after the note before (D191: lanes.ts quickRides):
 * it sounds by itself once that note is played right, and is neither judged nor counted.
 */
import { freeOrnamentParts, ornamentMark, ornamentsOf, realiseHeld, realiseNote, shakeOf, type Ornament, type Shake } from "../touch/ornament-play.ts";
import { feedShake, shakeTracker, type FreeKind, type ShakeTracker } from "../touch/free-ornament.ts";
import { freeTally, type FreeTally } from "./free-summary.ts";
import type { Arrow } from "../touch/MusicBox.tsx";
import type { Burst, Pop } from "../touch/box-fx.ts";
import { isPhone, voicing, type Chip, type Play, type Sounding } from "../touch/chip.ts";
import type { Grade } from "../touch/engine.ts";
import { scoreSheet, type Sheet } from "./score-sheet.ts";
import { acrossBar, planTouches, type Touch } from "./fingering.ts";
import { LEVEL_D, planLevel, readingMarks } from "../touch/readings.ts";
import { barAt, barStart, beatOf, cadenceName, countInStart, inBar, keyAt, type TouchFugue } from "../touch/fugue.ts";
import { echoHalves, repeatHalves } from "./echo.ts";
// D317, THE LAB: the judging parameters (defaults the constants below) and the event tap.
import { MECH, ownFreshSeconds, relMs } from "./mechanics.ts";
import { between, dragFamily, dragFill, fillNoteMs, glideAt, glideMs, scaleOfKey } from "./drag.ts";
import type { LabEvent, LadderWhy, LegatoWhy } from "./lab/events.ts";
import { findRuns, runTrend, type Run } from "./runs.ts";
/** D247: the smallest row (CSS px) LADDER judges a touch by (the voice's range filled rows of about 18 to 24). */
export const LADDER_ROW_MIN = 18;
/** D314: a free ornament's sign rising from its note (a pale gold: a flourish, not a score). */
const FREE_INK = "#f3d78a";
/** D290: the narrowest window a note keeps on either side, however close its neighbours (ms). */
export const SPLIT_FLOOR_MS = 60;
/** D290: a contact this soon after a note was struck is the same strike doubled (ms). */
export const DOUBLE_MS = 120;
/** D289: the least travel of a held thumb that slides on to the next note (px). */
export const SLIDE_MIN_PX = 10;
/**
 * D318, THE SLUR'S SECOND THUMB (slurNext): while the other thumb holds the voice's note before, a landing
 * strikes the next note up to SLUR_EARLY_SHARE of the time between their onsets early (at most
 * SLUR_EARLY_MAX_MS); landed earlier still (but SLUR_ROLL_MIN_MS or more after that note was struck: two
 * thumbs together are no slur) it waits, down, and strikes it then.
 */
export const SLUR_EARLY_SHARE = 0.5;
export const SLUR_EARLY_MAX_MS = 250;
export const SLUR_ROLL_MIN_MS = 40;
/* (D317: the engine reads these from MECH, slurEarlyShare, slurEarlyMaxMs, slurRollMinMs, sameThumbPx, slideTakeMs; the constants are the defaults.) */
/** D334: a landing this soon before the other thumb's strike (ms: a touch frame, the same moment) may still rest prepared after it. */
export const PREP_FRAME_MS = 20;
/** D318: a contact this close (px, across and along) to a thumb still down is that thumb's own (a roll: D290's DOUBLE), not the other thumb. */
export const SAME_THUMB_PX = 24;
/** D318: a thumb landing this soon (ms) on the note the other thumb's drift just slid onto takes it over (slideTaken). */
export const SLIDE_TAKE_MS = 120;
/** D286: how long a thumb's last touch stays its reference for its next note (seconds). */
export const OWN_FRESH_S = 3;
/** D296: the share of a bar's height at each end where a thumb that can go no further may stay. */
export const EDGE_SHARE = 0.12;
/** D296: the move (in rows) the line's travel over a fourth or more asks of a thumb, the right way. */
export let TRAVEL_MIN = 0.25;
export const setTravelMin = (v: number) => ((TRAVEL_MIN = v), (MECH.travelMin = v));
import { chordOf, laneNotes, options, preludeRides, quickRides, release, strike, strikeNext, sweep, windowOf, type LaneNote, type LaneOptions } from "../touch/lanes.ts";
import type { Keyboard } from "../touch/piano.ts";
import { holdValue, strengthOf, TOUCH_NEUTRAL, touchKind } from "../touch/touch-expr.ts";
import { follow, joins, phrase, phraseContext, ritard, withSpeed, type Shape } from "../touch/phrasing.ts";
import { arcOf, handsAt, liftAt, lineAt, pedalSpans, stepAt, type Arc } from "./arc.ts";
import { PATCHES, preset } from "../touch/sound.ts";
import type { Side } from "../touch/thumbs.ts";
import { accompaniment, subjectMarks, type OtherNote } from "../touch/voice-mode.ts";
import { SubjectSound } from "../touch/subject-fx.ts";
import { pianoKey, pianoKeys } from "./placed.ts";
import type { Clock } from "./her-clock.ts";
import { BandTime, waitPoints, type BandEvent } from "./band-time.ts";
import type { ArtFlash, ArtStats } from "./articulation.ts";
import { CLEAN_INK, HELD_INK, holdBonus, LEGATO_INK, legatoGapMs, releaseVerdict, restAfter } from "./articulation.ts";
import { afterCadence, artBonus, artRoom, dissonantAt, graceMs, heldBounds, holdOf, strongBeat, touchStyle, TouchSense, valueClass, type Grace } from "./intention.ts";
import { scaleFits, scaleKeys, keyPitch, SCALE_LANES, type ScaleKey } from "./scale-keys.ts";
import { preludeRideMs } from "./tiers.ts";
import { lineKey, subjectLine, type LineEntry, type Stretto, type SubjectLine } from "./subject-line.ts";
import { BAR, barAcross, barDynamic, contourCue, contourOk, dynamic, HOME_LANES, keyPlace, planLanes, levelOf, moves, stepNear, stepPitch, type Move, type Options, type Proto, laneOk, isRepeat } from "./protos.ts";

export const PERFECT_MS = 70;
/** The multiplier's step (notes right in a row), and CON FUOCO's run. */
export const STEP_NOTES = 8;
export const FUOCO_NOTES = 24;
/** How far ahead the next note shows, in ms. */
export const APPROACH_MS = 1100;
const HOLD_MAX = 8;
/** D319: the player's trill sounds its notes this far ahead of the clock (s), so that it can stop when the shaking does. */
const TRILL_AHEAD_S = 0.06;
/**
 * D299, BLUETOOTH MODE (replacing D223's armed notes): the whole piece is on the audio clock's
 * schedule, the player's own notes too, at their written times and lengths and at their usual level
 * (D293: loudness never follows the player's input), so that through the headphones' delay everything
 * is heard in time; a touch makes no sound (it would be heard a delay late): it scores, judged against
 * the music as heard and drawn. A note missed sounds all the same (provisional: the owner's Decision 8).
 * The window a little wider on both sides (the headphones' jitter).
 */
export const BT_EARLY_MS = 20;
/** D306: how far ahead (s) the player's own notes go on the schedule in BLUETOOTH MODE (the band's go further). */
export const ARM_AHEAD_S = 0.15;
export const BT_LATE_MS = 25;
/** D299: the player's own note in BLUETOOTH MODE, scheduled ahead ("track:onset"). */
interface Armed {
  k: number;
  i: number;
  sounds: Sounding[];
  /** D306: its own sounds (the note, its chord, its ornament, its subject's layers; not the notes riding after it nor a traced line's), cut when the touch lets go. */
  own: Sounding[];
  /** D306: when its note starts (audio clock). */
  at: number;
  /** "sounding": on the schedule; "hit": a right touch has scored it (its riders shown as they sound). */
  state: "sounding" | "hit";
  /** When (audio clock) the record may be dropped. */
  until: number;
}
/** D299: what a touch "sounds" in BLUETOOTH MODE: nothing (the note is already on the schedule). */
const SILENT = (): Sounding => ({ stop() {}, bend() {}, glide() {}, muffle() {}, dyn() {} });
/** D191: notes gone by are swept as missed this long (s) after their window closes: a frame's grace. */
export const SWEEP_GRACE_S = 0.035;
/** A thumb let go moving upwards at least this fast (px per ms), over this far (px): a swoosh. */
const SWOOSH_V = 0.7;
const SWOOSH_PX = 30;

export interface Contact {
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A key of a computer or a MIDI keyboard: a pitch (MIDI), or a move (the computer's arrows and WASD). */
export interface KeyPress {
  /** EASY (computer): a trill on the note. */
  trill?: boolean;
  /** The hand (TWO VOICES: which voice). */
  side?: Side;
  midi?: number;
  move?: { dir: number; big: boolean };
  /** EASY's DIRECTION (D187): the key struck. */
  code?: string;
  /** 0 to 1. */
  velocity?: number;
  /** D311: a MIDI keyboard's velocity (0 to 1): the piano's touch (a computer's keys give none: the bar's middle). */
  touch?: number;
}

/** The bars' screens: the music box's rows and time in the play area's coordinates (set by the app as the screen is laid out). */
export interface Rows {
  yOf(step: number): number;
  stepAt(y: number): number;
  rowH: number;
  /** Where a tick is drawn across the box. */
  xOf(tick: number): number;
}

interface Held {
  side: Side;
  /** The voice it plays (TWO VOICES: the left thumb the first, the right the second). */
  k: number;
  /** Where it landed, and where it last played a note (for the next slide). */
  x0: number;
  ax: number;
  ay: number;
  /** The note it plays (-1 none), its chord, its sound, the pitch sounding, its place (column, key, row). */
  note: number;
  chord: number[];
  sounds: Sounding[];
  midi: number;
  cell?: number;
  /** The dynamic it struck at (0 pp to 1 ff). */
  d0: number;
  /** D208: another thumb has struck since on this voice: this one is on its way off and slides no more. */
  passive?: boolean;
  /**
   * D278: its note's ornament, played by shaking the thumb: the pitches (main, the one above, the one
   * below), the moves made (each past the shake's reach, the other way from the last), where the last
   * began, the voicing and play its notes sound with, the tick it must be done by, and whether it is.
   */
  orn?: Shake & { main: number; upper: number; lower: number; moves: number; dir: 0 | 1 | -1; from: number; firstDir: 0 | 1 | -1; v: ReturnType<typeof voicing>; play: Play; by: number; done: boolean; signs: string };
  /**
   * D319: a trill under way on its note (written, D278, or free, D314): its notes from the first shake to
   * the note's end ([onset, length, MIDI] in ticks, the realisation's), the next to sound, the tick of
   * the last leg (it settles on the main note MECH.trillStopMs after it), and whether it has settled.
   */
  trill?: { parts: [number, number, number][]; next: number; last: number; main: number; v: ReturnType<typeof voicing>; play: Play; settled: boolean; live: { sd: Sounding; end: number }[] };
  /** D272: its note is one the reading wants short (staccato): judged so at its end. */
  wantShort?: boolean;
  /** D314: how its note sounds (the voicing and play it was struck with), for a free ornament's notes. */
  tone?: { v: ReturnType<typeof voicing>; play: Play };
  /** D314: a shake under way on its note (free-ornament.ts), and the note it is on. */
  free?: ShakeTracker & { note: number };
  /** D280: where across its bar it touches (0..1 of the touch area's width), for the thumbs drawn. */
  across?: number;
  /**
   * D311: where across its bar it landed, as strength (0 soft, 1 strong: D314/D315, the strong side by
   * STRONG_SIDE), mirrored per bar (protos.ts barDynamic): the note's attack (touch-expr.ts); its sideways travel from there, the sustain.
   */
  land?: number;
  /** D336: when the thumb landed (its touch's time stamp), for the lab's strike reading. */
  t0?: number;
  /** D271: the way its slides have gone (1 up or right, -1 down or left): a held thumb slides one way only. */
  slideDir?: 1 | -1;
  /** D306, BLUETOOTH MODE: its note as scheduled, cut when the touch lets go (a staccato heard, a headphones' delay late). */
  armed?: Armed;
  /** D293: another thumb has taken over its voice while it is still down (an overlapping legato): it only holds, it slides no more. */
  handed?: boolean;
  /** D318: down early for the slur's next note (slurNext): the note, the tick it strikes at, where the thumb is. */
  /** D318: waiting for note i: struck from `open` (the slur's early reach); D329 `lift`: the note's own early window, where the other thumb's release may sound it (MECH.waitSounds "lift"). */
  wait?: { i: number; open: number; lift: number; c: Contact; prep?: Prep };
  /** D334: a note it struck by a PRESS while this thumb still held the note before (over-legato): reported as it lets go. */
  overFrom?: { tick: number; i: number };
  /** Its last positions, for a flick. */
  trail: { t: number; y: number }[];
  /** The points its note scored (taken back if its articulation fails). */
  pts?: number;
  /** D213: the subject's effect layers under its note, stopped with it. */
  fx?: Sounding[];
  /** D218: its note struck right and not yet judged for its end (HELD, SHORT, CLEAN, REST!). */
  open?: boolean;
  /**
   * D258, SWEEP: its chord's notes still to sound, lowest first (the next when the thumb slides on up,
   * or by itself at `next` on the audio clock), where the thumb was at the last, and how many the
   * slide has sounded.
   */
  sweep?: { queue: number[]; next: number; x: number; slid: number; voice: ReturnType<typeof voicing>; play: Play };
  /** D262: the row of pads it touched (0 the upper, 1 the lower: the second keyboard). */
  row?: 0 | 1;
  /** D262, THE LINE: the half bar's notes still to sound, each by the thumb sliding on (or by itself on time). */
  trace?: Trace;
  /** D321: the last time (ms) the thumb was still where it last played (a drag's start), and the drag's length at its slide (ms). */
  still?: number;
  dragMs?: number;
  /** D321, "connect": a glide under way (the sound, from and to MIDI, its start on the audio clock, its length in ms). */
  glider?: { sd: Sounding; from: number; to: number; t0: number; ms: number };
}

/**
 * D334, PREPARED (MECH.prepare): a thumb resting on its next note while the other holds the note before:
 * when it landed, and where it settled (a PRESS's base).
 */
interface Prep {
  tick: number;
  x0: number;
  y0: number;
}

/** D262: a traced line's notes still to sound, where the thumb was, how many it slid, how they sound. */
interface Trace {
  queue: { on: number; dur: number; midi: number }[];
  x: number;
  slid: number;
  count: number;
  voice: ReturnType<typeof voicing>;
  play: Play;
}

/** A touch as the music box shows it: when, at what step (the one asked for), right or wrong. */
export interface Mark {
  tick: number;
  step: number;
  ok: boolean;
}

/**
 * D239: a right note on a HIGHWAY (the computer's keys, the phone's lanes) in DIRECTION or LEAPS: in
 * its planned lane ("exact": full points, a chime) or only the right way from the last ("relative":
 * half the points, the note duller); none where the lane plays no part (TIMING, a free note).
 */
export type LaneGrade = "exact" | "relative";
/** D239: a relative note's share of the points, and its sound's darkening (Play.bright). */
export const RELATIVE_SHARE = 0.5;
export const RELATIVE_DULL = 0.4;
/** D293: the dynamic a touch is heard at where touch dynamics are not asked for (the others' own, `feel`). */
export const NEUTRAL_D = 0.55;
/** D239: points as shown: a relative note's half point as ½ ("1½"). */
export function ptsText(p: number): string {
  const w = Math.floor(p);
  return p - w >= 0.5 ? `${w || ""}½` : String(w);
}
/** D239: the results' line: "LANE 72% · DIRECTION 28%" (empty with no lane-graded note). */
export function laneLine(t: { exact: number; relative: number }): string {
  const n = t.exact + t.relative;
  if (!n) return "";
  const e = Math.round((100 * t.exact) / n);
  return `LANE ${e}% · DIRECTION ${100 - e}%`;
}

/** D336: what THE LAB's DYNAMICS is told of a note about to sound (ProtoGame.noteDyn). */
export interface NoteDynAsk {
  k: number;
  i: number;
  /** The pitch sounding (the wrong one for a wrong note). */
  midi: number;
  side: Side;
  /** D311's landing across the bar (0 the soft side .. 1 the strong; the middle off the bars). */
  land: number;
  /** Where across its bar (0 by the box, 1 the phone's edge), on the bars. */
  across?: number;
  /** The landing's time stamp (the touch's; null for a key). */
  ts: number | null;
  /** How it sounded: a pull-off or a press has no strike of its own; a hammer-on lands while the other holds. */
  gesture?: "hammer-on" | "pull-off" | "press";
  ok: boolean;
}
export interface NoteDynAnswer {
  touch: number;
  level: number;
  /** The sounds made for it (and the audio time they began), for the late correction. */
  sounded?: (sounds: readonly Sounding[], at: number) => void;
}
type Verdict = { ok: boolean; wrong?: number; why?: "gesture" | "legato" | "hand" | "height" | "dynamic"; lane?: LaneGrade; at?: number };

/** A voice the player plays: its notes as judged, and their moves. */
export interface Track {
  voice: number;
  notes: LaneNote[];
  moves: Move[];
  /** D214, D217: the onsets that start a new contour (an entry's first note; a stretto's first lower-row note): free. */
  fresh?: Set<number>;
  /** D258: the onsets of its chords spread upward (SWEEP). */
  sweeps?: Set<number>;
  /** D262, THE LINE: each traced half bar's first note's onset, and the notes the slide sounds after it. */
  traces?: Map<number, { on: number; dur: number; midi: number }[]>;
}

/** D198: a slip cools the crowd by this much (of 1); D259: in a prelude by less. */
export const SLIP_CROWD = 0.045;
export const SLIP_CROWD_PRELUDE = 0.03;
/** What a run came to (the result screen). */
export interface RunResults {
  right: number;
  wrong: number;
  missed: number;
  stray: number;
  of: number;
  score: number;
  grade: string;
  captured: number;
  entries: number;
  maxStreak: number;
  stars: number;
  failedBar: number | null;
  /** D268: the piece's last bar; how far the run went (0..1); the score sheet. */
  lastBar: number;
  progress: number;
  sheet: Sheet;
  /** D271: the tutorial's measures (ProtoGame.thumbs, levels, slides). */
  thumbs: { alt: number; of: number };
  levels: { on: number; d: number }[];
  slides: number;
  /** D278: the ornaments played by shaking, of those given. */
  shakes: { hit: number; of: number };
  /** D327: the player's own ornaments, each note once (no points). */
  free: FreeTally;
  art: ArtStats;
  lanes: { exact: number; relative: number };
  report: string;
}
/** D268: where a score's points came from. */
export type ScoreSource = "notes" | "articulation" | "held" | "subjects" | "cadences" | "bonus" | "reading";
/** D249: a slip costs the streak a quarter, at least this many notes. */
export const SLIP_LOSS_MIN = 4;
/** D249: a second slip within this many right notes of the one before costs a multiplier step. */
export const SLIP_NEAR = 8;
/** D249: the streak (or combo) after a slip: a quarter lost, at least SLIP_LOSS_MIN, never below 0. */
export function slipLoss(n: number): number {
  return Math.max(0, n - Math.max(SLIP_LOSS_MIN, Math.ceil(n / 4)));
}

/** D217: the two rows of pads meet this far (px) above the play area's foot (paint-proto.ts padRows; D257: the strike line 216 px up, pads 84 px tall). */
export const PAD_SPLIT = 136;
/** D262, THE LINE: a line mostly slid: its bonus (times the multiplier). */
export const TRACE_POINTS = 2;
/** D262: the second keyboard (the lower row): its level and its darkening against the first. */
export const ECHO_LEVEL = 0.55;
export const ECHO_DARK = 0.6;
/** D261: in a prelude a note shorter than this is a tap (no tail, its release not judged); longer, a hold with a tail its length. */
export const PRELUDE_TAP_MS = 400;
/** D258, SWEEP: a spread chord's notes this far apart when they sound by themselves (s). */
export const SWEEP_GAP_S = 0.06;
/** D258: a slide begun and stalled: the next note sounds by itself after this long (s). */
export const SWEEP_WAIT_S = 0.35;
/** D258: the thumb's travel (either way) that sounds the next note, in lanes. */
export const SWEEP_STEP = 0.4;
/** D258: a chord slid all the way up: its bonus (times the multiplier). */
export const SWEEP_POINTS = 2;
/** D257: the phone's strike line, this far (px) above the play area's foot (paint-proto.ts: the pads under it). */
export const PHONE_LINE = 216;

export class ProtoGame {
  readonly f: TouchFugue;
  /** The voices played: one, or two (TWO VOICES, one per thumb). The first's are also `voice`, `notes`, `moves`. */
  readonly tracks: Track[];
  readonly voice: number;
  readonly notes: LaneNote[];
  readonly moves: Move[];
  readonly others: OtherNote[];
  readonly start: number;
  readonly entry: number;
  readonly end: number;
  tps: number;
  opt: LaneOptions;
  readonly proto: Proto;
  readonly o: Options;
  /** The sideways PIANO's keyboard. */
  readonly kb: Keyboard;
  /** LADDER: the box's rows, as laid out now. */
  rows: Rows | null = null;
  now = 0;
  combo = 0;
  grade: Grade | null = null;
  /** EASY (computer): the keys down now (their codes), for the screen. */
  readonly keysDown = new Set<string>();
  /** EASY (computer): Shift held, the pedal: notes let go ring on until it is lifted. */
  private pedalled: Sounding[] = [];
  private pedalDown = false;
  /** LADDER: the touch that played the last note (its thumb, its height). */
  lastTouch: { side: Side; y: number } | null = null;
  /** D286: each thumb's own last touch and the staff step of the note it played. */
  lastBySide: Partial<Record<Side, { y: number; step: number; tick: number; moved?: boolean }>> = {};
  /** D296: each thumb's recent touches (the last first pushed last), for the line's travel. */
  trailBySide: Partial<Record<Side, { y: number; step: number; tick: number; moved?: boolean }[]>> = {};
  /** D296: a thumb's touch remembered (its last, and its recent ones). */
  private remember(side: Side, t: { y: number; step: number; tick: number }) {
    this.lastBySide[side] = t;
    const tr = (this.trailBySide[side] ??= []);
    tr.push(t);
    if (tr.length > 8) tr.shift();
  }
  /** The touches, for the music box. */
  readonly marks: Mark[] = [];
  /**
   * D181, the score (after Guitar Hero and Rock Band, Frequency, Hi-Fi Rush): a note right scores 2
   * (PERFECT) or 1 (GOOD) times the multiplier; the multiplier climbs ×1 to ×4, a step for every
   * STEP_NOTES right in a row, and falls a step (not to ×1) on a slip (D249: on a second slip close to
   * the one before). An entry of the subject played
   * through without a slip is captured: its ◆ turns gold, it scores a bonus, and ORGANO PLENO follows,
   * every note doubled in points and in sound (an octave above and below) until the next entry. A run
   * of FUOCO_NOTES right ignites CON FUOCO, the notes brighter and glowing, until a slip.
   */
  score = 0;
  mult = 1;
  streak = 0;
  maxStreak = 0;
  /** The entries of the voices played: when each starts (its ◆), whether captured, whether lost. */
  readonly entries: { voice: number; k: number; on: number; end: number; ons: number[]; state: "open" | "captured" | "lost" }[] = [];
  /** ORGANO PLENO: until this tick (none: -1). */
  plenoUntil = -1;
  get pleno() {
    return this.plenoUntil >= 0 && this.now < this.plenoUntil;
  }
  /** When a banner was raised (performance.now()), and which. */
  banner: { text: string; at: number } | null = null;
  private chip: Chip;
  beat: number;
  private perBar: number;
  private anchorAt: number;
  private anchorTick: number;
  private nextBeat: number;
  private nextOther = 0;
  private readonly shapes: Shape[];
  private held = new Map<number, Held>();
  private readonly rit: ReturnType<typeof ritard> = { warp: (t: number) => t, unwarp: (w: number) => w };
  /** D216, KIMIKO (D219: WITH KIMIKO ISHIZAKA, a switch in LADDER and SUBJECT): her clock (her-clock.ts), the game on Kimiko Ishizaka's time. */
  readonly clock: Clock | null = null;
  /** D215: the notes played right and the slips, so far (counted only; the fade went with D216). */
  hits = 0;
  slips = 0;
  /** How the player has been playing, 0 (pp) to 1 (ff): the others follow, a little. */
  private feel = 0.55;

  /**
   * D216, KIMIKO: `o.clock` puts the game on her time (her-clock.ts), in place of the steady tempo and
   * the final ritard: the windows (in ticks) at her mean tempo over the passage. D219: taken only WITH
   * KIMIKO ISHIZAKA (`o.her`); then the game sounds nothing but the player's voice: no other voices, no
   * band, no subject effects, no click past a quiet count-in.
   */
  constructor(f: TouchFugue, voices: number | number[], from: number, proto: Proto, o: Options & { bpm: number; clock?: Clock }, chip: Chip) {
    this.f = f;
    this.proto = proto;
    this.startTick = from;
    this.ornaments = ornamentsOf(f);
    this.subj = new SubjectSound(f);
    this.o = o;
    this.chip = chip;
    if (chip.coupling) chip.coupling = { up: 0, down: 0, split: 48 };
    const b = beatOf(f);
    this.beat = b.ticks;
    this.perBar = b.perBar;
    // D181: the tempo counts quarter notes, whatever the metre (in 2/2 the beat was a half note: twice as fast).
    this.tps = (f.tpq * o.bpm) / 60;
    if (o.clock && o.her) (this.rit = o.clock), (this.tps = o.clock.tps), (this.clock = o.clock);
    else if (o.until === undefined || o.until >= f.length) this.rit = ritard(f.length, f.barTicks);
    // D250: a prelude's arc (arc.ts): its tempo rising subtly, its notes passing to the player by section.
    const arc = o.her || proto.id === "subject" ? undefined : arcOf(f);
    this.arc = arc;
    if (arc?.tempo && !(o.clock && o.her)) {
      const tempo = arc.tempo;
      this.rit = withSpeed(this.rit, (t) => lineAt(f, tempo, t), f.length, f.tpq / 4);
    }
    // D191: how far apart two ticks sound, in ms (at this tempo, the final ritard included).
    const msBetween = (a: number, c: number) => ((this.rit.warp(c) - this.rit.warp(a)) / this.tps) * 1000;
    // D214, SUBJECT: one line, the subject's notes in every entry, whichever voice (subject-line.ts).
    const line = proto.id === "subject" ? subjectLine(f, from, o.until) : null;
    this.line = line;
    // D252, BOTH HANDS: where the arc gives the left hand to the left thumb (the right hand's game on a
    // phone's road or the computer's keys), it is a second track, its notes those of the sections it
    // plays (outside the pedals, which are the left thumb's).
    const spans = pedalSpans(f, arc);
    const inPedal = (on: number) => spans.some((p) => on >= p.on && on < p.end);
    const handsOn = !!arc?.hands && !line && (proto.id === "highway" || proto.id === "keys") && (Array.isArray(voices) ? voices : [voices]).join() === "0" && f.voices.length > 1;
    this.hands = handsOn;
    const lhMine = (on: number) => handsOn && handsAt(f, arc, on) !== null && !inPedal(on);
    const voiceList = handsOn ? [0, 1] : Array.isArray(voices) ? voices : [voices];
    // D258: the right hand's line handed to another voice for some bars (Prelude 4's climax: the bass).
    const tov = arc?.takeover && !handsOn && !line && f.kind === "prelude" && voiceList.join() === "0" ? arc.takeover : null;
    const take = tov ? { voice: tov.voice, on: barStart(f, tov.from), end: barStart(f, tov.to) } : null;
    this.take = take;
    const inTake = (on: number) => !!take && on >= take.on && on < take.end;
    // D258: the inner voice's notes taken into the right hand's spread chords (no longer the others').
    const sweepKeys = new Set<string>();
    // D261: the player's own voice's notes given to the others (each thumb only its top or bass notes).
    const movedOut = new Set<string>();
    this.tracks = line ? this.lineTracks(line, msBetween) : voiceList.map((v) => {
      const src = take && v === 0 ? [...f.voices[0].filter(([on]) => !inTake(on)), ...f.voices[take.voice].filter(([on]) => inTake(on))].sort((a, b) => a[0] - b[0] || b[2] - a[2]) : f.voices[v];
      const notes = laneNotes(
        src.filter(([on]) => on >= from && (o.until === undefined || on < o.until) && (!handsOn || v !== 1 || lhMine(on))),
        this.beat,
        v,
      );
      if (take && v === 0) for (const n of notes) if (inTake(n.on)) n.voice = take.voice;
      // D261: each thumb only its notes: the top of each half bar (right), the bass at its start (left).
      const pick = f.kind === "prelude" && !line ? (v === 0 ? arc?.strike?.rh : handsOn && v === 1 ? arc?.strike?.lh : undefined) : undefined;
      const traces = new Map<number, { on: number; dur: number; midi: number }[]>();
      if (pick) {
        const groups = new Map<number, LaneNote[]>();
        for (const n of notes) {
          const b = barAt(f, n.on);
          const key = b * 2 + Math.floor((n.on - barStart(f, b)) / (f.barTicks / 2));
          groups.set(key, [...(groups.get(key) ?? []), n]);
        }
        const keep = new Set<LaneNote>();
        const tr = v === 0 && arc?.trace ? arc.trace : null;
        const traced = new Set<LaneNote>();
        for (const g of groups.values()) {
          // D262, THE LINE: a traced half bar: its first note struck, the others the slide's.
          if (tr && barAt(f, g[0].on) >= tr[0] && barAt(f, g[0].on) < tr[1]) {
            const first = g.reduce((a, n) => (n.on < a.on ? n : a));
            keep.add(first);
            const rest = g.filter((n) => n !== first).sort((a, b) => a.on - b.on);
            traces.set(first.on, rest.map((n) => ({ on: n.on, dur: n.dur, midi: n.midi })));
            for (const n of rest) traced.add(n);
            continue;
          }
          if (pick === "tops") keep.add(g.reduce((a, n) => (n.midi > a.midi ? n : a)));
          else {
            const first = Math.min(...g.map((n) => n.on));
            keep.add(g.filter((n) => n.on === first).reduce((a, n) => (n.midi < a.midi ? n : a)));
          }
        }
        for (let i = notes.length - 1; i >= 0; i--) {
          if (keep.has(notes[i])) notes[i].ride = false;
          else if (traced.has(notes[i])) notes.splice(i, 1);
          else movedOut.add(lineKey(notes[i].voice ?? v, notes[i].on, notes[i].midi)), notes.splice(i, 1);
        }
      }
      // D191: the notes too quick to strike ride after the note before; D229: in a prelude, more of them (the strong notes struck; D232: its threshold by its fugue's tier).
      const rideMs = preludeRideMs(f.id);
      const lhFactor = (t: number) => handsAt(f, arc, t) ?? 1;
      if (pick) {
        /* D261: every note left is struck */
      } else if (f.kind === "prelude") preludeRides(notes, this.beat, msBetween, (t) => inBar(f, t), this.beat === f.tpq * (4 / Number(f.meter.split("/")[1])) * 3 ? 3 : 2, arc ? (t: number) => rideMs * (handsOn && v === 1 ? lhFactor(t) : stepAt(f, arc.rides, t)) : rideMs);
      else quickRides(notes, this.beat, msBetween);
      // D253: the left hand strikes only where its bass changes: the same bass again within the bar
      // (Prelude 1's second half) plays itself, so a thumb held on it is right (the owner: errors while
      // "playing correctly", the left thumb held).
      if (handsOn && v === 1 && !pick) {
        let last: LaneNote | null = null;
        for (const n of notes) {
          if (n.ride) continue;
          if (last && n.midi === last.midi && barAt(f, n.on) === barAt(f, last.on)) n.ride = true;
          else last = n;
        }
      }
      // D258, SWEEP: a note of a quarter or more begun with the inner voice under it becomes a chord, spread upward when struck.
      let sweeps: Set<number> | undefined;
      if (arc?.sweeps && f.kind === "prelude" && v === 0 && !handsOn) {
        sweeps = new Set();
        const inner = f.voices[1] ?? [];
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          if (n.ride || n.dur < f.tpq || n.voice !== 0 || notes[i - 1]?.on === n.on || notes[i + 1]?.on === n.on) continue;
          const under = inner.filter(([on, , m]) => on === n.on && m < n.midi);
          if (!under.length) continue;
          notes.splice(i + 1, 0, ...laneNotes(under, this.beat, 1));
          sweeps.add(n.on);
          for (const [on, , m] of under) sweepKeys.add(lineKey(1, on, m));
        }
      }
      // D258: the line handed over and back: each a new contour (free).
      const fresh = take && v === 0 ? new Set([notes.find((n) => n.on >= take.on)?.on, notes.find((n) => n.on >= take.end)?.on].filter((x): x is number => x !== undefined)) : undefined;
      const mv = moves(notes, this.beat);
      return { voice: v, notes, moves: mv, fresh, sweeps, traces: traces.size ? traces : undefined };
    });
    [{ voice: this.voice, notes: this.notes, moves: this.moves }] = this.tracks;
    const played = this.tracks.map((t) => t.voice);
    this.others = o.solo || o.her ? [] : line ? accompaniment(f, from, -1).filter((n) => !line.keys.has(lineKey(n.voice, n.on, n.midi)) && (o.until === undefined || n.on < o.until)) : handsOn ? accompaniment(f, from, -1).filter((n) => (movedOut.has(lineKey(n.voice, n.on, n.midi)) || (n.voice !== 0 && !(n.voice === 1 && lhMine(n.on)))) && (o.until === undefined || n.on < o.until)) : accompaniment(f, from, take || movedOut.size ? -1 : played[0]).filter((n) => (take && inTake(n.on) ? n.voice !== take.voice : !played.includes(n.voice) || movedOut.has(lineKey(n.voice, n.on, n.midi))) && !sweepKeys.has(lineKey(n.voice, n.on, n.midi)) && (o.until === undefined || n.on < o.until));
    // D302: the others joined and detached, the reading's marks on every entry of the subject.
    // D309: each instrument's table, the fugue's character, the piano's levels from the whole score (never the player's part).
    this.shapes = phrase(this.others, this.beat, (t) => inBar(f, t), subjectMarks(f).subject, undefined, phraseContext(f, this.bpm, readingMarks(f.entries, o.reading ?? null)));
    // Waiting (the lessons): no count-in, the clock stops at each note until it is struck.
    this.start = o.wait ? from - this.beat : countInStart(f, from);
    this.entry = from;
    this.end = (o.until ?? f.length) + this.beat;
    this.opt = options(f.tpq, this.bpm, "easy");
    // D317: the windows the lab's (MECH; by default options' 250 ms either side).
    const perMs = (f.tpq * this.bpm) / 60000;
    // D329: RELATIVE timing (the lab's): the windows scaled by the passage's usual time between struck notes (its median).
    {
      const ons = [...new Set((this.tracks[0]?.notes ?? []).filter((n) => !n.ride).map((n) => n.on))].sort((a, b) => a - b);
      const gaps = ons.slice(1).map((o, j) => (o - ons[j]) / perMs).sort((a, b) => a - b);
      this.ioiMedian = gaps.length ? gaps[gaps.length >> 1] : MECH.refIoiMs;
    }
    this.opt = { ...this.opt, early: relMs(MECH.earlyMs, this.ioiMedian) * perMs, late: relMs(MECH.lateMs, this.ioiMedian) * perMs };
    // D290: on the phone's ladder each note's window stops halfway to its neighbours (60 ms at least).
    if (proto.id === "ladder") this.opt = { ...this.opt, split: MECH.splitHalfway, floor: (relMs(MECH.splitFloorMs, this.ioiMedian) / 60000) * f.tpq * this.bpm };
    // D223, D299: BLUETOOTH MODE (not while the music waits for each note): the window a little wider
    // both sides (the headphones' jitter; D290's halfway split and its floor kept, so close notes never
    // share a window); the clock as heard smoothed (chip.ts `smooth`).
    this.bt = !!o.bt && !o.wait;
    if (this.bt) this.opt = { ...this.opt, early: this.opt.early + (MECH.btEarlyMs / 1000) * this.tps, late: this.opt.late + (MECH.btLateMs / 1000) * this.tps };
    chip.smooth = this.bt;
    this.anchorAt = chip.ctx.currentTime + 0.15;
    this.anchorTick = this.start;
    this.nextBeat = this.start;
    // D328, THE LAB's BAND TIME (band-time.ts): the band waits for the player, or follows; never in the game (MECH.bandTime "fixed").
    if (MECH.bandTime !== "fixed" && !o.wait && !o.her && !this.bt && !o.solo && this.others.length && this.tracks[0]) {
      const until = o.until ?? f.length;
      const waits = waitPoints(this.tracks[0].notes, f.cadences ?? [], { from, until, beat: this.beat, barTicks: f.barTicks, endsPiece: until >= f.length });
      const host = {
        warp: (t: number) => this.rit.warp(t),
        unwarp: (w: number) => this.rit.unwarp(w),
        beat: this.beat,
        start: this.start,
        entry: from,
        pendingAt: (tick: number) => this.tracks[0].notes.every((n) => n.on !== tick || n.state === "pending"),
        emit: (e: BandEvent) => this.tap?.({ kind: "band", track: 0, ...e }),
      };
      this.bandT = new BandTime(MECH.bandTime, host, waits, { t: this.anchorAt, tick: this.start, tps: this.tps });
    }
    // D250: THE PEDAL (the right hand's game only): its own lane, the figure around it, free at both ends.
    // D252: several, one after another; with both hands each in its own lane of the left thumb's.
    if (spans.length && this.tracks[0]?.voice === 0 && !line && (handsOn || this.tracks.length === 1)) {
      this.pedalList = spans.map((ps) => ({ ...ps, lane: handsOn ? ps.lane : 0, id: null, from: null, held: 0, announced: false, done: false, share: 0, sounds: [] }));
      for (const t of this.tracks) {
        const fresh = new Set(t.fresh ?? []);
        for (const ps of spans) {
          const first = t.notes.find((n) => n.on >= ps.on);
          const after = t.notes.find((n) => n.on >= ps.end);
          if (first) fresh.add(first.on);
          if (after) fresh.add(after.on);
        }
        t.fresh = fresh;
      }
    }
    if (arc?.finalChord) this.finalOn = this.tracks[0]?.notes.at(-1)?.on;
    if (line) for (const e of line.entries) this.entries.push({ voice: e.voice, k: 0, on: e.on, end: e.end, ons: e.ons, state: "open" });
    else
      this.tracks.forEach((t, k) => {
        // D289: only the entries that begin in the passage (the tutorial's "0 of 20" counted the whole invention's).
        for (const e of f.entries) if (e.voice === t.voice && e.on >= from && (o.until === undefined || e.on < o.until)) this.entries.push({ voice: e.voice, k, on: e.on, end: e.end, ons: e.notes.map((x) => x[0]), state: "open" });
      });
    this.kb = pianoKeys(this.notes);
  }

  /** D258: the bars where the right hand plays another voice's line (Prelude 4's climax), or null. */
  readonly take: { voice: number; on: number; end: number } | null;
  /** D214, SUBJECT: the subject line (its entries, their labels), or null. */
  readonly line: SubjectLine | null;
  /**
   * D214: the line as a track: each note in its own voice; an entry's first note never rides (it is
   * free: any lane). D217: and the second line (the older entry in a stretto, the lower row) as a
   * second track, reduced to its "special moves": only its notes on a beat or of half a beat or more
   * are struck, the quicker ones ride (D191, played for the player); each stretto's first note there
   * is struck and free.
   */
  private lineTracks(line: SubjectLine, msBetween: (a: number, c: number) => number): Track[] {
    const asNotes = (ns: SubjectLine["notes"]): LaneNote[] => ns.map(([on, dur, midi, step, voice]) => ({ on, dur, midi, step, long: dur >= this.beat, state: "pending", voice }));
    const notes = asNotes(line.notes);
    quickRides(notes, this.beat, msBetween);
    const heads = new Set(line.entries.map((e) => e.on));
    for (const n of notes) if (heads.has(n.on)) n.ride = false;
    const second = asNotes(line.second);
    quickRides(second, this.beat, msBetween);
    const fresh2 = new Set(line.secondHeads);
    for (const n of second) {
      if (inBar(this.f, n.on) % this.beat !== 0 && n.dur < this.beat / 2) n.ride = true;
      if (fresh2.has(n.on)) n.ride = false;
    }
    return [
      { voice: line.entries[0]?.voice ?? 0, notes, moves: moves(notes, this.beat), fresh: heads },
      { voice: line.entries.find((e) => e.on === line.second[0]?.[0])?.voice ?? line.second[0]?.[4] ?? 0, notes: second, moves: moves(second, this.beat), fresh: fresh2 },
    ];
  }
  /** D217, SUBJECT: the stretto sounding now (or about to, within `ahead` ticks), if any. */
  strettoNow(ahead = 0): Stretto | null {
    return this.line?.strettos.find((s) => s.on - ahead <= this.now && this.now < s.end) ?? null;
  }
  /** D217: the row a touch is in (the pads' split, as painted: PAD_SPLIT above the screen's foot), and the track it plays. */
  private rowTrack(c: Contact, ts: number): number {
    if (!this.line || this.tracks.length < 2 || c.y < c.h - PAD_SPLIT) return 0;
    // The lower row plays the second line during a stretto; outside one, either row plays the single entry.
    const t = this.tickOf(ts);
    return this.inStretto(t) || this.nearestPending(1, t) >= 0 ? 1 : 0;
  }
  /** D217: within a stretto (from the newer entry's arrival until the second line's last note ends). */
  private inStretto(t: number): boolean {
    return !!this.line?.strettos.some((s) => s.on <= t && t < s.end);
  }
  /** D214: the entry sounding now and the next to come (SUBJECT's banner and count-in). */
  entryNow(): { current: LineEntry | null; next: LineEntry | null } {
    const es = this.line?.entries ?? [];
    const j = es.findIndex((e) => e.on > this.now);
    const current = (j < 0 ? es.at(-1) : es[j - 1]) ?? null;
    // D217: of two entries beginning together, the main line's (listed last).
    let k = j;
    while (k >= 0 && k + 1 < es.length && es[k + 1].on === es[j].on) k++;
    return { current: current && this.now < current.end ? current : null, next: k < 0 ? null : es[k] };
  }
  /** A note's own voice (D214: SUBJECT's line moves between voices; it sounds in each one's voicing). */
  private voiceOf(k: number, i: number): number {
    return this.tracks[k].notes[i]?.voice ?? this.tracks[k].voice;
  }
  /** HIGHWAY's road and lanes: HIGHWAY, and SUBJECT on it (D214). */
  get road(): boolean {
    return this.proto.id === "highway" || this.proto.id === "subject";
  }

  /** D328, THE LAB: the band's time when it waits for or follows the player (band-time.ts); null: the written clock. */
  readonly bandT: BandTime | null = null;
  /** D328: the timestamp of the touch being handled (null within a frame), for when a note was struck. */
  private evTs: number | null = null;
  /** The clock, with the last cadence held back (phrasing.ts ritard). */
  private tickAt(t: number) {
    if (this.bandT) return this.rit.unwarp(this.bandT.wAt(t));
    return this.rit.unwarp(this.rit.warp(this.anchorTick) + (t - this.anchorAt) * this.tps);
  }
  /** The tick sounding at a time on the audio clock (D216: KIMIKO paints its road by time). */
  tickAtTime(t: number) {
    return this.tickAt(t);
  }
  /** When a tick sounds, on the audio clock. */
  timeAt(tick: number) {
    if (this.bandT) return this.bandT.tAtW(this.rit.warp(tick));
    return this.anchorAt + (this.rit.warp(tick) - this.rit.warp(this.anchorTick)) / this.tps;
  }
  private tickOf(ts: number) {
    return this.tickAt(this.chip.heard() - (this.wall() - ts) / 1000);
  }
  /** D317: the clock the events' timestamps are on (performance.now; a replay injects its own, so judging is deterministic). */
  wall: () => number = () => performance.now();
  /** D317, THE LAB: told of every judgement as it is made (lab/events.ts); null in the game. */
  tap: ((e: LabEvent) => void) | null = null;
  /**
   * D336, THE LAB's DYNAMICS in PASSAGE (lab/passage-dyn.ts): asked as the player's own note is about to
   * sound (struck, a hammer-on, a pull-off or a press; never a slide, never in BLUETOOTH MODE), it may
   * set the note's onset (Play.touch, a factor on Play.level) and is handed the sounds made, to correct
   * them once the strike is read. The sound only: the verdict, the points and the events are the same
   * with it or without it (the game never sets it).
   */
  noteDyn: ((n: NoteDynAsk) => NoteDynAnswer | null) | null = null;
  /** D317: how LADDER judged the last touch's height (for the tap). */
  private ladderWhy: LadderWhy | undefined;
  /** D317: the note nearest a stray touch (for the tap). */
  private nearOf(k: number, tick: number): { i: number; midi: number; offMs: number; taken?: string } | undefined {
    const notes = this.tracks[k]?.notes ?? [];
    let j = -1;
    notes.forEach((n, q) => {
      if (n.ride || (q > 0 && notes[q - 1].on === n.on)) return;
      if (j < 0 || Math.abs(n.on - tick) < Math.abs(notes[j].on - tick)) j = q;
    });
    const n = notes[j];
    if (!n) return undefined;
    const taken = n.state === "hit" && n.at !== undefined ? `${n.via ?? "touch"} ${Math.round(Math.abs(this.msOf(n.at, tick)))} ms ${n.at <= tick ? "before" : "after"}` : n.state === "miss" ? (n.wrong ? "wrong" : "missed") : undefined;
    return { i: j, midi: n.midi, offMs: this.msOf(n.on, tick), taken };
  }

  /** D223: the tick drawn now (the clock as heard, plus the screen's delay: Chip.visual). */
  viewNow = 0;
  /** D223: paints with `now` as drawn (the screen's delay taken in), the game's own clock kept. */
  view<T>(paint: () => T): T {
    const now = this.now;
    this.now = this.viewNow;
    try {
      return paint();
    } finally {
      this.now = now;
    }
  }

  /** D223, D299: BLUETOOTH MODE on for this game. */
  readonly bt: boolean;
  /** D299: each note struck right, how early (-) or late (+) it was as heard (ms), in BLUETOOTH MODE. */
  readonly btOffsets: number[] = [];
  /** D299: the player's notes put on the schedule ("track:onset"), and where each track's scheduling has reached. */
  private armed = new Map<string, Armed>();
  private armNext: number[] = [];
  /**
   * D306, BLUETOOTH MODE: whether each track's voice is live (the owner: "why the hell is player's voice
   * playing by itself even if player doesn't do shit?"). Only a live voice's coming notes go on the
   * schedule; a miss (or a wrong note) silences the voice and cuts its notes already scheduled; the next
   * right touch sounds at once (a headphones' delay late) and makes the voice live again. Live at the start.
   */
  private live: boolean[] = [];
  /** D306: a right touch on a note not on the schedule (the voice was silenced): it sounds, even in BLUETOOTH MODE. */
  private voiced = false;
  /** D299: the pedals (D250) put on the schedule. */
  private armedPedals = new Set<number>();
  /**
   * D299, BLUETOOTH MODE: each of the player's notes coming within the horizon put on the schedule, as
   * the band's are: at its written time and for its written length (heard on time through the
   * headphones' delay), at the level a right touch on time would give it (never louder or softer for how
   * it is played: D293), whether or not it is then touched. With it its chord (a swept chord's notes a
   * moment apart, D258), its ornament realised (D205), the notes riding after it (D191), a traced line's
   * notes (D262), the row's echo (D262), the subject's layers (D213).
   */
  private arm(horizon: number) {
    const ch = this.chip;
    const piano = this.proto.id === "piano";
    const count = this.f.voices.length;
    const envelope = piano ? "piano" : "synth";
    const len = (on: number, dur: number) => Math.max(0.03, this.timeAt(on + dur) - this.timeAt(on));
    // D306: the player's notes a moment ahead only (a miss then leaves little scheduled to cut).
    const near = Math.min(horizon, this.tickAt(ch.ctx.currentTime + ARM_AHEAD_S));
    this.tracks.forEach((t, k) => {
      if (this.live[k] === false) return;
      const notes = t.notes;
      let i = this.armNext[k] ?? 0;
      for (; i < notes.length && notes[i].on <= near; i++) {
        const n = notes[i];
        if (n.ride || n.state !== "pending" || (i > 0 && notes[i - 1].on === n.on)) continue;
        const at = this.timeAt(n.on);
        if (at < ch.ctx.currentTime) continue;
        const voice = this.voiceOf(k, i);
        const voiceV = voicing(voice, count, true);
        const sv = this.o.her ? null : this.subj.shape(voice, n.on, voiceV);
        // D311: the attack from the voice's latest landing (the note is scheduled before its touch); its sustain the touch's (move: shape).
        let expr: Play = { ...dynamic(NEUTRAL_D), lead: true, envelope, legato: !piano && this.joinedAt(i, k), touch: this.touchFor(this.lastLand[k], k, n.on) };
        if (sv) expr = { ...expr, ...sv.play, level: (expr.level ?? 1) * (sv.play.level ?? 1) };
        if (this.arc?.echo && k === 0 && this.rowOf(i, 0) === 1) expr = { ...expr, level: (expr.level ?? 1) * ECHO_LEVEL, bright: (expr.bright ?? 0) - ECHO_DARK };
        const v = sv?.v ?? voiceV;
        const sounds: Sounding[] = [];
        const own: Sounding[] = [];
        let end = at;
        const put = (midi: number, from: number, secs: number, p: Play, rv = v, mine = true) => {
          const sd = ch.note(midi, from, secs, rv, p);
          sounds.push(sd);
          if (mine) own.push(sd);
          end = Math.max(end, from + secs);
        };
        // The notes riding after it (D191), at their times; the note gives way to the first.
        let j = i + 1;
        while (j < notes.length && notes[j].on === n.on) j++;
        let first = Infinity;
        for (; j < notes.length && notes[j].ride; j++) {
          const r = notes[j];
          if (r.state !== "pending") continue;
          first = Math.min(first, this.timeAt(r.on));
          const rv = r.voice ?? t.voice;
          const rs = this.subj.shape(rv, r.on, voicing(rv, count, true));
          // D284: a riding note's ornament sounds too.
          for (const [pon, pdur, pm] of this.rideParts(rv, notes, j)) put(pm, this.timeAt(pon), len(pon, pdur), { ...rs.play, lead: true, envelope }, rs.v, false);
        }
        const chord = chordOf(notes, i);
        const cut = (secs: number) => (Number.isFinite(first) ? Math.max(0.03, Math.min(secs, first - at)) : secs);
        const orn = chord.length === 1 ? this.ornaments.get(`${voice}:${n.on}`) : undefined;
        if (orn) {
          const prev = this.before(i, k);
          const parts = realiseNote(this.f, orn, n.on, n.dur, n.midi, prev >= 0 ? notes[prev].midi : undefined, this.bpm);
          parts.forEach(([pon, pdur, pmidi], q) => {
            const pat = Math.max(at, this.timeAt(pon));
            put(pmidi, pat, q === parts.length - 1 ? cut(Math.max(0.03, this.timeAt(n.on + n.dur) - pat)) : len(pon, pdur), { ...expr, legato: q > 0 || expr.legato });
          });
        } else if (chord.length > 1 && t.sweeps?.has(n.on)) {
          // D258: the swept chord upward, a note every SWEEP_GAP_S, as it sounds by itself.
          const up = chord.map((c) => notes[c]).sort((a, b) => a.midi - b.midi);
          up.forEach((c, q) => put(c.midi, at + q * SWEEP_GAP_S, cut(len(c.on, c.dur)), { ...expr, legato: false }));
        } else for (const c of chord) put(notes[c].midi, at, cut(len(notes[c].on, notes[c].dur)), expr);
        // D262: a traced line's other notes, at their written times.
        for (const q of t.traces?.get(n.on) ?? []) put(q.midi, this.timeAt(q.on), Math.max(0.12, len(q.on, q.dur)), { ...expr, legato: false }, v, false);
        if (sv && !this.o.her) for (const x of this.subj.layers(ch, sv.sn, n.midi, at, len(n.on, n.dur), v, expr.level ?? 1)) (sounds.push(x), own.push(x));
        this.armed.set(`${k}:${n.on}`, { k, i, sounds, own, at, state: "sounding", until: end + 1 });
      }
      this.armNext[k] = i;
    });
    // D250: the pedal's bourdon from its start to its end, held or not (holding it still scores and builds).
    this.pedalList.forEach((p, q) => {
      if (this.armedPedals.has(q) || p.on > horizon) return;
      this.armedPedals.add(q);
      const at = Math.max(ch.ctx.currentTime, this.timeAt(p.on));
      const until = this.timeAt(p.end);
      const v = { timbre: "triangle" as const, pan: 0, gain: 1, patch: PATCHES.pedalBourdon };
      if (until > at) for (const [m, level] of [[p.midi, 1.2], [p.midi - 12, 0.9]] as const) this.band.push({ sd: ch.note(m, at, until - at, v, { level, lead: true }), until: until + 0.6 });
    });
  }
  /** D223, D299: the player's note scheduled at a track's onset, if any. */
  armedAt(k: number, on: number): { state: Armed["state"]; sounds: number } | undefined {
    const a = this.armed.get(`${k}:${on}`);
    return a && { state: a.state, sounds: a.sounds.length };
  }
  /** D306: a track's voice silenced (BLUETOOTH MODE): its notes on the schedule and not touched cut now, nothing more scheduled till a right touch. */
  private silence(k: number) {
    this.live[k] = false;
    const t = this.chip.ctx.currentTime;
    for (const [key, a] of this.armed) {
      if (a.k !== k || a.state === "hit") continue;
      for (const sd of a.sounds) sd.stop(Math.max(t, a.at));
      this.armed.delete(key);
    }
  }
  /** D299: records of notes done sounding dropped (nothing is faded: a note scheduled sounds out). */
  private watchArmed() {
    const t = this.chip.ctx.currentTime;
    for (const [key, a] of this.armed) if (t > a.until) this.armed.delete(key);
  }
  /** D299: a touch's sound: nothing in BLUETOOTH MODE (its note is already on the schedule). */
  private touchNote(...args: Parameters<Chip["note"]>): Sounding {
    return this.bt && !this.voiced ? SILENT() : this.chip.note(...args);
  }

  /** One frame: the beat (or the band) and the others scheduled ahead; the window panned; notes gone by marked missed. True at the end. */
  step(): boolean {
    const ch = this.chip;
    // D308: paused: the clock held where it stopped, nothing scheduled, nothing judged.
    if (this.pausedAt !== null) return false;
    this.evTs = null;
    this.bandT?.frame(ch.heard());
    this.now = this.tickAt(ch.heard());
    // D332: runs whose last note was struck: their trend told (RUN ✗ re-judges the run rule's notes).
    if (this.runDue.length) this.runsDue();
    this.slurWaits();
    this.pedalStep();
    this.arcCues();
    this.arcCues2();
    this.sweepStep();
    this.traceStep();
    this.glideStep();
    if (this.o.demo) this.demoRun();
    // D252, LIFT: the doublings as the music grows (a 4′ from a quarter of the way, a 16′ from two thirds).
    if (this.arc?.lift) {
      const l = this.liftNow(this.now + this.tps * 0.5);
      ch.coupling = { up: l > 0.25 ? 0.18 + 0.27 * Math.min(1, (l - 0.25) / 0.75) : 0, down: l > 0.66 ? 0.4 * Math.min(1, (l - 0.66) / 0.34) : 0, split: 48 };
    }
    if (this.o.wait) {
      const nx = this.next();
      const on = nx >= 0 ? this.notes[nx].on : null;
      if (on !== null && on >= this.entry && this.now > on) {
        // Held at the note: time given, not the note.
        this.anchorTick = on;
        this.anchorAt = ch.heard();
        this.now = on;
      }
    }
    // D223: what is drawn runs the screen's own delay ahead of the clock as heard (none: the same).
    this.viewNow = ch.visual && !this.o.wait ? this.tickAt(ch.heard() + ch.visual) : this.now;
    // D211: a phone schedules further ahead (a frame held up by the screen or the collector must not leave the others late).
    let horizon = Math.min(this.tickAt(ch.ctx.currentTime + (isPhone() ? 0.5 : 0.25)), this.end);
    // D328: nothing scheduled past a point where the band may wait for the player (and FOLLOWS: each beat's tempo set as it is reached).
    if (this.bandT) horizon = this.bandT.plan(horizon, [...this.held.values()].some((h) => !h.wait));
    while (this.nextBeat <= horizon) {
      // Beats gone by while the clock ran unwatched (a hidden tab): not played late in a burst.
      if (this.timeAt(this.nextBeat) < ch.ctx.currentTime - 0.03) {
        this.nextBeat += this.beat;
        continue;
      }
      // The beat's place in its bar, by the bars as written (D184: counted from the count-in, a bar of
      // three put the downbeat on its last beat).
      const n = Math.round((this.nextBeat - this.start) / this.beat);
      const inBarBeat = Math.round(inBar(this.f, this.nextBeat) / this.beat) % this.perBar;
      const accent = inBarBeat === 0;
      // D177: past the count-in, a band's rhythm section plays the beat instead of the click.
      const compound = this.beat !== this.f.tpq * (4 / Number(this.f.meter.split("/")[1]));
      if (this.o.wait) {
        this.nextBeat += this.beat;
        continue;
      }
      // The beat's length as it sounds (D191: the final ritard included, the drums' off-beats with it).
      const beatS = this.timeAt(this.nextBeat + this.beat) - this.timeAt(this.nextBeat);
      // D216, KIMIKO: her recording alone keeps the time: no band, no click past a quiet count-in.
      const kimiko = !!this.o.her;
      if (kimiko && this.nextBeat >= this.entry) {
        this.nextBeat += this.beat;
        continue;
      }
      // D308: the bar of count-in after a pause clicks as the first count-in does (no band).
      const counting = this.nextBeat < this.entry || (this.resumeAt !== null && this.nextBeat < this.resumeAt);
      const band = !counting && !this.o.solo && !kimiko && ch.groove?.(this.timeAt(this.nextBeat), beatS, inBarBeat, Math.floor(n / this.perBar), this.perBar, compound, 0);
      if (!band) ch.tick(this.timeAt(this.nextBeat), accent, counting ? (kimiko ? 0.05 : 0.12) : 0.02);
      this.nextBeat += this.beat;
    }
    while (this.nextOther < this.others.length && this.others[this.nextOther].on <= horizon) {
      const n = this.others[this.nextOther++];
      if (n.on < this.now - this.beat) continue;
      // D326: a voice muted (TOOLS) is not sounded.
      if (this.o.mute?.includes(n.voice)) continue;
      // D250: the bass's pedal sounds only while the player holds it.
      const bp = this.bassPedal;
      if (bp && n.midi === bp.midi && n.on >= bp.on && n.on < bp.end && bp.id === null && !this.bt) continue;
      const sh = this.shapes[this.nextOther - 1];
      // D302: a joined note held over the next one's onset (sh.over), crossfaded into it.
      // D328: a sound held over a point where the band may wait, scheduled longer, stopped once it is settled.
      const hx = this.bandT ? this.bandT.crossing(n.on, n.on + n.dur * sh.hold) : -1;
      const ext = hx >= 0 ? this.bandT!.waitMaxS + 0.25 : 0;
      const len = this.timeAt(n.on + n.dur * sh.hold) - this.timeAt(n.on) + sh.over;
      const at = Math.max(ch.ctx.currentTime, this.timeAt(n.on) + sh.nudge);
      // D213: the subject brighter and crisper, the others duller during an entry; the fugue's effect on the subject.
      const sv = this.subj.shape(n.voice, n.on, voicing(n.voice, this.f.voices.length, false));
      const vv = sv.v;
      const prev = this.lastOther.get(n.voice);
      this.lastOther.set(n.voice, n.midi);
      // D205: an ornamented note sounds its ornament (its parts on the audio clock), its main note last.
      const orn = this.ornaments.get(`${n.voice}:${n.on}`);
      const parts = orn ? realiseHeld(this.f, orn, n.on, n.dur, sh.hold, n.midi, prev, this.bpm) : [[n.on, 0, n.midi] as [number, number, number]];
      const jn = joins(sh);
      for (const [q, [pon, pdur, pmidi]] of parts.entries()) {
        const pat = orn ? Math.max(ch.ctx.currentTime, this.timeAt(pon) + sh.nudge) : at;
        const last = q === parts.length - 1;
        const plen = orn ? this.timeAt(pon + pdur) - this.timeAt(pon) + (last ? sh.over : 0) : len;
        // D302: an ornament's first note joined from the note before as the note was; its last joined to the next.
        const art = { ...(q === 0 && jn.legato ? { legato: true, from: jn.from } : {}), ...(last && jn.tie ? { tie: jn.tie } : {}), ...(last && jn.final ? { final: true } : {}), ...(last && jn.apart ? { apart: true } : {}) };
        const sd = ch.note(pmidi, pat, plen + (last ? ext : 0), vv, { ...sv.play, ...art, level: follow(sh, this.feel) * (sv.play.level ?? 1) });
        if (sd) this.band.push({ sd, until: pat + plen + (last ? ext : 0) + 0.6 });
        if (sd && last && ext) this.bandT!.hold(hx, sd, orn ? pon + pdur : n.on + n.dur * sh.hold, sh.over + sh.nudge);
      }
      for (const sd of this.subj.layers(ch, sv.sn, n.midi, at, len + ext, vv, follow(sh, this.feel))) {
        this.band.push({ sd, until: at + len + ext + 0.8 });
        if (ext) this.bandT!.hold(hx, sd, n.on + n.dur * sh.hold, sh.over + sh.nudge);
      }
    }
    if (this.bt) {
      this.arm(horizon);
      this.watchArmed();
    }
    if (this.band.length > 64) this.band = this.band.filter((b) => b.until > ch.ctx.currentTime);
    this.sounding();
    this.tieStep();
    this.trills();
    // Notes gone by unplayed: missed, a frame's grace late (D191: a tap at the window's very end,
    // handled after the frame, was refused); each one missed (a chord once) a slip.
    const grace = SWEEP_GRACE_S * this.tps;
    let missed = 0;
    // D334: MECH.prepLate "lift": a note a thumb is still prepared on waits for the other thumb's lift.
    const kept = new Set<LaneNote>();
    if (MECH.prepare && MECH.prepLate === "lift") for (const h of this.held.values()) if (h.wait?.prep) for (const j of chordOf(this.tracks[h.k].notes, h.wait.i)) kept.add(this.tracks[h.k].notes[j]);
    for (const t of this.tracks) {
      const ons = new Set<number>();
      for (const n of t.notes) if (n.state === "pending" && !n.ride && !kept.has(n) && this.now - grace > n.on + this.opt.late) ons.add(n.on);
      if (!ons.size) continue;
      for (const on of ons) this.diagNote("MISS", this.tracks.indexOf(t), on, undefined, t.notes.findIndex((n) => n.on === on));
      for (const on of ons) this.runMissed(this.tracks.indexOf(t), t.notes.findIndex((n) => n.on === on));
      if (this.tap) for (const on of ons) this.tap({ kind: "miss", tick: on, track: this.tracks.indexOf(t), i: t.notes.findIndex((n) => n.on === on), midi: t.notes.find((n) => n.on === on)?.midi ?? 0 });
      // D262: a traced line's first note missed: the line plays itself.
      for (const on of ons) {
        const q = t.traces?.get(on);
        if (q) this.loose.push({ queue: q.map((x) => ({ ...x })), x: 0, slid: 0, count: 0, voice: voicing(t.voice, this.f.voices.length, true), play: { ...dynamic(0.5), lead: true } });
      }
      sweep(kept.size ? t.notes.filter((n) => !kept.has(n)) : t.notes, this.now - grace, this.opt);
      missed += ons.size;
      if (this.bt) this.silence(this.tracks.indexOf(t));
    }
    if (missed) {
      for (let s = 0; s < missed; s++) this.slip();
      this.grade = { text: "MISS", at: performance.now() };
    }
    this.judgeEntries();
    this.judgeStrettos();
    this.judgeCadences();
    this.sustain();
    // D218: a note held on into the rest written after it: judged (REST!) as soon as it overstays.
    for (const h of this.held.values()) if (h.open && this.overstays(h)) this.judgeEnd(h, this.now);
    // D198: the crowd lost: the run ends here (not in the lessons, nor with NO FAIL).
    if (this.o.fail && this.crowd <= 0 && this.failedAt === null) {
      this.failedAt = this.now;
      this.stopAll();
      return true;
    }
    // D293: the zones are seen, not heard (the room, the drive: a change of sound earned by playing).
    if (this.now > this.end) {
      this.stopAll();
      return true;
    }
    return false;
  }

  countIn(): number {
    if (this.resumeAt !== null && this.now < this.resumeAt) return Math.ceil((this.resumeAt - this.now) / this.beat);
    return this.now < this.entry ? Math.ceil((this.entry - this.now) / this.beat) : 0;
  }

  keyNow(): string {
    return keyAt(this.f, this.now);
  }

  /** The next note to play (index) in a voice (the first by default), if any. */
  next(k = 0): number {
    const notes = this.tracks[k].notes;
    return notes.findIndex((n, i) => n.state === "pending" && !n.ride && n.on >= this.now - this.opt.late && !(i > 0 && notes[i - 1].on === n.on));
  }

  /** D217: a voice's pending struck note nearest a tick within the window (none: -1), not taken. */
  private nearestPending(k: number, t: number): number {
    let best = -1;
    this.tracks[k].notes.forEach((n, i) => {
      if (n.state !== "pending" || n.ride || t < n.on - this.opt.early || t > n.on + this.opt.late) return;
      if (best < 0 || Math.abs(t - n.on) < Math.abs(t - this.tracks[k].notes[best].on)) best = i;
    });
    return best;
  }

  /** The voice a thumb plays. */
  private trackOf(side: Side): number {
    if (this.hands) return 0;
    return this.tracks.length > 1 && side === "right" ? 1 : 0;
  }

  /** The thumbs down: side, height; D311: where across its bar it is now and where it landed (0 inner .. 1 outer: D314, places, whichever side is strong), on the bars. */
  heldSides(): { side: Side; y: number; across?: number; land?: number; armed?: boolean }[] {
    return [...this.held.values()].map((h) => ({ side: h.side, y: h.ay, ...(h.wait?.prep ? { armed: true } : {}), ...(h.land !== undefined && h.across !== undefined && this.proto.layout === "bars" ? { across: barAcross(h.across * this.touchW, this.touchW), land: strengthOf(h.land) } : {}) }));
  }
  /** D280: the thumbs down now: side, height, where across (0..1 of the width), shaking. */
  thumbsDown(): { side: Side; y: number; fx: number; shaking: boolean }[] {
    return [...this.held.values()].filter((h) => !h.passive).map((h) => ({ side: h.side, y: h.trail.at(-1)?.y ?? h.ay, fx: h.across ?? 0.1, shaking: !!h.orn && !h.orn.done }));
  }

  /**
   * D280: the plan of the thumbs for the voice played (fingering.ts): each note's touch, alternating, the
   * ornaments shaken, the loudness the dynamics lesson asks (soft bar 1, loud bar 2), rising steps slid
   * where sliding is taught.
   */
  get plan(): Touch[] {
    if (this.planMemo) return this.planMemo;
    const notes = this.tracks[0].notes;
    const heads = notes.map((n, i) => ({ n, i })).filter(({ n, i }) => !n.ride && !(i > 0 && notes[i - 1].on === n.on));
    const loud = (on: number) => (this.o.coach === "dynamics" ? (on < this.f.barTicks ? 0.2 : 0.85) : 0.5);
    // D282: with a reading, its articulation, accents and level on the subject's notes.
    const rd = this.o.reading;
    const touches = planTouches(
      heads.map(({ n, i }) => {
        const o = this.ornaments.get(`${this.voiceOf(0, i)}:${n.on}`);
        const place = rd ? this.readingIndex().get(`0:${n.on}`) : undefined;
        const rn = rd && place !== undefined ? rd.notes[place] : undefined;
        const d = rn?.accent ? 0.78 : rd?.level && place !== undefined ? LEVEL_D[rd.level] : loud(n.on);
        return { at: n.on, dur: n.dur, step: n.step, d, join: rn?.join ?? null, short: rn?.short ?? null, shake: o ? shakeOf(o) : null };
      }),
      { overlap: this.f.tpq / 16, slides: this.o.coach === "slide" },
    );
    return (this.planMemo = touches.map((t) => ({ ...t, i: heads[t.i].i })));
  }
  private planMemo: Touch[] | null = null;
  /** D280: the demonstration's actions still to come (tick, what), in time. */
  private demoQueue: { tick: number; act: () => void }[] | null = null;
  private demoRun() {
    if (!this.rows) return;
    if (!this.demoQueue) {
      const rows = this.rows;
      const W = 1000;
      const H = 400;
      const bw = W * BAR;
      // D315: a loudness's place across follows the strong side (STRONG_SIDE: by the box now), as the bars read it.
      const xOf = (side: Side, d: number) => (side === "left" ? bw * (1 - strengthOf(acrossBar(d))) : W - bw + bw * strengthOf(acrossBar(d)));
      const q: { tick: number; act: () => void }[] = [];
      let parent = -1;
      let y = 0;
      this.plan.forEach((t, p) => {
        const id = 90000 + p;
        if (t.slid && parent >= 0) {
          const pid = 90000 + parent;
          const side = this.plan[parent].side;
          q.push({
            tick: t.on,
            act: () => {
              // D289: a slide goes to the note's own height (at least SLIDE_MIN_PX), always the way the line goes (D271: one way).
              const want = rows.yOf(t.step);
              const dir = t.step > this.plan[p - 1].step ? -1 : 1;
              y += dir * Math.max(SLIDE_MIN_PX, dir * (want - y));
              this.move(pid, { side, x: xOf(side, t.d), y, w: W, h: H }, performance.now());
            },
          });
          return;
        }
        parent = p;
        q.push({ tick: t.on, act: () => ((y = rows.yOf(t.step)), this.down(id, { side: t.side, x: xOf(t.side, t.d), y, w: W, h: H }, performance.now())) });
        if (t.shake) {
          const sh = t.shake;
          const span = Math.max(this.f.tpq / 8, (t.off - t.on) * 0.6);
          for (let m = 1; m <= sh.need; m++)
            q.push({ tick: t.on + (span * m) / (sh.need + 1), act: () => this.move(id, { side: t.side, x: xOf(t.side, t.d), y: rows.yOf(t.step) - (m % 2 ? sh.first : 0) * this.ladderRow, w: W, h: H }, performance.now()) });
        }
        const offTick = Math.max(...this.plan.filter((x, j) => j >= p && (j === p || (x.slid && x.side === t.side && this.plan.slice(p + 1, j + 1).every((z) => z.slid)))).map((x) => x.off));
        q.push({ tick: offTick, act: () => this.up(id, performance.now()) });
      });
      this.demoQueue = q.sort((a, b) => a.tick - b.tick);
    }
    while (this.demoQueue.length && this.demoQueue[0].tick <= this.now) this.demoQueue.shift()!.act();
  }

  /** The places held now (columns, keys, rows). */
  heldCells(): number[] {
    return [...this.held.values()].flatMap((h) => (h.cell === undefined ? [] : [h.cell]));
  }

  holding(i: number, k = 0): boolean {
    for (const h of this.held.values()) if (h.k === k && h.chord.includes(i)) return true;
    return false;
  }

  /** The place under a touch: LADDER a row (a staff step), the PIANO a key. */
  cellAt(c: Contact): number | undefined {
    if (this.proto.id === "piano") return pianoKey(this.kb, c.x / c.w, c.y / c.h);
    if (this.proto.id === "ladder" && this.rows) return this.rows.stepAt(c.y);
    if (this.road) return this.laneOfX(c.x, c.w);
    return undefined;
  }

  /** D311: where across its bar a touch is, as strength, 0 the soft side to 1 the strong (D314: STRONG_SIDE; the bars only; elsewhere the middle). */
  landAt(c: Contact): number {
    return this.proto.layout === "bars" ? barDynamic(c.x, c.w) : TOUCH_NEUTRAL;
  }
  /** D311: each voice's latest landing (BLUETOOTH MODE schedules its next notes with it: their attack can no longer wait for the touch). */
  private lastLand: number[] = [];
  /**
   * D311: the touch a note of track k at `on` carries (Play.touch): the thumb's landing, unless the run's
   * own dynamics are heard there (the dynamics lesson, a reading's level: the old full dynamic, D293/D296).
   * Never the verdict's: right or wrong, the same sound.
   */
  private touchFor(land: number | undefined, k: number, on: number): number | undefined {
    if (this.touchDynamics || (this.o.reading?.level && this.readingIndex().has(`${k}:${on}`))) return undefined;
    // D317: the lab may turn D311's expression off (every attack the bar's middle).
    if (!MECH.expression) return TOUCH_NEUTRAL;
    return land ?? TOUCH_NEUTRAL;
  }

  /** The dynamic of a touch, 0 (pp) to 1 (ff). */
  dynamicAt(c: Contact): number {
    if (this.proto.layout === "bars") return barDynamic(c.x, c.w);
    return 0.55;
  }
  /**
   * D293: the loudness a touch gives is heard only where the run asks for it (the dynamics lesson; D296: and a
   * reading's level, on the subject notes it marks: heardAt). Elsewhere the player's notes sound at the music's own level, wherever the thumb
   * lands (the owner: "the big volume changes when playing correctly and wrongly … kill the flow").
   * D311 revises this: elsewhere the landing still shapes the note, in a small range and by the instrument
   * (Play.touch: the piano ±4 dB, a stop, a colour; touchFor), never by the verdict, and the others never follow it.
   */
  get touchDynamics(): boolean {
    // D296: not every reading: play.html plays each fugue by a reading, which made all loudness the touch's.
    return this.o.coach === "dynamics";
  }
  private heard(d: number): number {
    return this.touchDynamics ? d : NEUTRAL_D;
  }
  /** D296: the loudness heard for note `on` of track k: the touch's where the dynamics lesson or the reading (a subject note it sets a level for) asks. */
  private heardAt(d: number, k: number, on: number): number {
    return this.touchDynamics || (this.o.reading?.level && this.readingIndex().has(`${k}:${on}`)) ? d : NEUTRAL_D;
  }

  /** The note struck before note i (the top of its chord; D191: the riding notes passed over), in a voice. */
  /**
   * D229, the computer's HIGHWAY: a repeated note (struck with SPACE) is drawn as a gem in the lane of
   * the note before, so the line goes on, marked SPACE (paint-proto.ts). The judging is as before.
   */
  spaceGem(i: number, k = 0): boolean {
    return this.proto.id === "keys" && this.before(i, k) >= 0 && isRepeat(this.tracks[k].moves[i]);
  }
  private before(i: number, k = 0): number {
    const notes = this.tracks[k].notes;
    let j = i - 1;
    while (j >= 0 && (notes[j].on === notes[i].on || notes[j].ride)) j--;
    return j;
  }

  /** D332: the runs of each track (runs.ts), for MECH.runMinNotes and MECH.runIoiMs as they are. */
  private runsMemo: { key: string; rule: Map<number, Run>[]; member: Map<number, Run>[] } | null = null;
  private runsOf(k: number): { rule: Map<number, Run>; member: Map<number, Run> } {
    const key = `${MECH.runMinNotes}:${MECH.runIoiMs}`;
    if (this.runsMemo?.key !== key) {
      const rule = this.tracks.map((t) => findRuns(t.notes, (a, b) => ((b - a) / this.tps) * 1000, MECH.runMinNotes, MECH.runIoiMs));
      const member = rule.map((m) => {
        const all = new Map(m);
        for (const r of m.values()) all.set(r.notes[0], r);
        return all;
      });
      this.runsMemo = { key, rule, member };
    }
    return { rule: this.runsMemo.rule[k] ?? new Map(), member: this.runsMemo.member[k] ?? new Map() };
  }
  /** D332: the run note i of track k is judged under (RUNS "lenient", LADDER), if any. */
  runAt(k: number, i: number): Run | undefined {
    if (MECH.runs !== "lenient" || this.proto.id !== "ladder") return undefined;
    const notes = this.tracks[k]?.notes;
    if (!notes?.[i]) return undefined;
    const rule = this.runsOf(k).rule;
    return rule.get(i) ?? rule.get(chordOf(notes, i)[0]);
  }
  /** D332: each run's landings so far (t in s, y in px), and the runs already told. */
  private runPts = new Map<string, { t: number; y: number }[]>();
  private runTold = new Set<string>();
  /** D332: the last verdict passed a note by the run rule alone (the strict rule refused it). */
  private runOnly = false;
  /** D332: the notes right by the run rule alone ("k:i"): their points, should the run's trend fail. */
  private runAccepted = new Map<string, { pts: number; art: number; perfect: boolean; side: Side; legatoOf: boolean; legato: boolean; held: number; heldN: number; heldOfN: number; clean: number; cleanOf: number }>();
  /** D332: runs whose last note was just struck, told on the next frame (once that note is scored). */
  private runDue: { k: number; run: Run }[] = [];
  private runMember(k: number, i: number): Run | undefined {
    if (MECH.runs !== "lenient" || this.proto.id !== "ladder" || i < 0) return undefined;
    return this.runsOf(k).member.get(i);
  }
  /** D332: a thumb's landing on a run's note, remembered for the run's trend; at its last note the run is told. */
  private runLanding(k: number, i: number, y: number) {
    const run = this.runMember(k, i);
    if (!run) return;
    const key = `${k}:${run.id}`;
    if (i === run.notes[0]) {
      this.runPts.delete(key);
      this.runTold.delete(key);
      for (const j of run.notes) this.runAccepted.delete(`${k}:${j}`);
    }
    const pts = this.runPts.get(key) ?? [];
    pts.push({ t: this.now / this.tps, y });
    this.runPts.set(key, pts);
    if (i === run.last) this.runDue.push({ k, run });
  }
  /** D332: a run's last note gone by unplayed: the run is told with the landings it had. */
  private runMissed(k: number, i: number) {
    const run = this.runMember(k, i);
    if (run && i === run.last) this.runEnd(k, run);
  }
  /** D332: the runs due (their last note scored by now). */
  private runsDue() {
    const due = this.runDue;
    this.runDue = [];
    for (const d of due) this.runEnd(d.k, d.run);
  }
  /**
   * D332: RUN ✓ / RUN ✗: the landings over the run must travel its way, by the least-squares fit, at
   * least RUN TRAVEL rows (drawn rows, a staff step each) per step of the run's span. On RUN ✗ every note
   * of the run right only by the run rule is re-judged WRONG: its points taken back, a slip, told.
   */
  private runEnd(k: number, run: Run) {
    const key = `${k}:${run.id}`;
    if (this.runTold.has(key)) return;
    this.runTold.add(key);
    const pts = this.runPts.get(key) ?? [];
    const notes = this.tracks[k].notes;
    const span = Math.abs(notes[run.last].step - notes[run.notes[0]].step);
    const row = this.rows?.rowH ?? MECH.ladderRowMin;
    const needPx = MECH.runTravelRows * span * row;
    const maxPx = MECH.runTravelMaxRows * span * row;
    const tr = runTrend(pts, run.dir, needPx, maxPx);
    this.tap?.({ kind: "run", tick: notes[run.last].on, track: k, i: run.last, dir: run.dir, notes: run.notes.length, touches: tr.n, slope: Number.isFinite(tr.slope) ? Math.round(tr.slope) : 0, travelPx: Math.round(tr.travelPx), needPx: Math.round(needPx), maxPx: Math.round(maxPx), ok: tr.ok });
    const revoke = run.notes.filter((j) => this.runAccepted.has(`${k}:${j}`));
    for (const j of revoke) {
      const a = this.runAccepted.get(`${k}:${j}`)!;
      this.runAccepted.delete(`${k}:${j}`);
      if (tr.ok || notes[j].state !== "hit") continue;
      for (const q of chordOf(notes, j)) Object.assign(notes[q], { state: "miss", wrong: true });
      this.score -= a.pts + a.art + a.held;
      this.earned.notes -= a.pts;
      this.earned.articulation -= a.art;
      // Its legato counts and its HELD (and CLEAN) credit too.
      this.earned.held -= a.held;
      if (a.legatoOf) this.art.legatoOf--;
      if (a.legato) this.art.legato--;
      this.art.held -= a.heldN;
      this.art.heldOf -= a.heldOfN;
      this.art.clean -= a.clean;
      this.art.cleanOf -= a.cleanOf;
      if (a.perfect) this.perfects--;
      else this.goods--;
      this.hits--;
      this.slip();
      this.tap?.({ kind: "revoked", tick: this.now, track: k, i: j, midi: notes[j].midi, side: a.side, pts: a.pts + a.art + a.held });
    }
  }

  /** Judges a touch or a key on note i: right, or what to sound instead. */
  private verdict(i: number, at: { c?: Contact; key?: KeyPress }, k = 0): Verdict {
    const { notes, moves } = this.tracks[k];
    const n = notes[i];
    const chord = chordOf(notes, i).map((j) => notes[j]);
    const prev = this.before(i, k);
    const m = moves[i];
    const asked = (steps: number) => (prev >= 0 ? stepPitch(notes[prev].step + steps, notes[prev]) : undefined);
    // EASY: the time, or (D187) the way along the keys too.
    if (this.proto.id === "keys") {
      const lvl = this.o.easy ?? "timing";
      const code = at.key?.code;
      // D230, SCALE KEYS: every note its own key (the level ignored but TIMING: any key on time).
      const sk = this.scale;
      if (sk && lvl !== "timing" && code) return this.scaleVerdict(sk, i, code, prev);
      if (lvl === "timing" || !code || this.isFree(i, k)) return { ok: true };
      // D208, EXACT LANES: the planned lane's key (in any row: the rows give the dynamic), or for a repeat the space bar.
      if (lvl === "exact") {
        if (code === "Space") return m.dir === 0 || m.steps === 0 ? { ok: true } : { ok: false, wrong: asked(0), why: "gesture" };
        return keyPlace(code)?.col === this.lanes[i] ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
      }
      // D239: right in the planned lane (SPACE on a repeat), or only the right way from the last key.
      const col = keyPlace(code)?.col;
      const exact = code === "Space" ? m.dir === 0 || m.steps === 0 : col === this.lanesOf(k)[i];
      const graded = (): Verdict => ({ ok: true, lane: exact ? "exact" : "relative", at: col ?? this.lanesOf(k)[i] });
      // D252: with both hands each judged from its own last key.
      const prevKey = this.hands ? this.keyBy[k] : this.lastKey;
      if (!prevKey || exact) return graded();
      return contourOk(m, prevKey, code, lvl === "leaps") ? graded() : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
    }
    if (at.key?.midi !== undefined) {
      const k = at.key.midi;
      const ok = this.proto.id === "piano" ? chord.some((x) => x.midi === k) : chord.some((x) => Math.abs(stepNear(k, x) - x.step) <= 1);
      return ok ? { ok } : { ok, wrong: k, why: "gesture" };
    }
    if (at.key?.move) {
      const mv = at.key.move;
      if (m.size < 0) return { ok: true };
      // A third takes the step or the leap (D184).
      const ok = mv.dir === m.dir && (m.dir === 0 || m.size === 2 || mv.big === m.size >= 3);
      return ok ? { ok } : { ok, wrong: asked(mv.dir * (mv.big ? 3 : 1)), why: "gesture" };
    }
    const c = at.c!;
    switch (this.proto.id) {
      case "ladder": {
        // D296: relative only (the owner: "the player is not expected to meet the narrow absolute coordinates
        // of the note … we need to allow the whole of the buttons to have more relevance"). Where a note is
        // drawn no longer bounds the touch (D181 had a window of five rows, at least 90 px, round it: under
        // half the bar, following the drawn tune). Each thumb is judged by its own moves:
        //  · from its last touch: a repeat about level; a step not clearly the wrong way (D289's row of
        //    leeway: a landing scatters as far as a step is drawn); a third or more a clear move the right way;
        //  · and the line's travel: from its latest touch a fourth or more away in the tune (within
        //    OWN_FRESH_S), a clear move the right way, so a run of steps must climb or fall with the hand;
        //  · against the bar's end (EDGE_SHARE of its height), a thumb that travelled there and can go no
        //    further may stay there.
        // A thumb's first touch, or its first after a pause or a slide, is free: it sets where it is.
        this.runOnly = false;
        if (!this.rows) return { ok: true };
        const R = this.ladderRow;
        const asked = stepPitch(this.rows.stepAt(c.y), n);
        // D317: the lab's parameters (MECH: by default D286's, D289's and D296's constants), and why (the tap).
        const fresh = (t?: { tick: number; moved?: boolean }) => !!t && !t.moved && this.now - t.tick <= ownFreshSeconds(this.beat / this.tps) * this.tps;
        const own = this.lastBySide[c.side];
        if (m.size < 0 || !own || !fresh(own)) {
          this.ladderWhy = { ref: "free", freeWhy: m.size < 0 ? "first note" : !own ? "first touch" : own.moved ? "moved since" : "too old" };
          return { ok: true };
        }
        const edge = MECH.edgeShare * c.h;
        const back = (this.trailBySide[c.side] ?? []).filter((t) => fresh(t) && t !== own);
        // At the end it climbed (or fell) to: a thumb that travelled there may stay (one that started there has no further to come from).
        const arrived = (dir: number) => back.some((t) => (dir > 0 ? t.y > edge + 2 * R : t.y < c.h - edge - 2 * R));
        const pinned = (from: number, dir: number) => arrived(dir) && (dir > 0 ? from <= edge && c.y <= edge : from >= c.h - edge && c.y >= c.h - edge);
        let why: LadderWhy = { ref: "own", rowPx: R };
        const clear = (from: { y: number; step: number }, travel = false) => {
          const steps = n.step - from.step;
          const way = (from.y - c.y) * Math.sign(steps);
          const done = (ok: boolean, rule: LadderWhy["rule"], needPx?: number) => {
            if (travel) why.travel = { steps, movedPx: from.y - c.y, needPx: needPx ?? 0, ok };
            else why = { ref: "own", steps, movedPx: from.y - c.y, rowPx: R, rule, needPx };
            return ok;
          };
          if (steps === 0) return done(Math.abs(from.y - c.y) <= MECH.repeatRows * R, "repeat", MECH.repeatRows * R);
          if (pinned(from.y, Math.sign(steps))) return done(true, "edge");
          // From the last touch a fourth or more, a clear move (half a row); the line's travel over a fourth
          // or more, a move the right way (a quarter row: drawn steps are 8 px apart and a landing scatters
          // about as much, so a third's travel cannot be told from the scatter).
          if (Math.abs(steps) < 3) return done(way >= -MECH.stepLeewayRows * R, "step", MECH.stepLeewayRows * R);
          const need = (travel ? MECH.travelMin : MECH.leapRows) * R;
          return done(way >= need, travel ? "travel" : "leap", need);
        };
        let ok = clear(own);
        if (ok) {
          // The line's travel: from this thumb's latest touch a fourth or more away in the tune.
          const far = [...back].reverse().find((t) => Math.abs(n.step - t.step) >= 3);
          if (far) ok = clear(far, true);
        }
        // D318 (the lab's "either", off by default): in a slur the player may place the next thumb from the note
        // the other still holds ("up from the note I'm holding"): plainly the right way from where that thumb
        // struck it (no leeway the wrong way, a quarter row the right way; a repeat within a row). It lets a
        // random tap pass far more often (simulated: 40% right → 64%), so it is the owner's to try.
        if (!ok && MECH.directionRef === "either" && prev >= 0)
          for (const o of this.held.values()) {
            if (o.k !== k || o.side === c.side || !chordOf(notes, prev).includes(o.note)) continue;
            const steps = n.step - notes[o.note].step;
            const moved = o.ay - c.y;
            if (steps === 0 ? Math.abs(moved) <= R : moved * Math.sign(steps) >= 0.25 * R) (ok = true), (why = { ref: "held", steps, movedPx: moved, rowPx: R, rule: steps === 0 ? "repeat" : "leap", needPx: steps === 0 ? R : 0.25 * R });
          }
        // D332, RUNS "lenient" (the lab's; the game strict): inside a fast stepwise run a landing the strict
        // rule refuses is still right if it goes the run's way, or level within the step leeway, from EITHER
        // thumb's last touch (the own thumb's rule without the line's travel too). Such a note is the run's
        // to answer for: should the run's trend fail at its end (runEnd), it is re-judged wrong.
        const run = this.runAt(k, i);
        if (run && ok) why = { ...why, run: { dir: run.dir, from: "strict" } };
        else if (run) {
          const lee = MECH.stepLeewayRows * R;
          const wayOf = (from: { y: number }) => (from.y - c.y) * run.dir;
          const other = this.lastBySide[c.side === "left" ? "right" : "left"];
          const ownOk = clear(own) || wayOf(own) >= -lee;
          const otherOk = !!other && fresh(other) && wayOf(other) >= -lee;
          ok = ownOk || otherOk;
          this.runOnly = ok;
          const from = ownOk ? own : otherOk ? other! : own;
          why = { ref: "own", steps: n.step - from.step, movedPx: from.y - c.y, rowPx: R, rule: "run", needPx: lee, run: { dir: run.dir, from: ownOk ? "own" : otherOk ? "other" : "none" } };
        }
        this.ladderWhy = why;
        return ok ? { ok } : { ok, wrong: asked, why: "gesture" };
      }
      case "piano": {
        const key = pianoKey(this.kb, c.x / c.w, c.y / c.h);
        return chord.some((x) => x.midi === key) ? { ok: true } : { ok: false, wrong: key, why: "gesture" };
      }
      case "arrows":
        // A click, not a key: the time only.
        return { ok: true };
      case "highway":
      case "subject": {
        // D207: EASY on a phone: the lane tapped, judged as the keys are (D187), by lanes.
        const lvl = this.o.easy ?? "timing";
        if (lvl === "timing" || this.isFree(i, k)) return { ok: true };
        // D254: with both hands a touch over the line counts as its hand's nearest lane.
        const r = this.hands ? this.laneRegion(k) : { from: 0, count: this.laneCount };
        const lane = this.handLane(k, this.laneOfX(c.x, c.w));
        if (lvl === "exact") return lane === this.lanesOf(k)[i] ? { ok: true } : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
        // D217: each row (SUBJECT's two lines in a stretto) judged from its own last lane.
        const last = this.line || this.hands ? this.laneBy[k] : this.lastLane;
        // D239: the planned lane, or only the right way from the last. D252: the row too, where the
        // arc asks for rows (the repeat on the lower row): the wrong row is only the right way.
        const rowRight = !this.arc?.rows || (c.y >= c.h - PAD_SPLIT ? 1 : 0) === this.rowOf(i, k);
        const graded: Verdict = { ok: true, lane: lane === this.lanesOf(k)[i] && rowRight ? "exact" : "relative", at: lane };
        // D252: the planned lane is always right (a hand's few lanes cannot always skip one for a leap).
        if (last < 0 || lane === this.lanesOf(k)[i]) return graded;
        // D260: a hand of three lanes or fewer (both hands on a phone): any of its lanes is right (only
        // the planned one fully); a neighbouring lane was a WRONG and a slip, too harsh for so few lanes.
        if (this.hands && r.count <= 3) return graded;
        return laneOk(m, last - r.from, lane - r.from, lvl === "leaps", r.count) ? graded : { ok: false, wrong: asked(m.dir === 0 ? 0 : -m.steps), why: "gesture" };
      }
    }
  }

  /**
   * D230, SCALE KEYS: the key of each of the line's notes (scale-keys.ts: the home row the home key's
   * scale, raised notes the row above, lowered below), or null when the layout is off.
   */
  get scale(): ScaleKey[] | null {
    if (!this.o.scale || this.proto.id !== "keys") return null;
    return (this.scaleMemo ??= scaleKeys(this.notes, this.f.key));
  }
  private scaleMemo?: ScaleKey[];
  /** D230: right if the key is a chord note's key (the tonic at home: A or K), or SPACE on a repeated pitch; a wrong key sounds its own pitch. */
  private scaleVerdict(sk: ScaleKey[], i: number, code: string, prev: number): Verdict {
    const notes = this.notes;
    const chord = chordOf(notes, i);
    const n = notes[i];
    if (code === "Space") {
      // A pitch of the chord before sounded again (a chord: any of its notes).
      const before = prev >= 0 ? chordOf(notes, prev).map((j) => notes[j].midi) : [];
      return chord.some((j) => before.includes(notes[j].midi)) ? { ok: true } : { ok: false, wrong: before[0], why: "gesture" };
    }
    if (chord.some((j) => sk[j] && scaleFits(sk[j], code))) return { ok: true };
    return { ok: false, wrong: keyPitch(code, n.midi, this.f.key), why: "gesture" };
  }

  /** D207, HIGHWAY: the lane a tap falls in, and the lane tapped last (-1: none yet). */
  lastLane = -1;
  /** D217: the lane tapped last in each line (SUBJECT's two rows in a stretto). */
  private readonly laneBy = [-1, -1];
  laneOfX(x: number, w: number): number {
    return Math.max(0, Math.min(this.laneCount - 1, Math.floor((x / Math.max(1, w)) * this.laneCount)));
  }
  get laneCount(): number {
    return this.road ? 5 : this.scale ? SCALE_LANES : HOME_LANES;
  }
  /** The lanes under the fingers now (HIGHWAY), and how far down each finger is (px; for the two rows of pads). */
  get heldLanes(): number[] {
    return [...this.held.values()].map((h) => h.cell ?? this.laneOfX(h.x0, this.touchW));
  }
  get heldPads(): { lane: number; y: number }[] {
    return [...this.held.values()].map((h) => ({ lane: h.cell ?? this.laneOfX(h.x0, this.touchW), y: h.trail.at(-1)?.y ?? h.ay }));
  }
  private touchW = 1;



  down(id: number, c: Contact, ts: number) {
    if (this.pausedAt !== null) return;
    this.evTs = ts;
    if (this.held.has(id)) this.up(id, ts);
    // D290: the play area's width, for the report (was set only on the road: "screen 1 px").
    this.touchW = c.w;
    if (this.road && this.pedalTake(id, this.laneOfX(c.x, c.w))) return;
    this.finalStrike(id, ts);
    c = { ...c, side: this.thumbSide(c) };
    const d = this.dynamicAt(c);
    const h: Held = { across: c.x / Math.max(1, c.w), side: c.side, k: this.line ? this.rowTrack(c, ts) : this.hands && this.road ? this.touchTrack(this.laneOfX(c.x, c.w), ts) : this.trackOf(c.side), x0: c.x, ax: c.x, ay: c.y, note: -1, chord: [], sounds: [], midi: 0, cell: this.cellAt(c), d0: d, trail: [{ t: ts, y: c.y }], t0: ts, row: c.y >= c.h - PAD_SPLIT ? 1 : 0 };
    // D311: where across it landed (the attack); BLUETOOTH MODE's next notes of the voice take it too.
    h.land = this.landAt(c);
    this.lastLand[h.k] = h.land;
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { c }, d);
    // HIGHWAY: where the hand is now.
    if (this.road) (this.lastLane = this.laneBy[h.k] = this.handLane(h.k, this.laneOfX(c.x, c.w))), (this.touchW = c.w);
  }

  /**
   * D318: the thumb a touch is. A touch belongs to the half of the screen it lands in (thumbs.ts), but in
   * a slur the thumbs meet: the next thumb lands on the bar (or past the middle) where the other still
   * holds. On LADDER with one voice, a touch landing on a half whose thumb is down while the other half
   * has none is the other thumb (two thumbs, not two touches of one): it is judged and remembered as it.
   */
  private thumbSide(c: Contact): Side {
    if (!MECH.thumbCross || this.proto.id !== "ladder" || this.tracks.length !== 1 || this.line || this.rollOf(c)) return c.side;
    const sides = [...this.held.values()].map((o) => o.side);
    return sides.length && sides.every((s) => s === c.side) ? (c.side === "left" ? "right" : "left") : c.side;
  }
  /** D318: a contact landing on a thumb still down (within SAME_THUMB_PX of where it is now): that thumb rolling, a second contact of its own. */
  private rollOf(c: Contact, but?: Held): boolean {
    for (const o of this.held.values()) {
      if (o === but) continue;
      const y = o.trail.at(-1)?.y ?? o.ay;
      if (Math.abs(y - c.y) <= MECH.sameThumbPx && Math.abs((o.across ?? 0) * c.w - c.x) <= MECH.sameThumbPx) return true;
    }
    return false;
  }

  /** A computer key or a MIDI key goes down. */
  keyDown(id: number, k: KeyPress, ts: number) {
    if (this.pausedAt !== null) return;
    this.evTs = ts;
    // The same key again without its release (lost while the window was away): let the first go.
    if (this.held.has(id)) this.up(id, ts);
    if (this.pedalTake(id, keyPlace(k.code ?? "")?.col ?? -1)) return;
    this.finalStrike(id, ts);
    const d = k.velocity ?? 0.6;
    const struck = k.code;
    const h: Held = { side: k.side ?? "left", k: this.hands ? this.laneTrack(keyPlace(k.code ?? "")?.col ?? 8) : this.trackOf(k.side ?? "left"), x0: 0, ax: 0, ay: 0, note: -1, chord: [], sounds: [], midi: 0, cell: k.midi, d0: d, trail: [] };
    // D311: a MIDI key's velocity is the piano's touch; elsewhere (and the computer's keys) the bar's middle.
    h.land = k.touch !== undefined && touchKind(preset().id) === "piano" ? Math.max(0, Math.min(1, k.touch)) : TOUCH_NEUTRAL;
    this.held.set(id, h);
    this.strikeWith(id, h, ts, { key: k }, d);
    // Where the hand is now: the next key is judged from it.
    if (struck) (this.lastKey = struck), (this.keyBy[h.k] = struck);
  }

  /** EASY's DIRECTION: the key struck last. */
  lastKey: string | null = null;
  /** D252: each hand's last key (both hands). */
  private readonly keyBy: (string | null)[] = [null, null];
  /**
   * A note the hand may take anywhere (an open bar across the road): D217, only the first, a new
   * contour's start (SUBJECT: an entry's first note, a stretto's first lower-row note), and a note
   * after a real rest: a beat at least (half a bar where a beat passes in under half a second). A long
   * note no longer frees the next (D187 freed it, and after any rest of a quarter beat: crossbars
   * everywhere); there the lanes recentre silently (`soft`).
   */
  isFree(i: number, k = 0): boolean {
    const t = this.tracks[k];
    const n = t.notes[i];
    if (!n || t.fresh?.has(n.on) || t.traces?.has(n.on)) return true;
    // D261: where each thumb plays only its own notes (Prelude 1's tops and bass), the gaps between
    // them are not rests: only a line's first note is free; the rest follow its contour lane by lane.
    if (this.arc?.strike && this.f.kind === "prelude") return t.notes.findIndex((x) => !x.ride) === i;
    return this.restBefore(i, k) >= this.restMin;
  }
  /** D217: the rest before note i (from the end of whatever sounded last, the riding notes included), in ticks; Infinity for the first. */
  private restBefore(i: number, k: number): number {
    const notes = this.tracks[k].notes;
    const j = this.before(i, k);
    if (j < 0) return Infinity;
    let end = -Infinity;
    for (let q = i - 1; q >= 0 && notes[q].on >= notes[j].on; q--) if (notes[q].on < notes[i].on) end = Math.max(end, notes[q].on + notes[q].dur);
    return notes[i].on - end;
  }
  private get restMin(): number {
    return this.beat / this.tps < 0.5 ? Math.max(this.beat, this.f.barTicks / 2) : this.beat;
  }
  /**
   * D217: a note where the lanes may recentre without an open bar: after a long note (a beat or more)
   * or a short rest (a quarter beat): the planner may take any lane the right way there (any lane
   * further right for a rise, further left for a fall), which DIRECTION accepts as it is.
   */
  private soft(i: number, k: number): boolean {
    const j = this.before(i, k);
    if (j < 0) return false;
    // D261: no rests between a thumb's own notes there (see isFree): no recentring either.
    if (this.arc?.strike && this.f.kind === "prelude") return false;
    return this.tracks[k].notes[j].dur >= this.beat || this.restBefore(i, k) >= this.beat / 4;
  }
  /** What the box draws over each note in DIRECTION (none in TIMING). */
  get cues(): Arrow[] | undefined {
    const lvl = this.o.easy ?? "timing";
    if (this.proto.id !== "keys" || lvl === "timing" || this.scale) return undefined;
    return (this.cuesMemo ??= this.notes.map((_, i) => contourCue(this.moves[i], this.isFree(i), lvl === "leaps")));
  }
  private cuesMemo?: Arrow[];

  keyUp(id: number, ts: number) {
    this.up(id, ts);
  }

  /**
   * D318: a slur's second thumb landing early. D290 stops each note's window halfway to the note before
   * (at least 60 ms), and took a contact within DOUBLE_MS of a note just struck for that strike doubled:
   * so a second thumb rolling into a slur while the first still holds (the owner's II/18 report: MISS 79,
   * DOUBLE 30, STRAY 10 of 494, the slurred pairs' second notes) struck nothing, ignored or a stray, and
   * its note then went by missed. While the voice's note before is struck and still held by another thumb
   * (or just let go, within the legato window: a touch iOS took back), a contact that is not that thumb's
   * own (rollOf) can mean only the next note: it strikes it from SLUR_EARLY_SHARE of the way early (at most
   * SLUR_EARLY_MAX_MS); landed earlier, it waits, down, and strikes it then (slurWaits). Alone, or on a
   * note not yet struck, the windows are as they were.
   */
  private slurNext(id: number, h: Held, c: Contact, tk: number): { i: number; open: number } | null {
    const notes = this.tracks[h.k].notes;
    if (this.rollOf(c, h)) return null;
    // The note held by another thumb (the latest), or the one just let go within the legato window.
    let prev = -1;
    for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.open && o.note > prev && notes[o.note]?.state === "hit") prev = o.note;
    const lo = this.lastOff;
    if (prev < 0 && lo && lo.k === h.k && notes[lo.i]?.state === "hit") {
      const q = notes[lo.i];
      if (this.msOf(lo.tick, tk) <= legatoGapMs(this.msOf(q.on, q.on + q.dur))) prev = lo.i;
    }
    if (prev < 0) return null;
    // Its next note, still to strike (an earlier one left behind is not this thumb's to take).
    const chord = chordOf(notes, prev);
    let next = Math.max(...chord) + 1;
    while (next < notes.length && notes[next].ride) next++;
    if (next >= notes.length || notes[next].state !== "pending" || !chord.includes(this.before(next, h.k)) || tk > notes[next].on) return null;
    const p = notes[prev];
    // Two thumbs down together are a chord pressed, not a slur.
    if (p.at !== undefined && this.msOf(Math.min(p.at, tk), Math.max(p.at, tk)) < MECH.slurRollMinMs) return null;
    // D329: RELATIVE, the share alone (no cap in ms).
    const share = MECH.slurEarlyShare * (notes[next].on - p.on);
    const reach = MECH.timing === "relative" ? share : Math.min((MECH.slurEarlyMaxMs / 1000) * this.tps, share);
    return { i: next, open: notes[next].on - reach };
  }
  /** D318: thumbs waiting, down, for the note they landed early for (slurNext): each strikes it as its time comes. */
  private slurWaits() {
    for (const [id, h] of this.held) {
      const w = h.wait;
      if (!w) continue;
      const notes = this.tracks[h.k].notes;
      if (notes[w.i].state !== "pending") {
        h.wait = undefined;
        continue;
      }
      // D334: a prepared note never sounds by itself (only the other's lift or a press sounds it).
      if (w.prep) continue;
      // While the other thumb holds the note before, on the note's time (a touch of its own, landing in its
      // window first, takes it: the waiting one was no slur); once that thumb lets go, from the slur's early
      // window on (no silence between the two).
      // D329: WHEN THE OTHER THUMB LIFTS: let go before the note's own early window, it sounds as that opens.
      const holding = [...this.held.values()].some((o) => o !== h && o.k === h.k && !o.wait && o.sounds.length);
      const open = MECH.waitSounds === "lift" ? Math.min(w.open, w.lift) : w.open;
      if (this.now < (holding ? notes[w.i].on : open)) continue;
      this.strikeWaiting(id, h);
    }
  }
  /**
   * D329, WHEN THE OTHER THUMB LIFTS (MECH.waitSounds "lift"): the thumb holding the note before lets go
   * at tick `tk`; a thumb resting early on the next note sounds it now, from that note's own early window
   * on (as a fresh strike could take it), judged at this moment: the connection made by the release.
   */
  private liftSounds(h: Held, tk: number) {
    if (!h.sounds.length) return;
    for (const [wid, w] of this.held) {
      if (w === h || !w.wait || w.wait.prep || w.k !== h.k) continue;
      if ([...this.held.values()].some((o) => o !== w && o.k === w.k && !o.wait && o.sounds.length)) continue;
      if (this.tracks[w.k].notes[w.wait.i]?.state !== "pending" || tk < w.wait.lift) continue;
      this.strikeWaiting(wid, w, true, tk);
    }
  }
  /**
   * D318: a waiting thumb strikes its note now: on its time (`takeable`: a touch landing for it after all,
   * by its time and a little after, takes it over, slideTaken), or as the other thumb lands for what follows.
   */
  private strikeWaiting(id: number, h: Held, takeable = true, at = this.now) {
    const w = h.wait;
    if (!w) return;
    const notes = this.tracks[h.k].notes;
    h.wait = undefined;
    if (notes[w.i].state !== "pending") return;
    for (const j of chordOf(notes, w.i)) if (notes[j].state === "pending") Object.assign(notes[j], { state: "hit", at, via: "touch" });
    const v = this.verdict(w.i, { c: w.c }, h.k);
    if (!v.ok) this.diagNote(`WRONG(${v.why ?? "?"})`, h.k, this.now, w.c, w.i);
    const own = this.lastBySide[h.side];
    const trail = this.trailBySide[h.side]?.length ?? 0;
    const chain = this.chain;
    // The thumb that played the note before: its next touch is for what follows, never this note.
    const prevSide = this.lastTouch?.side;
    this.play(id, h, w.i, v, false, h.d0);
    // D329: its own takeover window (D318 read the double contact's), RELATIVE scaled by the note's time between notes.
    if (v.ok && takeable) this.slid = { kind: "wait", k: h.k, i: w.i, id, holder: h, tick: at, until: notes[w.i].on + (this.relAt(MECH.waitTakeMs, h.k, w.i) / 1000) * this.tps, own, trail, chain, prevSide };
  }

  /**
   * D334, PREPARED (MECH.prepare; THE LAB's B+): the owner's hands play like a guitarist's hammer-on and
   * pull-off. As one thumb strikes note n, the other leaves n−1 and comes down on n+1, about a note early,
   * and rests there. B took that landing for a stray. Here, when no note's window holds it, a landing
   * while the other thumb holds the voice's note before (not that thumb rolling) and from MECH.prepShare
   * of the gap early (or from the other's strike) rests PREPARED on the next note: no sound, no strike.
   * Returns that note, or -1.
   */
  private prepareFor(id: number, h: Held, c: Contact, tk: number): number {
    const notes = this.tracks[h.k].notes;
    if (this.rollOf(c, h)) return -1;
    let prev = -1;
    for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.open && !o.wait && o.note > prev && notes[o.note]?.state === "hit") prev = o.note;
    if (prev < 0) return -1;
    const chord = chordOf(notes, prev);
    let next = Math.max(...chord) + 1;
    while (next < notes.length && notes[next].ride) next++;
    if (next >= notes.length || notes[next].state !== "pending" || !chord.includes(this.before(next, h.k)) || tk > notes[next].on) return -1;
    // Another thumb already resting on it: this one is no preparation.
    for (const o of this.held.values()) if (o !== h && o.wait?.i === next && o.k === h.k) return -1;
    const p = notes[prev];
    if (p.at !== undefined && this.msOf(Math.min(p.at, tk), Math.max(p.at, tk)) < MECH.slurRollMinMs) return -1;
    // From prepShare of the way from the other thumb's strike (or the note before's onset, if earlier) to
    // the note: 1, from that strike, less a frame (the two thumbs in the same frame: the owner's 0–9 ms).
    const from = Math.min(p.on, p.at ?? p.on);
    const open = notes[next].on - MECH.prepShare * (notes[next].on - from) - (PREP_FRAME_MS / 1000) * this.tps;
    return tk >= open ? next : -1;
  }
  /** D334: how the prepared note now sounding was sounded ("pull-off", "press"); a landing while the other holds is a "hammer-on". */
  private gesture: "pull-off" | "press" | null = null;
  /**
   * D334, PULL-OFF: the thumb holding the note before lets go at tick `tk`: a thumb prepared on the next
   * note sounds it now, judged at this moment (from the note's own early window on; let go before that, it
   * stays prepared and silent). MECH.prepLate "lift": the note waits past its late window for this.
   */
  private prepLift(h: Held, tk: number) {
    if (h.overFrom) {
      const n = this.tracks[h.k].notes[h.overFrom.i];
      this.tap?.({ kind: "prep", what: "overlap", tick: tk, track: h.k, i: h.overFrom.i, midi: n?.midi ?? 0, side: h.side, ms: this.msOf(h.overFrom.tick, tk) });
      h.overFrom = undefined;
    }
    if (h.wait || h.note < 0) return;
    for (const [wid, w] of this.held) {
      const p = w.wait;
      if (!p?.prep || w.k !== h.k) continue;
      const notes = this.tracks[w.k].notes;
      const b = this.before(p.i, w.k);
      if (b < 0 || !chordOf(notes, b).includes(h.note) || notes[p.i].state !== "pending") continue;
      const base = { tick: tk, track: w.k, i: p.i, midi: notes[p.i].midi, side: w.side };
      if (tk < p.lift) {
        this.tap?.({ kind: "prep", what: "early-lift", ...base, earlyMs: this.msOf(tk, p.lift) });
        continue;
      }
      this.tap?.({ kind: "prep", what: "pull-off", ...base });
      this.gesture = "pull-off";
      try {
        this.strikeWaiting(wid, w, false, tk);
      } finally {
        this.gesture = null;
      }
    }
  }
  /**
   * D334, PRESS (MECH.prepPress, off: B+ rests on the hammer-on and the pull-off): the resting thumb
   * pressed, read as a small move down or inward (more than pressMovePx from where it settled,
   * pressSettleMs after landing). Not by the contact's size: the owner's SENSOR log (iOS 18.7, 146 taps)
   * shows it in steps of about 24 px, no softer or harder by it (AUC 0.56), and almost never changing
   * while a thumb rests still (8 size-only moves of 818). In the note's window it sounds now, the other
   * thumb still down (over-legato: both sound); before it, the press is spent (press once more).
   */
  private prepPress(id: number, h: Held, c: Contact, ts: number) {
    const w = h.wait;
    const p = w?.prep;
    if (!w || !p || !MECH.prepPress) return;
    const tk = this.tickOf(ts);
    if (this.msOf(p.tick, tk) <= MECH.pressSettleMs) return void Object.assign(p, { x0: c.x, y0: c.y });
    const notes = this.tracks[h.k].notes;
    if (notes[w.i].state !== "pending") return;
    const mid = c.w / 2;
    const moved = Math.max(c.y - p.y0, Math.abs(p.x0 - mid) - Math.abs(c.x - mid));
    if (moved <= MECH.pressMovePx) return;
    const base = { tick: tk, track: h.k, i: w.i, midi: notes[w.i].midi, side: h.side, px: moved };
    if (tk < w.lift) {
      this.tap?.({ kind: "prep", what: "early-press", ...base, earlyMs: this.msOf(tk, w.lift) });
      Object.assign(p, { x0: c.x, y0: c.y });
      return;
    }
    const b = this.before(w.i, h.k);
    const holder = [...this.held.values()].find((o) => o !== h && o.k === h.k && !o.wait && b >= 0 && chordOf(notes, b).includes(o.note) && o.sounds.length);
    this.tap?.({ kind: "prep", what: "press", ...base, holding: !!holder });
    if (holder) holder.overFrom = { tick: tk, i: w.i };
    this.gesture = "press";
    try {
      this.strikeWaiting(id, h, false, tk);
    } finally {
      this.gesture = null;
    }
  }

  private trillNext = false;
  private strikeWith(id: number, h: Held, ts: number, at: { c?: Contact; key?: KeyPress }, d: number) {
    this.trillNext = !!at.key?.trill;
    const notesK = this.tracks[h.k].notes;
    const tk = this.tickOf(ts);
    // A pitched key (PIANO, MIDI): the note of that pitch in the window first, else the nearest in time
    // (D184: a right key a little late took the next note, and both were lost).
    const key = at.key?.midi;
    // D318: the other thumb lands while one waits for its note: that note's moment has come (it is struck
    // first, and this touch is for what follows).
    if (at.c && this.proto.id === "ladder") for (const [wid, w] of this.held) if (w !== h && w.wait && !w.wait.prep && w.k === h.k && w.side !== h.side) this.strikeWaiting(wid, w, false);
    // D325b: a strong beat's or a dissonance's window leans late (an agogic delay), the next note's giving way.
    const wo = this.leanOpt(h.k);
    let i = key !== undefined ? strike(notesK, tk, wo, (j) => chordOf(notesK, j).some((x) => notesK[x].midi === key)) : -1;
    if (i < 0) i = strike(notesK, tk, wo);
    if (i < 0 && at.c && this.slideTaken(id, h, at.c, tk)) return;
    if (i < 0 && MECH.slurNext && this.proto.id === "ladder" && at.c) {
      const sl = this.slurNext(id, h, at.c, tk);
      if (sl && tk >= sl.open) {
        i = sl.i;
        for (const j of chordOf(notesK, i)) if (notesK[j].state === "pending") Object.assign(notesK[j], { state: "hit", at: tk });
      } else if (sl) {
        // Down early: it waits for its note; the thumb holding gives way already (no slide, no shake).
        h.wait = { i: sl.i, open: sl.open, lift: notesK[sl.i].on - windowOf(notesK, notesK[sl.i], wo).early, c: at.c };
        for (const [hid, o] of this.held) if (hid !== id && o.k === h.k) o.handed = true;
        this.diagCounts.WAIT = (this.diagCounts.WAIT ?? 0) + 1;
        this.tap?.({ kind: "wait", tick: tk, track: h.k, i: sl.i, side: h.side, earlyMs: Math.round(this.msOf(tk, this.tracks[h.k].notes[sl.i].on)) });
        return;
      }
    }
    if (i >= 0) for (const j of chordOf(notesK, i)) notesK[j].via ??= "touch";
    // D217: in a stretto, a note is right only in its row: the other row's note, struck here, is wrong.
    if (i < 0 && this.line && this.tracks.length > 1) {
      const o = 1 - h.k;
      const j = this.nearestPending(o, tk);
      if (j >= 0) {
        h.k = o;
        this.play(id, h, j, { ok: false, why: "hand" }, false, d);
        return;
      }
    }
    // D191: a strike on a note that rides (the player striking it anyway) is no slip; it is played for them.
    if (i < 0 && notesK.some((n) => n.ride && Math.abs(n.on - tk) <= Math.max(this.opt.early, this.opt.late))) return;
    // D290: a second contact on a note just struck (a rolling thumb, a re-land): ignored, not a slip.
    // D329: MECH.doubleSameThumb: only the thumb that struck it (a rolling or re-landing contact is the same thumb's).
    if (i < 0 && this.proto.id === "ladder" && notesK.some((n) => n.state === "hit" && n.at !== undefined && Math.abs(this.msOf(Math.min(n.at, tk), Math.max(n.at, tk))) <= MECH.doubleMs && (!MECH.doubleSameThumb || this.struckBy.get(n) === h.side))) {
      this.diagCounts.DOUBLE = (this.diagCounts.DOUBLE ?? 0) + 1;
      this.tap?.({ kind: "double", tick: tk, track: h.k, side: h.side });
      return;
    }
    // D331: the next note, when this touch fell on the near side of the halfway line of one already struck
    // (not while the same thumb's earlier contact is still down: a roll).
    if (i < 0 && at.c && ![...this.held.values()].some((o) => o !== h && o.side === h.side && o.k === h.k)) {
      i = strikeNext(notesK, tk, wo, (MECH.doubleMs / 1000) * this.tps);
      if (i >= 0) for (const j of chordOf(notesK, i)) notesK[j].via ??= "touch";
    }
    // D334, PREPARED (B+): a landing B would call a stray, while the other thumb holds the note before,
    // rests on the next note, silent, until the other lifts (a pull-off) or (prepPress) it is pressed.
    if (i < 0 && MECH.prepare && this.proto.id === "ladder" && at.c) {
      const pi = this.prepareFor(id, h, at.c, tk);
      if (pi >= 0) {
        h.wait = { i: pi, open: Infinity, lift: notesK[pi].on - windowOf(notesK, notesK[pi], wo).early, c: at.c, prep: { tick: tk, x0: at.c.x, y0: at.c.y } };
        for (const [hid, o] of this.held) if (hid !== id && o.k === h.k) o.handed = true;
        this.diagCounts.PREPARED = (this.diagCounts.PREPARED ?? 0) + 1;
        this.tap?.({ kind: "prep", what: "rest", tick: tk, track: h.k, i: pi, midi: notesK[pi].midi, side: h.side, earlyMs: this.msOf(tk, notesK[pi].on) });
        return;
      }
    }
    if (i < 0) {
      this.diagNote("STRAY", h.k, tk, at.c, -1);
      if (this.tap) this.tap({ kind: "stray", tick: tk, track: h.k, side: h.side, near: this.nearOf(h.k, tk) });
      this.grade = { text: "✕", at: performance.now(), side: h.side, why: "time" };
      // A strike on no note is a slip, and counts against the accuracy (mashing scores nothing).
      this.stray++;
      this.slip();
      // A keyboard: the key struck is heard all the same. Elsewhere a touch on no note is silent (D293: it
      // sounded the nearest note, soft and muffled: on a phone's speaker a hole in the voice, then a jolt).
      const key = at.key?.midi ?? (this.proto.id === "piano" ? h.cell : undefined);
      if (key !== undefined) {
        h.midi = key;
        h.sounds = [this.touchNote(key, this.chip.ctx.currentTime, HOLD_MAX, voicing(this.tracks[h.k].voice, this.f.voices.length, true), { ...dynamic(this.heard(d)), lead: true, envelope: this.proto.id === "piano" ? "piano" : "synth", touch: this.touchDynamics ? undefined : (h.land ?? TOUCH_NEUTRAL) })];
      }
      return;
    }
    this.ladderWhy = undefined;
    let v = this.verdict(i, at, h.k);
    if (!v.ok) this.diagNote(`WRONG(${v.why ?? "?"})`, h.k, tk, at.c, i);
    else if (v.lane === "relative") this.diagNote("DIRECTION", h.k, tk, at.c, i);
    this.play(id, h, i, v, false, d);
  }

  move(id: number, c: Contact, ts: number) {
    this.evTs = ts;
    const h = this.held.get(id);
    if (!h) return;
    // The thumb is the one that went down (D184: slides were all judged as the left's).
    c = { ...c, side: h.side };
    h.across = c.x / Math.max(1, c.w);
    // D321: a drag's length: from the last moment the thumb was still where it last played.
    if (h.still === undefined || (this.road ? Math.abs(c.x - h.ax) : Math.abs(c.y - h.ay)) < 3) h.still = ts;
    h.dragMs = ts - h.still;
    h.trail.push({ t: ts, y: c.y });
    while (h.trail.length > 2 && ts - h.trail[0].t > 120) h.trail.shift();
    // D286: a thumb that travelled while down (a slide, a line, a big shake) is no longer where it struck.
    const own = this.lastBySide[h.side];
    if (own && Math.abs(c.y - own.y) > 1.5 * this.ladderRow) own.moved = true;
    // Across the dynamic axis while it sounds: a swell or a diminuendo (the dynamics lesson).
    const d = this.dynamicAt(c);
    if (this.touchDynamics) for (const s of h.sounds) s.dyn?.(levelOf(d) / levelOf(h.d0));
    // D311: elsewhere the sustain the player's (touch-expr.ts): sideways from where it landed, by the
    // instrument (a swell, a vibrato, a wah, the tremolo's speed; a struck note nothing). In BLUETOOTH
    // MODE the note it scored (scheduled ahead) answers it.
    else if (MECH.expression && h.land !== undefined && this.proto.layout === "bars") {
      const sv = holdValue(this.landAt(c) - h.land);
      for (const s of h.sounds) s.shape?.(sv);
      if (h.armed?.state === "hit") for (const s of h.armed.own) s.shape?.(sv);
    }
    const t = this.tickOf(ts);
    // D318: down early for its note: where it is now judges it; it slides nowhere meanwhile.
    if (h.wait) {
      h.wait.c = c;
      // D334: a prepared thumb pressed (MECH.prepPress) sounds its note.
      if (h.wait.prep) this.prepPress(id, h, c, ts);
      return;
    }
    if (h.passive) return;
    // D278: a note with an ornament to play: the thumb's moves are its notes, not a slide.
    // D319: and while its trill goes on (each leg keeps it going), after the shake was judged.
    if (h.orn && h.open && (!h.orn.done || (h.trill && t <= h.orn.by))) return this.ornamentShake(h, c, t);
    // D314: any other held note: a shake along the bar is a free ornament (and, once begun, no slide).
    if (this.freeShake(h, c, t, ts)) return;
    if (this.proto.id === "ladder" && this.rows) {
      // D208: a slide plays on only after a deliberate travel: a thumb's contact point wanders as it rolls
      // and lifts, and that wander took the next note from the other thumb. D289: the travel is the
      // notes' own, not a fixed row and a half (27 px, where a step is drawn 8 px apart: no slide could
      // follow the notes): at least SLIDE_MIN_PX, and the thumb at the next note's drawn height (within
      // half a judging row), on the way to it.
      if (!MECH.slides || h.handed || Math.abs(c.y - h.ay) < MECH.slideMinPx) return;
      const nextN = this.tracks[h.k].notes.find((n) => n.state === "pending" && !n.ride);
      if (!nextN) return;
      const target = this.rows.yOf(nextN.step);
      const want = target < h.ay ? 1 : -1;
      if ((c.y < h.ay ? 1 : -1) !== want || want * (c.y - target) > MECH.slideReachRows * this.ladderRow) return;
      // D271: one way only (the owner: "to avoid players being able to complete levels by dragging"):
      // a slide back the other way plays nothing; the thumb lifts and strikes again.
      const dir = c.y < h.ay ? 1 : -1;
      if (h.slideDir && dir !== h.slideDir) return;
      if (this.slideTo(id, h, c, t)) h.slideDir = dir;
    } else if (this.road && h.trace?.queue.length) {
      // D262: tracing: each part of a lane travelled sounds the line's next note, when it is near (no earlier
      // than half a sixteenth before it is written); no slides meanwhile.
      if (Math.abs(c.x - h.trace.x) < (c.w / this.laneCount) * SWEEP_STEP) return;
      const nx = h.trace.queue[0];
      if (this.now < nx.on - this.f.tpq / 8) return;
      h.trace.x = c.x;
      h.trace.slid++;
      this.traceNext(h.trace);
    } else if (this.road && h.sweep?.queue.length) {
      // D258: sweeping: each part of a lane travelled (either way: a chord in an edge lane has room only
      // one way) sounds the chord's next note, still upward; no slides meanwhile.
      if (Math.abs(c.x - h.sweep.x) < (c.w / this.laneCount) * SWEEP_STEP) return;
      h.sweep.x = c.x;
      h.sweep.slid++;
      this.sweepNext(h);
      if (!h.sweep.queue.length) {
        // The thumb's lane now its own: a slide from here needs a lane's travel of its own.
        h.cell = this.laneOfX(c.x, c.w);
        h.ax = c.x;
      }
    } else if (this.road) {
      // D208: a held thumb slid into another lane plays the next note there, joined (legato): only
      // once it has crossed most of a lane's width, so a rolling thumb does not slide by itself.
      const lane = this.laneOfX(c.x, c.w);
      if (h.handed || lane === h.cell || Math.abs(c.x - h.ax) < (c.w / this.laneCount) * 0.75) return;
      // D253: with both hands the lanes are narrow and a held thumb holds: a slide stays in its own hand's
      // lanes and needs a whole lane's travel (a held left thumb drifting took the next bass note early).
      if (this.hands && (this.laneTrack(lane) !== h.k || Math.abs(c.x - h.ax) < c.w / this.laneCount)) return;
      // D271: one way only, as LADDER's.
      const dir = c.x > h.ax ? 1 : -1;
      if (h.slideDir && dir !== h.slideDir) return;
      h.cell = lane;
      h.ax = c.x;
      if (this.slideTo(id, h, c, t)) (this.lastLane = this.laneBy[h.k] = lane), (h.slideDir = dir);
    } else if (this.proto.id === "piano") {
      // Only the thumb's own travel counts.
      const unit = c.w / this.kb.whites / 2;
      if (Math.abs(c.x - h.ax) < unit * 0.6) return;
      const cell = this.cellAt(c);
      if (cell === h.cell) return;
      h.cell = cell;
      h.ax = c.x;
      this.slideTo(id, h, c, t);
    }
  }

  /**
   * D278: a thumb shaken on an ornamented note: each move past the reach (three fifths of a row: more
   * than a rolling thumb's wander), the other way from the last, sounds the ornament's next note (a
   * trill: the upper and the main in turn; a mordent: the lower, then the main; a turn: upper, main,
   * lower, main); done, with its first move the right way, before the note's end: TRILL ✓ (or MORDENT,
   * TURN), points as a legato's. Not done: the plain note, nothing lost. D319: a trill sounds the
   * realisation from the first move (startTrill), on while the moves go on, settling when they stop;
   * the thumb's moves stay the trill's to the note's written end (no slide meanwhile). BLUETOOTH MODE:
   * the note sounds from the schedule (arm), the whole default trill whatever the shaking.
   */
  private ornamentShake(h: Held, c: Contact, t: number) {
    const o = h.orn!;
    if (t > o.by) return void (o.done = true);
    // D289: a smaller rock counts (0.4 of a row, about 7 px: was 0.6, 10.8 px), and either way first.
    const reach = Math.max(MECH.shakeReachMinPx, this.ladderRow * MECH.shakeReachRows);
    const dy = o.from - c.y;
    if (Math.abs(dy) < reach) return;
    const d: 1 | -1 = dy > 0 ? 1 : -1;
    if (d === o.dir) return void (o.from = c.y);
    o.dir = d;
    o.from = c.y;
    if (!o.moves) o.firstDir = d;
    o.moves++;
    const seq = o.kind === "mordent" ? [o.lower, o.main] : o.kind === "turn" ? [o.upper, o.main, o.lower, o.main] : [o.upper, o.main];
    const midi = seq[(o.moves - 1) % seq.length];
    // D319: a trill is the realisation's, not one note a move: the first move starts it (from the note
    // above, at the trill's speed, to the note's end); each move after keeps it going; it settles on the
    // main note when the moves stop (trillStep). Judged as before: the moves made.
    const n = this.tracks[h.k].notes[h.note];
    const trill = o.kind === "trill" && n ? (h.trill ? null : freeOrnamentParts(this.f, "trill", n.on, o.main, t, o.by, this.bpm, o.signs)) : null;
    if (o.kind === "trill" && h.trill) this.trillOn(h, t);
    else if (trill?.length) this.startTrill(h, trill, t, o.main, o.v, o.play);
    else {
      const now = this.chip.ctx.currentTime;
      for (const sd of h.sounds) sd.stop(now + 0.02);
      h.sounds = [this.touchNote(midi, now, HOLD_MAX, o.v, { ...o.play, legato: true })];
    }
    if (!o.done && o.moves >= o.need && midi === o.main) {
      o.done = true;
      this.shakes.hit++;
      this.earn("bonus", 2 * this.mult);
      this.flash = { text: `${o.word} ✓`, at: performance.now(), good: true, kind: "legato" };
      this.tap?.({ kind: "shake", tick: t, track: h.k, i: h.note, side: h.side, ornament: o.word, free: false });
    }
  }
  /**
   * D314, FREE ORNAMENTS: on LADDER a held note struck right, alone, still due and without a written
   * ornament takes a mordent or a trill when the thumb shakes on it (free-ornament.ts: along the bar,
   * fast, back and forth; D311's sideways expression and a slow drift are not shakes). Its notes sound
   * from now to the note's written end, realised at the tempo (ornament-play.ts freeOrnamentParts);
   * the note's judging is untouched (struck, held, lifted as before), nothing is earned: a small sign
   * rises from the note (a pop). Not in BLUETOOTH MODE (the note sounds from the schedule) nor on a
   * computer's keys. True while a shake owns the thumb (no slide meanwhile).
   */
  private freeShake(h: Held, c: Contact, t: number, ts: number): boolean {
    if (!MECH.freeOrnaments || this.proto.id !== "ladder" || this.proto.platform !== "mobile" || this.bt || !this.rows) return false;
    const i = h.note;
    const n = this.tracks[h.k].notes[i];
    if (!n || !h.open || h.orn || h.passive || h.handed || h.chord.length !== 1 || h.sweep || h.trace || !h.tone || n.state !== "hit") return false;
    // From where the note was struck (the first move is already part of the shake).
    if (!h.free || h.free.note !== i) h.free = { ...shakeTracker(h.ay, h.ax, ts), note: i };
    const end = n.on + n.dur;
    if (t >= end) return !!h.free.kind;
    const legs = h.free.count;
    const kind = feedShake(h.free, c.x, c.y, ts, Math.max(MECH.shakeReachMinPx, this.ladderRow * MECH.shakeReachRows));
    if (kind) this.freeOrnament(h, kind, t);
    // D319: a free trill goes on while the shake does (each leg keeps it going).
    else if (h.free.count > legs && h.free.kind === "trill") this.trillOn(h, t);
    return !!h.free.kind;
  }
  private freeOrnament(h: Held, kind: FreeKind, t: number) {
    const notes = this.tracks[h.k].notes;
    const n = notes[h.note];
    const parts = freeOrnamentParts(this.f, kind, n.on, n.midi, t, n.on + n.dur, this.bpm);
    if (!parts.length) return;
    const now = this.chip.ctx.currentTime;
    const tone = h.tone!;
    // D319: a free trill as a written one: on while the thumb shakes, settling when it stops.
    if (kind === "trill") this.startTrill(h, parts, t, n.midi, tone.v, tone.play);
    else {
      for (const sd of h.sounds) sd.stop(now + 0.02);
      h.sounds = parts.map(([pon, pdur, pm], k) => {
        const at = now + Math.max(0, this.timeAt(pon) - this.timeAt(t));
        const last = k === parts.length - 1;
        return this.touchNote(pm, at, last ? HOLD_MAX : Math.max(0.03, this.timeAt(pon + pdur) - this.timeAt(pon)), tone.v, { ...tone.play, legato: true });
      });
    }
    if (kind === "trill") this.freeOrns.trills++;
    else this.freeOrns.mordents += kind === "mordent" ? 1 : 0;
    if (kind === "short") this.freeOrns.shorts++;
    this.freeByNote.set(`${h.k}:${h.note}`, kind);
    // A flourish only: the sign rising from the note, faint gold (no points, no streak, no flash over the verdict).
    this.pops.push({ tick: n.on, step: n.step, text: kind === "mordent" ? "~|" : "TR", at: performance.now(), gold: true, ink: FREE_INK });
    this.tap?.({ kind: "shake", tick: t, track: h.k, i: h.note, side: h.side, ornament: kind, free: true });
  }
  /**
   * D319, THE PLAYER'S TRILL: started by the first shake (written, D278) or the third leg (free, D314),
   * its notes the realisation's from then to the note's end (from the note above, at the trill's speed:
   * MECH.trillPerSecond on the beat's grid), sounded a moment ahead as they come (trillStep), so that
   * it can stop: with MECH.trillFollowsShake, when no leg has come for MECH.trillStopMs the trill
   * settles on the main note, held; shaken through the whole note, it lasts the whole note.
   */
  private startTrill(h: Held, parts: [number, number, number][], t: number, main: number, v: ReturnType<typeof voicing>, play: Play) {
    const now = this.chip.ctx.currentTime;
    for (const sd of h.sounds) sd.stop(now + 0.02);
    h.sounds = [];
    h.trill = { parts, next: 0, last: t, main, v, play, settled: false, live: [] };
    this.trillStep(h, t);
  }
  /** D319: a leg of the shake: the trill goes on. */
  private trillOn(h: Held, t: number) {
    if (h.trill && !h.trill.settled) h.trill.last = Math.max(h.trill.last, t);
  }
  /** D319: each frame, the trills under way: their next notes sounded, or settled once the shaking stopped. */
  private trills() {
    for (const h of this.held.values()) if (h.trill && !h.trill.settled) this.trillStep(h, this.now);
  }
  private trillStep(h: Held, now: number) {
    const r = h.trill!;
    if (h.passive) return void (r.settled = true);
    const t0 = this.chip.ctx.currentTime;
    const audioAt = (tick: number) => t0 + Math.max(0, this.timeAt(tick) - this.timeAt(now));
    const keep = (sd: Sounding, end: number) => {
      r.live = r.live.filter((x) => x.end > t0);
      r.live.push({ sd, end });
      h.sounds = r.live.map((x) => x.sd);
    };
    // Settled when the shaking stopped (or the note was judged ended under the thumb).
    if (r.next < r.parts.length && (!h.open || (MECH.trillFollowsShake && now - r.last > (MECH.trillStopMs / 1000) * this.tps))) {
      // The shaking stopped: the main note, held, from the end of the trill's note now sounding.
      const prev = r.parts[r.next - 1];
      const from = prev ? Math.max(now, prev[0] + prev[1]) : now;
      const at = audioAt(from);
      this.tap?.({ kind: "shake", tick: now, track: h.k, i: h.note, side: h.side, ornament: `settled: ${r.next} trill notes`, free: !h.orn });
      keep(this.touchNote(r.main, at, HOLD_MAX, r.v, { ...r.play, legato: true }), at + HOLD_MAX);
      r.next = r.parts.length;
      r.settled = true;
      return;
    }
    const ahead = now + TRILL_AHEAD_S * this.tps;
    while (r.next < r.parts.length && r.parts[r.next][0] <= ahead) {
      const [pon, pdur, pm] = r.parts[r.next];
      const last = r.next === r.parts.length - 1;
      const at = audioAt(pon);
      const len = last ? HOLD_MAX : Math.max(0.03, this.timeAt(pon + pdur) - this.timeAt(pon));
      keep(this.touchNote(pm, at, len, r.v, { ...r.play, legato: true }), at + len);
      r.next++;
    }
    if (r.next >= r.parts.length) r.settled = true;
  }
  /** D314: the free ornaments played this run (counted for the tests; they score nothing). */
  readonly freeOrns = { mordents: 0, shorts: 0, trills: 0 };
  /** D327: what each note's free ornament became ("track:note" → kind), for the score sheet's line. */
  readonly freeByNote = new Map<string, FreeKind>();
  /** D278: the ornaments a phone's player was given to play, and those played. */
  readonly shakes = { hit: 0, of: 0 };
  /** D314: the tick the run starts at (the bars' soft/strong hints fade out after it). */
  readonly startTick: number;
  /** D314: the ornament hint is shown (asked for, and no ornament shaken yet this run). */
  get ornHintOn(): boolean {
    return !!this.o.ornHint && this.shakes.hit === 0 && this.proto.platform === "mobile";
  }
  /** D314: an ornament of the player's to shake coming within `beats` beats (or one being shaken now). */
  ornamentNear(beats = 3): boolean {
    if ([...this.held.values()].some((h) => h.orn && !h.orn.done)) return true;
    const notes = this.tracks[0]?.notes ?? [];
    const until = this.now + beats * this.beat;
    for (let i = Math.max(0, this.next(0)); i < notes.length && notes[i].on <= until; i++) if (notes[i].state === "pending" && this.shakeAt(0, i)) return true;
    return false;
  }
  /** D314: the ornament to shake on track k's note i, if any (its kind, first way, moves). */
  shakeAt(k: number, i: number): Shake | null {
    const n = this.tracks[k]?.notes[i];
    const o = n ? this.ornaments.get(`${this.voiceOf(k, i)}:${n.on}`) : undefined;
    return o ? shakeOf(o) : null;
  }
  /** D278: the word for the ornament on track k's note i ("TR", "~|"…), or "". */
  ornamentAt(k: number, i: number): string {
    const n = this.tracks[k]?.notes[i];
    const o = n ? this.ornaments.get(`${this.voiceOf(k, i)}:${n.on}`) : undefined;
    return o && shakeOf(o) ? ornamentMark(o) : "";
  }

  /** A held thumb reaches another place: the next note there, if it is there and due. */
  private slideTo(id: number, h: Held, c: Contact, t: number): boolean {
    // D208: only onto the next note still to play, and not before its time is near (half the early window).
    const notes = this.tracks[h.k].notes;
    const next = notes.findIndex((n) => n.state === "pending" && !n.ride);
    if (next < 0 || t < notes[next].on - this.opt.early / 2) return false;
    const i = strike(notes, t, this.leanOpt(h.k), (j) => chordOf(notes, next).includes(j) && !h.chord.includes(j) && this.verdict(j, { c }, h.k).ok);
    if (i < 0) return false;
    // D318: as it was before the slide, should the other thumb land on the note at once (slideTaken).
    const own = this.lastBySide[h.side];
    const trail = this.trailBySide[h.side]?.length ?? 0;
    const chain = this.chain;
    this.tap?.({ kind: "slide", tick: t, track: h.k, i, side: h.side, movedPx: h.ay - c.y });
    h.ay = c.y;
    notes[i].via = "slide";
    this.play(id, h, i, { ok: true }, true, this.dynamicAt(c));
    this.slides++;
    // D286: the thumb is where it slid to, on the note it slid onto.
    this.remember(h.side, { y: c.y, step: notes[i].step, tick: this.now });
    this.slid = { kind: "slide", k: h.k, i, id, holder: h, tick: this.now, own, trail, chain };
    return true;
  }
  /**
   * D321, MECH.dragMeaning "connect": a slide sounds the instrument's own connection (drag.ts). A sound
   * that bends glides from the note held to the new one, as long as the drag took (capped by a share of
   * the note: glideMs), the pitch carried on each frame (glideStep); a keyboard plays the coulé or the
   * Schleifer (dragFill) and then the note, joined; a step on a keyboard is a plain joined note. False:
   * nothing to connect with (a chord, a sound that cannot glide: the slide sounds as before).
   */
  private dragConnect(h: Held, i: number, to: number, expr: Play, v: ReturnType<typeof voicing>): boolean {
    const notes = this.tracks[h.k].notes;
    const n = notes[i];
    const noteMs = this.msOf(n.on, n.on + n.dur);
    const dragMs = h.dragMs ?? 0;
    const tick = n.at ?? this.now;
    const t0 = this.chip.ctx.currentTime;
    const g = h.glider;
    const from = g ? between(g.from, g.to, glideAt(0, 1, (t0 - g.t0) * 1000, g.ms)) : h.midi;
    if (dragFamily(preset().id) === "glide") {
      const one = h.sounds.length === 1 ? h.sounds[0] : null;
      if (!one?.glide || this.proto.id === "piano") return false;
      const ms = glideMs(dragMs, noteMs);
      h.glider = { sd: one, from, to, t0, ms };
      this.tap?.({ kind: "drag", tick, track: h.k, i, side: h.side, from: h.midi, to, how: "glide", ms, dragMs });
      return true;
    }
    h.glider = undefined;
    const fill = dragFill(h.midi, to, scaleOfKey(keyAt(this.f, n.on)));
    const each = fillNoteMs(fill.notes.length, dragMs, noteMs) / 1000;
    for (const sd of h.sounds) sd.stop(t0 + 0.02);
    const play: Play = { ...expr, legato: true };
    const fills = fill.notes.map((m, k) => this.touchNote(m, t0 + k * each, each, v, play));
    h.sounds = [...fills, this.touchNote(to, t0 + fill.notes.length * each, HOLD_MAX, v, play)];
    h.tone = { v, play };
    this.tap?.({ kind: "drag", tick, track: h.k, i, side: h.side, from: h.midi, to, how: fill.kind, fill: fill.notes, ms: each * 1000, dragMs });
    return true;
  }
  /** D321: each frame, the glides under way carried on (the pitch between the two notes, on a log scale). */
  private glideStep() {
    const t = this.chip.ctx.currentTime;
    for (const h of this.held.values()) {
      const g = h.glider;
      if (!g) continue;
      const el = (t - g.t0) * 1000;
      if (!h.sounds.includes(g.sd)) h.glider = undefined;
      else if (el >= g.ms) (g.sd.glide?.(g.to), (h.glider = undefined));
      else g.sd.glide?.(between(g.from, g.to, glideAt(0, 1, el, g.ms)));
    }
  }
  /** D318: the last slide (its voice, note, touch, tick), and the thumb's memory and the chain before it. */
  private slid: { kind: "slide" | "wait"; until?: number; prevSide?: Side; k: number; i: number; id: number; holder: Held; tick: number; own?: { y: number; step: number; tick: number; moved?: boolean }; trail: number; chain: number } | null = null;

  /**
   * D318: a slide the slur's own drift made. A thumb giving way rolls and drifts toward the next note as
   * the other comes down (0 to 30 px in simulation), and reaching that note's drawn height a moment before
   * the other thumb lands it slid onto it: the note taken early as a slide (no legato, the chain broken),
   * the landing then ignored as a second contact. A thumb landing on the note just slid onto, within
   * SLIDE_TAKE_MS and right by its own moves, while the sliding thumb still holds it, takes the note over:
   * its strike, joined (the sound the slide made goes on: no new attack), scored as the legato it was; the
   * drifting thumb only holds (handed), its memory back where it struck.
   */
  private slideTaken(id: number, h: Held, c: Contact, tk: number): boolean {
    const st = this.slid;
    if (!MECH.slideTakeover || !st || st.k !== h.k || this.proto.id !== "ladder") return false;
    const notes = this.tracks[h.k].notes;
    const n = notes[st.i];
    const o = st.holder;
    // Still holding it, or let go (or taken back by iOS) within the legato window: the slur's gap.
    const holding = this.held.get(st.id) === o;
    const lo = this.lastOff;
    const gone = !holding && !!lo && lo.k === h.k && lo.i === st.i && this.msOf(lo.tick, tk) <= legatoGapMs(this.msOf(n.on, n.on + n.dur));
    const slide = st.kind === "slide";
    // A waiting thumb's note: by a touch nearer its time than the next note's, not the thumb that played the note before.
    const nx = notes.findIndex((x, j) => j > st.i && !x.ride && x.on > n.on);
    const nearer = nx < 0 || Math.abs(tk - n.on) < Math.abs(notes[nx].on - tk);
    const soon = slide ? n.via === "slide" && this.msOf(st.tick, tk) <= this.relAt(MECH.slideTakeMs, h.k, st.i) : tk <= (st.until ?? 0) && nearer && h.side !== st.prevSide;
    if (o === h || o.note !== st.i || !soon || !(holding || gone)) return false;
    if (notes.some((x, j) => j > st.i && x.state === "hit" && !x.ride && notes[j - 1].on !== x.on)) return false;
    if (!this.verdict(st.i, { c }, h.k).ok) return false;
    this.slid = null;
    this.tap?.({ kind: "takeover", tick: tk, track: h.k, i: st.i, side: h.side });
    for (const j of o.chord) notes[j].via = "touch";
    if (slide) this.slides--;
    if (st.own) this.lastBySide[o.side] = st.own;
    else delete this.lastBySide[o.side];
    this.trailBySide[o.side]?.splice(st.trail);
    Object.assign(h, { note: o.note, chord: o.chord, midi: o.midi, d0: o.d0, sounds: o.sounds, fx: o.fx, tone: o.tone, pts: o.pts, open: o.open, wantShort: o.wantShort, armed: o.armed });
    Object.assign(o, { sounds: [], fx: [], open: false, passive: true, handed: true, pts: undefined, armed: undefined, wantShort: undefined });
    // Let go already (its end judged there): the note sounds on from this thumb, joined.
    if (!holding) {
      const tone = h.tone;
      h.sounds = tone ? h.chord.map((j) => this.touchNote(notes[j].midi, this.chip.ctx.currentTime, HOLD_MAX, tone.v, { ...tone.play, legato: this.proto.id !== "piano" })) : [];
      h.fx = [];
      h.open = false;
    }
    this.lastTouch = { side: h.side, y: c.y };
    this.remember(h.side, { y: c.y, step: n.step, tick: this.now });
    // The legato the slide broke: credited as a strike's (the reading asking it detached: as before).
    const rd = this.o.reading;
    const place = rd ? this.readingIndex().get(`${h.k}:${n.on}`) : undefined;
    const askJoin = rd && place !== undefined && place > 0 ? rd.notes[place - 1]?.join : null;
    const p = this.before(st.i, h.k);
    const at = performance.now();
    // D321: a "connect" drag was credited as joined already: that credit gives way to the strike's.
    if (slide && MECH.dragMeaning === "connect" && this.joinedAt(st.i, h.k) && p >= 0 && notes[p].state === "hit") this.art.legato--;
    if (slide && this.joinedAt(st.i, h.k) && askJoin !== false && p >= 0 && notes[p].state === "hit" && h.pts !== undefined) {
      this.chain = st.chain + 1;
      this.art.legato++;
      this.art.chain = Math.max(this.art.chain, this.chain);
      // D325: the join judged by intention as a strike's, joined (a hold of 1).
      let text = this.chain > 1 ? `LEGATO ×${this.chain}` : "LEGATO";
      if (!this.breathAt(st.i, h.k)) {
        const ok = askJoin === true || this.sense.judge(valueClass(notes[p].dur, this.beat), 1);
        this.art.touchOf = (this.art.touchOf ?? 0) + 1;
        if (ok) {
          this.art.touchOk = (this.art.touchOk ?? 0) + 1;
          this.artChain++;
          const bonus = artRoom(artBonus(h.pts, this.artChain), this.score, this.earned.articulation);
          h.pts += bonus;
          this.earn("articulation", bonus);
          text = this.artChain > 1 ? `LEGATO ×${this.artChain}` : "LEGATO";
        } else this.artChain = 0;
      }
      this.flash = { text, at, good: true, kind: "legato" };
      this.ties.push({ k: h.k, a: p, b: st.i, at });
      if (this.ties.length > 12) this.ties.splice(0, 6);
      this.pops.push({ tick: n.on, step: n.step, text, at, gold: false, from: { tick: notes[p].on, step: notes[p].step }, ink: LEGATO_INK });
    }
    this.thumbNote(h.side, n.on, h.d0);
    return true;
  }

  /**
   * A touch or key let go. D249: `cancelled` when the system took the touch back (pointercancel: an
   * edge gesture, a sixth finger): its sound stops, but it is no release, so its end is not judged.
   */
  up(id: number, ts: number, cancelled = false) {
    this.evTs = ts;
    if (this.pedalLeave(id, ts)) return;
    const h = this.held.get(id);
    if (!h) return;
    this.held.delete(id);
    // D262: a line not finished goes on by itself.
    if (h.trace?.queue.length) this.loose.push(h.trace);
    // D334: a prepared thumb let go before its note sounded: unprepared, silent.
    const pw = h.wait?.prep ? h.wait : undefined;
    if (pw && this.tracks[h.k].notes[pw.i]?.state === "pending") this.tap?.({ kind: "prep", what: "let-go", tick: this.tickOf(ts), track: h.k, i: pw.i, midi: this.tracks[h.k].notes[pw.i].midi, side: h.side });
    // D317: the lab may judge a touch taken back as a plain lift (MECH.cancel "lift").
    if (cancelled && MECH.cancel === "lift") (this.cancels++, this.tap?.({ kind: "cancel", tick: this.tickOf(ts), track: h.k, side: h.side, ringsOn: false, mode: "lift" }));
    if (cancelled && MECH.cancel !== "lift") {
      this.cancels++;
      // D289: the system took the touch back (iOS may, when the other thumb lands): no release judged,
      // but for the join the note ended here, so the next note can still be legato.
      // D293: iOS takes a touch back most often when the other thumb lands on it (thumbs overlapping): the
      // note rings on to its written end (or the next note's strike), and the join is judged from there.
      // D308: only while another thumb is down (the overlap that made iOS take it back); a touch taken back
      // alone is let go there, as a lift (it rang on to its written end: a staccato lost).
      const n = this.tracks[h.k].notes[h.note];
      const overlap = MECH.cancel === "always" || this.held.size > 0;
      this.tap?.({ kind: "cancel", tick: this.tickOf(ts), track: h.k, side: h.side, ringsOn: !!(h.open && n?.state === "hit" && overlap), mode: MECH.cancel });
      if (h.open && n?.state === "hit" && overlap) {
        const end = Math.max(this.tickOf(ts), n.on + n.dur);
        this.lastOff = { k: h.k, i: h.note, tick: end };
        const until = this.timeAt(end);
        for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop(Math.max(this.chip.ctx.currentTime, until));
      } else {
        // D318: taken back alone, the note ends here, and for the join too (D289: a cancel counts as a lift):
        // iOS takes the first thumb back a moment before the second lands, and the slur was lost.
        if (MECH.cancelJoins && h.open && n?.state === "hit") this.lastOff = { k: h.k, i: h.note, tick: this.tickOf(ts) };
        for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
      }
      // D334: a touch taken back counts as the lift for a pull-off.
      if (MECH.prepare && this.proto.id === "ladder") this.prepLift(h, this.tickOf(ts));
      h.open = false;
      return;
    }
    // D218: the note's end judged as it is let go.
    if (h.open) this.judgeEnd(h, this.tickOf(ts));
    // D318: a note taken over after its first thumb let go (slideTaken) ends, for the join, as this thumb lets go.
    else if (h.note >= 0 && h.sounds.length && !h.passive && this.tracks[h.k].notes[h.note]?.state === "hit") this.lastOff = { k: h.k, i: h.note, tick: this.tickOf(ts) };
    // D329: WHEN THE OTHER THUMB LIFTS: this release sounds a thumb resting early on the next note.
    if (MECH.waitSounds === "lift" && this.proto.id === "ladder") this.liftSounds(h, this.tickOf(ts));
    // D334, PULL-OFF: this release sounds a thumb prepared on the next note.
    if (MECH.prepare && this.proto.id === "ladder") this.prepLift(h, this.tickOf(ts));
    // Flicked upwards as it let go: the swoosh.
    const tr = h.trail;
    if (h.sounds.length && tr.length >= 2) {
      const a = tr[0];
      const b = tr[tr.length - 1];
      const dy = b.y - a.y;
      const dt = Math.max(1, b.t - a.t);
      if (-dy >= SWOOSH_PX && -dy / dt >= SWOOSH_V) {
        for (const sd of h.sounds) sd.stop(this.chip.ctx.currentTime + 0.02);
        for (const sd of h.armed?.own ?? []) sd.stop(Math.max(this.chip.ctx.currentTime + 0.02, (h.armed?.at ?? 0) + 0.05));
        if (!this.bt) this.chip.swoosh(h.midi, voicing(h.note >= 0 ? this.voiceOf(h.k, h.note) : this.tracks[h.k].voice, this.f.voices.length, true), levelOf(this.heard(h.d0)));
        return;
      }
    }
    // D306: BLUETOOTH MODE: the note scheduled at its written length is cut as the touch lets go (never
    // before it has sounded a moment): the release heard, as on the speaker, a headphones' delay late.
    const a = h.armed;
    const own = a ? a.own.map((sd) => ({ stop: (when?: number) => sd.stop(Math.max(when ?? this.chip.ctx.currentTime, a.at + 0.05)), bend() {} })) : [];
    if (this.pedalDown) this.pedalled.push(...h.sounds, ...(h.fx ?? []), ...own);
    else for (const sd of [...h.sounds, ...(h.fx ?? []), ...own]) sd.stop();
  }

  /** Sounds note i (or what was asked for instead) and grades it. A slide glides on; the piano strikes again. */
  private play(id: number, h: Held, i: number, v: Verdict, slide: boolean, d: number) {
    const notes = this.tracks[h.k].notes;
    if (notes[i]) for (const j of chordOf(notes, i)) this.struckBy.set(notes[j], h.side);
    // D218: struck by a new touch or key while the note before still sounds (held by another thumb or
    // key, or let go no more than legatoGapMs before: D289, a smooth handover, not a simultaneity): legato. A slide is
    // not (the owner: "slide is cheap"): it sounds joined but earns nothing and breaks the chain. The
    // notes giving way end here (judged).
    const tk = notes[i].at ?? this.now;
    let over = false;
    for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.sounds.length && !o.passive && o.note >= 0) over = true;
    const lo = this.lastOff;
    const lw: LegatoWhy = { judged: false, holding: over, ok: false };
    if (lo && lo.k === h.k && lo.i === this.before(i, h.k)) {
      const p = notes[lo.i];
      lw.gapMs = this.msOf(lo.tick, tk);
      lw.allowedMs = legatoGapMs(this.msOf(p.on, p.on + p.dur));
      if (this.msOf(lo.tick, tk) <= legatoGapMs(this.msOf(p.on, p.on + p.dur))) over = true;
    }
    // D325: the note before's hold, as the player let it go (still down: held to this strike), before its end is judged here.
    const pv = this.before(i, h.k);
    let hold: { sounded: number; toNext: number; gap: number } | null = null;
    const pa = pv >= 0 && notes[pv].state === "hit" ? notes[pv].at : undefined;
    if (pa !== undefined && !slide) {
      let still = false;
      for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.note === pv && o.sounds.length) still = true;
      if (still) hold = { sounded: this.msOf(pa, tk), toNext: this.msOf(pa, tk), gap: 0 };
      else if (lo && lo.k === h.k && lo.i === pv) hold = { sounded: this.msOf(pa, lo.tick), toNext: this.msOf(pa, tk), gap: this.msOf(lo.tick, tk) };
    }
    if (h.open) this.judgeEnd(h, tk);
    for (const [hid, o] of this.held) if (hid !== id && o.k === h.k && o.open) this.judgeEnd(o, tk);
    // D293: the thumbs overlapping is a legato as good as a handover; the thumb still down only holds: its
    // glide toward its next note as it lifts took that note early (a slide), and its touch there was a slip.
    if (!slide) for (const [hid, o] of this.held) if (hid !== id && o.k === h.k) o.handed = true;
    const voiceV = voicing(this.voiceOf(h.k, i), this.f.voices.length, true);
    const piano = this.proto.id === "piano";
    const chord = chordOf(notes, i);
    // D293: the note sounds alike however it was struck: no duller for a note right only by its direction
    // (D239), no brighter in CON FUOCO, no octaves in ORGANO PLENO (D181; their points stay).
    const base = dynamic(this.heardAt(d, h.k, notes[i].on));
    // D311: where the thumb landed across its bar shapes the attack (Play.touch), right or wrong alike.
    let expr: Play = { ...base, trill: this.trillNext, muffleable: true, lead: true, envelope: piano ? "piano" : "synth", touch: this.touchFor(h.land, h.k, notes[i].on) };
    // D336: the lab's DYNAMICS (its own touch, never with a reading's level or the dynamics lesson).
    const dynAns =
      this.noteDyn && !slide && !this.bt && expr.touch !== undefined
        ? this.noteDyn({ k: h.k, i, midi: v.ok || v.wrong === undefined ? notes[i].midi : v.wrong, side: h.side, land: h.land ?? TOUCH_NEUTRAL, across: h.across !== undefined && this.proto.layout === "bars" ? barAcross(h.across * this.touchW, this.touchW) : undefined, ts: h.t0 ?? null, gesture: this.gesture ?? (MECH.prepare && lw.holding ? "hammer-on" : undefined), ok: v.ok })
        : null;
    if (dynAns) expr = { ...expr, touch: dynAns.touch, level: (expr.level ?? 1) * dynAns.level };
    // D213: the player's voice as the others: its subject brighter (and its effect), duller during another's entry.
    // D219: WITH KIMIKO ISHIZAKA the player's voice is plain (no subject effects over her piano).
    const sv = v.ok && !this.o.her ? this.subj.shape(this.voiceOf(h.k, i), notes[i].on, voiceV) : null;
    if (sv) expr = { ...expr, ...sv.play, level: (expr.level ?? 1) * (sv.play.level ?? 1) };
    // D262, THE TWO KEYBOARDS: the lower row sounds on the quieter one (the row touched, on a phone; the
    // note's own on a computer); the echo played there, a small bonus.
    if (this.arc?.echo && h.k === 0) {
      const row = this.road ? (h.row ?? 0) : this.rowOf(i, 0);
      if (row === 1) expr = { ...expr, level: (expr.level ?? 1) * ECHO_LEVEL, bright: (expr.bright ?? 0) - ECHO_DARK };
      if (v.ok && this.road && row === 1 && this.rowOf(i, 0) === 1) {
        this.earn("bonus", this.mult);
        this.flash = { text: "ECHO", at: performance.now(), good: true, kind: "legato" };
      }
    }
    const pitches = v.ok || v.wrong === undefined ? chord.map((j) => notes[j].midi) : [v.wrong];
    // D213: the subject's effect under the note (the note's own sound below, its last made).
    for (const sd of h.fx ?? []) sd.stop();
    const n1 = notes[i];
    h.fx = sv && !this.bt ? this.subj.layers(this.chip, sv.sn, pitches[0], this.chip.ctx.currentTime, this.timeAt(n1.on + n1.dur) - this.timeAt(n1.on), sv.v, expr.level ?? 1) : [];
    // D299, BLUETOOTH MODE: the note is already on the schedule (arm); a right touch only scores it (its
    // riders then shown as they sound). Below, every sound a touch would make is silent (touchNote).
    const armed = this.bt && v.ok ? this.armed.get(`${h.k}:${notes[i].on}`) : undefined;
    if (armed) (armed.state = "hit", (h.armed = armed));
    // D306: a right touch on a silenced voice sounds itself and brings the voice back; a wrong one silences it.
    if (this.bt) {
      this.voiced = v.ok && !armed;
      if (v.ok) this.live[h.k] = true;
      else this.silence(h.k);
    }
    // D321, "connect": the drag's own connection, by the instrument: a glide as long as the drag took, or
    // on a keyboard the coulé or the Schleifer into the note (dragConnect); else the slide glides on as before.
    if (slide && MECH.dragMeaning === "connect" && pitches.length === 1 && this.dragConnect(h, i, pitches[0], expr, sv?.v ?? voiceV)) {
      /* sounded */
    } else if (slide && !piano && h.sounds.length === 1 && pitches.length === 1) {
      h.sounds[0].glide?.(pitches[0]);
    } else {
      for (const sd of h.sounds) sd.stop();
      // Joined to the note the other thumb still holds: that one gives way. D318: and to the note let go
      // within the legato window (a handover with a hair's gap, or a touch iOS took back): joined as it is
      // judged, the sound too (no fresh attack where the instrument can join; a plucked one plucks).
      let legato = slide || (MECH.joinedSound && over && !piano && v.ok);
      for (const [hid, o] of this.held) {
        if (hid === id || o.k !== h.k) continue;
        o.passive = true;
        o.sweep = undefined;
        if (!o.sounds.length) continue;
        legato = true;
        // D334: a PRESS while the other thumb holds: over-legato, both sound until it lifts.
        if (this.gesture === "press") continue;
        for (const sd of o.sounds) sd.stop(this.chip.ctx.currentTime + 0.03);
        o.sounds = [];
      }
      // D205: an ornamented note, struck right, plays its ornament from the moment it is struck, then holds its main note.
      const n0 = notes[i];
      const orn = v.ok && pitches.length === 1 ? this.ornaments.get(`${this.voiceOf(h.k, i)}:${n0.on}`) : undefined;
      const shake = orn && this.proto.platform === "mobile" ? shakeOf(orn) : null;
      if (orn && shake) {
        // D278: on a phone the ornament is the player's: the main note now, its other notes as the thumb shakes.
        const prev = this.before(i, h.k);
        const parts = realiseNote(this.f, orn, n0.on, n0.dur, n0.midi, prev >= 0 ? notes[prev].midi : undefined, this.bpm);
        const upper = parts.find((p) => p[2] > n0.midi)?.[2] ?? n0.midi + 2;
        const lower = parts.find((p) => p[2] < n0.midi)?.[2] ?? n0.midi - 2;
        const v = sv?.v ?? voiceV;
        const play = { ...expr, legato: legato && !piano };
        h.sounds = [this.touchNote(n0.midi, this.chip.ctx.currentTime, HOLD_MAX, v, play)];
        h.orn = { ...shake, main: n0.midi, upper, lower, moves: 0, dir: 0, from: h.ay, firstDir: 0, v, play, by: n0.on + n0.dur, done: false, signs: orn.signs };
        this.shakes.of++;
      } else if (orn) {
        const t0 = this.chip.ctx.currentTime;
        const prev = this.before(i, h.k);
        const parts = realiseNote(this.f, orn, n0.on, n0.dur, n0.midi, prev >= 0 ? notes[prev].midi : undefined, this.bpm);
        h.sounds = parts.map(([pon, pdur, pmidi], k) => {
          const at = t0 + (this.timeAt(pon) - this.timeAt(n0.on));
          const last = k === parts.length - 1;
          return this.touchNote(pmidi, at, last ? HOLD_MAX : this.timeAt(pon + pdur) - this.timeAt(pon), sv?.v ?? voiceV, { ...expr, legato: k > 0 || (legato && !piano) });
        });
      } else if (v.ok && pitches.length > 1 && this.tracks[h.k].sweeps?.has(n0.on)) {
        // D258, SWEEP: the lowest now, the rest as the thumb slides up, or by themselves a moment apart.
        const up = [...pitches].sort((a, b) => a - b);
        const play = { ...expr, legato: false };
        h.sounds = [this.touchNote(up[0], this.chip.ctx.currentTime, HOLD_MAX, sv?.v ?? voiceV, play)];
        h.sweep = { queue: up.slice(1), next: this.chip.ctx.currentTime + SWEEP_GAP_S, x: h.ax, slid: 0, voice: sv?.v ?? voiceV, play };
      } else if (v.ok && this.tracks[h.k].traces?.has(n0.on)) {
        // D262, THE LINE: the first note now; the rest as the thumb slides on along the path (or on time by themselves).
        const q = this.tracks[h.k].traces!.get(n0.on)!;
        h.sounds = pitches.map((m) => this.touchNote(m, this.chip.ctx.currentTime, HOLD_MAX, sv?.v ?? voiceV, { ...expr, legato: false }));
        h.trace = { queue: q.map((x) => ({ ...x })), x: h.ax, slid: 0, count: q.length, voice: sv?.v ?? voiceV, play: { ...expr, legato: false } };
      } else h.sounds = pitches.map((m) => this.touchNote(m, this.chip.ctx.currentTime, HOLD_MAX, sv?.v ?? voiceV, { ...expr, legato: legato && !piano }));
      h.tone = { v: sv?.v ?? voiceV, play: { ...expr, legato: !piano } };
      dynAns?.sounded?.(h.sounds, this.chip.ctx.currentTime);
      // D293: a note judged wrong sounds as written, at its level: the verdict is seen (it was muffled:
      // darkened to 600 Hz and flattened, which on a phone's speaker all but silenced it).
    }
    this.voiced = false;
    // A touch on the screen (not a key) is the next note's reference.
    if (h.trail.length) (this.lastTouch = { side: h.side, y: h.ay }), this.remember(h.side, { y: h.ay, step: this.tracks[h.k].notes[i].step, tick: this.now }), this.runLanding(h.k, i, h.ay);
    h.midi = pitches[0];
    h.note = i;
    h.chord = chord;
    h.d0 = d;
    const n = notes[i];
    const at = performance.now();
    this.marks.push({ tick: this.now, step: v.ok || v.wrong === undefined ? n.step : stepNear(v.wrong, n), ok: v.ok });
    if (this.marks.length > 400) this.marks.splice(0, 100);
    // D317: the verdict told to the lab, with why (LADDER's height, the join).
    // D328: the band told when the player struck (a wait ends; FOLLOWS: the lateness relative to the band).
    if (this.bandT && !slide) this.bandT.struck(n.on, this.evTs !== null ? this.chip.heard() - (this.wall() - this.evTs) / 1000 : this.chip.heard(), v.ok);
    // D334 (B+): how the note was sounded: a landing while the other thumb holds is a hammer-on.
    const gesture = !MECH.prepare || slide ? undefined : (this.gesture ?? (lw.holding ? "hammer-on" : undefined));
    const tapNote = (ok: boolean, perfect: boolean, offMs: number) =>
      this.tap?.({ kind: "note", tick: n.at ?? this.now, track: h.k, i, midi: n.midi, side: h.side, ok, why: v.why, wrongMidi: v.wrong, offMs, perfect, slide, lane: v.lane, ladder: slide ? undefined : this.ladderWhy, legato: slide && !lw.drag ? undefined : lw, ...(gesture ? { gesture } : {}) });
    if (!v.ok) {
      tapNote(false, false, (this.timeAt(n.at ?? this.now) - this.timeAt(n.on)) * 1000);
      for (const j of chord) Object.assign(notes[j], { state: "miss", wrong: true });
      this.slip();
      this.grade = { text: "✕", at, side: h.side, why: v.why ?? "gesture" };
      return;
    }
    // D293: the others follow the player's loudness only where it is heard.
    if (this.touchDynamics) this.feel += (d - this.feel) * 0.25;
    // As heard (D191: the final ritard included; the steady tempo made PERFECT up to 22% wider there).
    const offMs = (this.timeAt(n.at ?? n.on) - this.timeAt(n.on)) * 1000;
    // D299: how early or late each struck note was, as heard (BLUETOOTH MODE's delay retuned after the run: headphones.ts driftOf).
    if (this.bt && !slide) this.btOffsets.push(offMs);
    // D325b: expressive time: a late strike where a musician delays on purpose is still PERFECT (intention.ts).
    let grace: Grace | null = null;
    // D329: RELATIVE, PERFECT scaled by the note's own time between notes.
    const perfMs = this.relAt(MECH.perfectMs, h.k, i);
    if (Math.abs(offMs) > perfMs && offMs > 0 && !slide) {
      const g = this.graceFor(h.k, i);
      if (g.why && offMs <= g.ms) grace = g.why;
    }
    // An agogic delay before: this strike back on the pulse keeps it PERFECT, else it was GOOD after all.
    const due = this.agogicDue;
    if (due && due.k === h.k && !slide) {
      this.agogicDue = null;
      if (Math.abs(offMs) > perfMs && grace !== "breath" && grace !== "broaden") {
        this.perfects--;
        this.goods++;
        this.graces.agogic--;
        this.graces.revoked++;
        this.score -= due.refund;
        this.earned.notes -= due.refund;
      }
    }
    const perfect = Math.abs(offMs) <= perfMs || grace !== null;
    if (grace) this.graces[grace]++;
    this.combo++;
    this.hits++;
    this.streak++;
    this.sinceSlip++;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    // D198: the crowd warms; a long run called out, every fifty.
    this.crowd = Math.min(1, this.crowd + (perfect ? 0.025 : 0.015));
    this.flames.push({ i, at, k: h.k, lane: v.at, grade: v.lane });
    if (this.flames.length > 24) this.flames.splice(0, 12);
    if (this.streak % 50 === 0) this.banner = { text: `${this.streak} NOTE STREAK!`, at };
    if (this.streak % STEP_NOTES === 0 && this.mult < 4) this.mult++;
    if (this.streak === FUOCO_NOTES) this.banner = { text: "CON FUOCO!", at };
    h.pts = (perfect ? 2 : 1) * this.mult * (this.pleno ? 2 : 1);
    // D239: the planned lane scores in full, with a small bright chime over Bach's note; the right
    // direction in another lane half (the streak and the multiplier kept).
    if (v.lane === "relative") (h.pts *= RELATIVE_SHARE), this.laneTally.relative++;
    if (grace === "agogic") this.agogicDue = { k: h.k, refund: h.pts / 2 };
    if (v.lane === "exact") {
      this.laneTally.exact++;
      if (!this.bt) this.chip.chime?.(pitches[0], this.chip.ctx.currentTime, levelOf(d));
    }
    h.open = true;
    // D218: a note joined in the score, struck legato: counted (the lessons, the LEGATO CHAIN feat, the
    // slur drawn), along an unbroken chain. D325: it no longer scores more (intention.ts, below).
    const step = Math.max(...chord.map((j) => notes[j].step));
    let artAdd = 0;
    // D272: the reading: what it asks of this subject note (its place in the subject), and of the join into it.
    const rd = v.ok && !slide ? this.o.reading : null;
    const place = rd ? this.readingIndex().get(`${h.k}:${n.on}`) : undefined;
    const ask = rd && place !== undefined ? rd.notes[place] : undefined;
    const askJoin = rd && place !== undefined && place > 0 ? rd.notes[place - 1]?.join : null;
    // D325b: a breath (after a written rest, or after a cadence's arrival): the lift before it is never
    // judged (never NOT JOINED); joined there all the same, the legato is counted.
    const breath = this.breathAt(i, h.k);
    let legatoNow = false;
    if (this.joinedAt(i, h.k) && askJoin !== false && (!breath || (!slide && over && pv >= 0 && notes[pv].state === "hit"))) {
      this.art.legatoOf++;
      const p = this.before(i, h.k);
      lw.judged = true;
      lw.ok = !slide && over && p >= 0 && notes[p].state === "hit";
      lw.prevRight = p >= 0 && notes[p].state === "hit";
      // D321, "connect": a drag counts as joined (the legato credited, the chain kept as it is) and earns nothing more.
      const connected = slide && MECH.dragMeaning === "connect" && p >= 0 && notes[p].state === "hit";
      if (connected) {
        lw.ok = true;
        lw.drag = true;
        this.art.legato++;
      } else if (!slide && over && p >= 0 && notes[p].state === "hit") {
        this.chain++;
        this.art.legato++;
        this.art.chain = Math.max(this.art.chain, this.chain);
        legatoNow = true;
        this.ties.push({ k: h.k, a: p, b: i, at });
        if (this.ties.length > 12) this.ties.splice(0, 6);
      } else this.chain = 0;
    }
    // D325: ARTICULATION by intention: the join into this note as the reading marks it, else consistent
    // with the player's own touch on notes of that value; a bonus the same for every touch, capped.
    if (this.joinedAt(i, h.k) && !breath && !slide && pv >= 0 && notes[pv].state === "hit" && !notes[i - 1]?.ride) {
      let ok: boolean | null = null;
      let word = "";
      if (askJoin === true) (ok = over), (word = "LEGATO");
      else if (askJoin === false) (ok = !over), (word = "DETACHED");
      else if (hold) {
        const raw = holdOf(hold.sounded, hold.toNext, hold.gap);
        const eff = holdOf(hold.sounded, hold.toNext, hold.gap, true);
        ok = this.sense.judge(valueClass(notes[pv].dur, this.beat), eff, raw);
        word = touchStyle(eff);
      }
      if (ok !== null) {
        this.art.touchOf = (this.art.touchOf ?? 0) + 1;
        if (ok) {
          this.art.touchOk = (this.art.touchOk ?? 0) + 1;
          this.artChain++;
          artAdd = artRoom(artBonus(h.pts, this.artChain), this.score + h.pts, this.earned.articulation);
          h.pts += artAdd;
          const text = this.artChain > 1 ? `${word} ×${this.artChain}` : word;
          this.flash = { text, at, good: true, kind: "legato" };
          this.pops.push({ tick: n.on, step, text, at, gold: false, from: { tick: notes[pv].on, step: notes[pv].step }, ink: LEGATO_INK });
        } else this.artChain = 0;
      }
    } else if (legatoNow) {
      const text = this.chain > 1 ? `LEGATO ×${this.chain}` : "LEGATO";
      this.flash = { text, at, good: true, kind: "legato" };
    }
    // D268: the score sheet: the note's own points and its articulation's apart; its timing counted.
    this.earn("notes", h.pts - artAdd);
    this.earn("articulation", artAdd);
    if (perfect) this.perfects++;
    else this.goods++;
    // D332: a note right only by the run rule: its points kept aside, should the run's trend fail.
    if (!slide && this.runOnly) this.runAccepted.set(`${h.k}:${i}`, { pts: h.pts - artAdd, art: artAdd, perfect, side: h.side, legatoOf: lw.judged, legato: legatoNow, held: 0, heldN: 0, heldOfN: 0, clean: 0, cleanOf: 0 });
    this.runOnly = false;
    if (!slide) this.thumbNote(h.side, n.on, d);
    if (rd) {
      if (place !== undefined) {
        // Joined or detached into it as the reading says; its accent; the subject's level.
        if (askJoin === true) this.styled(legatoNow, at);
        if (askJoin === false) this.styled(!over, at, "DETACHED ✓");
        if (ask?.accent) this.styled(d >= 0.6, at, "ACCENT ✓");
        if (rd.level) this.styled(Math.abs(d - LEVEL_D[rd.level]) <= 0.2, at);
        if (ask?.short) h.wantShort = true;
      } else {
        // The rest at the reading's dynamics, where it names them.
        const lv = planLevel(rd, barAt(this.f, n.on));
        if (lv) this.styled(Math.abs(d - LEVEL_D[lv]) <= 0.22, at);
      }
    }
    // D186: the points rise from the note.
    this.pops.push({ tick: n.on, step, text: `+${ptsText(h.pts)}`, at, gold: perfect });
    if (this.pops.length > 40) this.pops.splice(0, 20);
    this.grade = perfect ? { text: "PERFECT", at, side: h.side } : { text: "GOOD", lean: offMs < 0 ? -1 : 1, at, side: h.side };
    tapNote(true, perfect, offMs);
    this.ride(h, i, offMs / 1000);
  }

  /**
   * D191: the notes riding after note i (too quick to strike) are played for the player: each at its
   * time, moved by as much as note i was early or late, the note struck giving way to the first.
   */
  private ride(h: Held, i: number, offS: number) {
    const notes = this.tracks[h.k].notes;
    let j = i + 1;
    while (j < notes.length && notes[j].on === notes[i].on) j++;
    const ch = this.chip;
    let first = true;
    // D299: in BLUETOOTH MODE on the schedule with their note (arm): only shown as they sound.
    const pre = this.bt;
    for (; j < notes.length && notes[j].ride; j++) {
      const n = notes[j];
      if (n.state !== "pending") continue;
      if (pre) {
        this.riders.push({ k: h.k, j, at: this.timeAt(n.on) });
        continue;
      }
      const at = Math.max(ch.ctx.currentTime, this.timeAt(n.on) + offS);
      const len = Math.max(0.03, this.timeAt(n.on + n.dur) - this.timeAt(n.on));
      if (first) for (const sd of h.sounds) sd.stop(at);
      first = false;
      const nv = n.voice ?? this.tracks[h.k].voice;
      const sv = this.subj.shape(nv, n.on, voicing(nv, this.f.voices.length, true));
      for (const [pon, pdur, pm] of this.rideParts(nv, notes, j)) {
        const pat = Math.max(ch.ctx.currentTime, this.timeAt(pon) + offS);
        const sd = ch.note(pm, pat, Math.max(0.03, this.timeAt(pon + pdur) - this.timeAt(pon)), sv.v, { ...sv.play, lead: true, envelope: this.proto.id === "piano" ? "piano" : "synth" });
        if (sd) this.band.push({ sd, until: pat + len + 0.6 });
      }
      if (!this.o.her) for (const x of this.subj.layers(ch, sv.sn, n.midi, at, len, sv.v, sv.play.level ?? 1)) this.band.push({ sd: x, until: at + len + 0.8 });
      this.riders.push({ k: h.k, j, at });
    }
  }

  /** D284: a riding note as it sounds, its ornament realised ([onset, length, MIDI] in ticks). */
  private rideParts(voice: number, notes: { on: number; dur: number; midi: number }[], j: number): [number, number, number][] {
    const n = notes[j];
    const orn = this.ornaments.get(`${voice}:${n.on}`);
    return orn ? realiseNote(this.f, orn, n.on, n.dur, n.midi, j > 0 ? notes[j - 1].midi : undefined, this.bpm) : [[n.on, n.dur, n.midi]];
  }

  /** D191: the riding notes played for the player, shown as they sound. */
  private riders: { k: number; j: number; at: number }[] = [];
  private sounding() {
    if (!this.riders.length) return;
    const t = this.chip.ctx.currentTime;
    this.riders = this.riders.filter((r) => {
      if (r.at > t) return true;
      const n = this.tracks[r.k].notes[r.j];
      if (n.state === "pending") Object.assign(n, { state: "hit", at: n.on });
      return false;
    });
  }



  /**
   * A slip. D249 (small mistakes don't cost the whole run): the streak and the combo lose a quarter (at
   * least SLIP_LOSS_MIN), and the multiplier falls a step only on a slip within SLIP_NEAR notes (right
   * ones) of the slip before. CON FUOCO lasts while the streak holds FUOCO_NOTES. The feats that mean
   * "no mistakes" count the slips themselves (`slips`, the wrong and missed notes), never the streak.
   */
  private slip() {
    this.slips++;
    this.chain = 0;
    // D259: a prelude's crowd more patient (it is there to be enjoyed: a slip costs two thirds as much).
    this.crowd = Math.max(0, this.crowd - (this.f.kind === "prelude" ? SLIP_CROWD_PRELUDE : SLIP_CROWD));
    const fuoco = this.streak >= FUOCO_NOTES;
    this.streak = slipLoss(this.streak);
    this.combo = slipLoss(this.combo);
    if (fuoco && this.streak < FUOCO_NOTES) this.banner = null;
    if (this.sinceSlip < SLIP_NEAR) this.mult = Math.max(1, this.mult - 1);
    this.sinceSlip = 0;
  }
  /** D249: the right notes since the last slip (none yet: Infinity). */
  private sinceSlip = Infinity;

  /** The entries of the subject in the voices played: captured once every note of one is played right; lost at a slip. */
  private judgeEntries() {
    for (const e of this.entries) {
      if (e.state !== "open") continue;
      // D191: the riding notes are not the player's to capture.
      // D217: SUBJECT's entry over both lines (its older part may go on in the lower row).
      const notes = (this.line ? this.tracks.flatMap((t) => t.notes.filter((n) => n.voice === e.voice)) : this.tracks[e.k].notes).filter((n) => !n.ride && e.ons.includes(n.on));
      if (notes.some((n) => n.state === "miss")) {
        e.state = "lost";
        if (this.isBoss(e)) this.banner = { text: "THE BOSS GOT AWAY", at: performance.now() };
        continue;
      }
      if (notes.length && notes.every((n) => n.state === "hit")) {
        e.state = "captured";
        this.earn("subjects", 20 * this.mult);
        // D186: it bursts; the voice's last entry is its BOSS.
        const boss = this.isBoss(e);
        this.bursts.push({ at: performance.now(), points: notes.map((n) => ({ tick: n.on, step: n.step })), boss });
        if (this.bursts.length > 8) this.bursts.shift();
        // ORGANO PLENO until the next entry, in any voice.
        // (the first entry still to come: the next has often begun before this one ends)
        const next = this.f.entries.map((x) => x.on).filter((on) => on > this.now).sort((a, b) => a - b)[0];
        this.plenoUntil = next ?? this.f.length;
        this.banner = { text: boss ? "BOSS DEFEATED!" : "ORGANO PLENO!", at: performance.now() };
      }
    }
  }

  /**
   * D217, SUBJECT: each stretto announced a beat before it begins (STRETTO!, the painter's two-row
   * cue), and cleared when every struck note of both lines within it is right: a bonus twice an
   * entry's (STRETTO ×2); its entries are captured as usual.
   */
  readonly strettoState: ("coming" | "open" | "cleared" | "lost")[] = [];
  private judgeStrettos() {
    const ss = this.line?.strettos ?? [];
    ss.forEach((s, j) => {
      const st = this.strettoState[j] ?? "coming";
      if (st === "coming" && this.now >= s.on - this.beat && this.now < s.end) {
        this.strettoState[j] = "open";
        this.banner = { text: "STRETTO!", at: performance.now() };
      }
      if (this.strettoState[j] !== "open") return;
      const notes = this.tracks.flatMap((t) => t.notes.filter((n) => !n.ride && n.on >= s.on && n.on < s.end));
      if (notes.some((n) => n.state === "miss")) this.strettoState[j] = "lost";
      else if (notes.length && notes.every((n) => n.state === "hit")) {
        this.strettoState[j] = "cleared";
        this.earn("subjects", 40 * this.mult);
        this.banner = { text: "STRETTO ×2!", at: performance.now() };
      }
    });
  }

  /**
   * D194: a cadence reached while the player's run holds (no slip since the last one) is a small
   * bonus, named: the music's own punctuation, rewarded.
   */
  private cadenceAt = 0;
  private judgeCadences() {
    const cads = this.f.cadences ?? [];
    while (this.cadenceAt < cads.length && cads[this.cadenceAt].on <= this.now) {
      const c = cads[this.cadenceAt++];
      // D249: the run held, four right notes at least since the last slip (the streak no longer falls to 0).
      if (c.on < this.entry || c.on > this.end || this.streak < 4 || this.sinceSlip < 4) continue;
      this.earn("cadences", 10 * this.mult);
      this.banner = { text: cadenceName(c), at: performance.now() };
    }
  }

  /**
   * D198, after Guitar Hero: the crowd (0 to 1, from a half: a right note warms it, a slip cools it;
   * empty, the run fails); the hits' flames; the sustain (a long note held after it is struck scores
   * as it sounds, a point a beat at the multiplier); the run's stars.
   */
  crowd = 0.6;
  failedAt: number | null = null;
  /** D239: lane: the lane struck (HIGHWAY), grade: its note's lane grade. */
  readonly flames: { i: number; at: number; k?: number; lane?: number; grade?: LaneGrade }[] = [];
  /** D239: the notes right in their planned lane, and right only by their direction. */
  readonly laneTally = { exact: 0, relative: 0 };
  private sustainAt = 0;
  private sustainAcc = 0;
  private sustain() {
    const dt = this.now - this.sustainAt;
    this.sustainAt = this.now;
    if (dt <= 0 || dt > this.beat) return;
    for (const h of this.held.values()) {
      if (h.note < 0 || !h.sounds.length) continue;
      const n = this.tracks[h.k].notes[h.note];
      if (n.state !== "hit" || n.dur < this.beat || this.now >= n.on + n.dur || this.now < n.on) continue;
      n.held = true;
      this.sustainAcc += (dt / this.beat) * this.mult * (this.pleno ? 2 : 1);
    }
    const whole = Math.floor(this.sustainAcc);
    if (whole > 0) this.earn("held", whole), (this.sustainAcc -= whole);
  }
  /**
   * D218, articulation: legato where the score joins the notes (a bonus growing along an unbroken
   * chain), a note held its written length (HELD) or let go far too soon (SHORT), a rest respected
   * (CLEAN) or held through (REST!). Counted for the result screen.
   */
  readonly art: ArtStats = { legato: 0, legatoOf: 0, chain: 0, held: 0, heldOf: 0, clean: 0, cleanOf: 0 };
  /** The legato chain now (legato strikes in a row). */
  chain = 0;
  /** D325: the player's touch, inferred; the run of joins consistent with it (or with the reading's marks). */
  readonly sense = new TouchSense();
  artChain = 0;
  /** D325b: the strikes PERFECT by expressive time, by grace; agogic delays taken back (the next note not back on the pulse). */
  readonly graces = { agogic: 0, breath: 0, broaden: 0, revoked: 0 };
  /** D325b: an agogic delay waiting for the next strike in its voice to come back on the pulse (its points' PERFECT half, to take back). */
  private agogicDue: { k: number; refund: number } | null = null;
  /** D325b: how late note i of track k may be struck and be PERFECT, and why (intention.ts graceMs). */
  private graceFor(k: number, i: number): { ms: number; why: Grace | null } {
    const n = this.tracks[k].notes[i];
    const strong = strongBeat(this.f, n.on);
    return graceMs({
      beatMs: this.msOf(n.on, n.on + this.beat),
      strong,
      dissonant: !strong && dissonantAt(this.f, this.voiceOf(k, i), n.on, n.midi),
      breath: this.breathAt(i, k),
      toEndBars: (this.end - this.beat - n.on) / this.f.barTicks,
    });
  }
  /** D325b: the window options for track k, an agogic note's late side leaning (lanes.ts LaneOptions.lean); on LADDER's split windows only. */
  private leanMemo: (LaneOptions | undefined)[] = [];
  private leanOpt(k: number): LaneOptions {
    if (!this.opt.split || !MECH.agogicShare) return this.opt;
    const memo = this.leanMemo[k];
    if (memo && memo.early === this.opt.early && memo.late === this.opt.late) return memo;
    const notes = this.tracks[k]?.notes ?? [];
    const lean = new Map<number, number>();
    notes.forEach((n, i) => {
      if (n.ride || lean.has(n.on)) return;
      if (strongBeat(this.f, n.on) || dissonantAt(this.f, this.voiceOf(k, i), n.on, n.midi)) lean.set(n.on, MECH.agogicShare * this.beat);
    });
    return (this.leanMemo[k] = { ...this.opt, lean: (on: number) => lean.get(on) ?? 0 });
  }
  /** D325b: note i comes after a breath: a written rest before it (the run's first note too), or a cadence's arrival in the note before. */
  breathAt(i: number, k = 0): boolean {
    const notes = this.tracks[k].notes;
    if (this.restBefore(i, k) > 0) return true;
    const p = this.before(i, k);
    return p >= 0 && afterCadence(this.f, notes[p].on, notes[i].on);
  }
  /** The last articulation called (a short word under the verdict). */
  flash: ArtFlash | null = null;
  /** The legato strikes, for the slur drawn between the two notes (note a to note b of track k). */
  readonly ties: { k: number; a: number; b: number; at: number }[] = [];
  /** The last note let go (its track, index and tick): a strike just after it is still legato. */
  private lastOff: { k: number; i: number; tick: number } | null = null;
  /** Milliseconds between two ticks, as heard. */
  /** D261: a note drawn with a tail and held (a prelude's: PRELUDE_TAP_MS or more; elsewhere a beat or more). */
  tailed(n: { on: number; dur: number }): boolean {
    return this.f.kind === "prelude" ? this.msOf(n.on, n.on + n.dur) >= PRELUDE_TAP_MS : n.dur >= this.beat;
  }
  private msOf(a: number, b: number) {
    return (this.timeAt(b) - this.timeAt(a)) * 1000;
  }
  /** D329: the passage's usual time between struck notes (ms, the median; track 0), RELATIVE's measure for the windows. */
  private ioiMedian = 360;
  /** D329: the thumb that struck each note (the double contact the same thumb's only: MECH.doubleSameThumb). */
  private struckBy = new WeakMap<LaneNote, Side>();
  /** D329: the time (ms) from note i to its nearer struck neighbour in its track, RELATIVE's measure for a note's own windows. */
  private ioiOf(k: number, i: number): number {
    const notes = this.tracks[k]?.notes;
    const n = notes?.[i];
    if (!notes || !n) return this.ioiMedian;
    let prev = -Infinity;
    let next = Infinity;
    for (const x of notes) {
      if (x.ride) continue;
      if (x.on < n.on && x.on > prev) prev = x.on;
      if (x.on > n.on && x.on < next) next = x.on;
    }
    const a = prev > -Infinity ? this.msOf(prev, n.on) : Infinity;
    const b = next < Infinity ? this.msOf(n.on, next) : Infinity;
    const g = Math.min(a, b);
    return Number.isFinite(g) ? g : this.ioiMedian;
  }
  /** D329: a note's window (ms as set): ABSOLUTE as set, RELATIVE scaled by its own time between notes. */
  private relAt(ms: number, k: number, i: number): number {
    return MECH.timing === "relative" ? relMs(ms, this.ioiOf(k, i)) : ms;
  }
  /** D218: note i joined in the score to the note before it (any note, the riders too; no rest between). */
  joinedAt(i: number, k = 0): boolean {
    const notes = this.tracks[k].notes;
    const n = notes[i];
    if (!n || n.ride || (i > 0 && notes[i - 1].on === n.on) || this.before(i, k) < 0) return false;
    // The note just before by onset (a chord by its longest).
    let end = -Infinity;
    let j = i - 1;
    while (j >= 0 && notes[j].on === n.on) j--;
    if (j < 0) return false;
    for (let q = j; q >= 0 && notes[q].on === notes[j].on; q--) end = Math.max(end, notes[q].on + notes[q].dur);
    return n.on - end < this.beat / 4;
  }
  /** The note after note i: whether it rides (D191: then the end of note i is not the player's), and the rest before it. */
  private after(i: number, k: number): { riders: boolean; rest: number } {
    const notes = this.tracks[k].notes;
    let j = i + 1;
    while (j < notes.length && notes[j].on === notes[i].on) j++;
    if (j >= notes.length) return { riders: false, rest: 0 };
    return { riders: !!notes[j].ride, rest: restAfter(notes, i) };
  }
  /** D218: a held note gone on past the rest written after it (its tolerance included). */
  private overstays(h: Held): boolean {
    const n = this.tracks[h.k].notes[h.note];
    if (!n) return false;
    const { riders, rest } = this.after(h.note, h.k);
    if (riders || rest < this.beat / 4) return false;
    const len = this.msOf(n.on, n.on + n.dur);
    const restMs = this.msOf(n.on + n.dur, n.on + n.dur + rest);
    return this.msOf(n.on, this.now) > releaseVerdict(len, len, restMs).deadline;
  }
  /** D218: the end of a note struck right (let go, given way to the next, or held into a rest), judged once. */
  private judgeEnd(h: Held, off: number) {
    h.open = false;
    const notes = this.tracks[h.k].notes;
    const i = h.note;
    const n = notes[i];
    if (!n || n.state !== "hit") return;
    release(notes, i, off);
    this.lastOff = { k: h.k, i, tick: off };
    const { riders, rest } = this.after(i, h.k);
    if (riders) return;
    const len = this.msOf(n.on, n.on + n.dur);
    // D261: a prelude's tap (no tail) is not judged for its release.
    if (this.f.kind === "prelude" && len < PRELUDE_TAP_MS) return;
    const restMs = rest >= this.beat / 4 ? this.msOf(n.on + n.dur, n.on + n.dur + rest) : 0;
    // D325: HELD's bounds by the player's touch on notes of this value.
    const r = releaseVerdict(len, this.msOf(n.on, off), restMs, heldBounds(this.sense.touchFor(valueClass(n.dur, this.beat)) ?? this.sense.touch));
    const at = performance.now();
    // D272: a note the reading wants short: let go early it is right (no SHORT), held it is not.
    if (h.wantShort) {
      h.wantShort = false;
      const short = this.msOf(n.on, off) < len * 0.6;
      this.styled(short, at, "STACCATO ✓");
      if (short) return;
    }
    const step = Math.max(...chordOf(notes, i).map((j) => notes[j].step));
    if (r.rest === "over") {
      // Held through the rest: the crowd cools, the chain is broken (no slip: the note was right).
      this.art.cleanOf++;
      this.chain = 0;
      this.crowd = Math.max(0, this.crowd - 0.03);
      this.flash = { text: "REST!", at, good: false, kind: "rest" };
      return;
    }
    let pts = 0;
    let word: ArtFlash | null = null;
    // D332: a note right by the run rule alone: its end's credit kept aside too, should the run fail.
    const ra = this.runAccepted.get(`${h.k}:${i}`);
    const art0 = { held: this.art.held, heldOf: this.art.heldOf, clean: this.art.clean, cleanOf: this.art.cleanOf };
    if (r.hold !== "none") this.art.heldOf++;
    if (r.hold === "short") {
      this.crowd = Math.max(0, this.crowd - 0.01);
      word = { text: "SHORT", at, good: false, kind: "short" };
    } else if (r.hold === "held") {
      this.art.held++;
      pts += holdBonus(n.dur / this.beat) * this.mult;
      word = { text: "HELD", at, good: true, kind: "held" };
    }
    if (r.rest !== "none") {
      this.art.cleanOf++;
      this.art.clean++;
      if (r.rest === "clean" && r.hold !== "short") {
        pts += this.mult;
        word = { text: word ? "HELD · CLEAN" : "CLEAN", at, good: true, kind: "clean" };
      }
    }
    if (ra) {
      ra.held += pts;
      ra.heldN += this.art.held - art0.held;
      ra.heldOfN += this.art.heldOf - art0.heldOf;
      ra.clean += this.art.clean - art0.clean;
      ra.cleanOf += this.art.cleanOf - art0.cleanOf;
    }
    if (pts) {
      this.earn("held", pts);
      this.pops.push({ tick: n.on + n.dur, step, text: `+${pts}`, at, gold: false, ink: word?.kind === "clean" ? CLEAN_INK : HELD_INK });
    }
    if (word) this.flash = word;
    if (this.tap && word) this.tap({ kind: "release", tick: off, track: h.k, i, side: h.side, word: word.text, heldMs: this.msOf(n.on, off), lenMs: len });
  }
  /** The tempo, quarter notes a minute. */
  get bpm(): number {
    return (this.tps * 60) / this.f.tpq;
  }
  /** One to five stars: the score against two points a note (all PERFECT at ×1). */
  starsOf(score: number, of: number): number {
    const ratio = score / Math.max(1, 2 * of);
    return ratio >= 4.5 ? 5 : ratio >= 3 ? 4 : ratio >= 2 ? 3 : ratio >= 1 ? 2 : 1;
  }
  /**
   * HIGHWAY's lanes (D198; D208): the lane each note comes down, a fingering of the line planned over
   * the whole passage (protos.ts planLanes): on a computer the nine home-row keys, no finger twice
   * running; on a phone five lanes.
   */
  get lanes(): number[] {
    return this.lanesOf(0);
  }
  /** D217: a track's lanes (SUBJECT's second line has its own). */
  lanesOf(k: number): number[] {
    if (this.lanesMemo[k]) return this.lanesMemo[k];
    // D230, SCALE KEYS: the lane is the key's place (a raised or lowered note between two home lanes).
    const sk = k === 0 ? this.scale : null;
    if (sk) return (this.lanesMemo[k] = sk.map((x) => x.pos));
    const { notes, moves: mv } = this.tracks[k];
    const heads = notes.map((n, i) => !n.ride && !(i > 0 && notes[i - 1].on === n.on));
    // D252, BOTH HANDS: each hand planned in its own lanes (laneRegion), then placed there.
    if (this.hands) {
      const r = this.laneRegion(k);
      const freeH = notes.map((_, i) => this.isFree(i, k) && !this.spaceGem(i, k));
      const softH = notes.map((_, i) => this.soft(i, k));
      const local = planLanes(mv, heads, freeH, r.count, this.proto.id === "keys", softH);
      const plainH = notes.map((_, i) => heads[i] && !this.isFree(i, k) && !this.spaceGem(i, k));
      this.echoMemo[k] = echoHalves(this.f, notes, mv, heads, plainH, local, r.count);
      return (this.lanesMemo[k] = local.map((l) => l + r.from));
    }
    // D229: on a computer a repeat goes on in the lane of the note before (a SPACE gem), even after a rest (where any key still answers it).
    const free = notes.map((_, i) => this.isFree(i, k) && !this.spaceGem(i, k));
    const soft = notes.map((_, i) => this.soft(i, k));
    const lanes = planLanes(mv, heads, free, this.laneCount, this.proto.id === "keys", soft);
    // D244: a figure stated twice in a prelude's bar keeps its lanes the second time.
    const plain = notes.map((_, i) => heads[i] && !this.isFree(i, k) && !this.spaceGem(i, k));
    this.echoMemo[k] = echoHalves(this.f, notes, mv, heads, plain, lanes, this.laneCount);
    // D250: while the pedal is held in the first lane, the figure is laid in the others.
    const pl = k === 0 ? this.pedalList : [];
    if (pl.length) {
      const sub = planLanes(mv, heads, free, this.laneCount - 1, this.proto.id === "keys", soft);
      const echoSub = echoHalves(this.f, notes, mv, heads, plain, sub, this.laneCount - 1);
      const inSpan = (i: number) => pl.some((bp) => notes[i].on >= bp.on && notes[i].on < bp.end);
      notes.forEach((_, i) => {
        if (inSpan(i)) lanes[i] = sub[i] + 1;
      });
      this.echoMemo[k] = new Set([...this.echoMemo[k]].filter((i) => !inSpan(i)).concat([...echoSub].filter(inSpan)));
    }
    // D258: a line handed to a lower voice (Prelude 4's bass going down to its lowest note) laid by pitch
    // across the road, its highest note in the top lane and its lowest in the bottom: the descent travels
    // the road's width (planned step by step it piled up in the bottom lane).
    const tk = k === 0 && this.take && !this.scale ? this.take : null;
    if (tk) {
      const span = notes.map((n, i) => (n.on >= tk.on && n.on < tk.end ? i : -1)).filter((i) => i >= 0);
      const ms = span.map((i) => notes[i].midi);
      const lo = Math.min(...ms);
      const hi = Math.max(...ms);
      for (const i of span) lanes[i] = hi > lo ? Math.round(((notes[i].midi - lo) / (hi - lo)) * (this.laneCount - 1)) : 2;
      // A chord keeps its head's lane.
      for (const i of span) if (i > 0 && notes[i - 1].on === notes[i].on) lanes[i] = lanes[i - 1];
    }
    // D262, THE LINE: its first notes in the lanes of their pitch (the path drawn through its notes the same way).
    const tr = this.tracks[k].traces;
    if (tr) notes.forEach((n, i) => {
      if (tr.has(n.on)) lanes[i] = this.traceLane(n.midi, k);
    });
    this.lanesMemo[k] = lanes;
    return lanes;
  }
  /** D262: a traced line's note's lane: its pitch across the hand's lanes (the line's lowest the first, its highest the last). */
  traceLane(midi: number, k = 0): number {
    const tr = this.tracks[k]?.traces;
    if (!tr) return 0;
    if (!this.traceSpan[k]) {
      const ms = [...tr.entries()].flatMap(([on, q]) => [this.tracks[k].notes.find((n) => n.on === on)?.midi ?? q[0]?.midi ?? 60, ...q.map((x) => x.midi)]);
      this.traceSpan[k] = { lo: Math.min(...ms), hi: Math.max(...ms) };
    }
    const { lo, hi } = this.traceSpan[k];
    const r = this.hands ? this.laneRegion(k) : { from: 0, count: this.laneCount };
    return r.from + (hi > lo ? Math.round(((midi - lo) / (hi - lo)) * (r.count - 1)) : Math.floor(r.count / 2));
  }
  private traceSpan: { lo: number; hi: number }[] = [];
  private lanesMemo: number[][] = [];
  private echoMemo: Set<number>[] = [];
  /** D250: the prelude's arc (arc.ts), if it has one. */
  readonly arc: Arc | undefined;
  /** D252: both hands played (the right hand track 0, the left track 1), each in its own lanes. */
  readonly hands: boolean = false;
  /** D252: a hand's lanes: the left hand the leftmost (two on a phone, four on the computer's keys), the right the rest. */
  laneRegion(k: number): { from: number; count: number } {
    const split = this.road ? 2 : 4;
    return k === 1 ? { from: 0, count: split } : { from: split, count: this.laneCount - split };
  }
  /** D252: the hand a lane belongs to (both hands), else the first track. */
  private laneTrack(lane: number): number {
    return this.hands && lane < this.laneRegion(0).from ? 1 : 0;
  }
  /**
   * D254: the hand a touch plays (both hands, a phone): its lane's hand, but a touch in either lane by
   * the line between the hands goes to the other hand where only that one has a note due (the right
   * thumb beside the held pedal, a thumb a little over the line: a stray ✕ before, the owner's "errors"
   * tapping "at the right place").
   */
  private touchTrack(lane: number, ts: number): number {
    const k = this.laneTrack(lane);
    const split = this.laneRegion(0).from;
    if (lane !== split - 1 && lane !== split) return k;
    return !this.dueAt(k, ts) && this.dueAt(1 - k, ts) ? 1 - k : k;
  }
  /** D254: a lane as a hand plays it (both hands: its own nearest lane). */
  private handLane(k: number, lane: number): number {
    if (!this.hands) return lane;
    const r = this.laneRegion(k);
    return Math.min(r.from + r.count - 1, Math.max(r.from, lane));
  }
  /** D254: a hand has a note to strike within the window about now. */
  private dueAt(k: number, ts: number): boolean {
    const tk = this.tickOf(ts);
    return !!this.tracks[k]?.notes.some((n) => n.state === "pending" && !n.ride && tk >= n.on - this.opt.early && tk <= n.on + this.opt.late);
  }
  /** D252: the row a note asks for (rows: the repeat of a figure within its bar on the lower row, 1), else 0. */
  rowOf(i: number, k = 0): 0 | 1 {
    // D262: the echo: the right hand's note again in the same bar, on the lower row (the second keyboard).
    if (this.arc?.echo) {
      const notes = this.tracks[k]?.notes;
      const n = notes?.[i];
      const p = notes?.[i - 1];
      if (k !== 0 || !this.road || !n || !p || n.ride) return 0;
      return p.midi === n.midi && barAt(this.f, p.on) === barAt(this.f, n.on) ? 1 : 0;
    }
    if (!this.arc?.rows || !this.road || !this.tracks[k]) return 0;
    const t = this.tracks[k];
    this.repeatMemo[k] ??= repeatHalves(this.f, t.notes, t.notes.map((n, j) => !n.ride && !(j > 0 && t.notes[j - 1].on === n.on)));
    return this.repeatMemo[k].has(i) ? 1 : 0;
  }
  private repeatMemo: Set<number>[] = [];
  /**
   * D250, THE PEDAL: the bass's long note held by the player in its own lane (the touch or key holding
   * it, from when, how long held so far, the share held at its end).
   */
  private pedalList: { on: number; end: number; midi: number; name: string; lane: number; id: number | null; from: number | null; held: number; announced: boolean; done: boolean; share: number; sounds: Sounding[] }[] = [];
  /** The pedal now or next (D252: the first not yet over), or null. */
  get bassPedal() {
    return this.pedalList.find((p) => !p.done) ?? null;
  }
  /** D252: every pedal (the painter's and the tests'). */
  get pedals() {
    return this.pedalList;
  }
  /** D250: the final chord's onset (both thumbs together: a bonus), and the touches on it. */
  private finalOn: number | undefined;
  private finalTouches: { id: number; ts: number }[] = [];
  /** D250: the final chord's onset while its bonus is still to win (the painter's cue). */
  get finalCue(): number | undefined {
    return this.finalDone ? undefined : this.finalOn;
  }
  private finalDone = false;
  /** D250: a touch (key) on the pedal's lane takes the pedal: true if it did. */
  private pedalTake(id: number, lane: number) {
    // D262, THE ARRIVAL: near the first pedal's end a left touch takes the pedal that follows (not the one ending).
    const cur = this.bassPedal;
    const nx = cur ? this.pedalList.find((q) => !q.done && q !== cur) : undefined;
    if (this.arc?.charge && cur && nx && nx.on === cur.end && nx.id === null && this.now >= cur.end - this.beat && lane >= 0 && (this.hands ? this.laneTrack(lane) === 1 : lane === nx.lane)) {
      this.startPedal(nx, id);
      this.arrive();
      return true;
    }
    const p = this.bassPedal;
    // D253: with both hands any of the left hand's lanes takes the pedal (its own lane is only shown).
    // D254: or the right hand's first lane, by the line, while no right-hand note is due.
    const onIt = this.hands ? lane >= 0 && lane <= this.laneRegion(0).from : lane === p?.lane;
    // D254: a second touch on the left hand's lanes while the pedal is held takes it over (the thumb moved
    // down to C): in the far lane, or by the line where the right hand has nothing due (else it is the right thumb's).
    if (p && this.hands && p.id !== null && lane >= 0 && this.laneTrack(lane) === 1 && (lane < this.laneRegion(0).from - 1 || !this.dueAt(0, performance.now()))) {
      p.id = id;
      return true;
    }
    if (!p || p.done || p.id !== null || !onIt || this.now < p.on - this.beat) return false;
    // Not while a note is due in that lane (the last before the pedal; D254: the right hand's, in any lane).
    const k = this.laneTrack(lane);
    const lanes = this.lanesOf(k);
    const due = this.tracks[k].notes.some((n, i) => n.state === "pending" && !n.ride && (k === 0 && this.hands ? true : lanes[i] === lane) && n.on <= this.now + this.opt.early && n.on >= this.now - this.opt.late);
    if (due) return false;
    this.startPedal(p, id);
    if (this.arc?.charge && p !== this.pedalList[0]) this.arrive();
    return true;
  }
  /** D262: the arrival: the charge released (a bonus by it), the light's bloom from here. */
  private arrive() {
    if (this.arrivedAt !== null) return;
    this.arrivedAt = this.now;
    const bonus = Math.round(40 * this.charge) * this.mult;
    this.earn("bonus", bonus);
    this.pops.push({ tick: this.now, step: 0, text: `HOME${bonus ? ` +${bonus}` : ""}`, at: performance.now(), gold: true });
  }
  /** D252: the pedal taken by a touch (key): the big pedal begins to sound, a 16′ and 8′ bourdon under the bass, to its end. */
  private startPedal(p: NonNullable<ProtoGame["bassPedal"]>, id: number) {
    p.id = id;
    p.from = Math.max(this.now, p.on);
    const at = Math.max(this.chip.ctx.currentTime, this.timeAt(p.from));
    const until = this.timeAt(p.end);
    const v = { timbre: "triangle" as const, pan: 0, gain: 1, patch: PATCHES.pedalBourdon };
    if (until > at) p.sounds = [this.touchNote(p.midi, at, until - at, v, { level: 1.2, lead: true }), this.touchNote(p.midi - 12, at, until - at, v, { level: 0.9, lead: true })];
  }
  /** D250: the pedal let go: true if this touch (key) held it. */
  private pedalLeave(id: number, ts: number) {
    const p = this.pedalList.find((x) => x.id === id);
    if (!p) return false;
    for (const sd of p.sounds) sd.stop();
    p.sounds = [];
    if (p.from !== null && !p.done) p.held += Math.max(0, Math.min(this.tickOf(ts), p.end) - p.from);
    p.id = null;
    p.from = null;
    return true;
  }
  /**
   * D252: each new thing announced as it first comes (one new mechanic at a time, taught where it
   * begins): the lower row, a beat before its first note; the left hand, a bar before it joins.
   */
  private arcCues() {
    if (!this.arc || this.o.wait) return;
    const ahead = (on: number, by: number) => on - this.now <= by && on >= this.now;
    if (!this.cued.has("row") && this.arc.rows && this.road) {
      const i = this.notes.findIndex((n, j) => !n.ride && this.rowOf(j, 0) === 1);
      if (i >= 0 && ahead(this.notes[i].on, 2 * this.beat)) {
        this.cued.add("row");
        this.banner = { text: "THE FIGURE AGAIN: THE LOWER ROW", at: performance.now() };
      }
    }
    if (!this.cued.has("hands") && this.hands) {
      const first = this.tracks[1].notes.find((n) => !n.ride);
      if (first && ahead(first.on, this.f.barTicks)) {
        this.cued.add("hands");
        // D261: where the left thumb holds the bass, the banner says so (a tail: hold until it ends).
        const holds = this.arc.strike?.lh === "bass";
        this.banner = { text: holds ? (this.road ? "LEFT THUMB: HOLD EACH BASS AS LONG AS ITS TAIL" : "LEFT KEYS: HOLD EACH BASS AS LONG AS ITS TAIL") : this.road ? "LEFT THUMB: THE LEFT HAND" : "LEFT KEYS: THE LEFT HAND", at: performance.now() };
      }
    }
  }
  private cued = new Set<string>();
  /** D258: the sweep (two beats before the first spread chord) and the line handed over (a bar ahead). */
  private arcCues2() {
    if (!this.arc || this.o.wait) return;
    const ahead = (on: number, by: number) => on - this.now <= by && on >= this.now;
    // D261: the right thumb's taps named as they begin.
    if (this.arc.strike?.rh === "tops" && !this.cued.has("tops")) {
      const first = this.tracks[0]?.notes.find((n) => !n.ride);
      if (first && ahead(first.on, 2 * this.beat)) {
        this.cued.add("tops");
        this.banner = { text: this.road ? (this.arc.echo ? "RIGHT THUMB: THE TOP NOTE · ITS ECHO ON THE LOWER ROW" : "RIGHT THUMB: TAP THE TOP NOTE OF EACH FIGURE") : "TAP THE TOP NOTE OF EACH FIGURE", at: performance.now() };
      }
    }
    const sw = this.tracks[0]?.sweeps;
    if (sw?.size && !this.cued.has("sweep")) {
      const first = Math.min(...sw);
      if (ahead(first, 2 * this.beat)) {
        this.cued.add("sweep");
        this.banner = { text: this.road ? "A CHORD: SLIDE YOUR THUMB ACROSS IT" : "A CHORD: IT SPREADS UPWARD", at: performance.now() };
      }
    }
    const trc = this.arc.trace;
    if (trc && !this.cued.has("trace") && ahead(barStart(this.f, trc[0]), this.f.barTicks)) {
      this.cued.add("trace");
      this.banner = { text: this.road ? "THE FREE LINE: STRIKE ITS FIRST NOTE, THEN SLIDE ALONG IT" : "THE FREE LINE: IT PLAYS ON FROM ITS FIRST NOTE", at: performance.now() };
    }
    const tk = this.arc.takeover;
    if (tk && this.take && !this.cued.has("take") && ahead(this.take.on, this.f.barTicks)) {
      this.cued.add("take");
      this.banner = { text: tk.cue, at: performance.now() };
    }
  }
  /**
   * D261: a held thumb still on the same note when that note comes again (Prelude 1's bass, struck
   * again each half bar) has played it, tied: the first judged held, the second its own.
   */
  private tieStep() {
    if (!this.arc?.strike) return;
    for (const h of this.held.values()) {
      if (h.passive || h.note < 0) continue;
      const notes = this.tracks[h.k].notes;
      const j = notes.findIndex((n, q) => q > h.note && n.state === "pending" && !n.ride);
      const n = notes[j];
      // Only when the window to strike it again has gone by (a thumb lifting late and striking it again is not tied).
      if (!n || n.midi !== notes[h.note].midi || this.now < n.on + this.opt.late) continue;
      if (h.open) this.judgeEnd(h, n.on);
      Object.assign(n, { state: "hit", at: n.on });
      h.note = j;
      h.open = true;
    }
  }
  /**
   * D262, THE CHARGE: the share of the first pedal held so far (0 to 1): it rises while the pedal is held
   * and stands still while it is let go.
   */
  get charge(): number {
    const p = this.arc?.charge ? this.pedalList[0] : undefined;
    if (!p) return 0;
    const now = p.from !== null && !p.done ? Math.max(0, Math.min(this.now, p.end) - p.from) : 0;
    return Math.min(1, (p.held + now) / Math.max(1, p.end - p.on));
  }
  /** D262: the tick the second pedal was pressed (the arrival), or null. */
  arrivedAt: number | null = null;
  /**
   * D262: the doublings now: the arc's lift, but from the first pedal to the arrival the charge drives
   * them (from the lift where the pedal begins up to the full), and after the arrival they bloom.
   */
  private liftNow(tick: number): number {
    const base = liftAt(this.f, this.arc, tick);
    const p = this.arc?.charge ? this.pedalList[0] : undefined;
    if (!p || tick < p.on) return base;
    if (this.arrivedAt === null) {
      const from = liftAt(this.f, this.arc, p.on);
      return from + (1 - from) * this.charge;
    }
    return Math.max(base, 1 - 0.3 * Math.min(1, (tick - this.arrivedAt) / this.f.barTicks));
  }
  /** D262: the journey as the player drives it (the climb by the charge, the summit from the arrival), or nothing to change. */
  get journeyLive(): { climb?: number; summit?: number } | undefined {
    const p = this.arc?.charge ? this.pedalList[0] : undefined;
    if (!p || this.now < p.on) return undefined;
    if (this.arrivedAt === null) return { climb: this.charge, summit: 0 };
    const u = Math.min(1, (this.now - this.arrivedAt) / this.f.barTicks);
    return { climb: 0, summit: 1 - 0.3 * u };
  }
  /** D262: lines still sounding after the thumb let go (or their first note missed): they go on by themselves. */
  private loose: Trace[] = [];
  /** D262: the line's next note sounds (for its written length); the last of a line mostly slid scores LINE. */
  private traceNext(tr: Trace) {
    const q = tr.queue.shift();
    if (!q) return;
    const len = Math.max(0.12, this.timeAt(q.on + q.dur) - this.timeAt(q.on));
    const sd = this.touchNote(q.midi, this.chip.ctx.currentTime, len, tr.voice, tr.play);
    if (sd) this.band.push({ sd, until: this.chip.ctx.currentTime + len + 0.6 });
    if (tr.queue.length || tr.count === 0) return;
    if (tr.slid >= Math.ceil(tr.count * 0.75)) {
      this.earn("bonus", TRACE_POINTS * this.mult);
      this.flash = { text: "LINE", at: performance.now(), good: true, kind: "legato" };
    }
  }
  /** D262: a line's notes not slid sound by themselves, half a sixteenth after they are written at the latest. */
  private traceStep() {
    const due = (tr: Trace) => {
      while (tr.queue.length && this.now >= tr.queue[0].on + this.f.tpq / 8) this.traceNext(tr);
    };
    for (const h of this.held.values()) if (h.trace?.queue.length) due(h.trace);
    for (const tr of this.loose) due(tr);
    this.loose = this.loose.filter((tr) => tr.queue.length);
  }
  /** D258: the chord's next note sounds (a slide's, or by itself); the last of a chord all slid scores SWEEP. */
  private sweepNext(h: Held) {
    const sw = h.sweep;
    const m = sw?.queue.shift();
    if (!sw || m === undefined) return;
    const t = this.chip.ctx.currentTime;
    h.sounds.push(this.touchNote(m, t, HOLD_MAX, sw.voice, sw.play));
    sw.next = t + SWEEP_GAP_S;
    if (sw.queue.length) return;
    if (sw.slid >= h.sounds.length - 1) {
      const pts = SWEEP_POINTS * this.mult;
      this.earn("bonus", pts);
      this.flash = { text: "SWEEP", at: performance.now(), good: true, kind: "legato" };
    }
  }
  /** D258: a chord not slid sounds by itself, a note every SWEEP_GAP_S (a slide begun and stalled: SWEEP_WAIT_S). */
  private sweepStep() {
    const t = this.chip.ctx.currentTime;
    for (const h of this.held.values()) {
      const sw = h.sweep;
      if (!sw?.queue.length) continue;
      if (t >= sw.next + (sw.slid ? SWEEP_WAIT_S - SWEEP_GAP_S : 0)) this.sweepNext(h);
    }
  }
  /** D250: the pedal's announcement two bars ahead, its end scored (a bonus by the share held). */
  private pedalStep() {
    const p = this.bassPedal;
    if (!p || p.done) return;
    if (!p.announced && this.now >= p.on - 2 * this.f.barTicks) {
      p.announced = true;
      const key = "ASDF"[p.lane] ?? "A";
      this.banner = { text: this.road ? (this.arc?.charge && p === this.pedalList[0] ? `LEFT THUMB: HOLD THE ${p.name} PEDAL · HOLDING BUILDS THE MUSIC` : `LEFT THUMB: HOLD THE ${p.name} PEDAL`) : `HOLD ${key}: THE ${p.name} PEDAL`, at: performance.now() };
    }
    // D262: the arrival announced a bar ahead (lift, and press the next).
    const after = this.arc?.charge ? this.pedalList.find((q) => !q.done && q !== p) : undefined;
    if (after && !after.announced && after.on === p.end && this.now >= after.on - this.f.barTicks) {
      after.announced = true;
      this.banner = { text: this.road ? `HOME: LIFT, THEN PRESS ${after.name}` : `HOME: LET GO, THEN PRESS ${after.name}`, at: performance.now() };
    }
    // D253: a left thumb already down when the pedal begins (held from the bar before) becomes the pedal.
    if (this.hands && p.id === null && this.now >= p.on && !(this.arc?.charge && p !== this.pedalList[0])) {
      const lh = [...this.held.entries()].find(([, h]) => h.k === 1);
      if (lh) {
        const [hid, h] = lh;
        this.held.delete(hid);
        for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
        this.startPedal(p, hid);
      }
    }
    if (this.now < p.end) return;
    if (p.from !== null) p.held += Math.max(0, p.end - p.from);
    const carry = p.id;
    p.from = p.id !== null ? p.end : null;
    p.done = true;
    // D253: a pedal held to its end goes on into the next if it follows at once (G into C), the thumb unmoved.
    // D262: not where the next is the arrival (pressed anew).
    const nx = this.bassPedal;
    if (carry !== null && nx && nx.on === p.end && nx.id === null && !this.arc?.charge) {
      p.id = null;
      p.sounds = [];
      this.startPedal(nx, carry);
    }
    p.share = Math.min(1, p.held / Math.max(1, p.end - p.on));
    const bonus = Math.round(40 * p.share) * this.mult;
    this.earn("bonus", bonus);
    this.pops.push({ tick: p.end, step: 0, text: `PEDAL ${Math.round(p.share * 100)}%${bonus ? ` +${bonus}` : ""}`, at: performance.now(), gold: p.share >= 0.9 });
  }
  /** D250: a strike near the final chord: two touches (keys) together score its bonus. */
  private finalStrike(id: number, ts: number) {
    if (this.finalOn === undefined || this.finalDone || Math.abs(this.now - this.finalOn) > this.beat) return;
    this.finalTouches = this.finalTouches.filter((x) => ts - x.ts < 150 && x.id !== id);
    this.finalTouches.push({ id, ts });
    if (this.finalTouches.length < 2) return;
    this.finalDone = true;
    const bonus = 20 * this.mult;
    this.earn("bonus", bonus);
    this.pops.push({ tick: this.finalOn, step: 0, text: `BOTH HANDS +${bonus}`, at: performance.now(), gold: true });
  }
  /** D247: LADDER's row for judging a touch: the box's, but no smaller than LADDER_ROW_MIN (the whole piece in the box). */
  get ladderRow(): number {
    return Math.max(this.rows?.rowH ?? MECH.ladderRowMin, MECH.ladderRowMin);
  }
  /** D244: the notes of a track that repeat the first half of their bar (their lanes the first half's). */
  echoOf(k = 0): Set<number> {
    this.lanesOf(k);
    return this.echoMemo[k] ?? new Set();
  }

  /** D213: the subject's sound (the cues, the fugue's effect, the LAB switches as the game began). */
  readonly subj: SubjectSound;
  /** D205: the piece's ornaments ("voice:onset"), and each other voice's last note (for the snapped trill). */
  readonly ornaments: Map<string, Ornament>;
  private lastOther = new Map<number, number>();

  /** D186: what the box draws of the player's playing: points, bursts, the zone. */
  readonly pops: Pop[] = [];
  readonly bursts: Burst[] = [];
  get zone(): "pleno" | "fuoco" | null {
    return this.streak >= FUOCO_NOTES ? "fuoco" : this.pleno ? "pleno" : null;
  }
  /** The voice's last entry (D208: no bosses in LADDER for now). */
  private isBoss(e: { voice: number; on: number }) {
    if (this.proto.id === "ladder") return false;
    return e.on === Math.max(...this.entries.filter((x) => x.voice === e.voice).map((x) => x.on));
  }

  /** The grade, after osu! and the like: S (95% and every entry captured), A, B, C, D. */
  gradeOf(r: { right: number; of: number; stray?: number }): string {
    // A stray strike weighs half a note.
    const acc = r.right / Math.max(1, r.of + (r.stray ?? 0) / 2);
    const all = this.entries.every((e) => e.state === "captured");
    return acc >= 0.95 && all ? "S" : acc >= 0.9 ? "A" : acc >= 0.8 ? "B" : acc >= 0.7 ? "C" : "D";
  }

  /** EASY (computer): the pedal down or up (up: what rang on stops). */
  pedal(down: boolean) {
    this.pedalDown = down;
    if (!down) {
      for (const sd of this.pedalled) sd.stop();
      this.pedalled = [];
    }
  }
  get pedalOn() {
    return this.pedalDown;
  }

  /** EASY (computer): Space flings the note sounding now off, with the swoosh. */
  swooshNow() {
    for (const h of [...this.held.values()].reverse()) {
      if (!h.sounds.length) continue;
      for (const sd of h.sounds) sd.stop(this.chip.ctx.currentTime + 0.02);
      h.sounds = [];
      if (!this.bt) this.chip.swoosh(h.midi, voicing(this.tracks[h.k].voice, this.f.voices.length, true), levelOf(this.heard(h.d0)));
      return;
    }
  }

  /** EASY (computer): the held notes bent (cents). */
  bendHeld(cents: number) {
    for (const h of this.held.values()) for (const sd of h.sounds) sd.bend(cents);
  }

  /** The window lost (blur, a hidden tab): every key and the pedal let go, as if released now. */
  /** D308: the tick where the game was paused (null: not paused). */
  private pausedAt: number | null = null;
  /** D308: where the music takes up again after a pause, a bar of count-in before it. */
  private resumeAt: number | null = null;
  get paused(): boolean {
    return this.pausedAt !== null;
  }
  /** D308: the bar's beats (the count-in after a pause is one bar). */
  get beatsPerBar(): number {
    return this.perBar;
  }
  get pausedTick(): number | null {
    return this.pausedAt;
  }
  /**
   * D308, PAUSE (the owner: "add pause button to rounds"; and the page hidden): the clock held where it
   * is; every touch let go unjudged, every sound stopped, nothing left on the schedule (the band's notes
   * ahead, BLUETOOTH MODE's), so nothing sounds or drifts while paused; no note goes by missed.
   */
  pause() {
    if (this.pausedAt !== null || this.failedAt !== null || this.now > this.end) return;
    this.now = this.tickAt(this.chip.heard());
    this.pausedAt = Math.max(this.now, this.start);
    for (const p of this.pedalList) ((p.id = null), (p.from = null));
    this.pedalDown = false;
    this.keysDown.clear();
    this.stopAll();
  }
  /**
   * D308: on again from the beat the pause fell in (or on), after a bar of count-in clicked as at the
   * start: the band and the player's notes from there scheduled afresh.
   */
  resume() {
    const at = this.pausedAt;
    if (at === null) return;
    this.pausedAt = null;
    const grid = this.start + Math.floor((at - this.start) / this.beat) * this.beat;
    const from = grid - this.perBar * this.beat;
    this.resumeAt = Math.max(grid, this.entry);
    this.anchorTick = from;
    this.anchorAt = this.chip.ctx.currentTime + 0.15;
    this.nextBeat = from;
    this.bandT?.reset(this.anchorAt, from);
    this.now = this.tickAt(this.chip.heard());
    const firstAt = <T extends { on: number }>(xs: T[]) => {
      const i = xs.findIndex((n) => n.on >= grid);
      return i < 0 ? xs.length : i;
    };
    this.nextOther = firstAt(this.others);
    this.armNext = this.tracks.map((t) => firstAt(t.notes));
  }

  releaseAll(ts: number) {
    for (const id of [...this.held.keys()]) this.up(id, ts);
    this.pedal(false);
    this.keysDown.clear();
  }

  /** The others' notes sounding or to sound (stopped on quitting; D184). */
  private band: { sd: Sounding; until: number }[] = [];

  stopAll() {
    this.chip.zone?.(null);
    // D262: no line left to play on.
    this.loose = [];
    // D252: no coupling left on for the next game; the pedals' bourdons stopped.
    if (this.chip.coupling) this.chip.coupling = { up: 0, down: 0, split: 48 };
    for (const p of this.pedalList) for (const sd of p.sounds) sd.stop();
    for (const b of this.band) b.sd.stop();
    this.band = [];
    for (const sd of this.pedalled) sd.stop();
    this.pedalled = [];
    for (const h of this.held.values()) for (const sd of [...h.sounds, ...(h.fx ?? [])]) sd.stop();
    this.held.clear();
    // D299: the player's notes on the schedule (BLUETOOTH MODE).
    for (const a of this.armed.values()) for (const sd of a.sounds) sd.stop();
    this.armed.clear();
  }

  /** The notes (a chord once): played right, played wrong, missed; the score, the entries captured. */
  /** Strikes on no note. */
  stray = 0;
  results(): RunResults {
    const r = { right: 0, wrong: 0, missed: 0, stray: this.stray, of: 0, score: Math.floor(this.score), grade: "", captured: this.entries.filter((e) => e.state === "captured").length, entries: this.entries.length, maxStreak: this.maxStreak };
    for (const { notes } of this.tracks)
      notes.forEach((n, i) => {
        // D191: the riding notes are not counted.
        if ((i > 0 && notes[i - 1].on === n.on) || n.ride) return;
        // A failed run: only the notes before the end count.
        if (this.failedAt !== null && n.on > this.failedAt) return;
        r.of++;
        if (n.state === "hit") r.right++;
        else if (n.wrong) r.wrong++;
        else r.missed++;
      });
    r.grade = this.gradeOf(r);
    const failed = this.failedAt !== null;
    const art = { ...this.art, touch: this.sense.touch };
    const progress = failed ? this.progressAt(this.failedAt as number) : 1;
    const sheet = scoreSheet({ ...r, art, earned: { ...this.earned }, perfects: this.perfects, goods: this.goods, failed, progress, style: { ...this.style }, graces: { ...this.graces } });
    return { ...r, art, lanes: { ...this.laneTally }, stars: failed ? 0 : this.starsOf(r.score, r.of), failedBar: failed ? barAt(this.f, this.failedAt as number) : null, lastBar: barAt(this.f, this.span().end - 1), progress, sheet, thumbs: { ...this.thumbs }, levels: [...this.levels], slides: this.slides, shakes: { ...this.shakes }, free: freeTally(this.freeByNote.values()), report: this.report(r) };
  }
  /** D268: the played notes' first onset and last end (ticks). */
  private span(): { start: number; end: number } {
    let start = Infinity;
    let end = 0;
    for (const { notes } of this.tracks)
      for (const n of notes) {
        start = Math.min(start, n.on);
        end = Math.max(end, n.on + n.dur);
      }
    return start < end ? { start, end } : { start: 0, end: 1 };
  }
  /** D268: how far through the played notes a tick is, 0..1. */
  progressAt(tick: number): number {
    const { start, end } = this.span();
    return Math.max(0, Math.min(1, (tick - start) / (end - start)));
  }
  /** D268: the share of the notes judged so far that were right (the right bar's live ACCURACY); null before any. */
  liveAccuracy(): number | null {
    let right = 0;
    let judged = 0;
    for (const { notes } of this.tracks)
      notes.forEach((n, i) => {
        if ((i > 0 && notes[i - 1].on === n.on) || n.ride) return;
        if (n.state === "hit") right++, judged++;
        else if (n.state === "miss") judged++;
      });
    judged += this.stray / 2;
    return judged > 0 ? right / judged : null;
  }

  /** D268: the points by where they came from (the score sheet), and the right notes' timing. */
  readonly earned: Record<ScoreSource, number> = { notes: 0, articulation: 0, held: 0, subjects: 0, cadences: 0, bonus: 0, reading: 0 };
  /** D272: the reading's asks met, of those judged (the score sheet's READING). */
  readonly style = { hit: 0, of: 0 };
  private readingMemo: Map<string, number> | null = null;
  /** D272: each of the player's subject notes (track:onset) to its place in the subject (the reading's note). */
  private readingIndex(): Map<string, number> {
    if (this.readingMemo) return this.readingMemo;
    const m = new Map<string, number>();
    if (this.o.reading) for (const e of this.entries) e.ons.forEach((on, j) => m.set(`${e.k}:${on}`, j));
    return (this.readingMemo = m);
  }
  /** D272: one of the reading's asks judged (met or not). */
  private styled(met: boolean, at: number, word?: string) {
    this.style.of++;
    if (!met) return;
    this.style.hit++;
    this.earn("reading", this.mult);
    if (word) this.flash = { text: word, at, good: true, kind: "legato" };
  }
  perfects = 0;
  goods = 0;
  /**
   * D271, THE TUTORIAL's measures: the thumbs (a quick note, an eighth or shorter after the one before,
   * struck by the other thumb than that one's: alternated) and each right strike's dynamic (0 pp to 1 ff).
   */
  readonly thumbs = { alt: 0, of: 0 };
  /** D271: notes played by a held thumb sliding on. */
  slides = 0;
  readonly levels: { on: number; d: number }[] = [];
  private lastStrike: { side: Side; on: number } | null = null;
  private thumbNote(side: Side, on: number, d: number) {
    const last = this.lastStrike;
    if (last && on > last.on && on - last.on <= this.f.tpq / 2) {
      this.thumbs.of++;
      if (side !== last.side) this.thumbs.alt++;
    }
    this.lastStrike = { side, on };
    this.levels.push({ on, d });
  }
  /** D271: the side the next quick note asks for (the other thumb than the last strike's), or null. */
  thumbNext(): Side | null {
    return this.lastStrike ? (this.lastStrike.side === "left" ? "right" : "left") : null;
  }
  private earn(src: ScoreSource, pts: number) {
    if (!pts) return;
    this.score += pts;
    this.earned[src] += pts;
  }
  /**
   * D259, THE REPORT: every note not played exactly (a tap on no note, a wrong one, one only the right
   * way, a miss) where it came, which hand, the lane (and row) touched and asked, how early or late;
   * copied from the result for the owner to send ("I keep failing. Something is not working").
   */
  private diag: string[] = [];
  private diagCounts: Record<string, number> = {};
  /** D290: touches the system took back (pointercancel), for the report. */
  private cancels = 0;
  private diagNote(kind: string, k: number, tick: number, c: Contact | undefined, i: number) {
    this.diagCounts[kind] = (this.diagCounts[kind] ?? 0) + 1;
    if (this.diag.length >= 400) return;
    const f = this.f;
    const bar = barAt(f, tick);
    const beat = (tick - barStart(f, bar)) / this.beat + 1;
    const notes = this.tracks[k]?.notes ?? [];
    let j = i;
    if (j < 0) {
      // A tap on no note: the nearest note to strike, how far off.
      let best = Infinity;
      notes.forEach((n, q) => {
        if (n.ride || (q > 0 && notes[q - 1].on === n.on)) return;
        if (Math.abs(n.on - tick) < best) (best = Math.abs(n.on - tick)), (j = q);
      });
    }
    const n = notes[j];
    const off = n ? Math.round(this.msOf(n.on, tick) * (tick < n.on ? -1 : 1)) : 0;
    // D290: a tap whose note was already taken: by what, and how long before.
    const taken = i < 0 && n?.state === "hit" && n.at !== undefined ? ` · note taken by ${n.via ?? "?"} ${Math.round(this.msOf(Math.min(n.at, tick), Math.max(n.at, tick)))} ms ${n.at <= tick ? "before" : "after"}` : "";
    const touched = c && this.road ? `L${this.laneOfX(c.x, c.w)}${this.arc?.rows ? (c.y >= c.h - PAD_SPLIT ? "lo" : "up") : ""}` : "";
    const asked = n && j >= 0 ? `L${this.lanesOf(k)[j]}${this.arc?.rows ? (this.rowOf(j, k) ? "lo" : "up") : ""}` : "";
    const hand = this.hands ? (k ? " LH" : " RH") : "";
    this.diag.push(`${bar}.${beat.toFixed(1)}${hand} ${kind}${touched ? ` touched ${touched}` : ""}${asked ? ` asked ${asked}` : ""}${n ? ` ${off >= 0 ? "+" : ""}${off}ms` : ""}${taken}`);
  }
  private report(r: { right: number; of: number; score: number }): string {
    const counts = Object.entries(this.diagCounts).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
    const head = [
      `${this.f.id} ${this.proto.id} ${this.o.easy ?? "timing"} ${Math.round(this.bpm)} bpm${this.hands ? " both hands" : ""} · sound delay ${this.chip.lag == null ? "as reported" : `${Math.round(this.chip.lag * 1000)} ms`}${this.bt ? " · BLUETOOTH MODE" : ""}`,
      `right ${r.right}/${r.of} score ${r.score}${this.failedAt !== null ? ` crowd left at bar ${barAt(this.f, this.failedAt)}` : ""} · slips ${this.slips} · screen ${Math.round(this.touchW)} px · touches cancelled ${this.cancels}`,
      this.pedalList.length ? `pedals held ${this.pedalList.map((p) => `${p.name} ${Math.round(p.share * 100)}%`).join(", ")}` : "",
      `not exact: ${counts}`,
    ].filter(Boolean);
    return [...head, ...this.diag].join("\n");
  }
}
