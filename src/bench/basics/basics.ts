/**
 * D680 (design studio; the owner: BASICS, the first of three interactive tutorials, "with Glenn"; for now in the
 * developer view only): about five minutes of real Bach, each excerpt short and ending on the note it resolves to,
 * nothing scored, nothing failed. Glenn plays each passage first (HEAR), then the player plays it (PLAY), one word
 * by the thumb for what the step is about. Step 6 is one three-part segment played three times, a voice a time
 * (the owner: "you play a voice in a segment. Then it rewinds and you play another voice of same segment").
 *
 * The cuts (the studio's, from the score data; each passage ends on the downbeat its last bar leads to, spanOf):
 *   1 TIMING      Invention 1, upper voice: the subject's first four notes waiting for each tap, then bars 1–2 → C (bar 3)
 *   2 DIRECTION   Invention 1, upper voice, bars 3–6, the scale runs → the cadence in G (bar 7)
 *   3 LEAPS       Invention 8, upper voice, bars 1–2, the arpeggio subject → F (bar 3)
 *   4 TWO THUMBS  Invention 8, upper voice, bars 3–4, the semiquavers around the repeated C → F (bar 5)
 *   5 HOLDING     Sinfonia 9, the bass's chromatic descent, bars 1–2 → F (bar 3)
 *   6 POLYPHONY   Sinfonia 9, bars 3–4 (the first bars where all three voices sound: the subject above, the
 *                 chromatic line in the middle, the figures below) → C minor (bar 5), three passes: top, middle, bottom
 *   SURPRISE      the same two bars, the top voice, the sound changed every half bar, piano → chip → jazz → krautrock.
 * Slower than the game's tempo where a beginner needs it (never an added note: a wait only holds time).
 */
import type { Material } from "../manual/lessons.ts";
import { runOf } from "../manual/lessons.ts";
import type { Run } from "../lessons.ts";

export const INV1 = "inv01";
export const INV8 = "bwv779";
export const SIN9 = "bwv795";

/** What the box draws for a step (basics-aids.ts). */
export type BasicsAid = "tap" | "arrows" | "leaps" | "alternate" | "hold" | "you" | "swell" | "surprise";

export interface BasicsTake {
  /** The step (1–6, 7 the surprise). */
  step: number;
  /** HEAR: Glenn plays it (the game's demonstration); PLAY: the player. */
  kind: "hear" | "play";
  m: Material;
  /** The one word by the thumb (translated: basics-pt.ts, basics-es.ts). */
  word: string;
  aid: BasicsAid;
  /** Step 6: the pass (0 top, 1 middle, 2 bottom); Glenn rewinds before each but the first. */
  pass?: number;
}

const mat = (piece: string, voice: number, fromBar: number, toBar: number, bpm: number, label: string, o: Partial<Material> = {}): Material => ({ piece, voice, fromBar, toBar, tempo: { bpm }, label, badge: "IN GAME", ...o });

const both = (step: number, m: Material, word: string, aid: BasicsAid, play: Partial<Material> = {}): BasicsTake[] => [
  { step, kind: "hear", m, word, aid },
  { step, kind: "play", m: { ...m, ...play }, word, aid },
];

/** The steps' passages, in order (the runner's takes). */
export const BASICS: readonly BasicsTake[] = [
  // 1 TIMING: the first four notes wait at the gold line for a tap (the way not judged); then the two bars flowing.
  { step: 1, kind: "hear", m: mat(INV1, 0, 1, 2, 60, "Invention 1, upper voice, bars 1–2"), word: "TAP", aid: "tap" },
  { step: 1, kind: "play", m: mat(INV1, 0, 1, 2, 60, "Invention 1, the subject's first four notes", { count: 4, wait: true, easy: "timing", widen: 2 }), word: "TAP", aid: "tap" },
  { step: 1, kind: "play", m: mat(INV1, 0, 1, 2, 60, "Invention 1, upper voice, bars 1–2", { easy: "timing", widen: 2 }), word: "TAP", aid: "tap" },
  // 2 DIRECTION: the scale runs; an arrow on the bars, up or down, fading as the moves come right.
  ...both(2, mat(INV1, 0, 3, 6, 60, "Invention 1, upper voice, bars 3–6"), "↑ ↓", "arrows", { widen: 2 }),
  // 3 LEAPS: the arpeggio subject.
  ...both(3, mat(INV8, 0, 1, 2, 66, "Invention 8, upper voice, bars 1–2"), "LEAPS", "leaps", { widen: 2 }),
  // 4 TWO THUMBS: the semiquavers, the bars lit left and right in turn.
  ...both(4, mat(INV8, 0, 3, 4, 60, "Invention 8, upper voice, bars 3–4"), "TWO THUMBS", "alternate", { widen: 2 }),
  // 5 HOLDING: the slow chromatic line; the long blocks drain while held.
  ...both(5, mat(SIN9, 2, 1, 2, 40, "Sinfonia 9, the bass, bars 1–2"), "HOLD", "hold"),
  // 6 POLYPHONY: one segment, a voice a pass (top, middle, bottom); the tip (STRONG · SOFT) on the middle pass, the slow one.
  { step: 6, kind: "play", m: mat(SIN9, 0, 3, 4, 36, "Sinfonia 9, bars 3–4, the top voice"), word: "YOU", aid: "you", pass: 0 },
  { step: 6, kind: "play", m: mat(SIN9, 1, 3, 4, 36, "Sinfonia 9, bars 3–4, the middle voice"), word: "STRONG · SOFT", aid: "swell", pass: 1 },
  { step: 6, kind: "play", m: mat(SIN9, 2, 3, 4, 36, "Sinfonia 9, bars 3–4, the bottom voice"), word: "YOU", aid: "you", pass: 2 },
  // SURPRISE: the same bars again, the sound changing every half bar.
  { step: 7, kind: "play", m: mat(SIN9, 0, 3, 4, 40, "Sinfonia 9, bars 3–4, the top voice"), word: "Pick any piece.", aid: "surprise" },
];

/** The surprise's sounds, a half bar each (sound.ts preset ids): piano → CLASSIC CHIP → JAZZ QUARTET → KRAUTROCK. */
export const SURPRISE_SOUNDS = ["pianoSampled", "chip", "jazzQuartet", "krautrock"] as const;
export const BASICS_SOUND = "pianoSampled";

/** A take as the game's run: LADDER, nothing failed, no metronome (the piano alone), a count-in before a flowing take. */
export function basicsRun(t: BasicsTake): Run {
  const r = runOf(t.m, undefined, [], false, false);
  return {
    ...r,
    // The other voices drawn and sounded (the polyphony is the point), the player's line bright, the rest dim (the box's own).
    solo: false,
    tut: { thumbsA: true, ...(t.m.widen ? { widen: t.m.widen } : {}), ...(t.m.wait || t.kind === "hear" ? {} : { countBeats: 4 }) },
  };
}

/** The bad miss that rewinds a passage (no failure: it is played again, quietly): this many misses in a row. */
export const REWIND_MISSES = 3;
/** Glenn's page turn between excerpts, and his rewind between step 6's passes (ms). */
export const TURN_MS = 1000;

/** D680: the player is a beginner while no piece has a B or better (the card glows). */
export const beginner = (best: Readonly<Record<string, string>>) => !Object.values(best).some((g) => g === "S" || g === "A" || g === "B");

/** The step a take begins (a new excerpt: Glenn turns the page). */
export const turnsPage = (k: number) => k > 0 && BASICS[k].m.piece + BASICS[k].m.fromBar + BASICS[k].m.toBar !== BASICS[k - 1].m.piece + BASICS[k - 1].m.fromBar + BASICS[k - 1].m.toBar;
