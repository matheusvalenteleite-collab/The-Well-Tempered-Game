import type { ReactNode } from "react";
import { t } from "./i18n.ts";

/**
 * A box that folds to one line with its button at the far left, as Mixer & synth does (D52).
 * `open` is held by the caller (remembered per box).
 */
export function Fold({ title, open, onToggle, className = "", children, extra }: { title: ReactNode; open: boolean; onToggle(open: boolean): void; className?: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <section className={`foldbox ${open ? "" : "folded"} ${className}`}>
      <div className="foldbox-head">
        <button className="fold" aria-expanded={open} onClick={() => onToggle(!open)} title={t(open ? "ui.fold.close" : "ui.fold.open")}>
          {open ? "▾" : "▸"} {title}
        </button>
        {!open && <span className="fold-line" aria-hidden="true" />}
        {open && extra}
      </div>
      {open && <div className="foldbox-body">{children}</div>}
    </section>
  );
}
