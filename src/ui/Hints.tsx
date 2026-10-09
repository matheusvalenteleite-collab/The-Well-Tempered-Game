import { introductionsUpTo, ruleById, type CurriculumStep } from "../counterpoint/curriculum/index.ts";
import { cadenceFifth, cadenceNote } from "../counterpoint/cadence.ts";
import { harmonic, simpleName } from "../counterpoint/interval.ts";
import { stepStudy } from "./study.ts";
import { fifthIsDiminished } from "../counterpoint/rules/second-species.ts";
import { parsePitch } from "../music/pitch.ts";
import { t } from "./i18n.ts";
import { Term } from "./Term.tsx";
import { useState } from "react";
import { demoFor } from "../game/rule-demos.ts";
import { exerciseTips, type Tip } from "../game/exercise-tips.ts";
import { RuleDemo } from "./RuleDemo.tsx";


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

const Chip = ({ kind, children, def }: { kind: "perfect" | "imperfect" | "dissonant"; children: string; def: string }) => (
  <Term def={def}>
    <span className={`chip ${kind}`}>{children}</span>
  </Term>
);

/** What the guide needs to know of the exercise. */
function facts(step: CurriculumStep, cantus: string[]) {
  const intro = introductionsUpTo(step.id);
  const second = step.species === "second";
  const third = step.species === "third";
  const fourth = step.species === "fourth";
  const fifth = step.species === "fifth";
  const n = cantus.length;
  const below = step.cantus_voice === "lower";
  const cad = cadenceNote(cantus, step.cantus_voice);
  return { intro, second, third, fourth, fifth, n, below, cad, altered: parsePitch(cad).alter !== 0, diss: second ? "2" : third ? "3" : fourth ? "4" : fifth ? "5" : "", active: new Set(intro.map((x) => x.ruleId)) };
}

/**
 * The basics of the step (D103): the intervals, the motions, and the rules and recommendations so
 * far, each with its demonstration (wrong, then right, looping) a click away.
 */
export function RuleBasics({ step, cantus }: { step: CurriculumStep; cantus: string[] }) {
  const f = facts(step, cantus);
  const { diss, active } = f;
  const [open, setOpen] = useState<string | null>(null);
  const rules = f.intro.filter((x) => ruleById(x.ruleId)?.severity === "error");
  const recs = f.intro.filter((x) => ruleById(x.ruleId)?.severity === "warning");
  const item = (x: (typeof f.intro)[number]) => {
    const demo = demoFor(x.ruleId);
    const shown = open === x.ruleId && demo;
    return (
      <li key={x.ruleId} className={demo ? "has-demo" : undefined}>
        {demo ? (
          <button className="rule-line" aria-expanded={!!shown} onClick={() => setOpen(shown ? null : x.ruleId)} data-info={t("ui.demo.help")}>
            <span className="demo-play">{shown ? "▾" : "▶"}</span> {t(`hints.rule.${x.ruleId}`)}
          </button>
        ) : (
          <span>{t(`hints.rule.${x.ruleId}`)}</span>
        )}{" "}
        <span className="ref">{t("hints.ref", { page: x.page })}</span>
        {shown && <RuleDemo demo={demo} />}
      </li>
    );
  };
  return (
    <section className="hints basics" aria-label={t("ui.hints")}>
      <div className="hints-grid">
        <div className="glance">          <h3>{t("hints.glance.intervals")}</h3>
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
              <Term def={t(`hints.def.dissonance${diss}`)}><span className="row-label">{t(`hints.glance.dissonant${diss}`)}</span></Term>
              <span className="chips">
                <Chip kind="dissonant" def={t("hints.def.second")}>2</Chip>
                <Chip kind="dissonant" def={t("hints.def.fourth")}>4</Chip>
                <Chip kind="dissonant" def={t("hints.def.tritone")}>tritone</Chip>
                <Chip kind="dissonant" def={t("hints.def.seventh")}>7</Chip>
              </span>
            </div>
            <p className="note"><Term def={t("hints.def.compound")}>{t("hints.glance.compounds")}</Term></p>
          </div>

          {["fs", "ss", "ts", "fos"].some((x) => active.has(`${x}.perfect-approach`)) && (
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
        </div>
      </div>
    </section>
  );
}

/** One tip in words (D103). */
function tipText(tip: Tip, below: boolean): string {
  switch (tip.kind) {
    case "freedom": {
      const n = tip.lines;
      const words = n >= 1e12 ? t("tips.many.trillion") : n >= 1e9 ? t("tips.many.billion") : n >= 1e6 ? t("tips.many.million") : n.toLocaleString("en");
      return t("tips.freedom", { n: words });
    }
    case "tight": return t("tips.tight", { bar: tip.bar, k: tip.consonant, notes: tip.usable.join(", ") });
    case "forced": return t("tips.forced", { bar: tip.bar, note: tip.note });
    case "openings": return t("tips.openings", { notes: tip.notes.join(", ") });
    case "leap": {
      const m = /^([Mm]?)(\d+)$/.exec(tip.size);
      const word = m ? `${m[1] === "M" ? "major " : m[1] === "m" ? "minor " : ""}${t(`ui.trio.interval.single.${m[2]}`)}` : tip.size;
      return t(tip.up ? "tips.leapUp" : "tips.leapDown", { bar: tip.bar, next: tip.bar + 1, size: word });
    }
    case "peak": return t(below ? "tips.low" : "tips.peak", { bar: tip.bar, note: tip.note });
    case "tritone": return t("tips.tritone", { bars: tip.bars.join(", "), note: tip.cantusNote, avoid: tip.avoid });
  }
}

/** This exercise only (D103): its frame, what Fux and Aloysius say of it, and tips from test-driving it. */
export function ExerciseNotes({ step, cantus }: { step: CurriculumStep; cantus: string[] }) {
  const f = facts(step, cantus);
  const { second, third, fourth, fifth, n, below, cad, altered } = f;
  const sixth = second && fifthIsDiminished(cantus[n - 2], step.cantus_voice);
  const cadenceText = second
    ? `${sixth ? "6" : "5"} → ${below ? "M6" : "m3"}`
    : third
      ? t("hints.glance.cadence3", { interval: below ? "M6" : "m3" })
      : fourth || fifth
        ? below ? "7 → M6" : "2 → m3"
        : below ? "M6" : "m3";
  const tips = exerciseTips(cantus, step.cantus_voice, step.species);
  return (
    <section className="hints exercise-notes" aria-label={t("hints.thisExercise")}>
      <div className="hints-grid">
        <div className="glance">
          <h3>{t("hints.glance.frame")}</h3>
          <ol className="frame">
            <li><span className="bar">1</span><span>{second || fourth ? `${t("hints.glance.restOr")} ` : ""}{below ? t("hints.glance.startBelow") : t("hints.glance.startAbove")}</span></li>
            <li className="gap">⋯</li>
            <li className="key"><span className="bar">{n - 1}</span><span>{cadenceText}{altered ? ` · ${t("hints.glance.accidental")}` : ""}</span></li>
            <li className="key"><span className="bar">{n}</span><span>{t("hints.glance.end")}</span></li>
          </ol>
        </div>

        <div className="detail-col">
          <h3>{t("hints.thisExercise")}</h3>
          <ul>
            {stepStudy(step.id).specific.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
            <li>{t(altered ? "hints.cadenceAltered" : "hints.cadencePlain", { bar: n - 1 })}</li>
            {second && (() => {
              const pen = cantus[n - 2];
              const fifthNote = cadenceFifth(pen, step.cantus_voice);
              const name = (x: string) => x.replace(/\d+$/, "").replace("#", "♯").replace(/^([A-G])b$/, "$1♭");
              return <li>{t("hints.cadence2", { bar: n - 1, fifth: simpleName(harmonic(pen, fifthNote)), fifthNote: name(fifthNote), sixth: below ? "M6" : "m3", sixthNote: name(cad) })}</li>;
            })()}
          </ul>
          {second && step.ordinal >= 2 && (
            <>
              <h3>{t("hints.devices")}</h3>
              <ul>
                <li>{t("hints.device.rest")} <span className="ref">{t("hints.ref", { page: "59" })}</span></li>
                <li>{t("hints.device.leap")} <span className="ref">{t("hints.ref", { page: "59-60" })}</span></li>
              </ul>
            </>
          )}
          <h3>{t("tips.title")}</h3>
          <ul className="tips">{tips.map((tip, i) => <li key={i}>{tipText(tip, !below)}</li>)}</ul>
          {(step.species === "first" || step.species === "second") && <p className="note">{t("tips.method")}</p>}
        </div>
      </div>
    </section>
  );
}
