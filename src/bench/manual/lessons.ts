/**
 * D373, THE TUTORIAL REBUILT (Luigi and Mario's report of 28 October 2026, the owner's "assume yes"):
 * Parts 1–3 on the Inventions (1, 4, 8, 12), fifteen lessons, each WATCH → TRY → PLAY on the real play
 * screen (1.1 a tour of it); Parts 0–II and the drills withdrawn; the older Parts III–V kept, shown as 4–6.
 *
 * D342, THE MANUAL (the Two-Thumb Clavier-Büchlein; design of 27 October 2026): Parts 0–II (Phase A),
 * D360: Parts III (touch and articulation) and IV (time and breath). Each lesson declared, not searched
 * (design 4.1): its part and titles, its aim, Herr Bach's lines, the steps (HEAR: his demonstration, in
 * one or more manners; SEE: the lesson's visual aid; the DRILL stages; the PLAY stages, the last of
 * which passes the lesson), each stage's material (piece, voice, bars, tempo, WAIT, the reading, the
 * sound) and the one line he says before it, its lens (COUNTS, SHOWN, NEVER) and its pass rule as a
 * function of the run's lens (lens.ts), each line with the fix he names when it is not met (coach.ts).
 * Every excerpt is held to its feature by test/d342-manual.test.ts and test/d360-manual.test.ts.
 *
 * The owner's decisions (D342): Part I opens with Invention 1 (in the game) and not a chorale; each
 * lesson sounds on the instrument that makes its rudiment audible (chip for time, organ for holds,
 * harpsichord, piano), whatever the player's own sound (D369: Parts 0–II all on the PIANO, the owner's
 * "more pleasant"; the later parts keep theirs); a lesson that teaches an unscored skill has no
 * pass mark at all. His words: at most two lines before a lesson and one after (D225), one line before
 * each stage (D359); he quotes only his own title pages; the later sources sit in each lesson's
 * SOURCES, never in his mouth.
 *
 * D360 (Part V, on D353's contour gestures): the mordent, the short trill, the trill, free graces; no pass
 * mark (the owner's decision 3): passed by being played through, what was read shown. D364: V.5, the
 * appoggiatura held over (the design's V.4, after the four), on the hold-over gesture (proto-game.ts
 * holdOvers): I/22's falling chains of suspensions. Not Sinfonia 5: none of its written appoggiaturas
 * repeats the note before (F5, then the grace E♭5, then D5 in bar 2), so none can be held over, and its
 * notes are MORE BACH's chunk, which the manual does not load.
 *
 * D359 (the audit): the organ lessons sound on the PIPE ORGAN (they had kept the retired sampled
 * organ's id, which opens as the harpsichord); every lesson is played in THE MANUAL's practice room
 * (Options.quiet: none of the game's chatter, only the lesson's aid and the words it is about); each
 * stage is introduced by what it is for, in his words; a line not met is answered with its fix.
 */
import { tr } from "../../i18n/index.ts";
import { barStart, fugueById } from "../../touch/fugue.ts";
import { tempoOf } from "../../touch/tempi.ts";
import type { Reading } from "../../touch/readings.ts";
import type { LensStats } from "./lens.ts";
import type { Run } from "../lessons.ts";
import type { DemoManner, Options } from "../protos.ts";
import * as C from "./coach.ts";
import type { Said } from "./coach.ts";
import { atLeast, consistency, ex, INV, INV1_1_4, INV4, INV4_1, INV4_1_2, INV8, INV8_1_2, INV8_1_3, INV8_1_4, INV12, LOWER_1_2, movesRight, notesRight, RH, st, SUBJECT, touchLine } from "./kit.ts";
import { COURSE2 } from "./course2.ts";
import { FUGUE_TRACK } from "./fugue-track.ts";
import { RETIRED } from "./retired.ts";
import { DRESS_TEXTS, type DressLine } from "./dress.ts";
void RETIRED;

/**
 * D373: Parts 1–3 are the new tutorial's (Luigi and Mario's curriculum, on the Inventions); III, IV and V
 * the older parts kept until they are rebuilt (shown after the new ones as Parts 4, 5 and 6).
 */
/** D379: Parts 4–6 rebuilt in the new format and the fugue track (F); III–V (retired.ts) kept as ids for old records. */
export type PartId = "1" | "2" | "3" | "4" | "5" | "6" | "F" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
export type SoundName = "chip" | "harpsichord" | "organ" | "piano";
/** The sound each name plays on (sound.ts presets). D359: the organ is the PIPE ORGAN (D349), not the retired sampled organ. */
export const SOUND_PRESET: Record<SoundName, string> = { chip: "chip", harpsichord: "harpsichordSampled", organ: "chamberOrgan", piano: "pianoSampled" };
export const SOUND_WORD: Record<SoundName, string> = { chip: "CLASSIC CHIP", harpsichord: "HARPSICHORD", organ: "PIPE ORGAN", piano: "PIANO" };

/**
 * The visual aids (design 4.5), each for its lesson only. D342: dial, trace, repeat, fill, letters,
 * meter, prepared, trend. D360: breath (a comma over the box at each place the line may breathe).
 * D373 (the new tutorial): thumbs (Mario's model A: both thumbs always there, a shadow under each,
 * the ghost of the next move), count (the notes numbered 1, 2, 3…), plan (● or ○ under a block where the plan marks it, D409; was L or R, from
 * the fingering planner), rest
 * (a thumb not in use: its strip dimmed, REST), answer (YOU ANSWER HERE at the player's first note).
 * (point, the gold arrow from his words to the next note, withdrawn by D413.)
 */
/** D379: colour (each strip's map: firm and bright by the box, soft and dark by the rim). */
export type AidId = "dial" | "trace" | "repeat" | "fill" | "letters" | "meter" | "prepared" | "trend" | "breath" | "thumbs" | "count" | "plan" | "rest" | "answer" | "colour";
export type DemoStyle = "plain" | DemoManner;
export type TouchName = "LEGATO" | "ORDINARY" | "DETACHED";
/** D373: the signs of Part 3 (D370's vocabulary), one at a time; HELD is the plain long note. */
export type SignId = "held" | "short" | "detached" | "joined" | "accent";
/** D373: a lesson's own mark on a note (its reading, built for the lesson). */
export type LessonMark = "short" | "detached" | "joined" | "accent" | null;

export interface Material {
  piece: string;
  voice: number;
  /** Bars, inclusive; the passage ends on the note its last bar leads to (D289), a drill at its end. */
  fromBar: number;
  toBar: number;
  /** A share of the game's tempo (tempi.ts), or crotchets a minute. */
  tempo: { pct: number } | { bpm: number };
  wait?: boolean;
  /** The other voices off (drawn and sounded neither). */
  solo?: boolean;
  /** D342: EASY "timing" on LADDER: the height not judged (I.1). */
  easy?: "timing";
  sound?: SoundName;
  /** D360: the reading the passage is played by (readings.ts id): its marks drawn, asked and judged. */
  reading?: string;
  /** What it is, in a line ("Invention 1, right hand, bar 1"). */
  label: string;
  badge: "IN GAME" | "DRILL";
  /** D373: the voice's notes skipped from the first bar's line (the passage begins on the next). */
  skip?: number;
  /** D373: only so many of the voice's notes (the passage ends on the last of them). */
  count?: number;
  /** D373: the notes the passage plays, as written ("C4", "B♭4"): held to the data by the tests, drawn small on its tile. */
  notes?: string[];
  /** D373: one thumb takes every note in the hints and his demonstration (Options.side). */
  side?: "left" | "right";
  /** D409: the fingering marks (● ○) on every note (1.4, where they are introduced), else only where the plan marks them. */
  everyMark?: boolean;
  /** D373: the timing windows this many times the game's (Parts 1–2: twice). */
  widen?: number;
  /** D373: the lesson's own marks, one per note of the passage (its reading). */
  marks?: LessonMark[];
  /** D379: the temperament the step sounds in (tuning.ts id: the fugue track's comparison), else the sound's own. */
  tuning?: string;
  /** D379: the SUBJECT flags shown (D372's), once the word is taught (4.1, the fugue track); else none in the tutorial. */
  flags?: boolean;
  /** D379: how his demonstration lands and moves (Options.coach): "slide", rising steps slid (6.6); "colour", a bar firm by the box, the next soft by the rim (6.4); "sigh", each falling step firm then soft (6.5); "ring", each note held on past the next, the thumbs taking turns (6.7). */
  coach?: "slide" | "colour" | "sigh" | "ring";
}

/**
 * D373: the new tutorial's steps: WATCH (Bach plays, his thumbs shown), TRY (the notes wait for you; only
 * the way is judged, nothing scored), PLAY (count-in, the metronome, judged), and 1.1's TOUR of the screen.
 * The older parts keep DRILL and PLAY (their HEAR is the lesson's `hear`).
 */
/**
 * D379: LISTEN (he plays, nothing to watch for but the sound: the fugue track, a temperament, an
 * instrument), SPOT (he plays; the player taps each time the tune comes in: spotJudge), QUIZ (a question,
 * two or three answers, each explained; no run).
 */
export type StageKind = "drill" | "play" | "watch" | "try" | "tour" | "listen" | "spot" | "quiz";
/** D379: a QUIZ step's question and answers (one right), each with his reason. */
export interface Quiz {
  ask: string;
  answers: { text: string; right?: true; why: string }[];
}
export interface Stage {
  /** A DRILL may be left after one take; a PLAY must be passed to go on, and the last PLAY decides the lesson. */
  kind: StageKind;
  m: Material;
  /** D359: Herr Bach's one line before the stage: what it is for. */
  say?: string;
  /** D360 (III.1): the touch this take asks for. */
  ask?: TouchName;
  /** D373: how he plays a WATCH. */
  style?: DemoStyle;
  /** D373: the aids of this step (else the lesson's). */
  aids?: AidId[];
  /** D379: a QUIZ step's question. */
  quiz?: Quiz;
  /** D379: a SPOT step: the entries to find (at least), and the stray taps allowed (at most). */
  spot?: { need: number; strays: number };
  /** D402: a TOUR of the screen's elements, one lit at a time over its material's round, paused (6.8 THE REAL THING). */
  tour?: DressLine[];
}

/** One line of the lens (COUNTS): what it is, the figure reached, and whether it is met. */
export interface Check {
  text: string;
  vars?: Record<string, string | number>;
  ok: boolean;
  /** Nothing in this take to measure it by (a drill may lack what the play has): a drill passes over it. */
  na?: boolean;
  /** D359: what to fix when it is not met, in his words (coach.ts). */
  fix?: Said | null;
}

export interface ManualLesson {
  id: string;
  part: PartId;
  /** Herr Bach's title (German) and the English beneath it. D373: the new parts' titles are English only (title = english). */
  title: string;
  english: string;
  minutes: number;
  /** The lesson's sound (decision 4: the instrument that makes its rudiment audible). */
  sound?: SoundName;
  aim: string;
  /** D373: "You'll learn: …", in one sentence (the tile and the card). */
  learn?: string;
  /** D373: the music, named small ("INVENTION 1, BAR 1"). */
  music?: string;
  /** D373: the sign shown alone, on a card, before the lesson (Part 3). */
  sign?: SignId;
  /** HEAR: his demonstration of a stage (the last by default), in one or more manners, one after the other. */
  hear?: { stage?: number; styles: DemoStyle[] };
  aids: AidId[];
  /** D360 (Part V): the ornaments' SHAKE prompts and first-time hint kept in the practice room. */
  ornaments?: boolean;
  /** D359: the articulation words the practice room still calls (Options.quiet.words). */
  words?: NonNullable<Options["quiet"]>["words"];
  /** The guide thumbs (D280: the thumb the next note wants, hovering where it lands) while the player plays. */
  guide?: boolean;
  stages: Stage[];
  /** A material offered instead of the play (II.7: the left hand). */
  alt?: Material;
  lens: { counts: string[]; shown: string[]; never: string[] };
  /** COUNTS, with the figures reached; the lesson passes when every one is met. Absent: not judged (passed by being played through). */
  checks?: (x: LensStats, st?: Stage) => Check[];
  /** SHOWN, with the figures. */
  shown?: (x: LensStats, st?: Stage) => Check[];
  before: string[];
  after: string[];
  again: string[];
  /** One line after a take (I.1: "Early by 40 ms."; IV.6: one thing heard, never a number). */
  told?: (x: LensStats) => Said | null;
  sources?: string[];
  checkpoint?: boolean;
}


/** D369: the novice-friendly timing aims (I.1, I.5): the mean within this (ms), the spread under that. */
export const NOVICE_MEAN_MS = 90;
export const NOVICE_SPREAD_MS = 80;
/**
 * D369: his one line on the timing after a take (I.1): praise first; within the aim only a suggestion
 * ("A shade early … you may"), never a demand; past it, what to do.
 */
export function toldTiming(x: LensStats): Said | null {
  if (x.timing.n < 3) return null;
  const m = x.timing.mean;
  if (Math.abs(m) <= 15) return { text: "On the pulse: within {n} ms.", vars: { n: Math.max(1, Math.abs(m)) } };
  if (Math.abs(m) <= NOVICE_MEAN_MS) return m < 0 ? { text: "Good. A shade early ({n} ms): you may let the note come to you.", vars: { n: -m } } : { text: "Good. A shade late ({n} ms): you may strike a little sooner, with the beat.", vars: { n: m } };
  return m < 0 ? { text: "Early by {n} ms. Let the note come to you.", vars: { n: -m } } : { text: "Late by {n} ms. Do not wait for the light.", vars: { n: m } };
}


export const PARTS: { id: PartId; title: string; english: string; phase: "A" | "B" | "later"; seal?: string; n?: number | string; sub?: string; track?: true }[] = [
  { id: "1", n: 1, title: "FIRST NOTES", english: "FIRST NOTES", sub: "ONE THUMB, THEN TWO, THEN WITH BACH", phase: "A", seal: "Your first notes, with both thumbs and with me. Next: high and low." },
  { id: "2", n: 2, title: "HIGH AND LOW", english: "HIGH AND LOW", sub: "YOUR THUMB DRAWS THE TUNE", phase: "A", seal: "Steps, jumps, repeats and runs: your thumbs draw the tune. Next: how long." },
  { id: "3", n: 3, title: "HOW LONG", english: "HOW LONG", sub: "THE SIGNS, ONE AT A TIME", phase: "A", seal: "Held, short, detached, legato, accented: you read my signs now. Next: playing with me." },
  // D379: Parts 4–6 rebuilt (Luigi's curriculum, in the owner's order: voices, time and breath, the graces).
  { id: "4", n: 4, title: "PLAYING WITH BACH", english: "PLAYING WITH BACH", sub: "VOICES, AND THE TUNE THAT COMES BACK", phase: "A", seal: "You can lead, answer and hold your line among three. Next: time and breath." },
  { id: "5", n: 5, title: "TIME AND BREATH", english: "TIME AND BREATH", sub: "WHERE THE MUSIC WAITS", phase: "A", seal: "You breathe, you linger, you let the end come. Next: shakes, sighs and slurs." },
  { id: "6", n: 6, title: "SHAKES, SIGHS AND SLURS", english: "SHAKES, SIGHS AND SLURS", sub: "THE GRACES, AND YOUR OWN COLOUR", phase: "A", seal: "Shakes, sighs, slurs and colour: the music is yours to shape. My fugues are waiting." },
  // D379: the fugue track (Glenn Gould's "So You Want to Write a Fugue?", 1963, lends it its name).
  { id: "F", n: "F", title: "SO YOU WANT TO PLAY A FUGUE?", english: "SO YOU WANT TO PLAY A FUGUE?", sub: "BACH, HIS KEYBOARDS, AND WHAT A FUGUE IS", phase: "A", track: true, seal: "You know what to listen for now. Go and play my fugues." },
  { id: "VI", title: "DAS HÖREN", english: "LISTENING", phase: "later" },
  { id: "VII", title: "DIE INSTRUMENTE", english: "THE FOUR INSTRUMENTS", phase: "later" },
  { id: "VIII", title: "DER VORTRAG", english: "PLAYING MUSIC", phase: "later" },
];
/** The parts built, in order. */
export const BUILT = PARTS.filter((p) => p.phase !== "later");
/** D373: a lesson's number as the tutorial shows it (the older parts numbered after the new: III.2 is 4.2). */
export function shownId(id: string): string {
  const [p, k] = id.split(".");
  const n = PARTS.find((x) => x.id === p)?.n;
  return n && k ? `${n}.${k}` : id;
}


/**
 * D373: the materials of Parts 1–3 (every note read from data/touch/: test/d373-tutorial.test.ts). Tempi
 * as crotchets a minute (the report's as a share of MORE BACH's: Invention 1 ♩ = 72, Invention 4 ♪ = 150,
 * Invention 8 ♩ = 84, Invention 12 ♩. = 55).
 */
/** Invention 1, the upper voice's first eight notes (seven quick notes, then a longer one), alone. */
const first8 = (bpm: number, o: Partial<Material> = {}) => ex(INV, RH, 1, 1, { bpm }, "Invention 1, upper voice, bar 1: the first eight notes", { solo: true, count: 8, notes: SUBJECT, widen: 2, ...o });

/** His lines over the screen in 1.1 (each with the part that glows). */
export const TOUR: { text: string; focus: "all" | "strips" | "box" | "notes" | "line" | "height" }[] = [
  { text: "Welcome. This is the screen you will play on. Let me show you its parts, one at a time.", focus: "all" },
  { text: "Hold the phone sideways. Your thumbs go here, on these two strips. Touch anywhere along them.", focus: "strips" },
  { text: "In the middle the music goes by, right to left. Each little bar is one note.", focus: "box" },
  { text: "The notes with a white border are yours. The thin ones are mine: I play them for you.", focus: "notes" },
  { text: "When one of your notes reaches the gold line, touch a strip. That plays it.", focus: "line" },
  { text: "A higher note: touch higher on the strip. A lower note: lower. Not exactly; just the right way.", focus: "height" },
];
/** 1.1's words over the strips while it waits for a touch on each. */
export const TOUR_TOUCH = ["TOUCH THE LEFT STRIP", "NOW THE RIGHT STRIP", "BOTH STRIPS ✓"];

/** The new tutorial (D373): Parts 1–3, fifteen lessons on Inventions 1, 4, 8 and 12. */
const COURSE: ManualLesson[] = [
  // PART 1 · FIRST NOTES · piano, metronome on, the windows twice the game's
  {
    id: "1.1",
    part: "1",
    title: "THE PLAY SCREEN",
    english: "THE PLAY SCREEN",
    minutes: 1,
    sound: "piano",
    aim: "What each part of the play screen is for, and how a touch plays a note.",
    music: "INVENTION 1, PAUSED IN THE BOX",
    aids: ["thumbs"],
    stages: [st("tour", ex(INV, RH, 1, 2, { bpm: 30 }, "Invention 1, bars 1–2", { wait: true, widen: 2, notes: [...INV1_1_4.slice(0, 24)] }), "Six parts, one at a time.")],
    lens: { counts: ["Both strips touched"], shown: [], never: ["Anything else"] },
    before: [],
    after: ["That is the whole screen. Now a tune."],
    again: [],
  },
  {
    id: "1.2",
    part: "1",
    title: "THE LEFT THUMB ALONE",
    english: "THE LEFT THUMB ALONE",
    minutes: 3,
    sound: "piano",
    aim: "One touch plays one note, and your thumb climbs when the tune climbs.",
    music: "INVENTION 1, BAR 1",
    aids: ["thumbs", "rest"],
    stages: [
      st("watch", first8(30, { side: "left" }), "Watch my left thumb. One note, then one a little higher: it climbs with the music, and drops where the music drops.", { aids: ["thumbs", "count", "rest"] }),
      st("try", first8(30, { side: "left", wait: true }), "Now you, left thumb. Don't hurry: each note waits for you.", { aids: ["thumbs", "trace", "rest"] }),
      st("play", first8(30, { side: "left" }), "Now in time. I count four, then you begin. I'll go slowly."),
    ],
    lens: { counts: ["Notes: 6 of 8", "Moves the right way: 5 of 7"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.75), movesRight(x, 0.7)],
    before: ["Invention 1 begins with a little tune of eight notes. First your left thumb alone."],
    after: ["That was the first idea of my first Invention, and you just played it."],
    again: ["Slowly: one note at a time, up when the tune goes up. Again."],
  },
  {
    id: "1.3",
    part: "1",
    title: "THE RIGHT THUMB ALONE",
    english: "THE RIGHT THUMB ALONE",
    minutes: 3,
    sound: "piano",
    aim: "The same tune with your other thumb.",
    music: "INVENTION 1, BAR 1",
    aids: ["thumbs", "rest"],
    stages: [
      st("watch", first8(30, { side: "right" }), "The same tune, with my right thumb. Your left one rests.", { aids: ["thumbs", "count", "rest"] }),
      st("try", first8(30, { side: "right", wait: true }), "Now you, right thumb. Each note waits for you.", { aids: ["thumbs", "trace", "rest"] }),
      st("play", first8(30, { side: "right" }), "Now in time, right thumb. I count four, then you begin."),
    ],
    lens: { counts: ["Notes: 6 of 8", "Moves the right way: 5 of 7"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.75), movesRight(x, 0.7)],
    before: ["The same tune with your right thumb. You know it already: only the thumb is new."],
    after: ["Both thumbs know the tune now."],
    again: ["One note at a time, the right way. Again."],
  },
  {
    id: "1.4",
    part: "1",
    title: "TAKING TURNS",
    english: "TAKING TURNS",
    minutes: 4,
    sound: "piano",
    aim: "Your thumbs take turns, left, right, left, right: that is how quick notes are played.",
    music: "INVENTION 1, BAR 1",
    aids: ["thumbs", "plan"],
    stages: [
      st("watch", first8(30, { everyMark: true }), "Now both thumbs, taking turns. Under each note: ● one thumb, ○ the other, either way round.", { aids: ["thumbs", "plan"] }),
      st("try", first8(30, { wait: true, everyMark: true }), "Now you: start with either thumb, then the marks tell you when to change.", { aids: ["thumbs", "plan", "trace"] }),
      st("play", first8(30), "In time, taking turns. I count four."),
      st("play", first8(36), "A little quicker now. The same turns."),
    ],
    lens: { counts: ["Notes: 6 of 8", "Moves the right way: 5 of 7"], shown: ["Turns taken"], never: ["Which thumb (taking turns is praised, not required)"] },
    checks: (x): Check[] => [notesRight(x, 0.75), movesRight(x, 0.7)],
    shown: (x): Check[] => [{ text: "TURNS TAKEN {n} OF {m}", vars: { n: x.alternation.alt, m: x.alternation.of }, ok: true }],
    told: (x) => (x.alternation.of > 2 && x.alternation.alt / x.alternation.of >= 0.7 ? { text: "And you took turns on {n} of {m} quick notes. Good.", vars: { n: x.alternation.alt, m: x.alternation.of } } : null),
    before: ["Quick notes are easier with two thumbs, one after the other."],
    after: ["Two thumbs walk where one would stumble."],
    again: ["One thumb, then the other, as the marks say. Again."],
  },
  {
    id: "1.5",
    part: "1",
    title: "PLAYING WITH BACH",
    english: "PLAYING WITH BACH",
    minutes: 4,
    sound: "piano",
    aim: "You play one line and I play the other: I begin, and you answer me with the same tune.",
    music: "INVENTION 1, BARS 1–2",
    aids: ["thumbs", "answer"],
    stages: [
      st("watch", ex(INV, 1, 1, 2, { bpm: 43 }, "Invention 1, lower voice, bars 1–2", { notes: LOWER_1_2, widen: 2 }), "Watch the lower notes, the ones with a white border: that will be your part. My upper voice begins; yours answers.", { aids: ["thumbs", "answer"] }),
      st("play", ex(INV, 1, 1, 2, { bpm: 43 }, "Invention 1, lower voice, bars 1–2", { notes: LOWER_1_2, widen: 2 }), "I'll take the upper voice, and you take the lower one. On my count: I play my tune first; when it reaches you, answer with the same tune, lower down."),
    ],
    lens: { counts: ["Notes: 70%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.7)],
    before: ["Now we play together. The music has two lines, two voices: I play one, you play the other."],
    after: ["We just played my Invention together, two voices. You answered me."],
    again: ["Wait for my tune to reach the gold line, then answer it. Again."],
    checkpoint: true,
  },
  // PART 2 · HIGH AND LOW · your thumb draws the tune
  {
    id: "2.1",
    part: "2",
    title: "STEPS AND LEAPS",
    english: "STEPS AND LEAPS",
    minutes: 3,
    sound: "piano",
    aim: "A small move of the thumb for a step, a big one for a jump.",
    music: "INVENTION 8, BARS 1–2",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV8, 0, 1, 2, { bpm: 50 }, "Invention 8, upper voice, bars 1–2", { solo: true, notes: INV8_1_2, widen: 2 }), "Some notes jump and some walk. Watch: big moves for the jumps, small ones for the steps.", { aids: ["thumbs"] }),
      st("try", ex(INV8, 0, 1, 2, { bpm: 50 }, "Invention 8, upper voice, bars 1–2", { solo: true, notes: INV8_1_2, widen: 2, wait: true }), "Your turn: jump big, walk small. Each note waits for you.", { aids: ["thumbs", "trace"] }),
      st("play", ex(INV8, 0, 1, 2, { bpm: 50 }, "Invention 8, upper voice, bars 1–2", { solo: true, notes: INV8_1_2, widen: 2 }), "In time now. Jump big, walk small."),
    ],
    lens: { counts: ["Moves the right way: 80%", "Notes: 70%"], shown: [], never: ["How high exactly", "Which thumb"] },
    checks: (x): Check[] => [movesRight(x, 0.8), notesRight(x, 0.7)],
    before: ["A new tune, from my eighth Invention. It jumps first, then walks down."],
    after: ["Your thumb drew the jumps and the steps."],
    again: ["A jump must look like one; a step may be small. Again."],
  },
  {
    id: "2.2",
    part: "2",
    title: "THE SAME NOTE AGAIN",
    english: "THE SAME NOTE AGAIN",
    minutes: 3,
    sound: "piano",
    aim: "To play the same note again: lift your thumb, and land where you were.",
    music: "INVENTION 12, BAR 1",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV12, 0, 1, 1, { bpm: 50 }, "Invention 12, upper voice, bar 1", { solo: true, count: 5, notes: ["A4", "A4", "A4", "A4", "B4"], widen: 2 }), "Four times the same note. Watch: I lift my thumb, and land where I was.", { aids: ["thumbs"] }),
      st("try", ex(INV12, 0, 1, 1, { bpm: 50 }, "Invention 12, upper voice, bar 1", { solo: true, count: 5, notes: ["A4", "A4", "A4", "A4", "B4"], widen: 2, wait: true }), "Your turn. Lift, and land in the same place.", { aids: ["thumbs", "trace"] }),
      st("play", ex(INV12, 0, 1, 1, { bpm: 50 }, "Invention 12, upper voice, bar 1", { solo: true, count: 5, notes: ["A4", "A4", "A4", "A4", "B4"], widen: 2 }), "In time: long, short, long, short, then a long note a little higher."),
    ],
    lens: { counts: ["Repeats: 3 of 3", "Notes: 4 of 5"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [
      { text: "REPEATS {n} OF {m}", vars: { n: x.repeats.ok, m: x.repeats.of }, ok: x.repeats.of > 0 && x.repeats.ok >= x.repeats.of, fix: C.fixRepeats(x) },
      notesRight(x, 0.8),
    ],
    before: ["My twelfth Invention begins on one note, four times. Each time is a new touch."],
    after: ["Each one heard: lift, and land again."],
    again: ["Lift your thumb, and land where you were. Again."],
  },
  {
    id: "2.3",
    part: "2",
    title: "QUICK RUNS",
    english: "QUICK RUNS",
    minutes: 3,
    sound: "piano",
    aim: "In a quick run, keep your thumbs moving the run's way, and don't worry about each note.",
    music: "INVENTION 4, BARS 1–2",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV4, 0, 1, 1, { bpm: 37.5 }, "Invention 4, upper voice, bar 1: six quick notes up", { solo: true, count: 6, notes: INV4_1, widen: 2 }), "Six quick notes going up. Watch: one movement, up and up.", { aids: ["thumbs"] }),
      st("try", ex(INV4, 0, 1, 1, { bpm: 37.5 }, "Invention 4, upper voice, bar 1: six quick notes up", { solo: true, count: 6, notes: INV4_1, widen: 2, wait: true }), "Your turn: keep going up. Each note waits for you.", { aids: ["thumbs", "trace"] }),
      st("play", ex(INV4, 0, 1, 1, { bpm: 37.5 }, "Invention 4, upper voice, bar 1: six quick notes up", { solo: true, count: 6, notes: INV4_1, widen: 2 }), "In time. A run is one movement: don't stop to aim at each note."),
      st("play", ex(INV4, 0, 1, 2, { bpm: 52.5 }, "Invention 4, upper voice, bars 1–2: up, then a drop, and down", { solo: true, notes: INV4_1_2, widen: 2 }), "Now up, then a big drop, and back down. Keep going the run's way."),
    ],
    lens: { counts: ["Moves the run's way: 80%", "Notes: 70%"], shown: [], never: ["Which thumb", "Each note's exact place"] },
    checks: (x): Check[] => [movesRight(x, 0.8), notesRight(x, 0.7)],
    before: ["My fourth Invention starts with a quick run up."],
    after: ["One movement, the run's way. Runs are yours."],
    again: ["Don't aim at each note: keep moving the run's way. Again."],
  },
  {
    id: "2.4",
    part: "2",
    title: "CHECK: A WHOLE PHRASE",
    english: "CHECK: A WHOLE PHRASE",
    minutes: 3,
    sound: "piano",
    aim: "Steps, jumps and quick notes together, in a whole phrase with me.",
    music: "INVENTION 8, BARS 1–4",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV8, 0, 1, 4, { bpm: 59 }, "Invention 8, upper voice, bars 1–4, with the lower voice", { notes: INV8_1_4, widen: 2 }), "A whole phrase. Watch the jumps, the steps and the quick notes.", { aids: ["thumbs"] }),
      st("play", ex(INV8, 0, 1, 4, { bpm: 59 }, "Invention 8, upper voice, bars 1–4, with the lower voice", { notes: INV8_1_4, widen: 2 }), "A whole phrase now. I'll play the lower voice with you."),
    ],
    lens: { counts: ["Notes: 75%"], shown: [], never: ["Which thumb", "How long you hold"] },
    checks: (x): Check[] => [notesRight(x, 0.75)],
    before: ["Everything so far, in one phrase of my eighth Invention."],
    after: ["A whole phrase, with me beside you."],
    again: ["Hear the tune in your head first; then play. Again."],
    checkpoint: true,
  },
  // PART 3 · HOW LONG · the signs, one at a time (D370's vocabulary)
  {
    id: "3.1",
    part: "3",
    title: "HELD",
    english: "HELD",
    minutes: 3,
    sound: "organ",
    sign: "held",
    aim: "To keep your thumb down as long as the note's block lasts.",
    music: "INVENTION 1, BAR 1",
    aids: ["thumbs", "fill"],
    words: ["held", "short"],
    stages: [
      st("watch", ex(INV, RH, 1, 1, { bpm: 36 }, "Invention 1, upper voice, bar 1: the four longer notes", { solo: true, skip: 7, count: 5, notes: ["G4", "C5", "B4", "C5", "D5"] }), "Watch: my thumb stays down until the next note starts.", { style: "held", aids: ["thumbs", "fill"] }),
      st("try", ex(INV, RH, 1, 1, { bpm: 36 }, "Invention 1, upper voice, bar 1: the four longer notes", { solo: true, skip: 7, count: 5, notes: ["G4", "C5", "B4", "C5", "D5"], wait: true }), "Your turn. Hold each one; the next waits for you.", { aids: ["thumbs", "fill", "trace"] }),
      st("play", ex(INV, RH, 1, 1, { bpm: 36 }, "Invention 1, upper voice, bar 1: the four longer notes", { solo: true, skip: 7, count: 5, notes: ["G4", "C5", "B4", "C5", "D5"] }), "These four notes are longer. Keep your thumb down until the next one starts."),
    ],
    lens: { counts: ["Held: 3 of 4"], shown: [], never: ["Which thumb"] },
    checks: (x): Check[] => [{ text: "HELD {n} OF {m}", vars: { n: x.held.ok, m: x.held.of }, ok: x.held.of > 0 && x.held.ok >= Math.min(3, x.held.of), fix: C.fixHeld(x) }, notesRight(x, 0.6)],
    before: ["How long is a note? As long as your thumb stays down. Here the pipe organ: on the organ you hear exactly how long you hold."],
    after: ["Held: you hear the whole note now."],
    again: ["Keep your thumb down until the next note starts. Again."],
  },
  {
    id: "3.2",
    part: "3",
    title: "SHORT",
    english: "SHORT",
    minutes: 3,
    sound: "piano",
    sign: "short",
    aim: "The SHORT sign: touch and let go early; only the filled part of the block sounds.",
    music: "INVENTION 8, BAR 1",
    aids: ["thumbs"],
    words: ["short"],
    stages: [
      st("watch", ex(INV8, 0, 1, 1, { bpm: 50 }, "Invention 8, upper voice: the jumps, each SHORT", { solo: true, count: 7, notes: INV8_1_2.slice(0, 7), marks: ["short", "short", "short", "short", "short", "short", null] }), "See the half-empty blocks? Watch: touch, and let go.", { aids: ["thumbs"] }),
      st("try", ex(INV8, 0, 1, 1, { bpm: 50 }, "Invention 8, upper voice: the jumps, each SHORT", { solo: true, count: 7, notes: INV8_1_2.slice(0, 7), marks: ["short", "short", "short", "short", "short", "short", null], wait: true }), "Your turn: touch and let go.", { aids: ["thumbs", "trace"] }),
      st("play", ex(INV8, 0, 1, 1, { bpm: 50 }, "Invention 8, upper voice: the jumps, each SHORT", { solo: true, count: 7, notes: INV8_1_2.slice(0, 7), marks: ["short", "short", "short", "short", "short", "short", null] }), "Play those notes short: touch and let go."),
    ],
    lens: { counts: ["Short: 4 of 6", "Moves the right way: 80%"], shown: [], never: ["Which thumb"] },
    checks: (x): Check[] => [{ text: "SHORT {n} OF {m}", vars: { n: x.marks.short.ok, m: x.marks.short.of }, ok: x.marks.short.ok >= 4, fix: { text: "Let go sooner: before three fifths of the block." } }, movesRight(x, 0.8)],
    before: ["A block half empty is a SHORT note: only the filled part sounds."],
    after: ["Short and light. You read the sign."],
    again: ["Touch, and let go at once. Again."],
  },
  {
    id: "3.3",
    part: "3",
    title: "DETACHED AND LEGATO",
    english: "DETACHED AND LEGATO",
    minutes: 4,
    sound: "piano",
    sign: "joined",
    aim: "DETACHED: a small silence before the next note. LEGATO: no gap, the next thumb lands as this one lifts.",
    music: "INVENTION 1, BAR 1",
    aids: ["thumbs", "plan"],
    words: ["legato"],
    stages: [
      st("watch", ex(INV, RH, 1, 1, { bpm: 36 }, "Invention 1, upper voice, bar 1: the quick notes LEGATO, the longer ones DETACHED", { solo: true, count: 12, notes: [...SUBJECT, "C5", "B4", "C5", "D5"], marks: ["joined", "joined", "joined", "joined", "joined", "joined", "detached", "detached", "detached", "detached", "detached", null] }), "Watch: where the blocks meet, the next thumb lands as I lift: no gap. Where there is a gap, a small silence first.", { aids: ["thumbs", "plan"] }),
      st("try", ex(INV, RH, 1, 1, { bpm: 36 }, "Invention 1, upper voice, bar 1: the quick notes LEGATO, the longer ones DETACHED", { solo: true, count: 12, notes: [...SUBJECT, "C5", "B4", "C5", "D5"], marks: ["joined", "joined", "joined", "joined", "joined", "joined", "detached", "detached", "detached", "detached", "detached", null], wait: true }), "Your turn. Legato: the next thumb lands as this one lifts. A gap: a small silence.", { aids: ["thumbs", "plan"] }),
      st("play", ex(INV, RH, 1, 1, { bpm: 36 }, "Invention 1, upper voice, bar 1: the quick notes LEGATO, the longer ones DETACHED", { solo: true, count: 12, notes: [...SUBJECT, "C5", "B4", "C5", "D5"], marks: ["joined", "joined", "joined", "joined", "joined", "joined", "detached", "detached", "detached", "detached", "detached", null] }), "Where the blocks meet, no gap: the next thumb lands as this one lifts. Where there is a gap, leave a small silence."),
    ],
    lens: { counts: ["Legato and gaps as asked: 70%"], shown: [], never: ["Which thumb"] },
    checks: (x): Check[] => {
      const ok = x.marks.joined.ok + x.marks.apart.ok;
      const of = x.marks.joined.of + x.marks.apart.of;
      return [{ text: "AS ASKED {n} OF {m}", vars: { n: ok, m: of }, ok: atLeast(ok, of, 0.7), fix: x.marks.joined.of && x.marks.joined.ok / x.marks.joined.of < 0.7 ? { text: "Legato: land the next thumb as you lift the other, no gap." } : { text: "Detached: a small silence before the next note." } }, notesRight(x, 0.6)];
    },
    before: ["A gap between two blocks: DETACHED. Blocks meeting, no gap: LEGATO."],
    after: ["Legato where I join, a small silence where I separate. You read them both."],
    again: ["Legato: the next thumb lands as this one lifts. A gap: a small silence. Again."],
  },
  {
    id: "3.4",
    part: "3",
    title: "LEGATO THE EASY WAY",
    english: "LEGATO THE EASY WAY",
    minutes: 3,
    sound: "piano",
    aim: "A trick for legato: rest the free thumb on the next note early; lifting the other one sounds it, with no gap.",
    music: "INVENTION 4, BAR 1",
    aids: ["thumbs", "plan", "prepared"],
    words: ["legato"],
    stages: [
      st("watch", ex(INV4, 0, 1, 1, { bpm: 37.5 }, "Invention 4, upper voice, bar 1: the run, LEGATO", { solo: true, count: 7, notes: [...INV4_1, "C♯4"], marks: ["joined", "joined", "joined", "joined", "joined", "joined", null] }), "Watch: while one thumb holds, I rest the other on the next note. When I lift the first, the next one sounds by itself.", { style: "prepared", aids: ["thumbs", "plan", "prepared"] }),
      st("try", ex(INV4, 0, 1, 1, { bpm: 37.5 }, "Invention 4, upper voice, bar 1: the run, LEGATO", { solo: true, count: 7, notes: [...INV4_1, "C♯4"], marks: ["joined", "joined", "joined", "joined", "joined", "joined", null], wait: true }), "Your turn. Rest the free thumb on the next note, then lift the other.", { aids: ["thumbs", "plan", "prepared"] }),
      st("play", ex(INV4, 0, 1, 1, { bpm: 37.5 }, "Invention 4, upper voice, bar 1: the run, LEGATO", { solo: true, count: 7, notes: [...INV4_1, "C♯4"], marks: ["joined", "joined", "joined", "joined", "joined", "joined", null] }), "In time. Legato by preparing, or by striking as the other lifts: either way."),
    ],
    lens: { counts: ["Legato: 60%", "Notes: 70%"], shown: ["Notes sounded by a lift"], never: ["Which way you play legato"] },
    checks: (x): Check[] => [{ text: "LEGATO {n} OF {m}", vars: { n: x.marks.joined.ok, m: x.marks.joined.of }, ok: atLeast(x.marks.joined.ok, x.marks.joined.of, 0.6), fix: { text: "Rest the free thumb on the next note before you lift the other." } }, notesRight(x, 0.7)],
    shown: (x): Check[] => [{ text: "SOUNDED BY A LIFT {n}", vars: { n: x.prep.pullOffs }, ok: true }],
    before: ["Legato with two thumbs is easier with a trick. I'll show you."],
    after: ["Prepared, and lifted: the easy way to legato."],
    again: ["While one thumb holds, rest the other on the next note. Again."],
  },
  {
    id: "3.5",
    part: "3",
    title: "ACCENT",
    english: "ACCENT",
    minutes: 3,
    sound: "piano",
    sign: "accent",
    aim: "To make a note stand out on the piano, press it harder, on time: land it in the strong zone of the bar, by the box.",
    music: "INVENTION 8, BARS 1–3",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV8, 0, 1, 3, { bpm: 50 }, "Invention 8, upper voice, bars 1–3: the top notes ACCENTED", { solo: true, notes: INV8_1_3, marks: INV8_1_3.map((_, k) => (k === 5 || k === 20 ? "accent" : null)) }), "Watch the top notes: I land them by the box, in the strong zone, right on the beat: heavier, not later.", { style: "accent", aids: ["thumbs"] }),
      st("try", ex(INV8, 0, 1, 3, { bpm: 50 }, "Invention 8, upper voice, bars 1–3: the top notes ACCENTED", { solo: true, notes: INV8_1_3, marks: INV8_1_3.map((_, k) => (k === 5 || k === 20 ? "accent" : null)), wait: true }), "Your turn. Land each top note by the box, on time.", { aids: ["thumbs", "trace"] }),
      st("play", ex(INV8, 0, 1, 3, { bpm: 50 }, "Invention 8, upper voice, bars 1–3: the top notes ACCENTED", { solo: true, notes: INV8_1_3, marks: INV8_1_3.map((_, k) => (k === 5 || k === 20 ? "accent" : null)) }), "To make the top note stand out, land it in the strong zone, by the box, on the beat."),
    ],
    lens: { counts: ["Accents: 1 of 2", "Notes: 70%"], shown: [], never: ["Loudness"] },
    checks: (x): Check[] => [{ text: "ACCENTS {n} OF {m}", vars: { n: x.marks.accent.ok, m: x.marks.accent.of }, ok: x.marks.accent.of > 0 && x.marks.accent.ok >= 1, fix: { text: "Land the accent by the box, in the strong zone, on time." } }, notesRight(x, 0.7)],
    before: ["A small wedge at the front of a block: ACCENT. On the piano you play it heavier, on time: the bar's third by the box is its strong zone."],
    after: ["The top notes stood out, weighted and on time. That is an accent."],
    again: ["The top note by the box, on the beat. Again."],
  },
  {
    id: "3.6",
    part: "3",
    title: "CHECK: YOUR OWN TOUCH",
    english: "CHECK: YOUR OWN TOUCH",
    minutes: 3,
    sound: "piano",
    aim: "To choose your own touch, legato (no gap) or detached, and keep it the same all the way.",
    music: "INVENTION 1, BARS 1–4",
    aids: ["thumbs"],
    stages: [
      st("watch", ex(INV, RH, 1, 4, { bpm: 43 }, "Invention 1, upper voice, bars 1–4, no signs", { notes: INV1_1_4 }), "No signs this time. Watch: I choose one touch, and keep it.", { style: "ordinary", aids: ["thumbs"] }),
      st("play", ex(INV, RH, 1, 4, { bpm: 43 }, "Invention 1, upper voice, bars 1–4, no signs", { notes: INV1_1_4 }), "No signs this time. Join or separate as you like, but keep it the same all the way."),
    ],
    lens: { counts: ["Touch kept: 70%", "Notes: 75%"], shown: ["Your touch"], never: ["Which touch you choose"] },
    checks: (x): Check[] => [consistency(x), notesRight(x, 0.75)],
    shown: (x): Check[] => [touchLine(x)],
    before: ["Four bars of my first Invention, with no signs: the touch is yours."],
    after: ["Your own touch, kept. You can read and play my Inventions now."],
    again: ["Choose one touch, and keep it. Again."],
    checkpoint: true,
  },
];

export const MANUAL: ManualLesson[] = [
  ...COURSE,
  // D379: Parts 4–6 rebuilt (voices, time and breath, the graces), and the fugue track.
  ...COURSE2,
  ...FUGUE_TRACK,
];

export const lessonById = (id: string): ManualLesson | undefined => MANUAL.find((l) => l.id === id);
/** D379: a lesson by its id, the retired older parts' too (their tests' engine checks; never offered). */
export const anyLessonById = (id: string): ManualLesson | undefined => lessonById(id) ?? RETIRED.find((l) => l.id === id);
export const lessonsOf = (p: PartId) => MANUAL.filter((l) => l.part === p);
/** The part's checkpoint (its last lesson marked so), if it has one. */
export const checkpointOf = (p: PartId) => MANUAL.find((l) => l.part === p && l.checkpoint);
/** The lessons played on the bars (D373: all of them; 1.1's tour too runs on the real play screen). */
export const PLAYED = MANUAL;
/** D373: "C4", "B♭4", "F♯4" as MIDI. */
export function midiOf(name: string): number {
  const m = /^([A-G])([♭♯b#]?)(-?\d)$/.exec(name);
  if (!m) return 60;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as "C"];
  const acc = m[2] === "♭" || m[2] === "b" ? -1 : m[2] === "♯" || m[2] === "#" ? 1 : 0;
  return 12 * (Number(m[3]) + 1) + base + acc;
}

/** D373: a lesson of the new tutorial (WATCH, TRY, PLAY), not of the older parts. */
export const isCourse = (l: ManualLesson) => l.stages.some((s) => s.kind === "watch" || s.kind === "try" || s.kind === "tour" || s.kind === "listen" || s.kind === "spot" || s.kind === "quiz");
/** D373: the step's name on its chip. D379: LISTEN, SPOT, QUIZ. */
export const STEP_WORD: Record<StageKind, string> = { watch: "WATCH", try: "TRY", play: "PLAY", tour: "TOUR", drill: "PRACTICE", listen: "LISTEN", spot: "SPOT", quiz: "QUIZ" };
/** D379: the steps a lesson is judged by (a PLAY, a SPOT, a QUIZ); the last of them decides the lesson. */
export const isJudged = (k: StageKind) => k === "play" || k === "spot" || k === "quiz";
export const decider = (l: ManualLesson) => l.stages.map((s) => isJudged(s.kind)).lastIndexOf(true);
/** D379: the steps his own playing fills (WATCH, LISTEN, SPOT: he plays; the player watches, listens or taps). */
export const heHears = (k: StageKind) => k === "watch" || k === "listen" || k === "spot";

/**
 * D379, SPOT: where the tune comes in within a material: the entries (subject or answer) that begin in its
 * span, in any voice (one tick each: entries at the same moment count once).
 */
export function spotEntries(m: Material): number[] {
  const f = fugueById(m.piece);
  const { from, until } = spanOf(m);
  return [...new Set(f.entries.filter((e) => e.on >= from && e.on < until).map((e) => e.on))].sort((a, b) => a - b);
}
/** D379, SPOT: a tap counts for an entry from a quarter of a beat before it to a beat and a half after (a listener hears, then taps). */
export const SPOT_BEFORE = 0.25;
export const SPOT_AFTER = 1.5;
/**
 * D379, SPOT: the taps (ticks) against the entries: each tap takes the earliest entry not yet found whose
 * window holds it; a tap that finds none is stray (a second tap for one entry too). Never loudness, never
 * the music's: only where the taps fell.
 */
export function spotJudge(entries: number[], taps: number[], beat: number): { spotted: number; of: number; strays: number; found: number[] } {
  const found: number[] = [];
  let strays = 0;
  for (const t of [...taps].sort((a, b) => a - b)) {
    const e = entries.find((on) => !found.includes(on) && t >= on - SPOT_BEFORE * beat && t <= on + SPOT_AFTER * beat);
    if (e === undefined) strays++;
    else found.push(e);
  }
  return { spotted: found.length, of: entries.length, strays, found };
}
/** D379: a SPOT step passed: at least `need` found, at most `strays` stray. */
export const spotPassed = (st: Stage, r: { spotted: number; strays: number }) => !!st.spot && r.spotted >= st.spot.need && r.strays <= st.spot.strays;
/** D360: the stage whose pass passes the lesson (the last PLAY), and the first PLAY (STRAIGHT TO PLAY). */
export const lastPlay = (l: ManualLesson) => l.stages.map((s) => s.kind).lastIndexOf("play");
export const firstPlay = (l: ManualLesson) => l.stages.findIndex((s) => s.kind === "play");

/** A lesson passed by this run of its last PLAY: every COUNTS line met (no pass mark: played through). */
export function lessonPassed(l: ManualLesson, x: LensStats, failed = false): boolean {
  if (failed) return false;
  return l.checks ? l.checks(x, l.stages[lastPlay(l)]).every((c) => c.ok) : true;
}
/** A stage passed: a PLAY by every line; a DRILL by the lines it has something to measure (at least one). */
export function stagePassed(l: ManualLesson, kind: Stage["kind"], x: LensStats, k?: number): boolean {
  const s = k === undefined ? undefined : l.stages[k];
  if (!l.checks) return true;
  if (kind === "play") return l.checks(x, s ?? l.stages[lastPlay(l)]).every((c) => c.ok);
  const cs = l.checks(x, s).filter((c) => !c.na);
  return cs.length > 0 && cs.every((c) => c.ok);
}
/** D359: what Herr Bach says when a take falls short: the first unmet line's fix, else the lesson's own line. */
export function fixFor(l: ManualLesson, x: LensStats, k?: number): Said | null {
  const s = k === undefined ? undefined : l.stages[k];
  // When most notes went astray, the notes first (a lean or a breath is not the point yet).
  if (l.checks && x.of > 0 && x.accuracy < 0.6) return C.fixRight(x);
  const miss = (l.checks?.(x, s) ?? []).find((c) => !c.ok && !c.na && c.fix);
  return miss?.fix ?? null;
}

/** Crotchets a minute for a material. */
export function bpmOf(m: Material): number {
  return "bpm" in m.tempo ? m.tempo.bpm : Math.round(tempoOf(m.piece) * m.tempo.pct) / 100;
}

/** A material's span in ticks: from its first bar's line to the note its last bar leads to (inclusive; D289), or the piece's end. */
export function spanOf(m: Material): { from: number; until: number } {
  const f = fugueById(m.piece);
  const bar = barStart(f, m.fromBar);
  // D373: a passage of so many notes, perhaps after so many (from the first bar's line).
  if (m.skip || m.count) {
    const ns = f.voices[m.voice].filter((n) => n[0] >= bar);
    const a = ns[m.skip ?? 0];
    const b = m.count ? ns[(m.skip ?? 0) + m.count - 1] : undefined;
    const from = m.skip && a ? a[0] : bar;
    if (b) return { from, until: b[0] + 1 };
    const lastBar = f.bars.at(-1)?.n ?? 1;
    if (m.toBar >= lastBar) return { from, until: f.length };
    const cut = barStart(f, m.toBar + 1);
    const arrival = f.voices[m.voice].find((n) => n[0] >= cut);
    return { from, until: arrival ? arrival[0] + 1 : cut };
  }
  const from = bar;
  const lastBar = f.bars.at(-1)?.n ?? 1;
  if (m.toBar >= lastBar) return { from, until: f.length };
  const cut = barStart(f, m.toBar + 1);
  const arrival = f.voices[m.voice].find((n) => n[0] >= cut);
  return { from, until: arrival ? arrival[0] + 1 : cut };
}

/** The sound a stage plays on: its own, else its lesson's (decision 4). */
export const soundOf = (l: ManualLesson, m?: Material): SoundName => m?.sound ?? l.sound ?? "harpsichord";

/** Every English text the manual shows (for the translations' check). */
export function manualTexts(): string[] {
  const out: string[] = [...MANUAL_FLOW, ...Object.values(SOUND_WORD), ...C.coachTexts(), ...WATCH_WORDS];
  for (const p of PARTS) out.push(p.english, ...(p.seal ? [p.seal] : []), ...(p.sub ? [p.sub] : []));
  out.push(...TOUR.map((t) => t.text), ...TOUR_TOUCH, ...Object.values(STEP_WORD), ...COURSE_FLOW);
  // D402: the screen's elements introduced, and THE REAL THING's tour.
  out.push(...DRESS_TEXTS);
  const xs = [-120, -40, 0, 40, 120].map((mean) => ({ ...ZERO_LENS, timing: { n: 9, mean, sd: 20, perfect: 5 } }));
  for (const l of MANUAL) {
    out.push(l.english, l.aim, ...(l.learn ? [l.learn] : []), ...(l.music ? [l.music] : []), ...l.before, ...l.after, ...l.again, ...l.lens.counts, ...l.lens.shown, ...l.lens.never, ...l.stages.map((s) => s.m.label), ...l.stages.flatMap((s) => (s.say ? [s.say] : [])));
    // D379: a QUIZ's question, answers and his reasons.
    for (const s of l.stages) if (s.quiz) out.push(s.quiz.ask, ...s.quiz.answers.flatMap((a) => [a.text, a.why]));
    if (l.alt) out.push(l.alt.label);
    for (const x of [...xs, { ...ZERO_LENS, graces: { agogic: 1, breath: 0, broaden: 0, revoked: 0 } }, { ...ZERO_LENS, graces: { agogic: 0, breath: 1, broaden: 0, revoked: 0 } }, ...[0, 1, 2, 5].map((free) => ({ ...ZERO_LENS, orn: { read: 0, of: 2, free, kinds: [] } })), ...[0.2, 0.5, 0.8].map((s) => ({ ...ZERO_LENS, appo: { of: 3, made: 1, short: 0, shares: [s] } })), ...[0, 3].map((n) => ({ ...ZERO_LENS, colour: { firm: n, soft: n, of: 8 }, slides: n, rings: { ok: n, of: 6 }, sighs: { ok: n, of: 3 } }))])
      for (const s of [undefined, ...l.stages]) {
        out.push(...[...(l.checks?.(x, s) ?? []), ...(l.shown?.(x, s) ?? [])].map((c) => c.text));
        const t = l.told?.(x);
        if (t) out.push(t.text);
      }
  }
  return out;
}

/** D359: the demonstration's manners, named in the hint while Herr Bach plays. */
export const WATCH_WORDS = ["WATCH THE THUMBS", "WATCH · DETACHED", "WATCH · LEGATO", "WATCH · ORDINARY", "WATCH · ONE THUMB", "WATCH · PREPARED", "WATCH · HELD", "WATCH · ACCENTS", "WATCH · LEANING", "WATCH · BREATHING", "WATCH · BROADENING", "WATCH · HELD OVER"];
export const watchWord = (s?: DemoStyle) =>
  ({ detached: "WATCH · DETACHED", legato: "WATCH · LEGATO", ordinary: "WATCH · ORDINARY", "one-thumb": "WATCH · ONE THUMB", prepared: "WATCH · PREPARED", held: "WATCH · HELD", accent: "WATCH · ACCENTS", lean: "WATCH · LEANING", breath: "WATCH · BREATHING", broaden: "WATCH · BROADENING", appoggiatura: "WATCH · HELD OVER", plain: "WATCH THE THUMBS" })[s ?? "plain"];

/** THE MANUAL's own lines and buttons between the steps (BenchApp's flow), for the translations' check. */
export const MANUAL_FLOW = [
  "WHERE TO BEGIN?",
  "FROM THE BEGINNING",
  "WHERE YOU LEFT OFF",
  "Now you.",
  "Good. On to the next.",
  "Gut. On to the next.",
  "Once more, or go on: the drill is yours to leave.",
  "Play the checkpoint once. Pass it, and the part is yours.",
  "So. The part is yours: its lessons stay open to you.",
  "Not yet. Its lessons are open to you when you are ready.",
  "Then play me four short passages, one take each. About four minutes.",
  "PLAY",
  "GO ON",
  "TRY AGAIN",
  "WATCH AGAIN",
  "SKIP FOR NOW",
  "NEXT LESSON",
  "NEXT PART",
  "THE MANUAL",
  "THE LEFT HAND INSTEAD",
  "PART {p} · SEALED",
  "THE MANUAL · PARTS 0–IV",
  "Parts VI–VIII come in a later version. My fugues are open to you now.",
  "THE MANUAL · PARTS 0–V",
];

/** A take with nothing in it (the figures' shape, for the texts' check). */
export const ZERO_LENS: LensStats = {
  of: 10,
  right: 0,
  accuracy: 0,
  struck: 0,
  timing: { n: 0, mean: 0, sd: 0, perfect: 0 },
  direction: { ok: 0, of: 0 },
  repeats: { ok: 0, of: 0, doubles: 0, gaps: [] },
  held: { ok: 0, of: 0 },
  rests: { ok: 0, of: 0 },
  alternation: { alt: 0, of: 0 },
  joins: { ok: 0, of: 0 },
  prep: { pullOffs: 0, hammerOns: 0, rests: 0, letGo: 0, earlyMs: [] },
  runs: { ok: 0, of: 0, notesRight: 0, notesOf: 0, spreadMs: null },
  leaps: { ok: 0, of: 0, left: 0, right: 0 },
  touch: { style: null, ok: 0, of: 0 },
  words: {},
  last: { hit: false, word: null },
  per: [],
  marks: { joined: { ok: 0, of: 0 }, apart: { ok: 0, of: 0 }, short: { ok: 0, of: 0 }, accent: { ok: 0, of: 0 } },
  graces: { agogic: 0, breath: 0, broaden: 0, revoked: 0 },
  dotted: { perfect: 0, of: 0 },
  ties: { held: 0, of: 0 },
  orn: { read: 0, of: 0, free: 0, kinds: [] },
  appo: { of: 0, made: 0, short: 0, shares: [] },
  colour: { firm: 0, soft: 0, of: 0 },
  slides: 0,
  rings: { ok: 0, of: 0 },
  sighs: { ok: 0, of: 0 },
};

/** "{n} min" etc.: a lesson's line on the map. */
export const lessonMeta = (l: ManualLesson) => `${l.minutes} MIN${l.sound ? ` · ${tr(SOUND_WORD[l.sound])}` : ""}`;

/**
 * D369: the lessons' metronome: a soft click on every beat for the whole take (the game has none past the
 * count-in since D346; the owner wants it in the lessons), unless a drill asks for its own (I.1's fades).
 */
export const LESSON_CLICK = { full: Number.MAX_SAFE_INTEGER, gone: Number.MAX_SAFE_INTEGER, gain: 0.07 } as const;

/** A material as the game's run (lessons.ts Run): LADDER, no crowd, the drill's click (else the lessons' metronome, `click`), the demonstration's manner, the reading, the practice room. */
export function runOf(m: Material, demoStyle?: DemoStyle, words?: ManualLesson["words"], ornaments = false, click = true): Run {
  const { from, until } = spanOf(m);
  // D373: the lesson's own marks as a reading of its own, placed on the passage's notes.
  const lr = lessonReading(m, from, until);
  return {
    proto: "ladder",
    fail: false,
    piece: m.piece,
    voice: m.voice,
    from,
    until,
    bpm: bpmOf(m),
    wait: !!m.wait,
    solo: !!m.solo,
    easy: m.easy ?? "direction",
    ...(click ? { click: LESSON_CLICK } : {}),
    ...(demoStyle && demoStyle !== "plain" ? { demoStyle } : {}),
    ...(m.reading ? { reading: m.reading } : {}),
    quiet: { words: words ?? [], ...(ornaments ? { ornaments: true } : {}) },
    ...(ornaments ? { ornHint: true } : {}),
    // D379: his demonstration's landings and slides (6.4, 6.6), the SUBJECT flags (4.1 on), the temperament (F.3).
    ...(m.coach ? { coach: m.coach } : {}),
    ...(m.flags ? { flags: true } : {}),
    ...(m.tuning ? { tuning: m.tuning } : {}),
    // D373: the tutorial's options (one thumb, the lenient windows, four beats counted in, model A's thumbs).
    ...(isCourseMat(m)
      ? {
          tut: {
            ...(m.side ? { side: m.side } : {}),
            ...(m.everyMark ? { everyMark: true } : {}),
            ...(m.widen ? { widen: m.widen } : {}),
            ...(m.wait || !click ? {} : { countBeats: 4 }),
            thumbsA: true,
            ...(lr ? { reading: lr.reading, readingAt: lr.at } : {}),
          },
        }
      : {}),
  };
}

/** D373: a material of the new tutorial (its notes listed). */
const isCourseMat = (m: Material) => !!m.notes;

/** D373: the lesson's marks as a reading (one note per mark, from the passage's first note), and where each sits. */
export function lessonReading(m: Material, from: number, until: number): { reading: Reading; at: number[] } | null {
  if (!m.marks) return null;
  const f = fugueById(m.piece);
  const ns = f.voices[m.voice].filter((n) => n[0] >= from && n[0] < until).slice(0, m.marks.length);
  const notes = m.marks.map((k) => ({ join: k === "joined" ? true : k === "detached" ? false : null, short: k === "short" ? true : null, accent: k === "accent" ? true : null }));
  const reading: Reading = { id: "lesson", author: "BACH", work: "THE TUTORIAL", year: 1723, pages: null, tempo: null, tempoText: null, character: null, basis: "explicit", quote: null, notes, legato: false, slurs: [], level: null, shape: null, plan: [], restQuote: null, restSummary: null };
  return { reading, at: ns.map((n) => n[0]) };
}

/** D373: the new tutorial's own words between the steps (BenchApp's flow and the selection screen). */
export const COURSE_FLOW = [
  "TUTORIAL",
  "▶ WATCH",
  "▶ TRY",
  "▶ PLAY",
  "▶ TOUR",
  "WITH HERR BACH",
  "PART {n}",
  "You'll learn: {l}",
  "MUSIC",
  "SOUND",
  "TIME",
  "METRONOME ON",
  "ABOUT {n} MINUTES",
  "YOU STOPPED AT: {s}",
  "CONTINUE",
  "BEGIN",
  "AGAIN",
  "NEXT",
  "or START OVER",
  "NEXT ✦",
  "DONE ✓",
  "WATCH · BACH PLAYS",
  "TRY · I WAIT FOR YOU",
  "YOUR TURN · PLAY",
  "WATCH ONLY · DON'T TOUCH YET",
  "JUST WATCH FOR NOW",
  "REST",
  "THIS THUMB SITS OUT",
  "LEFT THUMB",
  "RIGHT THUMB",
  "YOUR TURN",
  "TRY",
  "WATCH",
  "TAP ▶",
  "{n} OF {m} MOVES THE RIGHT WAY.",
  "Good: {n} of {m} moves the right way. Now in time.",
  "Let's go on: we'll meet this again.",
  "LET'S GO ON",
  "Now you try, slowly.",
  "THE OLDER LESSONS",
  "A WHOLE PART DONE",
  "WHAT COUNTED",
  "HELD",
  "SHORT",
  "DETACHED",
  "LEGATO",
  "ACCENT",
  "Hold it until the next note begins.",
  "Lift before three fifths of the note: only the filled part sounds.",
  "A small silence before the next note.",
  "No gap: the next thumb lands as this one lifts.",
  "Weight on it: land by the box, on time.",
  "THE MUSIC MOVES THIS WAY",
  "YOURS: WHITE BORDER",
  "MINE: THIN",
  "NOW",
  "HIGHER NOTE: TOUCH HIGHER",
  "YOU ANSWER HERE",
  "NEXT: A LITTLE HIGHER",
  "NEXT: A LITTLE LOWER",
  "NEXT: THE SAME NOTE",
  "NEXT: A BIG JUMP UP",
  "NEXT: A BIG JUMP DOWN",
  "GAP",
  "NO GAP",
  // His fixes and praise in the new lessons (said at run time).
  "And you took turns on {n} of {m} quick notes. Good.",
  "Land the accent by the box, in the strong zone, on time.",
  "Let go sooner: before three fifths of the block.",
  "Rest the free thumb on the next note before you lift the other.",
  "Legato: land the next thumb as you lift the other, no gap.",
  "Detached: a small silence before the next note.",
  // D379: LISTEN, SPOT, QUIZ; the fugue track; the colour map; the new lessons' fixes and lines said at run time.
  "▶ LISTEN",
  "▶ SPOT",
  "▶ QUIZ",
  "LISTEN · BACH PLAYS",
  "SPOT · TAP WHEN THE TUNE COMES IN",
  "JUST LISTEN",
  "TAP WHEN IT COMES IN",
  "JUST LISTEN FOR NOW",
  "✓ THERE IT IS",
  "NOT A NEW ENTRY",
  "ENTRIES FOUND {n} OF {m} · STRAY TAPS {s}",
  "You found {n} of {m} entries.",
  "Tap only when the tune begins, not in between.",
  "Tap as the tune begins. Again.",
  "Now you, in time.",
  "THE FUGUE TRACK",
  "FIRM",
  "SOFT",
  "BY THE BOX: FIRM, BRIGHT",
  "BY THE EDGE: SOFT, DARK",
  "Land some notes right by the box, and some out by the edge of the phone.",
  "On each step down: the first note by the box, the second by the edge, or slide down to it.",
  "Keep the thumb down and slide it to the next note, without lifting.",
  "Lift the old thumb a moment after the new one lands, not before.",
  "Both shakes heard. Good.",
];

/** D373: what each sign looks like and asks (the card before a lesson of Part 3). */
export const SIGN_WORDS: Record<SignId, { name: string; text: string }> = {
  held: { name: "HELD", text: "Hold it until the next note begins." },
  short: { name: "SHORT", text: "Lift before three fifths of the note: only the filled part sounds." },
  detached: { name: "DETACHED", text: "A small silence before the next note." },
  joined: { name: "LEGATO", text: "No gap: the next thumb lands as this one lifts." },
  accent: { name: "ACCENT", text: "Weight on it: land by the box, on time." },
};
