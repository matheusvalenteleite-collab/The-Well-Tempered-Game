import { compareWithFux, type Criterion } from "../counterpoint/compare-fux.ts";
import { t } from "./i18n.ts";
import { REST, type Slot } from "../counterpoint/layout.ts";

const pretty = (p: string) => (p === REST ? t("ui.compare.rest") : p.replace("#", "♯").replace(/b(\d)/, "♭$1"));

/** Bar-by-bar differences from Fux's solution, judged by criteria Fux states (never by "Fux said so"). */
export function FuxComparison({ cantus, player, fux, layout }: { cantus: string[]; player: (string | null)[]; fux: string[]; layout: Slot[] }) {
  const diffs = compareWithFux(cantus, player, fux, layout);
  const half = layout.length > cantus.length;
  if (diffs.length === 0) return <p className="help">{t("ui.compare.none")}</p>;
  const reason = (side: "fuxBetter" | "playerBetter", c: Criterion) => <li key={`${side}-${c}`} className={side}>{t(`ui.compare.${side}.${c}`)}</li>;
  return (
    <section className="compare">
      <h4>{t("ui.compare.title")}</h4>
      <p className="help">{t("ui.compare.intro")}</p>
      <ul>
        {diffs.map((d) => (
          <li key={d.column}>
            <div className="where">
              {t(half ? "ui.compare.barBeat" : "ui.compare.bar", { bar: d.bar + 1, beat: t(d.beat ? "ui.compare.upbeat" : "ui.compare.downbeat"), player: pretty(d.player), pi: d.playerInterval, fux: pretty(d.fux), fi: d.fuxInterval })}
            </div>
            <ul className="reasons">
              {d.fuxBetter.map((c) => reason("fuxBetter", c))}
              {d.playerBetter.map((c) => reason("playerBetter", c))}
              {d.fuxBetter.length + d.playerBetter.length === 0 && <li className="equal">{t("ui.compare.equal")}</li>}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
