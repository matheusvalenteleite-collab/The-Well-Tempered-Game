import { compareWithFux, type Criterion } from "../counterpoint/compare-fux.ts";
import { t } from "./i18n.ts";
import { REST, type Slot } from "../counterpoint/layout.ts";

const pretty = (p: string) => (p === REST ? t("ui.compare.rest") : p.replace("#", "♯").replace(/b(\d)/, "♭$1"));

/** Bar-by-bar differences from Fux's solution, judged by criteria Fux states (never by "Fux said so"). */
export function FuxComparison({ cantus, player, fux, layout }: { cantus: string[]; player: (string | null)[]; fux: string[]; layout: Slot[] }) {
  const all = compareWithFux(cantus, player, fux, layout);
  // Differences that no stated criterion separates are a matter of taste: not listed.
  const diffs = all.filter((d) => d.fuxBetter.length + d.playerBetter.length + d.mannFuxBetter.length + d.mannPlayerBetter.length > 0);
  const half = layout.length > cantus.length;
  if (all.length === 0) return <p className="help">{t("ui.compare.none")}</p>;
  if (diffs.length === 0) return <p className="help">{t("ui.compare.taste")}</p>;
  const reason = (side: "fuxBetter" | "playerBetter", c: Criterion) => <li key={`${side}-${c}`} className={side}>{t(`ui.compare.${side}.${c}`)}</li>;
  return (
    <section className="compare">
      <h4>{t("ui.compare.title")}</h4>
      <p className="help">{t("ui.compare.intro")} {t("ui.compare.mannNote")}</p>
      <ul>
        {diffs.map((d) => (
          <li key={d.column}>
            <div className="where">
              {t(half ? "ui.compare.barBeat" : "ui.compare.bar", { bar: d.bar + 1, beat: t(d.beat ? "ui.compare.upbeat" : "ui.compare.downbeat"), player: pretty(d.player), pi: d.playerInterval, fux: pretty(d.fux), fi: d.fuxInterval })}
            </div>
            <ul className="reasons">
              {d.fuxBetter.map((c) => reason("fuxBetter", c))}
              {d.playerBetter.map((c) => reason("playerBetter", c))}
              {d.mannPlayerBetter.length > 0 && (
                <li className="mann playerBetter">
                  <strong>{t("ui.compare.mann.player")}</strong> {d.mannPlayerBetter.map((c) => t(`ui.compare.mann.${c}`)).join("; ")}
                </li>
              )}
              {d.mannFuxBetter.length > 0 && (
                <li className="mann fuxBetter">
                  <strong>{t("ui.compare.mann.fux")}</strong> {d.mannFuxBetter.map((c) => t(`ui.compare.mann.${c}`)).join("; ")}
                </li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
