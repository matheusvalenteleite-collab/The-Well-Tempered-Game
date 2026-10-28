/**
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
import type { LensStats } from "./lens.ts";
import { DRILLS } from "./drills.ts";
import type { Run } from "../lessons.ts";
import type { DemoManner, Options } from "../protos.ts";
import * as C from "./coach.ts";
import type { Said } from "./coach.ts";

export type PartId = "0" | "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
export type SoundName = "chip" | "harpsichord" | "organ" | "piano";
/** The sound each name plays on (sound.ts presets). D359: the organ is the PIPE ORGAN (D349), not the retired sampled organ. */
export const SOUND_PRESET: Record<SoundName, string> = { chip: "chip", harpsichord: "harpsichordSampled", organ: "chamberOrgan", piano: "pianoSampled" };
export const SOUND_WORD: Record<SoundName, string> = { chip: "CLASSIC CHIP", harpsichord: "HARPSICHORD", organ: "PIPE ORGAN", piano: "PIANO" };

/**
 * The visual aids (design 4.5), each for its lesson only. D342: dial, trace, repeat, fill, letters,
 * meter, prepared, trend. D360: breath (a comma over the box at each place the line may breathe).
 */
export type AidId = "dial" | "trace" | "repeat" | "fill" | "letters" | "meter" | "prepared" | "trend" | "breath";
export type DemoStyle = "plain" | DemoManner;
export type TouchName = "LEGATO" | "ORDINARY" | "DETACHED";

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
}

export interface Stage {
  /** A DRILL may be left after one take; a PLAY must be passed to go on, and the last PLAY decides the lesson. */
  kind: "drill" | "play";
  m: Material;
  /** D359: Herr Bach's one line before the stage: what it is for. */
  say?: string;
  /** D360 (III.1): the touch this take asks for. */
  ask?: TouchName;
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
  /** Herr Bach's title (German) and the English beneath it. */
  title: string;
  english: string;
  minutes: number;
  /** The lesson's sound (decision 4: the instrument that makes its rudiment audible). */
  sound?: SoundName;
  aim: string;
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
  /** Part 0's screen (0.1), not played on the bars. D369: 0.2, the placement, withdrawn (the owner: "Everybody is a novice"). */
  screen?: "grip";
}

const pctOf = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
const atLeast = (a: number, b: number, share: number) => b > 0 && a / b >= share - 1e-9;
/** The share right (of the notes, a stray strike half a note). */
const right = (x: LensStats, share: number): Check => ({ text: "RIGHT {p}% (AIM {a}%)", vars: { p: Math.round(100 * x.accuracy), a: Math.round(100 * share) }, ok: x.accuracy >= share - 1e-9 && x.of > 0, fix: C.fixRight(x) });
const meanWithin = (x: LensStats, ms: number): Check => ({ text: "MEAN TIMING {m} MS (AIM WITHIN ±{a})", vars: { m: !x.timing.n ? "—" : x.timing.mean > 0 ? `+${x.timing.mean}` : x.timing.mean, a: ms }, ok: x.timing.n > 0 && Math.abs(x.timing.mean) <= ms, fix: C.fixTiming(x) });
const perfectLine = (x: LensStats): Check => ({ text: "PERFECT {p}% · SPREAD {s} MS", vars: { p: pctOf(x.timing.perfect, x.timing.n), s: x.timing.sd }, ok: true });
const consistency = (x: LensStats, share = 0.7): Check => ({ text: "TOUCH KEPT {p}% (AIM {a}%)", vars: { p: pctOf(x.touch.ok, x.touch.of), a: Math.round(100 * share) }, ok: atLeast(x.touch.ok, x.touch.of, share), na: !x.touch.of, fix: C.fixConsistency(x) });
const touchLine = (x: LensStats): Check => ({ text: "YOUR TOUCH: {t}", vars: { t: x.touch.style ?? "—" }, ok: true });
/** D360 (Part V): the written signs read from the shake, of those in the passage; the player's own. */
const graceLine = (x: LensStats): Check => ({ text: "SIGNS READ {n} OF {m} · YOUR OWN {f}", vars: { n: x.orn.read, m: x.orn.of, f: x.orn.free }, ok: true });

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

/** A passage of the game's own, as a material. */
const ex = (piece: string, voice: number, fromBar: number, toBar: number, tempo: Material["tempo"], label: string, o: Partial<Material> = {}): Material => ({ piece, voice, fromBar, toBar, tempo, label, badge: "IN GAME", ...o });
/** A drill (drills.ts), whole, at its own tempo. */
const drill = (key: keyof typeof DRILLS & string, label: string, o: Partial<Material> = {}): Material => {
  const d = DRILLS[key];
  return { piece: d.id, voice: d.voice, fromBar: 1, toBar: d.piece.bars.length, tempo: { bpm: d.tempo }, wait: d.wait, solo: d.band.kind === "click" || d.band.kind === "none", label, badge: "DRILL", ...o };
};
const st = (kind: Stage["kind"], m: Material, say: string, o: Partial<Stage> = {}): Stage => ({ kind, m, say, ...o });

const INV = "inv01";
/**
 * D369: Invention 1 in Parts 0–II at 75% of the game's tempo (♩ = 45 where the game plays it at 60): the
 * owner, the first time it is heard and played, slower than standard; in the later parts at 80%.
 */
const SLOW_INV = 75;
const RH = 0;
const LH = 1;

export const PARTS: { id: PartId; title: string; english: string; phase: "A" | "B" | "later"; seal?: string }[] = [
  { id: "0", title: "VORBEREITUNG", english: "BEFORE THE FIRST NOTE", phase: "A" },
  { id: "I", title: "DER ANSCHLAG", english: "THE STRIKE", phase: "A", seal: "So. The strike is yours. Now let both thumbs work." },
  { id: "II", title: "ZWEI DAUMEN", english: "TWO THUMBS", phase: "A", seal: "Two thumbs, one voice. Next: how each note is spoken." },
  { id: "III", title: "DER VORTRAG DER NOTEN", english: "TOUCH AND ARTICULATION", phase: "B", seal: "Spoken, and kept. Next: where the music breathes." },
  { id: "IV", title: "ZEIT UND ATEM", english: "TIME AND BREATH", phase: "B", seal: "Time and breath are yours. My fugues are waiting." },
  { id: "V", title: "DIE MANIEREN", english: "THE GRACES", phase: "B" },
  { id: "VI", title: "DAS HÖREN", english: "LISTENING", phase: "later" },
  { id: "VII", title: "DIE INSTRUMENTE", english: "THE FOUR INSTRUMENTS", phase: "later" },
  { id: "VIII", title: "DER VORTRAG", english: "PLAYING MUSIC", phase: "later" },
];
/** The parts built (Phase A and B), in order. */
export const BUILT = PARTS.filter((p) => p.phase !== "later");

const SOURCES_TOUCH = [
  "C. P. E. Bach, Versuch (1753), I, ch. 3 §22: plain quavers held about half their value.",
  "F. W. Marpurg, Anleitung zum Clavierspielen (1755), I, ch. 1, sect. 7: the finger lifted only just before the next note.",
  "D. G. Türk, Klavierschule (1789), ch. 6, sect. 3, §40: half value found choppy.",
  "J. N. Forkel (1802), ch. III: Bach's touch, neither too long nor too short.",
];

export const MANUAL: ManualLesson[] = [
  {
    id: "0.1",
    part: "0",
    title: "HALTUNG",
    english: "THE GRIP AND THE EARS",
    minutes: 2,
    sound: "piano",
    aim: "Phone sideways, one thumb on each bar, the sound in time with the touch.",
    aids: [],
    stages: [],
    lens: { counts: ["Nothing"], shown: ["The sound's delay found"], never: ["Anything else"] },
    before: ["Two thumbs and one voice. The rest of the music is mine to play."],
    after: [],
    again: [],
    screen: "grip",
  },
  // PART I · DER ANSCHLAG · THE STRIKE
  {
    id: "I.1",
    part: "I",
    title: "DER PULS",
    english: "PULSE AND ONSET",
    minutes: 4,
    sound: "piano",
    aim: "To strike with the music, by listening rather than by watching.",
    hear: { styles: ["plain"] },
    aids: ["dial"],
    stages: [
      st("drill", drill("schlaege", "Drill: one note, sixteen strikes; the click fades after eight", { easy: "timing" }), "Sixteen strikes on one note. After eight the click goes quiet: keep it going inside you."),
      st("play", ex(INV, RH, 1, 2, { pct: SLOW_INV }, "Invention 1, right hand, bars 1–2, at 75%", { easy: "timing" }), "Now my Invention. My left hand answers yours: keep the beat between us."),
    ],
    lens: { counts: ["Notes struck in their window: 85%", "Mean timing within ±90 ms", "Spread under 80 ms"], shown: ["PERFECT share"], never: ["Height", "Holds", "Articulation", "Colour", "Loudness"] },
    // D342: and the spread (a random tapper's mean is near zero too; design 4.10). D369: novice-friendly
    // (the owner: "I was early by 55ms … Bach is complaining like crazy and requiring me to repeat"):
    // the mean within ±90 ms (was ±50), the spread under 80 ms (was 70: a random tapper at this tempo
    // scatters 83–138 ms, so the ~110 first proposed would pass it on some seeds; it still fails).
    checks: (x): Check[] => [
      { text: "STRUCK IN TIME {p}% (AIM 85%)", vars: { p: pctOf(x.right, x.of) }, ok: atLeast(x.right, x.of, 0.85), fix: C.fixRight(x) },
      meanWithin(x, NOVICE_MEAN_MS),
      { text: "SPREAD {s} MS (AIM UNDER 80)", vars: { s: x.timing.n > 2 ? x.timing.sd : "—" }, ok: x.timing.n > 2 && x.timing.sd < NOVICE_SPREAD_MS, fix: C.fixSpread(x) },
    ],
    shown: (x): Check[] => [{ text: "PERFECT {p}%", vars: { p: pctOf(x.timing.perfect, x.timing.n) }, ok: true }],
    before: ["Strike with the music. Anywhere on the bar: here only the time counts.", "Listen to the other voice, not to the light on the glass."],
    after: ["Recht. The pulse is in you now."],
    again: ["Let the note come to you. Again."],
    // D369: praise first; a novice-good take only hears a suggestion.
    told: (x) => toldTiming(x),
    sources: ["B. H. Repp, Sensorimotor synchronization (2005): tappers anticipate the beat."],
  },
  {
    id: "I.2",
    part: "I",
    title: "SCHRITT UND SPRUNG",
    english: "STEP AND LEAP",
    minutes: 4,
    sound: "piano",
    aim: "To draw the line with the thumb: up when it rises, down when it falls, a step small and a leap clear.",
    hear: { styles: ["plain"] },
    aids: ["trace"],
    stages: [
      st("drill", drill("treppe", "Drill: C4 to G4 by steps and back, then by leaps (WAIT FOR ME)"), "Five steps up and back, then the same in leaps. I wait for you."),
      st("drill", ex(INV, RH, 1, 1, { pct: SLOW_INV }, "Invention 1, right hand, bar 1 (WAIT FOR ME)", { wait: true }), "My subject: steps, then a leap of a fourth. I wait for you."),
      st("drill", ex(INV, RH, 1, 1, { pct: SLOW_INV }, "Invention 1, right hand, bar 1, at 75%"), "The same bar, now in time."),
      st("play", ex("wtc1f20", 1, 1, 2, { pct: 80 }, "Fugue I/20 in A minor, alto, bars 1–2, at 80%"), "A darker line: it turns, then falls far. Draw it."),
    ],
    lens: { counts: ["Direction right: 90%", "Notes played: 70%"], shown: ["Timing"], never: ["The absolute height", "Which thumb", "Holds"] },
    checks: (x): Check[] => [
      { text: "DIRECTION RIGHT {p}% (AIM 90%)", vars: { p: pctOf(x.direction.ok, x.direction.of) }, ok: atLeast(x.direction.ok, x.direction.of, 0.9) && x.direction.of >= x.of / 2, fix: C.fixDirection(x) },
      { text: "NOTES PLAYED {p}% (AIM 70%)", vars: { p: Math.round(100 * x.accuracy) }, ok: x.accuracy >= 0.7, fix: C.fixRight(x) },
    ],
    shown: (x): Check[] => [perfectLine(x)],
    before: ["Higher when it rises, lower when it falls.", "How high is your affair, but a leap must look like one."],
    after: ["Gut. Your thumb drew the line."],
    again: ["A leap must look like one; a step may be small. Again."],
  },
  {
    id: "I.3",
    part: "I",
    title: "DIESELBE NOTE",
    english: "THE SAME NOTE AGAIN",
    minutes: 3,
    sound: "piano",
    aim: "To strike a note again: lift, then land level.",
    hear: { styles: ["one-thumb", "plain"] },
    aids: ["repeat"],
    stages: [
      st("drill", ex("wtc2f05", 2, 1, 3, { pct: 85 }, "Fugue II/5 in D major, tenor, bars 1–3, at 85%"), "Three Ds, a little slower than written. Lift between them."),
      st("drill", ex("wtc2f12", 0, 1, 2, { pct: 80 }, "Fugue II/12 in F minor, soprano, bars 1–2, at 80%"), "Three Fs, then three Es: each one lifted, each one new."),
      st("play", ex("wtc2f05", 2, 1, 3, { pct: 100 }, "Fugue II/5 in D major, tenor, bars 1–3"), "The Ds again, in time."),
    ],
    lens: { counts: ["Repeats right and struck: 90%", "Notes played: 70%"], shown: ["Doubles ignored"], never: ["Which thumb", "The release's length"] },
    // D342: and the notes played (a passage has only two or four repeats: chance alone could pass them).
    checks: (x): Check[] => [
      { text: "REPEATS RIGHT {n} OF {m} (AIM 90%)", vars: { n: x.repeats.ok, m: x.repeats.of }, ok: atLeast(x.repeats.ok, x.repeats.of, 0.9), na: !x.repeats.of, fix: C.fixRepeats(x) },
      { text: "NOTES PLAYED {p}% (AIM 70%)", vars: { p: Math.round(100 * x.accuracy) }, ok: x.accuracy >= 0.7, fix: C.fixRight(x) },
    ],
    // D359: the gap before a repeat is no longer shown (it read as a negative number when a thumb took over).
    shown: (x): Check[] => [{ text: "DOUBLES IGNORED {n}", vars: { n: x.repeats.doubles }, ok: true }],
    before: ["A word said twice is said twice: let go, then speak again."],
    after: ["So. Each word heard twice."],
    again: ["Lift, then land level where you were. Again."],
  },
  {
    id: "I.4",
    part: "I",
    title: "HALTEN UND LASSEN",
    english: "HOLDING AND LETTING GO",
    minutes: 3,
    sound: "piano",
    aim: "To give each note its length, and each rest its silence.",
    hear: { styles: ["held"] },
    aids: ["fill"],
    words: ["held", "rest", "short"],
    stages: [
      st("drill", ex("wtc2f09", 3, 1, 3, { pct: 70 }, "Fugue II/9 in E major, bass, bars 1–3, at 70%"), "Long notes in the old style. Stay on each until the next begins."),
      st("play", ex("wtc1f02", 0, 17, 19, { pct: 100 }, "Fugue I/2 in C minor, soprano, bars 17–19"), "Short figures, each after a rest. Lift where I rest."),
    ],
    lens: { counts: ["HELD on 70% of the notes judged for length", "RESTS lifted: 80%", "Notes played: 60%"], shown: ["Each note's hold"], never: ["Touch consistency (Part III)"] },
    checks: (x): Check[] => [
      { text: "HELD {n} OF {m} (AIM 70%)", vars: { n: x.held.ok, m: x.held.of }, ok: atLeast(x.held.ok, x.held.of, 0.7), na: !x.held.of, fix: C.fixHeld(x) },
      { text: "RESTS LIFTED {n} OF {m} (AIM 80%)", vars: { n: x.rests.ok, m: x.rests.of }, ok: atLeast(x.rests.ok, x.rests.of, 0.8), na: !x.rests.of, fix: C.fixRests(x) },
      { text: "NOTES PLAYED {p}% (AIM 60%)", vars: { p: Math.round(100 * x.accuracy) }, ok: x.accuracy >= 0.6, fix: C.fixRight(x) },
    ],
    before: ["A note lasts exactly as long as your thumb.", "A note lives as long as you hold it. A rest is music too."],
    after: ["So. A note lives as long as you hold it."],
    again: ["Hold each note to its end; lift where the music rests. Again."],
  },
  {
    id: "I.5",
    part: "I",
    title: "PROBE: DIE INVENTION",
    english: "CHECKPOINT: A MELODY",
    minutes: 3,
    sound: "piano",
    aim: "To play a whole melody with the other voice: pulse, line, repeats and lengths together.",
    hear: { styles: ["plain"] },
    aids: [],
    // To the downbeat of bar 7 (the passage ends on the note bar 6 leads to: G4, the cadence in G, then a rest).
    stages: [st("play", ex(INV, RH, 1, 6, { pct: SLOW_INV }, "Invention 1, right hand, bars 1–7, at 75% (to the cadence in G)"), "From the first note to the cadence in G. Begin when you are ready.")],
    lens: { counts: ["Right: 85%", "Mean timing within ±90 ms", "The cadence's note HELD"], shown: ["Everything else"], never: ["Articulation", "Colour"] },
    // The cadence's note held: struck right and not let go SHORT (its end, when the passage stops first, not judged against it).
    checks: (x): Check[] => [right(x, 0.85), meanWithin(x, NOVICE_MEAN_MS), { text: "THE CADENCE NOTE {w}", vars: { w: !x.last.hit ? "MISSED" : x.last.word === "SHORT" ? "SHORT" : "HELD" }, ok: x.last.hit && x.last.word !== "SHORT", fix: C.fixLast(x) }],
    shown: (x): Check[] => [perfectLine(x)],
    before: ["Seven bars, with my left hand beside you. I will say nothing until the end."],
    after: ["The first page of my Inventions. The line, the time and the lengths: yours."],
    again: ["Again. Hear it in your head first; then play."],
    checkpoint: true,
  },
  // PART II · ZWEI DAUMEN · TWO THUMBS
  {
    id: "II.1",
    part: "II",
    title: "WECHSEL",
    english: "TAKING TURNS",
    minutes: 4,
    sound: "piano",
    aim: "Quick notes shared between the thumbs, one after the other.",
    hear: { styles: ["plain"] },
    aids: ["letters"],
    guide: true,
    stages: [
      st("drill", drill("pendel", "Drill: quavers rocking G4 A4, then B4 C5 (WAIT FOR ME)"), "Rock between two notes, each thumb taking one. I wait for you."),
      st("drill", ex(INV, LH, 2, 3, { pct: SLOW_INV }, "Invention 1, left hand, bars 2–3, at 75%"), "My left hand's semiquavers. Left, right, left: never the same thumb twice."),
      st("drill", ex("wtc2f18", 0, 1, 5, { pct: 75 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5, at 75%"), "Running quavers, slower than written."),
      st("play", ex("wtc2f18", 0, 1, 5, { pct: 100 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5"), "Now as written."),
    ],
    lens: { counts: ["Taking turns on 70% of notes under 400 ms apart", "Right: 85%"], shown: ["Joins and gaps"], never: ["Articulation", "Which thumb starts"] },
    checks: (x): Check[] => [{ text: "TURNS TAKEN {n} OF {m} (AIM 70%)", vars: { n: x.alternation.alt, m: x.alternation.of }, ok: atLeast(x.alternation.alt, x.alternation.of, 0.7), na: !x.alternation.of, fix: C.fixTurns(x) }, right(x, 0.85)],
    shown: (x): Check[] => [{ text: "JOINED {n} OF {m}", vars: { n: x.joins.ok, m: x.joins.of }, ok: true }],
    before: ["They say I taught the thumb to play. Here you have nothing else; let both work."],
    after: ["So. Two thumbs walk where one would stumble."],
    again: ["One thumb did all the work. Take turns. Again."],
    sources: ["J. N. Forkel, Ueber J. S. Bachs Leben, Kunst und Kunstwerke (1802), ch. III: the thumb given its full share."],
  },
  {
    id: "II.2",
    part: "II",
    title: "WECHSELNOTEN",
    english: "NEIGHBOURS",
    minutes: 4,
    sound: "piano",
    aim: "To play the note that steps away and comes home.",
    hear: { styles: ["one-thumb", "plain"] },
    aids: ["trace"],
    stages: [
      st("drill", ex("wtc1f02", 1, 1, 1, { pct: 70 }, "Fugue I/2 in C minor, alto, bar 1, at 70%"), "C, B, C: the thumb on C stays where it is and takes it back."),
      st("play", ex("wtc2f07", 0, 41, 46, { pct: 100 }, "Fugue II/7 in E♭ major, soprano, bars 41–46"), "The same figure three times, falling. The home thumb waits each time."),
    ],
    lens: { counts: ["Right: 90%"], shown: ["Which thumb took each note"], never: ["Thumb choice", "Articulation"] },
    checks: (x): Check[] => [right(x, 0.9)],
    shown: (x): Check[] => [{ text: "TURNS TAKEN {n} OF {m}", vars: { n: x.alternation.alt, m: x.alternation.of }, ok: true }],
    before: ["The note visits its neighbour and comes home.", "Let the thumb that stayed home receive it."],
    after: ["Recht. The home thumb waited, and the note came back to it."],
    again: ["Leave the home thumb where it is; it takes the return. Again."],
  },
  {
    id: "II.3",
    part: "II",
    title: "DIE ÜBERGABE",
    english: "THE HANDOVER",
    minutes: 5,
    sound: "piano",
    aim: "One note passed to the next with no gap: legato, as one of three touches.",
    // D359: his thumbs drawn (it was a sound-only pair under his lines): the same bars apart, then joined.
    hear: { stage: 0, styles: ["detached", "legato"] },
    aids: ["meter"],
    words: ["legato"],
    stages: [
      st("drill", ex(INV, LH, 2, 3, { pct: SLOW_INV }, "Invention 1, left hand, bars 2–3: joined"), "Joined: land the next thumb as the last one lifts, or a moment before."),
      st("drill", ex("wtc1f22", 0, 1, 4, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano I, bars 1–4"), "Long notes, where every gap is heard."),
      st("play", ex(INV, RH, 3, 3, { pct: SLOW_INV }, "Invention 1, right hand, bar 3: sixteen semiquavers"), "Now sixteen notes, one line."),
    ],
    lens: { counts: ["Joins on 70% of the notes that follow one another"], shown: ["The touch inferred", "Overlaps"], never: ["Colour", "Loudness"] },
    checks: (x): Check[] => [{ text: "JOINED {n} OF {m} (AIM 70%)", vars: { n: x.joins.ok, m: x.joins.of }, ok: atLeast(x.joins.ok, x.joins.of, 0.7), na: !x.joins.of, fix: C.fixJoins(x) }],
    shown: (x): Check[] => [touchLine(x)],
    before: ["Listen: the same bars apart, then joined."],
    after: ["A cantabile manner, as my Inventions ask, is more than joined: neither glued nor clipped; it breathes."],
    again: ["The notes fell apart. Land the next before the last lifts. Again."],
    sources: ["F. Couperin, L'art de toucher le clavecin (1716): a line kept joined with the fingers.", "J. N. Forkel (1802), ch. III: Bach's touch, neither too long nor too short."],
  },
  {
    id: "II.4",
    part: "II",
    title: "VORBEREITEN UND ABZIEHEN",
    english: "PREPARING: HAMMER-ON AND PULL-OFF",
    minutes: 5,
    sound: "piano",
    aim: "To put the next thumb down before it is needed, and let the release of the other sound it.",
    hear: { styles: ["prepared"] },
    aids: ["prepared"],
    stages: [
      st("drill", drill("paare", "Drill: falling pairs: rest the second thumb early, lift the first on the beat"), "As one thumb strikes, rest the other on the next note. Lift the first on the beat."),
      st("drill", ex("wtc1f22", 0, 4, 6, { pct: 70 }, "Fugue I/22 in B♭ minor, soprano I, bars 4–6, slow"), "Slowly: every handover prepared."),
      st("play", ex("wtc2f18", 0, 1, 5, { pct: 100 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5, prepared"), "The running quavers again, prepared."),
    ],
    lens: { counts: ["Right: 85%", "At least four pull-offs or hammer-ons"], shown: ["How early each thumb rested", "Notes left unsounded"], never: ["Whether you prepare at all after this lesson"] },
    checks: (x): Check[] => [right(x, 0.85), { text: "PULL-OFFS {p} · HAMMER-ONS {h} (AIM 4 IN ALL)", vars: { p: x.prep.pullOffs, h: x.prep.hammerOns }, ok: x.prep.pullOffs + x.prep.hammerOns >= 4, fix: C.fixPrep(x) }],
    shown: (x): Check[] => [{ text: "RESTED EARLY {n} · LEFT UNSOUNDED {u}", vars: { n: x.prep.rests, u: x.prep.letGo }, ok: true }],
    before: ["Put the next finger down before you need it.", "Then letting go is the note."],
    after: ["So. The release of one thumb is the voice of the other."],
    again: ["Rest the next thumb early; lift the other on the beat. Again."],
  },
  {
    id: "II.5",
    part: "II",
    title: "DER SPRUNG",
    english: "LEAPS WITH THE OTHER THUMB",
    minutes: 4,
    sound: "piano",
    aim: "The far note taken by the thumb that is already there.",
    hear: { styles: ["prepared"] },
    aids: ["trace"],
    guide: true,
    stages: [
      st("drill", ex(INV, LH, 14, 16, { pct: SLOW_INV }, "Invention 1, left hand, bars 14–16: the octave of bar 15"), "An octave in bar 15: the other thumb is already waiting below."),
      st("drill", ex("wtc2f24", 1, 1, 8, { pct: 80 }, "Fugue II/24 in B minor, alto, bars 1–8, at 80%"), "Octaves down and up. Each thumb keeps its own floor."),
      st("play", ex("wtc2f24", 1, 1, 8, { pct: 100 }, "Fugue II/24 in B minor, alto, bars 1–8"), "In time."),
    ],
    lens: { counts: ["Right: 80%"], shown: ["Leaps by thumb"], never: ["Which thumb"] },
    checks: (x): Check[] => [right(x, 0.8)],
    shown: (x): Check[] => [{ text: "LEAPS RIGHT {n} OF {m} · LEFT THUMB {l} · RIGHT THUMB {r}", vars: { n: x.leaps.ok, m: x.leaps.of, l: x.leaps.left, r: x.leaps.right }, ok: true }],
    before: ["Be at the far note before it arrives."],
    after: ["Gut. Your thumbs draw the line as it is drawn on the page."],
    again: ["Do not drag one thumb across; the other is already there. Again."],
  },
  {
    id: "II.6",
    part: "II",
    title: "DER LAUF",
    english: "RUNS",
    minutes: 5,
    sound: "piano",
    aim: "A run played as one gesture of the hand.",
    hear: { stage: 0, styles: ["plain"] },
    aids: ["trend"],
    stages: [
      st("drill", drill("tonleiter", "Drill: D minor, up and back, sixteen semiquavers a bar"), "Up and down D minor: the hand travels, the thumbs follow."),
      st("drill", ex("wtc2f10", 0, 5, 6, { pct: 100 }, "Fugue II/10 in E minor, soprano, bars 5–6: triplet runs"), "Triplets: three notes, one gesture."),
      st("play", ex("wtc2f12", 0, 2, 6, { pct: 100 }, "Fugue II/12 in F minor, soprano, bars 2–6: 34 semiquavers"), "Thirty-four semiquavers. Think of four gestures, not thirty-four notes."),
    ],
    lens: { counts: ["RUN ✓ on two thirds of the runs", "Run notes right: 80%"], shown: ["Timing spread in the run"], never: ["Alternation", "Evenness"] },
    checks: (x): Check[] => [
      { text: "RUN ✓ {n} OF {m} (AIM TWO THIRDS)", vars: { n: x.runs.ok, m: x.runs.of }, ok: x.runs.of > 0 && x.runs.ok / x.runs.of >= 2 / 3 - 1e-9, na: !x.runs.of, fix: C.fixRuns(x) },
      { text: "RUN NOTES RIGHT {n} OF {m} (AIM 80%)", vars: { n: x.runs.notesRight, m: x.runs.notesOf }, ok: atLeast(x.runs.notesRight, x.runs.notesOf, 0.8), na: !x.runs.notesOf, fix: C.fixRuns(x) ?? C.fixRight(x) },
    ],
    shown: (x): Check[] => [{ text: "SPREAD IN THE RUNS {s} MS", vars: { s: x.runs.spreadMs ?? "—" }, ok: true }],
    before: ["A run is one gesture, not twenty.", "Let the hand travel; the fingers follow."],
    after: ["So. One gesture, many notes."],
    again: ["Let the whole hand travel the run's way. Again."],
  },
  {
    id: "II.7",
    part: "II",
    title: "PROBE: DIE INVENTION",
    english: "CHECKPOINT: INVENTION 1",
    minutes: 3,
    sound: "piano",
    aim: "Two voices, cleanly, which is what the 1723 title page asks of the beginner.",
    aids: [],
    stages: [st("play", ex(INV, RH, 1, 22, { pct: SLOW_INV }, "Invention 1, right hand, the whole, at 75%"), "Twenty-two bars, to the last C. Begin when you are ready.")],
    alt: ex(INV, LH, 1, 22, { pct: SLOW_INV }, "Invention 1, left hand, the whole, at 75%"),
    lens: { counts: ["Right: 80%"], shown: ["Alternation", "Joins"], never: ["Articulation choice", "Graces"] },
    checks: (x): Check[] => [right(x, 0.8)],
    shown: (x): Check[] => [
      { text: "TURNS TAKEN {n} OF {m}", vars: { n: x.alternation.alt, m: x.alternation.of }, ok: true },
      { text: "JOINED {n} OF {m}", vars: { n: x.joins.ok, m: x.joins.of }, ok: true },
    ],
    before: ["The whole Invention, with my other hand beside you. I will say nothing until the end."],
    after: ["Two voices, cleanly: the first thing I asked of my pupils."],
    again: ["Again. Hear it in your head first; then play."],
    checkpoint: true,
    sources: ["J. S. Bach, title page of the Inventions and Sinfonias (Cöthen, 1723)."],
  },
  // PART III · DER VORTRAG DER NOTEN · TOUCH AND ARTICULATION (D360)
  {
    id: "III.1",
    part: "III",
    title: "DREI ANSCHLÄGE",
    english: "THREE TOUCHES",
    minutes: 5,
    sound: "harpsichord",
    aim: "To play the same bars joined, ordinary and detached, and to keep each.",
    hear: { stage: 0, styles: ["legato", "ordinary", "detached"] },
    aids: ["meter"],
    stages: [
      st("play", ex("wtc2f18", 0, 1, 3, { pct: 85 }, "Fugue II/18 in G♯ minor, soprano, bars 1–3, at 85%: joined"), "Joined: hold each note until the next has sounded.", { ask: "LEGATO" }),
      st("play", ex("wtc2f18", 0, 1, 3, { pct: 85 }, "Fugue II/18 in G♯ minor, soprano, bars 1–3, at 85%: ordinary"), "Ordinary: let go a moment before the next.", { ask: "ORDINARY" }),
      st("play", ex("wtc2f18", 0, 1, 3, { pct: 85 }, "Fugue II/18 in G♯ minor, soprano, bars 1–3, at 85%: detached"), "Apart: lift at half the note. Light, not timid.", { ask: "DETACHED" }),
      st("play", ex("wtc2f18", 0, 1, 5, { pct: 100 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5: yours"), "Now yours. Choose one, and keep it."),
    ],
    lens: { counts: ["The touch asked, found, in each of the first three takes", "Touch kept: 70%", "Right: 85%"], shown: ["The touch found"], never: ["Which touch the last take uses"] },
    checks: (x, s): Check[] => [
      ...(s?.ask ? [{ text: "TOUCH {t} (ASKED {a})", vars: { t: x.touch.style ?? "—", a: s.ask }, ok: x.touch.style === s.ask, fix: C.fixTouch(s.ask, x.touch.style) }] : []),
      consistency(x),
      right(x, 0.85),
    ],
    shown: (x): Check[] => [touchLine(x)],
    before: ["Joined, ordinary, apart: each is good.", "A player who changes it every note says nothing."],
    after: ["Each was good, because each was kept."],
    again: ["Choose one length, and keep it. Again."],
    sources: SOURCES_TOUCH,
  },
  {
    id: "III.2",
    part: "III",
    title: "ABGESETZT UND KURZ",
    english: "DETACHED AND SHORT",
    minutes: 4,
    sound: "harpsichord",
    aim: "Short notes with energy, not timidity.",
    hear: { styles: ["plain"] },
    aids: [],
    words: ["legato", "short"],
    stages: [
      st("drill", ex("wtc1f09", 1, 1, 3, { pct: 70 }, "Fugue I/9 in E major, alto, bars 1–3, at 70%: Bodky's reading", { reading: "bodky", sound: "chip" }), "The dot: lift before the note's middle. The stroke: lift before the next."),
      st("play", ex("wtc1f09", 1, 1, 3, { pct: 100 }, "Fugue I/9 in E major, alto, bars 1–3: Bodky's reading", { reading: "bodky" }), "On the harpsichord now, in time."),
    ],
    lens: { counts: ["The reading's dots and strokes followed: 60%", "Right: 85%"], shown: ["Every hold"], never: ["Loudness"] },
    checks: (x): Check[] => {
      const ok = x.marks.apart.ok + x.marks.short.ok;
      const of = x.marks.apart.of + x.marks.short.of;
      return [{ text: "DOTS AND STROKES {n} OF {m} (AIM 60%)", vars: { n: ok, m: of }, ok: atLeast(ok, of, 0.6), na: !of, fix: C.fixMarks(x) }, right(x, 0.85)];
    },
    shown: (x): Check[] => [{ text: "STACCATO {s} OF {t} · DETACHED {a} OF {b}", vars: { s: x.marks.short.ok, t: x.marks.short.of, a: x.marks.apart.ok, b: x.marks.apart.of }, ok: true }],
    before: ["Short, but not timid. A detached note has fire in it."],
    after: ["Gut. Short, and still singing."],
    again: ["Lift where the marks say; land with fire. Again."],
    sources: ["C. P. E. Bach, Versuch (1753), I, ch. 3 §17: staccato mostly on leaping notes and in fast tempo.", "E. Bodky, The Interpretation of Bach's Keyboard Works (1960): the reading."],
  },
  {
    id: "III.3",
    part: "III",
    title: "DIE BÖGEN",
    english: "SLURS",
    minutes: 5,
    sound: "harpsichord",
    aim: "A slur as a group: joined inside, let go at its end.",
    hear: { styles: ["plain"] },
    aids: [],
    words: ["legato"],
    stages: [
      st("drill", ex("wtc1f02", 1, 1, 2, { pct: 70 }, "Fugue I/2 in C minor, alto, bars 1–2, at 70%: Keller's reading", { reading: "keller" }), "The two semiquavers joined into their quaver; then each quaver apart."),
      st("play", ex("wtc1f02", 1, 1, 3, { pct: 100 }, "Fugue I/2 in C minor, alto, bars 1–3: Keller's reading", { reading: "keller" }), "In time. Hear where each group ends."),
    ],
    lens: { counts: ["The reading's slurs and strokes followed: 60%", "Right: 85%"], shown: ["Notes the reading leaves unmarked"], never: ["Unmarked notes"] },
    checks: (x): Check[] => {
      const ok = x.marks.joined.ok + x.marks.apart.ok;
      const of = x.marks.joined.of + x.marks.apart.of;
      return [{ text: "SLURS AND STROKES {n} OF {m} (AIM 60%)", vars: { n: ok, m: of }, ok: atLeast(ok, of, 0.6), na: !of, fix: C.fixSlurs(x) }, right(x, 0.85)];
    },
    shown: (x): Check[] => [{ text: "SLURRED {s} OF {t} · APART {a} OF {b}", vars: { s: x.marks.joined.ok, t: x.marks.joined.of, a: x.marks.apart.ok, b: x.marks.apart.of }, ok: true }],
    before: ["A slur is a sentence: joined inside, let go at its end."],
    after: ["Two notes in one breath, then the next breath."],
    again: ["Join inside the group; lift at its end. Again."],
    sources: ["H. Keller, Das Wohltemperierte Klavier (1965): \"the mordent-like sixteenths linked, the eighth notes set apart\"."],
  },
  {
    id: "III.4",
    part: "III",
    title: "DER NACHDRUCK",
    english: "ACCENT WITHOUT LOUDNESS",
    minutes: 4,
    sound: "harpsichord",
    aim: "To weight a note by time and length, the way a harpsichord can.",
    hear: { styles: ["plain", "accent"] },
    aids: [],
    words: ["legato"],
    stages: [
      st("drill", ex("wtc1f02", 1, 1, 2, { pct: 70 }, "Fugue I/2 in C minor, alto, bars 1–2, at 70%: Keller's accents", { reading: "keller" }), "Before each accent, a small silence. Then hold the accented note full."),
      st("play", ex("wtc1f02", 1, 1, 2, { pct: 100 }, "Fugue I/2 in C minor, alto, bars 1–2: Keller's accents", { reading: "keller" }), "In time. Weight by time, never by force."),
    ],
    lens: { counts: ["Accents made: 60%", "Right: 85%"], shown: ["Each accent's timing"], never: ["Where across the bar", "Loudness"] },
    checks: (x): Check[] => [{ text: "ACCENTS {n} OF {m} (AIM 60%)", vars: { n: x.marks.accent.ok, m: x.marks.accent.of }, ok: atLeast(x.marks.accent.ok, x.marks.accent.of, 0.6), na: !x.marks.accent.of, fix: C.fixAccents(x) }, right(x, 0.85)],
    shown: (x): Check[] => [perfectLine(x)],
    before: ["My harpsichord cannot strike harder.", "It can arrive a moment later, and stay."],
    after: ["So. Weight without force."],
    again: ["A small silence before, then stay on the note. Again."],
    sources: ["F. Couperin, Troisième livre de pièces de clavecin (1722), preface: the aspiration and the suspension.", "J. J. Quantz, Versuch (1752), ch. XI §12: the good and the bad notes."],
  },
  {
    id: "III.5",
    part: "III",
    title: "PROBE: MEINE LESART",
    english: "CHECKPOINT: YOUR OWN ARTICULATION",
    minutes: 4,
    sound: "harpsichord",
    aim: "To choose an articulation for a subject and keep it, with no one's marks but your own.",
    // Two right answers: the subject apart, then joined.
    hear: { styles: ["detached", "legato"] },
    aids: ["meter"],
    stages: [st("play", ex("wtc1f02", 1, 1, 6, { pct: 100 }, "Fugue I/2 in C minor, alto, bars 1–6: your own articulation"), "The subject, then the countersubject against my answer. Your articulation, kept.")],
    lens: { counts: ["Touch kept: 70%", "Right: 85%"], shown: ["The touch named"], never: ["Which touch", "Whether it matches any author"] },
    checks: (x): Check[] => [consistency(x), right(x, 0.85)],
    shown: (x): Check[] => [touchLine(x)],
    before: ["Now nobody's marks but yours.", "Make them mean the same thing every time."],
    after: ["Your reading, kept. That is a style."],
    again: ["Choose one length, and keep it. Again."],
    checkpoint: true,
    sources: SOURCES_TOUCH,
  },
  // PART IV · ZEIT UND ATEM · TIME AND BREATH (D360). The bounds are MECH's (D325b), read by the engine, never written here.
  {
    id: "IV.1",
    part: "IV",
    title: "ATMEN",
    english: "BREATHING",
    minutes: 5,
    sound: "organ",
    aim: "To breathe where a singer would, and to come back in a little late without penalty.",
    hear: { styles: ["plain", "breath"] },
    aids: ["breath", "dial"],
    words: ["rest"],
    stages: [
      st("drill", ex("wtc1f02", 0, 17, 20, { pct: 85 }, "Fugue I/2 in C minor, soprano, bars 17–20, at 85%"), "At each comma, breathe: come back a hair late, then go on."),
      st("play", ex("wtc1f02", 0, 17, 20, { pct: 100 }, "Fugue I/2 in C minor, soprano, bars 17–20"), "In time, with your breaths. The subject returns in bar 20."),
    ],
    lens: { counts: ["Right: 85%", "At least two breaths"], shown: ["Each breath"], never: ["Whether you breathe elsewhere"] },
    checks: (x): Check[] => [right(x, 0.85), { text: "BREATHS {n} (AIM 2)", vars: { n: x.graces.breath }, ok: x.graces.breath >= 2, fix: C.fixBreath() }],
    before: ["Where would a singer breathe? There, after the rest.", "Come back a hair late: I count it as on time."],
    after: ["So. You breathed, and the line went on."],
    again: ["After the rest, breathe, then come in. Again."],
    sources: ["J. J. Quantz, Versuch (1752), ch. VII: of taking breath."],
  },
  {
    id: "IV.2",
    part: "IV",
    title: "VERWEILEN",
    english: "LINGERING",
    minutes: 4,
    sound: "harpsichord",
    aim: "To lean on a strong beat or a dissonance, then walk on in time.",
    hear: { styles: ["plain", "lean"] },
    aids: ["dial"],
    stages: [
      st("drill", ex("wtc1f02", 1, 1, 3, { pct: 80 }, "Fugue I/2 in C minor, alto, bars 1–3, at 80%"), "On each bar's first note, arrive a moment late. The next note is on time."),
      st("play", ex("wtc1f02", 1, 1, 4, { pct: 100 }, "Fugue I/2 in C minor, alto, bars 1–4"), "In bar 4 the alto rubs against the soprano. Stay on it a moment too."),
    ],
    lens: { counts: ["At least two leans kept", "Right: 85%"], shown: ["Leans taken back"], never: ["Which beats you choose"] },
    checks: (x): Check[] => [{ text: "LEANS KEPT {n} (AIM 2)", vars: { n: x.graces.agogic }, ok: x.graces.agogic >= 2, fix: C.fixLean(x) }, right(x, 0.85)],
    shown: (x): Check[] => [{ text: "TAKEN BACK {n}", vars: { n: x.graces.revoked }, ok: true }],
    before: ["Stay a moment on what hurts.", "Then walk on, in time."],
    after: ["Recht. Late, and then in time again."],
    again: ["Lean on the beat, then the next note on time. Again."],
    sources: ["F. Couperin, Troisième livre (1722), preface: the suspension, the note delayed."],
  },
  {
    id: "IV.3",
    part: "IV",
    title: "PUNKTIERT",
    english: "DOTTED RHYTHMS",
    minutes: 4,
    sound: "harpsichord",
    aim: "The long note full, and the short one late, quick and leaning into the next.",
    hear: { styles: ["plain"] },
    aids: ["dial"],
    stages: [
      st("drill", ex("wtc1f05", 3, 1, 2, { pct: 80 }, "Fugue I/5 in D major, bass, bars 1–2, at 80%"), "After the run: long, short; long, short. The short one leans into the next."),
      st("play", ex("wtc1f05", 0, 5, 7, { pct: 80 }, "Fugue I/5 in D major, soprano, bars 5–7, at 80%"), "Out of each run into the dotted pairs. Keep your thumbs facing the line's way."),
    ],
    lens: { counts: ["Right: 85%", "The short notes PERFECT: 60%"], shown: ["How late each short note fell"], never: ["Over-dotting within the window"] },
    checks: (x): Check[] => [right(x, 0.85), { text: "SHORT NOTES PERFECT {n} OF {m} (AIM 60%)", vars: { n: x.dotted.perfect, m: x.dotted.of }, ok: atLeast(x.dotted.perfect, x.dotted.of, 0.6), na: !x.dotted.of, fix: C.fixDotted(x) }],
    shown: (x): Check[] => [perfectLine(x)],
    before: ["The short note belongs to the next, not to the last."],
    after: ["Gut. The short notes went where they belong."],
    again: ["Wait on the dot; the short note leans forward. Again."],
    sources: ["J. J. Quantz, Versuch (1752), ch. V: dotted notes played sharper than written."],
  },
  {
    id: "IV.4",
    part: "IV",
    title: "SYNKOPE UND BINDUNG",
    english: "SYNCOPATION AND TIES",
    minutes: 5,
    sound: "organ",
    aim: "To strike off the beat and hold through it while the others move.",
    hear: { styles: ["held"] },
    aids: ["fill"],
    words: ["held", "short"],
    stages: [
      st("drill", ex("wtc2f23", 0, 49, 53, { pct: 100 }, "Fugue II/23 in B major, soprano, bars 49–53"), "Struck before the beat, held across it. Do not strike again."),
      st("play", ex("wtc1f22", 0, 4, 8, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano I, bars 4–8"), "Tied over the bar line. On the organ a lifted tie is a hole."),
    ],
    lens: { counts: ["Right: 85%", "The tied notes HELD: 80%"], shown: ["Re-strikes"], never: ["The release after the tie"] },
    checks: (x): Check[] => [right(x, 0.85), { text: "TIES HELD {n} OF {m} (AIM 80%)", vars: { n: x.ties.held, m: x.ties.of }, ok: atLeast(x.ties.held, x.ties.of, 0.8), na: !x.ties.of, fix: C.fixTies(x) }],
    shown: (x): Check[] => [{ text: "DOUBLES IGNORED {n}", vars: { n: x.repeats.doubles }, ok: true }],
    before: ["Hold it while the others move.", "Feel the beat pass under your thumb."],
    after: ["So. The others moved; you stayed."],
    again: ["Stay on the tied note across the beat. Again."],
    sources: ["H. Keller (1965) on I/2: \"the syncopation on A flat prepared by two staccato sixteenths\"."],
  },
  {
    id: "IV.5",
    part: "IV",
    title: "AUSKLANG",
    english: "THE CLOSE",
    minutes: 3,
    sound: "piano",
    aim: "To broaden into the last chord, without hurrying to it.",
    hear: { styles: ["plain", "broaden"] },
    aids: ["dial"],
    stages: [
      st("drill", ex("wtc1f02", 1, 29, 31, { pct: 100 }, "Fugue I/2 in C minor, alto, bars 29–31: the end"), "The last bars of the fugue. Let them widen a little."),
      st("play", ex(INV, RH, 19, 22, { pct: 80 }, "Invention 1, right hand, bars 19–22: the end"), "The end of my Invention. Broaden, and stay on the last C."),
    ],
    lens: { counts: ["Right: 85%", "The last note held"], shown: ["Broadening"], never: ["How much you broaden"] },
    checks: (x): Check[] => [right(x, 0.85), { text: "THE LAST NOTE {w}", vars: { w: !x.last.hit ? "MISSED" : x.last.word === "SHORT" ? "SHORT" : "HELD" }, ok: x.last.hit && x.last.word !== "SHORT", fix: C.fixLast(x) }],
    shown: (x): Check[] => [{ text: "BROADENED {n}", vars: { n: x.graces.broaden }, ok: true }],
    before: ["The end comes to you. Do not run to meet it."],
    after: ["The end came to you."],
    again: ["Let the last bars widen; stay on the last note. Again."],
  },
  {
    id: "IV.6",
    part: "IV",
    title: "PROBE: EIN LANGSAMES THEMA",
    english: "CHECKPOINT: A SLOW SUBJECT",
    minutes: 4,
    sound: "organ",
    aim: "Breath, lean, ties and touch in one phrase.",
    hear: { styles: ["plain"] },
    aids: [],
    stages: [st("play", ex("wtc1f22", 0, 1, 13, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano I, bars 1–13"), "Thirteen bars, to the cadence in B♭ minor. Breathe where you like.")],
    lens: { counts: ["Right: 85%", "Touch kept: 70%"], shown: ["Breaths, leans and ties"], never: ["Where you lean or breathe"] },
    checks: (x): Check[] => [right(x, 0.85), consistency(x)],
    shown: (x): Check[] => [{ text: "BREATHS {b} · LEANS {a} · TIES HELD {t} OF {u}", vars: { b: x.graces.breath, a: x.graces.agogic, t: x.ties.held, u: x.ties.of }, ok: true }],
    before: ["Breath, lean, ties and touch: one phrase.", "I will say nothing until the end."],
    after: ["So. Now the music has time to speak."],
    again: ["Again. Sing it in your head first."],
    // Design: one thing heard, never a number.
    told: (x) => (x.graces.breath > 0 ? { text: "I heard you breathe where a singer would." } : x.graces.agogic > 0 ? { text: "I heard you lean, and come back." } : x.ties.of && x.ties.held === x.ties.of ? { text: "Your ties held while the others moved." } : { text: "The line was yours, from first note to last." }),
    checkpoint: true,
  },
  // PART V · DIE MANIEREN · THE GRACES (D360, on D353's contour gestures). The owner's decision 3: unscored
  // skills have no pass mark: each lesson is passed by being played through; what was read is shown.
  {
    id: "V.1",
    part: "V",
    title: "DER MORDANT",
    english: "THE MORDENT",
    minutes: 4,
    sound: "harpsichord",
    aim: "Touch the note, then down and back.",
    hear: { styles: ["plain"] },
    aids: [],
    ornaments: true,
    stages: [
      st("drill", ex("wtc2f01", 1, 1, 2, { pct: 70 }, "Fugue II/1 in C major, alto, bars 1–2, at 70%"), "One mordent, on the A. Touch it, then a small quick shake: down, and back."),
      st("play", ex(INV, RH, 1, 2, { pct: 80 }, "Invention 1, right hand, bars 1–2: two mordents"), "My Invention's two mordents: on the B, then on the F."),
    ],
    lens: { counts: ["Nothing: played through is passed"], shown: ["The graces read"], never: ["In the game's score"] },
    shown: (x): Check[] => [graceLine(x)],
    before: ["Down and back, quick as a glance."],
    after: ["So. The sign is a word, and you said it."],
    again: ["Touch the note, then shake small and quick: down first."],
    told: (x) => (x.orn.of && x.orn.read < x.orn.of ? { text: "Not every sign was read. Touch the note, then shake small and quick, down first." } : null),
    sources: ["J. S. Bach, Clavier-Büchlein vor Wilhelm Friedemann Bach (1720): the Explication, the mordent.", "C. P. E. Bach, Versuch (1753), I, ch. 2, sect. 5: the mordent."],
  },
  {
    id: "V.2",
    part: "V",
    title: "DER PRALLTRILLER",
    english: "THE SHORT TRILL",
    minutes: 4,
    sound: "harpsichord",
    aim: "Up and back, snapped, before a falling step.",
    hear: { styles: ["plain"] },
    aids: [],
    ornaments: true,
    stages: [
      st("drill", ex("wtc1f13", 0, 1, 2, { pct: 100 }, "Fugue I/13 in F♯ major, soprano, bars 1–2"), "The sign on the C♯: up and back, snapped, then on."),
      st("play", ex("wtc2f13", 0, 24, 26, { pct: 70 }, "Fugue II/13 in F♯ major, soprano, bars 24–26, at 70%"), "Three in a falling line, each before a step down."),
    ],
    lens: { counts: ["Nothing: played through is passed"], shown: ["The graces read"], never: ["In the game's score"] },
    shown: (x): Check[] => [graceLine(x)],
    before: ["A flick upward, and down to the next."],
    after: ["Gut. Snapped, and gone."],
    again: ["Up first, quick, then let the note fall to the next."],
    told: (x) => (x.orn.of && x.orn.read < x.orn.of ? { text: "Not every sign was read. Touch the note, then a quick small flick up and back." } : null),
    sources: ["C. P. E. Bach, Versuch (1753), I, ch. 2, sect. 3, §§30–34: the Pralltriller, before a falling second."],
  },
  {
    id: "V.3",
    part: "V",
    title: "DER TRILLER",
    english: "THE TRILL",
    minutes: 4,
    sound: "harpsichord",
    aim: "A trill from above, lasting as long as you want, and settling when you stop.",
    hear: { styles: ["plain"] },
    aids: [],
    ornaments: true,
    stages: [
      st("drill", ex("wtc1f06", 0, 1, 3, { pct: 100 }, "Fugue I/6 in D minor, soprano, bars 1–3"), "The trill on the G: shake, and keep shaking while the note lasts."),
      st("drill", ex("wtc1f15", 0, 67, 69, { pct: 100 }, "Fugue I/15 in G major, soprano, bars 67–69: the cadence trill"), "A cadence trill of five beats. When you stop, it settles."),
      st("play", ex("wtc2f18", 2, 29, 31, { pct: 100 }, "Fugue II/18 in G♯ minor, bass, bars 29–31, on the organ", { sound: "organ" }), "A whole bar's trill in the bass, on the organ."),
    ],
    lens: { counts: ["Nothing: played through is passed"], shown: ["The graces read"], never: ["In the game's score", "The trill's speed"] },
    shown: (x): Check[] => [graceLine(x)],
    before: ["Begin above. Shake as long as the note asks.", "Stop, and it rests."],
    after: ["So. It began above, and it came to rest."],
    again: ["Keep the shake going while the note lasts."],
    told: (x) => (x.orn.of && x.orn.read < x.orn.of ? { text: "Not every sign was read. Shake small and quick, and keep going." } : null),
    sources: ["J. S. Bach, Clavier-Büchlein (1720): the Explication, the trill.", "C. P. E. Bach, Versuch (1753), I, ch. 2, sect. 3, §§5, 13, 16, 21: from the upper note; its ending."],
  },
  {
    id: "V.4",
    part: "V",
    title: "FREIE MANIEREN",
    english: "FREE GRACES, AND TASTE",
    minutes: 4,
    sound: "harpsichord",
    aim: "To add a grace of your own where it serves, and not elsewhere.",
    aids: [],
    ornaments: true,
    stages: [
      st("drill", ex(INV, RH, 5, 7, { pct: 80 }, "Invention 1, right hand, bars 5–7"), "Before the cadence in G, a trill of your own, if you like."),
      st("play", ex("wtc1f22", 0, 1, 13, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano I, bars 1–13, on the harpsichord"), "One or two graces of your choice, on long notes. Or none."),
    ],
    lens: { counts: ["Nothing: played through is passed"], shown: ["Your own graces"], never: ["In the game's score"] },
    shown: (x): Check[] => [{ text: "YOUR OWN GRACES {n}", vars: { n: x.orn.free }, ok: true }],
    before: ["Where I wrote a sign, play it; elsewhere a grace is your choice, sparingly."],
    after: ["Your taste, not mine. That is the point."],
    again: ["Sparingly."],
    told: (x) => (x.orn.free === 0 ? { text: "None added. That too is a choice." } : x.orn.free > 3 ? { text: "Sparingly." } : { text: "You added {n}. Sparingly is right.", vars: { n: x.orn.free } }),
    sources: ["J. A. Scheibe, Der critische Musikus (1737): Bach criticised for writing out the graces players usually improvised."],
  },
  // D364: the appoggiatura, held over (the hold-over gesture, MECH › ORNAMENTS › HOLD-OVER APPOGGIATURA).
  // No pass mark (decision 3); the hold compared with the textbook half, never a pass (the report).
  {
    id: "V.5",
    part: "V",
    title: "DER VORSCHLAG",
    english: "THE APPOGGIATURA, HELD OVER",
    minutes: 4,
    sound: "piano",
    aim: "Carry the note before over the beat, then let it go: the note resolves softly.",
    hear: { styles: ["prepared", "appoggiatura"] },
    aids: ["prepared"],
    ornaments: true,
    stages: [
      st("drill", ex("wtc1f22", 0, 13, 17, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano I, bars 13–17: three held over"), "E♭ over the bar into D♭, D♭ into C, C into B♭. Rest the other thumb on the next note; hold; let go."),
      st("play", ex("wtc1f22", 1, 62, 67, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano II, bars 62–67: five held over"), "Five in a falling line. Hold each as long as it pleases you, half the note or so."),
    ],
    lens: { counts: ["Nothing: played through is passed"], shown: ["The appoggiaturas held over", "How long, against the textbook half"], never: ["In the game's score", "How long you hold"] },
    shown: (x): Check[] => [
      { text: "HELD OVER {n} OF {m}", vars: { n: x.appo.made, m: x.appo.of }, ok: true },
      { text: "HELD {p}% OF THE NOTE · THE TEXTBOOK: HALF", vars: { p: x.appo.shares.length ? Math.round((100 * x.appo.shares.reduce((a, b) => a + b, 0)) / x.appo.shares.length) : "—" }, ok: true },
    ],
    before: ["The note before, carried over the beat while the next waits: then let it go, and the note sighs into place.", "Rest the other thumb on the next note first. Hold. Let go."],
    after: ["So. The dissonance, and its answer."],
    again: ["Rest the other thumb on the next note, and hold the note before past the bar line."],
    told: (x) => {
      if (!x.appo.made) return { text: "None held over. Rest the other thumb on the next note, then hold past the beat." };
      const m = x.appo.shares.reduce((a, b) => a + b, 0) / x.appo.shares.length;
      return m < 0.35 ? { text: "Short and light. My son would hold it longer: half the note." } : m > 0.65 ? { text: "Long, and full of feeling. The textbook says half; the affect may say more." } : { text: "Half the note, as my son teaches it." };
    },
    sources: ["C. P. E. Bach, Versuch (1753), I, ch. 2, sect. 2, §§7, 9, 11, 13, 16: the long appoggiatura, on the strong beat, half the note (or more by affect), the note after it softer; the short one.", "J. J. Quantz, Versuch (1752), ch. VIII, §§7–8: the appoggiatura held, then resolved softly."],
  },
];

export const lessonById = (id: string): ManualLesson | undefined => MANUAL.find((l) => l.id === id);
export const lessonsOf = (p: PartId) => MANUAL.filter((l) => l.part === p);
/** The part's checkpoint (its last lesson marked so), if it has one. */
export const checkpointOf = (p: PartId) => MANUAL.find((l) => l.part === p && l.checkpoint);
/** The lessons played on the bars (not Part 0's screens). */
export const PLAYED = MANUAL.filter((l) => !l.screen);
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
  const from = barStart(f, m.fromBar);
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
  for (const p of PARTS) out.push(p.english, ...(p.seal ? [p.seal] : []));
  const xs = [-120, -40, 0, 40, 120].map((mean) => ({ ...ZERO_LENS, timing: { n: 9, mean, sd: 20, perfect: 5 } }));
  for (const l of MANUAL) {
    out.push(l.english, l.aim, ...l.before, ...l.after, ...l.again, ...l.lens.counts, ...l.lens.shown, ...l.lens.never, ...l.stages.map((s) => s.m.label), ...l.stages.flatMap((s) => (s.say ? [s.say] : [])));
    if (l.alt) out.push(l.alt.label);
    for (const x of [...xs, { ...ZERO_LENS, graces: { agogic: 1, breath: 0, broaden: 0, revoked: 0 } }, { ...ZERO_LENS, graces: { agogic: 0, breath: 1, broaden: 0, revoked: 0 } }, ...[0, 1, 2, 5].map((free) => ({ ...ZERO_LENS, orn: { read: 0, of: 2, free, kinds: [] } })), ...[0.2, 0.5, 0.8].map((s) => ({ ...ZERO_LENS, appo: { of: 3, made: 1, short: 0, shares: [s] } }))])
      for (const s of [undefined, ...l.stages]) {
        out.push(...[...(l.checks?.(x, s) ?? []), ...(l.shown?.(x, s) ?? [])].map((c) => c.text));
        const t = l.told?.(x);
        if (t) out.push(t.text);
      }
  }
  return out;
}

/** D359: the demonstration's manners, named in the hint while Herr Bach plays. */
export const WATCH_WORDS = ["WATCH THE THUMBS", "WATCH · DETACHED", "WATCH · JOINED", "WATCH · ORDINARY", "WATCH · ONE THUMB", "WATCH · PREPARED", "WATCH · HELD", "WATCH · ACCENTS", "WATCH · LEANING", "WATCH · BREATHING", "WATCH · BROADENING", "WATCH · HELD OVER"];
export const watchWord = (s?: DemoStyle) =>
  ({ detached: "WATCH · DETACHED", legato: "WATCH · JOINED", ordinary: "WATCH · ORDINARY", "one-thumb": "WATCH · ONE THUMB", prepared: "WATCH · PREPARED", held: "WATCH · HELD", accent: "WATCH · ACCENTS", lean: "WATCH · LEANING", breath: "WATCH · BREATHING", broaden: "WATCH · BROADENING", appoggiatura: "WATCH · HELD OVER", plain: "WATCH THE THUMBS" })[s ?? "plain"];

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
  const d = Object.values(DRILLS).find((x) => x.id === m.piece);
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
    ...(d?.click ? { click: d.click } : click ? { click: LESSON_CLICK } : {}),
    ...(demoStyle && demoStyle !== "plain" ? { demoStyle } : {}),
    ...(m.reading ? { reading: m.reading } : {}),
    quiet: { words: words ?? [], ...(ornaments ? { ornaments: true } : {}) },
    ...(ornaments ? { ornHint: true } : {}),
  };
}
