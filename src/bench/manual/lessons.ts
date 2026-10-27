/**
 * D342, THE MANUAL (the Two-Thumb Clavier-Büchlein; design of 27 October 2026), Phase A: Parts 0–II, each
 * lesson declared, not searched (design 4.1): its part and titles, its aim, Herr Bach's lines, the steps
 * (HEAR: his demonstration; SEE: the lesson's visual aid; the DRILL stages; the PLAY stage, whose pass
 * passes the lesson), each stage's material (piece, voice, bars, tempo, WAIT, the sound), its lens
 * (COUNTS, SHOWN, NEVER) and its pass rule as a function of the run's lens (lens.ts). Every excerpt is
 * held to its feature by test/d342-manual.test.ts, as test/d333-study.test.ts holds the study's.
 *
 * The owner's decisions (D342): Part I opens with Invention 1 (in the game) and not a chorale, so I.1's
 * main material and I.5's checkpoint are Invention 1's right hand; each lesson sounds on the instrument
 * that makes its rudiment audible (chip for time, organ for holds, harpsichord, piano), whatever the
 * player's own sound; a lesson that teaches an unscored skill has no pass mark at all (none in Phase A).
 * His words follow the cards (at most two lines before a lesson and one after, D225); he quotes only his
 * own title pages; the later sources sit in each lesson's SOURCES, never in his mouth.
 */
import { tr } from "../../i18n/index.ts";
import { barStart, fugueById } from "../../touch/fugue.ts";
import { tempoOf } from "../../touch/tempi.ts";
import type { LensStats } from "./lens.ts";
import { DRILLS } from "./drills.ts";
import type { Run } from "../lessons.ts";

export type PartId = "0" | "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII";
export type SoundName = "chip" | "harpsichord" | "organ" | "piano";
/** The sound each name plays on (sound.ts presets). */
export const SOUND_PRESET: Record<SoundName, string> = { chip: "chip", harpsichord: "harpsichordSampled", organ: "organSampled", piano: "pianoSampled" };
export const SOUND_WORD: Record<SoundName, string> = { chip: "CLASSIC CHIP", harpsichord: "HARPSICHORD", organ: "ORGAN", piano: "PIANO" };

/** The visual aids of Parts I–II (design 4.5), each for its lesson only. */
export type AidId = "dial" | "trace" | "repeat" | "fill" | "letters" | "meter" | "prepared" | "trend";
export type DemoStyle = "plain" | "one-thumb" | "prepared" | "held";

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
  /** What it is, in a line ("Invention 1, right hand, bar 1"). */
  label: string;
  badge: "IN GAME" | "DRILL";
}

export interface Stage {
  /** A DRILL may be left after one take; the PLAY decides the lesson. */
  kind: "drill" | "play";
  m: Material;
}

/** One line of the lens (COUNTS): what it is, the figure reached, and whether it is met. */
export interface Check {
  text: string;
  vars?: Record<string, string | number>;
  ok: boolean;
  /** Nothing in this take to measure it by (a drill may lack what the play has): a drill passes over it. */
  na?: boolean;
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
  /** HEAR: his demonstration of a stage (the last by default), in one or more manners, and (II.3) the sound-only pair. */
  hear?: { stage?: number; styles: DemoStyle[]; pair?: ["detached", "legato"] };
  aids: AidId[];
  /** The guide thumbs (D280: the thumb the next note wants, hovering where it lands) while the player plays. */
  guide?: boolean;
  stages: Stage[];
  /** A material offered instead of the play (II.7: the left hand). */
  alt?: Material;
  lens: { counts: string[]; shown: string[]; never: string[] };
  /** COUNTS, with the figures reached; the lesson passes when every one is met. Absent: not judged (passed by being played through). */
  checks?: (x: LensStats) => Check[];
  /** SHOWN, with the figures. */
  shown?: (x: LensStats) => Check[];
  before: string[];
  after: string[];
  again: string[];
  /** One line after a take, in numbers (I.1: "Early by 40 ms."). */
  told?: (x: LensStats) => { text: string; vars?: Record<string, string | number> } | null;
  sources?: string[];
  checkpoint?: boolean;
  /** Part 0's two screens, which are not played on the bars. */
  screen?: "grip" | "placement";
}

const pctOf = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
const atLeast = (a: number, b: number, share: number) => b > 0 && a / b >= share - 1e-9;
/** The share right (of the notes, a stray strike half a note). */
const right = (x: LensStats, share: number): Check => ({ text: "RIGHT {p}% (AIM {a}%)", vars: { p: Math.round(100 * x.accuracy), a: Math.round(100 * share) }, ok: x.accuracy >= share - 1e-9 && x.of > 0 });
const meanWithin = (x: LensStats, ms: number): Check => ({ text: "MEAN TIMING {m} MS (AIM WITHIN ±{a})", vars: { m: !x.timing.n ? "—" : x.timing.mean > 0 ? `+${x.timing.mean}` : x.timing.mean, a: ms }, ok: x.timing.n > 0 && Math.abs(x.timing.mean) <= ms });
const perfectLine = (x: LensStats): Check => ({ text: "PERFECT {p}% · SPREAD {s} MS", vars: { p: pctOf(x.timing.perfect, x.timing.n), s: x.timing.sd }, ok: true });

/** A passage of the game's own, as a material. */
const ex = (piece: string, voice: number, fromBar: number, toBar: number, tempo: Material["tempo"], label: string, o: Partial<Material> = {}): Material => ({ piece, voice, fromBar, toBar, tempo, label, badge: "IN GAME", ...o });
/** A drill (drills.ts), whole, at its own tempo. */
const drill = (key: keyof typeof DRILLS & string, label: string, o: Partial<Material> = {}): Material => {
  const d = DRILLS[key];
  return { piece: d.id, voice: d.voice, fromBar: 1, toBar: d.piece.bars.length, tempo: { bpm: d.tempo }, wait: d.wait, solo: d.band.kind === "click" || d.band.kind === "none", label, badge: "DRILL", ...o };
};

const INV = "inv01";
const RH = 0;
const LH = 1;

export const PARTS: { id: PartId; title: string; english: string; phase: "A" | "later" }[] = [
  { id: "0", title: "VORBEREITUNG", english: "BEFORE THE FIRST NOTE", phase: "A" },
  { id: "I", title: "DER ANSCHLAG", english: "THE STRIKE", phase: "A" },
  { id: "II", title: "ZWEI DAUMEN", english: "TWO THUMBS", phase: "A" },
  { id: "III", title: "DER VORTRAG DER NOTEN", english: "TOUCH AND ARTICULATION", phase: "later" },
  { id: "IV", title: "ZEIT UND ATEM", english: "TIME AND BREATH", phase: "later" },
  { id: "V", title: "DIE MANIEREN", english: "THE GRACES", phase: "later" },
  { id: "VI", title: "DAS HÖREN", english: "LISTENING", phase: "later" },
  { id: "VII", title: "DIE INSTRUMENTE", english: "THE FOUR INSTRUMENTS", phase: "later" },
  { id: "VIII", title: "DER VORTRAG", english: "PLAYING MUSIC", phase: "later" },
];

export const MANUAL: ManualLesson[] = [
  {
    id: "0.1",
    part: "0",
    title: "HALTUNG",
    english: "THE GRIP AND THE EARS",
    minutes: 2,
    sound: "harpsichord",
    aim: "Phone sideways, one thumb on each bar, the sound in time with the touch.",
    aids: [],
    stages: [],
    lens: { counts: ["Nothing"], shown: ["The sound's delay found"], never: ["Anything else"] },
    before: ["Two thumbs and one voice. The rest of the music is mine to play."],
    after: [],
    again: [],
    screen: "grip",
  },
  {
    id: "0.2",
    part: "0",
    title: "PROBESPIEL",
    english: "HAVE YOU PLAYED BEFORE?",
    minutes: 4,
    sound: "piano",
    aim: "To seat each player at the right lesson.",
    aids: [],
    stages: [],
    lens: { counts: ["Nothing: it only places you"], shown: ["What each excerpt showed"], never: ["Loudness"] },
    before: ["Have you played before?"],
    after: [],
    again: [],
    screen: "placement",
  },
  // PART I · DER ANSCHLAG · THE STRIKE
  {
    id: "I.1",
    part: "I",
    title: "DER PULS",
    english: "PULSE AND ONSET",
    minutes: 4,
    sound: "chip",
    aim: "To strike with the music, by listening rather than by watching.",
    hear: { styles: ["plain"] },
    aids: ["dial"],
    stages: [
      { kind: "drill", m: drill("schlaege", "Drill: one note, sixteen strikes; the click fades after eight", { easy: "timing" }) },
      { kind: "play", m: ex(INV, RH, 1, 2, { pct: 80 }, "Invention 1, right hand, bars 1–2, at 80%", { easy: "timing" }) },
    ],
    lens: { counts: ["Notes struck in their window: 85%", "Mean timing within ±50 ms", "Spread under 70 ms"], shown: ["PERFECT share"], never: ["Height", "Holds", "Articulation", "Colour", "Loudness"] },
    // D342: and the spread under 70 ms (not on the card: a random tapper's mean is near zero too; design 4.10).
    checks: (x): Check[] => [{ text: "STRUCK IN TIME {p}% (AIM 85%)", vars: { p: pctOf(x.right, x.of) }, ok: atLeast(x.right, x.of, 0.85) }, meanWithin(x, 50), { text: "SPREAD {s} MS (AIM UNDER 70)", vars: { s: x.timing.n > 2 ? x.timing.sd : "—" }, ok: x.timing.n > 2 && x.timing.sd < 70 }],
    shown: (x): Check[] => [{ text: "PERFECT {p}%", vars: { p: pctOf(x.timing.perfect, x.timing.n) }, ok: true }],
    before: ["Strike with the music. Touch the bar anywhere: here only the time counts.", "Listen to the other voice under you, not to the light on the glass."],
    after: ["Recht. The pulse is in you now."],
    again: ["Let the note come to you. Again."],
    told: (x) => (x.timing.n < 3 ? null : x.timing.mean < -15 ? { text: "Early by {n} ms. Let the note come to you.", vars: { n: -x.timing.mean } } : x.timing.mean > 15 ? { text: "Late by {n} ms. Do not wait for the light.", vars: { n: x.timing.mean } } : { text: "On the pulse: within {n} ms.", vars: { n: Math.max(1, Math.abs(x.timing.mean)) } }),
    sources: ["B. H. Repp, Sensorimotor synchronization (2005): tappers anticipate the beat."],
  },
  {
    id: "I.2",
    part: "I",
    title: "SCHRITT UND SPRUNG",
    english: "STEP AND LEAP",
    minutes: 4,
    sound: "harpsichord",
    aim: "To draw the line with the thumb: up when it rises, down when it falls, a step small and a leap clear.",
    hear: { styles: ["plain"] },
    aids: ["trace"],
    stages: [
      { kind: "drill", m: drill("treppe", "Drill: C4 to G4 by steps and back, then by leaps (WAIT FOR ME)") },
      { kind: "drill", m: ex(INV, RH, 1, 1, { bpm: 60 }, "Invention 1, right hand, bar 1 (WAIT FOR ME)", { wait: true }) },
      { kind: "drill", m: ex(INV, RH, 1, 1, { bpm: 60 }, "Invention 1, right hand, bar 1, at ♩ = 60") },
      { kind: "play", m: ex("wtc1f20", 1, 1, 2, { pct: 80 }, "Fugue I/20 in A minor, alto, bars 1–2, at 80%") },
    ],
    lens: { counts: ["Direction right: 90%", "Notes played: 70%"], shown: ["Timing"], never: ["The absolute height", "Which thumb", "Holds"] },
    checks: (x): Check[] => [
      { text: "DIRECTION RIGHT {p}% (AIM 90%)", vars: { p: pctOf(x.direction.ok, x.direction.of) }, ok: atLeast(x.direction.ok, x.direction.of, 0.9) && x.direction.of >= x.of / 2 },
      { text: "NOTES PLAYED {p}% (AIM 70%)", vars: { p: Math.round(100 * x.accuracy) }, ok: x.accuracy >= 0.7 },
    ],
    shown: (x): Check[] => [meanWithin(x, 70), perfectLine(x)].map((c) => ({ ...c, ok: true })),
    before: ["Higher when it rises, lower when it falls.", "How high is your affair, but a leap must look like one."],
    after: ["Good. Your thumb drew the line."],
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
      { kind: "drill", m: ex("wtc2f05", 2, 1, 3, { pct: 85 }, "Fugue II/5 in D major, tenor, bars 1–3, at 85%") },
      { kind: "drill", m: ex("wtc2f12", 0, 1, 2, { pct: 80 }, "Fugue II/12 in F minor, soprano, bars 1–2, at 80%") },
      { kind: "play", m: ex("wtc2f05", 2, 1, 3, { pct: 100 }, "Fugue II/5 in D major, tenor, bars 1–3") },
    ],
    lens: { counts: ["Repeats right and struck: 90%", "Notes played: 70%"], shown: ["Doubles ignored", "The gap before each repeat"], never: ["Which thumb", "The release's length"] },
    // D342: and the notes played (a passage has only two or four repeats: chance alone could pass them).
    checks: (x): Check[] => [{ text: "REPEATS RIGHT {n} OF {m} (AIM 90%)", vars: { n: x.repeats.ok, m: x.repeats.of }, ok: atLeast(x.repeats.ok, x.repeats.of, 0.9), na: !x.repeats.of }, { text: "NOTES PLAYED {p}% (AIM 70%)", vars: { p: Math.round(100 * x.accuracy) }, ok: x.accuracy >= 0.7 }],
    shown: (x): Check[] => [{ text: "DOUBLES IGNORED {n} · GAP BEFORE A REPEAT {g} MS", vars: { n: x.repeats.doubles, g: x.repeats.gaps.length ? Math.round(x.repeats.gaps.reduce((a, b) => a + b, 0) / x.repeats.gaps.length) : "—" }, ok: true }],
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
    sound: "organ",
    aim: "To give each note its length, and each rest its silence.",
    hear: { styles: ["held"] },
    aids: ["fill"],
    stages: [
      { kind: "drill", m: ex("wtc2f09", 3, 1, 3, { pct: 70 }, "Fugue II/9 in E major, bass, bars 1–3, at 70%") },
      { kind: "play", m: ex("wtc1f02", 0, 17, 19, { pct: 100 }, "Fugue I/2 in C minor, soprano, bars 17–19") },
    ],
    lens: { counts: ["HELD on 70% of the notes judged for length", "RESTS lifted: 80%", "Notes played: 60%"], shown: ["Each note's hold"], never: ["Touch consistency (Part III)"] },
    checks: (x): Check[] => [
      { text: "HELD {n} OF {m} (AIM 70%)", vars: { n: x.held.ok, m: x.held.of }, ok: atLeast(x.held.ok, x.held.of, 0.7), na: !x.held.of },
      { text: "RESTS LIFTED {n} OF {m} (AIM 80%)", vars: { n: x.rests.ok, m: x.rests.of }, ok: atLeast(x.rests.ok, x.rests.of, 0.8), na: !x.rests.of },
      { text: "NOTES PLAYED {p}% (AIM 60%)", vars: { p: Math.round(100 * x.accuracy) }, ok: x.accuracy >= 0.6 },
    ],
    before: ["On the organ a note lasts exactly as long as your thumb.", "A note lives as long as you hold it. A rest is music too."],
    after: ["So. A note lives as long as you hold it."],
    again: ["Hold each note to its end; lift where the music rests. Again."],
  },
  {
    id: "I.5",
    part: "I",
    title: "PROBE: DIE INVENTION",
    english: "CHECKPOINT: A MELODY",
    minutes: 3,
    sound: "organ",
    aim: "To play a whole melody with the other voice: pulse, line, repeats and lengths together.",
    hear: { styles: ["plain"] },
    aids: [],
    // To the downbeat of bar 7 (the passage ends on the note bar 6 leads to: G4, the cadence in G, then a rest).
    stages: [{ kind: "play", m: ex(INV, RH, 1, 6, { bpm: 60 }, "Invention 1, right hand, bars 1–7, at ♩ = 60 (to the cadence in G)") }],
    lens: { counts: ["Right: 85%", "Mean timing within ±60 ms", "The cadence's note HELD"], shown: ["Everything else"], never: ["Articulation", "Colour"] },
    // The cadence's note held: struck right and not let go SHORT (its end, when the passage stops first, not judged against it).
    checks: (x): Check[] => [right(x, 0.85), meanWithin(x, 60), { text: "THE CADENCE NOTE {w}", vars: { w: !x.last.hit ? "MISSED" : x.last.word === "SHORT" ? "SHORT" : "HELD" }, ok: x.last.hit && x.last.word !== "SHORT" }],
    shown: (x): Check[] => [perfectLine(x)],
    before: ["Now seven bars, with my left hand beside you. I will say nothing until the end."],
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
    sound: "harpsichord",
    aim: "Quick notes shared between the thumbs, one after the other.",
    hear: { styles: ["plain"] },
    aids: ["letters"],
    guide: true,
    stages: [
      { kind: "drill", m: drill("pendel", "Drill: quavers rocking G4 A4, then B4 C5 (WAIT FOR ME)") },
      { kind: "drill", m: ex(INV, LH, 2, 3, { bpm: 60 }, "Invention 1, left hand, bars 2–3, at ♩ = 60") },
      { kind: "drill", m: ex("wtc2f18", 0, 1, 5, { pct: 75 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5, at 75%") },
      { kind: "play", m: ex("wtc2f18", 0, 1, 5, { pct: 100 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5") },
    ],
    lens: { counts: ["Taking turns on 70% of notes under 400 ms apart", "Right: 85%"], shown: ["Joins and gaps"], never: ["Articulation", "Which thumb starts"] },
    checks: (x): Check[] => [{ text: "TURNS TAKEN {n} OF {m} (AIM 70%)", vars: { n: x.alternation.alt, m: x.alternation.of }, ok: atLeast(x.alternation.alt, x.alternation.of, 0.7), na: !x.alternation.of }, right(x, 0.85)],
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
    sound: "chip",
    aim: "To play the note that steps away and comes home.",
    hear: { styles: ["one-thumb", "plain"] },
    aids: ["trace"],
    stages: [
      { kind: "drill", m: ex("wtc1f02", 1, 1, 1, { pct: 70 }, "Fugue I/2 in C minor, alto, bar 1, at 70%") },
      { kind: "play", m: ex("wtc2f07", 0, 41, 46, { pct: 100 }, "Fugue II/7 in E♭ major, soprano, bars 41–46") },
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
    sound: "organ",
    aim: "One note passed to the next with no gap: legato, as one of three touches.",
    hear: { stage: 0, styles: [], pair: ["detached", "legato"] },
    aids: ["meter"],
    stages: [
      { kind: "drill", m: ex(INV, LH, 2, 3, { bpm: 60 }, "Invention 1, left hand, bars 2–3: joined") },
      { kind: "drill", m: ex("wtc1f22", 0, 1, 4, { pct: 100 }, "Fugue I/22 in B♭ minor, soprano I, bars 1–4, on the organ") },
      { kind: "play", m: ex(INV, RH, 3, 3, { bpm: 60 }, "Invention 1, right hand, bar 3: sixteen semiquavers, on the piano", { sound: "piano" }) },
    ],
    lens: { counts: ["Joins on 70% of the notes that follow one another"], shown: ["The touch inferred", "Overlaps"], never: ["Colour", "Loudness"] },
    checks: (x): Check[] => [{ text: "JOINED {n} OF {m} (AIM 70%)", vars: { n: x.joins.ok, m: x.joins.of }, ok: atLeast(x.joins.ok, x.joins.of, 0.7), na: !x.joins.of }],
    shown: (x): Check[] => [{ text: "YOUR TOUCH: {t}", vars: { t: x.touch.style ?? "—" }, ok: true }],
    before: ["Listen. First each note apart, detached.", "Then joined: the next thumb lands as the last lifts, or a moment before."],
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
    sound: "harpsichord",
    aim: "To put the next thumb down before it is needed, and let the release of the other sound it.",
    hear: { styles: ["prepared"] },
    aids: ["prepared"],
    stages: [
      { kind: "drill", m: drill("paare", "Drill: falling pairs: rest the second thumb early, lift the first on the beat") },
      { kind: "drill", m: ex("wtc1f22", 0, 4, 6, { pct: 70 }, "Fugue I/22 in B♭ minor, soprano I, bars 4–6, slow") },
      { kind: "play", m: ex("wtc2f18", 0, 1, 5, { pct: 100 }, "Fugue II/18 in G♯ minor, soprano, bars 1–5, prepared") },
    ],
    lens: { counts: ["Right: 85%", "At least four pull-offs or hammer-ons"], shown: ["How early each thumb rested", "Notes left unsounded"], never: ["Whether you prepare at all after this lesson"] },
    checks: (x): Check[] => [right(x, 0.85), { text: "PULL-OFFS {p} · HAMMER-ONS {h} (AIM 4 IN ALL)", vars: { p: x.prep.pullOffs, h: x.prep.hammerOns }, ok: x.prep.pullOffs + x.prep.hammerOns >= 4 }],
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
      { kind: "drill", m: ex(INV, LH, 14, 16, { bpm: 60 }, "Invention 1, left hand, bars 14–16: the octave of bar 15") },
      { kind: "drill", m: ex("wtc2f24", 1, 1, 8, { pct: 80 }, "Fugue II/24 in B minor, alto, bars 1–8, at 80%") },
      { kind: "play", m: ex("wtc2f24", 1, 1, 8, { pct: 100 }, "Fugue II/24 in B minor, alto, bars 1–8") },
    ],
    lens: { counts: ["Right: 80%"], shown: ["Leaps by thumb"], never: ["Which thumb"] },
    checks: (x): Check[] => [right(x, 0.8)],
    shown: (x): Check[] => [{ text: "LEAPS RIGHT {n} OF {m} · LEFT THUMB {l} · RIGHT THUMB {r}", vars: { n: x.leaps.ok, m: x.leaps.of, l: x.leaps.left, r: x.leaps.right }, ok: true }],
    before: ["Be at the far note before it arrives."],
    after: ["Good. Your thumbs draw the line as it is drawn on the page."],
    again: ["Do not drag one thumb across; the other is already there. Again."],
  },
  {
    id: "II.6",
    part: "II",
    title: "DER LAUF",
    english: "RUNS",
    minutes: 5,
    sound: "chip",
    aim: "A run played as one gesture of the hand.",
    hear: { stage: 0, styles: ["plain"] },
    aids: ["trend"],
    stages: [
      { kind: "drill", m: drill("tonleiter", "Drill: D minor, up and back, sixteen semiquavers a bar") },
      { kind: "drill", m: ex("wtc2f10", 0, 5, 6, { pct: 100 }, "Fugue II/10 in E minor, soprano, bars 5–6: triplet runs") },
      { kind: "play", m: ex("wtc2f12", 0, 2, 6, { pct: 100 }, "Fugue II/12 in F minor, soprano, bars 2–6: 34 semiquavers") },
    ],
    lens: { counts: ["RUN ✓ on two thirds of the runs", "Run notes right: 80%"], shown: ["Timing spread in the run"], never: ["Alternation", "Evenness"] },
    checks: (x): Check[] => [
      { text: "RUN ✓ {n} OF {m} (AIM TWO THIRDS)", vars: { n: x.runs.ok, m: x.runs.of }, ok: x.runs.of > 0 && x.runs.ok / x.runs.of >= 2 / 3 - 1e-9, na: !x.runs.of },
      { text: "RUN NOTES RIGHT {n} OF {m} (AIM 80%)", vars: { n: x.runs.notesRight, m: x.runs.notesOf }, ok: atLeast(x.runs.notesRight, x.runs.notesOf, 0.8), na: !x.runs.notesOf },
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
    sound: "harpsichord",
    aim: "Two voices, cleanly, which is what the 1723 title page asks of the beginner.",
    hear: { styles: ["plain"] },
    aids: [],
    stages: [{ kind: "play", m: ex(INV, RH, 1, 22, { bpm: 60 }, "Invention 1, right hand, the whole, at ♩ = 60") }],
    alt: ex(INV, LH, 1, 22, { bpm: 60 }, "Invention 1, left hand, the whole, at ♩ = 60"),
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
];

export const lessonById = (id: string): ManualLesson | undefined => MANUAL.find((l) => l.id === id);
export const lessonsOf = (p: PartId) => MANUAL.filter((l) => l.part === p);
/** The part's checkpoint (its last lesson marked so), if it has one. */
export const checkpointOf = (p: PartId) => MANUAL.find((l) => l.part === p && l.checkpoint);
/** The lessons played on the bars (not Part 0's screens). */
export const PLAYED = MANUAL.filter((l) => !l.screen);

/** A lesson passed by this run of its PLAY: every COUNTS line met (no pass mark: played through). */
export function lessonPassed(l: ManualLesson, x: LensStats, failed = false): boolean {
  if (failed) return false;
  return l.checks ? l.checks(x).every((c) => c.ok) : true;
}
/** A stage passed: the PLAY as the lesson; a DRILL by the lines it has something to measure (at least one). */
export function stagePassed(l: ManualLesson, kind: Stage["kind"], x: LensStats): boolean {
  if (kind === "play" || !l.checks) return lessonPassed(l, x);
  const cs = l.checks(x).filter((c) => !c.na);
  return cs.length > 0 && cs.every((c) => c.ok);
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
  const out: string[] = [...MANUAL_FLOW, ...Object.values(SOUND_WORD)];
  for (const p of PARTS) out.push(p.english);
  const xs = [-40, 0, 40].map((mean) => ({ ...ZERO_LENS, timing: { n: 9, mean, sd: 20, perfect: 5 } }));
  for (const l of MANUAL) {
    out.push(l.english, l.aim, ...l.before, ...l.after, ...l.again, ...l.lens.counts, ...l.lens.shown, ...l.lens.never, ...l.stages.map((s) => s.m.label));
    if (l.alt) out.push(l.alt.label);
    for (const x of xs) {
      out.push(...[...(l.checks?.(x) ?? []), ...(l.shown?.(x) ?? [])].map((c) => c.text));
      const t = l.told?.(x);
      if (t) out.push(t.text);
    }
  }
  return out;
}

/** THE MANUAL's own lines and buttons between the steps (BenchApp's flow), for the translations' check. */
export const MANUAL_FLOW = [
  "Now you.",
  "Good. On to the next.",
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
  "THE MANUAL",
  "THE LEFT HAND INSTEAD",
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
};

/** "{n} min" etc.: a lesson's line on the map. */
export const lessonMeta = (l: ManualLesson) => `${l.minutes} MIN${l.sound ? ` · ${tr(SOUND_WORD[l.sound])}` : ""}`;

/** A material as the game's run (lessons.ts Run): LADDER, no crowd, the drill's click, the demonstration's manner. */
export function runOf(m: Material, demoStyle?: DemoStyle): Run {
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
    ...(d?.click ? { click: d.click } : {}),
    ...(demoStyle && demoStyle !== "plain" ? { demoStyle } : {}),
  };
}
