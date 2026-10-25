/**
 * D268: the result's score sheet: the final score (a finished run's points and its performance bonus;
 * the best before it), the four qualities each with its bar, the points by source; on a failed run how
 * far it went and what cost it most.
 */
import type { ReactNode } from "react";
import type { Sheet } from "./score-sheet.ts";

const n = (x: number) => x.toLocaleString("en");
const pc = (x: number) => `${Math.round(x * 100)}%`;
const ink = (x: number) => (x >= 0.9 ? "var(--tg-gold)" : x >= 0.75 ? "#5fdc6a" : x >= 0.6 ? "#e8c94a" : "#ec5a4a");

export function SheetCard(p: { sheet: Sheet; score: number; failed: boolean; failedBar: number | null; lastBar: number; progress: number; maxStreak: number; best?: { before: number | null; fresh: boolean } | null; head?: ReactNode }) {
  const { sheet } = p;
  return (
    <div className="tb-sheet" id="score-sheet">
      <div className="tb-sheet-head">
        {p.head}
        {p.failed ? (
          <>
            <p className="tb-sheet-progress-line" id="sheet-progress">
              BAR {p.failedBar} OF {p.lastBar} · {pc(p.progress)} OF THE PIECE
            </p>
            <div className="tb-sheet-progress" aria-hidden="true">
              <i style={{ width: pc(p.progress) }} />
            </div>
            <p className="tb-score" id="sheet-final">
              {n(p.score)}
            </p>
            {sheet.advice && (
              <p className="tb-sheet-advice" id="sheet-advice">
                {sheet.advice}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="tb-sheet-sum" id="sheet-sum">
              {n(p.score)} POINTS + {n(sheet.bonus)} PERFORMANCE BONUS
            </p>
            <p className="tb-score tb-sheet-final" id="sheet-final">
              {n(sheet.final)}
            </p>
            {p.best && (
              <p className={`tb-sheet-best${p.best.fresh ? " fresh" : ""}`} id="sheet-best">
                {p.best.fresh ? (p.best.before === null ? "FIRST SCORE" : `NEW BEST · WAS ${n(p.best.before)}`) : `BEST ${n(p.best.before ?? 0)}`}
              </p>
            )}
          </>
        )}
        <p className="tb-sheet-perf" id="sheet-performance">
          PERFORMANCE <b style={{ color: ink(sheet.performance / 100) }}>{sheet.performance}</b>/100 · MAX COMBO {p.maxStreak}
        </p>
      </div>
      <ul className="tb-sheet-qualities">
        {sheet.qualities.map((q) => (
          <li key={q.key} id={`sheet-${q.key}`} className={q.share === null ? "none" : ""} title={q.detail}>
            <span className="tb-sheet-label">{q.label}</span>
            <span className="tb-sheet-bar" aria-hidden="true">
              {q.share !== null && <i style={{ width: pc(q.share), background: ink(q.share) }} />}
            </span>
            <span className="tb-sheet-pc">{q.share === null ? "—" : pc(q.share)}</span>
            <small>{q.detail}</small>
          </li>
        ))}
      </ul>
      {sheet.points.length > 0 && (
        <ul className="tb-sheet-points" id="sheet-points">
          {sheet.points.map((x) => (
            <li key={x.source}>
              <span>{x.label}</span>
              <b>{n(x.pts)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
