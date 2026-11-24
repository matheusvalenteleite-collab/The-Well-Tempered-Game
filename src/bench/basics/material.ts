/**
 * D1050 (design studio; code audit A): what BASICS kept of THE MANUAL's lessons.ts: a passage of a piece (bars, or so
 * many notes after so many) as the game's run on LADDER. The rest of THE MANUAL is retired and deleted.
 */
import { barStart, fugueById } from "../../touch/fugue.ts";
import { tempoOf } from "../../touch/tempi.ts";
import type { Run } from "../lessons.ts";

export interface Material {
  piece: string;
  voice: number;
  /** Bars, inclusive; the passage ends on the note its last bar leads to (D289). */
  fromBar: number;
  toBar: number;
  /** A share of the game's tempo (tempi.ts), or crotchets a minute. */
  tempo: { pct: number } | { bpm: number };
  wait?: boolean;
  /** The other voices off (drawn and sounded neither). */
  solo?: boolean;
  /** D342: EASY "timing" on LADDER: the height not judged. */
  easy?: "timing";
  /** D373: the voice's notes skipped from the first bar's line (the passage begins on the next). */
  skip?: number;
  /** D373: only so many of the voice's notes (the passage ends on the last of them). */
  count?: number;
}

/** Crotchets a minute for a material. */
export function bpmOf(m: Material): number {
  return "bpm" in m.tempo ? m.tempo.bpm : Math.round(tempoOf(m.piece) * m.tempo.pct) / 100;
}

/** A material's span in ticks: from its first bar's line to the note its last bar leads to (inclusive; D289), or the piece's end. */
export function spanOf(m: Material): { from: number; until: number } {
  const f = fugueById(m.piece);
  const bar = barStart(f, m.fromBar);
  let from = bar;
  if (m.skip || m.count) {
    const ns = f.voices[m.voice].filter((n) => n[0] >= bar);
    const a = ns[m.skip ?? 0];
    const b = m.count ? ns[(m.skip ?? 0) + m.count - 1] : undefined;
    from = m.skip && a ? a[0] : bar;
    if (b) return { from, until: b[0] + 1 };
  }
  const lastBar = f.bars.at(-1)?.n ?? 1;
  if (m.toBar >= lastBar) return { from, until: f.length };
  const cut = barStart(f, m.toBar + 1);
  const arrival = f.voices[m.voice].find((n) => n[0] >= cut);
  return { from, until: arrival ? arrival[0] + 1 : cut };
}

/** A material as the game's run: LADDER, nothing failed, no words, the ornaments asked where the stage has them. */
export function runOf(m: Material, ornaments = false): Run {
  const { from, until } = spanOf(m);
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
    quiet: { words: [], ...(ornaments ? { ornaments: true } : {}) },
    ...(ornaments ? { ornHint: true } : {}),
  };
}
