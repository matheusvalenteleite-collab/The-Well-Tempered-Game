/**
 * The info bar (D94, after Ableton's Info View): pointing at anything that has an explanation (its
 * `title`, `data-info`, or failing those its `aria-label`) shows it at once in a fixed strip at
 * the foot of the screen, with no popup over the game. Native tooltips are suppressed by moving
 * `title` into `data-info` on first hover. On touch screens, "ⓘ" switches on explain mode: a tap
 * explains instead of acting, a second tap on the same control acts; a long press explains at any
 * time. The bar folds to a thin line and remembers it.
 */
import { useEffect, useRef, useState } from "react";
import { store, stored } from "./shared.ts";
import { t } from "./i18n.ts";

const SELECTOR = "[title], [data-info], button[aria-label], [role=tab], select[aria-label]";

function infoOf(target: EventTarget | null): { el: Element; text: string } | null {
  if (!(target instanceof Element) || target.closest(".infobar")) return null;
  const el = target.closest(SELECTOR);
  if (!el) return null;
  const title = el.getAttribute("title");
  if (title) {
    // The bar replaces the browser's tooltip.
    el.setAttribute("data-info", title);
    el.removeAttribute("title");
  }
  const text = el.getAttribute("data-info") || el.getAttribute("aria-label") || "";
  return text ? { el, text } : null;
}

export function InfoBar({ idle }: { idle: string }) {
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(() => stored("wtg.info", true, (v) => typeof v === "boolean"));
  useEffect(() => store("wtg.info", open), [open]);
  const [explain, setExplain] = useState(false);
  const explainRef = useRef(explain);
  explainRef.current = explain;
  const explained = useRef<Element | null>(null);

  useEffect(() => {
    const over = (e: MouseEvent) => setText(infoOf(e.target)?.text ?? null);
    const leave = (e: MouseEvent) => {
      if (!e.relatedTarget) setText(null);
    };
    // Explain mode: the first tap on a control explains it; the second acts.
    const click = (e: MouseEvent) => {
      if (!explainRef.current) return;
      const info = infoOf(e.target);
      if (!info) return;
      if (explained.current === info.el) {
        explained.current = null;
        return;
      }
      explained.current = info.el;
      setText(info.text);
      e.preventDefault();
      e.stopPropagation();
    };
    // Long press: explain, and swallow the click that follows.
    let timer = 0;
    let swallow = false;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const info = infoOf(e.target);
        if (info) {
          setText(info.text);
          swallow = true;
        }
      }, 550);
    };
    const cancel = () => window.clearTimeout(timer);
    const swallowClick = (e: MouseEvent) => {
      if (!swallow) return;
      swallow = false;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", leave);
    document.addEventListener("click", click, true);
    document.addEventListener("click", swallowClick, true);
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", cancel, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("pointermove", cancel, true);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", leave);
      document.removeEventListener("click", click, true);
      document.removeEventListener("click", swallowClick, true);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", cancel, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("pointermove", cancel, true);
    };
  }, []);

  return (
    <footer className={open ? "infobar" : "infobar folded"} aria-live="polite">
      <button className="info-explain" aria-pressed={explain} onClick={() => setExplain(!explain)} data-info={t("ui.info.explain")}>
        ⓘ
      </button>
      {open && <span className="info-text">{text ?? (explain ? t("ui.info.explainOn") : idle)}</span>}
      <button className="info-fold" onClick={() => setOpen(!open)} data-info={t(open ? "ui.info.fold" : "ui.info.unfold")}>
        {open ? "▾" : "▸"}
      </button>
    </footer>
  );
}
