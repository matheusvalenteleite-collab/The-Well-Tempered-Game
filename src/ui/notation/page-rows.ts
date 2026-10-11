/**
 * A score cut into rows of a few bars for WtcPage (the chorales, C15 and C17): each voice's notes
 * cut at the row's ends (a fermata kept only where its note ends in the row, a label only where it
 * begins), the text under the staves with them; the bars to a row by the screen's width.
 */
import { useEffect, useState } from "react";
import type { WtcScoreVoice } from "./WtcScore.tsx";

type Under = { at: number; lines: string[]; ink?: string }[];
export interface PageRow {
  key: string;
  bars: number;
  cursor: number;
  label: string;
  voices: WtcScoreVoice[];
  under?: Under;
  /** The row's first bar in the piece (P15: to take its part of a clef plan for the whole piece). */
  from?: number;
}

export function pageRows(o: { voices: WtcScoreVoice[]; under?: Under; barQ: number; bars: number; rowBars: number; cursor: number; key: string; label(a: number, z: number): string }): PageRow[] {
  const rows: PageRow[] = [];
  for (let a = 0; a < o.bars; a += o.rowBars) {
    const z = Math.min(o.bars, a + o.rowBars);
    const q0 = a * o.barQ;
    const q1 = z * o.barQ;
    rows.push({
      key: `${o.key}-${a}`,
      from: a,
      bars: z - a,
      cursor: o.cursor >= a && o.cursor < z ? o.cursor - a : -1,
      label: o.label(a, z),
      voices: o.voices.map((v) => ({
        ...v,
        notes: v.notes
          .filter((n) => n.at < q1 - 1e-9 && n.at + n.dur > q0 + 1e-9)
          .map((n) => ({ ...n, at: Math.max(n.at, q0) - q0, dur: Math.min(n.at + n.dur, q1) - Math.max(n.at, q0), fermata: n.fermata && n.at + n.dur <= q1 + 1e-9, label: n.at >= q0 - 1e-9 ? n.label : undefined, slot: n.at >= q0 - 1e-9 ? n.slot : undefined })),
      })),
      under: o.under?.filter((u) => u.at >= q0 - 1e-9 && u.at < q1 - 1e-9).map((u) => ({ ...u, at: u.at - q0 })),
    });
  }
  return rows;
}

/** Bars to a row: two on a phone, four on a wider screen. */
export function useRowBars(): number {
  const pick = () => (typeof window !== "undefined" && window.innerWidth < 700 ? 2 : 4);
  const [n, setN] = useState(pick);
  useEffect(() => {
    const on = () => setN(pick());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
}
