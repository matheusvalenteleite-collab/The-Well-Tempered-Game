/**
 * The tutorial's course (D140): from reading a note to the end of the game, in chapters of short
 * lessons. Every musical example is Fux's: the first exercise of each species is set over the same
 * cantus firmus in D (Figs. 5, 33, 55, 73, 82 in two voices, Fig. 101 in three), so the learner
 * follows one melody through the whole book. Writing tasks leave a few of Fux's notes out and judge
 * the learner's with the rules of that very exercise in the game; "Show me" puts Fux's back.
 */
import type { FuxRepository } from "../music/fux/repository.ts";
import { ALL_STEPS, ruleById, rulesForStep } from "../counterpoint/curriculum/index.ts";
import { exerciseView } from "../game/exercise-view.ts";
import { playerStaves, TRIO_SPECIES, trioSteps, type TrioStep } from "../game/trio.ts";
import { LIBRARY } from "../wtc/library.ts";
import { fugueFacts, fugueNotes, trioNotes } from "./poly.ts";
import { parsePitch } from "../music/pitch.ts";
import { HOLD, REST } from "../counterpoint/layout.ts";
import {
  blank,
  chordAnswer,
  classAnswer,
  freeScene,
  intervalAnswer,
  motionAnswer,
  slotsOf,
  type Chapter,
  type Clip,
  type Lesson,
  type QuizItem,
  type Scene,
  type TrioScene,
  type Verdict,
} from "./model.ts";

/** Ids of the curriculum steps the tutorial leans on: the first exercise of each species. */
export const STEP_IDS = {
  first: "fux-mode.s1.01",
  firstBelow: "fux-mode.s1.02",
  second: "fux-mode.s2.01",
  third: "fux-mode.s3.01",
  fourth: "fux-mode.s4.01",
  fifth: "fux-mode.s5.01",
  trio: "fux-mode.t1.01",
} as const;

/** A scene from a curriculum step: its cantus, layout and rules, Fux's line with `open` left out. */
export function stepScene(repo: FuxRepository, stepId: string, open: number[] = [], window?: [number, number]): Scene {
  const step = ALL_STEPS.find((s) => s.id === stepId);
  if (!step) throw new Error(`unknown step ${stepId}`);
  const v = exerciseView(repo, step);
  if (!v.fux) throw new Error(`${stepId} has no solution by Fux`);
  return {
    cantus: v.cantus,
    cantusVoice: v.cantusVoice,
    clefs: v.clefs.modern,
    species: v.species,
    modalFinal: v.modalFinal,
    layout: v.layout,
    start: blank(v.fux, open),
    open,
    answer: v.fux,
    window,
    rules: rulesForStep(stepId),
    stepId,
  };
}

const all = (s: Scene) => s.layout.map((_, k) => k);

/** Bars lo..hi of a step scene left open (the rest is Fux's). */
function barsOpen(repo: FuxRepository, stepId: string, lo: number, hi: number, window?: [number, number]): Scene {
  const probe = stepScene(repo, stepId);
  // A rest that opens the line is part of the given (Fux's half rest), never a blank.
  const open = slotsOf(probe, lo, hi).filter((k) => probe.answer![k] !== REST);
  return stepScene(repo, stepId, open, window);
}

const sceneClip = (id: string, scene: Scene, from?: number, to?: number): Clip => ({ id, kind: "scene", scene, from, to });
const cols = (id: string, ...columns: string[][]): Clip => ({ id, kind: "columns", columns });

// ---------------------------------------------------------------- "write" checks (the first lessons)

const midi = (p: string) => parsePitch(p).midi;

/** Four notes, each higher than the one before. */
function rising(notes: (string | null)[]): Verdict {
  const written = notes.filter((n): n is string => n !== null);
  for (let k = 1; k < notes.length; k++) {
    const a = notes[k - 1];
    const b = notes[k];
    if (a && b && midi(b) <= midi(a)) return { done: false, tone: "bad", key: "notHigher", vars: { bar: k + 1 } };
  }
  if (written.length < notes.length) return { done: false, tone: "info", key: "fillAll", vars: { n: notes.length - written.length } };
  return { done: true, tone: "ok", key: "wellDone" };
}

/** C, D, E, F rising by step, in any octave. */
function cdef(notes: (string | null)[]): Verdict {
  const want = ["C", "D", "E", "F"];
  for (let k = 0; k < notes.length; k++) {
    const n = notes[k];
    if (!n) continue;
    const p = parsePitch(n);
    if (p.step !== want[k] || p.alter !== 0) return { done: false, tone: "bad", key: "wrongLetter", vars: { bar: k + 1, want: want[k], got: p.step + (p.alter > 0 ? "♯" : p.alter < 0 ? "♭" : "") } };
    const prev = notes[k - 1];
    if (k > 0 && prev && parsePitch(n).diatonic !== parsePitch(prev).diatonic + 1) return { done: false, tone: "bad", key: "notStep", vars: { bar: k + 1 } };
  }
  if (notes.some((n) => n === null)) return { done: false, tone: "info", key: "fillAll", vars: { n: notes.filter((n) => n === null).length } };
  return { done: true, tone: "ok", key: "wellDone" };
}

/** A C♯ somewhere. */
function sharp(notes: (string | null)[]): Verdict {
  if (notes.some((n) => n && /^C#\d$/.test(n))) return { done: true, tone: "ok", key: "sharpDone" };
  if (notes.some((n) => n && /^C\d$/.test(n))) return { done: false, tone: "info", key: "sharpNow" };
  if (notes.some((n) => n && /#/.test(n))) return { done: false, tone: "info", key: "sharpOther" };
  return { done: false, tone: "info", key: "sharpStart" };
}

// ---------------------------------------------------------------- quizzes (answers computed)

const ivItem = (lower: string, upper: string): QuizItem => ({ columns: [[lower, upper]], answer: intervalAnswer(lower, upper) });
const classItem = (lower: string, upper: string): QuizItem => ({ columns: [[lower, upper]], answer: classAnswer(lower, upper) });
const motionItem = (a: string[], b: string[]): QuizItem => ({ columns: [a, b], answer: motionAnswer(a, b) });

// ---------------------------------------------------------------- the course

export interface TutorialData {
  repo: FuxRepository;
  trio: TrioStep[];
  /** The three-voice data (all five species are read from it). */
  trioData?: unknown;
}

import { FUGUE_ID } from "./fugue-id.ts";
export { FUGUE_ID };
/** A whole note of the fugue, in seconds (a quarter at about 72). */
const FUGUE_WHOLE = 3.3;

export function trioScene(step: TrioStep, open: [number, number][]): TrioScene {
  return {
    modalFinal: step.modalFinal,
    cantusIndex: step.cantusIndex,
    clefs: step.clefs,
    start: step.fux.map((line, staff) => line.map((p, bar) => (open.some(([s, b]) => s === staff && b === bar) ? null : p))),
    open,
    answer: step.fux,
    stepId: step.id,
  };
}

/**
 * Fifth species, the choice of a bar: Fux's bar 3 (crotchets G F E G over the cantus's E) beside
 * two rewritings, each breaking one rule of the species. Which option is right is the engine's
 * verdict (checked in test/tutorial.test.ts), not ours.
 */
export const FIFTH_CHOICE: Record<"fux" | "quavers" | "struck", string[]> = {
  // Bar 3, eight quaver slots (a pitch starts a note; "~" holds it).
  fux: ["G4", HOLD, "F4", HOLD, "E4", HOLD, "G4", HOLD],
  // Two quavers on the first crotchet: quavers belong on the second or fourth.
  quavers: ["G4", "F4", "E4", HOLD, "F4", HOLD, "G4", HOLD],
  // A dissonance struck on the downbeat (F against E), not tied over.
  struck: ["F4", HOLD, HOLD, HOLD, "G4", HOLD, HOLD, HOLD],
};

export function buildCourse({ repo, trio, trioData }: TutorialData): Chapter[] {
  const first = stepScene(repo, STEP_IDS.first);
  const second = stepScene(repo, STEP_IDS.second);
  const third = stepScene(repo, STEP_IDS.third);
  const fourth = stepScene(repo, STEP_IDS.fourth);
  const fifth = stepScene(repo, STEP_IDS.fifth);
  const t1 = trio.find((s) => s.id === STEP_IDS.trio);
  if (!t1) throw new Error("three-voice exercise 1 missing");
  const cf = first.cantus;

  // Fifth species options: Fux's line with bar 3 (index 2) replaced.
  const bar3 = slotsOf(fifth, 2, 2);
  const withBar3 = (bar: string[]) => fifth.answer!.map((n, k) => (bar3.includes(k) ? bar[bar3.indexOf(k)] : n));
  const fifthWindow: Scene = { ...fifth, window: [1, 3], start: fifth.answer!, open: [] };

  // Free scenes of the first lessons: a held D below, four bars to write in above.
  const held = freeScene(["D3", "D3", "D3", "D3"]);
  const firstRules = (ids: string[]) => ids.map((id) => ruleById(id)!);

  // Three voices, species two to five: Fux's first example of each, again on the D cantus.
  const moving = trioData ? TRIO_SPECIES.filter((n) => n > 1).map((n) => trioSteps(trioData as never, n)[0]) : [];
  // The fugue chapter: Bach's C major fugue, Book I.
  const F = LIBRARY.find((x) => x.id === FUGUE_ID)!.fugue();
  const facts = fugueFacts(F);
  const poly = (id: string, from: number, to: number, only?: number[]): Clip => {
    const notes = fugueNotes(F, from, to, only);
    return { id, kind: "poly", notes, seconds: FUGUE_WHOLE, span: { from, to }, voices: [...new Set(notes.map((n) => n.voice))] };
  };
  const expo = F.entries.slice(0, F.count);
  const [s1, s2] = facts.stretto ?? [0, 1];

  const chapters: Chapter[] = [
    {
      id: "welcome",
      lessons: [
        { id: "welcome.hello", task: { kind: "read" } },
        { id: "welcome.goal", scene: { ...first, start: first.answer!, open: [] }, task: { kind: "listen", clips: [sceneClip("fig5", first)] } },
        { id: "welcome.how", task: { kind: "read" } },
      ],
    },
    {
      id: "notes",
      lessons: [
        { id: "notes.staff", scene: held, task: { kind: "write", check: rising } },
        { id: "notes.letters", scene: held, task: { kind: "write", check: cdef } },
        {
          id: "notes.octave",
          task: {
            kind: "listen",
            clips: [
              { id: "scale", kind: "melody", notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"], seconds: 0.45 },
              { id: "octave", kind: "melody", notes: ["C4", "C5", "D4", "D5"], seconds: 0.7 },
            ],
          },
        },
        {
          id: "notes.steps",
          task: { kind: "choice", options: [{ id: "step", correct: false }, { id: "leap", correct: true }] },
          clips: [{ id: "gb", kind: "melody", notes: ["G4", "B4"], seconds: 0.7 }, { id: "gab", kind: "melody", notes: ["G4", "A4", "B4"], seconds: 0.5 }],
        },
        { id: "notes.sharp", scene: freeScene(["D3", "D3"]), task: { kind: "write", check: sharp } },
      ],
    },
    {
      id: "intervals",
      lessons: [
        {
          id: "intervals.count",
          task: { kind: "quiz", quiz: "interval", choices: ["1", "2", "3", "4", "5", "6", "7", "8"], items: [ivItem("D4", "F4"), ivItem("D4", "A4"), ivItem("E4", "C5"), ivItem("D4", "D5"), ivItem("F4", "G4"), ivItem("C4", "F4"), ivItem("G3", "E4"), ivItem("D3", "F4")] },
        },
        {
          id: "intervals.sound",
          task: {
            kind: "listen",
            clips: [cols("third", ["D4", "F4"]), cols("sixth", ["D4", "B4"]), cols("fifth", ["D4", "A4"]), cols("octave", ["D4", "D5"]), cols("second", ["D4", "E4"]), cols("seventh", ["D4", "C5"]), cols("fourth", ["D4", "G4"]), cols("tritone", ["F4", "B4"])],
          },
        },
        {
          id: "intervals.classes",
          task: {
            kind: "quiz",
            quiz: "class",
            choices: ["perfect", "imperfect", "dissonant"],
            items: [classItem("D4", "A4"), classItem("D4", "F4"), classItem("D4", "E4"), classItem("D4", "B4"), classItem("D4", "D5"), classItem("D4", "G4"), classItem("F4", "B4"), classItem("D3", "F4"), classItem("A3", "E5"), classItem("E4", "D5")],
          },
        },
      ],
    },
    {
      id: "motion",
      lessons: [
        {
          id: "motion.kinds",
          task: {
            kind: "listen",
            clips: [cols("contrary", ["D4", "A4"], ["E4", "G4"]), cols("oblique", ["D4", "A4"], ["D4", "B4"]), cols("similar", ["D4", "F4"], ["E4", "B4"]), cols("parallel", ["D4", "F4"], ["E4", "G4"])],
          },
        },
        {
          id: "motion.quiz",
          task: {
            kind: "quiz",
            quiz: "motion",
            choices: ["contrary", "oblique", "similar", "parallel"],
            items: [motionItem(["D4", "A4"], ["E4", "G4"]), motionItem(["F4", "A4"], ["G4", "B4"]), motionItem(["E4", "C5"], ["E4", "B4"]), motionItem(["G3", "B4"], ["A3", "A4"]), motionItem(["D4", "F4"], ["G4", "D5"]), motionItem(["A3", "F4"], ["G3", "G4"])],
          },
        },
        {
          id: "motion.rule",
          clips: [cols("parallelFifths", ["D4", "A4"], ["E4", "B4"], ["F4", "C5"]), cols("contraryFifth", ["F4", "A4"], ["E4", "B4"])],
          scene: freeScene(["D4", "E4"], { start: ["A4", null], answer: ["A4", "G4"], rules: firstRules(["fs.vertical-consonance", "fs.perfect-approach"]) }),
          task: { kind: "judge" },
        },
      ],
    },
    {
      id: "cantus",
      lessons: [
        { id: "cantus.firm", task: { kind: "listen", clips: [{ id: "cf", kind: "melody", notes: cf, seconds: 0.8 }] } },
        {
          id: "cantus.modes",
          task: {
            kind: "listen",
            clips: (["D", "E", "F", "G", "A", "C"] as const).map((f) => {
              const start = parsePitch(`${f}4`).diatonic;
              const notes = Array.from({ length: 8 }, (_, k) => `${"CDEFGAB"[(start + k) % 7]}${Math.floor((start + k) / 7)}`);
              return { id: f, kind: "melody" as const, notes, seconds: 0.35 };
            }),
            need: 1,
          },
        },
        {
          id: "cantus.five",
          task: { kind: "listen", clips: [sceneClip("s1", first), sceneClip("s2", second), sceneClip("s3", third), sceneClip("s4", fourth), sceneClip("s5", fifth)], need: 1 },
        },
      ],
    },
    {
      id: "first",
      lessons: [
        { id: "first.rules", scene: { ...first, start: first.answer!, open: [] }, intervals: true, task: { kind: "read" }, clips: [sceneClip("fig5", first)] },
        { id: "first.end", scene: stepScene(repo, STEP_IDS.first, [9, 10]), intervals: true, task: { kind: "judge" } },
        { id: "first.begin", scene: stepScene(repo, STEP_IDS.first, [0]), intervals: true, task: { kind: "judge" } },
        { id: "first.middle", scene: stepScene(repo, STEP_IDS.first, [3, 4, 5, 6]), intervals: true, task: { kind: "judge" } },
        {
          id: "first.melody",
          task: {
            kind: "choice",
            scene: freeScene(["D3", "D3"], { start: ["D4", "A4"], rules: firstRules(["fs.melodic-tritone", "fs.melodic-major-sixth"]) }),
            options: [
              { id: "tritone", notes: ["F4", "B4"], correct: false },
              { id: "sixth", notes: ["C4", "A4"], correct: false },
              { id: "fifth", notes: ["D4", "A4"], correct: true },
            ],
          },
        },
        { id: "first.hint", task: { kind: "read" } },
        { id: "first.whole", scene: stepScene(repo, STEP_IDS.first, all(first)), task: { kind: "judge" } },
        { id: "first.below", scene: stepScene(repo, STEP_IDS.firstBelow, [0, 9, 10]), intervals: true, task: { kind: "judge" } },
        { id: "first.game", task: { kind: "game", voices: 2, stepId: STEP_IDS.first } },
      ],
    },
    {
      id: "second",
      lessons: [
        { id: "second.what", scene: { ...second, start: second.answer!, open: [] }, intervals: true, task: { kind: "listen", clips: [sceneClip("fig33", second)] } },
        { id: "second.passing", scene: stepScene(repo, STEP_IDS.second, [9], [3, 5]), intervals: true, task: { kind: "judge" } },
        { id: "second.bars", scene: barsOpen(repo, STEP_IDS.second, 5, 6, [4, 7]), intervals: true, task: { kind: "judge" } },
        { id: "second.cadence", scene: stepScene(repo, STEP_IDS.second, [18, 19], [7, 10]), intervals: true, task: { kind: "judge" } },
        { id: "second.game", task: { kind: "game", voices: 2, stepId: STEP_IDS.second } },
      ],
    },
    {
      id: "third",
      lessons: [
        { id: "third.what", scene: { ...third, start: third.answer!, open: [] }, task: { kind: "listen", clips: [sceneClip("fig55", third)] } },
        { id: "third.cambiata", scene: stepScene(repo, STEP_IDS.third, [10], [1, 3]), intervals: true, task: { kind: "judge" } },
        { id: "third.bar", scene: barsOpen(repo, STEP_IDS.third, 4, 4, [3, 5]), intervals: true, task: { kind: "judge" } },
        { id: "third.cadence", scene: barsOpen(repo, STEP_IDS.third, 9, 9, [8, 10]), intervals: true, task: { kind: "judge" } },
        { id: "third.game", task: { kind: "game", voices: 2, stepId: STEP_IDS.third } },
      ],
    },
    {
      id: "fourth",
      lessons: [
        { id: "fourth.what", scene: { ...fourth, start: fourth.answer!, open: [] }, intervals: true, task: { kind: "listen", clips: [sceneClip("fig73", fourth)] } },
        { id: "fourth.resolve", scene: stepScene(repo, STEP_IDS.fourth, [5], [1, 3]), intervals: true, task: { kind: "judge" } },
        { id: "fourth.chain", scene: stepScene(repo, STEP_IDS.fourth, [6, 7, 8], [2, 5]), intervals: true, task: { kind: "judge" } },
        { id: "fourth.cadence", scene: stepScene(repo, STEP_IDS.fourth, [18, 19], [7, 10]), intervals: true, task: { kind: "judge" } },
        { id: "fourth.game", task: { kind: "game", voices: 2, stepId: STEP_IDS.fourth } },
      ],
    },
    {
      id: "fifth",
      lessons: [
        { id: "fifth.what", scene: { ...fifth, start: fifth.answer!, open: [] }, task: { kind: "listen", clips: [sceneClip("fig82", fifth)] } },
        {
          id: "fifth.choose",
          task: {
            kind: "choice",
            scene: fifthWindow,
            options: [
              { id: "quavers", notes: withBar3(FIFTH_CHOICE.quavers), correct: false },
              { id: "fux", notes: withBar3(FIFTH_CHOICE.fux), correct: true },
              { id: "struck", notes: withBar3(FIFTH_CHOICE.struck), correct: false },
            ],
          },
        },
        { id: "fifth.game", task: { kind: "game", voices: 2, stepId: STEP_IDS.fifth } },
      ],
    },
    {
      id: "three",
      lessons: [
        { id: "three.bass", trio: trioScene(t1, []), task: { kind: "listen", clips: [{ id: "fig101", kind: "columns", columns: t1.cantus.map((_, k) => t1.fux.map((l) => l[k])), seconds: 1.4 }] } },
        {
          id: "three.chords",
          trio: trioScene(t1, []),
          task: {
            kind: "quiz",
            quiz: "chord",
            choices: ["53", "63", "incomplete"],
            // Fux's own sonorities in Fig. 101: the bare first and last bars, and full ones between.
            items: [0, 1, 3, 4, 7, 10].map((k) => {
              const column = t1.fux.map((l) => l[k]);
              return { columns: [column], answer: chordAnswer(column), bar: k };
            }),
          },
        },
        { id: "three.fill", trio: trioScene(t1, playerStaves(t1).flatMap((s) => [[s, 4], [s, 5]] as [number, number][]).filter(([s]) => s === playerStaves(t1)[0])), task: { kind: "trio" } },
        { id: "three.cadence", trio: trioScene(t1, playerStaves(t1).map((s) => [s, 9] as [number, number])), task: { kind: "trio" } },
        {
          id: "three.moving",
          task: { kind: "listen", clips: moving.map((s) => ({ id: `t${s.species}`, kind: "poly" as const, notes: trioNotes(s), seconds: 2.4 })), need: 1 },
        },
        { id: "three.game", task: { kind: "game", voices: 3, stepId: STEP_IDS.trio } },
      ],
    },
    {
      id: "four",
      lessons: [{ id: "four.preview", task: { kind: "read" } }],
    },
    {
      id: "fugue",
      lessons: [
        { id: "fugue.what",
          roll: FUGUE_ID, task: { kind: "listen", clips: [poly("subject", expo[0].at, expo[0].end, expo[0].notes), poly("opening", 0, expo[1].end)] } },
        { id: "fugue.entries",
          roll: FUGUE_ID, task: { kind: "listen", clips: expo.map((e, k) => poly(`entry${k + 1}`, e.at, e.end, e.notes)) } },
        {
          id: "fugue.voices",
          roll: FUGUE_ID,
          clips: [poly("exposition", 0, facts.exposition.to)],
          task: { kind: "choice", options: [3, 4, 5].map((n) => ({ id: `v${n}`, correct: n === facts.voices })) },
        },
        {
          id: "fugue.answer",
          roll: FUGUE_ID,
          task: { kind: "listen", clips: [poly("subjectAlone", expo[0].at, expo[0].end, expo[0].notes), poly("answerAlone", expo[1].at, expo[1].end, expo[1].notes), poly("both", expo[0].at, expo[1].end)] },
        },
        {
          id: "fugue.stretto",
          roll: FUGUE_ID,
          task: {
            kind: "listen",
            clips: [poly("strettoAlone", F.entries[s1].at, F.entries[s2].end, [...F.entries[s1].notes, ...F.entries[s2].notes]), poly("strettoAll", F.entries[s1].at, F.entries[s2].end)],
          },
        },
        { id: "fugue.study", task: { kind: "game", voices: "wtc" } },
      ],
    },
    {
      id: "end",
      lessons: [
        { id: "end.path", task: { kind: "read" } },
        { id: "end.tour", task: { kind: "tour" } },
      ],
    },
  ];
  return chapters;
}

/** Every lesson in order, with its chapter. */
export const lessonsOf = (chapters: Chapter[]): { chapter: string; lesson: Lesson }[] => chapters.flatMap((c) => c.lessons.map((lesson) => ({ chapter: c.id, lesson })));
