/**
 * P26: on a phone (under 600 px) the chorale screens keep ▶/■ in sight and fold the rest of their
 * controls (layers, voices, menus, sliders) behind one "Options" button, so that the score gets the
 * height (the owner's approval of the proposal: about twice the score on level 0). Wider screens show
 * everything, as before.
 */
import { useEffect, useState, type ReactNode } from "react";
import { t } from "./i18n.ts";

const QUERY = "(max-width: 599px)";

export interface Fold {
  /** Whether the folded controls are shown (always, above a phone's width). */
  show: boolean;
  /** The "Options" button (null above a phone's width). */
  button: ReactNode;
}

export function useFold(): Fold {
  const media = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY) : null;
  const [phone, setPhone] = useState(() => media?.matches ?? false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!media) return;
    const on = () => setPhone(media.matches);
    media.addEventListener("change", on);
    return () => media.removeEventListener("change", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    show: !phone || open,
    button: phone ? (
      <button className="chipbtn fold-btn" aria-expanded={open} onClick={() => setOpen(!open)} title={t("ui.fold.help")}>
        {open ? t("ui.fold.close") : t("ui.fold.open")}
      </button>
    ) : null,
  };
}
