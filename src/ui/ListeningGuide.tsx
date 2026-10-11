/**
 * P17: the chorales' listening guide on screen. The moments (the chorale session's
 * src/chorale/listening-notes.ts, C28) appear as
 * captions while the chorale plays, or only as numbered markers over the score (the owner: "Captions
 * while playing which can be toggled off and become simple markers"); their list is a tab of its own.
 */
import { useState } from "react";
import type { ListeningNote } from "../chorale/listening-notes.ts";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

export type GuideMode = "captions" | "markers" | "off";
const KEY = "wtg.choraleGuide";
const MODES: GuideMode[] = ["captions", "markers", "off"];

/** The circled numbers that mark the moments over the score. */
export const marker = (i: number) => (i < 20 ? String.fromCodePoint(0x2460 + i) : `(${i + 1})`);


export function useGuideMode(): [GuideMode, (m: GuideMode) => void] {
  const [mode, setMode] = useState<GuideMode>(() => stored<GuideMode>(KEY, "captions", (v) => MODES.includes(v as GuideMode)));
  return [mode, (m) => { setMode(m); store(KEY, m); }];
}

export function GuideModeSelect({ mode, onMode }: { mode: GuideMode; onMode(m: GuideMode): void }) {
  return (
    <select className="sel" value={mode} onChange={(e) => onMode(e.target.value as GuideMode)} aria-label={t("listen.mode")} title={t("listen.mode.help")}>
      {MODES.map((m) => (
        <option key={m} value={m}>{t(`listen.mode.${m}`)}</option>
      ))}
    </select>
  );
}

/** A moment or a line placed in the score: the drawn bar it falls in (as the playback cursor counts) and the bar number shown. */
export interface Placed<T> { item: T; index: number; bar: number; shown: number }

/**
 * The caption under the score while the chorale plays: the line being sung and the latest moment
 * reached (kept for two bars after its own), or the hint before ▶.
 */
export function GuideCaption({ moments, lines, cursor }: { moments: Placed<ListeningNote>[]; lines: Placed<string | null>[]; cursor: number }) {
  if (cursor < 0) return <div className="guide-caption idle">{t("listen.idle")}</div>;
  const line = [...lines].reverse().find((l) => l.bar <= cursor);
  const now = [...moments].reverse().find((m) => m.bar <= cursor && cursor - m.bar <= 2);
  return (
    <div className="guide-caption" aria-live="polite">
      {line?.item && <div className="guide-line">{t("listen.line", { n: line.index + 1, text: line.item })}</div>}
      {now && (
        <div className="guide-moment" key={now.index}>
          <span className="guide-mark">{marker(now.index)}</span> {now.item.text}
        </div>
      )}
    </div>
  );
}

/** The guide's tab: every moment with its bar, and the words of each line. */
export function GuideList({ moments, lines, quiet }: { moments: Placed<ListeningNote>[]; lines: Placed<string | null>[]; quiet?: boolean }) {
  return (
    <div className="chorale-about guide-list">
      {moments.length ? (
        <ol className="chorale-verdicts">
          {moments.map((m) => (
            <li key={m.index}>
              <strong>{marker(m.index)} {t("listen.bar", { bar: m.shown })}</strong> {m.item.text}
            </li>
          ))}
        </ol>
      ) : quiet ? null : (
        <p>{t("listen.none")}</p>
      )}
      {lines.some((l) => l.item) && (
        <>
          <ol className="guide-words">
            {lines.map((l) => (
              <li key={l.index}>{l.item ? `«${l.item}»` : "—"}</li>
            ))}
          </ol>
          <p className="muted">{t("listen.words")}</p>
        </>
      )}
      <p className="muted">{t("listen.about")}</p>
    </div>
  );
}
