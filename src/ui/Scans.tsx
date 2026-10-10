/**
 * The 1725 print itself (D97): the pages the Lectio quotes, from the dataset's scans (pp. 45-90,
 * p. 46 missing upstream), shown as a thumbnail beside each quotation and opened full size in a
 * page viewer with the pages before and after.
 */
import { useEffect, useState } from "react";
import { t } from "./i18n.ts";

// Still inlined (D97), but each page is loaded only when shown: the pages were 4 MB of the first download.
const FILES = import.meta.glob("../assets/scans/*.jpg", { query: "?inline", import: "default" }) as Record<string, () => Promise<string>>;
const PAGES: Record<number, () => Promise<string>> = Object.fromEntries(Object.entries(FILES).map(([path, load]) => [Number(/p(\d+)\.jpg$/.exec(path)![1]), load]));
const loaded = new Map<number, string>();

/** A page's image, once loaded (null meanwhile). */
function useScan(page: number): string | null {
  const [src, setSrc] = useState<string | null>(() => loaded.get(page) ?? null);
  useEffect(() => {
    const ready = loaded.get(page);
    if (ready) return void setSrc(ready);
    setSrc(null);
    let live = true;
    void PAGES[page]?.().then((url) => {
      loaded.set(page, url);
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [page]);
  return src;
}
const LIST = Object.keys(PAGES).map(Number).sort((a, b) => a - b);

/** The first printed page of a reference like "51-52", if it is among the scans. */
export const scanPage = (ref: string): number | null => {
  const n = Number(/\d+/.exec(ref)?.[0]);
  return PAGES[n] ? n : null;
};

export function PageThumb({ page, onOpen }: { page: number; onOpen(p: number): void }) {
  const src = useScan(page);
  return (
    <button className="page-thumb" onClick={() => onOpen(page)} title={t("ui.scan.open", { page })} aria-label={t("ui.scan.open", { page })}>
      {src ? <img src={src} alt="" /> : <span className="page-wait" aria-hidden="true" />}
      <span>p. {page}</span>
    </button>
  );
}

export function PageViewer({ page, onClose }: { page: number; onClose(): void }) {
  const [p, setP] = useState(page);
  const i = LIST.indexOf(p);
  const src = useScan(p);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && i < LIST.length - 1) setP(LIST[i + 1]);
      if (e.key === "ArrowLeft" && i > 0) setP(LIST[i - 1]);
      e.stopPropagation();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [i, onClose]);
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={t("ui.scan.title", { page: p })} onClick={onClose}>
      <div className="dialog page-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="page-viewer-bar">
          <button className="icon" disabled={i <= 0} onClick={() => setP(LIST[i - 1])} aria-label={t("ui.scan.prev")}>‹</button>
          <strong>{t("ui.scan.title", { page: p })}</strong>
          <button className="icon" disabled={i >= LIST.length - 1} onClick={() => setP(LIST[i + 1])} aria-label={t("ui.scan.next")}>›</button>
          <button className="icon quiet" onClick={onClose} aria-label={t("ui.close")}>×</button>
        </div>
        {src ? <img src={src} alt={t("ui.scan.title", { page: p })} /> : <p className="help">{t("ui.loading")}</p>}
        <p className="help">{t("ui.scan.source")}</p>
      </div>
    </div>
  );
}
