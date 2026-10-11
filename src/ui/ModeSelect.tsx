/**
 * The first menu of every screen (D149), and the app's main switcher (D157): it changes the whole
 * mode, so it is drawn apart from the other menus, in the colour of the mode it shows (Fux, the
 * chorales, the Well-Tempered Clavier). Its options are grouped by mode; the first goes back to the
 * start screen. One component, so that every screen offers every mode. In the real setup three and
 * four voices show 🔒 until the exercise before them is starred (D142).
 */
import { createContext, useContext } from "react";
import type { Mode } from "./Root.tsx";
import { t } from "./i18n.ts";
import { stored } from "./shared.ts";
import { useBeta } from "./beta.ts";
import { exerciseOpen, FIRST_QUARTET, FIRST_TRIO } from "../game/unlock.ts";

/** The three modes of the start screen. */
export type Family = "fux" | "chorale" | "wtc";
export const familyOf = (m: Mode): Family => (m === "chorale" ? "chorale" : m === "wtc" || m === "preludes" ? "wtc" : "fux");

/** Back to the start screen (provided by Root). */
export const HomeContext = createContext<(() => void) | null>(null);

export function ModeSelect({ value, onMode, stars }: { value: Mode; onMode(m: Mode): void; stars?: readonly string[] }) {
  const beta = useBeta();
  const home = useContext(HomeContext);
  const starred = stars ?? stored<string[]>("wtg.stars", [], (v) => Array.isArray(v));
  const locked = (n: number) => (n === 3 ? !exerciseOpen(FIRST_TRIO, starred, beta) : n === 4 ? !exerciseOpen(FIRST_QUARTET, starred, beta) : false);
  return (
    <select
      id="voices"
      className={`sel sel-mode mode-${familyOf(value)}`}
      value={String(value)}
      aria-label={t("ui.nav.mode")}
      title={t("ui.nav.modeHelp")}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "home") return home?.();
        const m = (v === "wtc" || v === "chorale" || v === "preludes" ? v : Number(v)) as Mode;
        if (m !== value) onMode(m);
      }}
    >
      {home && <option value="home">{t("ui.nav.home")}</option>}
      <optgroup label={t("ui.start.fux.title")}>
        {[2, 3, 4].map((n) => (
          <option key={n} value={n} disabled={locked(n)}>
            {locked(n) ? "🔒 " : ""}
            {t("ui.nav.fuxN", { n })}
          </option>
        ))}
      </optgroup>
      <optgroup label={t("ui.start.chorale.title")}>
        <option value="chorale">{t("ui.nav.chorales")}</option>
      </optgroup>
      <optgroup label={t("ui.start.wtc.title")}>
        <option value="wtc">{t("ui.nav.wtcStudy")}</option>
        <option value="preludes">{t("ui.nav.wtcPreludes")}</option>
      </optgroup>
    </select>
  );
}
