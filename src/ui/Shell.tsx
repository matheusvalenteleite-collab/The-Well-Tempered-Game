/**
 * The page (D106), after the practice of desktop music software: a few fixed layouts of panels
 * that do not rearrange themselves as the window changes, a size setting for the whole interface,
 * and dividers to drag. Only the score stretches (it fits its music to its box and zooms).
 *
 *   standard (from 1100 × 650 units)  top bar · score · transport · a bottom panel with tabs
 *                                     (Mixer, Evaluation, How to play, Lectio) · info bar.
 *   wide     (from 1680 units)         the same, but the bottom panel holds the mixer at the left
 *                                     and the text tabs at the right, side by side.
 *   compact  (below 1100 × 650)        one stacked column that scrolls as a whole.
 *
 * The interface size (S, M, L: 85, 100, 120 %) is chosen from the screen the first time and can be
 * changed (Aa, top right); units above are at that size. The bottom panel's height and the width
 * of the text column are dragged on their dividers (double-click resets) and remembered.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { InfoBar } from "./InfoBar.tsx";
import { setUiScale } from "./ui-scale.ts";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

export interface DockTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** A text tab: in the wide layout it lives in the right-hand column. */
  text?: boolean;
  /** Shown but not selectable. */
  disabled?: boolean;
}

const SIZES = { S: 0.85, M: 1, L: 1.2 } as const;
type UiSize = keyof typeof SIZES;
const STANDARD = { w: 1100, h: 650 };
const WIDE = 1680;
const PANEL_H = 300;
const PANEL_MIN = 230;
const TEXT_W = 560;
const MIXER_MIN = 1000;

/**
 * The first interface size, from the window (not the screen): small under 1150 px so that the
 * standard layout still fits, large from 2200 px, medium between. Then it is the player's.
 */
const firstSize = (): UiSize => (window.innerWidth >= 600 && window.innerWidth < 1150 ? "S" : window.innerWidth >= 2200 ? "L" : "M");

/** A draggable boundary: reports each move in pixels (of the interface); a double-click resets. */
function Divider({ dir, onDrag, onReset, label, zoom }: { dir: "row" | "col"; onDrag(delta: number): void; onReset(): void; label: string; zoom: number }) {
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
        onDrag((now - last.current) / zoom);
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
  /** The score alone: the bottom panel folded away (D147, listening with the page of music). */
  focus?: boolean;
  /** A screen's own panel height (where it is remembered, its first height, its least): the study's music wants more room. */
  panel?: { key: string; first: number; min: number };
}) {
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const [uiSize, setUiSize] = useState<UiSize>(() => stored<UiSize>("wtg.uiSize", firstSize(), (v) => v === "S" || v === "M" || v === "L"));
  useEffect(() => store("wtg.uiSize", uiSize), [uiSize]);
  const zoom = SIZES[uiSize];
  useEffect(() => setUiScale(zoom), [zoom]);
  const w = win.w / zoom;
  const h = win.h / zoom;
  const layout = w < STANDARD.w || h < STANDARD.h ? "compact" : w < WIDE ? "standard" : "wide";

  const panelKey = p.panel?.key ?? "wtg.panelH";
  const panelFirst = p.panel?.first ?? PANEL_H;
  const panelMin = p.panel?.min ?? PANEL_MIN;
  const [panelH, setPanelH] = useState(() => stored(panelKey, panelFirst, (v) => typeof v === "number" && v >= panelMin && v <= 1000));
  const [textW, setTextW] = useState(() => stored("wtg.textW", TEXT_W, (v) => typeof v === "number" && v >= 320 && v <= 1400));
  useEffect(() => store(panelKey, panelH), [panelKey, panelH]);
  useEffect(() => store("wtg.textW", textW), [textW]);
  // Dragged sizes are kept within what the window allows (the score keeps at least 180 units).
  const shownPanelH = Math.max(panelMin, Math.min(panelH, h - 40 - 44 - 42 - 180));
  const shownTextW = Math.max(320, Math.min(textW, w - 24 - MIXER_MIN));

  const texts = p.tabs.filter((x) => x.text);
  const side = layout === "wide" ? texts : [];
  const dock = p.tabs.filter((x) => !side.includes(x));
  const dockTab = dock.find((x) => x.id === p.tab) ?? dock[0];
  const [sideId, setSideId] = useState<string | null>(null);
  const sideTab = side.find((x) => x.id === p.tab) ?? side.find((x) => x.id === sideId) ?? side[0];
  const pick = (id: string) => {
    if (side.some((x) => x.id === id)) setSideId(id);
    p.onTab(id);
  };

  const strip = (tabs: DockTab[], current: DockTab | undefined) => (
    <div className="dock-tabs" role="tablist">
      {tabs.map((x) => (
        <span key={x.id} className="dock-tab">
          <button role="tab" aria-selected={current?.id === x.id} disabled={x.disabled} onClick={() => pick(x.id)}>
            {x.label}
          </button>
        </span>
      ))}
    </div>
  );
  const nextSize: Record<UiSize, UiSize> = { S: "M", M: "L", L: "S" };

  return (
    <div
      className={`shell layout-${layout}${p.focus ? " focus" : ""}`}
      style={zoom !== 1 ? { width: w, height: layout === "compact" ? undefined : h, minHeight: layout === "compact" ? h : undefined, transform: `scale(${zoom})`, transformOrigin: "0 0", maxWidth: "none", margin: 0 } : undefined}
    >
      <header className="topbar">
        {p.header}
        <button className="tool ui-size" onClick={() => setUiSize(nextSize[uiSize])} title={t("ui.size.help", { size: t(`ui.size.${uiSize}`) })} aria-label={t("ui.size.help", { size: t(`ui.size.${uiSize}`) })}>
          Aa<span className="ui-size-tag">{uiSize}</span>
        </button>
      </header>
      <div className="score-area">{p.score}</div>
      <div className="transport-row">{p.transport}</div>
      {p.summary}
      {layout !== "compact" && !p.focus && (
        <Divider dir="row" zoom={zoom} label={t("ui.divider.panel")} onDrag={(d) => setPanelH((x) => Math.max(panelMin, Math.min(1000, Math.round(Math.min(x, shownPanelH) - d))))} onReset={() => setPanelH(panelFirst)} />
      )}
      <div className="panel" hidden={p.focus} style={layout !== "compact" ? { height: shownPanelH } : undefined}>
        <section className="dock">
          {dock.length > 1 && strip(dock, dockTab)}
          <div className={`dock-body${dockTab?.text ? "" : " fit"}`} role="tabpanel">{dockTab?.content}</div>
        </section>
        {side.length > 0 && (
          <>
            <Divider dir="col" zoom={zoom} label={t("ui.divider.columns")} onDrag={(d) => setTextW((x) => Math.max(320, Math.min(1400, Math.round(Math.min(x, shownTextW) - d))))} onReset={() => setTextW(TEXT_W)} />
            <aside className="side-col" style={{ width: shownTextW }}>
              {strip(side, sideTab)}
              <div className="dock-body side-body" role="tabpanel">{sideTab?.content}</div>
            </aside>
          </>
        )}
      </div>
      <InfoBar idle={p.idle} />
      {p.overlays}
    </div>
  );
}
