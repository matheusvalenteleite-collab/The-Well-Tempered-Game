import { useState } from "react";
import type { Evaluation } from "../counterpoint/engine.ts";
import type { Violation } from "../counterpoint/rules/types.ts";
import type { Staff } from "../music/fux/types.ts";
import type { AudioEngine } from "../audio/engine.ts";
import { correctionFor } from "../counterpoint/cadence.ts";
import { ScoreView } from "./notation/ScoreView.tsx";
import type { ClefId } from "./notation/clefs.ts";
import { buildOverlay } from "./notation/overlay.ts";
import { t } from "./i18n.ts";
import { slotsOfBars, timeline, type Slot } from "../counterpoint/layout.ts";

interface Props {
  result: Evaluation;
  cantus: string[];
  counterpoint: (string | null)[];
  cantusVoice: Staff;
  clefs: [ClefId, ClefId];
  signature?: { B?: -1 };
  layout: Slot[];
  audio: AudioEngine;
}

/** Excerpts are drawn only for local problems (at most this many bars). */
const MAX_EXCERPT_BARS = 4;

const barsText = (positions: number[], layout: Slot[]) => {
  const bars = [...new Set(positions.map((p) => layout[p].bar))].sort((a, b) => a - b).map((p) => p + 1);
  return t(bars.length > 1 ? "ui.result.bars" : "ui.result.bar", { bars: bars.join(", ") });
};

/** Interval names in details are shown in simple form (m10 -> m3), like the overlay. */
const simplifyDetail = (x: string | number) =>
  typeof x === "string" ? x.replace(/\b(AA|dd|[PMmAd])(\d+)\b/g, (_, q: string, n: string) => (Number(n) > 8 ? `${q}${((Number(n) - 1) % 7) + 1 === 1 ? 8 : ((Number(n) - 1) % 7) + 1}` : `${q}${n}`)) : String(x);

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function Item({ v, ...p }: { v: Violation } & Omit<Props, "result">) {
  const [phase, setPhase] = useState<"player" | "fixed">("player");
  const [busy, setBusy] = useState(false);
  const lo = Math.min(...v.positions.map((k) => p.layout[k].bar));
  const hi = Math.max(...v.positions.map((k) => p.layout[k].bar));
  const excerpt = hi - lo + 1 <= MAX_EXCERPT_BARS;
  const correction = correctionFor(v, p.cantus, p.counterpoint, p.cantusVoice, p.layout);
  const cols = (notes: (string | null)[]) => timeline(p.cantus, p.layout, notes, lo, hi);
  const slots = slotsOfBars(p.layout, lo, hi);

  const hear = async () => {
    if (busy) return;
    setBusy(true);
    setPhase("player");
    await p.audio.playSequence(cols(p.counterpoint));
    if (correction) {
      await sleep(400);
      setPhase("fixed");
      await sleep(450);
      await p.audio.playSequence(cols(correction));
      await sleep(1600);
      setPhase("player");
    }
    setBusy(false);
  };

  const view = (notes: (string | null)[], overlayViolations: Violation[], layer: string) => (
    <div className={`layer ${layer}`}>
      <ScoreView
        cantus={p.cantus.slice(lo, hi + 1)}
        counterpoint={slots.map((k) => notes[k])}
        layout={slots.map((k) => p.layout[k])}
        cantusVoice={p.cantusVoice}
        clefs={p.clefs}
        signature={p.signature}
        selected={-1}
        cursor={-1}
        firstBar={lo + 1}
        fixedScale={0.62}
        overlay={buildOverlay(overlayViolations, p.cantus, notes, p.layout, lo, hi)}
        label={barsText(v.positions, p.layout)}
        onPlace={() => {}}
        onSelect={() => {}}
        readOnly
      />
    </div>
  );

  return (
    <li className={v.severity}>
      <div className="text">
        <div className="where">
          {barsText(v.positions, p.layout)} · {t(v.severity === "error" ? "ui.result.error" : "ui.result.warning")}
        </div>
        <div>{t(`tutor.${v.messageKey}`)}</div>
        {v.detail && <div className="detail">{Object.entries(v.detail).map(([k, x]) => `${k}: ${simplifyDetail(x)}`).join(" · ")}</div>}
        {!excerpt && (
          <button className="hear" onClick={hear} disabled={busy}>
            ▶ {t("ui.result.hear")}
          </button>
        )}
      </div>
      {excerpt && (
        <button className={`excerpt ${phase}`} onClick={hear} disabled={busy} title={t(correction ? "ui.result.hearFix" : "ui.result.hear")}>
          {view(p.counterpoint, [v], "player")}
          {correction && view(correction, [], "fixed")}
        </button>
      )}
    </li>
  );
}

export function Feedback(props: Props) {
  const { result, ...rest } = props;
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
            <Item key={i} v={v} {...rest} />
          ))}
        </ul>
      )}
    </>
  );
}
