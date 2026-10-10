/**
 * The tutorial's logic (D128): scenes (a small score the learner reads, hears or writes on), tasks
 * (what must be done before Next opens) and the coach (what a note just written makes against the
 * cantus). Pure functions over the game's own engine, rules and data: what the tutorial says is
 * right is what the game will accept. No React here; the screen is ui/Tutorial.tsx.
 */
import type { ModalFinal, Staff } from "../music/fux/types.ts";
import type { ClefId } from "../ui/notation/clefs.ts";
import { HOLD, REST, slotLayout, slotsOfBars, sounding, timeline, type PlayEvent, type Slot, type SpeciesId } from "../counterpoint/layout.ts";
import { harmonic, interval, isConsonant, isImperfectConsonance, isPerfectConsonance, motion, type Interval, type Motion } from "../counterpoint/interval.ts";
import { evaluate, type Evaluation } from "../counterpoint/engine.ts";
import type { Rule } from "../counterpoint/rules/types.ts";
import { evaluateTrio, type TrioEvaluation } from "../counterpoint/three-voice.ts";
import { parsePitch } from "../music/pitch.ts";

/** A two-staff score of the tutorial: given notes, the slots left open to the learner, the answer. */
export interface Scene {
  cantus: string[];
  cantusVoice: Staff;
  /** Upper staff first. */
  clefs: [ClefId, ClefId];
  species: SpeciesId;
  modalFinal: ModalFinal;
  layout: Slot[];
  /** The line as the page opens: given notes, null where the learner writes. */
  start: (string | null)[];
  /** Slots the learner may write (empty: read-only). */
  open: number[];
  /** A line that completes the task (Fux's own, where there is one): "Show me". */
  answer?: (string | null)[];
  /** Bars drawn (0-based, inclusive); default all. */
  window?: [number, number];
  /** Rules that judge the line ("judge" tasks): the rules of a curriculum step, or a chosen few. */
  rules?: Rule[];
  /** The curriculum step the scene comes from (for the hand-off to the game). */
  stepId?: string;
}

/** A three-staff scene (three voices, first species): staves top first. */
export interface TrioScene {
  modalFinal: ModalFinal;
  cantusIndex: number;
  clefs: ClefId[];
  start: (string | null)[][];
  /** [staff, bar] cells the learner may write. */
  open: [number, number][];
  answer: string[][];
  stepId: string;
}

/** Something to hear: a line against its cantus, or bare sonorities one after another. */
export type Clip =
  | { id: string; kind: "scene"; scene: Scene; notes?: (string | null)[]; from?: number; to?: number }
  | { id: string; kind: "columns"; columns: string[][]; seconds?: number }
  | { id: string; kind: "melody"; notes: string[]; seconds?: number };

export interface Verdict {
  done: boolean;
  tone: "ok" | "bad" | "info";
  /** Key in the tutorial's content (tutorial.en.json, section "say"). */
  key: string;
  vars?: Record<string, string | number>;
}

export interface QuizItem {
  /** Lower note first; one sonority, or two in a row (motion). */
  columns: string[][];
  answer: string;
  /** Three voices: the bar of the scene this sonority is taken from (0-based). */
  bar?: number;
}

export interface Option {
  id: string;
  /** A line to draw and hear beside the option (fifth species), on the task's scene. */
  notes?: (string | null)[];
  /** Right answer. Where the option carries notes, the tests check this flag against the engine. */
  correct: boolean;
}

export type Task =
  | { kind: "read" }
  /** Done when `need` clips (default all) have been heard. */
  | { kind: "listen"; clips: Clip[]; need?: number }
  | { kind: "choice"; options: Option[]; scene?: Scene }
  | { kind: "quiz"; quiz: "interval" | "class" | "motion" | "chord"; items: QuizItem[]; choices: string[] }
  | { kind: "write"; check(notes: (string | null)[], scene: Scene): Verdict }
  | { kind: "judge" }
  | { kind: "trio" }
  | { kind: "game"; voices: 2 | 3; stepId: string }
  | { kind: "tour" };

export interface Lesson {
  /** Content key: tutorial.en.json lessons[id]. */
  id: string;
  scene?: Scene;
  trio?: TrioScene;
  task: Task;
  /** Extra things to hear beside a scene or a text. */
  clips?: Clip[];
  /** Show the note names on the score (training wheels; on by default). */
  names?: boolean;
  /** Show the intervals between the staves. */
  intervals?: boolean;
}

export interface Chapter {
  id: string;
  lessons: Lesson[];
}

// ---------------------------------------------------------------- scenes

export const firstLayout = (bars: number) => slotLayout("first", bars);

/** A free scene in first species: a cantus and a line to write over (or under) it. */
export function freeScene(cantus: string[], o: { cantusVoice?: Staff; clefs?: [ClefId, ClefId]; start?: (string | null)[]; open?: number[]; answer?: (string | null)[]; rules?: Rule[]; modalFinal?: ModalFinal } = {}): Scene {
  const layout = cantus.length >= 2 ? firstLayout(cantus.length) : [{ bar: 0, beat: 0, duration: "1/1" as const, restAllowed: false }];
  const start = o.start ?? cantus.map(() => null);
  return {
    cantus,
    cantusVoice: o.cantusVoice ?? "lower",
    clefs: o.clefs ?? ["treble", "bass"],
    species: "first",
    modalFinal: o.modalFinal ?? "D",
    layout,
    start,
    open: o.open ?? start.map((n, k) => (n === null ? k : -1)).filter((k) => k >= 0),
    answer: o.answer,
    rules: o.rules,
  };
}

/** The slots of bars lo..hi (inclusive) of a scene. */
export const slotsOf = (s: Scene, lo: number, hi: number) => slotsOfBars(s.layout, lo, hi);

/** The scene's line with the open slots blanked, from an answer. */
export function blank(answer: (string | null)[], open: number[]): (string | null)[] {
  return answer.map((n, k) => (open.includes(k) ? null : n));
}

/** Every open slot written? (In fifth species a HOLD continues a note and counts as written.) */
export const complete = (s: Scene, notes: (string | null)[]) => s.open.every((k) => notes[k] !== null);

/** Judge a two-voice line with the scene's rules: the same evaluation as the game's Evaluate. */
export function judge(s: Scene, notes: (string | null)[]): Evaluation {
  return evaluate(
    {
      species: s.species,
      modalFinal: s.modalFinal,
      cantusVoice: s.cantusVoice,
      cantus: s.cantus.map((p) => ({ pitch: p, duration: "1/1" })),
      counterpoint: notes.map((p, k) => ({ pitch: p === HOLD ? HOLD : sounding(p) ? p : null, duration: s.layout[k].duration })),
    },
    s.rules ?? [],
  );
}

export function judgeTrio(s: TrioScene, voices: (string | null)[][]): TrioEvaluation {
  return evaluateTrio({ modalFinal: s.modalFinal, cantusIndex: s.cantusIndex, voices: voices as string[][] });
}

/** Playback events of a scene's line (or bars from..to of it), for AudioEngine.playSequence. */
export function sceneEvents(s: Scene, notes: (string | null)[] = s.answer ?? s.start, from = 0, to = s.cantus.length - 1): PlayEvent[] {
  const events = timeline(s.cantus, s.layout, notes, from, to, undefined, undefined, { ties: s.species === "fourth" });
  // Fifth species: a window that opens in the middle of a held note (a HOLD) sounds that note from
  // the window's start, for the rest of its length, as the score draws it carried in.
  const first = events[0]?.slot;
  if (first !== undefined && first > 0 && notes[first] === HOLD) {
    let j = first;
    while (j > 0 && notes[j] === HOLD) j--;
    const carried = notes[j];
    if (sounding(carried)) {
      let end = first;
      while (end + 1 < notes.length && notes[end + 1] === HOLD) end++;
      const last = s.layout[end];
      const length = last.bar + last.beat * slotLengthOf(last) + slotLengthOf(last) - (s.layout[first].bar + s.layout[first].beat * slotLengthOf(s.layout[first]));
      events[0] = { ...events[0], counterpoint: carried, lengths: { ...events[0].lengths, counterpoint: length } };
    }
  }
  return events;
}

const slotLengthOf = (sl: Slot) => (sl.duration === "1/1" ? 1 : sl.duration === "1/2" ? 0.5 : sl.duration === "1/4" ? 0.25 : 0.125);

// ---------------------------------------------------------------- words for intervals

const NUMBER_WORD = ["", "unison", "second", "third", "fourth", "fifth", "sixth", "seventh", "octave"];
const COMPOUND_WORD: Record<number, string> = { 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth" };

/** Interval size in the tutorial's words: "third", "octave", "tenth" is reported as "third". */
export function sizeWord(i: Interval): string {
  if (i.number === 1) return "unison";
  if (i.number === 8 || (i.number > 8 && i.simple === 1)) return "octave";
  return NUMBER_WORD[i.simple];
}

export type IntervalClass = "perfect" | "imperfect" | "dissonant";
/** Against the lower voice of two (the fourth is dissonant there, as in the game). */
export function classOf(i: Interval): IntervalClass {
  return isPerfectConsonance(i) ? "perfect" : isImperfectConsonance(i) ? "imperfect" : "dissonant";
}

/** "major third", "fifth", "augmented fourth (the tritone)": quality named where it tells something. */
export function intervalWords(i: Interval): string {
  const size = sizeWord(i);
  const q = i.quality;
  const quality = q === "M" ? "major " : q === "m" ? "minor " : q === "A" ? "augmented " : q === "d" ? "diminished " : q === "AA" ? "doubly augmented " : q === "dd" ? "doubly diminished " : "";
  const name = `${quality}${size}`;
  const compound = i.number > 8 && i.simple !== 1 ? (COMPOUND_WORD[i.number] ? ` (a ${COMPOUND_WORD[i.number]}, counted as a ${size})` : ` (more than two octaves apart, counted as a ${size})`) : "";
  const tritone = (q === "A" && i.simple === 4) || (q === "d" && i.simple === 5) ? " — the tritone" : "";
  return name + compound + tritone;
}


/** The generic number the quiz asks for: 1..8 (compounds reduced, octaves kept as 8). */
export function quizNumber(i: Interval): string {
  if (i.number === 1) return "1";
  if (i.simple === 1) return "8";
  return String(i.simple);
}

// ---------------------------------------------------------------- the coach

export interface CoachLine {
  tone: "ok" | "bad" | "info" | "warn";
  key: string;
  vars?: Record<string, string | number>;
}

/** The previous sounding counterpoint note before slot k, and its slot. */
function previous(notes: (string | null)[], k: number): number {
  for (let j = k - 1; j >= 0; j--) if (sounding(notes[j])) return j;
  return -1;
}

/**
 * What the note in slot k makes: its interval with the cantus (consonant or not, and whether that
 * is allowed on this beat), and, where both voices move into it, the motion — with the one rule a
 * beginner meets first: a fifth or octave only by contrary or oblique motion.
 */
export function coach(s: Scene, notes: (string | null)[], k: number): CoachLine[] {
  const n = notes[k];
  if (!sounding(n)) return [];
  const sl = s.layout[k];
  const cf = s.cantus[sl.bar];
  const i = harmonic(cf, n);
  const out: CoachLine[] = [];
  const cls = classOf(i);
  const vars = { bar: sl.bar + 1, note: parsePitch(n).name.replace("#", "♯").replace(/b(?=\d)/, "♭"), cf: cf.replace("#", "♯"), interval: intervalWords(i) };
  const downbeat = sl.beat === 0;
  if (cls === "dissonant") out.push({ tone: s.species === "first" || (downbeat && s.species !== "fourth") ? "bad" : "warn", key: s.species === "first" ? "coach.dissonantFirst" : downbeat ? (s.species === "fourth" ? "coach.dissonantTied" : "coach.dissonantDown") : "coach.dissonantWeak", vars });
  else out.push({ tone: "ok", key: cls === "perfect" ? "coach.perfect" : "coach.imperfect", vars });
  // Motion into this note: from the previous note of the line against the cantus note then sounding.
  const j = previous(notes, k);
  if (j >= 0) {
    const pcf = s.cantus[s.layout[j].bar];
    const m: Motion = motion(pcf, notes[j]!, cf, n);
    const into = isPerfectConsonance(i);
    if (m !== "none") {
      const bad = into && (m === "parallel" || m === "similar") && (s.species === "first" || downbeat);
      out.push({ tone: bad ? "bad" : "info", key: bad ? `coach.motionBad.${m}` : `coach.motion.${m}`, vars });
    }
  }
  const leap = j >= 0 ? interval(notes[j]!, n) : null;
  if (leap && leap.quality === "A" && leap.simple === 4) out.push({ tone: "bad", key: "coach.tritoneLeap", vars });
  if (leap && leap.number === 6 && leap.quality === "M") out.push({ tone: "bad", key: "coach.majorSixthLeap", vars });
  if (leap && leap.number === 7) out.push({ tone: "warn", key: "coach.seventhLeap", vars });
  return out;
}

// ---------------------------------------------------------------- quiz answers (computed, never typed)

export function intervalAnswer(lower: string, upper: string): string {
  return quizNumber(harmonic(lower, upper));
}

export function classAnswer(lower: string, upper: string): IntervalClass {
  return classOf(harmonic(lower, upper));
}

/** Motion between two sonorities, each [lower, upper]. */
export function motionAnswer(a: string[], b: string[]): Motion {
  return motion(a[0], a[1], b[0], b[1]);
}

/**
 * Three voices: what the two upper notes make over the bass (the lowest note): a full triad
 * ("5/3": a third and a fifth), a six-three ("6/3": a third and a sixth), or something less
 * ("incomplete": only perfect consonances, or a doubled note), or a dissonance against the bass.
 */
export function chordAnswer(column: string[]): "53" | "63" | "incomplete" | "dissonant" {
  const ps = [...column].sort((a, b) => parsePitch(a).midi - parsePitch(b).midi);
  const [bass, ...up] = ps;
  const sizes = up.map((p) => harmonic(bass, p));
  if (sizes.some((i) => !isConsonant(i))) return "dissonant";
  const simple = new Set(sizes.map((i) => (i.simple === 1 ? 8 : i.simple)));
  if (simple.has(3) && simple.has(5)) return "53";
  if (simple.has(3) && simple.has(6)) return "63";
  return "incomplete";
}

export const REST_NOTE = REST;
