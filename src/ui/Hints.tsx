import { FUX_FIRST_SPECIES_CURRICULUM, type CurriculumStep } from "../counterpoint/curriculum/fux-first-species.ts";
import { cadenceNote } from "../counterpoint/cadence.ts";
import { parsePitch } from "../music/pitch.ts";
import { t } from "./i18n.ts";
import { FIRST_SPECIES_FUX_STRICT } from "../counterpoint/rules/first-species.ts";

const pretty = (p: string) => p.replace("#", "♯").replace(/b(\d)/, "♭$1");

export function Hints({ step, cantus }: { step: CurriculumStep; cantus: string[] }) {
  const upTo = FUX_FIRST_SPECIES_CURRICULUM.filter((s) => s.ordinal <= step.ordinal);
  const intro = upTo.flatMap((s) => s.introduces.map((x) => ({ ...x, figure: s.exercise_id ? s.exercise_id.replace(/^fux_2v_fig_0*/, "") : null })));
  const severity = new Map(FIRST_SPECIES_FUX_STRICT.map((r) => [r.id, r.severity]));
  const rules = intro.filter((x) => severity.get(x.ruleId) === "error");
  const recs = intro.filter((x) => severity.get(x.ruleId) === "warning");
  const cad = cadenceNote(cantus, step.cantus_voice);
  const altered = parsePitch(cad).alter !== 0;
  const item = (x: (typeof intro)[number]) => (
    <li key={x.ruleId}>
      {t(`hints.rule.${x.ruleId}`)} <span className="ref">{t("hints.ref", { page: x.page })}</span>
    </li>
  );
  return (
    <section className="hints" aria-label={t("ui.hints")}>
      <h2>{t("ui.hints")}</h2>
      <h3>{t("hints.rules")}</h3>
      <ul>{rules.map(item)}</ul>
      {recs.length > 0 && (
        <>
          <h3>{t("hints.recommendations")}</h3>
          <ul>{recs.map(item)}</ul>
        </>
      )}
      <h3>{t("hints.thisExercise")}</h3>
      <ul>
        <li>{t(altered ? "hints.cadenceAltered" : "hints.cadencePlain", { note: pretty(cad), bar: cantus.length - 1 })}</li>
      </ul>
    </section>
  );
}
