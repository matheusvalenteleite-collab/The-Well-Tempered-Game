/**
 * A rule shown, not told (D103): the same excerpt done wrong (✗, the fault marked in red) and done
 * right (✓), in turn, looping like a stop-motion, for as long as it is open.
 */
import { useEffect, useMemo, useState } from "react";
import type { RuleDemo as Demo } from "../game/rule-demos.ts";
import { ALL_STEPS, rulesForStep } from "../counterpoint/curriculum/index.ts";
import { evaluate } from "../counterpoint/engine.ts";
import { slotLayout } from "../counterpoint/layout.ts";
import { displayClefs } from "../game/exercise-view.ts";
import { ScoreView } from "./notation/ScoreView.tsx";
import { buildOverlay } from "./notation/overlay.ts";
import { t } from "./i18n.ts";

const FRAME_MS = 1700;

export function RuleDemo({ demo }: { demo: Demo }) {
  const [right, setRight] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setRight((r) => !r), FRAME_MS);
    return () => window.clearInterval(id);
  }, []);
  const layout = useMemo(() => slotLayout(demo.species, demo.cantus.length), [demo]);
  const wrongFaults = useMemo(() => {
    const steps = ALL_STEPS.filter((s) => s.species === demo.species);
    const ev = evaluate(
      { species: demo.species, modalFinal: "D", cantusVoice: "lower", cantus: demo.cantus.map((p) => ({ pitch: p, duration: "1/1" })), counterpoint: demo.wrong.map((p, k) => ({ pitch: p, duration: layout[k].duration })) },
      rulesForStep(steps[steps.length - 1].id),
    );
    return ev.violations.filter((v) => v.ruleId === demo.ruleId);
  }, [demo, layout]);
  const notes = right ? demo.right : demo.wrong;
  const last = demo.cantus.length - 1;
  return (
    <div className={`rule-demo ${right ? "right" : "wrong"}`} aria-live="off">
      <span className="rule-demo-label">{right ? `✓ ${t("ui.demo.right")}` : `✗ ${t("ui.demo.wrong")}`}</span>
      <ScoreView
        cantus={demo.cantus}
        counterpoint={notes}
        layout={layout}
        cantusVoice="lower"
        clefs={displayClefs(demo.cantus, "lower")}
        selected={-1}
        cursor={-1}
        fixedScale={0.6}
        overlay={right ? undefined : buildOverlay(wrongFaults, demo.cantus, notes, layout, 0, last)}
        marks={right ? undefined : [...new Set(wrongFaults.flatMap((v) => v.positions))].map((column) => ({ column, severity: "error" as const }))}
        label={t(right ? "ui.demo.right" : "ui.demo.wrong")}
        readOnly
        onPlace={() => undefined}
        onSelect={() => undefined}
      />
    </div>
  );
}
