/**
 * Level P1 (the harmonic plan) for the figuration preludes after Prelude 1 (docs/wtc/PLAN.md):
 * 1/2, 1/5, 1/6. A figured bar is the prelude's pattern filled with pitches; the player chooses,
 * for each, Bach's bar or the right hand of a neighbouring bar over this bar's left hand. Free bars
 * (opening, cadenzas, coda) sound as Bach wrote them.
 *
 * Data: data/wtc/preludes/*.json (tools/wtc/prelude_plans.py, from the public-domain Mutopia
 * editions, checked against Humdrum in docs/wtc/MUTOPIA.md).
 */
import p2 from "../../data/wtc/preludes/wtc1p02.json" with { type: "json" };
import p5 from "../../data/wtc/preludes/wtc1p05.json" with { type: "json" };
import p6 from "../../data/wtc/preludes/wtc1p06.json" with { type: "json" };
import type { PlayEvent } from "../counterpoint/layout.ts";
import { frac } from "./prelude1.ts";

export interface PlanChoice {
  pitches: string[];
  bach: boolean;
  fundamental: { root: string; chord: string };
}
export interface PlanBar {
  bar: number;
  onset: string;
  length: string;
  figured: boolean;
  choices?: PlanChoice[];
  notes?: { onset: string; duration: string; pitch: string }[];
}
export interface PlanPiece {
  id: string;
  title: string;
  source: string;
  pattern: { hand: "upper" | "lower"; onset: string; duration: string }[];
  bars: PlanBar[];
}

export const PIECES: PlanPiece[] = [p2, p5, p6] as unknown as PlanPiece[];

/** The figured bars, in order: the points the player decides. */
export const figuredBars = (p: PlanPiece) => p.bars.filter((b) => b.figured);

/** The distinct pitches of a choice, low to high (for a compact label). */
export function chordNames(pitches: string[], hand: "upper" | "all", piece: PlanPiece): string {
  const ps = pitches.filter((_, i) => hand === "all" || piece.pattern[i].hand === "upper");
  const order = (p: string) => {
    const m = /^([A-G])(#*|b*)(-?\d+)$/.exec(p)!;
    const pc: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return 12 * Number(m[3]) + pc[m[1]] + (m[2].startsWith("#") ? m[2].length : -m[2].length);
  };
  return [...new Set(ps)].sort((a, b) => order(a) - order(b)).join(" ");
}

/** The whole prelude: the chosen bars (index into each figured bar's choices; null: Bach's left hand
 * alone), the free bars as written. */
export function pieceEvents(piece: PlanPiece, picks: (number | null)[], from = 0): PlayEvent[] {
  const ev: PlayEvent[] = [];
  let k = 0;
  for (const b of piece.bars) {
    const t0 = frac(b.onset);
    if (b.figured) {
      const pick = picks[k++];
      const bach = b.choices!.find((c) => c.bach)!;
      const pitches = pick === null || pick === undefined ? bach.pitches.map((p, i) => (piece.pattern[i].hand === "lower" ? p : null)) : b.choices![pick].pitches;
      pitches.forEach((p, i) => {
        if (p) ev.push({ slot: ev.length, at: t0 + frac(piece.pattern[i].onset), length: frac(piece.pattern[i].duration), cantus: null, counterpoint: p });
      });
    } else {
      for (const n of b.notes!) ev.push({ slot: ev.length, at: t0 + frac(n.onset), length: frac(n.duration), cantus: null, counterpoint: n.pitch });
    }
  }
  return ev.filter((e) => e.at >= from).sort((a, b) => a.at - b.at);
}

/** One figured bar alone, from its own onset. */
export function barEvents(piece: PlanPiece, bar: PlanBar, pitches: string[]): PlayEvent[] {
  const t0 = frac(bar.onset);
  return pitches.map((p, i) => ({ slot: i, at: t0 + frac(piece.pattern[i].onset), length: frac(piece.pattern[i].duration), cantus: null, counterpoint: p }));
}
