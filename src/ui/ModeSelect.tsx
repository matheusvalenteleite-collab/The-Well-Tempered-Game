/**
 * The first menu of every screen (D149): two, three and four voices, the Well-Tempered Clavier,
 * the chorales and the WTC preludes and harmony. One component, so that every screen offers every
 * mode (the copies had drifted apart). In the real setup three and four voices show 🔒 until the
 * exercise before them is starred (D142).
 */
import type { Mode } from "./Root.tsx";
import { t } from "./i18n.ts";
import { stored } from "./shared.ts";
import { useBeta } from "./beta.ts";
import { exerciseOpen, FIRST_QUARTET, FIRST_TRIO } from "../game/unlock.ts";

export function ModeSelect({ value, onMode, stars }: { value: Mode; onMode(m: Mode): void; stars?: readonly string[] }) {
  const beta = useBeta();
  const starred = stars ?? stored<string[]>("wtg.stars", [], (v) => Array.isArray(v));
  const locked = (n: number) => (n === 3 ? !exerciseOpen(FIRST_TRIO, starred, beta) : n === 4 ? !exerciseOpen(FIRST_QUARTET, starred, beta) : false);
  return (
    <select
      id="voices"
      className="sel sel-voices"
      value={String(value)}
      aria-label={t("ui.nav.voices")}
      onChange={(e) => {
        const v = e.target.value;
        const m = (v === "wtc" || v === "chorale" || v === "preludes" ? v : Number(v)) as Mode;
        if (m !== value) onMode(m);
      }}
    >
      {[2, 3, 4].map((n) => (
        <option key={n} value={n} disabled={locked(n)}>
          {locked(n) ? "🔒 " : ""}
          {t("ui.nav.voicesN", { n })}
        </option>
      ))}
      <option value="wtc">{t("ui.wtc.mode")}</option>
      <option value="chorale">{t("chorale.mode")}</option>
      <option value="preludes">{t("wtcp.mode")}</option>
    </select>
  );
}
