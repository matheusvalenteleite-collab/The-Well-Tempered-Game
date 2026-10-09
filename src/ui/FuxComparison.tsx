import { compareWithFux, type Criterion } from "../counterpoint/compare-fux.ts";
import { t } from "./i18n.ts";
import { BarRef } from "./BarRef.tsx";
import type { Slot } from "../counterpoint/layout.ts";

/** The differences from Fux's solution that a criterion he states weighs (never "Fux said so"), one line per reason. */
export function FuxComparison({ cantus, player, fux, layout }: { cantus: string[]; player: (string | null)[]; fux: string[]; layout: Slot[] }) {
  const all = compareWithFux(cantus, player, fux, layout);
  // Differences that no stated criterion separates are a matter of taste: not listed.
  const diffs = all.filter((d) => d.fuxBetter.length + d.playerBetter.length + d.mannFuxBetter.length + d.mannPlayerBetter.length > 0);
  const half = layout.length > cantus.length;
  if (all.length === 0) return <p className="help">{t("ui.compare.none")}</p>;
  // The score already shows where the two lines differ (D67): only what a criterion weighs is said.
  if (diffs.length === 0) return null;
  const where = (d: (typeof diffs)[number]) => (half ? `${d.bar + 1}${"abcd"[d.beat]}` : String(d.bar + 1));
  // One line per reason, naming every bar it applies to (owner: say it once).
  const groups = new Map<string, { cls: string; text: React.ReactNode; bars: string[]; nums: number[] }>();
  const add = (key: string, cls: string, text: React.ReactNode, d: (typeof diffs)[number]) => {
    const g = groups.get(key) ?? { cls, text, bars: [], nums: [] };
    g.bars.push(where(d));
    g.nums.push(d.bar);
    groups.set(key, g);
  };
  for (const d of diffs) {
    for (const c of d.fuxBetter) add(`f-${c}`, "fuxBetter", t(`ui.compare.fuxBetter.${c}`), d);
    for (const c of d.playerBetter) add(`p-${c}`, "playerBetter", t(`ui.compare.playerBetter.${c}`), d);
    for (const c of d.mannPlayerBetter) add(`mp-${c}`, "mann playerBetter", <><strong>{t("ui.compare.mann.player")}</strong> {t(`ui.compare.mann.${c}`)}</>, d);
    for (const c of d.mannFuxBetter) add(`mf-${c}`, "mann fuxBetter", <><strong>{t("ui.compare.mann.fux")}</strong> {t(`ui.compare.mann.${c}`)}</>, d);
  }
  return (
    <section className="compare">
      <h4>{t("ui.compare.title")}</h4>
      <p className="help">{t("ui.compare.intro")} {t("ui.compare.mannNote")}</p>
      <ul className="reasons">
        {[...groups].map(([key, g]) => (
          <li key={key} className={g.cls}>
            <strong className="bars"><BarRef bars={g.nums}>{t(g.bars.length > 1 ? "ui.compare.bars" : "ui.compare.barOne", { bars: g.bars.join(", ") })}</BarRef></strong> {g.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
