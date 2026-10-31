/**
 * D400 (the design studio's brief, docs/design/STUDIO-REAL-SCREEN.md, approved by the owner on 31 Oct 2026):
 * THE REAL PLAY SCREEN IN THE TUTORIAL, DRESSED GRADUALLY. Each element of the game's screen comes on in the
 * lesson that first needs it, is introduced once by one of Herr Bach's bubbles while the rest of the screen
 * is dimmed (the round paused), and stays on for every lesson after it. From 6.8 THE REAL THING (a tour of
 * the whole screen, then a fugue subject played on it) the tutorial never shows a simplified screen again.
 *
 * Always on (1.1's tour introduces them): the box, the gold line, the two strips, your voice's label
 * (YOU · UPPER). The rest, by lesson (MANUAL's order; the fugue track after 6.8, so it plays on the full screen):
 *   1.5  voices     the other voices' inks and the voice bar (YOU · LOWER, the others named)
 *   2.1  score, verdicts, bar    the score (left strip), the verdicts (NICE, MISS), the bar counter
 *   3.2  marks      the signs over the notes and their legend on the right strip (3.1's HELD has no sign)
 *   3.6  accuracy, crowd, hint   ACCURACY, the crowd's meter, the hint card (his words behind the gold line)
 *   6.8  subjects, stops, pause  SUBJECTS 0/1, the organ's stops, pause ❚❚ (the SUBJECT flag and effect are
 *                                the material's own, D379: shown where a lesson asks; a SPOT step hides them)
 * Introduced once per player (the record's `dressed`, tb-tutorial-v2): a player who begins later meets the
 * bubbles of whatever is new to them in the first lesson that shows it.
 */
// Data only (no import of lessons.ts: course2.ts builds 6.8 from REAL_TOUR); which lesson dresses what: dress-of.ts.

export type DressId = "voices" | "score" | "verdicts" | "bar" | "marks" | "accuracy" | "crowd" | "hint" | "subjects" | "stops" | "pause";
/** Where a bubble's spotlight falls (BenchApp's Spotlight). */
export type DressFocus = DressId | "all" | "box" | "accSubjects" | "voicesPause";

export interface DressLine {
  text: string;
  focus: DressFocus;
  /** What the element is (a sample shown in the spotlight: a verdict). */
  sample?: string;
}

/** Each element, the lesson it comes on in, and his bubble introducing it. */
export const DRESS: { id: DressId; at: string; line: DressLine }[] = [
  { id: "voices", at: "1.5", line: { text: "From now on you play with me. My voices are drawn in their own colours, and the bar below names them: yours, and mine.", focus: "voices" } },
  { id: "score", at: "2.1", line: { text: "Your score. Every note you play well adds to it.", focus: "score" } },
  { id: "verdicts", at: "2.1", line: { text: "My verdict on each note you play appears here, beside your thumb.", focus: "verdicts", sample: "GOOD" } },
  { id: "bar", at: "2.1", line: { text: "Where you are: bar {n} of {m}.", focus: "bar" } },
  { id: "marks", at: "3.2", line: { text: "The signs over the notes, explained beside them.", focus: "marks" } },
  { id: "accuracy", at: "3.6", line: { text: "How exactly you are playing: the share of your notes played right so far.", focus: "accuracy" } },
  { id: "crowd", at: "3.6", line: { text: "The crowd. It grows when you play well and thins when you stumble.", focus: "crowd" } },
  { id: "hint", at: "3.6", line: { text: "My notes to you while you play. Read them in the rests.", focus: "hint" } },
  { id: "subjects", at: "6.8", line: { text: "How many of the subject's entries you played whole.", focus: "subjects" } },
  { id: "stops", at: "6.8", line: { text: "The stops. One touch changes the sound, even while you play.", focus: "stops" } },
  { id: "pause", at: "6.8", line: { text: "And pause, whenever you need it.", focus: "pause" } },
];

/** THE REAL THING's opening tour (the brief's eleven bubbles, one element lit at a time, the round paused). */
export const REAL_TOUR: DressLine[] = [
  { text: "This is the real screen, the one you will play on. You know the box already; now the rest.", focus: "all" },
  { text: "Your score. Every note you play well adds to it.", focus: "score" },
  { text: "Where you are: bar {n} of {m}.", focus: "bar" },
  { text: "How exactly you played, and how many of the subject's entries you played whole.", focus: "accSubjects" },
  { text: "The crowd. It grows when you play well and thins when you stumble.", focus: "crowd" },
  { text: "My verdict on the note you just played.", focus: "verdicts", sample: "GOOD" },
  { text: "My notes to you while you play. Read them in the rests.", focus: "hint" },
  { text: "Here the subject enters. Your voice has it; it glows while it lasts.", focus: "box" },
  { text: "The signs over the notes, explained beside them.", focus: "marks" },
  { text: "The stops. One touch changes the sound, even while you play.", focus: "stops" },
  { text: "Your voice and the others. And pause, whenever you need it.", focus: "voicesPause" },
];

/** Every English text of the dressing (the translations' check). */
export const DRESS_TEXTS = [...DRESS.map((d) => d.line.text), ...REAL_TOUR.map((l) => l.text), "THE REAL THING"];
