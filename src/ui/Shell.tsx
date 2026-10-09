/**
 * The page (D94, Option A): a one-line top bar; the score with its own toolbar; the transport; a
 * one-line evaluation summary; a tabbed dock that scrolls inside itself; the info bar at the foot.
 * The page itself does not scroll. On a wide screen the text tabs (evaluation, rules, lectio) can be
 * taken out of the dock into a column on the right ("⇥"), and put back ("⇤").
 */
import { useEffect, useState, type ReactNode } from "react";
import { setUiScale } from "./ui-scale.ts";

const DESIGN_W = 1366;
const DESIGN_H = 768;
import { InfoBar } from "./InfoBar.tsx";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

export interface DockTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** A text tab: may be taken out to the side column on a wide screen. */
  text?: boolean;
  /** Shown but not selectable. */
  disabled?: boolean;
}

const WIDE = "(min-width: 1100px)";

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
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE).matches ?? true);
  useEffect(() => {
    const m = window.matchMedia?.(WIDE);
    if (!m) return;
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  // D103: on a computer the screen is laid out for 1366 × 768 at least; a smaller window shows the
  // same screen, scaled down, instead of squeezing or scrolling it. Phones keep their own layout.
  const fit = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w < 900 ? 1 : Math.max(0.6, Math.min(1, w / DESIGN_W, h / DESIGN_H));
  };
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const on = () => setScale(fit());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  useEffect(() => {
    setUiScale(scale);
  }, [scale]);
  const [detached, setDetached] = useState<string[]>(() => stored<string[]>("wtg.detached", [], (v) => Array.isArray(v)));
  useEffect(() => store("wtg.detached", detached), [detached]);
  const side = wide ? p.tabs.filter((x) => x.text && detached.includes(x.id)) : [];
  const dock = p.tabs.filter((x) => !side.includes(x));
  // The tab shown in each place: the requested one if it lives there, else that place's first.
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
          {wide && x.text && (
            <button
              className="detach"
              aria-label={t(where === "dock" ? "ui.dock.detach" : "ui.dock.attach")}
              title={t(where === "dock" ? "ui.dock.detach" : "ui.dock.attach")}
              onClick={() => {
                setDetached(where === "dock" ? [...detached, x.id] : detached.filter((d) => d !== x.id));
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
    <div className="shell" style={scale < 1 ? { width: `${100 / scale}vw`, height: `${100 / scale}vh`, maxWidth: "none", transform: `scale(${scale})`, transformOrigin: "0 0", margin: 0 } : undefined}>
      <header className="topbar">{p.header}</header>
      <div className="shell-body">
        <div className="main-col">
          <div className="score-area">{p.score}</div>
          <div className="transport-row">{p.transport}</div>
          {p.summary}
          <section className="dock">
            {strip(dock, dockTab, "dock")}
            <div className={`dock-body${dockTab?.text ? "" : " fit"}`} role="tabpanel">{dockTab?.content}</div>
          </section>
        </div>
        {side.length > 0 && (
          <aside className="side-col">
            {strip(side, sideTab, "side")}
            <div className="dock-body side-body" role="tabpanel">{sideTab?.content}</div>
          </aside>
        )}
      </div>
      <InfoBar idle={p.idle} />
      {p.overlays}
    </div>
  );
}
