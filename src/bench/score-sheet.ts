/**
 * D268, THE SCORE SHEET: what a run came to, worked out of the engine's counts. The points by where
 * they came from; four qualities of the playing, each a share (the right notes, their timing, their
 * articulation, the subject's entries captured), weighed into one PERFORMANCE out of 100; a finished
 * run's points raised by up to a half for it (the FINAL SCORE); on a failed run, how far it went and
 * what cost it most. D325: ARTICULATION judges the joins by the player's own touch (intention.ts), and
 * its points are no longer LEGATO's; TIMING says how many PERFECTs came in expressive time.
 */
import type { ArtStats } from "./articulation.ts";
import type { ScoreSource } from "./proto-game.ts";

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
}

export interface Quality {
  key: "accuracy" | "timing" | "articulation" | "subjects" | "reading";
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
  /** 0..100. */
  performance: number;
  /** A finished run's points times performance/200 (none on a failed run). */
  bonus: number;
  final: number;
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
  const artParts = [joins, share(art.held, art.heldOf), share(art.clean, art.cleanOf)].filter((x): x is number => x !== null);
  const joinsDetail = byTouch ? art.touchOf && `${art.touch ?? "TOUCH"} TOUCH ${art.touchOk ?? 0}/${art.touchOf}` : art.legatoOf && `LEGATO ${art.legato}/${art.legatoOf}`;
  const artDetail = [joinsDetail, art.heldOf && `HELD ${art.held}/${art.heldOf}`, art.cleanOf && `RESTS ${art.clean}/${art.cleanOf}`].filter(Boolean).join(" · ");
  const expressive = r.graces ? r.graces.agogic + r.graces.breath + r.graces.broaden : 0;
  const qualities: Quality[] = [
    { key: "accuracy", label: "ACCURACY", share: share(r.right, accOf), detail: `${r.right} OF ${r.of}${r.stray ? ` · ${r.stray} STRAY` : ""}`, weight: 40 },
    { key: "timing", label: "TIMING", share: share(r.perfects, r.perfects + r.goods), detail: `${r.perfects} PERFECT${expressive ? ` (${expressive} IN EXPRESSIVE TIME)` : ""} · ${r.goods} GOOD`, weight: 20 },
    { key: "articulation", label: "ARTICULATION", share: artParts.length ? artParts.reduce((a, b) => a + b, 0) / artParts.length : null, detail: artDetail || "NOTHING TO JUDGE", weight: 20 },
    { key: "subjects", label: "SUBJECTS", share: share(r.captured, r.entries), detail: `${r.captured} OF ${r.entries} CAPTURED`, weight: 20 },
  ];
  // D272: with a reading, how much of what it asks was met (its articulation, accents, levels).
  if (r.style?.of) qualities.push({ key: "reading", label: "THE READING", share: share(r.style.hit, r.style.of), detail: `${r.style.hit} OF ${r.style.of} AS THE READING ASKS`, weight: 15 });
  const judged = qualities.filter((q) => q.share !== null);
  const wsum = judged.reduce((a, q) => a + q.weight, 0);
  let performance = wsum ? Math.round((100 * judged.reduce((a, q) => a + q.weight * (q.share as number), 0)) / wsum) : 0;
  // A failed run is judged on what it played, scaled by how far it went.
  if (r.failed) performance = Math.round(performance * Math.max(0, Math.min(1, r.progress)));
  const bonus = r.failed ? 0 : Math.round((r.score * performance) / 200);
  return { points, qualities, performance, bonus, final: r.score + bonus, advice: r.failed ? adviceOf(r) : "" };
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
