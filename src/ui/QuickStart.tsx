/**
 * The first thing a newcomer sees (D108): HOW TO PLAY opens this window in the middle of the
 * screen (and it opens by itself on the first visit) with what to do in three steps and the
 * consonances and rules of the exercise at hand, each rule with its moving example. The full
 * guide stays in the How to play tab.
 */
import { useEffect, type ReactNode } from "react";
import { t } from "./i18n.ts";

export function QuickStart({ basics, onClose, onMore }: { basics: ReactNode; onClose(): void; onMore(): void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={t("ui.help.title")} onClick={onClose}>
      <div className="dialog quickstart" onClick={(e) => e.stopPropagation()}>
        <h2>{t("ui.help.title")}</h2>
        <ol className="qs-steps">
          <li>{t("quick.step1")}</li>
          <li>{t("quick.step2")}</li>
          <li>{t("quick.step3")}</li>
        </ol>
        {basics}
        <div className="qs-actions">
          <button onClick={onMore}>{t("quick.more")}</button>
          <button className="primary" onClick={onClose} autoFocus>{t("quick.start")}</button>
        </div>
      </div>
    </div>
  );
}
