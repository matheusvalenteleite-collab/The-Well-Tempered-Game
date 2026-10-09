/**
 * The page (D94, rebuilt in D105). The page itself never scrolls; only the text panes do. Native
 * sizes (no scaling of the whole screen), in three modes by the window's width:
 *   phone   (< 600 px)   one column; the dock scrolls once.
 *   tabs    (< 1400 px)  the score across the top; below it the transport and a tabbed dock.
 *   columns (≥ 1400 px)  the score across the top; below it two columns: at the left the
 *                        transport and the mixer (strips, the selected strip's editor beneath),
 *                        at the right the text tabs (evaluation, how to play, lectio), which go
 *                        there by default and can be brought back into the left dock ("⇤").
 * The boundary under the score and the one between the columns can be dragged (double-click
 * resets them). The score box is as tall as its music unless dragged; on a very large screen the
 * page stops widening at 2000 px.
 */
import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { InfoBar } from "./InfoBar.tsx";
import { setUiScale } from "./ui-scale.ts";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

export interface DockTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** A text tab: goes to the right column on a wide screen. */
  text?: boolean;
  /** Shown but not selectable. */
  disabled?: boolean;
}

const PHONE = 600;
const GROW_FROM = { w: 1600, h: 900 };
const GROW_MAX = 1.4;
const COLUMNS = 1400;
/** Room the parts below the score need at least, by mode (transport, tabs, mixer). */
const LOWER_NEED = { tabs: 360, stacked: 600, columns: 560 } as const;
const CHROME = 92; // top bar, info bar and the divider

/** The score's window reports the height its music wants at the width it has (D105). */
export const ScoreFit = createContext<(h: number) => void>(() => undefined);

/** A draggable boundary: reports each move in pixels; a double-click resets. */
function Divider({ dir, onDrag, onReset, label }: { dir: "row" | "col"; onDrag(delta: number): void; onReset(): void; label: string }) {
  const last = useRef<number | null>(null);
  return (
    <div
      className={`divider divider-${dir}`}
      role="separator"
      aria-orientation={dir === "row" ? "horizontal" : "vertical"}
      title={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = dir === "row" ? e.clientY : e.clientX;
      }}
      onPointerMove={(e) => {
        if (last.current === null || !e.buttons) return;
        const now = dir === "row" ? e.clientY : e.clientX;
        onDrag(now - last.current);
        last.current = now;
      }}
      onPointerUp={() => (last.current = null)}
      onDoubleClick={onReset}
    />
  );
}

export function Shell(p: {
  header: ReactNode;
  score: ReactNode;
  transport: ReactNode;
  summary?: ReactNode;
  tabs: DockTab[];
  tab: string;
  onTab(id: string): void;
  /** What the info bar says when nothing is pointed at (the source of the exercise). */
  idle: string;
  overlays?: ReactNode;
}) {
  // Native sizes, except that a large screen enlarges everything a little, up to a cap (D105):
  // from 1600 × 900 upwards in proportion, at most 1.4 times.
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const grow = Math.max(1, Math.min(GROW_MAX, win.w / GROW_FROM.w, win.h / GROW_FROM.h));
  useEffect(() => setUiScale(grow), [grow]);
  const size = { w: win.w / grow, h: win.h / grow };
  const mode = size.w < PHONE ? "phone" : size.w < COLUMNS ? "tabs" : "columns";

  // Text tabs brought back into the left dock in columns mode (they live at the right by default).
  const [attached, setAttached] = useState<string[]>(() => stored<string[]>("wtg.attached", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.attached", attached), [attached]);
  const texts = p.tabs.filter((x) => x.text);

  // The dividers: the score's height (null: as tall as its music), the left column's share.
  const [scoreH, setScoreH] = useState<number | null>(() => stored<number | null>("wtg.split.score", null, (v) => v === null || (typeof v === "number" && v > 80)));
  const [leftShare, setLeftShare] = useState(() => stored("wtg.split.cols", 0.6, (v) => typeof v === "number" && v > 0.25 && v < 0.85));
  useEffect(() => store("wtg.split.score", scoreH), [scoreH]);
  useEffect(() => store("wtg.split.cols", leftShare), [leftShare]);
  const [wanted, setWanted] = useState(300);
  const available = size.h - CHROME;
  // Below about 1000 px the mixer stacks its editor under the strips, and needs more height.
  const need = mode === "columns" ? LOWER_NEED.columns : size.w < 1004 ? LOWER_NEED.stacked : LOWER_NEED.tabs;
  const autoH = mode === "phone" ? null : Math.round(Math.max(160, Math.min(wanted, available - need, available * 0.62)));
  const shownH = mode === "phone" ? null : scoreH !== null ? Math.max(120, Math.min(scoreH, available - 200)) : autoH;
  const lowerRef = useRef<HTMLDivElement>(null);
  // Where the text tabs go: the right column (columns mode, unless brought back); in tabs mode, a
  // pane under the mixer when the height leaves room for one; else into the dock beside the mixer.
  const mixerNeed = size.w < 1004 ? 560 : 290;
  const stackText = mode === "tabs" && available - (shownH ?? 0) - 46 > mixerNeed + 240;
  const side = mode === "columns" ? texts.filter((x) => !attached.includes(x.id)) : stackText ? texts : [];
  const dock = p.tabs.filter((x) => !side.includes(x));
  const dockTab = dock.find((x) => x.id === p.tab) ?? dock[0];
  const [sideId, setSideId] = useState<string | null>(null);
  const sideTab = side.find((x) => x.id === p.tab) ?? side.find((x) => x.id === sideId) ?? side[0];
  const pick = (id: string) => {
    if (side.some((x) => x.id === id)) setSideId(id);
    p.onTab(id);
  };

  const strip = (tabs: DockTab[], current: DockTab | undefined, where: "dock" | "side") => (
    <div className="dock-tabs" role="tablist">
      {tabs.map((x) => (
        <span key={x.id} className="dock-tab">
          <button role="tab" aria-selected={current?.id === x.id} disabled={x.disabled} onClick={() => pick(x.id)}>
            {x.label}
          </button>
          {mode === "columns" && x.text && (
            <button
              className="detach"
              aria-label={t(where === "dock" ? "ui.dock.detach" : "ui.dock.attach")}
              title={t(where === "dock" ? "ui.dock.detach" : "ui.dock.attach")}
              onClick={() => {
                setAttached(where === "dock" ? attached.filter((d) => d !== x.id) : [...attached, x.id]);
                pick(x.id);
              }}
            >
              {where === "dock" ? "⇥" : "⇤"}
            </button>
          )}
        </span>
      ))}
    </div>
  );

  return (
    <ScoreFit.Provider value={setWanted}>
      <div className={`shell mode-${mode}`} style={grow > 1 ? { width: size.w, height: size.h, transform: `scale(${grow})`, transformOrigin: "0 0", maxWidth: "none", margin: 0 } : undefined}>
        <header className="topbar">{p.header}</header>
        <div className="score-area" style={shownH !== null ? { height: shownH } : undefined}>{p.score}</div>
        {mode !== "phone" && (
          <Divider dir="row" label={t("ui.divider.score")} onDrag={(d) => setScoreH((h) => Math.round((h ?? shownH ?? 300) + d))} onReset={() => setScoreH(null)} />
        )}
        <div className="lower" ref={lowerRef}>
          <div className="left-col" style={mode === "columns" && side.length ? { flex: `0 0 ${Math.round(leftShare * 1000) / 10}%` } : undefined}>
            <div className="transport-row">{p.transport}</div>
            {p.summary}
            <section className={`dock${dock.length === 1 ? " single" : ""}${stackText ? " mixer-only" : ""}`}>
              {dock.length > 1 && strip(dock, dockTab, "dock")}
              <div className={`dock-body${dockTab?.text ? "" : " fit"}`} role="tabpanel">{dockTab?.content}</div>
            </section>
            {stackText && (
              <section className="dock text-pane">
                {strip(side, sideTab, "side")}
                <div className="dock-body" role="tabpanel">{sideTab?.content}</div>
              </section>
            )}
          </div>
          {mode === "columns" && side.length > 0 && (
            <>
              <Divider
                dir="col"
                label={t("ui.divider.columns")}
                onDrag={(d) => {
                  const w = lowerRef.current?.clientWidth ?? 1;
                  setLeftShare((s) => Math.max(0.3, Math.min(0.8, s + d / w)));
                }}
                onReset={() => setLeftShare(0.6)}
              />
              <aside className="side-col">
                {strip(side, sideTab, "side")}
                <div className="dock-body side-body" role="tabpanel">{sideTab?.content}</div>
              </aside>
            </>
          )}
        </div>
        <InfoBar idle={p.idle} />
        {p.overlays}
      </div>
    </ScoreFit.Provider>
  );
}
