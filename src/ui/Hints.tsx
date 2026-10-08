import { FUX_FIRST_SPECIES_CURRICULUM, type CurriculumStep } from "../counterpoint/curriculum/fux-first-species.ts";
import { cadenceNote } from "../counterpoint/cadence.ts";
import { parsePitch } from "../music/pitch.ts";
import { FIRST_SPECIES_FUX_STRICT } from "../counterpoint/rules/first-species.ts";
import { t } from "./i18n.ts";

const pretty = (p: string) => p.replace("#", "♯").replace(/b(\d)/, "♭$1");

/** Two voices drawn as arrows, one glyph per motion type. */
function MotionGlyph({ kind }: { kind: "contrary" | "oblique" | "similar" | "parallel" }) {
  const lines: Record<string, [number, number, number, number][]> = {
    contrary: [[3, 14, 21, 4], [3, 22, 21, 30]],
    oblique: [[3, 10, 21, 10], [3, 28, 21, 18]],
    similar: [[3, 14, 21, 4], [3, 30, 21, 16]],
    parallel: [[3, 14, 21, 4], [3, 26, 21, 16]],
  };
  return (
    <svg viewBox="0 0 26 34" width="26" height="34" aria-hidden="true" className="motion-glyph">
      {lines[kind].map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} />
          <circle cx={x2} cy={y2} r="2.2" />
        </g>
      ))}
    </svg>
  );
}

const Chip = ({ kind, children }: { kind: "perfect" | "imperfect" | "dissonant"; children: string }) => <span className={`chip ${kind}`}>{children}</span>;

export function Hints({ step, cantus }: { step: CurriculumStep; cantus: string[] }) {
  const upTo = FUX_FIRST_SPECIES_CURRICULUM.filter((s) => s.ordinal <= step.ordinal);
  const intro = upTo.flatMap((s) => s.introduces);
  const severity = new Map(FIRST_SPECIES_FUX_STRICT.map((r) => [r.id, r.severity]));
  const rules = intro.filter((x) => severity.get(x.ruleId) === "error");
  const recs = intro.filter((x) => severity.get(x.ruleId) === "warning");
  const active = new Set(intro.map((x) => x.ruleId));
  const cad = cadenceNote(cantus, step.cantus_voice);
  const altered = parsePitch(cad).alter !== 0;
  const n = cantus.length;
  const below = step.cantus_voice === "lower";
  const item = (x: (typeof intro)[number]) => (
    <li key={x.ruleId}>
      {t(`hints.rule.${x.ruleId}`)} <span className="ref">{t("hints.ref", { page: x.page })}</span>
    </li>
  );
  return (
    <section className="hints" aria-label={t("ui.hints")}>
      <h2>{t("ui.hints")}</h2>
      <div className="hints-grid">
        <div className="glance">
          <h3>{t("hints.glance.intervals")}</h3>
          <div className="chart">
            <div className="row">
              <span className="row-label">{t("hints.glance.perfect")}</span>
              <span className="chips"><Chip kind="perfect">1</Chip><Chip kind="perfect">5</Chip><Chip kind="perfect">8</Chip></span>
            </div>
            <div className="row">
              <span className="row-label">{t("hints.glance.imperfect")}</span>
              <span className="chips"><Chip kind="imperfect">m3</Chip><Chip kind="imperfect">M3</Chip><Chip kind="imperfect">m6</Chip><Chip kind="imperfect">M6</Chip></span>
            </div>
            <div className="row">
              <span className="row-label">{t("hints.glance.dissonant")}</span>
              <span className="chips"><Chip kind="dissonant">2</Chip><Chip kind="dissonant">4</Chip><Chip kind="dissonant">tritone</Chip><Chip kind="dissonant">7</Chip></span>
            </div>
            <p className="note">{t("hints.glance.compounds")}</p>
          </div>

          {active.has("fs.perfect-approach") && (
            <>
              <h3>{t("hints.glance.motion")}</h3>
              <table className="motion">
                <thead>
                  <tr><th></th><th>{t("hints.glance.toImperfect")}</th><th>{t("hints.glance.toPerfect")}</th></tr>
                </thead>
                <tbody>
                  {(["contrary", "oblique", "similar", "parallel"] as const).map((m) => (
                    <tr key={m}>
                      <th><MotionGlyph kind={m} /> {t(`hints.motion.${m}`)}</th>
                      <td className="yes">✓</td>
                      <td className={m === "contrary" || m === "oblique" ? "yes" : "no"}>{m === "contrary" || m === "oblique" ? "✓" : "✗"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h3>{t("hints.glance.frame")}</h3>
          <ol className="frame">
            <li><span className="bar">1</span><span>{below ? t("hints.glance.startBelow") : t("hints.glance.startAbove")}</span></li>
            <li className="gap">⋯</li>
            <li className="key"><span className="bar">{n - 1}</span><span>{below ? "M6" : "m3"} · <strong>{pretty(cad)}</strong>{altered ? ` (${t("hints.glance.accidental")})` : ""}</span></li>
            <li className="key"><span className="bar">{n}</span><span>{t("hints.glance.end")}</span></li>
          </ol>
        </div>

        <div className="detail-col">
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
            <li>{t(altered ? "hints.cadenceAltered" : "hints.cadencePlain", { note: pretty(cad), bar: n - 1 })}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
