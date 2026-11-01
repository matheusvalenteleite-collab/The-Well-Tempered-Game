/**
 * D268: the result's score sheet: the final score (D445: a finished run's points times its performance;
 * the best before it), the performance's four parts each with its bar, the points by source; on a failed
 * run how far it went and what cost it most.
 */
import { tr, trCanvas } from "../i18n/index.ts";
import type { ReactNode } from "react";
import type { Sheet } from "./score-sheet.ts";
import { freeLine, type FreeTally } from "./free-summary.ts";

const n = (x: number) => x.toLocaleString("en");
const pc = (x: number) => `${Math.round(x * 100)}%`;
// D446: the grades' inks by the same bands (S gold, A green, B yellow, C orange-red, D red).
const ink = (x: number) => (x >= 0.95 ? "var(--tg-gold)" : x >= 0.9 ? "#5fdc6a" : x >= 0.8 ? "#e8c94a" : x >= 0.7 ? "#f0784a" : "#d8443a");

export function SheetCard(p: { sheet: Sheet; score: number; failed: boolean; failedBar: number | null; lastBar: number; progress: number; maxStreak: number; best?: { before: number | null; fresh: boolean; old?: number | null } | null; head?: ReactNode; free?: FreeTally }) {
  const { sheet } = p;
  return (
    <div className="tb-sheet" id="score-sheet">
      <div className="tb-sheet-head">
        {p.head}
        {p.failed ? (
          <>
            <p className="tb-sheet-progress-line" id="sheet-progress">
              {tr("BAR {n} OF {m} · {pc} OF THE PIECE", { n: p.failedBar ?? 0, m: p.lastBar, pc: pc(p.progress) })}
            </p>
            <div className="tb-sheet-progress" aria-hidden="true">
              <i style={{ width: pc(p.progress) }} />
            </div>
            <p className="tb-score" id="sheet-final">
              {n(p.score)}
            </p>
            {sheet.advice && (
              <p className="tb-sheet-advice" id="sheet-advice">
                {trCanvas(sheet.advice)}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="tb-sheet-sum" id="sheet-sum">
              {tr("{a} POINTS × {p}% PERFORMANCE", { a: n(p.score), p: sheet.performance })}
            </p>
            <p className="tb-score tb-sheet-final" id="sheet-final">
              {n(sheet.final)}
            </p>
            {p.best && (
              <p className={`tb-sheet-best${p.best.fresh ? " fresh" : ""}`} id="sheet-best">
                {p.best.fresh ? (p.best.before === null ? tr("FIRST SCORE") : tr("NEW BEST · WAS {n}", { n: n(p.best.before) })) : tr("BEST {n}", { n: n(p.best.before ?? 0) })}
              </p>
            )}
            {/* D337: the best from before 1.52 (another judging), apart: never compared. */}
            {p.best?.old != null && (
              <p className="tb-sheet-best tb-sheet-old" id="sheet-best-old">
                {tr("BEST {n} · BEFORE 2.16", { n: n(p.best.old) })}
              </p>
            )}
          </>
        )}
        <p className="tb-sheet-perf" id="sheet-performance">
          {tr("PERFORMANCE")} <b style={{ color: ink(sheet.performance / 100) }}>{sheet.performance}%</b>
        </p>
        {/* D327: the player's own graces, counted, never scored. */}
        {freeLine(p.free) && (
          <p className="tb-sheet-free" id="sheet-free">
            {freeLine(p.free)}
          </p>
        )}
      </div>
      <ul className="tb-sheet-qualities">
        {sheet.qualities.map((q) => (
          <li key={q.key} id={`sheet-${q.key}`} className={q.share === null ? "none" : ""} title={q.detail}>
            <span className="tb-sheet-label">{tr(q.label)}</span>
            <span className="tb-sheet-bar" aria-hidden="true">
              {q.share !== null && <i style={{ width: pc(q.share), background: ink(q.share) }} />}
            </span>
            <span className="tb-sheet-pc">{q.share === null ? "—" : pc(q.share)}</span>
            <small>{trCanvas(q.detail)}</small>
          </li>
        ))}
      </ul>
      {sheet.points.length > 0 && (
        <ul className="tb-sheet-points" id="sheet-points">
          {sheet.points.map((x) => (
            <li key={x.source}>
              <span>{tr(x.label)}</span>
              <b>{n(x.pts)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
