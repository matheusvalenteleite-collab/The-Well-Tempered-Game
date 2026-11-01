/**
 * D268, THE SCORE SHEET: what a run came to, worked out of the engine's counts. The points by where
 * they came from; four qualities of the playing, each a share (the right notes, their timing, their
 * articulation, the subject's entries captured), weighed into one PERFORMANCE out of 100; a finished
 * run's points raised by up to a half for it (the FINAL SCORE); on a failed run, how far it went and
 * what cost it most. D325: ARTICULATION judges the joins by the player's own touch (intention.ts), and
 * its points are no longer LEGATO's; TIMING says how many PERFECTs came in expressive time.
 * D445 (the scoring redesigned, scoring.ts): the PERFORMANCE is the run's one measure of quality, out of
 * 100, of four named parts (NOTES 60, TIMING 15, TOUCH 15: the joins, holds, rests and the reading's
 * signs together, ENTRIES 10: each entry by the share of its notes right); the grade follows from it; the
 * FINAL is the points times the performance (no bonus on top).
 */
import type { ArtStats } from "./articulation.ts";
import type { ScoreSource } from "./proto-game.ts";
import { GOOD_TIMING, gradeFor, PERFORMANCE_WEIGHTS } from "./scoring.ts";

export interface SheetInput {
  right: number;
  wrong: number;
  missed: number;
  stray: number;
  of: number;
  score: number;
  captured: number;
  entries: number;
  maxStreak: number;
  art: ArtStats;
  earned: Record<ScoreSource, number>;
  perfects: number;
  goods: number;
  /** The run failed (the crowd left). */
  failed: boolean;
  /** How far through the piece the run went, 0..1. */
  progress: number;
  /** D272: the reading's asks met, of those judged (absent: no reading). */
  style?: { hit: number; of: number };
  /** D325b: the strikes PERFECT by expressive time (absent: before D325). */
  graces?: { agogic: number; breath: number; broaden: number; revoked?: number };
  /** D445: each judged entry's share of its notes right (partial credit). */
  entryShares?: number[];
}

export interface Quality {
  key: "notes" | "timing" | "touch" | "entries";
  label: string;
  /** 0..1, or null when there was nothing to judge (left out of the weighing). */
  share: number | null;
  /** What it counts, in words ("212 OF 230"). */
  detail: string;
  weight: number;
}

export interface Sheet {
  /** The points by source, the empty ones left out, largest first. */
  points: { source: ScoreSource; label: string; pts: number }[];
  qualities: Quality[];
  /** 0..100, rounded once (as shown, and as graded). */
  performance: number;
  /** D445: the grade the performance gives (S 95, A 90, B 80, C 70, D below). */
  grade: string;
  /** D445: the points times the performance. */
  final: number;
  /** D272: the reading's asks met, of those judged (null: no reading), for the lessons that ask it. */
  signs: number | null;
  /** On a failed run: what cost it most, in a line (else ""). */
  advice: string;
}

export const SOURCE_LABEL: Record<ScoreSource, string> = {
  notes: "NOTES",
  articulation: "ARTICULATION",
  held: "HELD NOTES",
  subjects: "SUBJECTS",
  cadences: "CADENCES",
  bonus: "BONUSES",
  reading: "THE READING",
};

const share = (x: number, of: number): number | null => (of > 0 ? Math.max(0, Math.min(1, x / of)) : null);

export function scoreSheet(r: SheetInput): Sheet {
  const points = (Object.keys(SOURCE_LABEL) as ScoreSource[])
    .map((source) => ({ source, label: SOURCE_LABEL[source], pts: Math.round(r.earned[source] ?? 0) }))
    .filter((p) => p.pts > 0)
    .sort((a, b) => b.pts - a.pts);
  // A stray tap weighs half a note (as the grade).
  const accOf = r.of + r.stray / 2;
  const art = r.art;
  // D325: the joins judged by intention (consistent with the player's own touch, or as the reading marks them), where they were; else D218's legato.
  const byTouch = art.touchOf !== undefined;
  const joins = byTouch ? share(art.touchOk ?? 0, art.touchOf ?? 0) : share(art.legato, art.legatoOf);
  const artParts = [joins];
  const joinsDetail = byTouch ? art.touchOf && `${art.touch ?? "TOUCH"} TOUCH ${art.touchOk ?? 0}/${art.touchOf}` : art.legatoOf && `LEGATO ${art.legato}/${art.legatoOf}`;
  const artDetail = [joinsDetail, art.heldOf && `HELD ${art.held}/${art.heldOf}`, art.cleanOf && `RESTS ${art.clean}/${art.cleanOf}`].filter(Boolean).join(" · ");
  const expressive = r.graces ? r.graces.agogic + r.graces.breath + r.graces.broaden : 0;
  // TOUCH: the joins, holds and rests (D218, D325) and the reading's asks (D272), each judged one counted alike.
  const touchHit = (byTouch ? (art.touchOk ?? 0) : art.legato) + art.held + art.clean + (r.style?.hit ?? 0);
  const touchOf = (byTouch ? (art.touchOf ?? 0) : art.legatoOf) + art.heldOf + art.cleanOf + (r.style?.of ?? 0);
  const touchDetail = [artDetail, r.style?.of ? `SIGNS ${r.style.hit}/${r.style.of}` : ""].filter(Boolean).join(" · ");
  const shares = r.entryShares ?? [];
  const W = PERFORMANCE_WEIGHTS;
  const qualities: Quality[] = [
    { key: "notes", label: "NOTES", share: share(r.right, accOf), detail: `${r.right} OF ${r.of}${r.stray ? ` · ${r.stray} STRAY` : ""}`, weight: W.notes },
    { key: "timing", label: "TIMING", share: share(r.perfects + GOOD_TIMING * r.goods, r.perfects + r.goods), detail: `${r.perfects} PERFECT${expressive ? ` (${expressive} IN EXPRESSIVE TIME)` : ""} · ${r.goods} GOOD`, weight: W.timing },
    { key: "touch", label: "TOUCH", share: share(touchHit, touchOf), detail: touchDetail || "NOTHING TO JUDGE", weight: W.touch },
    { key: "entries", label: "ENTRIES", share: shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null, detail: shares.length ? `${shares.filter((x) => x === 1).length} OF ${shares.length} WHOLE` : "NONE IN YOUR VOICE", weight: W.entries },
  ];
  void artParts;
  const judged = qualities.filter((q) => q.share !== null);
  const wsum = judged.reduce((a, q) => a + q.weight, 0);
  let performance = wsum ? Math.round((100 * judged.reduce((a, q) => a + q.weight * (q.share as number), 0)) / wsum) : 0;
  // A failed run is judged on what it played, scaled by how far it went.
  if (r.failed) performance = Math.round(performance * Math.max(0, Math.min(1, r.progress)));
  const final = Math.round((r.score * performance) / 100);
  return { points, qualities, performance, grade: gradeFor(performance), final, signs: share(r.style?.hit ?? 0, r.style?.of ?? 0), advice: r.failed ? adviceOf(r) : "" };
}

/** What cost a failed run most: the largest of the misses, the wrong notes and the stray taps; else the timing. */
function adviceOf(r: SheetInput): string {
  const worst = [
    { n: r.missed, line: `${r.missed} NOTES WENT BY UNPLAYED · KEEP AN EYE ON THE NEXT NOTE` },
    { n: r.wrong, line: `${r.wrong} WRONG NOTES · TOUCH AT THE NOTE'S HEIGHT, THE WAY THE LINE GOES` },
    { n: r.stray / 2, line: `${r.stray} TAPS ON NO NOTE · TOUCH ONLY WHEN A NOTE ARRIVES` },
  ].sort((a, b) => b.n - a.n)[0];
  if (worst.n > 0) return worst.line;
  return "THE CROWD WANTED MORE · LISTEN AND PLAY WITH THE BEAT";
}
