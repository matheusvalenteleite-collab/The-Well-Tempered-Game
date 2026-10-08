import type { Evaluation } from "../counterpoint/engine.ts";
import type { Violation } from "../counterpoint/rules/types.ts";
import type { Staff } from "../music/fux/types.ts";
import { ScoreView } from "./notation/ScoreView.tsx";
import type { ClefId } from "./notation/clefs.ts";
import { t } from "./i18n.ts";

interface Props {
  result: Evaluation;
  cantus: string[];
  counterpoint: (string | null)[];
  cantusVoice: Staff;
  clefs: [ClefId, ClefId];
}

/** Excerpts are shown only for local problems (at most this many bars). */
const MAX_EXCERPT_BARS = 4;

const barsText = (positions: number[]) => {
  const bars = [...new Set(positions)].sort((a, b) => a - b).map((p) => p + 1);
  return t(bars.length > 1 ? "ui.result.bars" : "ui.result.bar", { bars: bars.join(", ") });
};

function Excerpt({ v, ...p }: { v: Violation } & Omit<Props, "result">) {
  const lo = Math.min(...v.positions);
  const hi = Math.max(...v.positions);
  if (hi - lo + 1 > MAX_EXCERPT_BARS) return null;
  return (
    <div className="excerpt" style={{ width: `${130 + 70 * (hi - lo + 1)}px` }}>
      <ScoreView
        cantus={p.cantus.slice(lo, hi + 1)}
        counterpoint={p.counterpoint.slice(lo, hi + 1)}
        cantusVoice={p.cantusVoice}
        clefs={p.clefs}
        selected={-1}
        cursor={-1}
        marks={v.positions.map((c) => ({ column: c - lo, severity: v.severity }))}
        firstBar={lo + 1}
        fixedScale={0.6}
        label={barsText(v.positions)}
        onPlace={() => {}}
        onSelect={() => {}}
        readOnly
      />
    </div>
  );
}

export function Feedback(props: Props) {
  const { result } = props;
  return (
    <>
      <div className={result.passed ? "verdict ok" : "verdict bad"}>{result.passed ? t("ui.result.cleared") : t("ui.result.notCleared")}</div>
      <blockquote className="tutor">
        <span className="speaker">{t("tutor.speaker.aloysius")}.</span>{" "}
        {t(!result.passed ? "tutor.result.notCleared" : result.warnings.length ? "tutor.result.clearedWithWarnings" : "tutor.result.cleared")}
      </blockquote>
      {result.violations.length > 0 && (
        <ul className="violations">
          {[...result.errors, ...result.warnings].map((v, i) => (
            <li key={i} className={v.severity}>
              <div className="text">
                <div className="where">
                  {barsText(v.positions)} · {t(v.severity === "error" ? "ui.result.error" : "ui.result.warning")}
                </div>
                <div>{t(`tutor.${v.messageKey}`)}</div>
                {v.detail && <div className="detail">{Object.entries(v.detail).map(([k, x]) => `${k}: ${x}`).join(" · ")}</div>}
              </div>
              <Excerpt v={v} {...props} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
