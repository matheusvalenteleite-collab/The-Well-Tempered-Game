import { FUX_FIRST_SPECIES_CURRICULUM, type CurriculumStep } from "../counterpoint/curriculum/fux-first-species.ts";
import { cadenceNote } from "../counterpoint/cadence.ts";
import { parsePitch } from "../music/pitch.ts";
import { FIRST_SPECIES_FUX_STRICT } from "../counterpoint/rules/first-species.ts";
import { t } from "./i18n.ts";


type MotionKind = "parallel" | "similar" | "oblique" | "contrary";

/**
 * Two voices drawn as arrows, one glyph per motion type. A held voice is drawn level, dotted
 * and grey, so it reads as "staying put"; moving voices are solid with an arrowhead.
 */
function MotionGlyph({ kind }: { kind: MotionKind }) {
  const moving: Record<MotionKind, [number, number, number, number][]> = {
    parallel: [[4, 15, 26, 5], [4, 31, 26, 21]],
    similar: [[4, 11, 26, 7], [4, 33, 26, 13]],
    oblique: [[4, 33, 26, 13]],
    contrary: [[4, 5, 26, 14], [4, 33, 26, 22]],
  };
  return (
    <svg viewBox="0 0 32 38" width="32" height="38" aria-hidden="true" className="motion-glyph">
      {kind === "oblique" && (
        <g className="held">
          <line x1={4} y1={8} x2={26} y2={8} />
          <circle cx={4} cy={8} r="2.4" />
          <circle cx={26} cy={8} r="2.4" />
        </g>
      )}
      {moving[kind].map(([x1, y1, x2, y2], i) => {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const head = (d: number) => `${x2 - 6 * Math.cos(ang + d)},${y2 - 6 * Math.sin(ang + d)}`;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <polygon points={`${x2},${y2} ${head(0.5)} ${head(-0.5)}`} />
          </g>
        );
      })}
    </svg>
  );
}

/** A term with a definition shown on hover, focus or tap. */
function Term({ def, children }: { def: string; children: React.ReactNode }) {
  // Keep the tip inside the viewport: shift it left when it would overflow on the right.
  const fit = (e: React.SyntheticEvent<HTMLSpanElement>) => {
    const tip = e.currentTarget.querySelector<HTMLSpanElement>(".tip");
    if (!tip) return;
    tip.style.left = "0px";
    requestAnimationFrame(() => {
      const r = tip.getBoundingClientRect();
      const over = r.right - (document.documentElement.clientWidth - 8);
      if (over > 0) tip.style.left = `${-over}px`;
    });
  };
  return (
    <span className="term" tabIndex={0} onMouseEnter={fit} onFocus={fit}>
      {children}
      <span className="tip" role="tooltip">{def}</span>
    </span>
  );
}

const Chip = ({ kind, children, def }: { kind: "perfect" | "imperfect" | "dissonant"; children: string; def: string }) => (
  <Term def={def}>
    <span className={`chip ${kind}`}>{children}</span>
  </Term>
);

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
              <Term def={t("hints.def.perfect")}><span className="row-label">{t("hints.glance.perfect")}</span></Term>
              <span className="chips">
                <Chip kind="perfect" def={t("hints.def.unison")}>1</Chip>
                <Chip kind="perfect" def={t("hints.def.fifth")}>5</Chip>
                <Chip kind="perfect" def={t("hints.def.octave")}>8</Chip>
              </span>
            </div>
            <div className="row">
              <Term def={t("hints.def.imperfect")}><span className="row-label">{t("hints.glance.imperfect")}</span></Term>
              <span className="chips">
                <Chip kind="imperfect" def={t("hints.def.m3")}>m3</Chip>
                <Chip kind="imperfect" def={t("hints.def.M3")}>M3</Chip>
                <Chip kind="imperfect" def={t("hints.def.m6")}>m6</Chip>
                <Chip kind="imperfect" def={t("hints.def.M6")}>M6</Chip>
              </span>
            </div>
            <div className="row">
              <Term def={t("hints.def.dissonance")}><span className="row-label">{t("hints.glance.dissonant")}</span></Term>
              <span className="chips">
                <Chip kind="dissonant" def={t("hints.def.second")}>2</Chip>
                <Chip kind="dissonant" def={t("hints.def.fourth")}>4</Chip>
                <Chip kind="dissonant" def={t("hints.def.tritone")}>tritone</Chip>
                <Chip kind="dissonant" def={t("hints.def.seventh")}>7</Chip>
              </span>
            </div>
            <p className="note"><Term def={t("hints.def.compound")}>{t("hints.glance.compounds")}</Term></p>
          </div>

          {active.has("fs.perfect-approach") && (
            <>
              <h3>{t("hints.glance.motion")}</h3>
              <table className="motion">
                <thead>
                  <tr><th></th><th>{t("hints.glance.toImperfect")}</th><th>{t("hints.glance.toPerfect")}</th></tr>
                </thead>
                <tbody>
                  {(["parallel", "similar", "oblique", "contrary"] as const).map((m) => (
                    <tr key={m}>
                      <th>
                        <Term def={t(`hints.def.${m}`)}>
                          <MotionGlyph kind={m} /> {t(`hints.motion.${m}`)}
                        </Term>
                      </th>
                      <td className="yes">✓</td>
                      {m === "contrary" || m === "oblique" ? (
                        <td className="yes">✓</td>
                      ) : (
                        <td className={m === "parallel" ? "no dramatic" : "no"}>
                          {m === "parallel" ? <span className="cross" title={t("hints.glance.parallelBan")}>✗</span> : "✗"}
                        </td>
                      )}
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
            <li className="key"><span className="bar">{n - 1}</span><span>{below ? "M6" : "m3"}{altered ? ` · ${t("hints.glance.accidental")}` : ""}</span></li>
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
            <li>{t(altered ? "hints.cadenceAltered" : "hints.cadencePlain", { bar: n - 1 })}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
