/**
 * The score's own toolbar (D94): the View menu (what is written on the score) and Fux's solution
 * shown or hidden. The zoom buttons follow them (Systems / TrioScore).
 */
import { useEffect, useRef, useState } from "react";
import type { NameStyle } from "../music/names.ts";
import { t } from "./i18n.ts";

export interface ViewSettings {
  names: "off" | NameStyle;
  intervals: boolean;
}

export function ScoreTools(p: { view: ViewSettings; onView(v: ViewSettings): void; fux?: { open: boolean; shown: boolean; onShow(show: boolean): void } }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu]);
  const v = p.view;
  return (
    <>
      <div className="view-menu" ref={ref}>
        <button className="tool" aria-expanded={menu} aria-pressed={menu} onClick={() => setMenu(!menu)} title={t("ui.view.menuHelp")}>
          {t("ui.view.menu")} ▾
        </button>
        {menu && (
          <div className="view-pop" role="menu">
            <p className="view-head">{t("ui.view.namesHead")}</p>
            {(["off", "letters", "solfege"] as const).map((k) => (
              <button key={k} role="menuitemradio" aria-checked={v.names === k} aria-pressed={v.names === k} onClick={() => p.onView({ ...v, names: k })} title={t(`ui.view.names.${k}.help`)}>
                {t(`ui.view.names.${k}`)}
              </button>
            ))}
            <p className="view-head">{t("ui.view.more")}</p>
            <button role="menuitemcheckbox" aria-checked={v.intervals} aria-pressed={v.intervals} onClick={() => p.onView({ ...v, intervals: !v.intervals })} title={t("ui.view.intervalsHelp")}>
              {t("ui.view.intervals")}
            </button>
          </div>
        )}
      </div>
      {p.fux && (
        <button className="tool fux-tool" aria-pressed={p.fux.shown && p.fux.open} disabled={!p.fux.open} onClick={() => p.fux!.onShow(!p.fux!.shown)} title={t(p.fux.open ? "ui.mixer.fuxScoreHelp" : "ui.play.locked")}>
          ◇ {t("ui.fux.short")}
        </button>
      )}
    </>
  );
}
